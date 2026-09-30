import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Dropdown menu rendered in a portal so scrolling columns never clip it. Keyboard: arrows, Home/End, Escape.
// items: { label, onSelect, disabled, danger } | { heading } | { separator: true }
export default function Menu({ label, trigger, items, className = 'icon-btn' }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btn = useRef(null);
  const panel = useRef(null);

  const close = useCallback((refocus = false) => {
    setOpen(false);
    if (refocus) btn.current?.focus();
  }, []);

  // Keeps the panel next to its button, flipping above it when there is no room below.
  const place = useCallback(() => {
    if (!btn.current || !panel.current) return;
    const r = btn.current.getBoundingClientRect();
    const p = panel.current.getBoundingClientRect();
    const margin = 8;
    const left = Math.max(margin, Math.min(r.right - p.width, window.innerWidth - p.width - margin));
    const below = r.bottom + 4;
    const top = below + p.height > window.innerHeight - margin ? Math.max(margin, r.top - p.height - 4) : below;
    setPos((prev) => (prev && prev.left === left && prev.top === top ? prev : { left, top }));
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, items.length, place]);

  useEffect(() => {
    if (!open) return;
    const items = panel.current?.querySelectorAll('[role=menuitem]:not([disabled])');
    items?.[0]?.focus();
    const onDown = (e) => {
      if (!panel.current?.contains(e.target) && !btn.current?.contains(e.target)) close();
    };
    // Scrolling (including a board settling after a tap) moves the button, so follow it instead of closing.
    const onScroll = (e) => {
      if (!panel.current?.contains(e.target)) place();
    };
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', close);
    };
  }, [open, close, place]);

  function onKeyDown(e) {
    const els = [...panel.current.querySelectorAll('[role=menuitem]:not([disabled])')];
    const i = els.indexOf(document.activeElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close(true);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      els[(i + 1) % els.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      els[(i - 1 + els.length) % els.length]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      els[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      els.at(-1)?.focus();
    } else if (e.key === 'Tab') {
      close();
    }
  }

  return (
    <>
      <button
        ref={btn}
        type="button"
        className={className}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setPos(null);
          setOpen((o) => !o);
        }}
      >
        {trigger}
      </button>
      {open &&
        createPortal(
          <div
            ref={panel}
            className="menu"
            role="menu"
            aria-label={label}
            onKeyDown={onKeyDown}
            onClick={(e) => e.stopPropagation()}
            style={pos ? { left: pos.left, top: pos.top } : { left: 0, top: 0, visibility: 'hidden' }}
          >
            {items.map((item, i) =>
              item.separator ? (
                <div key={i} className="menu-sep" role="separator" />
              ) : item.heading ? (
                <div key={i} className="menu-heading" role="presentation">
                  {item.heading}
                </div>
              ) : (
                <button
                  key={i}
                  type="button"
                  role="menuitem"
                  className={`menu-item${item.danger ? ' menu-danger' : ''}`}
                  disabled={item.disabled}
                  onClick={() => {
                    close(true);
                    item.onSelect();
                  }}
                >
                  {item.label}
                </button>
              )
            )}
          </div>,
          btn.current?.closest('dialog') || document.body
        )}
    </>
  );
}
