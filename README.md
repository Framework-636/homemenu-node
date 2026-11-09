# HomeMenu API

[![CI](https://github.com/Framework-636/homemenu-node/actions/workflows/ci.yml/badge.svg)](https://github.com/Framework-636/homemenu-node/actions/workflows/ci.yml)

A REST API for [HomeMenu.plus](https://homemenu.plus), a meal-planning app for recipes, pantry tracking, meal plans and grocery lists. Rebuilt from its original plain-PHP backend into Node.js and Express, and containerized with Docker.

## Tech Stack

- **Node.js 26** with ES modules
- **TypeScript** (strict), run directly by Node's built-in type stripping and checked with `tsc`. No build step.
- **Express 5** for routing, middleware and centralized error handling
- **MariaDB 11.4** via the `mysql2` driver, with a connection pool and parameterized queries
- **Docker Compose** running the API and database as separate services on a private network
- **React 19 + Vite** front end in `client/`, with React Router for client-side routing

## Architecture

```
Browser / client
      │  HTTP :3000
      ▼
┌──────────────┐   Docker network   ┌──────────────┐
│  api         │ ─────────────────► │  db          │
│  Node/Express│    host "db":3306  │  MariaDB 11.4│
└──────────────┘                    └──────────────┘
                                       │
                                       ▼
                                  db_data volume
                                  (persistent)
```

The API waits for the database's health check to pass before starting, so it never boots against a database that isn't ready.

## Getting Started

**Prerequisites:** Docker Desktop and Git.

```bash
git clone https://github.com/Framework-636/homemenu-node.git
cd homemenu-node
cp .env.example .env        # then fill in passwords
docker compose up -d --build
```

On first start, the database is created from `db/init/001_schema.sql` and filled with demo data from `db/init/002_seed.sql`: four public recipes, plus one private recipe for testing visibility rules.

Demo login: username `demo`, password `demo-password` (seed data only).
A second account, `neighbor` / `demo-password`, owns one private recipe. It's used to check that users can't see each other's private recipes.

To reset to a fresh database:

```bash
docker compose down -v
docker compose up -d
```

The API runs at `http://localhost:3000`.

### Front end

The React app lives in `client/` and talks to the API through Vite's dev proxy:

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`. Requests to `/api` are forwarded to the API on port 3000.

Click **Log in** and use `demo` / `demo-password` to see that account's private recipe appear.

### Local development (hot reload)

Run the database in Docker and the API directly with Node:

```bash
docker compose up -d db
npm install
npm run dev
```

`npm run dev` uses Node's built-in `--watch` and `--env-file`, with no extra tooling.

Checks (the same ones CI will run):

```bash
npm run typecheck     # TypeScript types
npm run lint          # ESLint
npm run format:check  # Prettier
npm test              # API tests (needs the database running)
```

## API Endpoints

| Method | Endpoint           | Description                                                                            |
| ------ | ------------------ | -------------------------------------------------------------------------------------- |
| GET    | `/api/health`      | API and database status                                                                |
| GET    | `/api/recipes`     | Public recipes, plus the logged-in user's private ones                                 |
| GET    | `/api/recipes/:id` | One recipe with ingredients, steps and tags. Someone else's private recipe returns 404 |
| POST   | `/api/auth/login`  | Log in with username or email; sets a session cookie                                   |
| POST   | `/api/auth/logout` | End the session and clear the cookie                                                   |
| GET    | `/api/auth/me`     | The logged-in user, or 401                                                             |
| POST   | `/api/recipes`     | Create a recipe (login required). Returns `201` with the new id                        |
| PUT    | `/api/recipes/:id` | Replace one of your recipes. `204`, or `404` if it isn't yours                         |
| DELETE | `/api/recipes/:id` | Delete one of your recipes and its ingredients, steps and tags. `204` or `404`         |

**Status codes:** `400` invalid input · `401` not logged in or invalid login · `404` not found · `503` database unavailable · `500` unexpected server error

## Project Structure

```
client/              # React + TypeScript front end (Vite)
  src/components/    # Shared UI (RecipeForm, used by the new and edit pages)
  src/api.ts         # sendJson helper for POST/PUT/DELETE with consistent error handling
  src/auth/          # Login state shared across pages (React context + useAuth hook)
  src/pages/         # Recipe list and detail pages
  src/useApi.ts      # Data-loading hook (loading, errors, 404s, stale-request guard)
db/init/
  001_schema.sql     # Table definitions (no data)
  002_seed.sql       # Demo data
src/
  server.ts          # App setup, middleware, error handler
  db.ts              # MariaDB connection pool (fails fast on missing env vars)

  routes/
    recipes.ts       # Recipe endpoints with typed query results
compose.yaml         # API + database services
Dockerfile           # API image (non-root, production deps only)
tsconfig.json        # TypeScript settings (type-check only, no build output)
.env.example         # Required environment variables
```

## Design Notes

- **SQL injection safe:** all user input goes through parameterized queries (`?` placeholders), never string concatenation.
- **Parallel queries:** recipe detail fetches ingredients, instructions and tags at the same time with `Promise.all`, rather than one JOIN that would multiply rows.
- **Centralized errors:** routes pass errors to a single handler that logs details on the server and returns a generic message to clients.
- **Container security:** the API image runs as the unprivileged `node` user, and secrets come from environment variables. They're never baked into the image.
- **Typed queries:** each query declares the shape of its rows, so column names are checked and autocompleted.
- **Integration tests:** Vitest and Supertest call the API in-process against the seeded database, covering success, not-found, private and invalid-input cases.
- **Server-side sessions:** random 256-bit tokens in an `HttpOnly`, `SameSite=Lax` cookie; the database stores only their SHA-256 hash, so a leaked table can't be replayed. Sessions can be revoked instantly, unlike JWTs.
- **Login hardening:** bcrypt password hashes, one error message for unknown users and wrong passwords, and a dummy hash comparison so both take the same time.
- **Per-user visibility in SQL:** `visibility = 'public' OR user_id = ?`. Logged out, the user id is `NULL`, which never matches, so no special case is needed. Other users' private recipes return 404, not 403, so their existence isn't revealed.
- **Login in the front end:** the session cookie is `HttpOnly`, so JavaScript never sees it. The app asks `/api/auth/me` on load to learn who's logged in. Login state lives in a React context above the router, and the page tree is keyed by user id, so logging in or out remounts the pages and refetches their data.
- **Writes are all-or-nothing:** a recipe and its ingredients, steps and tags are saved in one database transaction, so a failure halfway leaves nothing behind.
- **Ownership enforced in SQL:** updates and deletes match on `id AND user_id`, so other people's recipes, public or private, return 404. The owner always comes from the session, never from the request body.
- **One form, two pages:** `RecipeForm` only collects input; the new and edit pages decide what to do with it (POST or PUT). Rows use stable keys so adding, removing and reordering never mixes up what was typed. The browser checks obvious mistakes, and the API validates everything again.
- **Delete asks twice, inline:** the first click only changes the button to "Yes, delete / Cancel", so nothing is lost by accident, and there's no browser popup.

## Roadmap

- [x] Schema and sample seed data so the project runs out of the box
- [x] Authentication and per-user data
- [x] Create, update and delete endpoints
- [x] Automated tests
- [x] React + TypeScript front end (recipe list and detail)
- [x] Login page in the front end
- [x] Recipe forms (create and edit)
- [x] Delete button and private-recipe badge
