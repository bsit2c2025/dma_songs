import { supabase } from "@/lib/supabase";
import type { AppRole } from "@/types/database";
import type { MemberSummary, Paginated, Profile, VoiceClassification } from "@/types/models";

interface MemberQueryRow extends Profile {
  voice_classifications: VoiceClassification | null;
  user_roles: Array<{ role: AppRole }> | null;
}

const MEMBER_COLUMNS = `
  id, display_name, email, avatar_url, voice_classification_id, is_active,
  last_seen_at, created_at, updated_at,
  voice_classifications ( * ),
  user_roles ( role )
`;

export interface MemberListParams {
  search?: string;
  voiceClassificationId?: string | null;
  role?: AppRole | "all";
  page?: number;
  pageSize?: number;
}

export async function listMembers(params: MemberListParams = {}): Promise<Paginated<MemberSummary>> {
  const { search, voiceClassificationId, role = "all", page = 1, pageSize = 20 } = params;

  const columns =
    role === "all" ? MEMBER_COLUMNS : `${MEMBER_COLUMNS}, role_filter:user_roles!inner ( role )`;

  let query = supabase.from("profiles").select(columns, { count: "exact" });
  if (voiceClassificationId) query = query.eq("voice_classification_id", voiceClassificationId);
  if (role !== "all") query = query.eq("role_filter.role", role);
  if (search?.trim()) {
    const term = search.trim().replace(/[%,()]/g, " ");
    query = query.or(`display_name.ilike.%${term}%,email.ilike.%${term}%`);
  }

  const from = (page - 1) * pageSize;
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1)
    .returns<MemberQueryRow[]>();

  if (error) throw error;

  const rows: MemberSummary[] = (data ?? []).map((row) => {
    const { voice_classifications, user_roles, ...profile } = row;
    return {
      ...profile,
      voiceClassification: voice_classifications,
      roles: (user_roles ?? []).map((r) => r.role),
    };
  });

  return { rows, total: count ?? 0, page, pageSize };
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*, voice_classifications ( * )")
    .eq("id", userId)
    .maybeSingle()
    .returns<(Profile & { voice_classifications: VoiceClassification | null }) | null>();
  if (error) throw error;
  return data;
}

export async function updateOwnProfile(
  userId: string,
  values: {
    display_name?: string;
    voice_classification_id?: string | null;
    avatar_url?: string | null;
    prefers_own_part?: boolean;
  },
) {
  const { data, error } = await supabase
    .from("profiles")
    .update(values)
    .eq("id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return data as Profile;
}

/** Admin edit of another member's profile. RLS restricts this to admins. */
export async function updateMemberProfile(
  userId: string,
  patch: { display_name?: string },
) {
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw error;
}

export async function setMemberVoiceClassification(userId: string, voiceClassificationId: string | null) {
  const { error } = await supabase
    .from("profiles")
    .update({ voice_classification_id: voiceClassificationId })
    .eq("id", userId);
  if (error) throw error;
}

export async function setMemberActive(userId: string, isActive: boolean) {
  const { error } = await supabase.from("profiles").update({ is_active: isActive }).eq("id", userId);
  if (error) throw error;
}

/** Grant or revoke the admin role. Blocked by RLS unless the caller is an admin. */
export async function setAdminRole(userId: string, makeAdmin: boolean) {
  if (makeAdmin) {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role", "admin");
  if (error) throw error;
}

/** Roles for the signed-in user. Used to decide what the UI offers, never as the security check. */
export async function getOwnRoles(userId: string): Promise<AppRole[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .returns<Array<{ role: AppRole }>>();
  if (error) throw error;
  return (data ?? []).map((r) => r.role);
}
