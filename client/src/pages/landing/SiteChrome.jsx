import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, Monitor, Moon, Sun, X } from 'lucide-react';
import Icon from '../../components/Icon.jsx';
import { Wordmark } from '../../components/Logo.jsx';
import { applyTheme, getTheme, nextTheme } from '../../lib/theme.js';

export const CONTACT = 'xyroxx02@gmail.com';
const GLYPH = { system: Monitor, light: Sun, dark: Moon };

// Sets the tab title for a public page.
export function useTitle(title) {
  useEffect(() => {
    const before = document.title;
    document.title = title;
    return () => {
      document.title = before;
    };
  }, [title]);
}

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: { pathname: '/', hash: '#features' }, label: 'Features', match: false },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export function SiteHeader() {
  const [theme, setTheme] = useState(getTheme);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const cycle = () => {
    const next = nextTheme(theme);
    applyTheme(next);
    setTheme(next);
  };
  // Leaving the page closes the phone menu.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="site-header">
      <div className="wrap site-header-row">
        <Link to="/" className="wordmark" aria-label="Huddle home">
          <Wordmark />
        </Link>
        <nav className={`site-links${open ? ' open' : ''}`} id="site-links" aria-label="Site">
          {NAV.map((n) => (
            <NavLink key={n.label} to={n.to} end={n.end} className={({ isActive }) => `site-link${isActive && n.match !== false ? ' active' : ''}`}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="site-nav">
          <button type="button" className="icon-btn" onClick={cycle} aria-label={`Theme: ${theme}. Change theme`}>
            <Icon as={GLYPH[theme]} size={18} />
          </button>
          <Link to="/login" className="btn btn-ghost site-login">
            Log in
          </Link>
          <Link to="/register" className="btn btn-primary">
            Create account
          </Link>
          <button type="button" className="icon-btn site-menu-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="site-links" aria-label={open ? 'Close menu' : 'Open menu'}>
            <Icon as={open ? X : Menu} size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap site-footer-row">
        <div>
          <span className="wordmark">
            <Wordmark />
          </span>
          <p className="site-footer-note">A shared board for your team.</p>
        </div>
        <nav aria-label="Footer" className="site-footer-links">
          <Link to="/about">About</Link>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/login">Log in</Link>
          <Link to="/register">Create account</Link>
        </nav>
      </div>
    </footer>
  );
}
