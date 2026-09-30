import { Link } from 'react-router-dom';
import LegalLayout from './LegalLayout.jsx';
import { CONTACT } from './SiteChrome.jsx';

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>
        This page explains what Huddle collects, why, who else handles it, and what you can ask us to do. We have tried to describe exactly what the app does and nothing more. The rules for using the service are in the <Link to="/terms">Terms of Service</Link>.
      </p>

      <h2>1. What we collect</h2>
      <p>
        <strong>Your account.</strong> Your name, username and email address, a password that we store only as a bcrypt hash (never the password itself), and a profile photo if you add one.
      </p>
      <p>
        <strong>What you add to projects.</strong> Projects, columns, tasks and their descriptions, labels, checklists, comments and replies, files you attach, the members of each project and their roles, an activity history of changes, and your notifications.
      </p>
      <p>
        <strong>In your browser.</strong> Huddle stores your sign-in token and your theme choice in your browser's local storage so you stay signed in and keep your theme. It does not use cookies, analytics, advertising or tracking tools.
      </p>
      <p>
        <strong>The contact form.</strong> If you write to us through the contact page, your name, email address and message are emailed to us. We do not store them in the database.
      </p>
      <p>
        <strong>Technical data.</strong> Like any website, our hosting provider receives your IP address and basic request details when you use Huddle and may keep standard server logs. Our own code uses your IP address only to limit repeated requests, such as many failed logins.
      </p>

      <h2>2. How we use it</h2>
      <ul>
        <li>To run the service: sign you in, show your projects to the people in them, and keep boards up to date on everyone's screen.</li>
        <li>To tell you about things that concern you: assignments, mentions, replies, due dates and invitations, in the app and, for invitations, by email.</li>
        <li>To keep the service safe: limiting repeated requests and checking permissions on every request.</li>
      </ul>
      <p>We do not sell your data, show advertising, or build profiles about you.</p>

      <h2>3. Who can see what</h2>
      <p>
        People in a project can see that project's content and the names, usernames and profile photos of its members. Your email address is not shown to other members. Someone who invites you by username or by exact email address can find your account name and username, but not your email address, unless they typed it themselves.
      </p>
      <p>
        Files you attach are stored at long, hard to guess web addresses. Anyone who has the exact address can open the file, so share those addresses only with people who should see them.
      </p>

      <h2>4. Services that handle your data</h2>
      <p>Huddle relies on these providers. Each receives only what it needs to do its job.</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Provider</th>
              <th scope="col">What it does</th>
              <th scope="col">Data involved</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Vercel</td>
              <td>Hosts the website and the API</td>
              <td>Requests to Huddle, including IP addresses</td>
            </tr>
            <tr>
              <td>MongoDB Atlas</td>
              <td>Stores the database</td>
              <td>Accounts, projects, tasks, comments, notifications and history</td>
            </tr>
            <tr>
              <td>Cloudinary</td>
              <td>Stores profile photos and attached files</td>
              <td>The files you upload</td>
            </tr>
            <tr>
              <td>Ably</td>
              <td>Delivers live updates to open screens</td>
              <td>Short messages about changes, such as a moved card, passing through as they happen</td>
            </tr>
            <tr>
              <td>Google (Gmail)</td>
              <td>Sends invitation emails and delivers contact form messages</td>
              <td>The recipient's address and the invitation text, which names the person who invited them and the project; the name, address and message from the contact form</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>These providers have their own privacy policies, and they may process data in countries other than yours.</p>

      <h2>5. How long we keep it</h2>
      <ul>
        <li>Your account and project content stay until you or a project owner ask for them to be deleted.</li>
        <li>Archived tasks, columns and projects are kept, not deleted, so they can be restored.</li>
        <li>Activity history entries are removed after six months, and notifications after sixty days.</li>
        <li>Invitation links and emailed invitations expire, and a used email invitation stops working.</li>
      </ul>

      <h2>6. Your choices</h2>
      <ul>
        <li>You can change your name, profile photo and password in Profile at any time. Changing your password signs out your other devices.</li>
        <li>You can leave a project whenever you like, unless you own it. Owners hand it over first.</li>
        <li>You can ask for a copy of your data, a correction, or the deletion of your account or a project by emailing <a href={`mailto:${CONTACT}`}>{CONTACT}</a> from the address on the account. We will act on it and reply.</li>
      </ul>

      <h2>7. Security</h2>
      <p>
        Connections use HTTPS. Passwords are hashed with bcrypt. Every request is checked on the server against your role in the project, and repeated login attempts are limited. Your sign-in token lives in your browser's local storage, which means anything that can run code on the page could read it, so keep your browser and devices up to date and log out on shared computers. No service can promise perfect security, and if we learn of a problem that affects your data we will tell you.
      </p>

      <h2>8. Children</h2>
      <p>Huddle is not meant for children under 13, and we do not knowingly collect their data. If you think a child has an account, please tell us and we will remove it.</p>

      <h2>9. Changes to this policy</h2>
      <p>If we change how we handle data, we will update this page and its date, and say so in the app if the change matters.</p>

      <h2>10. Contact</h2>
      <p>
        For anything about privacy or your data: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
    </LegalLayout>
  );
}
