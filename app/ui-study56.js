import {icon} from './ui-study56-icons.js';
import {PROJECT_NAME, SECTIONS} from './app-sections.js';
import {attachPathReveal} from './path-reveal77.js';
import {attachPathExit} from './path-exit80.js';
import {enhanceControls} from './study-controls86.js';

// Opt-in design review. Navigation, camera, audio and writing still belong to the room.
const style = document.createElement('link');
style.rel = 'stylesheet';
style.href = './ui-study56.css';
document.head.append(style);
const root = document.querySelector('#room');
root.classList.add('ui-study');
const get = id => document.getElementById(id);
if(new URLSearchParams(location.search).get('ui')==='59')get('studyPanel').style.visibility='hidden';
// The rails mount before their styles: keep them concealed until their final
// dimensions are available, including a first visit directly to Practice.
const railStyleGuard=new URLSearchParams(location.search).get('ui')==='59'?document.createElement('style'):null;
if(railStyleGuard){railStyleGuard.textContent='#room > :is(.course-notes,.practice-rail){visibility:hidden!important;}';document.head.append(railStyleGuard);}
const tabs = [...get('paperMenuLinks').querySelectorAll('[data-section]')];
const query = new URLSearchParams(location.search);
const pathReveal = query.get('ui') === '59' ? attachPathReveal(root, get('studyPanel')) : null;
if (pathReveal) attachPathExit(root, get('studyPanel'));
const printStudy = query.get('ui') === '57';
const [vellum, courseModule, practiceModule] = query.get('ui') === '59'
  ? await Promise.all([import('./ui-vellum59.js'), import('./course78.js'), import('./practice85.js')])
  : [null, null, null];
const printLayout = printStudy ? await import('./ui-atlas57.js') : null;
const sectionOrder = Object.keys(SECTIONS);
const number = n => String(n).padStart(2, '0');

const brand = get('paperMenuToggle');
brand.innerHTML = icon('room', 'brand-mark') +
  `<span class="wordmark"><small>ПОДГОТОВКА К ЕГЭ</small>${PROJECT_NAME}</span>` + icon('chevron', 'menu-chevron');
tabs.forEach((button, index) => {
  const name = button.dataset.section;
  button.innerHTML = icon(name) + '<span>' + SECTIONS[name].label + '</span><small>' + number(index + 1) + '</small>';
});
get('studyClose').innerHTML = icon('close');

const menu = document.querySelector('.paper-menu');
const footer = document.querySelector('.bottom');
footer.id = 'atmosphereTools';
const atmosphere = document.createElement('button');
atmosphere.type = 'button';
atmosphere.className = 'atmosphere-switch';
atmosphere.setAttribute('aria-controls', footer.id);
atmosphere.innerHTML = icon('settings') + 'Атмосфера' + icon('chevron', 'end-chevron');
menu.append(atmosphere);
function showTools(open) {
  footer.hidden = !open;
  atmosphere.setAttribute('aria-expanded', String(open));
}
showTools(false);
atmosphere.addEventListener('click', () => showTools(footer.hidden));
footer.addEventListener('keydown', event => {
  if (event.key === 'Escape') { showTools(false); atmosphere.focus(); }
});
const dockIcons = {writingReplay: 'replay', motionToggle: 'pause', parallaxToggle: 'motion',
  timelineToggle: 'timeline', soundToggle: 'music', fullscreenToggle: 'expand'};
for (const [id, name] of Object.entries(dockIcons)) {
  get(id).querySelector('svg').outerHTML = icon(name);
}
function reflectMotion() {
  const button = get('motionToggle');
  button.querySelector('svg').outerHTML = icon(button.getAttribute('aria-pressed') === 'true' ? 'pause' : 'play');
}
reflectMotion();
new MutationObserver(reflectMotion).observe(get('motionToggle'), {attributes: true, attributeFilter: ['aria-pressed']});
document.querySelector('.volume-control svg').outerHTML = icon('volume');

// Short, self-contained examples let the layout be judged with Russian copy.
// This study has no account state. Answers and disclosures live only in the preview.
const row = (n, title, meta, state = '') =>
  '<li class="route-row ' + state + '"><span class="node-number">' + (state === 'done' ? icon('check') : n) +
  '</span><span><strong>' + title + '</strong><small>' + meta + '</small></span></li>';
const practiceIntro = '<span class="eyebrow">Упражнение · пунктуация</span>' +
  '<h2>Нужна ли запятая?</h2><p class="lead">Выбери знак на месте пропуска.</p>';
const screens = {
  path: '<span class="eyebrow">Тема 02 · пунктуация</span><h2>Сложное предложение</h2>' +
    '<p class="lead">От грамматической основы до союза между частями.</p>' +
    '<ol class="route">' + row('01','Найти две основы','Разбор примера','done') +
    row('02','Выбрать знак перед «и»','Текущий шаг · 3 минуты','current') +
    row('03','Объяснить свой выбор','Следующий шаг') + '</ol>' +
    '<button class="lesson-action" data-start>Попробовать шаг' + icon('forward') + '</button>',
  practice: practiceIntro + '<blockquote>Снег перестал<span class="gap">…</span> и во дворе стало тихо.</blockquote>' +
    '<div class="answer-row" aria-label="Выбор ответа"><button data-answer="yes">Запятая</button><button data-answer="no">Без знака</button></div>' +
    '<p class="answer-note" role="status"></p><details class="explain"><summary>Подсказка' + icon('chevron') +
    '</summary><p>Найди основу по обе стороны от союза «и».</p></details>',
  progress: '<h2>Что уже получается</h2>' +
    '<p class="lead">Одна тема, три умения. У каждого — свой пример.</p>' +
    '<div class="skill-block"><span class="skill-index">01 / 03</span><div class="skill-rule" aria-hidden="true"><i></i><i></i><i></i></div></div>' +
    '<details class="explain evidence" open><summary><span>Найти две основы<small>Получается самостоятельно</small></span>' + icon('chevron') +
    '</summary><p>В примере «Солнце село, и двор опустел» верно найдены обе основы.</p></details>' +
    '<div class="next-skill"><small>В РАБОТЕ</small><strong>Выбрать знак перед союзом</strong></div>'
};
const panel = get('studyPanel');
const body = get('studyBody');
const heading = get('studyTitle');
const course = courseModule?.createCourse({body, heading});
const practice = practiceModule?.createPractice({root,panel,body,heading});
heading.insertAdjacentHTML('afterend', '<div class="chapter-plate" aria-hidden="true"><span></span></div>');
const plate = panel.querySelector('.chapter-plate');
let drawnSection=null;
function drawSection() {
  const section = root.dataset.section;
  if(section===drawnSection)return;
  drawnSection=section;
  if(course&&section!=='path')course.leave();
  if(practice&&section!=='practice')practice.leave();
  if (!Object.hasOwn(screens, section)) return;
  const index = number(sectionOrder.indexOf(section) + 1);
  plate.innerHTML = icon(section) + '<span>РАЗДЕЛ ' + index + ' / 03</span>';
  if (root.dataset.look === 'print') printLayout.updatePlate(plate, section, index);
  if (course && section === 'path') {
    course.showMap();
    return;
  }
  if (practice && section === 'practice') {practice.show();return;}
  body.innerHTML = vellum && section === 'practice' ? vellum.practice : screens[section];
  if(vellum)enhanceControls(body);
  if (section === 'path') body.querySelector('[data-start]').addEventListener('click', () => {
    tabs.find(button => button.dataset.section === 'practice').click();
  });
}
body.addEventListener('click', event => {
  const answer = event.target.closest('[data-answer]');
  if (!answer) return;
  for (const choice of body.querySelectorAll('[data-answer]')) choice.setAttribute('aria-pressed', String(choice === answer));
  const correct = answer.dataset.answer === 'yes';
  body.querySelector('.answer-note').textContent = vellum ? vellum.feedback(correct) : (correct
    ? 'Верно. Союз соединяет две части: «снег перестал» и «стало тихо».'
    : 'Попробуй ещё раз. «Стало тихо» — основа второй части, поэтому перед «и» нужна запятая.');
});
drawSection();
new MutationObserver(drawSection).observe(root, {attributes: true, attributeFilter: ['data-section']});

const review = document.createElement('aside');
review.className = 'review-strip';
root.append(review);
if (vellum) {
  root.dataset.look = 'copper';
  vellum.mount({root, tabs, review, brand, atmosphere});
  // Append synchronously in the established cascade order, then await all files.
  // The rails remain concealed until every stylesheet is ready.
  const sectionStyles=[course.mountStyles(),practice.mountStyles()];
  const sharedStyles=['./study-system86.css','./practice88.css'].map(href=>new Promise(resolve=>{const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href=href;sheet.onload=sheet.onerror=resolve;document.head.append(sheet);}));
  await Promise.all([...sectionStyles,...sharedStyles]);
  railStyleGuard?.remove();
  get('studyPanel').style.removeProperty('visibility');
  pathReveal.ready();
  if (query.get('style') !== 'copper') {
    const url = new URL(location.href);
    url.searchParams.set('style', 'copper');
    history.replaceState(history.state, '', url);
  }
} else {
  const choices = printStudy ? {print: 'Оттиск', graphite: 'Графит'} : {olive: 'Олива', graphite: 'Графит', chalk: 'Мел'};
  review.setAttribute('aria-label', 'Сравнение вариантов дизайна');
  review.innerHTML = '<div class="review-caption"><b>Макет интерфейса</b><small>Учебные данные для примера</small></div>' +
    '<div class="review-choices" role="group" aria-label="Оформление">' +
    Object.entries(choices).map(([id,label]) => '<button type="button" data-look="' + id +
      '"><i aria-hidden="true"></i>' + label + '</button>').join('') + '</div>';
  function selectStyle(id) {
    root.dataset.look = id;
    printLayout?.setLayout(id === 'print', {tabs, plate, heading});
    for (const button of review.querySelectorAll('[data-look]')) button.setAttribute('aria-pressed', String(button.dataset.look === id));
    const url = new URL(location.href);
    url.searchParams.set('style', id);
    history.replaceState(history.state, '', url);
  }
  review.addEventListener('click', event => {
    const button = event.target.closest('button[data-look]');
    if (button) selectStyle(button.dataset.look);
  });
  selectStyle(Object.hasOwn(choices, query.get('style')) ? query.get('style') : Object.keys(choices)[0]);
}
