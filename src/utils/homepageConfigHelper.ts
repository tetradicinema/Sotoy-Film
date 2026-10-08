import { FilmItem, Article, SectionConfig, HomepageSectionKey, MainCategory } from '../types';

export interface SectionMeta {
  key: HomepageSectionKey;
  label: string;
  defaultTitle: string;
  targetType: 'films' | 'articles';
  description: string;
  defaultRule: string;
  allowedCategories: (MainCategory | 'movie' | 'series' | 'anime')[];
}

export const ALL_ARTICLE_CATEGORIES: MainCategory[] = [
  'movies',
  'series',
  'anime',
  'cinema-gear',
  'film-studies',
];

export const ALL_FILM_CATEGORIES: ('movie' | 'series' | 'anime')[] = [
  'movie',
  'series',
  'anime',
];

export const DEFAULT_SECTION_ORDER: HomepageSectionKey[] = [
  'hero_to_watch',
  'recent',
  'gear',
  'movie_list',
  'series_list',
  'anime_list',
  'cinema_gear_articles',
  'reviews_movie',
  'reviews_series',
  'anime_news',
  'film_studies',
];

export const HOMEPAGE_SECTIONS_META: SectionMeta[] = [
  {
    key: 'hero_to_watch',
    label: 'Hero: To Watch Tab',
    defaultTitle: 'To Watch',
    targetType: 'films',
    description: 'Panel hero, tab rekomendasi tontonan (kanan hero banner)',
    defaultRule: 'Film/serial rekomendasi rating tertinggi (skor sotoy ≥ 4.5)',
    allowedCategories: ALL_FILM_CATEGORIES,
  },
  {
    key: 'recent',
    label: 'Hero: Recent Articles Tab',
    defaultTitle: 'Recent',
    targetType: 'articles',
    description: 'Panel hero, tab artikel terbaru (kanan hero banner)',
    defaultRule: 'Artikel terbaru dari semua kategori',
    allowedCategories: ALL_ARTICLE_CATEGORIES,
  },
  {
    key: 'gear',
    label: 'Hero: Gear Addict Tab',
    defaultTitle: 'Gear',
    targetType: 'articles',
    description: 'Panel hero, tab kurasi ketiga (kanan hero banner)',
    defaultRule: 'Artikel kategori Cinema Gear & Tech',
    allowedCategories: ALL_ARTICLE_CATEGORIES,
  },
  {
    key: 'movie_list',
    label: 'Seksi 1: Movie Lists',
    defaultTitle: 'Movie Lists',
    targetType: 'articles',
    description: 'Seksi 1, kolom 1 (daftar vertikal dengan poster)',
    defaultRule: 'Artikel kategori Movies (urutan terbaru)',
    allowedCategories: ALL_ARTICLE_CATEGORIES,
  },
  {
    key: 'series_list',
    label: 'Seksi 1: Series Lists',
    defaultTitle: 'Series Lists',
    targetType: 'articles',
    description: 'Seksi 1, kolom 2 (daftar vertikal dengan poster)',
    defaultRule: 'Artikel kategori Series (urutan terbaru)',
    allowedCategories: ALL_ARTICLE_CATEGORIES,
  },
  {
    key: 'anime_list',
    label: 'Seksi 1: Anime Lists',
    defaultTitle: 'Anime Lists',
    targetType: 'articles',
    description: 'Seksi 1, kolom 3 (daftar vertikal dengan poster)',
    defaultRule: 'Artikel kategori Anime (urutan terbaru)',
    allowedCategories: ALL_ARTICLE_CATEGORIES,
  },
  {
    key: 'cinema_gear_articles',
    label: 'Seksi 2: Cinema Gear & Tech',
    defaultTitle: 'Cinema Gear & Filmmaking Tech',
    targetType: 'articles',
    description: 'Seksi 2, carousel besar',
    defaultRule: 'Artikel kategori Cinema Gear & Tech',
    allowedCategories: ALL_ARTICLE_CATEGORIES,
  },
  {
    key: 'reviews_movie',
    label: 'Seksi 3: Movie Reviews',
    defaultTitle: 'Review Film Bioskop',
    targetType: 'articles',
    description: 'Seksi 3, grid 2-kolom sebelah kiri',
    defaultRule: 'Artikel kategori Movies (ulasan & review film)',
    allowedCategories: ALL_ARTICLE_CATEGORIES,
  },
  {
    key: 'reviews_series',
    label: 'Seksi 3: Series Reviews',
    defaultTitle: 'Review Serial Streaming',
    targetType: 'articles',
    description: 'Seksi 3, grid 2-kolom sebelah kanan',
    defaultRule: 'Artikel kategori Series (ulasan & review serial)',
    allowedCategories: ALL_ARTICLE_CATEGORIES,
  },
  {
    key: 'anime_news',
    label: 'Seksi 4: Anime News Wire',
    defaultTitle: 'Anime News & Season Updates',
    targetType: 'articles',
    description: 'Seksi 4, grid artikel gaya news ticker',
    defaultRule: 'Artikel kategori Anime (kabar & berita terkini)',
    allowedCategories: ALL_ARTICLE_CATEGORIES,
  },
  {
    key: 'film_studies',
    label: 'Seksi 5: Film Studies & Essays',
    defaultTitle: 'Film Studies & Cinematic Analysis',
    targetType: 'articles',
    description: 'Seksi 5, kartu esai sinematik vertikal & mendalam',
    defaultRule: 'Artikel kategori Film Studies (kajian sinema)',
    allowedCategories: ALL_ARTICLE_CATEGORIES,
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
  if (config.category && config.category.trim()) {
    const cat = config.category.trim().toLowerCase();
    filtered = filtered.filter(f => {
      const filmType = (f.type || '').toLowerCase();
      if (cat === 'movie' || cat === 'movies') {
        return filmType === 'movie' || filmType === 'movies' || !filmType;
      }
      return filmType === cat;
    });
  }
  if (config.subCategory && config.subCategory.trim()) {
    const sub = config.subCategory.trim().toLowerCase();
    filtered = filtered.filter(f => 
      f.genres?.some((g: string) => g.trim().toLowerCase() === sub) ||
      f.tags?.some((tag: string) => tag.trim().toLowerCase() === sub) ||
      f.type?.toLowerCase() === sub
    );
  }
  if (config.tag && config.tag.trim()) {
    const t = config.tag.trim().toLowerCase();
    filtered = filtered.filter(f => 
      f.genres?.some((g: string) => g.trim().toLowerCase() === t) ||
      f.tags?.some((tag: string) => tag.trim().toLowerCase() === t)
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
  const sliced = filtered.slice(0, limit);
  return sliced.length > 0 ? sliced : defaultFilms;
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
  if (config.category && config.category.trim()) {
    const cat = config.category.trim().toLowerCase();
    filtered = filtered.filter(a => (a.category || '').toLowerCase() === cat);
  }
  if (config.subCategory && config.subCategory.trim()) {
    const sub = config.subCategory.trim().toLowerCase();
    filtered = filtered.filter(a =>
      (a.subCategory || '').trim().toLowerCase() === sub ||
      a.tags?.some(tag => tag.trim().toLowerCase() === sub)
    );
  }
  if (config.tag && config.tag.trim()) {
    const t = config.tag.trim().toLowerCase();
    filtered = filtered.filter(a =>
      (a.subCategory && a.subCategory.trim().toLowerCase() === t) ||
      a.tags?.some(tag => tag.trim().toLowerCase() === t)
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
  const sliced = filtered.slice(0, limit);
  return sliced.length > 0 ? sliced : defaultArticles;
}
