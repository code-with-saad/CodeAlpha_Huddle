import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errorMessage } from './api.js';
import { toast } from './toast.js';
import useChannel from './useChannel.js';

// Board state: { columns: [{id, name}], cards: { [columnId]: [card] } }, both already in display order.
// MongoDB stays the source of truth; every change is applied here first and rolled back if the API refuses it.
function build(data) {
  const cards = Object.fromEntries(data.columns.map((c) => [c.id, []]));
  for (const card of data.cards) cards[card.column]?.push(card);
  return { columns: data.columns.map(({ id, name, isDone }) => ({ id, name, isDone: !!isDone })), cards, labels: data.labels || [] };
}

export const findColumnOf = (cards, cardId) => Object.keys(cards).find((k) => cards[k].some((c) => c.id === cardId));

// Places a card in a column by its position key (used when another browser created it).
function insertByPosition(list, card) {
  const at = list.findIndex((c) => c.position > card.position);
  return at < 0 ? [...list, card] : [...list.slice(0, at), card, ...list.slice(at)];
}

// Applies one realtime event to the board. Events are idempotent: applying the same one twice, or one
// that this browser already applied optimistically, changes nothing.
function applyEvent(b, name, data) {
  const remove = (cards, id) => Object.fromEntries(Object.entries(cards).map(([k, list]) => [k, list.filter((c) => c.id !== id)]));
  if (name === 'card.upsert' || (name.startsWith('comment.') && data.card)) {
    const card = data.card;
    const col = findColumnOf(b.cards, card.id);
    if (col && col === card.column) {
      return { ...b, cards: { ...b.cards, [col]: b.cards[col].map((c) => (c.id === card.id ? { ...c, ...card } : c)) } };
    }
    if (!b.cards[card.column]) return b;
    const rest = remove(b.cards, card.id);
    return { ...b, cards: { ...rest, [card.column]: insertByPosition(rest[card.column], card) } };
  }
  if (name === 'card.moved') {
    const card = data.card;
    if (!b.cards[card.column]) return b;
    const rest = remove(b.cards, card.id);
    const list = rest[card.column];
    const at = Math.max(0, Math.min(data.index, list.length));
    return { ...b, cards: { ...rest, [card.column]: [...list.slice(0, at), card, ...list.slice(at)] } };
  }
  if (name === 'card.removed') return { ...b, cards: remove(b.cards, data.cardId) };
  return b;
}

export default function useBoard(projectId) {
  const [board, setBoardState] = useState(null);
  const [error, setError] = useState('');
  const ref = useRef(null);
  const paused = useRef(false);
  const missed = useRef(false);
  const loading = useRef(false);

  // The ref always holds the latest state so drag handlers never read a stale copy.
  const setBoard = useCallback((next) => {
    ref.current = typeof next === 'function' ? next(ref.current) : next;
    setBoardState(ref.current);
  }, []);

  const load = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    try {
      const { data } = await api.get(`/projects/${projectId}/board`);
      setBoard(build(data));
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      loading.current = false;
    }
  }, [projectId, setBoard]);

  // Live updates. While a drag is in progress events are held back (they would move cards under the
  // pointer); afterwards the board is simply reloaded. After an outage, or on first attach, it is
  // reloaded too, so nothing depends on having seen every event.
  useChannel(
    `project:${projectId}`,
    (name, data) => {
      if (name === 'board.reload') return paused.current ? (missed.current = true) : load();
      if (!ref.current) return;
      if (paused.current) {
        missed.current = true;
        return;
      }
      setBoard((b) => applyEvent(b, name, data));
    },
    () => (paused.current ? (missed.current = true) : load())
  );

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

  // The server answers a move with the card's real position key; store it so later inserts order right.
  const keepPosition = (res) => {
    const card = res.data.card;
    setBoard((b) => {
      const col = findColumnOf(b.cards, card.id);
      if (!col) return b;
      return { ...b, cards: { ...b.cards, [col]: b.cards[col].map((c) => (c.id === card.id ? { ...c, position: card.position } : c)) } };
    });
    return res;
  };

  return {
    board,
    error,
    reload: load,
    // Drag start and end: hold live events while a card is in the air.
    pause() {
      paused.current = true;
    },
    resume() {
      paused.current = false;
      if (missed.current) {
        missed.current = false;
        load();
      }
    },
    setBoard,
    getBoard: () => ref.current,

    // Applies an event to this board as if it had arrived over the network (used for our own quick results).
    applyLocal(name, data) {
      setBoard((b) => applyEvent(b, name, data));
    },
    // Folds a card returned by the detail panel back into the board so the card face stays current.
    mergeCard(card) {
      setBoard((b) => {
        const col = findColumnOf(b.cards, card.id);
        if (!col) return b;
        return { ...b, cards: { ...b.cards, [col]: b.cards[col].map((c) => (c.id === card.id ? { ...c, ...card, column: c.column } : c)) } };
      });
    },
    setLabels(update) {
      setBoard((b) => ({ ...b, labels: update(b.labels) }));
    },

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
        async () => keepPosition(await api.post(`${base}/cards/${cardId}/move`, { columnId: toColumn, index }))
      );
    },
    // Drag end: state already shows the result, so only save and roll back to the pre-drag snapshot on failure.
    saveCardMove(cardId, toColumn, index, snapshot) {
      return optimistic(null, async () => keepPosition(await api.post(`${base}/cards/${cardId}/move`, { columnId: toColumn, index })), snapshot);
    },

    async addColumn(name) {
      const { data } = await api.post(`${base}/columns`, { name });
      setBoard((b) => ({
        ...b,
        columns: [...b.columns, { id: data.column.id, name: data.column.name, isDone: !!data.column.isDone }],
        cards: { ...b.cards, [data.column.id]: [] },
      }));
    },
    renameColumn(id, name) {
      return optimistic(
        (b) => ({ ...b, columns: b.columns.map((c) => (c.id === id ? { ...c, name } : c)) }),
        () => api.patch(`${base}/columns/${id}`, { name })
      );
    },
    // Marks a column as counting as done (or not). The tasks in it complete or reopen, so the board reloads.
    async setColumnDone(id, isDone) {
      const ok = await optimistic(
        (b) => ({ ...b, columns: b.columns.map((c) => (c.id === id ? { ...c, isDone } : c)) }),
        () => api.patch(`${base}/columns/${id}`, { isDone })
      );
      if (ok) await load();
      return ok;
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
