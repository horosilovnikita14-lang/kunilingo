import {icon} from './ui-study56-icons.js';
import {tasks,sections,topics,topicEntries} from './practice84-taxonomy.js';
import {cleanFilters,selectQuestions,ruleLabels} from './practice85-model.js';
import {sourceFragment,questionFragments} from './practice84-content.js';
import {answerPolicy,normalizeAnswer} from './practice87-answer.js';
import {cameraFor} from './room-camera.js';
import {enhanceControls,enhanceDisclosure,setDisclosureOpen} from './study-controls86.js';
import {questionRow} from './practice88-view.js';
import {createPageTransition} from './study-pages88.js';
import {mountPencil} from './practice98-pencil.js';
import {createGuideRail100} from './study100-rail.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key='kunilingo.practice84',pageSize=12;
const countLabel=n=>n+' '+(n%100>=11&&n%100<=14?'заданий':n%10===1?'задание':n%10>=2&&n%10<=4?'задания':'заданий');
const button=(action,label,attrs='')=>'<button type="button" data-practice="'+action+'" '+attrs+'>'+label+'</button>';
const option=(value,label,selected)=>'<option value="'+esc(value)+'" '+(String(selected)===String(value)?'selected':'')+'>'+esc(label)+'</option>';
export function createPractice({root,panel,body,heading}){
  const record=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
  let saved={};try{saved=record(JSON.parse(localStorage.getItem(key)||'{}'));}catch{}
  let filters=cleanFilters(record(saved.filters)),applied=null;
  const drafts=record(saved.drafts),work=record(saved.work);
  const pages=createPageTransition(body);
  const questionCache=new Map();
  const pencilSessions=new Map();let pencil=null;
  let data=null,loadPromise=null,active=false,screen='idle',current=null,page=1,scroll=0,generation=0,frame=0,checking=false,status='',error='';
  let railOpen=!globalThis.matchMedia?.('(max-width:1050px)').matches;
  const rail=document.createElement('aside');rail.className='practice-rail';rail.setAttribute('aria-label','Фильтры практики');rail.hidden=true;root.append(rail);
  const guideRail=createGuideRail100(rail);
  const save=()=>{try{localStorage.setItem(key,JSON.stringify({filters,drafts,work}));}catch{}};
  const matches=(f=filters)=>data?selectQuestions(data.items,f):[];
  function wake(){
    if(!active||!data||root.dataset.section!=='practice'||root.dataset.practiceReveal==='leaving')return;
    cancelAnimationFrame(frame);
    const check=()=>{if(!active||root.dataset.section!=='practice'||root.dataset.practiceReveal==='leaving')return;if((cameraFor(root)?.journeyProgress(performance.now())??1)<.75){frame=requestAnimationFrame(check);return;}root.dataset.practiceReveal='ready';panel.inert=false;frame=0;};frame=requestAnimationFrame(check);
  }
  root.addEventListener('camera-start',()=>{if(active){root.dataset.practiceReveal='waiting';wake();}});root.addEventListener('camera-settled',wake);
  const load=()=>loadPromise??=fetch('./api/fipi/catalog',{signal:AbortSignal.timeout(12000)}).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(v=>{if(!Array.isArray(v.items)||v.items.length!==v.total)throw new Error();return data=v;}).catch(e=>{loadPromise=null;throw e;});
  function topicTree(nodes){
    return nodes.map(node=>{
      const count=matches({...filters,topics:[node.id],query:''}).length;
      const choice='<label class="practice-rule"><input type="checkbox" name="topic" value="'+node.id+'" '+(filters.topics.includes(node.id)?'checked':'')+' '+(!count?'disabled':'')+'><span>'+esc(node.children?'Вся подтема':node.label)+'</span><small>'+count+'</small></label>';
      return node.children?'<details class="practice-rule-group" '+(filters.topics.some(id=>topicEntries(filters.task).find(t=>t.id===id)?.path.includes(node.id))?'open':'')+'><summary>'+esc(node.label)+'</summary><div>'+choice+topicTree(node.children)+'</div></details>':choice;
    }).join('');
  }
  function sidebar(revealRules=false){
    const previousScroll=rail.querySelector('.practice-rail-body')?.scrollTop||0;
    rail.dataset.open=String(railOpen);
    const years=data?[...new Set(data.items.filter(q=>q.year).map(q=>q.year))].sort((a,b)=>b-a):[];
    const types=tasks.filter(t=>!filters.section||t.section===filters.section);
    rail.innerHTML='<header>'+button('rail',icon('practice')+'<span>Каталог</span>'+icon('chevron'),'class="practice-rail-toggle" aria-controls="practice-rail-content" aria-expanded="'+railOpen+'"')+'</header><div class="study-rail-content" id="practice-rail-content"><div class="study-disclosure-inner"><div class="practice-rail-body" id="practice-rail-body">'+
      (!data?'<p role="status">'+esc(error||'Загружаем задания…')+'</p>'+(error?button('retry','Повторить','class="practice-primary"'):''):
      '<form id="practice-filters" data-practice-filters><div class="practice-filter-field"><label for="practice-section">Раздел</label><select id="practice-section" name="section">'+option('','Все разделы',filters.section)+sections.map(s=>option(s.id,s.id==='other'?'Архивные темы':s.label,filters.section)).join('')+'</select></div>'+
      '<div class="practice-filter-field"><label for="practice-type">Тип задания ЕГЭ</label><select id="practice-type" name="task">'+option('0','Все типы',filters.task)+types.map(t=>option(t.number,'№ '+t.number+' · '+t.title,filters.task)).join('')+'</select></div>'+
      (filters.task?'<fieldset class="practice-rule-list"><legend>Темы и правила</legend><p>Можно выбрать несколько</p>'+topicTree(topics[filters.task]||[])+'</fieldset>':'')+
      '<div class="practice-filter-field"><label for="practice-year">Год</label><select id="practice-year" name="year">'+option('all','Все годы',filters.year)+years.map(y=>option(y,y,filters.year)).join('')+option('unknown','Год не указан',filters.year)+'</select></div>'+
      '<div class="practice-filter-field"><label for="practice-query">Поиск</label><input id="practice-query" name="query" type="search" placeholder="Тема или номер задания" value="'+esc(filters.query)+'"></div>'+
      '</form>')+'</div>'+(data?'<footer class="practice-filter-actions"><button class="practice-primary" form="practice-filters" type="submit">Показать задания <small data-match-count>'+matches().length+'</small></button>'+button('reset','Сбросить фильтры','class="practice-filter-reset"')+'</footer>':'')+'</div></div>';
    enhanceControls(rail);
    enhanceDisclosure(rail.querySelector('.practice-rail-toggle'),rail.querySelector('.study-rail-content'),{open:railOpen});
    if(revealRules){const rules=rail.querySelector('.practice-rule-list');if(rules?.style){rules.hidden=true;setDisclosureOpen(rules,true);}}
    const scrollBody=rail.querySelector('.practice-rail-body');if(scrollBody)scrollBody.scrollTop=previousScroll;
  }
  function caption(){return [sections.find(s=>s.id===applied.section)?.label,tasks.find(t=>t.number===applied.task)?.title,...topicEntries(applied.task).filter(t=>applied.topics.includes(t.id)).map(t=>t.label),applied.year==='all'?'':applied.year==='unknown'?'Год не указан':applied.year].filter(Boolean).map(esc).join(' · ');}
  function resultsView(){
    const result=matches(applied),pages=Math.max(1,Math.ceil(result.length/pageSize));page=Math.min(page,pages);
    return '<div class="practice-view"><header class="practice-hero"><h2>Подборка заданий</h2><p>'+caption()+'</p></header><div class="practice-results-heading"><h3>'+countLabel(result.length)+'</h3></div>'+
      (result.length?'<div class="practice-question-list">'+result.slice((page-1)*pageSize,page*pageSize).map(q=>questionRow(q,work[q.id],drafts[q.id])).join('')+'</div>':'<div class="practice-empty"><h3>По этим параметрам заданий нет</h3><p>Измени фильтры справа или выбери другой год.</p></div>')+
      (pages>1?'<nav class="practice-pages" aria-label="Страницы заданий">'+button('prev',icon('back'),'aria-label="Предыдущая страница" '+(page===1?'disabled':''))+'<span>'+page+' / '+pages+'</span>'+button('next',icon('forward'),'aria-label="Следующая страница" '+(page===pages?'disabled':''))+'</nav>':'')+
      '<details class="practice-catalog-note"><summary>О материалах</summary><p>Датированные задания перенесены из демоверсий ФИПИ. У заданий открытого банка год не указан. Разметка тем предварительная: одно упражнение может включать несколько правил.</p></details></div>';
  }
  function questionView(){
    const q=current,policy=answerPolicy(q);
    return '<div class="practice-view practice-task-view"><div class="practice-topline">'+button('back',icon('back')+'<span>К подборке</span>','class="practice-back"')+'<span>'+esc(q.internalId||q.id)+'</span></div>'+
      '<div class="practice-workspace" data-pencil-workspace>'+
      '<section class="practice-source-content practice-instruction" data-instruction aria-label="Инструкция"></section>'+
      (q.passage?'<details class="practice-passage" open><summary>Текст к заданию</summary><div class="practice-source-content" data-passage></div></details>':'')+
      '<section class="practice-source-content practice-material" data-statement aria-label="Материал задания"></section><div class="practice-pencil" data-pencil-controls></div></div><form class="practice-answer" data-practice-answer><label for="practice-answer">'+(q.mode==='essay'?'Твой черновик':'Твой ответ')+'</label>'+
      (q.mode==='essay'?'<textarea id="practice-answer" name="answer" rows="10">'+esc(drafts[q.id]||'')+'</textarea>':'<input id="practice-answer" name="answer" autocomplete="off" inputmode="'+policy.inputMode+'" aria-describedby="practice-answer-hint practice-answer-status" maxlength="250" required value="'+esc(drafts[q.id]||'')+'"><p class="practice-answer-hint" id="practice-answer-hint">'+esc(policy.hint)+'</p>')+
      '<div><button class="practice-primary" type="submit" '+(checking?'disabled':'')+'>'+(checking?'Проверяем…':q.mode==='essay'?'Сохранить черновик':'Проверить ответ')+'</button></div><p class="practice-answer-status" id="practice-answer-status" role="status">'+esc(status)+'</p></form></div>';
  }
  function render(resetScroll=false,updateRail=true){
    if(!active||root.dataset.section!=='practice')return;
    pencil?.destroy();pencil=null;
    body.dataset.design='folders';
    heading.textContent='Практика';rail.hidden=false;if(updateRail&&!guideRail.active)sidebar();root.dataset.practiceEmpty=String(screen==='idle');
    if(screen==='idle')body.innerHTML='';
    else if(screen==='loading')body.innerHTML='<div class="practice-view">'+button('back',icon('back')+' К подборке','class="practice-back"')+'<p role="status" class="practice-loading">Загружаем задание…</p></div>';
    else if(screen==='error')body.innerHTML='<div class="practice-view">'+button('back',icon('back')+' К подборке','class="practice-back"')+'<div class="practice-empty"><h2>Задание пока не загрузилось</h2><p>'+esc(error)+'</p>'+button('retry-question','Повторить','class="practice-primary"')+'</div></div>';
    else if(screen==='question'){
      body.innerHTML=questionView();const parts=questionFragments(current.form),instruction=body.querySelector('[data-instruction]'),material=body.querySelector('[data-statement]');
      instruction.append(parts.instruction);instruction.hidden=!parts.hasInstruction;material.append(parts.material);material.hidden=!parts.hasMaterial;
      body.querySelector('[data-passage]')?.append(sourceFragment(current.passage));
    }
    else if(data)body.innerHTML=resultsView();
    enhanceControls(body);
    if(screen==='question')guideRail.show(current);else guideRail.restore();
    if(screen==='question')pencil=mountPencil({container:body,questionId:current.id,sessions:pencilSessions});
    if(resetScroll)panel.scrollTop=0;
  }
  async function openQuestion(id){
    const ticket=++generation;current={id};screen='loading';status='';checking=false;
    pages.cancel();render(true,false);
    let pending=questionCache.get(id);
    if(!pending){
      pending=fetch('./api/fipi/question?id='+encodeURIComponent(id),{signal:AbortSignal.timeout(12000)}).then(async r=>{const q=await r.json();if(!r.ok)throw new Error(q.error);return q;}).catch(e=>{if(questionCache.get(id)===pending)questionCache.delete(id);throw e;});
      if(questionCache.size>=32)questionCache.delete(questionCache.keys().next().value);questionCache.set(id,pending);
    }
    try{
      const q=await pending;if(ticket!==generation||!active)return;
      current=q;screen='question';work[id]={...work[id],visited:true};save();render(true,false);pages.enter();
      if(ticket===generation&&active)body.querySelector('[data-practice="back"]')?.focus({preventScroll:true});
    }catch(e){if(ticket===generation&&active){error=e.name==='TimeoutError'?'Загрузка заняла слишком много времени. Попробуй ещё раз.':e.message;screen='error';render(true,false);}}
  }
  function toggleRail(open){railOpen=open;rail.dataset.open=String(open);setDisclosureOpen(rail.querySelector('.study-rail-content'),open,{trigger:rail.querySelector('.practice-rail-toggle')});}
  function apply(){pages.cancel();applied={...filters,topics:[...filters.topics]};screen='catalog';generation++;checking=false;page=1;save();render(true,false);if(globalThis.matchMedia?.('(max-width:1050px)').matches)toggleRail(false);}
  function click(event){
    if(!active)return;const target=event.target.closest('[data-practice]');if(!target||target.disabled)return;const action=target.dataset.practice;
    if(action==='guide-rail')guideRail.toggle();
    else if(action==='rail')toggleRail(!railOpen);
    else if(action==='question'){scroll=panel.scrollTop;openQuestion(target.dataset.question);}
    else if(action==='back'){generation++;checking=false;pages.change(()=>{screen=applied?'catalog':'idle';render(false,false);panel.scrollTop=scroll;body.querySelector('[data-question="'+current?.id+'"]')?.focus({preventScroll:true});});}
    else if(action==='reset'){pages.cancel();filters=cleanFilters();applied=null;screen='idle';generation++;checking=false;save();render(true);}
    else if(action==='prev'||action==='next'){pages.change(()=>{page+=action==='next'?1:-1;render(true,false);});}
    else if(action==='retry-question')openQuestion(current.id);else if(action==='retry')show();
  }
  body.addEventListener('click',click);rail.addEventListener('click',click);
  rail.addEventListener('change',event=>{
    const el=event.target;
    if(el.name==='section'){filters=cleanFilters({...filters,section:el.value,task:0,topics:[]});sidebar();}
    else if(el.name==='task'){filters=cleanFilters({...filters,task:el.value,topics:[]});sidebar(true);}
    else if(el.name==='year'){filters.year=el.value;sidebar();}
    else if(el.name==='topic'){filters.topics=el.checked?[...new Set([...filters.topics,el.value])]:filters.topics.filter(id=>id!==el.value);const count=rail.querySelector('[data-match-count]');if(count)count.textContent=matches().length;}
    save();
  });
  rail.addEventListener('input',event=>{if(event.target.name==='query'){filters.query=event.target.value;const count=rail.querySelector('[data-match-count]');if(count)count.textContent=matches().length;}});
  rail.addEventListener('submit',event=>{event.preventDefault();if(active&&data)apply();});
  body.addEventListener('input',event=>{if(active&&screen==='question'&&event.target.name==='answer'){drafts[current.id]=event.target.value;work[current.id]={...work[current.id],visited:true,lastStatus:'draft'};save();}});
  body.addEventListener('submit',async event=>{
    if(!active||!event.target.hasAttribute('data-practice-answer'))return;event.preventDefault();if(checking)return;
    const id=current.id,ticket=generation,answer=String(new FormData(event.target).get('answer')||'');drafts[id]=answer;save();
    if(current.mode==='essay'){status='Черновик сохранён. Сочинение нужно проверить по критериям.';body.querySelector('.practice-answer-status').textContent=status;return;}
    try{normalizeAnswer(current,answer);}catch(e){status=e.message;body.querySelector('.practice-answer-status').textContent=status;return;}
    checking=true;status='';render(false,false);
    try{const r=await fetch('./api/fipi/check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,answer}),signal:AbortSignal.timeout(12000)}),result=await r.json();if(!r.ok)throw new Error(result.error);if(ticket!==generation||!active||drafts[id]!==answer)return;
      status={correct:'Верно!',incorrect:'Пока неверно. Попробуй ещё раз.',submitted:'Ответ сохранён. Источник не подтвердил правильность.',unavailable:'Ответ сохранён. Автоматическая проверка этого задания пока недоступна.'}[result.status]||'Ответ сохранён.';
      work[id]={...work[id],done:work[id]?.done||result.status==='correct',lastStatus:result.status};save();
    }catch(e){if(ticket===generation&&active&&drafts[id]===answer)status=e.name==='TimeoutError'?'Проверка заняла слишком много времени. Ответ сохранён. Попробуй ещё раз.':e.message;}finally{if(ticket===generation&&active){checking=false;render(false,false);}}
  });
  async function show(){if(active&&data){render();wake();return;}active=true;error='';root.dataset.practiceReveal='waiting';rail.hidden=false;render();try{await load();if(active&&root.dataset.section==='practice'){render();wake();}}catch(e){if(active){error=e.name==='TimeoutError'?'Загрузка списка заданий заняла слишком много времени. Попробуй ещё раз.':'Не удалось загрузить задания. Попробуй ещё раз.';render();root.dataset.practiceReveal='ready';}}}
  function leave(){if(!active)return;pencil?.destroy();pencil=null;pages.cancel();active=false;generation++;checking=false;if(screen==='loading')screen=applied?'catalog':'idle';cancelAnimationFrame(frame);rail.hidden=true;save();}
  return {show,leave,mountStyles(){return new Promise(resolve=>{const link=document.createElement('link');link.rel='stylesheet';link.href='./practice84.css';link.onload=link.onerror=resolve;document.head.append(link);});}};
}
