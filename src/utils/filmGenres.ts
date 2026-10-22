/**
 * TMDB genre ids that can appear in legacy/imported film documents. New TMDB
 * imports already store genre names, but older records may still hold ids.
 */
const TMDB_GENRE_NAMES: Record<string, string> = {
  '12': 'Adventure',
  '14': 'Fantasy',
  '16': 'Animation',
  '18': 'Drama',
  '27': 'Horror',
  '28': 'Action',
  '35': 'Comedy',
  '36': 'History',
  '37': 'Western',
  '53': 'Thriller',
  '80': 'Crime',
  '99': 'Documentary',
  '878': 'Science Fiction',
  '9648': 'Mystery',
  '10402': 'Music',
  '10749': 'Romance',
  '10751': 'Family',
  '10752': 'War',
  '10770': 'TV Movie',
  '10759': 'Action & Adventure',
  '10762': 'Kids',
  '10763': 'News',
  '10764': 'Reality',
  '10765': 'Sci-Fi & Fantasy',
  '10766': 'Soap',
  '10767': 'Talk',
  '10768': 'War & Politics',
};

export interface FilmGenreSource {
  genres?: Array<string | number> | null;
}

const resolveGenreName = (raw: string | number): string => {
  if (typeof raw === 'number') {
    return TMDB_GENRE_NAMES[String(raw)] ?? '';
  }

  const value = raw.trim();
  if (!value) return '';

  const mapped = TMDB_GENRE_NAMES[value];
  if (mapped) return mapped;

  // A bare number that is not a known TMDB id is an id, not a display name.
  if (/^\d+$/.test(value)) return '';

  return value;
};

/**
 * Builds the single-line genre label shown under a film card title.
 * Returns at most `max` unique genres joined with a comma, or an empty string
 * when the film has no usable genres.
 */
export function getCardGenres(film: FilmGenreSource, max = 2): string {
  const rawGenres = film?.genres;
  if (!Array.isArray(rawGenres) || rawGenres.length === 0) return '';

  const limit = Number.isFinite(max) ? Math.max(0, Math.floor(max)) : 2;
  if (limit === 0) return '';

  const seen = new Set<string>();
  const labels: string[] = [];

  for (const raw of rawGenres) {
    if (typeof raw !== 'string' && typeof raw !== 'number') continue;

    const label = resolveGenreName(raw);
    if (!label) continue;

    const key = label.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    labels.push(label);

    if (labels.length >= limit) break;
  }

  return labels.join(', ');
}
