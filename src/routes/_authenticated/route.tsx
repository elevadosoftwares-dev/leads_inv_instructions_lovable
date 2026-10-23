import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileText, LayoutDashboard, Building2, UserCircle, Users, LogOut, Plus, KeyRound } from "lucide-react";
import { getSession, signOut } from "@/lib/auth.functions";
import { authQueryKey, useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.fetchQuery({ queryKey: authQueryKey, queryFn: () => getSession() });
    if (!user) throw redirect({ to: "/auth" });
  },
  component: Layout,
});

function Layout() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const signOutFn = useServerFn(signOut);
  const items = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ...(isAdmin ? [{ to: "/instructions/new", label: "New instruction", icon: Plus }] : []),
    { to: "/clients", label: "Client master", icon: Building2 },
    { to: "/pics", label: "Leads PIC", icon: UserCircle },
    ...(isAdmin ? [{ to: "/users", label: "Users", icon: Users }] : []),
    { to: "/change-password", label: "Change password", icon: KeyRound },
  ] as const;

  async function logout() {
    await signOutFn();
    qc.clear();
    navigate({ to: "/auth" });
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col bg-gradient-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2 border-b border-sidebar-border px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-warm text-accent-foreground shadow-md"><FileText className="h-4 w-4" /></div>
          <span className="font-display text-sm font-semibold">Invoice Instructions</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {items.map((i) => (
            <Link key={i.to} to={i.to} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm opacity-80 hover:bg-sidebar-accent hover:opacity-100"
              activeProps={{ className: "bg-sidebar-accent !opacity-100 font-semibold" }} activeOptions={{ exact: true }}>
              <i.icon className="h-4 w-4" />{i.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-4 text-xs">
          <div className="truncate opacity-80">{user?.email}</div>
          <div className="mt-1 inline-block rounded bg-sidebar-accent px-2 py-0.5 uppercase tracking-wide">{isAdmin ? "Admin" : "User"}</div>
          <button onClick={logout}
            className="mt-3 flex items-center gap-2 opacity-80 hover:opacity-100"><LogOut className="h-3.5 w-3.5" />Sign out</button>
        </div>
      </aside>
      <div className="flex-1 min-w-0">
        <div className="flex gap-2 overflow-x-auto border-b bg-gradient-sidebar p-2 text-sidebar-foreground md:hidden">
          {items.map((i) => <Link key={i.to} to={i.to} className="whitespace-nowrap rounded px-3 py-1.5 text-xs" activeProps={{ className: "bg-sidebar-accent" }}>{i.label}</Link>)}
          <button className="whitespace-nowrap px-3 text-xs" onClick={logout}>Sign out</button>
        </div>
        <main className="mx-auto max-w-6xl p-6 md:p-10"><Outlet /></main>
      </div>
    </div>
  );
}
