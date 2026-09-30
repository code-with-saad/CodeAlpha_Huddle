import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { todayStr } from './date.js';

// Filters live in the URL, so a filtered view can be shared or reloaded: ?q=&assignee=&label=&priority=&due=
export const FILTER_KEYS = ['q', 'assignee', 'label', 'priority', 'due'];

const addDays = (dateStr, n) => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export function matchesFilters(card, f, meId) {
  if (f.q && !card.title.toLowerCase().includes(f.q.toLowerCase())) return false;
  if (f.assignee) {
    if (f.assignee === 'none') {
      if (card.assignees.length) return false;
    } else if (!card.assignees.includes(f.assignee === 'me' ? meId : f.assignee)) return false;
  }
  if (f.label && !card.labels.includes(f.label)) return false;
  if (f.priority && card.priority !== f.priority) return false;
  if (f.due) {
    const today = todayStr();
    const d = card.dueDate;
    if (f.due === 'none' && d) return false;
    if (f.due === 'overdue' && !(d && d < today)) return false;
    if (f.due === 'today' && d !== today) return false;
    if (f.due === 'week' && !(d && d >= today && d <= addDays(today, 7))) return false;
  }
  return true;
}

export default function useFilters() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) || ''])), [params]);
  const active = FILTER_KEYS.filter((k) => filters[k]).length;

  const set = useCallback(
    (key, value) =>
      setParams(
        (p) => {
          const next = new URLSearchParams(p);
          if (value) next.set(key, value);
          else next.delete(key);
          return next;
        },
        { replace: true }
      ),
    [setParams]
  );
  const clear = useCallback(
    () =>
      setParams(
        (p) => {
          const next = new URLSearchParams(p);
          FILTER_KEYS.forEach((k) => next.delete(k));
          return next;
        },
        { replace: true }
      ),
    [setParams]
  );
  return { filters, active, set, clear };
}
