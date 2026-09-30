import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MoreHorizontal } from 'lucide-react';
import Icon from '../../components/Icon.jsx';
import Menu from '../../components/Menu.jsx';

// Visual card. Also used inside the drag overlay, so it takes no drag hooks itself.
export function CardView({ card, menu, overlay = false }) {
  return (
    <div className={`card${overlay ? ' card-overlay' : ''}`}>
      <p className="card-title">{card.title}</p>
      {menu}
    </div>
  );
}

export default function BoardCard({ card, index, columnId, columns, count, canEdit, onEdit, onMove, onArchive }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', columnId },
    disabled: !canEdit,
  });

  // The Move to menu is the touch-friendly path: every action a drag can do is here too.
  const menu = canEdit && (
    <Menu
      label={`Actions for ${card.title}`}
      className="icon-btn card-menu"
      trigger={<Icon as={MoreHorizontal} size={16} />}
      items={[
        { label: 'Edit title', onSelect: () => onEdit(card) },
        { separator: true },
        { label: 'Move up', disabled: index === 0, onSelect: () => onMove(card, columnId, index - 1) },
        { label: 'Move down', disabled: index === count - 1, onSelect: () => onMove(card, columnId, index + 1) },
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
    >
      <CardView card={card} menu={menu} />
    </div>
  );
}
