import { Link } from 'react-router-dom';
import { SiteFooter, SiteHeader, useTitle } from './SiteChrome.jsx';
import './landing.css';

// A real screenshot of the app in both themes. Only the one that matches the current theme is shown.
function Shot({ name, alt, width, height, eager = false, className = '' }) {
  const props = { width, height, alt, decoding: 'async', ...(eager ? { fetchPriority: 'high' } : { loading: 'lazy' }) };
  return (
    <div className={`shot ${className}`}>
      <img className="shot-light" src={`/screens/${name}-light.webp`} {...props} />
      <img className="shot-dark" src={`/screens/${name}-dark.webp`} {...props} />
    </div>
  );
}

function Feature({ id, title, reverse = false, children, shot }) {
  return (
    <section className={`feature${reverse ? ' feature-reverse' : ''}`} aria-labelledby={id}>
      <div className="feature-text">
        <h2 id={id}>{title}</h2>
        {children}
      </div>
      {shot}
    </section>
  );
}

export default function Landing() {
  useTitle('Huddle: a shared board for your team');
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="landing">
        <section className="wrap hero" aria-labelledby="hero-title">
          <h1 id="hero-title">One shared board for everything your team is working on</h1>
          <p className="hero-lead">
            Huddle keeps tasks, comments, files and deadlines in one place. When someone moves a card or leaves a comment, it appears on everyone else's screen straight away.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="btn btn-primary btn-lg">
              Create an account
            </Link>
            <Link to="/login" className="btn btn-lg">
              Log in
            </Link>
          </div>
          <p className="hero-note">Free to use. Runs in the browser on your phone or your computer.</p>
          <Shot
            name="board"
            width={1440}
            height={900}
            eager
            className="shot-hero"
            alt="The Huddle board for a project called Website Relaunch, with columns To Do, In Progress, Review and Done. Cards show labels, due dates, checklist progress, assignees and priority."
          />
        </section>

        <div className="wrap features">
          <Feature
            id="f-columns"
            title="Columns that follow your process"
            shot={<Shot name="mobile-board" width={780} height={1688} className="shot-phone" alt="The Huddle board on a phone, showing one column at a time with a filter button and a New task button above it." />}
          >
            <p>
              Every project starts with To Do, In Progress and Done. Add, rename, reorder or delete columns whenever the way you work changes, and mark any column as counting as done so the numbers stay honest.
            </p>
            <p>
              Drag cards between columns on a computer. On a phone, where dragging is awkward, every card has a Move to menu that does the same thing.
            </p>
          </Feature>

          <Feature
            id="f-card"
            title="A card holds the whole task"
            reverse
            shot={<Shot name="card" width={1440} height={900} alt="A card opened in a side panel, with assignees, labels, priority, due date, a markdown description with a table, and a checklist showing two of four items done." />}
          >
            <p>
              Open a card to write a description in markdown, assign teammates, add colored labels, set a priority and a due date, build a checklist and attach files up to 10 MB.
            </p>
            <p>
              Comments come in threads, and typing @ mentions a teammate, who is notified. Follow a card to hear about new comments even when nothing is assigned to you.
            </p>
          </Feature>

          <Feature
            id="f-live"
            title="You see changes as they happen"
            shot={<Shot name="notifications" width={1440} height={900} alt="The notification dropdown open over a board, listing an overdue task, a mention and an assignment." />}
          >
            <p>
              Cards, comments, roles and members update on every open screen without a refresh. Small avatars in the header show who else has the board open.
            </p>
            <p>
              The bell tells you when you are assigned, mentioned or replied to, and when a task you own is due tomorrow or already overdue.
            </p>
          </Feature>

          <Feature
            id="f-views"
            title="Board, List and Calendar, one set of tasks"
            reverse
            shot={<Shot name="calendar" width={1440} height={900} alt="The calendar view showing tasks on the days they are due, with overdue tasks in red." />}
          >
            <p>
              Switch between a board, a sortable list and a monthly calendar without losing your place. Filter by person, label, priority or due date, and the filter follows you from view to view.
            </p>
            <p>
              Select several tasks at once to move, assign, label or archive them together, and undo it if you change your mind.
            </p>
          </Feature>

          <Feature
            id="f-dash"
            title="See where the project stands"
            shot={<Shot name="dashboard" width={1440} height={900} alt="The project dashboard with counts of open, completed and overdue tasks, a chart of tasks created and completed per day, and bars for tasks per column and per person." />}
          >
            <p>
              The dashboard counts open, completed and overdue tasks, shows the work per person and per column, and charts what was created and completed each day. Every number comes from the tasks on your board, and it updates while you watch.
            </p>
          </Feature>

          <section className="feature feature-plain" aria-labelledby="f-roles">
            <div className="feature-text">
              <h2 id="f-roles">Access that matches the job</h2>
              <p>Each person in a project has one of four roles.</p>
              <dl className="roles">
                <div>
                  <dt>Owner</dt>
                  <dd>Manages everything, including archiving the project and handing it over.</dd>
                </div>
                <div>
                  <dt>Admin</dt>
                  <dd>Manages columns, labels, members and invitations.</dd>
                </div>
                <div>
                  <dt>Member</dt>
                  <dd>Creates and edits tasks and comments.</dd>
                </div>
                <div>
                  <dt>Viewer</dt>
                  <dd>Reads and follows tasks without changing anything.</dd>
                </div>
              </dl>
              <p>
                These rules are enforced on the server, not only hidden in the interface. Invite people by username, by email address, or with a link that you can revoke at any time.
              </p>
            </div>
          </section>

          <section className="feature feature-plain" aria-labelledby="f-safe">
            <div className="feature-text">
              <h2 id="f-safe">Nothing disappears by accident</h2>
              <p>
                Archiving hides tasks, columns and projects without deleting them, and you can restore them from the Archive tab. The activity log records who did what and when.
              </p>
              <p>Press Ctrl+K anywhere to jump to a project or a task, or press ? to see every keyboard shortcut.</p>
            </div>
          </section>
        </div>

        <section className="cta" aria-labelledby="cta-title">
          <div className="wrap cta-inner">
            <h2 id="cta-title">Start your first project</h2>
            <p>Signing up takes a minute. Invite your team when you are ready.</p>
            <Link to="/register" className="btn btn-primary btn-lg">
              Create an account
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
