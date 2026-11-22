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

To reset to a fresh database:

```bash
docker compose down -v
docker compose up -d
```

Then apply the database migrations (needed after every fresh database):

```bash
npm run migrate
```

The API runs at `http://localhost:3000`.

### Production mode

In production, Express serves the built React app as well as the API, so the whole site runs on one port:

```bash
npm run build
NODE_ENV=production npm start
```

(On Windows PowerShell: `$env:NODE_ENV = 'production'; npm start`.)

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

### Demo reset

Anyone can log in to the demo account, so the live site puts it back in order every night:

```bash
npm run reset-demo                # full demo: recipes, staples, cooking history
npm run reset-demo -- --baseline  # only the five recipes a fresh database starts with
```

The reset touches two accounts and nothing else:

- `homemenu` is the library. It owns every public demo recipe and has no usable password, so no visitor can edit the showcase.
- `demo` is one household using the site: staples, an avoid list, a grocery list and a cooking history. It cannot publish, so anything a visitor adds there stays private until the reset removes it.

Recipes from the demo data are restored in place, so other people's bookmarks and cook logs for them survive.

On a development machine use `--baseline`: a few tests count the public recipes, and the full demo adds more.

## API Endpoints

| Method | Endpoint                             | Description                                                                                |
| ------ | ------------------------------------ | ------------------------------------------------------------------------------------------ |
| GET    | `/api/health`                        | API and database status                                                                    |
| POST   | `/api/auth/login`                    | Log in with username or email; sets a session cookie                                       |
| POST   | `/api/auth/logout`                   | End the session and clear the cookie                                                       |
| GET    | `/api/auth/me`                       | The logged-in user, or 401                                                                 |
| GET    | `/api/recipes`                       | Public recipes, plus the logged-in user's private ones                                     |
| GET    | `/api/recipes/:id`                   | One recipe with ingredients, steps and tags. Someone else's private recipe returns 404     |
| POST   | `/api/recipes`                       | Create a recipe (login required). Returns `201` with the new id                            |
| PUT    | `/api/recipes/:id`                   | Replace one of your recipes. `204`, or `404` if it isn't yours                             |
| DELETE | `/api/recipes/:id`                   | Delete one of your recipes and its ingredients, steps and tags. `204` or `404`             |
| POST   | `/api/recipes/:id/cooked`            | We made this `{ cooked_on? }`: logs the cook, returns your `last_made`                     |
| DELETE | `/api/recipes/:id/cooked/:date`      | Undo a cook for that day. Returns your `last_made`, or `404`                               |
| PUT    | `/api/recipes/:id/saved`             | Bookmark someone's public recipe. `204`; `400` if it's your own                            |
| DELETE | `/api/recipes/:id/saved`             | Remove a bookmark. `204` or `404`                                                          |
| GET    | `/api/ingredients?q=`                | Search the shared ingredient catalog (login required)                                      |
| GET    | `/api/staples`                       | Your staples, sorted by category (login required)                                          |
| POST   | `/api/staples`                       | Add a staple `{ ingredient_id }`. `201`, or `409` if it's already in your kitchen          |
| PATCH  | `/api/staples/:id`                   | Mark a staple in stock or out `{ in_stock }`. `204`, or `404` if it isn't yours            |
| DELETE | `/api/staples/:id`                   | Remove one of your staples. `204` or `404`                                                 |
| GET    | `/api/avoids`                        | Your avoid list: ingredients never to suggest (login required)                             |
| POST   | `/api/avoids`                        | Avoid an ingredient `{ ingredient_id }`. `201`, or `409` if already avoided                |
| DELETE | `/api/avoids/:ingredientId`          | Stop avoiding an ingredient. `204` or `404`                                                |
| GET    | `/api/grocery`                       | Grocery list: out-of-stock staples plus manual and recipe items, by category               |
| POST   | `/api/grocery/items`                 | Add an item `{ ingredient_id }` or `{ name }`, optionally `{ recipe_id }`. `201`           |
| POST   | `/api/grocery/staples/:id/got-it`    | Got it: puts the staple back in stock. `204` or `404`                                      |
| POST   | `/api/grocery/staples/:id/not-found` | Couldn't find it: stays on the list, dated. `204` or `404`                                 |
| POST   | `/api/grocery/items/:id/got-it`      | Got it: removes the item. `204` or `404`                                                   |
| POST   | `/api/grocery/items/:id/not-found`   | Couldn't find it: stays on the list, dated. `204` or `404`                                 |
| DELETE | `/api/grocery/items/:id`             | Remove an item. `204` or `404`                                                             |
| GET    | `/api/menu?meal=&date=&roll=`        | Three picks (safe, medium, new) for breakfast, lunch, dinner or snacks. Stable for the day |
| POST   | `/api/menu/snooze`                   | Keep a recipe off your menu for 7 days `{ recipe_id, date? }`                              |
| DELETE | `/api/menu/snooze/:recipeId`         | Bring a snoozed recipe back early. `204` or `404`                                          |

**Status codes:** `400` invalid input · `401` not logged in or invalid login · `404` not found · `503` database unavailable · `500` unexpected server error

## Project Structure

```
client/                  # React + TypeScript front end (Vite)
  src/api.ts             # sendJson helper for POST/PUT/DELETE with consistent error handling
  src/auth/              # Login state shared across pages (React context + useAuth hook)
  src/components/        # Shared UI (RecipeForm, used by the new and edit pages)
  src/pages/             # Recipe list, detail, login, and new/edit pages
  src/useApi.ts          # Data-loading hook (loading, errors, 404s, stale-request guard)
db/
  init/                  # Baseline: builds a fresh database
    001_schema.sql       # Tables as of the baseline
    002_seed.sql         # Demo account and recipes (also used in production)
    003_test_users.sql   # Extra accounts for tests and local development only
  migrations/            # Schema changes after the baseline, applied in order by npm run migrate
scripts/
  migrate.ts             # Applies pending migrations
  deploy.sh              # Install, migrate, build, restart, health check (on the server)
  auto-deploy.sh         # Cron job: deploys when main has new commits
  create-user.ts         # Creates a login (there is no sign-up page yet)
  reset-demo.ts          # Puts the demo account back to its starting state
  reset-demo.sh          # Cron wrapper for the nightly reset on the server
src/
  app.ts                 # Express app: middleware, routes, error handler, serves the React build
  server.ts              # Starts listening (HOST/PORT)
  db.ts                  # MariaDB connection pool (fails fast on missing env vars)
  auth/                  # Sessions and login middleware
  demo/                  # Demo data, and the reset that restores one account to it
  routes/
    auth.ts              # Login (rate-limited), logout, current user
    recipes.ts           # Recipes: list, detail, create, update, delete
test/                    # Integration tests (Vitest + Supertest) against a real database
compose.yaml             # Local database (and optional API container)
Dockerfile               # API image (non-root, production deps only)
tsconfig.json            # TypeScript settings (type-check only, no build output)
.env.example             # Environment variables to copy into .env
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
- **Security headers:** `helmet` sets a Content Security Policy, `nosniff`, HSTS and clickjacking protection, and removes `X-Powered-By`.
- **A shared demo account that can't deface the site:** the public recipes belong to a library account nobody can log in to, and the demo account's `can_publish` flag is off, so the API stores whatever it saves as private.
- **Login rate limiting:** 10 failed logins per IP address in 15 minutes, then even correct passwords are refused until the window passes. Behind the production proxy, `trust proxy` makes sure the limit applies to each visitor rather than to Apache.
- **One server in production:** Express serves the built React files and falls back to `index.html` for app URLs, so refreshing on `/recipes/5` works. Unknown `/api` URLs return a JSON 404 instead of the app's HTML.

## Roadmap

- [x] Schema and sample seed data so the project runs out of the box
- [x] Authentication and per-user data
- [x] Create, update and delete endpoints
- [x] Automated tests
- [x] React + TypeScript front end (recipe list and detail)
- [x] Login page in the front end
- [x] Recipe forms (create and edit)
- [x] Delete button and private-recipe badge
