import Card from '../models/Card.js';
import Column from '../models/Column.js';
import Project from '../models/Project.js';

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/search?q=  Search across every project you belong to: project names, card titles and descriptions.
export async function search(req, res) {
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 60) : '';
  if (q.length < 2) return res.json({ projects: [], cards: [] });
  const re = new RegExp(escapeRe(q), 'i');

  const mine = await Project.find({ 'members.user': req.user._id, archivedAt: null }).select('name');
  const ids = mine.map((p) => p._id);
  const cards = await Card.find({ project: { $in: ids }, archivedAt: null, $or: [{ title: re }, { description: re }] })
    .sort({ updatedAt: -1 })
    .limit(12)
    .select('title project column description');
  const columns = new Map((await Column.find({ _id: { $in: cards.map((c) => c.column) } }).select('name')).map((c) => [String(c._id), c.name]));
  const names = new Map(mine.map((p) => [String(p._id), p.name]));

  res.json({
    projects: mine.filter((p) => re.test(p.name)).slice(0, 5).map((p) => ({ id: p._id, name: p.name })),
    cards: cards.map((c) => ({
      id: c._id,
      title: c.title,
      project: { id: c.project, name: names.get(String(c.project)) || '' },
      column: columns.get(String(c.column)) || '',
      // Shows why a card matched when only its description did.
      snippet: re.test(c.title) ? '' : c.description.replace(/\s+/g, ' ').slice(Math.max(0, c.description.search(re) - 30), c.description.search(re) + 70),
    })),
  });
}
