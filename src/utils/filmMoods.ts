import { FilmItem } from '../types';
import { filmMatchesGenre } from './filmGenres';
import {
  computeBayesianScore,
  computeMeanScore,
  normalizePlatform,
} from './filmSections';

/**
 * Plain mood data for the /rekomendasi-film page. Labels are written for the
 * Watch Next interface while ids stay stable. Genres use canonical names (see
 * src/utils/filmGenres) so "Sci-Fi", "sci fi" and "Science Fiction" all resolve
 * to the same mood. Tags are matched case-insensitively.
 */
export interface FilmMood {
  id: string;
  label: string;
  genres: string[];
  tags: string[];
}

export const FILM_MOODS: FilmMood[] = [
  {
    id: 'santai',
    label: 'Chill',
    genres: ['Comedy', 'Family', 'Animation'],
    tags: ['ringan', 'hangat'],
  },
  {
    id: 'menegangkan',
    label: 'Edge of Seat',
    genres: ['Thriller', 'Horror', 'Mystery'],
    tags: ['mencekam', 'horor'],
  },
  {
    id: 'bikin-mikir',
    label: 'Mind-Bending',
    genres: ['Science Fiction', 'Mystery'],
    tags: ['mind-bending', 'filosofis'],
  },
  {
    id: 'romantis',
    label: 'Hopeless Romantic',
    genres: ['Romance'],
    tags: ['baper', 'cinta'],
  },
  {
    id: 'seru',
    label: 'Adrenaline',
    genres: ['Action', 'Adventure'],
    tags: ['aksi', 'petualangan'],
  },
  {
    id: 'haru',
    label: 'Tearjerker',
    genres: ['Drama'],
    tags: ['mengharukan', 'sedih'],
  },
];

/**
 * True when the film matches at least one of the mood's canonical genres or
 * one of its tags (case-insensitive). Null-safe.
 */
export function filmMatchesMood(
  film: FilmItem | null | undefined,
  mood: FilmMood | null | undefined
): boolean {
  if (!film || !mood) return false;

  const genres = Array.isArray(mood.genres) ? mood.genres : [];
  if (genres.some(genre => filmMatchesGenre(film, genre))) return true;

  const filmTags = Array.isArray(film.tags) ? film.tags : [];
  const moodTags = Array.isArray(mood.tags) ? mood.tags : [];
  if (filmTags.length === 0 || moodTags.length === 0) return false;

  const filmTagKeys = new Set(
    filmTags.map(tag => String(tag ?? '').trim().toLowerCase()).filter(Boolean)
  );

  return moodTags.some(tag => filmTagKeys.has(String(tag ?? '').trim().toLowerCase()));
}

/**
 * Finds a mood by id. Returns null for empty or unknown ids.
 */
export function getFilmMoodById(
  moodId?: string | null
): FilmMood | null {
  if (!moodId) return null;
  return FILM_MOODS.find(mood => mood.id === moodId) ?? null;
}

export interface RecommendationFilters {
  moodId?: string | null;
  platform?: string | null;
}

/**
 * Filters films by mood and/or streaming platform, then sorts them by
 * Bayesian rank (descending). No score threshold is applied.
 */
export function filterRecommendationFilms(
  films: FilmItem[] | null | undefined,
  filters?: RecommendationFilters
): FilmItem[] {
  const list = Array.isArray(films) ? films.filter(Boolean) : [];
  if (list.length === 0) return [];

  const mood = getFilmMoodById(filters?.moodId);
  const platform = typeof filters?.platform === 'string' ? filters.platform.trim() : '';

  let result = list;

  if (mood) {
    result = result.filter(film => filmMatchesMood(film, mood));
  }

  if (platform) {
    const target = normalizePlatform(platform).toLowerCase();
    result = result.filter(film => {
      const whereToWatch = Array.isArray(film.whereToWatch) ? film.whereToWatch : [];
      return whereToWatch.some(entry => {
        if (!entry || !entry.platform) return false;
        return normalizePlatform(entry.platform).toLowerCase() === target;
      });
    });
  }

  const meanScore = computeMeanScore(list);

  return [...result].sort(
    (a, b) => computeBayesianScore(b, meanScore) - computeBayesianScore(a, meanScore)
  );
}

/**
 * Picks a random film, never returning `excludeId` while another film exists.
 * Returns null for an empty list.
 */
export function pickRandomFilm(
  films: FilmItem[] | null | undefined,
  excludeId?: string | null
): FilmItem | null {
  const list = Array.isArray(films) ? films.filter(Boolean) : [];
  if (list.length === 0) return null;

  const candidates = excludeId ? list.filter(film => film.id !== excludeId) : list;
  if (candidates.length === 0) return list[0] ?? null;

  return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
}
