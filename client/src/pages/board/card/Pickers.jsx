import { useState } from 'react';
import { Pencil, Plus, Tag, Trash2, UserPlus } from 'lucide-react';
import Avatar from '../../../components/Avatar.jsx';
import Icon from '../../../components/Icon.jsx';
import Popover from '../../../components/Popover.jsx';
import { api, errorMessage } from '../../../lib/api.js';
import { LABEL_SWATCHES } from '../../../lib/labelColors.js';
import { toast } from '../../../lib/toast.js';
import { LabelChip } from '../BoardCard.jsx';

export function AssigneePicker({ members, selected, onChange, disabled }) {
  const toggle = (id) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  return (
    <Popover label="Assign people" className="btn btn-sm" trigger={<><Icon as={UserPlus} size={14} />Assign</>} width={280}>
      {() => (
        <ul className="pick-list" aria-label="Project members">
          {members.map((m) => (
            <li key={m.user.id}>
              <label className="pick-row">
                <input type="checkbox" checked={selected.includes(m.user.id)} disabled={disabled} onChange={() => toggle(m.user.id)} />
                <Avatar user={m.user} size={22} />
                <span className="pick-name">{m.user.name}</span>
                <span className="row-sub mono">@{m.user.username}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </Popover>
  );
}

function LabelForm({ initial, submitLabel, onSubmit, onCancel }) {
  const [name, setName] = useState(initial?.name || '');
  const [color, setColor] = useState(initial?.color || LABEL_SWATCHES[5]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return setError('Enter a name');
    setBusy(true);
    try {
      await onSubmit({ name: name.trim(), color });
    } catch (err) {
      setError(err.response?.data?.errors?.name || errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form className="label-form" onSubmit={submit} noValidate>
      <input className="input" value={name} maxLength={30} placeholder="Label name" aria-label="Label name" onChange={(e) => setName(e.target.value)} aria-invalid={error ? 'true' : undefined} data-autofocus />
      <div className="swatches" role="radiogroup" aria-label="Label colour">
        {LABEL_SWATCHES.map((c) => (
          <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={`Colour ${c}`} className={`swatch${color === c ? ' swatch-on' : ''}`} style={{ background: c }} onClick={() => setColor(c)} />
        ))}
      </div>
      {error && <span className="field-error">{error}</span>}
      <div className="row-actions" style={{ justifyContent: 'flex-start' }}>
        <button className="btn btn-primary btn-sm" disabled={busy}>
          {busy && <span className="spinner" aria-hidden="true" />}
          {submitLabel}
        </button>
        <button type="button" className="btn btn-sm btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function LabelPicker({ projectId, labels, selected, onChange, onLabelsChange, canCreate, canManage, disabled }) {
  const [mode, setMode] = useState({ kind: 'list' }); // list | create | edit
  const toggle = (id) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  async function create(values) {
    const { data } = await api.post(`/projects/${projectId}/labels`, values);
    onLabelsChange((ls) => [...ls, data.label].sort((a, b) => a.name.localeCompare(b.name)));
    setMode({ kind: 'list' });
  }
  async function edit(label, values) {
    const { data } = await api.patch(`/projects/${projectId}/labels/${label.id}`, values);
    onLabelsChange((ls) => ls.map((l) => (l.id === label.id ? data.label : l)));
    setMode({ kind: 'list' });
  }
  async function remove(label) {
    try {
      await api.delete(`/projects/${projectId}/labels/${label.id}`);
      onLabelsChange((ls) => ls.filter((l) => l.id !== label.id));
      if (selected.includes(label.id)) onChange(selected.filter((x) => x !== label.id));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <Popover label="Edit labels" className="btn btn-sm" trigger={<><Icon as={Tag} size={14} />Labels</>} width={290}>
      {() =>
        mode.kind === 'list' ? (
          <div>
            {labels.length === 0 && <p className="row-sub pick-empty">No labels yet.</p>}
            <ul className="pick-list" aria-label="Labels">
              {labels.map((l) => (
                <li key={l.id} className="pick-row-wrap">
                  <label className="pick-row">
                    <input type="checkbox" checked={selected.includes(l.id)} disabled={disabled} onChange={() => toggle(l.id)} />
                    <LabelChip label={l} />
                  </label>
                  {canManage && (
                    <>
                      <button type="button" className="icon-btn" aria-label={`Edit label ${l.name}`} onClick={() => setMode({ kind: 'edit', label: l })}>
                        <Icon as={Pencil} size={14} />
                      </button>
                      <button type="button" className="icon-btn" aria-label={`Delete label ${l.name}`} onClick={() => remove(l)}>
                        <Icon as={Trash2} size={14} />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
            {canCreate && (
              <button type="button" className="btn btn-sm btn-ghost pick-create" onClick={() => setMode({ kind: 'create' })}>
                <Icon as={Plus} size={14} />
                Create a label
              </button>
            )}
          </div>
        ) : mode.kind === 'create' ? (
          <LabelForm submitLabel="Create" onSubmit={create} onCancel={() => setMode({ kind: 'list' })} />
        ) : (
          <LabelForm initial={mode.label} submitLabel="Save" onSubmit={(v) => edit(mode.label, v)} onCancel={() => setMode({ kind: 'list' })} />
        )
      }
    </Popover>
  );
}

