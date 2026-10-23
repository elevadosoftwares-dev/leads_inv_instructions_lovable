# Project rules

- Data lives in Microsoft SQL Server (`DATABASE_URL`); `database/schema.sql` is applied automatically on first connect and must stay idempotent (`IF OBJECT_ID(...) IS NULL`).
- All database access goes through server functions in `src/lib/*.functions.ts`, which load `src/server/*.server.ts` with `await import(...)` — the `mssql` driver must never reach the browser bundle.
- Roles are `dbo.users.role` (`admin` | `user`); the first sign-up becomes admin, later sign-ups are plain users.
- Every server function that reads data uses `requireAuth`; every one that writes uses `requireAdmin` (`src/lib/auth-middleware.ts`) — the server, not the UI, enforces view vs edit rights.
- Signed-in pages live under `src/routes/_authenticated/` — one gate for all protected pages.
