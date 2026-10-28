import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { changePassword } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Invoice Instructions" },
      {
        name: "description",
        content: "Choose a new password for your Invoice Instructions account.",
      },
      { property: "og:title", content: "Reset password — Invoice Instructions" },
      { property: "og:description", content: "Choose a new password for your account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await changePassword({ data: { password } });
    } catch (err) {
      toast.error((err as Error).message);
      return;
    } finally {
      setBusy(false);
    }
    toast.success("Password updated");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-xl bg-card p-8 shadow-2xl"
      >
        <h1 className="text-lg font-semibold">Set a new password</h1>
        <div className="space-y-1.5">
          <Label>New password</Label>
          <Input
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          Update password
        </Button>
      </form>
    </div>
  );
}
