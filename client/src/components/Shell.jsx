import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Bell, FolderKanban, Monitor, Moon, Sun, UserRound } from 'lucide-react';
import Icon from './Icon.jsx';
import NotificationBell from './NotificationBell.jsx';
import { useNotifications } from '../lib/notifications.jsx';
import { applyTheme, getTheme, nextTheme } from '../lib/theme.js';

const NAV = [
  { to: '/', label: 'Projects', glyph: FolderKanban, end: true },
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

  return (
    <div className="shell">
      <header className="topbar">
        <span className="wordmark">Huddle</span>
        <div className="topbar-actions">
          <NotificationBell />
        <button type="button" className="theme-btn" style={{ width: 'auto' }} onClick={cycle} aria-label={`Theme: ${theme}. Change theme`}>
          <Icon as={THEME_GLYPH[theme]} size={18} />
        </button>
        </div>
      </header>

      <nav className="sidebar" aria-label="Main">
        <div className="sidebar-top">
          <span className="wordmark" aria-label="Huddle">
            <span aria-hidden="true">H</span>
            <span className="label" aria-hidden="true">uddle</span>
          </span>
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
    </div>
  );
}
