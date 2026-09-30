import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errorMessage } from './api.js';
import { toast } from './toast.js';
import useChannel from './useChannel.js';

// State for the open card: { card, comments, people }. Quick edits (priority, due date, people, labels,
// checklist ticks, posting a comment) show at once and roll back if the server refuses them.
export default function useCard(projectId, cardId, onChange) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const ref = useRef(null);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;

  const set = useCallback((next) => {
    ref.current = typeof next === 'function' ? next(ref.current) : next;
    setData(ref.current);
  }, []);

  useEffect(() => {
    let cancelled = false;
    set(null);
    setError(null);
    api
      .get(`/projects/${projectId}/cards/${cardId}`)
      .then(({ data: d }) => !cancelled && set(d))
      .catch((err) => !cancelled && setError({ status: err.response?.status, message: errorMessage(err) }));
    return () => {
      cancelled = true;
    };
  }, [projectId, cardId, set]);

  const base = `/projects/${projectId}/cards/${cardId}`;

  const refetch = useCallback(async () => {
    try {
      const { data: d } = await api.get(`/projects/${projectId}/cards/${cardId}`);
      set(d);
      changeRef.current?.(d.card);
    } catch (err) {
      if (err.response?.status === 404) setError({ status: 404, message: 'This card was archived or does not exist.' });
    }
  }, [projectId, cardId, set]);
  const refetchTimer = useRef(null);

  // Live: comments from other people appear as they are posted, and any other change to this card reloads it.
  useChannel(
    `project:${projectId}`,
    (name, e) => {
      const mine = e.cardId === cardId || e.card?.id === cardId;
      if (!mine || !ref.current) return;
      if (name === 'comment.created') {
        set((d) => (d.comments.some((c) => c.id === e.comment.id) ? d : { ...d, comments: [...d.comments, e.comment], card: { ...d.card, commentCount: e.card.commentCount } }));
      } else if (name === 'comment.updated') {
        set((d) => ({ ...d, comments: d.comments.map((c) => (c.id === e.comment.id ? e.comment : c)) }));
      } else if (name === 'comment.deleted') {
        // Deleting a comment also removed its replies; the event lists every id that went.
        const gone = new Set(e.commentIds || [e.commentId]);
        set((d) => ({ ...d, comments: d.comments.filter((c) => !gone.has(c.id)), card: { ...d.card, commentCount: e.card.commentCount } }));
      } else if (name === 'card.removed') {
        setError({ status: 404, message: 'This card was archived or does not exist.' });
      } else if (name === 'card.upsert' || name === 'card.moved') {
        clearTimeout(refetchTimer.current);
        refetchTimer.current = setTimeout(refetch, 250);
      }
    },
    refetch
  );

  // Takes a response from the API, which always carries the whole card.
  const accept = useCallback(
    (res) => {
      set((d) => ({ card: res.card, comments: res.comments ?? d.comments, people: res.people ?? d.people }));
      changeRef.current?.(res.card);
    },
    [set]
  );

  // Runs `request`, updating local state first with `apply`; on failure puts the old state back.
  const run = useCallback(
    async (apply, request) => {
      const before = ref.current;
      if (apply) set((d) => ({ ...d, card: apply(d.card) }));
      if (apply) changeRef.current?.(ref.current.card);
      try {
        accept((await request()).data);
        return true;
      } catch (err) {
        set(before);
        changeRef.current?.(before.card);
        toast.error(errorMessage(err));
        return false;
      }
    },
    [set, accept]
  );

  return {
    data,
    error,
    patch: (fields, optimistic = true) => run(optimistic ? (c) => ({ ...c, ...fields }) : null, () => api.patch(base, fields)),

    toggleItem: (item) =>
      run(
        (c) => {
          const items = c.checklistItems.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i));
          return { ...c, checklistItems: items, checklist: { total: items.length, done: items.filter((i) => i.done).length } };
        },
        () => api.patch(`${base}/checklist/${item.id}`, { done: !item.done })
      ),
    addItem: (text) => run(null, () => api.post(`${base}/checklist`, { text })),
    renameItem: (item, text) => run((c) => ({ ...c, checklistItems: c.checklistItems.map((i) => (i.id === item.id ? { ...i, text } : i)) }), () => api.patch(`${base}/checklist/${item.id}`, { text })),
    removeItem: (item) => run((c) => {
      const items = c.checklistItems.filter((i) => i.id !== item.id);
      return { ...c, checklistItems: items, checklist: { total: items.length, done: items.filter((i) => i.done).length } };
    }, () => api.delete(`${base}/checklist/${item.id}`)),

    // Following a card: notifications for its comments. Shows at once, rolls back if refused.
    setWatching: (on) =>
      run(
        (c) => ({ ...c, watching: on, watcherCount: Math.max(0, c.watcherCount + (on ? 1 : -1)) }),
        () => (on ? api.post(`${base}/watch`) : api.delete(`${base}/watch`))
      ),

    addAttachment: (file) => run(null, () => api.post(`${base}/attachments`, file)),
    removeAttachment: (a) => run((c) => ({ ...c, attachments: c.attachments.filter((x) => x.id !== a.id), attachmentCount: c.attachmentCount - 1 }), () => api.delete(`${base}/attachments/${a.id}`)),

    // Posting is optimistic: a pending comment appears at once and is swapped for the saved one.
    async postComment(body, me, parentId = null) {
      const tempId = `tmp-${Date.now()}`;
      const temp = { id: tempId, card: cardId, author: me.id, parent: parentId, body, mentions: [], createdAt: new Date().toISOString(), editedAt: null, pending: true };
      set((d) => ({ ...d, comments: [...d.comments, temp], card: { ...d.card, commentCount: d.card.commentCount + 1 } }));
      changeRef.current?.(ref.current.card);
      try {
        const { data: res } = await api.post(`${base}/comments`, { body, parentId });
        set((d) => ({ ...d, comments: d.comments.map((c) => (c.id === tempId ? res.comment : c)) }));
        return true;
      } catch (err) {
        set((d) => ({ ...d, comments: d.comments.filter((c) => c.id !== tempId), card: { ...d.card, commentCount: d.card.commentCount - 1 } }));
        changeRef.current?.(ref.current.card);
        toast.error(errorMessage(err));
        return false;
      }
    },
    async editComment(comment, body) {
      try {
        const { data: res } = await api.patch(`${base}/comments/${comment.id}`, { body });
        set((d) => ({ ...d, comments: d.comments.map((c) => (c.id === comment.id ? res.comment : c)) }));
        return true;
      } catch (err) {
        toast.error(errorMessage(err));
        return false;
      }
    },
    async removeComment(comment) {
      const before = ref.current;
      // A thread goes with its first comment, so its replies leave too.
      set((d) => {
        const kept = d.comments.filter((c) => c.id !== comment.id && c.parent !== comment.id);
        return { ...d, comments: kept, card: { ...d.card, commentCount: Math.max(0, d.card.commentCount - (d.comments.length - kept.length)) } };
      });
      changeRef.current?.(ref.current.card);
      try {
        await api.delete(`${base}/comments/${comment.id}`);
      } catch (err) {
        set(before);
        changeRef.current?.(before.card);
        toast.error(errorMessage(err));
      }
    },
  };
}
