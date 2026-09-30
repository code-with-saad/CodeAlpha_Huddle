// Tiny event-based toast store: toast.success('Saved'), toast.error('Failed').
// A toast can carry one action, used for Undo: toast.success('Card archived', { action: { label: 'Undo', onClick } }).
let listeners = [];
let items = [];
let nextId = 1;

const emit = () => listeners.forEach((l) => l(items));

function push(kind, message, ms, action) {
  const id = nextId++;
  items = [...items, { id, kind, message, action }];
  emit();
  setTimeout(() => dismiss(id), action ? Math.max(ms, 8000) : ms);
  return id;
}

export function dismiss(id) {
  items = items.filter((t) => t.id !== id);
  emit();
}

export const toast = {
  success: (m, o = {}) => push('success', m, 4000, o.action),
  info: (m, o = {}) => push('info', m, 4000, o.action),
  error: (m, o = {}) => push('error', m, 7000, o.action),
};

export function subscribe(listener) {
  listeners.push(listener);
  listener(items);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
