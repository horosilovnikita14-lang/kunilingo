import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {topics,topicEntries,inferTags} from './app/practice84-taxonomy.js';
import {concepts100,task16TopicIds100,guideForQuestion100,guideMarkup100,lessonGuideMarkup100,conceptMarkup100} from './app/study100-guides.js';
import {sources100} from './app/study100-task16.js';
import {createGuideRail100} from './app/study100-rail.js';
import {createPractice} from './app/practice85.js';
import {sourceFragment} from './app/practice84-content.js';

const reviewed=(id='test',tags=['homogeneous-repeat'])=>({id,task:16,tags,topicReview:{version:100,status:'reviewed'}});
function fixture(t){
  const window=new Window(),old=new Map();
  for(const [key,value]of Object.entries({document:window.document,matchMedia:()=>({matches:true}),getComputedStyle:window.getComputedStyle.bind(window)})){
    old.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
  }
  t.after(async()=>{for(const [key,descriptor]of old)descriptor?Object.defineProperty(globalThis,key,descriptor):delete globalThis[key];await window.happyDOM.close();});
  const rail=window.document.createElement('aside');rail.dataset.open='false';rail.setAttribute('aria-label','Фильтры практики');
  rail.innerHTML='<header>Каталог</header><div class="practice-rail-body"><form><input name="query" value="союзы"><input type="checkbox" name="topic" value="homogeneous-repeat" checked></form></div>';
  window.document.body.append(rail);
  return {window,rail,guide:createGuideRail100(rail)};
}

test('contextual guides contain only the categories assigned to this exercise',()=>{
  const narrow=guideForQuestion100(reviewed());
  assert.deepEqual(narrow.concepts.map(concept=>concept.id),['homogeneous-repeat']);
  assert.equal(narrow.concepts[0],concepts100.find(concept=>concept.id==='homogeneous-repeat'));
  const sameNumber=guideForQuestion100(reviewed('another',['compound-simple']));
  assert.deepEqual(sameNumber.concepts.map(concept=>concept.id),['compound-simple']);
  assert.notDeepEqual(narrow.concepts,sameNumber.concepts);
  assert.deepEqual(guideForQuestion100(reviewed('different-id')).concepts,narrow.concepts);
  const retagged=guideForQuestion100({...reviewed(),tags:['homogeneous-pair']});
  assert.deepEqual(retagged.concepts.map(concept=>concept.id),['homogeneous-pair']);
  assert.doesNotMatch(guideMarkup100(narrow),/study-guide-algorithm|Как решать задание|data-guide-topic="syntax-basis"/);
  assert.equal(narrow.algorithm,undefined);
  assert.equal(guideForQuestion100({task:19}),null);
  assert.equal(guideForQuestion100(null),null);
});

test('unknown, parent and missing categories cannot expand a guide to the entire numbered block',()=>{
  for(const question of [
    {task:16},{task:16,tags:[]},{task:16,tags:'homogeneous-repeat'},
    {task:16,tags:['homogeneous-unions']},{task:16,tags:['unknown-category']}
  ])assert.equal(guideForQuestion100(question),null);
  const tags=['homogeneous-repeat','homogeneous-repeat','homogeneous-unions','unknown-category'];
  for(const topicReview of [undefined,{version:99,status:'reviewed'},{version:100,status:'partial'},{version:100,status:'reviewed'}]){
    assert.deepEqual(guideForQuestion100({task:16,tags,topicReview}).concepts.map(concept=>concept.id),['homogeneous-repeat']);
  }
});

test('Path lessons keep their full shared topic handbooks independently of contextual selection',()=>{
  assert.doesNotMatch(lessonGuideMarkup100('simple-1'),/data-guide-topic="compound-common"/);
  assert.match(lessonGuideMarkup100('simple-1'),/data-guide-topic="syntax-basis"/);
  assert.match(lessonGuideMarkup100('simple-1'),/data-guide-topic="homogeneous-repeat"/);
  assert.match(lessonGuideMarkup100('simple-2'),/data-guide-topic="compound-common"/);
  assert.equal(lessonGuideMarkup100('norms-1'),'');
});

test('every task-16 leaf has content, examples, conditions and traceable primary sources',()=>{
  const leaves=topicEntries(16).filter(topic=>!topic.children);
  assert.ok(topics[16].length);
  assert.deepEqual(new Set(leaves.map(topic=>topic.id)),new Set(task16TopicIds100));
  assert.equal(new Set(concepts100.map(concept=>concept.id)).size,concepts100.length);
  for(const concept of concepts100){
    assert.ok(concept.summary&&concept.rule.length&&concept.algorithm.length&&concept.exceptions.length&&concept.traps.length,concept.id);
    assert.ok(concept.examples.length>=2,concept.id);
    for(const example of concept.examples)assert.ok(example.text&&example.explanation,concept.id);
    for(const id of concept.sourceIds){const source=sources100[id];assert.ok(source,id);assert.equal(new URL(source.url).protocol,'https:');assert.equal(source.checkedAt,'2026-11-08');}
  }
  assert.deepEqual(inferTags(16,'Он взял карту и проверил фонарь и батарейки.'),[]);
});

test('opening and answering keep the same guide DOM; returning restores the real catalogue and its state',async t=>{
  const {rail,guide}=fixture(t),catalogue=rail.firstChild,field=rail.querySelector('[name=query]'),checkbox=rail.querySelector('[name=topic]'),catalogueBody=rail.querySelector('.practice-rail-body');
  field.value='повторяющиеся';checkbox.checked=true;catalogueBody.scrollTop=37;
  let changes=0;field.addEventListener('change',()=>changes++);
  assert.equal(guide.show(reviewed()),true);
  // Emulate an engine resetting layout scroll while nodes are detached.
  catalogueBody.scrollTop=0;
  const cards=[...rail.querySelectorAll('[data-guide-topic]')];
  assert.equal(cards.length,1);assert.ok(cards.every(card=>!card.open));
  const card=cards[0];card.querySelector('summary').click();await Promise.resolve();
  assert.equal(card.dataset.expanded,'true');
  const guideBody=rail.querySelector('.practice-guide-body');guideBody.scrollTop=83;
  assert.equal(guide.show({...reviewed(),answerStatus:'incorrect'}),true);
  assert.equal(rail.querySelector('[data-guide-topic="homogeneous-repeat"]'),card);
  assert.equal(guideBody.scrollTop,83);assert.equal(card.dataset.expanded,'true');
  assert.equal(guide.restore(),true);assert.equal(guide.active,false);assert.equal(rail.firstChild,catalogue);
  assert.equal(rail.querySelector('[name=query]'),field);assert.equal(field.value,'повторяющиеся');assert.equal(checkbox.checked,true);assert.equal(catalogueBody.scrollTop,37);assert.equal(rail.dataset.open,'false');
  field.dispatchEvent(new field.ownerDocument.defaultView.Event('change'));assert.equal(changes,1);
});

test('changing exercises resets topic disclosure; unsupported types restore the catalogue',t=>{
  const {rail,guide}=fixture(t);
  guide.show(reviewed('a'));const old=rail.querySelector('[data-guide-topic="homogeneous-repeat"]');old.querySelector('summary').click();
  guide.show(reviewed('b',['compound-common']));
  assert.equal(rail.querySelector('[data-guide-topic="homogeneous-repeat"]'),null);
  assert.equal(rail.querySelector('[data-guide-topic="compound-common"]').open,false);
  assert.equal(guide.toggle(),true);
  assert.equal(guide.show({id:'other',task:18}),false);assert.match(rail.textContent,/Каталог/);assert.equal(guide.active,false);
});

test('updating categories of the same exercise replaces only its contextual topic list',t=>{
  const {rail,guide}=fixture(t);
  guide.show(reviewed('same',['homogeneous-repeat']));
  assert.ok(rail.querySelector('[data-guide-topic="homogeneous-repeat"]'));
  guide.show(reviewed('same',['homogeneous-pair']));
  assert.equal(rail.querySelector('[data-guide-topic="homogeneous-repeat"]'),null);
  assert.ok(rail.querySelector('[data-guide-topic="homogeneous-pair"]'));
  assert.equal(rail.querySelectorAll('[data-guide-topic]').length,1);
});

test('the shared handbook escapes text and never turns an example into executable markup',()=>{
  const html=conceptMarkup100({id:'sample',title:'<img src=x onerror=alert(1)>',summary:'<script>bad</script>',rule:['<b>word</b>'],examples:[{text:'<svg/onload=alert(1)>',explanation:'<iframe>'}]});
  assert.doesNotMatch(html,/<(?:img|script|svg|iframe)\b/i);
  assert.match(html,/&lt;img/);assert.match(html,/&lt;svg/);
});

test('inline source spans and named accents render without the false gaps of plain-text audit extraction',t=>{
  const {window}=fixture(t),fragment=sourceFragment('<p>в <span>город</span>ских фонтанах, уж&eacute; и снег&aacute;</p>',window.document);
  assert.equal(fragment.textContent,'в городских фонтанах, ужé и снегá');
});

test('the practice controller opens context, keeps its state through checking and restores selected filters',async t=>{
  const {window}=fixture(t),old=new Map(),doc=window.document;
  const set=(key,value)=>{old.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});};
  set('localStorage',window.localStorage);set('FormData',window.FormData);
  set('ResizeObserver',class{observe(){}disconnect(){}});
  set('requestAnimationFrame',()=>1);set('cancelAnimationFrame',()=>{});
  const entry={...reviewed('TEST16'),internalId:'Р-TEST16',codes:[],year:null},question={...entry,mode:'short',form:'<p>Укажите цифры, на месте которых нужны запятые.</p><p>Мы взяли и карту(1) и новый компас(2).</p>'};
  window.localStorage.setItem('kunilingo.practice84',JSON.stringify({filters:{task:16,topics:['homogeneous-repeat'],year:'all'}}));
  let resolveCheck;const check=new Promise(resolve=>resolveCheck=resolve);
  set('fetch',async url=>({ok:true,json:()=>url.includes('/question?')?Promise.resolve(question):url.endsWith('/check')?check:Promise.resolve({total:1,items:[entry]})}));
  let practice;t.after(()=>{practice?.leave();for(const [key,descriptor]of old)descriptor?Object.defineProperty(globalThis,key,descriptor):delete globalThis[key];});
  doc.body.innerHTML='<main id="room" data-section="practice"><section id="panel"><h2 id="heading"></h2><div id="body"></div></section></main>';
  const root=doc.querySelector('#room'),panel=doc.querySelector('#panel'),body=doc.querySelector('#body'),heading=doc.querySelector('#heading');
  practice=createPractice({root,panel,body,heading});
  const tick=()=>new Promise(resolve=>setImmediate(resolve));
  await practice.show();
  // happy-dom 21 currently ignores an option's parsed selected attribute.
  // Set the real DOM property explicitly; this test covers preservation during
  // guide/answer transitions, not a substitute for browser select rendering QA.
  const rail=root.querySelector('.practice-rail'),type=rail.querySelector('[name=task]');type.value='16';
  assert.equal(rail.querySelector('[name=task]').value,'16','selected type before opening');
  const topic=rail.querySelector('[name=topic][value=homogeneous-repeat]');topic.checked=true;
  const filters=rail.querySelector('[data-practice-filters]');filters.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
  assert.equal(rail.querySelector('[name=task]').value,'16','selected type after applying');
  body.querySelector('[data-question]').click();await tick();
  const guide=rail.querySelector('[data-guide-topic="homogeneous-repeat"]');assert.ok(guide);assert.equal(rail.querySelector('[data-practice-filters]'),null);
  guide.querySelector('summary').click();await tick();assert.equal(guide.dataset.expanded,'true');
  const answer=body.querySelector('[name=answer]');answer.value='1';answer.dispatchEvent(new window.Event('input',{bubbles:true}));
  body.querySelector('[data-practice-answer]').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
  assert.equal(rail.querySelector('[data-guide-topic="homogeneous-repeat"]'),guide);
  resolveCheck({status:'incorrect'});await tick();await tick();
  assert.equal(rail.querySelector('[data-guide-topic="homogeneous-repeat"]'),guide);assert.equal(guide.dataset.expanded,'true');assert.equal(body.querySelector('[name=answer]').value,'1');
  assert.ok(body.querySelector('[data-pencil-controls]'));
  body.querySelector('[data-practice=back]').click();await tick();
  assert.equal(rail.querySelector('[data-practice-filters]'),filters);assert.equal(rail.querySelector('[name=topic][value=homogeneous-repeat]').checked,true);assert.equal(rail.querySelector('[name=task]').value,'16');
  const saved=JSON.parse(window.localStorage.getItem('kunilingo.practice84'));assert.equal(saved.drafts.TEST16,'1');assert.deepEqual(saved.filters.topics,['homogeneous-repeat']);
});
