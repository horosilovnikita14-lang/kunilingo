import {cameraFor} from './room-camera.js';

// Fade in during the final quarter of the camera journey, ready at landing.
export function attachPathReveal(root, panel) {
  let loaded = false, frame = 0, lastSection = root.dataset.section;
  const cancel = () => { cancelAnimationFrame(frame); frame = 0; };
  function conceal() {
    cancel();
    root.dataset.pathReveal = 'waiting';
    panel.inert = root.dataset.section === 'path';
  }
  function reveal() {
    cancel();
    if (!loaded || root.dataset.section !== 'path') return;
    if (['ready','leaving'].includes(root.dataset.pathReveal)) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!loaded || root.dataset.section !== 'path' || root.dataset.pathReveal==='leaving') return;
      if ((cameraFor(root)?.journeyProgress(performance.now()) ?? 1) < .75) { reveal(); return; }
      root.dataset.pathReveal = 'ready';
      panel.inert = false;
    });
  }
  function navigation() {
    if (lastSection === root.dataset.section) return;
    lastSection = root.dataset.section;
    conceal();
    reveal();
  }
  function cameraStarted() {
    if (root.dataset.section !== 'path') return;
    conceal();
    reveal();
  }
  const observer = new MutationObserver(navigation);
  observer.observe(root, {attributes:true, attributeFilter:['data-section']});
  root.addEventListener('camera-start', cameraStarted);
  root.addEventListener('camera-settled', reveal);
  conceal();
  return {
    ready() { loaded = true; reveal(); },
    dispose() {
      cancel(); observer.disconnect(); panel.inert = false;
      delete root.dataset.pathReveal;
      root.removeEventListener('camera-start', cameraStarted);
      root.removeEventListener('camera-settled', reveal);
    }
  };
}
