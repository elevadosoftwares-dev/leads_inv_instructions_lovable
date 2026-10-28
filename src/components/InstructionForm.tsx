import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  deleteInstruction,
  listClients,
  listPics,
  saveInstruction,
  type Instruction,
} from "@/lib/inv.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CREDIT_LIMITS, CYCLES, MODES } from "@/lib/constants";

export type InstructionValues = {
  client_id: string;
  project_site: string;
  quotation_ref: string;
  email_to: string;
  attention_to: string;
  email_cc: string;
  invoice_cycle: string;
  delivery_mode: string;
  credit_limit: string;
  leads_pic_id: string;
  payment_pic_name: string;
  payment_pic_email: string;
  payment_pic_phone: string;
  invoice_note: string;
  notes: string;
  active: boolean;
};

export const emptyInstruction: InstructionValues = {
  client_id: "",
  project_site: "",
  quotation_ref: "",
  email_to: "",
  attention_to: "",
  email_cc: "",
  invoice_cycle: "",
  delivery_mode: "",
  credit_limit: "",
  leads_pic_id: "",
  payment_pic_name: "",
  payment_pic_email: "",
  payment_pic_phone: "",
  invoice_note: "",
  notes: "",
  active: true,
};

const emailList = (v: string) =>
  v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .every((e) => z.string().email().safeParse(e).success);

const TONES: Record<string, { bar: string; text: string }> = {
  "Client & Project / Site": { bar: "bg-tone-1", text: "text-tone-1" },
  "Invoice email": { bar: "bg-tone-2", text: "text-tone-2" },
  "Invoice details": { bar: "bg-tone-3", text: "text-tone-3" },
  "Client payment PIC": { bar: "bg-tone-4", text: "text-tone-4" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const t = TONES[title] ?? { bar: "bg-tone-1", text: "text-tone-1" };
  return (
    <section className="relative overflow-hidden rounded-xl border bg-card p-6 pl-7">
      <span className={`absolute inset-y-0 left-0 w-1.5 ${t.bar}`} />
      <h2 className={`mb-4 text-xs font-bold uppercase tracking-widest ${t.text}`}>{title}</h2>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

export function InstructionForm({
  id,
  initial,
  readOnly,
}: {
  id?: string;
  initial: InstructionValues;
  readOnly?: boolean;
}) {
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const set = <K extends keyof InstructionValues>(k: K, val: InstructionValues[K]) =>
    setV((p) => ({ ...p, [k]: val }));

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => listClients(),
  });
  const { data: pics = [] } = useQuery({
    queryKey: ["pics"],
    queryFn: () => listPics(),
  });
  const selectedClient = clients.find((c) => c.id === v.client_id);

  async function save(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (
      !v.client_id ||
      !v.project_site.trim() ||
      !v.invoice_cycle ||
      !v.delivery_mode ||
      !v.leads_pic_id ||
      !v.email_to.trim()
    ) {
      toast.error("Please fill all required fields");
      return;
    }
    if (!emailList(v.email_to) || (v.email_cc && !emailList(v.email_cc))) {
      toast.error("Check the email addresses");
      return;
    }
    if (v.payment_pic_email && !z.string().email().safeParse(v.payment_pic_email).success) {
      toast.error("Invalid payment PIC email");
      return;
    }
    if (v.invoice_note.trim().length < 30) {
      toast.error("Invoice instructions must be at least 30 characters");
      return;
    }
    setBusy(true);
    const payload = {
      ...v,
      invoice_cycle: v.invoice_cycle as Instruction["invoice_cycle"],
      delivery_mode: v.delivery_mode as Instruction["delivery_mode"],
      quotation_ref: v.quotation_ref || null,
      attention_to: v.attention_to || null,
      email_cc: v.email_cc || null,
      credit_limit: v.credit_limit || null,
      payment_pic_name: v.payment_pic_name || null,
      payment_pic_email: v.payment_pic_email || null,
      payment_pic_phone: v.payment_pic_phone || null,
      invoice_note: v.invoice_note.trim(),
      notes: v.notes || null,
    };
    try {
      await saveInstruction({ data: { ...payload, id } });
    } catch (err) {
      toast.error((err as Error).message);
      return;
    } finally {
      setBusy(false);
    }
    toast.success("Instruction saved");
    qc.invalidateQueries({ queryKey: ["instructions"] });
    navigate({ to: "/dashboard" });
  }

  async function remove(): Promise<void> {
    if (!id || !confirm("Delete this instruction?")) return;
    try {
      await deleteInstruction({ data: { id } });
    } catch (err) {
      toast.error((err as Error).message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["instructions"] });
    navigate({ to: "/dashboard" });
  }

  const ro = !!readOnly;
  return (
    <form onSubmit={save} className="space-y-5">
      <fieldset disabled={ro} className="space-y-5">
        <Section title="Client & Project / Site">
          <div className="space-y-1.5">
            <Label>Client name *</Label>
            <Select
              value={v.client_id}
              onValueChange={(val) => {
                const c = clients.find((x) => x.id === val);
                setV((p) => ({
                  ...p,
                  client_id: val,
                  project_site:
                    p.project_site || [c?.project_name, c?.site_name].filter(Boolean).join(" / "),
                }));
              }}
              disabled={ro}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients
                  .filter((c) => c.active || c.id === v.client_id)
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.client_name}
                      {c.site_name ? ` — ${c.site_name}` : ""}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {selectedClient && (
              <p className="text-xs text-muted-foreground">
                Site: {selectedClient.site_name || "—"} · Project:{" "}
                {selectedClient.project_name || "—"}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Project / Site name *</Label>
            <Input
              value={v.project_site}
              onChange={(e) => set("project_site", e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Quotation ref.</Label>
            <Input
              placeholder="e.g. Q22-076"
              value={v.quotation_ref}
              onChange={(e) => set("quotation_ref", e.target.value)}
              maxLength={50}
            />
          </div>
        </Section>

        <Section title="Invoice email">
          <div className="space-y-1.5">
            <Label>Send email to *</Label>
            <Input
              placeholder="accounts@client.com, finance@client.com"
              value={v.email_to}
              onChange={(e) => set("email_to", e.target.value)}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">
              Multiple emails: separate with comma (,)
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Attention to :</Label>
            <Input
              placeholder="e.g. Ms. Jane Lee"
              value={v.attention_to}
              onChange={(e) => set("attention_to", e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="space-y-1.5">
            <Label>CC to</Label>
            <Input
              placeholder="manager@client.com"
              value={v.email_cc}
              onChange={(e) => set("email_cc", e.target.value)}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">
              Multiple emails: separate with comma (,)
            </p>
          </div>
        </Section>

        <Section title="Invoice details">
          <div className="space-y-1.5">
            <Label>Invoice cycle *</Label>
            <Select
              value={v.invoice_cycle}
              onValueChange={(val) => set("invoice_cycle", val)}
              disabled={ro}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select invoice cycle" />
              </SelectTrigger>
              <SelectContent>
                {CYCLES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Delivery mode *</Label>
            <Select
              value={v.delivery_mode}
              onValueChange={(val) => set("delivery_mode", val)}
              disabled={ro}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select delivery mode" />
              </SelectTrigger>
              <SelectContent>
                {MODES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Credit Limit</Label>
            <Select
              value={v.credit_limit}
              onValueChange={(val) => set("credit_limit", val)}
              disabled={ro}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select credit limit" />
              </SelectTrigger>
              <SelectContent>
                {CREDIT_LIMITS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Leads PIC *</Label>
            <Select
              value={v.leads_pic_id}
              onValueChange={(val) => set("leads_pic_id", val)}
              disabled={ro}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Leads PIC" />
              </SelectTrigger>
              <SelectContent>
                {pics
                  .filter((p) => p.active || p.id === v.leads_pic_id)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </Section>

        <Section title="Client payment PIC">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={v.payment_pic_name}
              onChange={(e) => set("payment_pic_name", e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              value={v.payment_pic_email}
              onChange={(e) => set("payment_pic_email", e.target.value)}
              maxLength={255}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input
              value={v.payment_pic_phone}
              onChange={(e) => set("payment_pic_phone", e.target.value)}
              maxLength={30}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Invoice instructions *</Label>
            <Input
              placeholder="At least 30 characters"
              value={v.invoice_note}
              onChange={(e) => set("invoice_note", e.target.value)}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">Required: minimum 30 characters</p>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Special instructions / notes</Label>
            <Textarea
              rows={4}
              placeholder="e.g. Must enter PO Number in Invoice / Submit Invoice + Report / SOA send to ..."
              value={v.notes}
              onChange={(e) => set("notes", e.target.value)}
              maxLength={2000}
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={v.active} onCheckedChange={(c) => set("active", c)} disabled={ro} />
            <Label>{v.active ? "Active" : "Inactive"}</Label>
          </div>
        </Section>
      </fieldset>

      <div className="flex justify-between gap-2">
        <div>
          {id && !ro && (
            <Button type="button" variant="destructive" onClick={remove}>
              Delete
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/dashboard" })}>
            {ro ? "Back" : "Cancel"}
          </Button>
          {!ro && (
            <Button type="submit" disabled={busy}>
              Save
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
