import {createHash} from 'node:crypto';
import {Window} from 'happy-dom';
import {topics,topicEntries} from '../app/practice84-taxonomy.js';

const PREPARATION_VERSION='topic-preparation101-v1';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const blocked=new Set(['SCRIPT','STYLE','NOSCRIPT','INPUT','SELECT','TEXTAREA','BUTTON','IFRAME','OBJECT','EMBED','SVG','MATH','LINK','META','HEAD','TEMPLATE']);
const blocks=new Set(['P','DIV','LI','TR','TABLE','UL','OL','SECTION','ARTICLE','HEADER','FOOTER','BLOCKQUOTE','H1','H2','H3','H4','H5','H6']);
let parsingWindow;

// Preparation only: an inert template parser decodes entities and keeps inline
// spans joined. No source script or resource is evaluated or fetched.
function canonicalText(html){
  parsingWindow??=new Window({settings:{enableJavaScriptEvaluation:false,disableJavaScriptFileLoading:true,enableCSSFileLoading:false,enableImageFileLoading:false,enableIframePageLoading:false,disableComputedStyleRendering:true}});
  const template=parsingWindow.document.createElement('template');
  template.innerHTML=typeof html==='string'?html:'';
  const parts=[];
  function visit(node){
    if(node.nodeType===3){parts.push(node.textContent.replace(/[\t\r\n ]+/g,' '));return;}
    if(node.nodeType!==1&&node.nodeType!==11)return;
    if(node.nodeType===1){
      if(blocked.has(node.tagName)||node.hidden||node.getAttribute('aria-hidden')==='true')return;
      if(node.tagName==='BR'){parts.push('\n');return;}
      if(node.tagName==='IMG'){const alt=node.getAttribute('alt');if(alt)parts.push(alt);return;}
      if(blocks.has(node.tagName))parts.push('\n');
    }
    for(const child of node.childNodes)visit(child);
    if(node.nodeType===1){
      if(blocks.has(node.tagName))parts.push('\n');
      else if(node.tagName==='TD'||node.tagName==='TH')parts.push('\t');
    }
  }
  visit(template.content);
  return parts.join('').replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').split('\n').map(line=>line.trim()).filter(Boolean).join('\n');
}

const safeCode=value=>typeof value==='string'&&/^\d+(?:\.\d+)*$/.test(value)&&value.length<=30;
const safeTag=value=>typeof value==='string'&&/^[a-z][a-z0-9-]{0,99}$/.test(value);
const safeId=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9-]{0,99}$/.test(value);

/**
 * Read an already materialized bank (after source-bound reviews were applied).
 * Legacy tags are candidates, never upgraded to reviewed by this function.
 * The queue is data for a future classifier, not a claim it has run.
 */
export function prepareTopicCoverage101({bank,archive,articleIds=[],taxonomyVersion='101',includeQueueText=false}={}){
  if(!Array.isArray(bank)||!Array.isArray(archive))throw new TypeError('bank and archive must be arrays');
  if(!Array.isArray(articleIds)&&!(articleIds instanceof Set))throw new TypeError('articleIds must be an array or Set');
  if(!['string','number'].includes(typeof taxonomyVersion))throw new TypeError('taxonomyVersion must be a string or number');
  const version=String(taxonomyVersion);
  const articles=new Set([...articleIds].filter(value=>typeof value==='string'));
  const definitions=new Map(Object.keys(topics).map(task=>[Number(task),topicEntries(Number(task))]));
  const taxonomyFingerprint=hash([version,[...definitions].map(([task,entries])=>[task,entries.map(entry=>[entry.id,entry.label,entry.path,Boolean(entry.children)])])]);
  const perTopic=new Map([...definitions].flatMap(([task,entries])=>entries.filter(entry=>!entry.children).map(entry=>[task+':'+entry.id,{
    task,id:entry.id,label:entry.label,hasArticle:articles.has(entry.id),assignments:0,verifiedAssignments:0,candidateAssignments:0
  }])));
  const perTask=new Map(),queueGroups=new Map(),issues=[],records=[],seenIds=new Set();
  const summary={totalRecords:bank.length+archive.length,validRecords:0,invalidRecords:0,reviewedMetadata:0,verifiedAssignments:0,candidateAssignments:0,emptyAssignments:0,invalidAssignments:0,missingArticles:0,missingArticleAssignments:0,coveredRecords:0,verifiedCoveredRecords:0,queueRecords:0,queueGroups:0,duplicateQueueRecords:0,leafTopics:perTopic.size,articleTopics:[...perTopic.values()].filter(topic=>topic.hasArticle).length};
  for(const [index,question]of [...bank,...archive].entries()){
    if(!question||typeof question!=='object'||!safeId(question.id)||!Number.isInteger(question.task)||question.task<0||question.task>27){
      summary.invalidRecords++;issues.push({id:safeId(question?.id)?question.id:null,task:Number.isInteger(question?.task)?question.task:null,kind:'invalid-record',index});continue;
    }
    const {id,task}=question;
    if(seenIds.has(id)){summary.invalidRecords++;issues.push({id,task,kind:'duplicate-id'});continue;}
    seenIds.add(id);summary.validRecords++;
    const entries=definitions.get(task)||[],known=new Map(entries.map(entry=>[entry.id,entry]));
    const declared=Array.isArray(question.tags)?question.tags:[];
    const tagSet=new Set(declared.filter(safeTag)),reasons=[];
    const unknownTags=[...tagSet].filter(tag=>!known.has(tag));
    const malformedTags=declared.some(tag=>!safeTag(tag))||(!Array.isArray(question.tags)&&question.tags!==undefined);
    for(const tag of unknownTags)issues.push({id,task,kind:'unknown-tag',tag});
    if(unknownTags.length)reasons.push('unknown-tags');
    if(malformedTags){issues.push({id,task,kind:'invalid-tags'});reasons.push('invalid-tags');}
    let missingParent=false,parentOnly=false;
    for(const tag of tagSet){
      const entry=known.get(tag);if(!entry)continue;
      for(const parent of entry.path)if(!tagSet.has(parent)){
        missingParent=true;issues.push({id,task,kind:'missing-parent-tag',tag,parent});
      }
      if(entry.children&&!entries.some(leaf=>!leaf.children&&leaf.path.includes(tag)&&tagSet.has(leaf.id))){parentOnly=true;issues.push({id,task,kind:'parent-without-leaf',tag});}
    }
    if(missingParent)reasons.push('missing-parent-tags');
    if(parentOnly)reasons.push('parent-without-leaf');
    const leafIds=entries.filter(entry=>!entry.children&&tagSet.has(entry.id)).map(entry=>entry.id);
    const conditionText=canonicalText(question.form),passageText=canonicalText(question.passage);
    const missingCondition=!conditionText.trim();
    if(missingCondition){issues.push({id,task,kind:'missing-condition-text'});reasons.push('missing-condition-text');}
    const reviewed=question.topicReview?.version===100&&question.topicReview?.status==='reviewed';
    const invalid=unknownTags.length>0||malformedTags||missingParent||parentOnly||missingCondition;
    const verified=reviewed&&!invalid&&leafIds.length>0;
    const missing=leafIds.filter(tag=>!articles.has(tag));
    if(reviewed)summary.reviewedMetadata++;
    if(verified)summary.verifiedAssignments++;
    else if(leafIds.length)summary.candidateAssignments++;
    else summary.emptyAssignments++;
    if(invalid)summary.invalidAssignments++;
    if(missing.length){summary.missingArticles++;summary.missingArticleAssignments+=missing.length;}
    const covered=leafIds.length>0&&missing.length===0;
    if(covered)summary.coveredRecords++;
    if(covered&&verified)summary.verifiedCoveredRecords++;
    if(!reviewed)reasons.push('unreviewed');
    if(!leafIds.length)reasons.push('no-leaf-topics');
    if(!entries.length)reasons.push('unsupported-taxonomy');
    const taskRow=perTask.get(task)||{task,records:0,reviewedMetadata:0,verifiedAssignments:0,candidateAssignments:0,emptyAssignments:0,invalidAssignments:0,missingArticles:0,coveredRecords:0,verifiedCoveredRecords:0,queueRecords:0};
    taskRow.records++;taskRow.reviewedMetadata+=Number(reviewed);taskRow.verifiedAssignments+=Number(verified);taskRow.candidateAssignments+=Number(!verified&&leafIds.length>0);taskRow.emptyAssignments+=Number(!leafIds.length);taskRow.invalidAssignments+=Number(invalid);taskRow.missingArticles+=Number(missing.length>0);taskRow.coveredRecords+=Number(covered);taskRow.verifiedCoveredRecords+=Number(verified&&covered);
    for(const tag of leafIds){const topic=perTopic.get(task+':'+tag);topic.assignments++;topic.verifiedAssignments+=Number(verified);topic.candidateAssignments+=Number(!verified);}
    const fingerprint=hash([PREPARATION_VERSION,taxonomyFingerprint,task,conditionText,passageText]);
    records.push({id,task,fingerprint,requiredTopicIds:verified?leafIds:[],candidateTopicIds:verified?[]:leafIds,missingArticleIds:missing,status:verified?'reviewed':leafIds.length?'candidate':'unmapped'});
    if(!verified){
      summary.queueRecords++;taskRow.queueRecords++;
      let group=queueGroups.get(fingerprint);
      if(!group){group={fingerprint,task,ids:[],records:[],...(includeQueueText?{conditionText,passageText}:{})};queueGroups.set(fingerprint,group);}
      group.ids.push(id);group.records.push({id,task,codes:[...new Set((Array.isArray(question.codes)?question.codes:[]).filter(safeCode))].sort(),candidateTopicIds:leafIds,reasons:[...new Set(reasons)]});
    }
    perTask.set(task,taskRow);
  }
  const queue=[...queueGroups.values()].sort((a,b)=>a.task-b.task||a.fingerprint.localeCompare(b.fingerprint));
  for(const group of queue){group.ids.sort();group.records.sort((a,b)=>a.id.localeCompare(b.id));}
  summary.queueGroups=queue.length;summary.duplicateQueueRecords=summary.queueRecords-summary.queueGroups;
  const taskRows=[...perTask.values()].sort((a,b)=>a.task-b.task),topicRows=[...perTopic.values()].sort((a,b)=>a.task-b.task||a.id.localeCompare(b.id));
  records.sort((a,b)=>a.id.localeCompare(b.id));
  return {version:101,taxonomyVersion:version,taxonomyFingerprint,fingerprint:hash([PREPARATION_VERSION,taxonomyFingerprint,[...articles].sort(),records]),summary,perTask:taskRows,perTopic:topicRows,records,queue,issues};
}
