import {course} from './course78-data.js';
import {createState,nextStep} from './course78-state.js';
import {enhanceControls} from './study-controls86.js';

const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const lessons=course.flatMap(unit=>unit.lessons);
const ids=new Set(lessons.map(lesson=>lesson.id));
const truthCount=(value,known)=>Object.entries(object(value)).filter(([id,done])=>known.has(id)&&done===true).length;

// Counts only completed work and saved drafts. This is not an exam score or a
// prediction; a visited exercise and an accepted answer remain different facts.
export function progressMetrics102({courseState={},practiceState={},catalog=[]}={}){
  const state=createState(object(courseState));
  const practice=object(practiceState),work=object(practice.work),drafts=object(practice.drafts);
  const known=new Map(catalog.filter(item=>item&&typeof item.id==='string').map(item=>[item.id,item]));
  const completed=truthCount(state.done,ids),theory=truthCount(state.theoryPassed,ids);
  const controls=truthCount(state.controls,new Set(course.map(unit=>unit.id)));
  const started=lessons.filter(lesson=>!state.done[lesson.id]&&(state.theoryRead[lesson.id]||state.started[lesson.id]||state.practiceStarted[lesson.id]||state.practiceWork[lesson.id]||state.checkWork[lesson.id]||typeof state.drafts[lesson.id]==='string'&&state.drafts[lesson.id].trim())).length;
  const entries=[...known.values()].map(item=>({id:item.id,task:item.task,done:work[item.id]?.done===true,visited:work[item.id]?.visited===true,status:work[item.id]?.lastStatus,draft:typeof drafts[item.id]==='string'&&Boolean(drafts[item.id].trim())}));
  const attempted=entries.filter(item=>item.done||item.visited||item.draft);
  const incorrect=attempted.filter(item=>!item.done&&item.status==='incorrect');
  const next=nextStep(course,state);
  const nextLabel=next?.kind==='control'?course.find(unit=>unit.id===next.id)?.title:lessons.find(lesson=>lesson.id===next?.id)?.title;
  return {path:{completed,theory,controls,started,totalLessons:lessons.length,totalControls:course.length,next:next?{kind:next.kind,id:next.id,title:nextLabel}:null},practice:{total:entries.length,attempted:attempted.length,completed:attempted.filter(item=>item.done).length,drafts:attempted.filter(item=>item.draft&&!item.done).length,incorrect:incorrect.length,reviewIds:incorrect.map(item=>item.id)},hasWork:Boolean(completed||theory||controls||started||attempted.length)};
}

export function progressMarkup102(metrics,{loading=false,error=''}={}){
  const {path,practice}=metrics;
  const next=path.next?'<section class="progress-next102"><h3>Следующий шаг</h3><p>'+escape(path.next.title)+'</p><button type="button" class="course-primary" data-progress="path">Продолжить путь</button></section>':'<section class="progress-next102"><h3>Путь пройден</h3><p>Можно вернуться к конспектам и закрепить знания в Практике.</p><button type="button" class="course-primary" data-progress="practice">Открыть практику</button></section>';
  const practiceBody=loading?'<p role="status">Загружаем результаты практики…</p>':error?'<p role="status">'+escape(error)+'</p><button type="button" class="course-secondary" data-progress="retry">Попробовать ещё раз</button>':'<dl class="progress-counts102"><div><dt>Открыто или начато</dt><dd>'+practice.attempted+'</dd></div><div><dt>Решено верно</dt><dd>'+practice.completed+'</dd></div><div><dt>Черновики</dt><dd>'+practice.drafts+'</dd></div><div><dt>Требуют повторения</dt><dd>'+practice.incorrect+'</dd></div></dl><p>В банке '+practice.total+' заданий. Верное решение отмечается после проверки ответа.</p><button type="button" class="course-secondary" data-progress="practice">Открыть практику</button>';
  return '<div class="progress-view102"><header class="course-hero"><h2>Твой прогресс</h2><p>Результаты Пути и Практики.</p></header>'+
    (!metrics.hasWork&&!loading?'<section class="progress-empty102"><h3>Начни с первого шага</h3><p>Здесь появятся пройденные темы, решённые задания и работа для повторения.</p></section>':'')+
    '<section><h3>Путь</h3><dl class="progress-counts102"><div><dt>Теория пройдена</dt><dd>'+path.theory+' <small>из '+path.totalLessons+'</small></dd></div><div><dt>Уроки завершены</dt><dd>'+path.completed+' <small>из '+path.totalLessons+'</small></dd></div><div><dt>Контрольные пройдены</dt><dd>'+path.controls+' <small>из '+path.totalControls+'</small></dd></div><div><dt>Уроки начаты</dt><dd>'+path.started+'</dd></div></dl></section>'+
    next+'<section><h3>Практика</h3>'+practiceBody+'</section>'+
    (!loading&&!error&&practice.reviewIds.length?'<details class="study-guide-topic"><summary>Задания для повторения</summary><div class="study-guide-reading"><ul>'+practice.reviewIds.slice(0,30).map(id=>'<li><button type="button" class="course-secondary" data-progress-question="'+escape(id)+'">'+escape(id)+'</button></li>').join('')+'</ul>'+(practice.reviewIds.length>30?'<p>Показаны первые 30 заданий.</p>':'')+'</div></details>':'')+'</div>';
}

export function createProgress102({body,heading,storage,onNavigate,subscribe}={}){
  let active=false,items=[],loaded=false,loading=false,error='',generation=0;
  const abort=new AbortController();
  const read=key=>{try{return object(JSON.parse(storage.getItem(key)||'{}'));}catch{return {};}};
  const metrics=()=>progressMetrics102({courseState:read('kunilingo.russian.course78'),practiceState:read('kunilingo.practice84'),catalog:items});
  function render(){if(!active)return;heading.textContent='Прогресс';body.innerHTML=progressMarkup102(metrics(),{loading,error});enhanceControls(body);}
  async function load(){
    if(loading)return;const ticket=++generation;loading=true;error='';render();
    try{const response=await fetch('./api/fipi/catalog',{signal:AbortSignal.timeout(12000)});if(!response.ok)throw new Error();const data=await response.json();if(!Array.isArray(data.items)||data.items.length!==data.total)throw new Error();if(ticket!==generation)return;items=data.items;loaded=true;}
    catch{if(ticket===generation)error='Не удалось загрузить результаты практики. Работа сохранена, попробуй ещё раз.';}
    finally{if(ticket===generation){loading=false;render();}}
  }
  body.addEventListener('click',event=>{
    if(!active)return;
    const question=event.target.closest('[data-progress-question]');
    if(question){onNavigate?.('practice',{questionId:question.dataset.progressQuestion});return;}
    const action=event.target.closest('[data-progress]')?.dataset.progress;
    if(action==='retry')load();else if(action==='path'||action==='practice')onNavigate?.(action);
  },{signal:abort.signal});
  const unsubscribe=subscribe?.(()=>render());
  return {show(){active=true;if(loaded)render();else load();},leave(){active=false;},refresh:render,destroy(){active=false;generation++;abort.abort();unsubscribe?.();}};
}
