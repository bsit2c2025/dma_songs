import { supabase } from "@/lib/supabase";
import type { VoiceFamily } from "@/types/database";

/**
 * Finish the welcome flow.
 *
 * `unsure` is a first-class answer, not a skip. Most people who have never
 * been auditioned genuinely do not know whether they are an alto or a second
 * soprano, and making them guess produces a wrong entry that then needs an
 * administrator's approval to undo.
 */
export async function completeOnboarding(params: {
  displayName?: string | null;
  family?: VoiceFamily | null;
  unsure?: boolean;
}) {
  const { error } = await supabase.rpc("complete_onboarding", {
    p_display_name: params.displayName ?? null,
    p_family: params.family ?? null,
    p_unsure: params.unsure ?? false,
  });
  if (error) throw error;
}

export async function adminAssignVoicePart(userId: string, voiceClassificationId: string) {
  const { error } = await supabase.rpc("admin_assign_voice_part", {
    p_user_id: userId,
    p_voice_classification_id: voiceClassificationId,
  });
  if (error) throw error;
}

export async function awaitingVoiceAssignmentCount(): Promise<number> {
  const { data, error } = await supabase.rpc("awaiting_voice_assignment_count");
  if (error) throw error;
  return (data as number) ?? 0;
}
