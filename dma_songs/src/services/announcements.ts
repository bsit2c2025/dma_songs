import { supabase } from "@/lib/supabase";
import type { Announcement, AnnouncementRow, Paginated } from "@/types/models";
import type { AnnouncementFormOutput } from "@/schemas/announcement";

function decorate(row: AnnouncementRow): Announcement {
  const now = Date.now();
  const started = !row.starts_at || new Date(row.starts_at).getTime() <= now;
  const notEnded = !row.ends_at || new Date(row.ends_at).getTime() >= now;
  return { ...row, isLive: row.is_published && started && notEnded };
}

/**
 * Public feed. The date-window and published filters are repeated here for a
 * smaller payload, but the real gate is the RLS policy — an unpublished
 * announcement is not returned even if this filter were removed.
 */
export async function listLiveAnnouncements(limit?: number) {
  const nowIso = new Date().toISOString();
  let query = supabase
    .from("announcements")
    .select("*")
    .eq("is_published", true)
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
    .order("is_pinned", { ascending: false })
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  if (limit) query = query.limit(limit);

  const { data, error } = await query.returns<AnnouncementRow[]>();
  if (error) throw error;
  return (data ?? []).map(decorate);
}

export interface AnnouncementListParams {
  search?: string;
  status?: "all" | "published" | "draft";
  page?: number;
  pageSize?: number;
}

export async function listAnnouncementsForAdmin(
  params: AnnouncementListParams = {},
): Promise<Paginated<Announcement>> {
  const { search, status = "all", page = 1, pageSize = 20 } = params;
  let query = supabase.from("announcements").select("*", { count: "exact" });

  if (status === "published") query = query.eq("is_published", true);
  if (status === "draft") query = query.eq("is_published", false);
  if (search?.trim()) query = query.ilike("title", `%${search.trim().replace(/[%,()]/g, " ")}%`);

  const from = (page - 1) * pageSize;
  const { data, error, count } = await query
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1)
    .returns<AnnouncementRow[]>();

  if (error) throw error;
  return { rows: (data ?? []).map(decorate), total: count ?? 0, page, pageSize };
}

export async function getAnnouncement(id: string) {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("id", id)
    .maybeSingle()
    .returns<AnnouncementRow | null>();
  if (error) throw error;
  return data ? decorate(data) : null;
}

function toRow(values: AnnouncementFormOutput) {
  return {
    title: values.title,
    content: values.content,
    image_url: values.imageUrl,
    link_url: values.linkUrl,
    link_label: values.linkLabel,
    is_published: values.isPublished,
    is_pinned: values.isPinned,
    priority: values.priority,
    starts_at: values.startsAt,
    ends_at: values.endsAt,
    is_event: values.isEvent,
    event_starts_at: values.isEvent ? values.eventStartsAt : null,
    event_ends_at: values.isEvent ? values.eventEndsAt : null,
    call_time: values.isEvent ? values.callTime : null,
    venue: values.isEvent ? values.venue : null,
    address: values.isEvent ? values.address : null,
    dress_code: values.isEvent ? values.dressCode : null,
    what_to_bring: values.isEvent ? values.whatToBring : null,
    collect_rsvp: values.isEvent ? values.collectRsvp : false,
  };
}

export async function createAnnouncement(values: AnnouncementFormOutput) {
  const { data, error } = await supabase
    .from("announcements")
    .insert(toRow(values))
    .select("*")
    .single();
  if (error) throw error;
  return decorate(data as AnnouncementRow);
}

export async function updateAnnouncement(id: string, values: AnnouncementFormOutput) {
  const { data, error } = await supabase
    .from("announcements")
    .update(toRow(values))
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return decorate(data as AnnouncementRow);
}

export async function setAnnouncementFlags(
  id: string,
  flags: { is_published?: boolean; is_pinned?: boolean },
) {
  const { error } = await supabase.from("announcements").update(flags).eq("id", id);
  if (error) throw error;
}

export async function deleteAnnouncement(id: string) {
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) throw error;
}
