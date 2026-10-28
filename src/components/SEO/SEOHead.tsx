import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Helmet } from '@dr.pogodin/react-helmet';
import { FilmItem, Article } from '../../types';
import {
  CompletePageMetadata,
  buildRouteMetadata,
  buildFilmMetadata,
  buildArticleMetadata,
  resolveAbsoluteUrl,
  getImageMimeType,
  parseDurationInSeconds,
  DEFAULT_BASE_URL,
  DEFAULT_TWITTER_SITE,
} from '../../utils/seoMetadata';
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
  type?: 'website' | 'article' | 'video.movie' | string;
  canonicalUrl?: string;
  schema?: Record<string, any> | Record<string, any>[];
  noindex?: boolean;
  /** Optional explicit robots meta content (e.g. "noindex, follow"). */
  robots?: string;

  // Complete pre-built metadata (optional direct injection)
  metadata?: CompletePageMetadata;

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

export const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
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
  robots,
  metadata: explicitMetadata,
  film,
  article,
  author,
  reviews,
  breadcrumbs,
  twitterCard = 'summary_large_image',
  twitterSite = DEFAULT_TWITTER_SITE,
  twitterCreator,
  publishedTime,
  modifiedTime,
  section,
  tags,
}) => {
  const location = useLocation();

  // Dynamic Central Metadata Assembly
  const metadata = useMemo<CompletePageMetadata>(() => {
    if (explicitMetadata) {
      return explicitMetadata;
    }

    const clientLocationUrl = typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : DEFAULT_BASE_URL;
    const finalUrl = url || clientLocationUrl;
    const finalCanonical = canonicalUrl || finalUrl;

    if (film) {
      return buildFilmMetadata(film, {
        currentUrl: finalUrl,
        canonicalUrl: finalCanonical,
        reviews,
        overrides: {
          ...(title ? { title: title.includes('Sotoy Film') ? title : `${title} | Sotoy Film`, rawTitle: title } : {}),
          ...(description ? { description } : {}),
          ...(image ? { primaryImage: resolveAbsoluteUrl(image, finalUrl) } : {}),
          ...(type ? { type } : {}),
          ...(keywords ? { keywords: Array.isArray(keywords) ? keywords : [keywords] } : {}),
          noindex,
        },
      });
    }

    if (article) {
      return buildArticleMetadata(article, {
        currentUrl: finalUrl,
        canonicalUrl: finalCanonical,
        author,
        overrides: {
          ...(title ? { title: title.includes('Sotoy Film') ? title : `${title} | Sotoy Film`, rawTitle: title } : {}),
          ...(description ? { description } : {}),
          ...(image ? { primaryImage: resolveAbsoluteUrl(image, finalUrl) } : {}),
          ...(type ? { type } : {}),
          ...(keywords ? { keywords: Array.isArray(keywords) ? keywords : [keywords] } : {}),
          noindex,
        },
      });
    }

    return buildRouteMetadata(location.pathname, {
      currentUrl: finalUrl,
      canonicalUrl: finalCanonical,
      overrides: {
        ...(title ? { title: title.includes('Sotoy Film') ? title : `${title} | Sotoy Film`, rawTitle: title } : {}),
        ...(description ? { description } : {}),
        ...(image ? { primaryImage: resolveAbsoluteUrl(image, finalUrl) } : {}),
        ...(type ? { type } : {}),
        ...(keywords ? { keywords: Array.isArray(keywords) ? keywords : [keywords] } : {}),
        noindex,
      },
    });
  }, [
    explicitMetadata,
    location.pathname,
    film,
    article,
    author,
    reviews,
    url,
    canonicalUrl,
    title,
    description,
    image,
    type,
    keywords,
    noindex,
  ]);

  const finalTitle = metadata.title;
  const finalDescription = metadata.description;
  const finalKeywords = metadata.keywords.join(', ');
  const finalUrl = metadata.url;
  const finalCanonical = metadata.canonicalUrl;
  const effectiveType = type || metadata.type;
  const effectiveNoindex = noindex || metadata.noindex;

  const primaryImageUrl = metadata.primaryImage;
  const secondaryImageUrl = metadata.secondaryImage;
  const primaryImageMime = metadata.imageMimeType || getImageMimeType(primaryImageUrl);
  const finalImageAlt = imageAlt || metadata.imageAlt || finalTitle;

  const finalAuthor = author?.name || metadata.authorName || 'Redaksi Sotoy Film';
  const effectiveTwitterCreator =
    twitterCreator ||
    metadata.twitter['twitter:creator'] ||
    (author?.name ? `@${author.name.replace(/\s+/g, '')}` : DEFAULT_TWITTER_SITE);
  const effectivePublishedTime = publishedTime || metadata.publishedTime;
  const effectiveModifiedTime = modifiedTime || metadata.modifiedTime || effectivePublishedTime;
  const effectiveSection = section || metadata.section;
  const effectiveTags = tags || metadata.tags || metadata.filmDetails?.genres || [];

  const filmDurationSeconds = useMemo(() => {
    if (metadata.filmDetails?.durationSeconds) return metadata.filmDetails.durationSeconds;
    if (film?.duration) return parseDurationInSeconds(film.duration);
    return null;
  }, [metadata.filmDetails?.durationSeconds, film?.duration]);

  // Dynamically assemble Schema.org structured data
  const resolvedSchemas = useMemo(() => {
    const list: Record<string, any>[] = [];
    const explicitSchemas = Array.isArray(schema) ? schema : schema ? [schema] : [];
    const hasExplicitType = (typeName: string) =>
      explicitSchemas.some(s => s && s['@type'] === typeName);

    // 1. Dynamic Movie / TVSeries Schema
    if (!hasExplicitType('Movie') && !hasExplicitType('TVSeries')) {
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
          description: finalDescription,
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
            description: finalDescription,
            image: primaryImageUrl,
            url: finalUrl,
            datePublished: effectivePublishedTime || new Date().toISOString(),
            dateModified: effectiveModifiedTime,
            authorName: finalAuthor,
            authorAvatar: author?.avatar,
            keywords: metadata.keywords,
          })
        );
      }
    }

    // 3. Dynamic BreadcrumbList Schema
    if (breadcrumbs && breadcrumbs.length > 0 && !hasExplicitType('BreadcrumbList')) {
      list.push(generateBreadcrumbSchema(breadcrumbs));
    }

    // 4. Dynamic WebSite & Organization Schemas
    if (
      effectiveType === 'website' ||
      (!film && !article && effectiveType !== 'video.movie' && effectiveType !== 'article')
    ) {
      if (!hasExplicitType('WebSite')) {
        list.push(generateWebSiteSchema(DEFAULT_BASE_URL));
      }
      if (!hasExplicitType('Organization')) {
        list.push(generateOrganizationSchema(DEFAULT_BASE_URL));
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
    finalDescription,
    primaryImageUrl,
    finalUrl,
    metadata.keywords,
    effectivePublishedTime,
    effectiveModifiedTime,
    finalAuthor,
  ]);

  const filmDirector = (film?.director || metadata.filmDetails?.director || '').trim();
  const filmYear = film?.year || metadata.filmDetails?.year || null;
  const filmGenres = (metadata.filmDetails?.genres || film?.genres || []).filter((g): g is string => Boolean(g && typeof g === 'string'));
  const filmCast = (metadata.filmDetails?.cast || film?.castDetails?.map(c => c.name) || film?.cast || [])
    .filter((c): c is string => Boolean(c && typeof c === 'string'))
    .slice(0, 5);

  const cleanPublishedTime = (effectivePublishedTime || '').trim();
  const cleanModifiedTime = (effectiveModifiedTime || '').trim();
  const cleanAuthor = (finalAuthor || '').trim();
  const cleanSection = (effectiveSection || '').trim();
  const cleanTags = effectiveTags.filter((t): t is string => Boolean(t && typeof t === 'string'));
  const cleanTwitterCreator = (effectiveTwitterCreator || '').trim();
  const cleanSecondaryImageUrl = (secondaryImageUrl || '').trim();

  return (
    <Helmet>
      {/* Standard Meta Tags */}
      <title>{finalTitle || 'Sotoy Film'}</title>
      <meta name="description" content={finalDescription || ''} />
      <meta name="keywords" content={finalKeywords || ''} />
      <link rel="canonical" href={finalCanonical || finalUrl} />
      {robots ? (
        <meta name="robots" content={robots} />
      ) : effectiveNoindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : null}

      {/* Open Graph / Facebook / WhatsApp */}
      <meta property="og:site_name" content={metadata.openGraph['og:site_name'] || 'Sotoy Film'} />
      <meta property="og:title" content={finalTitle || 'Sotoy Film'} />
      <meta property="og:description" content={finalDescription || ''} />
      <meta property="og:url" content={finalUrl} />
      <meta property="og:type" content={effectiveType || 'website'} />
      <meta property="og:locale" content={metadata.openGraph['og:locale'] || 'id_ID'} />

      {/* Primary Dynamic Open Graph Image */}
      {primaryImageUrl ? <meta property="og:image" content={primaryImageUrl} /> : null}
      {primaryImageUrl ? <meta property="og:image:secure_url" content={primaryImageUrl} /> : null}
      {primaryImageUrl ? <meta property="og:image:type" content={primaryImageMime} /> : null}
      {primaryImageUrl ? <meta property="og:image:width" content={String(imageWidth)} /> : null}
      {primaryImageUrl ? <meta property="og:image:height" content={String(imageHeight)} /> : null}
      {primaryImageUrl ? <meta property="og:image:alt" content={finalImageAlt} /> : null}

      {/* Secondary Film Poster (if distinct from backdrop) */}
      {cleanSecondaryImageUrl ? <meta property="og:image" content={cleanSecondaryImageUrl} /> : null}
      {cleanSecondaryImageUrl ? <meta property="og:image:secure_url" content={cleanSecondaryImageUrl} /> : null}
      {cleanSecondaryImageUrl ? <meta property="og:image:type" content={getImageMimeType(cleanSecondaryImageUrl)} /> : null}
      {cleanSecondaryImageUrl ? <meta property="og:image:alt" content={`${film?.title || 'Film'} Poster Resmi`} /> : null}

      {/* Film Specific Open Graph Meta (video.movie) */}
      {filmDirector ? <meta property="video:director" content={filmDirector} /> : null}
      {filmYear ? <meta property="video:release_date" content={`${filmYear}-01-01`} /> : null}
      {filmDurationSeconds ? <meta property="video:duration" content={String(filmDurationSeconds)} /> : null}
      {filmGenres.map(genre => (
        <meta key={`video-genre-${genre}`} property="video:tag" content={genre} />
      ))}
      {filmCast.map(actor => (
        <meta key={`video-actor-${actor}`} property="video:actor" content={actor} />
      ))}

      {/* Article Specific Open Graph Meta */}
      {(article || effectiveType === 'article') && cleanPublishedTime ? (
        <meta property="article:published_time" content={cleanPublishedTime} />
      ) : null}
      {(article || effectiveType === 'article') && cleanModifiedTime ? (
        <meta property="article:modified_time" content={cleanModifiedTime} />
      ) : null}
      {(article || effectiveType === 'article') && cleanAuthor ? (
        <meta property="article:author" content={cleanAuthor} />
      ) : null}
      {(article || effectiveType === 'article') && cleanSection ? (
        <meta property="article:section" content={cleanSection} />
      ) : null}
      {(article || effectiveType === 'article')
        ? cleanTags.map(tag => (
            <meta key={`article-tag-${tag}`} property="article:tag" content={tag} />
          ))
        : null}

      {/* Twitter / X Social Cards */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:site" content={twitterSite} />
      {cleanTwitterCreator ? <meta name="twitter:creator" content={cleanTwitterCreator} /> : null}
      <meta name="twitter:title" content={finalTitle || 'Sotoy Film'} />
      <meta name="twitter:description" content={finalDescription || ''} />
      {primaryImageUrl ? <meta name="twitter:image" content={primaryImageUrl} /> : null}
      {primaryImageUrl ? <meta name="twitter:image:alt" content={finalImageAlt} /> : null}
      <meta
        name="twitter:domain"
        content={typeof window !== 'undefined' ? window.location.hostname : 'www.sotoyfilm.my.id'}
      />
      <meta name="twitter:url" content={finalUrl} />

      {/* Schema.org Structured Data (JSON-LD) */}
      {resolvedSchemas
        .filter(s => s && typeof s === 'object')
        .map((s, i) => (
          <script key={`schema-${s['@type'] || i}-${i}`} type="application/ld+json">
            {JSON.stringify(s)}
          </script>
        ))}
    </Helmet>
  );
};
