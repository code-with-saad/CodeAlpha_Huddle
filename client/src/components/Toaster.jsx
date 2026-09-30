import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import Icon from './Icon.jsx';
import { dismiss, subscribe } from '../lib/toast.js';

export default function Toaster() {
  const [items, setItems] = useState([]);
  const ref = useRef(null);
  useEffect(() => subscribe(setItems), []);

  // A modal <dialog> sits in the browser top layer and would hide toasts behind it. Showing the toaster
  // as a manual popover puts it in the top layer too, and re-showing it moves it above any dialog opened later.
  useEffect(() => {
    const el = ref.current;
    if (!el?.showPopover) return;
    if (el.matches(':popover-open')) el.hidePopover();
    if (items.length) el.showPopover();
  }, [items]);

  return (
    <div ref={ref} popover="manual" className="toaster">
      {items.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'}>
          <span className="toast-text">{t.message}</span>
          {t.action && (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                dismiss(t.id);
                t.action.onClick();
              }}
            >
              {t.action.label}
            </button>
          )}
          <button type="button" className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
            <Icon as={X} />
          </button>
        </div>
      ))}
    </div>
  );
}
