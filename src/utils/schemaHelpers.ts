/**
 * Utility functions for Schema.org JSON-LD Structured Data
 * Optimized for Sotoy Film reviews, movies, and editorial content.
 */

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

interface MovieSchemaInput {
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
    bestRating: '5.0',
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
      bestRating: '5.0',
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

interface ReviewSchemaInput {
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
      bestRating: '5.0',
      worstRating: '1.0',
    },
    name: input.reviewHeadline,
    reviewBody: input.reviewBody,
    datePublished: input.datePublished,
  };
}

interface ArticleSchemaInput {
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
