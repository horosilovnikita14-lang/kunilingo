import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const code=await readFile(new URL('./dist/server/index.js',import.meta.url),'utf8');
const worker=(await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))).default;
test('hosted catalog and exercise preserve totals and keep keys server-side',async()=>{
 const c=await (await worker.fetch(new Request('https://example.test/api/fipi/catalog'),{})).json();assert.equal(c.total,2795);assert.ok(c.items.every(q=>!('answer'in q)));
 const q=await (await worker.fetch(new Request('https://example.test/api/fipi/question?id=D2027-2-1'),{})).json();assert.equal((q.form.match(/<li>/g)||[]).length,5);assert.ok(!('answer'in q));
});
test('hosted checker accepts reordered digit sets and rejects omissions and foreign origins',async()=>{
 for(const [answer,status]of [['5421','correct'],['124','incorrect']]){const r=await worker.fetch(new Request('https://example.test/api/fipi/check',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://example.test'},body:JSON.stringify({id:'D2027-4-1',answer})}),{});assert.equal((await r.json()).status,status);}
 const r=await worker.fetch(new Request('https://example.test/api/fipi/check',{method:'POST',headers:{Origin:'https://other.test'}}),{});assert.equal(r.status,403);
});
test('frontend routes forward to the static asset binding',async()=>{
 const r=await worker.fetch(new Request('https://example.test/'),{ASSETS:{fetch:()=>new Response('frontend')}});assert.equal(await r.text(),'frontend');
});
test('bank exercise opens from the stored snapshot without any upstream request',async t=>{
 const original=globalThis.fetch;let requests=0;globalThis.fetch=async()=>{requests++;throw new Error('Upstream unavailable');};t.after(()=>globalThis.fetch=original);
 const r=await worker.fetch(new Request('https://example.test/api/fipi/question?id=445A48'),{}),q=await r.json();
 assert.equal(r.status,200);assert.match(q.form,/Мамонтова/);assert.equal(q.internalId,'Р-00005');assert.equal(requests,0);
 const check=await worker.fetch(new Request('https://example.test/api/fipi/check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:'445A48',answer:'4321'})}),{});
 assert.equal((await check.json()).status,'unavailable');assert.ok(requests>0);
});
test('a later answer check retains cached cookies without inheriting the previous deadline',async t=>{
 const transport=await readFile(new URL('./worker-transport.js',import.meta.url),'utf8');
 const api=await readFile(new URL('./server-source/fipi84-api.mjs',import.meta.url),'utf8');
 const sessions=api.slice(api.indexOf('const checkSessions='),api.indexOf('let catalogPromise'));
 const check=api.slice(api.indexOf('export async function checkQuestion'),api.indexOf('export function checkArchiveAnswer'));
 const fixture="const bank='https://example.test/bank/',project='test';const getQuestion=async()=>({guid:'test'});const encodeAnswer=(_question,answer)=>answer;\n"+sessions+"\ncheckSessions.set('445A48',{cookie:'PHPSESSID=retained',expiresAt:Date.now()+60000,deadline:1});\n";
 const {checkQuestion}=await import('data:text/javascript;base64,'+Buffer.from(fixture+transport+'\n'+check).toString('base64'));
 const originalFetch=globalThis.fetch,originalNow=Date.now;let now=originalNow(),calls=0;
 t.after(()=>{globalThis.fetch=originalFetch;Date.now=originalNow;});Date.now=()=>now;
 globalThis.fetch=async(_url,options)=>{
  calls++;assert.equal(options.headers.Cookie,'PHPSESSID=retained');
  await new Promise(resolve=>setTimeout(resolve,15));options.signal.throwIfAborted();
  return new Response('3',{headers:{'Set-Cookie':'PHPSESSID=retained; Path=/'}});
 };
 assert.deepEqual(await checkQuestion('445A48','1111'),{status:'correct'});
 now+=10000;
 assert.deepEqual(await checkQuestion('445A48','1111'),{status:'correct'});assert.equal(calls,2);
});
test('bank checking preserves the original case of FIPI identifiers while retaining the application ID',async()=>{
 const api=await readFile(new URL('./server-source/fipi84-api.mjs',import.meta.url),'utf8');
 const sessions=api.slice(api.indexOf('const checkSessions='),api.indexOf('let catalogPromise'));
 const question=JSON.parse(await readFile(new URL('./server-source/bank-snapshot.json',import.meta.url),'utf8')).items.find(q=>q.id==='C89F82');
 const check=api.slice(api.indexOf('export async function checkQuestion'),api.indexOf('export function checkArchiveAnswer'));
 const fixture=`const cache=new Map();const question=${JSON.stringify(question)};const getQuestion=async id=>{if(id!==question.id)throw new Error('Application ID changed');return question;};const encodeAnswer=(_question,answer)=>answer;export const requests=[];const sourceRequest=async(endpoint,params)=>{requests.push({endpoint,params});return '3';};\n`;
 const {checkQuestion,requests}=await import('data:text/javascript;base64,'+Buffer.from(fixture+sessions+check).toString('base64'));
 assert.deepEqual(await checkQuestion('C89F82','test'),{status:'correct'});
 assert.equal(requests.find(r=>r.endpoint==='questions.php').params.qid,'c89F82');
 assert.equal(requests.find(r=>r.endpoint==='solve.php').params.guid,'fa6bf1ad498f4283ab2297f4ee2723e8');
});
