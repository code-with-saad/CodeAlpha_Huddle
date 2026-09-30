import { useEffect, useRef, useState } from 'react';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MoreHorizontal, Plus } from 'lucide-react';
import Icon from '../../components/Icon.jsx';
import Menu from '../../components/Menu.jsx';
import BoardCard from './BoardCard.jsx';

function AddCard({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const input = useRef(null);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  async function submit(e) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setBusy(true);
    setError('');
    // Clear right away so fast typing goes into the next task; the text comes back if saving fails.
    setTitle('');
    try {
      await onAdd(t);
    } catch (err) {
      setTitle((cur) => cur || t);
      setError(err.response?.data?.errors?.title || err.response?.data?.message || 'Could not add the task');
    } finally {
      setBusy(false);
      input.current?.focus();
    }
  }

  if (!open) {
    return (
      <button type="button" className="add-card" onClick={() => setOpen(true)}>
        <Icon as={Plus} />
        Add task
      </button>
    );
  }
  return (
    <form className="add-card-form" onSubmit={submit}>
      <input
        ref={input}
        className="input"
        value={title}
        maxLength={200}
        placeholder="Task title"
        aria-label="Task title"
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && (setOpen(false), setTitle(''), setError(''))}
      />
      {error && <span className="field-error">{error}</span>}
      <div className="row-actions" style={{ justifyContent: 'flex-start' }}>
        <button className="btn btn-primary btn-sm" disabled={busy || !title.trim()}>
          {busy && <span className="spinner" aria-hidden="true" />}
          Add
        </button>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => (setOpen(false), setTitle(''), setError(''))}>
          Done
        </button>
      </div>
    </form>
  );
}

export default function BoardColumn({ column, index, columns, cards, labels, people, canEdit, canDrag, canManage, filtered, actions }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: `col:${column.id}`,
    data: { type: 'column' },
    disabled: !canManage,
  });

  const menuItems = [
    { label: 'Rename', onSelect: () => actions.renameColumn(column) },
    { label: 'Move left', disabled: index === 0, onSelect: () => actions.moveColumn(column, index - 1) },
    { label: 'Move right', disabled: index === columns.length - 1, onSelect: () => actions.moveColumn(column, index + 1) },
    { separator: true },
    { label: 'Delete column', danger: true, disabled: columns.length <= 1, onSelect: () => actions.deleteColumn(column) },
  ];

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`column${isDragging ? ' column-dragging' : ''}`}
      aria-label={column.name}
    >
      <header className="column-head">
        {canManage && (
          <button ref={setActivatorNodeRef} type="button" className="icon-btn drag-handle" aria-label={`Drag column ${column.name}`} {...attributes} {...listeners}>
            <Icon as={GripVertical} />
          </button>
        )}
        <h2 className="column-name">{column.name}</h2>
        <span className="column-count mono" aria-label={`${cards.length} tasks`}>
          {cards.length}
        </span>
        {canManage && <Menu label={`Actions for column ${column.name}`} trigger={<Icon as={MoreHorizontal} size={16} />} items={menuItems} />}
      </header>

      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="column-cards">
          {cards.map((card, i) => (
            <BoardCard
              key={card.id}
              card={card}
              index={i}
              count={cards.length}
              columnId={column.id}
              columns={columns}
              canEdit={canEdit}
              canDrag={canDrag}
              reorder={!filtered}
              labels={labels}
              people={people}
              onOpen={actions.openCard}
              onEdit={actions.editCard}
              onDuplicate={actions.duplicateCard}
              onMove={actions.moveCard}
              onArchive={actions.archiveCard}
            />
          ))}
          {cards.length === 0 && <p className="column-empty">{filtered ? 'No matching tasks.' : canEdit ? 'No tasks. Add one below.' : 'No tasks.'}</p>}
        </div>
      </SortableContext>

      {canEdit && <AddCard onAdd={(title) => actions.addCard(column.id, title)} />}
    </section>
  );
}
