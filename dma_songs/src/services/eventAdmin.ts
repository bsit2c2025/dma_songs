import { supabase } from "@/lib/supabase";
import type { AttendanceStatus } from "@/services/events";

export interface AdminEventRow {
  id: string;
  title: string;
  event_starts_at: string | null;
  event_ends_at: string | null;
  venue: string | null;
  dress_code: string | null;
  is_published: boolean;
  collect_rsvp: boolean;
  rsvp_deadline: string | null;
  going: number;
  maybe: number;
  not_going: number;
  guests: number;
  no_reply: number;
}

export interface NonResponder {
  id: string;
  display_name: string;
  email: string | null;
  avatar_url: string | null;
  voice_classification_id: string | null;
}

export interface EventGuest {
  id: string;
  announcement_id: string;
  name: string;
  role: string | null;
  voice_classification_id: string | null;
  status: AttendanceStatus;
  note: string | null;
  created_at: string;
}

export async function listAdminEvents(includePast = false): Promise<AdminEventRow[]> {
  const { data, error } = await supabase.rpc("admin_event_list", { p_include_past: includePast });
  if (error) throw error;
  return (data as unknown as AdminEventRow[]) ?? [];
}

/** Approved members with no reply on record — the list worth chasing. */
export async function listNonResponders(announcementId: string): Promise<NonResponder[]> {
  const { data, error } = await supabase.rpc("event_non_responders", {
    p_announcement_id: announcementId,
  });
  if (error) throw error;
  return (data as unknown as NonResponder[]) ?? [];
}

/**
 * Record a reply on a member's behalf — someone who said yes at rehearsal, or
 * texted their section leader. The row remembers an administrator set it, so
 * the two never get confused when the list is read back.
 */
export async function adminSetAttendance(
  announcementId: string,
  userId: string,
  status: AttendanceStatus,
  note?: string,
) {
  const { error } = await supabase.rpc("admin_set_attendance", {
    p_announcement_id: announcementId,
    p_user_id: userId,
    p_status: status,
    p_note: note ?? null,
  });
  if (error) throw error;
}

/** Hand the reply back to the member. */
export async function adminClearAttendance(announcementId: string, userId: string) {
  const { error } = await supabase.rpc("admin_clear_attendance", {
    p_announcement_id: announcementId,
    p_user_id: userId,
  });
  if (error) throw error;
}

export async function listEventGuests(announcementId: string): Promise<EventGuest[]> {
  const { data, error } = await supabase
    .from("event_guests")
    .select("*")
    .eq("announcement_id", announcementId)
    .order("created_at", { ascending: true })
    .returns<EventGuest[]>();
  if (error) throw error;
  return data ?? [];
}

export async function addEventGuest(guest: {
  announcement_id: string;
  name: string;
  role?: string | null;
  voice_classification_id?: string | null;
  note?: string | null;
}) {
  const { error } = await supabase.from("event_guests").insert(guest);
  if (error) throw error;
}

export async function removeEventGuest(id: string) {
  const { error } = await supabase.from("event_guests").delete().eq("id", id);
  if (error) throw error;
}
