import { Archive, ArrowRightLeft, Tag, UserPlus, X } from 'lucide-react';
import Avatar from '../../components/Avatar.jsx';
import Icon from '../../components/Icon.jsx';
import Menu from '../../components/Menu.jsx';
import Popover from '../../components/Popover.jsx';
import { LabelChip } from './BoardCard.jsx';
import { useBoardCtx } from './BoardContext.jsx';

// Appears while selecting. Every action goes to the server as one request and can be undone.
export default function BulkBar() {
  const ctx = useBoardCtx();
  const { selecting, selected, allCards, visibleCards, board, project, clearSelection, selectMany } = ctx;
  if (!selecting) return null;

  const ids = [...selected];
  const chosen = allCards.filter((c) => selected.has(c.id));
  const n = ids.length;
  const busy = false;
  const done = () => clearSelection();

  // A person or label is removed when every selected card already has it, otherwise added to the rest.
  const allHave = (test) => chosen.length > 0 && chosen.every(test);

  return (
    <div className="bulk-bar" role="toolbar" aria-label="Actions for selected tasks">
      <span className="bulk-count mono" role="status">
        {n} selected
      </span>
      <button type="button" className="btn btn-sm btn-ghost" onClick={() => selectMany(visibleCards.map((c) => c.id))}>
        Select all {visibleCards.length}
      </button>
      <div className="bulk-actions">
        <Menu
          label="Move selected tasks"
          className="btn btn-sm"
          trigger={<><Icon as={ArrowRightLeft} size={14} />Move</>}
          items={[{ heading: 'Move to' }, ...board.columns.map((c) => ({ label: c.name, disabled: !n || busy, onSelect: () => ctx.bulkMove(ids, c).then(done) }))]}
        />
        <Popover label="Assign selected tasks" className="btn btn-sm" trigger={<><Icon as={UserPlus} size={14} />Assign</>} width={260}>
          {(close) => (
            <ul className="pick-list" aria-label="Assign or unassign">
              {project.members.map((m) => {
                const has = allHave((c) => c.assignees.includes(m.user.id));
                return (
                  <li key={m.user.id}>
                    <button type="button" className="pick-row pick-btn" disabled={!n} onClick={() => { close(false); ctx.bulkAssign(ids, m.user, has ? 'remove' : 'add').then(done); }}>
                      <Avatar user={m.user} size={22} />
                      <span className="pick-name">{m.user.name}</span>
                      <span className="row-sub">{has ? 'Remove' : 'Add'}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Popover>
        <Popover label="Label selected tasks" className="btn btn-sm" trigger={<><Icon as={Tag} size={14} />Label</>} width={260}>
          {(close) =>
            board.labels.length === 0 ? (
              <p className="row-sub pick-empty">No labels yet. Create one from a card.</p>
            ) : (
              <ul className="pick-list" aria-label="Add or remove a label">
                {board.labels.map((l) => {
                  const has = allHave((c) => c.labels.includes(l.id));
                  return (
                    <li key={l.id}>
                      <button type="button" className="pick-row pick-btn" disabled={!n} onClick={() => { close(false); ctx.bulkLabel(ids, l, has ? 'remove' : 'add').then(done); }}>
                        <LabelChip label={l} />
                        <span className="row-sub">{has ? 'Remove' : 'Add'}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
          }
        </Popover>
        <button type="button" className="btn btn-sm" disabled={!n} onClick={() => ctx.bulkArchive(ids).then(done)}>
          <Icon as={Archive} size={14} />
          Archive
        </button>
      </div>
      <button type="button" className="icon-btn" onClick={clearSelection} aria-label="Cancel selection">
        <Icon as={X} size={16} />
      </button>
    </div>
  );
}
