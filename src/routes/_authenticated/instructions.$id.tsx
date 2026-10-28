import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getInstruction } from "@/lib/inv.functions";
import { InstructionForm, type InstructionValues } from "@/components/InstructionForm";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/instructions/$id")({
  head: () => ({ meta: [{ title: "Instruction — Invoice Instructions" }] }),
  component: EditInstruction,
});

function EditInstruction() {
  const { id } = Route.useParams();
  const { isAdmin, loading } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["instruction", id],
    queryFn: () => getInstruction({ data: { id } }),
  });
  if (isLoading || loading) return <p className="text-muted-foreground">Loading…</p>;
  if (!data) return <p className="text-muted-foreground">Instruction not found.</p>;
  const initial: InstructionValues = {
    client_id: data.client_id,
    project_site: data.project_site,
    quotation_ref: data.quotation_ref ?? "",
    email_to: data.email_to,
    attention_to: data.attention_to ?? "",
    email_cc: data.email_cc ?? "",
    invoice_cycle: data.invoice_cycle,
    delivery_mode: data.delivery_mode,
    credit_limit: data.credit_limit ?? "",
    leads_pic_id: data.leads_pic_id,
    payment_pic_name: data.payment_pic_name ?? "",
    payment_pic_email: data.payment_pic_email ?? "",
    payment_pic_phone: data.payment_pic_phone ?? "",
    invoice_note: data.invoice_note ?? "",
    notes: data.notes ?? "",
    active: data.active,
  };
  return (
    <div>
      <h1 className="mb-6 text-3xl font-semibold">
        {isAdmin ? "Edit" : "View"} invoice instruction
      </h1>
      <InstructionForm key={id} id={id} initial={initial} readOnly={!isAdmin} />
    </div>
  );
}
