# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm run dev           # Start both frontend (:5173) and backend (:8787) concurrently
npm run dev:front     # Frontend only
npm run dev:back      # Backend only (wrangler dev)
```

### Build & Deploy
```bash
npm run build:front   # Build frontend SPA (dist/)
npm run deploy:front  # Deploy to Cloudflare Pages
npm run deploy:back   # Deploy to Cloudflare Workers
```

### Database
```bash
# Run in backend/ directory
npm run db:migrate        # Apply migrations to remote D1
npm run db:migrate:local  # Apply migrations to local D1
npm run db:seed           # Seed remote DB
npm run db:seed:local     # Seed local DB

# Run arbitrary SQL
npx wrangler d1 execute chikiglam-db --file=fix.sql          # remote
npx wrangler d1 execute chikiglam-db --local --file=fix.sql  # local
```

No linter or test runner is configured.

## Architecture

This is a monorepo with npm workspaces: `frontend/` and `backend/`.

### Backend — Cloudflare Workers + Hono
- Entry: `backend/src/index.ts` — mounts all routes under `/api`
- Routes in `backend/src/routes/` — each file registers its own Hono router
- Middleware in `backend/src/middleware/auth.ts` — exports role guards: `requireRole(...)`, `requireAtLeast(...)`, and shortcuts `adminOrAbove`, `staffOrAbove`, `canManageEvents`, etc.
- Database is Cloudflare D1 (SQLite). Tables are created via migrations in `backend/db/migrations/` and some routes create/alter tables dynamically in an `ensureTables()` call at startup.
- `backend/src/utils/roles.ts` defines `ROLE_HIERARCHY` (numeric levels) — use `isAtLeast` for hierarchy checks, explicit role arrays for lateral roles like `organizer`.
- Passwords use PBKDF2 via Web Crypto (`backend/src/utils/crypto.ts`), not bcrypt.
- JWT issued by `backend/src/utils/jwt.ts` using `jose`. The shared `AppEnv` type alias (`{ Bindings: Env; Variables: { user: JWTPayload } }`) is used in every authenticated router.

#### Backend conventions
- Use `success(c, data)` / `error(c, message, status)` from `backend/src/utils/response.ts` — not `c.json()` directly.
- Use `generateId()` from `backend/src/utils/id.ts` (wraps `crypto.randomUUID()`) for new record IDs.
- Validate request bodies with Zod; return `error(c, parsed.error.errors[0]?.message)` on failure.

### Frontend — React + Vite + Redux Toolkit
- Entry: `frontend/src/main.tsx` → `App.tsx` → `router/index.tsx`
- Router uses React Router v6 with lazy-loaded pages and `ProtectedRoute` for role-based access.
- State: Redux Toolkit slices in `frontend/src/store/` (auth, booking, cart, order, ui). Only `auth` and `cart` are persisted via redux-persist.
- API calls go through `frontend/src/services/api.ts` (Axios instance) which reads `VITE_API_URL` (defaults to `/api`) and auto-attaches the JWT from the Redux store.
- `frontend/src/hooks/useAuth.ts` exposes role booleans: `isAdmin`, `isOrganizer`, `canManageEvents`, etc.
- Admin layout (`AdminLayout.tsx`) filters nav tabs by role — organizer sees only Events.
- Role helpers (`hasRole`, `isAtLeast`, `canManage`, `assignableRoles`) are duplicated in `frontend/src/utils/roles.ts` — keep both in sync if changing role logic.

### Auth flows
There are two distinct login paths:
1. **Email + password** — used by staff (employee, organizer, admin, superadmin). Route: `POST /api/auth/login`.
2. **OTP via WhatsApp** — used by clients and guests. Routes: `POST /api/auth/request-otp` → `POST /api/auth/verify-otp`. Creates the user automatically on first OTP request if the phone is not found.

### Role System
Hierarchy (highest → lowest): `superadmin` → `admin` → `organizer` / `employee` → `client` → `guest`

`organizer` is a lateral role at level 3 (same numeric level as `employee`) intended exclusively for event management. Organizers can only see/edit their own events (filtered by `created_by`).

The `role` column in the `users` table has a SQLite `CHECK` constraint listing all valid roles. If you add a new role, you must recreate the table (see `backend/fix_roles.sql` pattern) or run a migration.

### Image / file storage
Uploaded files are stored in R2 (`ASSETS_BUCKET`) and referenced in the DB as an `image_key` (UUID-based path). Files are served publicly via `GET /api/files/:key`. To display an image: construct the URL as `/api/files/${imageKey}`. Upload endpoint: `POST /api/admin/upload`.

### Cloudflare Bindings (wrangler.toml)
- `DB` — D1 database (`chikiglam-db`)
- `CACHE` — KV namespace
- `ASSETS_BUCKET` — R2 bucket for uploaded images
- `JWT_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` — secrets

### Frontend Path Aliases (vite.config.ts)
`@components`, `@pages`, `@hooks`, `@services`, `@store`, `@types`, `@utils`, `@lib`, `@assets` — all resolve to `frontend/src/<name>`.

### Types
Backend types are in `backend/src/types/index.ts` (snake_case DB columns). Frontend mirrors them in `frontend/src/types/index.ts` (camelCase). The `mapEvent`, `mapOrder`, etc. functions in services handle the conversion.
