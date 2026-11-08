import {sources100,task16Guide100,task16Concepts100} from './study100-task16.js';

export const concepts100=Object.freeze(task16Concepts100.map(concept=>Object.freeze(concept)));
const conceptMap=new Map(concepts100.map(concept=>[concept.id,concept]));
export const conceptFor100=id=>conceptMap.get(id)||null;
export const task16TopicIds100=Object.freeze(concepts100.filter(concept=>concept.id!=='syntax-basis').map(concept=>concept.id));
export const lessonConceptIds100=Object.freeze({
  'simple-1':Object.freeze(concepts100.filter(concept=>concept.id==='syntax-basis'||concept.id.startsWith('homogeneous-')).map(concept=>concept.id)),
  'simple-2':Object.freeze(['syntax-basis','compound-simple','compound-common','compound-special','homogeneous-different-rows'])
});

export function guideForQuestion100(question){
  if(Number(question?.task)!==16)return null;
  // Category membership is the only input to contextual article selection.
  // Missing categories never mean "show the entire numbered task handbook".
  const wanted=new Set(Array.isArray(question.tags)?question.tags:[]);
  const selected=concepts100.filter(concept=>task16TopicIds100.includes(concept.id)&&wanted.has(concept.id));
  if(!selected.length)return null;
  const reviewed=question.topicReview?.version===100&&question.topicReview?.status==='reviewed';
  return {task:16,title:task16Guide100.title,concepts:selected,reviewed};
}

const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const list=(items,ordered=false)=>items?.length?'<'+(ordered?'ol':'ul')+'>'+items.map(item=>'<li>'+escape(item)+'</li>').join('')+'</'+(ordered?'ol':'ul')+'>':'';
const section=(title,body)=>body?'<section><h4>'+title+'</h4>'+body+'</section>':'';

export function sourcesMarkup100(ids){
  const sources=[...new Set(ids)].map(id=>sources100[id]).filter(Boolean);
  return sources.length?'<details class="study-guide-sources"><summary>Источники</summary><ul>'+sources.map(source=>'<li><a href="'+escape(source.url)+'" target="_blank" rel="noopener noreferrer">'+escape(source.title)+'</a>'+(source.edition?'<small>'+escape(source.edition)+'</small>':'')+'</li>').join('')+'</ul></details>':'';
}

export function conceptMarkup100(concept){
  return '<details class="study-guide-topic" data-guide-topic="'+escape(concept.id)+'"><summary>'+escape(concept.title)+'</summary><div class="study-guide-reading">'+
    (concept.summary?'<p class="study-guide-summary">'+escape(concept.summary)+'</p>':'')+
    section('Правило',(concept.rule||[]).map(paragraph=>'<p>'+escape(paragraph)+'</p>').join(''))+
    section('Как применять',list(concept.algorithm,true))+
    section('Условия и исключения',list(concept.exceptions))+
    section('Примеры',(concept.examples||[]).map(example=>'<figure><blockquote>'+escape(example.text)+'</blockquote><figcaption>'+escape(example.explanation)+'</figcaption></figure>').join(''))+
    section('Частые ошибки',list(concept.traps))+
    sourcesMarkup100(concept.sourceIds||[])+'</div></details>';
}

export function guideMarkup100(guide){
  return '<div class="study-guide-content">'+guide.concepts.map(conceptMarkup100).join('')+'</div>';
}

export function lessonGuideMarkup100(id){
  const ids=lessonConceptIds100[id];
  return ids?'<section class="course-topic-handbook"><h3>Справочник по теме</h3>'+ids.map(conceptFor100).filter(Boolean).map(conceptMarkup100).join('')+'</section>':'';
}
