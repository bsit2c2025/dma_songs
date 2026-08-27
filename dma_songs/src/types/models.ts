import type { Json, Tables } from "@/types/database";

export type VoiceClassification = Tables<"voice_classifications">;
export type Profile = Tables<"profiles">;
export type SongRow = Tables<"songs">;
export type SongVideo = Tables<"song_videos">;
export type AnnouncementRow = Tables<"announcements">;
export type ActivityLog = Tables<"activity_logs">;
export type AppSetting = Tables<"app_settings">;
export type { AppRole, SongStatus } from "@/types/database";

/** A song joined with the parts it is arranged for and its practice videos. */
export interface Song extends SongRow {
  voiceClassifications: VoiceClassification[];
  videos: SongVideo[];
}

export interface Announcement extends AnnouncementRow {
  /** True when published and inside its schedule window right now. */
  isLive: boolean;
}

/** A member row as shown in admin user management. */
export interface MemberSummary extends Profile {
  roles: import("@/types/database").AppRole[];
  voiceClassification: VoiceClassification | null;
}

export interface DashboardStats {
  songs_total: number;
  songs_active: number;
  songs_disabled: number;
  videos_total: number;
  users_total: number;
  admins_total: number;
  announcements_total: number;
  announcements_live: number;
  voice_breakdown: Array<{
    id: string;
    name: string;
    color: string;
    sort_order: number;
    song_count: number;
    member_count: number;
  }>;
}

export interface Paginated<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type SettingsMap = Record<string, Json>;

export type VoiceChangeRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface VoiceChangeRequest {
  id: string;
  user_id: string;
  requested_voice_id: string;
  current_voice_id: string | null;
  status: VoiceChangeRequestStatus;
  note: string | null;
  decision_note: string | null;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
  requested: VoiceClassification | null;
  current: VoiceClassification | null;
  profile: {
    id: string;
    display_name: string;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

export const VOICE_FAMILIES = [
  { value: "soprano", label: "Soprano", short: "S" },
  { value: "alto", label: "Alto", short: "A" },
  { value: "tenor", label: "Tenor", short: "T" },
  { value: "bass", label: "Bass", short: "B" },
] as const;

export const RIGHTS_BASES = [
  { value: "public_domain", label: "Public domain", hint: "The composer died long enough ago that copyright has expired." },
  { value: "owned", label: "Owned by the institution", hint: "Written or arranged for DLL, and DLL holds the rights." },
  { value: "licensed", label: "Licensed", hint: "Covered by a licence the institution holds." },
  { value: "permission", label: "Written permission", hint: "The rights holder agreed in writing." },
  { value: "other", label: "Other — explained below", hint: "" },
] as const;

export interface MemberNote {
  user_id: string;
  note: string;
  updated_by: string | null;
  updated_at: string;
}
