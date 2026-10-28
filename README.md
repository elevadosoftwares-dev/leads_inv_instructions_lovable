# Invoice Instructions

Keeps the invoicing instructions for every client project: where to send the invoice, the
invoice cycle, delivery mode, credit limit, Leads PIC and the client's payment contact.

## Stack

| Layer     | Technology                                                                    |
| --------- | ----------------------------------------------------------------------------- |
| Framework | TanStack Start — React 19 with server-side rendering and **server functions** |
| UI        | TypeScript, Tailwind CSS v4, shadcn/ui (Radix), lucide icons                  |
| Data (UI) | TanStack Query (caching), TanStack Router (file-based routes)                 |
| Database  | Microsoft SQL Server via the `mssql` driver                                   |
| Auth      | Own login: scrypt-hashed passwords + HTTP-only session cookie                 |
| Build     | Vite 8; Nitro packages the production build as a standalone Node.js server    |

## How it works

Frontend and backend live in **one project and run as one Node.js process** — there is no
separate API server:

```
Browser (React pages)                         Node.js server
─────────────────────                         ──────────────────────────────────────────
src/routes/*.tsx  ── calls ──►  src/lib/*.functions.ts  ──►  src/server/*.server.ts ──► SQL Server
src/components/*                (server functions: run on      (DB pool, passwords,
                                 the server; the browser gets   sessions, files — never
                                 only a tiny fetch stub)        sent to the browser)
```

- **Accounts:** anyone can register on the sign-in page. The first account becomes an **admin**;
  later sign-ups are **users** (read-only). Admins manage accounts in **Users**.
- **Passwords:** there is no e-mail server, so "Forgot password?" asks the user to contact an
  admin, who sets a new one with the key button in **Users**. Signed-in users can change their
  own password under **Change password** (`/reset-password`).
- **Access rules:** every server function requires a signed-in user; all changes require an admin.
  Clients and PICs that are used by an instruction cannot be deleted — set them inactive instead.
- **Database setup is automatic:** on the first request the server connects to `DATABASE_URL`,
  creates the database if it does not exist and applies `database/schema.sql` (idempotent, safe
  on every start).

## Files

| File                          | Purpose                                                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `database/schema.sql`         | SQL Server tables (users, sessions, clients, leads_pics, invoice_instructions); applied automatically at startup |
| `src/server/db.server.ts`     | Parses `DATABASE_URL`, connection pool, creates the database and applies the schema                              |
| `src/server/auth.server.ts`   | Create / read / destroy login sessions (cookie + `dbo.sessions`)                                                 |
| `src/server/crypto.server.ts` | Password hashing (scrypt) and session tokens                                                                     |
| `src/server/rows.server.ts`   | Query helpers (JSON results, insert/update/delete rows)                                                          |
| `src/lib/auth-middleware.ts`  | `requireAuth` / `requireAdmin` guards for server functions                                                       |
| `src/lib/inv.functions.ts`    | Clients, Leads PICs and invoice instructions                                                                     |
| `src/lib/users.functions.ts`  | Users: list, create, change role, reset password, remove (admin)                                                 |
| `src/lib/auth.functions.ts`   | Sign in / sign up / sign out / change password                                                                   |
| `src/hooks/use-auth.ts`       | Current user and admin flag for the pages                                                                        |
| `src/routes/*`                | Pages (file-based routes); `src/routeTree.gen.ts` is generated — do not edit                                     |
| `src/start.ts, src/server.ts` | Request middleware (errors, CSRF protection) and server entry                                                    |

## Configuration (`.env`)

Copy `.env.example` to `.env` and fill it in.

| Variable                | Purpose                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`          | `sqlserver://HOST[\INSTANCE][:PORT];database=new_leads_inv_ins;user=...;password=...;encrypt=true;trustServerCertificate=true` |
| `SESSION_COOKIE_SECURE` | `true` when the site is served over HTTPS                                                                                      |
| `PORT` (optional)       | Port to listen on (default 3000)                                                                                               |

The SQL login needs `CREATE DATABASE` permission the first time (`sa` has it) unless you create
the database yourself.

## Run locally

Requires Node.js 22 or newer and a reachable SQL Server.

```sh
npm install        # once, or after package.json changes
npm run dev        # http://localhost:3000, reloads on code changes
```

## Build and host

```sh
npm run build      # creates .output/ (the complete server)
npm start          # runs .output/server/index.mjs with .env, on PORT (default 3000)
```

To deploy, copy **`.output/`, `.env` and `package.json`** to the server (it needs Node.js but not
`node_modules` or the source) and run `npm start`. Keep it running with pm2
(`pm2 start npm --name leads-inv-ins -- start`) or as a Windows service (e.g. NSSM), and put IIS
(URL Rewrite + ARR) or nginx in front for HTTPS; then set `SESSION_COOKIE_SECURE=true`.

## Other scripts

| Command          | What it does                       |
| ---------------- | ---------------------------------- |
| `npm test`       | Unit tests (Vitest)                |
| `npm run lint`   | Check code with ESLint             |
| `npm run format` | Auto-format all code with Prettier |
