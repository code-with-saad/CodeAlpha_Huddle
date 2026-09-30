import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import Dialog from '../../components/Dialog.jsx';
import Icon from '../../components/Icon.jsx';
import { emit } from '../../lib/bus.js';
import { todayStr } from '../../lib/date.js';
import { atLeast } from '../../lib/roles.js';
import { useBoardCtx } from './BoardContext.jsx';

const pad = (n) => String(n).padStart(2, '0');
const key = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

// Cards on the day they are due. A grid from tablet width up, a day by day agenda on phones.
export default function CalendarView() {
  const ctx = useBoardCtx();
  const { board, visibleCards, allCards, project, openCard } = ctx;
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [dayOpen, setDayOpen] = useState(null);
  const canEdit = atLeast(project.myRole, 'member') && !project.archived;
  const today = todayStr();

  const byDay = useMemo(() => {
    const map = {};
    for (const c of visibleCards) if (c.dueDate) (map[c.dueDate] ||= []).push(c);
    return map;
  }, [visibleCards]);
  const undated = allCards.filter((c) => !c.dueDate).length;

  // Weeks start on Monday. Six rows always, so the grid does not jump between months.
  const cells = useMemo(() => {
    const first = new Date(Date.UTC(cursor.y, cursor.m, 1));
    const lead = (first.getUTCDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(Date.UTC(cursor.y, cursor.m, 1 - lead + i));
      return { date: key(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()), day: d.getUTCDate(), inMonth: d.getUTCMonth() === cursor.m };
    });
  }, [cursor]);

  const monthLabel = new Date(Date.UTC(cursor.y, cursor.m, 1)).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(2024, 0, 1 + i)).toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' }));
  const step = (n) => setCursor(({ y, m }) => { const d = new Date(y, m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const monthDays = cells.filter((c) => c.inMonth && byDay[c.date]);
  const colName = (id) => board.columns.find((c) => c.id === id)?.name || '';

  const chip = (c) => (
    <button key={c.id} type="button" className={`cal-chip${c.dueDate < today && !c.done ? ' cal-chip-overdue' : ''}`} onClick={() => openCard(c.id)} title={`${c.title} (${colName(c.column)})`}>
      {c.title}
    </button>
  );

  if (!board) return <div className="loading" role="status" aria-label="Loading calendar"><span className="spinner" /></div>;

  return (
    <div className="calendar">
      <div className="cal-head">
        <h2 className="cal-title" aria-live="polite">{monthLabel}</h2>
        <div className="cal-nav">
          <button type="button" className="icon-btn" aria-label="Previous month" onClick={() => step(-1)}><Icon as={ChevronLeft} size={18} /></button>
          <button type="button" className="btn btn-sm" onClick={() => setCursor({ y: now.getFullYear(), m: now.getMonth() })}>Today</button>
          <button type="button" className="icon-btn" aria-label="Next month" onClick={() => step(1)}><Icon as={ChevronRight} size={18} /></button>
        </div>
        <span className="row-sub">{undated} without a due date</span>
      </div>

      <div className="cal-grid" role="grid" aria-label={monthLabel}>
        {weekdays.map((w) => <div key={w} className="cal-dow" role="columnheader">{w}</div>)}
        {cells.map((cell) => {
          const list = byDay[cell.date] || [];
          return (
            <div key={cell.date} role="gridcell" className={`cal-cell${cell.inMonth ? '' : ' cal-out'}${cell.date === today ? ' cal-today' : ''}`}>
              <div className="cal-daynum">
                <span className="mono">{cell.day}</span>
                {canEdit && cell.inMonth && (
                  <button type="button" className="icon-btn cal-add" aria-label={`New task due ${cell.date}`} onClick={() => emit('quickadd', { dueDate: cell.date })}>
                    <Icon as={Plus} size={12} />
                  </button>
                )}
              </div>
              {list.slice(0, 3).map(chip)}
              {list.length > 3 && <button type="button" className="cal-more" onClick={() => setDayOpen(cell.date)}>+{list.length - 3} more</button>}
            </div>
          );
        })}
      </div>

      <div className="cal-agenda">
        {monthDays.length === 0 && <div className="empty">No tasks are due in {monthLabel}.</div>}
        {monthDays.map((cell) => (
          <section key={cell.date} className="agenda-day" aria-label={cell.date}>
            <h3 className={`agenda-date${cell.date === today ? ' agenda-today' : ''}`}>
              {new Date(`${cell.date}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' })}
            </h3>
            <div className="agenda-list">{byDay[cell.date].map((c) => <div key={c.id} className="agenda-row">{chip(c)}<span className="row-sub">{colName(c.column)}</span></div>)}</div>
          </section>
        ))}
      </div>

      {dayOpen && (
        <Dialog title={new Date(`${dayOpen}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })} onClose={() => setDayOpen(null)}>
          <div className="agenda-list">{(byDay[dayOpen] || []).map((c) => <div key={c.id} className="agenda-row">{chip({ ...c })}<span className="row-sub">{colName(c.column)}</span></div>)}</div>
        </Dialog>
      )}
    </div>
  );
}
