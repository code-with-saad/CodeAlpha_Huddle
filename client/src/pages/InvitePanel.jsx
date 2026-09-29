import { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, Link2, Search, X } from 'lucide-react';
import Avatar from '../components/Avatar.jsx';
import Icon from '../components/Icon.jsx';
import RoleBadge, { ROLE_LABEL } from '../components/RoleBadge.jsx';
import { api, errorMessage } from '../lib/api.js';
import { assignableBy } from '../lib/roles.js';
import { toast } from '../lib/toast.js';
import { useProject } from './ProjectLayout.jsx';

const linkUrl = (token) => `${window.location.origin}/join/${token}`;
const fmtDate = (d) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(d));

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Link copied');
  } catch {
    toast.error('Copy failed. Select the link and copy it by hand.');
  }
}

function PersonInvite({ onInvited }) {
  const { project } = useProject();
  const roles = assignableBy(project.myRole);
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [picked, setPicked] = useState(null);
  const [role, setRole] = useState('member');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const seq = useRef(0);

  // Debounced search; stale responses are ignored.
  useEffect(() => {
    if (picked || q.trim().length < 2) {
      setResults([]);
      return;
    }
    const mine = ++seq.current;
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get('/users/search', { params: { q: q.trim() } });
        if (mine === seq.current) {
          const inProject = new Set(project.members.map((m) => m.user.id));
          setResults(data.users.filter((u) => !inProject.has(u.id)));
        }
      } catch {
        if (mine === seq.current) setResults([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [q, picked, project.members]);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      // The email path is only used when the box holds an address that matched no search result.
      const body = picked ? { username: picked.username, role } : q.includes('@') ? { email: q.trim(), role } : { username: q.trim(), role };
      await api.post(`/projects/${project.id}/invites`, body);
      toast.success('Invitation sent');
      setQ('');
      setPicked(null);
      onInvited();
    } catch (err) {
      setMessage(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="inline-form">
        <div className="field">
          <label className="field-label" htmlFor="invite-q">
            Username or email
          </label>
          {picked ? (
            <div className="input" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Avatar user={picked} size={20} />
              <span style={{ flex: 1 }}>{picked.name}</span>
              <button type="button" className="icon-btn" style={{ width: 24, height: 24 }} onClick={() => setPicked(null)} aria-label="Clear selection">
                <Icon as={X} size={14} />
              </button>
            </div>
          ) : (
            <input id="invite-q" className="input" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" placeholder="Search people" />
          )}
        </div>
        <div className="field" style={{ flex: '0 0 130px' }}>
          <label className="field-label" htmlFor="invite-role">
            Role
          </label>
          <select id="invite-role" className="input" value={role} onChange={(e) => setRole(e.target.value)}>
            {roles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" disabled={busy || (!picked && q.trim().length < 2)}>
          {busy && <span className="spinner" aria-hidden="true" />}
          Send invite
        </button>
      </div>

      {results.length > 0 && (
        <ul className="results" aria-label="Matching people">
          {results.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                className="result"
                onClick={() => {
                  setPicked(u);
                  setResults([]);
                }}
              >
                <Avatar user={u} size={24} />
                <span>{u.name}</span>
                <span className="row-sub mono">@{u.username}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {message && (
        <p className="form-error" role="alert">
          {message}
        </p>
      )}
      <p className="field-hint">
        <Icon as={Search} size={12} /> Invited people see the invitation on their Projects page. No email is sent.
      </p>
    </form>
  );
}

function LinkCreator({ onCreated }) {
  const { project } = useProject();
  const [role, setRole] = useState('viewer');
  const [days, setDays] = useState('7');
  const [busy, setBusy] = useState(false);

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post(`/projects/${project.id}/invite-links`, { role, expiresInDays: days === 'never' ? null : Number(days) });
      onCreated();
      await copy(linkUrl(data.invite.token));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="inline-form" onSubmit={create}>
      <div className="field" style={{ flex: '0 0 130px' }}>
        <label className="field-label" htmlFor="link-role">
          Joins as
        </label>
        <select id="link-role" className="input" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="viewer">Viewer</option>
          <option value="member">Member</option>
        </select>
      </div>
      <div className="field" style={{ flex: '0 0 150px' }}>
        <label className="field-label" htmlFor="link-exp">
          Expires
        </label>
        <select id="link-exp" className="input" value={days} onChange={(e) => setDays(e.target.value)}>
          <option value="1">In 1 day</option>
          <option value="7">In 7 days</option>
          <option value="30">In 30 days</option>
          <option value="never">Never</option>
        </select>
      </div>
      <button className="btn" disabled={busy}>
        {busy ? <span className="spinner" aria-hidden="true" /> : <Icon as={Link2} />}
        Create link
      </button>
    </form>
  );
}

export default function InvitePanel() {
  const { project } = useProject();
  const [invites, setInvites] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/projects/${project.id}/invites`);
      setInvites(data.invites);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }, [project.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function revoke(invite) {
    try {
      await api.delete(`/projects/${project.id}/invites/${invite.id}`);
      toast.success(invite.kind === 'link' ? 'Link revoked' : 'Invitation withdrawn');
    } catch (err) {
      toast.error(errorMessage(err));
    }
    load();
  }

  const people = (invites || []).filter((i) => i.kind === 'user');
  const links = (invites || []).filter((i) => i.kind === 'link');

  return (
    <>
      <h2 className="section-title">Invite people</h2>
      <div className="panel">
        <PersonInvite onInvited={load} />
      </div>

      {people.length > 0 && (
        <>
          <h3 className="section-title">Pending invitations</h3>
          <ul className="rows">
            {people.map((i) => (
              <li key={i.id} className="row">
                <Avatar user={i.invitee} size={28} />
                <div className="row-main">
                  <span className="row-title">{i.invitee?.name}</span>
                  <span className="row-sub">Invited {fmtDate(i.createdAt)}</span>
                </div>
                <RoleBadge role={i.role} />
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => revoke(i)}>
                  Withdraw
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="section-title">Invite links</h2>
      <div className="panel">
        <LinkCreator onCreated={load} />
        <p className="field-hint">Anyone with a link who is signed in can join until you revoke it or it expires.</p>
      </div>
      {links.length > 0 && (
        <ul className="rows" style={{ marginTop: 'var(--space-3)' }}>
          {links.map((i) => (
            <li key={i.id} className="row">
              <div className="row-main">
                <span className="copy-field">{linkUrl(i.token)}</span>
                <span className="row-sub">
                  {ROLE_LABEL[i.role]}, {i.expiresAt ? `expires ${fmtDate(i.expiresAt)}` : 'no expiry'}, used {i.uses} {i.uses === 1 ? 'time' : 'times'}
                </span>
              </div>
              <div className="row-actions">
                <button type="button" className="btn btn-sm" onClick={() => copy(linkUrl(i.token))}>
                  <Icon as={Copy} size={14} />
                  Copy
                </button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => revoke(i)}>
                  Revoke
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
