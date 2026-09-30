import Card from '../models/Card.js';
import Column from '../models/Column.js';

const DAY = 86400000;
const day = (d) => d.toISOString().slice(0, 10);

// GET /api/projects/:id/dashboard?days=7|30|90
// Every number is computed from the project's real tasks. "Done" means the task sits in a column marked as
// counting as done (completedAt is set then), so a completion is a real event with a date.
export async function getDashboard(req, res) {
  const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
  const [columns, cards] = await Promise.all([
    Column.find({ project: req.project._id, archivedAt: null }).sort({ position: 1 }),
    Card.find({ project: req.project._id }).select('column priority dueDate assignees completedAt archivedAt createdAt title').lean(),
  ]);

  const todayDate = new Date();
  todayDate.setUTCHours(0, 0, 0, 0);
  const today = day(todayDate);
  const weekEnd = day(new Date(todayDate.getTime() + 7 * DAY));

  const active = cards.filter((c) => !c.archivedAt);
  const open = active.filter((c) => !c.completedAt);
  const done = active.filter((c) => c.completedAt);
  const due = (c) => (c.dueDate ? day(c.dueDate) : null);
  const overdue = open.filter((c) => due(c) && due(c) < today);
  const dueSoon = open.filter((c) => due(c) && due(c) >= today && due(c) <= weekEnd);

  // Tasks per column, in board order.
  const byColumn = columns.map((col) => ({ id: col._id, name: col.name, isDone: !!col.isDone, count: active.filter((c) => String(c.column) === String(col._id)).length }));

  // Tasks per person: open and done, plus tasks nobody owns.
  const byAssignee = req.project.members.map((m) => {
    const mine = active.filter((c) => c.assignees.some((a) => String(a) === String(m.user)));
    return { userId: String(m.user), open: mine.filter((c) => !c.completedAt).length, done: mine.filter((c) => c.completedAt).length };
  });
  const unassigned = { open: open.filter((c) => !c.assignees.length).length, done: done.filter((c) => !c.assignees.length).length };

  const byPriority = ['urgent', 'high', 'medium', 'low', 'none'].map((p) => ({ priority: p, count: open.filter((c) => c.priority === p).length }));

  // Created and completed per calendar day (UTC), including tasks archived since: history should not vanish.
  const series = [];
  const index = new Map();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = day(new Date(todayDate.getTime() - i * DAY));
    index.set(d, series.length);
    series.push({ date: d, created: 0, completed: 0 });
  }
  for (const c of cards) {
    const made = index.get(day(c.createdAt));
    if (made !== undefined) series[made].created += 1;
    if (c.completedAt) {
      const fin = index.get(day(c.completedAt));
      if (fin !== undefined) series[fin].completed += 1;
    }
  }
  const completedInRange = series.reduce((n, s) => n + s.completed, 0);
  const createdInRange = series.reduce((n, s) => n + s.created, 0);

  const brief = (c) => ({ id: c._id, title: c.title, dueDate: due(c), assignees: c.assignees.map(String), priority: c.priority });
  const byDue = (a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0);

  res.json({
    days,
    totals: {
      open: open.length,
      done: done.length,
      overdue: overdue.length,
      dueSoon: dueSoon.length,
      unassigned: unassigned.open,
      completedInRange,
      createdInRange,
      completionRate: active.length ? Math.round((done.length / active.length) * 100) : 0,
    },
    byColumn,
    byAssignee,
    unassigned,
    byPriority,
    series,
    overdue: overdue.map(brief).sort(byDue).slice(0, 8),
    dueSoon: dueSoon.map(brief).sort(byDue).slice(0, 8),
  });
}
