import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-middleware";

export type AppRole = "admin" | "user";

export interface SessionInfo {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
}

/** The signed-in user, or null when nobody is signed in. */
export const getSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<SessionInfo | null> => {
    const { getSessionUser } = await import("@/server/auth.server");
    const user = await getSessionUser();
    return user
      ? { id: user.userId, email: user.email, fullName: user.fullName, role: user.role }
      : null;
  },
);

export const signIn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({ email: z.string().trim().toLowerCase().min(1), password: z.string().min(1) })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { request, sql } = await import("@/server/db.server");
    const { verifyPassword, getDummyHash } = await import("@/server/crypto.server");
    const { createSession } = await import("@/server/auth.server");

    const req = await request();
    const { recordset } = await req
      .input("email", sql.NVarChar(320), data.email)
      .query<{ id: string; password_hash: string }>(
        `SELECT id, password_hash FROM dbo.users WHERE email = @email`,
      );
    const user = recordset[0];
    const ok = await verifyPassword(data.password, user?.password_hash ?? (await getDummyHash()));
    if (!user || !ok) throw new Error("Invalid login credentials");

    await createSession(user.id);
    return { ok: true };
  });

const signUpSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  fullName: z.string().trim().max(100),
});

/** Registers a read-only account. The first account on an empty database becomes an administrator. */
export const signUp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => signUpSchema.parse(d))
  .handler(async ({ data }) => {
    const { request, sql, isDuplicateKeyError } = await import("@/server/db.server");
    const { hashPassword } = await import("@/server/crypto.server");
    const req = await request();
    try {
      // The lock hints make the "no admin yet" check and the insert atomic.
      await req
        .input("email", sql.NVarChar(320), data.email)
        .input("full_name", sql.NVarChar(200), data.fullName)
        .input("password_hash", sql.NVarChar(256), await hashPassword(data.password))
        .query(
          `INSERT INTO dbo.users (email, full_name, password_hash, role)
           SELECT @email, @full_name, @password_hash,
                  CASE WHEN EXISTS (SELECT 1 FROM dbo.users WITH (UPDLOCK, HOLDLOCK) WHERE role = N'admin')
                       THEN N'user' ELSE N'admin' END`,
        );
    } catch (error) {
      if (isDuplicateKeyError(error)) throw new Error("User already registered");
      throw error;
    }
    return { ok: true };
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const { destroySession } = await import("@/server/auth.server");
  await destroySession();
  return { ok: true };
});

/** Lets the signed-in user choose a new password. */
export const changePassword = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ password: z.string().min(8, "Password must be at least 8 characters.") }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { request, sql } = await import("@/server/db.server");
    const { hashPassword } = await import("@/server/crypto.server");
    const req = await request();
    await req
      .input("id", sql.UniqueIdentifier, context.user.userId)
      .input("password_hash", sql.NVarChar(256), await hashPassword(data.password))
      .query(`UPDATE dbo.users SET password_hash = @password_hash WHERE id = @id`);
    return { ok: true };
  });
