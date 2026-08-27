/**
 * Database types.
 *
 * Kept by hand so the repository type-checks without a live Supabase project.
 * Once your project is up, regenerate them for the real source of truth:
 *
 *   npx supabase gen types typescript --project-id <ref> --schema public \
 *     > src/types/database.ts
 *
 * The shape below matches supabase/migrations/0001_init_schema.sql exactly.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AppRole = "admin" | "singer";
export type VoiceFamily = "soprano" | "alto" | "tenor" | "bass";
export type SongPartMode = "simple" | "detailed";
export type VoiceRequestStatus = "pending" | "approved" | "rejected" | "cancelled";
export type SongStatus = "active" | "disabled";

export interface Database {
  public: {
    Tables: {
      voice_classifications: {
        Row: {
          id: string;
          name: string;
          slug: string;
          short_code: string | null;
          description: string | null;
          color: string;
          sort_order: number;
          is_active: boolean;
          family: VoiceFamily | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug?: string;
          short_code?: string | null;
          description?: string | null;
          color?: string;
          sort_order?: number;
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["voice_classifications"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          display_name: string;
          email: string | null;
          avatar_url: string | null;
          voice_classification_id: string | null;
          is_active: boolean;
          prefers_own_part: boolean;
          terms_accepted_at: string | null;
          terms_version: string | null;
          anonymized_at: string | null;
          last_seen_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          email?: string | null;
          avatar_url?: string | null;
          voice_classification_id?: string | null;
          is_active?: boolean;
          prefers_own_part?: boolean;
          terms_accepted_at?: string | null;
          terms_version?: string | null;
          last_seen_at?: string | null;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["profiles"]["Insert"], "id">>;
        Relationships: [];
      };
      user_roles: {
        Row: {
          user_id: string;
          role: AppRole;
          granted_by: string | null;
          granted_at: string;
        };
        Insert: { user_id: string; role: AppRole; granted_by?: string | null };
        Update: never;
        Relationships: [];
      };
      songs: {
        Row: {
          id: string;
          title: string;
          composer: string | null;
          arranger: string | null;
          description: string | null;
          category: string | null;
          lyrics: string | null;
          notes: string | null;
          thumbnail_url: string | null;
          status: SongStatus;
          part_mode: SongPartMode;
          rights_confirmed: boolean;
          rights_holder: string | null;
          rights_basis: string | null;
          rights_note: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          composer?: string | null;
          arranger?: string | null;
          description?: string | null;
          category?: string | null;
          lyrics?: string | null;
          notes?: string | null;
          thumbnail_url?: string | null;
          status?: SongStatus;
        };
        Update: Partial<Database["public"]["Tables"]["songs"]["Insert"]>;
        Relationships: [];
      };
      song_voice_classifications: {
        Row: { song_id: string; voice_classification_id: string; created_at: string };
        Insert: { song_id: string; voice_classification_id: string };
        Update: never;
        Relationships: [];
      };
      song_videos: {
        Row: {
          id: string;
          song_id: string;
          voice_classification_id: string | null;
          voice_family: VoiceFamily | null;
          youtube_video_id: string;
          youtube_url: string;
          label: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          song_id: string;
          voice_classification_id?: string | null;
          youtube_video_id: string;
          youtube_url: string;
          label?: string | null;
          sort_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["song_videos"]["Insert"]>;
        Relationships: [];
      };
      announcements: {
        Row: {
          id: string;
          title: string;
          content: string;
          image_url: string | null;
          link_url: string | null;
          link_label: string | null;
          is_published: boolean;
          is_pinned: boolean;
          priority: number;
          starts_at: string | null;
          ends_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          image_url?: string | null;
          link_url?: string | null;
          link_label?: string | null;
          is_published?: boolean;
          is_pinned?: boolean;
          priority?: number;
          starts_at?: string | null;
          ends_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["announcements"]["Insert"]>;
        Relationships: [];
      };
      voice_change_requests: {
        Row: {
          id: string;
          user_id: string;
          requested_voice_id: string;
          current_voice_id: string | null;
          status: VoiceRequestStatus;
          note: string | null;
          decision_note: string | null;
          decided_by: string | null;
          decided_at: string | null;
          created_at: string;
          updated_at: string;
        };
        // Writes go through request_voice_change / admin_decide_voice_change.
        Insert: never;
        Update: never;
        Relationships: [];
      };
      member_notes: {
        Row: {
          user_id: string;
          note: string;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          note?: string;
          updated_by?: string | null;
        };
        Update: { note?: string; updated_by?: string | null };
        Relationships: [];
      };
      activity_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          actor_email: string | null;
          action: string;
          resource_type: string;
          resource_id: string | null;
          resource_label: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      app_settings: {
        Row: {
          key: string;
          value: Json;
          label: string | null;
          is_public: boolean;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: { key: string; value: Json; label?: string | null; is_public?: boolean };
        Update: Partial<Database["public"]["Tables"]["app_settings"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: { uid?: string }; Returns: boolean };
      current_roles: { Args: Record<string, never>; Returns: AppRole[] };
      admin_dashboard_stats: { Args: Record<string, never>; Returns: Json };
      log_admin_event: { Args: { p_action: string; p_metadata?: Json }; Returns: void };
      admin_save_song: { Args: { p_payload: Json }; Returns: string };
      admin_bulk_song_action: {
        Args: { p_song_ids: string[]; p_action: string; p_value?: string | null };
        Returns: number;
      };
      admin_anonymize_member: { Args: { p_user_id: string }; Returns: void };
      erase_my_account: { Args: Record<string, never>; Returns: void };
      export_my_data: { Args: Record<string, never>; Returns: Json };
      request_voice_change: {
        Args: { p_voice_classification_id: string; p_note?: string | null };
        Returns: string | null;
      };
      cancel_voice_change_request: { Args: { p_request_id: string }; Returns: void };
      admin_decide_voice_change: {
        Args: { p_request_id: string; p_approve: boolean; p_note?: string | null };
        Returns: void;
      };
      pending_voice_request_count: { Args: Record<string, never>; Returns: number };
    };
    Enums: {
      app_role: AppRole;
      song_status: SongStatus;
      voice_request_status: VoiceRequestStatus;
      voice_family: VoiceFamily;
      song_part_mode: SongPartMode;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
