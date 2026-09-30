import { Link } from 'react-router-dom';
import LegalLayout from './LegalLayout.jsx';
import { CONTACT } from './SiteChrome.jsx';

export default function Terms() {
  return (
    <LegalLayout title="Terms of Service">
      <p>
        These terms explain the rules for using Huddle, a web app for planning and tracking work in shared projects. By creating an account or using Huddle you agree to them. If you do not agree, please do not use it. How we handle your data is described in the <Link to="/privacy">Privacy Policy</Link>.
      </p>

      <h2>1. Your account</h2>
      <ul>
        <li>You must be at least 13 years old to use Huddle.</li>
        <li>Give accurate information when you register, and keep your password to yourself. You are responsible for what happens under your account, so log out on shared computers.</li>
        <li>One person, one account. Do not create accounts to get around a limit or a removal.</li>
      </ul>

      <h2>2. Your content</h2>
      <p>
        You own what you put into Huddle: projects, tasks, comments, files and profile details. You give us permission to store it, process it and show it to the people you share it with, only as far as needed to run the service.
      </p>
      <p>
        You are responsible for your content. Do not upload or share anything that is illegal, that infringes someone else's rights, or that you do not have the right to share. Files you attach are available to anyone who is a member of the project, and to anyone who has the exact link to the file.
      </p>

      <h2>3. Projects and roles</h2>
      <p>
        Each project has an owner, and may have admins, members and viewers. Owners and admins decide who joins and what role they have, and they can remove people. If you invite someone, you are responsible for inviting the right person. Only send invitations to people who would expect to hear from you.
      </p>

      <h2>4. Acceptable use</h2>
      <p>Do not use Huddle to:</p>
      <ul>
        <li>attack, overload or try to break into the service or another person's account;</li>
        <li>send spam, or send invitation emails to people who did not ask for them;</li>
        <li>upload malware, or anything meant to harm other people's devices or data;</li>
        <li>pretend to be someone else, or give a misleading name or profile;</li>
        <li>collect other people's data from the service without their permission;</li>
        <li>get around rate limits, permissions or other protections.</li>
      </ul>

      <h2>5. Availability and changes to the service</h2>
      <p>
        Huddle is offered free of charge and as it is. It may be slow, change, or be unavailable from time to time, and we may add, change or remove features. We do not promise a particular level of uptime. Keep your own copy of anything you cannot afford to lose.
      </p>

      <h2>6. Ending your use</h2>
      <p>
        You can stop using Huddle at any time. To have your account or a project deleted, email <a href={`mailto:${CONTACT}`}>{CONTACT}</a> from the address on the account. We may suspend or remove accounts that break these terms or put the service or other people at risk.
      </p>

      <h2>7. No warranty and limits on liability</h2>
      <p>
        We provide Huddle without warranties of any kind, express or implied, including that it will be error free or fit for a particular purpose. To the extent the law allows, we are not liable for indirect or consequential losses, lost data, lost profits or lost time arising from your use of the service. Nothing in these terms limits any right you have by law that cannot be limited.
      </p>

      <h2>8. Changes to these terms</h2>
      <p>
        We may update these terms. The date at the top shows when they last changed. If a change is significant we will say so in the app. Continuing to use Huddle after a change means you accept the new terms.
      </p>

      <h2>9. General</h2>
      <p>
        If a part of these terms turns out to be unenforceable, the rest still applies. These terms are the whole agreement between you and us about using Huddle.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions about these terms: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
    </LegalLayout>
  );
}
