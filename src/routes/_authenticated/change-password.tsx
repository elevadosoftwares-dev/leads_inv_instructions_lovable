import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { changePassword } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/change-password")({
  head: () => ({ meta: [{ title: "Change password — Invoice Instructions" }] }),
  component: ChangePasswordPage,
});

function ChangePasswordPage() {
  const navigate = useNavigate();
  const changeFn = useServerFn(changePassword);
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await changeFn({ data: { currentPassword, newPassword } });
      toast.success("Password updated");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-sm">
      <h1 className="mb-6 text-3xl font-semibold">Change password</h1>
      <form onSubmit={submit} className="space-y-4 rounded-lg border bg-card p-6">
        <div className="space-y-1.5"><Label>Current password</Label>
          <Input type="password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} required /></div>
        <div className="space-y-1.5"><Label>New password</Label>
          <Input type="password" minLength={8} value={newPassword} onChange={(e) => setNew(e.target.value)} required /></div>
        <Button type="submit" className="w-full" disabled={busy}>Update password</Button>
      </form>
    </div>
  );
}
