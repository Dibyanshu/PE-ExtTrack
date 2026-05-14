# Parbati Enterprises Expense Tracker

Full-stack expense-tracking system for a copper-production company. Supports Payment Vouchers and Receive Vouchers with version history, RBAC, vendor master, and document attachments.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — build and start the API server
- `pnpm --filter @workspace/api-spec run codegen` — regenerate React Query hooks + Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push Drizzle schema changes to the MySQL database (dev only)
- `pnpm --filter @workspace/db run seed` — seed master data and default users
- `pnpm run typecheck` — full TypeScript check across all packages

### Required environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | MySQL connection string (e.g. `mysql://user:pass@host:3306/dbname`) |
| `JWT_SECRET` | Secret key for signing JWTs (set a strong random string in production) |

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5, esbuild bundle
- DB: MySQL 8 + Drizzle ORM (`mysql2` driver)
- Auth: JWT (jsonwebtoken), bcryptjs, RBAC middleware
- File uploads: Multer (local disk, `uploads/` directory)
- Validation: Zod (zod/v4), drizzle-zod
- API codegen: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)

## Where things live

| Path | Purpose |
|---|---|
| `lib/db/src/schema/` | Drizzle MySQL schema (source of truth for DB shape) |
| `lib/api-spec/openapi.yaml` | OpenAPI 3.1 spec (source of truth for API contracts) |
| `lib/api-client-react/src/generated/` | Generated React Query hooks |
| `lib/api-zod/src/generated/api.ts` | Generated Zod validators |
| `artifacts/api-server/src/routes/` | Express route handlers |
| `artifacts/api-server/src/middlewares/auth.ts` | JWT decode + RBAC |
| `artifacts/api-server/src/lib/voucher.ts` | Atomic voucher sequence generation |

## Architecture decisions

- **Voucher sequences**: Two rows in `voucher_sequence` table (id=1 for PECRU-PV, id=2 for PECRU-RV). Numbers are generated atomically via `UPDATE ... SET current_value = current_value + 1` then `SELECT`.
- **Versioned edits**: Every edit to an expense creates a new row in `expense_versions` (immutable audit trail). The `expenses.current_version_id` pointer advances.
- **RBAC rank**: `expense_entry(1) < accounts(2) < admin(3) < superadmin(4)` — enforced in `requireRole(minRole)` middleware.
- **MySQL DATE columns**: `gte`/`lte` filters on `expenseDate` use ISO date strings directly (column is `mode:"string"` in Drizzle).
- **Dedicated connections for inserts**: Voucher creation and expense version inserts use `pool.getConnection()` directly (not Drizzle transactions) to guarantee `LAST_INSERT_ID()` isolation across pooled connections.

## Roles

| Role | Can do |
|---|---|
| `expense_entry` | Create/update vouchers, upload documents |
| `accounts` | All of above + vendor voucher lookup, approve/finalize expenses |
| `admin` | All of above + manage users, masters, vendors, delete expenses |
| `superadmin` | All admin actions |

## Default seeded users (password: `Parbati@123`)

| Name | Email | Role |
|---|---|---|
| Super Admin | superadmin@parbatienterprises.com | superadmin |
| Admin | admin@parbatienterprises.com | admin |
| Ali | ali@parbatienterprises.com | accounts |
| Kundu | kundu@parbatienterprises.com | expense_entry |
| Sameer | sameer@parbatienterprises.com | expense_entry |

## User preferences

- Company name: Parbati Enterprises (copper production)
- Voucher prefix: PECRU-PV (payment), PECRU-RV (receive)
- Four RBAC roles: expense_entry, accounts, admin, superadmin

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after any change to `openapi.yaml`
- Run `pnpm --filter @workspace/db run push` after any schema change, before seeding
- The seed script uses `INSERT IGNORE` — safe to re-run
- `JWT_SECRET` is required at startup — server throws immediately if not set
