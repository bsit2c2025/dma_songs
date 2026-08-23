import { supabase } from "@/lib/supabase";
import type { VoiceChangeRequest, VoiceChangeRequestStatus } from "@/types/models";

const SELECT = `
  *,
  requested:voice_classifications!voice_change_requests_requested_voice_id_fkey ( * ),
  current:voice_classifications!voice_change_requests_current_voice_id_fkey ( * ),
  profile:profiles!voice_change_requests_user_id_fkey ( id, display_name, email, avatar_url )
`;

/** The signed-in member's own pending request, if they have one. */
export async function getMyPendingRequest(userId: string): Promise<VoiceChangeRequest | null> {
  const { data, error } = await supabase
    .from("voice_change_requests")
    .select(SELECT)
    .eq("user_id", userId)
    .eq("status", "pending")
    .maybeSingle()
    .returns<VoiceChangeRequest | null>();
  if (error) throw error;
  return data ?? null;
}

/** Everything the member has ever asked for, newest first. */
export async function listMyRequests(userId: string): Promise<VoiceChangeRequest[]> {
  const { data, error } = await supabase
    .from("voice_change_requests")
    .select(SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10)
    .returns<VoiceChangeRequest[]>();
  if (error) throw error;
  return data ?? [];
}

export async function listVoiceRequests(params: {
  status?: VoiceChangeRequestStatus | "all";
  page?: number;
  pageSize?: number;
}): Promise<{ rows: VoiceChangeRequest[]; total: number }> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const from = (page - 1) * pageSize;

  let query = supabase
    .from("voice_change_requests")
    .select(SELECT, { count: "exact" })
    .order("status", { ascending: true }) // pending sorts first
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (params.status && params.status !== "all") query = query.eq("status", params.status);

  const { data, error, count } = await query.returns<VoiceChangeRequest[]>();
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}

/**
 * Ask for a different voice part.
 *
 * Returns the new request id, or null when the database applied the change
 * outright — which happens on a member's first ever choice, since there is
 * nothing to approve. The rule lives in the function, not here.
 */
export async function requestVoiceChange(voiceClassificationId: string, note?: string) {
  const { data, error } = await supabase.rpc("request_voice_change", {
    p_voice_classification_id: voiceClassificationId,
    p_note: note ?? null,
  });
  if (error) throw error;
  return (data as string | null) ?? null;
}

export async function cancelVoiceChangeRequest(requestId: string) {
  const { error } = await supabase.rpc("cancel_voice_change_request", { p_request_id: requestId });
  if (error) throw error;
}

export async function decideVoiceChange(requestId: string, approve: boolean, note?: string) {
  const { error } = await supabase.rpc("admin_decide_voice_change", {
    p_request_id: requestId,
    p_approve: approve,
    p_note: note ?? null,
  });
  if (error) throw error;
}

export async function pendingVoiceRequestCount(): Promise<number> {
  const { data, error } = await supabase.rpc("pending_voice_request_count");
  if (error) throw error;
  return (data as number) ?? 0;
}
