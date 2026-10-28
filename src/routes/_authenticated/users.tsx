import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  createUser,
  deleteUser,
  listUsers,
  resetUserPassword,
  setUserRole,
} from "@/lib/users.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({ meta: [{ title: "Users — Invoice Instructions" }] }),
  component: UsersPage,
});

function UsersPage() {
  const { isAdmin, user } = useAuth();
  const qc = useQueryClient();
  const createFn = useServerFn(createUser);
  const deleteFn = useServerFn(deleteUser);
  const roleFn = useServerFn(setUserRole);
  const resetFn = useServerFn(resetUserPassword);
  const [f, setF] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "user" as "user" | "admin",
  });
  const [busy, setBusy] = useState(false);

  const { data = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => listUsers(),
    enabled: isAdmin,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["users"] });

  if (!isAdmin) return <p className="text-muted-foreground">Only admins can manage users.</p>;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createFn({ data: f });
      toast.success("User created");
      setF({ full_name: "", email: "", password: "", role: "user" });
      refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-semibold">Users</h1>
      <form
        onSubmit={add}
        className="mb-6 grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-[1fr_1fr_1fr_auto_auto]"
      >
        <Input
          placeholder="Full name"
          value={f.full_name}
          onChange={(e) => setF({ ...f, full_name: e.target.value })}
          required
          maxLength={100}
        />
        <Input
          type="email"
          placeholder="Email"
          value={f.email}
          onChange={(e) => setF({ ...f, email: e.target.value })}
          required
        />
        <Input
          type="password"
          placeholder="Temp password (min 8)"
          minLength={8}
          value={f.password}
          onChange={(e) => setF({ ...f, password: e.target.value })}
          required
        />
        <Select value={f.role} onValueChange={(v) => setF({ ...f, role: v as "user" | "admin" })}>
          <SelectTrigger className="md:w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" disabled={busy}>
          Add user
        </Button>
      </form>
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  {u.id === user?.id ? (
                    "Admin (you)"
                  ) : (
                    <Select
                      value={u.role}
                      onValueChange={async (v) => {
                        try {
                          await roleFn({ data: { userId: u.id, role: v as "user" | "admin" } });
                          refresh();
                        } catch (e) {
                          toast.error((e as Error).message);
                        }
                      }}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Reset password"
                    onClick={async () => {
                      const password = prompt(`New password for ${u.email} (min 8 characters)`);
                      if (!password) return;
                      try {
                        await resetFn({ data: { userId: u.id, password } });
                        toast.success("Password updated");
                      } catch (e) {
                        toast.error((e as Error).message);
                      }
                    }}
                  >
                    <KeyRound className="h-4 w-4" />
                  </Button>
                  {u.id !== user?.id && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={async () => {
                        if (!confirm(`Delete ${u.email}?`)) return;
                        try {
                          await deleteFn({ data: { userId: u.id } });
                          refresh();
                        } catch (e) {
                          toast.error((e as Error).message);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
