import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Monitor, Moon, Sun } from 'lucide-react';
import Icon from '../../components/Icon.jsx';
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

export function SiteHeader() {
  const [theme, setTheme] = useState(getTheme);
  const cycle = () => {
    const next = nextTheme(theme);
    applyTheme(next);
    setTheme(next);
  };
  return (
    <header className="site-header">
      <div className="wrap site-header-row">
        <Link to="/" className="wordmark" aria-label="Huddle home">
          Huddle
        </Link>
        <nav className="site-nav" aria-label="Account">
          <button type="button" className="icon-btn" onClick={cycle} aria-label={`Theme: ${theme}. Change theme`}>
            <Icon as={GLYPH[theme]} size={18} />
          </button>
          <Link to="/login" className="btn btn-ghost">
            Log in
          </Link>
          <Link to="/register" className="btn btn-primary">
            Create account
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap site-footer-row">
        <div>
          <span className="wordmark">Huddle</span>
          <p className="site-footer-note">A shared board for your team.</p>
        </div>
        <nav aria-label="Footer" className="site-footer-links">
          <Link to="/terms">Terms of Service</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <a href={`mailto:${CONTACT}`}>Contact</a>
          <Link to="/login">Log in</Link>
          <Link to="/register">Create account</Link>
        </nav>
      </div>
    </footer>
  );
}
