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
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
