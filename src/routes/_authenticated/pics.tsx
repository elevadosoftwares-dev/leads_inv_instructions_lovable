import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { addPic, deleteMaster, listPics, setMasterActive } from "@/lib/inv.functions";
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

export const Route = createFileRoute("/_authenticated/pics")({
  head: () => ({ meta: [{ title: "Leads PIC — Invoice Instructions" }] }),
  component: Pics,
});

function Pics() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const { data = [] } = useQuery({
    queryKey: ["pics"],
    queryFn: () => listPics(),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["pics"] });

  async function add(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await addPic({ data: { name: name.trim() } });
    } catch (err) {
      toast.error((err as Error).message);
      return;
    }
    setName("");
    refresh();
  }
  async function toggle(id: string, active: boolean) {
    try {
      await setMasterActive({ data: { table: "leads_pics", id, active } });
      refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }
  async function del(id: string) {
    if (!confirm("Delete this PIC?")) return;
    try {
      await deleteMaster({ data: { table: "leads_pics", id } });
      refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-3xl font-semibold">Leads PIC</h1>
      {isAdmin && (
        <form onSubmit={add} className="mb-6 flex gap-3 rounded-lg border bg-card p-4">
          <Input
            placeholder="PIC name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
          />
          <Button type="submit">Add PIC</Button>
        </form>
      )}
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Active</TableHead>
              {isAdmin && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                  No PICs yet.
                </TableCell>
              </TableRow>
            )}
            {data.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>
                  {isAdmin ? (
                    <Switch checked={p.active} onCheckedChange={(v) => toggle(p.id, v)} />
                  ) : p.active ? (
                    "Active"
                  ) : (
                    "Inactive"
                  )}
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => del(p.id)}>
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
