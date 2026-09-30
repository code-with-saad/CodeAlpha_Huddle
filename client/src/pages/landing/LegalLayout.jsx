import { SiteFooter, SiteHeader, useTitle } from './SiteChrome.jsx';
import './landing.css';

export const UPDATED = '30 September 2026';

export default function LegalLayout({ title, children }) {
  useTitle(`${title} | Huddle`);
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="legal">
        <article>
          <h1>{title}</h1>
          <p className="updated">Last updated {UPDATED}</p>
          {children}
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
