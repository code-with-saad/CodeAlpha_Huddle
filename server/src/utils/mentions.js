import User from '../models/User.js';

const MENTION_RE = /(?:^|[^a-z0-9_])@([a-z0-9_]{3,20})/gi;

// Usernames written as @name in some text, lowercased and unique.
export function mentionedUsernames(text) {
  const names = new Set();
  for (const m of String(text || '').matchAll(MENTION_RE)) names.add(m[1].toLowerCase());
  return [...names];
}

// Ids of the mentioned people who are members of the project. Anyone else is ignored.
export async function mentionedMemberIds(text, project) {
  const names = mentionedUsernames(text);
  if (!names.length) return [];
  const users = await User.find({ username: { $in: names.slice(0, 20) } }).select('_id');
  const memberIds = new Set(project.members.map((m) => String(m.user)));
  return users.filter((u) => memberIds.has(String(u._id))).map((u) => u._id);
}
