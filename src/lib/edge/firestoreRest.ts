/**
 * Edge-compatible Firestore REST client utilities.
 * Uses only standard Web Fetch and AbortController APIs (zero SDK/Node.js dependencies)
 * to keep Edge bundle size minimal (<20KB).
 */

import { slugify } from '../../utils/slugify.js';
import type { SeoListsPayload } from '../../utils/seoPrefetch.js';
import firebaseConfig from '../../../firebase-applet-config.json' with { type: 'json' };

const envApiKey = typeof process !== 'undefined' && process.env ? process.env.VITE_FIREBASE_API_KEY : undefined;
const configApiKey = (firebaseConfig as any)?.apiKey;

const resolvedApiKey = envApiKey || configApiKey;
if (!resolvedApiKey) {
  throw new Error(
    'Firebase API Key is missing. Please set VITE_FIREBASE_API_KEY or configure apiKey in firebase-applet-config.json.'
  );
}

export const FIRESTORE_API_KEY = resolvedApiKey;

export const FIRESTORE_DOCUMENTS_URL =
  'https://firestore.googleapis.com/v1/projects/gen-lang-client-0523736875/databases/ai-studio-sotoyfilm-256095db-0c8b-47c2-a6bf-e7c4f8d7cfd3/documents';

/**
 * Parses raw Firestore REST API document fields into a plain JavaScript object.
 */
export function parseFirestoreFields(doc: any): Record<string, any> {
  if (!doc || !doc.fields) return {};
  const result: Record<string, any> = {};
  for (const [key, valueObj] of Object.entries(doc.fields as Record<string, any>)) {
    if ('stringValue' in valueObj) {
      result[key] = valueObj.stringValue;
    } else if ('integerValue' in valueObj) {
      result[key] = parseInt(valueObj.integerValue, 10);
    } else if ('doubleValue' in valueObj) {
      result[key] = parseFloat(valueObj.doubleValue);
    } else if ('booleanValue' in valueObj) {
      result[key] = valueObj.booleanValue;
    } else if ('arrayValue' in valueObj) {
      result[key] = (valueObj.arrayValue?.values || []).map((v: any) => {
        if ('stringValue' in v) return v.stringValue;
        if ('mapValue' in v) return parseFirestoreFields(v.mapValue);
        return v;
      });
    } else if ('mapValue' in valueObj) {
      result[key] = parseFirestoreFields(valueObj.mapValue);
    }
  }
  return result;
}

/**
 * Robust fetch helper with timeout using AbortController (safe for Edge Runtime).
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 2500
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fields needed to build rich OpenGraph, Twitter, and Search Engine meta tags.
 */
const META_FIELD_PATHS = [
  'title',
  'originalTitle',
  'slug',
  'id',
  'year',
  'poster',
  'backdrop',
  'synopsis',
  'curatorNote',
  'director',
  'seoTitle',
  'metaDescription',
  'excerpt',
  'coverImage',
  'ogImage',
  'type',
  'status',
  'scheduledAt',
];

/**
 * Module-level short-TTL cache for raw collection fetches (films & articles).
 * Reused for 5 minutes before re-fetching, deduplicating bursts of crawls
 * against the same edge worker.
 */
const COLLECTION_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CachedCollection {
  docs: any[];
  timestamp: number;
}

const collectionCache: Record<'films' | 'articles', CachedCollection | null> = {
  films: null,
  articles: null,
};

/**
 * Stale-if-error ceiling shared by the entity, collection-scan, and raw
 * collection caches. Data older than this is never served as stale; the lookup
 * surfaces a transient error instead. Serving stale data also never renews the
 * cached timestamp.
 */
const MAX_STALE_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours

/** Only 5xx, 408 and 429 are transient; other 4xx are real negatives. */
function isTransientHttpStatus(status: number): boolean {
  return status >= 500 || status === 408 || status === 429;
}

/**
 * Checks if an article entity is published according to status and scheduledAt rules.
 */
export function isArticlePublished(data: Record<string, any>): boolean {
  if (!data) return false;
  const status = data.status;
  if (status === 'draft' || status === 'trash') {
    return false;
  }
  if (status === 'scheduled') {
    if (!data.scheduledAt) return false;
    const scheduledTime = new Date(data.scheduledAt).getTime();
    if (isNaN(scheduledTime) || scheduledTime > Date.now()) {
      return false;
    }
  }
  return true;
}

/* -------------------------------------------------------------------------- */
/* List-page payloads (bot-only seo-lists script)                              */
/* -------------------------------------------------------------------------- */

/**
 * Fields needed by list cards on the homepage, film database, recommendations,
 * community feed and category pages. Content, comments, emails and tokens are
 * intentionally absent so they can never reach the injected JSON.
 */
export const LIST_FILM_FIELD_PATHS = [
  'id',
  'slug',
  'title',
  'originalTitle',
  'type',
  'year',
  'poster',
  'backdrop',
  'director',
  'duration',
  'releaseDate',
  'idReleaseDate',
  'genres',
  'cast',
  'tags',
  'originCountry',
  'whereToWatch',
  'skorSotoy',
  'criticsSkorSotoy',
  'totalVotes',
  'scoreScale',
  'trendingRank',
  'featuredRecommendation',
  'createdAt',
  'updatedAt',
  'status',
];

export const LIST_ARTICLE_FIELD_PATHS = [
  'id',
  'slug',
  'title',
  'excerpt',
  'coverImage',
  'coverImageAlt',
  'category',
  'subCategory',
  'authorId',
  'author',
  'publishedAt',
  'publishedAtTimestamp',
  'readTime',
  'views',
  'likes',
  'commentsCount',
  'skorSotoy',
  'tags',
  'status',
  'scheduledAt',
  'updatedAt',
  'seoTitle',
  'metaDescription',
  'ogImage',
];

const SEO_LIST_CACHE_TTL_MS = 60 * 1000; // 60 seconds
const SEO_LIST_PAGE_SIZE = 300;
const SEO_LIST_ARTICLE_LIMIT = 50;
const SEO_LIST_FILM_MAX_PAGES = 3;

/**
 * True when the bot-only #seo-lists payload already hydrated the matching list.
 * Refresh routines must then keep the loading flag false: flipping it back to
 * true would replace already-rendered cards with skeletons while Googlebot's
 * getDocs call never resolves. Human visitors have no payload, so this stays
 * false for them and their behaviour is unchanged.
 */
export function shouldSkipLoadingFlag(
  lists: SeoListsPayload | null,
  collection: 'articles' | 'films'
): boolean {
  if (!lists) return false;
  const docs = lists[collection];
  return Array.isArray(docs) && docs.length > 0;
}

/**
 * True only when the bot-only #seo-lists payload hydrated `kind` and the
 * Firestore SDK returned no documents for it. Google's renderer can resolve
 * the SDK query with an empty snapshot even though the crawler HTML already
 * carries the list; applying that empty result would wipe the hydrated cards.
 * Normal visitors have no payload, so this stays false for them.
 */
export function shouldKeepSeoList(
  lists: SeoListsPayload | null,
  kind: 'films' | 'articles',
  fetchedCount: number
): boolean {
  if (!lists) return false;
  const docs = lists[kind];
  return Array.isArray(docs) && docs.length > 0 && fetchedCount === 0;
}

interface CachedSeoList {
  docs: any[];
  timestamp: number;
}

const seoListCache: Record<'films' | 'articles', CachedSeoList | null> = {
  films: null,
  articles: null,
};

/** Test/maintenance helper: clears the short-lived list payload cache. */
export function clearSeoListsCache(): void {
  seoListCache.films = null;
  seoListCache.articles = null;
}

function getListArticleTime(data: Record<string, any>): number {
  for (const field of ['publishedAtTimestamp', 'scheduledAt', 'publishedAt', 'updatedAt', 'createdAt']) {
    const raw = data[field];
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const parsed = new Date(raw).getTime();
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
}

/**
 * Fetches list-card documents with a projected field mask limited to the
 * fields used by list cards.
 *
 * Uses POST :runQuery because unauthenticated GET /documents/{collection}
 * list calls are rejected by Firestore REST with 403 in production. Films are
 * paged with offset 0, 300 and 600 (at most 3 requests), continuing only when
 * the previous page returned a full page; articles stay on one request, are
 * filtered to published items, sorted newest first and capped at 50.
 *
 * A failed first request returns null so callers can distinguish "fetch
 * failed" from "collection is empty". A failed later film request returns the
 * documents already collected. Successful responses are cached in memory for
 * 60 seconds.
 *
 * If an OK response is not a runQuery result array (for example a fronting
 * proxy that only speaks the legacy list envelope), the field-masked list
 * endpoint is tried once as a compatibility fallback.
 */
export async function fetchListCollectionDocuments(
  collection: 'films' | 'articles'
): Promise<any[] | null> {
  const cached = seoListCache[collection];
  if (cached && Date.now() - cached.timestamp < SEO_LIST_CACHE_TTL_MS) {
    return cached.docs;
  }

  const fieldPaths =
    collection === 'films' ? LIST_FILM_FIELD_PATHS : LIST_ARTICLE_FIELD_PATHS;
  const maxPages = collection === 'films' ? SEO_LIST_FILM_MAX_PAGES : 1;
  const endpoint = `${FIRESTORE_DOCUMENTS_URL}:runQuery?key=${FIRESTORE_API_KEY}`;

  const collected: any[] = [];
  let firstPageSucceeded = false;
  let needsLegacyListFallback = false;

  const appendRawDocuments = (rawDocuments: any[]): void => {
    collected.push(
      ...rawDocuments
        .map((raw: any) => {
          const parsed = parseFirestoreFields(raw);
          if (!parsed.id && typeof raw?.name === 'string') {
            const docId = raw.name.split('/').pop();
            if (docId) parsed.id = docId;
          }
          return parsed;
        })
        .filter(
          (doc: Record<string, any>) =>
            doc && typeof doc === 'object' && Object.keys(doc).length > 0
        )
    );
  };

  try {
    for (let page = 0; page < maxPages; page++) {
      const offset = page * SEO_LIST_PAGE_SIZE;

      let res: Response;
      try {
        res = await fetchWithTimeout(
          endpoint,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              structuredQuery: {
                from: [{ collectionId: collection }],
                select: {
                  fields: fieldPaths.map(fieldPath => ({ fieldPath })),
                },
                offset,
                limit: SEO_LIST_PAGE_SIZE,
              },
            }),
          },
          2500
        );
      } catch {
        break;
      }

      if (!res.ok) {
        console.warn(
          `[Edge Firestore] List query failed for ${collection} (status ${res.status})`
        );
        break;
      }

      let results: any;
      try {
        results = await res.json();
      } catch {
        break;
      }

      if (!Array.isArray(results)) {
        // An OK response that is not a runQuery result array means this
        // deployment is fronted by a legacy list responder. Real Firestore
        // always answers :runQuery with an array, so this only matters for
        // compatibility; retry through the list endpoint below.
        needsLegacyListFallback = true;
        break;
      }

      const pageDocuments = results
        .filter((entry: any) => entry && entry.document)
        .map((entry: any) => entry.document);

      firstPageSucceeded = true;
      appendRawDocuments(pageDocuments);

      if (pageDocuments.length < SEO_LIST_PAGE_SIZE) break;
    }

    if (!firstPageSucceeded && needsLegacyListFallback) {
      const maskParams = fieldPaths
        .map(fieldPath => `mask.fieldPaths=${encodeURIComponent(fieldPath)}`)
        .join('&');
      const baseEndpoint = `${FIRESTORE_DOCUMENTS_URL}/${collection}?pageSize=${SEO_LIST_PAGE_SIZE}&key=${FIRESTORE_API_KEY}&${maskParams}`;

      let legacyPageToken: string | undefined;
      for (let page = 0; page < maxPages; page++) {
        const legacyEndpoint = legacyPageToken
          ? `${baseEndpoint}&pageToken=${encodeURIComponent(legacyPageToken)}`
          : baseEndpoint;

        let legacyRes: Response;
        try {
          legacyRes = await fetchWithTimeout(
            legacyEndpoint,
            { headers: { Accept: 'application/json' } },
            2500
          );
        } catch {
          break;
        }

        if (!legacyRes.ok) {
          console.warn(
            `[Edge Firestore] List fetch failed for ${collection} (status ${legacyRes.status})`
          );
          break;
        }

        let payload: any;
        try {
          payload = await legacyRes.json();
        } catch {
          break;
        }
        if (!Array.isArray(payload?.documents)) break;

        firstPageSucceeded = true;
        appendRawDocuments(payload.documents);

        if (payload.documents.length < SEO_LIST_PAGE_SIZE) break;

        legacyPageToken =
          typeof payload.nextPageToken === 'string' && payload.nextPageToken
            ? payload.nextPageToken
            : undefined;
        if (!legacyPageToken) break;
      }
    }
  } catch {
    // Fall through: a failed first page still reports null, a later page
    // failure keeps the documents already collected.
  }

  if (!firstPageSucceeded) return null;

  let docs = collected;
  if (collection === 'articles') {
    docs = docs
      .filter((doc: Record<string, any>) => isArticlePublished(doc))
      .sort(
        (a: Record<string, any>, b: Record<string, any>) =>
          getListArticleTime(b) - getListArticleTime(a)
      )
      .slice(0, SEO_LIST_ARTICLE_LIMIT);
  } else {
    docs = docs.slice(0, SEO_LIST_PAGE_SIZE * SEO_LIST_FILM_MAX_PAGES);
  }

  seoListCache[collection] = { docs, timestamp: Date.now() };
  return docs;
}

interface CollectionFetchResult {
  docs: any[];
  /** False only when every strategy failed; an empty successful fetch is true. */
  ok: boolean;
  /** True when the docs came from an expired cache entry served as a fallback. */
  stale?: boolean;
}

/**
 * The collection scan fallback is the most expensive lookup, so an isolate
 * keeps the scanned list for 5 minutes and lets only one scan per collection
 * run at a time. Concurrent crawler requests await the same promise instead of
 * stampeding Firestore.
 */
const SCAN_CACHE_TTL_MS = 5 * 60 * 1000;
interface CachedScan {
  docs: any[];
  timestamp: number;
}
const scanCache: Record<'films' | 'articles', CachedScan | null> = {
  films: null,
  articles: null,
};
const scanInFlight: Partial<Record<'films' | 'articles', Promise<CollectionFetchResult>>> = {};

async function scanCollectionCached(
  collection: 'films' | 'articles'
): Promise<CollectionFetchResult> {
  const cached = scanCache[collection];
  const cachedAge = cached ? Date.now() - cached.timestamp : Infinity;
  if (cached && cachedAge < SCAN_CACHE_TTL_MS) {
    return { docs: cached.docs, ok: true };
  }

  // Expired scan data is only a bounded stale-if-error fallback. Beyond the
  // ceiling it is discarded so an old collection can never masquerade as the
  // current one.
  const stale = cached && cachedAge <= MAX_STALE_AGE_MS ? cached : null;
  if (cached && cachedAge > MAX_STALE_AGE_MS) {
    scanCache[collection] = null;
  }

  const inFlight = scanInFlight[collection];
  if (inFlight) return inFlight;

  const task = (async (): Promise<CollectionFetchResult> => {
    try {
      const result = await fetchCollectionDocumentsResult(collection);
      if (result.ok) {
        // A stale collection read is passed through but never promoted to a
        // fresh scan entry: that would renew the stale data's freshness.
        if (!result.stale) {
          scanCache[collection] = { docs: result.docs, timestamp: Date.now() };
        }
        return result;
      }
      if (stale) {
        // Bounded stale-if-error: keep serving the last successful scan rather
        // than treating a transient outage as a missing slug.
        return { docs: stale.docs, ok: true, stale: true };
      }
      return result;
    } finally {
      delete scanInFlight[collection];
    }
  })();

  scanInFlight[collection] = task;
  return task;
}

/**
 * Fetches all documents in a collection via Firestore REST API, requesting only
 * fields needed for meta tags. This variant also reports whether the fetch
 * actually succeeded, so callers can tell "empty collection" from "Firestore
 * unavailable". Supports paginated GET /documents/{collection} and POST
 * /documents:runQuery fallback.
 */
async function fetchCollectionDocumentsResult(
  collection: 'films' | 'articles'
): Promise<CollectionFetchResult> {
  const cached = collectionCache[collection];
  const now = Date.now();
  if (cached && now - cached.timestamp < COLLECTION_CACHE_TTL_MS && cached.docs.length > 0) {
    return { docs: cached.docs, ok: true };
  }

  let succeeded = false;

  // Strategy A: Paginated GET .../documents/{collection} with mask.fieldPaths
  try {
    const allDocs: any[] = [];
    let pageToken: string | undefined = undefined;
    let pageCount = 0;

    do {
      pageCount++;
      const maskParams = META_FIELD_PATHS.map(f => `mask.fieldPaths=${encodeURIComponent(f)}`).join('&');
      let endpoint = `${FIRESTORE_DOCUMENTS_URL}/${collection}?pageSize=300&key=${FIRESTORE_API_KEY}&${maskParams}`;
      if (pageToken) {
        endpoint += `&pageToken=${encodeURIComponent(pageToken)}`;
      }

      const res = await fetchWithTimeout(endpoint, { headers: { Accept: 'application/json' } }, 2500);
      if (!res.ok) {
        // If GET endpoint returns non-200, break out to runQuery
        break;
      }

      const data = await res.json();
      if (Array.isArray(data.documents)) {
        succeeded = true;
        allDocs.push(...data.documents);
      }
      pageToken = data.nextPageToken;
    } while (pageToken && pageCount < 5);

    let finalDocs = allDocs;
    if (collection === 'articles') {
      finalDocs = allDocs.filter(doc => {
        const parsed = parseFirestoreFields(doc);
        return isArticlePublished(parsed);
      });
    }

    if (finalDocs.length > 0) {
      collectionCache[collection] = { docs: finalDocs, timestamp: Date.now() };
      return { docs: finalDocs, ok: true };
    }
  } catch {
    // Proceed to runQuery fallback
  }

  // Strategy B: POST .../documents:runQuery with projected select fields
  try {
    const queryRes = await fetchWithTimeout(
      `${FIRESTORE_DOCUMENTS_URL}:runQuery?key=${FIRESTORE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: collection }],
            select: {
              fields: META_FIELD_PATHS.map(fieldPath => ({ fieldPath })),
            },
            limit: 300,
          },
        }),
      },
      2500
    );

    let results: any = null;
    try {
      results = await queryRes.json();
    } catch {
      // ignore
    }

    if (queryRes.ok && Array.isArray(results)) {
      succeeded = true;
      let docs = results
        .filter((r: any) => r && r.document)
        .map((r: any) => r.document);

      if (collection === 'articles') {
        docs = docs.filter(doc => {
          const parsed = parseFirestoreFields(doc);
          return isArticlePublished(parsed);
        });
      }

      if (docs.length > 0) {
        collectionCache[collection] = { docs, timestamp: Date.now() };
        return { docs, ok: true };
      }
    }
  } catch (err) {
    console.error('[Edge Firestore] Collection fetch error:', err);
  }

  if (cached && cached.docs.length > 0 && now - cached.timestamp <= MAX_STALE_AGE_MS) {
    // Bounded stale-if-error: expired successful data beats an empty result,
    // but it is never treated as fresh again.
    return { docs: cached.docs, ok: true, stale: true };
  }

  return { docs: [], ok: succeeded };
}

export async function fetchCollectionDocuments(
  collection: 'films' | 'articles'
): Promise<any[]> {
  const result = await fetchCollectionDocumentsResult(collection);
  return result.docs;
}

/**
 * Module-level negative cache for slugs that were not found (30-minute TTL).
 * Prevents repeated crawls of unknown or nonexistent URLs from triggering expensive collection scans.
 */
const NEGATIVE_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const UNPUBLISHED_NEGATIVE_TTL_MS = 60 * 1000; // 60 seconds
const negativeCache = new Map<string, number>();

/**
 * Internal non-enumerable property used to remember which Firestore document
 * produced a parsed entity. It is deliberately non-enumerable so it never
 * leaks into prefetch payloads, JSON serialisation, or `{ ...data }` merges.
 */
const DOC_ID_PROPERTY = '__docId';

function attachDocumentId(
  parsed: Record<string, any>,
  docId: string | undefined
): Record<string, any> {
  if (docId) {
    Object.defineProperty(parsed, DOC_ID_PROPERTY, {
      value: docId,
      enumerable: false,
      configurable: true,
    });
  }
  return parsed;
}

/**
 * Returns the Firestore document id that produced an entity from fetchEntityData().
 * Empty when the id could not be determined.
 */
export function getEntityDocumentId(data: Record<string, any> | null | undefined): string {
  if (!data || typeof data !== 'object') return '';
  const docId = (data as Record<string, any>)[DOC_ID_PROPERTY];
  return typeof docId === 'string' ? docId.trim() : '';
}

/**
 * Module-level cache for successfully resolved entity meta data, keyed by
 * `collection:slug`. Expired entries are kept so a failed refresh can serve
 * the last good value instead of the SPA shell. Errors and empty lookups are
 * never cached here.
 */
const ENTITY_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const ENTITY_CACHE_MAX_ENTRIES = 200;

interface CachedEntity {
  data: Record<string, any>;
  timestamp: number;
}

const entityCache = new Map<string, CachedEntity>();

function writeCachedEntity(cacheKey: string, data: Record<string, any>): void {
  // Delete first so the Map's insertion order tracks recency for eviction.
  entityCache.delete(cacheKey);
  entityCache.set(cacheKey, { data, timestamp: Date.now() });
  while (entityCache.size > ENTITY_CACHE_MAX_ENTRIES) {
    const oldestKey = entityCache.keys().next().value as string | undefined;
    if (oldestKey === undefined) break;
    entityCache.delete(oldestKey);
  }
}

export type EntityLookupStatus = 'ok' | 'not-found' | 'error';

export interface EntityLookupResult {
  status: EntityLookupStatus;
  data: Record<string, any> | null;
  /** True when data came from an expired cache entry served as a fallback. */
  stale?: boolean;
}

function buildEntityLookupResult(
  parsed: Record<string, any>,
  collection: 'films' | 'articles',
  cacheKey: string,
  docId: string | undefined,
  now: number,
  stale = false
): EntityLookupResult {
  if (collection === 'articles' && !isArticlePublished(parsed)) {
    negativeCache.set(cacheKey, now + UNPUBLISHED_NEGATIVE_TTL_MS);
    entityCache.delete(cacheKey);
    return { status: 'not-found', data: null };
  }

  negativeCache.delete(cacheKey);
  const data = attachDocumentId(parsed, docId);
  if (stale) {
    // Serving an expired entry must never renew its freshness.
    return { status: 'ok', data, stale: true };
  }
  writeCachedEntity(cacheKey, data);
  return { status: 'ok', data };
}

/**
 * Resolves an entity and distinguishes all three outcomes the middleware needs:
 * - ok: a real document (possibly served from the 10-minute cache)
 * - not-found: the lookup completed and the slug really does not exist
 * - error: a transient outage (5xx, 408, 429, timeout or network failure) with
 *   no usable cache entry (the middleware can then answer crawlers with 503).
 *   Other 4xx responses mean "this step could not answer" and fall through to
 *   the next lookup step instead.
 *
 * Lookup order: targeted runQuery first; direct document GET only when the
 * query was OK-but-empty; the collection scan only when both are empty.
 */
export async function fetchEntityDataResult(
  collection: 'films' | 'articles',
  slug: string
): Promise<EntityLookupResult> {
  const cacheKey = `${collection}:${slug}`;
  const now = Date.now();

  const cachedEntity = entityCache.get(cacheKey) || null;
  const cachedAge = cachedEntity ? now - cachedEntity.timestamp : Infinity;
  if (cachedEntity && cachedAge < ENTITY_CACHE_TTL_MS) {
    return { status: 'ok', data: cachedEntity.data };
  }

  // Expired entries may only be served as a fallback up to the shared 6-hour
  // ceiling. Older data is discarded rather than resurrected indefinitely.
  const staleEntity = cachedEntity && cachedAge <= MAX_STALE_AGE_MS ? cachedEntity : null;
  if (cachedEntity && cachedAge > MAX_STALE_AGE_MS) {
    entityCache.delete(cacheKey);
  }

  // Negative cache check: skip immediately if recently proven not to exist.
  const expiresAt = negativeCache.get(cacheKey);
  if (expiresAt) {
    if (now < expiresAt) {
      return { status: 'not-found', data: null };
    }
    negativeCache.delete(cacheKey);
  }

  const serveStaleOrError = (): EntityLookupResult => {
    if (staleEntity) {
      return { status: 'ok', data: staleEntity.data, stale: true };
    }
    return { status: 'error', data: null };
  };

  // 1. Fast targeted query: runQuery with where slug == X and limit 1 (1 read).
  // A non-array OK body is treated as empty (and falls through to the direct
  // GET), matching the old compatibility behavior.
  try {
    const queryRes = await fetchWithTimeout(
      `${FIRESTORE_DOCUMENTS_URL}:runQuery?key=${FIRESTORE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: collection }],
            where: {
              fieldFilter: {
                field: { fieldPath: 'slug' },
                op: 'EQUAL',
                value: { stringValue: slug },
              },
            },
            select: {
              fields: META_FIELD_PATHS.map((fieldPath) => ({ fieldPath })),
            },
            limit: 1,
          },
        }),
      },
      2000
    );

    if (!queryRes.ok) {
      // Only a real outage is transient. A 4xx (bad request, auth, forbidden)
      // means this step could not answer, so the next lookup step still runs.
      if (isTransientHttpStatus(queryRes.status)) {
        return serveStaleOrError();
      }
    } else {
      let queryResults: any = null;
      try {
        queryResults = await queryRes.json();
      } catch {
        queryResults = null;
      }

      if (Array.isArray(queryResults)) {
        const matchedDoc = queryResults.find((r: any) => r && r.document)?.document;
        if (matchedDoc) {
          const parsed = parseFirestoreFields(matchedDoc);
          if (parsed && Object.keys(parsed).length > 0) {
            const docId =
              typeof matchedDoc.name === 'string'
                ? matchedDoc.name.split('/').pop()
                : undefined;
            return buildEntityLookupResult(
              parsed,
              collection,
              cacheKey,
              docId || slug,
              now
            );
          }
        }
      }
    }
  } catch (queryErr) {
    console.warn('[Edge Firestore] runQuery targeted search fallback notice:', queryErr);
    return serveStaleOrError();
  }

  // 2. Direct document GET only after the query returned OK-but-empty.
  try {
    const directRes = await fetchWithTimeout(
      `${FIRESTORE_DOCUMENTS_URL}/${collection}/${encodeURIComponent(slug)}?key=${FIRESTORE_API_KEY}`,
      { headers: { Accept: 'application/json' } },
      1500
    );
    if (directRes.ok) {
      const doc = await directRes.json();
      const parsed = parseFirestoreFields(doc);
      if (parsed && Object.keys(parsed).length > 0) {
        const docId =
          typeof doc?.name === 'string' ? doc.name.split('/').pop() : undefined;
        return buildEntityLookupResult(
          parsed,
          collection,
          cacheKey,
          docId || slug,
          now
        );
      }
    } else if (isTransientHttpStatus(directRes.status)) {
      // 5xx, 408 and 429 mean Firestore is unavailable.
      return serveStaleOrError();
    }
    // Any other 4xx (400/401/403/404/...) is a real negative for the direct
    // GET step; continue to the collection scan instead of failing the lookup.
  } catch {
    // Network / timeout / DNS failures are transient.
    return serveStaleOrError();
  }

  // 3. Collection scan fallback only when both targeted lookups were empty.
  try {
    const scan = await scanCollectionCached(collection);
    if (!scan.ok) {
      return serveStaleOrError();
    }
    for (const doc of scan.docs) {
      const parsed = parseFirestoreFields(doc);
      const docId = doc.name ? doc.name.split('/').pop() : '';

      const isMatch =
        (parsed.slug && parsed.slug === slug) ||
        (parsed.title && slugify(parsed.title) === slug) ||
        (parsed.seoTitle && slugify(parsed.seoTitle) === slug) ||
        parsed.id === slug ||
        docId === slug;

      if (isMatch) {
        return buildEntityLookupResult(
          parsed,
          collection,
          cacheKey,
          docId || slug,
          now,
          scan.stale === true
        );
      }
    }
  } catch (err) {
    console.error('[Edge Firestore] Entity lookup error:', err);
    return serveStaleOrError();
  }

  // 4. Confirmed missing: keep the existing negative-cache behavior.
  negativeCache.set(cacheKey, now + NEGATIVE_CACHE_TTL_MS);
  entityCache.delete(cacheKey);
  return { status: 'not-found', data: null };
}

/**
 * Backwards-compatible helper used outside the middleware: returns the entity
 * data for an ok lookup and null for both not-found and transient errors.
 */
export async function fetchEntityData(
  collection: 'films' | 'articles',
  slug: string
): Promise<Record<string, any> | null> {
  const result = await fetchEntityDataResult(collection, slug);
  return result.status === 'ok' ? result.data : null;
}

/** Test/maintenance helper: clears entity, scan, collection and negative caches. */
export function clearEntityResilienceCaches(): void {
  entityCache.clear();
  negativeCache.clear();
  scanCache.films = null;
  scanCache.articles = null;
  collectionCache.films = null;
  collectionCache.articles = null;
}

/**
 * Fetches a complete Firestore document (no field mask) for crawler body
 * rendering and the prefetch payload. Returns null on any failure so callers
 * can keep the meta-fields-only data.
 */
export async function fetchFullEntityDoc(
  collection: 'films' | 'articles',
  docId: string
): Promise<Record<string, any> | null> {
  const safeDocId = typeof docId === 'string' ? docId.trim() : '';
  if (!safeDocId) return null;

  try {
    const res = await fetchWithTimeout(
      `${FIRESTORE_DOCUMENTS_URL}/${collection}/${encodeURIComponent(safeDocId)}?key=${FIRESTORE_API_KEY}`,
      { headers: { Accept: 'application/json' } },
      2000
    );
    if (!res.ok) return null;

    const parsed = parseFirestoreFields(await res.json());
    if (!parsed || Object.keys(parsed).length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Collection link previews (/koleksi/:userId/:collectionId)                  */
/* -------------------------------------------------------------------------- */

const SITE_BASE_URL = 'https://www.sotoyfilm.my.id';
export const DEFAULT_OG_IMAGE = `${SITE_BASE_URL}/og-default.png`;

export interface CollectionPreviewItemDoc {
  itemType: string;
  data: Record<string, any> | null;
}

export interface CollectionPreview {
  userId: string;
  collectionId: string;
  name: string;
  description: string;
  itemCount: number;
  ownerName: string;
  image: string | null;
}

/**
 * Missing `isPublic` is treated as public to match the Firestore rules
 * (`resource.data.get('isPublic', true) == true`).
 */
export function isCollectionPublic(data: Record<string, any> | null | undefined): boolean {
  if (!data || typeof data !== 'object') return false;
  return data.isPublic !== false;
}

/**
 * Builds the collection preview title. Falls back to "Sotoy Film" when the
 * owner document is missing or has no usable name.
 */
export function buildCollectionTitle(name: string, ownerName?: string | null): string {
  const safeName = typeof name === 'string' ? name.trim() : '';
  const safeOwner =
    typeof ownerName === 'string' && ownerName.trim() ? ownerName.trim() : 'Sotoy Film';
  return `${safeName || 'Koleksi'} — Koleksi ${safeOwner} | Sotoy Film`;
}

/**
 * Builds the collection description, falling back to the item-count wording
 * used by the rest of the collection UI.
 */
export function buildCollectionDescription(
  description: string | null | undefined,
  itemCount: number
): string {
  const text = typeof description === 'string' ? description.trim() : '';
  if (text) return text;
  const count =
    typeof itemCount === 'number' && Number.isFinite(itemCount) && itemCount > 0
      ? Math.floor(itemCount)
      : 0;
  return `${count} judul film dan artikel pilihan di Sotoy Film.`;
}

/**
 * Normalizes an image field to a usable absolute http(s) URL. Rejects data:
 * URLs, empty values, and anything that is not http(s).
 */
export function normalizeImageUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || /^data:/i.test(trimmed)) return null;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (trimmed.startsWith('/')) return `${SITE_BASE_URL}${trimmed}`;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return null;
}

/**
 * Picks the best image for one collection item document.
 * Films prefer poster then backdrop; articles prefer ogImage then coverImage.
 */
export function pickCollectionItemImage(
  itemType: string,
  data: Record<string, any> | null | undefined
): string | null {
  if (!data) return null;
  if (itemType === 'film') {
    return normalizeImageUrl(data.poster) || normalizeImageUrl(data.backdrop);
  }
  if (itemType === 'article') {
    return normalizeImageUrl(data.ogImage) || normalizeImageUrl(data.coverImage);
  }
  return null;
}

/**
 * Returns the first valid image from an ordered list of fetched item docs.
 */
export function pickCollectionImageFromDocs(
  docs: ReadonlyArray<CollectionPreviewItemDoc>
): string | null {
  if (!Array.isArray(docs)) return null;
  for (const doc of docs) {
    if (!doc) continue;
    const image = pickCollectionItemImage(doc.itemType, doc.data);
    if (image) return image;
  }
  return null;
}

const COLLECTION_PREVIEW_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const COLLECTION_PREVIEW_NEGATIVE_TTL_MS = 60 * 1000; // 60 seconds
const COLLECTION_PREVIEW_TIMEOUT_MS = 1500;
const MAX_EXTRA_COLLECTION_READS = 3;

interface CachedCollectionPreview {
  preview: CollectionPreview;
  timestamp: number;
}

const collectionPreviewCache = new Map<string, CachedCollectionPreview>();
const collectionPreviewNegativeCache = new Map<string, number>();

/** Test/maintenance helper: clears both positive and negative collection caches. */
export function clearCollectionPreviewCache(): void {
  collectionPreviewCache.clear();
  collectionPreviewNegativeCache.clear();
}

function readFirestoreDocument(path: string): Promise<Response> {
  return fetchWithTimeout(
    `${FIRESTORE_DOCUMENTS_URL}/${path}?key=${FIRESTORE_API_KEY}`,
    { headers: { Accept: 'application/json' } },
    COLLECTION_PREVIEW_TIMEOUT_MS
  );
}

/**
 * Fetches a public user collection for link previews.
 *
 * Budget: 1 collection GET + at most 3 extra GETs (owner + up to two item
 * image lookups), each with its own 1500 ms timeout. Private, missing, or
 * failed collections return null and are negatively cached for 60 seconds.
 */
export async function fetchCollectionPreview(
  userId: string,
  collectionId: string
): Promise<CollectionPreview | null> {
  const safeUserId = typeof userId === 'string' ? userId.trim() : '';
  const safeCollectionId = typeof collectionId === 'string' ? collectionId.trim() : '';
  if (!safeUserId || !safeCollectionId) return null;

  const cacheKey = `${safeUserId}:${safeCollectionId}`;
  const now = Date.now();

  const cached = collectionPreviewCache.get(cacheKey);
  if (cached) {
    if (now - cached.timestamp < COLLECTION_PREVIEW_CACHE_TTL_MS) {
      return cached.preview;
    }
    collectionPreviewCache.delete(cacheKey);
  }

  const negativeUntil = collectionPreviewNegativeCache.get(cacheKey);
  if (negativeUntil) {
    if (now < negativeUntil) return null;
    collectionPreviewNegativeCache.delete(cacheKey);
  }

  const markNegative = () => {
    collectionPreviewNegativeCache.set(
      cacheKey,
      Date.now() + COLLECTION_PREVIEW_NEGATIVE_TTL_MS
    );
    return null;
  };

  try {
    const collectionPath = `users/${encodeURIComponent(safeUserId)}/collections/${encodeURIComponent(safeCollectionId)}`;
    const collectionRes = await readFirestoreDocument(collectionPath);
    if (!collectionRes.ok) return markNegative();

    const collectionData = parseFirestoreFields(await collectionRes.json());
    if (!collectionData || Object.keys(collectionData).length === 0) {
      return markNegative();
    }
    if (!isCollectionPublic(collectionData)) return markNegative();

    const name =
      typeof collectionData.name === 'string' && collectionData.name.trim()
        ? collectionData.name.trim()
        : 'Koleksi';
    const description =
      typeof collectionData.description === 'string' ? collectionData.description : '';
    const rawItems = Array.isArray(collectionData.items) ? collectionData.items : [];
    const items = rawItems.filter(
      (item: any): item is { itemId: string; itemType: string } =>
        item &&
        typeof item === 'object' &&
        typeof item.itemId === 'string' &&
        item.itemId.length > 0 &&
        (item.itemType === 'film' || item.itemType === 'article')
    );

    let extraReads = 0;

    // Owner name is best-effort: a missing user doc must not break the preview.
    let ownerName = 'Sotoy Film';
    if (extraReads < MAX_EXTRA_COLLECTION_READS) {
      extraReads++;
      try {
        const userRes = await readFirestoreDocument(`users/${encodeURIComponent(safeUserId)}`);
        if (userRes.ok) {
          const userData = parseFirestoreFields(await userRes.json());
          if (typeof userData.name === 'string' && userData.name.trim()) {
            ownerName = userData.name.trim();
          }
        }
      } catch {
        // Keep the fallback owner name.
      }
    }

    // Stop at the first item with a usable image, within the read budget.
    let image: string | null = null;
    for (const item of items) {
      if (extraReads >= MAX_EXTRA_COLLECTION_READS) break;
      extraReads++;
      try {
        const itemCollection = item.itemType === 'film' ? 'films' : 'articles';
        const itemRes = await readFirestoreDocument(
          `${itemCollection}/${encodeURIComponent(item.itemId)}`
        );
        if (!itemRes.ok) continue;
        const itemData = parseFirestoreFields(await itemRes.json());
        const found = pickCollectionItemImage(item.itemType, itemData);
        if (found) {
          image = found;
          break;
        }
      } catch {
        // Try the next item until the read budget is exhausted.
      }
    }

    const preview: CollectionPreview = {
      userId: safeUserId,
      collectionId: safeCollectionId,
      name,
      description,
      itemCount: rawItems.length,
      ownerName,
      image,
    };

    collectionPreviewCache.set(cacheKey, { preview, timestamp: Date.now() });
    collectionPreviewNegativeCache.delete(cacheKey);
    return preview;
  } catch {
    return markNegative();
  }
}
