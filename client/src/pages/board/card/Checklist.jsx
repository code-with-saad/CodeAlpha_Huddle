import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import Icon from '../../../components/Icon.jsx';

export default function Checklist({ card, canEdit, onToggle, onAdd, onRemove }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const { done, total } = card.checklist;
  const pct = total ? Math.round((done / total) * 100) : 0;

  async function add(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    setText('');
    if (!(await onAdd(t))) setText(t);
    setBusy(false);
  }

  return (
    <section className="sheet-section" aria-labelledby="cl-title">
      <div className="section-head">
        <h3 id="cl-title">Checklist</h3>
        {total > 0 && (
          <span className="mono row-sub">
            {done}/{total}
          </span>
        )}
      </div>
      {total > 0 && (
        <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Checklist progress">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      )}
      <ul className="check-list">
        {card.checklistItems.map((i) => (
          <li key={i.id} className="check-row">
            <label>
              <input type="checkbox" checked={i.done} disabled={!canEdit} onChange={() => onToggle(i)} />
              <span className={i.done ? 'check-done' : ''}>{i.text}</span>
            </label>
            {canEdit && (
              <button type="button" className="icon-btn" aria-label={`Delete item ${i.text}`} onClick={() => onRemove(i)}>
                <Icon as={Trash2} size={14} />
              </button>
            )}
          </li>
        ))}
      </ul>
      {canEdit && (
        <form className="inline-form" onSubmit={add}>
          <input className="input" value={text} maxLength={200} placeholder="Add an item" aria-label="New checklist item" onChange={(e) => setText(e.target.value)} />
          <button className="btn btn-sm" disabled={busy || !text.trim()}>
            Add
          </button>
        </form>
      )}
    </section>
  );
}
