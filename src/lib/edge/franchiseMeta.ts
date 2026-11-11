/**
 * Bot-only TMDB metadata for `/franchise/:idSlug` (TMDB collections).
 *
 * Mirrors `src/lib/edge/personMeta.ts` (TMDB authentication, language, caching,
 * escaping) and the route helpers of `src/utils/franchiseHelpers.ts` without
 * importing anything from `api/` or `src/utils/franchiseHelpers.ts`: those
 * modules contain relative imports without the ".js" extension and are
 * therefore not safe to reach from the middleware graph.
 *
 * Every relative import in this file ends in ".js".
 *
 * Nothing runs at module load. The TMDB key is read lazily inside the fetch,
 * is never logged, and any failure (missing key, timeout, non-OK status, bad
 * JSON, invalid id, TMDB 404, zero parts) resolves to `null` / `[]` so the
 * caller can fall through to the normal SPA response.
 */

import { fetchWithTimeout } from './firestoreRest.js';
import { escapeHtml } from './metaInjection.js';
import { slugify } from '../../utils/slugify.js';

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
/** Hard cap for a single TMDB request from the middleware. */
const TMDB_TIMEOUT_MS = 2000;

const SITE_BASE_URL = 'https://www.sotoyfilm.my.id';
const DEFAULT_IMAGE = `${SITE_BASE_URL}/og-default.png`;

/** Positive cache TTL (10 minutes). */
const CACHE_TTL_MS = 10 * 60 * 1000;
/** Negative cache TTL (60 seconds). */
const NEGATIVE_TTL_MS = 60 * 1000;
/** Hard cap for the module-level cache. */
const CACHE_MAX_ENTRIES = 200;

export interface SeoFranchisePart {
  tmdbId: number;
  title: string;
  releaseDate: string;
}

export interface SeoFranchise {
  id: number;
  name: string;
  /** Parts sorted by release date ascending, undated last. */
  parts: SeoFranchisePart[];
}

export interface FranchiseSeoMeta {
  title: string;
  description: string;
  image: string;
  canonicalUrl: string;
  ogType: 'website';
  schema: Record<string, any>;
}

/** Cap for the franchise URLs in the sitemap. */
export const FRANCHISE_SITEMAP_LIMIT = 200;

/* -------------------------------------------------------------------------- */
/* Small helpers                                                              */
/* -------------------------------------------------------------------------- */

const asString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

/**
 * Reads the leading numeric TMDB collection id from `/franchise/:idSlug`.
 * Re-implemented locally to stay byte-identical with
 * `src/utils/franchiseHelpers.ts` `parseFranchiseRouteParam` (that module
 * cannot be imported into the middleware graph). Accepts `119`,
 * `119-the-lord-of-the-rings`; rejects anything without leading digits.
 */
export function parseFranchiseRouteId(param: string): number | null {
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

/* -------------------------------------------------------------------------- */
/* Module-level cache (positive 10 min, negative 60 s, max 200 entries)        */
/* -------------------------------------------------------------------------- */

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function cacheGet<T>(key: string): { hit: boolean; value: T | null } {
  const entry = cache.get(key);
  if (!entry) return { hit: false, value: null };
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return { hit: false, value: null };
  }
  return { hit: true, value: (entry.value ?? null) as T | null };
}

/** Inserts a value and evicts the oldest entries past the cap. */
function cacheSet(key: string, value: unknown, ttlMs: number): void {
  if (cache.has(key)) {
    cache.delete(key);
  }
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  while (cache.size > CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next();
    if (oldest.done) break;
    cache.delete(oldest.value);
  }
}

/* -------------------------------------------------------------------------- */
/* TMDB access (mirrors api/tmdb.ts)                                          */
/* -------------------------------------------------------------------------- */

/**
 * Reads the TMDB key lazily. Never uses a VITE_* variable and never logs it.
 * A missing key is a configuration problem, so it is not negative-cached.
 */
function readTmdbApiKey(): string {
  try {
    if (typeof process === 'undefined' || !process.env) return '';
    const raw = process.env.TMDB_API_KEY;
    return typeof raw === 'string' ? raw.trim() : '';
  } catch {
    return '';
  }
}

/**
 * Same auth resolution as api/tmdb.ts: a v4 read access token is detected by
 * its "ey" prefix or its length, and is sent as a bearer token. Everything
 * else is treated as a v3 API key and appended as `api_key`.
 */
function resolveTmdbAuth(apiKey: string): {
  isBearer: boolean;
  headers: Record<string, string>;
} {
  const isBearer = apiKey.startsWith('ey') || apiKey.length > 50;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (isBearer) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return { isBearer, headers };
}

function buildTmdbUrl(path: string, apiKey: string, isBearer: boolean): URL {
  const url = new URL(`${TMDB_API_BASE}/${path}`);
  if (!isBearer) {
    url.searchParams.set('api_key', apiKey);
  }
  return url;
}

/**
 * One GET with a 2000 ms timeout. Returns null for timeouts, network errors,
 * non-OK statuses and payloads that are not JSON objects.
 */
async function fetchTmdbJson(
  url: URL,
  headers: Record<string, string>
): Promise<Record<string, any> | null> {
  try {
    const response = await fetchWithTimeout(
      url.toString(),
      { method: 'GET', headers },
      TMDB_TIMEOUT_MS
    );
    if (!response.ok) return null;
    const data = await response.json().catch(() => null);
    return data && typeof data === 'object' ? (data as Record<string, any>) : null;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Fetcher                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Release-date ascending sort with undated parts last, secondary sort by
 * title — the same ordering the FranchisePage catalog fallback uses.
 */
function compareParts(
  a: SeoFranchisePart,
  b: SeoFranchisePart
): number {
  if (!a.releaseDate && !b.releaseDate) return a.title.localeCompare(b.title);
  if (!a.releaseDate) return 1;
  if (!b.releaseDate) return -1;
  return a.releaseDate.localeCompare(b.releaseDate) || a.title.localeCompare(b.title);
}

/**
 * Fetches one TMDB collection with `/3/collection/{id}` and the same language
 * the API proxy uses (`en-US`). Returns null for an invalid id, a missing key,
 * any request failure, an empty name, or a collection whose every part is
 * adult (leaving zero usable parts).
 */
export async function fetchFranchiseForSeo(id: number): Promise<SeoFranchise | null> {
  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId) || numericId <= 0) return null;

  const cacheKey = `franchise:${numericId}`;
  const cached = cacheGet<SeoFranchise>(cacheKey);
  if (cached.hit) return cached.value;

  const apiKey = readTmdbApiKey();
  if (!apiKey) return null;

  const auth = resolveTmdbAuth(apiKey);
  const tmdbUrl = buildTmdbUrl(`collection/${numericId}`, apiKey, auth.isBearer);
  tmdbUrl.searchParams.set('language', 'en-US');

  const data = await fetchTmdbJson(tmdbUrl, auth.headers);
  if (!data) {
    cacheSet(cacheKey, null, NEGATIVE_TTL_MS);
    return null;
  }

  const name = asString(data.name);
  const rawParts: any[] = Array.isArray(data.parts) ? data.parts : [];

  // Adult entries are never indexed. Drop them before mapping: the mapped
  // part shape intentionally omits the raw `adult` flag, exactly like the
  // `collection` action of api/tmdb.ts.
  const parts = rawParts
    .filter(part => part && typeof part === 'object' && part.adult !== true)
    .map(part => ({
      tmdbId: Number(part.id),
      title: asString(part.title) || asString(part.name),
      releaseDate: asString(part.release_date) || asString(part.first_air_date),
    }))
    .filter(
      part =>
        Number.isSafeInteger(part.tmdbId) &&
        part.tmdbId > 0 &&
        part.title !== ''
    )
    .sort(compareParts);

  if (!name || parts.length === 0) {
    cacheSet(cacheKey, null, NEGATIVE_TTL_MS);
    return null;
  }

  const franchise: SeoFranchise = { id: numericId, name, parts };

  cacheSet(cacheKey, franchise, CACHE_TTL_MS);
  return franchise;
}

/* -------------------------------------------------------------------------- */
/* Metadata builders                                                          */
/* -------------------------------------------------------------------------- */

/** Canonical `/franchise/<id>-<slug>` path, independent of the requested slug. */
export function buildFranchiseCanonicalUrl(id: number, name: string): string {
  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId) || numericId <= 0) {
    return `${SITE_BASE_URL}/franchise`;
  }

  const slug = slugify(asString(name));
  return slug
    ? `${SITE_BASE_URL}/franchise/${numericId}-${slug}`
    : `${SITE_BASE_URL}/franchise/${numericId}`;
}

/**
 * Title and description wording are identical to the SEOHead call in
 * FranchisePage.tsx.
 */
export function buildFranchiseMeta(franchise: SeoFranchise): FranchiseSeoMeta {
  const name = asString(franchise.name) || 'Franchise';
  const canonicalUrl = buildFranchiseCanonicalUrl(franchise.id, franchise.name);

  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: SITE_BASE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name,
        item: canonicalUrl,
      },
    ],
  };

  return {
    title: `${name} - Semua Film Franchise | Sotoy Film`,
    description: `Daftar semua film dalam franchise ${name} di Sotoy Film, diurutkan berdasarkan tanggal rilis, lengkap dengan Skor Sotoy.`,
    image: DEFAULT_IMAGE,
    canonicalUrl,
    ogType: 'website',
    schema,
  };
}

/** Plain crawler body for `/franchise/:id`, styled like buildPersonBodyHtml. */
export function buildFranchiseBodyHtml(franchise: SeoFranchise): string {
  if (!franchise || typeof franchise !== 'object') return '';

  const name = asString(franchise.name) || 'Franchise';
  const parts = Array.isArray(franchise.parts) ? franchise.parts : [];

  const items = parts
    .filter(part => part && asString(part.title) !== '')
    .map(part => {
      const yearMatch = /^(\d{4})/.exec(asString(part.releaseDate));
      const year = yearMatch && Number(yearMatch[1]) >= 1800 && Number(yearMatch[1]) <= 2200
        ? ` (${yearMatch[1]})`
        : '';
      return `<li>${escapeHtml(`${asString(part.title)}${year}`)}</li>`;
    });

  if (items.length === 0) return '';

  return `<article><h1>${escapeHtml(name)}</h1><ol>${items.join('')}</ol></article>`;
}

/* -------------------------------------------------------------------------- */
/* Sitemap grouping (shared by api/sitemap.ts and generate-sitemap.ts)         */
/* -------------------------------------------------------------------------- */

export interface FranchiseSitemapEntry {
  id: number;
  name: string;
  /** Number of catalog films carrying this collectionId. */
  filmCount: number;
  /** `/franchise/<id>-<slug>` (or `/franchise/<id>` when the slug is empty). */
  path: string;
}

/**
 * Groups catalog films by their numeric TMDB `collectionId` and keeps only
 * franchises with at least 2 catalog films (thin pages stay out of the
 * sitemap). Sorted by film count descending, then name ascending, capped at
 * `FRANCHISE_SITEMAP_LIMIT` entries. Never throws; malformed films are
 * skipped. The slug is built with the same slugify used by the edge
 * canonical, so both URL forms always match.
 */
export function buildFranchiseSitemapEntries(
  films: any[],
  options: { minFilms?: number; limit?: number } = {}
): FranchiseSitemapEntry[] {
  const minFilms = Number.isFinite(options.minFilms)
    ? Math.max(1, Math.floor(Number(options.minFilms)))
    : 2;
  const limit = Number.isFinite(options.limit)
    ? Math.max(0, Math.floor(Number(options.limit)))
    : FRANCHISE_SITEMAP_LIMIT;
  if (limit === 0) return [];

  try {
    const groups = new Map<
      number,
      { filmCount: number; name: string }
    >();

    for (const film of Array.isArray(films) ? films : []) {
      if (!film || typeof film !== 'object') continue;

      const id = Number((film as any).collectionId);
      if (!Number.isSafeInteger(id) || id <= 0) continue;

      const existing = groups.get(id);
      if (existing) {
        existing.filmCount += 1;
        // First non-empty collectionName wins, mirroring the FranchisePage
        // catalog fallback that reads the name from any catalog film.
        if (!existing.name) {
          existing.name = asString((film as any).collectionName);
        }
      } else {
        groups.set(id, {
          filmCount: 1,
          name: asString((film as any).collectionName),
        });
      }
    }

    const qualified = [...groups.entries()]
      .filter(([, group]) => group.filmCount >= minFilms)
      .map(([id, group]) => ({ id, name: group.name, filmCount: group.filmCount }))
      .sort(
        (a, b) =>
          b.filmCount - a.filmCount ||
          a.name.localeCompare(b.name) ||
          a.id - b.id
      )
      .slice(0, limit);

    return qualified.map(franchise => {
      const slug = slugify(franchise.name);
      return {
        id: franchise.id,
        name: franchise.name,
        filmCount: franchise.filmCount,
        path: slug
          ? `/franchise/${franchise.id}-${slug}`
          : `/franchise/${franchise.id}`,
      };
    });
  } catch {
    // A grouping failure must never break the sitemap.
    return [];
  }
}
