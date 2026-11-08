import {icon} from './ui-study56-icons.js';
export const STUDY_MOTION_DURATION=320;

// Shared behavior for every disclosure and single-choice field in the study UI.
const disclosures=new WeakMap(),detailsState=new WeakMap(),selects=new WeakMap();
const openSelects=new Set(),observedDocuments=new WeakSet();
let sequence=0;
const reduced=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function timing(element){
  const style=globalThis.getComputedStyle?.(element);
  return {duration:reduced()?0:parseFloat(style?.getPropertyValue('--study-motion-duration')||String(STUDY_MOTION_DURATION)),easing:style?.getPropertyValue('--study-motion-ease').trim()||'cubic-bezier(.22,1,.36,1)'};
}
function chevron(){const template=document.createElement('template');template.innerHTML=icon('chevron','study-disclosure-chevron');return template.content.firstElementChild;}

export function enhanceDisclosure(trigger,content,{open=true}={}){
  if(!content?.classList?.add||!trigger?.setAttribute)return;
  content.classList.add('study-disclosure-content');
  const arrow=trigger.querySelector('svg:last-child');arrow?.classList.add('study-disclosure-chevron');
  return setDisclosureOpen(content,open,{animate:false,trigger});
}

export function setDisclosureOpen(content,open,{animate=true,trigger}={}){
  if(!content?.style||!content?.getBoundingClientRect)return Promise.resolve();
  let state=disclosures.get(content);
  if(!state){state={open:!content.hidden,animation:null,children:[],ticket:0,trigger};disclosures.set(content,state);}
  if(trigger)state.trigger=trigger;
  const ticket=++state.ticket,current=content.hidden?0:content.getBoundingClientRect().height;
  state.animation?.cancel();state.children.forEach(a=>a.cancel());state.children=[];state.open=open;
  state.trigger?.setAttribute('aria-expanded',String(open));
  content.dataset.expanded=String(open);content.hidden=false;content.inert=!open;
  content.style.height='';content.style.overflow='';
  const target=open?content.getBoundingClientRect().height:0;
  const options=timing(content);
  const finish=()=>{if(ticket!==state.ticket)return;content.hidden=!open;content.inert=!open;content.style.height='';content.style.overflow='';const animation=state.animation;state.animation=null;animation?.cancel();};
  if(!animate||!options.duration||!content.animate||Math.abs(current-target)<.5){finish();return Promise.resolve();}
  content.style.overflow='hidden';
  // Hold the final height until hidden/natural layout is committed: no one-frame full-height flash.
  state.animation=content.animate([{height:current+'px'},{height:target+'px'}],{...options,fill:'both'});
  // Reveal rows in order, with no opacity-only replacement of the whole list.
  const inner=content.querySelector(':scope > .study-disclosure-inner')||content;
  const rows=[...inner.children].filter(el=>!el.hidden);
  const staggerRows=rows.length===1&&rows[0].children.length?[...rows[0].children]:rows;
  for(const [i,row]of staggerRows.slice(0,24).entries()){
    if(!row.animate)continue;
    const delay=Math.min((open?i:Math.min(staggerRows.length,7)-1-i)*24,144);
    const animation=row.animate(open?[{opacity:.25,transform:'translateY(-6px)'},{opacity:1,transform:'translateY(0)'}]:[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-4px)'}],{duration:Math.max(120,options.duration-Math.max(0,delay)),delay:Math.max(0,delay),easing:options.easing,fill:'backwards'});
    animation.finished.catch(()=>{});state.children.push(animation);
  }
  return state.animation.finished.then(finish,()=>{});
}

function enhanceDetails(detail){
  let state=detailsState.get(detail);
  if(state){if(detail.open!==state.open&&!state.busy)state.set(detail.open);return;}
  const summary=detail.querySelector(':scope > summary');if(!summary)return;
  for(const oldIcon of summary.querySelectorAll(':scope > svg'))oldIcon.remove();
  const label=document.createElement('span');label.className='study-disclosure-label';
  while(summary.firstChild)label.append(summary.firstChild);
  summary.append(label,chevron());summary.classList.add('study-disclosure-summary');
  const content=document.createElement('div'),inner=document.createElement('div');
  content.className='study-disclosure-content';inner.className='study-disclosure-inner';
  for(const child of [...detail.childNodes])if(child!==summary)inner.append(child);
  content.append(inner);detail.append(content);detail.classList.add('study-disclosure');
  state={open:detail.open,busy:false,ticket:0};detailsState.set(detail,state);
  detail.dataset.expanded=String(state.open);enhanceDisclosure(summary,content,{open:state.open});
  state.set=open=>{
    const ticket=++state.ticket;state.open=open;state.busy=true;detail.dataset.expanded=String(open);
    detail.open=true;
    return setDisclosureOpen(content,open,{trigger:summary}).then(()=>{
      if(ticket!==state.ticket)return;detail.open=open;state.busy=false;
    });
  };
  summary.addEventListener('click',event=>{event.preventDefault();state.set(!state.open);});
  detail.addEventListener('toggle',()=>{if(!state.busy&&detail.open!==state.open)state.set(detail.open);});
}

function enhanceSelect(select){
  if(selects.has(select)||select.multiple||select.size>1)return;
  const doc=select.ownerDocument,wrapper=doc.createElement('div'),trigger=doc.createElement('button'),value=doc.createElement('span'),menu=doc.createElement('div'),list=doc.createElement('div');
  const id=select.id||'study-select-'+(++sequence);
  wrapper.className='study-select';wrapper.dataset.open='false';
  trigger.type='button';trigger.className='study-select-trigger';trigger.id=id+'-trigger';trigger.setAttribute('role','combobox');trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-controls',id+'-options');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-autocomplete','none');trigger.disabled=select.disabled;
  value.className='study-select-value';value.id=id+'-value';trigger.append(value,chevron());
  const labels=[...select.labels];for(const [i,label]of labels.entries()){label.id||=id+'-label-'+i;label.htmlFor=trigger.id;}
  trigger.setAttribute('aria-labelledby',[...labels.map(l=>l.id),value.id].join(' '));
  menu.className='study-select-menu study-disclosure-content';menu.hidden=true;
  list.className='study-select-options study-disclosure-inner';list.id=id+'-options';list.setAttribute('role','listbox');list.setAttribute('aria-label',labels.map(l=>l.textContent).join(' ')||select.name);
  menu.append(list);select.before(wrapper);wrapper.append(select,trigger,menu);select.hidden=true;select.tabIndex=-1;select.setAttribute('aria-hidden','true');
  const options=[...select.options].map((option,index)=>{const button=doc.createElement('button');button.type='button';button.className='study-select-option';button.id=id+'-option-'+index;button.setAttribute('role','option');button.tabIndex=-1;button.textContent=option.textContent;button.disabled=option.disabled;list.append(button);return button;});
  let highlighted=select.selectedIndex,buffer='',lastType=0,opened=false;
  const sync=()=>{value.textContent=select.selectedOptions[0]?.textContent||'';options.forEach((option,i)=>option.setAttribute('aria-selected',String(i===select.selectedIndex)));};
  const highlight=index=>{highlighted=index;options.forEach((option,i)=>option.classList.toggle('is-highlighted',i===index));if(options[index]){trigger.setAttribute('aria-activedescendant',options[index].id);if(opened){const row=options[index],top=row.offsetTop-list.offsetTop;if(top<list.scrollTop)list.scrollTop=top;else if(top+row.offsetHeight>list.scrollTop+list.clientHeight)list.scrollTop=top+row.offsetHeight-list.clientHeight;}}};
  const close=()=>{opened=false;wrapper.dataset.open='false';openSelects.delete(state);trigger.removeAttribute('aria-activedescendant');return setDisclosureOpen(menu,false,{trigger});};
  const open=()=>{for(const item of [...openSelects])item.close();opened=true;wrapper.dataset.open='true';openSelects.add(state);setDisclosureOpen(menu,true,{trigger});highlight(select.selectedIndex<0?0:select.selectedIndex);};
  const commit=index=>{if(!options[index]||options[index].disabled)return;select.selectedIndex=index;sync();trigger.focus({preventScroll:true});close().then(()=>{if(!wrapper.isConnected)return;const restore=doc.activeElement===trigger;select.dispatchEvent(new Event('change',{bubbles:true}));if(restore)doc.getElementById(trigger.id)?.focus({preventScroll:true});});};
  const state={wrapper,close};selects.set(select,state);sync();
  trigger.addEventListener('click',()=>opened?close():open());
  list.addEventListener('click',event=>{const index=options.indexOf(event.target.closest('.study-select-option'));if(index>=0)commit(index);});
  trigger.addEventListener('keydown',event=>{
    const enabled=options.map((o,i)=>o.disabled?-1:i).filter(i=>i>=0);
    if(event.key==='Tab'){close();return;}
    if(event.key==='Escape'){if(opened){event.preventDefault();close();}return;}
    if(['ArrowDown','ArrowUp','Home','End','Enter',' '].includes(event.key)){
      event.preventDefault();if(!opened){open();if(event.key==='Home')highlight(enabled[0]);if(event.key==='End')highlight(enabled.at(-1));return;}
      if(event.key==='Enter'||event.key===' '){commit(highlighted);return;}
      if(event.key==='Home')highlight(enabled[0]);else if(event.key==='End')highlight(enabled.at(-1));else {const at=enabled.indexOf(highlighted),delta=event.key==='ArrowDown'?1:-1;highlight(enabled[(at+delta+enabled.length)%enabled.length]);}return;
    }
    if(event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey){event.preventDefault();const now=Date.now();buffer=(now-lastType<700?buffer:'')+event.key.toLocaleLowerCase('ru');lastType=now;if(!opened)open();const found=enabled.find(i=>options[i].textContent.toLocaleLowerCase('ru').startsWith(buffer));if(found!==undefined)highlight(found);}
  });
  select.addEventListener('change',sync);
  if(!observedDocuments.has(doc)){
    observedDocuments.add(doc);doc.addEventListener('pointerdown',event=>{for(const item of [...openSelects])if(!item.wrapper.contains(event.target))item.close();});
    doc.addEventListener('focusin',event=>{for(const item of [...openSelects])if(!item.wrapper.contains(event.target))item.close();});
  }
}

export function enhanceControls(container){
  if(!container?.querySelectorAll)return;
  for(const detail of container.querySelectorAll('details'))enhanceDetails(detail);
  for(const select of container.querySelectorAll('select:not([multiple])'))enhanceSelect(select);
}
