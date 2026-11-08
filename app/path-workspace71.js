import {icon} from './ui-study56-icons.js';
import {topics, stepLabels, storageKey, restorePath, topicProgress, completedSteps, advancePath} from './path-content71.js';

const escape = text => String(text).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));

export function createPathWorkspace({body, heading, onBack}) {
  const sheet = document.createElement('link');
  sheet.rel = 'stylesheet';
  sheet.href = './path-workspace71.css';
  let state;
  try { state = restorePath(JSON.parse(localStorage.getItem(storageKey))); } catch { state = restorePath(); }
  let filter = 'Все темы';
  let saveFailed = false;

  function revealSelected() {
    const list = body.querySelector('.path-topic-list');
    const selected = body.querySelector('.path-topic.is-selected');
    if (list && selected && list.scrollWidth > list.clientWidth) {
      list.scrollLeft = Math.max(0, selected.getBoundingClientRect().left - list.getBoundingClientRect().left + list.scrollLeft - 8);
    }
  }
  // Initial render precedes stylesheet loading; keep the active topic visible
  // after styles arrive and when the workspace changes between breakpoints.
  sheet.addEventListener('load', revealSelected);
  new ResizeObserver(revealSelected).observe(body);

  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); saveFailed = false; }
    catch { saveFailed = true; }
  }

  function topicList() {
    return topics.filter(topic => filter === 'Все темы' || topic.group === filter).map(topic => {
      const index = topics.indexOf(topic), progress = topicProgress(state, topic.id);
      const selected = state.selected === topic.id;
      const status = progress.completed ? 'Пройдено' : progress.stage ? `${progress.stage} из 3 шагов` : `3 шага · ${topic.time}`;
      return `<li><button type="button" class="path-topic ${selected ? 'is-selected' : ''} ${progress.completed ? 'is-complete' : ''}"
        data-path-topic="${topic.id}" aria-pressed="${selected}">
        <span class="path-node">${progress.stage === 3 ? icon('check') : String(index + 1).padStart(2,'0')}</span>
        <span class="path-topic-copy"><strong>${topic.title}</strong><small>${status}</small></span>
        ${selected ? icon('forward', 'path-topic-arrow') : ''}</button></li>`;
    }).join('');
  }

  function primary(action, text, disabled = false) {
    return `<button type="button" class="path-primary" data-path-action="${action}" ${disabled ? 'disabled' : ''}>${text}${icon('forward')}</button>`;
  }

  function overview(topic, progress) {
    return `<div class="path-topic-heading"><span class="path-kicker">ТЕМА ${String(topics.indexOf(topic)+1).padStart(2,'0')} · ${topic.group}</span>
      <h2 id="pathDetailTitle" tabindex="-1">${topic.title}</h2><p>${topic.description}</p></div>
      <ol class="path-steps">${stepLabels.map((label,index) => `<li><span class="path-step-icon ${progress.stage > index ? 'is-done' : ''}">${progress.stage > index ? icon('check') : icon(['practice','path','check'][index])}</span><span><strong>${label}</strong><small>${['Небольшое правило и самое важное','Посмотрим, как работает правило','Одно задание с объяснением'][index]}</small></span>${progress.stage > index ? '<span class="path-step-done">Готово</span>' : ''}</li>`).join('')}</ol>
      <div class="path-detail-bottom"><span class="path-duration">${icon('timeline')}${topic.time} в спокойном темпе</span>
      ${primary('start', progress.stage === 3 ? 'Пройти ещё раз' : progress.stage ? 'Продолжить тему' : 'Начать тему')}</div>`;
  }

  function lesson(topic, progress) {
    const step = Math.min(progress.stage, 2);
    const stepper = `<div class="path-lesson-top"><button type="button" class="path-text-button" data-path-action="overview">${icon('back')}К теме</button><span>Шаг ${step+1} из 3</span></div>
      <div class="path-stepper" aria-label="Шаг ${step+1} из 3">${stepLabels.map((label,index)=>`<i class="${index <= step ? 'is-active' : ''}" title="${label}"></i>`).join('')}</div>
      <span class="path-kicker">${topic.title}</span><h2 id="pathDetailTitle" tabindex="-1">${stepLabels[step]}</h2>`;
    if (step === 0) return stepper + `<p class="path-rule">${topic.rule}</p><ul class="path-rule-list">${topic.points.map(point=>`<li>${point}</li>`).join('')}</ul><div class="path-detail-bottom">${primary('next','К примеру')}</div>`;
    if (step === 1) return stepper + `<p>Прочитай предложение и посмотри на разбор.</p><blockquote class="path-example">${topic.example}</blockquote><p class="path-explanation">${topic.explanation}</p><div class="path-detail-bottom">${primary('next','Проверить себя')}</div>`;
    const correct = progress.checked && progress.choice === topic.answer;
    return stepper + `<p>${topic.question}</p><blockquote class="path-example">${topic.sentence}</blockquote>
      <div class="path-choices" role="group" aria-label="Выбери ответ">${topic.choices.map((choice,index)=>`<button type="button" data-path-choice="${index}" aria-pressed="${progress.choice === index}" ${correct ? 'disabled' : ''}>${escape(choice)}</button>`).join('')}</div>
      <div class="path-feedback ${progress.checked ? (correct ? 'is-correct' : 'is-hint') : ''}" role="status">${progress.checked ? `<strong>${correct ? 'Всё верно' : 'Давай разберёмся'}</strong><p>${correct ? topic.correct : topic.hint}</p>` : ''}</div>
      <div class="path-detail-bottom">${correct ? primary('next','Завершить тему') : primary('check','Проверить',progress.choice === null || progress.checked)}</div>`;
  }

  function done(topic) {
    const next = topics[topics.indexOf(topic)+1];
    return `<div class="path-completion-mark">${icon('check')}</div><span class="path-kicker">ЕЩЁ ОДИН ШАГ ПОЗАДИ</span>
      <h2 id="pathDetailTitle" tabindex="-1">Тема пройдена</h2><p>Все три шага темы «${topic.title.toLowerCase()}» завершены: правило, пример и задание.</p>
      <div class="path-completion-summary"><strong>3 из 3</strong><span>шагов пройдено</span></div>
      <div class="path-detail-bottom">${next ? `<p class="path-next-label">Дальше — ${next.title.toLowerCase()}</p>${primary('continue','К следующей теме')}` : `<p class="path-next-label">Все четыре темы этого маршрута пройдены. К любой можно вернуться.</p>${primary('overview','Вернуться к теме')}`}</div>`;
  }

  function render(focus = false) {
    const topic = topics.find(topic => topic.id === state.selected), progress = topicProgress(state);
    const completed = completedSteps(state), total = topics.length * 3;
    heading.textContent = 'Твой путь';
    body.innerHTML = `<div class="path-intro"><p>Один урок за раз. В своём темпе.</p><div class="path-total"><span><strong>${completed}</strong> / ${total} шагов</span><div class="path-total-track" role="progressbar" aria-label="Пройдено шагов" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${completed}"><i style="width:${completed/total*100}%"></i></div></div></div>
      <div class="path-layout"><nav class="path-route" aria-label="Темы учебного пути"><div class="path-route-heading"><span class="path-kicker">МАРШРУТ</span><span>4 темы</span></div>
      <div class="path-filters" role="group" aria-label="Фильтр тем">${['Все темы','Основы','Пунктуация'].map(name=>`<button type="button" data-path-filter="${name}" aria-pressed="${filter===name}">${name}</button>`).join('')}</div>
      <ol class="path-topic-list">${topicList()}</ol>
      <div class="path-route-note">${icon('replay')}<p>Можно идти по порядку<br>или выбрать нужную тему.</p></div></nav>
      <section class="path-detail" aria-labelledby="pathDetailTitle">${state.mode === 'lesson' ? lesson(topic,progress) : state.mode === 'done' ? done(topic) : overview(topic,progress)}</section></div>
      <div class="path-workspace-footer"><span>${saveFailed ? 'Сохранение недоступно. Прогресс останется до закрытия страницы.' : 'Твой прогресс сохраняется на этом устройстве.'}</span><span>Учебный маршрут · Синтаксис и пунктуация</span></div>`;
    if (onBack) body.querySelector('.path-intro').insertAdjacentHTML('afterbegin', `<button type="button" class="path-text-button" data-path-map>${icon('back')} К карте</button>`);
    revealSelected();
    if (focus) body.querySelector('#pathDetailTitle')?.focus({preventScroll: true});
  }

  body.addEventListener('click', event => {
    if (event.target.closest('[data-path-map]')) { onBack?.(); return; }
    const button = event.target.closest('[data-path-topic], [data-path-filter], [data-path-action], [data-path-choice]');
    if (!button) return;
    let focus = true;
    if (button.dataset.pathFilter) {
      filter = button.dataset.pathFilter;
      // Keep the visible list and detail in sync when a filter hides this topic.
      if (filter !== 'Все темы' && topics.find(topic=>topic.id===state.selected).group !== filter) {
        state.selected = topics.find(topic=>topic.group===filter).id; state.mode = 'overview';
      }
      focus = false;
    } else if (button.dataset.pathTopic) {
      state.selected = button.dataset.pathTopic; state.mode = 'overview';
    } else if (button.hasAttribute('data-path-choice')) {
      const progress = {...topicProgress(state)};
      if (progress.stage === 2 && !(progress.checked && progress.choice === topics.find(topic=>topic.id===state.selected).answer)) {
        progress.choice = Number(button.dataset.pathChoice); progress.checked = false;
        state.progress[state.selected] = progress;
      }
      focus = false;
    } else {
      const action = button.dataset.pathAction;
      if (action === 'start') {
        if (topicProgress(state).stage === 3) state.progress[state.selected] = {stage:0,choice:null,checked:false,completed:true};
        state.mode = 'lesson';
      }
      if (action === 'overview') state.mode = 'overview';
      if (action === 'next') advancePath(state);
      if (action === 'check') {
        const progress = {...topicProgress(state)};
        if (progress.choice !== null) { progress.checked = true; state.progress[state.selected] = progress; }
        focus = false;
      }
      if (action === 'continue') {
        const next = topics[topics.findIndex(topic=>topic.id===state.selected)+1];
        if (next) { state.selected = next.id; state.mode = 'overview'; filter = 'Все темы'; }
      }
    }
    save(); render(focus);
    if (!focus) {
      // Replacing the content must not drop keyboard focus back to the page.
      const selector = button.hasAttribute('data-path-choice') ? `[data-path-choice="${button.dataset.pathChoice}"]`
        : button.dataset.pathFilter ? `[data-path-filter="${button.dataset.pathFilter}"]` : '[data-path-action="check"]';
      const target = body.querySelector(selector);
      if (target && !target.disabled) target.focus({preventScroll:true});
      else {
        const feedback = body.querySelector('.path-feedback strong');
        feedback?.setAttribute('tabindex','-1');
        feedback?.focus({preventScroll:true});
      }
    }
  });
  return {
    render,
    openTopic(id) {
      if (state.selected !== id) { state.selected = id; state.mode = 'overview'; }
      filter = 'Все темы';
      save();
      render(true);
    },
    mountStyles() { document.head.append(sheet); }
  };
}
