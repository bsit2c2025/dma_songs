import { supabase } from "@/lib/supabase";
import type { VoiceClassification } from "@/types/models";
import type { VoiceClassificationFormOutput } from "@/schemas/voiceClassification";

export async function listVoiceClassifications(includeInactive = false) {
  let query = supabase
    .from("voice_classifications")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (!includeInactive) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as VoiceClassification[];
}

export async function createVoiceClassification(values: VoiceClassificationFormOutput) {
  const { data, error } = await supabase
    .from("voice_classifications")
    .insert({
      name: values.name,
      short_code: values.shortCode,
      description: values.description,
      color: values.color,
      sort_order: values.sortOrder,
      is_active: values.isActive,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as VoiceClassification;
}

export async function updateVoiceClassification(id: string, values: VoiceClassificationFormOutput) {
  const { data, error } = await supabase
    .from("voice_classifications")
    .update({
      name: values.name,
      short_code: values.shortCode,
      description: values.description,
      color: values.color,
      sort_order: values.sortOrder,
      is_active: values.isActive,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as VoiceClassification;
}

/**
 * Deletion is blocked by a database trigger while songs or members still use
 * the part. The friendly message the trigger raises is shown to the admin.
 */
export async function deleteVoiceClassification(id: string) {
  const { error } = await supabase.from("voice_classifications").delete().eq("id", id);
  if (error) throw error;
}

export async function voicePartUsage(id: string) {
  const [songs, members] = await Promise.all([
    supabase
      .from("song_voice_classifications")
      .select("song_id", { count: "exact", head: true })
      .eq("voice_classification_id", id),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("voice_classification_id", id),
  ]);
  if (songs.error) throw songs.error;
  if (members.error) throw members.error;
  return { songs: songs.count ?? 0, members: members.count ?? 0 };
}
