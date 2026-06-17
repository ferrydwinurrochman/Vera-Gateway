# VERA GATE

Payment Gateway dashboard for Indonesian merchants — handles QRIS topup via Flypay, real-time transaction monitoring, status lock logic, and merchant/user management.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/vera-gate run dev` — run the frontend (port 22415)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `SESSION_SECRET` — Express session secret

## Default credentials (seed)

- admin / admin123 (role: admin)
- operator1 / operator123 (role: operator)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, TanStack Query, wouter, Tailwind CSS
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Sessions: express-session

## Where things live

- `lib/api-spec/openapi.yaml` — Single source of truth for API contracts
- `lib/db/src/schema/` — Drizzle schema: users, merchants, transactions, settings
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/flypay.ts` — Flypay QRIS integration logic
- `artifacts/api-server/src/lib/auth.ts` — Password hashing + ref generation
- `artifacts/vera-gate/src/` — React frontend

## Architecture decisions

- **Status Lock**: `TX_STATUS.SUKSES` is a terminal state. Any attempt to revert it (via webhook, manual update, or check-status) is rejected in `transactions.ts`. The lock check runs in the route handler before any DB write.
- **Anti-Double Generate (20-min cooldown)**: Before generating a new QRIS, the server queries for any existing `MENUNGGU` transaction from the same `customerId` within the cooldown window. Returns HTTP 409 with remaining minutes if found.
- **Timezone fix**: All `timestamp` columns use `{ withTimezone: true }` in Drizzle. The server uses `new Date()` consistently. Dashboard queries apply Jakarta UTC+7 offset for "today" period boundaries.
- **No `window.location.reload()`**: Dashboard uses `refetchInterval: 7000` on TanStack Query hooks. Scroll position is preserved on refresh.
- **Sandbox mode**: When `flypayMode = 'sandbox'`, the server skips the real Flypay API call and generates a QR server URL as placeholder. Switch to `live` and add `flypaySecret` in Settings to go live.

## Product

- Login page with session-based auth
- Dashboard with real-time auto-refresh (7s interval, no scroll jump)
- All transactions list with filters (status, merchant, date, search)
- Dedicated SUKSES-only view
- QRIS Topup with cooldown enforcement and mobile-optimized QR display
- Merchant CRUD
- User CRUD with role management (admin/operator/merchant)
- Settings (Flypay credentials, cooldown minutes, callback URL)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run codegen after every OpenAPI spec change: `pnpm --filter @workspace/api-spec run codegen`
- After DB schema changes: `pnpm --filter @workspace/db run push`
- Flypay live mode requires `flypaySecret` set in Settings AND `flypayMode = 'live'`
- The Flypay deposit API uses IPv4 interface binding — may need network config changes in production

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
