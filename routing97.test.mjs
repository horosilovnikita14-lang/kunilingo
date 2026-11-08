import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const code=await readFile(new URL('./dist/server/index.js',import.meta.url),'utf8');
const worker=(await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))).default;
const request=(path,options)=>new Request('https://example.test'+path,options);
test('all catalog exercises open with no connection to FIPI and no answer keys',async t=>{
 const original=globalThis.fetch;let upstream=0;globalThis.fetch=async()=>{upstream++;throw new Error('offline');};t.after(()=>globalThis.fetch=original);
 const catalog=await (await worker.fetch(request('/api/fipi/catalog'),{})).json();
 assert.equal(catalog.items.length,2795);
 for(const entry of catalog.items){
  const response=await worker.fetch(request('/api/fipi/question?id='+entry.id),{}),q=await response.json();
  assert.equal(response.status,200,entry.id);assert.ok(q.form?.trim(),entry.id);assert.equal(q.id,entry.id);assert.equal('answer' in q,false,entry.id);
 }
 assert.equal(upstream,0);
});
test('catalog and exercise validators return empty 304 and HEAD while preserving GET data',async()=>{
 for(const path of ['/api/fipi/catalog','/api/fipi/question?id=445A48']){
  const first=await worker.fetch(request(path),{}),body=await first.text(),etag=first.headers.get('etag');
  assert.ok(body.length>100);assert.ok(etag);assert.match(first.headers.get('cache-control'),/public/);
  const same=await worker.fetch(request(path,{headers:{'If-None-Match':'W/'+etag}}),{});assert.equal(same.status,304);assert.equal(await same.text(),'');
  const head=await worker.fetch(request(path,{method:'HEAD'}),{});assert.equal(head.status,200);assert.equal(await head.text(),'');assert.equal(head.headers.get('etag'),etag);
  const fresh=await worker.fetch(request(path,{headers:{'If-None-Match':'"old"'}}),{});assert.equal(fresh.status,200);assert.equal(await fresh.text(),body);
 }
});
test('static caching keeps validators and media range responses intact',async()=>{
 const env={ASSETS:{fetch:async()=>new Response('part',{status:206,headers:{ETag:'"asset"','Content-Range':'bytes 0-3/100'}})}};
 const media=await worker.fetch(request('/assets/music.mp3'),env);assert.equal(media.status,206);assert.equal(await media.text(),'part');assert.equal(media.headers.get('etag'),'"asset"');assert.equal(media.headers.get('content-range'),'bytes 0-3/100');assert.match(media.headers.get('cache-control'),/86400/);
 const html=await worker.fetch(request('/'),{ASSETS:{fetch:async()=>new Response('page')}});assert.match(html.headers.get('cache-control'),/must-revalidate/);
});
