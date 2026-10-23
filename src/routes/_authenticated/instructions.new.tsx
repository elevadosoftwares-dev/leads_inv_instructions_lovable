import { createFileRoute } from "@tanstack/react-router";
import { InstructionForm, emptyInstruction } from "@/components/InstructionForm";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/instructions/new")({
  head: () => ({ meta: [{ title: "New instruction — Invoice Instructions" }] }),
  component: NewInstruction,
});

function NewInstruction() {
  const { isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isAdmin) return <p className="text-muted-foreground">Only admins can add instructions.</p>;
  return (
    <div>
      <h1 className="mb-6 text-3xl font-semibold">New invoice instruction</h1>
      <InstructionForm initial={emptyInstruction} />
    </div>
  );
}
