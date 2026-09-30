import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, errorMessage } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import useFilters, { matchesFilters } from '../../lib/filters.js';
import { toast } from '../../lib/toast.js';
import useBoard from '../../lib/useBoard.js';
import { useProject } from '../ProjectLayout.jsx';

const Ctx = createContext(null);
export const useBoardCtx = () => useContext(Ctx);

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Everything the Board, List and Calendar views share: the live board data, the filters in the URL,
// the multi-select state and the actions that can be undone. Mounted once for the three views, so
// switching between them keeps the board loaded and the realtime subscription open.
export function BoardProvider({ children }) {
  const { project } = useProject();
  const { user } = useAuth();
  const board = useBoard(project.id);
  const f = useFilters();
  const [, setParams] = useSearchParams();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const base = `/projects/${project.id}`;

  const allCards = useMemo(() => (board.board ? board.board.columns.flatMap((c) => board.board.cards[c.id] || []) : []), [board.board]);
  const visible = useCallback((card) => matchesFilters(card, f.filters, user.id), [f.filters, user.id]);
  const visibleCards = useMemo(() => allCards.filter(visible), [allCards, visible]);

  const toggleSelect = useCallback((id) => setSelected((s) => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }), []);
  const clearSelection = useCallback(() => {
    setSelected(new Set());
    setSelecting(false);
  }, []);

  // The open card lives in the URL (?card=) next to the filters.
  const openCard = useCallback((id) => setParams((p) => { const n = new URLSearchParams(p); n.set('card', id); return n; }), [setParams]);
  const closeCard = useCallback(() => setParams((p) => { const n = new URLSearchParams(p); n.delete('card'); return n; }, { replace: true }), [setParams]);

  // Runs a bulk request, refreshes the board and offers Undo. `undo` builds the inverse request from the answer.
  const bulk = useCallback(
    async ({ body, message, undo }) => {
      try {
        const { data } = await api.post(`${base}/cards/bulk`, body);
        await board.reload();
        if (!data.count) {
          toast.info('Nothing changed');
          return data;
        }
        toast.success(message(data.count), {
          action: undo && {
            label: 'Undo',
            onClick: async () => {
              try {
                await api.post(`${base}/cards/bulk`, undo(data));
                await board.reload();
              } catch (err) {
                toast.error(errorMessage(err));
              }
            },
          },
        });
        return data;
      } catch (err) {
        toast.error(errorMessage(err));
        return null;
      }
    },
    [base, board]
  );

  const value = useMemo(
    () => ({
      ...board,
      project,
      filters: f.filters,
      activeFilters: f.active,
      setFilter: f.set,
      clearFilters: f.clear,
      allCards,
      visible,
      visibleCards,
      selecting,
      setSelecting,
      selected,
      toggleSelect,
      clearSelection,
      selectMany: (ids) => setSelected(new Set(ids)),
      openCard,
      closeCard,

      bulkMove: (ids, column) =>
        bulk({
          body: { action: 'move', ids, columnId: column.id },
          message: (n) => `Moved ${plural(n, 'task')} to ${column.name}`,
          undo: (d) => ({ action: 'place', ids: d.changed.map((c) => c.id), items: d.changed }),
        }),
      bulkArchive: (ids) =>
        bulk({
          body: { action: 'archive', ids },
          message: (n) => `Archived ${plural(n, 'task')}`,
          undo: (d) => ({ action: 'restore', ids: d.changed.map((c) => c.id) }),
        }),
      bulkAssign: (ids, person, mode = 'add') =>
        bulk({
          body: { action: 'assign', ids, userIds: [person.id], mode },
          message: (n) => `${mode === 'add' ? 'Assigned' : 'Unassigned'} ${person.name} ${mode === 'add' ? 'to' : 'from'} ${plural(n, 'task')}`,
          undo: (d) => ({ action: 'assign', ids: d.changed.map((c) => c.id), userIds: [person.id], mode: mode === 'add' ? 'remove' : 'add' }),
        }),
      bulkLabel: (ids, label, mode = 'add') =>
        bulk({
          body: { action: 'label', ids, labelId: label.id, mode },
          message: (n) => `${mode === 'add' ? 'Added' : 'Removed'} label ${label.name} on ${plural(n, 'task')}`,
          undo: (d) => ({ action: 'label', ids: d.changed.map((c) => c.id), labelId: label.id, mode: mode === 'add' ? 'remove' : 'add' }),
        }),

      // Archiving one card is optimistic and can be undone.
      async archiveWithUndo(card) {
        if (!(await board.archiveCard(card))) return false;
        toast.success(`Archived "${card.title}"`, {
          action: {
            label: 'Undo',
            onClick: async () => {
              try {
                await api.post(`${base}/cards/${card.id}/restore`);
                await board.reload();
              } catch (err) {
                toast.error(errorMessage(err));
              }
            },
          },
        });
        return true;
      },

      async duplicate(card) {
        try {
          const { data } = await api.post(`${base}/cards/${card.id}/duplicate`);
          board.applyLocal('card.upsert', { card: data.card });
          toast.success(`Duplicated "${card.title}"`);
        } catch (err) {
          toast.error(errorMessage(err));
        }
      },

      // Deleting a column archives it; an undo brings it back with the cards that went with it.
      async archiveColumn(column, options) {
        await board.deleteColumn(column.id, options);
        const undoable = !options.moveTo;
        toast.success(`Deleted column "${column.name}"`, {
          action: undoable && {
            label: 'Undo',
            onClick: async () => {
              try {
                await api.post(`${base}/columns/${column.id}/restore`);
                await board.reload();
              } catch (err) {
                toast.error(errorMessage(err));
              }
            },
          },
        });
      },
    }),
    [board, project, f, allCards, visible, visibleCards, selecting, selected, toggleSelect, clearSelection, bulk, base, openCard, closeCard]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
