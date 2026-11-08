import {vellumIcon} from './ui-vellum59-icons.js';
import {icon} from './ui-study56-icons.js';
import {PROJECT_NAME} from './app-sections.js';

export const practice = `
  <h2>Нужна ли запятая?</h2>
  <blockquote>Снег растаял и двор ожил.</blockquote>
  <div class="answer-row" role="group" aria-label="Нужна ли запятая перед союзом «и»?">
    <button type="button" data-answer="yes" aria-pressed="false">Да</button>
    <button type="button" data-answer="no" aria-pressed="false">Нет</button>
  </div>
  <p class="answer-note" role="status"></p>`;

export function feedback(correct) {
  return correct
    ? 'Верно. Перед «и» нужна запятая: союз соединяет две основы — «снег растаял» и «двор ожил».'
    : 'Посмотри на основы: «снег растаял» и «двор ожил». Здесь перед «и» нужна запятая.';
}

function addMenuGlass(menu) {
  // Neutral red/green channels leave the centre still. Only the narrow
  // perimeter displaces the room image, in the direction normal to each edge.
  const lensMap = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
    <defs>
      <linearGradient id="x"><stop stop-color="#e08080"/><stop offset=".04" stop-color="#808080"/>
        <stop offset=".96" stop-color="#808080"/><stop offset="1" stop-color="#208080"/></linearGradient>
      <linearGradient id="y" x2="0" y2="1" gradientUnits="objectBoundingBox">
        <stop stop-color="#80e080"/><stop offset=".035" stop-color="#808080" stop-opacity="0"/>
        <stop offset=".965" stop-color="#808080" stop-opacity="0"/><stop offset="1" stop-color="#802080"/>
      </linearGradient>
    </defs>
    <path fill="url(#x)" d="M0 0h100v100H0z"/><path fill="url(#y)" d="M0 0h100v100H0z"/>
  </svg>`;
  menu.insertAdjacentHTML('afterbegin', `<svg class="menu-glass-defs" width="0" height="0" aria-hidden="true" focusable="false">
    <defs><filter id="vellum-lens" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feImage href="data:image/svg+xml,${encodeURIComponent(lensMap)}" x="0%" y="0%" width="100%" height="100%" preserveAspectRatio="none" result="map"/>
      <feDisplacementMap in="SourceGraphic" in2="map" scale="7" xChannelSelector="R" yChannelSelector="G"/>
    </filter></defs></svg>`);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.title = 'Стекло меню';
  toggle.setAttribute('aria-label', 'Стекло меню');
  toggle.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
    <rect x="3.5" y="4.5" width="17" height="15" rx="4"/><path d="m7 11 3-3m.5 6 4-4"/>
  </svg><span>Стекло</span>`;
  let enabled = true;
  const key = 'kunilingo.menuGlass';
  try { enabled = localStorage.getItem(key) !== 'off'; } catch {}
  function render() {
    menu.classList.toggle('has-glass', enabled);
    toggle.setAttribute('aria-pressed', String(enabled));
  }
  toggle.addEventListener('click', () => {
    enabled = !enabled;
    render();
    try { localStorage.setItem(key, enabled ? 'on' : 'off'); } catch {}
  });
  render();
  return toggle;
}

export function mount({root, tabs, review, brand, atmosphere}) {
  const sheet = document.createElement('link');
  sheet.rel = 'stylesheet';
  sheet.href = './ui-vellum59.css';
  document.head.append(sheet);
  root.classList.add('vellum-study');
  for (const tab of tabs) {
    tab.querySelector('svg').outerHTML = vellumIcon(tab.dataset.section);
  }
  const signature = document.createElement('header');
  signature.className = 'vellum-signature';
  signature.innerHTML = `<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
    <path d="M3.5 10.5c5-.7 8.4.7 12.5 4.5 3.1-3 7.5-5.3 12.5-5v13c-4.7 0-8.8 1.4-12.5 4.1-3.8-3-8-4.2-12.5-4.1zM16 15v12"
      fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
    <path d="M21 2.3a5 5 0 0 0 5.2 6.3A5.6 5.6 0 0 1 21 2.3Z" fill="currentColor"/>
  </svg><span>${PROJECT_NAME}</span>`;
  const menu = root.querySelector('.paper-menu');
  menu.prepend(signature);
  const tools = document.createElement('div');
  tools.className = 'vellum-tools';
  brand.innerHTML = icon('room') + '<span>Разделы</span>';
  brand.title = 'Свернуть или развернуть вкладки';
  atmosphere.innerHTML = icon('settings');
  atmosphere.title = 'Атмосфера';
  atmosphere.setAttribute('aria-label', 'Настройки атмосферы');
  tools.append(brand, addMenuGlass(menu), atmosphere);
  review.append(tools);
  review.setAttribute('aria-label', 'Разделы и атмосфера');
}
