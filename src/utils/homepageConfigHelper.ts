import { FilmItem, Article, SectionConfig, HomepageSectionKey, MainCategory, HomeBlockKey, HomeSidebarWidgetKey } from '../types';

export interface SectionMeta {
  key: HomepageSectionKey;
  label: string;
  defaultTitle: string;
  targetType: 'films' | 'articles';
  description: string;
  defaultRule: string;
  allowedCategories: (MainCategory | 'movie' | 'series' | 'anime' | 'animation')[];
  area: 'home' | 'film_database';
}

export interface HomeBlockMeta {
  key: HomeBlockKey;
  label: string;
  type: 'wide' | 'column';
  description: string;
}

export interface SidebarWidgetMeta {
  key: HomeSidebarWidgetKey;
  label: string;
  description: string;
}

export const DEFAULT_BLOCK_ORDER: HomeBlockKey[] = [
  'hero',
  'featured_news',
  'film_recommendations',
  'watchlists',
  'cinema_gear',
  'reviews',
  'anime_news',
  'film_studies',
  'explore',
];

export const DEFAULT_SIDEBAR_WIDGET_ORDER: HomeSidebarWidgetKey[] = [
  'live_buzz',
  'leaderboard',
  'recommended_articles',
  'cta',
  'ad',
];

export const HOME_BLOCKS_META: HomeBlockMeta[] = [
  {
    key: 'hero',
    label: 'Hero (Slider + Recent / To Watch / Gear)',
    type: 'wide',
    description: 'Header sinematik dengan slider artikel unggulan dan tab kurasi (Recent, To Watch, Gear)',
  },
  {
    key: 'featured_news',
    label: 'Featured News & Top Stories',
    type: 'wide',
    description: 'Baris 5 kartu berita industri sinema global dan sorotan festival',
  },
  {
    key: 'film_recommendations',
    label: 'Curated Film Recommendations',
    type: 'wide',
    description: 'Koleksi poster film kurasi dengan filter Semua / Terbaru / Populer',
  },
  {
    key: 'watchlists',
    label: 'Curated Watchlists: Movies, Series & Anime',
    type: 'column',
    description: 'Daftar vertikal berisi daftar tontonan kurasi untuk film, serial, dan anime',
  },
  {
    key: 'cinema_gear',
    label: 'Cinema Gear & Filmmaking Tech',
    type: 'column',
    description: 'Carousel interaktif ulasan kamera sinema, lensa, dan teknologi produksi film',
  },
  {
    key: 'reviews',
    label: 'Honest Reviews: Movies & Series',
    type: 'column',
    description: 'Dua kolom ulasan mendalam & objektif untuk rilisan bioskop dan serial streaming',
  },
  {
    key: 'anime_news',
    label: 'Anime News & Season Updates',
    type: 'column',
    description: 'Kawat berita compact dengan update musim anime dan jadwal rilis terkini',
  },
  {
    key: 'film_studies',
    label: 'Film Studies & Cinematic Essays',
    type: 'column',
    description: 'Esai panjang majalah sinematik, teori montase, dan analisis visual',
  },
  {
    key: 'explore',
    label: 'Explore Categories & Archives',
    type: 'column',
    description: 'Navigasi tab kategori, drawer mobile, daftar artikel, dan slot iklan infeed',
  },
];

export const SIDEBAR_WIDGETS_META: SidebarWidgetMeta[] = [
  {
    key: 'live_buzz',
    label: 'Live Buzz & Opini',
    description: 'Feed interaktif opini kilat dan reaksi warga terhadap sinema',
  },
  {
    key: 'leaderboard',
    label: 'Sotoy Leaderboard',
    description: 'Peringkat warga dan kritikus teraktif di platform',
  },
  {
    key: 'recommended_articles',
    label: 'Artikel Rekomendasi',
    description: 'Daftar artikel pilihan redaksi dengan nomor urut',
  },
  {
    key: 'cta',
    label: 'CTA Box',
    description: 'Kotak pendaftaran newsletter Warga Sotoy Club',
  },
  {
    key: 'ad',
    label: 'Banner Iklan',
    description: 'Slot iklan banner sponsor di sidebar',
  },
];

export function resolveBlockOrder(saved?: HomeBlockKey[]): HomeBlockKey[] {
  if (!Array.isArray(saved) || saved.length === 0) {
    return [...DEFAULT_BLOCK_ORDER];
  }
  const validSet = new Set<HomeBlockKey>(DEFAULT_BLOCK_ORDER);
  const result: HomeBlockKey[] = [];
  const seen = new Set<HomeBlockKey>();

  for (const key of saved) {
    if (validSet.has(key) && !seen.has(key)) {
      result.push(key);
      seen.add(key);
    }
  }

  for (const defKey of DEFAULT_BLOCK_ORDER) {
    if (!seen.has(defKey)) {
      result.push(defKey);
      seen.add(defKey);
    }
  }

  return result;
}

export function resolveSidebarWidgetOrder(saved?: HomeSidebarWidgetKey[]): HomeSidebarWidgetKey[] {
  if (!Array.isArray(saved) || saved.length === 0) {
    return [...DEFAULT_SIDEBAR_WIDGET_ORDER];
  }
  const validSet = new Set<HomeSidebarWidgetKey>(DEFAULT_SIDEBAR_WIDGET_ORDER);
  const result: HomeSidebarWidgetKey[] = [];
  const seen = new Set<HomeSidebarWidgetKey>();

  for (const key of saved) {
    if (validSet.has(key) && !seen.has(key)) {
      result.push(key);
      seen.add(key);
    }
  }

  for (const defKey of DEFAULT_SIDEBAR_WIDGET_ORDER) {
    if (!seen.has(defKey)) {
      result.push(defKey);
      seen.add(defKey);
    }
  }

  return result;
}

export const WIDE_BLOCK_KEYS: Set<HomeBlockKey> = new Set(['hero', 'featured_news', 'film_recommendations']);

export function isBlockWide(key: HomeBlockKey): boolean {
  return WIDE_BLOCK_KEYS.has(key);
}

export function resolveHiddenBlocks(saved?: HomeBlockKey[]): HomeBlockKey[] {
  if (!Array.isArray(saved) || saved.length === 0) {
    return [];
  }
  const validSet = new Set<HomeBlockKey>(DEFAULT_BLOCK_ORDER);
  const result: HomeBlockKey[] = [];
  const seen = new Set<HomeBlockKey>();

  for (const key of saved) {
    if (validSet.has(key) && !seen.has(key)) {
      result.push(key);
      seen.add(key);
    }
  }
  return result;
}

/**
 * Computes column blocks that appear in subsequent bands (i.e. separated from the
 * first column band by a wide block). These blocks render without sidebar at container width.
 */
export function getSplitColumnBlocks(
  blockOrder: HomeBlockKey[],
  hiddenBlocks: HomeBlockKey[] = []
): HomeBlockKey[] {
  const hiddenSet = new Set(hiddenBlocks);
  const visibleBlocks = blockOrder.filter(k => !hiddenSet.has(k));

  let sawFirstBand = false;
  let sawWideAfterFirstBand = false;
  const splitBlocks: HomeBlockKey[] = [];

  let inBand = false;

  for (const key of visibleBlocks) {
    if (isBlockWide(key)) {
      if (inBand) {
        sawFirstBand = true;
        inBand = false;
      }
      if (sawFirstBand) {
        sawWideAfterFirstBand = true;
      }
    } else {
      // Column block
      if (!sawFirstBand) {
        inBand = true;
      } else if (sawWideAfterFirstBand) {
        splitBlocks.push(key);
      }
    }
  }

  return splitBlocks;
}

// LocalStorage cache helpers for instantaneous initial render
const HOMEPAGE_LAYOUT_STORAGE_KEY = 'sotoy_homepage_layout_cache_v1';

export interface CachedHomepageLayout {
  blockOrder?: HomeBlockKey[];
  sidebarPosition?: 'right' | 'left' | 'hidden';
  sidebarWidgetOrder?: HomeSidebarWidgetKey[];
  hiddenBlocks?: HomeBlockKey[];
}

export function getCachedHomepageLayout(): CachedHomepageLayout | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(HOMEPAGE_LAYOUT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as CachedHomepageLayout;
    }
  } catch {
    // ignore
  }
  return null;
}

export function setCachedHomepageLayout(layout: CachedHomepageLayout): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(HOMEPAGE_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // ignore
  }
}

export function clearCachedHomepageLayout(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(HOMEPAGE_LAYOUT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export const ALL_ARTICLE_CATEGORIES: MainCategory[] = [
  'movies',
  'series',
  'anime',
  'cinema-gear',
  'film-studies',
];

export const ALL_FILM_CATEGORIES: ('movie' | 'series' | 'animation')[] = [
  'movie',
  'series',
  'animation',
];

export const DEFAULT_SECTION_ORDER: HomepageSectionKey[] = [
  'hero_slider',
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

export const DEFAULT_FILM_DB_SECTION_ORDER: HomepageSectionKey[] = [
  'fd_on_theatres',
  'fd_streaming',
  'fd_coming_soon',
  'fd_animation',
  'fd_fans_favourite',
];

export function resolveSectionOrder(saved?: HomepageSectionKey[]): HomepageSectionKey[] {
  if (!Array.isArray(saved) || saved.length === 0) {
    return [...DEFAULT_SECTION_ORDER];
  }
  const validSet = new Set<HomepageSectionKey>(DEFAULT_SECTION_ORDER);
  const result: HomepageSectionKey[] = [];
  const seen = new Set<HomepageSectionKey>();

  for (const key of saved) {
    if (validSet.has(key) && !seen.has(key)) {
      result.push(key);
      seen.add(key);
    }
  }

  for (const defKey of DEFAULT_SECTION_ORDER) {
    if (!seen.has(defKey)) {
      result.push(defKey);
      seen.add(defKey);
    }
  }

  return result;
}

export function resolveFilmDbSectionOrder(saved?: HomepageSectionKey[]): HomepageSectionKey[] {
  if (!Array.isArray(saved) || saved.length === 0) {
    return [...DEFAULT_FILM_DB_SECTION_ORDER];
  }
  const validSet = new Set<HomepageSectionKey>(DEFAULT_FILM_DB_SECTION_ORDER);
  const result: HomepageSectionKey[] = [];
  const seen = new Set<HomepageSectionKey>();

  for (const key of saved) {
    if (validSet.has(key) && !seen.has(key)) {
      result.push(key);
      seen.add(key);
    }
  }

  for (const defKey of DEFAULT_FILM_DB_SECTION_ORDER) {
    if (!seen.has(defKey)) {
      result.push(defKey);
      seen.add(defKey);
    }
  }

  return result;
}

export const HOMEPAGE_SECTIONS_META: SectionMeta[] = [
  {
    key: 'hero_slider',
    label: 'Hero: Slider Utama',
    defaultTitle: 'Slider Utama',
    targetType: 'articles',
    description: 'Slider besar di kiri hero banner (artikel unggulan)',
    defaultRule: 'Artikel bertanda heroSlider dulu, lalu paling banyak disukai (6 artikel)',
    allowedCategories: ALL_ARTICLE_CATEGORIES,
    area: 'home',
  },
  {
    key: 'hero_to_watch',
    label: 'Hero: To Watch Tab',
    defaultTitle: 'To Watch',
    targetType: 'articles',
    description: 'Panel hero, tab artikel rekomendasi tontonan (kanan hero banner)',
    defaultRule: 'Artikel kategori Movies, Series, dan Anime (urutan terbaru)',
    allowedCategories: ALL_ARTICLE_CATEGORIES,
    area: 'home',
  },
  {
    key: 'recent',
    label: 'Hero: Recent Articles Tab',
    defaultTitle: 'Recent',
    targetType: 'articles',
    description: 'Panel hero, tab artikel terbaru (kanan hero banner)',
    defaultRule: 'Artikel terbaru dari semua kategori',
    allowedCategories: ALL_ARTICLE_CATEGORIES,
    area: 'home',
  },
  {
    key: 'gear',
    label: 'Hero: Gear Addict Tab',
    defaultTitle: 'Gear',
    targetType: 'articles',
    description: 'Panel hero, tab kurasi ketiga (kanan hero banner)',
    defaultRule: 'Artikel kategori Cinema Gear & Tech',
    allowedCategories: ALL_ARTICLE_CATEGORIES,
    area: 'home',
  },
  {
    key: 'movie_list',
    label: 'Seksi 1: Movie Lists',
    defaultTitle: 'Movie Lists',
    targetType: 'articles',
    description: 'Seksi 1, kolom 1 (daftar vertikal dengan poster)',
    defaultRule: 'Artikel kategori Movies (urutan terbaru)',
    allowedCategories: ALL_ARTICLE_CATEGORIES,
    area: 'home',
  },
  {
    key: 'series_list',
    label: 'Seksi 1: Series Lists',
    defaultTitle: 'Series Lists',
    targetType: 'articles',
    description: 'Seksi 1, kolom 2 (daftar vertikal dengan poster)',
    defaultRule: 'Artikel kategori Series (urutan terbaru)',
    allowedCategories: ALL_ARTICLE_CATEGORIES,
    area: 'home',
  },
  {
    key: 'anime_list',
    label: 'Seksi 1: Anime Lists',
    defaultTitle: 'Anime Lists',
    targetType: 'articles',
    description: 'Seksi 1, kolom 3 (daftar vertikal dengan poster)',
    defaultRule: 'Artikel kategori Anime (urutan terbaru)',
    allowedCategories: ALL_ARTICLE_CATEGORIES,
    area: 'home',
  },
  {
    key: 'cinema_gear_articles',
    label: 'Seksi 2: Cinema Gear & Tech',
    defaultTitle: 'Cinema Gear & Filmmaking Tech',
    targetType: 'articles',
    description: 'Seksi 2, carousel besar',
    defaultRule: 'Artikel kategori Cinema Gear & Tech',
    allowedCategories: ALL_ARTICLE_CATEGORIES,
    area: 'home',
  },
  {
    key: 'reviews_movie',
    label: 'Seksi 3: Movie Reviews',
    defaultTitle: 'Review Film Bioskop',
    targetType: 'articles',
    description: 'Seksi 3, grid 2-kolom sebelah kiri',
    defaultRule: 'Artikel kategori Movies (ulasan & review film)',
    allowedCategories: ALL_ARTICLE_CATEGORIES,
    area: 'home',
  },
  {
    key: 'reviews_series',
    label: 'Seksi 3: Series Reviews',
    defaultTitle: 'Review Serial Streaming',
    targetType: 'articles',
    description: 'Seksi 3, grid 2-kolom sebelah kanan',
    defaultRule: 'Artikel kategori Series (ulasan & review serial)',
    allowedCategories: ALL_ARTICLE_CATEGORIES,
    area: 'home',
  },
  {
    key: 'anime_news',
    label: 'Seksi 4: Anime News Wire',
    defaultTitle: 'Anime News & Season Updates',
    targetType: 'articles',
    description: 'Seksi 4, grid artikel gaya news ticker',
    defaultRule: 'Artikel kategori Anime (kabar & berita terkini)',
    allowedCategories: ALL_ARTICLE_CATEGORIES,
    area: 'home',
  },
  {
    key: 'film_studies',
    label: 'Seksi 5: Film Studies & Essays',
    defaultTitle: 'Film Studies & Cinematic Analysis',
    targetType: 'articles',
    description: 'Seksi 5, kartu esai sinematik vertikal & mendalam',
    defaultRule: 'Artikel kategori Film Studies (kajian sinema)',
    allowedCategories: ALL_ARTICLE_CATEGORIES,
    area: 'home',
  },
  // -------------------------------------------------------------
  // FILM DATABASE SECTIONS
  // -------------------------------------------------------------
  {
    key: 'fd_on_theatres',
    label: 'Sedang Tayang di Bioskop',
    defaultTitle: 'Sedang Tayang di Bioskop',
    targetType: 'films',
    description: 'Film yang sedang tayang di bioskop saat ini (8 minggu terakhir)',
    defaultRule: 'Where to watch "cinema" & rilis antara 56 hari lalu s/d hari ini (rilis terbaru dulu)',
    allowedCategories: ALL_FILM_CATEGORIES,
    area: 'film_database',
  },
  {
    key: 'fd_streaming',
    label: "Explore What's Streaming",
    defaultTitle: "Explore What's Streaming",
    targetType: 'films',
    description: 'Koleksi film & serial yang tersedia di platform streaming',
    defaultRule: 'Where to watch "stream" (filter opsional per platform, rilis terbaru dulu)',
    allowedCategories: ALL_FILM_CATEGORIES,
    area: 'film_database',
  },
  {
    key: 'fd_coming_soon',
    label: 'Coming Soon to Theatres',
    defaultTitle: 'Coming Soon to Theatres',
    targetType: 'films',
    description: 'Film bioskop yang akan segera tayang di masa mendatang',
    defaultRule: 'Tanggal rilis setelah hari ini (rilis paling dekat dulu)',
    allowedCategories: ALL_FILM_CATEGORIES,
    area: 'film_database',
  },
  {
    key: 'fd_animation',
    label: 'Animation Recommendation',
    defaultTitle: 'Animation Recommendation',
    targetType: 'films',
    description: 'Rekomendasi film & serial animasi terbaik',
    defaultRule: 'Tipe "animation" / genre animasi, diurutkan skor berbobot Bayesian',
    allowedCategories: ALL_FILM_CATEGORIES,
    area: 'film_database',
  },
  {
    key: 'fd_fans_favourite',
    label: "Fan's Favourite",
    defaultTitle: "Fan's Favourite",
    targetType: 'films',
    description: 'Film paling disukai dan dinilai tinggi oleh warga Sotoy',
    defaultRule: 'Skor berbobot Bayesian tertinggi dengan batas minimum votes',
    allowedCategories: ALL_FILM_CATEGORIES,
    area: 'film_database',
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
      if (cat === 'animation' || cat === 'anime') {
        return (
          filmType === 'animation' ||
          filmType === 'anime' ||
          (Array.isArray(f.genres) && f.genres.some((g: string) => /animas?i|animation/i.test(g)))
        );
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
  } else if (config.sortBy === 'views' || config.sortBy === 'votes') {
    filtered.sort((a, b) => (b.totalVotes || 0) - (a.totalVotes || 0));
  } else if (config.sortBy === 'release_soonest') {
    filtered.sort((a, b) => {
      const dateA = a.idReleaseDate || a.releaseDate;
      const dateB = b.idReleaseDate || b.releaseDate;
      const timeA = dateA ? new Date(dateA).getTime() : Infinity;
      const timeB = dateB ? new Date(dateB).getTime() : Infinity;
      return (isNaN(timeA) ? Infinity : timeA) - (isNaN(timeB) ? Infinity : timeB);
    });
  } else {
    // Newest: prefer idReleaseDate, then releaseDate, then year
    filtered.sort((a, b) => {
      const dateA = a.idReleaseDate || a.releaseDate;
      const dateB = b.idReleaseDate || b.releaseDate;
      if (dateA && dateB) {
        const diff = new Date(dateB).getTime() - new Date(dateA).getTime();
        if (!isNaN(diff) && diff !== 0) return diff;
      }
      return (b.year || 0) - (a.year || 0);
    });
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
    return resolved;
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
  return sliced.length > 0 ? sliced : (config.category || config.subCategory ? [] : defaultArticles);
}
