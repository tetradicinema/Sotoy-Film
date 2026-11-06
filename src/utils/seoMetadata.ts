/**
 * Central Metadata & SEO Configuration Utility
 * 
 * Provides unified, dynamic generation of HTML meta tags, OpenGraph (OG) tags,
 * Twitter / X Cards, canonical URLs, and Schema.org structured data.
 * Specifically built to ensure strict SEO compliance across static pages
 * and dynamic entity routes (such as /film/:slug, /artikel/:slug, /kategori/:name, etc.).
 */

import { FilmItem, Article, BuzzPost, User } from '../types';
import { pickArticleIsoDate } from '../lib/edge/isoDate.js';

export interface OpenGraphTags {
  'og:title': string;
  'og:description': string;
  'og:image': string;
  'og:image:secure_url'?: string;
  'og:image:type'?: string;
  'og:image:alt'?: string;
  'og:image:width'?: string;
  'og:image:height'?: string;
  'og:url': string;
  'og:type': 'website' | 'article' | 'video.movie' | string;
  'og:site_name': string;
  'og:locale': string;

  // Video / Movie specific tags
  'video:director'?: string;
  'video:release_date'?: string;
  'video:duration'?: string;
  'video:tag'?: string[];
  'video:actor'?: string[];

  // Article specific tags
  'article:published_time'?: string;
  'article:modified_time'?: string;
  'article:author'?: string;
  'article:section'?: string;
  'article:tag'?: string[];
}

export interface TwitterTags {
  'twitter:card': 'summary' | 'summary_large_image' | 'player' | 'app';
  'twitter:site': string;
  'twitter:creator'?: string;
  'twitter:title': string;
  'twitter:description': string;
  'twitter:image': string;
  'twitter:image:alt'?: string;
  'twitter:domain'?: string;
  'twitter:url': string;
}

export interface CompletePageMetadata {
  title: string;
  rawTitle: string;
  description: string;
  keywords: string[];
  canonicalUrl: string;
  url: string;
  type: 'website' | 'article' | 'video.movie' | string;
  primaryImage: string;
  secondaryImage?: string | null;
  imageAlt: string;
  imageWidth: string;
  imageHeight: string;
  imageMimeType: string;
  noindex?: boolean;
  openGraph: OpenGraphTags;
  twitter: TwitterTags;
  publishedTime?: string;
  modifiedTime?: string;
  authorName?: string;
  authorAvatar?: string;
  section?: string;
  tags?: string[];
  // Film specific entity data
  filmDetails?: {
    director?: string;
    releaseDate?: string;
    durationSeconds?: number | null;
    genres?: string[];
    cast?: string[];
    year?: number;
    skorSotoy?: number;
    totalVotes?: number;
  };
}

export const SITE_NAME = 'Sotoy Film';
export const DEFAULT_BASE_URL = 'https://www.sotoyfilm.my.id';
export const DEFAULT_TITLE = 'Sotoy Film - Ulasan & Kritik Film Terpercaya';
export const DEFAULT_DESCRIPTION =
  'Platform komunitas & media pop-culture film, series, animation, cinema gear, dan film studies dengan ulasan Skor Sotoy dan diskusi buzz.';
export const DEFAULT_IMAGE = 'https://www.sotoyfilm.my.id/og-default.png';
export const DEFAULT_KEYWORDS = [
  'ulasan film',
  'kritik film',
  'skor sotoy',
  'film indonesia',
  'rekomendasi series',
  'anime',
  'cinema gear',
  'pop culture',
];
export const DEFAULT_TWITTER_SITE = '@sotoyfilm';
export const DEFAULT_LOCALE = 'id_ID';

/**
 * Resolves any image or asset URL into a fully qualified, absolute HTTPS URL for crawler compatibility.
 */
export function resolveAbsoluteUrl(urlStr?: string, baseUrl: string = DEFAULT_BASE_URL): string {
  if (!urlStr || typeof urlStr !== 'string') return DEFAULT_IMAGE;
  const trimmed = urlStr.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${cleanBase}${cleanPath}`;
}

/**
 * Detects image MIME type from URL extension.
 */
export function getImageMimeType(url: string): string {
  const clean = url.split('?')[0].toLowerCase();
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.webp')) return 'image/webp';
  if (clean.endsWith('.gif')) return 'image/gif';
  if (clean.endsWith('.svg')) return 'image/svg+xml';
  return 'image/jpeg';
}

/**
 * Parses duration strings like "2h 46m", "120 min", or "120" into total seconds.
 */
export function parseDurationInSeconds(durationStr?: string): number | null {
  if (!durationStr) return null;
  const hoursMatch = durationStr.match(/(\d+)\s*h/i);
  const minsMatch = durationStr.match(/(\d+)\s*(?:m|min)/i);
  let totalSeconds = 0;
  if (hoursMatch) totalSeconds += parseInt(hoursMatch[1], 10) * 3600;
  if (minsMatch) totalSeconds += parseInt(minsMatch[1], 10) * 60;
  if (!hoursMatch && !minsMatch) {
    const rawNumber = parseInt(durationStr, 10);
    if (!isNaN(rawNumber) && rawNumber > 0) {
      totalSeconds = rawNumber * 60;
    }
  }
  return totalSeconds > 0 ? totalSeconds : null;
}

/**
 * Truncates text cleanly at word boundaries.
 */
export function truncateText(text: string, maxLength: number = 160): string {
  if (!text || text.length <= maxLength) return text || '';
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxLength - 30 && lastSpace > 0) {
    return truncated.slice(0, lastSpace).trim() + '...';
  }
  return truncated.trim() + '...';
}

/**
 * Formats a URL slug into clean Title Case for fallback metadata.
 */
export function formatSlugToTitle(slug: string): string {
  try {
    const decoded = decodeURIComponent(slug);
    return decoded
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase())
      .trim();
  } catch {
    return slug;
  }
}

/**
 * Helper to build branded page title.
 */
export function formatBrandedTitle(rawTitle: string): string {
  if (!rawTitle) return DEFAULT_TITLE;
  if (rawTitle.includes(SITE_NAME)) return rawTitle;
  return `${rawTitle} | ${SITE_NAME}`;
}

export interface MetadataOptions {
  currentUrl?: string;
  canonicalUrl?: string;
  overrides?: Partial<CompletePageMetadata>;
}

/**
 * Generates dynamic OpenGraph and Twitter metadata for a Film entity (/film/:slug).
 */
export function buildFilmMetadata(
  film: FilmItem | Partial<FilmItem>,
  options: MetadataOptions & {
    reviews?: { userName?: string; reviewText?: string; score: number; createdAt?: string }[];
  } = {}
): CompletePageMetadata {
  const titleText = film.title || 'Film';
  const yearText = film.year ? ` (${film.year})` : '';
  const rawTitle = `${titleText}${yearText} - Skor & Review Film`;
  const finalTitle = formatBrandedTitle(rawTitle);

  const rawSynopsis = film.synopsis || film.curatorNote || `Ulasan, rating Skor Sotoy, dan informasi film ${titleText}.`;
  const description = truncateText(rawSynopsis, 160);

  const slug = film.slug || film.id || encodeURIComponent(titleText.toLowerCase().replace(/\s+/g, '-'));
  const fallbackUrl = `${DEFAULT_BASE_URL}/film/${slug}`;
  const finalUrl = options.currentUrl || fallbackUrl;
  const finalCanonical = options.canonicalUrl || finalUrl;

  // Visual priority: backdrop (landscape, optimal for 16:9 social share) -> poster -> default
  const rawImage = film.backdrop || film.poster || DEFAULT_IMAGE;
  const primaryImage = resolveAbsoluteUrl(rawImage, finalUrl);
  const secondaryImage = film.poster && film.backdrop && film.poster !== film.backdrop
    ? resolveAbsoluteUrl(film.poster, finalUrl)
    : null;

  const imageAlt = `${titleText}${yearText} - Poster & Ulasan Sinema di ${SITE_NAME}`;
  const imageMime = getImageMimeType(primaryImage);

  const durationSeconds = parseDurationInSeconds(film.duration);
  const castList = film.castDetails?.map(c => c.name) || film.cast || [];

  const keywords = Array.from(
    new Set([
      titleText,
      ...(film.director ? [film.director] : []),
      ...(film.genres || []),
      'skor sotoy',
      'ulasan film',
      'review film',
      'sinopsis film',
      'rekomendasi film',
    ])
  );

  const openGraph: OpenGraphTags = {
    'og:site_name': SITE_NAME,
    'og:title': finalTitle,
    'og:description': description,
    'og:url': finalUrl,
    'og:type': 'video.movie',
    'og:locale': DEFAULT_LOCALE,
    'og:image': primaryImage,
    'og:image:secure_url': primaryImage,
    'og:image:type': imageMime,
    'og:image:alt': imageAlt,
    'og:image:width': '1200',
    'og:image:height': '630',
    ...(film.director ? { 'video:director': film.director } : {}),
    ...(film.year ? { 'video:release_date': `${film.year}-01-01` } : {}),
    ...(durationSeconds ? { 'video:duration': String(durationSeconds) } : {}),
    ...(film.genres && film.genres.length > 0 ? { 'video:tag': film.genres } : {}),
    ...(castList.length > 0 ? { 'video:actor': castList.slice(0, 5) } : {}),
  };

  const twitter: TwitterTags = {
    'twitter:card': 'summary_large_image',
    'twitter:site': DEFAULT_TWITTER_SITE,
    'twitter:title': finalTitle,
    'twitter:description': description,
    'twitter:image': primaryImage,
    'twitter:image:alt': imageAlt,
    'twitter:url': finalUrl,
  };

  return {
    title: finalTitle,
    rawTitle,
    description,
    keywords,
    canonicalUrl: finalCanonical,
    url: finalUrl,
    type: 'video.movie',
    primaryImage,
    secondaryImage,
    imageAlt,
    imageWidth: '1200',
    imageHeight: '630',
    imageMimeType: imageMime,
    openGraph,
    twitter,
    filmDetails: {
      director: film.director,
      releaseDate: film.year ? `${film.year}-01-01` : undefined,
      durationSeconds,
      genres: film.genres,
      cast: castList,
      year: film.year,
      skorSotoy: film.skorSotoy,
      totalVotes: film.totalVotes,
    },
    ...options.overrides,
  };
}

/**
 * Generates dynamic OpenGraph and Twitter metadata for an Article entity (/artikel/:slug).
 */
export function buildArticleMetadata(
  article: Article | Partial<Article>,
  options: MetadataOptions & {
    author?: { name?: string; avatar?: string };
  } = {}
): CompletePageMetadata {
  const rawTitle = article.seoTitle || article.title || 'Artikel Pop Culture';
  const finalTitle = formatBrandedTitle(rawTitle);

  const rawExcerpt =
    article.metaDescription ||
    article.excerpt ||
    (typeof article.content === 'string' ? article.content.replace(/<[^>]*>?/gm, '').slice(0, 200) : '');
  const description = truncateText(rawExcerpt || 'Baca ulasan dan wawasan sinema terbaru di Sotoy Film.', 160);

  const slug = article.slug || article.id || encodeURIComponent((article.title || 'artikel').toLowerCase().replace(/\s+/g, '-'));
  const fallbackUrl = `${DEFAULT_BASE_URL}/artikel/${slug}`;
  const finalUrl = options.currentUrl || fallbackUrl;
  const finalCanonical = options.canonicalUrl || finalUrl;

  const rawImage = article.ogImage || article.coverImage || DEFAULT_IMAGE;
  const primaryImage = resolveAbsoluteUrl(rawImage, finalUrl);
  const imageAlt = `${article.title || 'Artikel'} - ${SITE_NAME} Pop Culture Media`;
  const imageMime = getImageMimeType(primaryImage);

  const authorName = options.author?.name || article.author?.name || 'Redaksi Sotoy Film';
  const authorAvatar = options.author?.avatar || article.author?.avatar;
  const twitterCreator = authorName ? `@${authorName.replace(/\s+/g, '')}` : DEFAULT_TWITTER_SITE;

  const publishedTime = pickArticleIsoDate(article, 'published');
  const modifiedTime = pickArticleIsoDate(article, 'modified');
  const section = article.category || 'Movies';
  const tags = article.tags || [];

  const keywords = Array.from(
    new Set([
      article.title || 'artikel',
      ...(article.tags || []),
      ...(article.category ? [article.category] : []),
      ...(article.subCategory ? [article.subCategory] : []),
      'artikel film',
      'ulasan sinema',
      'sotoy film',
      'editorial',
    ])
  );

  const openGraph: OpenGraphTags = {
    'og:site_name': SITE_NAME,
    'og:title': finalTitle,
    'og:description': description,
    'og:url': finalUrl,
    'og:type': 'article',
    'og:locale': DEFAULT_LOCALE,
    'og:image': primaryImage,
    'og:image:secure_url': primaryImage,
    'og:image:type': imageMime,
    'og:image:alt': imageAlt,
    'og:image:width': '1200',
    'og:image:height': '630',
    ...(publishedTime ? { 'article:published_time': publishedTime } : {}),
    ...(modifiedTime ? { 'article:modified_time': modifiedTime } : {}),
    'article:author': authorName,
    'article:section': section,
    ...(tags.length > 0 ? { 'article:tag': tags } : {}),
  };

  const twitter: TwitterTags = {
    'twitter:card': 'summary_large_image',
    'twitter:site': DEFAULT_TWITTER_SITE,
    'twitter:creator': twitterCreator,
    'twitter:title': finalTitle,
    'twitter:description': description,
    'twitter:image': primaryImage,
    'twitter:image:alt': imageAlt,
    'twitter:url': finalUrl,
  };

  return {
    title: finalTitle,
    rawTitle,
    description,
    keywords,
    canonicalUrl: finalCanonical,
    url: finalUrl,
    type: 'article',
    primaryImage,
    imageAlt,
    imageWidth: '1200',
    imageHeight: '630',
    imageMimeType: imageMime,
    publishedTime,
    modifiedTime,
    authorName,
    authorAvatar,
    section,
    tags,
    openGraph,
    twitter,
    ...options.overrides,
  };
}

/**
 * Generates dynamic OpenGraph and Twitter metadata for Category pages (/kategori/:name/:subCategory?).
 */
export function buildCategoryMetadata(
  categoryName: string,
  subCategoryName?: string,
  options: MetadataOptions = {}
): CompletePageMetadata {
  const cat = formatSlugToTitle(categoryName);
  const sub = subCategoryName ? formatSlugToTitle(subCategoryName) : null;

  const rawTitle = sub
    ? `${sub} (${cat}) - Kategori Sinema & Pop Culture`
    : `${cat} - Kategori Sinema & Pop Culture`;
  const finalTitle = formatBrandedTitle(rawTitle);

  const description = sub
    ? `Daftar ulasan, berita, dan kurasi ${sub} dalam kategori ${cat} di ${SITE_NAME}.`
    : `Jelajahi ulasan, rekomendasi tontonan, dan berita terbaru seputar ${cat} di ${SITE_NAME}.`;

  const fallbackUrl = sub
    ? `${DEFAULT_BASE_URL}/kategori/${categoryName}/${subCategoryName}`
    : `${DEFAULT_BASE_URL}/kategori/${categoryName}`;
  const finalUrl = options.currentUrl || fallbackUrl;
  const finalCanonical = options.canonicalUrl || finalUrl;

  const primaryImage = resolveAbsoluteUrl(DEFAULT_IMAGE, finalUrl);
  const imageMime = getImageMimeType(primaryImage);

  const keywords = [cat, ...(sub ? [sub] : []), 'kategori film', 'ulasan sinema', 'sotoy film'];

  const openGraph: OpenGraphTags = {
    'og:site_name': SITE_NAME,
    'og:title': finalTitle,
    'og:description': description,
    'og:url': finalUrl,
    'og:type': 'website',
    'og:locale': DEFAULT_LOCALE,
    'og:image': primaryImage,
    'og:image:secure_url': primaryImage,
    'og:image:type': imageMime,
    'og:image:alt': finalTitle,
    'og:image:width': '1200',
    'og:image:height': '630',
  };

  const twitter: TwitterTags = {
    'twitter:card': 'summary_large_image',
    'twitter:site': DEFAULT_TWITTER_SITE,
    'twitter:title': finalTitle,
    'twitter:description': description,
    'twitter:image': primaryImage,
    'twitter:image:alt': finalTitle,
    'twitter:url': finalUrl,
  };

  return {
    title: finalTitle,
    rawTitle,
    description,
    keywords,
    canonicalUrl: finalCanonical,
    url: finalUrl,
    type: 'website',
    primaryImage,
    imageAlt: finalTitle,
    imageWidth: '1200',
    imageHeight: '630',
    imageMimeType: imageMime,
    openGraph,
    twitter,
    ...options.overrides,
  };
}

/**
 * Generates dynamic OpenGraph and Twitter metadata for Community / Buzz posts (/buzz/:id).
 */
export function buildBuzzMetadata(
  buzz: BuzzPost | Partial<BuzzPost>,
  options: MetadataOptions = {}
): CompletePageMetadata {
  const authorName = buzz.author?.name || (buzz as any).userName || 'Warga Sotoy';
  const rawContent = buzz.content || 'Diskusi sinema komunitas di Sotoy Film.';
  const snippet = truncateText(rawContent, 90);
  const rawTitle = `Buzz dari ${authorName}: "${snippet}"`;
  const finalTitle = formatBrandedTitle(rawTitle);

  const description = truncateText(rawContent, 160);
  const finalUrl = options.currentUrl || `${DEFAULT_BASE_URL}/buzz/${buzz.id || ''}`;
  const finalCanonical = options.canonicalUrl || finalUrl;

  const rawImage = buzz.image || (buzz as any).imageUrl || DEFAULT_IMAGE;
  const primaryImage = resolveAbsoluteUrl(rawImage, finalUrl);
  const imageMime = getImageMimeType(primaryImage);

  const keywords = ['diskusi film', 'buzz sinema', 'komunitas film', 'sotoy film', authorName];

  const openGraph: OpenGraphTags = {
    'og:site_name': SITE_NAME,
    'og:title': finalTitle,
    'og:description': description,
    'og:url': finalUrl,
    'og:type': 'article',
    'og:locale': DEFAULT_LOCALE,
    'og:image': primaryImage,
    'og:image:secure_url': primaryImage,
    'og:image:type': imageMime,
    'og:image:alt': finalTitle,
    'og:image:width': '1200',
    'og:image:height': '630',
    'article:author': authorName,
    ...((buzz as any).createdAt ? { 'article:published_time': (buzz as any).createdAt } : {}),
  };

  const twitter: TwitterTags = {
    'twitter:card': 'summary_large_image',
    'twitter:site': DEFAULT_TWITTER_SITE,
    'twitter:title': finalTitle,
    'twitter:description': description,
    'twitter:image': primaryImage,
    'twitter:image:alt': finalTitle,
    'twitter:url': finalUrl,
  };

  return {
    title: finalTitle,
    rawTitle,
    description,
    keywords,
    canonicalUrl: finalCanonical,
    url: finalUrl,
    type: 'article',
    primaryImage,
    imageAlt: finalTitle,
    imageWidth: '1200',
    imageHeight: '630',
    imageMimeType: imageMime,
    authorName,
    publishedTime: (buzz as any).createdAt,
    openGraph,
    twitter,
    ...options.overrides,
  };
}

/**
 * Generates dynamic OpenGraph and Twitter metadata for User Profiles (/user/:id or /profil).
 */
export function buildUserMetadata(
  user: User | Partial<User>,
  options: MetadataOptions = {}
): CompletePageMetadata {
  const userName = user.name || (user as any).displayName || 'Warga Sotoy';
  const rawTitle = `Profil ${userName} - Koleksi & Ulasan Film`;
  const finalTitle = formatBrandedTitle(rawTitle);

  const rawBio = user.bio || `Lihat daftar watchlist, rating film, dan ulasan ${userName} di ${SITE_NAME}.`;
  const description = truncateText(rawBio, 160);

  const finalUrl = options.currentUrl || `${DEFAULT_BASE_URL}/user/${user.id || ''}`;
  const finalCanonical = options.canonicalUrl || finalUrl;

  const rawImage = user.avatar || (user as any).photoURL || DEFAULT_IMAGE;
  const primaryImage = resolveAbsoluteUrl(rawImage, finalUrl);
  const imageMime = getImageMimeType(primaryImage);

  const keywords = ['profil user', 'watchlist film', 'review pengguna', 'sotoy film', userName];

  const openGraph: OpenGraphTags = {
    'og:site_name': SITE_NAME,
    'og:title': finalTitle,
    'og:description': description,
    'og:url': finalUrl,
    'og:type': 'profile',
    'og:locale': DEFAULT_LOCALE,
    'og:image': primaryImage,
    'og:image:secure_url': primaryImage,
    'og:image:type': imageMime,
    'og:image:alt': `Profil ${userName} di ${SITE_NAME}`,
    'og:image:width': '600',
    'og:image:height': '600',
  };

  const twitter: TwitterTags = {
    'twitter:card': 'summary',
    'twitter:site': DEFAULT_TWITTER_SITE,
    'twitter:title': finalTitle,
    'twitter:description': description,
    'twitter:image': primaryImage,
    'twitter:image:alt': `Profil ${userName} di ${SITE_NAME}`,
    'twitter:url': finalUrl,
  };

  return {
    title: finalTitle,
    rawTitle,
    description,
    keywords,
    canonicalUrl: finalCanonical,
    url: finalUrl,
    type: 'profile',
    primaryImage,
    imageAlt: `Profil ${userName} di ${SITE_NAME}`,
    imageWidth: '600',
    imageHeight: '600',
    imageMimeType: imageMime,
    authorName: userName,
    openGraph,
    twitter,
    ...options.overrides,
  };
}

/**
 * Static route dictionary for instant lookups
 */
export const STATIC_ROUTE_METADATA_CONFIG: Record<
  string,
  {
    title: string;
    description: string;
    keywords?: string[];
    type?: 'website' | 'article' | 'video.movie';
    noindex?: boolean;
    /** Canonical path an alias route resolves to, e.g. '/guide' -> '/panduan'. */
    canonicalPath?: string;
  }
> = {
  '/': {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    keywords: ['ulasan film', 'skor sotoy', 'film indonesia', 'rekomendasi film', 'sinema'],
    type: 'website',
  },
  '/film-database': {
    title: 'Database Film & Series Terlengkap',
    description:
      'Jelajahi ribuan ulasan, skor sotoy, sinopsis, dan kurasi film terbaik dunia dari Hollywood hingga sinema Indonesia.',
    keywords: ['database film', 'daftar film bioskop', 'rating film', 'skor sotoy', 'series terbaik'],
    type: 'website',
  },
  '/rekomendasi-film': {
    title: 'Watch Next: Rekomendasi Film Sesuai Mood & Platform Streaming',
    description:
      'Temukan rekomendasi film sesuai mood dan platform streaming favoritmu, dari tontonan santai sampai film yang bikin mikir.',
    keywords: [
      'rekomendasi film',
      'film sesuai mood',
      'film platform streaming',
      'film bagus',
      'film rating tinggi',
      'series wajib tonton',
    ],
    type: 'website',
  },
  '/film-recommendations': {
    title: 'Watch Next: Rekomendasi Film Sesuai Mood & Platform Streaming',
    description:
      'Temukan rekomendasi film sesuai mood dan platform streaming favoritmu, dari tontonan santai sampai film yang bikin mikir.',
    keywords: [
      'rekomendasi film',
      'film sesuai mood',
      'film platform streaming',
      'film bagus',
      'film rating tinggi',
      'series wajib tonton',
    ],
    type: 'website',
  },
  '/komunitas': {
    title: 'Komunitas Film & Diskusi Buzz Sinema',
    description:
      'Ruang diskusi santai, debat seru, dan obrolan sinema bersama para penikmat film dan kurator Sotoy Film.',
    keywords: ['komunitas film', 'forum film indonesia', 'diskusi film', 'buzz pop culture'],
    type: 'website',
  },
  '/community-feed': {
    title: 'Komunitas Film & Diskusi Buzz Sinema',
    description:
      'Ruang diskusi santai, debat seru, dan obrolan sinema bersama para penikmat film dan kurator Sotoy Film.',
    type: 'website',
  },
  '/kategori/movies': {
    title: 'Kategori Film & Sinema Dunia',
    description:
      'Berita terbaru, ulasan mendalam, dan daftar rekomendasi film layar lebar terpopuler dari berbagai genre.',
    keywords: ['film bioskop', 'sinema hollywood', 'film indonesia', 'ulasan movie'],
    type: 'website',
  },
  '/kategori/series': {
    title: 'Serial TV & Web Series Populer',
    description:
      'Ulasan episode, breakdown teori cerita, dan rekomendasi serial TV terbaik dari platform streaming favorit.',
    keywords: ['series terbaik', 'netflix series', 'serial tv', 'drama series'],
    type: 'website',
  },
  '/kategori/animation': {
    title: 'Animation Populer & Rekomendasi Musiman',
    description:
      'Berita animation terbaru, review film animation Jepang, dan daftar tontonan wajib bagi para pecinta animation.',
    keywords: ['animation terbaru', 'rekomendasi anime', 'film anime', 'anime terbaru'],
    type: 'website',
  },
  '/kategori/cinema-gear': {
    title: 'Cinema Gear & Review Perlengkapan Kamera',
    description:
      'Ulasan kamera sinema, lensa, lighting, audio lapangan, dan perlengkapan produksi film profesional.',
    keywords: ['kamera sinema', 'lensa kamera', 'cinema gear', 'peralatan shooting'],
    type: 'website',
  },
  '/kategori/film-studies': {
    title: 'Film Studies & Analisis Sinematografi',
    description:
      'Eksplorasi estetika sinema, analisis penyutradaraan, struktur naskah, dan studi film mendalam.',
    keywords: ['film studies', 'analisis film', 'sinematografi', 'teori film', 'penyutradaraan'],
    type: 'website',
  },
  '/tulis-artikel': {
    title: 'Tulis Artikel & Publikasikan Ulasan Film',
    description:
      'Bagikan perspektif, analisis visual, dan ulasan film terbaikmu kepada ribuan pecinta sinema di Sotoy Film.',
    keywords: ['tulis artikel film', 'kontributor film', 'review film'],
    type: 'website',
  },
  '/write-article': {
    title: 'Tulis Artikel & Publikasikan Ulasan Film',
    description:
      'Bagikan perspektif, analisis visual, dan ulasan film terbaikmu kepada ribuan pecinta sinema di Sotoy Film.',
    type: 'website',
  },
  '/gabung-kritikus': {
    title: 'Program Kurator Kritikus Film Terverifikasi',
    description:
      'Daftar menjadi kurator dan kritikus resmi Sotoy Film untuk memberikan penilaian otoritatif Skor Sotoy.',
    keywords: ['kritikus film', 'program kurator', 'daftar kritikus', 'sotoy film critic'],
    type: 'website',
  },
  '/gabung-penulis': {
    title: 'Daftar Jadi Penulis Sotoy Film',
    description:
      'Daftar menjadi penulis redaksi Sotoy Film dan kirim portofolio tulisanmu.',
    keywords: ['penulis film', 'daftar penulis', 'sotoy film'],
    type: 'website',
    noindex: true,
  },
  '/tiket-bantuan': {
    title: 'Tiket Bantuan Sotoy Film',
    description:
      'Kirim tiket bantuan ke redaksi Sotoy Film untuk kendala akun, ulasan, atau teknis.',
    keywords: ['tiket bantuan', 'bantuan sotoy film', 'kontak redaksi'],
    type: 'website',
    noindex: true,
  },
  '/critic-submission': {
    title: 'Program Kurator Kritikus Film Terverifikasi',
    description:
      'Daftar menjadi kurator dan kritikus resmi Sotoy Film untuk memberikan penilaian otoritatif Skor Sotoy.',
    type: 'website',
  },
  '/kriteria-kritikus': {
    title: 'Kriteria & Panduan Penilaian Kurator Kritikus',
    description:
      'Standar penilaian, etika kurasi, transparansi, dan metodologi pembobotan Skor Sotoy.',
    keywords: ['kriteria kritikus', 'metodologi skor sotoy', 'panduan kurator'],
    type: 'website',
  },
  '/critic-criteria': {
    title: 'Kriteria & Panduan Penilaian Kurator Kritikus',
    description:
      'Standar penilaian, etika kurasi, transparansi, dan metodologi pembobotan Skor Sotoy.',
    type: 'website',
  },
  '/search': {
    title: 'Pencarian Film, Serial & Artikel',
    description:
      'Temukan film, review, artikel editorial, dan postingan komunitas dengan cepat di Sotoy Film.',
    keywords: ['cari film', 'search film', 'temukan ulasan'],
    type: 'website',
    noindex: true,
  },
  '/tentang-kami': {
    title: 'Tentang Sotoy Film - Media Pop Culture & Sinema',
    description:
      'Mengenal visi, misi, dan tim di balik media pop-culture dan komunitas film terkemuka Sotoy Film.',
    type: 'website',
  },
  '/about-us': {
    title: 'Tentang Sotoy Film - Media Pop Culture & Sinema',
    description:
      'Mengenal visi, misi, dan tim di balik media pop-culture dan komunitas film terkemuka Sotoy Film.',
    type: 'website',
  },
  '/kebijakan-privasi': {
    title: 'Kebijakan Privasi - Sotoy Film',
    description:
      'Komitmen kami dalam melindungi privasi, data pribadi, dan keamanan akun pengunjung Sotoy Film.',
    type: 'website',
  },
  '/privacy-policy': {
    title: 'Kebijakan Privasi - Sotoy Film',
    description:
      'Komitmen kami dalam melindungi privasi, data pribadi, dan keamanan akun pengunjung Sotoy Film.',
    type: 'website',
  },
  '/syarat-ketentuan': {
    title: 'Syarat & Ketentuan Layanan - Sotoy Film',
    description:
      'Ketentuan layanan, hak cipta konten editorial, dan panduan etika partisipasi komunitas Sotoy Film.',
    type: 'website',
  },
  '/terms-conditions': {
    title: 'Syarat & Ketentuan Layanan - Sotoy Film',
    description:
      'Ketentuan layanan, hak cipta konten editorial, dan panduan etika partisipasi komunitas Sotoy Film.',
    type: 'website',
  },
  '/kontak-bisnis': {
    title: 'Kontak & Kemitraan Bisnis - Sotoy Film',
    description:
      'Hubungi tim media Sotoy Film untuk kerjasama editorial, liputan festival film, sponsorship, dan periklanan.',
    type: 'website',
  },
  '/business-inquiries': {
    title: 'Kontak & Kemitraan Bisnis - Sotoy Film',
    description:
      'Hubungi tim media Sotoy Film untuk kerjasama editorial, liputan festival film, sponsorship, dan periklanan.',
    type: 'website',
  },
  '/panduan-leaderboard': {
    title: 'Panduan Sistem Skor & Leaderboard',
    description: 'Pelajari mekanisme penilaian review, bobot suara suka, dan cara menjadi jawara di leaderboard Sotoy Film.',
    type: 'website',
  },
  '/panduan': {
    title: 'Panduan & FAQ Sotoy Film',
    description: 'Panduan lengkap memakai Sotoy Film: cara menilai film dengan Skor Sotoy, menulis review, ikut komunitas Buzz, dan jawaban pertanyaan yang sering diajukan.',
    type: 'website',
  },
  '/guide': {
    title: 'Panduan & FAQ Sotoy Film',
    description: 'Panduan lengkap memakai Sotoy Film: cara menilai film dengan Skor Sotoy, menulis review, ikut komunitas Buzz, dan jawaban pertanyaan yang sering diajukan.',
    type: 'website',
    canonicalPath: '/panduan',
  },
  '/faq': {
    title: 'Panduan & FAQ Sotoy Film',
    description: 'Panduan lengkap memakai Sotoy Film: cara menilai film dengan Skor Sotoy, menulis review, ikut komunitas Buzz, dan jawaban pertanyaan yang sering diajukan.',
    type: 'website',
    canonicalPath: '/panduan',
  },
  '/settings': {
    title: 'Pengaturan Akun & Preferensi',
    description: 'Kelola preferensi akun, privasi profil, dan pengaturan notifikasi ulasan.',
    noindex: true,
  },
  '/onboarding': {
    title: 'Selamat Datang di Sotoy Film',
    description: 'Pilih preferensi genre sinema dan mulai petualangan pop-culture kamu di Sotoy Film.',
    noindex: true,
  },
  '/profil': {
    title: 'Profil Saya',
    description: 'Halaman profil akun Sotoy Film.',
    noindex: true,
  },
  '/profile': {
    title: 'Profil Saya',
    description: 'Halaman profil akun Sotoy Film.',
    noindex: true,
  },
};

/**
 * Central Resolver: Generates CompletePageMetadata for any URL pathname.
 * Handles exact static routes, dynamic entity routes (/film/:slug, /artikel/:slug),
 * category hierarchies, buzz posts, user profiles, and custom overrides.
 */
export function buildRouteMetadata(
  pathname: string = '/',
  options: MetadataOptions & {
    entityContext?: {
      film?: FilmItem;
      article?: Article;
      buzz?: BuzzPost;
      user?: User;
    };
  } = {}
): CompletePageMetadata {
  const cleanPath = pathname.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
  const finalUrl = options.currentUrl || `${DEFAULT_BASE_URL}${cleanPath === '/' ? '' : cleanPath}`;
  const finalCanonical = options.canonicalUrl || finalUrl;

  // If entity context is provided, delegate directly to entity builders
  if (options.entityContext?.film) {
    return buildFilmMetadata(options.entityContext.film, {
      currentUrl: finalUrl,
      canonicalUrl: finalCanonical,
      overrides: options.overrides,
    });
  }
  if (options.entityContext?.article) {
    return buildArticleMetadata(options.entityContext.article, {
      currentUrl: finalUrl,
      canonicalUrl: finalCanonical,
      overrides: options.overrides,
    });
  }
  if (options.entityContext?.buzz) {
    return buildBuzzMetadata(options.entityContext.buzz, {
      currentUrl: finalUrl,
      canonicalUrl: finalCanonical,
      overrides: options.overrides,
    });
  }
  if (options.entityContext?.user) {
    return buildUserMetadata(options.entityContext.user, {
      currentUrl: finalUrl,
      canonicalUrl: finalCanonical,
      overrides: options.overrides,
    });
  }

  // 1. Static Dictionary Match
  if (STATIC_ROUTE_METADATA_CONFIG[cleanPath]) {
    const config = STATIC_ROUTE_METADATA_CONFIG[cleanPath];
    const rawTitle = config.title;
    const finalTitle = formatBrandedTitle(rawTitle);
    const primaryImage = resolveAbsoluteUrl(DEFAULT_IMAGE, finalUrl);
    const imageMime = getImageMimeType(primaryImage);
    // Alias routes point their canonical at the primary route.
    const resolvedCanonical = config.canonicalPath
      ? `${DEFAULT_BASE_URL}${config.canonicalPath}`
      : finalCanonical;

    const openGraph: OpenGraphTags = {
      'og:site_name': SITE_NAME,
      'og:title': finalTitle,
      'og:description': config.description,
      'og:url': finalUrl,
      'og:type': config.type || 'website',
      'og:locale': DEFAULT_LOCALE,
      'og:image': primaryImage,
      'og:image:secure_url': primaryImage,
      'og:image:type': imageMime,
      'og:image:alt': finalTitle,
      'og:image:width': '1200',
      'og:image:height': '630',
    };

    const twitter: TwitterTags = {
      'twitter:card': 'summary_large_image',
      'twitter:site': DEFAULT_TWITTER_SITE,
      'twitter:title': finalTitle,
      'twitter:description': config.description,
      'twitter:image': primaryImage,
      'twitter:image:alt': finalTitle,
      'twitter:url': finalUrl,
    };

    return {
      title: finalTitle,
      rawTitle,
      description: config.description,
      keywords: config.keywords || DEFAULT_KEYWORDS,
      canonicalUrl: resolvedCanonical,
      url: finalUrl,
      type: config.type || 'website',
      primaryImage,
      imageAlt: finalTitle,
      imageWidth: '1200',
      imageHeight: '630',
      imageMimeType: imageMime,
      noindex: config.noindex,
      openGraph,
      twitter,
      ...options.overrides,
    };
  }

  // 2. Dynamic Route Pattern Matching

  // /film/:slug
  const filmMatch = cleanPath.match(/^\/film\/([^/]+)$/i);
  if (filmMatch) {
    const rawSlug = filmMatch[1];
    const titleFromSlug = formatSlugToTitle(rawSlug);
    return buildFilmMetadata(
      {
        title: titleFromSlug,
        slug: rawSlug,
      },
      {
        currentUrl: finalUrl,
        canonicalUrl: finalCanonical,
        overrides: options.overrides,
      }
    );
  }

  // /artikel/:slug or /article/:slug
  const articleMatch = cleanPath.match(/^\/(?:artikel|article)\/([^/]+)$/i);
  if (articleMatch) {
    const rawSlug = articleMatch[1];
    const titleFromSlug = formatSlugToTitle(rawSlug);
    return buildArticleMetadata(
      {
        title: titleFromSlug,
        slug: rawSlug,
      },
      {
        currentUrl: finalUrl,
        canonicalUrl: finalCanonical,
        overrides: options.overrides,
      }
    );
  }

  // /kategori/:category/:subCategory? or /category/:category/:subCategory?
  const categoryMatch = cleanPath.match(/^\/(?:kategori|category)\/([^/]+)(?:\/([^/]+))?$/i);
  if (categoryMatch) {
    return buildCategoryMetadata(categoryMatch[1], categoryMatch[2], {
      currentUrl: finalUrl,
      canonicalUrl: finalCanonical,
      overrides: options.overrides,
    });
  }

  // /buzz/:id
  if (cleanPath.startsWith('/buzz/')) {
    const buzzId = cleanPath.replace(/^\/buzz\/?/, '');
    return buildBuzzMetadata(
      { id: buzzId },
      {
        currentUrl: finalUrl,
        canonicalUrl: finalCanonical,
        overrides: options.overrides,
      }
    );
  }

  // /user/:id or /profil or /profile
  if (cleanPath.startsWith('/user/') || cleanPath === '/profil' || cleanPath === '/profile') {
    const userId = cleanPath.startsWith('/user/') ? cleanPath.replace(/^\/user\/?/, '') : '';
    return buildUserMetadata(
      { id: userId },
      {
        currentUrl: finalUrl,
        canonicalUrl: finalCanonical,
        overrides: options.overrides,
      }
    );
  }

  // Default Fallback
  const finalTitle = DEFAULT_TITLE;
  const primaryImage = resolveAbsoluteUrl(DEFAULT_IMAGE, finalUrl);
  const imageMime = getImageMimeType(primaryImage);

  const openGraph: OpenGraphTags = {
    'og:site_name': SITE_NAME,
    'og:title': finalTitle,
    'og:description': DEFAULT_DESCRIPTION,
    'og:url': finalUrl,
    'og:type': 'website',
    'og:locale': DEFAULT_LOCALE,
    'og:image': primaryImage,
    'og:image:secure_url': primaryImage,
    'og:image:type': imageMime,
    'og:image:alt': finalTitle,
    'og:image:width': '1200',
    'og:image:height': '630',
  };

  const twitter: TwitterTags = {
    'twitter:card': 'summary_large_image',
    'twitter:site': DEFAULT_TWITTER_SITE,
    'twitter:title': finalTitle,
    'twitter:description': DEFAULT_DESCRIPTION,
    'twitter:image': primaryImage,
    'twitter:image:alt': finalTitle,
    'twitter:url': finalUrl,
  };

  return {
    title: finalTitle,
    rawTitle: 'Sotoy Film',
    description: DEFAULT_DESCRIPTION,
    keywords: DEFAULT_KEYWORDS,
    canonicalUrl: finalCanonical,
    url: finalUrl,
    type: 'website',
    primaryImage,
    imageAlt: finalTitle,
    imageWidth: '1200',
    imageHeight: '630',
    imageMimeType: imageMime,
    openGraph,
    twitter,
    ...options.overrides,
  };
}
