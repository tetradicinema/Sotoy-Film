import { FilmItem, Article, SectionConfig, HomepageSectionKey, MainCategory, HomeBlockKey, HomeSidebarWidgetKey } from '../types';
import { normalizeArticleCategory } from './articleCategory';
import { normalizeFilmType } from './filmType';
import { isAnimationFilm } from './filmSections';

export interface SectionMeta {
  key: HomepageSectionKey;
  label: string;
  defaultTitle: string;
  defaultDescription?: string;
  targetType: 'films' | 'articles';
  description: string;
  defaultRule: string;
  allowedCategories: (MainCategory | 'movie' | 'series' | 'anime' | 'animasi' | 'animation')[];
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
  'streaming',
  'film_indonesia',
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
    description: 'Koleksi poster film kurasi redaksi pilihan dengan Skor Sotoy',
  },
  {
    key: 'streaming',
    label: "Explore What's Streaming",
    type: 'wide',
    description: 'Baris film dan series yang sedang tayang di platform streaming, dengan tab platform',
  },
  {
    key: 'film_indonesia',
    label: 'Film Indonesia',
    type: 'wide',
    description: 'Baris film dan series Indonesia berdasarkan negara asal atau tag Film Indonesia',
  },
  {
    key: 'watchlists',
    label: 'Curated Watchlists: Movies, Series & Animation',
    type: 'column',
    description: 'Daftar vertikal berisi daftar tontonan kurasi untuk film, serial, dan animation',
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
    label: 'Animation News & Season Updates',
    type: 'column',
    description: 'Kawat berita compact dengan update musim animation dan jadwal rilis terkini',
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

  const savedHasRecs = result.includes('film_recommendations');

  for (const defKey of DEFAULT_BLOCK_ORDER) {
    if (defKey === 'streaming' || defKey === 'film_indonesia') continue;
    if (!seen.has(defKey)) {
      result.push(defKey);
      seen.add(defKey);
    }
  }

  // "Explore What's Streaming" is newer than saved layouts: place it directly
  // after film_recommendations (or at the end when that block is absent).
  if (!seen.has('streaming')) {
    if (savedHasRecs) {
      result.splice(result.indexOf('film_recommendations') + 1, 0, 'streaming');
    } else {
      result.push('streaming');
    }
    seen.add('streaming');
  }

  // "Film Indonesia" follows the streaming block for saved layouts that
  // predate it, falling back to after film_recommendations or the end.
  if (!seen.has('film_indonesia')) {
    if (seen.has('streaming')) {
      result.splice(result.indexOf('streaming') + 1, 0, 'film_indonesia');
    } else if (savedHasRecs) {
      result.splice(result.indexOf('film_recommendations') + 1, 0, 'film_indonesia');
    } else {
      result.push('film_indonesia');
    }
    seen.add('film_indonesia');
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

export const WIDE_BLOCK_KEYS: Set<HomeBlockKey> = new Set([
  'hero',
  'featured_news',
  'film_recommendations',
  'streaming',
  'film_indonesia',
]);

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
  'animation',
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
  'hero_film_studies',
  'recent',
  'movie_list',
  'series_list',
  'anime_list',
  'cinema_gear_articles',
  'reviews_movie',
  'reviews_series',
  'anime_news',
  'film_studies',
  'home_film_recs',
  'home_streaming',
  'home_film_indonesia',
];

export const DEFAULT_FILM_DB_SECTION_ORDER: HomepageSectionKey[] = [
  'fd_on_theatres',
  'fd_streaming',
  'fd_coming_soon',
  'fd_animation',
  'fd_fans_favourite',
  'fd_editors_pick',
  'fd_hidden_gems',
  'fd_film_indonesia',
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
    label: 'Hero: To Watch (Film)',
    defaultTitle: 'To Watch',
    targetType: 'films',
    description: 'Tab film di panel kanan hero',
    defaultRule: 'Film unggulan redaksi, lalu skor tertinggi. Maks 5',
    allowedCategories: ALL_FILM_CATEGORIES,
    area: 'home',
  },
  {
    key: 'hero_film_studies',
    label: 'Hero: Film Studies Tab',
    defaultTitle: 'Film Studies',
    targetType: 'articles',
    description: 'Tab artikel Film Studies di panel kanan hero',
    defaultRule: 'Artikel kategori Film Studies (terbaru). Maks 5',
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
    label: 'Seksi 1: Animation Lists',
    defaultTitle: 'Animation Lists',
    targetType: 'articles',
    description: 'Seksi 1, kolom 3 (daftar vertikal dengan poster)',
    defaultRule: 'Artikel kategori Animation (urutan terbaru)',
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
    label: 'Seksi 4: Animation News Wire',
    defaultTitle: 'Animation News & Season Updates',
    targetType: 'articles',
    description: 'Seksi 4, grid artikel gaya news ticker',
    defaultRule: 'Artikel kategori Animation (kabar & berita terkini)',
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
    label: 'On Theatres Now',
    defaultTitle: 'On Theatres Now',
    defaultDescription: 'Film yang sedang tayang di bioskop Indonesia saat ini.',
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
    defaultDescription: 'Film dan series yang bisa ditonton sekarang di Netflix, Prime Video, dan platform streaming lainnya.',
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
    defaultDescription: 'Film yang segera tayang di bioskop, diurutkan dari rilis terdekat.',
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
    defaultDescription: 'Rekomendasi film dan series animasi, dari anime Jepang sampai animasi layar lebar.',
    targetType: 'films',
    description: 'Rekomendasi film & serial animation terbaik',
    defaultRule: 'Tipe "animation" / genre animation, diurutkan skor berbobot Bayesian',
    allowedCategories: ALL_FILM_CATEGORIES,
    area: 'film_database',
  },
  {
    key: 'fd_fans_favourite',
    label: "Fan's Favourite",
    defaultTitle: "Fan's Favourite",
    defaultDescription: 'Judul dengan skor komunitas tertinggi, dipilih langsung oleh penonton Sotoy.',
    targetType: 'films',
    description: 'Film paling disukai dan dinilai tinggi oleh warga Sotoy',
    defaultRule: 'Skor berbobot Bayesian tertinggi dengan batas minimum votes',
    allowedCategories: ALL_FILM_CATEGORIES,
    area: 'film_database',
  },
  {
    key: 'fd_editors_pick',
    label: 'Pilihan Redaksi',
    defaultTitle: 'Pilihan Redaksi',
    defaultDescription: 'Film dan series pilihan tim redaksi Sotoy yang layak masuk daftar tonton Anda.',
    targetType: 'films',
    description: 'Daftar film pilihan redaksi, dipilih manual oleh admin',
    defaultRule: 'Daftar manual dari admin. Kosong = seksi disembunyikan',
    allowedCategories: ALL_FILM_CATEGORIES,
    area: 'film_database',
  },
  {
    key: 'fd_hidden_gems',
    label: 'Hidden Gems',
    defaultTitle: 'Hidden Gems',
    defaultDescription: 'Film dan series berskor tinggi yang belum banyak dibicarakan.',
    targetType: 'films',
    description: 'Skor Sotoy tinggi dengan jumlah vote masih sedikit',
    defaultRule: 'Skor minimal 8, vote antara 1 dan 15 (bisa diubah admin). Skor tertinggi dulu',
    allowedCategories: ALL_FILM_CATEGORIES,
    area: 'film_database',
  },
  {
    key: 'fd_film_indonesia',
    label: 'Film Indonesia',
    defaultTitle: 'Film Indonesia',
    defaultDescription: 'Film dan series buatan Indonesia, dari yang baru tayang sampai yang wajib ditonton.',
    targetType: 'films',
    description: 'Film dan series Indonesia (otomatis dari negara asal)',
    defaultRule: 'Negara asal Indonesia atau tag Film Indonesia. Terbaru dulu',
    allowedCategories: ALL_FILM_CATEGORIES,
    area: 'film_database',
  },
  // -------------------------------------------------------------
  // BERANDA FILM SECTIONS
  // -------------------------------------------------------------
  {
    key: 'home_film_recs',
    label: 'Curated Film Recommendations',
    defaultTitle: 'Curated Film Recommendations',
    defaultDescription: 'Kurasi film bioskop dan serial pilihan redaksi lengkap dengan Skor Sotoy.',
    targetType: 'films',
    description: 'Koleksi poster film kurasi redaksi di halaman beranda',
    defaultRule: 'Film unggulan redaksi (featuredRecommendation), lalu skor tertinggi. Maks 6',
    allowedCategories: ALL_FILM_CATEGORIES,
    area: 'home',
  },
  {
    key: 'home_streaming',
    label: "Explore What's Streaming (Beranda)",
    defaultTitle: "Explore What's Streaming",
    defaultDescription: 'Film dan series yang bisa ditonton sekarang di Netflix, Prime Video, dan platform streaming lainnya.',
    targetType: 'films',
    description: 'Baris film dan series yang sedang tayang di platform streaming, dengan tab platform',
    defaultRule: 'Film/series dengan platform streaming, terbaru dulu. Maks 12',
    allowedCategories: ALL_FILM_CATEGORIES,
    area: 'home',
  },
  {
    key: 'home_film_indonesia',
    label: 'Film Indonesia (Beranda)',
    defaultTitle: 'Film Indonesia',
    defaultDescription: 'Film dan series buatan Indonesia, dari yang baru tayang sampai yang wajib ditonton.',
    targetType: 'films',
    description: 'Baris film dan series Indonesia di halaman beranda',
    defaultRule: 'Negara asal Indonesia atau tag Film Indonesia. Terbaru dulu. Maks 12',
    allowedCategories: ALL_FILM_CATEGORIES,
    area: 'home',
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
    const cat = normalizeFilmType(config.category);
    filtered = filtered.filter(f => {
      if (cat === 'animation') return isAnimationFilm(f);
      return normalizeFilmType(f.type) === cat;
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
    const cat = (normalizeArticleCategory(config.category) || '').toLowerCase();
    filtered = filtered.filter(
      a => (normalizeArticleCategory(a.category) || '').toLowerCase() === cat
    );
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
