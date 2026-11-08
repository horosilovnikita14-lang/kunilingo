import {icon} from './ui-study56-icons.js';
const sway=[0,.3,.3,0,-.3,-.3];
const labels={new:'Не начато',active:'Незавершено',done:'Пройдено',locked:'Откроется по порядку'};
const lock='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="6" y="10" width="12" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2"/></svg>';
const book='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1v14"/><path d="M6 9h3m-3 4h3m6-4h3m-3 4h3"/></svg>';
function trail(nodes) {
  const point=index=>[50+sway[index%sway.length]*100,index*128+24];
  let d='M '+point(0).join(' ');
  for(let index=1;index<nodes.length;index++) {
    const [x,y]=point(index-1),[nx,ny]=point(index);
    d+=' C '+x+' '+(y+50)+' '+nx+' '+(ny-50)+' '+nx+' '+ny;
  }
  return '<svg class="course-trail-thread" viewBox="0 0 100 '+nodes.length*128+'" preserveAspectRatio="none" aria-hidden="true"><path d="'+d+'" vector-effect="non-scaling-stroke"/></svg>'+
    '<ol class="course-trail-nodes">'+nodes.map(({title,type,state,attrs,next},index)=>'<li style="--sway:'+sway[index%sway.length]+'">'+
      '<button type="button" class="trail-stop is-'+state+(next?' is-next':'')+'" '+attrs+' aria-label="'+title+' · '+type+' · '+labels[state]+'">'+
      '<span class="trail-orb">'+(state==='locked'?lock:state==='done'?icon('check'):type==='Теория'?book:icon(type==='Практика'?'practice':'progress'))+'</span>'+
      '<span class="trail-caption"><small class="trail-step-kind">'+type+'</small><strong>'+title+'</strong></span></button></li>').join('')+'</ol>';
}
export function courseMap({course,done,started,practiceStarted={},theoryPassed={},controls,controlStarted,next,canOpen,allDone}) {
  return '<div class="trail-main" aria-label="Маршрут курса">'+course.map((unit,index)=>{
    const nodes=unit.lessons.flatMap(lesson=>['theory','practice'].map(kind=>{
      const completed=kind==='theory'?theoryPassed[lesson.id]:done[lesson.id],begun=kind==='theory'?started[lesson.id]:practiceStarted[lesson.id];
      const available=canOpen(kind,lesson.id),attribute=kind==='theory'?'lesson':'practice';
      return {title:lesson.title,type:kind==='theory'?'Теория':'Практика',state:completed?'done':!available?'locked':begun?'active':'new',
        attrs:'data-course-'+attribute+'="'+lesson.id+'" '+(available?'':'disabled'),next:next?.id===lesson.id&&next.kind===kind};
    }));
    nodes.push({title:unit.kind==='writing'?'Контрольное сочинение':'Контрольная',type:'Итог раздела',
      state:controls[unit.id]?'done':!canOpen('control',unit.id)?'locked':controlStarted[unit.id]?'active':'new',
      attrs:'data-course-control="'+unit.id+'" '+(canOpen('control',unit.id)?'':'disabled'),next:next?.id===unit.id&&next.kind==='control'});
    const completed=unit.lessons.filter(lesson=>done[lesson.id]).length;
    return '<section class="trail-chapter" data-trail-unit="'+unit.id+'" aria-labelledby="trail-heading-'+unit.id+'">'+
      '<header class="trail-chapter-head"><span>Раздел '+String(index+1).padStart(2,'0')+'<i aria-hidden="true"></i>'+completed+' / '+unit.lessons.length+'</span>'+
      '<h2 id="trail-heading-'+unit.id+'" tabindex="-1">'+unit.title+'</h2></header><div class="course-trail-track">'+trail(nodes)+'</div></section>';
  }).join('')+'<div class="trail-finish"><span>Всё складывается в одно</span><h2>Пробный экзамен</h2><button type="button" class="trail-finish-link" data-course="mock" '+(allDone?'':'disabled')+'>К полным вариантам '+icon('forward')+'</button></div></div>';
}

