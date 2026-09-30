import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api.js';
import { useAuth } from './auth.jsx';
import { emit } from './bus.js';
import { refreshAccess, startRealtime, stopRealtime } from './realtime.js';
import { toast } from './toast.js';
import useChannel from './useChannel.js';

const Ctx = createContext(null);
export const useNotifications = () => useContext(Ctx);

// One sentence per notification. Used for the bell, the full page and the live toast.
export function describe(n) {
  const who = n.actor?.name || 'Someone';
  const card = n.card?.title ? `"${n.card.title}"` : 'a card';
  switch (n.type) {
    case 'assigned':
      return `${who} assigned you to ${card}`;
    case 'mentioned':
      return `${who} mentioned you in ${card}`;
    case 'comment':
      return `${who} commented on ${card}`;
    case 'reply':
      return `${who} replied to your comment on ${card}`;
    case 'due_soon':
      return `${card} is due soon`;
    case 'overdue':
      return `${card} is overdue`;
    case 'invited':
      return `${who} invited you to ${n.project?.name || 'a project'}`;
    default:
      return 'New notification';
  }
}

// Where a notification leads: the card on its board, or the projects page for invitations.
export const targetOf = (n) => (n.card && n.project ? `/p/${n.project.id}?card=${n.card.id}` : '/projects');

// Owns the realtime connection for the signed-in person and everything that arrives on their personal
// channel: notifications, invitations and access changes. Time-based notifications (due soon, overdue)
// are created by the API when this store asks for the unread count, so it asks on load, whenever the
// tab becomes visible again, and every few minutes while it stays open.
export function NotificationsProvider({ children }) {
  const { user, status } = useAuth();
  const [unread, setUnread] = useState(0);
  const [recent, setRecent] = useState(null);
  const userId = status === 'in' ? user?.id : null;
  const timer = useRef(null);

  const refreshUnread = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications/unread');
      setUnread(data.unread);
    } catch {
      /* the badge simply keeps its last value */
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    startRealtime().catch(() => {});
    refreshUnread();
    const onVisible = () => document.visibilityState === 'visible' && refreshUnread();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    timer.current = setInterval(onVisible, 5 * 60 * 1000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      clearInterval(timer.current);
      setUnread(0);
      setRecent(null);
      stopRealtime();
    };
  }, [userId, refreshUnread]);

  useChannel(
    userId ? `user:${userId}` : null,
    (name, data) => {
      if (name === 'notification') {
        setUnread(data.unread);
        setRecent((list) => (list ? [data.notification, ...list.filter((n) => n.id !== data.notification.id)].slice(0, 8) : list));
        toast.info(describe(data.notification));
        emit('notification', data.notification);
      } else if (name === 'access.changed') {
        // Membership or role changed: get a token that matches, then tell screens to reload what they show.
        refreshAccess().then(() => emit('access', data));
      } else if (name === 'invites.changed') {
        emit('invites');
      }
    },
    () => {
      refreshUnread();
      emit('invites');
    }
  );

  const loadRecent = useCallback(async () => {
    const { data } = await api.get('/notifications', { params: { limit: 8 } });
    setRecent(data.notifications);
    setUnread(data.unread);
  }, []);

  const markRead = useCallback(async (ids) => {
    setRecent((list) => list && list.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)));
    try {
      const { data } = await api.post('/notifications/read', { ids });
      setUnread(data.unread);
    } catch {
      /* the next refresh corrects the badge */
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setRecent((list) => list && list.map((n) => ({ ...n, read: true })));
    setUnread(0);
    try {
      await api.post('/notifications/read', { all: true });
    } catch {
      refreshUnread();
    }
  }, [refreshUnread]);

  const value = useMemo(() => ({ unread, recent, loadRecent, markRead, markAllRead, refreshUnread, setUnread }), [unread, recent, loadRecent, markRead, markAllRead, refreshUnread]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
