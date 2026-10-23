import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-middleware";

const email = z.string().trim().toLowerCase().email("Enter a valid email address.").max(320);
const password = z.string().min(8, "Password must be at least 8 characters.").max(100);

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  const { getSessionUser } = await import("@/server/auth.server");
  return getSessionUser();
});

export const signIn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ email, password: z.string().min(1) }).parse(d))
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

/** Self sign-up. The very first account becomes admin; everyone after that is a plain user. */
export const signUp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ email, password, full_name: z.string().trim().max(100) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { request, sql, isDuplicateKeyError } = await import("@/server/db.server");
    const { hashPassword } = await import("@/server/crypto.server");
    const { createSession } = await import("@/server/auth.server");

    const req = await request();
    let id: string | undefined;
    try {
      // The lock hints make the "is there an admin yet?" check and the insert atomic.
      const { recordset } = await req
        .input("email", sql.NVarChar(320), data.email)
        .input("password_hash", sql.NVarChar(256), await hashPassword(data.password))
        .input("full_name", sql.NVarChar(100), data.full_name || null)
        .query<{ id: string }>(
          `INSERT INTO dbo.users (email, password_hash, full_name, role)
           OUTPUT inserted.id
           SELECT @email, @password_hash, @full_name,
                  CASE WHEN EXISTS (SELECT 1 FROM dbo.users WITH (UPDLOCK, HOLDLOCK) WHERE role = N'admin')
                       THEN N'user' ELSE N'admin' END`,
        );
      id = recordset[0]?.id;
    } catch (error) {
      if (isDuplicateKeyError(error)) throw new Error("A user with this email address has already been registered");
      throw error;
    }
    if (!id) throw new Error("Could not create account");
    await createSession(id);
    return { ok: true };
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const { destroySession } = await import("@/server/auth.server");
  await destroySession();
  return { ok: true };
});

export const changePassword = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ currentPassword: z.string().min(1), newPassword: password }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { request, sql } = await import("@/server/db.server");
    const { hashPassword, verifyPassword } = await import("@/server/crypto.server");

    const req = await request();
    const { recordset } = await req
      .input("id", sql.UniqueIdentifier, context.user.id)
      .query<{ password_hash: string }>(`SELECT password_hash FROM dbo.users WHERE id = @id`);
    const row = recordset[0];
    if (!row || !(await verifyPassword(data.currentPassword, row.password_hash)))
      throw new Error("Current password is incorrect");

    const upd = await request();
    await upd
      .input("id", sql.UniqueIdentifier, context.user.id)
      .input("password_hash", sql.NVarChar(256), await hashPassword(data.newPassword))
      .query(`UPDATE dbo.users SET password_hash = @password_hash WHERE id = @id`);
    return { ok: true };
  });
