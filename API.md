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
