import { next } from '@vercel/edge';
import { isBotUserAgent } from './src/lib/edge/botDetection.js';
import {
  fetchEntityData,
  fetchFullEntityDoc,
  getEntityDocumentId,
  isArticlePublished,
  fetchWithTimeout,
  fetchCollectionPreview,
  buildCollectionTitle,
  buildCollectionDescription,
  fetchListCollectionDocuments,
} from './src/lib/edge/firestoreRest.js';
import { injectMetaTags, injectRootContent, injectPrefetchData, injectSeoLists, buildArticleBodyHtml, buildFilmBodyHtml, FALLBACK_HTML_TEMPLATE } from './src/lib/edge/metaInjection.js';
import { buildRouteMetadata, STATIC_ROUTE_METADATA_CONFIG } from './src/utils/seoMetadata.js';

// Re-export for unit tests and external consumers
export { isBotUserAgent };

export const config = {
  runtime: 'nodejs',
  // NOTE: Vercel Routing Middleware's `config.matcher` only accepts strings
  // (path patterns); it does not support `has` header conditions. The
  // non-bot `safeNext()` below therefore runs before any expensive work.
  matcher: [
    '/',
    '/film-database',
    '/rekomendasi-film',
    '/film-recommendations',
    '/komunitas',
    '/community-feed',
    '/tulis-artikel',
    '/write-article',
    '/gabung-kritikus',
    '/gabung-penulis',
    '/tiket-bantuan',
    '/critic-submission',
    '/kriteria-kritikus',
    '/critic-criteria',
    '/search',
    '/tentang-kami',
    '/about-us',
    '/kebijakan-privasi',
    '/privacy-policy',
    '/syarat-ketentuan',
    '/terms-conditions',
    '/kontak-bisnis',
    '/business-inquiries',
    '/panduan-leaderboard',
    '/panduan',
    '/guide',
    '/faq',
    '/settings',
    '/onboarding',
    '/profil',
    '/profile',
    '/film/:path*',
    '/artikel/:path*',
    '/koleksi/:path*',
    '/kategori/:path*',
    '/category/:path*',
  ],
};

const LEGACY_CATEGORY_PATH = /^\/(?:kategori|category)\/(?:anime|animasi)(?=\/|$)/i;

/** Category routes whose metadata comes from seoMetadata.ts. */
const KNOWN_CATEGORY_NAMES = new Set([
  'movies',
  'series',
  'animation',
  'cinema-gear',
  'film-studies',
]);

/** Routes that receive the bot-only #seo-lists payload. */
const LIST_ROUTE_PATHS = new Set([
  '/',
  '/film-database',
  '/rekomendasi-film',
  '/film-recommendations',
  '/komunitas',
  '/community-feed',
]);

/** Every exact static route known to the central metadata config. */
const STATIC_ROUTE_PATHS = new Set(Object.keys(STATIC_ROUTE_METADATA_CONFIG));

interface StaticRouteInfo {
  isStatic: boolean;
  isList: boolean;
  cleanPath: string;
}

/**
 * Resolves static/list/category routes. Unknown category names are not
 * handled here, so they fall through to the normal SPA response unchanged.
 */
function resolveStaticRoute(pathname: string): StaticRouteInfo {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';

  const categoryMatch = /^\/(?:kategori|category)\/([^/]+)(?:\/[^/]+)?$/i.exec(cleanPath);
  if (categoryMatch) {
    const category = categoryMatch[1].toLowerCase();
    if (!KNOWN_CATEGORY_NAMES.has(category)) {
      return { isStatic: false, isList: false, cleanPath };
    }
    return { isStatic: true, isList: true, cleanPath };
  }

  if (!STATIC_ROUTE_PATHS.has(cleanPath)) {
    return { isStatic: false, isList: false, cleanPath };
  }

  return {
    isStatic: true,
    isList: LIST_ROUTE_PATHS.has(cleanPath),
    cleanPath,
  };
}

/** Fetches the SPA shell from origin, falling back to the local template. */
async function fetchBaseHtml(request: Request): Promise<string> {
  try {
    const indexUrl = new URL('/index.html', request.url);
    const htmlRes = await fetchWithTimeout(
      indexUrl.toString(),
      { headers: { 'x-middleware-subrequest': '1' } },
      2000
    );
    if (htmlRes.ok) {
      return await htmlRes.text();
    }
  } catch {
    // Fall back to the local template if the sub-request times out.
  }
  return '';
}

/**
 * Serves bots the real page metadata for static/list/category routes, plus the
 * list-card payload used to hydrate AppContext before the SDK connects.
 */
async function buildStaticRouteResponse(
  request: Request,
  cleanPath: string,
  isListRoute: boolean
): Promise<Response> {
  const metadata = buildRouteMetadata(cleanPath);

  let html = await fetchBaseHtml(request);
  if (!html) {
    html = FALLBACK_HTML_TEMPLATE;
  }

  const metaHtml = injectMetaTags(html, {
    title: metadata.title,
    description: metadata.description,
    image: metadata.primaryImage,
    url: metadata.canonicalUrl || metadata.url,
    type: metadata.type || 'website',
    imageAlt: metadata.imageAlt,
    locale: 'id_ID',
    keywords: metadata.keywords,
    robots: metadata.noindex ? 'noindex, follow' : undefined,
  });

  let finalHtml = metaHtml;

  if (isListRoute) {
    const [filmResult, articleResult] = await Promise.allSettled([
      fetchListCollectionDocuments('films'),
      fetchListCollectionDocuments('articles'),
    ]);

    const films = filmResult.status === 'fulfilled' ? filmResult.value : null;
    const articles = articleResult.status === 'fulfilled' ? articleResult.value : null;

    // One failed fetch still injects the other; both failing leaves the page
    // without a list payload instead of failing the request.
    if (films !== null || articles !== null) {
      finalHtml = injectSeoLists(finalHtml, {
        films: films || [],
        articles: articles || [],
      });
    }
  }

  return new Response(finalHtml, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'x-robots-tag': metadata.noindex ? 'noindex, follow' : 'all',
      'cache-control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}

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

    // 3. Static, list and category routes. The raw HTML gets the same title,
    // description, canonical, OpenGraph and Twitter tags that SEOHead renders
    // client-side, and list pages additionally receive #seo-lists.
    const staticRoute = resolveStaticRoute(pathname);
    if (staticRoute.isStatic) {
      return buildStaticRouteResponse(request, staticRoute.cleanPath, staticRoute.isList);
    }

    let collection: 'films' | 'articles' | null = null;
    let slug = '';
    /** Season sub-route of a film URL, when applicable. */
    let filmSubpath: { kind: 'seasons' } | { kind: 'season'; season: string } | null = null;

    if (pathname.startsWith('/film/')) {
      collection = 'films';
      const filmRest = pathname.replace(/^\/film\/?/, '').replace(/\/$/, '');
      const filmSegments = filmRest.split('/');

      if (filmSegments.length === 2 && filmSegments[1] === 'seasons') {
        filmSubpath = { kind: 'seasons' };
      } else if (
        filmSegments.length === 3 &&
        filmSegments[1] === 'season' &&
        /^\d+$/.test(filmSegments[2])
      ) {
        filmSubpath = { kind: 'season', season: filmSegments[2] };
      } else if (filmSegments.length > 1) {
        // Unknown film subpath: keep the normal SPA response untouched.
        return safeNext();
      }

      try {
        slug = decodeURIComponent(filmSubpath ? filmSegments[0] : filmRest);
      } catch {
        return safeNext();
      }
    } else if (pathname.startsWith('/artikel/')) {
      collection = 'articles';
      slug = decodeURIComponent(pathname.replace(/^\/artikel\/?/, '')).replace(/\/$/, '');
    }

    if (!collection || !slug) {
      return safeNext();
    }

    // 2. Fetch the entity data from Firestore REST API (with 3-way slug matching)
    let data = await fetchEntityData(collection, slug);
    if (!data) {
      // Fall through to normal SPA rather than returning an error
      return safeNext();
    }

    // 2b. The entity lookup only requests meta fields, so enrich it with the
    // full document. Crawler body content and the client prefetch payload need
    // content, contentJson, author, publishedAt, genres, cast, scores, etc.
    // If this extra read fails, keep the meta-fields-only data unchanged.
    const requestedDocId =
      typeof data.id === 'string' && data.id.trim() ? data.id.trim() : '';
    const docId = requestedDocId || getEntityDocumentId(data);
    if (docId) {
      const fullDoc = await fetchFullEntityDoc(collection, docId);
      if (fullDoc) {
        data = { ...data, ...fullDoc };
      }
    }

    // Publication status is re-checked on the merged document: the full read
    // must never expose a draft, trashed, or not-yet-due scheduled article.
    if (collection === 'articles' && !isArticlePublished(data)) {
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

      if (filmSubpath?.kind === 'seasons') {
        title = `${data.title || 'Film'}${data.year ? ` (${data.year})` : ''} – Semua Season`;
      } else if (filmSubpath?.kind === 'season') {
        title = `${data.title || 'Film'} – Season ${filmSubpath.season} – Daftar Episode & Rating`;
      }
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
        logo: { '@type': 'ImageObject', url: `${baseUrl}/sotoy-search-logo-v3-padded.png` },
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
      robots: filmSubpath ? 'noindex, follow' : undefined,
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
        'x-robots-tag': filmSubpath ? 'noindex, follow' : 'all',
        'cache-control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (err) {
    // Fail gracefully: log and pass request through
    console.error('[Middleware Error]', err);
    return safeNext();
  }
}

