// Tiny event bus for app-wide signals that are not tied to one screen, such as "your access changed".
const listeners = new Map();

export function on(name, fn) {
  if (!listeners.has(name)) listeners.set(name, new Set());
  listeners.get(name).add(fn);
  return () => listeners.get(name)?.delete(fn);
}

export function emit(name, data) {
  listeners.get(name)?.forEach((fn) => fn(data));
}
