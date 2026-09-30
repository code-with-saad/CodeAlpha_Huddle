// Demo data for trying Huddle in the browser.
//   npm run seed          creates (or refreshes) the demo people and projects
//   npm run seed:remove   deletes them again
// Everything is tied to usernames that start with "demo_", so real accounts are never touched.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import Activity from '../src/models/Activity.js';
import Card from '../src/models/Card.js';
import Column from '../src/models/Column.js';
import Comment from '../src/models/Comment.js';
import Invite from '../src/models/Invite.js';
import Label from '../src/models/Label.js';
import Notification from '../src/models/Notification.js';
import Project from '../src/models/Project.js';
import User from '../src/models/User.js';
import { STEP } from '../src/utils/order.js';

const PASSWORD = 'huddle-demo-1234';
const PEOPLE = [
  { username: 'demo_maya', name: 'Maya Chen' },
  { username: 'demo_arjun', name: 'Arjun Rao' },
  { username: 'demo_priya', name: 'Priya Nair' },
  { username: 'demo_sam', name: 'Sam Okafor' },
  { username: 'demo_lena', name: 'Lena Fischer' },
];

const day = (offset) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
};
const ago = (hours) => new Date(Date.now() - hours * 3600 * 1000);

async function removeDemo() {
  const users = await User.find({ username: /^demo_/ }).select('_id');
  const ids = users.map((u) => u._id);
  const projects = await Project.find({ 'members.user': { $in: ids } }).select('_id members');
  // Only projects made up entirely of demo people are removed.
  const demoProjects = projects.filter((p) => p.members.every((m) => ids.some((id) => id.equals(m.user)))).map((p) => p._id);
  await Promise.all([
    Card.deleteMany({ project: { $in: demoProjects } }),
    Column.deleteMany({ project: { $in: demoProjects } }),
    Comment.deleteMany({ project: { $in: demoProjects } }),
    Label.deleteMany({ project: { $in: demoProjects } }),
    Activity.deleteMany({ project: { $in: demoProjects } }),
    Notification.deleteMany({ $or: [{ user: { $in: ids } }, { project: { $in: demoProjects } }] }),
    Invite.deleteMany({ $or: [{ project: { $in: demoProjects } }, { invitee: { $in: ids } }, { createdBy: { $in: ids } }] }),
  ]);
  await Project.deleteMany({ _id: { $in: demoProjects } });
  await User.deleteMany({ _id: { $in: ids } });
  return { users: ids.length, projects: demoProjects.length };
}

async function makeProject({ name, description, members, columns, labels }) {
  const project = await Project.create({ name, description, members: members.map(([user, role]) => ({ user: user._id, role })) });
  const cols = {};
  // Columns named Done or Shipped count as done, so the dashboard has completions to show.
  for (const [i, cname] of columns.entries()) cols[cname] = await Column.create({ project: project._id, name: cname, position: STEP * (i + 1), isDone: /^(done|shipped)$/i.test(cname) });
  const labs = {};
  for (const [lname, color] of Object.entries(labels)) labs[lname] = await Label.create({ project: project._id, name: lname, color });
  return { project, cols, labs };
}

async function addCards(ctx, byId, list) {
  const counters = {};
  const cards = {};
  for (const [idx, c] of list.entries()) {
    const n = (counters[c.col] = (counters[c.col] || 0) + 1);
    const finished = ctx.cols[c.col].isDone;
    // Spread the history over the last weeks: done tasks finished 1 to 8 days ago, all created earlier than that.
    const doneAgo = finished ? c.done ?? 1 + (idx % 8) : null;
    const madeAgo = Math.max(c.created ?? 2 + ((idx * 3) % 21), (doneAgo ?? 0) + 2);
    const card = await Card.create({
      project: ctx.project._id,
      column: ctx.cols[c.col]._id,
      title: c.title,
      position: STEP * n,
      createdBy: byId[c.by || 'demo_maya']._id,
      createdAt: ago(madeAgo * 24),
      completedAt: finished ? ago(doneAgo * 24) : null,
      description: c.description || '',
      assignees: (c.assign || []).map((u) => byId[u]._id),
      labels: (c.labels || []).map((l) => ctx.labs[l]._id),
      priority: c.priority || 'none',
      dueDate: c.due === undefined ? null : day(c.due),
      checklist: (c.checklist || []).map(([text, done]) => ({ text, done })),
    });
    cards[c.title] = card;
    let hours = 30;
    for (const [who, body] of c.comments || []) {
      const mentions = [...body.matchAll(/@([a-z0-9_]+)/g)].map((m) => byId[m[1]]?._id).filter(Boolean);
      await Comment.create({ project: ctx.project._id, card: card._id, author: byId[who]._id, body, mentions, createdAt: ago(hours), updatedAt: ago(hours) });
      hours -= 5;
    }
    if (c.comments?.length) await Card.updateOne({ _id: card._id }, { commentCount: c.comments.length });
  }
  return cards;
}

async function seed() {
  const removed = await removeDemo();
  const hash = await bcrypt.hash(PASSWORD, 12);
  const byId = {};
  for (const p of PEOPLE) byId[p.username] = await User.create({ ...p, email: `${p.username}@huddle.demo`, password: hash });
  const { demo_maya: maya, demo_arjun: arjun, demo_priya: priya, demo_sam: sam, demo_lena: lena } = byId;

  // Project 1: the full tour, every role represented.
  const web = await makeProject({
    name: 'Website Relaunch',
    description: 'New marketing site, pricing page and docs for the Q4 launch.',
    members: [[maya, 'owner'], [arjun, 'admin'], [priya, 'member'], [sam, 'member'], [lena, 'viewer']],
    columns: ['To Do', 'In Progress', 'Review', 'Done'],
    labels: { Design: '#b45309', Frontend: '#0b6580', Backend: '#4d7c0f', Bug: '#b3382c', Docs: '#6b7280', Content: '#9a3412' },
  });
  await addCards(web, byId, [
    { col: 'To Do', title: 'Write launch announcement', priority: 'medium', due: 6, labels: ['Content'], assign: ['demo_priya'], description: 'Short post for the blog and the newsletter.\n\n- Lead with the **new pricing page**\n- Link to the docs\n- Keep it under 300 words', checklist: [['Draft', false], ['Get legal review', false], ['Schedule for launch morning', false]] },
    { col: 'To Do', title: 'Audit image sizes on the home page', priority: 'low', due: 12, labels: ['Frontend'], assign: ['demo_sam'] },
    { col: 'To Do', title: 'Set up redirects from the old URLs', priority: 'high', due: 3, labels: ['Backend'], assign: ['demo_arjun'], description: 'Old `/products/*` paths must 301 to the new pages.\n\nSee the spreadsheet of URLs in the shared drive.', comments: [['demo_arjun', 'I have the list of 84 URLs. Starting with the top 20 by traffic.'], ['demo_maya', '@demo_arjun great, please share the mapping once it is ready.']] },
    { col: 'To Do', title: 'Collect customer quotes for the pricing page', priority: 'none', labels: ['Content'] },
    { col: 'In Progress', title: 'Build pricing page layout', priority: 'urgent', due: -2, labels: ['Frontend', 'Design'], assign: ['demo_sam', 'demo_priya'], description: '## Scope\n\nThree plans side by side on desktop, stacked on mobile.\n\n| Plan | Seats |\n|---|---|\n| Free | 3 |\n| Team | 20 |\n| Business | unlimited |\n\nDesign is in the shared file.', checklist: [['Desktop layout', true], ['Tablet layout', true], ['Mobile layout', false], ['Dark mode check', false]], comments: [['demo_sam', 'Desktop and tablet are done. Working on the mobile stack now.'], ['demo_maya', 'This is overdue. @demo_sam do you need anything from design?'], ['demo_sam', 'A final decision on the annual toggle copy, then I can finish.']] },
    { col: 'In Progress', title: 'Fix contact form validation', priority: 'high', due: 1, labels: ['Bug', 'Frontend'], assign: ['demo_priya'], comments: [['demo_lena', 'Reproduced on Safari: the phone field accepts letters.']] },
    { col: 'In Progress', title: 'Migrate docs to the new navigation', priority: 'medium', due: 9, labels: ['Docs'], assign: ['demo_arjun', 'demo_lena'], checklist: [['Getting started', true], ['API reference', false], ['Changelog', false]] },
    { col: 'Review', title: 'Homepage hero copy', priority: 'medium', due: 2, labels: ['Content', 'Design'], assign: ['demo_maya'], comments: [['demo_priya', 'Two options are in the doc. I prefer the second one.']] },
    { col: 'Review', title: 'Cookie banner and privacy links', priority: 'low', due: 4, labels: ['Frontend'], assign: ['demo_sam'] },
    { col: 'Done', title: 'Choose the hosting setup', priority: 'none', due: -10, labels: ['Backend'], assign: ['demo_arjun'] },
    { col: 'Done', title: 'Finalize the brand colours', priority: 'none', due: -8, labels: ['Design'], assign: ['demo_maya'], checklist: [['Accent', true], ['Neutrals', true], ['Dark mode', true]] },
    { col: 'Done', title: 'Sitemap and page inventory', priority: 'low', due: -14, labels: ['Docs'], assign: ['demo_priya'] },
  ]);

  // Older finished tasks, archived since. They are not on the board but they are real history for the charts.
  const doneDays = [1, 1, 2, 3, 3, 4, 6, 7, 8, 9, 10, 12, 13, 15, 18, 20, 22, 26];
  for (const [i, ago2] of doneDays.entries()) {
    await Card.create({
      project: web.project._id,
      column: web.cols.Done._id,
      title: `Finished task ${i + 1}`,
      position: STEP * (100 + i),
      createdBy: [maya, arjun, priya, sam][i % 4]._id,
      assignees: [[maya, arjun, priya, sam][(i + 1) % 4]._id],
      createdAt: ago((ago2 + 3 + (i % 6)) * 24),
      completedAt: ago(ago2 * 24),
      archivedAt: ago(Math.max(0, ago2 - 1) * 24),
    });
  }

  // Project 2: smaller, Maya is a member here.
  const app = await makeProject({
    name: 'Mobile App Beta',
    description: 'Closed beta for the iOS and Android apps.',
    members: [[arjun, 'owner'], [maya, 'member'], [sam, 'viewer']],
    columns: ['Backlog', 'Building', 'Testing', 'Shipped'],
    labels: { iOS: '#0b6580', Android: '#4d7c0f', Crash: '#b3382c' },
  });
  await addCards(app, byId, [
    { col: 'Backlog', title: 'Offline mode for the task list', priority: 'medium', labels: ['iOS', 'Android'], by: 'demo_arjun' },
    { col: 'Backlog', title: 'Push notification opt-in screen', priority: 'low', due: 20, labels: ['iOS'], by: 'demo_arjun' },
    { col: 'Building', title: 'Fix crash when opening a card with no title', priority: 'urgent', due: 0, labels: ['Crash', 'Android'], assign: ['demo_maya'], by: 'demo_arjun', comments: [['demo_arjun', '@demo_maya can you take this one? Stack trace is in the ticket.']] },
    { col: 'Testing', title: 'Beta invite emails', priority: 'medium', due: 5, assign: ['demo_arjun'], by: 'demo_arjun', checklist: [['Template', true], ['Send test', false]] },
    { col: 'Shipped', title: 'Login and sign-up flow', priority: 'none', assign: ['demo_maya'], by: 'demo_arjun' },
  ]);

  // Project 3: Priya owns it and Maya has a pending invitation, so the invitation UI has something to show.
  const hiring = await makeProject({
    name: 'Hiring 2026',
    description: 'Open roles and interview loops.',
    members: [[priya, 'owner'], [lena, 'admin']],
    columns: ['To Do', 'In Progress', 'Done'],
    labels: { Engineering: '#0b6580', Design: '#b45309' },
  });
  await addCards(hiring, byId, [
    { col: 'To Do', title: 'Post the senior engineer role', priority: 'high', due: 2, labels: ['Engineering'], by: 'demo_priya' },
    { col: 'In Progress', title: 'Schedule design interviews', priority: 'medium', labels: ['Design'], assign: ['demo_lena'], by: 'demo_priya' },
  ]);
  await Invite.create({ project: hiring.project._id, kind: 'user', invitee: maya._id, role: 'member', createdBy: priya._id });

  console.log(`Removed before seeding: ${removed.users} demo users, ${removed.projects} demo projects.`);
  console.log('\nDemo accounts (all use the same password)\n');
  console.log(`  password: ${PASSWORD}\n`);
  for (const p of PEOPLE) console.log(`  ${p.name.padEnd(14)} ${(p.username + '@huddle.demo').padEnd(24)} ${roleNote(p.username)}`);
  console.log('');
}

function roleNote(u) {
  return {
    demo_maya: 'owner of Website Relaunch, member of Mobile App Beta, has a pending invitation',
    demo_arjun: 'admin in Website Relaunch, owner of Mobile App Beta',
    demo_priya: 'member in Website Relaunch, owner of Hiring 2026',
    demo_sam: 'member in Website Relaunch, viewer in Mobile App Beta',
    demo_lena: 'viewer in Website Relaunch, admin in Hiring 2026',
  }[u];
}

await connectDB();
if (process.argv.includes('--remove')) {
  const r = await removeDemo();
  console.log(`Removed ${r.users} demo users and ${r.projects} demo projects.`);
} else {
  await seed();
}
await mongoose.disconnect();
