import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import Icon from './Icon.jsx';

// Modal built on the native <dialog>: focus is trapped, Escape closes, and a click on the backdrop closes.
export default function Dialog({ title, onClose, children, footer, narrow = false }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (el && !el.open) el.showModal();
    // showModal focuses the first control (the close button); move focus to the intended one instead.
    el?.querySelector('[data-autofocus]')?.focus();
    return () => el?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className={`dialog${narrow ? ' dialog-narrow' : ''}`}
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      <div className="dialog-head">
        <h2 id="dialog-title">{title}</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
          <Icon as={X} size={18} />
        </button>
      </div>
      <div className="dialog-body">{children}</div>
      {footer && <div className="dialog-foot">{footer}</div>}
    </dialog>
  );
}

// Destructive actions confirm in-app. Focus starts on Cancel so a stray Enter never confirms.
export function ConfirmDialog({ title, message, confirmLabel, danger = false, busy = false, onConfirm, onClose }) {
  return (
    <Dialog
      title={title}
      onClose={onClose}
      narrow
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} data-autofocus>
            Cancel
          </button>
          <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>
            {busy && <span className="spinner" aria-hidden="true" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <p>{message}</p>
    </Dialog>
  );
}
