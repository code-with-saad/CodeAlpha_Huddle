# Huddle: Progress

CodeAlpha Full Stack Development internship, Task 3 (collaborative project management tool).

| Phase | Scope | Status |
|---|---|---|
| 0 | Scaffolding, .gitignore, Atlas connection (`huddle_db`), design tokens, responsive shell, first deploy | Done except the first Vercel deploy (owner creates the projects; see below) |
| 1 | Auth and profile | Done, verified in browser; Terms and Privacy links point at pages that arrive in Phase 8 |
| 2 | Projects, membership, invites, roles and permissions | Done, verified in browser |
| 3 | Boards, columns, cards, drag and drop (with mobile Move-to menu) | Done, verified in browser |
| 4 | Card detail: description, assignees, labels, priority, due date, checklists, attachments, comments, mentions | Not started |
| 5 | Realtime layer (Ably): token endpoint, live board sync, presence, notification center, watchers | Not started |
| 6 | Activity log, search and filter, List and Calendar views, archive and restore, bulk actions, undo, command palette and shortcuts | Not started |
| 7 | Project dashboard and charts | Not started |
| 8 | Landing page, Terms and Privacy pages | Not started |
| 9 | Full QA at 375 / 768 / 1280 in both themes, docs finalization, final deploy | Not started |
| 10 | Tier 3 stretch items | Not started |

Responsive checks at 375px, 768px and 1280px+ happen inside each phase, not at the end.

## Decisions
- Free plans only, no credit card. Client and API are two separate Vercel projects.
- Realtime: Ably (REST publish from the API after each DB write, token auth for clients). MongoDB stays the source of truth.
- Files: Cloudinary, direct client upload with server-signed requests.
- Auth: JWT in the Authorization header (localStorage). XSS tradeoff will be documented in the README.
- Invites: by email or username create an in-app pending invite (no email is sent). A shareable, revocable link joins as Viewer by default, Member selectable. Gmail SMTP with an app password is a possible later addition, decided with the owner.
- Time-based notifications (due soon, overdue): generated lazily on load unless Vercel's free cron allows a frequent schedule. Limits to be checked in Phase 5.
- Type: IBM Plex Sans (UI) and IBM Plex Mono (dates, counts, keys). Icons: lucide-react through one `Icon` wrapper, stroke 1.5.
- Accent: petrol blue `#0B6580` (light) and `#5DB4D2` (dark). All text, accent and status pairs are at least 4.5:1 on every surface. The control border token is at least 3:1 on every surface. No blur anywhere and no card left stripe.

## Phase 0 log
- Git initialised with `.gitignore` first. Express API with a module-scope cached Mongoose connection, a hard check that `MONGODB_URI` names `huddle_db`, and a check of the live database name after connect (also exposed at `/api/health/db`).
- Vite + React client, tokens for light and dark as CSS variables, responsive shell (bottom nav under 768px, icon rail from 768px, labelled sidebar from 1024px), theme switch (system, light, dark) applied before first paint.
- Client `vercel.json` has a strict CSP already allowing Cloudinary and Ably.
- Verified in headless Chrome: production build passes; shell at 375 (iframe), 768 and 1280 in light and dark.
- Verified: live Atlas connection reports database `huddle_db` (`/api/health/db`). Reuses the Circl cluster with its own database.
- Not yet done: the two Vercel deploys and GitHub push. The owner will create the repo and projects later; Phase deploy steps are deferred until then.

## Phase 1 log
- Server: User model (username, name, email, hashed password, avatar), register, login, `GET/PATCH /api/auth/me`, change password, signed Cloudinary upload. bcryptjs cost 12, JWT HS256 24h, 20 attempts per 15 min on credential routes, string-only inputs against NoSQL injection, generic login error with a dummy hash compare for unknown emails, reserved usernames, password change signs out older sessions.
- Cloudinary is shared with Circl, so uploads are signed into `huddle/avatars` (and `huddle/attachments` for Phase 4). The API only accepts avatar URLs from our account under `/huddle/`.
- Client: auth context (token in localStorage with try/catch, a network failure does not log you out, a 401 does), login and register on one page with inline field errors, protected routes that return you to the page you wanted, profile page (name, photo upload and remove, read-only username and email, change password), toast messages, Avatar with initial fallback.
- XSS tradeoff: the JWT lives in localStorage and is sent in the Authorization header, so any script injection could read it. Mitigations: strict CSP (no inline scripts), React escapes output, no HTML rendering of user text. To be written up in the README.
- Verified against live Atlas via API: register, duplicate, validation, operator-injection body, wrong password, login, `/me` with and without token, profile patch, foreign avatar URL rejected, upload signature (secret not exposed), password change invalidates the old token.
- Verified in headless Chrome at 375, 768 and 1280 (light and dark screenshots): 38 of 38 checks (redirects, field errors, register, profile save and persist, logout, protected redirect, wrong password message, no horizontal overflow). Real avatar upload to Cloudinary at 1280 confirmed under `huddle/avatars`. Test users and uploaded test images were deleted afterwards.
- Known gaps: `/terms` and `/privacy` return the 404 page until Phase 8. No favicon yet (one harmless 404 in the console). Not tested on a real phone or in Safari or Firefox.

## Phase 2 log
- Server: Project model (members embedded with a role, soft archive), Invite model (direct invitations and shareable links in one collection). Roles are Owner, Admin, Member, Viewer. Every check runs on the server through `loadProject` and `requireRole`; non-members get 404 so project ids cannot be probed.
- Rules: only the owner can archive, restore, transfer ownership or make admins. Admins manage members and viewers, invite as member or viewer, edit project details and revoke invites. Members and viewers can only read the member list and leave. Nobody can be made owner except through a transfer, and the owner cannot leave. Archived projects are read-only (409 on writes) until restored.
- Invites: search by username prefix or exact email (never returns emails). Inviting by email or username needs an existing account and creates a pending invitation the person accepts or declines on their Projects page; no email is sent. Unknown emails get a message pointing to invite links. Links grant Viewer (default) or Member, expire in 1, 7 or 30 days or never, count uses, and can be revoked. A link never changes the role of someone already in. Joining is atomic so double clicks cannot create duplicate members.
- Client: Projects page (list, invitations with accept and decline, new project dialog), project layout with Board and Members tabs, Members page (role select, remove, make owner, leave, details, invite by search, pending invitations, link creation with copy and revoke, archive and restore), join page for links (signed-out visitors go to login and come back). Native `<dialog>` for modals and in-app confirmations.
- Bug found and fixed in the browser test: the native dialog focused the close button instead of Cancel in confirmations. Focus now moves to the element marked `data-autofocus`.
- Express 5 does not allow regex parameters in route paths, so archive/restore and accept/decline are separate routes.
- Verified via API against live Atlas: 82 of 82 checks (full role matrix, invite and link lifecycle, ownership transfer, archive and restore, bad ids and injection). Verified in headless Chrome at 375, 768 and 1280 with three real users in separate sessions: 93 of 93 checks, no console errors, no horizontal overflow, light and dark screenshots. Test users, projects and invites were deleted afterwards.
- Not done or not tested: invite notifications arrive with the notification center in Phase 5 (for now invitations show on the Projects page only). No live updates yet, so a role change shows after a reload until Phase 5. The Board tab is a placeholder until Phase 3. Real phone not tested.

## Phase 3 log
- Server: Column and Card models with fractional `position` keys (a move rewrites one document; neighbours closer than 1e-6 trigger a renumber of that list). New projects get To Do, In Progress and Done. Columns are managed by admins and above, cards by members and above, viewers read only. Deleting a column is a soft delete and asks what to do with its cards: move them to another column or archive them with it. A project keeps at least one column. Limits: 30 columns and 1000 active cards per project.
- Client: `useBoard` keeps the board in one state object with optimistic updates and rollback to a snapshot when the API refuses a change. Board with @dnd-kit: cards drag within and across columns, columns drag by a handle. Mouse needs a 6px move to start a drag, touch needs a 250ms long press so a finger can still scroll the board. Keyboard dragging is enabled.
- Every card has an actions menu (Edit title, Move up, Move down, Move to any column, Archive) and every column has one (Rename, Move left, Move right, Delete). On screens under 1024px and on touch devices the card menu is always visible; on desktop it appears on hover or focus. The menu renders in a portal and follows its button when the board scrolls.
- Phone layout: one column at a time with horizontal snap scrolling (snap is switched off during a drag so it does not fight auto-scroll).
- Bugs found in the browser test and fixed: the add-task input kept its text until the server answered, so fast typing merged two titles (it now clears at once and restores on failure); the actions menu closed on any scroll, so a board settling after a tap closed it (it now follows its button instead).
- Verified via API against live Atlas: 49 of 49 checks (default columns, role gates, ordering including 90 inserts into the same gap to force renumbering, move, clamp, archive, column reorder and delete rules, archived project read-only). Verified in headless Chrome at 375 (touch), 768 and 1280 (mouse): 83 of 83 checks including drag across columns, drag reorder, column drag, Move to menu, edit, archive, rollback when the move request is blocked, delete column, viewer restrictions, persistence after reload. No console errors. Test data was deleted afterwards.
- Known gaps: cards are title only until Phase 4. Card actions live in the menu; opening a card detail arrives with Phase 4. There is no undo for archiving yet (Phase 6). No live sync between two people's browsers until Phase 5, so a teammate's change shows after a reload. The card element is focusable for keyboard dragging and contains the menu button, which is a nested interactive element that Phase 9 accessibility work should revisit. Touch drag across columns on a phone needs holding at the screen edge to scroll to the next column, which is why the Move to menu exists. Not tested on a real phone.
