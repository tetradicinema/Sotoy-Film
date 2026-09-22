/**
 * Edge-compatible Firestore REST client utilities.
 * Uses only standard Web Fetch and AbortController APIs (zero SDK/Node.js dependencies)
 * to keep Edge bundle size minimal (<20KB).
 */

import { slugify } from '../../utils/slugify.js';

export const FIRESTORE_API_KEY =
  typeof process !== 'undefined' && process.env && process.env.VITE_FIREBASE_API_KEY
    ? process.env.VITE_FIREBASE_API_KEY
    : 'AIzaSyCJPXxHQZ8hEdRHIfSGNzU6Z8rqUJZVVs4';

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
];

/**
 * Fetches all documents in a collection via Firestore REST API, requesting only fields needed for meta tags.
 * Supports both paginated GET /documents/{collection} and POST /documents:runQuery fallback.
 */
export async function fetchCollectionDocuments(
  collection: 'films' | 'articles'
): Promise<any[]> {
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
        if (collection === 'articles') {
          console.log('[Diagnostic] articles Strategy A GET response status:', res.status);
        }
        // If GET endpoint returns non-200, break out to runQuery
        break;
      }

      const data = await res.json();
      if (collection === 'articles') {
        console.log(
          '[Diagnostic] articles Strategy A GET response status:',
          res.status,
          'documents count:',
          data.documents ? data.documents.length : 'undefined/no documents key',
          'raw data:',
          JSON.stringify(data).slice(0, 500)
        );
      }
      if (Array.isArray(data.documents)) {
        allDocs.push(...data.documents);
      }
      pageToken = data.nextPageToken;
    } while (pageToken && pageCount < 5);

    if (allDocs.length > 0) {
      return allDocs;
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

    if (collection === 'articles') {
      console.log(
        '[Diagnostic] articles Strategy B runQuery status:',
        queryRes.status,
        'raw results:',
        JSON.stringify(results).slice(0, 500)
      );
    }

    if (queryRes.ok && Array.isArray(results)) {
      return results
        .filter((r: any) => r && r.document)
        .map((r: any) => r.document);
    }
  } catch (err) {
    console.error('[Edge Firestore] Collection fetch error:', err);
  }

  return [];
}

/**
 * Fetches content from Firestore REST API by direct ID or by searching collection with 3-way slug matching:
 * 1. Direct document GET by ID (fast path)
 * 2. Full collection in-memory matching: (f.slug === slug || slugify(f.title) === slug || f.id === slug)
 */
export async function fetchEntityData(
  collection: 'films' | 'articles',
  slug: string
): Promise<Record<string, any> | null> {
  if (collection === 'articles') {
    console.log('[Diagnostic] articles fetchEntityData searching for slug:', slug);
  }

  // 1. Direct document GET if slug happens to be the document ID
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
        return parsed;
      }
    }
  } catch {
    // Non-fatal, proceed to collection search
  }

  // 2. Full collection fetch & in-memory match (same 3-way matching logic as FilmDetailPage & ArticleDetailPage)
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
        return parsed;
      }
    }

    if (collection === 'articles') {
      console.log(
        '[Diagnostic] articles fetchEntityData total documents checked:',
        docs.length,
        'against slug:',
        slug
      );
    }
  } catch (err) {
    console.error('[Edge Firestore] Entity lookup error:', err);
  }

  return null;
}
