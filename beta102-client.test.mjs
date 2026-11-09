import test from 'node:test';
import assert from 'node:assert/strict';
import {createStudySync,isStudyStorageKey,summarizeStudyRecords} from './app/beta102-storage.js';
import {feedbackContext,performIdentityChange} from './app/beta102-client.js';
const KEY='kunilingo.practice84',user=id=>({id,username:id,displayName:id,role:'student'});
function memory(initial={}){
  const values=new Map(Object.entries(initial));
  return {get length(){return values.size;},key:index=>[...values.keys()][index]??null,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key),values};
}
const work=text=>({drafts:{A:text},work:{A:{visited:true}},filters:{task:16}});
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const conflict=(revision,records)=>Object.assign(new Error('conflict'),{status:409,data:{revision,records}});
function setup(t,{storage=memory(),request=async()=>{throw new Error('offline');}}={}){
  const sync=createStudySync({storage,request,debounceMs:1_000_000});t.after(()=>sync.destroy());return {sync,storage};
}

test('saving an unchanged screen snapshot does not create a revision or an avoidable cross-tab conflict',async t=>{
  let calls=0;const current=work('same work');
  const {sync}=setup(t,{request:async()=>{calls++;throw new Error('must not send');}});
  sync.activate(user('anna'),{revision:4,records:{[KEY]:current}});
  sync.storage.setItem(KEY,JSON.stringify(current));
  assert.equal(sync.state.dirty,false);assert.equal(sync.state.revision,4);
  assert.equal(await sync.flush(),false);assert.equal(calls,0);
});

test('guest, two account snapshots and logout remain isolated without copying guest into an account',t=>{
  const guest=work('гостевой ответ'),{sync,storage}=setup(t,{storage:memory({[KEY]:JSON.stringify(guest),'kunilingo.menuGlass':'off'})});
  assert.deepEqual(sync.snapshot(),{[KEY]:guest});
  sync.activate(user('anna'),{revision:3,records:{[KEY]:work('ответ Анны')}});
  assert.equal(JSON.parse(sync.storage.getItem(KEY)).drafts.A,'ответ Анны');
  sync.storage.setItem(KEY,JSON.stringify(work('Анна продолжила')));
  assert.deepEqual(JSON.parse(storage.getItem(KEY)),guest);
  sync.activate(user('boris'),{revision:2,records:{[KEY]:work('ответ Бориса')}});
  assert.equal(JSON.parse(sync.storage.getItem(KEY)).drafts.A,'ответ Бориса');
  sync.activate(user('anna'),{revision:3,records:{[KEY]:work('ответ Анны')}});
  assert.equal(JSON.parse(sync.storage.getItem(KEY)).drafts.A,'Анна продолжила');
  assert.equal(sync.state.dirty,true);
  sync.activate(null);
  assert.equal(JSON.parse(sync.storage.getItem(KEY)).drafts.A,'гостевой ответ');
  assert.equal(storage.getItem('kunilingo.menuGlass'),'off');
});

test('offline outbox survives reload and synchronizes when the same account returns',async t=>{
  const storage=memory(),first=setup(t,{storage}).sync;
  first.activate(user('anna'),{revision:1,records:{}});
  first.storage.setItem(KEY,JSON.stringify(work('не потерять')));
  assert.equal(await first.flush(),false);assert.equal(first.state.status,'offline');
  let sent;
  const second=setup(t,{storage,request:async(path,{body}={})=>{sent=body;return {revision:2,records:body.records};}}).sync;
  second.activate(user('anna'),{revision:1,records:{}});
  assert.equal(JSON.parse(second.storage.getItem(KEY)).drafts.A,'не потерять');
  assert.equal(await second.flush(),true);
  assert.equal(sent.revision,1);assert.equal(sent.records[KEY].drafts.A,'не потерять');
  assert.equal(second.state.dirty,false);
  const third=setup(t,{storage}).sync;
  third.activate(user('anna'),{revision:2,records:sent.records});
  assert.equal(third.state.status,'saved');
  third.activate(null);assert.equal(third.storage.getItem(KEY),null);
});

test('an edit made during a request is sent serially with the newly returned revision',async t=>{
  const first=deferred(),calls=[];
  const {sync}=setup(t,{request:async(path,{body})=>{calls.push(structuredClone(body));return calls.length===1?first.promise:{revision:3,records:body.records};}});
  sync.activate(user('anna'),{revision:1,records:{}});sync.storage.setItem(KEY,JSON.stringify(work('первый')));
  const saving=sync.flush();assert.equal(calls.length,1);
  sync.storage.setItem(KEY,JSON.stringify(work('последний')));
  assert.equal(sync.flush(),saving);
  first.resolve({revision:2,records:calls[0].records});assert.equal(await saving,true);
  assert.deepEqual(calls.map(call=>call.revision),[1,2]);
  assert.equal(calls[0].records[KEY].drafts.A,'первый');assert.equal(calls[1].records[KEY].drafts.A,'последний');
  assert.equal(JSON.parse(sync.storage.getItem(KEY)).drafts.A,'последний');assert.equal(sync.state.dirty,false);
});

test('a CAS conflict preserves the pending version and requires a choice after reload too',async t=>{
  const remote={[KEY]:work('на другом устройстве')},storage=memory();let puts=0;
  const {sync}=setup(t,{storage,request:async()=>{puts++;throw conflict(7,remote);}});
  sync.activate(user('anna'),{revision:5,records:{}});sync.storage.setItem(KEY,JSON.stringify(work('на этом устройстве')));
  assert.equal(await sync.flush(),false);assert.equal(sync.state.status,'conflict');assert.equal(sync.state.revision,5);
  assert.equal(await sync.flush(),false);assert.equal(puts,1);
  assert.equal(JSON.parse(sync.storage.getItem(KEY)).drafts.A,'на этом устройстве');
  const reloaded=setup(t,{storage}).sync;
  reloaded.activate(user('anna'),{revision:7,records:remote});assert.equal(reloaded.state.status,'conflict');
  assert.equal(reloaded.state.revision,5);
  const again=setup(t,{storage}).sync;
  again.activate(user('anna'),{revision:7,records:remote});assert.equal(again.state.status,'conflict');
  assert.equal(again.resolveConflict('server'),true);assert.equal(again.state.dirty,false);
  assert.equal(JSON.parse(again.storage.getItem(KEY)).drafts.A,'на другом устройстве');
});

test('explicitly choosing device work sends it against the displayed remote revision',async t=>{
  const storage=memory(),seed=setup(t,{storage}).sync;
  seed.activate(user('anna'),{revision:1,records:{}});seed.storage.setItem(KEY,JSON.stringify(work('локальная')));
  let sent;const sync=setup(t,{storage,request:async(path,{body})=>{sent=body;return {revision:4,records:body.records};}}).sync;
  sync.activate(user('anna'),{revision:3,records:{[KEY]:work('серверная')}});
  assert.equal(sync.resolveConflict('device'),true);assert.equal(await sync.flush(),true);
  assert.equal(sent.revision,3);assert.equal(sent.records[KEY].drafts.A,'локальная');
});

test('guest import is explicit, replaces account records and leaves the guest copy intact',t=>{
  const guest=work('гость'),sync=setup(t,{storage:memory({[KEY]:JSON.stringify(guest)})}).sync;
  sync.activate(user('anna'),{revision:4,records:{[KEY]:work('аккаунт'),'kunilingo.russian.course78':{done:['topic']}}});
  assert.equal(JSON.parse(sync.storage.getItem(KEY)).drafts.A,'аккаунт');
  assert.equal(sync.replaceWithGuest(),true);assert.deepEqual(sync.snapshot(),{[KEY]:guest});assert.equal(sync.state.dirty,true);
  sync.activate(null);assert.deepEqual(sync.snapshot(),{[KEY]:guest});
});

test('unknown-server offline edits cannot overwrite existing remote progress without consent',async t=>{
  let puts=0;const remote={[KEY]:work('другая работа')};
  const {sync}=setup(t,{request:async(path,options)=>{if(options?.method==='PUT')puts++;return {revision:4,records:remote};}});
  sync.activate(user('anna'),null);sync.storage.setItem(KEY,JSON.stringify(work('работа офлайн')));
  assert.equal(await sync.flush(),false);assert.equal(puts,0);assert.equal(sync.state.status,'conflict');
  assert.equal(JSON.parse(sync.storage.getItem(KEY)).drafts.A,'работа офлайн');
});

test('late responses cannot move one account data into another account scope',async t=>{
  const pending=deferred(),sync=setup(t,{request:()=>pending.promise}).sync;
  sync.activate(user('anna'),{revision:0,records:{}});sync.storage.setItem(KEY,JSON.stringify(work('Анна')));const saving=sync.flush();
  sync.activate(user('boris'),{revision:5,records:{[KEY]:work('Борис')}});
  pending.resolve({revision:1,records:{[KEY]:work('Анна')}});await saving;
  assert.equal(sync.user.id,'boris');assert.equal(sync.state.revision,5);assert.equal(JSON.parse(sync.storage.getItem(KEY)).drafts.A,'Борис');
});

test('quota failure leaves the last durable snapshot intact and reports the problem',t=>{
  const native=memory(),sync=setup(t,{storage:native}).sync;sync.activate(user('anna'),{revision:1,records:{[KEY]:work('сохранено')}});
  const before=[...native.values.values()];native.setItem=()=>{throw new Error('quota');};
  assert.throws(()=>sync.storage.setItem(KEY,JSON.stringify(work('новое'))),/quota/);
  assert.deepEqual([...native.values.values()],before);assert.equal(sync.state.status,'storage_error');assert.match(sync.state.error,/Не удалось сохранить/);
});

test('storage accepts real learning keys and excludes atmospheric settings and unsafe suffixes',t=>{
  for(const key of [KEY,'kunilingo.russian.course78','kunilingo.russian.path.v1','kunilingo.pencil98.preferences','kunilingo.pencil98.445A48','kunilingo.pencil98.D2027-4-1','kunilingo.pencil98.D2006-A12-1'])assert.equal(isStudyStorageKey(key),true,key);
  for(const key of ['kunilingo.menuGlass','kunilingo.pencil98.__proto__','kunilingo.pencil98.abc/def','constructor',''])assert.equal(isStudyStorageKey(key),false,key);
  const sync=setup(t).sync;assert.throws(()=>sync.storage.setItem('kunilingo.menuGlass','"off"'),TypeError);
  assert.equal(sync.storage.getItem('kunilingo.menuGlass'),null);
});

test('feedback context is an explicit allowlist without answers, drawings or URLs',()=>{
  assert.deepEqual(feedbackContext({section:'practice',exerciseId:'445A48',version:'102',answer:'123',strokes:[{}],url:'https://private.invalid'},{width:1280,height:720}),{section:'practice',exerciseId:'445A48',version:'102',viewport:{width:1280,height:720}});
  assert.deepEqual(feedbackContext({section:'not-a-section',lessonId:'x'.repeat(130)},{width:1,height:Infinity}),{section:'general',lessonId:'x'.repeat(120)});
  assert.equal(summarizeStudyRecords({[KEY]:work('a')}).drafts,1);
});

test('controller disposal and old-account flush finish before a cookie-changing request',async()=>{
  const order=[],pending=deferred();let current=user('anna');
  const sync={get user(){return current;},async flush(){order.push('flush');await pending.promise;order.push('flushed');}};
  const changing=performIdentityChange({sync,reason:'login',onIdentityChange:async({phase,user})=>{order.push(phase+':'+user.id);},operation:async()=>{order.push('cookie');current=user('boris');}});
  await Promise.resolve();await Promise.resolve();assert.deepEqual(order,['before:anna','flush']);
  pending.resolve();await changing;
  assert.deepEqual(order,['before:anna','flush','flushed','cookie','after:boris']);
});

test('failed authentication and failed controller disposal restore the old workspace',async()=>{
  const order=[],sync={user:user('anna'),async flush(){order.push('flush');}};
  await assert.rejects(performIdentityChange({sync,reason:'login',onIdentityChange:async({phase})=>order.push(phase),operation:async()=>{throw new Error('wrong password');}}),/wrong password/);
  assert.deepEqual(order,['before','flush','after']);order.length=0;
  await assert.rejects(performIdentityChange({sync,reason:'logout',onIdentityChange:async({phase})=>{order.push(phase);if(phase==='before')throw new Error('dispose failed');},operation:async()=>order.push('cookie')}),/dispose failed/);
  assert.deepEqual(order,['before','after']);
});
