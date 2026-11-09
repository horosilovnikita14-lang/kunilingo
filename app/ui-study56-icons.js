// Original, code-native symbols for the interface study only. Shared grammar:
// a 24 px grid, 1.5 px round strokes, open corners and one short accent mark.
// Labels belong to the enclosing control; these decorative SVGs stay hidden
// from assistive technology. No third-party icon pack is used.
const symbols = Object.freeze({
  account: '<circle cx="12" cy="7.5" r="3.5"/><path d="M4.5 21v-2.5a7.5 7.5 0 0 1 15 0V21"/>',
  feedback: '<path d="M4 4.5h16v12H10l-6 4z"/><path d="M8 8.5h8M8 12.5h5"/>',
  replay: '<path d="M7 5H4v4M4 8c1.5-3 5.4-4.7 8.8-3.6a7.5 7.5 0 1 1-3.4 14.5"/><path class="icon-accent" d="m8 15 5.8-6 1.7 1.7-5.9 5.9-2.2.5Z"/>',
  timeline: '<path d="M3.5 7v10M20.5 7v10M4 12h6m4 0h6"/><rect class="icon-accent" x="10.1" y="8.4" width="3.8" height="7.2" rx="1"/>',
  path: '<path d="M5 19.5v-4a3 3 0 0 1 3-3h8a3 3 0 0 0 3-3v-5"/><path d="m15.5 7.5 3.5-3.5 3 3.5"/><path class="icon-accent" d="M3 20h4"/>',
  practice: '<path d="M8 3.5H16l4 4v13H8a4 4 0 0 1-4-4v-9"/><path d="M16 3.5v4h4M8 3.5v13a2 2 0 0 1-4 0"/><path class="icon-accent" d="m11 13 1.5 1.5 3-3M11 17.5h5"/>',
  progress: '<path d="M3.5 14h5v7L6 19.5 3.5 21ZM9.5 9h5v7L12 14.5 9.5 16Z"/><path class="icon-accent" d="M15.5 4h5v7L18 9.5 15.5 11Z"/>',
  room: '<path d="M4 20V4h16v16M4 11h16M12 4v7M4 20h4m8 0h4"/><path class="icon-accent" d="M10 17h4v3"/>',
  music: '<path d="M9 17.5v-12l11-2v12M9 9l11-2"/><path d="M9 17.5c0 1.4-1.5 2.5-3.2 2.5S3 19.2 3 18s1.5-2.5 3.2-2.5c1.1 0 2 .3 2.8 1"/><path class="icon-accent" d="M20 15.5c0 1.4-1.5 2.5-3.2 2.5s-2.8-.8-2.8-2 1.5-2.5 3.2-2.5c1.1 0 2 .3 2.8 1"/>',
  motion: '<path d="M4 8.5c2.5-4 5.5-4 8 0s5.5 4 8 0M4 15.5c2.5-4 5.5-4 8 0s5.5 4 8 0"/><path class="icon-accent" d="m17 8.5 3 .1.5-3"/>',
  volume: '<path d="M10.5 5 6 9H3.5v6H6l4.5 4ZM15 8.5a5 5 0 0 1 0 7"/><path class="icon-accent" d="M18 5.5a9 9 0 0 1 0 13"/>',
  settings: '<path d="M4 6h3m5 0h8M4 12h9m5 0h2M4 18h3m5 0h8"/><path d="M7 3.5h5v5H7ZM13 9.5h5v5h-5Z"/><path class="icon-accent" d="M7 15.5h5v5H7Z"/>',
  close: '<path d="m6.5 6.5 11 11m0-11-11 11"/>',
  back: '<path d="m10 5-7 7 7 7M3 12h17"/>',
  forward: '<path d="m14 5 7 7-7 7M21 12H4"/>',
  check: '<path d="m4.5 12 5 5 10-10"/>',
  play: '<path d="m8 4.5 11 7.5L8 19.5Z"/>',
  pause: '<path d="M8 5v14m8-14v14"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  expand: '<path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4"/>',
  pencil: '<path d="m4 20 1-5L16 4a2.1 2.1 0 0 1 3 3L8 18ZM14 6l4 4M5 15l3 3"/>',
  eraser: '<path d="m4 13 9-9a2 2 0 0 1 3 0l4 4a2 2 0 0 1 0 3l-8 9H8l-4-4a2 2 0 0 1 0-3ZM9 8l8 8M12 20h8"/>',
  undo: '<path d="M9 5 4 10l5 5M4 10h9a6 6 0 0 1 0 12"/>',
  redo: '<path d="m15 5 5 5-5 5m5-5h-9a6 6 0 0 0 0 12"/>'
});

export const iconNames = Object.freeze(Object.keys(symbols));

export function icon(name, className = '') {
  if (!Object.hasOwn(symbols, name)) throw new RangeError(`Unknown study icon: ${name}`);
  const safeClass = String(className).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
  return `<svg class="study-icon ${safeClass}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${symbols[name]}</svg>`;
}
