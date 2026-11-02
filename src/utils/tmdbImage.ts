/**
 * Resizes TMDB poster URLs that were stored at a larger size (w500, w780,
 * original) down to the size a given slot actually displays. Film documents
 * keep the w500 URL, but list thumbnails render at ~50 px and cards at ~320 px,
 * so serving w500 everywhere wastes hundreds of KiB on the home page.
 *
 * Only image.tmdb.org URLs are rewritten, and a URL is never made larger than
 * it already is. Any other URL (Firebase Storage, Unsplash default, empty
 * string) is returned unchanged.
 */

export type TmdbPosterSize = 'w154' | 'w185' | 'w342';

const TMDB_IMAGE_RE = /^(https:\/\/image\.tmdb\.org\/t\/p\/)(w\d+|original)(\/.+)$/;

/** Pixel width of a TMDB size token; `original` counts as the largest. */
function tmdbSizeWidth(size: string): number {
  if (size === 'original') return Number.POSITIVE_INFINITY;
  return Number(size.slice(1));
}

export function tmdbPosterSized(url: string, size: TmdbPosterSize): string {
  if (typeof url !== 'string') return url;
  const match = TMDB_IMAGE_RE.exec(url.trim());
  if (!match) return url;

  const [, base, currentSize, path] = match;
  if (tmdbSizeWidth(currentSize) <= tmdbSizeWidth(size)) return url;
  return `${base}${size}${path}`;
}
