import { supabase } from "@/lib/supabase";
import type { MemberSummary } from "@/types/models";

/** Accounts that have signed up but not yet been let in. */
export async function listPendingMembers(): Promise<MemberSummary[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*, voiceClassification:voice_classifications ( * )")
    .is("approved_at", null)
    .is("rejected_at", null)
    .is("anonymized_at", null)
    .order("created_at", { ascending: true })
    .returns<MemberSummary[]>();
  if (error) throw error;
  return (data ?? []).map((row) => ({ ...row, roles: [] }));
}

export async function setMemberApproval(userId: string, approve: boolean, note?: string) {
  const { error } = await supabase.rpc("admin_set_member_approval", {
    p_user_id: userId,
    p_approve: approve,
    p_note: note ?? null,
  });
  if (error) throw error;
}

export async function pendingMemberCount(): Promise<number> {
  const { data, error } = await supabase.rpc("pending_member_count");
  if (error) throw error;
  return (data as number) ?? 0;
}

export async function isSuperAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("super_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

/** Every protected account, so the members table can mark them. */
export async function listSuperAdminIds(): Promise<string[]> {
  const { data, error } = await supabase.from("super_admins").select("user_id");
  if (error) throw error;
  return (data ?? []).map((row) => row.user_id as string);
}
