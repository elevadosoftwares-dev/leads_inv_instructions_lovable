import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { signIn, signUp } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Invoice Instructions" },
      { name: "description", content: "Sign in to manage invoice instructions." },
      { property: "og:title", content: "Sign in — Invoice Instructions" },
      { property: "og:description", content: "Sign in to manage invoice instructions." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") await signUp({ data: { email, password, fullName: name } });
      await signIn({ data: { email, password } });
      qc.clear();
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar px-4">
      <div className="w-full max-w-sm rounded-xl bg-card p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Invoice Instructions</h1>
            <p className="text-xs text-muted-foreground">
              {mode === "in" ? "Sign in to continue" : "Create an account"}
            </p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {mode === "up" && (
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Password</Label>
            <Input
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {mode === "in" ? "Sign in" : "Sign up"}
          </Button>
        </form>
        <button
          className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setMode(mode === "in" ? "up" : "in")}
        >
          {mode === "in" ? "No account? Sign up" : "Have an account? Sign in"}
        </button>
        {mode === "in" && (
          <button
            className="mt-2 w-full text-center text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              toast.info("Ask an administrator to reset your password from the Users page.");
            }}
          >
            Forgot password?
          </button>
        )}
      </div>
    </div>
  );
}
