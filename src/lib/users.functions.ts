import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-middleware";

const role = z.enum(["admin", "user"]);
const password = z.string().min(8, "Password must be at least 8 characters.").max(100);

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { request } = await import("@/server/db.server");
    const req = await request();
    const { recordset } = await req.query<{
      id: string;
      email: string;
      full_name: string | null;
      role: "admin" | "user";
      created_at: Date;
    }>(`SELECT id, email, full_name, role, created_at FROM dbo.users ORDER BY created_at`);
    return recordset.map((u) => ({
      id: u.id.toLowerCase(),
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      created_at: u.created_at.toISOString(),
    }));
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z
      .object({
        email: z.string().trim().toLowerCase().email().max(255),
        password,
        full_name: z.string().trim().max(100),
        role,
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { request, sql, isDuplicateKeyError } = await import("@/server/db.server");
    const { hashPassword } = await import("@/server/crypto.server");
    const req = await request();
    try {
      await req
        .input("email", sql.NVarChar(320), data.email)
        .input("password_hash", sql.NVarChar(256), await hashPassword(data.password))
        .input("full_name", sql.NVarChar(100), data.full_name || null)
        .input("role", sql.NVarChar(10), data.role)
        .query(
          `INSERT INTO dbo.users (email, password_hash, full_name, role)
           VALUES (@email, @password_hash, @full_name, @role)`,
        );
    } catch (error) {
      if (isDuplicateKeyError(error)) throw new Error("A user with this email address has already been registered");
      throw error;
    }
    return { ok: true };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid(), role }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.userId.toLowerCase() === context.user.id) throw new Error("You cannot change your own role");
    const { request, sql } = await import("@/server/db.server");
    const req = await request();
    await req
      .input("id", sql.UniqueIdentifier, data.userId)
      .input("role", sql.NVarChar(10), data.role)
      .query(`UPDATE dbo.users SET role = @role WHERE id = @id`);
    return { ok: true };
  });

/** Replaces the e-mailed password reset: an admin sets a new password and tells the user. */
export const setUserPassword = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid(), password }).parse(d))
  .handler(async ({ data }) => {
    const { request, sql } = await import("@/server/db.server");
    const { hashPassword } = await import("@/server/crypto.server");
    const req = await request();
    // Signing the user out everywhere forces them to use the new password.
    await req
      .input("id", sql.UniqueIdentifier, data.userId)
      .input("password_hash", sql.NVarChar(256), await hashPassword(data.password))
      .query(
        `UPDATE dbo.users SET password_hash = @password_hash WHERE id = @id;
         DELETE FROM dbo.sessions WHERE user_id = @id;`,
      );
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.userId.toLowerCase() === context.user.id) throw new Error("You cannot delete yourself");
    const { request, sql } = await import("@/server/db.server");
    const req = await request();
    await req.input("id", sql.UniqueIdentifier, data.userId).query(`DELETE FROM dbo.users WHERE id = @id`);
    return { ok: true };
  });
