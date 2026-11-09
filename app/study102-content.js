import {sections,tasks,topicEntries} from './practice84-taxonomy.js';
import {concepts101,articleIds101,sourceRegistry101} from './study101-registry.js';

const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const clone=value=>JSON.parse(JSON.stringify(value));
const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
const record=value=>Boolean(value&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value)));
const idPattern=/^[a-z][a-z0-9-]{1,100}$/;
const descriptors=new Map();
for(const task of tasks)for(const topic of topicEntries(task.number)){
  if(descriptors.has(topic.id))throw new Error('Duplicate content category: '+topic.id);
  descriptors.set(topic.id,freeze({id:topic.id,title:topic.label,kind:topic.children?'group':'category',tasks:[task.number],path:[...topic.path],childIds:(topic.children||[]).map(child=>child.id)}));
}
// Auxiliary teaching material is intentionally separate from filter categories.
for(const concept of concepts101)if(!descriptors.has(concept.id))descriptors.set(concept.id,freeze({id:concept.id,title:concept.title,kind:'auxiliary',tasks:concept.id==='syntax-basis'?[16]:[],path:[concept.id],childIds:[]}));
const text=(value,max=20000)=>typeof value==='string'&&value.trim().length>0&&value.length<=max;
const stringList=(value,required)=>Array.isArray(value)&&(!required||value.length>0)&&value.every(item=>text(item));
const articleFields=new Set(['id','status','title','summary','rule','algorithm','exceptions','examples','traps','sourceIds']);

export const CONTENT_SCHEMA_VERSION102=102;
export const contentCategories102=freeze([...descriptors.values()]);

// Validation is for JSON content packages, never JavaScript or source HTML.
// An imported draft can reserve a place; only complete published articles show
// as available. Imports do not write files, mutate the live registry, or deploy.
export function validateContentPackage102(value){
  const errors=[];
  if(!record(value))return {ok:false,errors:['Пакет должен быть объектом JSON.']};
  if(value.schemaVersion!==CONTENT_SCHEMA_VERSION102)errors.push('Неизвестная версия схемы.');
  if(!Array.isArray(value.articles))errors.push('articles должен быть массивом.');
  if(!Array.isArray(value.mappings))errors.push('mappings должен быть массивом.');
  if(!record(value.sources))errors.push('sources должен быть объектом.');
  if(errors.length)return {ok:false,errors};
  const articles=new Map(),mappings=new Set();
  for(const [id,source]of Object.entries(value.sources)){
    if(!idPattern.test(id)||!record(source)||!text(source.title,1000)||!text(source.edition,1000)||!/^\d{4}-\d{2}-\d{2}$/.test(source.checkedAt||'')){errors.push('Некорректный источник: '+id);continue;}
    try{if(new URL(source.url).protocol!=='https:')throw new Error();}catch{errors.push('Источник требует полный HTTPS-адрес: '+id);}
  }
  for(const [index,article]of value.articles.entries()){
    if(!record(article)||!idPattern.test(article.id||'')){errors.push('Некорректный ID статьи: '+index);continue;}
    const {id,status}=article;
    if(articles.has(id))errors.push('Повтор статьи: '+id);
    articles.set(id,article);
    if(Object.keys(article).some(key=>!articleFields.has(key)))errors.push('Неизвестные поля статьи: '+id);
    if(!['published','draft'].includes(status)||!text(article.title,1000))errors.push('Некорректный статус или название: '+id);
    const published=status==='published';
    if(published&&!text(article.summary))errors.push('Нет краткого описания: '+id);
    for(const field of ['rule','algorithm','exceptions','traps'])if(!stringList(article[field]??[],published))errors.push('Некорректное поле '+field+': '+id);
    const examples=article.examples??[],sourceIds=article.sourceIds??[];
    if(!Array.isArray(examples)||published&&examples.length<2||Array.isArray(examples)&&examples.some(example=>!record(example)||!text(example.text)||!text(example.explanation)))errors.push('Недостаточно разобранных примеров: '+id);
    if(!Array.isArray(sourceIds)||published&&!sourceIds.length||Array.isArray(sourceIds)&&sourceIds.some(sourceId=>!own(value.sources,sourceId)))errors.push('Неизвестный или отсутствующий источник статьи: '+id);
  }
  for(const mapping of value.mappings){
    if(!record(mapping)){errors.push('Некорректная привязка.');continue;}
    const category=descriptors.get(mapping.categoryId),article=articles.get(mapping.articleId),key=mapping.categoryId+':'+mapping.task;
    if(!category||category.kind==='group')errors.push('Неизвестная или групповая категория привязки: '+mapping.categoryId);
    if(!article)errors.push('Неизвестная статья привязки: '+mapping.articleId);
    if(!category?.tasks.includes(mapping.task))errors.push('Категория не относится к типу задания: '+mapping.categoryId);
    if(mappings.has(key))errors.push('Повтор привязки категории: '+key);
    mappings.add(key);
  }
  return {ok:errors.length===0,errors};
}

const defaultPackage=freeze({
  schemaVersion:CONTENT_SCHEMA_VERSION102,
  sources:clone(sourceRegistry101),
  articles:concepts101.map(concept=>({...clone(concept),status:'published'})),
  mappings:concepts101.flatMap(concept=>(descriptors.get(concept.id)?.tasks||[]).map(task=>({categoryId:concept.id,articleId:concept.id,task})))
});

export function exportContentPackage102(){return clone(defaultPackage);}
export function parseContentPackage102(json){
  let parsed;try{parsed=typeof json==='string'?JSON.parse(json):clone(json);}catch{return {ok:false,errors:['Не удалось прочитать JSON.'],package:null};}
  const result=validateContentPackage102(parsed);
  return {...result,package:result.ok?freeze(parsed):null};
}

export function createContentRegistry102(value=defaultPackage){
  const validation=validateContentPackage102(value);
  if(!validation.ok)throw new TypeError(validation.errors.join('\n'));
  const data=freeze(clone(value)),articles=new Map(data.articles.map(article=>[article.id,article])),mapping=new Map(data.mappings.map(item=>[item.categoryId+':'+item.task,item.articleId]));
  function categoryContent(id,task){
    const category=descriptors.get(id);
    if(!category||task!==undefined&&!category.tasks.includes(Number(task)))return null;
    const targetTask=task===undefined?category.tasks[0]:Number(task),article=articles.get(mapping.get(id+':'+targetTask))||null;
    const published=article?.status==='published';
    return freeze({...category,status:published?'published':'draft',articleId:article?.id||null,article:published?article:null});
  }
  function coverage(){
    const entries=contentCategories102.map(category=>categoryContent(category.id)),leaves=entries.filter(entry=>entry.kind==='category');
    const byTask=[{number:0,title:'Архивные форматы'},...tasks].map(task=>{
      const relevant=leaves.filter(entry=>entry.tasks.includes(task.number)),available=relevant.filter(entry=>entry.status==='published');
      return {task:task.number,title:task.title,status:relevant.length&&available.length===relevant.length?'published':'draft',categories:relevant.length,published:available.length,draft:relevant.length-available.length};
    });
    return freeze({schemaVersion:CONTENT_SCHEMA_VERSION102,categories:leaves.length,groups:entries.filter(entry=>entry.kind==='group').length,auxiliary:entries.filter(entry=>entry.kind==='auxiliary').length,published:leaves.filter(entry=>entry.status==='published').length,draft:leaves.filter(entry=>entry.status==='draft').length,articles:data.articles.filter(article=>article.status==='published').length,byTask,bySection:sections.map(section=>({id:section.id,title:section.label,categories:leaves.filter(entry=>entry.tasks.some(task=>section.tasks.includes(task))).length,published:leaves.filter(entry=>entry.status==='published'&&entry.tasks.some(task=>section.tasks.includes(task))).length}))});
  }
  return Object.freeze({categoryContent,coverage});
}
const registry=createContentRegistry102();
export const categoryContent102=(id,task)=>registry.categoryContent(id,task);
export const contentCoverage102=()=>registry.coverage();
// No dependency expansion: the student-facing registry remains category-exact.
export const publishedCategoryIds102=Object.freeze([...articleIds101]);
