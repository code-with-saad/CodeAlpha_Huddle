import { AsyncLocalStorage } from 'node:async_hooks';

// Carries the browser tab that made the current request, so realtime events can say where a change
// came from. That tab already shows the change and ignores the echo; other tabs, including other tabs
// of the same person, apply it.
const store = new AsyncLocalStorage();

export const withTab = (req, _res, next) => {
  const tab = req.headers['x-tab-id'];
  store.run({ tab: typeof tab === 'string' && tab.length <= 64 ? tab : null }, next);
};

export const currentTab = () => store.getStore()?.tab ?? null;
