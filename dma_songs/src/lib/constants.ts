export const STORAGE_KEYS = {
  voicePart: "dma_songs.voice_part",
  adminSidebar: "dma_songs.admin_sidebar",
} as const;

export const SONG_SORTS = [
  { value: "recent", label: "Recently added" },
  { value: "alphabetical", label: "A – Z" },
  { value: "alphabetical_desc", label: "Z – A" },
  { value: "updated", label: "Recently updated" },
] as const;

export type SongSort = (typeof SONG_SORTS)[number]["value"];

export const DEFAULT_PAGE_SIZE = 12;
export const ADMIN_PAGE_SIZE = 20;

export const ACTIVITY_LABELS: Record<string, string> = {
  "user.approved": "Member approved",
  "user.rejected": "Member request declined",
  "song.bulk_set_category": "Songs recategorised in bulk",
  "song.bulk_enable": "Songs enabled in bulk",
  "song.bulk_disable": "Songs disabled in bulk",
  "song.bulk_delete": "Songs deleted in bulk",
  "song.bulk_add_part": "Voice part added in bulk",
  "song.bulk_remove_part": "Voice part removed in bulk",
  "user.anonymized": "Member record erased",
  "user.self_erased": "Member erased their own account",
  "voice_request.created": "Voice part change requested",
  "voice_request.approved": "Voice part change approved",
  "voice_request.rejected": "Voice part change declined",
  "voice_request.cancelled": "Voice part request withdrawn",
  "song.created": "Song added",
  "song.updated": "Song updated",
  "song.deleted": "Song deleted",
  "song.enabled": "Song enabled",
  "song.disabled": "Song disabled",
  "announcement.created": "Announcement created",
  "announcement.updated": "Announcement updated",
  "announcement.published": "Announcement published",
  "announcement.unpublished": "Announcement unpublished",
  "announcement.deleted": "Announcement deleted",
  "voice_part.created": "Voice part added",
  "voice_part.updated": "Voice part updated",
  "voice_part.deleted": "Voice part deleted",
  "user.voice_changed": "Member's voice part changed",
  "profile.voice_changed": "Voice part changed",
  "user.deactivated": "Member deactivated",
  "user.reactivated": "Member reactivated",
  "role.granted": "Role granted",
  "role.revoked": "Role revoked",
  "settings.updated": "Settings updated",
  "auth.admin_signed_in": "Administrator signed in",
  "auth.admin_signed_out": "Administrator signed out",
};
