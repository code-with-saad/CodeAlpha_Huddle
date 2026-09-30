import { useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  getFirstCollision,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import Dialog from '../../components/Dialog.jsx';
import Icon from '../../components/Icon.jsx';
import PromptDialog from '../../components/PromptDialog.jsx';
import { errorMessage } from '../../lib/api.js';
import { atLeast } from '../../lib/roles.js';
import { toast } from '../../lib/toast.js';
import useBoard, { findColumnOf } from '../../lib/useBoard.js';
import { useProject } from '../ProjectLayout.jsx';
import BoardColumn from './BoardColumn.jsx';
import { CardView } from './BoardCard.jsx';
import './board.css';

const colId = (id) => String(id).slice(4);
const isColumnId = (id) => String(id).startsWith('col:');

function AddColumn({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await onAdd(name.trim());
      setName('');
      setOpen(false);
    } catch (err) {
      setError(err.response?.data?.errors?.name || err.response?.data?.message || 'Could not add the column');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="add-column" onClick={() => setOpen(true)}>
        <Icon as={Plus} />
        Add column
      </button>
    );
  }
  return (
    <form className="add-column-form" onSubmit={submit}>
      <input
        className="input"
        value={name}
        maxLength={40}
        placeholder="Column name"
        aria-label="Column name"
        autoFocus
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && (setOpen(false), setName(''), setError(''))}
      />
      {error && <span className="field-error">{error}</span>}
      <div className="row-actions" style={{ justifyContent: 'flex-start' }}>
        <button className="btn btn-primary btn-sm" disabled={busy || !name.trim()}>
          {busy && <span className="spinner" aria-hidden="true" />}
          Add column
        </button>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => (setOpen(false), setName(''), setError(''))}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function DeleteColumnDialog({ column, others, cardCount, onDelete, onClose }) {
  const [mode, setMode] = useState('move');
  const [target, setTarget] = useState(others[0]?.id || '');
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      await onDelete(cardCount ? (mode === 'move' ? { moveTo: target } : { archiveCards: true }) : {});
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Dialog
      title="Delete column"
      onClose={onClose}
      narrow
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} data-autofocus>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={run} disabled={busy}>
            {busy && <span className="spinner" aria-hidden="true" />}
            Delete column
          </button>
        </>
      }
    >
      {cardCount === 0 ? (
        <p>Delete the column "{column.name}"? It has no tasks.</p>
      ) : (
        <>
          <p>
            "{column.name}" has {cardCount} {cardCount === 1 ? 'task' : 'tasks'}. Choose what happens to {cardCount === 1 ? 'it' : 'them'}.
          </p>
          <fieldset className="choice">
            <label>
              <input type="radio" name="mode" checked={mode === 'move'} onChange={() => setMode('move')} />
              Move tasks to
              <select className="input" value={target} onChange={(e) => setTarget(e.target.value)} disabled={mode !== 'move'} aria-label="Target column">
                {others.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <input type="radio" name="mode" checked={mode === 'archive'} onChange={() => setMode('archive')} />
              Archive the tasks with the column
            </label>
          </fieldset>
        </>
      )}
    </Dialog>
  );
}

export default function BoardPage() {
  const { project } = useProject();
  const api = useBoard(project.id);
  const { board } = api;
  const canEdit = atLeast(project.myRole, 'member') && !project.archived;
  const canManage = atLeast(project.myRole, 'admin') && !project.archived;

  const [active, setActive] = useState(null); // { type, id }
  const [dialog, setDialog] = useState(null); // { kind, ... }
  const snapshot = useRef(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Long press on touch so scrolling the board with a finger still works.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const columnIds = useMemo(() => (board ? board.columns.map((c) => `col:${c.id}`) : []), [board]);

  // Cards hover over columns and cards; columns only over columns.
  const collision = (args) => {
    if (args.active.data.current?.type === 'column') {
      return closestCenter({ ...args, droppableContainers: args.droppableContainers.filter((c) => isColumnId(c.id)) });
    }
    const pointer = pointerWithin(args);
    const hits = pointer.length ? pointer : rectIntersection(args);
    let overId = getFirstCollision(hits, 'id');
    if (overId != null && isColumnId(overId)) {
      const cards = api.getBoard().cards[colId(overId)] || [];
      if (cards.length) {
        const ids = new Set(cards.map((c) => c.id));
        overId = closestCenter({ ...args, droppableContainers: args.droppableContainers.filter((c) => ids.has(c.id)) })[0]?.id ?? overId;
      }
    }
    return overId != null ? [{ id: overId }] : [];
  };

  function onDragStart({ active: a }) {
    snapshot.current = api.getBoard();
    setActive({ type: a.data.current?.type, id: a.id });
  }

  // Cross-column drag: move the card in state while hovering so the target column makes room.
  function onDragOver({ active: a, over }) {
    if (a.data.current?.type !== 'card' || !over) return;
    const current = api.getBoard();
    const from = findColumnOf(current.cards, a.id);
    const to = isColumnId(over.id) ? colId(over.id) : findColumnOf(current.cards, over.id);
    if (!from || !to || from === to) return;
    api.setBoard((b) => {
      const card = b.cards[from].find((c) => c.id === a.id);
      const target = b.cards[to];
      const overIndex = isColumnId(over.id) ? target.length : target.findIndex((c) => c.id === over.id);
      const below = a.rect.current.translated && over.rect && a.rect.current.translated.top > over.rect.top + over.rect.height / 2;
      const at = isColumnId(over.id) ? target.length : overIndex + (below ? 1 : 0);
      return {
        ...b,
        cards: {
          ...b.cards,
          [from]: b.cards[from].filter((c) => c.id !== a.id),
          [to]: [...target.slice(0, at), { ...card, column: to }, ...target.slice(at)],
        },
      };
    });
  }

  function onDragEnd({ active: a, over }) {
    const before = snapshot.current;
    setActive(null);
    snapshot.current = null;
    if (!over) return api.setBoard(before);

    if (a.data.current?.type === 'column') {
      const from = api.getBoard().columns.findIndex((c) => `col:${c.id}` === a.id);
      const to = api.getBoard().columns.findIndex((c) => `col:${c.id}` === over.id);
      if (from === to || to < 0) return;
      api.setBoard((b) => ({ ...b, columns: arrayMove(b.columns, from, to) }));
      api.saveColumnOrder(colId(a.id), to, before);
      return;
    }

    let current = api.getBoard();
    const col = findColumnOf(current.cards, a.id);
    if (!col) return;
    const list = current.cards[col];
    const oldIndex = list.findIndex((c) => c.id === a.id);
    const overIndex = isColumnId(over.id) ? -1 : list.findIndex((c) => c.id === over.id);
    if (overIndex >= 0 && overIndex !== oldIndex) {
      api.setBoard((b) => ({ ...b, cards: { ...b.cards, [col]: arrayMove(b.cards[col], oldIndex, overIndex) } }));
      current = api.getBoard();
    }
    const newIndex = current.cards[col].findIndex((c) => c.id === a.id);
    const wasCol = findColumnOf(before.cards, a.id);
    const wasIndex = before.cards[wasCol].findIndex((c) => c.id === a.id);
    if (wasCol === col && wasIndex === newIndex) return;
    api.saveCardMove(a.id, col, newIndex, before);
  }

  function onDragCancel() {
    if (snapshot.current) api.setBoard(snapshot.current);
    snapshot.current = null;
    setActive(null);
  }

  if (api.error) {
    return (
      <p className="form-error" role="alert">
        {api.error}{' '}
        <button type="button" className="btn-link" onClick={api.reload}>
          Try again
        </button>
      </p>
    );
  }
  if (!board) {
    return (
      <div className="loading" role="status" aria-label="Loading board">
        <span className="spinner" />
      </div>
    );
  }

  const actions = {
    addCard: api.addCard,
    editCard: (card) => setDialog({ kind: 'card', card }),
    moveCard: (card, toCol, index) => {
      const cur = api.getBoard();
      const list = cur.cards[toCol] || [];
      return api.moveCard(card.id, toCol, index === Infinity ? list.length : Math.max(0, index));
    },
    archiveCard: api.archiveCard,
    renameColumn: (column) => setDialog({ kind: 'rename', column }),
    moveColumn: (column, index) => api.moveColumn(column.id, index),
    deleteColumn: (column) => setDialog({ kind: 'delete', column }),
  };

  const activeCard = active?.type === 'card' ? board.cards[findColumnOf(board.cards, active.id)]?.find((c) => c.id === active.id) : null;
  const activeColumn = active?.type === 'column' ? board.columns.find((c) => `col:${c.id}` === active.id) : null;

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={onDragCancel}>
        <div className={`board${active ? ' board-dragging' : ''}`}>
          <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
            {board.columns.map((column, i) => (
              <BoardColumn
                key={column.id}
                column={column}
                index={i}
                columns={board.columns}
                cards={board.cards[column.id] || []}
                canEdit={canEdit}
                canManage={canManage}
                actions={actions}
              />
            ))}
          </SortableContext>
          {canManage && <AddColumn onAdd={api.addColumn} />}
        </div>
        <DragOverlay>
          {activeCard && <CardView card={activeCard} overlay />}
          {activeColumn && (
            <div className="column column-overlay">
              <header className="column-head">
                <h2 className="column-name">{activeColumn.name}</h2>
              </header>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {dialog?.kind === 'card' && (
        <PromptDialog
          title="Edit title"
          label="Title"
          initial={dialog.card.title}
          maxLength={200}
          onSubmit={async (title) => {
            if (!(await api.renameCard(dialog.card, title))) throw new Error('Could not save the title');
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'rename' && (
        <PromptDialog
          title="Rename column"
          label="Name"
          initial={dialog.column.name}
          maxLength={40}
          onSubmit={async (name) => {
            if (!(await api.renameColumn(dialog.column.id, name))) throw new Error('Could not save the name');
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'delete' && (
        <DeleteColumnDialog
          column={dialog.column}
          others={board.columns.filter((c) => c.id !== dialog.column.id)}
          cardCount={(board.cards[dialog.column.id] || []).length}
          onDelete={(options) => api.deleteColumn(dialog.column.id, options)}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
}
