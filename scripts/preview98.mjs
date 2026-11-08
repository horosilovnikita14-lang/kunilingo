import {createServer} from 'node:http';
import {createReadStream, readFileSync} from 'node:fs';
import {realpath, stat} from 'node:fs/promises';
import {resolve, relative, isAbsolute, extname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {getCACertificates, setDefaultCACertificates} from 'node:tls';
import {Readable} from 'node:stream';
import worker from '../dist/server/index.js';

// The public GlobalSign intermediate completes FIPI's TLS chain. Normal CA
// and hostname checks remain enabled, as in the existing Vercel adapter.
const intermediate = readFileSync(new URL('./fipi-intermediate.pem', import.meta.url), 'utf8');
setDefaultCACertificates([...getCACertificates('default'), intermediate]);

const appRoot = await realpath(fileURLToPath(new URL('../app/', import.meta.url)));
const bodyLimit = 64 * 1024;
const apiLimit = 16;
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.txt': 'text/plain; charset=utf-8',
};

class PreviewError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function insideApp(path) {
  const part = relative(appRoot, path);
  return part !== '..' && !part.startsWith('..' + sep) && !isAbsolute(part);
}

function sendError(req, res, status, message, headers = {}) {
  if (res.destroyed || res.writableEnded) return;
  if (res.headersSent) { res.destroy(); return; }
  const body = JSON.stringify({error: message});
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(req.method === 'HEAD' ? undefined : body);
}

function readBody(req, signal) {
  const advertised = req.headers['content-length'];
  if (advertised && (!/^\d+$/.test(advertised) || Number(advertised) > bodyLimit)) {
    req.resume();
    return Promise.reject(new PreviewError(413, 'Запрос слишком большой'));
  }
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    let length = 0;
    const cleanup = () => {
      req.removeListener('data', data);
      req.removeListener('end', end);
      req.removeListener('error', failed);
      req.removeListener('aborted', aborted);
      signal.removeEventListener('abort', cancelled);
    };
    const failed = error => { cleanup(); reject(error); };
    const aborted = () => failed(new PreviewError(400, 'Запрос прерван'));
    const cancelled = () => {
      cleanup();
      req.resume();
      reject(signal.reason instanceof PreviewError ? signal.reason : new PreviewError(400, 'Запрос прерван'));
    };
    const data = chunk => {
      length += chunk.length;
      if (length > bodyLimit) {
        cleanup();
        req.resume();
        reject(new PreviewError(413, 'Запрос слишком большой'));
        return;
      }
      chunks.push(chunk);
    };
    const end = () => { cleanup(); resolveBody(Buffer.concat(chunks, length)); };
    if (signal.aborted) { cancelled(); return; }
    req.on('data', data);
    req.once('end', end);
    req.once('error', failed);
    req.once('aborted', aborted);
    signal.addEventListener('abort', cancelled, {once: true});
  });
}

function timed(operation, duration, controller) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new PreviewError(504, 'Локальный сервер не успел ответить');
      controller.abort(error);
      reject(error);
    }, duration);
    timer.unref?.();
  });
  return Promise.race([operation, timeout]).finally(() => clearTimeout(timer));
}

export function createPreviewServer({port = Number(process.env.PORT || 4197)} = {}) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid local port');
  const origin = 'http://127.0.0.1:' + port;
  let activeApi = 0;
  const server = createServer({
    maxHeaderSize: 16 * 1024,
    requestTimeout: 15000,
    headersTimeout: 10000,
    keepAliveTimeout: 5000,
    connectionsCheckingInterval: 1000,
  }, async (req, res) => {
    try {
      const rawUrl = String(req.url || '/');
      if (rawUrl.length > 8192) throw new PreviewError(414, 'Адрес слишком длинный');
      if (!rawUrl.startsWith('/') || rawUrl.startsWith('//')) throw new PreviewError(400, 'Некорректный адрес');
      const url = new URL(rawUrl, origin);
      const rawPath = rawUrl.split(/[?#]/, 1)[0];
      let pathname;
      try { pathname = decodeURIComponent(rawPath); }
      catch { throw new PreviewError(400, 'Некорректный адрес'); }
      if (/[\\\0:]/.test(pathname) || pathname.split('/').some(part => part === '.' || part === '..' || part.startsWith('.'))) {
        throw new PreviewError(403, 'Недоступно');
      }

      if (pathname.startsWith('/api/')) {
        if (!/^\/api\/fipi\/(?:catalog|question|check)$/.test(pathname)) throw new PreviewError(404, 'Не найдено');
        if (activeApi >= apiLimit) { req.resume(); sendError(req, res, 503, 'Слишком много запросов. Попробуй ещё раз.', {'Retry-After': '1'}); return; }
        activeApi++;
        const controller = new AbortController();
        const abort = () => controller.abort();
        req.once('aborted', abort);
        try {
          const started = Date.now();
          const body = await timed(readBody(req, controller.signal), 15000, controller);
          if ((req.method === 'GET' || req.method === 'HEAD') && body.length) throw new PreviewError(400, 'Некорректный запрос');
          const headers = new Headers();
          for (const [name, value] of Object.entries(req.headers)) {
            if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
          }
          const request = new Request(url, {
            method: req.method,
            headers,
            signal: controller.signal,
            ...(body.length ? {body} : {}),
          });
          const response = await timed(worker.fetch(request, {}), Math.max(1, 20000 - (Date.now() - started)), controller);
          if (res.destroyed || res.writableEnded) return;
          const responseHeaders = Object.fromEntries(response.headers);
          responseHeaders['X-Content-Type-Options'] = 'nosniff';
          res.writeHead(response.status, responseHeaders);
          if (req.method === 'HEAD' || !response.body) { res.end(); return; }
          const stream = Readable.fromWeb(response.body);
          stream.on('error', () => res.destroy());
          res.once('close', () => stream.destroy());
          stream.pipe(res);
        } finally {
          req.removeListener('aborted', abort);
          activeApi--;
        }
        return;
      }

      if (req.method !== 'GET' && req.method !== 'HEAD') {
        req.resume();
        sendError(req, res, 405, 'Метод недоступен', {'Allow': 'GET, HEAD'});
        return;
      }
      const localPath = resolve(appRoot, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!insideApp(localPath)) throw new PreviewError(403, 'Недоступно');
      let filePath, info;
      try {
        filePath = await realpath(localPath);
        if (!insideApp(filePath)) throw new PreviewError(403, 'Недоступно');
        info = await stat(filePath);
      } catch (error) {
        if (error instanceof PreviewError) throw error;
        throw new PreviewError(404, 'Не найдено');
      }
      if (!info.isFile()) throw new PreviewError(404, 'Не найдено');
      res.writeHead(200, {
        'Content-Type': mime[extname(filePath).toLowerCase()] || 'application/octet-stream',
        'Content-Length': info.size,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      if (req.method === 'HEAD') { res.end(); return; }
      const stream = createReadStream(filePath);
      stream.on('error', () => res.destroy());
      res.once('close', () => stream.destroy());
      stream.pipe(res);
    } catch (error) {
      const status = error instanceof PreviewError ? error.status : 500;
      if (status === 413 || status === 504) res.setHeader('Connection', 'close');
      sendError(req, res, status, error instanceof PreviewError ? error.message : 'Не удалось обработать запрос');
    }
  });
  server.maxConnections = 64;
  server.maxHeadersCount = 64;
  server.maxRequestsPerSocket = 100;
  server.setTimeout(25000, socket => socket.destroy());
  return {server, port, host: '127.0.0.1', origin};
}

// Importing this module for checks does not start or stop any server.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const {server, port, host, origin} = createPreviewServer();
  server.on('error', error => {
    const code = /^[A-Z0-9_]+$/.test(error.code || '') ? error.code : 'SERVER_ERROR';
    console.error('Локальный сервер не запущен: ' + code);
    process.exitCode = 1;
  });
  server.listen(port, host, () => console.log(origin + '/?ui=59&style=copper#/russian/practice'));
}
