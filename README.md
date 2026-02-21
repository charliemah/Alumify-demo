# Alumify

The first challenge-based alumni engagement app for collaborative lifelong learning.

## Architecture

- **Web**: Next.js 14 (App Router) — responsive, mobile-first
- **Mobile**: Expo SDK 52 — iOS & Android
- **API**: Fastify + PostgreSQL — custom REST API
- **Shared**: TypeScript types, Zod schemas, API client

## Prerequisites

- Node.js 18+
- pnpm 10+ (`npm install -g pnpm`)
- PostgreSQL 14+
- (Optional) Docker for local PostgreSQL

## Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up the database

Create a database:

```bash
createdb alumify
```

Run migrations (from repo root):

```bash
cd apps/api
set DATABASE_URL=postgres://postgres:postgres@localhost:5432/alumify
npx node-pg-migrate up
```

Or on Unix: `DATABASE_URL=postgres://postgres:postgres@localhost:5432/alumify npx node-pg-migrate up`

Or with Docker Compose (Postgres + API):

```bash
docker compose up -d
```

The API runs at http://localhost:3001 and runs migrations on startup. Postgres data is persisted in a volume.

Or run Postgres only:

```bash
docker run -d --name alumify-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=alumify -p 5432:5432 postgres:16
```

### 3. Configure environment

Copy `.env.example` to `.env` in the repo root and adjust values. For local development the defaults work if PostgreSQL is at `localhost:5432`.

### 4. Run the apps

Terminal 1 — API:

```bash
pnpm dev:api
```

Terminal 2 — Web:

```bash
pnpm dev:web
```

Terminal 3 — Mobile (optional):

```bash
pnpm dev:mobile
```

- Web: http://localhost:3000
- Web: http://localhost:3000
- API: http://localhost:3001
- API health: http://localhost:3001/health
- API docs: http://localhost:3001/docs

## Deployment

### Web (Vercel)

1. Connect the repo to Vercel
2. Set root directory to repo root
3. Build command: `pnpm build --filter=@alumify/web`
4. Output directory: `apps/web/.next`
5. Set `NEXT_PUBLIC_API_URL` to your API URL

### API (Railway / Fly.io / Render)

1. Set build command: `pnpm install && pnpm build --filter=@alumify/shared --filter=@alumify/api`
2. Start command: `cd apps/api && pnpm start`
3. Required env vars: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN` (comma-separated frontend URLs)
4. Run migrations before first deploy (or use the API's Docker entrypoint which runs them)

### Mobile (EAS)

1. Install EAS CLI: `npm i -g eas-cli`
2. Run `eas build` for iOS/Android
3. Set `EXPO_PUBLIC_API_URL` in EAS secrets or app config
4. For push notifications, configure `EXPO_PUBLIC_PROJECT_ID` if using EAS

### Database

Use a managed Postgres (Neon, Supabase, Railway, etc.). Set `DATABASE_URL` and run migrations:

```bash
cd apps/api && DATABASE_URL=<your-url> pnpm migrate
```

## Project Structure

```
├── apps/
│   ├── api/          # Fastify REST API
│   ├── web/          # Next.js web app
│   └── mobile/       # Expo React Native app
├── packages/
│   ├── shared/       # Types, schemas, constants
│   └── api-client/   # Typed API client
├── turbo.json
└── pnpm-workspace.yaml
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run all apps in dev mode |
| `pnpm dev:api` | Run API only |
| `pnpm dev:web` | Run web only |
| `pnpm dev:mobile` | Run Expo dev server |
| `pnpm build` | Build all packages |
| `pnpm typecheck` | Type-check all packages |
| `pnpm lint` | Lint all packages |
| `pnpm test` | Run tests |
| `pnpm run --filter=@alumify/api nudge-push` | Send nudge push notifications (run via cron) |

## Mobile Development

For physical device testing, set `EXPO_PUBLIC_API_URL` to your machine's local IP (e.g. `http://192.168.1.x:3001`) so the device can reach the API.

Ensure `apps/mobile/assets/icon.png` exists (required by Expo). You can use any 1024x1024 PNG for production.
