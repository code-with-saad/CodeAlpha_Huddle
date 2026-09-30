import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar.jsx';
import { ConfirmDialog } from '../components/Dialog.jsx';
import RoleBadge, { ROLE_LABEL } from '../components/RoleBadge.jsx';
import { useAuth } from '../lib/auth.jsx';
import { api, errorMessage, fieldErrors } from '../lib/api.js';
import { assignableBy, atLeast, canManageMember } from '../lib/roles.js';
import { toast } from '../lib/toast.js';
import InvitePanel from './InvitePanel.jsx';
import { useProject } from './ProjectLayout.jsx';
import './profile.css';

function GeneralSection() {
  const { project, reload } = useProject();
  const [form, setForm] = useState({ name: project.name, description: project.description });
  const [busy, setBusy] = useState(false);
  const [fields, setFields] = useState({});
  const dirty = form.name !== project.name || form.description !== project.description;

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setFields({});
    try {
      await api.patch(`/projects/${project.id}`, form);
      await reload();
      toast.success('Project saved');
    } catch (err) {
      setFields(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h2 className="section-title">Details</h2>
      <form className="panel" onSubmit={save} noValidate>
        <label className="field">
          <span className="field-label">Name</span>
          <input className="input" value={form.name} maxLength={80} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} aria-invalid={fields.name ? 'true' : undefined} />
          {fields.name && <span className="field-error">{fields.name}</span>}
        </label>
        <label className="field">
          <span className="field-label">Description</span>
          <textarea className="input" rows={3} maxLength={500} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </label>
        <div>
          <button className="btn btn-primary" disabled={busy || !dirty}>
            {busy && <span className="spinner" aria-hidden="true" />}
            Save changes
          </button>
        </div>
      </form>
    </>
  );
}

export default function MembersPage() {
  const { user } = useAuth();
  const { project, reload } = useProject();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(null); // { kind, member }
  const [busy, setBusy] = useState(false);
  const isAdmin = atLeast(project.myRole, 'admin');
  const isOwner = project.myRole === 'owner';
  const roles = assignableBy(project.myRole);

  async function run(fn, success) {
    setBusy(true);
    try {
      await fn();
      toast.success(success);
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    } finally {
      setBusy(false);
      setConfirm(null);
      reload();
    }
  }

  const changeRole = (m, role) =>
    run(() => api.patch(`/projects/${project.id}/members/${m.user.id}`, { role }), `${m.user.name} is now ${ROLE_LABEL[role]}`);

  async function confirmed() {
    const { kind, member } = confirm;
    if (kind === 'remove') return run(() => api.delete(`/projects/${project.id}/members/${member.user.id}`), `${member.user.name} removed`);
    if (kind === 'owner') return run(() => api.post(`/projects/${project.id}/members/${member.user.id}/make-owner`), `${member.user.name} is now the owner`);
    if (kind === 'leave') {
      if (await run(() => api.delete(`/projects/${project.id}/members/${user.id}`), 'You left the project')) navigate('/projects');
      return;
    }
    if (kind === 'archive') return run(() => api.post(`/projects/${project.id}/archive`), 'Project archived');
    if (kind === 'restore') return run(() => api.post(`/projects/${project.id}/restore`), 'Project restored');
  }

  const copyFor = {
    remove: { title: 'Remove member', danger: true, label: 'Remove', text: (m) => `${m.user.name} will lose access to this project.` },
    owner: { title: 'Transfer ownership', danger: true, label: 'Make owner', text: (m) => `${m.user.name} becomes the owner and you become an admin. Only the new owner can undo this.` },
    leave: { title: 'Leave project', danger: true, label: 'Leave', text: () => 'You will lose access unless someone invites you again.' },
    archive: { title: 'Archive project', danger: false, label: 'Archive', text: () => 'The project becomes read-only and disappears from everyone\'s project list. You can restore it at any time.' },
    restore: { title: 'Restore project', danger: false, label: 'Restore', text: () => 'The project becomes editable again.' },
  };

  return (
    <div className="members">
      <h2 className="section-title">Members ({project.members.length})</h2>
      <ul className="rows">
        {project.members.map((m) => {
          const self = m.user.id === user.id;
          const manageable = isAdmin && !self && canManageMember(project.myRole, m.role);
          return (
            <li key={m.user.id} className="row">
              <Avatar user={m.user} size={32} />
              <div className="row-main">
                <span className="row-title">
                  {m.user.name}
                  {self && <span className="row-sub"> (you)</span>}
                </span>
                <span className="row-sub mono">@{m.user.username}</span>
              </div>
              <div className="row-actions">
                {manageable ? (
                  <select className="input" style={{ width: 120 }} value={m.role} onChange={(e) => changeRole(m, e.target.value)} disabled={busy} aria-label={`Role for ${m.user.name}`}>
                    {[...new Set([m.role, ...roles])].map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <RoleBadge role={m.role} />
                )}
                {isOwner && !self && (
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirm({ kind: 'owner', member: m })}>
                    Make owner
                  </button>
                )}
                {manageable && (
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirm({ kind: 'remove', member: m })}>
                    Remove
                  </button>
                )}
                {self && !isOwner && (
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirm({ kind: 'leave' })}>
                    Leave
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {isAdmin && !project.archived && (
        <>
          <GeneralSection />
          <InvitePanel />
        </>
      )}

      {isOwner && (
        <>
          <h2 className="section-title">{project.archived ? 'Restore' : 'Archive'}</h2>
          <div className="panel">
            <p>
              {project.archived
                ? 'This project is archived. Restore it to let people edit again.'
                : 'Archiving hides the project and makes it read-only. Nothing is deleted and you can restore it later.'}
            </p>
            <div>
              <button type="button" className="btn" onClick={() => setConfirm({ kind: project.archived ? 'restore' : 'archive' })}>
                {project.archived ? 'Restore project' : 'Archive project'}
              </button>
            </div>
          </div>
        </>
      )}

      {confirm && (
        <ConfirmDialog
          title={copyFor[confirm.kind].title}
          message={copyFor[confirm.kind].text(confirm.member)}
          confirmLabel={copyFor[confirm.kind].label}
          danger={copyFor[confirm.kind].danger}
          busy={busy}
          onConfirm={confirmed}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
