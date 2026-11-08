// Small single-ink drawings for the tracing-paper tabs. The pinholes and
// split nib show the tab material through the mark in either colour state.
const marks = Object.freeze({
  path: `
    <path fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"
      stroke-dasharray="1.3 2.25" d="M8.2 20.9c4.3-.3 8.6-1.4 8.6-4.1 0-2.8-5.8-2.7-5.8-5.1 0-1.8 2.6-2.9 5.2-3.4"/>
    <path fill-rule="evenodd" d="M5.5 22.8c-.6-1.3-3.8-5.1-3.8-7.8a3.8 3.8 0 1 1 7.6 0c0 2.7-3.1 6.5-3.8 7.8Zm0-9.3a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8ZM19.4 11.2c-.8-1.4-3.5-4.8-3.5-7a3.5 3.5 0 1 1 7 0c0 2.2-2.8 5.8-3.5 7Zm0-8.2a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Z"/>`,
  practice: `
    <g transform="rotate(40 12 12)">
      <path d="M10.3.6h3.4l1.2 5.1H9.1Z"/>
      <path d="M8.7 6.8h6.6l3 6.3-5.8 10.2v-8.8a1.8 1.8 0 1 0-1 0v8.8L5.7 13.1Z"/>
    </g>`,
  progress: `
    <g fill="none" stroke="currentColor" stroke-width="3.65" stroke-linecap="round">
      <path opacity=".63" d="m3.6 19.5.1-1.9"/>
      <path opacity=".75" d="m9.1 19.5.1-6.2"/>
      <path opacity=".88" d="m14.7 19.5-.1-10.9"/>
      <path d="m20.3 19.5.1-15.9"/>
    </g>`
});

export function vellumIcon(section) {
  if (!Object.hasOwn(marks, section)) throw new RangeError('Unknown vellum icon: ' + section);
  return `<svg class="vellum-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" stroke="none" aria-hidden="true" focusable="false">${marks[section]}</svg>`;
}
