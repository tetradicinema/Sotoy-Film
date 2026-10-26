import { next } from '@vercel/edge';
import { isBotUserAgent } from './src/lib/edge/botDetection.js';
import {
  fetchEntityData,
  fetchWithTimeout,
  fetchCollectionPreview,
  buildCollectionTitle,
  buildCollectionDescription,
} from './src/lib/edge/firestoreRest.js';
import { injectMetaTags, injectRootContent, injectPrefetchData, buildArticleBodyHtml, buildFilmBodyHtml, FALLBACK_HTML_TEMPLATE } from './src/lib/edge/metaInjection.js';

// Re-export for unit tests and external consumers
export { isBotUserAgent };

export const config = {
  runtime: 'nodejs',
  matcher: [
    '/film/:path*',
    '/artikel/:path*',
    '/koleksi/:path*',
    '/kategori/:path*',
    '/category/:path*',
  ],
};

const LEGACY_CATEGORY_PATH = /^\/(?:kategori|category)\/(?:anime|animasi)(?=\/|$)/i;

/**
 * Safely invokes Vercel next() with fallback to raw x-middleware-next header
 * if helper throws an unexpected runtime error.
 */
function safeNext(): Response {
  try {
    return next();
  } catch {
    return new Response(null, {
      headers: { 'x-middleware-next': '1' },
    });
  }
}

/**
 * Truncates text to about maxLength characters at a word boundary.
 */
function truncateDescription(desc: string, maxLength = 200): string {
  if (!desc || desc.length <= maxLength) return desc;
  const truncated = desc.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxLength - 40 && lastSpace > 0) {
    return truncated.slice(0, lastSpace) + '...';
  }
  return truncated + '...';
}

/**
 * Vercel Routing Middleware entrypoint (Node.js runtime).
 * Intercepts incoming requests from search engine bots and social media crawlers
 * to serve dynamically injected OpenGraph, Twitter, and Search Engine meta tags.
 */
export default async function middleware(request: Request): Promise<Response> {
  try {
    if (!request || !request.headers) {
      return safeNext();
    }

    const url = new URL(request.url);
    const pathname = url.pathname;

    // 0. Permanently redirect the legacy "anime"/"animasi" taxonomy URLs.
    // This runs for humans and crawlers alike so old links consolidate cleanly.
    if (LEGACY_CATEGORY_PATH.test(pathname)) {
      const suffix = pathname.replace(LEGACY_CATEGORY_PATH, '');
      return new Response(null, {
        status: 301,
        headers: {
          location: `/kategori/animation${suffix}${url.search}`,
        },
      });
    }

    const userAgent = request.headers.get('user-agent');

    // 1. Pass through immediately for normal human visitors with zero latency penalty
    if (!isBotUserAgent(userAgent)) {
      return safeNext();
    }

    // 2. Collection link previews (/koleksi/:userId/:collectionId).
    // Only public collections render preview HTML; anything else falls through.
    const collectionMatch = /^\/koleksi\/([^/]+)\/([^/]+)\/?$/.exec(pathname);
    if (collectionMatch) {
      let collectionUserId = '';
      let collectionId = '';
      try {
        collectionUserId = decodeURIComponent(collectionMatch[1]);
        collectionId = decodeURIComponent(collectionMatch[2]);
      } catch {
        return safeNext();
      }

      if (!collectionUserId || !collectionId) {
        return safeNext();
      }

      const preview = await fetchCollectionPreview(collectionUserId, collectionId);
      if (!preview) {
        return safeNext();
      }

      const collectionCanonicalUrl = `https://www.sotoyfilm.my.id/koleksi/${encodeURIComponent(collectionUserId)}/${encodeURIComponent(collectionId)}`;
      const collectionTitle = buildCollectionTitle(preview.name, preview.ownerName);
      const collectionDescription = truncateDescription(
        buildCollectionDescription(preview.description, preview.itemCount),
        200
      );
      const collectionImage = preview.image || 'https://www.sotoyfilm.my.id/og-default.png';

      // Fetch the base index.html from origin. Failures fall back to the
      // local template, exactly like the film/article path.
      let collectionBaseHtml = '';
      try {
        const indexUrl = new URL('/index.html', request.url);
        const htmlRes = await fetchWithTimeout(
          indexUrl.toString(),
          { headers: { 'x-middleware-subrequest': '1' } },
          2000
        );
        if (htmlRes.ok) {
          collectionBaseHtml = await htmlRes.text();
        }
      } catch {
        // Fall back to local template if sub-request times out
      }

      if (!collectionBaseHtml) {
        collectionBaseHtml = FALLBACK_HTML_TEMPLATE;
      }

      const collectionHtml = injectMetaTags(collectionBaseHtml, {
        title: collectionTitle,
        description: collectionDescription,
        image: collectionImage,
        url: collectionCanonicalUrl,
        type: 'website',
        imageAlt: preview.name || collectionTitle,
        locale: 'id_ID',
        twitterCard: 'summary_large_image',
        robots: 'noindex, follow',
      });

      return new Response(collectionHtml, {
        status: 200,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'x-robots-tag': 'noindex, follow',
          'cache-control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      });
    }

    let collection: 'films' | 'articles' | null = null;
    let slug = '';

    if (pathname.startsWith('/film/')) {
      collection = 'films';
      slug = decodeURIComponent(pathname.replace(/^\/film\/?/, '')).replace(/\/$/, '');
    } else if (pathname.startsWith('/artikel/')) {
      collection = 'articles';
      slug = decodeURIComponent(pathname.replace(/^\/artikel\/?/, '')).replace(/\/$/, '');
    }

    if (!collection || !slug) {
      return safeNext();
    }

    // 2. Fetch the entity data from Firestore REST API (with 3-way slug matching)
    const data = await fetchEntityData(collection, slug);
    if (!data) {
      // Fall through to normal SPA rather than returning an error
      return safeNext();
    }

    // 3. Prepare metadata based on collection type
    const baseUrl = 'https://www.sotoyfilm.my.id';
    const canonicalUrl = `${baseUrl}/${collection === 'films' ? 'film' : 'artikel'}/${encodeURIComponent(slug)}`;

    let title = 'Sotoy Film';
    let rawDescription = 'Platform komunitas & media pop-culture film, series, animation, dan ulasan Skor Sotoy.';
    let rawImage = '';
    const type = collection === 'films' ? 'video.movie' : 'article';

    if (collection === 'films') {
      title = `${data.title || 'Film'}${data.year ? ` (${data.year})` : ''} — Skor Sotoy & Review Film`;
      rawDescription = data.synopsis || data.curatorNote || `Lihat ulasan sinema, rating Skor Sotoy, dan tempat nonton film ${data.title}.`;
      rawImage = data.poster || data.backdrop || '';
    } else {
      title = `${data.seoTitle || data.title || 'Artikel'} — Sotoy Film`;
      rawDescription = data.metaDescription || data.excerpt || (typeof data.content === 'string' ? data.content.slice(0, 160) : rawDescription);
      rawImage = data.ogImage || data.coverImage || '';
    }

    // Robust image handling:
    // If it starts with "//" prefix https:, if it starts with "/" prefix https://www.sotoyfilm.my.id.
    // If it is a data: URI, empty, or not http(s), fall back to og-default.png
    let image = '';
    if (rawImage) {
      let trimmed = rawImage.trim();
      if (trimmed.startsWith('//')) {
        image = `https:${trimmed}`;
      } else if (trimmed.startsWith('/')) {
        image = `https://www.sotoyfilm.my.id${trimmed}`;
      } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        image = trimmed;
      }
    }

    if (!image || image.startsWith('data:') || (!image.startsWith('http://') && !image.startsWith('https://'))) {
      image = 'https://www.sotoyfilm.my.id/og-default.png';
    }

    // Truncate description to about 200 characters at word boundary
    const description = truncateDescription(rawDescription, 200);

    const publishedTime = collection === 'articles' ? data.publishedAt : undefined;

    // 4. Fetch the base index.html from origin
    let baseHtml = '';
    try {
      const indexUrl = new URL('/index.html', request.url);
      const htmlRes = await fetchWithTimeout(
        indexUrl.toString(),
        { headers: { 'x-middleware-subrequest': '1' } },
        2000
      );
      if (htmlRes.ok) {
        baseHtml = await htmlRes.text();
      }
    } catch {
      // Fall back to local template if sub-request times out
    }

    if (!baseHtml) {
      baseHtml = FALLBACK_HTML_TEMPLATE;
    }

    const schemaJson = collection === 'films' ? {
      '@context': 'https://schema.org',
      '@type': data.type === 'series' ? 'TVSeries' : 'Movie',
      name: data.title || title,
      alternateName: data.originalTitle || undefined,
      description,
      image: [image],
      datePublished: data.releaseDate || (data.year ? `${data.year}-01-01` : undefined),
      director: data.director ? { '@type': 'Person', name: data.director } : undefined,
      actor: (data.castDetails?.map((c: any) => ({ '@type': 'Person', name: c.name })) || data.cast?.map((name: string) => ({ '@type': 'Person', name }))),
      genre: data.genres,
      aggregateRating: (data.totalVotes > 0 && data.skorSotoy > 0) ? {
        '@type': 'AggregateRating',
        ratingValue: Number(Number(data.skorSotoy).toFixed(1)),
        bestRating: '10.0',
        worstRating: '1.0',
        ratingCount: Number(data.totalVotes),
      } : undefined,
    } : {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: data.seoTitle || data.title || title,
      description,
      image: [image],
      datePublished: data.publishedAt,
      dateModified: data.updatedAt || data.publishedAt,
      author: data.author?.name ? { '@type': 'Person', name: data.author.name } : undefined,
      publisher: {
        '@type': 'Organization',
        name: 'Sotoy Film',
        url: baseUrl,
        logo: { '@type': 'ImageObject', url: `${baseUrl}/stacked logo-sotoyfilm.PNG` },
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
    };

    // 5. Inject meta tags and a server-rendered body block, then return HTML
    const metaHtml = injectMetaTags(baseHtml, {
      title,
      description,
      image,
      url: canonicalUrl,
      type,
      imageAlt: data.title || title,
      locale: 'id_ID',
      publishedTime,
      videoDirector: collection === 'films' ? data.director : undefined,
      videoReleaseDate: collection === 'films' && data.year ? `${data.year}-01-01` : undefined,
      videoDuration: collection === 'films' ? data.duration : undefined,
      videoTags: collection === 'films' ? data.genres : undefined,
      videoActors: collection === 'films' && data.castDetails ? data.castDetails.map((c: any) => c.name) : data.cast,
      schemaJson,
    });

    const bodyHtml =
      collection === 'films' ? buildFilmBodyHtml(data) : buildArticleBodyHtml(data);
    const withRootContent = injectRootContent(metaHtml, bodyHtml);
    // Keep the crawler-visible block above, and also embed the same entity as
    // JSON so JS-rendering crawlers can mount the real detail page even when
    // Firestore Listen streams fail. The payload slug always matches the URL.
    const modifiedHtml = injectPrefetchData(
      withRootContent,
      collection === 'films' ? 'film' : 'article',
      { ...data, slug }
    );

    return new Response(modifiedHtml, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'x-robots-tag': 'all',
        'cache-control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (err) {
    // Fail gracefully: log and pass request through
    console.error('[Middleware Error]', err);
    return safeNext();
  }
}

