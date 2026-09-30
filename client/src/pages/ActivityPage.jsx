import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../components/Avatar.jsx';
import { api, errorMessage } from '../lib/api.js';
import { dueInfo, timeAgo } from '../lib/date.js';
import { useProject } from './ProjectLayout.jsx';
import './board/views.css';

const GROUPS = [
  ['', 'Everything'],
  ['cards', 'Tasks'],
  ['comments', 'Comments'],
  ['columns', 'Columns'],
  ['members', 'Members'],
  ['project', 'Project'],
];
const PRIORITY = { none: 'no priority', low: 'low', medium: 'medium', high: 'high', urgent: 'urgent' };
const BULK = { move: 'moved', archive: 'archived', restore: 'restored', assign: 'changed the assignees of', label: 'changed labels on' };

// One plain sentence per history line. `card` is a link when the line is about a task.
function sentence(a, project) {
  const d = a.data || {};
  const c = a.card ? <Link className="inline-link" to={`/p/${project.id}?card=${a.card.id}`}>{a.card.title}</Link> : null;
  switch (a.type) {
    case 'card.created': return <>created {c}{d.column ? ` in ${d.column}` : ''}</>;
    case 'card.moved': return <>moved {c} from {d.from} to {d.to}</>;
    case 'card.renamed': return <>renamed "{d.from}" to {c}</>;
    case 'card.archived': return <>archived {c}</>;
    case 'card.restored': return <>restored {c}</>;
    case 'card.duplicated': return <>duplicated "{d.from}" as {c}</>;
    case 'card.assigned': return <>assigned {(d.users || []).join(', ')} to {c}</>;
    case 'card.unassigned': return <>unassigned {(d.users || []).join(', ')} from {c}</>;
    case 'card.priority': return <>set the priority of {c} to {PRIORITY[d.to] || d.to}</>;
    case 'card.due': return d.to ? <>set the due date of {c} to {dueInfo(d.to)?.label}</> : <>removed the due date of {c}</>;
    case 'card.commented': return <>commented on {c}{d.snippet ? `: "${d.snippet}"` : ''}</>;
    case 'card.attached': return <>attached {d.name} to {c}</>;
    case 'card.bulk': return <>{BULK[d.action] || 'changed'} {d.count} {d.count === 1 ? 'task' : 'tasks'} at once</>;
    case 'column.created': return <>added the column "{d.name}"</>;
    case 'column.renamed': return <>renamed the column "{d.from}" to "{d.to}"</>;
    case 'column.deleted': return <>deleted the column "{d.name}"{d.cards ? ` and archived its ${d.cards} ${d.cards === 1 ? 'task' : 'tasks'}` : ''}</>;
    case 'column.restored': return <>restored the column "{d.name}"</>;
    case 'member.joined': return <>joined the project</>;
    case 'member.removed': return d.left ? <>left the project</> : <>removed {d.user || 'a member'} from the project</>;
    case 'member.role': return <>made {d.user || 'a member'} {d.to === 'owner' ? 'the owner' : `a${'aeiou'.includes(d.to?.[0]) ? 'n' : ''} ${d.to}`}</>;
    case 'project.updated': return <>edited the project details</>;
    case 'project.archived': return <>archived the project</>;
    case 'project.restored': return <>restored the project</>;
    default: return <>made a change</>;
  }
}

// Who did what and when, filterable by kind, person and task.
export default function ActivityPage() {
  const { project } = useProject();
  const [f, setF] = useState({ group: '', actor: '', q: '' });
  const [items, setItems] = useState(null);
  const [more, setMore] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (before) => {
      setBusy(true);
      try {
        const { data } = await api.get(`/projects/${project.id}/activity`, { params: { group: f.group || undefined, actor: f.actor || undefined, q: f.q.trim() || undefined, before, limit: 30 } });
        setItems((cur) => (before && cur ? [...cur, ...data.activity] : data.activity));
        setMore(data.hasMore);
        setError('');
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setBusy(false);
      }
    },
    [project.id, f]
  );

  // Filters apply after a short pause so typing in the search box does not fire a request per key.
  useEffect(() => {
    const t = setTimeout(() => load(), f.q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, f.q]);

  return (
    <div className="activity">
      <div className="filterbar" role="search" aria-label="Filter activity">
        <select className="input input-sm" aria-label="Kind of activity" value={f.group} onChange={(e) => setF({ ...f, group: e.target.value })}>
          {GROUPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="input input-sm" aria-label="Person" value={f.actor} onChange={(e) => setF({ ...f, actor: e.target.value })}>
          <option value="">Anyone</option>
          {project.members.map((m) => <option key={m.user.id} value={m.user.id}>{m.user.name}</option>)}
        </select>
        <input className="input input-sm filter-q" aria-label="Task title" placeholder="Task title" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        {(f.group || f.actor || f.q) && <button type="button" className="btn btn-sm btn-ghost" onClick={() => setF({ group: '', actor: '', q: '' })}>Clear</button>}
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      {!items && !error && <div className="loading" role="status" aria-label="Loading activity"><span className="spinner" /></div>}
      {items?.length === 0 && <div className="empty">{f.group || f.actor || f.q ? 'Nothing matches these filters.' : 'No activity yet.'}</div>}
      {items?.length > 0 && (
        <ol className="activity-list">
          {items.map((a) => (
            <li key={a.id} className="activity-row">
              {a.actor ? <Avatar user={a.actor} size={28} /> : <span className="avatar avatar-initial" style={{ width: 28, height: 28 }} aria-hidden="true">?</span>}
              <div className="activity-text">
                <span><strong>{a.actor?.name || 'Someone'}</strong> {sentence(a, project)}</span>
                <time className="row-sub" dateTime={a.createdAt} title={new Date(a.createdAt).toLocaleString()}>{timeAgo(a.createdAt)}</time>
              </div>
            </li>
          ))}
        </ol>
      )}
      {more && (
        <div className="note-more">
          <button type="button" className="btn" onClick={() => load(items.at(-1).id)} disabled={busy}>
            {busy && <span className="spinner" aria-hidden="true" />}
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
