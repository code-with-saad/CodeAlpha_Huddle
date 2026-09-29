# Huddle: Progress

CodeAlpha Full Stack Development internship, Task 3 (collaborative project management tool).

| Phase | Scope | Status |
|---|---|---|
| 0 | Scaffolding, .gitignore, Atlas connection (`huddle_db`), design tokens, responsive shell, first deploy | Done except the first Vercel deploy (owner creates the projects; see below) |
| 1 | Auth and profile | Done, verified in browser; Terms and Privacy links point at pages that arrive in Phase 8 |
| 2 | Projects, membership, invites, roles and permissions | Not started |
| 3 | Boards, columns, cards, drag and drop (with mobile Move-to menu) | Not started |
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
