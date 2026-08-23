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
