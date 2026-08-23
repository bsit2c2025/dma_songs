/** Central query-key registry so cache invalidation stays predictable. */
export const queryKeys = {
  voiceClassifications: ["voice-classifications"] as const,
  settings: ["settings"] as const,
  songs: (params: unknown) => ["songs", params] as const,
  song: (id: string) => ["song", id] as const,
  adminSongs: (params: unknown) => ["admin", "songs", params] as const,
  announcements: (params: unknown) => ["announcements", params] as const,
  announcement: (id: string) => ["announcement", id] as const,
  adminAnnouncements: (params: unknown) => ["admin", "announcements", params] as const,
  members: (params: unknown) => ["admin", "members", params] as const,
  activity: (params: unknown) => ["admin", "activity", params] as const,
  dashboard: ["admin", "dashboard"] as const,
  profile: (id: string | undefined) => ["profile", id] as const,
  categories: ["song-categories"] as const,
};
