# HomeMenu API

[![CI](https://github.com/Framework-636/homemenu-node/actions/workflows/ci.yml/badge.svg)](https://github.com/Framework-636/homemenu-node/actions/workflows/ci.yml)

A REST API for [HomeMenu.plus](https://homemenu.plus), a meal-planning app for recipes, pantry tracking, meal plans and grocery lists. Rebuilt from its original plain-PHP backend into Node.js and Express, and containerized with Docker.

## Tech Stack

- **Node.js 26** with ES modules
- **TypeScript** (strict), run directly by Node's built-in type stripping and checked with `tsc`. No build step.
- **Express 5** for routing, middleware and centralized error handling
- **MariaDB 11.4** via the `mysql2` driver, with a connection pool and parameterized queries
- **Docker Compose** running the API and database as separate services on a private network

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

To reset to a fresh database:

```bash
docker compose down -v
docker compose up -d
```

The API runs at `http://localhost:3000`.

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

| Method | Endpoint           | Description                                        |
| ------ | ------------------ | -------------------------------------------------- |
| GET    | `/api/health`      | API and database status                            |
| GET    | `/api/recipes`     | List recipes (summary fields)                      |
| GET    | `/api/recipes/:id` | One recipe with ingredients, instructions and tags |

**Status codes:** `400` invalid ID · `404` recipe not found · `503` database unavailable · `500` unexpected server error

## Project Structure

```
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

## Roadmap

- [x] Schema and sample seed data so the project runs out of the box
- [ ] Authentication and per-user data
- [ ] Create, update and delete endpoints
- [x] Automated tests
- [ ] React + TypeScript front end
