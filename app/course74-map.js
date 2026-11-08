import {icon} from './ui-study56-icons.js';

const sway = [0,.3,.3,0,-.3,-.3];
const labels = {new:'Не начат', active:'В процессе', done:'Пройден', locked:'Откроется по порядку'};

function trail(nodes) {
  const point = index => [50 + sway[index % sway.length]*100, index*128+24];
  const [x,y] = point(0);
  let d = `M ${x} ${y}`;
  for (let index = 1; index < nodes.length; index++) {
    const [lastX,lastY] = point(index-1), [nextX,nextY] = point(index);
    d += ` C ${lastX} ${lastY+50} ${nextX} ${nextY-50} ${nextX} ${nextY}`;
  }
  return `<svg class="course-trail-thread" viewBox="0 0 100 ${nodes.length*128}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" vector-effect="non-scaling-stroke"/></svg>
    <ol class="course-trail-nodes">${nodes.map(({title,state,glyph,attrs,next},index)=>`
      <li style="--sway:${sway[index%sway.length]}">
        <button type="button" class="trail-stop is-${state}${next?' is-next':''}" ${attrs} aria-label="${title} · ${labels[state]}${next?' · Следующий шаг':''}">
          <span class="trail-orb">${state==='locked'?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="6" y="10" width="12" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2"/></svg>':icon(state==='done'?'check':glyph)}</span>
          <span class="trail-caption"><strong>${title}</strong>${state!=='new'||next?`<small>${next&&state==='new'?'Начать здесь':labels[state]}</small>`:''}</span>
        </button>
      </li>`).join('')}</ol>`;
}

export function courseMap({course,done,started,controls,controlStarted,nextUnit,canOpen=()=>true,allDone=true}) {
  const recommended = nextUnit?.lessons.find(lesson=>!done[lesson.id]);
  return `<div class="trail-main" aria-label="Маршрут курса">${course.map((unit,index)=>{
    const completed = unit.lessons.filter(lesson=>done[lesson.id]).length;
    const nodes = unit.lessons.map(lesson=>({
      title:lesson.title,
      state:done[lesson.id]?'done':!canOpen('lesson',lesson.id)?'locked':started[lesson.id]?'active':'new',
      glyph:unit.kind==='writing'?'practice':lesson.numbers.length?'path':'practice',
      attrs:`data-course-lesson="${lesson.id}" ${canOpen('lesson',lesson.id)?'':'disabled'}`,
      next:lesson===recommended
    }));
    nodes.push({title:unit.kind==='writing'?'Контрольное сочинение':'Контрольная',
      state:controls[unit.id]?'done':!canOpen('control',unit.id)?'locked':controlStarted[unit.id]?'active':'new',
      glyph:'progress',attrs:`data-course-control="${unit.id}" ${canOpen('control',unit.id)?'':'disabled'}`,next:!recommended&&unit===nextUnit});
    return `<section class="trail-chapter" data-trail-unit="${unit.id}" aria-labelledby="trail-heading-${unit.id}">
      <header class="trail-chapter-head"><span>Раздел ${String(index+1).padStart(2,'0')}<i aria-hidden="true"></i>${completed} / ${unit.lessons.length}</span>
        <h2 id="trail-heading-${unit.id}" tabindex="-1">${unit.title}</h2></header>
      <div class="course-trail-track">${trail(nodes)}</div>
    </section>`;
  }).join('')}
    <div class="trail-finish"><span>Всё складывается в одно</span><h2>Пробный экзамен</h2>
      <button type="button" class="trail-finish-link" data-course="mock" ${allDone?'':'disabled'}>К полным вариантам ${icon('forward')}</button>
    </div>
  </div>`;
}

