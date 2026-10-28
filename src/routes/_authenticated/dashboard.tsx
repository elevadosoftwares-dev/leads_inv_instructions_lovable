import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Plus } from "lucide-react";
import { listInstructions } from "@/lib/inv.functions";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cycleLabel, modeLabel } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Invoice Instructions" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { isAdmin } = useAuth();
  const [q, setQ] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["instructions"],
    queryFn: () => listInstructions(),
  });

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return data.filter((r) => {
      if (!s) return true;
      return [
        r.clients?.client_name,
        r.project_site,
        r.quotation_ref,
        r.email_to,
        r.email_cc,
        r.leads_pics?.name,
        r.payment_pic_name,
        r.notes,
      ].some((v) => v?.toLowerCase().includes(s));
    });
  }, [data, q]);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Invoice instructions</h1>
          <p className="mt-1 text-sm text-muted-foreground">{data.length} instructions on file</p>
        </div>
        {isAdmin && (
          <Button asChild>
            <Link to="/instructions/new">
              <Plus className="h-4 w-4" />
              New instruction
            </Link>
          </Button>
        )}
      </div>

      <div className="relative mb-4 max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="bg-card pl-9"
          placeholder="Search client, project, quotation, email, PIC…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Project / Site</TableHead>
              <TableHead>Cycle</TableHead>
              <TableHead>Delivery</TableHead>
              <TableHead>Send to</TableHead>
              <TableHead>Leads PIC</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No instructions found.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id} className="cursor-pointer">
                <TableCell className="font-medium">
                  <Link
                    to="/instructions/$id"
                    params={{ id: r.id }}
                    className="hover:text-primary hover:underline"
                  >
                    {r.clients?.client_name}
                  </Link>
                  {r.quotation_ref && (
                    <div className="text-xs text-muted-foreground">{r.quotation_ref}</div>
                  )}
                </TableCell>
                <TableCell>{r.project_site}</TableCell>
                <TableCell>{cycleLabel(r.invoice_cycle)}</TableCell>
                <TableCell>{modeLabel(r.delivery_mode)}</TableCell>
                <TableCell className="max-w-[220px] truncate text-xs">{r.email_to}</TableCell>
                <TableCell>{r.leads_pics?.name}</TableCell>
                <TableCell>
                  <Badge variant={r.active ? "default" : "secondary"}>
                    {r.active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
