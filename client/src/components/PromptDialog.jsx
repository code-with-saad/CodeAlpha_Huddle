import { useState } from 'react';
import Dialog from './Dialog.jsx';

// Single text field dialog used for renaming.
export default function PromptDialog({ title, label, initial = '', maxLength, submitLabel = 'Save', onSubmit, onClose }) {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    const v = value.trim();
    if (!v) return setError('Enter a name');
    if (v === initial) return onClose();
    setBusy(true);
    try {
      await onSubmit(v);
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save');
      setBusy(false);
    }
  }

  return (
    <Dialog title={title} onClose={onClose} narrow>
      <form className="stack" onSubmit={submit} noValidate>
        <label className="field">
          <span className="field-label">{label}</span>
          <input
            className="input"
            value={value}
            maxLength={maxLength}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={error ? 'true' : undefined}
            data-autofocus
          />
          {error && <span className="field-error">{error}</span>}
        </label>
        <div className="row-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={busy}>
            {busy && <span className="spinner" aria-hidden="true" />}
            {submitLabel}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
