/**
 * Client helpers for the bot-only `<script id="seo-prefetch">` payload and the
 * REST fallback used when a detail item is missing from AppContext.
 *
 * The router context only keeps the newest 50 articles and whatever films were
 * cached/streamed. Crawler renderers can also fail every Firestore Listen
 * stream, so detail pages read the embedded payload synchronously first and
 * then make at most one plain REST request by slug.
 */

import type {
  Article,
  CastMember,
  CrewMember,
  FilmItem,
  MainCategory,
  SubCategory,
  UserRole,
} from '../types';
import { DEFAULT_AVATAR } from '../data/mockData';
import { normalizeArticleCategory } from './articleCategory';
import { normalizeFilmType } from './filmType';
import {
  FIRESTORE_API_KEY,
  FIRESTORE_DOCUMENTS_URL,
  isArticlePublished,
  parseFirestoreFields,
} from '../lib/edge/firestoreRest';

export type SeoPrefetchKind = 'article' | 'film';

export interface SeoPrefetchEnvelope<T = Record<string, any>> {
  kind: SeoPrefetchKind;
  slug: string;
  data: T;
}

export interface SeoListsPayload {
  films: Record<string, any>[];
  articles: Record<string, any>[];
}

const REST_TIMEOUT_MS = 8000;
const USER_ROLES = new Set<UserRole>([
  'warga_sotoy',
  'si_paling_sotoy',
  'penulis_sotoy',
  'admin',
]);
const ARTICLE_STATUSES = new Set<NonNullable<Article['status']>>([
  'published',
  'draft',
  'scheduled',
  'trash',
]);

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

/**
 * Reads the embedded prefetch payload for an article/film detail page.
 * Returns null when the script is missing, malformed, belongs to another kind,
 * or targets a different (case-sensitive, decoded) slug. Never throws.
 */
export function readSeoPrefetch(
  kind: SeoPrefetchKind,
  slug: string | undefined,
  doc: Document | null = typeof document !== 'undefined' ? document : null
): Record<string, any> | null {
  try {
    if (!doc || !slug) return null;

    const script = doc.querySelector('#seo-prefetch');
    const raw = script?.textContent;
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<SeoPrefetchEnvelope>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    if (parsed.kind !== kind) return null;
    if (typeof parsed.slug !== 'string') return null;
    if (safeDecode(parsed.slug) !== safeDecode(slug)) return null;

    const data = parsed.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;

    return data as Record<string, any>;
  } catch {
    return null;
  }
}

/**
 * Reads the bot-only `<script id="seo-lists">` payload emitted for list pages.
 * Returns null when the script is missing or malformed. Never throws.
 */
export function readSeoLists(
  doc: Document | null = typeof document !== 'undefined' ? document : null
): SeoListsPayload | null {
  try {
    if (!doc) return null;

    const script = doc.querySelector('#seo-lists');
    const raw = script?.textContent;
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<SeoListsPayload>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    if (!Array.isArray(parsed.films) && !Array.isArray(parsed.articles)) return null;

    const films = Array.isArray(parsed.films)
      ? parsed.films.filter(
          (item): item is Record<string, any> =>
            !!item && typeof item === 'object' && !Array.isArray(item)
        )
      : [];
    const articles = Array.isArray(parsed.articles)
      ? parsed.articles.filter(
          (item): item is Record<string, any> =>
            !!item && typeof item === 'object' && !Array.isArray(item)
        )
      : [];

    return { films, articles };
  } catch {
    return null;
  }
}

/**
 * One plain REST query: `where slug == X`, limit 1. Returns null on any error
 * (timeout, non-200, empty result) so callers can show the not-found state.
 */
async function fetchDocumentBySlug(
  collection: 'articles' | 'films',
  slug: string
): Promise<Record<string, any> | null> {
  if (!slug || typeof fetch === 'undefined') return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${FIRESTORE_DOCUMENTS_URL}:runQuery?key=${encodeURIComponent(FIRESTORE_API_KEY)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
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
            limit: 1,
          },
        }),
      }
    );

    if (!response.ok) return null;

    const results = await response.json();
    if (!Array.isArray(results)) return null;

    const document = results.find((row: any) => row && row.document)?.document;
    if (!document) return null;

    const parsed = parseFirestoreFields(document);
    if (!parsed || Object.keys(parsed).length === 0) return null;

    if (!parsed.id && typeof document.name === 'string') {
      const docId = document.name.split('/').pop();
      if (docId) parsed.id = docId;
    }

    return parsed;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** REST fallback for an article detail page. Published articles only. */
export async function fetchArticleBySlugRest(
  slug: string
): Promise<Record<string, any> | null> {
  const data = await fetchDocumentBySlug('articles', slug);
  if (!data || !isArticlePublished(data)) return null;
  return data;
}

/** REST fallback for a film detail page. */
export async function fetchFilmBySlugRest(
  slug: string
): Promise<Record<string, any> | null> {
  return fetchDocumentBySlug('films', slug);
}

/**
 * Maps REST/prefetch data to the Article shape rendered by ArticleDetailPage.
 * Missing fields get safe defaults so the page never throws.
 */
export function mapArticleData(raw: Record<string, any>, fallbackSlug: string): Article {
  const authorRaw = asRecord(raw.author);
  const rawRole = asString(authorRaw.role) as UserRole;
  const role: UserRole = USER_ROLES.has(rawRole) ? rawRole : 'warga_sotoy';
  const authorId = asString(raw.authorId) || asString(authorRaw.id) || 'system-redaksi';
  const rawStatus = asString(raw.status) as NonNullable<Article['status']>;
  const rawContentFormat = asString(raw.contentFormat);

  const article: Article = {
    id: asString(raw.id) || fallbackSlug,
    title: asString(raw.title) || 'Artikel',
    slug: asString(raw.slug) || fallbackSlug,
    excerpt: asString(raw.excerpt),
    content: asString(raw.content),
    coverImage: asString(raw.coverImage),
    category: (normalizeArticleCategory(asString(raw.category)) || 'movies') as MainCategory,
    subCategory: (asString(raw.subCategory) || 'news') as SubCategory,
    authorId,
    author: {
      id: authorId,
      name:
        asString(authorRaw.name) ||
        asString(authorRaw.displayName) ||
        'Tim Redaksi',
      avatar:
        asString(authorRaw.avatar) ||
        asString(authorRaw.avatarURL) ||
        DEFAULT_AVATAR,
      role,
    },
    publishedAt: asString(raw.publishedAt),
    readTime: asString(raw.readTime),
    views: asNumber(raw.views),
    likes: asNumber(raw.likes),
    commentsCount: asNumber(raw.commentsCount),
    tags: asStringArray(raw.tags),
  };

  if (rawContentFormat === 'markdown' || rawContentFormat === 'tiptap') {
    article.contentFormat = rawContentFormat;
  }
  const contentJson = asString(raw.contentJson);
  if (contentJson) article.contentJson = contentJson;
  const coverImageAlt = asString(raw.coverImageAlt);
  if (coverImageAlt) article.coverImageAlt = coverImageAlt;
  const coverImageWidth = asOptionalNumber(raw.coverImageWidth);
  if (coverImageWidth !== undefined) article.coverImageWidth = coverImageWidth;
  const coverImageHeight = asOptionalNumber(raw.coverImageHeight);
  if (coverImageHeight !== undefined) article.coverImageHeight = coverImageHeight;
  const publishedAtTimestamp = asString(raw.publishedAtTimestamp);
  if (publishedAtTimestamp) article.publishedAtTimestamp = publishedAtTimestamp;
  const skorSotoy = asOptionalNumber(raw.skorSotoy);
  if (skorSotoy !== undefined) article.skorSotoy = skorSotoy;
  const relatedFilmId = asString(raw.relatedFilmId);
  if (relatedFilmId) article.relatedFilmId = relatedFilmId;
  const relatedFilmIds = asStringArray(raw.relatedFilmIds);
  if (relatedFilmIds.length > 0) article.relatedFilmIds = relatedFilmIds;
  if (ARTICLE_STATUSES.has(rawStatus)) article.status = rawStatus;
  const scheduledAt = asString(raw.scheduledAt);
  if (scheduledAt) article.scheduledAt = scheduledAt;
  const seoTitle = asString(raw.seoTitle);
  if (seoTitle) article.seoTitle = seoTitle;
  const metaDescription = asString(raw.metaDescription);
  if (metaDescription) article.metaDescription = metaDescription;
  const ogImage = asString(raw.ogImage);
  if (ogImage) article.ogImage = ogImage;
  const seoKeywords = asString(raw.seoKeywords);
  if (seoKeywords) article.seoKeywords = seoKeywords;

  return article;
}

function mapCastDetails(value: unknown): CastMember[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => asRecord(item))
    .map(item => ({
      name: asString(item.name),
      character: asString(item.character),
      photo: asString(item.photo),
    }))
    .filter(item => item.name);
}

function mapCrewDetails(value: unknown): CrewMember[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => asRecord(item))
    .map(item => {
      const crew: CrewMember = {
        name: asString(item.name),
        job: asString(item.job),
        photo: asString(item.photo),
      };
      const department = asString(item.department);
      if (department) crew.department = department;
      return crew;
    })
    .filter(item => item.name);
}

function mapWhereToWatch(value: unknown): FilmItem['whereToWatch'] {
  if (!Array.isArray(value)) return [];
  const allowedTypes = new Set<FilmItem['whereToWatch'][number]['type']>([
    'stream',
    'cinema',
    'rent',
  ]);

  return value
    .map(item => asRecord(item))
    .filter(item => asString(item.platform))
    .map(item => {
      const rawType = asString(item.type) as FilmItem['whereToWatch'][number]['type'];
      const entry: FilmItem['whereToWatch'][number] = {
        platform: asString(item.platform),
        type: allowedTypes.has(rawType) ? rawType : 'stream',
        badgeColor: asString(item.badgeColor) || '#FF2E7E',
      };
      if (item.source === 'tmdb') entry.source = 'tmdb';
      return entry;
    });
}

/**
 * Maps REST/prefetch data to the FilmItem shape rendered by FilmDetailPage.
 * Legacy 5-point scores are normalized like AppContext does, and every array,
 * relation, and count gets a safe default.
 */
export function mapFilmData(raw: Record<string, any>, fallbackSlug: string): FilmItem {
  const isLegacy = raw.scoreScale === undefined;
  const rawSkor = asNumber(raw.skorSotoy);
  const rawCritics = asNumber(raw.criticsSkorSotoy);
  const skorSotoy =
    isLegacy && rawSkor > 0 && rawSkor <= 5
      ? Number((rawSkor * 2).toFixed(1))
      : rawSkor;
  const criticsSkorSotoy =
    isLegacy && rawCritics > 0 && rawCritics <= 5
      ? Number((rawCritics * 2).toFixed(1))
      : rawCritics || skorSotoy;

  const film: FilmItem = {
    id: asString(raw.id) || fallbackSlug,
    slug: asString(raw.slug) || fallbackSlug,
    title: asString(raw.title) || 'Film',
    type: normalizeFilmType(asString(raw.type)),
    year: asNumber(raw.year),
    poster: asString(raw.poster),
    backdrop: asString(raw.backdrop),
    synopsis: asString(raw.synopsis),
    director: asString(raw.director),
    cast: asStringArray(raw.cast),
    genres: asStringArray(raw.genres),
    skorSotoy,
    totalVotes: asNumber(raw.totalVotes),
    criticsSkorSotoy,
    whereToWatch: mapWhereToWatch(raw.whereToWatch),
  };

  const tmdbId = asOptionalNumber(raw.tmdbId);
  if (tmdbId !== undefined) film.tmdbId = tmdbId;
  const originalTitle = asString(raw.originalTitle);
  if (originalTitle) film.originalTitle = originalTitle;
  const releaseDate = asString(raw.releaseDate);
  if (releaseDate) film.releaseDate = releaseDate;
  const idReleaseDate = asString(raw.idReleaseDate);
  if (idReleaseDate) film.idReleaseDate = idReleaseDate;
  const writer = asString(raw.writer);
  if (writer) film.writer = writer;
  const studio = asString(raw.studio);
  if (studio) film.studio = studio;
  const duration = asString(raw.duration);
  if (duration) film.duration = duration;
  const tags = asStringArray(raw.tags);
  if (tags.length > 0) film.tags = tags;
  const originCountry = asStringArray(raw.originCountry);
  if (originCountry.length > 0) film.originCountry = originCountry;
  const castDetails = mapCastDetails(raw.castDetails);
  if (castDetails.length > 0) film.castDetails = castDetails;
  const crewDetails = mapCrewDetails(raw.crewDetails);
  if (crewDetails.length > 0) film.crewDetails = crewDetails;
  const trailerUrl = asString(raw.trailerUrl);
  if (trailerUrl) film.trailerUrl = trailerUrl;
  const trailerTitle = asString(raw.trailerTitle);
  if (trailerTitle) film.trailerTitle = trailerTitle;
  const stills = asStringArray(raw.stills);
  if (stills.length > 0) film.stills = stills;
  const relatedArticleIds = asStringArray(raw.relatedArticleIds);
  if (relatedArticleIds.length > 0) film.relatedArticleIds = relatedArticleIds;
  const curatorNote = asString(raw.curatorNote);
  if (curatorNote) film.curatorNote = curatorNote;
  const scoreScale = asOptionalNumber(raw.scoreScale);
  if (scoreScale !== undefined) film.scoreScale = scoreScale;
  const createdAt = asString(raw.createdAt);
  if (createdAt) film.createdAt = createdAt;

  return film;
}
