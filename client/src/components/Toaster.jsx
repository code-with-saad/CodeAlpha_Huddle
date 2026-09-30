import { useEffect, useRef, useState } from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import { toast } from '../lib/toast.js';
import Icon from './Icon.jsx';
import { dismiss, subscribe } from '../lib/toast.js';

const ICON = { success: CircleCheck, info: Info, warning: TriangleAlert, error: CircleAlert };

export default function Toaster() {
  const [items, setItems] = useState([]);
  const ref = useRef(null);
  useEffect(() => subscribe(setItems), []);

  // The browser losing and regaining its connection is worth saying out loud.
  useEffect(() => {
    const off = () => toast.warning('You are offline. Changes will not save until the connection is back.');
    const on = () => toast.success('Back online.');
    window.addEventListener('offline', off);
    window.addEventListener('online', on);
    return () => {
      window.removeEventListener('offline', off);
      window.removeEventListener('online', on);
    };
  }, []);

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
        <div key={t.id} className={`toast toast-${t.kind}`} role={t.kind === 'error' || t.kind === 'warning' ? 'alert' : 'status'}>
          <span className="toast-icon">
            <Icon as={ICON[t.kind]} size={16} />
          </span>
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
