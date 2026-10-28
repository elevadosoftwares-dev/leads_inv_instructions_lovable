import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-middleware";

export type AppUser = {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  role: "admin" | "user";
};

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { selectJson } = await import("@/server/rows.server");
    return selectJson<AppUser>(
      `SELECT id, email, full_name, created_at, role FROM dbo.users ORDER BY created_at`,
    );
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z
      .object({
        email: z.string().trim().toLowerCase().email().max(255),
        password: z.string().min(8).max(100),
        full_name: z.string().trim().max(100),
        role: z.enum(["admin", "user"]),
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
        .input("full_name", sql.NVarChar(200), data.full_name)
        .input("password_hash", sql.NVarChar(256), await hashPassword(data.password))
        .input("role", sql.NVarChar(10), data.role)
        .query(
          `INSERT INTO dbo.users (email, full_name, password_hash, role)
           VALUES (@email, @full_name, @password_hash, @role)`,
        );
    } catch (error) {
      if (isDuplicateKeyError(error))
        throw new Error("A user with this email address has already been registered");
      throw error;
    }
    return { ok: true };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), role: z.enum(["admin", "user"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.userId.toLowerCase() === context.user.userId)
      throw new Error("You cannot change your own role");
    const { request, sql } = await import("@/server/db.server");
    const req = await request();
    await req
      .input("id", sql.UniqueIdentifier, data.userId)
      .input("role", sql.NVarChar(10), data.role)
      .query(`UPDATE dbo.users SET role = @role WHERE id = @id`);
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.userId.toLowerCase() === context.user.userId)
      throw new Error("You cannot delete yourself");
    const { request, sql } = await import("@/server/db.server");
    const req = await request();
    await req
      .input("id", sql.UniqueIdentifier, data.userId)
      .query(`DELETE FROM dbo.users WHERE id = @id`);
    return { ok: true };
  });

/** Replaces the e-mailed reset link: an administrator sets a new password for the user. */
export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        password: z.string().min(8, "Password must be at least 8 characters.").max(100),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { request, sql } = await import("@/server/db.server");
    const { hashPassword } = await import("@/server/crypto.server");
    const req = await request();
    // Also signs the user out everywhere, so the old password stops working immediately.
    await req
      .input("id", sql.UniqueIdentifier, data.userId)
      .input("password_hash", sql.NVarChar(256), await hashPassword(data.password))
      .query(
        `UPDATE dbo.users SET password_hash = @password_hash WHERE id = @id;
         DELETE FROM dbo.sessions WHERE user_id = @id;`,
      );
    return { ok: true };
  });
