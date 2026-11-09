import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createCourse} from './app/course78.js';
import {createPractice} from './app/practice85.js';

const memory=()=>{const values=new Map();let writes=0;return {getItem:key=>values.get(key)||null,setItem(key,value){writes++;values.set(key,String(value));},get writes(){return writes;}};};

test('disposing the old learner removes listeners, rails and late answer callbacks before the next learner mounts',async t=>{
  const window=new Window(),old=new Map();
  const install=(key,value)=>{old.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});};
  for(const [key,value]of Object.entries({document:window.document,matchMedia:()=>({matches:true}),getComputedStyle:window.getComputedStyle.bind(window),FormData:window.FormData,ResizeObserver:class{observe(){}disconnect(){}},requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{}}))install(key,value);
  const question={id:'445A48',task:16,internalId:'Р-00001',tags:['homogeneous-repeat'],codes:[],mode:'short',form:'<p>Укажите цифры, где нужны запятые.</p><p>И карта(1) и компас лежали на столе.</p>',topicReview:{version:100,status:'reviewed'}};
  let finishCheck;const check=new Promise(resolve=>finishCheck=resolve);
  install('fetch',async url=>({ok:true,json:async()=>url.endsWith('/check')?check:url.includes('/question?')?question:{total:1,items:[question]}}));
  const root=window.document.createElement('main');root.id='room';root.dataset.section='practice';
  root.innerHTML='<section class="study-panel"><h1></h1><div class="study-body"></div></section>';window.document.body.append(root);
  const panel=root.querySelector('section'),heading=root.querySelector('h1'),body=root.querySelector('.study-body');
  const a=memory(),b=memory();let courseA,practiceA,courseB,practiceB;
  t.after(async()=>{practiceA?.destroy();courseA?.destroy();practiceB?.destroy();courseB?.destroy();for(const [key,descriptor]of old)descriptor?Object.defineProperty(globalThis,key,descriptor):delete globalThis[key];await window.happyDOM.close();});
  courseA=createCourse({body,heading,storage:a});practiceA=createPractice({root,panel,body,heading,storage:a});
  await practiceA.open('445A48');
  assert.deepEqual(practiceA.getContext(),{section:'practice',exerciseId:'445A48'});
  const input=body.querySelector('[name=answer]');input.value='1';input.dispatchEvent(new window.Event('input',{bubbles:true}));
  body.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));await Promise.resolve();
  practiceA.destroy();courseA.destroy();const writesAfterDispose=a.writes;
  assert.equal(root.querySelectorAll('.practice-rail,.course-notes').length,0);
  courseB=createCourse({body,heading,storage:b});practiceB=createPractice({root,panel,body,heading,storage:b});
  await practiceB.open('445A48');const before=body.innerHTML;
  finishCheck({status:'correct'});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(a.writes,writesAfterDispose);assert.equal(body.innerHTML,before);
  const current=body.querySelector('[name=answer]');assert.equal(current.value,'');current.value='2';current.dispatchEvent(new window.Event('input',{bubbles:true}));
  assert.equal(a.writes,writesAfterDispose);assert.equal(JSON.parse(b.getItem('kunilingo.practice84')).drafts['445A48'],'2');
  assert.equal(root.querySelectorAll('.practice-rail').length,1);assert.equal(root.querySelectorAll('.course-notes').length,1);
});
