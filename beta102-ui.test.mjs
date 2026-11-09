import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createStudySync} from './app/beta102-storage.js';
import {mountBeta102} from './app/beta102-client.js';

const KEY='kunilingo.practice84';
const user=id=>({id,username:id,displayName:id,role:'learner'});
function memory(){
  const values=new Map();
  return {get length(){return values.size;},key:index=>[...values.keys()][index]??null,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function until(predicate){for(let i=0;i<100;i++){if(predicate())return;await tick();}assert.fail('Expected UI state did not appear');}
function fixture(t,{storage=memory(),request=async()=>({user:null}),context=()=>({section:'practice',exerciseId:'445A48'})}={}){
  const window=new Window({url:'http://127.0.0.1:4197/'}),old=new Map();
  window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
  window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
  for(const [key,value]of Object.entries({document:window.document,FormData:window.FormData,localStorage:storage,matchMedia:()=>({matches:true}),getComputedStyle:window.getComputedStyle.bind(window),innerWidth:1280,innerHeight:720})){
    old.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
  }
  const root=window.document.createElement('main');window.document.body.append(root);
  const sync=createStudySync({storage,request,debounceMs:1_000_000});
  let beta=mountBeta102({root,sync,request,getContext:context});
  t.after(async()=>{beta.destroy();sync.destroy();for(const [key,descriptor]of old)descriptor?Object.defineProperty(globalThis,key,descriptor):delete globalThis[key];await window.happyDOM.close();});
  return {window,root,sync,storage,get beta(){return beta;},remount(){beta.destroy();beta=mountBeta102({root,sync,request,getContext:context});return beta;},click(action){const button=root.querySelector('[data-beta-action="'+action+'"]');assert.ok(button,action);button.click();},type(message){const field=root.querySelector('textarea[name=message]');assert.ok(field);field.value=message;field.dispatchEvent(new window.Event('input',{bubbles:true}));},submit(){root.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));}};
}

test('feedback draft survives Escape, reopening and a new mounted session until successful submission',async t=>{
  let posted;
  const f=fixture(t,{request:async(path,options)=>{if(path.endsWith('/session'))return {user:null};posted=options;return {feedback:{id:'REPORT-1'}};}});
  await f.beta.session;f.click('feedback');f.type('Поле ответа перекрывает текст условия.');
  f.root.querySelector('select[name=category]').value='content';
  f.root.querySelector('dialog').dispatchEvent(new f.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(f.root.querySelector('dialog').open,false);
  f.click('feedback');assert.equal(f.root.querySelector('textarea').value,'Поле ответа перекрывает текст условия.');assert.equal(f.root.querySelector('select[name=category]').value,'content');
  await f.remount().session;f.click('feedback');assert.equal(f.root.querySelector('textarea').value,'Поле ответа перекрывает текст условия.');
  f.submit();await until(()=>f.root.textContent.includes('Сообщение принято'));
  assert.equal(posted.expectedUser,'guest');assert.equal(posted.body.context.exerciseId,'445A48');
  assert.equal('answer' in posted.body,false);assert.equal('records' in posted.body,false);
  f.click('close');assert.equal(f.window.document.activeElement?.getAttribute('data-beta-action'),'feedback');
  f.click('feedback');assert.equal(f.root.querySelector('textarea').value,'');
});

test('failed submission remains durable and another identity or exercise cannot receive its draft',async t=>{
  let current={section:'practice',exerciseId:'445A48'};
  const f=fixture(t,{context:()=>current,request:async path=>{if(path.endsWith('/session'))return {user:null};throw new Error('Нет соединения');}});
  await f.beta.session;
  f.sync.activate(user('anna'),{revision:0,records:{}});
  f.click('feedback');f.type('Черновик Анны после ошибки отправки.');f.submit();await until(()=>f.root.textContent.includes('Нет соединения'));
  f.click('close');await f.remount().session;
  f.sync.activate(user('boris'),{revision:0,records:{}});f.click('feedback');assert.equal(f.root.querySelector('textarea').value,'');f.type('Сообщение Бориса.');f.click('close');
  f.sync.activate(user('anna'),{revision:0,records:{}});current={section:'practice',exerciseId:'AA0001'};f.click('feedback');assert.equal(f.root.querySelector('textarea').value,'');f.click('close');
  current={section:'practice',exerciseId:'445A48'};f.click('feedback');assert.equal(f.root.querySelector('textarea').value,'Черновик Анны после ошибки отправки.');
  f.click('account');f.click('feedback');assert.equal(f.root.querySelector('textarea').value,'Черновик Анны после ошибки отправки.');
  f.click('close');f.sync.activate(user('boris'),{revision:0,records:{}});f.click('feedback');assert.equal(f.root.querySelector('textarea').value,'Сообщение Бориса.');
});

test('expired shared-cookie identity exposes sign-in recovery and retains the old pending outbox',async t=>{
  let cookie='anna';const saved={anna:{revision:0,records:{}},boris:{revision:0,records:{[KEY]:{drafts:{x:'Борис'}}}}};
  const calls=[];
  const request=async(path,options={})=>{
    calls.push({path,...options});
    if(path.endsWith('/session'))return {user:user(cookie)};
    if(path.endsWith('/login')){assert.equal(options.body.username,'anna');cookie='anna';return {user:user('anna')};}
    if(path.endsWith('/progress')){
      if(options.expectedUser!==cookie)throw Object.assign(new Error('Аккаунт изменился'),{status:401,data:{error:{code:'session_changed'}}});
      if(options.method==='PUT'){assert.equal(options.body.revision,saved[cookie].revision);saved[cookie]={revision:saved[cookie].revision+1,records:structuredClone(options.body.records)};}
      return structuredClone(saved[cookie]);
    }
    throw new Error('Unexpected request '+path);
  };
  const f=fixture(t,{request});await f.beta.session;
  f.sync.storage.setItem(KEY,JSON.stringify({drafts:{x:'Несохранённый ответ Анны'}}));cookie='boris';await f.sync.flush();assert.equal(f.sync.state.status,'expired');
  f.click('account');assert.ok(f.root.querySelector('[data-beta-action=reauth]'));f.click('reauth');
  assert.equal(f.root.querySelector('input[name=username]').value,'anna');f.root.querySelector('input[name=password]').value='correct-password';f.submit();
  await until(()=>f.root.querySelector('[data-beta-action=flush]'));
  assert.equal(f.sync.user.id,'anna');assert.equal(JSON.parse(f.sync.storage.getItem(KEY)).drafts.x,'Несохранённый ответ Анны');
  assert.equal(await f.sync.flush(),true);
  assert.equal(saved.anna.records[KEY].drafts.x,'Несохранённый ответ Анны');assert.equal(saved.boris.records[KEY].drafts.x,'Борис');
  const loginIndex=calls.findIndex(call=>call.path.endsWith('/login'));assert.ok(calls.slice(0,loginIndex).some(call=>call.path.endsWith('/progress')&&call.expectedUser==='anna'));
});

test('independent views sharing device storage cannot replace drafts for other exercises',async t=>{
  const request=async()=>({user:null}),f=fixture(t,{request});await f.beta.session;
  const otherRoot=f.window.document.createElement('main');f.window.document.body.append(otherRoot);
  const otherSync=createStudySync({storage:f.storage,request,debounceMs:1_000_000});
  const other=mountBeta102({root:otherRoot,sync:otherSync,request,getContext:()=>({section:'practice',exerciseId:'AA0001'})});
  t.after(()=>{other.destroy();otherSync.destroy();});await other.session;
  f.click('feedback');f.type('Первое сообщение из первой вкладки.');f.click('close');
  otherRoot.querySelector('[data-beta-action=feedback]').click();
  const field=otherRoot.querySelector('textarea');field.value='Другое сообщение во второй вкладке.';field.dispatchEvent(new f.window.Event('input',{bubbles:true}));
  otherRoot.querySelector('[data-beta-action=close]').click();
  await f.remount().session;f.click('feedback');assert.equal(f.root.querySelector('textarea').value,'Первое сообщение из первой вкладки.');
  otherRoot.querySelector('[data-beta-action=feedback]').click();assert.equal(otherRoot.querySelector('textarea').value,'Другое сообщение во второй вкладке.');
});

test('a feedback quota failure preserves the latest in-memory text when the dialog is reopened',async t=>{
  const storage=memory(),save=storage.setItem;let full=false;
  storage.setItem=(key,value)=>{if(full&&key.startsWith('kunilingo.beta102.feedback-drafts.'))throw new Error('quota');save(key,value);};
  const f=fixture(t,{storage});await f.beta.session;f.click('feedback');f.type('Уже сохранённый текст.');f.click('close');
  full=true;f.click('feedback');f.type('Новый текст после заполнения хранилища.');assert.match(f.root.textContent,/Не удалось сохранить черновик/);f.click('close');f.click('feedback');
  assert.equal(f.root.querySelector('textarea').value,'Новый текст после заполнения хранилища.');
  full=false;f.click('close');await f.remount().session;f.click('feedback');assert.equal(f.root.querySelector('textarea').value,'Новый текст после заполнения хранилища.');
});
