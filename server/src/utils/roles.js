// Project roles from least to most powerful. Every permission check goes through these helpers.
export const ROLES = ['viewer', 'member', 'admin', 'owner'];
const RANK = Object.fromEntries(ROLES.map((r, i) => [r, i]));

export const isRole = (r) => typeof r === 'string' && r in RANK;
export const atLeast = (role, min) => (RANK[role] ?? -1) >= RANK[min];

// Roles that can be handed out through the UI. Owner only changes hands through a transfer.
export const ASSIGNABLE = ['admin', 'member', 'viewer'];

// Who may change or remove whom: the owner manages everyone else; an admin manages members and viewers only.
export function canManageMember(actorRole, targetRole) {
  if (targetRole === 'owner') return false;
  if (actorRole === 'owner') return true;
  return actorRole === 'admin' && RANK[targetRole] < RANK.admin;
}

// Roles an actor may assign. Admins cannot mint other admins.
export function assignableBy(actorRole) {
  if (actorRole === 'owner') return ASSIGNABLE;
  if (actorRole === 'admin') return ['member', 'viewer'];
  return [];
}
