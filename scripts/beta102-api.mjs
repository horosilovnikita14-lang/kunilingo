import {DatabaseSync} from 'node:sqlite';
import {mkdirSync, chmodSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash, randomBytes, randomUUID, scrypt, timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';

const derive = promisify(scrypt);
const PASSWORD_OPTIONS = Object.freeze({N: 32768, r: 8, p: 3, maxmem: 48 * 1024 * 1024});
const SESSION_COOKIE = 'kunilingo_beta102';
const SESSION_AGE = 14 * 24 * 60 * 60 * 1000;
const PROGRESS_LIMIT = 8 * 1024 * 1024;
const PROGRESS_RECORD_LIMIT = 4 * 1024 * 1024;
const studyKeys = new Set(['kunilingo.practice84', 'kunilingo.russian.course78', 'kunilingo.russian.course73', 'kunilingo.russian.path.v1', 'kunilingo.russian.2027.priorities', 'kunilingo.pencil98.preferences']);
const categories = new Set(['bug', 'content', 'suggestion', 'other']);
const statuses = new Set(['new', 'in_progress', 'resolved']);
const sections = new Set(['path', 'practice', 'progress', 'general']);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const digest = value => createHash('sha256').update(value).digest('hex');
const userProfile = user => user ? {id: user.id, username: user.username, displayName: user.display_name, role: user.role} : null;

export function isStudyStorageKey102(key) {
  return studyKeys.has(key) || /^kunilingo\.pencil98\.(?:[0-9a-f]{6}|D\d{4}-[ABC]?\d{1,2}-\d+)$/i.test(key);
}

class ApiError extends Error {
  constructor(status, code, message, extra = {}) { super(message); Object.assign(this, {status, code, extra}); }
}
const invalid = message => new ApiError(400, 'invalid_input', message);
const fail = (status, code, message, extra) => { throw new ApiError(status, code, message, extra); };

function onlyKeys(value, allowed) {
  if (!record(value) || Object.keys(value).some(key => !allowed.includes(key))) throw invalid('Некорректные поля запроса.');
}

function text(value, name, {min = 1, max = 120, optional = false, trim = true} = {}) {
  if (optional && value === undefined) return undefined;
  if (typeof value !== 'string') throw invalid('Проверь поле «' + name + '».');
  const result = trim ? value.trim() : value;
  if (result.length < min || result.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(result)) throw invalid('Проверь поле «' + name + '».');
  return result;
}

function usernameOf(value) {
  const username = text(value, 'Логин', {min: 3, max: 32}).normalize('NFC').toLocaleLowerCase('ru');
  if (!/^[a-zа-яё0-9][a-zа-яё0-9_.-]{2,31}$/u.test(username)) throw invalid('Логин: 3–32 буквы, цифры, точки, дефисы или знак подчёркивания.');
  return username;
}

function passwordOf(value) { return text(value, 'Пароль', {min: 8, max: 128, trim: false}); }

async function bodyJson(request, limit) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) fail(415, 'json_required', 'Нужен запрос в формате JSON.');
  const length = request.headers.get('content-length');
  if (length && (!/^\d+$/.test(length) || Number(length) > limit)) fail(413, 'payload_too_large', 'Запрос слишком большой.');
  const reader = request.body?.getReader();
  if (!reader) throw invalid('Пустой запрос.');
  let size = 0;
  const chunks = [];
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); fail(413, 'payload_too_large', 'Запрос слишком большой.'); }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  let value;
  try { value = JSON.parse(Buffer.concat(chunks, size).toString('utf8')); }
  catch { throw invalid('Некорректный JSON.'); }
  if (!record(value)) throw invalid('Нужен объект JSON.');
  return value;
}

function validateRecords(records) {
  if (!record(records) || Object.keys(records).length > 3000) throw invalid('Некорректное учебное состояние.');
  for (const [key, value] of Object.entries(records)) {
    if (!isStudyStorageKey102(key)) throw invalid('Недопустимый ключ учебных данных.');
    if (Buffer.byteLength(JSON.stringify(value)) > PROGRESS_RECORD_LIMIT) fail(413, 'record_too_large', 'Данные одного задания превышают 4 МБ.');
  }
  // JSON.parse already ensures JSON values. Bound nesting for later consumers,
  // and reject prototype keys instead of passing them into object merge code.
  const stack = [{value: records, depth: 0}];
  while (stack.length) {
    const {value, depth} = stack.pop();
    if (depth > 40) throw invalid('Слишком глубокая структура учебных данных.');
    if (value && typeof value === 'object') {
      for (const key of Object.keys(value)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') throw invalid('Недопустимая структура учебных данных.');
        stack.push({value: value[key], depth: depth + 1});
      }
    }
  }
  const serialized = JSON.stringify(records);
  if (Buffer.byteLength(serialized) > PROGRESS_LIMIT) fail(413, 'payload_too_large', 'Учебные данные превышают 8 МБ.');
  return serialized;
}

function feedbackContext(value = {}) {
  onlyKeys(value, ['section', 'exerciseId', 'lessonId', 'version', 'viewport']);
  const section = value.section ?? 'general';
  if (!sections.has(section)) throw invalid('Некорректный раздел приложения.');
  const context = {section};
  for (const key of ['exerciseId', 'lessonId', 'version']) {
    const item = text(value[key], key, {max: 120, optional: true});
    if (item !== undefined) context[key] = item;
  }
  if (value.viewport !== undefined) {
    onlyKeys(value.viewport, ['width', 'height']);
    const {width, height} = value.viewport;
    if (![width, height].every(n => Number.isInteger(n) && n >= 1 && n <= 20000)) throw invalid('Некорректный размер окна.');
    context.viewport = {width, height};
  }
  return context;
}

export function createBetaApi102({dataDirectory = fileURLToPath(new URL('../.local-data/', import.meta.url)), origin, now = Date.now} = {}) {
  const parsedOrigin = new URL(origin);
  if (parsedOrigin.origin !== origin || !['http:', 'https:'].includes(parsedOrigin.protocol)) throw new Error('A canonical origin is required');
  mkdirSync(dataDirectory, {recursive: true, mode: 0o700});
  const databasePath = resolve(dataDirectory, 'beta102.sqlite');
  const db = new DatabaseSync(databasePath);
  try { chmodSync(databasePath, 0o600); } catch {}
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('owner','learner')), password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL, created_at INTEGER NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
    CREATE TABLE IF NOT EXISTS progress (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      revision INTEGER NOT NULL DEFAULT 0, records TEXT NOT NULL DEFAULT '{}', updated_at INTEGER NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      category TEXT NOT NULL, message TEXT NOT NULL, context TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('new','in_progress','resolved')),
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS feedback_user ON feedback(user_id,created_at);
    CREATE TABLE IF NOT EXISTS limits (
      key TEXT PRIMARY KEY, count INTEGER NOT NULL, resets_at INTEGER NOT NULL
    ) STRICT;`);
  let closed = false, activeHashes = 0;
  const prepare = sql => db.prepare(sql);
  const transaction = operation => {
    db.exec('BEGIN IMMEDIATE');
    try { const result = operation(); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  };
  const timestamp = () => Math.floor(now());
  const response = (value, status = 200, headers = {}) => Response.json(value, {status, headers: {'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers}});
  const cookie = (token, maxAge = SESSION_AGE / 1000) => SESSION_COOKIE + '=' + token + '; Path=/api/beta; HttpOnly; SameSite=Strict; Max-Age=' + maxAge + (parsedOrigin.protocol === 'https:' ? '; Secure' : '');
  const requestToken = request => {
    const matches = (request.headers.get('cookie') || '').split(';').map(s => s.trim()).filter(s => s.startsWith(SESSION_COOKIE + '='));
    if (matches.length !== 1) return null;
    const value = matches[0].slice(SESSION_COOKIE.length + 1);
    return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
  };
  function userFor(request) {
    const token = requestToken(request);
    if (!token) return null;
    return prepare('SELECT users.* FROM sessions JOIN users ON users.id=sessions.user_id WHERE token_hash=? AND expires_at>?').get(digest(token), timestamp()) || null;
  }
  function requireUser(request) {
    const user = userFor(request);
    if (!user) fail(401, 'auth_required', 'Войди в аккаунт.');
    return user;
  }
  function requireOwner(request) {
    const user = requireUser(request);
    if (user.role !== 'owner') fail(403, 'owner_required', 'Этот раздел доступен владельцу.');
    return user;
  }
  function newSession(userId, oldToken) {
    const token = randomBytes(32).toString('base64url'), at = timestamp();
    if (oldToken) prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(oldToken));
    prepare('DELETE FROM sessions WHERE expires_at<=?').run(at);
    prepare('INSERT INTO sessions(token_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)').run(digest(token), userId, at, at + SESSION_AGE);
    prepare('DELETE FROM sessions WHERE user_id=? AND token_hash NOT IN (SELECT token_hash FROM sessions WHERE user_id=? ORDER BY created_at DESC,rowid DESC LIMIT 10)').run(userId, userId);
    return token;
  }
  function rateLimit(key, maximum, windowMs) {
    const at = timestamp();
    const row = transaction(() => {
      prepare('DELETE FROM limits WHERE resets_at<=?').run(at);
      const saved = prepare('SELECT count,resets_at FROM limits WHERE key=?').get(key);
      if (saved) { prepare('UPDATE limits SET count=count+1 WHERE key=?').run(key); return {...saved, count: saved.count + 1}; }
      prepare('INSERT INTO limits(key,count,resets_at) VALUES(?,1,?)').run(key, at + windowMs);
      return {count: 1, resets_at: at + windowMs};
    });
    if (row.count > maximum) fail(429, 'rate_limited', 'Слишком много попыток. Подожди немного.', {retryAfter: Math.max(1, Math.ceil((row.resets_at - at) / 1000))});
  }
  async function passwordHash(password, salt) {
    if (activeHashes >= 4) fail(503, 'busy', 'Сервер занят. Попробуй ещё раз.');
    activeHashes++;
    try { return await derive(password, Buffer.from(salt, 'hex'), 64, PASSWORD_OPTIONS); }
    finally { activeHashes--; }
  }
  function progressFor(userId) {
    const row = prepare('SELECT revision,records FROM progress WHERE user_id=?').get(userId);
    return row ? {revision: row.revision, records: JSON.parse(row.records)} : {revision: 0, records: {}};
  }
  const feedbackItem = (row, admin = false) => ({id: row.id, category: row.category, message: row.message, context: JSON.parse(row.context), status: row.status, createdAt: row.created_at, updatedAt: row.updated_at, ...(admin ? {userId: row.user_id, username: row.username || null} : {})});
  function feedbackPage(url, userId = null) {
    const rawLimit = url.searchParams.get('limit') ?? '100';
    const cursor = url.searchParams.get('cursor');
    if (!/^\d{1,3}$/.test(rawLimit) || Number(rawLimit) < 1 || Number(rawLimit) > 100 || (cursor !== null && (!/^\d{1,16}$/.test(cursor) || !Number.isSafeInteger(Number(cursor)) || Number(cursor) < 1))) throw invalid('Некорректная страница обращений.');
    const limit = Number(rawLimit), before = cursor === null ? null : Number(cursor);
    const rows = userId
      ? prepare('SELECT rowid AS cursor_row,* FROM feedback WHERE user_id=? AND (? IS NULL OR rowid<?) ORDER BY rowid DESC LIMIT ?').all(userId, before, before, limit + 1)
      : prepare('SELECT feedback.rowid AS cursor_row,feedback.*,users.username FROM feedback LEFT JOIN users ON users.id=feedback.user_id WHERE (? IS NULL OR feedback.rowid<?) ORDER BY feedback.rowid DESC LIMIT ?').all(before, before, limit + 1);
    const selected = rows.slice(0, limit);
    return {items: selected.map(row => feedbackItem(row, userId === null)), nextCursor: rows.length > limit ? String(selected.at(-1).cursor_row) : null};
  }

  async function fetchBeta(request) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/beta/')) return null;
    try {
      if (closed) fail(503, 'unavailable', 'Локальная база закрыта.');
      if (url.origin !== origin) fail(403, 'origin_forbidden', 'Запрос с другого адреса недоступен.');
      const method = request.method.toUpperCase();
      if (!['GET', 'POST', 'PUT', 'PATCH'].includes(method)) fail(405, 'method_not_allowed', 'Метод недоступен.');
      const sentOrigin = request.headers.get('origin');
      const fetchSite = request.headers.get('sec-fetch-site');
      if ((sentOrigin && sentOrigin !== origin) || (fetchSite && !['same-origin', 'none'].includes(fetchSite))) fail(403, 'origin_forbidden', 'Запрос с другого адреса недоступен.');
      if (method !== 'GET' && sentOrigin !== origin) fail(403, 'origin_forbidden', 'Для изменения данных нужен запрос из приложения.');
      const path = url.pathname;
      // A cookie is shared by all tabs, while each tab can still display a
      // different learner's outbox. Bind every account-data request to the
      // identity the caller is displaying before allowing any read or write.
      if (path === '/api/beta/progress' || path === '/api/beta/feedback' || path === '/api/beta/logout' || path.startsWith('/api/beta/admin/')) {
        const expected = request.headers.get('x-kunilingo-user');
        const actual = userFor(request)?.id || 'guest';
        if (!expected || expected !== actual) fail(401, 'session_changed', 'Аккаунт изменился в другой вкладке. Войди снова; твоя работа осталась на этом устройстве.');
      }
      if (path === '/api/beta/session' && method === 'GET') {
        const user = userFor(request);
        return response({user: userProfile(user)}, 200, !user && requestToken(request) ? {'Set-Cookie': cookie('', 0)} : {});
      }
      if (path === '/api/beta/register' && method === 'POST') {
        rateLimit('register', 20, 60 * 60 * 1000);
        const data = await bodyJson(request, 4096);
        onlyKeys(data, ['username', 'password', 'displayName']);
        const username = usernameOf(data.username), password = passwordOf(data.password);
        const displayName = text(data.displayName ?? username, 'Имя', {max: 64});
        if (prepare('SELECT id FROM users WHERE username=?').get(username)) fail(409, 'username_taken', 'Этот логин уже занят.');
        const salt = randomBytes(16).toString('hex'), hash = await passwordHash(password, salt);
        const result = transaction(() => {
          if (prepare('SELECT id FROM users WHERE username=?').get(username)) fail(409, 'username_taken', 'Этот логин уже занят.');
          const count = prepare('SELECT count(*) AS count FROM users').get().count;
          if (count >= 1000) fail(503, 'registration_closed', 'Локальная бета достигла лимита аккаунтов.');
          const user = {id: randomUUID(), username, display_name: displayName, role: count === 0 ? 'owner' : 'learner'};
          prepare('INSERT INTO users(id,username,display_name,role,password_hash,password_salt,created_at) VALUES(?,?,?,?,?,?,?)').run(user.id, username, displayName, user.role, hash.toString('hex'), salt, timestamp());
          return {user, token: newSession(user.id, requestToken(request))};
        });
        return response({user: userProfile(result.user)}, 201, {'Set-Cookie': cookie(result.token)});
      }
      if (path === '/api/beta/login' && method === 'POST') {
        rateLimit('login', 120, 15 * 60 * 1000);
        const data = await bodyJson(request, 4096);
        onlyKeys(data, ['username', 'password']);
        const username = usernameOf(data.username), password = passwordOf(data.password);
        rateLimit('login:' + digest(username), 12, 15 * 60 * 1000);
        const user = prepare('SELECT * FROM users WHERE username=?').get(username);
        const hash = await passwordHash(password, user?.password_salt || '00000000000000000000000000000000');
        const expected = user ? Buffer.from(user.password_hash, 'hex') : Buffer.alloc(64);
        if (!timingSafeEqual(hash, expected) || !user) fail(401, 'invalid_credentials', 'Неверный логин или пароль.');
        const token = transaction(() => newSession(user.id, requestToken(request)));
        return response({user: userProfile(user)}, 200, {'Set-Cookie': cookie(token)});
      }
      if (path === '/api/beta/logout' && method === 'POST') {
        const data = await bodyJson(request, 1024); onlyKeys(data, []);
        const token = requestToken(request);
        if (token) prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(token));
        return response({user: null}, 200, {'Set-Cookie': cookie('', 0)});
      }
      if (path === '/api/beta/progress' && (method === 'GET' || method === 'PUT')) {
        const user = requireUser(request);
        if (method === 'GET') return response(progressFor(user.id));
        const data = await bodyJson(request, PROGRESS_LIMIT + 1024);
        onlyKeys(data, ['revision', 'records']);
        if (!Number.isSafeInteger(data.revision) || data.revision < 0) throw invalid('Некорректная версия учебных данных.');
        const serialized = validateRecords(data.records);
        const snapshot = transaction(() => {
          const current = progressFor(user.id);
          if (current.revision !== data.revision) fail(409, 'progress_conflict', 'Учебные данные изменились в другой вкладке. Выбери, какую версию сохранить.', current);
          const revision = current.revision + 1;
          prepare('INSERT INTO progress(user_id,revision,records,updated_at) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET revision=excluded.revision,records=excluded.records,updated_at=excluded.updated_at').run(user.id, revision, serialized, timestamp());
          return {revision, records: data.records};
        });
        return response(snapshot);
      }
      if (path === '/api/beta/feedback' && method === 'POST') {
        const user = userFor(request);
        rateLimit('feedback', 120, 60 * 60 * 1000);
        rateLimit('feedback:' + (user?.id || 'guest'), user ? 20 : 40, 60 * 60 * 1000);
        const data = await bodyJson(request, 16 * 1024);
        onlyKeys(data, ['category', 'message', 'context']);
        if (!categories.has(data.category)) throw invalid('Выбери тип обращения.');
        const message = text(data.message, 'Сообщение', {min: 5, max: 6000});
        const context = feedbackContext(data.context), id = randomUUID(), at = timestamp();
        prepare('INSERT INTO feedback(id,user_id,category,message,context,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(id, user?.id || null, data.category, message, JSON.stringify(context), 'new', at, at);
        return response({feedback: {id, category: data.category, message, context, status: 'new', createdAt: at, updatedAt: at}}, 201);
      }
      if (path === '/api/beta/feedback' && method === 'GET') {
        const user = requireUser(request);
        return response(feedbackPage(url, user.id));
      }
      if (path === '/api/beta/admin/feedback' && method === 'GET') {
        requireOwner(request);
        return response(feedbackPage(url));
      }
      const adminId = /^\/api\/beta\/admin\/feedback\/([0-9a-f-]{36})$/i.exec(path)?.[1];
      if (adminId && method === 'PATCH') {
        requireOwner(request);
        const data = await bodyJson(request, 1024); onlyKeys(data, ['status']);
        if (!statuses.has(data.status)) throw invalid('Некорректный статус обращения.');
        const result = prepare('UPDATE feedback SET status=?,updated_at=? WHERE id=?').run(data.status, timestamp(), adminId);
        if (!result.changes) fail(404, 'not_found', 'Обращение не найдено.');
        const row = prepare('SELECT feedback.*,users.username FROM feedback LEFT JOIN users ON users.id=feedback.user_id WHERE feedback.id=?').get(adminId);
        return response({feedback: feedbackItem(row, true)});
      }
      fail(404, 'not_found', 'Не найдено.');
    } catch (error) {
      if (error instanceof ApiError) return response({error: {code: error.code, message: error.message}, ...error.extra}, error.status, error.status === 429 ? {'Retry-After': String(error.extra.retryAfter)} : {});
      // Database errors, password material and raw user bodies stay private.
      return response({error: {code: 'internal_error', message: 'Не удалось сохранить данные. Попробуй ещё раз.'}}, 500);
    }
  }
  return {fetch: fetchBeta, close() { if (!closed) { closed = true; db.close(); } }};
}

let standalone;
export async function handleBeta102(request) {
  if (!new URL(request.url).pathname.startsWith('/api/beta/')) return null;
  standalone ??= createBetaApi102({origin: process.env.BETA_ORIGIN || 'http://127.0.0.1:' + (process.env.PORT || 4197)});
  return standalone.fetch(request);
}
