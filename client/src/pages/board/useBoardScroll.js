import { useCallback, useEffect, useState } from 'react';

// Helps a wide board be reachable without hunting for the scrollbar: arrow buttons that appear when there is
// more to see, and the mouse wheel (or a trackpad swipe) scrolling sideways when the pointer is over empty board space.
export default function useBoardScroll() {
  // A callback ref: the board is not rendered until its data has loaded, so the listeners must attach when it appears.
  const [el, setEl] = useState(null);
  const [state, setState] = useState({ prev: false, next: false });

  const measure = useCallback(() => {
    if (!el) return;
    const prev = el.scrollLeft > 4;
    const next = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setState((s) => (s.prev === prev && s.next === next ? s : { prev, next }));
  }, [el]);

  useEffect(() => {
    if (!el) return;
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    [...el.children].forEach((c) => ro?.observe(c));
    window.addEventListener('resize', measure);

    // A vertical wheel over the gaps between columns moves the board sideways. Over a column's task list the wheel
    // keeps scrolling that list, and Shift plus the wheel already works natively.
    const onWheel = (e) => {
      if (e.ctrlKey || Math.abs(e.deltaY) <= Math.abs(e.deltaX) || e.target.closest('.column-cards, .menu, .popover')) return;
      if (el.scrollWidth <= el.clientWidth) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('scroll', measure);
      el.removeEventListener('wheel', onWheel);
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [el, measure]);

  // Re-measure after the columns change (a column was added, or the board finished loading).
  const remeasure = useCallback(() => requestAnimationFrame(measure), [measure]);

  const by = (dir) => el?.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.7), behavior: 'smooth' });
  return { ref: setEl, ...state, by, remeasure };
}
