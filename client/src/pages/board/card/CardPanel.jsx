import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Trash2, X } from 'lucide-react';
import Avatar from '../../../components/Avatar.jsx';
import Icon from '../../../components/Icon.jsx';
import Markdown from '../../../components/Markdown.jsx';
import { useAuth } from '../../../lib/auth.jsx';
import { dueInfo } from '../../../lib/date.js';
import { atLeast } from '../../../lib/roles.js';
import useCard from '../../../lib/useCard.js';
import { useProject } from '../../ProjectLayout.jsx';
import { LabelChip, PRIORITY_LABEL, PriorityMark } from '../BoardCard.jsx';
import Attachments from './Attachments.jsx';
import Checklist from './Checklist.jsx';
import Comments from './Comments.jsx';
import { AssigneePicker, LabelPicker } from './Pickers.jsx';
import './card.css';

function Title({ value, canEdit, onSave }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  if (!canEdit) return <h2 className="sheet-title">{value}</h2>;
  return (
    <textarea
      className="sheet-title sheet-title-input"
      value={text}
      rows={1}
      maxLength={200}
      aria-label="Card title"
      onChange={(e) => setText(e.target.value.replace(/\n/g, ' '))}
      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), e.currentTarget.blur())}
      onBlur={() => {
        const t = text.trim();
        if (!t) setText(value);
        else if (t !== value) onSave(t);
      }}
    />
  );
}

function Description({ value, canEdit, usernames, onSave }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const ok = await onSave(text);
    setBusy(false);
    if (ok) setEditing(false);
  }

  return (
    <section className="sheet-section" aria-labelledby="ds-title">
      <div className="section-head">
        <h3 id="ds-title">Description</h3>
        {canEdit && !editing && (
          <button type="button" className="btn btn-sm" onClick={() => { setText(value); setEditing(true); }}>
            {value ? 'Edit' : 'Add'}
          </button>
        )}
      </div>
      {editing ? (
        <div className="stack">
          <textarea
            className="input"
            rows={8}
            maxLength={10000}
            value={text}
            autoFocus
            aria-label="Description in markdown"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save();
              if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setEditing(false); }
            }}
          />
          <p className="row-sub">Markdown is supported. Use @username to mention someone.</p>
          <div className="row-actions" style={{ justifyContent: 'flex-start' }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={busy}>
              {busy && <span className="spinner" aria-hidden="true" />}
              Save
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : value ? (
        <Markdown text={value} usernames={usernames} />
      ) : (
        <p className="row-sub">No description.</p>
      )}
    </section>
  );
}

export default function CardPanel({ cardId, board, onClose, onCardChange, onArchive }) {
  const { user: me } = useAuth();
  const { project } = useProject();
  const ref = useRef(null);
  const canEdit = atLeast(project.myRole, 'member') && !project.archived;
  const isAdmin = atLeast(project.myRole, 'admin');
  const card = useCard(project.id, cardId, onCardChange);
  const usernames = useMemo(() => new Set(project.members.map((m) => m.user.username)), [project.members]);
  const people = project.members.map((m) => m.user);

  useEffect(() => {
    const el = ref.current;
    if (el && !el.open) el.showModal();
    return () => el?.close();
  }, []);

  const d = card.data;
  const due = d ? dueInfo(d.card.dueDate) : null;
  const labels = board.labels;

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-label="Card details"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      <div className="sheet-bar">
        <span className="row-sub">{d ? `Column: ${board.columns.find((c) => c.id === d.card.column)?.name || 'unknown'}` : ''}</span>
        <div className="sheet-bar-actions">
          {canEdit && d && (
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => onArchive(d.card)}>
              <Icon as={Trash2} size={14} />
              Archive
            </button>
          )}
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close card">
            <Icon as={X} size={18} />
          </button>
        </div>
      </div>

      {card.error && (
        <div className="sheet-body">
          <p className="form-error" role="alert">
            {card.error.status === 404 ? 'This card was archived or does not exist.' : card.error.message}
          </p>
        </div>
      )}
      {!d && !card.error && (
        <div className="loading" role="status" aria-label="Loading card">
          <span className="spinner" />
        </div>
      )}

      {d && (
        <div className="sheet-body">
          <Title value={d.card.title} canEdit={canEdit} onSave={(title) => card.patch({ title })} />

          <dl className="fields">
            <div className="field-row">
              <dt>Assignees</dt>
              <dd>
                {d.card.assignees.map((id) => {
                  const p = people.find((x) => x.id === id);
                  return p ? (
                    <span key={id} className="person-chip">
                      <Avatar user={p} size={20} />
                      {p.name}
                    </span>
                  ) : null;
                })}
                {d.card.assignees.length === 0 && !canEdit && <span className="row-sub">Nobody</span>}
                {canEdit && <AssigneePicker members={project.members} selected={d.card.assignees} onChange={(assignees) => card.patch({ assignees })} />}
              </dd>
            </div>
            <div className="field-row">
              <dt>Labels</dt>
              <dd>
                {d.card.labels.map((id) => labels.find((l) => l.id === id)).filter(Boolean).map((l) => (
                  <LabelChip key={l.id} label={l} />
                ))}
                {d.card.labels.length === 0 && !canEdit && <span className="row-sub">None</span>}
                {canEdit && (
                  <LabelPicker
                    projectId={project.id}
                    labels={labels}
                    selected={d.card.labels}
                    disabled={!canEdit}
                    canCreate={canEdit}
                    canManage={isAdmin && !project.archived}
                    onChange={(ids) => card.patch({ labels: ids })}
                    onLabelsChange={board.setLabels}
                  />
                )}
              </dd>
            </div>
            <div className="field-row">
              <dt>Priority</dt>
              <dd>
                {canEdit ? (
                  <select className="input input-sm" aria-label="Priority" value={d.card.priority} onChange={(e) => card.patch({ priority: e.target.value })}>
                    {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                ) : (
                  <PriorityMark priority={d.card.priority} withText />
                )}
                {!canEdit && d.card.priority === 'none' && <span className="row-sub">None</span>}
              </dd>
            </div>
            <div className="field-row">
              <dt>Due date</dt>
              <dd>
                {canEdit ? (
                  <>
                    <input className="input input-sm" type="date" aria-label="Due date" value={d.card.dueDate || ''} onChange={(e) => card.patch({ dueDate: e.target.value || null })} />
                    {d.card.dueDate && (
                      <button type="button" className="btn-link" onClick={() => card.patch({ dueDate: null })}>
                        Clear
                      </button>
                    )}
                  </>
                ) : (
                  <span>{due ? due.text : <span className="row-sub">None</span>}</span>
                )}
                {due && (due.state === 'overdue' || due.state === 'soon') && (
                  <span className={`meta meta-${due.state}`}>
                    <Icon as={CalendarDays} size={13} />
                    {due.text}
                  </span>
                )}
              </dd>
            </div>
          </dl>

          <Description value={d.card.description} canEdit={canEdit} usernames={usernames} onSave={(description) => card.patch({ description }, false)} />
          <Checklist card={d.card} canEdit={canEdit} onToggle={card.toggleItem} onAdd={card.addItem} onRemove={card.removeItem} />
          <Attachments card={d.card} me={me} canEdit={canEdit} isAdmin={isAdmin} onAdd={card.addAttachment} onRemove={card.removeAttachment} />
          <Comments
            comments={d.comments}
            people={d.people}
            members={project.members}
            usernames={usernames}
            me={me}
            canComment={canEdit}
            isAdmin={isAdmin}
            onPost={(body) => card.postComment(body, me)}
            onEdit={card.editComment}
            onRemove={card.removeComment}
          />
        </div>
      )}
    </dialog>
  );
}
