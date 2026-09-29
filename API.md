# Huddle API

Base path: `/api`. Endpoints are documented here as they are built.

## Health

- `GET /api/health`: liveness, no database access.
- `GET /api/health/db`: connects to Mongo and returns the live database name (expected `huddle_db`).
