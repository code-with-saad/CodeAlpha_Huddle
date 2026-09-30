import { CheckSquare, Plus, Search, X } from 'lucide-react';
import Icon from '../../components/Icon.jsx';
import { on, emit } from '../../lib/bus.js';
import { PRIORITY_LABEL } from './BoardCard.jsx';
import { useBoardCtx } from './BoardContext.jsx';
import { useEffect, useRef } from 'react';
import { atLeast } from '../../lib/roles.js';

// Search and filters shared by Board, List and Calendar. They live in the URL.
export default function FilterBar() {
  const ctx = useBoardCtx();
  const { project, filters, setFilter, clearFilters, activeFilters, board, visibleCards, allCards, selecting, setSelecting, clearSelection } = ctx;
  const canEdit = atLeast(project.myRole, 'member') && !project.archived;
  const input = useRef(null);

  // "/" focuses the search box (see the global shortcuts).
  useEffect(() => on('focus-filter', () => input.current?.focus()), []);

  return (
    <div className="filterbar" role="search" aria-label="Filter tasks">
      <div className="filter-search">
        <Icon as={Search} size={14} />
        <input
          ref={input}
          id="task-filter"
          className="input input-sm"
          value={filters.q}
          placeholder="Filter tasks"
          aria-label="Filter tasks by title"
          onChange={(e) => setFilter('q', e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && (setFilter('q', ''), e.currentTarget.blur())}
        />
      </div>
      <select className="input input-sm" aria-label="Assignee" value={filters.assignee} onChange={(e) => setFilter('assignee', e.target.value)}>
        <option value="">Anyone</option>
        <option value="me">Assigned to me</option>
        <option value="none">Unassigned</option>
        {project.members.map((m) => (
          <option key={m.user.id} value={m.user.id}>
            {m.user.name}
          </option>
        ))}
      </select>
      <select className="input input-sm" aria-label="Label" value={filters.label} onChange={(e) => setFilter('label', e.target.value)}>
        <option value="">Any label</option>
        {(board?.labels || []).map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
      <select className="input input-sm" aria-label="Priority" value={filters.priority} onChange={(e) => setFilter('priority', e.target.value)}>
        <option value="">Any priority</option>
        {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
      <select className="input input-sm" aria-label="Due date" value={filters.due} onChange={(e) => setFilter('due', e.target.value)}>
        <option value="">Any due date</option>
        <option value="overdue">Overdue</option>
        <option value="today">Due today</option>
        <option value="week">Next 7 days</option>
        <option value="none">No due date</option>
      </select>
      {activeFilters > 0 && (
        <button type="button" className="btn btn-sm btn-ghost" onClick={clearFilters}>
          <Icon as={X} size={14} />
          Clear
        </button>
      )}
      <span className="filter-count mono" role="status">
        {activeFilters > 0 ? `${visibleCards.length} of ${allCards.length}` : allCards.length} {allCards.length === 1 ? 'task' : 'tasks'}
      </span>
      {canEdit && (
        <div className="filter-actions">
          <button type="button" className={`btn btn-sm${selecting ? ' btn-primary' : ''}`} aria-pressed={selecting} onClick={() => (selecting ? clearSelection() : setSelecting(true))}>
            <Icon as={CheckSquare} size={14} />
            Select
          </button>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => emit('quickadd', {})}>
            <Icon as={Plus} size={14} />
            New task
          </button>
        </div>
      )}
    </div>
  );
}
