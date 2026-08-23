/**
 * YouTube handling.
 *
 * Only the 11-character video id is trusted. Admin input is parsed, the host
 * is checked against an allowlist, and the embed URL is rebuilt by us — so no
 * administrator-supplied string ever reaches an iframe `src` unchecked and no
 * arbitrary iframe HTML is ever stored.
 */
const ALLOWED_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export function extractYouTubeId(input: string): string | null {
  const raw = input?.trim();
  if (!raw) return null;
  if (VIDEO_ID.test(raw)) return raw;

  let url: URL;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) return null;

  const fromQuery = url.searchParams.get("v");
  if (fromQuery && VIDEO_ID.test(fromQuery)) return fromQuery;

  // /embed/ID, /shorts/ID, /live/ID, /v/ID, and youtu.be/ID
  const segments = url.pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1];
  if (last && VIDEO_ID.test(last)) return last;

  return null;
}

export function isYouTubeUrl(input: string) {
  return extractYouTubeId(input) !== null;
}

/** Canonical watch URL we store alongside the id. */
export function canonicalWatchUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/** Privacy-enhanced embed URL, built by us from a validated id. */
export function embedUrl(videoId: string, options: { autoplay?: boolean; start?: number } = {}) {
  const params = new URLSearchParams({ rel: "0", modestbranding: "1", playsinline: "1" });
  if (options.autoplay) params.set("autoplay", "1");
  if (options.start) params.set("start", String(options.start));
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

/**
 * YouTube's own thumbnail CDN. Used only as a fallback when no thumbnail has
 * been uploaded, and never for a song without a video.
 */
export function thumbnailFromVideoId(videoId: string, quality: "hq" | "mq" = "hq") {
  return `https://i.ytimg.com/vi/${videoId}/${quality}default.jpg`;
}
