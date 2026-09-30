# Huddle

> A collaborative project management tool built with the MERN stack.

> [!NOTE]
> CodeAlpha Internship - Task 3 (Project Management Tool)

Huddle is a project board for small teams: custom columns, task cards with assignees, labels, priorities and due dates, comments, notifications and live updates. Work in progress; see [PROGRESS.md](PROGRESS.md) for status.

---

![Status](https://img.shields.io/badge/status-in%20progress-orange)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb)
![Express](https://img.shields.io/badge/Express-5-black?logo=express)

---

## Live Demo

Not deployed yet.

---

## Features

Planned, in build order (see PROGRESS.md for what is done):

- Register, login, profile with avatar
- Group projects with roles (Owner, Admin, Member, Viewer) and invites by search or revocable link
- Boards with custom columns and drag and drop, plus a Move to menu on touch screens
- Card detail: markdown description, assignees, labels, priority, due date, checklist, attachments, comments, mentions
- Live updates and presence through Ably, notification center
- Activity log, search and filters, List and Calendar views, archive and restore, bulk actions, undo, command palette
- Project dashboard with charts
- Light and dark themes, fully responsive

---

## Screenshots

Added as screens land (saved in `screenshots/`).

---

## Tech Stack

**Frontend:** React 19, React Router, Vite, vanilla CSS with design tokens, lucide-react, Axios

**Backend:** Node.js, Express 5, MongoDB Atlas + Mongoose, JWT + bcryptjs, Helmet, express-rate-limit

**Realtime and files:** Ably (free plan), Cloudinary (direct signed uploads)

**Hosting:** Vercel (client and API as two projects)

---

## Project Structure

```
CodeAlpha_Huddle/
├── client/                  # React frontend (Vite)
│   ├── src/
│   │   ├── components/      # Shell, Icon, shared UI
│   │   ├── pages/           # One file per screen
│   │   ├── lib/             # API client, theme helpers
│   │   └── styles/          # tokens.css, base.css, shell.css
│   └── public/
└── server/                  # Express API
    ├── api/                 # Vercel serverless entry
    └── src/
        ├── config/          # Cached Mongo connection
        ├── models/
        ├── controllers/
        ├── middleware/
        └── routes/
```

---

## Running Locally

**Prerequisites:** Node.js 20+, a MongoDB Atlas URI, a Cloudinary account and an Ably account (free tiers, no card). `ABLY_API_KEY` is server-only and is never sent to the browser.

**Backend**

```bash
cd server
cp .env.example .env     # fill in MONGODB_URI (with /huddle_db), JWT_SECRET, CLIENT_URL, ...
npm install
npm run dev              # http://localhost:5000
```

`JWT_SECRET` must be a random string of 32 or more characters. `MONGODB_URI` must name the database (`.../huddle_db?...`), otherwise the API refuses to start.

**Frontend**

```bash
cd client
npm install
npm run dev              # http://localhost:5173
```

The dev server forwards `/api` requests to port 5000, so keep both running.

API reference: [API.md](API.md) (added as endpoints land).
