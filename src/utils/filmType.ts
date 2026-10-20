import { FilmItem } from '../types';

export type FilmFormat = 'movie' | 'series' | 'animation';

/**
 * Normalizes any raw film type string to canonical format:
 * 'anime' -> 'animation'
 * 'movie' -> 'movie'
 * 'series' -> 'series'
 * 'animation' -> 'animation'
 * any unknown string -> 'movie'
 */
export function normalizeFilmType(raw?: string | null): FilmFormat {
  if (!raw) return 'movie';
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === 'anime' || trimmed === 'animation') {
    return 'animation';
  }
  if (trimmed === 'series' || trimmed === 'tv') {
    return 'series';
  }
  if (trimmed === 'movie') {
    return 'movie';
  }
  return 'movie';
}

/**
 * Classifies TMDB items into 'movie' | 'series' | 'animation'.
 * If genres include TMDB genre id 16 (Animation) or the names "Animation"/"Animasi"
 * (case-insensitive), returns 'animation' for BOTH movies and TV.
 * Otherwise, mediaType 'movie' -> 'movie' and 'tv' -> 'series'.
 */
export function classifyFilmType(params: {
  mediaType: 'movie' | 'tv';
  genres?: Array<string | number>;
}): FilmFormat {
  const { mediaType, genres = [] } = params;

  const isAnimated = genres.some((g) => {
    if (g === 16 || g === '16') return true;
    if (typeof g === 'string') {
      const lower = g.trim().toLowerCase();
      return lower === 'animation' || lower === 'animasi';
    }
    return false;
  });

  if (isAnimated) {
    return 'animation';
  }

  return mediaType === 'tv' ? 'series' : 'movie';
}
