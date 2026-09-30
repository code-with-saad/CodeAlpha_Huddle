import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CheckSquare, CircleCheck, Flag, MessageSquare, MoreHorizontal, Paperclip } from 'lucide-react';
import Avatar from '../../components/Avatar.jsx';
import Icon from '../../components/Icon.jsx';
import Menu from '../../components/Menu.jsx';
import { dueInfo } from '../../lib/date.js';
import { textOn } from '../../lib/labelColors.js';
import { useBoardCtx } from './BoardContext.jsx';

export const PRIORITY_LABEL = { none: 'No priority', low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };

export function LabelChip({ label }) {
  return (
    <span className="label-chip" style={{ background: label.color, color: textOn(label.color) }}>
      {label.name}
    </span>
  );
}

export function PriorityMark({ priority, withText = false }) {
  if (priority === 'none') return null;
  return (
    <span className={`priority priority-${priority}`} title={`Priority: ${PRIORITY_LABEL[priority]}`}>
      <Icon as={Flag} size={13} />
      {withText ? <span>{PRIORITY_LABEL[priority]}</span> : <span className="visually-hidden">Priority: {PRIORITY_LABEL[priority]}</span>}
    </span>
  );
}

// Visual card. Also used inside the drag overlay, so it takes no drag hooks itself.
export function CardView({ card, menu, labels = [], people = [], overlay = false, selectable = false, checked = false }) {
  // A finished task is never overdue, so the date stays plain.
  const due = dueInfo(card.dueDate);
  const dueState = card.done ? 'later' : due?.state;
  const cardLabels = (card.labels || []).map((id) => labels.find((l) => l.id === id)).filter(Boolean);
  const assignees = (card.assignees || []).map((id) => people.find((p) => p.id === id)).filter(Boolean);
  const { done = 0, total = 0 } = card.checklist || {};
  const hasMeta = due || card.done || total || card.commentCount || card.attachmentCount;

  return (
    <div className={`card${overlay ? ' card-overlay' : ''}${checked ? ' card-selected' : ''}`}>
      {cardLabels.length > 0 && (
        <div className="card-labels">
          {cardLabels.slice(0, 3).map((l) => (
            <LabelChip key={l.id} label={l} />
          ))}
          {cardLabels.length > 3 && <span className="label-more">+{cardLabels.length - 3}</span>}
        </div>
      )}
      <div className="card-top">
        {selectable && <input type="checkbox" className="card-check" checked={checked} readOnly tabIndex={-1} aria-label={`Select ${card.title}`} />}
        <p className="card-title">{card.title}</p>
        {menu}
      </div>
      {(hasMeta || assignees.length > 0 || card.priority !== 'none') && (
        <div className="card-foot">
          <div className="card-meta mono">
            {due && (
              <span className={`meta meta-${dueState}`} title={due.text}>
                {due.label}
                <span className="visually-hidden">. {due.text}</span>
              </span>
            )}
            {card.done && (
              <span className="meta meta-done" title="Completed">
                <Icon as={CircleCheck} size={13} />
                Done
              </span>
            )}
            {total > 0 && (
              <span className={`meta${done === total ? ' meta-done' : ''}`} title="Checklist">
                <Icon as={CheckSquare} size={13} />
                {done}/{total}
              </span>
            )}
            {card.commentCount > 0 && (
              <span className="meta" title="Comments">
                <Icon as={MessageSquare} size={13} />
                {card.commentCount}
              </span>
            )}
            {card.attachmentCount > 0 && (
              <span className="meta" title="Attachments">
                <Icon as={Paperclip} size={13} />
                {card.attachmentCount}
              </span>
            )}
          </div>
          <div className="card-side">
            <PriorityMark priority={card.priority} />
            {assignees.length > 0 && (
              <div className="avatar-stack" aria-label={`Assigned to ${assignees.map((a) => a.name).join(', ')}`}>
                {assignees.slice(0, 3).map((a) => (
                  <Avatar key={a.id} user={a} size={22} />
                ))}
                {assignees.length > 3 && <span className="label-more">+{assignees.length - 3}</span>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BoardCard({ card, index, columnId, columns, count, canEdit, canDrag, reorder, labels, people, onOpen, onEdit, onDuplicate, onMove, onArchive }) {
  const { selecting, selected, toggleSelect } = useBoardCtx();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', columnId },
    disabled: !canDrag,
  });

  // The Move to menu is the touch-friendly path: every action a drag can do is here too.
  const menu = canEdit && !selecting && (
    <Menu
      label={`Actions for ${card.title}`}
      className="icon-btn card-menu"
      trigger={<Icon as={MoreHorizontal} size={16} />}
      items={[
        { label: 'Open', onSelect: () => onOpen(card) },
        { label: 'Edit title', onSelect: () => onEdit(card) },
        { label: 'Duplicate', onSelect: () => onDuplicate(card) },
        { separator: true },
        { label: 'Move up', disabled: !reorder || index === 0, onSelect: () => onMove(card, columnId, index - 1) },
        { label: 'Move down', disabled: !reorder || index === count - 1, onSelect: () => onMove(card, columnId, index + 1) },
        { separator: true },
        { heading: 'Move to' },
        ...columns.map((c) => ({ label: c.name, disabled: c.id === columnId, onSelect: () => onMove(card, c.id, Infinity) })),
        { separator: true },
        { label: 'Archive', danger: true, onSelect: () => onArchive(card) },
      ]}
    />
  );

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'card-slot card-slot-dragging' : 'card-slot'}
      {...attributes}
      {...listeners}
      aria-roledescription="sortable card"
      onClick={() => (selecting ? toggleSelect(card.id) : onOpen(card))}
      onKeyDown={(e) => {
        // Enter opens the card (or ticks it while selecting); dnd-kit keeps Space for picking it up.
        if (e.key === 'Enter' && e.target === e.currentTarget) {
          if (selecting) toggleSelect(card.id);
          else onOpen(card);
        } else listeners?.onKeyDown?.(e);
      }}
    >
      <CardView card={card} menu={menu} labels={labels} people={people} selectable={selecting} checked={selected.has(card.id)} />
    </div>
  );
}
