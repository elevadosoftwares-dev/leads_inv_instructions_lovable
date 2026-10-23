// Invoice instructions. Everyone signed in can read; only admins can create, edit or delete.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin, requireAuth } from "@/lib/auth-middleware";

export type InvoiceCycle = "daily" | "weekly" | "bi_weekly" | "monthly";
export type DeliveryMode = "portal" | "hard_copy" | "email_einvoice";

export type Instruction = {
  id: string;
  client_id: string;
  project_site: string;
  quotation_ref: string | null;
  email_to: string;
  attention_to: string | null;
  email_cc: string | null;
  invoice_cycle: InvoiceCycle;
  delivery_mode: DeliveryMode;
  credit_limit: string | null;
  leads_pic_id: string;
  payment_pic_name: string | null;
  payment_pic_email: string | null;
  payment_pic_phone: string | null;
  invoice_note: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type InstructionListRow = Instruction & {
  clients: { client_name: string } | null;
  leads_pics: { name: string } | null;
};

type DbInstruction = Omit<Instruction, "created_at" | "updated_at"> & { created_at: Date; updated_at: Date };

const COLUMNS = `i.id, i.client_id, i.project_site, i.quotation_ref, i.email_to, i.attention_to, i.email_cc,
  i.invoice_cycle, i.delivery_mode, i.credit_limit, i.leads_pic_id, i.payment_pic_name,
  i.payment_pic_email, i.payment_pic_phone, i.invoice_note, i.notes, i.active, i.created_at, i.updated_at`;

function toInstruction(r: DbInstruction): Instruction {
  return {
    ...r,
    id: r.id.toLowerCase(),
    client_id: r.client_id.toLowerCase(),
    leads_pic_id: r.leads_pic_id.toLowerCase(),
    created_at: r.created_at.toISOString(),
    updated_at: r.updated_at.toISOString(),
  };
}

export const listInstructions = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async (): Promise<InstructionListRow[]> => {
    const { request } = await import("@/server/db.server");
    const req = await request();
    const { recordset } = await req.query<DbInstruction & { client_name: string | null; pic_name: string | null }>(
      `SELECT ${COLUMNS}, c.client_name, p.name AS pic_name
         FROM dbo.invoice_instructions i
         LEFT JOIN dbo.clients c ON c.id = i.client_id
         LEFT JOIN dbo.leads_pics p ON p.id = i.leads_pic_id
        ORDER BY i.created_at DESC`,
    );
    return recordset.map(({ client_name, pic_name, ...r }) => ({
      ...toInstruction(r),
      clients: client_name === null ? null : { client_name },
      leads_pics: pic_name === null ? null : { name: pic_name },
    }));
  });

export const getInstruction = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }): Promise<Instruction | null> => {
    // A malformed id in the URL is simply "not found", not a server error.
    if (!z.string().uuid().safeParse(data.id).success) return null;
    const { request, sql } = await import("@/server/db.server");
    const req = await request();
    const { recordset } = await req
      .input("id", sql.UniqueIdentifier, data.id)
      .query<DbInstruction>(`SELECT ${COLUMNS} FROM dbo.invoice_instructions i WHERE i.id = @id`);
    const row = recordset[0];
    return row ? toInstruction(row) : null;
  });

const emailList = (v: string) =>
  v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .every((e) => z.string().email().safeParse(e).success);

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);

const instructionInput = z.object({
  client_id: z.string().uuid("Select a client"),
  project_site: z.string().trim().min(1, "Project / Site is required").max(200),
  quotation_ref: optional(50),
  email_to: z.string().trim().min(1).max(1000).refine(emailList, "Check the email addresses"),
  attention_to: optional(100),
  email_cc: optional(1000).refine((v) => v === null || emailList(v), "Check the email addresses"),
  invoice_cycle: z.enum(["daily", "weekly", "bi_weekly", "monthly"]),
  delivery_mode: z.enum(["portal", "hard_copy", "email_einvoice"]),
  credit_limit: optional(20),
  leads_pic_id: z.string().uuid("Select a Leads PIC"),
  payment_pic_name: optional(100),
  payment_pic_email: optional(255).refine(
    (v) => v === null || z.string().email().safeParse(v).success,
    "Invalid payment PIC email",
  ),
  payment_pic_phone: optional(30),
  invoice_note: z.string().trim().min(30, "Invoice instructions must be at least 30 characters").max(500),
  notes: optional(2000),
  active: z.boolean(),
});

export const saveInstruction = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid().optional(), values: instructionInput }).parse(d),
  )
  .handler(async ({ data }) => {
    const { request, sql, isReferenceError } = await import("@/server/db.server");
    const v = data.values;
    const req = (await request())
      .input("client_id", sql.UniqueIdentifier, v.client_id)
      .input("project_site", sql.NVarChar(200), v.project_site)
      .input("quotation_ref", sql.NVarChar(50), v.quotation_ref)
      .input("email_to", sql.NVarChar(1000), v.email_to)
      .input("attention_to", sql.NVarChar(100), v.attention_to)
      .input("email_cc", sql.NVarChar(1000), v.email_cc)
      .input("invoice_cycle", sql.NVarChar(20), v.invoice_cycle)
      .input("delivery_mode", sql.NVarChar(20), v.delivery_mode)
      .input("credit_limit", sql.NVarChar(20), v.credit_limit)
      .input("leads_pic_id", sql.UniqueIdentifier, v.leads_pic_id)
      .input("payment_pic_name", sql.NVarChar(100), v.payment_pic_name)
      .input("payment_pic_email", sql.NVarChar(255), v.payment_pic_email)
      .input("payment_pic_phone", sql.NVarChar(30), v.payment_pic_phone)
      .input("invoice_note", sql.NVarChar(500), v.invoice_note)
      .input("notes", sql.NVarChar(2000), v.notes)
      .input("active", sql.Bit, v.active);
    try {
      if (data.id) {
        const { rowsAffected } = await req.input("id", sql.UniqueIdentifier, data.id).query(
          `UPDATE dbo.invoice_instructions SET
             client_id = @client_id, project_site = @project_site, quotation_ref = @quotation_ref,
             email_to = @email_to, attention_to = @attention_to, email_cc = @email_cc,
             invoice_cycle = @invoice_cycle, delivery_mode = @delivery_mode, credit_limit = @credit_limit,
             leads_pic_id = @leads_pic_id, payment_pic_name = @payment_pic_name,
             payment_pic_email = @payment_pic_email, payment_pic_phone = @payment_pic_phone,
             invoice_note = @invoice_note, notes = @notes, active = @active,
             updated_at = SYSUTCDATETIME()
           WHERE id = @id`,
        );
        if (!rowsAffected[0]) throw new Error("Instruction not found");
      } else {
        await req.query(
          `INSERT INTO dbo.invoice_instructions
             (client_id, project_site, quotation_ref, email_to, attention_to, email_cc, invoice_cycle,
              delivery_mode, credit_limit, leads_pic_id, payment_pic_name, payment_pic_email,
              payment_pic_phone, invoice_note, notes, active)
           VALUES
             (@client_id, @project_site, @quotation_ref, @email_to, @attention_to, @email_cc, @invoice_cycle,
              @delivery_mode, @credit_limit, @leads_pic_id, @payment_pic_name, @payment_pic_email,
              @payment_pic_phone, @invoice_note, @notes, @active)`,
        );
      }
    } catch (error) {
      if (isReferenceError(error)) throw new Error("The selected client or Leads PIC no longer exists");
      throw error;
    }
    return { ok: true };
  });

export const deleteInstruction = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { request, sql } = await import("@/server/db.server");
    const req = await request();
    await req.input("id", sql.UniqueIdentifier, data.id).query(`DELETE FROM dbo.invoice_instructions WHERE id = @id`);
    return { ok: true };
  });
