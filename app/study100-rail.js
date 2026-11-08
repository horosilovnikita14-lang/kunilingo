import {icon} from './ui-study56-icons.js';
import {guideForQuestion100,guideMarkup100} from './study100-guides.js';
import {enhanceControls,enhanceDisclosure,setDisclosureOpen} from './study-controls86.js';

// Temporarily detach the real filter DOM. This preserves selections, scroll,
// disclosure state and event handlers; answering never rebuilds the guide.
export function createGuideRail100(rail){
  if(!rail?.replaceChildren)return {show(){return false;},restore(){return false;},toggle(){return false;},get active(){return false;}};
  const doc=rail.ownerDocument;
  let catalogue=null,questionKey=null,open=true,catalogueOpen='true',catalogueScroll=[];
  function restore(){
    if(!catalogue)return false;
    rail.replaceChildren(catalogue);catalogue=null;questionKey=null;
    rail.dataset.open=catalogueOpen;delete rail.dataset.guide;
    for(const {element,top,left}of catalogueScroll){element.scrollTop=top;element.scrollLeft=left;}
    catalogueScroll=[];
    rail.setAttribute('aria-label','Фильтры практики');return true;
  }
  function show(question){
    const guide=guideForQuestion100(question);
    if(!guide){restore();return false;}
    const nextKey=JSON.stringify([question.id,guide.concepts.map(concept=>concept.id)]);
    if(catalogue&&questionKey===nextKey)return true;
    if(!catalogue){
      catalogueOpen=rail.dataset.open||'true';catalogue=doc.createDocumentFragment();
      catalogueScroll=[...rail.querySelectorAll('.practice-rail-body,.study-select-options')].map(element=>({element,top:element.scrollTop,left:element.scrollLeft}));
      while(rail.firstChild)catalogue.append(rail.firstChild);
      open=!globalThis.matchMedia?.('(max-width:1050px)').matches;
    }
    questionKey=nextKey;rail.dataset.guide='true';rail.dataset.open=String(open);
    rail.setAttribute('aria-label','Справочник к заданию');
    rail.innerHTML='<header><button type="button" data-practice="guide-rail" class="practice-rail-toggle" aria-controls="practice-guide-content" aria-expanded="'+open+'">'+icon('practice')+'<span>Справочник</span>'+icon('chevron')+'</button></header>'+
      '<div class="study-rail-content" id="practice-guide-content"><div class="study-disclosure-inner"><div class="practice-rail-body practice-guide-body">'+guideMarkup100(guide)+'</div></div></div>';
    enhanceControls(rail);
    enhanceDisclosure(rail.querySelector('[data-practice="guide-rail"]'),rail.querySelector('#practice-guide-content'),{open});
    return true;
  }
  function toggle(){
    if(!catalogue)return false;open=!open;rail.dataset.open=String(open);
    setDisclosureOpen(rail.querySelector('#practice-guide-content'),open,{trigger:rail.querySelector('[data-practice="guide-rail"]')});return true;
  }
  return {show,restore,toggle,get active(){return Boolean(catalogue);}};
}
