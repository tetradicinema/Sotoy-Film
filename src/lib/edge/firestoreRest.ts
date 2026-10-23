/**
 * Edge-compatible Firestore REST client utilities.
 * Uses only standard Web Fetch and AbortController APIs (zero SDK/Node.js dependencies)
 * to keep Edge bundle size minimal (<20KB).
 */

import { slugify } from '../../utils/slugify.js';
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

/**
 * Fetches all documents in a collection via Firestore REST API, requesting only fields needed for meta tags.
 * Supports both paginated GET /documents/{collection} and POST /documents:runQuery fallback.
 */
export async function fetchCollectionDocuments(
  collection: 'films' | 'articles'
): Promise<any[]> {
  const cached = collectionCache[collection];
  const now = Date.now();
  if (cached && now - cached.timestamp < COLLECTION_CACHE_TTL_MS && cached.docs.length > 0) {
    return cached.docs;
  }

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
      return finalDocs;
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
        return docs;
      }
    }
  } catch (err) {
    console.error('[Edge Firestore] Collection fetch error:', err);
  }

  if (cached && cached.docs.length > 0) {
    return cached.docs;
  }

  return [];
}

/**
 * Module-level negative cache for slugs that were not found (30-minute TTL).
 * Prevents repeated crawls of unknown or nonexistent URLs from triggering expensive collection scans.
 */
const NEGATIVE_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const UNPUBLISHED_NEGATIVE_TTL_MS = 60 * 1000; // 60 seconds
const negativeCache = new Map<string, number>();

/**
 * Fetches content from Firestore REST API by direct ID or by searching collection with slug matching:
 * 1. Negative cache check (0 reads if known missing slug)
 * 2. Direct document GET if slug is the document ID (fast path: 1 read)
 * 3. Firestore REST runQuery with where slug == X and limit 1 (targeted query: 1 read)
 * 4. Full collection in-memory scan fallback only if runQuery returns nothing
 * 5. Negative cache recording if entity was not found
 */
export async function fetchEntityData(
  collection: 'films' | 'articles',
  slug: string
): Promise<Record<string, any> | null> {
  const cacheKey = `${collection}:${slug}`;
  const now = Date.now();

  // 1. Negative cache check: skip immediately if recently proven not to exist
  const expiresAt = negativeCache.get(cacheKey);
  if (expiresAt) {
    if (now < expiresAt) {
      return null;
    }
    negativeCache.delete(cacheKey);
  }

  // 2. Direct document GET if slug happens to be the document ID
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
        if (collection === 'articles' && !isArticlePublished(parsed)) {
          negativeCache.set(cacheKey, now + UNPUBLISHED_NEGATIVE_TTL_MS);
          return null;
        }
        negativeCache.delete(cacheKey);
        return parsed;
      }
    }
  } catch {
    // Non-fatal, proceed to query search
  }

  // 3. Fast targeted query: runQuery with where slug == X and limit 1 (1 read)
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

    if (queryRes.ok) {
      const queryResults = await queryRes.json();
      if (Array.isArray(queryResults)) {
        const matchedDoc = queryResults.find((r: any) => r && r.document)?.document;
        if (matchedDoc) {
          const parsed = parseFirestoreFields(matchedDoc);
          if (parsed && Object.keys(parsed).length > 0) {
            if (collection === 'articles' && !isArticlePublished(parsed)) {
              negativeCache.set(cacheKey, now + UNPUBLISHED_NEGATIVE_TTL_MS);
              return null;
            }
            negativeCache.delete(cacheKey);
            return parsed;
          }
        }
      }
    }
  } catch (queryErr) {
    console.warn('[Edge Firestore] runQuery targeted search fallback notice:', queryErr);
  }

  // 4. Full collection fetch & in-memory match (fallback only if runQuery returned nothing)
  try {
    const docs = await fetchCollectionDocuments(collection);
    for (const doc of docs) {
      const parsed = parseFirestoreFields(doc);
      const docId = doc.name ? doc.name.split('/').pop() : '';

      const isMatch =
        (parsed.slug && parsed.slug === slug) ||
        (parsed.title && slugify(parsed.title) === slug) ||
        (parsed.seoTitle && slugify(parsed.seoTitle) === slug) ||
        parsed.id === slug ||
        docId === slug;

      if (isMatch) {
        negativeCache.delete(cacheKey);
        return parsed;
      }
    }
  } catch (err) {
    console.error('[Edge Firestore] Entity lookup error:', err);
  }

  // 5. Store in negative cache so repeated crawls of unknown URLs do not trigger scans
  negativeCache.set(cacheKey, now + NEGATIVE_CACHE_TTL_MS);
  return null;
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
