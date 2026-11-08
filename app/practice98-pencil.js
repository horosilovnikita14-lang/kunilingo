import {icon} from './ui-study56-icons.js';
import {createPencilHistory,validStrokes,textFingerprint,PENCIL_COLORS,PENCIL_WIDTHS} from './practice98-pencil-model.js';
import {enhanceDisclosure,setDisclosureOpen} from './study-controls86.js';

const namespace='http://www.w3.org/2000/svg';
const storagePrefix='kunilingo.pencil98.';
const scopeSelectors={instruction:'[data-instruction]',passage:'[data-passage]',material:'[data-statement]'};
const preferenceKey='kunilingo.pencil98.preferences';

export function distanceToSegment(point,start,end){
  const x=end.x-start.x,y=end.y-start.y,length=x*x+y*y;
  const t=length?Math.max(0,Math.min(1,((point.x-start.x)*x+(point.y-start.y)*y)/length)):0;
  return Math.hypot(point.x-start.x-t*x,point.y-start.y-t*y);
}

export function touchesStroke(points,point,radius=9){
  return points.some((p,i)=>Math.hypot(p.x-point.x,p.y-point.y)<=radius||(i&&!p.breakBefore&&distanceToSegment(point,points[i-1],p)<=radius));
}

// A line wrap must never turn two nearby pencil points into a diagonal across
// the whole passage. Each point follows its source character independently.
export function pathForPoints(points){
  return points.map((point,i)=>(!i||point.breakBefore?'M':'L')+point.x.toFixed(2)+' '+point.y.toFixed(2)).join(' ');
}

function textNodes(element){
  const walker=element.ownerDocument.createTreeWalker(element,4),nodes=[];
  while(walker.nextNode())if(!walker.currentNode.parentElement?.closest('[data-pencil-layer]'))nodes.push(walker.currentNode);
  return nodes;
}

export function mountPencil({container,questionId,sessions=new Map(),storage}){
  const doc=container.ownerDocument;
  // Non-browser controller fixtures do not have text layout or pointer input.
  if(!doc?.createRange)return {destroy(){}};
  if(!storage)try{storage=globalThis.localStorage;}catch{}
  const toolbar=container.querySelector('[data-pencil-controls]');
  const scopeElements=Object.fromEntries(Object.entries(scopeSelectors).map(([name,selector])=>[name,container.querySelector(selector)]).filter(([,element])=>element&&!element.hidden&&textNodes(element).some(node=>node.textContent.trim())));
  const texts=Object.fromEntries(Object.entries(scopeElements).map(([name,element])=>[name,textNodes(element).map(n=>n.textContent).join('')]));
  const fingerprint=textFingerprint(texts),storageKey=storagePrefix+questionId;
  let session=sessions.get(questionId);
  if(!session||session.fingerprint!==fingerprint){
    let stored;try{stored=JSON.parse(storage.getItem(storageKey)||'null');}catch{}
    session={fingerprint,history:createPencilHistory(stored?.version===1&&stored.fingerprint===fingerprint?validStrokes(stored.strokes,texts):[]),tool:'read',saved:Boolean(storage)};
    if(sessions.size>=32)sessions.delete(sessions.keys().next().value);
    sessions.set(questionId,session);
  }
  const history=session.history,abort=new AbortController(),options={signal:abort.signal};
  const scopes=new Map();let drawing=null,frame=0,destroyed=false,openedMenu=null;
  let style={width:1.5,color:PENCIL_COLORS[0].value};
  try{const saved=JSON.parse(storage.getItem(preferenceKey)||'null');if(PENCIL_WIDTHS.includes(saved?.width))style.width=saved.width;if(PENCIL_COLORS.some(color=>color.value===saved?.color))style.color=saved.color;}catch{}
  const lineIcon=width=>'<svg class="practice-pencil-line" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16" stroke="currentColor" stroke-width="'+width+'" stroke-linecap="round"/></svg>';
  const toolButton=(tool,label,symbol)=>'<button type="button" data-pencil-tool="'+tool+'" aria-label="'+label+'" title="'+label+'" aria-pressed="false">'+icon(symbol)+'</button>';
  const menu=(name,label,preview,choices)=>'<div class="practice-pencil-option"><button type="button" data-pencil-menu="'+name+'" aria-label="'+label+'" title="'+label+'" aria-expanded="false" aria-controls="pencil-'+name+'-options">'+preview+icon('chevron')+'</button><div class="practice-pencil-popover" id="pencil-'+name+'-options" data-pencil-popover="'+name+'" hidden><div class="study-disclosure-inner" role="group" aria-label="'+label+'">'+choices+'</div></div></div>';
  toolbar.innerHTML='<div class="practice-pencil-tools" role="group" aria-label="Пометки на задании">'+toolButton('pencil','Карандаш','pencil')+toolButton('eraser','Ластик','eraser')+'<button type="button" data-pencil-action="undo" aria-label="Отменить пометку" title="Отменить пометку">'+icon('undo')+'</button><button type="button" data-pencil-action="redo" aria-label="Вернуть пометку" title="Вернуть пометку">'+icon('redo')+'</button>'+
    menu('width','Толщина карандаша',lineIcon(style.width),PENCIL_WIDTHS.map(width=>'<button type="button" data-pencil-width="'+width+'" aria-label="Толщина '+String(width).replace('.',',')+'" title="'+String(width).replace('.',',')+'" aria-pressed="false">'+lineIcon(width)+'</button>').join(''))+
    menu('color','Цвет карандаша','<span class="practice-pencil-color-dot" data-pencil-color-preview></span>',PENCIL_COLORS.map(color=>'<button type="button" data-pencil-color="'+color.value+'" aria-label="'+color.label+'" title="'+color.label+'" aria-pressed="false"><span class="practice-pencil-color-dot" style="background:'+color.value+'"></span></button>').join(''))+'</div><span class="practice-pencil-error" data-pencil-error role="alert" hidden></span>';
  const menus=new Map(['width','color'].map(name=>{
    const trigger=toolbar.querySelector('[data-pencil-menu="'+name+'"]'),content=toolbar.querySelector('[data-pencil-popover="'+name+'"]');
    enhanceDisclosure(trigger,content,{open:false});return [name,{trigger,content}];
  }));
  function setMenu(name){
    openedMenu=name;
    for(const [key,{trigger,content}]of menus)setDisclosureOpen(content,key===name,{trigger});
  }

  function updateTools(){
    toolbar.querySelectorAll('[data-pencil-tool]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.pencilTool===session.tool)));
    toolbar.querySelector('[data-pencil-action="undo"]').disabled=!history.canUndo;
    toolbar.querySelector('[data-pencil-action="redo"]').disabled=!history.canRedo;
    toolbar.querySelectorAll('[data-pencil-width]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.pencilWidth)===style.width)));
    toolbar.querySelectorAll('[data-pencil-color]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.pencilColor===style.color)));
    toolbar.querySelector('[data-pencil-menu="width"] .practice-pencil-line path').setAttribute('stroke-width',String(style.width));
    toolbar.querySelector('[data-pencil-color-preview]').style.backgroundColor=style.color;
    const warning=toolbar.querySelector('[data-pencil-error]');warning.textContent=session.message||(!session.saved?'Не удалось сохранить пометки в браузере':'');warning.hidden=!warning.textContent;
    for(const scope of scopes.values())scope.element.dataset.pencilMode=session.tool;
  }
  function save(){
    try{storage.setItem(storageKey,JSON.stringify({version:1,fingerprint,strokes:history.items}));session.saved=true;}catch{session.saved=false;}
    updateTools();
  }
  function position(scope,event){
    const box=scope.svg.getBoundingClientRect();
    return {x:Math.max(0,Math.min(scope.element.clientWidth,(event.clientX-box.left)*scope.element.clientWidth/(box.width||1))),y:Math.max(0,Math.min(scope.element.clientHeight,(event.clientY-box.top)*scope.element.clientHeight/(box.height||1)))};
  }
  function geometry(scope){
    if(scope.geometry)return scope.geometry;
    const box=scope.svg.getBoundingClientRect(),width=scope.element.clientWidth,height=scope.element.clientHeight;
    if(!box.width||!box.height)return null;
    const scaleX=width/box.width,scaleY=height/box.height,range=doc.createRange(),glyphs=[],byOffset=new Map(),fonts=new Map();let offset=0;
    for(const node of scope.nodes){
      const parent=node.parentElement;
      if(!fonts.has(parent))fonts.set(parent,parseFloat(getComputedStyle(parent).fontSize)||15);
      const em=fonts.get(parent);
      for(let i=0;i<node.length;i++,offset++){
        range.setStart(node,i);range.setEnd(node,i+1);const rect=range.getBoundingClientRect();
        if(!rect.width||!rect.height)continue;
        const glyph={offset,x:(rect.left-box.left)*scaleX,y:(rect.top-box.top)*scaleY,w:rect.width*scaleX,h:rect.height*scaleY,em};
        glyphs.push(glyph);byOffset.set(offset,glyph);
      }
    }
    scope.geometry={glyphs,byOffset,width,height};return scope.geometry;
  }
  function anchor(scope,point){
    const layout=geometry(scope);if(!layout?.glyphs.length)return null;
    let best,score=Infinity;
    for(const glyph of layout.glyphs){
      const dx=Math.max(glyph.x-point.x,0,point.x-glyph.x-glyph.w),dy=Math.max(glyph.y-point.y,0,point.y-glyph.y-glyph.h);
      const next=dx*dx+dy*dy*2;
      if(next<score){score=next;best=glyph;}
    }
    const dx=(point.x-best.x)/best.em,dy=(point.y-best.y)/best.em;
    if(Math.abs(dx)>100||Math.abs(dy)>100)return null;
    return {offset:best.offset,dx,dy,x:point.x/(layout.width||1),y:point.y/(layout.height||1)};
  }
  function project(scope,stroke){
    const layout=geometry(scope);if(!layout)return [];
    const points=[];
    for(const point of stroke.points){
      const glyph=layout.byOffset.get(point.offset);
      if(!glyph)continue;
      const next={x:glyph.x+point.dx*glyph.em,y:glyph.y+point.dy*glyph.em};
      const previous=points.at(-1);
      next.breakBefore=Boolean(previous&&Math.hypot(next.x-previous.x,next.y-previous.y)>glyph.em*4);
      points.push(next);
    }
    return points;
  }
  function draw(){
    frame=0;if(destroyed)return;
    for(const [name,scope]of scopes){
      const width=scope.element.clientWidth,height=scope.element.clientHeight;
      scope.svg.setAttribute('viewBox','0 0 '+Math.max(1,width)+' '+Math.max(1,height));
      scope.svg.replaceChildren();scope.projected=[];
      const items=history.items.filter(item=>item.scope===name&&!drawing?.erased?.has(item.id));
      if(drawing?.scope===scope&&drawing.points.length>1)items.push({scope:name,points:drawing.points,width:drawing.width,color:drawing.color,id:'pending'});
      for(const stroke of items){
        const points=project(scope,stroke);if(!points.length)continue;
        const path=doc.createElementNS(namespace,'path');path.setAttribute('d',pathForPoints(points));path.setAttribute('stroke-width',String(stroke.width));
        path.setAttribute('stroke',stroke.color);
        path.setAttribute('data-pencil-stroke',stroke.id);scope.svg.append(path);scope.projected.push({id:stroke.id,points,width:stroke.width});
      }
    }
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(draw);}
  function addPoint(scope,point){
    if(drawing.points.length>=drawing.maxPoints)return;
    const result=anchor(scope,point);if(result)drawing.points.push(result);
  }
  function move(event){
    if(!drawing||event.pointerId!==drawing.pointerId)return;
    event.preventDefault();const scope=drawing.scope,point=position(scope,event);
    if(session.tool==='eraser'){
      const previous=drawing.last,steps=Math.max(1,Math.ceil(Math.hypot(point.x-previous.x,point.y-previous.y)/4));
      for(let i=1;i<=steps;i++){
        const sample={x:previous.x+(point.x-previous.x)*i/steps,y:previous.y+(point.y-previous.y)*i/steps};
        for(const stroke of scope.projected)if(touchesStroke(stroke.points,sample,9+stroke.width/2))drawing.erased.add(stroke.id);
      }
    }else{
      const previous=drawing.last,steps=Math.max(1,Math.ceil(Math.hypot(point.x-previous.x,point.y-previous.y)/4));
      for(let i=1;i<=Math.min(steps,400);i++)addPoint(scope,{x:previous.x+(point.x-previous.x)*i/steps,y:previous.y+(point.y-previous.y)*i/steps});
    }
    drawing.last=point;schedule();
  }
  function finish(cancel=false){
    if(!drawing)return;
    const pending=drawing;drawing=null;
    try{pending.scope.svg.releasePointerCapture(pending.pointerId);}catch{}
    if(!cancel){
      let changed=false;
      if(pending.erased)changed=history.remove([...pending.erased]);
      else{
        if(pending.points.length===1){const p=pending.points[0];pending.points.push({...p,dx:p.dx+.015});}
        if(pending.points.length>1)changed=history.add({id:crypto.randomUUID(),scope:pending.scope.name,points:pending.points,width:pending.width,color:pending.color});
      }
      session.message=changed?'':pending.points.length?'Не удалось добавить штрих. Сотри часть пометок и попробуй ещё раз.':'';
      if(changed)save();
    }
    schedule();updateTools();
  }
  for(const [name,element]of Object.entries(scopeElements)){
    const nodes=textNodes(element),svg=doc.createElementNS(namespace,'svg');
    svg.setAttribute('data-pencil-layer','');svg.setAttribute('aria-hidden','true');svg.setAttribute('preserveAspectRatio','none');svg.classList.add('practice-pencil-layer');
    element.classList.add('practice-pencil-surface');element.append(svg);
    const scope={name,element,nodes,svg,geometry:null,projected:[]};scopes.set(name,scope);
    svg.addEventListener('pointerdown',event=>{
      if(session.tool==='read'||event.button!==0||!event.isPrimary||drawing)return;
      if(!geometry(scope)?.glyphs.length)return;
      const maxPoints=Math.min(4000,24000-history.items.reduce((sum,stroke)=>sum+stroke.points.length,0));
      if(session.tool==='pencil'&&(history.items.length>=500||maxPoints<2)){session.message='Место для пометок заполнено. Сотри лишнее ластиком, чтобы продолжить.';updateTools();return;}
      session.message='';
      event.preventDefault();doc.getSelection()?.removeAllRanges();
      svg.setPointerCapture(event.pointerId);const point=position(scope,event);
      setMenu(null);
      drawing={scope,pointerId:event.pointerId,points:[],last:point,maxPoints,width:style.width,color:style.color,...(session.tool==='eraser'?{erased:new Set()}:{} )};
      if(session.tool==='eraser')move(event);else addPoint(scope,point);
      schedule();
    },options);
    svg.addEventListener('pointermove',move,options);
    svg.addEventListener('pointerup',event=>{if(drawing?.pointerId===event.pointerId){move(event);finish();}},options);
    svg.addEventListener('pointercancel',event=>{if(drawing?.pointerId===event.pointerId)finish(true);},options);
    svg.addEventListener('lostpointercapture',event=>{if(drawing?.pointerId===event.pointerId)finish(true);},options);
  }
  const resize=new ResizeObserver(()=>{for(const scope of scopes.values())scope.geometry=null;schedule();});
  for(const scope of scopes.values())resize.observe(scope.element);
  doc.fonts?.ready.then(()=>{if(!destroyed){for(const scope of scopes.values())scope.geometry=null;schedule();}});
  toolbar.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button)return;
    finish();
    session.message='';
    if(button.dataset.pencilMenu){setMenu(openedMenu===button.dataset.pencilMenu?null:button.dataset.pencilMenu);return;}
    if(button.dataset.pencilWidth||button.dataset.pencilColor){
      if(button.dataset.pencilWidth)style.width=Number(button.dataset.pencilWidth);
      if(button.dataset.pencilColor)style.color=button.dataset.pencilColor;
      session.tool='pencil';menus.get(openedMenu)?.trigger.focus({preventScroll:true});
      try{storage.setItem(preferenceKey,JSON.stringify(style));}catch{}
    }
    else if(button.dataset.pencilTool)session.tool=session.tool===button.dataset.pencilTool?'read':button.dataset.pencilTool;
    else if(button.dataset.pencilAction==='undo'){if(history.undo())save();}
    else if(button.dataset.pencilAction==='redo'){if(history.redo())save();}
    setMenu(null);
    updateTools();schedule();
  },options);
  container.addEventListener('keydown',event=>{
    if(event.target.closest('input,textarea,[contenteditable="true"]'))return;
    if(event.key==='Escape'&&(openedMenu||session.tool!=='read'||drawing)){
      event.preventDefault();event.stopPropagation();
      if(openedMenu){menus.get(openedMenu)?.trigger.focus({preventScroll:true});setMenu(null);return;}
      finish(true);session.tool='read';updateTools();
    }
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'&&session.tool!=='read'){
      event.preventDefault();finish();const changed=event.shiftKey?history.redo():history.undo();if(changed)save();schedule();
    }
  },options);
  doc.addEventListener('pointerdown',event=>{if(openedMenu&&!toolbar.contains(event.target))setMenu(null);},options);
  doc.addEventListener('focusin',event=>{if(openedMenu&&!toolbar.contains(event.target))setMenu(null);},options);
  toolbar.addEventListener('keydown',event=>{
    if(!openedMenu||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
    const buttons=[...menus.get(openedMenu).content.querySelectorAll('button')],index=buttons.indexOf(doc.activeElement);if(index<0)return;
    event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(['ArrowLeft','ArrowUp'].includes(event.key)?-1:1)+buttons.length)%buttons.length;buttons[next].focus();
  },options);
  updateTools();schedule();
  return {destroy(){if(destroyed)return;finish();destroyed=true;cancelAnimationFrame(frame);resize.disconnect();abort.abort();for(const scope of scopes.values()){scope.svg.remove();scope.element.classList.remove('practice-pencil-surface');delete scope.element.dataset.pencilMode;}}};
}
