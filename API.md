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
