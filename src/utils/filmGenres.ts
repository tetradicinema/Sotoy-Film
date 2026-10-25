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

/**
 * Alternate spellings that all point at one canonical display name. Keys are
 * compared after trimming, lower-casing and collapsing whitespace, so
 * "Sci-Fi", "sci fi" and "science-fiction" all resolve to "Science Fiction".
 */
const GENRE_ALIASES: Record<string, string> = {
  'sci-fi': 'Science Fiction',
  'sci fi': 'Science Fiction',
  scifi: 'Science Fiction',
  'science-fiction': 'Science Fiction',
  'science fiction': 'Science Fiction',
  animasi: 'Animation',
  anime: 'Animation',
  'tv-movie': 'TV Movie',
  'tv movie': 'TV Movie',
  'action-adventure': 'Action & Adventure',
  'action & adventure': 'Action & Adventure',
  'sci-fi & fantasy': 'Sci-Fi & Fantasy',
  'sci fi & fantasy': 'Sci-Fi & Fantasy',
  'war & politics': 'War & Politics',
  'war and politics': 'War & Politics',
};

export interface FilmGenreSource {
  genres?: Array<string | number> | null;
}

/**
 * Normalizes a genre key for case/whitespace-insensitive lookups.
 */
const normalizeGenreKey = (raw: string): string =>
  raw
    .trim()
    .toLowerCase()
    .replace(/_+/g, ' ')
    .replace(/\s+/g, ' ');

const CANONICAL_BY_KEY = new Map<string, string>();
for (const name of Object.values(TMDB_GENRE_NAMES)) {
  CANONICAL_BY_KEY.set(normalizeGenreKey(name), name);
}
for (const [alias, canonical] of Object.entries(GENRE_ALIASES)) {
  CANONICAL_BY_KEY.set(normalizeGenreKey(alias), canonical);
  CANONICAL_BY_KEY.set(normalizeGenreKey(canonical), canonical);
}

const ARTICLE_SUBCATEGORIES = new Set<string>([
  'news',
  'lists',
  'reviews',
  'gear-news',
  'gear-reviews',
  'producing',
  'directing',
  'cinematography',
  'lighting',
  'post-production',
]);

/**
 * Maps a TMDB genre id or a genre alias to one canonical display name.
 * Unknown non-numeric names are returned trimmed, so custom genres still work.
 * Unknown numeric ids resolve to an empty string.
 */
export function normalizeGenreName(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return '';

  if (typeof raw === 'number') {
    return TMDB_GENRE_NAMES[String(raw)] ?? '';
  }

  const value = String(raw).trim();
  if (!value) return '';

  if (/^\d+$/.test(value)) {
    return TMDB_GENRE_NAMES[value] ?? '';
  }

  return CANONICAL_BY_KEY.get(normalizeGenreKey(value)) ?? value;
}

/**
 * Returns the canonical genres of a film, including legacy TMDB ids.
 * Duplicates are removed and empty values are skipped.
 */
export function getFilmGenreList(film: FilmGenreSource | null | undefined): string[] {
  const rawGenres = film?.genres;
  if (!Array.isArray(rawGenres) || rawGenres.length === 0) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of rawGenres) {
    if (typeof raw !== 'string' && typeof raw !== 'number') continue;

    const label = normalizeGenreName(raw);
    if (!label) continue;

    const key = label.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(label);
  }

  return result;
}

/**
 * Aggregates genre options from a film catalogue.
 * Sorted by count descending, then alphabetically by label.
 */
export function collectGenreOptions(
  films: FilmGenreSource[]
): { value: string; label: string; count: number }[] {
  const counts = new Map<string, { label: string; count: number }>();

  for (const film of films) {
    const genres = getFilmGenreList(film);
    for (const label of genres) {
      const key = label.toLowerCase();
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, { label, count: 1 });
      }
    }
  }

  return Array.from(counts.values())
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label);
    })
    .map(({ label, count }) => ({ value: label, label, count }));
}

/**
 * True when the raw value resolves to a known canonical genre name.
 */
export function isKnownGenreName(raw: string | number | null | undefined): boolean {
  const canonical = normalizeGenreName(raw);
  if (!canonical) return false;
  return CANONICAL_BY_KEY.get(normalizeGenreKey(canonical)) === canonical;
}

/**
 * Returns the effective film genre filter for a section config.
 * `genre` wins; otherwise a legacy `subCategory` that equals a known genre is
 * used. Article sub-categories (news, reviews, ...) are ignored for films so a
 * legacy article config never filters every film out.
 */
export function resolveFilmSectionGenre(
  config: { genre?: string; subCategory?: string } | null | undefined
): string {
  if (!config) return '';

  const direct = typeof config.genre === 'string' ? config.genre.trim() : '';
  if (direct) return normalizeGenreName(direct) || direct;

  const sub = typeof config.subCategory === 'string' ? config.subCategory.trim() : '';
  if (!sub) return '';
  if (ARTICLE_SUBCATEGORIES.has(sub.toLowerCase())) return '';

  return isKnownGenreName(sub) ? normalizeGenreName(sub) : '';
}

/**
 * Checks whether a film belongs to the given canonical genre.
 */
export function filmMatchesGenre(
  film: FilmGenreSource | null | undefined,
  genre: string | null | undefined
): boolean {
  const target = normalizeGenreName(genre);
  if (!target) return true;

  const targetKey = target.toLowerCase();
  return getFilmGenreList(film).some(label => label.toLowerCase() === targetKey);
}

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

  return getFilmGenreList(film).slice(0, limit).join(', ');
}
