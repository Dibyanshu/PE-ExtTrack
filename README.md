# Parbati Enterprises Expense Tracker

Full-stack expense-tracking system for a copper-production company. Supports Payment Vouchers and Receive Vouchers with version history, RBAC, vendor master, and document attachments.

## Run & Operate

- `npm run --workspace @workspace/backend dev` — build and start the API server
- `npm run --workspace @workspace/backend codegen` — regenerate React Query hooks + Zod schemas from OpenAPI spec
- `npm run --workspace @workspace/backend db:push` — push Drizzle schema changes to the MySQL database (dev only)
- `npm run --workspace @workspace/backend db:seed` — seed master data and default users
- `npm run typecheck` — full TypeScript check across all packages

### Required environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | MySQL connection string (e.g. `mysql://user:pass@host:3306/dbname`) |
| `JWT_SECRET` | Secret key for signing JWTs (set a strong random string in production) |

## Stack

- npm workspaces, Node.js 24, TypeScript 5.9
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


## E2E: Installation
```cmd
# Install all workspace deps (includes e2e)
npm ci

# Install Playwright browsers + OS-level system deps
cd e2e && npx playwright install --with-deps
```
[e2e workspace](./e2e)

| File | Purpose |
|---|---|
| playwright.config.ts | Central config: HTML reports, per-failure screenshots & video, trace: "on" for all tests, Chromium + Firefox projects, global auth setup project |
| auth.setup.ts | Runs once before any spec; logs in and saves storage state to e2e/.auth/user.json |
| auth.spec.ts | Login page flows: branding, empty-form validation, wrong-creds error, successful login |
| dashboard.spec.ts | Dashboard: KPI cards visible, nav to voucher lists, API-error alert (route interception) |
| vouchers.spec.ts | Full voucher flows for both payment and receive: list render, number filter, create-form validation, happy-path create |
| login.page.ts | POM – Login page |
| dashboard.page.ts | POM – Dashboard |
| vouchers-list.page.ts | POM – Voucher list (shared for payment/receive) |
| voucher-create.page.ts | POM – Voucher create form |

[playwright.yml](/.github/workflows/playwright.yml)

Runs on every push / pull_request to main:

 - Matrix over chromium and firefox
 - Browsers cached by actions/cache
 - Starts the backend and frontend preview server in CI, gates with wait-on
 - Uploads the HTML report always, and traces/screenshots/videos on failure

## Running tests
```cmd
# All tests (headless, from workspace root)
npm run e2e

# Interactive UI mode
npm run e2e:ui

# Open the last HTML report
npm run e2e:report
```

Required secrets (GitHub → Settings → Secrets)

| Secret | Description |
|---|---|
| `E2E_USER_EMAIL` | Login email for the test account |
| `E2E_USER_PASSWORD` | Login password |
| `CI_DATABASE_URL` | Database connection string for CI |
| `CI_JWT_SECRET` | JWT secret matching the backend config |