import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Anchored panel for pickers that stay open while you click inside (assignees, labels).
// children is a function so content can close the panel itself.
export default function Popover({ label, trigger, className = 'btn btn-sm', children, width = 260 }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btn = useRef(null);
  const panel = useRef(null);
  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) btn.current?.focus();
  }, []);

  const place = useCallback(() => {
    if (!btn.current || !panel.current) return;
    const r = btn.current.getBoundingClientRect();
    const p = panel.current.getBoundingClientRect();
    const margin = 8;
    const left = Math.max(margin, Math.min(r.left, window.innerWidth - p.width - margin));
    const below = r.bottom + 4;
    const top = below + p.height > window.innerHeight - margin ? Math.max(margin, r.top - p.height - 4) : below;
    // Only update when the spot changed, otherwise this effect would re-render forever.
    setPos((prev) => (prev && prev.left === left && prev.top === top ? prev : { left, top }));
  }, []);

  // Runs after every render so the panel follows content changes (for example the create form opening).
  useLayoutEffect(() => {
    if (open) place();
  });

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!panel.current?.contains(e.target) && !btn.current?.contains(e.target)) close(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        // preventDefault stops the surrounding <dialog> from also treating Escape as its own cancel.
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', place);
    };
  }, [open, close, place]);

  // The panel is portalled to the body so the card sheet never clips it; when the sheet itself
  // is a modal <dialog>, it has to live inside the dialog to be interactive.
  const host = btn.current?.closest('dialog') || document.body;

  return (
    <>
      <button ref={btn} type="button" className={className} aria-haspopup="dialog" aria-expanded={open} aria-label={label} onClick={() => setOpen((o) => !o)}>
        {trigger}
      </button>
      {open &&
        createPortal(
          <div
            ref={panel}
            className="popover"
            role="dialog"
            aria-label={label}
            style={{ width, ...(pos ? { left: pos.left, top: pos.top } : { left: 0, top: 0, visibility: 'hidden' }) }}
          >
            {children(close)}
          </div>,
          host
        )}
    </>
  );
}
