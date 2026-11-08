import {icon} from './ui-study56-icons.js';
import {topics} from './path-content71.js';
import {examSource, examTasks, routeStages, routeTo} from './route-map72-data.js';

const phases = [
  ['foundation', 'I', 'Старт с нуля', 'Сначала учимся разбирать слова и предложения.'],
  ['core', 'II', 'Задания ЕГЭ', 'Затем осваиваем правила и применяем их в формате экзамена.'],
  ['finish', 'III', 'Выход на экзамен', 'Пишем сочинение, решаем варианты и разбираем ошибки.']
];
const targetOptions = [
  ['norms', 'Языковые нормы'],
  ['spacing', 'Орфография'],
  ['complex', 'Пунктуация'],
  ['expression', 'Работа с текстом'],
  ['essay', 'Сочинение']
];
const priorityKey = 'kunilingo.russian.2027.priorities';

export function createRouteMap({body, heading, lessons}) {
  let mode = 'map';
  let selectedStage = null;
  let selectedNumber = 1;
  let inLesson = false;
  let priorities = [];
  try {
    const saved = JSON.parse(localStorage.getItem(priorityKey));
    if (Array.isArray(saved)) priorities = targetOptions.map(([id]) => id).filter(id => saved.includes(id));
  } catch {}
  const byId = id => routeStages.find(stage => stage.id === id);

  function card(stage, position = routeStages.indexOf(stage) + 1) {
    const numbers = stage.tasks.length ? '№ ' + stage.tasks.join(' · ') : stage.phase === 'foundation' ? 'Школьная база' : 'Полный вариант';
    return `<li><button type="button" class="map-stop" data-map-stage="${stage.id}">
      <span class="map-marker">${String(position).padStart(2,'0')}</span>
      <span><strong>${stage.title}</strong><small>${numbers}</small></span>
      ${icon('forward')}</button></li>`;
  }

  function overview() {
    return `<div class="map-phases">${phases.map(([id, numeral, title, description]) =>
      `<section class="map-phase" data-phase="${id}">
        <div class="map-phase-head"><span class="map-phase-index">${numeral}</span><h2>${title}</h2><p>${description}</p></div>
        <ol>${routeStages.filter(stage => stage.phase === id).map(card).join('')}</ol>
      </section>`).join('')}</div>`;
  }

  function stageDetail(stage) {
    const next = routeStages[routeStages.indexOf(stage) + 1];
    return `<section class="map-sheet">
      <button type="button" class="path-text-button" data-map-back>${icon('back')} К маршруту</button>
      <span class="map-label">ЭТАП ${routeStages.indexOf(stage)+1} ИЗ ${routeStages.length}</span>
      <h2 tabindex="-1" data-map-focus>${stage.title}</h2>
      <p>${stage.subtitle}</p>
      <div class="map-sheet-grid">
        <div><h3>Что изучить</h3><ul class="map-topics">${stage.topics.map(topic => `<li>${topic}</li>`).join('')}</ul>
        <aside class="map-check"><strong>Контрольная точка</strong><p>${stage.checkpoint}</p></aside></div>
        <div>
          ${stage.tasks.length ? `<h3>Номера ЕГЭ</h3><div class="map-number-links">${stage.tasks.map(n=>`<button type="button" data-map-number="${n}">№ ${n}</button>`).join('')}</div>` : ''}
          ${stage.prerequisites.length ? `<h3>Что пройти сначала</h3><ul class="map-link-list">${stage.prerequisites.map(id=>`<li><button type="button" data-map-stage="${id}">${byId(id).title}</button></li>`).join('')}</ul>` : ''}
          ${stage.practiceIds.length ? `<h3>Доступные мини-уроки</h3><ul class="map-link-list">${stage.practiceIds.map(id=>`<li><button type="button" data-map-lesson="${id}">${topics.find(topic=>topic.id===id).title}</button></li>`).join('')}</ul>` : ''}
          ${stage.phase === 'finish' ? `<a class="map-source" href="${examSource.archive}" target="_blank" rel="noopener">Скачать демоверсию и критерии ФИПИ ↗</a>` : ''}
        </div>
      </div>
      ${next ? `<button type="button" class="map-advance" data-map-stage="${next.id}">Следующий этап · ${next.title}${icon('forward')}</button>` : ''}
    </section>`;
  }

  function numberIndex() {
    const task = examTasks.find(item => item.number === selectedNumber);
    return `<section class="map-sheet"><span class="map-label">УКАЗАТЕЛЬ</span><h2 tabindex="-1" data-map-focus>Все задания ЕГЭ</h2>
      <div class="map-number-grid" role="group" aria-label="Номер задания">${examTasks.map(({number,title}) => `
        <button type="button" data-map-number="${number}" aria-label="№ ${number}. ${title}" aria-pressed="${number===selectedNumber}">${number}</button>`).join('')}</div>
      <article class="map-task-card"><span class="map-label">${task.number === 27 ? 'ЧАСТЬ 2 · РАЗВЁРНУТЫЙ ОТВЕТ' : 'ЧАСТЬ 1 · КРАТКИЙ ОТВЕТ'}</span>
        <h3>№ ${task.number} · ${task.title}</h3><p>${task.skill}</p>
        <button type="button" class="map-advance" data-map-stage="${task.stageId}">К этапу «${byId(task.stageId).title}» ${icon('forward')}</button></article>
      <a class="map-source" href="${examSource.bank}" target="_blank" rel="noopener">Открытый банк заданий ФИПИ ↗</a>
    </section>`;
  }

  function personal() {
    const ordered = routeTo(priorities);
    return `<section class="map-sheet"><span class="map-label">ЛИЧНЫЙ ПЛАН</span><h2 tabindex="-1" data-map-focus>С чего начать тебе</h2>
      <p>Отметь, чему хочешь уделить внимание в первую очередь. Нужная база появится перед выбранными темами, остальные этапы останутся в плане.</p>
      <fieldset class="map-priority"><legend>Что сейчас важнее</legend>${targetOptions.map(([id,title]) =>
        `<label><input type="checkbox" data-map-priority="${id}" ${priorities.includes(id)?'checked':''}><span>${title}</span></label>`).join('')}</fieldset>
      <p class="map-plan-note">Порядок строится по твоему выбору. Оценку уровня можно будет добавить после диагностики по навыкам.</p>
      <h3>${priorities.length?'Твой порядок занятий':'Порядок для старта с нуля'}</h3><ol class="map-personal-list">${ordered.map((stage,index)=>card(stage,index+1)).join('')}</ol>
    </section>`;
  }

  function render(focus) {
    if (inLesson) { lessons.render(); return; }
    heading.textContent = 'Карта подготовки';
    const content = selectedStage ? stageDetail(byId(selectedStage)) : mode === 'numbers' ? numberIndex() : mode === 'personal' ? personal() : overview();
    body.innerHTML = `<div class="route-map">
      <div class="map-intro"><p>Русский язык · ЕГЭ 2027</p><a href="${examSource.url}" target="_blank" rel="noopener">${examSource.label} ↗</a></div>
      <div class="map-toolbar"><nav class="map-switch" aria-label="Вид плана">
        ${[['map','Маршрут с нуля'],['numbers','Задания 1–27'],['personal','Мой план']].map(([id,title])=>`<button type="button" data-map-mode="${id}" aria-pressed="${mode===id}">${title}</button>`).join('')}
        </nav><span>12 этапов · 27 заданий</span></div>
      ${content}
      <footer class="map-footer"><span>На карте собран план подготовки. Готовые мини-уроки отмечены внутри этапов.</span><a href="${examSource.archive}" target="_blank" rel="noopener">Демоверсия, спецификация и кодификатор ↗</a></footer>
    </div>`;
    if (focus) body.querySelector(focus)?.focus();
  }

  function goToMap() {
    inLesson = false;
    render('[data-map-focus]');
  }
  body.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || inLesson) return;
    const {mapMode, mapStage, mapNumber, mapLesson} = button.dataset;
    if (mapMode) {
      mode = mapMode;
      selectedStage = null;
      render(`[data-map-mode="${mode}"]`);
    } else if (mapStage) {
      selectedStage = mapStage;
      render('[data-map-focus]');
    } else if (mapNumber) {
      mode = 'numbers';
      selectedStage = null;
      selectedNumber = Number(mapNumber);
      render(`[data-map-number="${selectedNumber}"]`);
    } else if (mapLesson) {
      inLesson = true;
      lessons.openTopic(mapLesson);
    } else if (button.hasAttribute('data-map-back')) {
      const previousStage = selectedStage;
      selectedStage = null;
      render(mode === 'numbers' ? `[data-map-number="${selectedNumber}"]` : `[data-map-stage="${previousStage}"]`);
    }
  });
  body.addEventListener('change', event => {
    const id = event.target.dataset.mapPriority;
    if (!id) return;
    priorities = priorities.filter(value => value !== id);
    if (event.target.checked) priorities.push(id);
    try { localStorage.setItem(priorityKey, JSON.stringify(priorities)); } catch {}
    render(`[data-map-priority="${id}"]`);
  });

  return {
    render, goToMap,
    mountStyles() {
      const sheet = document.createElement('link');
      sheet.rel = 'stylesheet';
      sheet.href = './route-map72.css';
      document.head.append(sheet);
    }
  };
}
