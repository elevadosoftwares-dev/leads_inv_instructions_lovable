# Invoice Instructions

Keeps each client's invoice-sending instructions in one place: who to email, the invoice cycle,
delivery mode, credit limit, the Leads PIC and the client's payment contact. Admins edit;
everyone else signed in can search and view.

## Stack

| Layer     | Technology                                                                    |
| --------- | ----------------------------------------------------------------------------- |
| Framework | TanStack Start — React 19 with server-side rendering and **server functions** |
| UI        | TypeScript, Tailwind CSS v4, shadcn/ui (Radix), lucide icons, sonner (toasts) |
| Data (UI) | TanStack Query (caching), TanStack Router (file-based routes)                 |
| Database  | Microsoft SQL Server via the `mssql` driver                                   |
| Auth      | Own login: scrypt-hashed passwords + HTTP-only session cookie                 |
| Build     | Vite 8; Nitro packages the production build as a standalone Node.js server    |

## How it works

Frontend and backend live in **one project and run as one Node.js process**:

```
Browser (React pages)                         Node.js server
─────────────────────                         ──────────────────────────────────────────
src/routes/*.tsx  ── calls ──►  src/lib/*.functions.ts  ──►  src/server/*.server.ts ──► SQL Server
src/components/*                (server functions)             (DB pool, password hashing,
                                                                 sessions — server only)
```

- **Login:** `signIn` checks the password hash, stores a random token's SHA-256 in
  `dbo.sessions`, and sets it in an HTTP-only cookie (`ii_session`, 30 days, renewed on use).
- **Roles:** the first account to sign up becomes **admin**; later sign-ups are **users**.
  Admins can add users, change roles, set a user's password and delete users.
- **Access rules:** reads use `requireAuth`, writes use `requireAdmin`
  (`src/lib/auth-middleware.ts`), so a plain user cannot change data even by calling the API.
- **Forgotten password:** there is no e-mail service, so an admin sets a new one on the
  Users page (key icon). Anyone can change their own password under _Change password_.
- **Database setup is automatic:** on the first request that needs the database, the server
  connects using `DATABASE_URL`, creates the database if it does not exist, and applies
  `database/schema.sql`. The script is idempotent, so it is safe on every start.

## Files

| Path                                   | Purpose                                                       |
| -------------------------------------- | ------------------------------------------------------------- |
| `database/schema.sql`                  | SQL Server tables; applied automatically at startup           |
| `src/server/db.server.ts`              | Parses `DATABASE_URL`, connection pool, auto-create + schema  |
| `src/server/crypto.server.ts`          | Password hashing (scrypt) and session tokens                  |
| `src/server/auth.server.ts`            | Create / read / destroy login sessions                        |
| `src/lib/auth-middleware.ts`           | `requireAuth` / `requireAdmin` guards                         |
| `src/lib/auth.functions.ts`            | `signIn`, `signUp`, `signOut`, `getSession`, `changePassword` |
| `src/lib/users.functions.ts`           | User admin: list, create, set role, set password, delete      |
| `src/lib/masters.functions.ts`         | Client master and Leads PIC lists                             |
| `src/lib/instructions.functions.ts`    | Invoice instructions: list, get, save, delete                 |
| `src/routes/auth.tsx`                  | `/auth` — sign in / sign up                                   |
| `src/routes/_authenticated/route.tsx`  | Guard + sidebar for every signed-in page                      |
| `src/routes/_authenticated/*.tsx`      | Dashboard, instruction form, clients, PICs, users, password   |
| `src/components/InstructionForm.tsx`   | Create / edit / view form for an instruction                  |
| `src/server.ts`, `src/start.ts`        | Server entry (friendly crash page) and CSRF/error middleware  |

## Configuration (`.env`)

Copy `.env.example` to `.env` and fill in:

| Variable                | Purpose                                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | `sqlserver://HOST[\INSTANCE][:PORT];database=NAME;user=...;password=...;encrypt=true;trustServerCertificate=true` |
| `SESSION_COOKIE_SECURE` | `true` when the site is served over HTTPS                                                                         |
| `PORT` (optional)       | Port to listen on (default 3000)                                                                                  |

If the database does not exist it is created (the SQL login needs `CREATE DATABASE`
permission; `sa` has it). Data is not copied between databases.

## Run locally

Requires Node.js 20.12 or newer.

```sh
npm install        # once, or after package.json changes
npm run dev        # http://localhost:3000
```

Open the site, choose **Sign up**, and create the first account — it becomes the admin.

## Build and host

```sh
npm run build      # creates .output/ (the complete server)
npm start          # runs .output/server/index.mjs with .env, on PORT (default 3000)
```

To deploy, copy **`.output/`, `.env` and `package.json`** to the server (it needs Node.js but
not `node_modules` or the source) and run `npm start` there. Keep it running with pm2 or as a
Windows service (e.g. NSSM), and put IIS (URL Rewrite + ARR) or nginx in front for HTTPS; then
set `SESSION_COOKIE_SECURE=true`.

## Other scripts

| Command          | What it does                       |
| ---------------- | ---------------------------------- |
| `npm test`       | Run the Vitest tests               |
| `npm run lint`   | Check code with ESLint             |
| `npm run format` | Auto-format all code with Prettier |
