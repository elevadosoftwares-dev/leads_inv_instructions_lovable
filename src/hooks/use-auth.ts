import { queryOptions, useQuery } from "@tanstack/react-query";
import { getSession } from "@/lib/auth.functions";

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: () => getSession(),
});

export function useAuth() {
  const q = useQuery(meQuery);
  const me = q.data ?? null;
  return {
    user: me ? { id: me.id, email: me.email } : null,
    isAdmin: me?.role === "admin",
    loading: q.isLoading,
  };
}
