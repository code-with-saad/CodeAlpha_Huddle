# Huddle API

Base path: `/api`. Endpoints are documented here as they are built.

## Health

- `GET /api/health`: liveness, no database access.
- `GET /api/health/db`: connects to Mongo and returns the live database name (expected `huddle_db`).

## Auth

All bodies are JSON. Authenticated routes need `Authorization: Bearer <token>`. Errors look like `{ "message": "...", "errors": { "field": "..." } }`.

| Method | Path | Auth | Body | Result |
|---|---|---|---|---|
| POST | `/api/auth/register` | none | `username`, `email`, `password`, `name?` | `201 { token, user }`. `400` field errors, `409` username or email taken |
| POST | `/api/auth/login` | none | `email`, `password` | `{ token, user }`. `401` for any wrong credential |
| GET | `/api/auth/me` | yes | none | `{ user }` |
| PATCH | `/api/auth/me` | yes | `name?`, `avatar?` (Cloudinary URL under `huddle/`, or `""` to remove) | `{ user }` |
| POST | `/api/auth/password` | yes | `currentPassword`, `newPassword` | `{ token, user }`. Older tokens stop working |

Register, login and password change are limited to 20 requests per 15 minutes per IP.

`user` is `{ id, username, name, avatar, email, createdAt }`. Other people's users will only ever include `id`, `username`, `name`, `avatar`.

## Uploads

| Method | Path | Auth | Body | Result |
|---|---|---|---|---|
| POST | `/api/uploads/sign` | yes | `kind`: `avatar` or `attachment` | `{ cloudName, apiKey, folder, timestamp, signature }` for a direct browser upload to Cloudinary |

## People search

| Method | Path | Auth | Result |
|---|---|---|---|
| GET | `/api/users/search?q=` | yes | `{ users }` (up to 8, public fields only). `q` under 2 characters returns an empty list. Usernames match by prefix; an email must match exactly. Yourself is excluded |

## Projects

Roles: `owner`, `admin`, `member`, `viewer`. A caller who is not a member gets `404` for every project route. A role that is too low gets `403`. Writes to an archived project get `409`.

A project is `{ id, name, description, archived, myRole, createdAt, members: [{ user: { id, username, name, avatar }, role, joinedAt }] }`.

| Method | Path | Min role | Body | Result |
|---|---|---|---|---|
| GET | `/api/projects` | signed in | query `archived=1` for archived | `{ projects }` for projects you belong to |
| POST | `/api/projects` | signed in | `name`, `description?` | `201 { project }`; you become owner |
| GET | `/api/projects/:id` | viewer | none | `{ project }` |
| PATCH | `/api/projects/:id` | admin | `name?`, `description?` | `{ project }` |
| POST | `/api/projects/:id/archive` | owner | none | `{ ok, archived: true }` |
| POST | `/api/projects/:id/restore` | owner | none | `{ ok, archived: false }` |
| PATCH | `/api/projects/:id/members/:userId` | admin | `role`: `admin`, `member` or `viewer` | `{ ok }`. Admins can only assign member or viewer and only to members and viewers. Nobody can be set to owner here |
| DELETE | `/api/projects/:id/members/:userId` | viewer (self) or admin | none | `{ ok }`. Anyone can remove themselves except the owner. Admins can remove members and viewers |
| POST | `/api/projects/:id/members/:userId/make-owner` | owner | none | `{ ok }`. The previous owner becomes admin |

## Invitations

| Method | Path | Min role | Body | Result |
|---|---|---|---|---|
| GET | `/api/projects/:id/invites` | admin | none | `{ invites }`: open direct invitations and links. Links include their `token` |
| POST | `/api/projects/:id/invites` | admin | `username` or `email`, `role` | `201 { invite }`. `404` if no such account, `409` if already a member or already invited, `403` if the role is above the caller's power |
| POST | `/api/projects/:id/invite-links` | admin | `role?` (`viewer` default, or `member`), `expiresInDays?` (1, 7, 30 or null) | `201 { invite }` with `token` |
| DELETE | `/api/projects/:id/invites/:inviteId` | admin | none | `{ ok }`. Works for both kinds |
| GET | `/api/invites` | signed in | none | `{ invites }` addressed to you: `{ id, role, invitedBy, project }` |
| POST | `/api/invites/:inviteId/accept` | invitee | none | `{ ok, projectId }` |
| POST | `/api/invites/:inviteId/decline` | invitee | none | `{ ok }` |
| GET | `/api/invite-links/:token` | signed in | none | `{ project, role, alreadyMember }`. `404` for invalid, revoked or expired |
| POST | `/api/invite-links/:token/join` | signed in | none | `{ ok, projectId }`. Existing members keep their role |

## Board

Columns are managed by admins and above. Cards are managed by members and above. Any member, including viewers, can read the board. Writes to an archived project return `409`.

A column is `{ id, name, position }`. Lists come back sorted by `position`.

A card on the board (its "face") is `{ id, column, title, position, createdAt, priority, dueDate, assignees, labels, checklist: { total, done }, commentCount, attachmentCount }`. `dueDate` is `YYYY-MM-DD` or null; `assignees` are user ids; `labels` are label ids. The board response also includes `labels: [{ id, name, color }]`.

| Method | Path | Min role | Body | Result |
|---|---|---|---|---|
| GET | `/api/projects/:id/board` | viewer | none | `{ columns, cards, labels }`, active items only |
| POST | `/api/projects/:id/columns` | admin | `name` (up to 40) | `201 { column }`, added at the end. `409` at 30 columns |
| PATCH | `/api/projects/:id/columns/:columnId` | admin | `name?`, `index?` (final position among columns) | `{ column }` |
| DELETE | `/api/projects/:id/columns/:columnId` | admin | query `moveTo=<columnId>` or `archiveCards=1` | `{ ok }`. `409` with `cardCount` if it has cards and neither option is given, and `409` for the last column |
| POST | `/api/projects/:id/cards` | member | `columnId`, `title` (up to 200), `index?` (default end) | `201 { card }`. `409` at 1000 active cards |
| POST | `/api/projects/:id/cards/:cardId/move` | member | `columnId`, `index` (final position in that column, clamped to the end) | `{ card }` |
| DELETE | `/api/projects/:id/cards/:cardId` | member | none | `{ ok }`. Soft delete: the card is archived, not removed |

## Card detail

Every card write below returns the whole card as `{ card, comments, people }`. `card` is the face plus `description`, `createdBy`, `checklistItems: [{ id, text, done }]` and `attachments: [{ id, url, name, size, mime, uploadedBy, createdAt }]`. `people` are public profiles of comment authors, uploaders and the creator, including people who have left. A comment is `{ id, card, author, body, mentions, createdAt, editedAt }`.

| Method | Path | Min role | Body | Notes |
|---|---|---|---|---|
| GET | `/api/projects/:id/cards/:cardId` | viewer | none | Up to the newest 300 comments, oldest first |
| PATCH | `/api/projects/:id/cards/:cardId` | member | any of `title`, `description` (10,000), `priority` (`none`, `low`, `medium`, `high`, `urgent`), `dueDate` (`YYYY-MM-DD` or null), `assignees` (member ids, up to 10), `labels` (label ids, up to 10) | `400` with per-field `errors`. Impossible dates such as `2026-02-31` are rejected |
| POST | `/api/projects/:id/cards/:cardId/checklist` | member | `text` (200) | `201`. Up to 50 items |
| PATCH | `/api/projects/:id/cards/:cardId/checklist/:itemId` | member | `text?`, `done?` | |
| DELETE | `/api/projects/:id/cards/:cardId/checklist/:itemId` | member | none | |
| POST | `/api/projects/:id/cards/:cardId/attachments` | member | `url`, `name`, `size`, `mime`, `publicId`, `resourceType` (`image` or `raw`) from a signed Cloudinary upload | `201`. The URL must be in our account under `huddle/attachments/`. Types: JPG, PNG, WebP, GIF, PDF, TXT, CSV, MD, DOCX, XLSX, PPTX. Up to 10 MB and 10 per card |
| DELETE | `/api/projects/:id/cards/:cardId/attachments/:attachmentId` | member | none | The uploader or an admin. Also deletes the file from Cloudinary |
| POST | `/api/projects/:id/cards/:cardId/comments` | member | `body` (2,000) | `201 { comment }`. `@username` of project members is stored in `mentions` |
| PATCH | `/api/projects/:id/cards/:cardId/comments/:commentId` | author | `body` | `{ comment }` |
| DELETE | `/api/projects/:id/cards/:cardId/comments/:commentId` | author or admin | none | `{ ok }` |

## Labels

| Method | Path | Min role | Body | Result |
|---|---|---|---|---|
| POST | `/api/projects/:id/labels` | member | `name` (30), `color` (`#rrggbb`) | `201 { label }`. Up to 30 per project |
| PATCH | `/api/projects/:id/labels/:labelId` | admin | `name?`, `color?` | `{ label }` |
| DELETE | `/api/projects/:id/labels/:labelId` | admin | none | `{ ok }`. Removed from every card |

## Realtime

Ably free plan. The API publishes after each successful write; the browser only subscribes.

| Method | Path | Auth | Result |
|---|---|---|---|
| GET | `/api/realtime/token` | yes | An Ably token request for this person: `clientId` is their user id and the capability is `subscribe`, `presence`, `history` on `project:<id>` for each project they belong to and `subscribe`, `history` on `user:<id>`. Call it again after membership changes. `503` if Ably is not configured |

Every event on a project channel carries `by` (user id) and `tab` (the `X-Tab-Id` header of the request that caused it). A client ignores events with its own tab id.

| Channel | Event | Data |
|---|---|---|
| `project:<id>` | `card.upsert` | `{ card }` (board face) |
| | `card.moved` | `{ card, index }`, index is the final position in its column |
| | `card.removed` | `{ cardId }` |
| | `comment.created` | `{ cardId, card, comment }` |
| | `comment.updated` | `{ cardId, card, comment }` |
| | `comment.deleted` | `{ cardId, card, commentId }` |
| | `board.reload` | none. Columns or labels changed, or positions were renumbered |
| | `project.changed` | none. Name, archive state, members or roles changed |
| `user:<id>` | `notification` | `{ notification, unread }` |
| | `access.changed` | `{ projectId }` or `{ removedFrom }`. Ask for a new token |
| | `invites.changed` | none |

Presence on `project:<id>`: each open tab enters with `{ name, username, avatar }`.

## Notifications

A notification is `{ id, type, actor, project: { id, name } | null, card: { id, title } | null, snippet, read, createdAt }`. Types: `assigned`, `mentioned`, `comment`, `due_soon`, `overdue`, `invited`.

| Method | Path | Auth | Body or query | Result |
|---|---|---|---|---|
| GET | `/api/notifications` | yes | `limit` (up to 50), `before` (notification id), `unread=1` | `{ notifications, hasMore, unread }`. Also creates any missing due soon and overdue notifications for you |
| GET | `/api/notifications/unread` | yes | none | `{ unread }`. Also runs the due date check, at most once a minute per server instance |
| POST | `/api/notifications/read` | yes | `{ ids: [...] }` or `{ all: true }` | `{ unread }`. Only your own notifications are touched |

## Watching a card

| Method | Path | Min role | Result |
|---|---|---|---|
| POST | `/api/projects/:id/cards/:cardId/watch` | viewer | Full card, `watching: true` |
| DELETE | `/api/projects/:id/cards/:cardId/watch` | viewer | Full card, `watching: false` |

Card detail also returns `watching` and `watcherCount`.

## Activity

An activity line is `{ id, type, actor, card: { id, title } | null, data, createdAt }`. Types: `card.created`, `card.moved`, `card.renamed`, `card.archived`, `card.restored`, `card.duplicated`, `card.assigned`, `card.unassigned`, `card.priority`, `card.due`, `card.commented`, `card.attached`, `card.bulk`, `column.created`, `column.renamed`, `column.deleted`, `column.restored`, `member.joined`, `member.removed`, `member.role`, `project.updated`, `project.archived`, `project.restored`.

| Method | Path | Min role | Query | Result |
|---|---|---|---|---|
| GET | `/api/projects/:id/activity` | viewer | `group` (`cards`, `comments`, `columns`, `members`, `project`), `type`, `actor` (user id), `card` (card id), `q` (task title text), `before` (activity id), `limit` (up to 50) | `{ activity, hasMore }`, newest first. Unknown filter values are ignored |

## Duplicate, archive and restore

| Method | Path | Min role | Result |
|---|---|---|---|
| POST | `/api/projects/:id/cards/:cardId/duplicate` | member | `201 { card }`. Placed right below the original |
| GET | `/api/projects/:id/archive` | viewer | `{ cards: [{ id, title, column, columnArchived, archivedAt, withColumn }], columns: [{ id, name, archivedAt, cardCount }] }` |
| POST | `/api/projects/:id/cards/:cardId/restore` | member | `{ card }`. Keeps its old place if the column still exists, otherwise goes to the first column |
| POST | `/api/projects/:id/columns/:columnId/restore` | admin | `{ ok }`. Brings back the cards archived with it |

Deleting a card is `DELETE /api/projects/:id/cards/:cardId` and deleting a column is `DELETE /api/projects/:id/columns/:columnId`; both archive. Nothing is removed for good.

## Bulk actions

`POST /api/projects/:id/cards/bulk` (member). Body `{ action, ids }` with 1 to 100 card ids, plus:

| action | extra fields | Notes |
|---|---|---|
| `move` | `columnId` | Appends to the end of that column in the order of `ids`. Answers `changed: [{ id, columnId, position }]` with the previous places |
| `place` | `items: [{ id, columnId, position }]` | Puts cards back at exact earlier places (used by Undo) |
| `assign` | `userIds` (members, up to 10), `mode` (`add` default, or `remove`) | One notification per person for the whole batch |
| `label` | `labelId`, `mode` (`add` or `remove`) | |
| `archive` | none | |
| `restore` | none | Works on archived cards |

Every action answers `{ changed: [...], count }`, listing only the cards that actually changed. Errors: `400` for an empty or oversized selection, unknown ids, action or label, `404` when none of the ids match, `403` for viewers, `409` on an archived project.

## Search

| Method | Path | Auth | Query | Result |
|---|---|---|---|---|
| GET | `/api/search` | yes | `q` (2 to 60 characters) | `{ projects: [{ id, name }], cards: [{ id, title, project: { id, name }, column, snippet }] }` across projects you belong to (not archived). `snippet` shows the matching part when only the description matched |
