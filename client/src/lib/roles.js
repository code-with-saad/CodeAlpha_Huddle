// Mirrors the server rules so the UI only offers what will succeed. The server still enforces every one of them.
const RANK = { viewer: 0, member: 1, admin: 2, owner: 3 };

export const atLeast = (role, min) => (RANK[role] ?? -1) >= RANK[min];

export const canManageMember = (actorRole, targetRole) => {
  if (targetRole === 'owner') return false;
  if (actorRole === 'owner') return true;
  return actorRole === 'admin' && RANK[targetRole] < RANK.admin;
};

export const assignableBy = (actorRole) => {
  if (actorRole === 'owner') return ['admin', 'member', 'viewer'];
  if (actorRole === 'admin') return ['member', 'viewer'];
  return [];
};
