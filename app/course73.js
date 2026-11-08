import {course, isCorrect, mockPlan, methodLinks} from './course73-data.js';
import {examSource} from './route-map72-data.js';
import {courseMap} from './course74-map.js';
import {icon} from './ui-study56-icons.js';

const storageKey = 'kunilingo.russian.course73';
const lessons = course.flatMap(unit => unit.lessons);
const cleanMap = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function createCourse({body, heading}) {
  let saved;
  try { saved = JSON.parse(localStorage.getItem(storageKey)); } catch {}
  saved = cleanMap(saved);
  const done = cleanMap(saved.done), controls = cleanMap(saved.controls);
  const drafts = cleanMap(saved.drafts), reviews = cleanMap(saved.reviews), mocks = cleanMap(saved.mocks);
  const started = cleanMap(saved.started), controlStarted = cleanMap(saved.controlStarted);
  const lessonSteps = cleanMap(saved.lessonSteps), lessonWork = cleanMap(saved.lessonWork);
  const controlWork = cleanMap(saved.controlWork), writingChecks = cleanMap(saved.writingChecks);
  for (const lesson of lessons) {
    if (!done[lesson.id] && typeof drafts[lesson.id] === 'string' && drafts[lesson.id].trim()) started[lesson.id] = true;
  }
  if (!controls.essay && typeof drafts['essay-control'] === 'string' && drafts['essay-control'].trim()) controlStarted.essay = true;
  let screen = {kind:'route'}, unitId = course[0].id;
  let storageFailed = false, trailScroll = 0, trailReturn = null, opening = null;
  const panel = heading.closest?.('.study-panel');
  const root = body.closest?.('#room') || panel?.closest?.('#room');
  const selectedUnit = () => course.find(unit=>unit.id===unitId);
  const selectedLesson = () => selectedUnit().lessons.find(lesson=>lesson.id===screen.lessonId);
  const nextUnit = () => course.find(unit=>!controls[unit.id] || unit.lessons.some(lesson=>!done[lesson.id]));
  const intro = (label,title,subtitle='') => `<span class="map-label">${label}</span><h2 data-course-focus tabindex="-1">${title}</h2>${subtitle?`<p>${subtitle}</p>`:''}`;
  const button = (action,label,cls='course-primary') => `<button type="button" data-course="${action}" class="${cls}">${label}</button>`;
  const controlSet = () => {
    const unit = selectedUnit(), old = course[course.indexOf(unit)-1];
    return [...unit.lessons,...(old?.kind==='skills'?[old.lessons.at(-1)]:[])];
  };

  function rememberWork() {
    if (screen.kind==='drill') {
      const {step,answer,result,attempts} = screen;
      lessonWork[screen.lessonId] = {step,answer,result,attempts};
      if (!done[screen.lessonId]) lessonSteps[screen.lessonId] = step;
    }
  }
  function save() {
    rememberWork();
    try {
      localStorage.setItem(storageKey, JSON.stringify({...saved,done,controls,drafts,reviews,mocks,started,controlStarted,lessonSteps,lessonWork,controlWork,writingChecks,unitId}));
      storageFailed = false;
    } catch { storageFailed = true; }
  }
  function fields(question,name,value='') {
    if (!question.options) return `<label class="course-input">Ответ<input name="${name}" autocomplete="off" value="${escape(value)}" required></label>`;
    return `<div class="course-options">${question.options.map(option=>`<label><input type="radio" name="${name}" value="${escape(option)}" ${value===option?'checked':''} required><span>${escape(option)}</span></label>`).join('')}</div>`;
  }
  function theory(lesson) {
    return `<div class="course-reading"><section><h3>Правило</h3><p>${lesson.rule}</p></section>
      <section class="course-example"><h3>Разберём пример</h3><p>${lesson.example}</p></section>
      <aside class="course-trap"><h3>На что обратить внимание</h3><p>${lesson.trap}</p></aside></div>`;
  }
  function writer(task,id) {
    const checks = cleanMap(writingChecks[id]);
    return `<form data-course-form="writing" data-writing-id="${id}" class="course-form">
      <details class="course-reading-text" open><summary>Исходный текст</summary><p>${task.text}</p></details>
      <p><strong>Вопрос</strong> · ${task.problem}</p><p>${task.prompt}</p>
      <label class="course-input">Твой черновик<textarea name="draft" data-course-draft="${id}" rows="7" required>${escape(drafts[id])}</textarea></label>
      <fieldset class="course-rubric"><legend>Проверь свою работу</legend>
        ${task.criteria.map((item,index)=>`<label><input type="checkbox" data-writing-check="${index}" data-writing-id="${id}" ${checks[index]?'checked':''} required> ${item}</label>`).join('')}
      </fieldset>
      <button class="course-primary" type="submit">Завершить самопроверку</button>
    </form>`;
  }
  function lessonScreen() {
    const lesson = selectedLesson();
    if (screen.kind==='learn') {
      const resume = lesson.writing ? Boolean(drafts[lesson.id]) : Boolean(lessonWork[lesson.id] || lessonSteps[lesson.id]!==undefined);
      return `${intro('ТЕОРИЯ',lesson.title,lesson.goal)}${theory(lesson)}
        ${button('practice',resume?'Продолжить упражнение':'К упражнениям')}`;
    }
    if (screen.kind==='writing') return intro('УПРАЖНЕНИЕ',lesson.title,lesson.goal)+writer(lesson.writing,lesson.id);
    if (screen.kind==='complete') return `<div class="course-complete">${icon('check')}${intro('УРОК ПРОЙДЕН',lesson.title,'Ты разобрал теорию и выполнил упражнения.')}${button('route','Вернуться к карте')}</div>`;
    const item = lesson.drills[screen.step];
    const correct = screen.result && isCorrect(item,screen.answer);
    return `${intro('УПРАЖНЕНИЕ '+(screen.step+1)+' ИЗ '+lesson.drills.length,lesson.title,screen.step===0?'Начни с опорой на правило.':'Теперь попробуй самостоятельно.')}
      <form data-course-form="drill" class="course-form">
        <fieldset ${correct?'disabled':''}><legend>${item.prompt}</legend>${fields(item,'answer',screen.answer)}</fieldset>
        <div role="status">${screen.result ? `<div class="course-feedback ${correct?'':'is-miss'}"><strong>${correct?'Верно':'Попробуй ещё раз'}</strong>
          <p>${correct ? item.feedback : screen.attempts>=2 ? item.feedback : lesson.trap}</p>
          ${!correct&&screen.attempts>=2?`<p>Ответ для разбора: ${escape(item.expected)}.</p>`:''}</div>`:''}</div>
        ${correct?button('drill-next',screen.step+1===lesson.drills.length?'Завершить урок':'Следующее упражнение'):'<button type="submit" class="course-primary">Проверить ответ</button>'}
      </form>`;
  }
  function controlScreen() {
    const unit = selectedUnit();
    if (unit.kind==='writing') return intro('КОНТРОЛЬНАЯ','Сочинение на новом тексте',unit.title)+writer(unit.writingCheckpoint,'essay-control');
    if (screen.report) {
      const {correct,total,rows,passed} = screen.report;
      return `${intro('РЕЗУЛЬТАТ',passed?'Контрольная пройдена':'Нужно повторить',correct+' из '+total+' верно')}
        <ol class="course-report">${rows.map(({lesson,answer,ok})=>`<li class="${ok?'':'is-miss'}"><strong>${ok?'✓':'↻'} ${lesson.title}</strong>
          <p>${lesson.checkpoint.prompt}</p><p>Твой ответ: ${escape(answer)}. Верный ответ: ${escape(lesson.checkpoint.expected)}.</p>
          <p>${lesson.checkpoint.feedback || lesson.rule}</p>${ok?'':button('review-'+lesson.id,'Разобрать теорию','course-secondary')}</li>`).join('')}</ol>
        ${button('route','К карте')} ${button('control-start','Повторить контрольную','course-secondary')}`;
    }
    const set = controlSet(), answers = cleanMap(controlWork[unit.id]);
    return `${intro('КОНТРОЛЬНАЯ',unit.title,'Проверь, как усвоен раздел. После сдачи появится разбор ответов.')}
      <p>Для прохождения нужно решить ${Math.ceil(set.length*.8)} из ${set.length} заданий.</p>
      <form data-course-form="control" class="course-form">${set.map((lesson,index)=>`<fieldset><legend>${index+1}. ${lesson.checkpoint.prompt}</legend>${fields(lesson.checkpoint,'q'+index,answers['q'+index])}</fieldset>`).join('')}
      <button class="course-primary" type="submit">Проверить контрольную</button></form>`;
  }
  function finish() {
    const links = {...examSource,...methodLinks};
    return `${intro('ЗАВЕРШЕНИЕ ПУТИ','Пробный экзамен','Пройди полный вариант и разбери ошибки.')}
      <ol class="course-report">${mockPlan.map((item,index)=>`<li><h3>${item.title}</h3><p>${item.detail}</p>
        <a class="map-source" href="${links[item.link]}" target="_blank" rel="noopener">Открыть материалы ФИПИ ↗</a>
        <label class="course-mock-check"><input type="checkbox" data-course-mock="${index}" ${mocks[index]?'checked':''}> Сделано</label></li>`).join('')}</ol>`;
  }
  function render(focus=false) {
    const onMap = screen.kind==='route';
    const inLesson = ['learn','drill','writing','complete'].includes(screen.kind);
    const lesson = inLesson ? selectedLesson() : null;
    heading.textContent = onMap ? 'Твой путь' : lesson?.title || (screen.kind==='control'?'Контрольная':'Пробный экзамен');
    if (onMap) {
      body.innerHTML = `<div class="route-map course course-map-view">
        <div class="map-intro"><p>Русский язык · ЕГЭ 2027</p></div>
        ${courseMap({course,done,started,controls,controlStarted,nextUnit:nextUnit()})}
        <footer class="map-footer"><details><summary>О программе</summary><p>Прогресс сохраняется на этом устройстве.</p>
          <a href="${examSource.url}" target="_blank" rel="noopener">Материалы ФИПИ · 2027 ↗</a>
        </details></footer>${storageFailed?'<p class="course-save-warning">Не удалось сохранить прогресс на устройстве.</p>':''}</div>`;
    } else {
      const context = inLesson ? selectedUnit().title+' · Урок '+(selectedUnit().lessons.indexOf(lesson)+1)+' из '+selectedUnit().lessons.length :
        screen.kind==='control'?selectedUnit().title:'Завершение пути';
      body.innerHTML = `<div class="route-map course course-lesson-view">
        <nav class="course-nav" aria-label="Навигация занятия">
          ${button('route',icon('back')+'<span>К карте</span>','course-map-back')}
          <span class="course-nav-context">${context}</span>
          ${['drill','writing'].includes(screen.kind)?button('theory','К теории','course-theory-back'):''}
        </nav>
        <div class="course-page">${inLesson?lessonScreen():screen.kind==='control'?controlScreen():finish()}</div>
        ${storageFailed?'<p class="course-save-warning">Не удалось сохранить прогресс на устройстве.</p>':''}</div>`;
    }
    if (onMap && panel) panel.scrollTop = trailScroll;
    if (focus && onMap) {
      const stop = trailReturn && body.querySelector(trailReturn);
      if (stop) { stop.focus({preventScroll:true}); stop.scrollIntoView({block:'nearest'}); }
      else heading.focus?.({preventScroll:true});
    }
    if (focus && !onMap) {
      if (panel) panel.scrollTop = 0;
      body.querySelector('[data-course-focus]')?.focus({preventScroll:true});
    }
  }
  function openLesson(id) {
    unitId = course.find(unit=>unit.lessons.some(lesson=>lesson.id===id)).id;
    started[id] = true; trailReturn = `[data-course-lesson="${id}"]`;
    screen = {kind:'learn',lessonId:id};
  }
  function openControl(id) {
    unitId=id; controlStarted[id]=true; trailReturn=`[data-course-control="${id}"]`; screen={kind:'control'};
  }
  function finishLesson(lesson) {
    done[lesson.id]=true; delete lessonSteps[lesson.id]; delete lessonWork[lesson.id];
    if (lesson.drills && !reviews[lesson.id]) reviews[lesson.id]={round:0,at:Date.now()+86400000};
    screen={kind:'complete',lessonId:lesson.id};
  }
  function showMap(focus=false) {
    if (opening!==null) { clearTimeout(opening); opening=null; }
    save(); screen={kind:'route'}; render(focus);
  }
  body.addEventListener('click',event=>{
    const control=event.target.closest('[data-course], [data-course-lesson], [data-course-control]');
    if (!control) return;
    const {course:action,courseControl,courseLesson}=control.dataset;
    if (opening!==null) {
      if (control.classList?.contains('is-opening')) return;
      clearTimeout(opening); opening=null; body.querySelector('.is-opening')?.classList.remove('is-opening');
    }
    save();
    if (screen.kind==='route' && panel) trailScroll=panel.scrollTop;
    if ((courseLesson || courseControl) && control.classList?.contains('trail-stop') && !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      control.classList.add('is-opening');
      opening=setTimeout(()=>{
        opening=null;
        if (!control.isConnected || panel?.hidden || (root?.dataset?.section && root.dataset.section!=='path')) { control.classList.remove('is-opening'); return; }
        if (courseLesson) openLesson(courseLesson); else openControl(courseControl);
        save(); render(true);
      },250);
      return;
    }
    if (courseLesson) openLesson(courseLesson);
    else if (courseControl) openControl(courseControl);
    else if (action==='route' || action==='mock') screen={kind:action};
    else if (action==='control-start') { controlWork[unitId]={}; openControl(unitId); }
    else if (action==='practice') {
      const lesson=selectedLesson(), id=lesson.id;
      if (lesson.writing) screen={kind:'writing',lessonId:id};
      else {
        const work=cleanMap(lessonWork[id]);
        const candidate=work.step ?? lessonSteps[id] ?? 0;
        const step=Number.isInteger(candidate)&&lesson.drills[candidate]?candidate:0;
        screen={kind:'drill',lessonId:id,step,answer:typeof work.answer==='string'?work.answer:'',result:work.result===true,attempts:Number(work.attempts)||0};
      }
    } else if (action==='theory') openLesson(screen.lessonId);
    else if (action==='drill-next') {
      const lesson=selectedLesson();
      if (!screen.result || !isCorrect(lesson.drills[screen.step],screen.answer)) return;
      if (screen.step+1===lesson.drills.length) finishLesson(lesson);
      else screen={kind:'drill',lessonId:lesson.id,step:screen.step+1};
    } else if (action?.startsWith('review-')) openLesson(action.slice(7));
    save(); render(true);
  });
  body.addEventListener('submit',event=>{
    const form=event.target, type=form.dataset.courseForm;
    if (!type) return;
    event.preventDefault();
    const data=new FormData(form);
    if (type==='drill') {
      screen.answer=data.get('answer'); screen.result=true; screen.attempts=(screen.attempts||0)+1;
    } else if (type==='control') {
      const rows=controlSet().map((lesson,index)=>{const answer=data.get('q'+index); return {lesson,answer,ok:isCorrect(lesson.checkpoint,answer)};});
      const correct=rows.filter(row=>row.ok).length, passed=correct>=Math.ceil(rows.length*.8);
      if (passed) controls[unitId]=true;
      screen.report={correct,rows,passed,total:rows.length};
    } else if (type==='writing') {
      const draft=data.get('draft');
      if (!draft?.trim()) { form.elements.draft.setCustomValidity('Добавь текст черновика.'); form.elements.draft.reportValidity(); return; }
      if (screen.kind==='control') { drafts['essay-control']=draft; controls.essay=true; screen={kind:'route'}; }
      else { const lesson=selectedLesson(); drafts[lesson.id]=draft; finishLesson(lesson); }
    }
    save(); render(type!=='drill');
    if (type==='drill') {
      const target=body.querySelector('.course-feedback');
      target?.setAttribute('tabindex','-1'); target?.focus();
    }
  });
  function rememberInput(event) {
    const input=event.target;
    if (input.dataset.courseDraft) {
      input.setCustomValidity(''); drafts[input.dataset.courseDraft]=input.value;
    } else if (input.dataset.writingCheck!==undefined) {
      const id=input.dataset.writingId;
      writingChecks[id]={...cleanMap(writingChecks[id]),[input.dataset.writingCheck]:input.checked};
    } else if (screen.kind==='drill' && input.name==='answer') {
      screen.answer=input.value; screen.result=false;
    } else if (screen.kind==='control' && /^q\d+$/.test(input.name||'')) {
      controlWork[unitId]={...cleanMap(controlWork[unitId]),[input.name]:input.value};
    } else if (input.dataset.courseMock!==undefined) mocks[input.dataset.courseMock]=input.checked;
    else return;
    save();
  }
  body.addEventListener('input',rememberInput);
  body.addEventListener('change',rememberInput);
  return {render,showMap,mountStyles() {
    return Promise.all(['./path-workspace71.css','./route-map72.css','./course73.css','./course74-map.css'].map(href => new Promise(resolve => {
      const sheet=document.createElement('link');
      sheet.rel='stylesheet'; sheet.href=href;
      sheet.onload=sheet.onerror=resolve;
      document.head.append(sheet);
    })));
  }};
}
