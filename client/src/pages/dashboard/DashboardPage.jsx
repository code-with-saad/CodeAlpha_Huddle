import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleCheck } from 'lucide-react';
import Avatar from '../../components/Avatar.jsx';
import Icon from '../../components/Icon.jsx';
import { api, errorMessage } from '../../lib/api.js';
import { on } from '../../lib/bus.js';
import { dueInfo } from '../../lib/date.js';
import useChannel from '../../lib/useChannel.js';
import { PRIORITY_LABEL } from '../board/BoardCard.jsx';
import { useProject } from '../ProjectLayout.jsx';
import { BarList, StackedList, TrendChart } from './charts.jsx';
import './dashboard.css';

const RANGES = [7, 30, 90];
const PRIORITY_TONE = { urgent: 'danger', high: 'warning', medium: 'accent', low: 'muted', none: 'faint' };

function Tile({ label, value, note, tone }) {
  return (
    <div className="tile">
      <span className="tile-label">{label}</span>
      <span className={`tile-value${tone ? ` tile-${tone}` : ''}`}>{value}</span>
      {note && <span className="tile-note">{note}</span>}
    </div>
  );
}

function DueList({ title, empty, items, project, people }) {
  return (
    <section className="dash-card" aria-label={title}>
      <h3 className="dash-title">{title}</h3>
      {items.length === 0 ? (
        <p className="row-sub">{empty}</p>
      ) : (
        <ul className="due-list">
          {items.map((c) => {
            const info = dueInfo(c.dueDate);
            return (
              <li key={c.id} className="due-row">
                <Link className="due-title" to={`/p/${project.id}?card=${c.id}`}>{c.title}</Link>
                <span className="due-side">
                  <span className={`meta mono meta-${info.state}`}>{info.label}</span>
                  <span className="avatar-stack">{c.assignees.map((a) => people[a]).filter(Boolean).slice(0, 3).map((p) => <Avatar key={p.id} user={p} size={20} />)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// Numbers and charts computed from the project's real tasks. It refreshes itself when the board changes.
export default function DashboardPage() {
  const { project } = useProject();
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [table, setTable] = useState(false);
  const timer = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data: d } = await api.get(`/projects/${project.id}/dashboard`, { params: { days } });
      setData(d);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [project.id, days]);

  useEffect(() => {
    load();
  }, [load]);

  // Live: any board change reloads the numbers after a short pause, so a burst of moves is one request.
  const soon = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(load, 1200);
  }, [load]);
  useEffect(() => () => clearTimeout(timer.current), []);
  useChannel(`project:${project.id}`, (name) => /^(card\.|comment\.|board\.reload|project\.changed)/.test(name) && soon(), load);
  useEffect(() => on('access', load), [load]);

  if (error) return <p className="form-error" role="alert">{error}</p>;
  if (!data) return <div className="loading" role="status" aria-label="Loading dashboard"><span className="spinner" /></div>;

  const t = data.totals;
  const people = Object.fromEntries(project.members.map((m) => [m.user.id, m.user]));
  const empty = t.open + t.done === 0 && data.series.every((s) => !s.created && !s.completed);
  const perDay = (t.completedInRange / data.days).toFixed(1);

  const statusRows = data.byColumn.map((c) => ({ key: c.id, label: c.name, value: c.count, tone: c.isDone ? 'success' : 'accent', tag: c.isDone ? 'counts as done' : '' }));
  const personRows = [
    ...data.byAssignee.map((a) => ({ key: a.userId, label: people[a.userId]?.name || 'Former member', icon: people[a.userId] ? <Avatar user={people[a.userId]} size={20} /> : null, open: a.open, done: a.done })),
    { key: 'none', label: 'Unassigned', open: data.unassigned.open, done: data.unassigned.done },
  ];
  const priorityRows = data.byPriority.map((p) => ({ key: p.priority, label: PRIORITY_LABEL[p.priority], value: p.count, tone: PRIORITY_TONE[p.priority] }));

  return (
    <div className="dashboard">
      {empty && <div className="empty">No tasks yet. Add some on the Board and the numbers appear here.</div>}

      <div className="tiles" role="group" aria-label="Summary">
        <Tile label="Open tasks" value={t.open} />
        <Tile label="Completed" value={t.done} note={`${t.completionRate}% of all tasks`} tone={t.done ? 'success' : undefined} />
        <Tile label="Overdue" value={t.overdue} note={t.overdue ? 'Open and past their due date' : 'Nothing is late'} tone={t.overdue ? 'danger' : undefined} />
        <Tile label="Due in 7 days" value={t.dueSoon} note="Including today" />
        <Tile label="Unassigned" value={t.unassigned} note="Open tasks nobody owns" />
      </div>

      <section className="dash-card" aria-labelledby="trend-title">
        <div className="dash-head">
          <div>
            <h3 className="dash-title" id="trend-title">Completed and created</h3>
            <p className="row-sub">{t.completedInRange} completed, {t.createdInRange} created in the last {data.days} days ({perDay} completed a day)</p>
          </div>
          <div className="dash-controls">
            <div className="seg" role="radiogroup" aria-label="Time range">
              {RANGES.map((r) => (
                <button key={r} type="button" role="radio" aria-checked={days === r} className={`seg-btn${days === r ? ' seg-on' : ''}`} onClick={() => setDays(r)}>
                  {r} days
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-sm" aria-pressed={table} onClick={() => setTable((v) => !v)}>
              {table ? 'Show chart' : 'Show table'}
            </button>
          </div>
        </div>
        <div className="legend" aria-label="Legend">
          <span><i className="key key-col" />Completed</span>
          <span><i className="key key-line" />Created</span>
        </div>
        <TrendChart series={data.series} table={table} />
      </section>

      <div className="dash-grid">
        <section className="dash-card" aria-labelledby="status-title">
          <h3 className="dash-title" id="status-title">Tasks by status</h3>
          <p className="row-sub">Columns marked as counting as done are shown in green.</p>
          <BarList rows={statusRows} label="Tasks by status" />
        </section>
        <section className="dash-card" aria-labelledby="person-title">
          <h3 className="dash-title" id="person-title">Tasks per person</h3>
          <div className="legend" aria-label="Legend">
            <span><i className="key key-open" />Open</span>
            <span><i className="key key-done" />Done</span>
          </div>
          <StackedList rows={personRows} label="Tasks per person" />
        </section>
        <section className="dash-card" aria-labelledby="prio-title">
          <h3 className="dash-title" id="prio-title">Open tasks by priority</h3>
          <BarList rows={priorityRows} label="Open tasks by priority" />
        </section>
        <div className="dash-lists">
          <DueList title={`Overdue (${t.overdue})`} empty="Nothing is overdue." items={data.overdue} project={project} people={people} />
          <DueList title={`Due in the next 7 days (${t.dueSoon})`} empty="Nothing is due this week." items={data.dueSoon} project={project} people={people} />
        </div>
      </div>
      <p className="row-sub dash-foot">
        <Icon as={CircleCheck} size={13} /> A task counts as done while it sits in a column marked as counting as done. Change that from a column's menu on the Board.
      </p>
    </div>
  );
}
