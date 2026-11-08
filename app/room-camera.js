import {courtyardFrame} from './courtyard45.js';
import {WORLD} from './quality44.js';

export function sourceFrame(section, width, height) {
  const aspect = Math.max(1, width) / Math.max(1, height);
  if (section === 'path') return courtyardFrame('balanced', width, height);
  if (section === 'progress') {
    const w = Math.min(994, 560 * aspect);
    return {left: 1715 - w / 2, top: -105, width: w, height: w / aspect};
  }
  if (section === 'practice') {
    const w = Math.min(Math.max(766, 400 * aspect), 1672, 941 * aspect);
    const h = w / aspect;
    return {left: Math.max(0, 383 - w / 2), top: Math.max(0, Math.min(941 - h, 545.5 - h / 2)), width: w, height: h};
  }
  const w = Math.min(1672, 941 * aspect);
  return {left: (1672 - w) / 2, top: (941 - w / aspect) / 2, width: w, height: w / aspect};
}

// Interpolate magnification geometrically. Position follows the same fraction
// so a fixed painted point travels along a straight path during a zoom.
export function mixFrames(from, to, progress) {
  if (progress <= 0) return from;
  if (progress >= 1) return to;
  const width = from.width * (to.width / from.width) ** progress;
  const fraction = Math.abs(to.width - from.width) < 0.001
    ? progress : (width - from.width) / (to.width - from.width);
  return {
    left: from.left + (to.left - from.left) * fraction,
    top: from.top + (to.top - from.top) * fraction,
    width,
    height: from.height + (to.height - from.height) * fraction
  };
}

const cameras = new WeakMap();
export const cameraFor = root => cameras.get(root);

// Fractions of the visible frame, not the full painting: identical strength
// at every zoom. The fixed inset leaves a margin even at the pointer corners.
export function cursorFrame(base, x, y) {
  const width = base.width / 1.02, height = base.height / 1.02;
  return {
    left: base.left + (base.width - width) / 2 + Math.max(-1, Math.min(1, x)) * .0072 * width,
    top: base.top + (base.height - height) / 2 + Math.max(-1, Math.min(1, y)) * .0072 * height,
    width, height
  };
}

export function createCursorMotion(now = 0) {
  let x = 0, y = 0, targetX = 0, targetY = 0, last = now;
  function sample(time) {
    const alpha = 1 - Math.exp(-Math.max(0, time - last) / 180);
    last = time;
    x += (targetX - x) * alpha;
    y += (targetY - y) * alpha;
    if (Math.abs(targetX - x) < .0001) x = targetX;
    if (Math.abs(targetY - y) < .0001) y = targetY;
    return {x, y};
  }
  return {
    sample,
    target(a, b, time) {
      // Advance against the OLD target first, including after an idle pause.
      sample(time);
      targetX = Math.max(-1, Math.min(1, a));
      targetY = Math.max(-1, Math.min(1, b));
    },
    reset(time) { x = y = targetX = targetY = 0; last = time; },
    active: () => x !== targetX || y !== targetY
  };
}

export function attachRoomCamera(root, stage, viewport) {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(any-hover: hover) and (any-pointer: fine)');
  const cursor = createCursorMotion(performance.now());
  const toggle = root.querySelector('#parallaxToggle');
  let enabled = true;
  let bounds = viewport.getBoundingClientRect();
  const canSway = () => !motion.matches && pointer.matches;
  const layers = [...stage.querySelectorAll('#fallback,.shelf-atmosphere,.hotspots')];
  for (const layer of layers) {
    const backdrop = layer.id === 'fallback';
    layer.style.width = (backdrop ? WORLD.width : 1672) + 'px';
    layer.style.height = (backdrop ? WORLD.height : 941) + 'px';
  }
  // The camera may lead the UI by its outgoing fade. Keep its destination
  // independent from the still-mounted workspace, including during resize.
  let section = root.dataset.section;
  const target = () => sourceFrame(section, bounds.width, bounds.height);
  let from = target(), to = from, start = -Infinity, fallbackRaf = 0, lastTransform = '';
  const duration = 1600;
  let journeyPending = false;
  const journeyActive = now => !motion.matches && now < start + duration;
  const journeyProgress = now => motion.matches ? 1 : Math.max(0, Math.min(1, (now - start) / duration));
  function finishJourney(now) {
    if (!journeyPending || journeyActive(now)) return;
    journeyPending = false;
    root.dispatchEvent(new Event('camera-settled'));
  }
  function sampleBase(now) {
    const t = motion.matches ? 1 : Math.min(1, Math.max(0, (now - start) / duration));
    return mixFrames(from, to, t*t*t*(t*(6*t - 15) + 10));
  }
  function active(now) {
    return !motion.matches && (now < start + duration || (canSway() && cursor.active()));
  }
  function sample(now) {
    const base = sampleBase(now), offset = cursor.sample(now);
    const frame = canSway() ? cursorFrame(base, offset.x, offset.y) : base;
    const scale = bounds.width / frame.width;
    const x = -frame.left * scale, y = -frame.top * scale;
    const transform = `translate(${x}px,${y}px) scale(${scale})`;
    if (transform !== lastTransform) {
      for (const layer of layers) {
        layer.style.transform = layer.id === 'fallback'
          ? `translate(${x}px,${y + WORLD.top * scale}px) scale(${scale})` : transform;
      }
      lastTransform = transform;
    }
    finishJourney(now);
    return frame;
  }
  function drawFallback(now) {
    fallbackRaf = 0;
    if (root.classList.contains('ready')) return;
    sample(now);
    if (active(now)) fallbackRaf = requestAnimationFrame(drawFallback);
  }
  function requestDraw() {
    root.dispatchEvent(new Event('camera-change'));
    if (!fallbackRaf && !root.classList.contains('ready')) fallbackRaf = requestAnimationFrame(drawFallback);
  }
  function moveTo(nextSection,{announce=true}={}) {
    nextSection=nextSection||'';
    // Committing the workspace after its fade must not restart this journey.
    if (section === nextSection) return;
    section = nextSection;
    const now = performance.now();
    // Cursor motion must never accumulate into the navigation trajectory.
    from = sampleBase(now);
    to = target();
    start = now;
    journeyPending = true;
    // A preflight camera move leaves the outgoing sheet in its reverse fade.
    // Its incoming counterpart observes the later section commit itself.
    if(announce)root.dispatchEvent(new Event('camera-start'));
    requestDraw();
  }
  function navigate() {moveTo(root.dataset.section);}
  function resize() {
    const next = viewport.getBoundingClientRect();
    const changed = bounds.width !== next.width || bounds.height !== next.height;
    bounds = next;
    if (!changed) return;
    from = to = target();
    start = -Infinity;
    cursor.reset(performance.now());
    sample(performance.now());
    requestDraw();
  }
  function move(event) {
    if (!enabled || !canSway() || event.pointerType !== 'mouse' || document.hidden) return;
    cursor.target(
      (event.clientX - bounds.left) / Math.max(1, bounds.width) * 2 - 1,
      (event.clientY - bounds.top) / Math.max(1, bounds.height) * 2 - 1,
      performance.now()
    );
    requestDraw();
  }
  function leave() {
    cursor.target(0, 0, performance.now());
    requestDraw();
  }
  function syncToggle() {
    if (!toggle) return;
    toggle.disabled = !canSway();
    toggle.setAttribute('aria-pressed', String(enabled && canSway()));
  }
  function toggleSway() {
    enabled = !enabled;
    leave();
    syncToggle();
  }
  function preferenceChanged() {
    cursor.reset(performance.now());
    syncToggle();
    requestDraw();
  }
  function visibilityChanged() {
    cursor.reset(performance.now());
    if (!document.hidden) requestDraw();
  }
  cameras.set(root, {sample, active, journeyActive, journeyProgress, moveTo});
  sample(performance.now());
  syncToggle();
  root.addEventListener('pointermove', move, {passive: true});
  root.addEventListener('pointerleave', leave);
  window.addEventListener('blur', leave);
  window.addEventListener('scroll', resize, {passive: true});
  document.addEventListener('visibilitychange', visibilityChanged);
  motion.addEventListener('change', preferenceChanged);
  pointer.addEventListener('change', preferenceChanged);
  toggle?.addEventListener('click', toggleSway);
  const navigation = new MutationObserver(navigate);
  navigation.observe(root, {attributes: true, attributeFilter: ['data-section']});
  const size = new ResizeObserver(resize);
  size.observe(viewport);
  return () => {
    navigation.disconnect();
    size.disconnect();
    cancelAnimationFrame(fallbackRaf);
    root.removeEventListener('pointermove', move);
    root.removeEventListener('pointerleave', leave);
    window.removeEventListener('blur', leave);
    window.removeEventListener('scroll', resize);
    document.removeEventListener('visibilitychange', visibilityChanged);
    motion.removeEventListener('change', preferenceChanged);
    pointer.removeEventListener('change', preferenceChanged);
    toggle?.removeEventListener('click', toggleSway);
    cameras.delete(root);
  };
}
