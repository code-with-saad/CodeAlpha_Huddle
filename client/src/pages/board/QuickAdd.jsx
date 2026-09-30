import { useState } from 'react';
import Dialog from '../../components/Dialog.jsx';
import { errorMessage } from '../../lib/api.js';
import { toast } from '../../lib/toast.js';
import { api as http } from '../../lib/api.js';
import { useBoardCtx } from './BoardContext.jsx';

// Create a task from anywhere in the board views: the New task button, the "c" shortcut and the palette.
export default function QuickAdd({ initial = {}, onClose }) {
  const ctx = useBoardCtx();
  const columns = ctx.board.columns;
  const [title, setTitle] = useState('');
  const [columnId, setColumnId] = useState(initial.columnId || columns[0]?.id || '');
  const [due, setDue] = useState(initial.dueDate || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return setError('Enter a title');
    setBusy(true);
    try {
      const { data } = await http.post(`/projects/${ctx.project.id}/cards`, { columnId, title: t });
      ctx.applyLocal('card.upsert', { card: data.card });
      if (due) await http.patch(`/projects/${ctx.project.id}/cards/${data.card.id}`, { dueDate: due }).then(() => ctx.reload());
      toast.success(`Created "${t}"`);
      onClose();
    } catch (err) {
      setError(err.response?.data?.errors?.title || errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Dialog title="New task" onClose={onClose}>
      <form className="stack" onSubmit={submit} noValidate>
        <label className="field">
          <span className="field-label">Title</span>
          <input className="input" value={title} maxLength={200} data-autofocus onChange={(e) => setTitle(e.target.value)} aria-invalid={error ? 'true' : undefined} />
          {error && <span className="field-error">{error}</span>}
        </label>
        <div className="inline-form">
          <label className="field">
            <span className="field-label">Column</span>
            <select className="input" value={columnId} onChange={(e) => setColumnId(e.target.value)}>
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Due date (optional)</span>
            <input className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
        </div>
        <div className="row-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={busy}>
            {busy && <span className="spinner" aria-hidden="true" />}
            Create task
          </button>
        </div>
      </form>
    </Dialog>
  );
}
