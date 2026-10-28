import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { addClient, deleteMaster, listClients, setMasterActive } from "@/lib/inv.functions";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/clients")({
  head: () => ({ meta: [{ title: "Client master — Invoice Instructions" }] }),
  component: Clients,
});

function Clients() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [f, setF] = useState({ client_name: "", site_name: "", project_name: "" });
  const [q, setQ] = useState("");
  const { data = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => listClients(),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["clients"] });

  async function add(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!f.client_name.trim()) {
      toast.error("Client name is required");
      return;
    }
    try {
      await addClient({
        data: {
          client_name: f.client_name.trim(),
          site_name: f.site_name.trim() || null,
          project_name: f.project_name.trim() || null,
        },
      });
    } catch (err) {
      toast.error((err as Error).message);
      return;
    }
    setF({ client_name: "", site_name: "", project_name: "" });
    toast.success("Client added");
    refresh();
  }
  async function toggle(id: string, active: boolean) {
    try {
      await setMasterActive({ data: { table: "clients", id, active } });
      refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }
  async function del(id: string) {
    if (!confirm("Delete this client?")) return;
    try {
      await deleteMaster({ data: { table: "clients", id } });
      refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }
  const rows = data.filter((c) =>
    [c.client_name, c.site_name, c.project_name].some((v) =>
      v?.toLowerCase().includes(q.toLowerCase()),
    ),
  );

  return (
    <div>
      <h1 className="mb-6 text-3xl font-semibold">Client master</h1>
      {isAdmin && (
        <form
          onSubmit={add}
          className="mb-6 grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-[1fr_1fr_1fr_auto]"
        >
          <Input
            placeholder="Client name *"
            value={f.client_name}
            onChange={(e) => setF({ ...f, client_name: e.target.value })}
            maxLength={200}
          />
          <Input
            placeholder="Site name"
            value={f.site_name}
            onChange={(e) => setF({ ...f, site_name: e.target.value })}
            maxLength={200}
          />
          <Input
            placeholder="Project name"
            value={f.project_name}
            onChange={(e) => setF({ ...f, project_name: e.target.value })}
            maxLength={200}
          />
          <Button type="submit">Add client</Button>
        </form>
      )}
      <Input
        className="mb-4 max-w-sm bg-card"
        placeholder="Search clients…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client name</TableHead>
              <TableHead>Site name</TableHead>
              <TableHead>Project name</TableHead>
              <TableHead>Active</TableHead>
              {isAdmin && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No clients yet.
                </TableCell>
              </TableRow>
            )}
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.client_name}</TableCell>
                <TableCell>{c.site_name}</TableCell>
                <TableCell>{c.project_name}</TableCell>
                <TableCell>
                  {isAdmin ? (
                    <Switch checked={c.active} onCheckedChange={(v) => toggle(c.id, v)} />
                  ) : c.active ? (
                    "Active"
                  ) : (
                    "Inactive"
                  )}
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => del(c.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
