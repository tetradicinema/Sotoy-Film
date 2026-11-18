import { next } from '@vercel/edge';
import { isBotUserAgent, isSearchCrawlerUserAgent } from './src/lib/edge/botDetection.js';
import {
  fetchEntityDataResult,
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
import {
  buildPeopleListBodyHtml,
  buildPersonBodyHtml,
  buildPersonMeta,
  fetchPersonForSeo,
  fetchPopularPeopleForSeo,
} from './src/lib/edge/personMeta.js';
import {
  buildFranchiseBodyHtml,
  buildFranchiseMeta,
  fetchFranchiseForSeo,
  parseFranchiseRouteId,
} from './src/lib/edge/franchiseMeta.js';
import { buildRouteMetadata, STATIC_ROUTE_METADATA_CONFIG } from './src/utils/seoMetadata.js';
import { pickArticleIsoDate } from './src/lib/edge/isoDate.js';

// Re-export for unit tests and external consumers
export { isBotUserAgent, isSearchCrawlerUserAgent };

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
    '/person/:path*',
    '/franchise/:path*',
    '/people',
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

/** Static route whose crawler body is built from TMDB, not Firestore. */
const PEOPLE_ROUTE_PATH = '/people';

/**
 * Reads the leading numeric TMDB id from `/person/:idSlug`.
 * Re-implemented locally because `src/utils/personHelpers.ts` cannot be
 * imported into the middleware graph: its internal imports lack the ".js"
 * extension. Accepts `287`, `287-brad-pitt`; rejects anything without
 * leading digits.
 */
function parsePersonRouteId(param: string): number | null {
  if (typeof param !== 'string') return null;

  let value = param.trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    // keep the raw value when it contains malformed escapes
  }

  const match = /^(\d+)/.exec(value);
  if (!match) return null;

  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

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

/**
 * The immutable SPA shell is fetched at most once every 5 minutes per isolate.
 * Only successful origin responses are cached; the local fallback template is
 * never stored. An expired shell is served if a refresh fails.
 */
const BASE_HTML_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let baseHtmlCache: { html: string; timestamp: number } | null = null;

/** Test/maintenance helper: clears the in-memory bot response caches. */
export function clearBotResilienceCaches(): void {
  baseHtmlCache = null;
  entityResponseCache.clear();
}

/** Fetches the SPA shell from origin, falling back to the local template. */
async function fetchBaseHtml(request: Request): Promise<string> {
  const cached = baseHtmlCache;
  if (cached && Date.now() - cached.timestamp < BASE_HTML_CACHE_TTL_MS) {
    return cached.html;
  }

  try {
    const indexUrl = new URL('/index.html', request.url);
    const htmlRes = await fetchWithTimeout(
      indexUrl.toString(),
      { headers: { 'x-middleware-subrequest': '1' } },
      2000
    );
    if (htmlRes.ok) {
      const html = await htmlRes.text();
      if (html && html.trim()) {
        baseHtmlCache = { html, timestamp: Date.now() };
        return html;
      }
    }
  } catch {
    // Fall back to the cached shell (stale-if-error) or local template.
  }

  return cached ? cached.html : '';
}

/**
 * Resolved bot entity responses (meta fields plus the full document) keyed by
 * `collection:slug`. Capped and short-lived, and never used for errors or
 * missing slugs. An expired entry is kept as a stale-if-error fallback.
 */
const ENTITY_RESPONSE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const ENTITY_RESPONSE_MAX_STALE_MS = 6 * 60 * 60 * 1000; // 6 hours
const ENTITY_RESPONSE_CACHE_MAX_ENTRIES = 200;

interface CachedEntityResponse {
  data: Record<string, any>;
  timestamp: number;
}

const entityResponseCache = new Map<string, CachedEntityResponse>();

function writeEntityResponseCache(cacheKey: string, data: Record<string, any>): void {
  entityResponseCache.delete(cacheKey);
  entityResponseCache.set(cacheKey, { data, timestamp: Date.now() });
  while (entityResponseCache.size > ENTITY_RESPONSE_CACHE_MAX_ENTRIES) {
    const oldestKey = entityResponseCache.keys().next().value as string | undefined;
    if (oldestKey === undefined) break;
    entityResponseCache.delete(oldestKey);
  }
}

interface ResolvedBotEntity {
  status: 'ok' | 'not-found' | 'error';
  data: Record<string, any> | null;
  /** True when the data came from an expired cache entry (stale-if-error). */
  stale?: boolean;
}

/**
 * Resolves the entity for a bot request through the cached Firestore lookup,
 * enriching it with the full document when possible. A transient failure with
 * no cache returns `error`; a real missing slug returns `not-found`.
 */
async function resolveBotEntity(
  collection: 'films' | 'articles',
  slug: string
): Promise<ResolvedBotEntity> {
  const cacheKey = `${collection}:${slug}`;
  const cached = entityResponseCache.get(cacheKey) || null;
  const cachedAge = cached ? Date.now() - cached.timestamp : Infinity;
  if (cached && cachedAge < ENTITY_RESPONSE_CACHE_TTL_MS) {
    return { status: 'ok', data: cached.data };
  }

  // Expired responses are only a bounded stale-if-error fallback; beyond the
  // 6-hour ceiling they are dropped so the SPA shell is not fed old metadata.
  const stale = cached && cachedAge <= ENTITY_RESPONSE_MAX_STALE_MS ? cached : null;
  if (cached && cachedAge > ENTITY_RESPONSE_MAX_STALE_MS) {
    entityResponseCache.delete(cacheKey);
  }

  const result = await fetchEntityDataResult(collection, slug);

  if (result.status === 'not-found') {
    entityResponseCache.delete(cacheKey);
    return result;
  }

  if (result.status === 'error' || !result.data) {
    if (stale) return { status: 'ok', data: stale.data, stale: true };
    return { status: 'error', data: null };
  }

  // Keep full-document fields from the last good response when the follow-up
  // full read fails; the meta fields from the lookup still win.
  let data: Record<string, any> = stale
    ? { ...stale.data, ...result.data }
    : { ...result.data };

  const requestedDocId =
    typeof data.id === 'string' && data.id.trim() ? data.id.trim() : '';
  const docId = requestedDocId || getEntityDocumentId(data);
  if (docId) {
    const fullDoc = await fetchFullEntityDoc(collection, docId);
    if (fullDoc) {
      data = { ...data, ...fullDoc };
    }
  }

  // Re-check publication on the merged document: never expose a draft.
  if (collection === 'articles' && !isArticlePublished(data)) {
    entityResponseCache.delete(cacheKey);
    return { status: 'not-found', data: null };
  }

  // Serving stale data must not renew freshness, or an outage could pin the
  // response for another full TTL after Firestore recovers.
  if (result.stale) {
    return { status: 'ok', data, stale: true };
  }

  writeEntityResponseCache(cacheKey, data);
  return { status: 'ok', data };
}

/** 503 used only for search crawlers when Firestore is transiently unavailable. */
function serviceUnavailableResponse(): Response {
  return new Response('Service Unavailable', {
    status: 503,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'retry-after': '120',
      'cache-control': 'no-store',
    },
  });
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

  // /people: the crawler body lists the popular people as links to their
  // canonical /person/<id>-<slug> pages. A TMDB failure keeps the metadata-only
  // response instead of failing the request.
  if (cleanPath === PEOPLE_ROUTE_PATH) {
    const people = await fetchPopularPeopleForSeo();
    if (people.length > 0) {
      finalHtml = injectRootContent(finalHtml, buildPeopleListBodyHtml(people));
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

      // Fetch the base index.html from origin (5-minute shell cache).
      // Failures fall back to the local template, exactly like the
      // film/article path.
      let collectionBaseHtml = await fetchBaseHtml(request);
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

    // 3b. Person profiles (/person/:id-slug) are backed by TMDB, not Firestore.
    // Any failure (invalid id, missing key, timeout, TMDB 404, adult entry)
    // falls through so the SPA still renders normally.
    const personMatch = /^\/person\/([^/]+)\/?$/.exec(pathname);
    if (personMatch) {
      const personId = parsePersonRouteId(personMatch[1]);
      if (personId === null) {
        return safeNext();
      }

      const person = await fetchPersonForSeo(personId);
      if (!person) {
        return safeNext();
      }

      const personMeta = buildPersonMeta(person);

      let personBaseHtml = await fetchBaseHtml(request);
      if (!personBaseHtml) {
        personBaseHtml = FALLBACK_HTML_TEMPLATE;
      }

      const personMetaHtml = injectMetaTags(personBaseHtml, {
        title: personMeta.title,
        description: personMeta.description,
        image: personMeta.image,
        url: personMeta.canonicalUrl,
        type: personMeta.ogType,
        imageAlt: person.name,
        locale: 'id_ID',
        schemaJson: personMeta.schema,
      });

      const personHtml = injectRootContent(personMetaHtml, buildPersonBodyHtml(person));

      return new Response(personHtml, {
        status: 200,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'x-robots-tag': 'all',
          'cache-control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      });
    }

    // 3c. Franchise pages (/franchise/:id-slug) are backed by the TMDB
    // collection endpoint, not Firestore. Any failure (invalid id, missing
    // key, timeout, TMDB 404, zero usable parts) falls through so the SPA
    // still renders normally. Whether a franchise is too thin to index is
    // decided by the sitemap and the client noindex in FranchisePage.
    const franchiseMatch = /^\/franchise\/([^/]+)\/?$/.exec(pathname);
    if (franchiseMatch) {
      const franchiseId = parseFranchiseRouteId(franchiseMatch[1]);
      if (franchiseId === null) {
        return safeNext();
      }

      const franchise = await fetchFranchiseForSeo(franchiseId);
      if (!franchise) {
        return safeNext();
      }

      const franchiseMeta = buildFranchiseMeta(franchise);

      let franchiseBaseHtml = await fetchBaseHtml(request);
      if (!franchiseBaseHtml) {
        franchiseBaseHtml = FALLBACK_HTML_TEMPLATE;
      }

      const franchiseMetaHtml = injectMetaTags(franchiseBaseHtml, {
        title: franchiseMeta.title,
        description: franchiseMeta.description,
        image: franchiseMeta.image,
        url: franchiseMeta.canonicalUrl,
        type: franchiseMeta.ogType,
        imageAlt: franchise.name,
        locale: 'id_ID',
        schemaJson: franchiseMeta.schema,
      });

      const franchiseHtml = injectRootContent(
        franchiseMetaHtml,
        buildFranchiseBodyHtml(franchise)
      );

      return new Response(franchiseHtml, {
        status: 200,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'x-robots-tag': 'all',
          'cache-control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      });
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

    // 2. Resolve the entity through the cached lookup, which distinguishes a
    // real missing slug (pass through) from a transient Firestore failure.
    // Search crawlers get 503 + Retry-After on a transient failure with no
    // usable cache instead of the empty SPA shell; social crawlers keep the
    // existing pass-through behavior.
    const resolved = await resolveBotEntity(collection, slug);
    if (resolved.status === 'error') {
      if (isSearchCrawlerUserAgent(userAgent)) {
        return serviceUnavailableResponse();
      }
      return safeNext();
    }
    if (resolved.status === 'not-found' || !resolved.data) {
      return safeNext();
    }

    // The resolver has already merged the full document (when available) and
    // re-checked publication status on the merged result.
    const data = resolved.data;

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

    const publishedTime = collection === 'articles' ? pickArticleIsoDate(data, 'published') : undefined;
    const modifiedTime = collection === 'articles' ? pickArticleIsoDate(data, 'modified') : undefined;

    // 4. Fetch the base index.html from origin (5-minute shell cache)
    let baseHtml = await fetchBaseHtml(request);
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
      // Only emit aggregateRating with real vote evidence: legacy/imported
      // films were seeded with totalVotes: 1 while having no reviews, so a
      // single vote must never produce a fabricated ratingCount. This mirrors
      // the guard in src/utils/schemaHelpers.ts (no review docs on this path).
      aggregateRating: (data.totalVotes > 1 && data.skorSotoy > 0) ? {
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
      datePublished: publishedTime,
      dateModified: modifiedTime,
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

