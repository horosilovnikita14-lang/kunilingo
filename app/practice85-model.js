import {sections,tasks,topicEntries} from './practice84-taxonomy.js';
export function cleanFilters(value={}){
  const section=sections.some(s=>s.id===value.section)?value.section:'';
  const task=tasks.some(t=>t.number===Number(value.task)&&(!section||t.section===section))?Number(value.task):0;
  return {section,task,topics:Array.isArray(value.topics)?value.topics.filter(id=>topicEntries(task).some(t=>t.id===id)):[],year:String(value.year||'all'),query:typeof value.query==='string'?value.query:''};
}
export function selectQuestions(items,filters){
  const needle=filters.query.trim().toLowerCase();
  return items.filter(q=>{
    if(filters.section&&!sections.find(s=>s.id===filters.section)?.tasks.includes(q.task))return false;
    if(filters.task&&q.task!==filters.task)return false;
    if(filters.topics.length&&!filters.topics.some(id=>q.tags.includes(id)))return false;
    if(filters.year!=='all'&&(filters.year==='unknown'?q.year!==null:String(q.year)!==filters.year))return false;
    if(!needle)return true;
    const labels=topicEntries(q.task).filter(t=>q.tags.includes(t.id)).map(t=>t.label);
    return [q.internalId,q.id,tasks.find(t=>t.number===q.task)?.title,...labels,...q.codes].join(' ').toLowerCase().includes(needle);
  });
}
export function ruleLabels(q){return topicEntries(q.task).filter(t=>!t.children&&!t.id.startsWith('paronym-list-')&&q.tags.includes(t.id)).map(t=>t.label);}
