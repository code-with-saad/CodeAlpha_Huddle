import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import Avatar from './Avatar.jsx';
import Icon from './Icon.jsx';
import Popover from './Popover.jsx';
import { timeAgo } from '../lib/date.js';
import { describe, targetOf, useNotifications } from '../lib/notifications.jsx';

export function NotificationRow({ n, onOpen }) {
  return (
    <button type="button" className={`note-row${n.read ? '' : ' note-unread'}`} onClick={() => onOpen(n)}>
      {n.actor ? <Avatar user={n.actor} size={28} /> : <span className="note-icon"><Icon as={Bell} size={14} /></span>}
      <span className="note-text">
        <span className="note-line">{describe(n)}</span>
        {n.snippet && <span className="row-sub note-snippet">{n.snippet}</span>}
        <span className="row-sub">
          {n.project?.name ? `${n.project.name}, ` : ''}
          {timeAgo(n.createdAt)}
        </span>
      </span>
      {!n.read && <span className="note-dot" aria-label="Unread" />}
    </button>
  );
}

function BellPanel({ close }) {
  const { recent, loadRecent, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    loadRecent().catch(() => setError(true));
  }, [loadRecent]);

  function open(n) {
    if (!n.read) markRead([n.id]);
    close(false);
    navigate(targetOf(n));
  }

  return (
    <div className="bell-panel">
      <div className="bell-head">
        <strong>Notifications</strong>
        <button type="button" className="btn-link" onClick={markAllRead} disabled={!recent?.some((n) => !n.read)}>
          Mark all read
        </button>
      </div>
      {error && <p className="form-error">Could not load notifications.</p>}
      {!recent && !error && (
        <div className="loading">
          <span className="spinner" />
        </div>
      )}
      {recent?.length === 0 && <p className="row-sub bell-empty">Nothing yet. Assignments, mentions and due dates show up here.</p>}
      <div className="note-list">{recent?.map((n) => <NotificationRow key={n.id} n={n} onOpen={open} />)}</div>
      <Link to="/notifications" className="bell-foot" onClick={() => close(false)}>
        See all notifications
      </Link>
    </div>
  );
}

export default function NotificationBell({ className = 'icon-btn bell-btn' }) {
  const { unread } = useNotifications();
  return (
    <Popover
      label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
      className={className}
      width={360}
      trigger={
        <>
          <Icon as={Bell} size={18} />
          {unread > 0 && <span className="badge mono">{unread > 99 ? '99+' : unread}</span>}
        </>
      }
    >
      {(close) => <BellPanel close={close} />}
    </Popover>
  );
}
