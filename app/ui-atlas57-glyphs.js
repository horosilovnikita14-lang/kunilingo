// Two printing inks and cut-out counters keep the symbols legible at either size.
const accent = 'var(--glyph-accent,currentColor)';
const plates = Object.freeze({
  path: `
    <path d="M5 33h25.5c2.2 0 3.5-1.2 3.5-3s-1.3-3-3.5-3H17c-6.8 0-11-4.1-11-10s4.2-10 11-10h10v6H17c-2.8 0-4.5 1.5-4.5 4s1.7 4 4.5 4h13.5c6.4 0 10 3.7 10 9s-3.6 9-10 9H5Z"/>
    <path fill="${accent}" d="M29 7h4.5V2.7l10.2 7.2-10.2 7.5V13H29Z"/>
  `,
  practice: `
    <path d="m28.5 12.4 6.6 6.6-7.8 11.2-16.5 6 7.9-7.9a3 3 0 1 0-1.8-1.8l-7.9 7.9 6.1-16.2Z"/>
    <path fill="${accent}" d="m30.4 10.1 5.9-5.9c.7-.7 1.8-.7 2.5 0l4.1 4.1c.7.7.7 1.8 0 2.5l-5.9 5.9Z"/>
    <path d="m8.8 38.6 17.2-2.4 14.8.2-3.3 3.9-14.1-1-18.8 2.4Z"/>
  `,
  progress: `
    <path d="m5 15 4.6-2.7 13 22.5-3.9 4.2Z"/>
    <path fill="${accent}" d="m12 9.2 6.6-2.1L27 31.4 23.5 35Z"/>
    <path fill-rule="evenodd" d="M22 5h10V3h8v28.5L27.8 40l-4.6-3.4 5.6-5.7ZM28.7 10l.9 3.2h6.5V10Zm1.7 6.5.9 3h4.8v-3Z"/>
  `
});

export function glyph(section) {
  if (!Object.hasOwn(plates, section)) throw new RangeError('Unknown atlas glyph: ' + section);
  return `<svg class="atlas-glyph" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" fill="currentColor" stroke="none" aria-hidden="true" focusable="false">${plates[section]}</svg>`;
}
