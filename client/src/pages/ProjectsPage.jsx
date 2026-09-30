import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Avatar from '../components/Avatar.jsx';
import Dialog from '../components/Dialog.jsx';
import Icon from '../components/Icon.jsx';
import RoleBadge from '../components/RoleBadge.jsx';
import { api, errorMessage, fieldErrors } from '../lib/api.js';
import { on } from '../lib/bus.js';
import { toast } from '../lib/toast.js';

function NewProjectDialog({ onClose }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', description: '' });
  const [busy, setBusy] = useState(false);
  const [fields, setFields] = useState({});

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setFields({});
    try {
      const { data } = await api.post('/projects', form);
      navigate(`/p/${data.project.id}`);
    } catch (err) {
      setFields(fieldErrors(err));
      toast.error(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Dialog title="New project" onClose={onClose}>
      <form className="stack" onSubmit={submit} noValidate>
        <label className="field">
          <span className="field-label">Name</span>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            maxLength={80}
            data-autofocus
            aria-invalid={fields.name ? 'true' : undefined}
          />
          {fields.name && <span className="field-error">{fields.name}</span>}
        </label>
        <label className="field">
          <span className="field-label">Description (optional)</span>
          <textarea
            className="input"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            maxLength={500}
            rows={3}
          />
        </label>
        <div className="row-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={busy}>
            {busy && <span className="spinner" aria-hidden="true" />}
            Create project
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function Invitations({ invites, onChange }) {
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState(null);

  async function respond(invite, action) {
    setBusyId(invite.id);
    try {
      const { data } = await api.post(`/invites/${invite.id}/${action}`);
      toast.success(action === 'accept' ? `Joined ${invite.project.name}` : 'Invitation declined');
      if (action === 'accept') navigate(`/p/${data.projectId}`);
      else onChange();
    } catch (err) {
      toast.error(errorMessage(err));
      onChange();
    } finally {
      setBusyId(null);
    }
  }

  if (!invites.length) return null;
  return (
    <section aria-labelledby="inv-title">
      <h2 id="inv-title" className="section-title">
        Invitations
      </h2>
      <ul className="rows">
        {invites.map((i) => (
          <li key={i.id} className="row">
            <div className="row-main">
              <span className="row-title">{i.project.name}</span>
              <span className="row-sub">
                {i.invitedBy?.name || 'Someone'} invited you as {i.role}
              </span>
            </div>
            <div className="row-actions">
              <button type="button" className="btn btn-sm" onClick={() => respond(i, 'decline')} disabled={busyId === i.id}>
                Decline
              </button>
              <button type="button" className="btn btn-sm btn-primary" onClick={() => respond(i, 'accept')} disabled={busyId === i.id}>
                Accept
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState(null);
  const [invites, setInvites] = useState([]);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, i] = await Promise.all([api.get('/projects', { params: showArchived ? { archived: 1 } : {} }), api.get('/invites')]);
      setProjects(p.data.projects);
      setInvites(i.data.invites);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [showArchived]);

  useEffect(() => {
    load();
  }, [load]);

  // Live: a new invitation, or joining or leaving a project on another tab, refreshes the lists.
  useEffect(() => {
    const offs = [on('invites', load), on('access', load)];
    return () => offs.forEach((off) => off());
  }, [load]);

  return (
    <>
      <div className="page-head">
        <h1>Projects</h1>
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
          <Icon as={Plus} />
          New project
        </button>
      </div>
      <div className="tabs" role="tablist" aria-label="Which projects">
        <button type="button" role="tab" aria-selected={!showArchived} className="tab tab-btn" aria-current={!showArchived ? 'page' : undefined} onClick={() => setShowArchived(false)}>
          Active
        </button>
        <button type="button" role="tab" aria-selected={showArchived} className="tab tab-btn" aria-current={showArchived ? 'page' : undefined} onClick={() => setShowArchived(true)}>
          Archived
        </button>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!projects && !error && (
        <div className="loading" role="status" aria-label="Loading projects">
          <span className="spinner" />
        </div>
      )}

      <Invitations invites={invites} onChange={load} />

      {projects && (
        <section aria-labelledby="mine-title">
          {invites.length > 0 && (
            <h2 id="mine-title" className="section-title">
              Your projects
            </h2>
          )}
          {projects.length === 0 ? (
            <div className="empty">{showArchived ? 'No archived projects.' : 'You are not in any projects yet. Create one to start a board, or open an invite link from a teammate.'}</div>
          ) : (
            <ul className="rows">
              {projects.map((p) => (
                <li key={p.id} className={showArchived ? 'row' : undefined}>
                  <Link to={`/p/${p.id}`} className="row" style={showArchived ? { flex: 1, border: 0, padding: 0 } : undefined}>
                    <div className="row-main">
                      <span className="row-title">{p.name}</span>
                      {p.description && <span className="row-sub">{p.description}</span>}
                    </div>
                    <div className="avatar-stack" aria-label={`${p.members.length} members`}>
                      {p.members.slice(0, 4).map((m) => (
                        <Avatar key={m.user.id} user={m.user} size={24} />
                      ))}
                    </div>
                    <RoleBadge role={p.myRole} />
                  </Link>
                  {showArchived && p.myRole === 'owner' && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={async () => {
                        try {
                          await api.post(`/projects/${p.id}/restore`);
                          toast.success(`Restored ${p.name}`);
                        } catch (err) {
                          toast.error(errorMessage(err));
                        }
                        load();
                      }}
                    >
                      Restore
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {creating && <NewProjectDialog onClose={() => setCreating(false)} />}
    </>
  );
}
