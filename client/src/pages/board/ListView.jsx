import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import Avatar from '../../components/Avatar.jsx';
import Icon from '../../components/Icon.jsx';
import { dueInfo } from '../../lib/date.js';
import { LabelChip, PRIORITY_LABEL, PriorityMark } from './BoardCard.jsx';
import { useBoardCtx } from './BoardContext.jsx';

const PRIORITY_RANK = { urgent: 4, high: 3, medium: 2, low: 1, none: 0 };

// The same tasks as the board in a sortable table. Rows become stacked cards on a phone.
export default function ListView() {
  const ctx = useBoardCtx();
  const { board, visibleCards, project, selecting, selected, toggleSelect, openCard, activeFilters } = ctx;
  const [sort, setSort] = useState({ key: 'status', dir: 'asc' });
  const columnIndex = useMemo(() => Object.fromEntries((board?.columns || []).map((c, i) => [c.id, i])), [board]);
  const columnName = useMemo(() => Object.fromEntries((board?.columns || []).map((c) => [c.id, c.name])), [board]);
  const people = useMemo(() => Object.fromEntries(project.members.map((m) => [m.user.id, m.user])), [project.members]);

  const rows = useMemo(() => {
    const dir = sort.dir === 'asc' ? 1 : -1;
    const value = {
      title: (c) => c.title.toLowerCase(),
      status: (c) => columnIndex[c.column] ?? 99,
      priority: (c) => PRIORITY_RANK[c.priority],
      due: (c) => c.dueDate || null,
    }[sort.key];
    // Stable: ties keep board order. Tasks without a due date always sort last.
    return visibleCards
      .map((c, i) => ({ c, i }))
      .sort((a, b) => {
        const x = value(a.c);
        const y = value(b.c);
        if (x === y) return a.i - b.i;
        if (x === null) return 1;
        if (y === null) return -1;
        return (x < y ? -1 : 1) * dir;
      })
      .map((r) => r.c);
  }, [visibleCards, sort, columnIndex]);

  const head = (key, label) => {
    const on = sort.key === key;
    return (
      <th scope="col" aria-sort={on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
        <button type="button" className="sort-btn" onClick={() => setSort({ key, dir: on && sort.dir === 'asc' ? 'desc' : 'asc' })}>
          {label}
          {on && <Icon as={sort.dir === 'asc' ? ArrowUp : ArrowDown} size={12} />}
        </button>
      </th>
    );
  };

  if (!board) return <div className="loading" role="status" aria-label="Loading tasks"><span className="spinner" /></div>;
  if (rows.length === 0) {
    return <div className="empty">{activeFilters ? 'No tasks match these filters.' : 'No tasks yet. Add one from the Board.'}</div>;
  }

  return (
    <div className="table-wrap">
      <table className="list-table">
        <thead>
          <tr>
            {selecting && <th scope="col" className="col-check"><span className="visually-hidden">Select</span></th>}
            {head('title', 'Task')}
            {head('status', 'Status')}
            <th scope="col">Assignees</th>
            {head('priority', 'Priority')}
            {head('due', 'Due')}
            <th scope="col">Labels</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const due = dueInfo(c.dueDate);
            const labels = c.labels.map((id) => board.labels.find((l) => l.id === id)).filter(Boolean);
            return (
              <tr key={c.id} className={selected.has(c.id) ? 'row-selected' : ''}>
                {selecting && (
                  <td className="col-check" data-label="">
                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} aria-label={`Select ${c.title}`} />
                  </td>
                )}
                <td className="cell-title" data-label="Task">
                  <button type="button" className="link-title" onClick={() => (selecting ? toggleSelect(c.id) : openCard(c.id))}>
                    {c.title}
                  </button>
                </td>
                <td data-label="Status">{columnName[c.column]}</td>
                <td data-label="Assignees">
                  <div className="avatar-stack">{c.assignees.map((id) => people[id]).filter(Boolean).slice(0, 4).map((p) => <Avatar key={p.id} user={p} size={22} />)}</div>
                  {c.assignees.length === 0 && <span className="row-sub">Nobody</span>}
                </td>
                <td data-label="Priority">{c.priority === 'none' ? <span className="row-sub">None</span> : <PriorityMark priority={c.priority} withText />}<span className="visually-hidden">{PRIORITY_LABEL[c.priority]}</span></td>
                <td data-label="Due">{due ? <span className={`meta mono meta-${due.state}`}>{due.label}</span> : <span className="row-sub">None</span>}</td>
                <td data-label="Labels">
                  <div className="cell-labels">{labels.map((l) => <LabelChip key={l.id} label={l} />)}</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
