import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationRow } from '../components/NotificationBell.jsx';
import { api, errorMessage } from '../lib/api.js';
import { on } from '../lib/bus.js';
import { targetOf, useNotifications } from '../lib/notifications.jsx';

// Full page list with an unread filter and paging. New notifications join the top of the list live.
export default function NotificationsPage() {
  const { unread, markRead, markAllRead, setUnread } = useNotifications();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [items, setItems] = useState(null);
  const [more, setMore] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (before) => {
      setBusy(true);
      try {
        const { data } = await api.get('/notifications', { params: { limit: 25, unread: filter === 'unread' ? 1 : undefined, before } });
        setItems((cur) => (before && cur ? [...cur, ...data.notifications] : data.notifications));
        setMore(data.hasMore);
        setUnread(data.unread);
        setError('');
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setBusy(false);
      }
    },
    [filter, setUnread]
  );

  useEffect(() => {
    setItems(null);
    load();
  }, [load]);

  // A notification that arrives while this page is open is shown straight away.
  useEffect(
    () =>
      on('notification', (n) => {
        setItems((cur) => (cur ? [n, ...cur.filter((x) => x.id !== n.id)] : cur));
      }),
    []
  );

  function open(n) {
    if (!n.read) {
      markRead([n.id]);
      setItems((cur) => cur && cur.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
    navigate(targetOf(n));
  }

  return (
    <div className="notes-page">
      <div className="page-head">
        <h1>Notifications</h1>
        <button
          type="button"
          className="btn"
          disabled={unread === 0}
          onClick={async () => {
            await markAllRead();
            setItems((cur) => cur && cur.map((x) => ({ ...x, read: true })));
          }}
        >
          Mark all as read
        </button>
      </div>

      <div className="tabs" role="tablist" aria-label="Filter">
        {[
          ['all', 'All'],
          ['unread', unread ? `Unread (${unread})` : 'Unread'],
        ].map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={filter === k} className="tab tab-btn" aria-current={filter === k ? 'page' : undefined} onClick={() => setFilter(k)}>
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!items && !error && (
        <div className="loading" role="status" aria-label="Loading notifications">
          <span className="spinner" />
        </div>
      )}
      {items?.length === 0 && (
        <div className="empty">{filter === 'unread' ? 'You are all caught up.' : 'No notifications yet. You will see assignments, mentions, comments on cards you follow, and due dates here.'}</div>
      )}
      {items?.length > 0 && (
        <div className="note-list note-list-page">
          {items.map((n) => (
            <NotificationRow key={n.id} n={n} onOpen={open} />
          ))}
        </div>
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
