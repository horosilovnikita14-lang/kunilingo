import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const api=await readFile(new URL('./server-source/fipi84-api.mjs',import.meta.url),'utf8');
const sessions=api.slice(api.indexOf('const checkSessions='),api.indexOf('let catalogPromise'));
const check=api.slice(api.indexOf('export async function checkQuestion'),api.indexOf('export function checkArchiveAnswer'));
let fixtureNumber=0;
async function fixture(){
  const code=`// isolated fixture ${++fixtureNumber}
let now=1000000,request;
const Date={now:()=>now};
export const advance=ms=>now+=ms;
export const setRequest=fn=>request=fn;
const sourceRequest=(...args)=>request(...args);
const getQuestion=async id=>({guid:id});
const encodeAnswer=(_question,answer)=>answer;
${sessions}
${check}`;
  const instance=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
  let nextCookie=0,reply='3';const calls=[];
  instance.setRequest(async(endpoint,params,post,session)=>{
    if(!session.deadline)session.deadline=1000000+calls.length*1000;
    if(endpoint==='index.php')session.cookie='PHPSESSID=session'+(++nextCookie);
    calls.push({endpoint,params,post,cookie:session.cookie,session,initialDeadline:session.deadline});
    if(endpoint==='solve.php'){
      if(reply instanceof Error)throw reply;
      return reply;
    }
    return '';
  });
  return {...instance,calls,setReply:value=>reply=value};
}

test('repeat checks reuse an idle cookie but get a fresh request deadline',async()=>{
  const f=await fixture();
  assert.deepEqual(await f.checkQuestion('445A48','first'),{status:'correct'});
  assert.deepEqual(f.calls.map(c=>c.endpoint),['index.php','questions.php','solve.php']);
  const first=f.calls.at(-1);f.advance(20000);
  assert.deepEqual(await f.checkQuestion('445A48','second'),{status:'correct'});
  assert.equal(f.calls.length,4);const second=f.calls.at(-1);
  assert.equal(second.endpoint,'solve.php');assert.equal(second.cookie,first.cookie);
  assert.notEqual(second.session,first.session);assert.notEqual(second.initialDeadline,first.initialDeadline);
});

test('expired cookies are replaced by a complete fresh FIPI session',async()=>{
  const f=await fixture();await f.checkQuestion('445A48','first');const first=f.calls.at(-1).cookie;
  f.advance(300001);await f.checkQuestion('445A48','second');
  assert.deepEqual(f.calls.slice(3).map(c=>c.endpoint),['index.php','questions.php','solve.php']);
  assert.notEqual(f.calls.at(-1).cookie,first);
});

test('failed and ungraded checks discard the leased session and the next attempt recovers',async t=>{
  for(const [reply,status,code]of [['0','unavailable','source_unavailable'],['1','submitted'],['unexpected','unavailable','source_unexpected_response'],[new Error('offline'),'unavailable','source_request_failed']]){
    await t.test(reply instanceof Error?'network failure':reply,async()=>{
      const f=await fixture();await f.checkQuestion('445A48','first');const first=f.calls.at(-1).cookie;
      f.setReply(reply);assert.deepEqual(await f.checkQuestion('445A48','retry'),{status,...(code?{code}:{})});
      f.setReply('2');assert.deepEqual(await f.checkQuestion('445A48','recovered'),{status:'incorrect'});
      assert.deepEqual(f.calls.slice(4).map(c=>c.endpoint),['index.php','questions.php','solve.php']);
      assert.notEqual(f.calls.at(-1).cookie,first);
      await f.checkQuestion('445A48','again');assert.equal(f.calls.length,8);
      assert.equal(f.calls.at(-1).endpoint,'solve.php');
    });
  }
});

test('diagnostics expose only safe error codes and no upstream messages or session data',async t=>{
  for(const [error,code]of [
    [new DOMException('private timeout details','TimeoutError'),'source_timeout'],
    [new DOMException('private abort details','AbortError'),'source_timeout'],
    [new Error('FIPI 403'),'source_http_403'],
    [new Error('FIPI 503'),'source_http_503'],
    [new Error('private URL and PHPSESSID=secret'),'source_request_failed']
  ]){
    await t.test(code,async()=>{
      const f=await fixture();f.setReply(error);
      assert.deepEqual(await f.checkQuestion('445A48','input'),{status:'unavailable',code});
    });
  }
});

test('parallel checks of the same question never share a mutable upstream session',async()=>{
  const f=await fixture();const calls=[],waiters=new Map(),started=new Map();let cookies=0;
  for(const answer of ['first','second'])started.set(answer,Promise.withResolvers());
  f.setRequest(async(endpoint,params,post,session)=>{
    if(endpoint==='index.php')session.cookie='PHPSESSID=parallel'+(++cookies);
    calls.push({endpoint,cookie:session.cookie,session});
    if(endpoint!=='solve.php')return '';
    if(started.has(params.answer)){
      const pending=Promise.withResolvers();waiters.set(params.answer,pending);started.get(params.answer).resolve();
      return pending.promise;
    }
    return '3';
  });
  const a=f.checkQuestion('445A48','first');await started.get('first').promise;
  const b=f.checkQuestion('445A48','second');await started.get('second').promise;
  const solves=calls.filter(c=>c.endpoint==='solve.php');
  assert.notEqual(solves[0].cookie,solves[1].cookie);assert.notEqual(solves[0].session,solves[1].session);
  waiters.get('second').resolve('2');assert.deepEqual(await b,{status:'incorrect'});
  waiters.get('first').resolve('3');assert.deepEqual(await a,{status:'correct'});
  await f.checkQuestion('445A48','third');
  assert.equal(calls.length,7);assert.equal(calls.at(-1).cookie,solves[1].cookie);
});

test('different questions keep separate FIPI session state',async()=>{
  const f=await fixture();await f.checkQuestion('445A48','first');const first=f.calls.at(-1).cookie;
  await f.checkQuestion('C89F82','second');const second=f.calls.at(-1).cookie;
  assert.notEqual(first,second);await f.checkQuestion('445A48','again');
  assert.equal(f.calls.length,7);assert.equal(f.calls.at(-1).cookie,first);
});

test('idle sessions have bounded capacity and evicted entries bootstrap again',async()=>{
  const f=await fixture();const ids=Array.from({length:65},(_,i)=>i.toString(16).toUpperCase().padStart(6,'0'));
  for(const id of ids)await f.checkQuestion(id,'first');
  const before=f.calls.length;await f.checkQuestion(ids[0],'evicted');
  assert.equal(f.calls.length,before+3);
  await f.checkQuestion(ids.at(-1),'retained');assert.equal(f.calls.length,before+4);
});
