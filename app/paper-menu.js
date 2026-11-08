import {PROJECT_NAME,SUBJECTS,SECTIONS,parseView,viewHash} from './app-sections.js';
const root=document.querySelector('#room');
const menu=document.querySelector('.paper-menu');
const toggle=document.querySelector('#paperMenuToggle');
const links=document.querySelector('#paperMenuLinks');
const items=[...links.querySelectorAll('[data-section]')];
const panel=document.querySelector('#studyPanel');
const heading=document.querySelector('#studyTitle');
const subjectLabel=document.querySelector('#studySubject');
const subjectPicker=document.querySelector('#studySubjectPicker');
const subjectSelect=document.querySelector('#studySubjectSelect');
const close=document.querySelector('#studyClose');
const scrollBySubject=new Map();
let view=parseView(location.hash);
let lastSection=view.section;
const scrollKey=()=>`${view.subject}/${view.section}`;
function setExpanded(expanded){links.hidden=!expanded;toggle.setAttribute('aria-expanded',String(expanded));}
function render(focus=false){
  panel.hidden=!view.section;
  root.classList.toggle('section-open',Boolean(view.section));
  root.dataset.subject=view.subject;
  root.dataset.section=view.section||'';
  for(const item of items){
    const active=item.dataset.section===view.section;
    item.setAttribute('aria-expanded',String(active));
    if(active)item.setAttribute('aria-current','page');else item.removeAttribute('aria-current');
  }
  const subject=SUBJECTS.find(item=>item.id===view.subject);
  subjectLabel.textContent=[subject.label,subject.qualification].filter(Boolean).join(' · ');
  subjectSelect.value=view.subject;
  if(view.section){
    heading.textContent=SECTIONS[view.section].label;
    document.title=`${heading.textContent} · ${subject.label} · ${PROJECT_NAME}`;
    panel.scrollTop=scrollBySubject.get(scrollKey())||0;
    if(focus)heading.focus({preventScroll:true});
  }else document.title=`${PROJECT_NAME} · Главная`;
}
function commitView(next,focus=true,updateHistory=true,after){
  if(view.section)scrollBySubject.set(scrollKey(),panel.scrollTop);
  const hash=viewHash(next.subject,next.section);
  if(updateHistory&&location.hash!==hash)history.pushState(null,'',location.pathname+location.search+hash);
  view=next;
  if(view.section)lastSection=view.section;
  render(focus);
  after?.();
}
function navigate(next,focus=true,updateHistory=true,after){
  const commit=()=>commitView(next,focus,updateHistory,after);
  if(root.studyViewTransition)root.studyViewTransition(next,commit);else commit();
}
function closePanel(){
  const previous=lastSection;
  navigate({subject:view.subject,section:null},false,true,()=>{
    setExpanded(true);
    (items.find(item=>item.dataset.section===previous)||toggle).focus({preventScroll:true});
  });
}
toggle.addEventListener('click',()=>setExpanded(links.hidden));
links.addEventListener('click',event=>{
  const item=event.target.closest('[data-section]');
  if(!item||!Object.hasOwn(SECTIONS,item.dataset.section))return;
  navigate({subject:view.subject,section:item.dataset.section});
});
close.addEventListener('click',closePanel);
panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();closePanel();}});
menu.addEventListener('keydown',event=>{
  if(event.key!=='Escape')return;
  if(view.section)closePanel();else{setExpanded(false);toggle.focus();}
  event.preventDefault();
});
for(const subject of SUBJECTS){const option=document.createElement('option');option.value=subject.id;option.textContent=subject.label;subjectSelect.append(option);}
subjectPicker.hidden=SUBJECTS.length<2;
subjectLabel.hidden=SUBJECTS.length>1;
subjectSelect.addEventListener('change',()=>navigate({subject:subjectSelect.value,section:view.section}));
function restore(){
  navigate(parseView(location.hash),true,false,()=>{
    if(!view.section)(items.find(item=>item.dataset.section===lastSection)||toggle).focus({preventScroll:true});
  });
}
window.addEventListener('popstate',restore);
window.addEventListener('hashchange',restore);
render();
