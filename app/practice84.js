import {icon} from './ui-study56-icons.js';
import {tasks,sections,topics,topicEntries,filterCatalog} from './practice84-taxonomy.js';
import {sourceFragment} from './practice84-content.js';
import {cameraFor} from './room-camera.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const storageKey='kunilingo.practice84';
const bankUrl='https://ege.fipi.ru/bank/index.php?proj=AF0ED3F2557F8FFC4C06F80B6803FD26';
const pageSize=12;
const taskCount=count=>count+' '+(count%100>=11&&count%100<=14?'заданий':count%10===1?'задание':count%10>=2&&count%10<=4?'задания':'заданий');
export function createPractice({root,panel,body,heading}) {
  let saved={};try{saved=JSON.parse(localStorage.getItem(storageKey)||'{}');}catch{}
  const record=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  saved=record(saved);const stored=record(saved.filters);
  let filters={section:sections.some(s=>s.id===stored.section)?stored.section:'',task:tasks.some(t=>t.number===stored.task)?stored.task:0,topic:typeof stored.topic==='string'?stored.topic:'',year:typeof stored.year==='string'?stored.year:'all',query:typeof stored.query==='string'?stored.query:''};
  if(!topicEntries(filters.task).some(t=>t.id===filters.topic))filters.topic='';
  const drafts=record(saved.drafts),work=record(saved.work);
  let data=null,years=[],loadPromise=null,active=false,screen='catalog',current=null,page=1,scroll=0,generation=0,frame=0;
  let railOpen=!globalThis.matchMedia?.('(max-width:1050px)').matches,opened=new Set(),lastError='',answerStatus='',checking=false;
  const rail=document.createElement('aside');rail.className='practice-rail';rail.setAttribute('aria-label','Каталог практики');rail.hidden=true;root.append(rail);
  const save=()=>{try{localStorage.setItem(storageKey,JSON.stringify({filters,drafts,work}));}catch{}};
  const definition=()=>tasks.find(t=>t.number===Number(filters.task));
  const selectedTopic=()=>topicEntries(Number(filters.task)).find(t=>t.id===filters.topic);
  const matching=()=>data?filterCatalog(data.items,filters,work):[];
  const countFor=(options)=>filterCatalog(data.items,{...filters,query:'',...options},work).length;
  const button=(action,label,extra='')=>'<button type="button" '+extra+' data-practice="'+action+'">'+label+'</button>';
  function wake(){
    if(!active||!data||root.dataset.section!=='practice'||root.dataset.practiceReveal==='leaving')return;
    cancelAnimationFrame(frame);
    const check=()=>{
      if(!active||root.dataset.section!=='practice'||root.dataset.practiceReveal==='leaving')return;
      if((cameraFor(root)?.journeyProgress(performance.now())??1)<.75){frame=requestAnimationFrame(check);return;}
      root.dataset.practiceReveal='ready';panel.inert=false;frame=0;
    };frame=requestAnimationFrame(check);
  }
  root.addEventListener('camera-start',()=>{if(active){root.dataset.practiceReveal='waiting';panel.inert=true;wake();}});
  root.addEventListener('camera-settled',wake);
  function load(){
    return loadPromise??=Promise.all([
      fetch('./api/fipi/catalog').then(r=>{if(!r.ok)throw new Error();return r.json();}),
      fetch('./data/fipi84-years.json').then(r=>{if(!r.ok)throw new Error();return r.json();})
    ]).then(([catalog,archive])=>{
      if(!Array.isArray(catalog.items)||catalog.items.length!==catalog.total)throw new Error();
      data=catalog;years=archive;return catalog;
    }).catch(error=>{loadPromise=null;throw error;});
  }
  function sidebar(){
    if(!data){rail.innerHTML='';return;}
    rail.dataset.open=String(railOpen);
    const found=sections.find(s=>s.tasks.includes(Number(filters.task)));
    if(found&&filters.task)opened.add(found.id);
    rail.innerHTML='<header>'+button('rail',icon('practice')+'<span>Каталог</span>'+icon('chevron'),'class="practice-rail-toggle" aria-controls="practice-rail-body" aria-expanded="'+railOpen+'"')+'</header>'+
      '<div class="practice-rail-body" id="practice-rail-body">'+button('all','Все задания <span>'+data.total.toLocaleString('ru-RU')+'</span>','class="practice-all" '+(!filters.section&&!filters.task?'aria-current="true"':''))+
      sections.filter(s=>s.tasks.some(n=>data.items.some(q=>q.task===n))).map(section=>'<details class="practice-section" data-practice-section="'+section.id+'" '+(opened.has(section.id)?'open':'')+'><summary>'+escape(section.label)+'</summary><div>'+
        section.tasks.filter(n=>n>0).map(n=>{const task=tasks.find(t=>t.number===n);return button('task','<small>'+n+'</small><span>'+escape(task.title)+'</span>','data-task="'+n+'" '+(Number(filters.task)===n?'aria-current="true"':''));}).join('')+
        button('section','Весь раздел '+icon('forward'),'class="practice-section-all" data-section-id="'+section.id+'"')+'</div></details>').join('')+
      '<div class="practice-year-filter"><label for="practice-year">Год источника</label><select id="practice-year" data-practice-year><option value="all" '+(filters.year==='all'?'selected':'')+'>Все материалы</option><option value="unknown" '+(filters.year==='unknown'?'selected':'')+'>В банке год не указан</option>'+
      years.map(y=>'<option value="'+y.year+'" '+(String(filters.year)===String(y.year)?'selected':'')+'>'+y.year+' · '+(y.draft?'проект':'демоверсия')+'</option>').join('')+'</select></div>'+
      '<a class="practice-source-link" href="'+bankUrl+'" target="_blank" rel="noopener noreferrer">Открыть ФИПИ '+icon('forward')+'</a></div>';
  }
  function crumbs(){
    const task=definition(),topic=selectedTopic(),section=sections.find(s=>(filters.section&&s.id===filters.section)||(filters.task&&s.tasks.includes(Number(filters.task))));
    return '<nav class="practice-crumbs" aria-label="Положение в каталоге">'+button('all','Все задания')+
      (section?'<span>/</span>'+button('section',escape(section.label),'data-section-id="'+section.id+'"'):'')+
      (task?'<span>/</span>'+button('task','№ '+task.number,'data-task="'+task.number+'"'):'')+
      (topic?topic.path.map((id,i)=>'<span>/</span>'+button('topic',escape(topic.labels[i]),'data-topic="'+id+'"')).join(''):'')+'</nav>';
  }
  function topicBrowser(){
    const task=definition(),topic=selectedTopic();
    if(!task&&!filters.section){
      return '<div class="practice-types">'+sections.filter(s=>s.id!=='other').map(s=>button('section','<span><strong>'+escape(s.label)+'</strong><small>Задания '+s.tasks.join(', ')+' · '+countFor({section:s.id,task:0,topic:''})+'</small></span>'+icon('forward'),'class="practice-type" data-section-id="'+s.id+'"')).join('')+'</div>';
    }
    if(!task){
      return '<div class="practice-types">'+tasks.filter(t=>!filters.section||t.section===filters.section).map(t=>button('task','<span class="practice-type-number">'+t.number+'</span><span><strong>'+escape(t.title)+'</strong><small>'+taskCount(countFor({section:'',task:t.number,topic:''}))+'</small></span>'+icon('forward'),'class="practice-type" data-task="'+t.number+'"')).join('')+'</div>';
    }
    const children=topic?.children||(topic?[]:topics[task.number]);
    if(!children?.length)return '';
    return '<section class="practice-topics"><h3>Уточнить тему</h3><div>'+children.map(t=>{
      const count=countFor({topic:t.id});
      return button('topic','<span>'+escape(t.label)+'</span><small>'+count+'</small>'+icon('forward'),'class="practice-topic" data-topic="'+t.id+'" '+(!count?'disabled':''));
    }).join('')+'</div></section>';
  }
  function catalogView(){
    const dated=!['all','unknown'].includes(String(filters.year));
    if(dated){
      const source=years.find(y=>String(y.year)===String(filters.year));
      return '<div class="practice-view"><div class="practice-topline">'+button('all',icon('back')+'<span>К банку заданий</span>','class="practice-back"')+'<span>Русский язык · ФИПИ</span></div>'+
        '<header class="practice-hero"><span>МАТЕРИАЛЫ ПО ГОДАМ</span><h2>'+escape(filters.year)+'</h2><p>Официальная демоверсия, задания и критерии оценивания.</p></header>'+
        '<article class="practice-year-card"><span class="practice-year-mark">'+icon('practice')+'</span><div><h3>'+(source?.draft?'Проект демонстрационного варианта':'Демонстрационный вариант')+'</h3><p>Комплект ФИПИ за '+escape(filters.year)+' год: демоверсия, спецификация и кодификатор.</p>'+
        (source?'<a class="practice-primary" href="'+escape(source.url)+'" target="_blank" rel="noopener noreferrer">Открыть комплект ФИПИ '+icon('forward')+'</a>':'')+'</div></article>'+
        '<p class="practice-year-explainer">Год отдельных заданий открытого банка ФИПИ не сообщает. Они находятся в категории «В банке год не указан». Нумерация и форматы в старых вариантах могут отличаться от ЕГЭ 2027.</p></div>';
    }
    const result=matching(),task=definition(),topic=selectedTopic(),section=sections.find(s=>s.id===filters.section),pages=Math.max(1,Math.ceil(result.length/pageSize));
    page=Math.min(page,pages);
    const title=topic?.label||task?.title||section?.label||'Практика';
    return '<div class="practice-view"><div class="practice-topline">'+crumbs()+'<span>Русский язык · ЕГЭ</span></div><header class="practice-hero"><span>'+(task?'ТИП ЗАДАНИЯ № '+task.number:'ОТКРЫТЫЙ БАНК ФИПИ')+'</span><h2>'+escape(title)+'</h2>'+
      (!task&&!section?'<p>Выбери тип задания, затем подтему и конкретное правило.</p>':'')+'</header>'+
      '<form class="practice-search" data-practice-search><input aria-label="Поиск по теме, правилу или коду ФИПИ" name="query" type="search" placeholder="Тема, правило или код ФИПИ" value="'+escape(filters.query)+'"><button type="submit">Найти</button></form>'+
      (!filters.query?topicBrowser():'')+
      '<section class="practice-results"><div class="practice-results-heading"><h3>Задания</h3><span>'+result.length.toLocaleString('ru-RU')+'</span></div>'+
      (result.length?'<div class="practice-question-list">'+result.slice((page-1)*pageSize,page*pageSize).map(q=>{
        const type=tasks.find(t=>t.number===q.task),leaves=topicEntries(q.task).filter(t=>!t.children&&q.tags.includes(t.id)).slice(0,3);
        return button('question','<span class="practice-question-number">'+(q.task||'—')+'</span><span class="practice-question-copy"><strong>'+escape(type?.title||'Задание банка')+'</strong><span>'+escape(leaves.map(t=>t.label).join(' · ')||'Комплексное задание')+'</span><small>ФИПИ '+q.id+(q.format==='legacy'?' · прежняя формулировка':'')+'</small></span>'+(work[q.id]?.done?icon('check'):icon('forward')),'class="practice-question-row" data-question="'+q.id+'"');
      }).join('')+'</div>':'<div class="practice-empty"><h3>Задания не найдены</h3><p>Попробуй другую тему или код ФИПИ.</p>'+button('reset','Сбросить поиск','class="practice-secondary"')+'</div>')+
      (pages>1?'<nav class="practice-pages" aria-label="Страницы заданий">'+button('prev',icon('back'),'aria-label="Предыдущая страница" '+(page===1?'disabled':''))+'<span>'+page+' / '+pages+'</span>'+button('next',icon('forward'),'aria-label="Следующая страница" '+(page===pages?'disabled':''))+'</nav>':'')+'</section>'+
      '<footer class="practice-catalog-footer"><a href="'+bankUrl+'" target="_blank" rel="noopener noreferrer">Источник: открытый банк ФИПИ</a><span>Сверено '+new Date(data.checkedAt).toLocaleDateString('ru-RU')+'</span>'+
      '<details><summary>О разметке и годах</summary><p>Все '+data.total+' заданий текущего банка доступны в каталоге. Типы и подтемы определены автоматически по формулировкам и кодам КЭС; это учебная разметка KuniLingo, требующая предметной проверки. Одно задание может относиться к нескольким правилам. Годы в карточках банка не указаны; датированные демоверсии доступны через фильтр «Год источника».</p></details></footer></div>';
  }
  function questionView(){
    const q=current,type=tasks.find(t=>t.number===q.task);
    return '<div class="practice-view practice-task-view"><div class="practice-topline">'+button('back',icon('back')+'<span>К подборке</span>','class="practice-back"')+'<a href="'+escape(q.source)+'" target="_blank" rel="noopener noreferrer">ФИПИ '+q.id+' '+icon('forward')+'</a></div>'+
      '<header class="practice-hero"><span>ТИП № '+q.task+' · ГОД НЕ УКАЗАН</span><h2>'+escape(type?.title||'Задание')+'</h2></header>'+
      (q.format==='legacy'?'<p class="practice-format-note">В источнике сохранена прежняя формулировка задания. Для подготовки к ЕГЭ 2027 учитывай актуальные требования.</p>':'')+
      (q.passage?'<details class="practice-passage" open><summary>Текст к заданию</summary><div class="practice-source-content" data-passage></div></details>':'')+
      '<section class="practice-source-content" data-statement aria-label="Условие задания"></section>'+
      '<form class="practice-answer" data-practice-answer><label for="practice-answer">'+(q.mode==='essay'?'Твой черновик':q.mode==='multiple'?'Номера выбранных ответов':q.mode==='matching'?'Ответ в порядке букв А, Б, В…':'Твой ответ')+'</label>'+
      (q.mode==='essay'?'<textarea id="practice-answer" name="answer" rows="10" placeholder="Напиши сочинение…">'+escape(drafts[q.id]||'')+'</textarea>':'<input id="practice-answer" name="answer" autocomplete="off" maxlength="250" required value="'+escape(drafts[q.id]||'')+'" '+(q.mode==='multiple'||q.mode==='matching'?'inputmode="numeric" placeholder="Например, 135"':'')+'>')+
      '<div><button class="practice-primary" type="submit" '+(checking?'disabled':'')+'>'+(checking?'Проверяем…':q.mode==='essay'?'Сохранить черновик':'Проверить на ФИПИ')+'</button></div><p class="practice-answer-status" role="status">'+escape(answerStatus)+'</p></form></div>';
  }
  function render(resetScroll=false){
    if(!active||root.dataset.section!=='practice')return;
    heading.textContent='Практика';rail.hidden=false;sidebar();
    if(!data)body.innerHTML='<div class="practice-view"><header class="practice-hero"><span>ОТКРЫТЫЙ БАНК ФИПИ</span><h2>Практика</h2></header><p role="status">'+(lastError||'Собираем каталог заданий…')+'</p>'+(lastError?button('retry','Попробовать снова','class="practice-primary"'):'')+'</div>';
    else if(screen==='loading')body.innerHTML='<div class="practice-view">'+button('back',icon('back')+' К подборке','class="practice-back"')+'<p class="practice-loading" role="status">Загружаем условие из ФИПИ…</p></div>';
    else if(screen==='error')body.innerHTML='<div class="practice-view">'+button('back',icon('back')+' К подборке','class="practice-back"')+'<div class="practice-empty"><h2>Задание пока не загрузилось</h2><p>'+escape(lastError)+'</p>'+button('retry-question','Повторить','class="practice-primary"')+'<a href="'+bankUrl+'" target="_blank" rel="noopener noreferrer">Открыть банк ФИПИ</a></div></div>';
    else if(screen==='question'){
      body.innerHTML=questionView();
      body.querySelector('[data-statement]').append(sourceFragment(current.form));
      body.querySelector('[data-passage]')?.append(sourceFragment(current.passage));
    }else body.innerHTML=catalogView();
    if(resetScroll)panel.scrollTop=0;
  }
  async function openQuestion(id){
    const ticket=++generation;current={id};screen='loading';answerStatus='';checking=false;render(true);
    try{
      const response=await fetch('./api/fipi/question?id='+encodeURIComponent(id));const value=await response.json();if(!response.ok)throw new Error(value.error);
      if(ticket!==generation||!active)return;
      current=value;screen='question';render(true);body.querySelector('[data-practice="back"]')?.focus({preventScroll:true});
    }catch(error){if(ticket===generation&&active){lastError=error.message;screen='error';render(true);}}
  }
  function change(values){
    filters={...filters,...values};screen='catalog';generation++;page=1;save();render(true);
  }
  function click(event){
    if(!active)return;const target=event.target.closest('[data-practice]');if(!target||target.disabled)return;
    const action=target.dataset.practice;
    if(action==='rail'){railOpen=!railOpen;sidebar();return;}
    if(action==='all')change({section:'',task:0,topic:'',query:'',year:'all'});
    else if(action==='section'){opened.add(target.dataset.sectionId);change({section:target.dataset.sectionId,task:0,topic:'',query:'',year:'all'});}
    else if(action==='task')change({section:'',task:Number(target.dataset.task),topic:'',query:'',year:'all'});
    else if(action==='topic')change({topic:target.dataset.topic,query:''});
    else if(action==='question'){scroll=panel.scrollTop;openQuestion(target.dataset.question);}
    else if(action==='back'){generation++;screen='catalog';checking=false;render();panel.scrollTop=scroll;}
    else if(action==='retry-question')openQuestion(current.id);
    else if(action==='prev'||action==='next'){page+=action==='next'?1:-1;render();body.querySelector('.practice-results')?.scrollIntoView({block:'start',behavior:globalThis.matchMedia?.('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});}
    else if(action==='reset')change({query:'',topic:''});
    else if(action==='retry')show();
  }
  body.addEventListener('click',click);rail.addEventListener('click',click);
  rail.addEventListener('toggle',event=>{const id=event.target.dataset.practiceSection;if(id)event.target.open?opened.add(id):opened.delete(id);},true);
  rail.addEventListener('change',event=>{if(event.target.hasAttribute('data-practice-year'))change({year:event.target.value,query:''});});
  body.addEventListener('input',event=>{if(active&&screen==='question'&&event.target.name==='answer'){drafts[current.id]=event.target.value;save();}});
  body.addEventListener('submit',async event=>{
    if(!active)return;
    if(event.target.hasAttribute('data-practice-search')){event.preventDefault();change({query:new FormData(event.target).get('query')||''});return;}
    if(!event.target.hasAttribute('data-practice-answer'))return;
    event.preventDefault();if(checking)return;
    const id=current.id,ticket=generation,answer=String(new FormData(event.target).get('answer')||'');drafts[id]=answer;save();
    if(current.mode==='essay'){answerStatus='Черновик сохранён на этом устройстве. Сочинение требует проверки по критериям.';body.querySelector('.practice-answer-status').textContent=answerStatus;return;}
    checking=true;answerStatus='';render();
    try{
      const response=await fetch('./api/fipi/check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,answer})});const result=await response.json();if(!response.ok)throw new Error(result.error);
      if(ticket!==generation||!active)return;
      answerStatus={correct:'Верно. Ответ проверен ФИПИ.',incorrect:'Пока неверно. Можно исправить ответ и попробовать ещё раз.',submitted:'ФИПИ принял ответ, но не подтвердил его правильность.',unavailable:'ФИПИ не вернул результат проверки. Ответ сохранён.'}[result.status]||'Ответ сохранён.';
      work[id]={...work[id],done:result.status==='correct',lastStatus:result.status};save();
    }catch(error){if(ticket===generation&&active)answerStatus=error.message;}
    finally{if(ticket===generation&&active){checking=false;render();}}
  });
  async function show(){
    if(active&&data){render();wake();return;}
    active=true;lastError='';root.dataset.practiceReveal='waiting';panel.inert=true;rail.hidden=false;render();
    try{await load();if(active&&root.dataset.section==='practice'){render();wake();}}
    catch{if(active){lastError='Каталог пока недоступен. Проверь подключение и попробуй ещё раз.';render();root.dataset.practiceReveal='ready';panel.inert=false;}}
  }
  function leave(){if(!active)return;active=false;generation++;checking=false;if(screen==='loading')screen='catalog';cancelAnimationFrame(frame);rail.hidden=true;save();}
  return {show,leave,mountStyles(){return new Promise(resolve=>{const link=document.createElement('link');link.rel='stylesheet';link.href='./practice84.css';link.onload=link.onerror=resolve;document.head.append(link);});}};
}
