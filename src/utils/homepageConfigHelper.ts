import { FilmItem, Article, SectionConfig, HomepageSectionKey, MainCategory } from '../types';

export interface SectionMeta {
  key: HomepageSectionKey;
  label: string;
  defaultTitle: string;
  targetType: 'films' | 'articles';
  description: string;
  allowedCategories: (MainCategory | 'movie' | 'series' | 'anime')[];
}

export const HOMEPAGE_SECTIONS_META: SectionMeta[] = [
  {
    key: 'hero_to_watch',
    label: 'Hero: To Watch Tab',
    defaultTitle: 'To Watch',
    targetType: 'films',
    description: 'Daftar rekomendasi tontonan film/serial di panel hero samping kanan.',
    allowedCategories: ['movie', 'series', 'anime'],
  },
  {
    key: 'recent',
    label: 'Hero: Recent Articles Tab',
    defaultTitle: 'Recent',
    targetType: 'articles',
    description: 'Daftar artikel terbitan terbaru di panel hero samping kanan.',
    allowedCategories: ['movies', 'series', 'anime', 'cinema-gear', 'film-studies'],
  },
  {
    key: 'gear',
    label: 'Hero: Gear Addict Tab',
    defaultTitle: 'Gear',
    targetType: 'articles',
    description: 'Daftar perangkat sinema & tech di panel hero samping kanan.',
    allowedCategories: ['cinema-gear', 'movies', 'series', 'anime', 'film-studies'],
  },
  {
    key: 'movie_list',
    label: 'Seksi 1: Movie Lists',
    defaultTitle: 'Movie Lists',
    targetType: 'articles',
    description: 'Kolom daftar kurasi film layar lebar di Seksi 1.',
    allowedCategories: ['movies'],
  },
  {
    key: 'series_list',
    label: 'Seksi 1: Series Lists',
    defaultTitle: 'Series Lists',
    targetType: 'articles',
    description: 'Kolom daftar kurasi serial tv & streaming di Seksi 1.',
    allowedCategories: ['series'],
  },
  {
    key: 'anime_list',
    label: 'Seksi 1: Anime Lists',
    defaultTitle: 'Anime Lists',
    targetType: 'articles',
    description: 'Kolom daftar kurasi anime pilihan di Seksi 1.',
    allowedCategories: ['anime'],
  },
  {
    key: 'cinema_gear_articles',
    label: 'Seksi 2: Cinema Gear & Tech',
    defaultTitle: 'Cinema Gear & Filmmaking Tech',
    targetType: 'articles',
    description: 'Artikel ulasan perlengkapan sinema di Seksi 2 (carousel & hero banner).',
    allowedCategories: ['cinema-gear'],
  },
  {
    key: 'reviews_movie',
    label: 'Seksi 3: Movie Reviews',
    defaultTitle: 'Review Film Bioskop',
    targetType: 'articles',
    description: 'Kolom ulasan jujur film bioskop di Seksi 3.',
    allowedCategories: ['movies'],
  },
  {
    key: 'reviews_series',
    label: 'Seksi 3: Series Reviews',
    defaultTitle: 'Review Serial Streaming',
    targetType: 'articles',
    description: 'Kolom ulasan jujur serial streaming di Seksi 3.',
    allowedCategories: ['series'],
  },
  {
    key: 'anime_news',
    label: 'Seksi 4: Anime News Wire',
    defaultTitle: 'Anime News & Season Updates',
    targetType: 'articles',
    description: 'Kabar dan update anime di Seksi 4 (news ticker style).',
    allowedCategories: ['anime'],
  },
  {
    key: 'film_studies',
    label: 'Seksi 5: Film Studies & Essays',
    defaultTitle: 'Film Studies & Cinematic Analysis',
    targetType: 'articles',
    description: 'Esai kajian film mendalam di Seksi 5.',
    allowedCategories: ['film-studies'],
  },
];

/**
 * Resolves an ordered list of films based on the section configuration.
 * If no config is provided, exactly returns the default fallback films.
 */
export function resolveConfigFilms(
  allFilms: FilmItem[],
  config?: SectionConfig,
  defaultFilms: FilmItem[] = []
): FilmItem[] {
  if (!config) return defaultFilms;

  // Manual mode: exact itemIds order, skipping missing IDs
  if (config.sourceType === 'manual') {
    if (!config.itemIds || config.itemIds.length === 0) return defaultFilms;
    const filmMap = new Map(allFilms.map(f => [f.id, f]));
    const resolved: FilmItem[] = [];
    for (const id of config.itemIds) {
      const item = filmMap.get(id);
      if (item) resolved.push(item);
    }
    return resolved.length > 0 ? resolved : defaultFilms;
  }

  // Auto mode
  let filtered = [...allFilms];
  if (config.category) {
    filtered = filtered.filter(f => f.type === config.category);
  }
  if (config.tag && config.tag.trim()) {
    const t = config.tag.trim().toLowerCase();
    filtered = filtered.filter(f => 
      f.genres?.some((g: string) => g.toLowerCase().includes(t)) ||
      f.tags?.some((tag: string) => tag.toLowerCase().includes(t)) ||
      f.title?.toLowerCase().includes(t)
    );
  }

  // Sort
  if (config.sortBy === 'rating') {
    filtered.sort((a, b) => (b.skorSotoy || 0) - (a.skorSotoy || 0));
  } else if (config.sortBy === 'views') {
    filtered.sort((a, b) => (b.totalVotes || 0) - (a.totalVotes || 0));
  } else {
    // Newest
    filtered.sort((a, b) => (b.year || 0) - (a.year || 0));
  }

  const limit = config.limit && config.limit > 0 ? config.limit : 5;
  return filtered.slice(0, limit);
}

/**
 * Resolves an ordered list of articles based on the section configuration.
 * If no config is provided, exactly returns the default fallback articles.
 */
export function resolveConfigArticles(
  allArticles: Article[],
  config?: SectionConfig,
  defaultArticles: Article[] = []
): Article[] {
  if (!config) return defaultArticles;

  // Manual mode: exact itemIds order, skipping missing IDs
  if (config.sourceType === 'manual') {
    if (!config.itemIds || config.itemIds.length === 0) return defaultArticles;
    const artMap = new Map(allArticles.map(a => [a.id, a]));
    const resolved: Article[] = [];
    for (const id of config.itemIds) {
      const item = artMap.get(id);
      if (item) resolved.push(item);
    }
    return resolved.length > 0 ? resolved : defaultArticles;
  }

  // Auto mode
  let filtered = [...allArticles];
  if (config.category) {
    filtered = filtered.filter(a => a.category === config.category);
  }
  if (config.tag && config.tag.trim()) {
    const t = config.tag.trim().toLowerCase();
    filtered = filtered.filter(a =>
      a.subCategory?.toLowerCase().includes(t) ||
      a.tags?.some(tag => tag.toLowerCase().includes(t)) ||
      a.title?.toLowerCase().includes(t)
    );
  }

  // Sort
  if (config.sortBy === 'rating') {
    filtered.sort((a, b) => (b.skorSotoy || 0) - (a.skorSotoy || 0));
  } else if (config.sortBy === 'views') {
    filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
  } else {
    // Newest
    filtered.sort((a, b) => {
      const timeA = a.publishedAtTimestamp
        ? new Date(a.publishedAtTimestamp).getTime()
        : new Date(a.publishedAt || 0).getTime();
      const timeB = b.publishedAtTimestamp
        ? new Date(b.publishedAtTimestamp).getTime()
        : new Date(b.publishedAt || 0).getTime();
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    });
  }

  const limit = config.limit && config.limit > 0 ? config.limit : 5;
  return filtered.slice(0, limit);
}
