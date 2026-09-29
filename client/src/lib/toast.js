// Tiny event-based toast store: toast.success('Saved'), toast.error('Failed').
let listeners = [];
let items = [];
let nextId = 1;

const emit = () => listeners.forEach((l) => l(items));

function push(kind, message, ms) {
  const id = nextId++;
  items = [...items, { id, kind, message }];
  emit();
  setTimeout(() => dismiss(id), ms);
}

export function dismiss(id) {
  items = items.filter((t) => t.id !== id);
  emit();
}

export const toast = {
  success: (m) => push('success', m, 4000),
  info: (m) => push('info', m, 4000),
  error: (m) => push('error', m, 7000),
};

export function subscribe(listener) {
  listeners.push(listener);
  listener(items);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
