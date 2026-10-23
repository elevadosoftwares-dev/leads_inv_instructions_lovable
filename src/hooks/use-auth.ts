import { useQuery } from "@tanstack/react-query";
import { getSession } from "@/lib/auth.functions";

export const authQueryKey = ["me"] as const;

export function useAuth() {
  const q = useQuery({ queryKey: authQueryKey, queryFn: () => getSession() });
  const user = q.data ?? null;
  return { user, isAdmin: user?.isAdmin ?? false, loading: q.isLoading };
}
