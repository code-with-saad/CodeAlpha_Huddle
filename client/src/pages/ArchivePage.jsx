import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '../lib/api.js';
import { timeAgo } from '../lib/date.js';
import { atLeast } from '../lib/roles.js';
import { toast } from '../lib/toast.js';
import { useProject } from './ProjectLayout.jsx';
import './board/views.css';

// Archived tasks and columns. Nothing is deleted for good: everything here can be restored.
export default function ArchivePage() {
  const { project } = useProject();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  const canRestoreCards = atLeast(project.myRole, 'member') && !project.archived;
  const canRestoreColumns = atLeast(project.myRole, 'admin') && !project.archived;

  const load = useCallback(async () => {
    try {
      const { data: d } = await api.get(`/projects/${project.id}/archive`);
      setData(d);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [project.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function restore(kind, item) {
    setBusy(item.id);
    try {
      await api.post(`/projects/${project.id}/${kind}s/${item.id}/restore`);
      toast.success(kind === 'card' ? `Restored "${item.title}"` : `Restored column "${item.name}"`);
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  if (error) return <p className="form-error" role="alert">{error}</p>;
  if (!data) return <div className="loading" role="status" aria-label="Loading archive"><span className="spinner" /></div>;

  return (
    <div className="archive">
      <h2 className="section-title">Columns ({data.columns.length})</h2>
      {data.columns.length === 0 ? (
        <p className="row-sub">No archived columns.</p>
      ) : (
        <ul className="rows">
          {data.columns.map((c) => (
            <li key={c.id} className="row">
              <div className="row-main">
                <span className="row-title">{c.name}</span>
                <span className="row-sub">Archived {timeAgo(c.archivedAt)}, {c.cardCount} {c.cardCount === 1 ? 'task' : 'tasks'} came with it</span>
              </div>
              {canRestoreColumns && <button type="button" className="btn btn-sm" disabled={busy === c.id} onClick={() => restore('column', c)}>Restore</button>}
            </li>
          ))}
        </ul>
      )}

      <h2 className="section-title">Tasks ({data.cards.length})</h2>
      {data.cards.length === 0 ? (
        <p className="row-sub">No archived tasks.</p>
      ) : (
        <ul className="rows">
          {data.cards.map((c) => (
            <li key={c.id} className="row">
              <div className="row-main">
                <span className="row-title">{c.title}</span>
                <span className="row-sub">
                  From {c.column || 'a deleted column'}, archived {timeAgo(c.archivedAt)}
                  {c.columnArchived ? '. It returns to the first column, or with its column if you restore that first.' : ''}
                </span>
              </div>
              {canRestoreCards && <button type="button" className="btn btn-sm" disabled={busy === c.id} onClick={() => restore('card', c)}>Restore</button>}
            </li>
          ))}
        </ul>
      )}
      {data.cards.length >= 200 && <p className="row-sub">Showing the newest 200.</p>}
    </div>
  );
}
