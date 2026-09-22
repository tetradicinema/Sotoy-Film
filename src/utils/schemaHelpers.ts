/**
 * Utility functions for Schema.org JSON-LD Structured Data
 * Optimized for Sotoy Film reviews, movies, and editorial content.
 */

import { FilmItem, Article } from '../types';

export interface BreadcrumbItem {
  name: string;
  item: string;
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
      item: item.item,
    })),
  };
}

export interface MovieSchemaInput {
  title: string;
  originalTitle?: string;
  image: string;
  description: string;
  director: string;
  writer?: string;
  actorNames?: string[];
  genre?: string[];
  year: number;
  skorSotoy: number;
  totalVotes: number;
  reviews?: {
    authorName: string;
    reviewHeadline: string;
    reviewBody: string;
    reviewRating: number;
    createdAt: string;
  }[];
}

/**
 * Generates Movie & Review Schema (including decimal 'Skor Sotoy' aggregateRating)
 */
export function generateMovieSchema(input: MovieSchemaInput) {
  const aggregateRating = input.totalVotes > 0 ? {
    '@type': 'AggregateRating',
    ratingValue: input.skorSotoy,
    bestRating: '10.0',
    worstRating: '1.0',
    ratingCount: input.totalVotes,
  } : undefined;

  const movieReviews = input.reviews?.map(rev => ({
    '@type': 'Review',
    author: {
      '@type': 'Person',
      name: rev.authorName,
    },
    datePublished: rev.createdAt,
    reviewRating: {
      '@type': 'Rating',
      ratingValue: rev.reviewRating,
      bestRating: '10.0',
      worstRating: '1.0',
    },
    name: rev.reviewHeadline,
    reviewBody: rev.reviewBody,
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: input.title,
    alternateName: input.originalTitle,
    image: input.image,
    description: input.description,
    dateCreated: `${input.year}`,
    director: {
      '@type': 'Person',
      name: input.director,
    },
    creator: input.writer ? {
      '@type': 'Person',
      name: input.writer,
    } : undefined,
    actor: input.actorNames?.map(name => ({
      '@type': 'Person',
      name,
    })),
    genre: input.genre,
    aggregateRating,
    review: movieReviews && movieReviews.length > 0 ? movieReviews : undefined,
  };
}

export interface ReviewSchemaInput {
  authorName: string;
  itemReviewedName: string;
  reviewHeadline: string;
  reviewBody: string;
  reviewRating: number;
  datePublished: string;
}

/**
 * Generates Review Schema
 */
export function generateReviewSchema(input: ReviewSchemaInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Review',
    author: {
      '@type': 'Person',
      name: input.authorName,
    },
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
    name: input.reviewHeadline,
    reviewBody: input.reviewBody,
    datePublished: input.datePublished,
  };
}

export interface ArticleSchemaInput {
  title: string;
  description: string;
  image: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  authorName: string;
  authorAvatar?: string;
  publisherName?: string;
  publisherLogo?: string;
  keywords?: string[];
}

/**
 * Generates NewsArticle / BlogPosting Schema for articles
 */
export function generateArticleSchema(input: ArticleSchemaInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: input.title,
    description: input.description,
    image: [input.image],
    datePublished: input.datePublished,
    dateModified: input.dateModified || input.datePublished,
    author: {
      '@type': 'Person',
      name: input.authorName,
      image: input.authorAvatar,
    },
    publisher: {
      '@type': 'Organization',
      name: input.publisherName || 'Sotoy Film',
      logo: {
        '@type': 'ImageObject',
        url: input.publisherLogo || 'https://www.sotoyfilm.my.id/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': input.url,
    },
    keywords: input.keywords?.join(', '),
  };
}

/**
 * Generates WebSite Schema with SearchAction
 */
export function generateWebSiteSchema(siteUrl = 'https://www.sotoyfilm.my.id') {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Sotoy Film',
    alternateName: 'SotoyFilm',
    url: siteUrl,
    description: 'Platform komunitas & media pop-culture film, series, anime, cinema gear, dan film studies dengan ulasan Skor Sotoy dan diskusi buzz.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Generates Organization Schema
 */
export function generateOrganizationSchema(siteUrl = 'https://www.sotoyfilm.my.id') {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Sotoy Film',
    url: siteUrl,
    logo: {
      '@type': 'ImageObject',
      url: `${siteUrl}/logo.png`,
    },
    sameAs: [
      'https://twitter.com/sotoyfilm',
      'https://instagram.com/sotoyfilm',
    ],
  };
}

/**
 * Dynamically converts a FilmItem into a Schema.org Movie structure
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

  return generateMovieSchema({
    title: film.title,
    originalTitle: film.originalTitle,
    image: film.poster || film.backdrop || 'https://www.sotoyfilm.my.id/og-default.jpg',
    description: film.synopsis || film.curatorNote || `Ulasan dan informasi film ${film.title}`,
    director: film.director || 'Sutradara',
    writer: film.writer,
    actorNames: film.cast || [],
    genre: film.genres || [],
    year: film.year || new Date().getFullYear(),
    skorSotoy: Number(film.skorSotoy || 0),
    totalVotes: Number(film.totalVotes || (filmReviews ? filmReviews.length : 0)),
    reviews: filmReviews,
  });
}

/**
 * Dynamically converts an Article into a Schema.org NewsArticle structure
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
  const canonicalUrl = options?.currentUrl || `https://www.sotoyfilm.my.id/artikel/${article.slug || article.id}`;

  return generateArticleSchema({
    title: article.seoTitle || article.title,
    description: article.metaDescription || article.excerpt || (article.content ? article.content.slice(0, 160) : ''),
    image: article.ogImage || article.coverImage || 'https://www.sotoyfilm.my.id/og-default.jpg',
    url: canonicalUrl,
    datePublished: article.publishedAt || new Date().toISOString(),
    authorName,
    authorAvatar,
    keywords: article.tags || [],
  });
}
