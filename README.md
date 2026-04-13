# 📝 MarkNotes — Markdown Notes Application

A full-stack Markdown notes application with real-time split-screen preview, JWT authentication, version history, tags, dark mode, and debounced auto-save.

---

## 🏗️ Tech Stack

| Layer    | Technology                           |
| -------- | ------------------------------------ |
| Frontend | React 18, react-markdown, remark-gfm |
| Backend  | Node.js, Express 4                   |
| Database | MySQL (via mysql2)                   |
| Auth     | JWT (jsonwebtoken + bcryptjs)        |

---

## ✨ Features

### Core

- ✅ Create, read, update, delete notes
- ✅ Markdown editor with live split-screen preview
- ✅ Renders: headings, bold/italic, lists, code blocks, links, tables, blockquotes
- ✅ Persistent storage in MySQL

### Bonus

- ✅ **JWT Authentication** — register & login flow
- ✅ **Debounced Auto-Save** — saves 800ms after you stop typing
- ✅ **Version History** — every save snapshots the previous content; restore any version
- ✅ **Tags / Categories** — add tags to notes, filter sidebar by tag
- ✅ **Full-Text Search** — MySQL FULLTEXT search across title and content
- ✅ **Dark Mode** — toggle with 🌙/☀️ button, persisted to localStorage
- ✅ **Responsive Design** — works on mobile and desktop
- ✅ **Pin Notes** — pin important notes to the top of the list
- ✅ **View Modes** — editor-only, split-screen, or preview-only

---

## 📁 Project Structure

```
markdown-notes-app/
├── backend/
│   ├── src/
│   │   ├── app.js                  # Express entry point + startup
│   │   ├── controllers/
│   │   │   ├── authController.js   # Register, login, me
│   │   │   └── notesController.js  # CRUD, versions, tags
│   │   ├── middleware/
│   │   │   └── auth.js             # JWT verification middleware
│   │   ├── models/
│   │   │   ├── database.js         # MySQL connection pool
│   │   │   └── migrate.js          # DDL migrations (auto-run on startup)
│   │   └── routes/
│   │       ├── auth.js             # /api/auth/*
│   │       └── notes.js            # /api/notes/*
│   ├── .env                        # Local env (git-ignored)
│   ├── .env.example                # Template
│   └── package.json
│
└── frontend/
    ├── public/
    │   └── index.html
    └── src/
        ├── components/
        │   ├── Auth/               # Login / Register page
        │   ├── Editor/             # Split-screen Markdown editor
        │   ├── Sidebar/            # Notes list, search, tag filter
        │   ├── TagEditor/          # Inline tag input
        │   └── VersionHistory/     # Version history modal
        ├── context/
        │   ├── AuthContext.js      # Auth state + helpers
        │   └── ThemeContext.js     # Dark/light theme
        ├── hooks/
        │   ├── useDebounce.js      # Generic debounce hook
        │   └── useNotes.js         # Notes CRUD state management
        ├── services/
        │   └── api.js              # Axios instance + API helpers
        ├── styles/
        │   └── globals.css         # CSS variables, reset, utilities
        ├── App.js
        └── index.js
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- **MySQL** ≥ 8.x (running locally or remotely)

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/markdown-notes-app.git
cd markdown-notes-app
```

### 2. Configure environment variables

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# JWT
JWT_SECRET=your_super_secret_key_here   # Change this!
JWT_EXPIRES_IN=7d

# MySQL
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=marknotes
```

### 3. Install dependencies

```bash
# Backend
cd backend
npm install

# Frontend (open a new terminal)
cd ../frontend
npm install
```

### 4. Run database migrations

Migrations run **automatically** when the backend starts. The `marknotes` database is created if it doesn't exist.

To run migrations manually:

```bash
cd backend
node src/models/migrate.js
```

### 5. Start the development servers

**Terminal 1 — Backend:**

```bash
cd backend
npm run dev        # nodemon hot-reload
# API: http://localhost:5000
```

**Terminal 2 — Frontend:**

```bash
cd frontend
npm start
# App: http://localhost:3000
```

The React dev server proxies `/api` requests to `http://localhost:5000` automatically.

---

## 🗄️ Database Schema

```sql
-- Users
CREATE TABLE users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  username   VARCHAR(30)  NOT NULL UNIQUE,
  email      VARCHAR(255) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,          -- bcrypt hash
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tags
CREATE TABLE tags (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  name  VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(20)  NOT NULL DEFAULT '#6366f1'
);

-- Notes (FULLTEXT index for search)
CREATE TABLE notes (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(255) NOT NULL DEFAULT 'Untitled Note',
  content    LONGTEXT     NOT NULL,
  is_pinned  TINYINT(1)   NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FULLTEXT INDEX idx_notes_fts (title, content)
);

-- Note ↔ Tag (many-to-many)
CREATE TABLE note_tags (
  note_id INT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id  INT NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);

-- Version snapshots
CREATE TABLE note_versions (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  note_id  INT          NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  title    VARCHAR(255) NOT NULL,
  content  LONGTEXT     NOT NULL,
  saved_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔌 API Reference

All endpoints (except auth) require `Authorization: Bearer <token>`.

### Auth

| Method | Endpoint             | Description      |
| ------ | -------------------- | ---------------- |
| POST   | `/api/auth/register` | Create account   |
| POST   | `/api/auth/login`    | Login, get JWT   |
| GET    | `/api/auth/me`       | Get current user |

### Notes

| Method | Endpoint                               | Description            |
| ------ | -------------------------------------- | ---------------------- |
| GET    | `/api/notes`                           | List notes (paginated) |
| GET    | `/api/notes?search=query`              | Full-text search       |
| GET    | `/api/notes?tag=tagname`               | Filter by tag          |
| GET    | `/api/notes/:id`                       | Get single note        |
| POST   | `/api/notes`                           | Create note            |
| PUT    | `/api/notes/:id`                       | Update note            |
| DELETE | `/api/notes/:id`                       | Delete note            |
| GET    | `/api/notes/:id/versions`              | List version history   |
| POST   | `/api/notes/:id/versions/:vId/restore` | Restore a version      |
| GET    | `/api/notes/tags`                      | List user's tags       |

### Response shape

```json
{
  "success": true,
  "data": { ... },
  "meta": { "total": 42, "page": 1, "limit": 20, "totalPages": 3 }
}
```

---

## 🎨 Design Decisions & Trade-offs

1. **MySQL over SQLite** — Production-grade RDBMS with proper concurrency, FULLTEXT search, and easy cloud hosting (PlanetScale, Railway, AWS RDS).

2. **Debounced auto-save (800ms)** — Balances responsiveness with API efficiency. A manual Save button is also provided for explicit control.

3. **MySQL FULLTEXT search** — Uses InnoDB FULLTEXT index with BOOLEAN MODE for prefix matching. Scales well for typical note volumes.

4. **Version history on every save** — Snapshots the _previous_ content before overwriting. Keeps the last 50 versions per note.

5. **CSS custom properties for theming** — No CSS-in-JS library needed. A single `data-theme` attribute on `<html>` switches the entire palette.

6. **No Redux** — React Context + custom hooks (`useNotes`, `useAuth`) are sufficient for this scope. Avoids boilerplate.

7. **mysql2 connection pool** — Reuses connections efficiently; `connectionLimit: 10` prevents overwhelming the DB server.

---

## 🌐 Deployment

### Backend (Render / Railway)

1. Set environment variables in the platform dashboard (copy from `.env.example`).
2. Use a managed MySQL service (PlanetScale, Railway MySQL, AWS RDS).
3. Build command: `npm install`
4. Start command: `npm start`

### Frontend (Vercel / Netlify)

1. Set `REACT_APP_API_URL` to your deployed backend URL (e.g., `https://your-api.onrender.com/api`).
2. Build command: `npm run build`
3. Output directory: `build`

---

## 📄 License

MIT
