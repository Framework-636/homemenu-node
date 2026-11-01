# HomeMenu API

A REST API for [HomeMenu.plus](https://homemenu.plus), a meal-planning app for recipes, pantry tracking, meal plans and grocery lists. Rebuilt from its original plain-PHP backend into Node.js and Express, and containerized with Docker.

## Tech Stack

- **Node.js 26** with ES modules
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

The API runs at `http://localhost:3000`.

### Local development (hot reload)

Run the database in Docker and the API directly with Node:

```bash
docker compose up -d db
npm install
npm run dev
```

`npm run dev` uses Node's built-in `--watch` and `--env-file`, with no extra tooling.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | API and database status |
| GET | `/api/recipes` | List recipes (summary fields) |
| GET | `/api/recipes/:id` | One recipe with ingredients, instructions and tags |

**Status codes:** `400` invalid ID · `404` recipe not found · `503` database unavailable · `500` unexpected server error

## Project Structure

```
src/
  server.js          # App setup, middleware, error handler
  db.js              # MariaDB connection pool
  routes/
    recipes.js       # Recipe endpoints
compose.yaml         # API + database services
Dockerfile           # API image (non-root, production deps only)
.env.example         # Required environment variables
```

## Design Notes

- **SQL injection safe:** all user input goes through parameterized queries (`?` placeholders), never string concatenation.
- **Parallel queries:** recipe detail fetches ingredients, instructions and tags at the same time with `Promise.all`, rather than one JOIN that would multiply rows.
- **Centralized errors:** routes pass errors to a single handler that logs details on the server and returns a generic message to clients.
- **Container security:** the API image runs as the unprivileged `node` user, and secrets come from environment variables. They're never baked into the image.

## Roadmap

- [ ] Schema and sample seed data so the project runs out of the box
- [ ] Authentication and per-user data
- [ ] Create, update and delete endpoints
- [ ] Automated tests
- [ ] React + TypeScript front end