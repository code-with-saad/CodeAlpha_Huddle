import { Link } from 'react-router-dom';
import LegalLayout from './LegalLayout.jsx';
import { CONTACT } from './SiteChrome.jsx';

export default function About() {
  return (
    <LegalLayout title="About Huddle" showDate={false}>
      <p>
        Huddle is a project board for small teams. It keeps the tasks, comments, files and deadlines of a project in one place, and shows every change on your teammates' screens as it happens.
      </p>

      <h2>What it is for</h2>
      <p>
        A team of two to twenty people who want to see who is doing what, without a heavy tool. You can plan a launch, run a sprint, track a study group or organise an event. Create a project, add columns that match how you work, and invite people.
      </p>

      <h2>How it works</h2>
      <ul>
        <li>Every project has columns and cards. Drag cards between columns, or use the Move to menu on a phone.</li>
        <li>Open a card for the description, assignees, labels, priority, due date, checklist, files and comments.</li>
        <li>Switch between a board, a list and a calendar, and check the dashboard for the state of the project.</li>
        <li>Each person has a role: owner, admin, member or viewer. The server checks it on every request.</li>
      </ul>

      <h2>How it is built</h2>
      <p>
        The front end is React with Vite. The API is Node and Express on MongoDB. Live updates go through Ably, files through Cloudinary and invitation emails through Gmail. The whole thing runs on free tiers.
      </p>

      <h2>Get started</h2>
      <p>
        <Link to="/register">Create an account</Link> and start a project, or read the <Link to="/privacy">Privacy Policy</Link> and <Link to="/terms">Terms of Service</Link> first. Questions and bug reports are welcome on the <Link to="/contact">contact page</Link> or at <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
    </LegalLayout>
  );
}
