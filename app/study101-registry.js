import {topicEntries} from './practice84-taxonomy.js';
import {sources100,task16Guide100,task16Concepts100} from './study100-task16.js';
import {sources101,task17Guide101,task17Concepts101} from './study101-task17.js';

// Adding a handbook registers its category articles once for Practice and Path.
// Numbered handbooks never serve as a fallback for missing exercise categories.
const books=[
  {guide:task16Guide100,concepts:task16Concepts100,sources:sources100,auxiliary:['syntax-basis'],requireReview:false},
  {guide:task17Guide101,concepts:task17Concepts101,sources:sources101,auxiliary:[],requireReview:true},
];
const byTask=new Map(),byId=new Map(),sourceMap={};
for(const book of books){
  const {task}=book.guide;
  if(byTask.has(task))throw new Error('Duplicate handbook: '+task);
  const leaves=new Set(topicEntries(task).filter(topic=>!topic.children).map(topic=>topic.id));
  const articleIds=new Set();
  for(const concept of book.concepts){
    if(byId.has(concept.id))throw new Error('Duplicate handbook category: '+concept.id);
    if(!leaves.has(concept.id)&&!book.auxiliary.includes(concept.id))throw new Error('Unknown handbook category: '+concept.id);
    if(!concept.sourceIds?.length||concept.sourceIds.some(id=>!book.sources[id]))throw new Error('Missing handbook source: '+concept.id);
    byId.set(concept.id,Object.freeze(concept));
    if(leaves.has(concept.id))articleIds.add(concept.id);
  }
  if([...leaves].some(id=>!articleIds.has(id)))throw new Error('Incomplete category handbook: '+task);
  byTask.set(task,{...book,articleIds});
  Object.assign(sourceMap,book.sources);
}
export const sourceRegistry101=Object.freeze(sourceMap);
export const concepts101=Object.freeze([...byId.values()]);
export const articleIds101=Object.freeze([...byTask.values()].flatMap(book=>[...book.articleIds]));
export const conceptFor101=id=>byId.get(id)||null;
export const hasReviewedTopics101=question=>question?.topicReview?.version===100&&question.topicReview.status==='reviewed';

export function questionGuide101(question){
  const book=byTask.get(Number(question?.task));
  if(!book||book.requireReview&&!hasReviewedTopics101(question))return null;
  const wanted=new Set(Array.isArray(question.tags)?question.tags:[]);
  const selected=book.concepts.filter(concept=>book.articleIds.has(concept.id)&&wanted.has(concept.id));
  if(!selected.length)return null;
  return {task:book.guide.task,title:book.guide.title,concepts:selected,reviewed:hasReviewedTopics101(question)};
}

export const lessonConceptIds101=Object.freeze({
  'simple-1':Object.freeze(task16Concepts100.filter(concept=>concept.id==='syntax-basis'||concept.id.startsWith('homogeneous-')).map(concept=>concept.id)),
  'simple-2':Object.freeze(['syntax-basis','compound-simple','compound-common','compound-special','homogeneous-different-rows']),
  'simple-3':Object.freeze(['separate-participle','separate-adjective','separate-unagreed']),
  'simple-4':Object.freeze(['separate-apposition']),
  'simple-5':Object.freeze(['separate-gerund','separate-exception','separate-circumstance','separate-specify','separate-addition']),
});
