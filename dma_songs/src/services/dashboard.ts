import { supabase } from "@/lib/supabase";
import type { DashboardStats } from "@/types/models";

/** One admin-only RPC instead of eight count queries from the browser. */
export async function getDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc("admin_dashboard_stats");
  if (error) throw error;
  return data as unknown as DashboardStats;
}
