import {glyph} from './ui-atlas57-glyphs.js';
import {icon} from './ui-study56-icons.js';

const sheet = document.createElement('link');
sheet.rel = 'stylesheet';
sheet.href = './ui-atlas57.css';
document.head.append(sheet);

const sections = {path: '01', practice: '02', progress: '03'};
const sleeves = {path: 'маршрут', practice: 'задание', progress: 'результат'};
let masthead;

export function updatePlate(plate, section, index) {
  plate.innerHTML = '<span class="imprint-caption">Серия ' + index + ' / ' + sleeves[section] +
    '</span><span class="imprint-seal">' + glyph(section) + '</span>';
}

export function setLayout(print, {tabs, plate, heading}) {
  const selected = document.getElementById('room').dataset.section;
  for (const tab of tabs) {
    const section = tab.dataset.section;
    tab.querySelector('svg').outerHTML = print ? glyph(section) : icon(section);
  }
  if (print) {
    if (!masthead) {
      masthead = document.createElement('div');
      masthead.className = 'imprint-masthead';
      heading.before(masthead);
      masthead.append(plate, heading);
    }
    if (sections[selected]) updatePlate(plate, selected, sections[selected]);
  } else {
    if (masthead) {
      masthead.replaceWith(heading, plate);
      masthead = null;
    }
    if (sections[selected]) {
      plate.innerHTML = icon(selected) + '<span>РАЗДЕЛ ' + sections[selected] + ' / 03</span>';
    }
  }
}
