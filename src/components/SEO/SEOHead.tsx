import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { FilmItem, Article } from '../../types';
import {
  BreadcrumbItem,
  generateBreadcrumbSchema,
  generateArticleSchema,
  generateWebSiteSchema,
  generateOrganizationSchema,
  createMovieSchemaFromFilm,
  createArticleSchemaFromArticle,
} from '../../utils/schemaHelpers';

export interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string | string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'video.movie';
  canonicalUrl?: string;
  schema?: Record<string, any> | Record<string, any>[];
  noindex?: boolean;

  // Dynamic entity props for automatic Schema.org JSON-LD generation
  film?: FilmItem;
  article?: Article;
  author?: {
    name?: string;
    avatar?: string;
  };
  reviews?: {
    userName?: string;
    reviewText?: string;
    score: number;
    createdAt?: string;
  }[];
  breadcrumbs?: BreadcrumbItem[];
}

const DEFAULT_TITLE = 'Sotoy Film - Ulasan & Kritik Film Terpercaya';
const DEFAULT_DESC = 'Platform komunitas & media pop-culture film, series, anime, cinema gear, dan film studies dengan ulasan Skor Sotoy dan diskusi buzz.';
const DEFAULT_KEYWORDS = 'ulasan film, kritik film, film indonesia, skor sotoy, cinema gear, anime, pop culture';
const DEFAULT_IMAGE = 'https://www.sotoyfilm.my.id/og-default.jpg';
const DEFAULT_URL = 'https://www.sotoyfilm.my.id';

export const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description = DEFAULT_DESC,
  keywords,
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  canonicalUrl,
  schema,
  noindex = false,
  film,
  article,
  author,
  reviews,
  breadcrumbs,
}) => {
  const finalTitle = title ? `${title} | Sotoy Film` : DEFAULT_TITLE;
  
  // Dynamic URL resolution based on client location or fallback
  const clientLocationUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}${window.location.pathname}`
    : DEFAULT_URL;
  const finalUrl = url || clientLocationUrl;
  const finalCanonical = canonicalUrl || finalUrl;

  const finalKeywords = Array.isArray(keywords)
    ? keywords.filter(Boolean).join(', ')
    : keywords || DEFAULT_KEYWORDS;

  // Dynamically assemble Schema.org structured data
  const resolvedSchemas = useMemo(() => {
    const list: Record<string, any>[] = [];
    const explicitSchemas = Array.isArray(schema) ? schema : schema ? [schema] : [];
    const hasExplicitType = (typeName: string) =>
      explicitSchemas.some(s => s && s['@type'] === typeName);

    // 1. Dynamic Movie Schema
    if (!hasExplicitType('Movie')) {
      if (film) {
        list.push(
          createMovieSchemaFromFilm(film, {
            reviews,
            currentUrl: finalUrl,
          })
        );
      } else if (type === 'video.movie' && title) {
        list.push({
          '@context': 'https://schema.org',
          '@type': 'Movie',
          name: title,
          description,
          image,
          url: finalUrl,
        });
      }
    }

    // 2. Dynamic Article Schema (NewsArticle / BlogPosting)
    if (
      !hasExplicitType('NewsArticle') &&
      !hasExplicitType('Article') &&
      !hasExplicitType('BlogPosting')
    ) {
      if (article) {
        list.push(
          createArticleSchemaFromArticle(article, {
            currentUrl: finalUrl,
            authorName: author?.name,
            authorAvatar: author?.avatar,
          })
        );
      } else if (type === 'article' && title) {
        list.push(
          generateArticleSchema({
            title,
            description,
            image,
            url: finalUrl,
            datePublished: new Date().toISOString(),
            authorName: author?.name || 'Tim Redaksi',
            authorAvatar: author?.avatar,
            keywords: Array.isArray(keywords) ? keywords : keywords ? [keywords] : [],
          })
        );
      }
    }

    // 3. Dynamic BreadcrumbList Schema
    if (breadcrumbs && breadcrumbs.length > 0 && !hasExplicitType('BreadcrumbList')) {
      list.push(generateBreadcrumbSchema(breadcrumbs));
    }

    // 4. Dynamic WebSite & Organization Schemas
    if (type === 'website' || (!film && !article && type !== 'video.movie' && type !== 'article')) {
      if (!hasExplicitType('WebSite')) {
        list.push(generateWebSiteSchema('https://www.sotoyfilm.my.id'));
      }
      if (!hasExplicitType('Organization')) {
        list.push(generateOrganizationSchema('https://www.sotoyfilm.my.id'));
      }
    }

    // 5. Append explicitly passed custom schemas
    list.push(...explicitSchemas.filter(Boolean));

    return list;
  }, [
    schema,
    film,
    article,
    author,
    reviews,
    breadcrumbs,
    type,
    title,
    description,
    image,
    finalUrl,
    keywords,
  ]);

  return (
    <Helmet>
      {/* Standard Meta Tags */}
      <title>{finalTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={finalKeywords} />
      <link rel="canonical" href={finalCanonical} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph / Facebook */}
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={finalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="Sotoy Film" />

      {/* Twitter / X */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Schema.org Structured Data (JSON-LD) */}
      {resolvedSchemas.map((s, i) => (
        <script key={`schema-${s['@type'] || i}-${i}`} type="application/ld+json">
          {JSON.stringify(s)}
        </script>
      ))}
    </Helmet>
  );
};
