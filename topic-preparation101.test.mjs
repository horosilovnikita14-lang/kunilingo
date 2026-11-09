import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {prepareTopicCoverage101} from './server-source/topic-preparation101.mjs';
import {applyTopicReviews100} from './server-source/topics100.mjs';
import {task16TopicIds100} from './app/study100-guides.js';
import {topics} from './app/practice84-taxonomy.js';

const row=(id='TEST01',patch={})=>({id,task:17,tags:['separate-definition','separate-participle'],codes:['3.8.5'],form:'<p>1) Девочка, читающая книгу.</p><p>2) Другое предложение.</p>',passage:'',...patch});
const prepare=(bank,patch={})=>prepareTopicCoverage101({bank,archive:[],articleIds:['separate-participle'],...patch});

test('queue uses an allowlist, strips controls/scripts and keeps inline words and entities',()=>{
  const source=row('SAFE01',{answer:'SERVER_PRIVATE_ANSWER',guid:'SERVER_PRIVATE_GUID',source:'https://internal.invalid/?token=PRIVATE_TOKEN',answerExplanation:'PRIVATE_EXPLANATION',form:'<form><p>в <span>город</span>ских фонтанах &amp; уж&eacute;</p><script>PRIVATE_SCRIPT()</script><style>PRIVATE_STYLE</style><input value="PRIVATE_INPUT"><textarea>PRIVATE_TEXTAREA</textarea><select><option>PRIVATE_OPTION</option></select><button>PRIVATE_BUTTON</button></form>'});
  const before=structuredClone(source),report=prepare([source],{includeQueueText:true}),serialized=JSON.stringify(report);
  assert.deepEqual(source,before);
  assert.equal(report.queue[0].conditionText,'в городских фонтанах & ужé');
  for(const secret of ['SERVER_PRIVATE_ANSWER','SERVER_PRIVATE_GUID','PRIVATE_TOKEN','PRIVATE_EXPLANATION','PRIVATE_SCRIPT','PRIVATE_STYLE','PRIVATE_INPUT','PRIVATE_TEXTAREA','PRIVATE_OPTION','PRIVATE_BUTTON'])assert.equal(serialized.includes(secret),false,secret);
  assert.deepEqual(Object.keys(report.queue[0].records[0]),['id','task','codes','candidateTopicIds','reasons']);
  assert.equal(report.summary.candidateAssignments,1);assert.equal(report.summary.verifiedAssignments,0);
});

test('conservative duplicate queue hashes omit IDs but preserve numbering, boundaries and passage',()=>{
  const rows=[row('A1'),row('A2',{form:'<p>1) Девочка, <span>читающая</span> книгу.</p><p>2) Другое предложение.</p>'})];
  const report=prepare(rows);assert.equal(report.queue.length,1);assert.equal(report.summary.duplicateQueueRecords,1);assert.deepEqual(report.queue[0].ids,['A1','A2']);assert.equal('conditionText' in report.queue[0],false);
  for(const patch of [{form:'<p>1) Девочка, читающая книгу.</p><p>3) Другое предложение.</p>'},{passage:'<p>Другой исходный текст.</p>'},{form:'<p>1) Девочка, читающая книгу.2) Другое предложение.</p>'},{task:16}])assert.equal(prepare([rows[0],row('OTHER',patch)]).queue.length,2,JSON.stringify(patch));
  const first=prepare(rows,{taxonomyVersion:'101'}),changed=prepare(rows,{taxonomyVersion:'102'});
  assert.notEqual(first.queue[0].fingerprint,changed.queue[0].fingerprint);assert.notEqual(first.fingerprint,changed.fingerprint);
  assert.equal(first.queue[0].fingerprint,prepare([...rows].reverse()).queue[0].fingerprint);assert.equal(first.fingerprint,prepare([...rows].reverse()).fingerprint);
});

test('valid reviewed assignments stay trusted without upgrading duplicate legacy records',()=>{
  const trusted=row('TRUSTED',{topicReview:{version:100,status:'reviewed'}}),legacy=row('LEGACY');
  const report=prepare([trusted,legacy]);
  assert.equal(report.summary.reviewedMetadata,1);assert.equal(report.summary.verifiedAssignments,1);assert.equal(report.summary.candidateAssignments,1);assert.equal(report.summary.queueRecords,1);assert.deepEqual(report.queue[0].ids,['LEGACY']);
  assert.deepEqual(report.records.find(record=>record.id==='TRUSTED').requiredTopicIds,['separate-participle']);assert.deepEqual(report.records.find(record=>record.id==='LEGACY').requiredTopicIds,[]);
  for(const topicReview of [{version:101,status:'reviewed'},{version:100,status:'partial'},{status:'reviewed'}])assert.equal(prepare([row('OTHER',{topicReview})]).summary.verifiedAssignments,0);
});

test('changing a category label invalidates the taxonomy and queue fingerprints',()=>{
  const before=prepare([row()]),original=topics[17][0].label;
  try{
    topics[17][0].label='Изменённое определение области категории';
    const after=prepare([row()]);
    assert.notEqual(after.taxonomyFingerprint,before.taxonomyFingerprint);assert.notEqual(after.queue[0].fingerprint,before.queue[0].fingerprint);
  }finally{topics[17][0].label=original;}
  assert.equal(prepare([row()]).taxonomyFingerprint,before.taxonomyFingerprint);
});

test('an empty condition after removing controls cannot become a reviewed assignment',()=>{
  const report=prepare([row('EMPTY',{form:'<input value="private"><select><option>1</option><option>2</option></select><textarea>private draft</textarea>',topicReview:{version:100,status:'reviewed'}})],{includeQueueText:true});
  assert.equal(report.summary.reviewedMetadata,1);assert.equal(report.summary.verifiedAssignments,0);assert.equal(report.summary.queueRecords,1);
  assert.ok(report.issues.some(issue=>issue.kind==='missing-condition-text'));assert.ok(report.queue[0].records[0].reasons.includes('missing-condition-text'));assert.equal(report.queue[0].conditionText,'');
});

test('unknown and parent-only tags remain explicit issues and never fabricate leaf topics',()=>{
  const report=prepare([
    row('UNKNOWN',{tags:['invented-topic'],topicReview:{version:100,status:'reviewed'}}),
    row('PARENT',{tags:['separate-definition']}),
    row('MISSING',{tags:['separate-participle'],topicReview:{version:100,status:'reviewed'}}),
    row('EMPTY',{tags:[]})
  ]);
  assert.equal(report.summary.verifiedAssignments,0);assert.equal(report.summary.emptyAssignments,3);assert.equal(report.summary.invalidAssignments,3);assert.equal(report.summary.queueRecords,4);
  assert.ok(report.issues.some(issue=>issue.kind==='unknown-tag'));assert.ok(report.issues.some(issue=>issue.kind==='parent-without-leaf'));assert.ok(report.issues.some(issue=>issue.kind==='missing-parent-tag'));
  assert.deepEqual(report.records.find(record=>record.id==='PARENT').candidateTopicIds,[]);assert.deepEqual(report.records.find(record=>record.id==='EMPTY').candidateTopicIds,[]);
});

test('missing articles are content gaps, not a reason to reclassify valid reviewed metadata',()=>{
  const source=row('TRUSTED',{tags:['separate-definition','separate-participle','separate-gerund'],topicReview:{version:100,status:'reviewed'}}),report=prepare([source]);
  assert.equal(report.summary.verifiedAssignments,1);assert.equal(report.summary.missingArticles,1);assert.equal(report.summary.missingArticleAssignments,1);assert.equal(report.summary.coveredRecords,0);assert.equal(report.queue.length,0);assert.deepEqual(report.records[0].missingArticleIds,['separate-gerund']);
  const gerund=report.perTopic.find(topic=>topic.id==='separate-gerund');assert.equal(gerund.verifiedAssignments,1);assert.equal(gerund.hasArticle,false);
});

test('malformed records are reported safely and do not block other legacy records',()=>{
  const report=prepare([row('OK'),row('OK'),null,{id:'BAD',task:99},{id:'BROKEN',task:17,tags:'bad',form:'<p>text</p>'}]);
  assert.equal(report.summary.totalRecords,5);assert.equal(report.summary.validRecords,2);assert.equal(report.summary.invalidRecords,3);assert.equal(report.summary.queueRecords,2);assert.ok(report.issues.some(issue=>issue.kind==='duplicate-id'));assert.ok(report.issues.some(issue=>issue.kind==='invalid-tags'));
});

test('current source-bound reviews produce honest per-task coverage without exposing private source fields',async()=>{
  const read=async path=>JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));
  const materialized=applyTopicReviews100({catalog:await read('./server-source/catalog.json'),bank:(await read('./server-source/bank-snapshot.json')).items,archive:await read('./server-source/questions.json'),reviews:await read('./server-source/topic-reviews100.json')});
  const report=prepareTopicCoverage101({...materialized,articleIds:new Set(task16TopicIds100)});
  assert.equal(report.summary.totalRecords,2795);assert.equal(report.summary.reviewedMetadata,105);assert.equal(report.summary.verifiedAssignments,104);assert.equal(report.summary.verifiedCoveredRecords,100);assert.equal(report.summary.queueRecords,2691);
  assert.equal(report.issues.filter(issue=>issue.kind==='missing-condition-text').length,0,'every real source condition survives extraction');
  const task16=report.perTask.find(task=>task.task===16);assert.equal(task16.records,100);assert.equal(task16.verifiedCoveredRecords,100);assert.equal(task16.queueRecords,0);
  const task17=report.perTask.find(task=>task.task===17);assert.equal(task17.records,117);assert.equal(task17.verifiedAssignments,1);assert.equal(task17.candidateAssignments,95);assert.equal(task17.emptyAssignments,21);
  for(const record of report.records){assert.equal('answer' in record,false);assert.equal('guid' in record,false);assert.equal('source' in record,false);assert.equal('evidence' in record,false);}
});
