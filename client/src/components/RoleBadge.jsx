export const ROLE_LABEL = { owner: 'Owner', admin: 'Admin', member: 'Member', viewer: 'Viewer' };

// Plain text pill. Role is not a status, so it uses neutral tones; only the owner gets the accent.
export default function RoleBadge({ role }) {
  return <span className={`pill pill-${role}`}>{ROLE_LABEL[role] || role}</span>;
}
