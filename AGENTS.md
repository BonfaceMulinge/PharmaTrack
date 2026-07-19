# PharmaTrack

Pharmacy sales & stock management system. React (Vite) frontend, Express backend, PostgreSQL via Prisma.

## Structure

- `backend/` — Express API (CommonJS), entry: `server.js`, routes under `src/routes/`, controllers under `src/controllers/`
- `frontend/` — React 19 + Vite (ESM), entry: `src/App.jsx`, components in `src/components/`
- `database/` — Placeholder only; the real Prisma schema is at `backend/prisma/schema.prisma`
- `docker/` — `docker-compose.yml` for local PostgreSQL (user/pass: `postgres`/`postgres`, db: `pharmatrack`, port 5432)
- `docs/` — Feature documentation

## Commands

### Backend (`backend/`)
```bash
npm install
npm run dev          # starts Express on port 5000 (uses nodemon-like restart via server.js)
npm run db:generate  # prisma generate
npm run db:migrate   # prisma migrate dev --name init
```

### Frontend (`frontend/`)
```bash
npm install
npm run dev      # Vite dev server (port 5173)
npm run build    # production build
npm run lint     # ESLint (flat config)
```

There are **no test, typecheck, or format scripts** defined anywhere in the repo.

## Environment

### Backend (`backend/.env`)
Required variables:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — short-lived token signing
- `JWT_REFRESH_SECRET` — refresh token signing
- `PORT` — default 5000
- `NODE_ENV` — `development` enables demo auth bypass

A `.env` file exists with a Neon cloud database URL. For local dev, override `DATABASE_URL` to point at the Docker PostgreSQL (`postgresql://postgres:postgres@localhost:5432/pharmatrack`).

### Frontend (`frontend/.env`)
- `VITE_API_URL` — must end with `/api` (e.g. `http://localhost:5000/api`). The value is baked into the build at compile time.

## Gotchas

- **Demo auth bypass**: In non-production (`NODE_ENV !== 'production'`), requests without a Bearer token or with token `demo-token` are auto-authorized as an ADMIN user (`backend/src/middleware/auth.js:4-5`). Never rely on this in production.
- **Prisma schema location**: The `database/` folder is empty of schema files. Always edit `backend/prisma/schema.prisma`. After changes run `npm run db:generate` then `npm run db:migrate`.
- **Two separate node_modules**: `backend/` and `frontend/` have independent `npm install`. The root `node_modules/` only contains `xlsx` (appears vestigial).
- **No router library**: Frontend uses a single-page state toggle (`view` state in `App.jsx`), not React Router. Navigation is scroll-based.
- **Currency**: KES (Kenyan Shilling), formatted in `App.jsx:11-16`.
- **Soft deletes**: All models use `deletedAt` for soft-delete. Always filter `deletedAt: null` in queries.
- **Medicine matching**: `inventoryService.js` looks up medicines by case-insensitive `contains` match, not exact. New medicines are auto-created during purchase/sale if not found.
- **Roles**: `ADMIN`, `PHARMACIST`, `STORE_MANAGER`. Route-level authorization via `authorize()` middleware.
