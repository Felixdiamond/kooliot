# KoolIoT

KoolIoT is a Next.js operations console for PAYG device management.

It currently supports:
- user authentication with role-based access (ADMIN, MANAGER, VIEWER)
- device inventory management and registration
- assignment task workflow (viewer requests, manager/admin completion)
- OpenPAYGO token generation with token ledger and activation logs
- access grant management between users and devices
- admin sync endpoints for sheet, Cloud Solar, and Innovex imports

## Tech Stack

- Next.js App Router (TypeScript)
- Bun (scripts/runtime)
- Drizzle ORM + PostgreSQL
- Zod validation
- JWT session cookie auth (middleware-enforced)

## Prerequisites

- Bun 1.x
- PostgreSQL instance

## Quick Start

1. Install dependencies.

```bash
bun install
```

2. Create environment variables (for example in `.env.local`).

```bash
cat > .env.local <<'EOF'
DATABASE_URL=postgres://user:password@localhost:5432/kooliot
JWT_SECRET=replace-with-at-least-16-characters
CLOUD_SOLAR_API_KEY=replace-me
INNOVEX_API_TOKEN=replace-me
CRON_SECRET=replace-me
# Optional (required only for external task-assignment API-key mode)
# TASK_ASSIGNMENT_API_KEY=replace-with-at-least-16-characters
EOF
```

3. Run migrations.

```bash
bun run db:migrate
```

4. Start development server.

```bash
bun run dev
```

App default URL: http://localhost:3000

## First User and Roles

- The first registered account is automatically promoted to `ADMIN`.
- Subsequent registrations use the default `VIEWER` role unless explicitly set by server logic.

## Environment Variables

Required:
- `DATABASE_URL`
- `JWT_SECRET`
- `CLOUD_SOLAR_API_KEY`
- `INNOVEX_API_TOKEN`
- `CRON_SECRET`

Optional:
- `TASK_ASSIGNMENT_API_KEY`

## Implemented Routes

UI:
- `/dashboard`
- `/devices`
- `/devices/register`
- `/devices/[id]`
- `/assignments`
- `/tokens`
- `/admin/access`
- `/login`
- `/register`

API:
- `GET /api/health`
- `GET /api/devices/search?q=...` (session required)
- `GET /api/tasks/open-count` (session required)
- `POST /api/task-assignments` (session or integration API key)
- `POST /api/admin/sync/sheets` (ADMIN or MANAGER)
- `POST /api/admin/sync/cloud-solar` (ADMIN)
- `POST /api/admin/sync/innovex` (ADMIN)

Task assignment API reference: `docs/task-assignment-api.md`

## Authentication Model

- Protected pages and APIs are gated by middleware.
- Session auth uses a JWT stored in an HTTP-only cookie.
- Middleware injects `x-user-id` and `x-user-role` headers for downstream handlers.
- `POST /api/task-assignments` also supports API key auth:
	- `x-task-api-key: <TASK_ASSIGNMENT_API_KEY>`
	- or `Authorization: Bearer <TASK_ASSIGNMENT_API_KEY>`

## Database and Migrations

Main commands:

```bash
bun run db:generate
bun run db:migrate
bun run db:push
bun run db:studio
```

Schema source of truth: `db/schema.ts`

## Data Import and Sync

### Admin sync API endpoints

- Sheets inventory sync:

```bash
curl -X POST http://localhost:3000/api/admin/sync/sheets \
	-H "Content-Type: application/json" \
	-d '{"includeDefaultDirectory":true}'
```

- Cloud Solar sync (creates/upserts devices from provided IDs):

```bash
curl -X POST http://localhost:3000/api/admin/sync/cloud-solar \
	-H "Content-Type: application/json" \
	-d '{"deviceIds":["DEVICE-001","DEVICE-002"]}'
```

- Innovex sync (CSV discovery + optional API fetch):

```bash
curl -X POST http://localhost:3000/api/admin/sync/innovex \
	-H "Content-Type: application/json" \
	-d '{"includeApi":true}'
```

### Script-based import commands

```bash
bun run db:seed:xlsx
bun run db:seed:xlsx:ac600l
bun run db:seed:xlsx:reset
bun run db:bootstrap:aws
```

Optional workbook overrides for script-based XLSX import:

```bash
ANGAZA_WORKBOOK_PATH=./path/to/Angaza.xlsx \
PAYGO_WORKBOOK_PATH=./path/to/PayGo.xlsx \
bun run db:seed:xlsx:reset
```

## Useful Commands

```bash
bun run dev
bun run build
bun run start
bun run lint
```
