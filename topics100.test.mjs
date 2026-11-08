import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {applyTopicReviews100} from './server-source/topics100.mjs';
import {guideForQuestion100} from './app/study100-guides.js';
import {answerPolicy} from './app/practice87-answer.js';
import {topicEntries} from './app/practice84-taxonomy.js';

const read=async path=>JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));
const input={catalog:await read('./server-source/catalog.json'),bank:(await read('./server-source/bank-snapshot.json')).items,archive:await read('./server-source/questions.json'),reviews:await read('./server-source/topic-reviews100.json')};
const result=applyTopicReviews100(input),original=new Map([...input.bank,...input.archive].map(question=>[question.id,question]));

test('all 105 original records have source-bound evidence and only 100 belong to task 16',()=>{
  assert.equal(input.reviews.length,105);
  assert.equal(result.bank.length+result.archive.length,2795);
  const questions=[...result.bank,...result.archive],task16=questions.filter(question=>question.task===16);
  assert.equal(task16.length,100);
  for(const question of task16){
    assert.equal(question.topicReview.status,'reviewed');assert.equal(question.topicReview.version,100);
    const leafIds=new Set(topicEntries(16).filter(topic=>!topic.children).map(topic=>topic.id));
    assert.ok(question.tags.some(tag=>leafIds.has(tag)),question.id);
    const guide=guideForQuestion100(question);
    for(const tag of question.tags.filter(tag=>leafIds.has(tag)))assert.ok(guide.concepts.some(concept=>concept.id===tag),question.id+': '+tag);
  }
  const expected={'749E9D':19,'D2007-A20-1':14,'D2007-A23-1':18,'D2011-A20-1':17,'D2011-A23-1':0};
  for(const [id,task]of Object.entries(expected))assert.equal(questions.find(question=>question.id===id).task,task,id);
});

test('topic migration preserves every original condition, passage, ID, private key and answer policy',()=>{
  for(const question of [...result.bank,...result.archive]){
    const before=original.get(question.id);
    for(const key of ['id','internalId','guid','form','passage','mode','choiceCount','answer','year','originalNumber','source'])assert.deepEqual(question[key],before[key],question.id+': '+key);
    assert.deepEqual(answerPolicy(question),answerPolicy(before),question.id);
  }
  for(const entry of result.catalog.items){
    assert.equal(Object.hasOwn(entry,'form'),false);assert.equal(Object.hasOwn(entry,'answer'),false);
    assert.equal(Object.hasOwn(entry,'evidence'),false);assert.equal(Object.hasOwn(entry,'reviewNotes'),false);
    const question=result.bank.find(question=>question.id===entry.id);
    assert.equal(entry.task,question.task);assert.deepEqual(entry.tags,question.tags);
    assert.equal(Object.hasOwn(question,'evidence'),false);assert.equal(Object.hasOwn(question,'reviewNotes'),false);
  }
  assert.equal(input.bank.find(question=>question.id==='749E9D').task,16,'raw source is retained');
});

test('a changed source, uncovered new record, invalid topic or unsupported evidence fails closed',()=>{
  const altered=structuredClone(input.reviews);altered[0].hash='old';
  assert.throws(()=>applyTopicReviews100({...input,reviews:altered}),/source changed/);
  assert.throws(()=>applyTopicReviews100({...input,reviews:input.reviews.slice(1)}),/Incomplete/);
  const noEvidence=structuredClone(input.reviews);noEvidence[0].evidence[0].quote='This source quote does not exist';
  assert.throws(()=>applyTopicReviews100({...input,reviews:noEvidence}),/evidence/);
  const badTopic=structuredClone(input.reviews);badTopic[0].tags.push('invented-rule');
  assert.throws(()=>applyTopicReviews100({...input,reviews:badTopic}),/tags/);
  assert.throws(()=>applyTopicReviews100({...input,bank:[...input.bank,{id:'ABCNEW',task:16,form:'<p>New source</p>'}]}),/Incomplete/);
  const duplicate=[...input.reviews,input.reviews[0]];
  assert.throws(()=>applyTopicReviews100({...input,reviews:duplicate}),/duplicate/);
});

test('partial review uses the same exact category mapping without expanding to the whole number',()=>{
  const reviews=structuredClone(input.reviews);reviews[0].status='partial';reviews[0].uncertainties=[{question:'Open editorial question'}];
  const transformed=applyTopicReviews100({...input,reviews}),question=transformed.bank.find(question=>question.id===reviews[0].id);
  assert.equal(guideForQuestion100(question).reviewed,false);
  const known=new Set(topicEntries(16).filter(topic=>!topic.children).map(topic=>topic.id));
  assert.deepEqual(new Set(guideForQuestion100(question).concepts.map(concept=>concept.id)),new Set(question.tags.filter(tag=>known.has(tag))));
});
