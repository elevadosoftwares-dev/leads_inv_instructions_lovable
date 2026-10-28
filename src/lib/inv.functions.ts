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
export type Instruction = {
  id: string;
  client_id: string;
  project_site: string;
  quotation_ref: string | null;
  email_to: string;
  attention_to: string | null;
  email_cc: string | null;
  invoice_cycle: "daily" | "weekly" | "bi_weekly" | "monthly";
  delivery_mode: "portal" | "hard_copy" | "email_einvoice";
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
  clients: { client_name: string };
  leads_pics: { name: string };
};

const INSTRUCTION_COLUMNS = `i.id, i.client_id, i.project_site, i.quotation_ref, i.email_to, i.attention_to,
  i.email_cc, i.invoice_cycle, i.delivery_mode, i.credit_limit, i.leads_pic_id, i.payment_pic_name,
  i.payment_pic_email, i.payment_pic_phone, i.invoice_note, i.notes, i.active, i.created_at, i.updated_at`;

/** SQL Server error 547: a FOREIGN KEY (or CHECK) constraint stopped the statement. */
function isReferenceError(error: unknown) {
  return (error as { number?: number } | null)?.number === 547;
}

// ------------------------------------------------------------------ reads (any signed-in user)

export const listClients = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async () => {
    const { selectJson } = await import("@/server/rows.server");
    return selectJson<Client>(
      `SELECT id, client_name, site_name, project_name, active, created_at
         FROM dbo.clients ORDER BY client_name`,
    );
  });

export const listPics = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async () => {
    const { selectJson } = await import("@/server/rows.server");
    return selectJson<LeadsPic>(
      `SELECT id, name, active, created_at FROM dbo.leads_pics ORDER BY name`,
    );
  });

export const listInstructions = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async () => {
    const { selectJson } = await import("@/server/rows.server");
    return selectJson<InstructionListRow>(
      `SELECT ${INSTRUCTION_COLUMNS},
              JSON_QUERY((SELECT c.client_name FROM dbo.clients c WHERE c.id = i.client_id
                          FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)) AS clients,
              JSON_QUERY((SELECT p.name FROM dbo.leads_pics p WHERE p.id = i.leads_pic_id
                          FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)) AS leads_pics
         FROM dbo.invoice_instructions i ORDER BY i.created_at DESC`,
    );
  });

export const getInstruction = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    if (!z.string().uuid().safeParse(data.id).success) return null;
    const { selectOneJson } = await import("@/server/rows.server");
    return selectOneJson<Instruction>(
      `SELECT ${INSTRUCTION_COLUMNS} FROM dbo.invoice_instructions i WHERE i.id = @id`,
      { id: data.id },
    );
  });

// ------------------------------------------------------------------ writes (admins only)

const id = z.string().uuid();
const optional = (max: number) =>
  z
    .string()
    .max(max)
    .nullish()
    .transform((v) => (v?.trim() ? v.trim() : null));

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
    const { insertRow } = await import("@/server/rows.server");
    await insertRow("clients", data);
    return { ok: true };
  });

export const addPic = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ name: z.string().trim().min(1, "Enter a name.").max(100) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { insertRow } = await import("@/server/rows.server");
    await insertRow("leads_pics", data);
    return { ok: true };
  });

const masterTables = {
  clients: "Client has instructions",
  leads_pics: "PIC is used in instructions",
};
const masterSchema = z.object({ table: z.enum(["clients", "leads_pics"]), id });

export const setMasterActive = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => masterSchema.extend({ active: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const { updateRow } = await import("@/server/rows.server");
    await updateRow(data.table, data.id, { active: data.active });
    return { ok: true };
  });

export const deleteMaster = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => masterSchema.parse(d))
  .handler(async ({ data }) => {
    const { deleteRow } = await import("@/server/rows.server");
    try {
      await deleteRow(data.table, data.id);
    } catch (error) {
      if (isReferenceError(error))
        throw new Error(`${masterTables[data.table]} — set it inactive instead.`);
      throw error;
    }
    return { ok: true };
  });

const instructionSchema = z.object({
  id: id.optional(),
  client_id: id,
  project_site: z.string().trim().min(1).max(500),
  quotation_ref: optional(200),
  email_to: z.string().trim().min(1).max(2000),
  attention_to: optional(200),
  email_cc: optional(2000),
  invoice_cycle: z.enum(["daily", "weekly", "bi_weekly", "monthly"]),
  delivery_mode: z.enum(["portal", "hard_copy", "email_einvoice"]),
  credit_limit: optional(20),
  leads_pic_id: id,
  payment_pic_name: optional(200),
  payment_pic_email: optional(320),
  payment_pic_phone: optional(50),
  invoice_note: z.string().trim().min(30, "Invoice instructions must be at least 30 characters"),
  notes: optional(100_000),
  active: z.boolean(),
});

export const saveInstruction = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => instructionSchema.parse(d))
  .handler(async ({ data: { id, ...row } }) => {
    const { insertRow, updateRow } = await import("@/server/rows.server");
    if (id) await updateRow("invoice_instructions", id, row, "updated_at = SYSUTCDATETIME()");
    else await insertRow("invoice_instructions", row);
    return { ok: true };
  });

export const deleteInstruction = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ id }).parse(d))
  .handler(async ({ data }) => {
    const { deleteRow } = await import("@/server/rows.server");
    await deleteRow("invoice_instructions", data.id);
    return { ok: true };
  });
