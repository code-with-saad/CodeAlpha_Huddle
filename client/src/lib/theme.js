const KEY = 'huddle-theme';
const ORDER = ['system', 'light', 'dark'];

export function getTheme() {
  try {
    const saved = localStorage.getItem(KEY);
    return ORDER.includes(saved) ? saved : 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* storage can be blocked; the theme still applies for this visit */
  }
}

export function nextTheme(theme) {
  return ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
}
