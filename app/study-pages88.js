// Keep the outgoing page mounted and save input before replacing it.
export function createPageTransition(container){
  let animation=null,ticket=0;
  const reduced=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  function cancel(){ticket++;animation?.cancel();animation=null;if(container)container.inert=false;}
  function enter(){
    animation?.cancel();animation=null;
    const next=container?.querySelector?.('.practice-view');
    if(next?.animate&&!reduced()){
      animation=next.animate([{opacity:0,transform:'scale(.99)'},{opacity:1,transform:'scale(1)'}],{duration:320,easing:'cubic-bezier(.22,1,.36,1)'});
      animation.finished.catch(()=>{});
    }
  }
  async function change(commit){
    const current=++ticket;animation?.cancel();animation=null;
    const view=container?.querySelector?.('.practice-view');
    if(view?.animate&&!reduced()){
      container.inert=true;
      animation=view.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.99)'}],{duration:320,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'});
      try{await animation.finished;}catch{}
      if(current!==ticket)return;
    }
    commit();if(container)container.inert=false;animation=null;
    enter();
  }
  return {change,cancel,enter};
}
