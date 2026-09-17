/**
 * Artists paste whatever URL is in their browser bar — a full watch link, a
 * shortened youtu.be link, a Shorts link, one with a timestamp or playlist
 * attached. This normalises all of those to a bare 11-character video id.
 *
 * Returns null for anything that isn't recognisably a YouTube video URL, which
 * the API layer treats as a validation failure rather than guessing.
 */
const ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export function extractYouTubeId(input) {
  if (!input) {
    return null;
  }
  const trimmed = input.trim();

  // A bare id, in case someone pastes just that.
  if (ID_PATTERN.test(trimmed)) {
    return trimmed;
  }

  let url;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\.|^m\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return ID_PATTERN.test(id) ? id : null;
  }

  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") {
      const id = url.searchParams.get("v");
      return id && ID_PATTERN.test(id) ? id : null;
    }
    const shortsOrEmbed = url.pathname.match(/^\/(shorts|embed|live)\/([a-zA-Z0-9_-]{11})/);
    if (shortsOrEmbed) {
      return shortsOrEmbed[2];
    }
  }

  return null;
}

export function isYouTubeUrl(input) {
  return extractYouTubeId(input) !== null;
}

/** The frame-free thumbnail YouTube serves for every uploaded video. */
export function youtubeThumbnail(videoId) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/** Privacy-enhanced domain: no cookies are set until playback starts. */
export function youtubeEmbedUrl(videoId) {
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}

export function youtubeWatchUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
