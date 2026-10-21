import { FilmItem, SectionConfig, HomepageSectionKey, HomepageSectionsConfig } from '../types';
import { HOMEPAGE_SECTIONS_META, resolveFilmDbSectionOrder } from './homepageConfigHelper';

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
 * Returns 0 if none.
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
  return count > 0 ? sum / count : 0;
}

/**
 * Computes Bayesian weighted score:
 * (v / (v + m)) * R + (m / (v + m)) * C
 * where v = totalVotes, m = 3, R = normalized score, C = mean score.
 */
export function computeBayesianScore(film: FilmItem, meanScore: number, m = 3): number {
  const v = film.totalVotes || 0;
  const R = normalizeFilmScore(film);
  if (v + m <= 0) return 0;
  return (v / (v + m)) * R + (m / (v + m)) * meanScore;
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
 * Resolves a Film Database section by section key, applying default rules,
 * optional user config filters, Bayesian ranking, and limit.
 */
export function resolveFilmDbSection(
  key: HomepageSectionKey,
  films: FilmItem[],
  config?: SectionConfig,
  opts?: { now?: Date }
): FilmItem[] {
  // If explicitly disabled, return empty list
  if (config && config.enabled === false) {
    return [];
  }

  const limit = config?.limit && config.limit > 0 ? config.limit : 12;

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

  // 1. Apply section default rules
  let filtered: FilmItem[] = [];

  switch (key) {
    case 'fd_on_theatres': {
      // Films with whereToWatch 'cinema' and release date between now-56 days and now
      filtered = films.filter(f => {
        const hasCinema = f.whereToWatch?.some(w => w.type === 'cinema');
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

  if (config?.subCategory && config.subCategory.trim()) {
    const sub = config.subCategory.trim().toLowerCase();
    filtered = filtered.filter(f =>
      f.genres?.some(g => g.trim().toLowerCase() === sub) ||
      f.tags?.some(tag => tag.trim().toLowerCase() === sub) ||
      (f.type || '').toLowerCase() === sub
    );
  }

  if (config?.tag && config.tag.trim()) {
    const t = config.tag.trim().toLowerCase();
    filtered = filtered.filter(f =>
      f.genres?.some(g => g.trim().toLowerCase() === t) ||
      f.tags?.some(tag => tag.trim().toLowerCase() === t)
    );
  }

  // If section is not fd_streaming but config.platform is provided, filter platform as well
  if (key !== 'fd_streaming' && config?.platform && config.platform.trim()) {
    const targetPlatform = normalizePlatform(config.platform).toLowerCase();
    filtered = filtered.filter(f =>
      f.whereToWatch?.some(w => normalizePlatform(w.platform).toLowerCase() === targetPlatform)
    );
  }

  // 3. Sorting
  const sortBy = config?.sortBy;
  const hasSortBy = typeof sortBy === 'string' && sortBy.trim() !== '';
  if (hasSortBy) {
    switch (sortBy) {
      case 'rating': {
        filtered.sort((a, b) => normalizeFilmScore(b) - normalizeFilmScore(a));
        break;
      }
      case 'views':
      case 'votes': {
        filtered.sort((a, b) => (b.totalVotes || 0) - (a.totalVotes || 0));
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

      case 'fd_coming_soon': {
        // Soonest release first
        filtered.sort((a, b) => {
          const dateA = getFilmEffectiveReleaseDate(a)?.getTime() ?? Infinity;
          const dateB = getFilmEffectiveReleaseDate(b)?.getTime() ?? Infinity;
          return dateA - dateB;
        });
        break;
      }

      case 'fd_animation':
      case 'fd_fans_favourite': {
        // Weighted score (Bayesian) descending
        filtered.sort((a, b) => {
          const scoreB = computeBayesianScore(b, meanScore);
          const scoreA = computeBayesianScore(a, meanScore);
          return scoreB - scoreA;
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
  opts?: { now?: Date }
): FilmItem[] {
  return resolveFilmDbSection(
    'fd_streaming',
    films,
    { ...config, platform: platform || config.platform },
    opts
  );
}

export interface FilmDbSection {
  key: HomepageSectionKey;
  title: string;
  description: string;
  films: FilmItem[];
  platforms?: { name: string; count: number }[];
  activePlatform?: string;
}

/**
 * Builds the ordered, render-ready list of Film Database sections from the
 * saved homepage configuration. Sections that are disabled or resolve to an
 * empty film list are omitted.
 */
export function buildFilmDbSections(
  films: FilmItem[],
  homepageConfig?: HomepageSectionsConfig | null,
  opts?: { now?: Date }
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

    sections.push(section);
  }

  return sections;
}
