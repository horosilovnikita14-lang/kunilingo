import {course,isCorrect,mockPlan,methodLinks,courseRationale} from './course78-data.js';
import {createState,nextStep,canOpen,workFor,allAnswered} from './course78-state.js';
import {examSource} from './route-map72-data.js';
import {courseMap} from './course79-map.js';
import {dictionaryMarkup,filterDictionary} from './course79-materials.js';
import {lessonGuideMarkup100} from './study100-guides.js';
import {icon} from './ui-study56-icons.js';
import {enhanceControls,enhanceDisclosure,setDisclosureOpen,STUDY_MOTION_DURATION} from './study-controls86.js';

const storageKey='kunilingo.russian.course78';
const lessons=course.flatMap(unit=>unit.lessons);
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const lessonById=id=>lessons.find(lesson=>lesson.id===id);
const unitFor=id=>course.find(unit=>unit.lessons.some(lesson=>lesson.id===id));

export function createCourse({body,heading,storage=globalThis.localStorage}) {
  const listeners=new AbortController();let destroyed=false;
  const listen=(target,type,handler)=>target?.addEventListener?.(type,handler,{signal:listeners.signal});
  let saved={},legacy=false;
  try {
    const current=storage.getItem(storageKey);
    saved=JSON.parse(current||storage.getItem('kunilingo.russian.course73')||'{}');
    legacy=!current;
  } catch {}
  const state=createState(saved,legacy);
  if(legacy) for(const lesson of lessons) {
    const work=saved?.lessonWork?.[lesson.id];
    if(!work||!lesson.practice.length||['word-1','word-4','sentence-1'].includes(lesson.id)) continue;
    const restored=workFor({[lesson.id]:work},lesson.id,lesson.practice);
    state.practiceWork[lesson.id]={...restored,answers:Object.fromEntries(lesson.practice.slice(0,restored.step).map((question,index)=>[index,question.expected]))};
  }
  const panel=heading.closest('.study-panel'),root=body.closest('#room');
  let screen={kind:'route'},trailScroll=0,trailReturn=null,noteReturn=null;
  let storageFailed=false,archiveTimer=null,openingTimer=null,closingTimer=null,archiving=false,flash=null,flight=null;
  const compactNotes=()=>globalThis.matchMedia?.('(max-width: 1050px)').matches;
  let notesOpen=!compactNotes();
  const notes=document.createElement('aside');
  notes.className='course-notes';notes.setAttribute('aria-label','Конспекты пройденной теории');
  root.append(notes);
  const currentLesson=()=>lessonById(screen.lessonId);
  const currentUnit=()=>course.find(unit=>unit.id===screen.unitId)||unitFor(screen.lessonId);
  const allowed=(kind,id)=>canOpen(course,state,kind,id);
  const button=(action,label,cls='course-primary',disabled=false)=>'<button type="button" data-course="'+action+'" class="'+cls+'" '+(disabled?'disabled':'')+'>'+label+'</button>';
  const intro=(_label,title,subtitle='')=>'<header class="course-hero"><h2 data-course-focus tabindex="-1">'+escape(title)+'</h2>'+(subtitle?'<p>'+escape(subtitle)+'</p>':'')+'</header>';
  const questionSet=()=>screen.kind==='check'?currentLesson().theoryCheck:currentLesson().practice;
  const workStore=()=>screen.kind==='check'?state.checkWork:state.practiceWork;

  function rememberWork() {
    if (screen.kind==='check'||screen.kind==='practice') {
      const store=workStore();
      store[screen.lessonId]={...store[screen.lessonId],step:screen.step,answer:screen.answer,result:screen.result,attempts:screen.attempts};
    }
  }
  function save() {
    if(destroyed)return;
    rememberWork();
    try {storage.setItem(storageKey,JSON.stringify(state));storageFailed=false;} catch {storageFailed=true;}
  }
  function cancelTransient() {
    clearTimeout(archiveTimer);clearTimeout(openingTimer);clearTimeout(closingTimer);
    archiveTimer=openingTimer=closingTimer=null;archiving=false;
    panel.classList.remove('course-archiving','course-opening','course-closing','course-map-return');
    flight?.remove();flight=null;
    body.querySelector('.is-opening')?.classList.remove('is-opening');
    panel.inert=false;
  }
  function closeSheet(commit) {
    if(closingTimer!==null)return;
    save();
    if(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {commit();return;}
    panel.classList.remove('course-opening');panel.classList.add('course-closing');panel.inert=true;
    closingTimer=setTimeout(()=>{
      closingTimer=null;panel.classList.remove('course-closing');panel.inert=false;
      if(root.dataset.section==='path')commit();
    },STUDY_MOTION_DURATION);
  }
  function fields(question,name,value='') {
    if (!question.options) return '<label class="course-input">Твой ответ<input name="'+name+'" autocomplete="off" value="'+escape(value)+'" required></label>';
    return '<div class="course-options">'+question.options.map(option=>'<label><input type="radio" name="'+name+'" value="'+escape(option)+'" '+(value===option?'checked':'')+' required><span>'+escape(option)+'</span></label>').join('')+'</div>';
  }
  function theory(lesson) {
    return '<div class="course-reading"><section><h3>Главное правило</h3><p>'+escape(lesson.rule)+'</p></section>'+
      '<section><h3>Как рассуждать</h3><ol>'+lesson.theorySteps.map(step=>'<li>'+escape(step)+'</li>').join('')+'</ol></section>'+
      '<section class="course-example"><h3>Разберём пример</h3><p>'+escape(lesson.example)+'</p></section>'+
      '<aside class="course-trap"><h3>Ловушка</h3><p>'+escape(lesson.trap)+'</p></aside>'+dictionaryMarkup(lesson.id,escape)+lessonGuideMarkup100(lesson.id)+'</div>';
  }
  function stages(lesson) {
    if(['practice','writing','complete','theory-complete'].includes(screen.kind)) return '';
    const active=screen.kind==='learn'?'theory':'check';
    return '<nav class="course-stage-nav" aria-label="Этапы темы">'+[
      ['theory','Теория',false],['check','Проверка понимания',!state.theoryRead[lesson.id]]
    ].map(([action,label,disabled],index)=>'<button type="button" data-course="'+action+'" '+(active===action?'aria-current="step"':'')+' '+(disabled?'disabled':'')+'><span>'+(index+1)+'</span>'+label+'</button>').join('')+'</nav>';
  }
  function writer(task,id) {
    const checks=state.writingChecks[id]||{};
    return '<form data-course-form="writing" data-writing-id="'+id+'" class="course-form">'+
      '<details class="course-reading-text" open><summary>Исходный текст</summary><p>'+escape(task.text)+'</p></details>'+
      '<p><strong>Вопрос</strong> · '+escape(task.problem)+'</p><p>'+escape(task.prompt)+'</p>'+
      '<label class="course-input">Твой черновик<textarea name="draft" data-course-draft="'+id+'" rows="8" required>'+escape(state.drafts[id])+'</textarea></label>'+
      '<p class="course-status">Это самостоятельная работа с проверкой по критериям. Автоматическая оценка сочинения не выставляется.</p>'+
      '<fieldset class="course-rubric"><legend>Проверь свою работу</legend>'+task.criteria.map((item,index)=>'<label><input type="checkbox" data-writing-check="'+index+'" data-writing-id="'+id+'" '+(checks[index]?'checked':'')+' required> '+escape(item)+'</label>').join('')+'</fieldset>'+
      '<button class="course-primary" type="submit">Завершить самопроверку</button></form>';
  }
  function lessonScreen() {
    const lesson=currentLesson();
    if (screen.kind==='learn') return intro('ТЕОРИЯ',lesson.title,lesson.goal)+stages(lesson)+theory(lesson)+button('read','К проверке понимания');
    if (screen.kind==='theory-complete') return '<div class="course-complete course-theory-complete">'+icon('check')+intro('ТЕОРИЯ ЗАВЕРШЕНА','Конспект на месте','На карте открылась следующая точка — практика по этой теме.')+button('practice','Открыть практику')+'</div>';
    if (screen.kind==='complete') {
      const next=nextStep(course,state);
      return '<div class="course-complete">'+icon('check')+intro('ПРАКТИКА ЗАВЕРШЕНА',lesson.title,'Следующий шаг открыт на карте.')+(next?button('next','Следующий шаг'):'')+'</div>';
    }
    if (screen.kind==='writing') return intro('ПРАКТИКА',lesson.title,lesson.goal)+writer(lesson.writing,lesson.id);
    const questions=questionSet(),item=questions[screen.step],correct=screen.result&&isCorrect(item,screen.answer);
    const checking=screen.kind==='check';
    return intro(checking?'ПРОВЕРКА ПОНИМАНИЯ':'ПРАКТИКА',lesson.title)+
      (checking?stages(lesson):'')+
      '<p class="course-question-meta">'+(checking?'Понимаю правило':escape(item.mode))+' · '+(screen.step+1)+' / '+questions.length+'</p>'+
      '<form data-course-form="question" class="course-form"><fieldset '+(correct?'disabled':'')+'><legend>'+escape(item.prompt)+'</legend>'+fields(item,'answer',screen.answer)+'</fieldset>'+
      '<div role="status">'+(screen.result?'<div class="course-feedback '+(correct?'':'is-miss')+'"><strong>'+(correct?'Верно':'Попробуй ещё раз')+'</strong><p>'+escape(correct||screen.attempts>=2?item.feedback:lesson.trap)+'</p>'+(correct||screen.attempts<2?'':'<p>Ответ для разбора: '+escape(item.expected)+'.</p>')+'</div>':'')+'</div>'+
      (correct?button('question-next',screen.step+1===questions.length?(checking?'Завершить теорию':'Завершить тему'):'Дальше'):'<button type="submit" class="course-primary">Проверить ответ</button>')+'</form>';
  }
  function controlScreen() {
    const unit=currentUnit();
    if (unit.kind==='writing') return intro('КОНТРОЛЬНАЯ','Сочинение на новом тексте',unit.title)+writer(unit.writingCheckpoint,'essay-control');
    if (screen.report) {
      const {correct,total,rows,passed}=screen.report;
      return intro('РЕЗУЛЬТАТ',passed?'Раздел пройден':'Нужно повторить',correct+' из '+total+' верно')+
        '<ol class="course-report">'+rows.map(({lesson,answer,ok})=>'<li class="'+(ok?'':'is-miss')+'"><strong>'+escape(lesson.title)+'</strong><p>'+escape(lesson.checkpoint.prompt)+'</p><p>Твой ответ: '+escape(answer)+'. Верный ответ: '+escape(lesson.checkpoint.expected)+'.</p><p>'+escape(lesson.checkpoint.feedback)+'</p>'+button('note-'+lesson.id,'Открыть конспект','course-secondary')+'</li>').join('')+'</ol>'+
        (passed?button('next','Следующий шаг'):button('control-retry','Пройти ещё раз'));
    }
    const answers=state.controlWork[unit.id]||{};
    return intro('КОНТРОЛЬНАЯ',unit.title,'Соберём всё изученное в разделе. После сдачи появится разбор.')+
      '<p>Для прохождения — '+Math.ceil(unit.lessons.length*.8)+' из '+unit.lessons.length+' верных ответов.</p>'+
      '<form data-course-form="control" class="course-form">'+unit.lessons.map((lesson,index)=>'<fieldset><legend>'+(index+1)+'. '+escape(lesson.checkpoint.prompt)+'</legend>'+fields(lesson.checkpoint,'q'+index,answers['q'+index])+'</fieldset>').join('')+'<button type="submit" class="course-primary">Проверить контрольную</button></form>';
  }
  function finish() {
    const links={...examSource,...methodLinks};
    return intro('ЗАВЕРШЕНИЕ ПУТИ','Пробный экзамен','Выполни полный вариант и разбери ошибки.')+'<ol class="course-report">'+mockPlan.map((item,index)=>'<li><h3>'+escape(item.title)+'</h3><p>'+escape(item.detail)+'</p><a class="map-source" href="'+links[item.link]+'" target="_blank" rel="noopener">Материалы ФИПИ ↗</a><label class="course-mock-check"><input type="checkbox" data-course-mock="'+index+'" '+(state.mocks[index]?'checked':'')+'> Сделано</label></li>').join('')+'</ol>';
  }
  function renderNotes() {
    const previousScroll=notes.querySelector('.course-notes-body')?.scrollTop||0;
    const active=document.activeElement;
    const focus=active&&notes.contains?.(active)?{
      toggle:active.classList?.contains('course-notes-toggle'),
      note:active.dataset?.note,
      unit:active.tagName==='SUMMARY'?active.parentElement?.dataset.unit:null
    }:null;
    notes.classList.remove('is-receiving');
    const expanded=new Set([...notes.querySelectorAll('details[open]')].filter(node=>node.dataset.expanded!=='false').map(node=>node.dataset.unit));
    const earned=lessons.filter(lesson=>state.theoryPassed[lesson.id]);
    notes.dataset.open=String(notesOpen);
    notes.innerHTML='<header><button type="button" class="course-notes-toggle" aria-expanded="'+notesOpen+'" aria-controls="course-notes-content">'+icon('practice')+'<span>Конспекты</span>'+icon('chevron')+'</button></header>'+
      '<div class="study-rail-content" id="course-notes-content"><div class="study-disclosure-inner"><div class="course-notes-body" id="course-notes-body">'+(earned.length?course.map(unit=>{
        const saved=unit.lessons.filter(lesson=>state.theoryPassed[lesson.id]);
        if (!saved.length) return '';
        return '<details class="course-note-group" data-unit="'+unit.id+'" '+(expanded.has(unit.id)||saved.some(lesson=>lesson.id===flash)?'open':'')+'><summary><span>'+escape(unit.title)+'</span></summary>'+saved.map(lesson=>'<button type="button" class="course-note-item '+(lesson.id===flash?'course-archive-flash':'')+'" data-note="'+lesson.id+'">'+icon('practice')+'<span>'+escape(lesson.title)+'</span>'+icon('chevron','course-note-link-chevron')+'</button>').join('')+'</details>';
      }).join(''):'<p class="course-notes-empty">Здесь появятся конспекты после проверки теории. К ним всегда можно вернуться.</p>')+'</div></div></div>';
    enhanceControls(notes);
    notes.querySelector('[data-note="'+(screen.kind==='note'?screen.lessonId:'')+'"]')?.setAttribute('aria-current','true');
    enhanceDisclosure(notes.querySelector('.course-notes-toggle'),notes.querySelector('.study-rail-content'),{open:notesOpen});
    const scrollBody=notes.querySelector('.course-notes-body');if(scrollBody)scrollBody.scrollTop=previousScroll;
    const focusTarget=focus?.toggle?notes.querySelector('.course-notes-toggle'):focus?.note?notes.querySelector('[data-note="'+focus.note+'"]'):focus?.unit?notes.querySelector('[data-unit="'+focus.unit+'"] > summary'):null;
    focusTarget?.focus({preventScroll:true});
  }
  function render(focus=false,enter=false) {
    panel.classList.remove('course-opening','course-map-return');
    const onMap=screen.kind==='route',isNote=screen.kind==='note';
    const lesson=screen.lessonId?currentLesson():null;
    heading.textContent=onMap?'Твой путь':lesson?.title||'Контрольная';
    if (onMap) {
      const next=nextStep(course,state);
      body.innerHTML='<div class="route-map course course-map-view">'+
        courseMap({course,...state,next,canOpen:allowed,allDone:!next})+
        '<footer class="map-footer"><details><summary>О программе</summary><p>'+courseRationale+'</p><p>Материалы ориентированы на проект ЕГЭ 2027. Учебные примеры авторские. Прогресс сохраняется на этом устройстве.</p><a href="'+examSource.url+'" target="_blank" rel="noopener">Материалы ФИПИ ↗</a></details></footer></div>';
    } else {
      const context=lesson?unitFor(lesson.id).title:screen.kind==='control'?currentUnit().title:'Завершение пути';
      body.innerHTML='<div class="route-map course course-lesson-view '+(isNote?'course-note-view':'')+'"><nav class="course-nav" aria-label="Навигация занятия">'+
        button(isNote?'note-back':'route',icon('back')+'<span>'+(isNote?'Вернуться':'К карте')+'</span>','course-map-back')+
        '<span class="course-nav-context">'+escape(context)+'</span>'+
        (lesson&&!isNote&&['practice','writing','complete'].includes(screen.kind)?button('theory','Конспект','course-theory-back'):'')+'</nav>'+
        '<div class="course-page">'+
        (isNote?intro('МОЙ КОНСПЕКТ',lesson.title,lesson.goal)+theory(lesson):lesson?lessonScreen():screen.kind==='control'?controlScreen():finish())+'</div></div>';
    }
    if (storageFailed) body.insertAdjacentHTML('beforeend','<p class="course-save-warning" role="status">Не удалось сохранить прогресс на устройстве.</p>');
    enhanceControls(body);
    renderNotes();
    flash=null;
    if(enter&&!onMap) {void panel.offsetWidth;panel.classList.add('course-opening');}
    if (onMap) panel.scrollTop=trailScroll;
    if (focus) {
      if(onMap) {
        const target=trailReturn&&body.querySelector(trailReturn);
        target?.focus({preventScroll:true});target?.scrollIntoView({block:'nearest'});
      } else {panel.scrollTop=0;body.querySelector('[data-course-focus]')?.focus({preventScroll:true});}
    }
  }
  function openLesson(id) {
    if(!allowed('theory',id)) return false;
    state.started[id]=true;trailReturn='[data-course-lesson="'+id+'"]';screen={kind:'learn',lessonId:id};return true;
  }
  function openPractice(id) {
    if(!allowed('practice',id)) return false;
    state.practiceStarted[id]=true;trailReturn='[data-course-practice="'+id+'"]';
    screen={kind:'practice',lessonId:id};return openQuestions('practice');
  }
  function openControl(id) {
    if(!allowed('control',id)) return false;
    state.controlStarted[id]=true;trailReturn='[data-course-control="'+id+'"]';screen={kind:'control',unitId:id};return true;
  }
  function openQuestions(kind) {
    const lesson=currentLesson(),id=lesson.id;
    if (kind==='check'&&!state.theoryRead[id]||kind==='practice'&&!allowed('practice',id)) return false;
    if (kind==='practice'&&lesson.writing) screen={kind:'writing',lessonId:id};
    else screen={kind,lessonId:id,...workFor(kind==='check'?state.checkWork:state.practiceWork,id,kind==='check'?lesson.theoryCheck:lesson.practice)};
    return true;
  }
  function openNote(id) {
    if(!state.theoryPassed[id]||!lessonById(id)) return;
    save();
    if (screen.kind!=='note') noteReturn={screen:{...screen},scroll:panel.scrollTop};
    screen={kind:'note',lessonId:id};if(compactNotes()) notesOpen=false;render(true,true);
  }
  function finishTheory() {
    const lesson=currentLesson(),id=lesson.id;
    if (!allAnswered(state.checkWork[id],lesson.theoryCheck,isCorrect)) return;
    state.theoryPassed[id]=true;save();
    archiving=true;panel.inert=true;
    const settle=()=>{
      archiveTimer=null;archiving=false;panel.inert=false;panel.classList.remove('course-archiving');
      flight?.remove();flight=null;
      if(root.dataset.section!=='path') return;
      flash=id;screen={kind:'theory-complete',lessonId:id};render(true,true);notes.classList.add('is-receiving');
    };
    if(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) settle();
    else {
      const target=(notes.querySelector('.course-notes-toggle')||notes).getBoundingClientRect(),sheet=panel.getBoundingClientRect(),bounds=root.getBoundingClientRect();
      flight=document.createElement('div');flight.className='course-filing-sheet';flight.setAttribute('aria-hidden','true');
      flight.style.setProperty('--file-left',(sheet.left-bounds.left)+'px');
      flight.style.setProperty('--file-top',(sheet.top-bounds.top)+'px');
      flight.style.setProperty('--file-width',sheet.width+'px');
      flight.style.setProperty('--file-height',sheet.height+'px');
      flight.style.setProperty('--file-x',(target.left+target.width/2-sheet.left-sheet.width/2)+'px');
      flight.style.setProperty('--file-y',(target.top+target.height/2-sheet.top-sheet.height/2)+'px');
      flight.innerHTML='<span>МОЙ КОНСПЕКТ</span><h2>'+escape(lesson.title)+'</h2><p>'+escape(lesson.rule)+'</p><i></i><i></i><i></i>';
      root.append(flight);panel.classList.remove('course-opening');panel.classList.add('course-archiving');
      archiveTimer=setTimeout(settle,800);
    }
  }
  function finishLesson(lesson) {
    state.done[lesson.id]=true;screen={kind:'complete',lessonId:lesson.id};
  }
  function showMap(focus=false) {save();cancelTransient();screen={kind:'route'};noteReturn=null;flash=null;render(focus);if(focus)panel.classList.add('course-map-return');}
  function leave() {save();cancelTransient();}
  listen(root,'study-exit',leave);
  function act(event) {
    const control=event.target.closest('[data-course],[data-course-lesson],[data-course-practice],[data-course-control]');
    if (!control||control.disabled||archiving||closingTimer!==null) return;
    const {course:action,courseLesson,coursePractice,courseControl}=control.dataset;
    if (screen.kind==='route') trailScroll=panel.scrollTop;
    save();clearTimeout(openingTimer);openingTimer=null;
    if (courseLesson||coursePractice||courseControl) {
      const kind=courseLesson?'theory':coursePractice?'practice':'control',id=courseLesson||coursePractice||courseControl;
      if(!allowed(kind,id)) return;
      const open=()=>{
        openingTimer=null;
        if(root.dataset.section!=='path') return;
        if(courseLesson) openLesson(id);else if(coursePractice)openPractice(id);else openControl(id);
        save();render(true,true);
      };
      if(!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {control.classList.add('is-opening');openingTimer=setTimeout(open,120);} else open();
      return;
    }
    if(action==='route') {closeSheet(()=>showMap(true));return;}
    if(action==='note-back') {
      if(!noteReturn) {showMap(true);return;}
      const previous=noteReturn;closeSheet(()=>{
        screen=previous.screen;noteReturn=null;render(false,true);panel.scrollTop=previous.scroll;
        body.querySelector('[data-course-focus]')?.focus({preventScroll:true});
      });return;
    }
    if(action?.startsWith('note-')) {openNote(action.slice(5));return;}
    if(action==='next') {
      const next=nextStep(course,state);
      if(next?.kind==='theory') openLesson(next.id);else if(next?.kind==='practice')openPractice(next.id);else if(next) openControl(next.id);else screen={kind:'mock'};
    } else if(action==='mock') {if(nextStep(course,state)) return;screen={kind:'mock'};}
    else if(action==='control-retry') {state.controlWork[screen.unitId]={};screen={kind:'control',unitId:screen.unitId};}
    else if(['theory','read','check','practice','question-next'].includes(action)) {
      const lesson=currentLesson();
      if(!lesson||screen.kind==='note'||!allowed('theory',lesson.id)) return;
      if(action==='theory'&&['practice','writing','complete'].includes(screen.kind)) {openNote(lesson.id);return;}
      if(action==='theory') screen={kind:'learn',lessonId:lesson.id};
      else if(action==='read') {state.theoryRead[lesson.id]=true;openQuestions('check');}
      else if(action==='practice') {if(!openPractice(lesson.id)) return;}
      else if(action==='check') {if(!openQuestions(action)) return;}
      else {
        if(!['check','practice'].includes(screen.kind)) return;
        const questions=questionSet();
        if(!screen.result||!isCorrect(questions[screen.step],screen.answer)) return;
        const store=workStore();
        store[lesson.id]={...store[lesson.id],answers:{...store[lesson.id]?.answers,[screen.step]:screen.answer}};
        if(screen.step+1===questions.length) {
          save();
          if(!allAnswered(store[lesson.id],questions,isCorrect)) return;
          if(screen.kind==='check') {finishTheory();return;}
          finishLesson(lesson);
        } else screen={kind:screen.kind,lessonId:lesson.id,step:screen.step+1,answer:'',result:false,attempts:0};
      }
    } else return;
    save();render(true);
  }
  listen(body,'click',act);
  listen(notes,'click',event=>{
    if(archiving||closingTimer!==null) return;
    const toggle=event.target.closest('.course-notes-toggle');
    if(toggle) {
      notesOpen=!notesOpen;notes.dataset.open=String(notesOpen);
      setDisclosureOpen(notes.querySelector('.study-rail-content'),notesOpen,{trigger:toggle});
      return;
    }
    const item=event.target.closest('[data-note]');
    if(item) openNote(item.dataset.note);
  });
  listen(body,'submit',event=>{
    const form=event.target,type=form.dataset.courseForm;
    if(!type) return;
    event.preventDefault();
    if(archiving||!form.checkValidity()) {form.reportValidity();return;}
    const data=new FormData(form);
    if(type==='question'&&['check','practice'].includes(screen.kind)) {
      if(!allowed(screen.kind==='practice'?'practice':'theory',screen.lessonId)) return;
      screen.answer=String(data.get('answer')||'');screen.result=true;screen.attempts=(screen.attempts||0)+1;
    } else if(type==='control'&&screen.kind==='control'&&allowed('control',screen.unitId)) {
      const rows=currentUnit().lessons.map((lesson,index)=>{const answer=String(data.get('q'+index)||'');return {lesson,answer,ok:isCorrect(lesson.checkpoint,answer)};});
      const correct=rows.filter(row=>row.ok).length,passed=correct>=Math.ceil(rows.length*.8);
      if(passed) state.controls[screen.unitId]=true;
      screen.report={correct,total:rows.length,rows,passed};
    } else if(type==='writing') {
      const isControl=screen.kind==='control',lesson=currentLesson();
      if(isControl?!allowed('control',screen.unitId):screen.kind!=='writing'||!state.theoryPassed[lesson?.id]) return;
      const task=isControl?currentUnit().writingCheckpoint:lesson.writing;
      const draft=String(data.get('draft')||'').trim(),id=isControl?'essay-control':lesson.id;
      const words=draft.match(/[А-Яа-яЁёA-Za-z0-9]+(?:[-’'][А-Яа-яЁёA-Za-z0-9]+)*/g)||[];
      if(!draft||task.minWords&&words.length<task.minWords) {
        form.elements.draft.setCustomValidity(task.minWords?'Для контрольного сочинения нужно не менее '+task.minWords+' слов. Сейчас: '+words.length+'.':'Добавь текст черновика.');
        form.elements.draft.reportValidity();return;
      }
      state.drafts[id]=draft;
      if(isControl) {state.controls[screen.unitId]=true;screen={kind:'mock'};}else finishLesson(lesson);
    } else return;
    save();render(type!=='question');
    if(type==='question') {const target=body.querySelector('.course-feedback');target?.setAttribute('tabindex','-1');target?.focus({preventScroll:true});}
  });
  function rememberInput(event) {
    const input=event.target;
    if(input.hasAttribute?.('data-word-search')) {filterDictionary(input,body);enhanceControls(body);return;}
    if(input.dataset.courseDraft) {input.setCustomValidity('');state.drafts[input.dataset.courseDraft]=input.value;}
    else if(input.dataset.writingCheck!==undefined) {
      const id=input.dataset.writingId;state.writingChecks[id]={...state.writingChecks[id],[input.dataset.writingCheck]:input.checked};
    } else if(['check','practice'].includes(screen.kind)&&input.name==='answer') {
      screen.answer=input.value;screen.result=false;
    } else if(screen.kind==='control'&&/^q\d+$/.test(input.name||'')) state.controlWork[screen.unitId]={...state.controlWork[screen.unitId],[input.name]:input.value};
    else if(input.dataset.courseMock!==undefined) state.mocks[input.dataset.courseMock]=input.checked;
    else return;
    save();
  }
  listen(body,'input',rememberInput);listen(body,'change',rememberInput);
  listen(globalThis,'pagehide',save);
  return {render,showMap,leave,getContext(){return {section:'path',...(screen.lessonId?{lessonId:screen.lessonId}:{})};},destroy(){if(destroyed)return;leave();destroyed=true;listeners.abort();notes.remove();},mountStyles() {
    return Promise.all(['./path-workspace71.css','./route-map72.css','./course73.css','./course74-map.css','./course78.css','./course79.css','./course80.css','./course81.css'].map(href=>new Promise(resolve=>{
      const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href=href;sheet.onload=sheet.onerror=resolve;document.head.append(sheet);
    })));
  }};
}

