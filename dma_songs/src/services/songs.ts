import { supabase } from "@/lib/supabase";
import type { Paginated, Song, SongVideo, VoiceClassification } from "@/types/models";
import type { SongSort } from "@/lib/constants";
import type { SongFormOutput } from "@/schemas/song";
import { extractYouTubeId, canonicalWatchUrl } from "@/lib/youtube";

/**
 * The voice parts are embedded twice on purpose. `parts` always returns every
 * part a song is arranged for (so the card can show them all), while the
 * aliased `filter` embed is an inner join used only to narrow the result set.
 * Filtering through the first embed would hide the other parts from the card.
 */
const SONG_COLUMNS = `
  id, title, composer, arranger, description, category, lyrics, notes,
  thumbnail_url, status, created_at, updated_at, created_by, updated_by,
  parts:song_voice_classifications ( voice_classifications ( * ) ),
  videos:song_videos ( * )
`;

interface SongQueryRow {
  id: string;
  title: string;
  composer: string | null;
  arranger: string | null;
  description: string | null;
  category: string | null;
  lyrics: string | null;
  notes: string | null;
  thumbnail_url: string | null;
  status: "active" | "disabled";
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  parts: Array<{ voice_classifications: VoiceClassification | null }> | null;
  videos: SongVideo[] | null;
}

function toSong(row: SongQueryRow): Song {
  const voiceClassifications = (row.parts ?? [])
    .map((p) => p.voice_classifications)
    .filter((v): v is VoiceClassification => Boolean(v))
    .sort((a, b) => a.sort_order - b.sort_order);

  const videos = [...(row.videos ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const { parts: _parts, videos: _videos, ...song } = row;
  void _parts;
  void _videos;
  return { ...song, voiceClassifications, videos };
}

export interface SongListParams {
  search?: string;
  voiceClassificationId?: string | null;
  category?: string | null;
  sort?: SongSort;
  page?: number;
  pageSize?: number;
  /** Admin lists include disabled songs; the public library never does. */
  includeDisabled?: boolean;
  status?: "active" | "disabled" | null;
}

export async function listSongs(params: SongListParams = {}): Promise<Paginated<Song>> {
  const {
    search,
    voiceClassificationId,
    category,
    sort = "recent",
    page = 1,
    pageSize = 12,
    includeDisabled = false,
    status = null,
  } = params;

  const columns = voiceClassificationId
    ? `${SONG_COLUMNS}, filter:song_voice_classifications!inner ( voice_classification_id )`
    : SONG_COLUMNS;

  let query = supabase.from("songs").select(columns, { count: "exact" });

  if (!includeDisabled) query = query.eq("status", "active");
  if (status) query = query.eq("status", status);
  if (voiceClassificationId) {
    query = query.eq("filter.voice_classification_id", voiceClassificationId);
  }
  if (category) query = query.eq("category", category);
  if (search?.trim()) {
    const term = search.trim().replace(/[%,()]/g, " ");
    query = query.ilike("title", `%${term}%`);
  }

  switch (sort) {
    case "alphabetical":
      query = query.order("title", { ascending: true });
      break;
    case "alphabetical_desc":
      query = query.order("title", { ascending: false });
      break;
    case "updated":
      query = query.order("updated_at", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const from = (page - 1) * pageSize;
  const { data, error, count } = await query
    .range(from, from + pageSize - 1)
    .returns<SongQueryRow[]>();

  if (error) throw error;
  return {
    rows: (data ?? []).map(toSong),
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getSong(id: string): Promise<Song | null> {
  const { data, error } = await supabase
    .from("songs")
    .select(SONG_COLUMNS)
    .eq("id", id)
    .maybeSingle()
    .returns<SongQueryRow | null>();
  if (error) throw error;
  return data ? toSong(data) : null;
}

export async function listCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from("songs")
    .select("category")
    .not("category", "is", null)
    .returns<Array<{ category: string | null }>>();
  if (error) throw error;
  const unique = new Set((data ?? []).map((r) => r.category).filter((c): c is string => Boolean(c)));
  return [...unique].sort((a, b) => a.localeCompare(b));
}

/** Create or update a song, its parts and its videos in one transaction. */
export async function saveSong(values: SongFormOutput, id?: string): Promise<string> {
  const payload = {
    id: id ?? null,
    title: values.title,
    composer: values.composer,
    arranger: values.arranger,
    description: values.description,
    category: values.category,
    lyrics: values.lyrics,
    notes: values.notes,
    thumbnail_url: values.thumbnailUrl,
    status: values.status,
    voice_classification_ids: values.voiceClassificationIds,
    videos: values.videos.map((video, index) => {
      const videoId = extractYouTubeId(video.url);
      if (!videoId) throw new Error(`"${video.url}" isn't a YouTube link.`);
      return {
        id: video.id ?? null,
        voice_classification_id: video.voiceClassificationId,
        youtube_video_id: videoId,
        youtube_url: canonicalWatchUrl(videoId),
        label: video.label,
        sort_order: index,
      };
    }),
  };

  const { data, error } = await supabase.rpc("admin_save_song", { p_payload: payload });
  if (error) throw error;
  return data as unknown as string;
}

export async function setSongStatus(id: string, status: "active" | "disabled") {
  const { error } = await supabase.from("songs").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteSong(id: string) {
  const { error } = await supabase.from("songs").delete().eq("id", id);
  if (error) throw error;
}
