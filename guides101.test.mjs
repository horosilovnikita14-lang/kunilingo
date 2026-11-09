import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {topicEntries,inferTags,filterCatalog} from './app/practice84-taxonomy.js';
import {task17Concepts101,sources101} from './app/study101-task17.js';
import {articleIds101,conceptFor101,questionGuide101,lessonConceptIds101} from './app/study101-registry.js';
import {guideForQuestion100,guideMarkup100,lessonGuideMarkup100} from './app/study100-guides.js';
import {createGuideRail100} from './app/study100-rail.js';
import {applyTopicReviews100} from './server-source/topics100.mjs';

const reviewed=(tags=['separate-gerund'])=>({id:'source-bound',task:17,tags,topicReview:{version:100,status:'reviewed'}});

test('the task-17 handbook covers every leaf once, including gaps in the old category tree',()=>{
  const leaves=topicEntries(17).filter(topic=>!topic.children).map(topic=>topic.id);
  assert.equal(leaves.length,9);
  assert.deepEqual(new Set(task17Concepts101.map(concept=>concept.id)),new Set(leaves));
  assert.equal(task17Concepts101.length,leaves.length);
  for(const concept of task17Concepts101){
    assert.equal(conceptFor101(concept.id),concept);
    assert.ok(articleIds101.includes(concept.id));
    assert.ok(concept.summary&&concept.rule.length&&concept.algorithm.length&&concept.exceptions.length&&concept.traps.length,concept.id);
    assert.ok(concept.examples.length>=3,concept.id);
    for(const example of concept.examples)assert.ok(example.text&&example.explanation,concept.id);
    assert.ok(concept.sourceIds.length,concept.id);
    for(const id of concept.sourceIds){
      assert.ok(sources101[id],id);
      assert.equal(new URL(sources101[id].url).protocol,'https:');
      assert.equal(sources101[id].checkedAt,'2026-11-09');
    }
  }
});

test('Practice adds exactly the verified categories and never fills gaps with a whole handbook',()=>{
  const guide=guideForQuestion100(reviewed(['separate-gerund','separate-gerund','separate-definition','unknown']));
  assert.deepEqual(guide.concepts.map(concept=>concept.id),['separate-gerund']);
  assert.equal(guide.reviewed,true);
  assert.deepEqual(guideForQuestion100({...reviewed(),id:'unrelated-id'}).concepts,guide.concepts);
  const changed=guideForQuestion100(reviewed(['separate-apposition']));
  assert.deepEqual(changed.concepts.map(concept=>concept.id),['separate-apposition']);
  for(const question of [null,{task:17},{...reviewed(),tags:[]},reviewed(['separate-definition']),reviewed(['unknown']),{...reviewed(),topicReview:undefined},{...reviewed(),topicReview:{version:100,status:'partial'}}])assert.equal(questionGuide101(question),null);
  const markup=guideMarkup100(guide);
  assert.doesNotMatch(markup,/data-guide-topic="separate-(?:apposition|participle|exception)"/);
  assert.match(markup,/Источники/);
});

test('Path reuses all nine articles across the corresponding lessons without creating exercise-specific copies',()=>{
  const ids=['simple-3','simple-4','simple-5'];
  assert.deepEqual(new Set(ids.flatMap(id=>lessonConceptIds101[id])),new Set(task17Concepts101.map(concept=>concept.id)));
  assert.match(lessonGuideMarkup100('simple-3'),/data-guide-topic="separate-unagreed"/);
  assert.doesNotMatch(lessonGuideMarkup100('simple-3'),/data-guide-topic="separate-gerund"/);
  assert.match(lessonGuideMarkup100('simple-4'),/data-guide-topic="separate-apposition"/);
  assert.match(lessonGuideMarkup100('simple-5'),/data-guide-topic="separate-addition"/);
});

test('raw word matches cannot certify new task-17 assignments; empty new filter categories stay empty',()=>{
  assert.deepEqual(inferTags(17,'На стене висела старинная картина. Мы не покладая рук работали.'),[]);
  const items=[{id:'old',task:17,tags:['separate-participle']}];
  assert.deepEqual(filterCatalog(items,{task:17,topic:'separate-unagreed'}),[]);
});

test('a genuinely source-reviewed task-17 record gets its article without any change to its condition or key',async()=>{
  const read=async path=>JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));
  const input={catalog:await read('./server-source/catalog.json'),bank:(await read('./server-source/bank-snapshot.json')).items,archive:await read('./server-source/questions.json'),reviews:await read('./server-source/topic-reviews100.json')};
  const result=applyTopicReviews100(input);
  const question=result.archive.find(question=>question.id==='D2011-A20-1');
  const original=input.archive.find(candidate=>candidate.id===question.id);
  assert.equal(question.task,17);
  assert.deepEqual(guideForQuestion100(question).concepts.map(concept=>concept.id),['separate-gerund']);
  for(const key of ['form','passage','answer'])assert.deepEqual(question[key],original[key]);
});

test('an unverified next exercise restores the real catalogue and preserves its filters',async t=>{
  const window=new Window(),old=new Map();
  for(const [key,value]of Object.entries({document:window.document,matchMedia:()=>({matches:true}),getComputedStyle:window.getComputedStyle.bind(window)})){
    old.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
  }
  t.after(async()=>{for(const [key,descriptor]of old)descriptor?Object.defineProperty(globalThis,key,descriptor):delete globalThis[key];await window.happyDOM.close();});
  const rail=window.document.createElement('aside');
  rail.innerHTML='<header>Каталог</header><div class="practice-rail-body"><input name="query" value="оборот"></div>';
  window.document.body.append(rail);
  const catalogue=rail.firstChild,field=rail.querySelector('input'),guide=createGuideRail100(rail);
  assert.equal(guide.show(reviewed()),true);
  const topic=rail.querySelector('[data-guide-topic="separate-gerund"]');topic.querySelector('summary').click();
  await Promise.resolve();
  assert.equal(guide.show({...reviewed(),answerStatus:'incorrect'}),true);
  assert.equal(rail.querySelector('[data-guide-topic="separate-gerund"]'),topic);
  assert.equal(guide.show({id:'legacy',task:17,tags:['separate-participle']}),false);
  assert.equal(rail.firstChild,catalogue);assert.equal(rail.querySelector('input'),field);assert.equal(field.value,'оборот');
});
