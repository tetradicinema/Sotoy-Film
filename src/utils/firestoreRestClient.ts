/**
 * Client-side Firestore REST fallback for crawler renderers.
 *
 * Googlebot's renderer can keep the Firestore SDK Listen streams pending
 * forever, so the app never receives its initial films/articles payload.
 * This module reads the same collections with plain `fetch` (articles without their
 * heavy body fields) and mirrors the SDK normalisation used by AppContext.
 */

import type { Article, FilmItem, MainCategory } from '../types';
import {
  FIRESTORE_API_KEY,
  FIRESTORE_DOCUMENTS_URL,
  isArticlePublished,
  parseFirestoreFields,
} from '../lib/edge/firestoreRest';
import { normalizeFilmType } from './filmType';
import { normalizeArticleCategory } from './articleCategory';

export type RestCollection = 'films' | 'articles';

const REST_PAGE_SIZE = 300;
const MAX_REST_PAGES = 5;
const REST_TIMEOUT_MS = 15000;
const MAX_REST_ARTICLES = 50;
const MAX_REST_FEATURED_ARTICLES = 50;

/**
 * Article list projection: the fields the homepage renders, plus `slug`,
 * `commentsCount` and `relatedFilmId(s)` which other pages resolve from this
 * same shared list. The heavy body (`content`, `contentJson`) is never
 * requested; the detail page fetches the full document itself when the body
 * is missing.
 */
const ARTICLE_LIST_FIELDS = [
  'id', 'title', 'slug', 'excerpt', 'coverImage', 'category', 'subCategory',
  'authorId', 'author', 'publishedAt', 'publishedAtTimestamp', 'readTime',
  'skorSotoy', 'featured', 'heroSlider', 'views', 'likes', 'commentsCount',
  'tags', 'relatedFilmId', 'relatedFilmIds', 'status', 'scheduledAt',
];

/**
 * Film list projection: every FilmItem field except the heavy detail-page
 * fields (`castDetails`, `crewDetails`, `stills`). FilmDetailPage fetches the
 * full document itself when `detailsDeferred` is set.
 */
const FILM_LIST_FIELDS = [
  'id', 'slug', 'tmdbId', 'title', 'originalTitle', 'type', 'year',
  'releaseDate', 'idReleaseDate', 'poster', 'backdrop', 'synopsis',
  'director', 'writer', 'studio', 'cast', 'genres', 'tags', 'originCountry',
  'duration', 'skorSotoy', 'totalVotes', 'criticsSkorSotoy', 'whereToWatch',
  'trailerUrl', 'trailerTitle', 'relatedArticleIds', 'featuredRecommendation',
  'trendingRank', 'isRecentRelease', 'isPopularRelease', 'isPopularThisWeek',
  'curatorNote', 'scoreScale', 'collectionId', 'collectionName',
  'relatedFilmIds', 'createdAt',
];

/** Admin screens may save films, so they always get complete documents. */
function isAdminRoute(): boolean {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
}

/**
 * POSTs one runQuery request; returns the parsed result array, or null for
 * HTTP errors, timeouts, thrown fetches and non-array payloads.
 *
 * The plain list endpoint (GET .../documents/{collection}) is rejected with
 * 403 for anonymous visitors, while :runQuery is accepted (same endpoint the
 * edge SEO code already uses), so the fallback must go through :runQuery.
 */
async function fetchRestPage(endpoint: string, body: unknown): Promise<any[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REST_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const payload = await response.json();
    return Array.isArray(payload) ? payload : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetches featured articles through :runQuery. Deliberately has no orderBy so
 * documents without publishedAtTimestamp are included and no composite index
 * is required. Mirrors the SDK featured query in AppContext.refreshArticles().
 */
async function fetchFeaturedArticleDocs(endpoint: string): Promise<any[]> {
  const results = await fetchRestPage(endpoint, {
    structuredQuery: {
      from: [{ collectionId: 'articles' }],
      select: { fields: ARTICLE_LIST_FIELDS.map(fieldPath => ({ fieldPath })) },
      where: {
        fieldFilter: {
          field: { fieldPath: 'featured' },
          op: 'EQUAL',
          value: { booleanValue: true },
        },
      },
      limit: MAX_REST_FEATURED_ARTICLES,
    },
  });
  if (!results) return [];
  return results
    .filter((entry: any) => entry && entry.document)
    .map((entry: any) => entry.document);
}

/**
 * Fetches raw documents from the Firestore REST API through :runQuery,
 * paging with offset/limit for at most 5 pages. Documents are parsed with the
 * shared REST field parser; the document name supplies the id when the id
 * field is missing. Returns [] on any error and never throws.
 */
export async function fetchCollectionViaRest(
  collection: RestCollection
): Promise<Record<string, any>[]> {
  const documents: Record<string, any>[] = [];
  const maskFilms = collection === 'films' && !isAdminRoute();
  const endpoint = `${FIRESTORE_DOCUMENTS_URL}:runQuery?key=${encodeURIComponent(FIRESTORE_API_KEY)}`;

  // Articles ask for the newest 50 only. Firestore omits documents that lack
  // the orderBy field, so an empty/failed ordered query retries once without
  // orderBy and falls back to the legacy paging loop (mirrors the SDK path in
  // AppContext.refreshArticles). The separate featured query runs in parallel
  // and has no orderBy, so old featured articles are still returned.
  let orderedArticles = collection === 'articles';
  let pagesToFetch = orderedArticles ? 1 : MAX_REST_PAGES;
  let usedLegacyArticlePaging = false;
  const featuredDocsPromise = collection === 'articles'
    ? fetchFeaturedArticleDocs(endpoint)
    : Promise.resolve<any[]>([]);

  try {
    for (let page = 0; page < pagesToFetch; page++) {
      const results = await fetchRestPage(endpoint, {
        structuredQuery: {
          from: [{ collectionId: collection }],
          ...(collection === 'articles'
            ? { select: { fields: ARTICLE_LIST_FIELDS.map(fieldPath => ({ fieldPath })) } }
            : maskFilms
              ? { select: { fields: FILM_LIST_FIELDS.map(fieldPath => ({ fieldPath })) } }
              : {}),
          ...(orderedArticles
            ? {
                orderBy: [
                  { field: { fieldPath: 'publishedAtTimestamp' }, direction: 'DESCENDING' },
                ],
                limit: MAX_REST_ARTICLES,
              }
            : { offset: page * REST_PAGE_SIZE, limit: REST_PAGE_SIZE }),
        },
      });
      if (!results) {
        if (orderedArticles) {
          orderedArticles = false;
          usedLegacyArticlePaging = true;
          pagesToFetch = MAX_REST_PAGES;
          page = -1;
          continue;
        }
        return [];
      }

      // runQuery answers an empty page with a single entry that has no document.
      const pageDocs = results
        .filter((entry: any) => entry && entry.document)
        .map((entry: any) => entry.document);

      for (const rawDoc of pageDocs) {
        const parsed = parseFirestoreFields(rawDoc);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue;

        if (!parsed.id && typeof rawDoc?.name === 'string') {
          const docId = rawDoc.name.split('/').pop();
          if (docId) parsed.id = docId;
        }

        if (maskFilms) parsed.__listProjection = true;
        documents.push(parsed);
      }

      if (orderedArticles) {
        if (pageDocs.length > 0) break;
        orderedArticles = false;
        usedLegacyArticlePaging = true;
        pagesToFetch = MAX_REST_PAGES;
        page = -1;
        continue;
      }

      if (pageDocs.length < REST_PAGE_SIZE) break;
    }

    // The legacy article paging already walks the whole collection, so the
    // featured read is redundant there. Otherwise append featured docs that
    // fall outside the newest 50 (deduped by id).
    if (collection === 'articles' && !usedLegacyArticlePaging) {
      const featuredRawDocs = await featuredDocsPromise;
      const seenIds = new Set(
        documents
          .map(doc => (typeof doc.id === 'string' ? doc.id : doc.id ? String(doc.id) : ''))
          .filter(Boolean)
      );

      for (const rawDoc of featuredRawDocs) {
        const parsed = parseFirestoreFields(rawDoc);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue;

        if (!parsed.id && typeof rawDoc?.name === 'string') {
          const docId = rawDoc.name.split('/').pop();
          if (docId) parsed.id = docId;
        }

        const id = typeof parsed.id === 'string' ? parsed.id : parsed.id ? String(parsed.id) : '';
        if (!id || seenIds.has(id)) continue;

        seenIds.add(id);
        documents.push(parsed);
      }
    }
  } catch {
    return [];
  }

  return documents;
}

/** Last-resort id lookup for hand-built documents used in tests. */
function resolveDocumentId(doc: Record<string, any>): string {
  if (typeof doc.id === 'string' && doc.id) return doc.id;
  if (doc.id) return String(doc.id);
  if (typeof doc.name === 'string' && doc.name) {
    return doc.name.split('/').pop() || '';
  }
  return '';
}

/**
 * Mirrors refreshFilms(): legacy (scoreScale undefined) 5-point scores are
 * doubled and rounded to one decimal, critics fall back to the Sotoy score,
 * and the format is canonicalised. Returns null when no id can be resolved.
 */
export function normalizeRestFilm(
  doc: Record<string, any> | null | undefined
): FilmItem | null {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return null;

  const id = resolveDocumentId(doc);
  if (!id) return null;

  const isLegacy = doc.scoreScale === undefined;
  const normalizedSkor =
    isLegacy && doc.skorSotoy && doc.skorSotoy <= 5.0 && doc.skorSotoy > 0
      ? Number((doc.skorSotoy * 2).toFixed(1))
      : doc.skorSotoy;
  const normalizedCriticsSkor =
    isLegacy && doc.criticsSkorSotoy && doc.criticsSkorSotoy <= 5.0 && doc.criticsSkorSotoy > 0
      ? Number((doc.criticsSkorSotoy * 2).toFixed(1))
      : doc.criticsSkorSotoy;

  const { __listProjection, ...rest } = doc;

  return {
    ...rest,
    ...(__listProjection ? { detailsDeferred: true } : {}),
    id,
    type: normalizeFilmType(doc.type),
    skorSotoy: normalizedSkor,
    criticsSkorSotoy: normalizedCriticsSkor || normalizedSkor,
  } as FilmItem;
}

function getArticleTime(article: Article): number {
  if (article.publishedAtTimestamp) {
    const t = new Date(article.publishedAtTimestamp).getTime();
    if (!isNaN(t)) return t;
  }
  if (article.scheduledAt) {
    const t = new Date(article.scheduledAt).getTime();
    if (!isNaN(t)) return t;
  }
  if (article.publishedAt) {
    const t = new Date(article.publishedAt).getTime();
    if (!isNaN(t)) return t;
  }
  return 0;
}

function normalizeRestArticleDoc(doc: Record<string, any>): Article | null {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return null;
  if (!isArticlePublished(doc)) return null;

  const id = resolveDocumentId(doc);
  if (!id) return null;

  return {
    ...doc,
    id,
    content: typeof doc.content === 'string' ? doc.content : '',
    category: normalizeArticleCategory(doc.category) as MainCategory,
  } as Article;
}

/**
 * Normalises a single article document (drafts, trash and future scheduled
 * articles return null) or a whole collection. Collection input is deduped by
 * id, sorted newest first exactly like refreshArticles(), and capped at 50.
 */
export function normalizeRestArticle(
  docs: ReadonlyArray<Record<string, any>>
): Article[];
export function normalizeRestArticle(doc: Record<string, any>): Article | null;
export function normalizeRestArticle(
  input: Record<string, any> | ReadonlyArray<Record<string, any>>
): Article | Article[] | null {
  if (Array.isArray(input)) {
    const articleMap = new Map<string, Article>();
    for (const doc of input) {
      const article = normalizeRestArticleDoc(doc);
      if (article) articleMap.set(article.id, article);
    }
    const sorted = Array.from(articleMap.values())
      .sort((a, b) => getArticleTime(b) - getArticleTime(a));

    if (sorted.length <= MAX_REST_ARTICLES) return sorted;

    // Keep the public list capped at the newest 50, then append up to 20
    // featured articles that fall outside that window so the homepage
    // Featured section can still resolve old featured entries.
    const limited = sorted.slice(0, MAX_REST_ARTICLES);
    const seen = new Set(limited.map(article => article.id));
    const featuredExtras: Article[] = [];
    for (const article of sorted) {
      if (featuredExtras.length >= MAX_REST_FEATURED_ARTICLES) break;
      if (article.featured !== true || seen.has(article.id)) continue;
      seen.add(article.id);
      featuredExtras.push(article);
    }
    return featuredExtras.length > 0 ? [...limited, ...featuredExtras] : limited;
  }
  return normalizeRestArticleDoc(input as Record<string, any>);
}
