import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errorMessage } from './api.js';
import { toast } from './toast.js';

// Board state: { columns: [{id, name}], cards: { [columnId]: [card] } }, both already in display order.
// MongoDB stays the source of truth; every change is applied here first and rolled back if the API refuses it.
function build(data) {
  const cards = Object.fromEntries(data.columns.map((c) => [c.id, []]));
  for (const card of data.cards) cards[card.column]?.push(card);
  return { columns: data.columns.map(({ id, name }) => ({ id, name })), cards };
}

export const findColumnOf = (cards, cardId) => Object.keys(cards).find((k) => cards[k].some((c) => c.id === cardId));

export default function useBoard(projectId) {
  const [board, setBoardState] = useState(null);
  const [error, setError] = useState('');
  const ref = useRef(null);

  // The ref always holds the latest state so drag handlers never read a stale copy.
  const setBoard = useCallback((next) => {
    ref.current = typeof next === 'function' ? next(ref.current) : next;
    setBoardState(ref.current);
  }, []);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/projects/${projectId}/board`);
      setBoard(build(data));
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [projectId, setBoard]);

  useEffect(() => {
    setBoard(null);
    load();
  }, [load, setBoard]);

  // Runs an optimistic change. `apply` updates local state, `request` calls the API; failure restores the snapshot.
  const optimistic = useCallback(
    async (apply, request, snapshot = ref.current) => {
      if (apply) setBoard(apply);
      try {
        await request();
        return true;
      } catch (err) {
        setBoard(snapshot);
        toast.error(errorMessage(err));
        return false;
      }
    },
    [setBoard]
  );

  const base = `/projects/${projectId}`;

  return {
    board,
    error,
    reload: load,
    setBoard,
    getBoard: () => ref.current,

    async addCard(columnId, title) {
      const { data } = await api.post(`${base}/cards`, { columnId, title });
      setBoard((b) => ({ ...b, cards: { ...b.cards, [columnId]: [...(b.cards[columnId] || []), data.card] } }));
    },
    renameCard(card, title) {
      const col = findColumnOf(ref.current.cards, card.id);
      return optimistic(
        (b) => ({ ...b, cards: { ...b.cards, [col]: b.cards[col].map((c) => (c.id === card.id ? { ...c, title } : c)) } }),
        () => api.patch(`${base}/cards/${card.id}`, { title })
      );
    },
    archiveCard(card) {
      const col = findColumnOf(ref.current.cards, card.id);
      return optimistic(
        (b) => ({ ...b, cards: { ...b.cards, [col]: b.cards[col].filter((c) => c.id !== card.id) } }),
        () => api.delete(`${base}/cards/${card.id}`)
      );
    },
    // Move without dragging (menus): updates state and saves.
    moveCard(cardId, toColumn, index) {
      return optimistic(
        (b) => {
          const from = findColumnOf(b.cards, cardId);
          const card = b.cards[from].find((c) => c.id === cardId);
          const without = b.cards[from].filter((c) => c.id !== cardId);
          const target = from === toColumn ? without : [...b.cards[toColumn]];
          const at = Math.max(0, Math.min(index, target.length));
          const placed = [...target.slice(0, at), { ...card, column: toColumn }, ...target.slice(at)];
          return { ...b, cards: { ...b.cards, [from]: from === toColumn ? placed : without, [toColumn]: placed } };
        },
        () => api.post(`${base}/cards/${cardId}/move`, { columnId: toColumn, index })
      );
    },
    // Drag end: state already shows the result, so only save and roll back to the pre-drag snapshot on failure.
    saveCardMove(cardId, toColumn, index, snapshot) {
      return optimistic(null, () => api.post(`${base}/cards/${cardId}/move`, { columnId: toColumn, index }), snapshot);
    },

    async addColumn(name) {
      const { data } = await api.post(`${base}/columns`, { name });
      setBoard((b) => ({
        columns: [...b.columns, { id: data.column.id, name: data.column.name }],
        cards: { ...b.cards, [data.column.id]: [] },
      }));
    },
    renameColumn(id, name) {
      return optimistic(
        (b) => ({ ...b, columns: b.columns.map((c) => (c.id === id ? { ...c, name } : c)) }),
        () => api.patch(`${base}/columns/${id}`, { name })
      );
    },
    saveColumnOrder(id, index, snapshot) {
      return optimistic(null, () => api.patch(`${base}/columns/${id}`, { index }), snapshot);
    },
    moveColumn(id, index) {
      return optimistic(
        (b) => {
          const col = b.columns.find((c) => c.id === id);
          const rest = b.columns.filter((c) => c.id !== id);
          return { ...b, columns: [...rest.slice(0, index), col, ...rest.slice(index)] };
        },
        () => api.patch(`${base}/columns/${id}`, { index })
      );
    },
    // options: { moveTo } or { archiveCards: true }. Reloads afterwards because cards changed columns.
    async deleteColumn(id, options = {}) {
      const params = options.moveTo ? { moveTo: options.moveTo } : options.archiveCards ? { archiveCards: '1' } : {};
      await api.delete(`${base}/columns/${id}`, { params });
      await load();
    },
  };
}
