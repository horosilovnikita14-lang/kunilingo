// Keep layout reads outside the animation loop. The canvas has a fixed CSS
// viewport; resizing its drawing buffer does not change these dimensions.
export function observeRenderSize(canvas, Observer = ResizeObserver) {
  const rect = canvas.getBoundingClientRect();
  const size = {width: rect.width, height: rect.height};
  const observer = new Observer(entries => {
    const entry = entries.find(item => item.target === canvas);
    if (!entry) return;
    size.width = entry.contentRect.width;
    size.height = entry.contentRect.height;
  });
  observer.observe(canvas);
  return {size, dispose: () => observer.disconnect()};
}

// The ink texture includes the notebook itself. Keep a small safety margin
// for filtering and its contact shadow, and refresh before it enters the view.
export function notebookVisible(view, offset, crop, margin = 8) {
  const left = crop.x + offset[0] - margin;
  const top = crop.y + offset[1] - margin;
  return view.left <= left + crop.width + margin * 2
    && view.left + view.width >= left
    && view.top <= top + crop.height + margin * 2
    && view.top + view.height >= top;
}
