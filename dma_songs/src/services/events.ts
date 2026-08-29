import { supabase } from "@/lib/supabase";
import type { Announcement } from "@/types/models";

export type AttendanceStatus = "going" | "not_going" | "maybe";

export interface AttendanceRow {
  announcement_id: string;
  user_id: string;
  status: AttendanceStatus;
  note: string | null;
  updated_at: string;
  profile: {
    id: string;
    display_name: string;
    email: string | null;
    avatar_url: string | null;
    voice_classification_id: string | null;
  } | null;
}

/** Events with a start date in the future, soonest first. */
export async function listUpcomingEvents(limit = 4): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("is_event", true)
    .eq("is_published", true)
    .gte("event_starts_at", new Date().toISOString())
    .order("event_starts_at", { ascending: true })
    .limit(limit)
    .returns<Announcement[]>();
  if (error) throw error;
  return (data ?? []).map((row) => ({ ...row, isLive: true }));
}

export async function listAttendance(announcementId: string): Promise<AttendanceRow[]> {
  const { data, error } = await supabase
    .from("event_attendance")
    .select(
      `*, profile:profiles!event_attendance_user_id_fkey (
         id, display_name, email, avatar_url, voice_classification_id
       )`,
    )
    .eq("announcement_id", announcementId)
    .returns<AttendanceRow[]>();
  if (error) throw error;
  return data ?? [];
}

export async function getMyAttendance(
  announcementId: string,
  userId: string,
): Promise<AttendanceRow | null> {
  const { data, error } = await supabase
    .from("event_attendance")
    .select("*")
    .eq("announcement_id", announcementId)
    .eq("user_id", userId)
    .maybeSingle()
    .returns<AttendanceRow | null>();
  if (error) throw error;
  return data ?? null;
}

export async function setMyAttendance(
  announcementId: string,
  userId: string,
  status: AttendanceStatus,
  note?: string | null,
) {
  const { error } = await supabase.from("event_attendance").upsert(
    {
      announcement_id: announcementId,
      user_id: userId,
      status,
      note: note?.trim() || null,
    },
    { onConflict: "announcement_id,user_id" },
  );
  if (error) throw error;
}

export async function attendanceSummary(announcementId: string) {
  const { data, error } = await supabase.rpc("event_attendance_summary", {
    p_announcement_id: announcementId,
  });
  if (error) throw error;
  return (data ?? { going: 0, not_going: 0, maybe: 0, total: 0 }) as {
    going: number;
    not_going: number;
    maybe: number;
    total: number;
  };
}
