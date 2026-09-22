import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FilmItem, Article } from '../../types';
import { generateMetadata } from '../../utils/generateMetadata';
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
  imageAlt?: string;
  imageWidth?: number | string;
  imageHeight?: number | string;
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

  // Dynamic Social Meta Props
  twitterCard?: 'summary' | 'summary_large_image' | 'player' | 'app';
  twitterSite?: string;
  twitterCreator?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
}

const DEFAULT_TITLE = 'Sotoy Film - Ulasan & Kritik Film Terpercaya';
const DEFAULT_DESC = 'Platform komunitas & media pop-culture film, series, anime, cinema gear, dan film studies dengan ulasan Skor Sotoy dan diskusi buzz.';
const DEFAULT_KEYWORDS = 'ulasan film, kritik film, film indonesia, skor sotoy, cinema gear, anime, pop culture';
const DEFAULT_IMAGE = 'https://www.sotoyfilm.my.id/og-default.jpg';
const DEFAULT_URL = 'https://www.sotoyfilm.my.id';

/**
 * Resolves any image URL to a fully qualified, absolute HTTPS URL for crawler compatibility.
 */
const resolveAbsoluteUrl = (urlStr?: string, baseUrl = DEFAULT_URL): string => {
  if (!urlStr || typeof urlStr !== 'string') return DEFAULT_IMAGE;
  const trimmed = urlStr.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }
  if (trimmed.startsWith('/')) {
    return `${baseUrl.replace(/\/$/, '')}${trimmed}`;
  }
  return `${baseUrl.replace(/\/$/, '')}/${trimmed}`;
};

/**
 * Detects image MIME type from URL extension.
 */
const getImageMimeType = (url: string): string => {
  const clean = url.split('?')[0].toLowerCase();
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.webp')) return 'image/webp';
  if (clean.endsWith('.gif')) return 'image/gif';
  if (clean.endsWith('.svg')) return 'image/svg+xml';
  return 'image/jpeg';
};

/**
 * Parses duration strings like "2h 46m" or "120 min" into total seconds.
 */
const parseDurationInSeconds = (durationStr?: string): number | null => {
  if (!durationStr) return null;
  const hoursMatch = durationStr.match(/(\d+)\s*h/i);
  const minsMatch = durationStr.match(/(\d+)\s*(?:m|min)/i);
  let totalSeconds = 0;
  if (hoursMatch) totalSeconds += parseInt(hoursMatch[1], 10) * 3600;
  if (minsMatch) totalSeconds += parseInt(minsMatch[1], 10) * 60;
  return totalSeconds > 0 ? totalSeconds : null;
};

export const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description = DEFAULT_DESC,
  keywords,
  image,
  imageAlt,
  imageWidth = '1200',
  imageHeight = '630',
  url,
  type,
  canonicalUrl,
  schema,
  noindex = false,
  film,
  article,
  author,
  reviews,
  breadcrumbs,
  twitterCard = 'summary_large_image',
  twitterSite = '@sotoyfilm',
  twitterCreator,
  publishedTime,
  modifiedTime,
  section,
  tags,
}) => {
  const location = useLocation();

  // Dynamic route-specific metadata resolved from current pathname
  const routeMeta = useMemo(() => {
    return generateMetadata(location.pathname);
  }, [location.pathname]);

  const rawTitle = title || routeMeta.title;
  const finalTitle = rawTitle.includes('Sotoy Film') ? rawTitle : `${rawTitle} | Sotoy Film`;

  const finalDescription = (description && description !== DEFAULT_DESC)
    ? description
    : (routeMeta.description || DEFAULT_DESC);

  // Dynamic URL resolution based on client location or fallback
  const clientLocationUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}${window.location.pathname}`
    : DEFAULT_URL;
  const finalUrl = url || clientLocationUrl;
  const finalCanonical = canonicalUrl || finalUrl;

  const finalKeywords = useMemo(() => {
    if (keywords) {
      return Array.isArray(keywords) ? keywords.filter(Boolean).join(', ') : keywords;
    }
    if (routeMeta.keywords && routeMeta.keywords.length > 0) {
      return routeMeta.keywords.join(', ');
    }
    return DEFAULT_KEYWORDS;
  }, [keywords, routeMeta.keywords]);

  // Determine effective page type
  const effectiveType = type || (film ? 'video.movie' : article ? 'article' : (routeMeta.type || 'website'));

  const effectiveNoindex = noindex || !!routeMeta.noindex;

  // Dynamic Image Resolution:
  // For films: prioritize high-res landscape backdrop (optimal for 16:9 / summary_large_image), then poster
  // For articles: prioritize ogImage, then coverImage
  // Otherwise: fall back to image prop or DEFAULT_IMAGE
  const rawPrimaryImage = useMemo(() => {
    if (image && image !== DEFAULT_IMAGE) return image;
    if (film) return film.backdrop || film.poster || DEFAULT_IMAGE;
    if (article) return article.ogImage || article.coverImage || DEFAULT_IMAGE;
    return image || DEFAULT_IMAGE;
  }, [image, film, article]);

  const primaryImageUrl = useMemo(
    () => resolveAbsoluteUrl(rawPrimaryImage, finalUrl),
    [rawPrimaryImage, finalUrl]
  );

  // Secondary portrait poster for films (useful for platforms supporting multiple OG images)
  const secondaryImageUrl = useMemo(() => {
    if (film && film.backdrop && film.poster && film.backdrop !== film.poster) {
      return resolveAbsoluteUrl(film.poster, finalUrl);
    }
    return null;
  }, [film, finalUrl]);

  const primaryImageMime = useMemo(() => getImageMimeType(primaryImageUrl), [primaryImageUrl]);

  const finalImageAlt = useMemo(() => {
    if (imageAlt) return imageAlt;
    if (film) return `${film.title} (${film.year}) - Poster & Ulasan Film di Sotoy Film`;
    if (article) return `${article.title} - Sotoy Film Pop Culture Media`;
    return finalTitle;
  }, [imageAlt, film, article, finalTitle]);

  const finalAuthor = author?.name || article?.author?.name || 'Redaksi Sotoy Film';
  const effectiveTwitterCreator = twitterCreator || (author?.name ? `@${author.name.replace(/\s+/g, '')}` : '@sotoyfilm');
  const effectivePublishedTime = publishedTime || article?.publishedAt;
  const effectiveModifiedTime = modifiedTime || (article as any)?.updatedAt || effectivePublishedTime;
  const effectiveSection = section || article?.category;
  const effectiveTags = tags || article?.tags || film?.genres || [];

  const filmDurationSeconds = useMemo(
    () => (film?.duration ? parseDurationInSeconds(film.duration) : null),
    [film?.duration]
  );

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
      } else if (effectiveType === 'video.movie' && title) {
        list.push({
          '@context': 'https://schema.org',
          '@type': 'Movie',
          name: title,
          description,
          image: primaryImageUrl,
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
      } else if (effectiveType === 'article' && title) {
        list.push(
          generateArticleSchema({
            title,
            description,
            image: primaryImageUrl,
            url: finalUrl,
            datePublished: effectivePublishedTime || new Date().toISOString(),
            dateModified: effectiveModifiedTime,
            authorName: finalAuthor,
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
    if (effectiveType === 'website' || (!film && !article && effectiveType !== 'video.movie' && effectiveType !== 'article')) {
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
    effectiveType,
    title,
    description,
    primaryImageUrl,
    finalUrl,
    keywords,
    effectivePublishedTime,
    effectiveModifiedTime,
    finalAuthor,
  ]);

  return (
    <Helmet>
      {/* Standard Meta Tags */}
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      <meta name="keywords" content={finalKeywords} />
      <link rel="canonical" href={finalCanonical} />
      {effectiveNoindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph / Facebook / WhatsApp */}
      <meta property="og:site_name" content="Sotoy Film" />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:url" content={finalUrl} />
      <meta property="og:type" content={effectiveType} />
      <meta property="og:locale" content="id_ID" />

      {/* Primary Dynamic Open Graph Image */}
      <meta property="og:image" content={primaryImageUrl} />
      <meta property="og:image:secure_url" content={primaryImageUrl} />
      <meta property="og:image:type" content={primaryImageMime} />
      <meta property="og:image:width" content={String(imageWidth)} />
      <meta property="og:image:height" content={String(imageHeight)} />
      <meta property="og:image:alt" content={finalImageAlt} />

      {/* Secondary Film Poster (if distinct from backdrop) */}
      {secondaryImageUrl && (
        <>
          <meta property="og:image" content={secondaryImageUrl} />
          <meta property="og:image:secure_url" content={secondaryImageUrl} />
          <meta property="og:image:type" content={getImageMimeType(secondaryImageUrl)} />
          <meta property="og:image:alt" content={`${film?.title || 'Film'} Poster Resmi`} />
        </>
      )}

      {/* Film Specific Open Graph Meta (video.movie) */}
      {film && (
        <>
          {film.director && <meta property="video:director" content={film.director} />}
          {film.year && <meta property="video:release_date" content={`${film.year}-01-01`} />}
          {filmDurationSeconds && <meta property="video:duration" content={String(filmDurationSeconds)} />}
          {film.genres?.map(genre => (
            <meta key={`video-genre-${genre}`} property="video:tag" content={genre} />
          ))}
          {(film.castDetails?.map(c => c.name) || film.cast || []).slice(0, 5).map(actor => (
            <meta key={`video-actor-${actor}`} property="video:actor" content={actor} />
          ))}
        </>
      )}

      {/* Article Specific Open Graph Meta */}
      {article && (
        <>
          {effectivePublishedTime && (
            <meta property="article:published_time" content={effectivePublishedTime} />
          )}
          {effectiveModifiedTime && (
            <meta property="article:modified_time" content={effectiveModifiedTime} />
          )}
          {finalAuthor && <meta property="article:author" content={finalAuthor} />}
          {effectiveSection && <meta property="article:section" content={effectiveSection} />}
          {effectiveTags.map(tag => (
            <meta key={`article-tag-${tag}`} property="article:tag" content={tag} />
          ))}
        </>
      )}

      {/* Twitter / X Social Cards */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:site" content={twitterSite} />
      {effectiveTwitterCreator && <meta name="twitter:creator" content={effectiveTwitterCreator} />}
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={primaryImageUrl} />
      <meta name="twitter:image:alt" content={finalImageAlt} />
      <meta name="twitter:domain" content={typeof window !== 'undefined' ? window.location.hostname : 'www.sotoyfilm.my.id'} />
      <meta name="twitter:url" content={finalUrl} />

      {/* Schema.org Structured Data (JSON-LD) */}
      {resolvedSchemas.map((s, i) => (
        <script key={`schema-${s['@type'] || i}-${i}`} type="application/ld+json">
          {JSON.stringify(s)}
        </script>
      ))}
    </Helmet>
  );
};

