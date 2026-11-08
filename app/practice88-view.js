import {icon} from './ui-study56-icons.js';
import {tasks} from './practice84-taxonomy.js';
import {ruleLabels} from './practice85-model.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function questionStatus(work={},draft=''){
  if(work.done)return {id:'done',label:'Выполнено',icon:'check'};
  if(work.visited||draft||work.lastStatus)return {id:'unfinished',label:'Незавершено',icon:'pause'};
  return {id:'new',label:'Не начато',icon:'play'};
}
export function questionRow(q,work,draft){
  const state=questionStatus(work,draft),rules=ruleLabels(q).filter(label=>!/^Паронимы:/i.test(label));
  return '<button type="button" class="practice-question-row" data-practice="question" data-question="'+esc(q.id)+'" data-status="'+state.id+'">'+
    '<span class="practice-question-copy"><small class="practice-record-id">'+esc(q.internalId)+'</small><strong>'+esc(tasks.find(t=>t.number===q.task)?.title||q.title||'Архивное задание')+'</strong>'+
    (rules.length?'<span class="practice-row-rules">'+esc(rules.join(' · '))+'</span>':'')+
    '<small class="practice-row-meta">'+(q.task?'Тип ЕГЭ № '+q.task:'Архивная тема')+' · '+(q.year?q.year+' · демоверсия':'Год не указан · банк ФИПИ')+(q.originalNumber?' · исходный № '+esc(q.originalNumber):'')+'</small></span>'+
    '<span class="practice-row-state"><span class="practice-state-seal">'+icon(state.icon)+'</span><strong>'+state.label+'</strong></span></button>';
}
