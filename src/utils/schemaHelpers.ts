/**
 * Schema.org JSON-LD Structured Data Generation Utilities
 * 
 * Provides production-grade, Google Search Central compliant structured data schemas
 * for Movies, TVSeries, Articles, Reviews, Breadcrumbs, ItemLists, and Organizations.
 * Designed to maximize search engine rich snippets, carousel displays, and knowledge graph visibility.
 */

import { FilmItem, Article } from '../types';
import { resolveAbsoluteUrl, DEFAULT_BASE_URL } from './seoMetadata';

export interface BreadcrumbItem {
  name: string;
  item: string;
}

/**
 * Converts duration string into standard ISO 8601 duration format (e.g. "2h 46m" -> "PT2H46M")
 * as required by Google Search Central Movie and Video specifications.
 */
export function formatIso8601Duration(durationStr?: string): string | undefined {
  if (!durationStr || typeof durationStr !== 'string') return undefined;
  const trimmed = durationStr.trim();

  // If already in ISO 8601 format
  if (/^PT(\d+H)?(\d+M)?(\d+S)?$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  const hoursMatch = trimmed.match(/(\d+)\s*(?:h|hr|hours?|jam)/i);
  const minsMatch = trimmed.match(/(\d+)\s*(?:m|min|mins?|menit)/i);

  let hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
  let mins = minsMatch ? parseInt(minsMatch[1], 10) : 0;

  // Plain numeric representation (assume minutes if no unit specified)
  if (!hoursMatch && !minsMatch) {
    const numeric = parseInt(trimmed, 10);
    if (!isNaN(numeric) && numeric > 0) {
      hours = Math.floor(numeric / 60);
      mins = numeric % 60;
    }
  }

  if (hours === 0 && mins === 0) return undefined;

  let result = 'PT';
  if (hours > 0) result += `${hours}H`;
  if (mins > 0) result += `${mins}M`;
  return result;
}

/**
 * Strips HTML tags and normalizes whitespace for clean schema descriptions.
 */
export function stripHtmlTags(html?: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generates BreadcrumbList Schema (Home > Category > Detail)
 */
export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: resolveAbsoluteUrl(item.item),
    })),
  };
}

export interface MovieSchemaInput {
  title: string;
  originalTitle?: string;
  type?: 'movie' | 'series' | 'animation';
  image: string | string[];
  description: string;
  director: string;
  writer?: string;
  studio?: string;
  actorNames?: string[];
  castDetails?: { name: string; character?: string; photo?: string }[];
  genre?: string[];
  year: number;
  releaseDate?: string;
  duration?: string;
  trailerUrl?: string;
  trailerTitle?: string;
  whereToWatch?: { platform: string; type: string }[];
  skorSotoy: number;
  totalVotes: number;
  url?: string;
  reviews?: {
    authorName: string;
    reviewHeadline?: string;
    reviewBody: string;
    reviewRating: number;
    createdAt?: string;
  }[];
}

/**
 * Generates Movie or TVSeries Schema with Google-compliant AggregateRating, Reviews, Trailer, and Cast.
 */
export function generateMovieSchema(input: MovieSchemaInput) {
  const isSeries = input.type === 'series';
  const schemaType = isSeries ? 'TVSeries' : 'Movie';
  const canonicalUrl = input.url ? resolveAbsoluteUrl(input.url) : undefined;

  // Resolve multiple high-res images (Google recommends both 16:9 and 2:3 images)
  const images = Array.isArray(input.image)
    ? input.image.filter(Boolean).map(img => resolveAbsoluteUrl(img))
    : [resolveAbsoluteUrl(input.image)];

  // AggregateRating: Google requires totalVotes > 0 and ratingValue > 0
  const aggregateRating =
    input.totalVotes > 0 && input.skorSotoy > 0
      ? {
          '@type': 'AggregateRating',
          ratingValue: Number(input.skorSotoy.toFixed(1)),
          bestRating: '10.0',
          worstRating: '1.0',
          ratingCount: input.totalVotes,
          reviewCount: input.reviews && input.reviews.length > 0 ? input.reviews.length : input.totalVotes,
        }
      : undefined;

  // Format user/critic reviews
  const movieReviews = input.reviews?.map(rev => ({
    '@type': 'Review',
    name: rev.reviewHeadline || `Ulasan Skor ${rev.reviewRating} - ${input.title}`,
    reviewBody: stripHtmlTags(rev.reviewBody),
    datePublished: rev.createdAt || new Date().toISOString().split('T')[0],
    reviewRating: {
      '@type': 'Rating',
      ratingValue: rev.reviewRating,
      bestRating: '10.0',
      worstRating: '1.0',
    },
    author: {
      '@type': 'Person',
      name: rev.authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Sotoy Film',
      url: DEFAULT_BASE_URL,
    },
  }));

  // Actors: prioritized with character names if available
  const actors =
    input.castDetails && input.castDetails.length > 0
      ? input.castDetails.slice(0, 10).map(c => ({
          '@type': 'Person',
          name: c.name,
          image: c.photo ? resolveAbsoluteUrl(c.photo) : undefined,
        }))
      : input.actorNames?.slice(0, 10).map(name => ({
          '@type': 'Person',
          name,
        }));

  // ISO 8601 Duration
  const isoDuration = formatIso8601Duration(input.duration);

  // VideoObject Trailer
  const trailer = input.trailerUrl
    ? {
        '@type': 'VideoObject',
        name: input.trailerTitle || `Official Trailer - ${input.title}`,
        description: `Trailer resmi dan cuplikan film ${input.title} (${input.year}).`,
        thumbnailUrl: images,
        embedUrl: input.trailerUrl,
        uploadDate: input.releaseDate || `${input.year}-01-01`,
      }
    : undefined;

  // Where to watch providers / offers
  const offers =
    input.whereToWatch && input.whereToWatch.length > 0
      ? input.whereToWatch.map(w => ({
          '@type': 'Offer',
          category: w.type,
          offeredBy: {
            '@type': 'Organization',
            name: w.platform,
          },
        }))
      : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: input.title,
    alternateName: input.originalTitle || undefined,
    url: canonicalUrl,
    image: images.length === 1 ? images[0] : images,
    description: stripHtmlTags(input.description),
    dateCreated: `${input.year}`,
    datePublished: input.releaseDate || `${input.year}-01-01`,
    inLanguage: 'id',
    duration: isoDuration,
    director: input.director
      ? {
          '@type': 'Person',
          name: input.director,
        }
      : undefined,
    creator: input.writer
      ? {
          '@type': 'Person',
          name: input.writer,
        }
      : undefined,
    productionCompany: input.studio
      ? {
          '@type': 'Organization',
          name: input.studio,
        }
      : undefined,
    actor: actors && actors.length > 0 ? actors : undefined,
    genre: input.genre && input.genre.length > 0 ? input.genre : undefined,
    trailer,
    aggregateRating,
    review: movieReviews && movieReviews.length > 0 ? movieReviews : undefined,
    offers,
  };
}

export interface ReviewSchemaInput {
  authorName: string;
  itemReviewedName: string;
  reviewHeadline?: string;
  reviewBody: string;
  reviewRating: number;
  datePublished?: string;
  url?: string;
}

/**
 * Generates standalone Review Schema
 */
export function generateReviewSchema(input: ReviewSchemaInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Review',
    name: input.reviewHeadline || `Ulasan Skor ${input.reviewRating} - ${input.itemReviewedName}`,
    reviewBody: stripHtmlTags(input.reviewBody),
    datePublished: input.datePublished || new Date().toISOString().split('T')[0],
    url: input.url ? resolveAbsoluteUrl(input.url) : undefined,
    itemReviewed: {
      '@type': 'Movie',
      name: input.itemReviewedName,
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: input.reviewRating,
      bestRating: '10.0',
      worstRating: '1.0',
    },
    author: {
      '@type': 'Person',
      name: input.authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Sotoy Film',
      url: DEFAULT_BASE_URL,
    },
  };
}

export interface ArticleSchemaInput {
  title: string;
  description: string;
  image: string | string[];
  url: string;
  datePublished: string;
  dateModified?: string;
  authorName: string;
  authorUrl?: string;
  authorAvatar?: string;
  publisherName?: string;
  publisherLogo?: string;
  category?: string;
  keywords?: string[];
  content?: string;
}

/**
 * Generates NewsArticle Schema compliant with Google Search Central news/blog rich snippets.
 */
export function generateArticleSchema(input: ArticleSchemaInput) {
  const canonicalUrl = resolveAbsoluteUrl(input.url);

  // Array of image formats
  const images = Array.isArray(input.image)
    ? input.image.filter(Boolean).map(img => resolveAbsoluteUrl(img))
    : [resolveAbsoluteUrl(input.image)];

  // Plaintext word count
  const plainContent = stripHtmlTags(input.content || input.description);
  const wordCount = plainContent ? plainContent.split(/\s+/).length : undefined;

  const authorUrl = input.authorUrl
    ? resolveAbsoluteUrl(input.authorUrl)
    : `${DEFAULT_BASE_URL}/user/${encodeURIComponent(input.authorName.toLowerCase().replace(/\s+/g, '-'))}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: input.title.slice(0, 110),
    description: stripHtmlTags(input.description).slice(0, 250),
    image: images.length === 1 ? images[0] : images,
    datePublished: input.datePublished,
    dateModified: input.dateModified || input.datePublished,
    inLanguage: 'id',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
    articleSection: input.category || 'Movies',
    keywords: input.keywords && input.keywords.length > 0 ? input.keywords.join(', ') : undefined,
    wordCount,
    articleBody: plainContent.slice(0, 5000),
    author: {
      '@type': 'Person',
      name: input.authorName,
      url: authorUrl,
      image: input.authorAvatar ? resolveAbsoluteUrl(input.authorAvatar) : undefined,
    },
    publisher: {
      '@type': 'Organization',
      name: input.publisherName || 'Sotoy Film',
      url: DEFAULT_BASE_URL,
      logo: {
        '@type': 'ImageObject',
        url: resolveAbsoluteUrl(
          input.publisherLogo ||
            'https://www.sotoyfilm.my.id/sotoy%20film%20favicon%20512x512.PNG'
        ),
        width: 512,
        height: 512,
      },
    },
  };
}

/**
 * Generates ItemList Schema for movie catalogues, curation feeds, and category collections.
 */
export function generateItemListSchema(
  name: string,
  items: { name: string; url: string; image?: string; position?: number }[]
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: item.position ?? index + 1,
      name: item.name,
      url: resolveAbsoluteUrl(item.url),
      image: item.image ? resolveAbsoluteUrl(item.image) : undefined,
    })),
  };
}

/**
 * Generates WebSite Schema with Sitelinks Searchbox
 */
export function generateWebSiteSchema(siteUrl = DEFAULT_BASE_URL) {
  const cleanUrl = resolveAbsoluteUrl(siteUrl);
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Sotoy Film',
    alternateName: ['SotoyFilm', 'Sotoy Film Media'],
    url: cleanUrl,
    description:
      'Platform komunitas & media pop-culture film, series, animation, cinema gear, dan film studies dengan ulasan Skor Sotoy dan diskusi buzz.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${cleanUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Generates Organization Schema
 */
export function generateOrganizationSchema(siteUrl = DEFAULT_BASE_URL) {
  const cleanUrl = resolveAbsoluteUrl(siteUrl);
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Sotoy Film',
    url: cleanUrl,
    logo: {
      '@type': 'ImageObject',
      url: `${cleanUrl}/sotoy%20film%20favicon%20512x512.PNG`,
      width: 512,
      height: 512,
    },
    sameAs: [
      'https://twitter.com/sotoyfilm',
      'https://instagram.com/sotoyfilm',
      'https://tiktok.com/@sotoyfilm',
    ],
  };
}

/**
 * Dynamically converts a FilmItem into a complete, rich Schema.org Movie/TVSeries structure.
 */
export function createMovieSchemaFromFilm(
  film: FilmItem,
  options?: {
    reviews?: {
      userName?: string;
      reviewText?: string;
      score: number;
      createdAt?: string;
    }[];
    currentUrl?: string;
  }
) {
  const filmReviews = options?.reviews
    ?.filter(r => r.reviewText && r.reviewText.trim().length > 0)
    .map(r => ({
      authorName: r.userName || 'Warga Sotoy',
      reviewHeadline: `Ulasan Skor ${r.score} - ${film.title}`,
      reviewBody: r.reviewText || '',
      reviewRating: r.score,
      createdAt: r.createdAt || new Date().toISOString(),
    }));

  const slug = film.slug || film.id;
  const canonicalUrl = options?.currentUrl || `${DEFAULT_BASE_URL}/film/${encodeURIComponent(slug)}`;

  // Provide both poster and backdrop for rich snippet carousel compatibility
  const images = [film.backdrop, film.poster].filter(Boolean) as string[];

  return generateMovieSchema({
    title: film.title,
    originalTitle: film.originalTitle,
    type: film.type,
    image: images.length > 0 ? images : '/og-default.png',
    description: film.synopsis || film.curatorNote || `Ulasan dan informasi film ${film.title}`,
    director: film.director || 'Sutradara',
    writer: film.writer,
    studio: film.studio,
    actorNames: film.cast || [],
    castDetails: film.castDetails,
    genre: film.genres || [],
    year: film.year || new Date().getFullYear(),
    releaseDate: film.releaseDate,
    duration: film.duration,
    trailerUrl: film.trailerUrl,
    trailerTitle: film.trailerTitle,
    whereToWatch: film.whereToWatch,
    skorSotoy: Number(film.skorSotoy || 0),
    totalVotes: Number(film.totalVotes || (filmReviews ? filmReviews.length : 0)),
    url: canonicalUrl,
    reviews: filmReviews,
  });
}

/**
 * Dynamically converts an Article into a Schema.org NewsArticle structure.
 */
export function createArticleSchemaFromArticle(
  article: Article,
  options?: {
    currentUrl?: string;
    authorName?: string;
    authorAvatar?: string;
  }
) {
  const authorName = options?.authorName || article.author?.name || 'Tim Redaksi';
  const authorAvatar = options?.authorAvatar || article.author?.avatar;
  const authorId = article.author?.id || article.authorId;
  const authorUrl = authorId ? `${DEFAULT_BASE_URL}/user/${authorId}` : undefined;

  const slug = article.slug || article.id;
  const canonicalUrl = options?.currentUrl || `${DEFAULT_BASE_URL}/artikel/${encodeURIComponent(slug)}`;

  const images = [article.ogImage, article.coverImage].filter(Boolean) as string[];

  return generateArticleSchema({
    title: article.seoTitle || article.title,
    description: article.metaDescription || article.excerpt || (article.content ? article.content.slice(0, 160) : ''),
    image: images.length > 0 ? images : '/og-default.png',
    url: canonicalUrl,
    datePublished: article.publishedAt || new Date().toISOString(),
    dateModified: (article as any)?.updatedAt || article.publishedAt,
    authorName,
    authorAvatar,
    authorUrl,
    category: article.category,
    keywords: article.tags || [],
    content: article.content,
  });
}
