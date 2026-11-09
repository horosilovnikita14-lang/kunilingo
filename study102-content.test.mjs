import test from 'node:test';
import assert from 'node:assert/strict';
import {topics,topicEntries} from './app/practice84-taxonomy.js';
import {concepts101} from './app/study101-registry.js';
import {categoryContent102,contentCoverage102,contentCategories102,exportContentPackage102,parseContentPackage102,validateContentPackage102,createContentRegistry102} from './app/study102-content.js';

test('every existing category has one stable content slot; planned content stays visibly draft',()=>{
  const leaves=Object.keys(topics).flatMap(task=>topicEntries(Number(task)).filter(topic=>!topic.children));
  assert.equal(new Set(contentCategories102.map(category=>category.id)).size,contentCategories102.length);
  for(const leaf of leaves){const entry=categoryContent102(leaf.id);assert.ok(entry,leaf.id);assert.equal(entry.kind,'category');}
  const available=categoryContent102('homogeneous-repeat',16);assert.equal(available.status,'published');assert.equal(available.article.id,'homogeneous-repeat');
  const planned=categoryContent102('intro-confidence',18);assert.equal(planned.status,'draft');assert.equal(planned.article,null);assert.equal(planned.articleId,null);
  assert.equal(categoryContent102('intro-confidence',16),null);assert.equal(categoryContent102('unknown-category'),null);
  assert.equal(categoryContent102('homogeneous-unions').kind,'group');assert.equal(categoryContent102('homogeneous-unions').article,null);
  assert.equal(categoryContent102('syntax-basis',16).kind,'auxiliary');
  const report=contentCoverage102();assert.equal(report.categories,leaves.length);assert.equal(report.published,23);assert.equal(report.draft,leaves.length-23);assert.equal(report.articles,concepts101.length);
  assert.equal(report.byTask.find(task=>task.task===0).status,'draft');
  assert.deepEqual(report.byTask.filter(task=>task.status==='published').map(task=>task.task),[16,17]);
  assert.throws(()=>{available.article.rule.push('changed');},TypeError);
});

test('export and JSON import preserve articles and mappings without changing the live registry',()=>{
  const exported=exportContentPackage102(),parsed=parseContentPackage102(JSON.stringify(exported));
  assert.equal(parsed.ok,true);assert.deepEqual(parsed.package,exported);
  const imported=createContentRegistry102(parsed.package);
  assert.deepEqual(imported.categoryContent('separate-participle',17),categoryContent102('separate-participle',17));
  exported.articles[0].title='Locally changed copy';assert.notEqual(categoryContent102(exported.articles[0].id).article.title,exported.articles[0].title);
  const draftPackage=exportContentPackage102();draftPackage.articles.push({id:'intro-confidence-draft',title:'В работе',status:'draft'});draftPackage.mappings.push({categoryId:'intro-confidence',articleId:'intro-confidence-draft',task:18});
  assert.equal(validateContentPackage102(draftPackage).ok,true);
  const draft=createContentRegistry102(draftPackage).categoryContent('intro-confidence',18);
  assert.equal(draft.status,'draft');assert.equal(draft.article,null);assert.equal(draft.articleId,'intro-confidence-draft');assert.equal(categoryContent102('intro-confidence').articleId,null);
});

test('malformed, duplicate or incomplete article packages fail with errors rather than showing placeholders as theory',()=>{
  assert.equal(parseContentPackage102('{broken').ok,false);
  for(const input of [null,[],{},'text'])assert.equal(validateContentPackage102(input).ok,false);
  const cases=[
    p=>p.articles.push(p.articles[0]),
    p=>p.mappings.push(p.mappings[0]),
    p=>p.mappings[0].categoryId='unknown-category',
    p=>p.mappings[0].articleId='missing-article',
    p=>p.mappings[0].task=18,
    p=>p.mappings[0].categoryId='homogeneous-unions',
    p=>p.articles[0].rule=[],
    p=>delete p.articles[0].examples,
    p=>p.articles[0].examples='not-an-array',
    p=>p.articles[0].sourceIds=['missing-source'],
    p=>p.articles[0].sourceIds='source',
    p=>p.articles[0].answer='server-only data',
    p=>p.sources[Object.keys(p.sources)[0]].url='javascript:alert(1)'
  ];
  for(const mutate of cases){const data=exportContentPackage102();mutate(data);const result=validateContentPackage102(data);assert.equal(result.ok,false);assert.ok(result.errors.length);assert.throws(()=>createContentRegistry102(data),TypeError);}
});
