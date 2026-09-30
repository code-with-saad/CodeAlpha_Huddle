// Due dates are plain calendar dates ("2026-10-04"); comparisons use the local calendar day.
const pad = (n) => String(n).padStart(2, '0');
export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const toDay = (s) => new Date(`${s}T00:00:00Z`).getTime() / 86400000;

// { label, state } where state is overdue, soon (today or the next 2 days) or later.
export function dueInfo(dateStr) {
  if (!dateStr) return null;
  const diff = Math.round(toDay(dateStr) - toDay(todayStr()));
  const date = new Date(`${dateStr}T00:00:00Z`);
  const label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  if (diff < 0) return { label, state: 'overdue', text: `${label}, ${-diff} ${diff === -1 ? 'day' : 'days'} overdue` };
  if (diff === 0) return { label: 'Today', state: 'soon', text: 'Due today' };
  if (diff === 1) return { label: 'Tomorrow', state: 'soon', text: 'Due tomorrow' };
  if (diff === 2) return { label, state: 'soon', text: `Due ${label}` };
  return { label, state: 'later', text: `Due ${label}` };
}

export function timeAgo(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function fileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
