import { supabase } from "@/lib/supabase";
import type { ActivityLog, Paginated } from "@/types/models";

export interface ActivityParams {
  action?: string | null;
  resourceType?: string | null;
  page?: number;
  pageSize?: number;
}

export async function listActivity(params: ActivityParams = {}): Promise<Paginated<ActivityLog>> {
  const { action, resourceType, page = 1, pageSize = 20 } = params;
  let query = supabase.from("activity_logs").select("*", { count: "exact" });
  if (action) query = query.eq("action", action);
  if (resourceType) query = query.eq("resource_type", resourceType);

  const from = (page - 1) * pageSize;
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1)
    .returns<ActivityLog[]>();
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0, page, pageSize };
}

/** Records an administrator sign-in. Silently ignored for non-admins. */
export async function logAdminEvent(action: "auth.admin_signed_in" | "auth.admin_signed_out") {
  const { error } = await supabase.rpc("log_admin_event", { p_action: action });
  if (error && error.code !== "42501") throw error;
}
