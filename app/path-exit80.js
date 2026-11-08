import {cameraFor} from './room-camera.js';

export const PATH_FADE_MS = 320;

// Start moving at once; keep the old workspace mounted only for its reverse fade.
export function attachPathExit(root, panel, {reduced=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches,camera=()=>cameraFor(root)}={}) {
  let timer=null, pending=null;
  const revealKey=()=>({path:'pathReveal',practice:'practiceReveal'})[root.dataset.section];
  const notes=()=>root.querySelector(root.dataset.section==='practice'?'.practice-rail':'.course-notes');
  function clear() {
    if(timer!==null) clearTimeout(timer);
    timer=null;pending=null;panel.inert=false;
    const rail=notes();if(rail)rail.inert=false;
  }
  function run(next,commit) {
    const key=revealKey();
    // Do not emit camera-start while the outgoing view still owns data-section:
    // that event would conceal it before its opacity transition can finish.
    const move=()=>camera()?.moveTo(next.section||'',{announce:false});
    if(key&&next.section===root.dataset.section) {
      const leaving=timer!==null;
      clear();
      if(leaving)root.dataset[key]='ready';
      move();
      commit();return;
    }
    if(timer!==null) {pending=commit;move();return;}
    if(!key||root.dataset[key]!=='ready'||panel.hidden||reduced()) {
      clear();move();commit();return;
    }
    pending=commit;
    // Opening keyframes must release opacity before the reverse transition.
    root.dispatchEvent?.(new Event('study-exit'));
    panel.classList.remove('course-opening','course-map-return','course-closing');
    root.dataset[key]='leaving';
    panel.inert=true;
    const rail=notes();if(rail)rail.inert=true;
    move();
    timer=setTimeout(()=>{
      const finish=pending;
      clear();
      root.dataset[key]='waiting';
      finish?.();
    },PATH_FADE_MS);
  }
  root.studyViewTransition=run;
  return {dispose(){clear();if(root.studyViewTransition===run)delete root.studyViewTransition;}};
}

