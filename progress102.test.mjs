import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {course} from './app/course78-data.js';
import {progressMetrics102,progressMarkup102,createProgress102} from './app/progress102.js';

const first=course[0].lessons[0].id,second=course[0].lessons[1].id;
const catalog=[{id:'445A48',task:16},{id:'B00002',task:16},{id:'D2027-17-1',task:17}];

test('progress separates completed work, visits, drafts and errors and excludes unknown IDs',()=>{
  const metrics=progressMetrics102({catalog,courseState:{done:{[first]:true,unknown:true},theoryPassed:{[second]:true},started:{[second]:true}},practiceState:{work:{'445A48':{done:true,visited:true,lastStatus:'incorrect'},B00002:{visited:true,lastStatus:'incorrect'},UNKNOWN:{done:true}},drafts:{B00002:'unfinished','D2027-17-1':'draft'}}});
  assert.equal(metrics.path.completed,1);assert.equal(metrics.path.theory,2);assert.equal(metrics.path.started,1);
  assert.deepEqual(metrics.practice,{total:3,attempted:3,completed:1,drafts:2,incorrect:1,reviewIds:['B00002']});
  assert.equal(metrics.hasWork,true);
  assert.equal('examScore' in metrics,false);
});

test('an empty learner starts with zero real results and the first available step',()=>{
  const metrics=progressMetrics102({catalog});
  assert.equal(metrics.hasWork,false);assert.equal(metrics.path.completed,0);assert.equal(metrics.path.theory,0);
  assert.equal(metrics.path.next.id,first);assert.equal(metrics.practice.completed,0);
  assert.match(progressMarkup102(metrics),/Начни с первого шага/);
  assert.doesNotMatch(progressMarkup102(metrics),/Получается самостоятельно|балл|серия дней/);
});

test('progress markup escapes dynamic values and exposes loading and retry states',()=>{
  const metrics=progressMetrics102({catalog});metrics.path.next.title='<img src=x onerror=alert(1)>';
  metrics.practice.reviewIds=['<script>bad</script>'];
  assert.doesNotMatch(progressMarkup102(metrics),/<(?:img|script)\b/);
  assert.match(progressMarkup102(metrics,{loading:true}),/Загружаем результаты/);
  assert.match(progressMarkup102(metrics,{error:'<b>fail</b>'}),/data-progress="retry"/);
  assert.doesNotMatch(progressMarkup102(metrics,{error:'<b>fail</b>'}),/<b>/);
});

test('the progress controller retries a failed catalogue and refreshes from the active storage scope',async t=>{
  const window=new Window(),old=new Map();
  const install=(key,value)=>{old.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});};
  install('document',window.document);install('getComputedStyle',window.getComputedStyle.bind(window));install('matchMedia',()=>({matches:true}));
  let calls=0,listener,records={};
  install('fetch',async()=>{calls++;if(calls===1)throw new Error('offline');return {ok:true,json:async()=>({total:catalog.length,items:catalog})};});
  const heading=window.document.createElement('h1'),body=window.document.createElement('div');window.document.body.append(heading,body);
  const navigated=[],controller=createProgress102({body,heading,storage:{getItem:key=>records[key]?JSON.stringify(records[key]):null},subscribe:callback=>{listener=callback;return()=>{listener=null;};},onNavigate:(...args)=>navigated.push(args)});
  t.after(async()=>{controller.destroy();for(const [key,descriptor]of old)descriptor?Object.defineProperty(globalThis,key,descriptor):delete globalThis[key];await window.happyDOM.close();});
  const settle=()=>new Promise(resolve=>setImmediate(resolve));
  controller.show();await settle();assert.match(body.textContent,/Не удалось загрузить/);
  body.querySelector('[data-progress="retry"]').click();await settle();assert.match(body.textContent,/Начни с первого шага/);
  records={'kunilingo.practice84':{work:{B00002:{visited:true,lastStatus:'incorrect'}}}};listener();
  assert.ok(body.querySelector('[data-progress-question="B00002"]'));
  body.querySelector('[data-progress-question="B00002"]').click();assert.deepEqual(navigated,[['practice',{questionId:'B00002'}]]);
  records={};listener();assert.equal(body.querySelector('[data-progress-question]'),null);
  controller.leave();const prior=body.innerHTML;records={'kunilingo.russian.course78':{done:{[first]:true}}};listener();assert.equal(body.innerHTML,prior);
});
