import { supabase } from "@/lib/supabase";

export type BulkAction =
  | "set_category"
  | "enable"
  | "disable"
  | "delete"
  | "add_part"
  | "remove_part";

/**
 * One statement per action rather than one request per song, and a single
 * audit entry recording the batch instead of fifty separate ones.
 */
export async function bulkSongAction(
  songIds: string[],
  action: BulkAction,
  value?: string | null,
): Promise<number> {
  const { data, error } = await supabase.rpc("admin_bulk_song_action", {
    p_song_ids: songIds,
    p_action: action,
    p_value: value ?? null,
  });
  if (error) throw error;
  return (data as number) ?? 0;
}
