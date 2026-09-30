import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, FolderKanban, Monitor, Moon, Sun, UserRound } from 'lucide-react';
import Icon from './Icon.jsx';
import CommandPalette from './CommandPalette.jsx';
import { Wordmark } from './Logo.jsx';
import NotificationBell from './NotificationBell.jsx';
import ShortcutHelp from './ShortcutHelp.jsx';
import { emit, on } from '../lib/bus.js';
import { useNotifications } from '../lib/notifications.jsx';
import { applyTheme, getTheme, nextTheme } from '../lib/theme.js';

const NAV = [
  { to: '/projects', label: 'Projects', glyph: FolderKanban, end: true },
  { to: '/notifications', label: 'Notifications', glyph: Bell },
  { to: '/profile', label: 'Profile', glyph: UserRound },
];
const THEME_GLYPH = { system: Monitor, light: Sun, dark: Moon };

function Links({ size }) {
  const { unread } = useNotifications();
  return NAV.map(({ to, label, glyph, end }) => (
    <NavLink key={to} to={to} end={end} className="navlink" aria-label={to === '/notifications' && unread ? `${label}, ${unread} unread` : label}>
      <span className="navicon">
        <Icon as={glyph} size={size} />
        {to === '/notifications' && unread > 0 && <span className="badge mono navbadge">{unread > 99 ? '99+' : unread}</span>}
      </span>
      <span className="label">{label}</span>
    </NavLink>
  ));
}

export default function Shell() {
  const [theme, setTheme] = useState(getTheme);
  const cycle = () => {
    const next = nextTheme(theme);
    applyTheme(next);
    setTheme(next);
  };
  const [palette, setPalette] = useState(false);
  const [help, setHelp] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => on('toggle-theme', cycle));

  // Global keys. Ctrl or Cmd + K always works; the single key ones are skipped while typing or with a dialog open.
  useEffect(() => {
    const typing = (el) => el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((p) => !p);
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target) || document.querySelector('dialog[open]')) return;
      const inProject = location.pathname.match(/^\/p\/([^/]+)/);
      const onBoardViews = inProject && !/\/(members|activity|archive|dashboard)$/.test(location.pathname);
      if (e.key === '?') {
        e.preventDefault();
        setHelp(true);
      } else if (e.key === '/') {
        e.preventDefault();
        if (onBoardViews) emit('focus-filter');
        else setPalette(true);
      } else if (e.key === 'c' && inProject) {
        e.preventDefault();
        if (onBoardViews) emit('quickadd', {});
        else navigate(`/p/${inProject[1]}`, { state: { quickAdd: true } });
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [location.pathname, navigate]);

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/projects" className="wordmark" aria-label="Huddle projects">
          <Wordmark />
        </Link>
        <div className="topbar-actions">
          <NotificationBell />
        <button type="button" className="theme-btn" style={{ width: 'auto' }} onClick={cycle} aria-label={`Theme: ${theme}. Change theme`}>
          <Icon as={THEME_GLYPH[theme]} size={18} />
        </button>
        </div>
      </header>

      <nav className="sidebar" aria-label="Main">
        <div className="sidebar-top">
          <Link to="/projects" className="wordmark" aria-label="Huddle projects">
            <Wordmark />
          </Link>
          <NotificationBell />
        </div>
        <Links size={18} />
        <div className="sidebar-foot">
          <button type="button" className="theme-btn" onClick={cycle} aria-label={`Theme: ${theme}. Change theme`}>
            <Icon as={THEME_GLYPH[theme]} size={18} />
            <span className="label">Theme: {theme}</span>
          </button>
        </div>
      </nav>

      <main className="main">
        <Outlet />
      </main>

      <nav className="bottomnav" aria-label="Main mobile">
        <Links size={20} />
      </nav>

      {palette && <CommandPalette onClose={() => setPalette(false)} onHelp={() => setHelp(true)} />}
      {help && <ShortcutHelp onClose={() => setHelp(false)} />}
    </div>
  );
}
