// Client master and Leads PIC lists. Everyone signed in can read; only admins can change.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin, requireAuth } from "@/lib/auth-middleware";

export type Client = {
  id: string;
  client_name: string;
  site_name: string | null;
  project_name: string | null;
  active: boolean;
  created_at: string;
};

export type LeadsPic = { id: string; name: string; active: boolean; created_at: string };

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);

export const listClients = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async (): Promise<Client[]> => {
    const { request } = await import("@/server/db.server");
    const req = await request();
    const { recordset } = await req.query<Omit<Client, "created_at"> & { created_at: Date }>(
      `SELECT id, client_name, site_name, project_name, active, created_at
         FROM dbo.clients ORDER BY client_name`,
    );
    return recordset.map((c) => ({ ...c, id: c.id.toLowerCase(), created_at: c.created_at.toISOString() }));
  });

export const addClient = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z
      .object({
        client_name: z.string().trim().min(1, "Client name is required").max(200),
        site_name: optional(200),
        project_name: optional(200),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { request, sql } = await import("@/server/db.server");
    const req = await request();
    await req
      .input("client_name", sql.NVarChar(200), data.client_name)
      .input("site_name", sql.NVarChar(200), data.site_name)
      .input("project_name", sql.NVarChar(200), data.project_name)
      .query(
        `INSERT INTO dbo.clients (client_name, site_name, project_name)
         VALUES (@client_name, @site_name, @project_name)`,
      );
    return { ok: true };
  });

export const listPics = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async (): Promise<LeadsPic[]> => {
    const { request } = await import("@/server/db.server");
    const req = await request();
    const { recordset } = await req.query<Omit<LeadsPic, "created_at"> & { created_at: Date }>(
      `SELECT id, name, active, created_at FROM dbo.leads_pics ORDER BY name`,
    );
    return recordset.map((p) => ({ ...p, id: p.id.toLowerCase(), created_at: p.created_at.toISOString() }));
  });

export const addPic = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ name: z.string().trim().min(1).max(100) }).parse(d))
  .handler(async ({ data }) => {
    const { request, sql } = await import("@/server/db.server");
    const req = await request();
    await req.input("name", sql.NVarChar(100), data.name).query(`INSERT INTO dbo.leads_pics (name) VALUES (@name)`);
    return { ok: true };
  });

const table = z.enum(["clients", "leads_pics"]);

export const setMasterActive = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ table, id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const { request, sql } = await import("@/server/db.server");
    const req = await request();
    await req
      .input("id", sql.UniqueIdentifier, data.id)
      .input("active", sql.Bit, data.active)
      .query(
        data.table === "clients"
          ? `UPDATE dbo.clients SET active = @active WHERE id = @id`
          : `UPDATE dbo.leads_pics SET active = @active WHERE id = @id`,
      );
    return { ok: true };
  });

export const deleteMaster = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ table, id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { request, sql, isReferenceError } = await import("@/server/db.server");
    const req = await request();
    try {
      await req
        .input("id", sql.UniqueIdentifier, data.id)
        .query(
          data.table === "clients"
            ? `DELETE FROM dbo.clients WHERE id = @id`
            : `DELETE FROM dbo.leads_pics WHERE id = @id`,
        );
    } catch (error) {
      if (isReferenceError(error))
        throw new Error(
          data.table === "clients"
            ? "Client has instructions — set it inactive instead."
            : "PIC is used in instructions — set inactive instead.",
        );
      throw error;
    }
    return { ok: true };
  });
