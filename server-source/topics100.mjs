import {createHash} from 'node:crypto';
import {topicEntries} from '../app/practice84-taxonomy.js';
import {textOf} from './fipi84-source.mjs';

export const questionHash100=question=>createHash('sha256').update(String(question.form||'')).digest('hex');

export function applyTopicReviews100({catalog,bank,archive,reviews}){
  if(!Array.isArray(reviews))throw new Error('Topic reviews must be an array');
  const questions=new Map([...bank,...archive].map(question=>[question.id,question]));
  const originalTask16=[...questions.values()].filter(question=>question.task===16);
  const byId=new Map();
  for(const review of reviews){
    const question=questions.get(review.id);
    if(!question||byId.has(review.id))throw new Error('Unknown or duplicate reviewed question: '+review.id);
    if(review.hash!==questionHash100(question))throw new Error('Reviewed source changed: '+review.id);
    if(review.fromTask!==question.task||!Number.isInteger(review.task)||review.task<0||review.task>27)throw new Error('Invalid reviewed type: '+review.id);
    if(!['reviewed','partial'].includes(review.status)||review.status==='reviewed'&&review.uncertainties?.length||review.status==='partial'&&!review.uncertainties?.length)throw new Error('Invalid review status: '+review.id);
    const entries=topicEntries(review.task),known=new Map(entries.map(topic=>[topic.id,topic]));
    if(!Array.isArray(review.tags)||new Set(review.tags).size!==review.tags.length||review.tags.some(tag=>!known.has(tag)||known.get(tag).children))throw new Error('Invalid reviewed tags: '+review.id);
    if(review.task===16&&!review.tags.length)throw new Error('Empty reviewed topics: '+review.id);
    const original=textOf(question.form);
    const evidence=review.evidence||[];
    if(!evidence.length||evidence.some(item=>typeof item.quote!=='string'||item.quote.length<3||!original.includes(item.quote)||typeof item.explanation!=='string'||item.explanation.length<12))throw new Error('Invalid review evidence: '+review.id);
    if(review.tags.some(tag=>!evidence.some(item=>item.tag===tag)))throw new Error('Topic has no evidence: '+review.id);
    const tags=new Set();
    for(const tag of review.tags)for(const id of known.get(tag).path)tags.add(id);
    byId.set(review.id,{task:review.task,tags:[...tags],topicReview:{version:100,status:review.status,checkedAt:'2026-11-08'}});
  }
  if(originalTask16.some(question=>!byId.has(question.id)))throw new Error('Incomplete task-16 source review');
  const apply=question=>{
    const patch=byId.get(question.id);if(!patch)return question;
    return {...question,...patch};
  };
  const nextBank=bank.map(apply),nextArchive=archive.map(apply);
  const nextCatalog={...catalog,items:catalog.items.map(apply)};
  const byQuestion=new Map(nextBank.map(question=>[question.id,question]));
  for(const entry of nextCatalog.items){
    const question=byQuestion.get(entry.id);
    if(!question||entry.task!==question.task||JSON.stringify(entry.tags)!==JSON.stringify(question.tags)||JSON.stringify(entry.topicReview)!==JSON.stringify(question.topicReview))throw new Error('Catalog and question topics differ: '+entry.id);
  }
  return {catalog:nextCatalog,bank:nextBank,archive:nextArchive};
}
