import { FilmItem, SectionConfig, HomepageSectionKey, HomepageSectionsConfig } from '../types';
import {
  HOMEPAGE_SECTIONS_META,
  resolveFilmDbSectionOrder,
  resolveConfigFilms,
} from './homepageConfigHelper';
import { filmMatchesGenre, resolveFilmSectionGenre } from './filmGenres';
import { normalizeFilmType } from './filmType';
import { DEFAULT_POSTER } from '../data/mockData';
import { seededShuffle, getPageLoadSeed } from './shuffle';
import { isPlaceholderWhereToWatch } from './tmdbSync';

/**
 * Normalizes streaming platform names to canonical forms.
 * Trims and maps common variants; anything else is kept as given.
 */
export function normalizePlatform(name: string): string {
  if (!name) return '';
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();

  if (lower.includes('netflix')) return 'Netflix';
  if (lower.includes('prime') || lower.includes('amazon')) return 'Prime Video';
  if (lower.includes('disney') || lower.includes('hotstar')) return 'Disney+ Hotstar';
  if (lower === 'max' || lower.includes('hbo max') || lower.includes('max stream') || lower.includes('hbo')) {
    return 'Max';
  }
  if (lower.includes('apple tv') || lower.includes('appletv')) return 'Apple TV+';
  if (lower === 'vidio') return 'Vidio';
  if (lower === 'viu') return 'Viu';
  if (lower === 'wetv') return 'WeTV';
  if (lower === 'iqiyi' || lower === 'i-qiyi') return 'iQIYI';
  if (lower.includes('bioskop online')) return 'Bioskop Online';
  if (lower.includes('crunchyroll')) return 'Crunchyroll';
  if (lower.includes('catchplay')) return 'Catchplay';
  if (lower.includes('iflix')) return 'iflix';
  if (lower.includes('mubi')) return 'MUBI';

  return trimmed;
}

/**
 * Canonical major streaming platforms, in the fixed order used to break ties
 * between platforms with the same film count.
 */
export const MAJOR_STREAMING_PLATFORMS: string[] = [
  'Netflix',
  'Prime Video',
  'Disney+ Hotstar',
  'Max',
  'Apple TV+',
  'Vidio',
  'Viu',
  'WeTV',
  'iQIYI',
  'Bioskop Online',
  'Crunchyroll',
  'Catchplay',
];

/**
 * Returns up to 8 normalized platform names with counts. Platforms are sorted
 * by film count descending; ties follow the fixed major-platform order, then
 * alphabetically. Platforms with a single film are hidden unless hiding them
 * would leave fewer than 4 platforms.
 */
export function getStreamingPlatforms(films: FilmItem[]): { name: string; count: number }[] {
  const map = new Map<string, number>();

  for (const film of films) {
    if (!film.whereToWatch || !Array.isArray(film.whereToWatch)) continue;
    const seenForFilm = new Set<string>();
    for (const w of film.whereToWatch) {
      if (isPlaceholderWhereToWatch(w)) continue;
      if (w.type === 'stream' && w.platform) {
        const norm = normalizePlatform(w.platform);
        if (norm && !seenForFilm.has(norm)) {
          seenForFilm.add(norm);
          map.set(norm, (map.get(norm) || 0) + 1);
        }
      }
    }
  }

  const list: { name: string; count: number }[] = [];
  for (const [name, count] of map.entries()) {
    list.push({ name, count });
  }

  const majorIndex = new Map(MAJOR_STREAMING_PLATFORMS.map((name, index) => [name, index]));
  const majorRank = (name: string): number => {
    const index = majorIndex.get(name);
    return index === undefined ? MAJOR_STREAMING_PLATFORMS.length : index;
  };

  list.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    const rankDiff = majorRank(a.name) - majorRank(b.name);
    if (rankDiff !== 0) return rankDiff;
    return a.name.localeCompare(b.name);
  });

  const multiFilmPlatforms = list.filter(p => p.count > 1);
  const visible = multiFilmPlatforms.length >= 4 ? multiFilmPlatforms : list;

  return visible.slice(0, 8);
}

/**
 * Default "Curated Film Recommendations" list: films flagged as editorial
 * featured recommendations first, then the remaining catalogue. Both groups
 * are ordered by Bayesian score descending. Each film appears at most once.
 */
export function getHomeFilmRecsDefault(films: FilmItem[], limit = 6): FilmItem[] {
  const meanScore = computeMeanScore(films);
  const byScore = (a: FilmItem, b: FilmItem): number =>
    computeBayesianScore(b, meanScore) - computeBayesianScore(a, meanScore);

  const featured = films.filter(f => f.featuredRecommendation === true).sort(byScore);
  const rest = films.filter(f => f.featuredRecommendation !== true).sort(byScore);

  const seen = new Set<string>();
  const result: FilmItem[] = [];
  for (const film of [...featured, ...rest]) {
    if (seen.has(film.id)) continue;
    seen.add(film.id);
    result.push(film);
  }

  return result.slice(0, Math.max(0, limit));
}

/**
 * Shared editorial resolver used by the homepage recommendations section and
 * the hero "To Watch" tab. Manual selections keep their saved order and fall
 * back to the default list when nothing matches. Auto mode applies optional
 * category/sub-category/tag/sort filters; without filters the editorial
 * default rule (featured first, then Bayesian score) is used.
 */
function resolveCuratedFilms(
  films: FilmItem[],
  config: SectionConfig | undefined,
  defaultLimit: number,
  maxLimit: number,
  opts?: { seed?: number }
): FilmItem[] {
  if (config && config.enabled === false) return [];

  const rawLimit = config?.limit ?? defaultLimit;
  const limit = Number.isFinite(rawLimit)
    ? Math.min(maxLimit, Math.max(1, Math.floor(rawLimit)))
    : defaultLimit;

  const defaultFilms = getHomeFilmRecsDefault(films, limit);

  if (config?.sourceType === 'manual') {
    return resolveConfigFilms(films, config, defaultFilms, opts).slice(0, limit);
  }

  const effectiveGenre = resolveFilmSectionGenre(config);
  const hasFilters = Boolean(
    config?.category?.trim() ||
      effectiveGenre ||
      config?.tag?.trim() ||
      config?.sortBy?.trim()
  );

  if (config && hasFilters) {
    return resolveConfigFilms(films, { ...config, limit }, defaultFilms, opts).slice(0, limit);
  }

  return defaultFilms;
}

/**
 * Resolves the homepage "Curated Film Recommendations" film list from the
 * saved section configuration. Default limit 6, capped at 12.
 */
export function resolveHomeFilmRecs(
  films: FilmItem[],
  config?: SectionConfig,
  opts?: { seed?: number }
): FilmItem[] {
  return resolveCuratedFilms(films, config, 6, 12, opts);
}

/**
 * Resolves the hero "To Watch" tab film list. Same editorial rule and
 * manual/auto handling as the homepage recommendations, with a default limit
 * of 5 and a cap of 8.
 */
export function getHeroToWatch(
  films: FilmItem[],
  config?: SectionConfig,
  opts?: { seed?: number }
): FilmItem[] {
  return resolveCuratedFilms(films, config, 5, 8, opts);
}

/**
 * Resolves the homepage "Explore What's Streaming" film list. When a platform
 * is supplied (platform tab) it overrides the admin-fixed platform, and the
 * platform filter is applied before the section limit.
 */
export function resolveHomeStreaming(
  films: FilmItem[],
  config?: SectionConfig,
  platform?: string,
  opts?: { now?: Date; seed?: number }
): FilmItem[] {
  if (config && config.enabled === false) return [];

  const merged: SectionConfig = {
    sourceType: 'auto',
    ...config,
    platform: platform || config?.platform,
    limit: config?.limit ?? 12,
  };

  return resolveFilmDbSection('fd_streaming', films, merged, opts);
}

/**
 * Resolves the homepage "Film Indonesia" film list. Same rules as the Film
 * Database "Film Indonesia" section, with a default limit of 12.
 */
export function resolveHomeFilmIndonesia(
  films: FilmItem[],
  config?: SectionConfig,
  opts?: { now?: Date; seed?: number }
): FilmItem[] {
  if (config && config.enabled === false) return [];

  const merged: SectionConfig = {
    sourceType: 'auto',
    ...config,
    limit: config?.limit ?? 12,
  };

  return resolveFilmDbSection('fd_film_indonesia', films, merged, opts);
}

/**
 * Extracts effective release date, preferring Indonesian theatrical release (idReleaseDate)
 * over general releaseDate. Returns null if invalid or missing.
 */
export function getFilmEffectiveReleaseDate(film: FilmItem): Date | null {
  const raw = film.idReleaseDate?.trim() || film.releaseDate?.trim();
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Normalizes skorSotoy to a 10-point scale using scoreScale.
 */
export function normalizeFilmScore(film: FilmItem): number {
  const score = film.skorSotoy ?? 0;
  const scale = film.scoreScale && film.scoreScale > 0 ? film.scoreScale : 10;
  if (scale === 10) return score;
  return (score / scale) * 10;
}

/**
 * Computes mean score of all films that have votes (totalVotes > 0).
 *
 * When no film in the list has real votes (e.g. right after the vote-count
 * migration), the mean falls back to normalizeFilmScore over films with a
 * positive normalized score. Returns 0 only when neither set has an entry.
 */
export function computeMeanScore(films: FilmItem[]): number {
  let sum = 0;
  let count = 0;
  for (const f of films) {
    if ((f.totalVotes || 0) > 0) {
      sum += normalizeFilmScore(f);
      count++;
    }
  }
  if (count > 0) return sum / count;

  let fallbackSum = 0;
  let fallbackCount = 0;
  for (const f of films) {
    const score = normalizeFilmScore(f);
    if (score > 0) {
      fallbackSum += score;
      fallbackCount++;
    }
  }
  return fallbackCount > 0 ? fallbackSum / fallbackCount : 0;
}

/**
 * Computes Bayesian weighted score:
 * (v / (v + m)) * R + (m / (v + m)) * C
 * where v = totalVotes, m = 3, R = normalized score, C = mean score.
 *
 * A film without real votes ranks by its own normalized score R (its
 * TMDB-derived score) instead of collapsing to the mean. This keeps the
 * catalogue ordered after vote counts are cleaned up and never zeroes a film
 * with a positive score.
 */
export function computeBayesianScore(film: FilmItem, meanScore: number, m = 3): number {
  const v = film.totalVotes || 0;
  const R = normalizeFilmScore(film);
  if (v <= 0) return R;
  if (v + m <= 0) return 0;
  return (v / (v + m)) * R + (m / (v + m)) * meanScore;
}

/**
 * Deterministic comparator for every "views"/"votes" sort: real votes first,
 * then normalized score (descending), then title (ascending). Without real
 * votes the normalized score still produces a meaningful, stable order instead
 * of an arbitrary tie.
 */
export function compareFilmsByVotesThenScore(a: FilmItem, b: FilmItem): number {
  const votesDiff = (b.totalVotes || 0) - (a.totalVotes || 0);
  if (votesDiff !== 0) return votesDiff;
  const scoreDiff = normalizeFilmScore(b) - normalizeFilmScore(a);
  if (scoreDiff !== 0) return scoreDiff;
  return (a.title || '').localeCompare(b.title || '');
}

/**
 * Checks if a film is classified as animation (type 'animation' / 'anime' or genre containing 'Animation' / 'Animasi').
 */
export function isAnimationFilm(film: FilmItem): boolean {
  const t = (film.type || '').toLowerCase();
  if (t === 'animation' || t === 'anime') return true;
  if (Array.isArray(film.genres)) {
    return film.genres.some(g => /animas?i|animation/i.test(g));
  }
  return false;
}

/**
 * Checks if a film is Indonesian: originCountry contains "ID"
 * (case-insensitive) or tags contains "Film Indonesia" (case-insensitive).
 * The tag is a manual override for films without TMDB country data.
 */
export function isIndonesianFilm(film: FilmItem): boolean {
  const originCountry = Array.isArray(film.originCountry) ? film.originCountry : [];
  if (originCountry.some(code => String(code || '').trim().toUpperCase() === 'ID')) {
    return true;
  }

  const tags = Array.isArray(film.tags) ? film.tags : [];
  return tags.some(tag => String(tag || '').trim().toLowerCase() === 'film indonesia');
}

/**
 * Parses a film duration into total minutes.
 *
 * Supported inputs: "1h 40m", "2h", "45m", "100 min", bare numeric strings,
 * and numbers. Anything else ("12 Episodes", empty strings, malformed values)
 * returns null so callers can exclude films without a real runtime.
 */
export function parseDurationMinutes(
  duration?: string | number | null
): number | null {
  if (duration === null || duration === undefined) return null;

  if (typeof duration === 'number') {
    return Number.isFinite(duration) && duration > 0 ? Math.round(duration) : null;
  }

  const raw = String(duration).trim();
  if (!raw) return null;

  const hoursMatch = raw.match(/(\d+(?:[.,]\d+)?)\s*(?:hours?|hrs?|h|jam)(?![a-z])/i);
  const minutesMatch = raw.match(/(\d+(?:[.,]\d+)?)\s*(?:minutes?|mins?|min|menit|m)(?![a-z])/i);

  if (hoursMatch || minutesMatch) {
    const toNumber = (value?: string): number =>
      value ? parseFloat(value.replace(',', '.')) : 0;
    const hours = toNumber(hoursMatch?.[1]);
    const minutes = toNumber(minutesMatch?.[1]);
    const total = Math.round(hours * 60 + minutes);
    return total > 0 ? total : null;
  }

  if (/^\d+(?:[.,]\d+)?$/.test(raw)) {
    const total = Math.round(parseFloat(raw.replace(',', '.')));
    return total > 0 ? total : null;
  }

  return null;
}

export interface TrendingEntry {
  id: number;
  mediaType: 'movie' | 'tv';
}

export interface FilmDbResolveOpts {
  now?: Date;
  seed?: number;
  /** TMDB weekly trending entries (movie + tv), already in TMDB rank order. */
  trending?: TrendingEntry[];
}

export type TrendingTab = 'all' | 'movie' | 'tv';

/**
 * Maps TMDB media types a film may be matched against. Type 'series' matches
 * the tv trending list, 'animation'/'anime' can appear in both trending lists,
 * everything else is treated as a movie.
 */
export function getFilmTmdbMediaTypes(film: FilmItem): ('movie' | 'tv')[] {
  const t = (film.type || '').toLowerCase();
  if (t === 'series') return ['tv'];
  if (t === 'animation' || t === 'anime') return ['movie', 'tv'];
  return ['movie'];
}

/**
 * Builds a rank map keyed by `${mediaType}:${id}`. The first occurrence of a
 * key wins, so the map value is the TMDB rank (0-based index of the entry).
 */
function buildTrendingRankMap(entries: TrendingEntry[]): Map<string, number> {
  const ranks = new Map<string, number>();
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    if (!entry || typeof entry.id !== 'number') continue;
    const key = `${entry.mediaType}:${entry.id}`;
    if (!ranks.has(key)) ranks.set(key, index);
  }
  return ranks;
}

/**
 * Best (lowest) TMDB trending rank for a film across its possible media types.
 * Films without a valid positive-integer tmdbId never match (Infinity).
 */
function getFilmTrendingRank(film: FilmItem, ranks: Map<string, number>): number {
  const tmdbId = Number(film.tmdbId);
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) return Infinity;

  let best = Infinity;
  for (const mediaType of getFilmTmdbMediaTypes(film)) {
    const rank = ranks.get(`${mediaType}:${tmdbId}`);
    if (rank !== undefined && rank < best) best = rank;
  }
  return best;
}

/**
 * Resolves a Film Database section by section key, applying default rules,
 * optional user config filters, Bayesian ranking, and limit.
 */
export function resolveFilmDbSection(
  key: HomepageSectionKey,
  films: FilmItem[],
  config?: SectionConfig,
  opts?: FilmDbResolveOpts
): FilmItem[] {
  // If explicitly disabled, return empty list
  if (config && config.enabled === false) {
    return [];
  }

  const isRecSection = key.startsWith('rec_');
  const defaultLimit = (key === 'fd_on_theatres' || key === 'fd_coming_soon') ? 24 : 12;
  const limit = config?.limit && config.limit > 0 ? config.limit : defaultLimit;

  // Manual mode: exact itemIds order, skipping missing IDs, capped by limit
  if (config?.sourceType === 'manual') {
    if (!config.itemIds || config.itemIds.length === 0) return [];
    const filmMap = new Map(films.map(f => [f.id, f]));
    const result: FilmItem[] = [];
    for (const id of config.itemIds) {
      const found = filmMap.get(id);
      if (found) {
        result.push(found);
        if (result.length >= limit) break;
      }
    }
    return result;
  }

  const now = opts?.now ?? new Date();
  const nowMs = now.getTime();
  const past56DaysMs = nowMs - (56 * 24 * 60 * 60 * 1000);

  // Pre-calculate Bayesian mean score across all films in dataset
  const meanScore = computeMeanScore(films);

  // TMDB weekly trending ranks (used by the fd_trending section)
  const trendingRanks = buildTrendingRankMap(opts?.trending ?? []);

  // 1. Apply section default rules
  let filtered: FilmItem[] = [];

  switch (key) {
    case 'fd_on_theatres': {
      // Films with whereToWatch 'cinema' and release date between now-56 days and now
      filtered = films.filter(f => {
        const hasCinema = f.whereToWatch?.some(
          w => w.type === 'cinema' && !isPlaceholderWhereToWatch(w)
        );
        if (!hasCinema) return false;
        const relDate = getFilmEffectiveReleaseDate(f);
        if (!relDate) return false;
        const relMs = relDate.getTime();
        return relMs >= past56DaysMs && relMs <= nowMs;
      });
      break;
    }

    case 'fd_coming_soon': {
      // Films with release date strictly after now
      filtered = films.filter(f => {
        const relDate = getFilmEffectiveReleaseDate(f);
        if (!relDate) return false;
        return relDate.getTime() > nowMs;
      });
      break;
    }

    case 'fd_streaming': {
      // Films with whereToWatch 'stream' (optionally restricted to config.platform)
      const targetPlatform = config?.platform?.trim()
        ? normalizePlatform(config.platform).toLowerCase()
        : null;

      filtered = films.filter(f => {
        if (!f.whereToWatch || !Array.isArray(f.whereToWatch)) return false;
        return f.whereToWatch.some(w => {
          if (isPlaceholderWhereToWatch(w)) return false;
          if (w.type !== 'stream') return false;
          if (!targetPlatform) return true;
          return normalizePlatform(w.platform).toLowerCase() === targetPlatform;
        });
      });
      break;
    }

    case 'fd_animation': {
      // Films with type 'animation' / 'anime' or genre containing Animation / Animasi
      filtered = films.filter(isAnimationFilm);
      break;
    }

    case 'fd_trending': {
      // Films that match a TMDB weekly trending entry by tmdbId + media type
      filtered = films.filter(f => getFilmTrendingRank(f, trendingRanks) !== Infinity);
      break;
    }

    case 'fd_film_indonesia': {
      // Indonesian films by TMDB country of origin, or the manual tag override
      filtered = films.filter(isIndonesianFilm);
      break;
    }

    case 'fd_fans_favourite': {
      // Films with totalVotes >= (config.minVotes ?? 3)
      let minVotes = 3;
      if (typeof config?.minVotes === 'number') {
        minVotes = config.minVotes;
      } else if (config?.minVotes === '' || (config?.minVotes as any) === null) {
        minVotes = 3;
      } else if (config?.minVotes !== undefined) {
        const parsed = Number(config.minVotes);
        minVotes = isNaN(parsed) ? 3 : parsed;
      }
      filtered = films.filter(f => (f.totalVotes || 0) >= minVotes);
      break;
    }

    case 'fd_editors_pick': {
      // Auto mode starts empty so the section stays hidden until the admin
      // either picks films manually or sets at least one filter.
      const hasFilter = Boolean(
        config?.category?.trim() ||
          resolveFilmSectionGenre(config) ||
          config?.tag?.trim()
      );
      filtered = hasFilter ? [...films] : [];
      break;
    }

    case 'rec_tonight': {
      // Every film is eligible; the Bayesian ranking below decides the order.
      filtered = [...films];
      break;
    }

    case 'rec_date_night': {
      // Romantic, comedic and dramatic picks for a shared watch.
      filtered = films.filter(
        f =>
          filmMatchesGenre(f, 'Romance') ||
          filmMatchesGenre(f, 'Comedy') ||
          filmMatchesGenre(f, 'Drama')
      );
      break;
    }

    case 'rec_short_runtime': {
      // 100 minutes or less. Films without a parsable duration are excluded.
      filtered = films.filter(f => {
        const minutes = parseDurationMinutes(f.duration);
        return minutes !== null && minutes <= 100;
      });
      break;
    }

    case 'fd_hidden_gems':
    case 'rec_hidden_gems': {
      // High Sotoy score with a small number of votes. Thresholds are
      // configurable but fall back to 8 / 1 / 15.
      let minScore = 8;
      if (typeof config?.minScore === 'number' && !isNaN(config.minScore)) {
        minScore = config.minScore;
      } else if (config?.minScore !== undefined && (config?.minScore as any) !== '' && (config?.minScore as any) !== null) {
        const parsed = Number(config.minScore);
        minScore = isNaN(parsed) ? 8 : parsed;
      }
      minScore = Math.min(10, Math.max(0, minScore));

      let minVotes = 1;
      if (typeof config?.minVotes === 'number') {
        minVotes = config.minVotes;
      } else if (config?.minVotes === '' || (config?.minVotes as any) === null) {
        minVotes = 1;
      } else if (config?.minVotes !== undefined) {
        const parsed = Number(config.minVotes);
        minVotes = isNaN(parsed) ? 1 : parsed;
      }
      minVotes = Math.max(0, minVotes);

      let maxVotes = 15;
      if (typeof config?.maxVotes === 'number' && !isNaN(config.maxVotes)) {
        maxVotes = config.maxVotes;
      } else if (config?.maxVotes !== undefined && (config?.maxVotes as any) !== '' && (config?.maxVotes as any) !== null) {
        const parsed = Number(config.maxVotes);
        maxVotes = isNaN(parsed) ? 15 : parsed;
      }
      maxVotes = Math.max(minVotes, maxVotes);

      filtered = films.filter(f => {
        const votes = f.totalVotes || 0;
        return normalizeFilmScore(f) >= minScore && votes >= minVotes && votes <= maxVotes;
      });
      break;
    }

    default: {
      filtered = [...films];
      break;
    }
  }

  // 2. Apply optional config filters (category, subCategory, tag, platform)
  if (config?.category && config.category.trim()) {
    const cat = config.category.trim().toLowerCase();
    filtered = filtered.filter(f => {
      const filmType = (f.type || '').toLowerCase();
      if (cat === 'animation' || cat === 'anime') {
        return isAnimationFilm(f);
      }
      if (cat === 'movie' || cat === 'movies') {
        return filmType === 'movie' || filmType === 'movies' || !filmType;
      }
      if (cat === 'series') {
        return filmType === 'series';
      }
      return filmType === cat;
    });
  }

  const effectiveGenre = resolveFilmSectionGenre(config);
  if (effectiveGenre) {
    filtered = filtered.filter(f => filmMatchesGenre(f, effectiveGenre));
  }

  if (config?.tag && config.tag.trim()) {
    const t = config.tag.trim();
    filtered = filtered.filter(
      f =>
        filmMatchesGenre(f, t) ||
        f.tags?.some(tag => tag.trim().toLowerCase() === t.toLowerCase())
    );
  }

  // If section is not fd_streaming but config.platform is provided, filter platform as well
  if (key !== 'fd_streaming' && config?.platform && config.platform.trim()) {
    const targetPlatform = normalizePlatform(config.platform).toLowerCase();
    filtered = filtered.filter(f =>
      f.whereToWatch?.some(w => normalizePlatform(w.platform).toLowerCase() === targetPlatform)
    );
  }

  // New configurable sections must never render the same film twice.
  if (
    key === 'fd_editors_pick' ||
    key === 'fd_hidden_gems' ||
    key === 'fd_film_indonesia' ||
    key === 'fd_trending' ||
    isRecSection
  ) {
    const seenIds = new Set<string>();
    filtered = filtered.filter(f => {
      if (seenIds.has(f.id)) return false;
      seenIds.add(f.id);
      return true;
    });
  }

  // 3. Sorting
  const sortBy = config?.sortBy;
  const hasSortBy = typeof sortBy === 'string' && sortBy.trim() !== '';
  if (hasSortBy) {
    switch (sortBy) {
      case 'random': {
        filtered = seededShuffle(filtered, opts?.seed ?? getPageLoadSeed());
        break;
      }
      case 'rating': {
        filtered.sort((a, b) => normalizeFilmScore(b) - normalizeFilmScore(a));
        break;
      }
      case 'views':
      case 'votes': {
        filtered.sort(compareFilmsByVotesThenScore);
        break;
      }
      case 'release_soonest': {
        filtered.sort((a, b) => {
          const dateA = getFilmEffectiveReleaseDate(a)?.getTime() ?? Infinity;
          const dateB = getFilmEffectiveReleaseDate(b)?.getTime() ?? Infinity;
          return dateA - dateB;
        });
        break;
      }
      case 'newest':
      default: {
        filtered.sort((a, b) => {
          const dateA = getFilmEffectiveReleaseDate(a)?.getTime();
          const dateB = getFilmEffectiveReleaseDate(b)?.getTime();
          if (dateA !== undefined && dateB !== undefined) {
            return dateB - dateA;
          }
          if (dateB !== undefined) return 1;
          if (dateA !== undefined) return -1;
          return (b.year || 0) - (a.year || 0);
        });
        break;
      }
    }
  } else {
    // Default sorting based on section key
    switch (key) {
      case 'fd_on_theatres':
      case 'fd_streaming': {
        // Newest release first
        filtered.sort((a, b) => {
          const dateA = getFilmEffectiveReleaseDate(a)?.getTime();
          const dateB = getFilmEffectiveReleaseDate(b)?.getTime();
          if (dateA !== undefined && dateB !== undefined) {
            return dateB - dateA;
          }
          if (dateB !== undefined) return 1;
          if (dateA !== undefined) return -1;
          return (b.year || 0) - (a.year || 0);
        });
        break;
      }

      case 'fd_film_indonesia': {
        // Effective release date newest first, then title.
        filtered.sort((a, b) => {
          const dateA = getFilmEffectiveReleaseDate(a)?.getTime();
          const dateB = getFilmEffectiveReleaseDate(b)?.getTime();
          if (dateA !== undefined && dateB !== undefined && dateA !== dateB) {
            return dateB - dateA;
          }
          if (dateA !== undefined && dateB === undefined) return -1;
          if (dateA === undefined && dateB !== undefined) return 1;
          if (dateA === undefined && dateB === undefined) {
            const yearDiff = (b.year || 0) - (a.year || 0);
            if (yearDiff !== 0) return yearDiff;
          }
          return (a.title || '').localeCompare(b.title || '');
        });
        break;
      }

      case 'fd_coming_soon': {
        // Soonest release first
        filtered.sort((a, b) => {
          const dateA = getFilmEffectiveReleaseDate(a)?.getTime() ?? Infinity;
          const dateB = getFilmEffectiveReleaseDate(b)?.getTime() ?? Infinity;
          return dateA - dateB;
        });
        break;
      }

      case 'fd_trending': {
        // TMDB rank ascending (lower rank = more popular this week)
        filtered.sort(
          (a, b) => getFilmTrendingRank(a, trendingRanks) - getFilmTrendingRank(b, trendingRanks)
        );
        break;
      }

      case 'fd_animation':
      case 'fd_fans_favourite':
      case 'fd_editors_pick':
      case 'rec_tonight':
      case 'rec_date_night':
      case 'rec_short_runtime': {
        // Weighted score (Bayesian) descending
        filtered.sort((a, b) => {
          const scoreB = computeBayesianScore(b, meanScore);
          const scoreA = computeBayesianScore(a, meanScore);
          return scoreB - scoreA;
        });
        break;
      }

      case 'fd_hidden_gems':
      case 'rec_hidden_gems': {
        // Normalized score descending, then fewer votes first, then title.
        filtered.sort((a, b) => {
          const scoreDiff = normalizeFilmScore(b) - normalizeFilmScore(a);
          if (scoreDiff !== 0) return scoreDiff;
          const votesDiff = (a.totalVotes || 0) - (b.totalVotes || 0);
          if (votesDiff !== 0) return votesDiff;
          return (a.title || '').localeCompare(b.title || '');
        });
        break;
      }

      default: {
        filtered.sort((a, b) => (b.year || 0) - (a.year || 0));
        break;
      }
    }
  }

  // 4. Limit
  return filtered.slice(0, limit);
}

/**
 * Re-applies the film database section resolver for a streaming platform chip.
 * The platform is applied before the resolver limit so a chip click never
 * returns fewer items than the configured limit when enough films match.
 */
export function resolveStreamingForPlatform(
  films: FilmItem[],
  config: SectionConfig,
  platform?: string,
  opts?: { now?: Date; seed?: number }
): FilmItem[] {
  return resolveFilmDbSection(
    'fd_streaming',
    films,
    { ...config, platform: platform || config.platform },
    opts
  );
}

export type ComingSoonTab = 'movies' | 'streaming' | 'animation';

export interface ComingSoonTabInfo {
  id: ComingSoonTab;
  tab: ComingSoonTab;
  label: string;
  name: string;
  count: number;
}

/**
 * Categorizes an upcoming film into one of three mutually exclusive Coming Soon tabs:
 * Priority:
 * 1. isAnimationFilm(film) -> 'animation'
 * 2. else if the film type is series OR it has whereToWatch type 'stream' and no 'cinema' -> 'streaming'
 * 3. else -> 'movies'
 */
export function getComingSoonTab(film: FilmItem): ComingSoonTab {
  if (isAnimationFilm(film)) {
    return 'animation';
  }

  const isSeries = (film.type || '').toLowerCase() === 'series';
  const hasStream = Array.isArray(film.whereToWatch) && film.whereToWatch.some(w => w.type === 'stream');
  const hasCinema = Array.isArray(film.whereToWatch) && film.whereToWatch.some(w => w.type === 'cinema');

  if (isSeries || (hasStream && !hasCinema)) {
    return 'streaming';
  }

  return 'movies';
}

/**
 * Resolves upcoming films for a specific Coming Soon tab.
 * Reuses resolveFilmDbSection('fd_coming_soon', ...) but applies the tab filter
 * BEFORE the limit (the same approach resolveStreamingForPlatform uses, so a tab
 * never returns fewer items than the limit when enough films match).
 */
export function resolveComingSoonForTab(
  films: FilmItem[],
  config: SectionConfig | undefined,
  tab: ComingSoonTab,
  opts?: { now?: Date; seed?: number }
): FilmItem[] {
  const tabFilms = films.filter(f => getComingSoonTab(f) === tab);
  return resolveFilmDbSection('fd_coming_soon', tabFilms, config, opts);
}

/**
 * Computes the non-empty Coming Soon tabs with their counts.
 * Uses the existing rules for fd_coming_soon (release date strictly after now,
 * and optional section filters).
 */
export function getComingSoonTabs(
  films: FilmItem[],
  config?: SectionConfig,
  opts?: { now?: Date; seed?: number }
): ComingSoonTabInfo[] {
  if (config && config.enabled === false) return [];

  // Evaluate all films that meet the fd_coming_soon criteria without limit truncation
  const allComingSoon = resolveFilmDbSection(
    'fd_coming_soon',
    films,
    { sourceType: 'auto' as const, ...config, limit: Number.MAX_SAFE_INTEGER },
    opts
  );

  const counts: Record<ComingSoonTab, number> = {
    movies: 0,
    streaming: 0,
    animation: 0,
  };

  for (const film of allComingSoon) {
    const tab = getComingSoonTab(film);
    counts[tab] = (counts[tab] || 0) + 1;
  }

  const tabDefs: Array<{ id: ComingSoonTab; label: string }> = [
    { id: 'movies', label: 'Movies' },
    { id: 'streaming', label: 'Streaming' },
    { id: 'animation', label: 'Animation' },
  ];

  return tabDefs
    .filter(t => counts[t.id] > 0)
    .map(t => ({
      id: t.id,
      tab: t.id,
      label: t.label,
      name: t.label,
      count: counts[t.id],
    }));
}

export interface TrendingTabInfo {
  id: TrendingTab;
  label: string;
  count: number;
}

/**
 * Resolves trending films for one trending tab. The trending entries are
 * filtered by the tab media type first ('all' keeps every entry), then the
 * fd_trending resolver runs with them, so a tab never returns fewer items than
 * the limit when enough films match.
 */
export function resolveTrendingForTab(
  films: FilmItem[],
  config: SectionConfig | undefined,
  trending: TrendingEntry[],
  tab: TrendingTab,
  opts?: FilmDbResolveOpts
): FilmItem[] {
  const tabTrending =
    tab === 'all' ? trending : trending.filter(entry => entry.mediaType === tab);

  return resolveFilmDbSection('fd_trending', films, config, { ...opts, trending: tabTrending });
}

/**
 * Computes the non-empty Trending tabs with their counts. Disabled or manual
 * sections have no auto tabs. Counts are computed without the section limit.
 */
export function getTrendingTabs(
  films: FilmItem[],
  config?: SectionConfig,
  trending?: TrendingEntry[],
  opts?: FilmDbResolveOpts
): TrendingTabInfo[] {
  if (config && (config.enabled === false || config.sourceType === 'manual')) return [];
  if (!trending || trending.length === 0) return [];

  const tabDefs: Array<{ id: TrendingTab; label: string }> = [
    { id: 'all', label: 'Semua' },
    { id: 'movie', label: 'Film' },
    { id: 'tv', label: 'Series' },
  ];

  return tabDefs
    .map(def => {
      const merged: SectionConfig = {
        sourceType: 'auto',
        ...config,
        limit: Number.MAX_SAFE_INTEGER,
      };
      return {
        id: def.id,
        label: def.label,
        count: resolveTrendingForTab(films, merged, trending, def.id, opts).length,
      };
    })
    .filter(tab => tab.count > 0);
}

export interface FilmDbSection {
  key: HomepageSectionKey;
  title: string;
  description: string;
  films: FilmItem[];
  platforms?: { name: string; count: number }[];
  activePlatform?: string;
  comingSoonTabs?: ComingSoonTabInfo[];
}

/**
 * Builds the ordered, render-ready list of Film Database sections from the
 * saved homepage configuration. Sections that are disabled or resolve to an
 * empty film list are omitted.
 */
export function buildFilmDbSections(
  films: FilmItem[],
  homepageConfig?: HomepageSectionsConfig | null,
  opts?: FilmDbResolveOpts
): FilmDbSection[] {
  const config = homepageConfig ?? undefined;
  const order = resolveFilmDbSectionOrder(config?.filmDbSectionOrder);
  const metaByKey = new Map(HOMEPAGE_SECTIONS_META.map(meta => [meta.key, meta]));

  const sections: FilmDbSection[] = [];

  for (const key of order) {
    const meta = metaByKey.get(key);
    if (!meta || meta.area !== 'film_database') continue;

    const sectionConfig: SectionConfig = config?.sections?.[key] ?? { sourceType: 'auto' };
    if (sectionConfig.enabled === false) continue;

    // fd_trending is data-driven: it stays hidden without TMDB trending data
    if (key === 'fd_trending' && !(opts?.trending && opts.trending.length > 0)) continue;

    const resolvedFilms = resolveFilmDbSection(key, films, sectionConfig, opts);
    if (resolvedFilms.length === 0) continue;

    const section: FilmDbSection = {
      key,
      title: sectionConfig.title?.trim() || meta.defaultTitle,
      description: sectionConfig.description?.trim() || meta.defaultDescription || '',
      films: resolvedFilms,
    };

    if (key === 'fd_streaming') {
      section.platforms = sectionConfig.platform ? [] : getStreamingPlatforms(films);
      section.activePlatform = sectionConfig.platform;
    }

    if (key === 'fd_coming_soon') {
      section.comingSoonTabs = getComingSoonTabs(films, sectionConfig, opts);
    }

    sections.push(section);
  }

  return sections;
}

// ---------------------------------------------------------------------------
// Manual film picker helpers (used by the admin section editor)
// ---------------------------------------------------------------------------

export type FilmPickerTypeLabel = 'Movie' | 'Series' | 'Animation';

export interface FilmPickerRow {
  id: string;
  title: string;
  year: number;
  typeLabel: FilmPickerTypeLabel;
  /** Poster URL, already falling back to DEFAULT_POSTER when empty. */
  poster: string;
}

export type FilmPickerSelectionEntry =
  | { id: string; found: true; row: FilmPickerRow }
  | { id: string; found: false; row: null };

/**
 * Maps a film type to the small label shown in the manual picker.
 */
export function getFilmPickerTypeLabel(
  film: Pick<FilmItem, 'type'> | null | undefined
): FilmPickerTypeLabel {
  const format = normalizeFilmType(film?.type);
  if (format === 'series') return 'Series';
  if (format === 'animation') return 'Animation';
  return 'Movie';
}

/**
 * Builds the display data for one manual picker row (poster, title, year, type).
 */
export function getFilmPickerRow(film: FilmItem): FilmPickerRow {
  const rawPoster = typeof film.poster === 'string' ? film.poster.trim() : '';

  return {
    id: film.id,
    title: film.title || '',
    year: film.year || 0,
    typeLabel: getFilmPickerTypeLabel(film),
    poster: rawPoster || DEFAULT_POSTER,
  };
}

/**
 * Searches films for the manual picker by title, original title and year.
 * Every whitespace-separated token must match the combined haystack, so
 * "dune 2024" finds "Dune: Part Two" (2024) while a bare "2024" lists all
 * films from that year. The result is capped at `limit` (default 8).
 */
export function searchFilmPickerItems(
  films: FilmItem[],
  query: string,
  limit = 8
): FilmItem[] {
  const normalizedQuery = (query || '').trim().toLowerCase();
  if (!normalizedQuery) return [];

  const max = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 8;
  if (max === 0) return [];

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const results: FilmItem[] = [];

  for (const film of films) {
    const haystack = [film.title, film.originalTitle, film.year ? String(film.year) : '']
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (!tokens.every(token => haystack.includes(token))) continue;

    results.push(film);
    if (results.length >= max) break;
  }

  return results;
}

/**
 * Resolves saved manual item ids into picker rows, preserving their saved
 * order and flagging ids that no longer exist in the catalogue.
 */
export function buildFilmPickerSelection(
  films: FilmItem[],
  itemIds: string[] | null | undefined
): FilmPickerSelectionEntry[] {
  const filmMap = new Map(films.map(film => [film.id, film]));

  return (Array.isArray(itemIds) ? itemIds : []).map(id => {
    const film = filmMap.get(id);
    if (!film) return { id, found: false as const, row: null };
    return { id, found: true as const, row: getFilmPickerRow(film) };
  });
}

