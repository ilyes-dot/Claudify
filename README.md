# Shop Admin Panel — Production-Ready Starter

A modular, secure, database-backed admin dashboard built to drop into any
web or mobile product. Real authentication, real RBAC, real audit trail —
not a static mockup.

---

## 1. Architecture & Technology Choices

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14 (App Router)** | Server Components cut client JS, file-based routing, built-in API routes remove the need for a separate backend service for most deployments. |
| Language | **TypeScript (strict)** | Type safety across API boundary (Prisma → API → React) catches integration bugs at compile time. |
| Database | **PostgreSQL via Prisma ORM** | Prisma gives typed queries, migrations, and a single schema file as the source of truth. Swappable to MySQL/SQLite by changing one line. |
| Auth | **NextAuth.js (Credentials + JWT)** | Battle-tested session handling; Credentials provider chosen since most integrations need email/password against an existing user base, but OAuth providers (Google, Microsoft, Okta/SAML via a suitable provider) can be added alongside it with a few lines. |
| Styling | **Tailwind CSS + CSS variable design tokens** | Enables instant light/dark theming and consistent spacing/typography without a runtime CSS-in-JS cost. |
| Components | **Radix UI primitives** | Unstyled, fully accessible (WAI-ARIA compliant) primitives for dialogs, dropdowns, switches, selects — accessibility is handled for us at the interaction layer. |
| Data fetching | **TanStack Query** | Caching, background refetch, and loading/error states for all client-side tables. |
| Charts | **Recharts** | Lightweight, composable, theme-aware via CSS variables. |
| Validation | **Zod** | Single schema shared by client forms and server API routes — no drift between what the UI allows and what the API accepts. |

### Architecture principles
- **Server-first**: pages fetch data in Server Components and pass only what's needed to Client Components (tables, forms, dialogs).
- **Defense in depth**: every mutating action is checked for permission *twice* — once implicitly by the UI (hidden buttons) and once authoritatively in the API route via `requirePermission()`. The UI check is a convenience, never the security boundary.
- **Modular by module**: each domain (users, roles, audit-logs, settings) has its own API routes, its own Zod schemas, and its own components — add a new module by following the same three-file pattern (`api/<module>/route.ts`, `lib/validations/<module>.ts`, `components/<module>/`).

---

## 2. Feature Specification

### Shop modules (new)
- **Products** — full CRUD, SKU, price, compare-at price, stock tracking, draft/active/archived status, category assignment, auto-slug generation. Low-stock count surfaces on the dashboard.
- **Categories** — simple CRUD; a category with assigned products cannot be deleted until reassigned.
- **Customers** — separate from admin `Users` (these are your buyers, not panel logins); CRUD with order-count badge per customer.
- **Orders** — created against real product stock (a transaction decrements stock and fails cleanly if insufficient); status transitions are validated against a defined state machine (e.g. you can't jump `PENDING → DELIVERED` directly); cancelling/refunding an order restocks the items automatically. Order detail view shows the full line-item breakdown with historical price snapshots (editing a product later never rewrites past order records).
- **Dashboard** — revenue (14-day trend), order count, active product count with low-stock flag, customer count, order-status breakdown, recent orders feed — all real queries against your data, not mocked.


- **Dashboard**: live KPIs (total/active users, roles configured), a 14-day signups trend chart, a role-distribution pie chart, and a recent-activity feed — all queried from the real database, not mocked.
- **User management**: search, filter by role/status, sort by any column, paginated table; create/edit dialog with password-strength validation; soft delete; self-protection guards (an admin cannot suspend or delete their own account).
- **Roles & Permissions**: visual permission matrix per role; three built-in system roles (Super Admin, Editor, Viewer) that ship locked to prevent lockouts; unlimited custom roles.
- **Audit Logs**: immutable, append-only log of every sensitive action (logins, failed logins, user/role CRUD, settings changes) with actor, IP address, and timestamp; filterable by action.
- **Settings**: per-deployment module toggles (turn Users/Roles/Audit Logs/Notifications on or off without a redeploy).
- **Notifications**: UI scaffold in the header (bell icon + dropdown) — wired to sample data with a clear pointer to the API endpoint you'll back it with (`GET /api/notifications`, not yet implemented — see Roadmap).
- **Account**: forced password rotation on first login and after an admin resets it; self-service change-password flow with reuse prevention.

---

## 3. Project Structure

```
admin-panel/
├── prisma/
│   ├── schema.prisma        # Full data model (Users, Roles, Permissions, AuditLog…)
│   └── seed.ts               # Seeds permission catalog + system roles + first admin
├── src/
│   ├── app/
│   │   ├── (auth)/login/          # Public login page
│   │   ├── (dashboard)/           # Everything behind auth: dashboard, users, roles, audit-logs, settings
│   │   ├── account/change-password/
│   │   ├── api/                   # All REST endpoints (auth, users, roles, audit-logs, settings, health)
│   │   ├── layout.tsx / providers.tsx
│   │   └── error.tsx / not-found.tsx
│   ├── components/
│   │   ├── ui/            # Design-system primitives (button, input, dialog, table, toast…)
│   │   ├── layout/        # Sidebar, header, breadcrumbs, dashboard shell, theme toggle
│   │   ├── users/, roles/, audit/, dashboard/, settings/
│   ├── lib/
│   │   ├── auth.ts         # NextAuth config
│   │   ├── rbac.ts         # requirePermission / hasPermission guards
│   │   ├── audit.ts        # logAudit helper
│   │   ├── rate-limit.ts   # In-memory limiter (swap for Redis in prod)
│   │   ├── validations/    # Zod schemas
│   │   └── prisma.ts
│   └── middleware.ts       # Route protection + forced password rotation
├── tests/                  # Vitest unit tests
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

---

## 4. Setup Instructions

### Prerequisites
- Node.js 20+
- PostgreSQL 14+ (or use the provided `docker-compose.yml`)

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env: set DATABASE_URL, NEXTAUTH_SECRET (openssl rand -base64 32),
# and SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD for your first login.

# 3. Start Postgres (skip if you have your own instance)
docker compose up -d db

# 4. Run migrations
npx prisma migrate dev --name init

# 5. Seed roles, permissions, the first admin user, and sample shop data
#    (3 categories, 4 products, 1 customer, 1 order — safe to re-run,
#    it skips sample data insertion if products already exist)
npm run prisma:seed

# 6. Start the dev server
npm run dev
```

Visit `http://localhost:3000` — you'll be redirected to `/login`. Sign in
with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`; you'll immediately be
prompted to set a new password (the seeded one is marked as temporary).

### Running tests
```bash
npm run test
```

---

## 5. Deployment

### Option A — Docker (self-hosted / any VPS)
```bash
docker compose up -d --build
```
This builds the app via the multi-stage `Dockerfile` (standalone Next.js
output, non-root user) and runs it alongside a Postgres container. Put a
reverse proxy (Caddy, Nginx, or your cloud LB) in front for TLS.

### Option B — Vercel / similar platform-as-a-service
1. Push this repo to GitHub.
2. Import into Vercel.
3. Add all variables from `.env.example` as project environment variables. Use a managed Postgres (Neon, Supabase, RDS, etc.) for `DATABASE_URL`.
4. Add a "Build Command" override: `npx prisma generate && npx prisma migrate deploy && next build`.
5. Deploy. Run `npm run prisma:seed` once locally against the production `DATABASE_URL` (or via a one-off script/job) to create the first admin.

### Environment checklist before going live
- [ ] `NEXTAUTH_SECRET` is a fresh, random 32-byte value — never reused from `.env.example`.
- [ ] `NEXTAUTH_URL` matches your real production domain (https).
- [ ] Database connection uses TLS (`?sslmode=require` for most managed providers).
- [ ] `SEED_ADMIN_PASSWORD` was changed on first login (enforced automatically) and is not left in shell history.
- [ ] Consider swapping the in-memory rate limiter (`src/lib/rate-limit.ts`) for the Upstash Redis-backed variant if you run more than one server instance.

---

## 6. Security & Privacy Checklist

**Authentication & session management**
- [x] Passwords hashed with bcrypt (cost factor 12), never stored or logged in plaintext.
- [x] Account lockout after configurable failed-attempt threshold (`MAX_LOGIN_ATTEMPTS`, `LOCKOUT_MINUTES`).
- [x] Generic "invalid email or password" error — no user-enumeration signal.
- [x] JWT session with server-side re-validation of role/status on every request (near-instant revocation on suspension).
- [x] Forced password rotation for new/reset accounts.
- [x] Session length configurable (`SESSION_MAX_AGE`).

**Authorization**
- [x] Fine-grained, database-driven RBAC (`module:action` permission keys).
- [x] Server-side enforcement on every API route via `requirePermission()` — UI hiding is cosmetic only.
- [x] Self-protection guards: cannot delete/suspend your own account; cannot corrupt built-in system-role permissions.

**Input validation & injection protection**
- [x] Every API route validates input with Zod before touching the database — rejects malformed/oversized payloads.
- [x] Prisma's parameterized queries eliminate SQL injection by construction (no raw string interpolation into queries anywhere in this codebase).
- [x] React's JSX auto-escaping + no `dangerouslySetInnerHTML` anywhere in this codebase mitigates stored/reflected XSS.

**Transport & headers**
- [x] `next.config.js` sets CSP, HSTS, X-Frame-Options (clickjacking), X-Content-Type-Options, Referrer-Policy, Permissions-Policy on every response.
- [x] `poweredByHeader: false` to avoid fingerprinting.

**CSRF**
- [x] NextAuth's built-in CSRF token protects the credentials sign-in flow.
- [ ] **Action needed**: if you add any non-NextAuth form posts (e.g. a raw `<form>` to a custom endpoint), add an explicit CSRF token check — this starter's API routes are called via `fetch()` from same-origin JS, which is not itself CSRF-protected by cookies alone if you later add cookie-only auth for those routes. Since sessions here are JWT-in-cookie, ensure `sameSite: "lax"` (NextAuth's default) remains set.

**Auditability**
- [x] Immutable audit log for logins, failed logins, logouts, and all CRUD on users/roles/settings, including actor, IP, and user agent.

**Secrets management**
- [x] No secrets hardcoded anywhere in source; everything sourced from `process.env`.
- [x] `.env` is git-ignored (add `.env` to your `.gitignore` if not already present).

**Rate limiting**
- [x] Login attempts limited via account lockout; user-creation and password-change endpoints rate-limited per actor.
- [ ] **Action needed for multi-instance production**: replace the in-memory limiter with the Redis-backed implementation before scaling horizontally (in-memory buckets aren't shared across instances).

**Privacy / compliance — read before you claim compliance**
This starter gives you the *mechanisms* (audit logs, soft delete, RBAC,
secure auth) that most privacy regulations require, but **it does not
constitute legal compliance with GDPR, CCPA, HIPAA, SOC 2, or any other
framework on its own.** Compliance depends on your specific jurisdiction,
what data you store, your organization's policies, and legal review that
this document cannot perform. Specifically:
- No privacy policy, terms of service, or cookie-consent banner is included — these must be drafted (or reviewed) by counsel familiar with the jurisdictions your users are in.
- "Soft delete" preserves data for audit purposes; if you operate under a right-to-erasure regime, you'll need a hard-delete/anonymization job on top of this schema.
- No data retention/expiry policy is implemented for audit logs — add a scheduled job if your compliance regime requires log rotation or deletion after N days.

---

## 7. Testing

- `tests/validations.test.ts` — unit tests for the Zod schemas (password policy, email normalization).
- **Not included, and recommended before production**: integration tests against a test database for the API routes (e.g. with `vitest` + a Dockerized Postgres, or Playwright for end-to-end flows through the login → dashboard → CRUD path).

---

## 8. Known Assumptions & Limitations (please review)

- **Single-tenant by default.** The schema has no `organizationId`/tenant column. If you need multi-tenancy, add a `Tenant` model and scope every query (`where: { tenantId }`) — this is a non-trivial change and should be planned before storing real customer data.
- **Two-factor authentication fields exist in the schema** (`twoFactorEnabled`, `twoFactorSecret`) but the enrollment/verification flow is not implemented — treat `FEATURE_TWO_FACTOR` in `.env.example` as a roadmap flag, not a working toggle.
- **No file/avatar upload** — the `User.image` field exists but there's no upload endpoint or storage integration (S3, etc.).
- **Single rate-limit store (in-memory)** — fine for one instance/demo; must be swapped for Redis before running multiple app instances behind a load balancer (see Security Checklist).

### Now implemented (previously listed as gaps)
- **Notifications** — real backend (`/api/notifications`, mark-as-read, mark-all-read), polling every 30s, fired automatically on: new user created, a user's own role/status changed, and repeated failed-login lockouts.
- **Email invites** — via [Resend](https://resend.com). When creating a user, choose "Email invite link" and they receive a single-use, 24-hour link to set their own password (`/invite/[token]`), instead of an admin choosing a temp password for them. Falls back gracefully (logs the link to the server console) if `RESEND_API_KEY` isn't set yet, so the rest of the app keeps working without email configured.

---

## 9. Extending This Panel

To add a new module (e.g. "Products"):
1. Add a `Product` model to `prisma/schema.prisma`, run `prisma migrate dev`.
2. Add `products:view/create/update/delete` to the permission seed list in `prisma/seed.ts`.
3. Create `src/lib/validations/product.ts` (Zod schema).
4. Create `src/app/api/products/route.ts` and `[id]/route.ts`, following the pattern in `src/app/api/users/`.
5. Create `src/app/(dashboard)/products/page.tsx` + a `ProductsTable` client component, following `src/components/users/users-table.tsx`.
6. Add the nav item to `NAV_ITEMS` in `src/components/layout/sidebar.tsx` with its `permission` key — it will automatically respect RBAC and the Settings module-toggle pattern if you wire that in too.
