/**
 * Bot-only TMDB metadata for `/person/:id` and `/people`.
 *
 * Mirrors the TMDB authentication and language behaviour of `api/tmdb.ts`
 * without importing anything from `api/` or `src/utils/personHelpers.ts`:
 * those modules contain relative imports without the ".js" extension and are
 * therefore not safe to reach from the middleware graph.
 *
 * Every relative import in this file ends in ".js".
 *
 * Nothing runs at module load. The TMDB key is read lazily inside each fetch,
 * is never logged, and any failure (missing key, timeout, non-OK status, bad
 * JSON, invalid id, TMDB 404, adult entry) resolves to `null` / `[]` so the
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
const PROFILE_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

/** Positive cache TTL (10 minutes). */
const CACHE_TTL_MS = 10 * 60 * 1000;
/** Negative cache TTL (60 seconds). */
const NEGATIVE_TTL_MS = 60 * 1000;
/** Hard cap for the module-level cache. */
const CACHE_MAX_ENTRIES = 200;

const MAX_CREDITS = 8;
const MAX_BIOGRAPHY_LENGTH = 2000;
const MAX_DESCRIPTION_LENGTH = 155;
const POPULAR_PEOPLE_LIMIT = 20;

export interface SeoPersonCredit {
  title: string;
  year: number | null;
}

export interface SeoPerson {
  id: number;
  name: string;
  biography: string;
  known_for_department: string;
  profile_path: string | null;
  birthday: string;
  deathday: string;
  place_of_birth: string;
  adult: boolean;
  /** Top credits by vote count, already capped and deduped. */
  credits: SeoPersonCredit[];
}

export interface SeoPopularPerson {
  id: number;
  name: string;
  known_for_department: string;
  profile_path: string | null;
}

/** Minimal person shape needed by the live sitemap. */
export interface SeoPopularPersonSitemap {
  id: number;
  name: string;
}

export interface PersonSeoMeta {
  title: string;
  description: string;
  image: string;
  canonicalUrl: string;
  ogType: 'profile';
  schema: Record<string, any>;
}

/* -------------------------------------------------------------------------- */
/* Small helpers                                                              */
/* -------------------------------------------------------------------------- */

const asString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const asNumber = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const asNullableString = (value: unknown): string | null => {
  const parsed = asString(value);
  return parsed === '' ? null : parsed;
};

/** Leading 4-digit year from `release_date` / `first_air_date`. */
const releaseYear = (item: any): number | null => {
  const raw = asString(item?.release_date) || asString(item?.first_air_date);
  const match = /^(\d{4})/.exec(raw);
  if (!match) return null;
  const year = Number(match[1]);
  return year >= 1800 && year <= 2200 ? year : null;
};

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
/* Fetchers                                                                   */
/* -------------------------------------------------------------------------- */

/** Merges cast + crew, drops adult/untitled credits, keeps the top 8. */
function pickTopCredits(combinedCredits: any): SeoPersonCredit[] {
  const cast: any[] = Array.isArray(combinedCredits?.cast) ? combinedCredits.cast : [];
  const crew: any[] = Array.isArray(combinedCredits?.crew) ? combinedCredits.crew : [];

  const seen = new Set<string>();
  const collected: Array<{ title: string; year: number | null; voteCount: number }> = [];

  for (const item of [...cast, ...crew]) {
    if (!item || typeof item !== 'object' || item.adult === true) continue;

    const title = asString(item.title) || asString(item.name);
    if (!title) continue;

    const key = `${asString(item.media_type) || 'movie'}:${asNumber(item.id)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    collected.push({ title, year: releaseYear(item), voteCount: asNumber(item.vote_count) });
  }

  collected.sort(
    (a, b) => b.voteCount - a.voteCount || a.title.localeCompare(b.title)
  );

  return collected
    .slice(0, MAX_CREDITS)
    .map(credit => ({ title: credit.title, year: credit.year }));
}

/**
 * Fetches one TMDB person with `combined_credits` and the same language the
 * API proxy uses (`en-US`). Returns null for an invalid id, a missing key,
 * any request failure, or an adult entry.
 */
export async function fetchPersonForSeo(id: number): Promise<SeoPerson | null> {
  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId) || numericId <= 0) return null;

  const cacheKey = `person:${numericId}`;
  const cached = cacheGet<SeoPerson>(cacheKey);
  if (cached.hit) return cached.value;

  const apiKey = readTmdbApiKey();
  if (!apiKey) return null;

  const auth = resolveTmdbAuth(apiKey);
  const tmdbUrl = buildTmdbUrl(`person/${numericId}`, apiKey, auth.isBearer);
  tmdbUrl.searchParams.set('append_to_response', 'combined_credits');
  tmdbUrl.searchParams.set('language', 'en-US');

  const data = await fetchTmdbJson(tmdbUrl, auth.headers);
  if (!data) {
    cacheSet(cacheKey, null, NEGATIVE_TTL_MS);
    return null;
  }

  // Adult entries are never indexed.
  if (data.adult === true) {
    cacheSet(cacheKey, null, NEGATIVE_TTL_MS);
    return null;
  }

  const name = asString(data.name);
  if (!name) {
    cacheSet(cacheKey, null, NEGATIVE_TTL_MS);
    return null;
  }

  const person: SeoPerson = {
    id: numericId,
    name,
    biography: asString(data.biography),
    known_for_department: asString(data.known_for_department),
    profile_path: asNullableString(data.profile_path),
    birthday: asString(data.birthday),
    deathday: asString(data.deathday),
    place_of_birth: asString(data.place_of_birth),
    adult: data.adult === true,
    credits: pickTopCredits(data.combined_credits),
  };

  cacheSet(cacheKey, person, CACHE_TTL_MS);
  return person;
}

/**
 * Fetches page 1 of TMDB `person/popular` and keeps the top 20 entries, using
 * the same query parameters as the proxy's `person_list` action. Any failure
 * resolves to an empty list.
 */
export async function fetchPopularPeopleForSeo(): Promise<SeoPopularPerson[]> {
  const cacheKey = 'people:popular:1';
  const cached = cacheGet<SeoPopularPerson[]>(cacheKey);
  if (cached.hit) return Array.isArray(cached.value) ? cached.value : [];

  const apiKey = readTmdbApiKey();
  if (!apiKey) return [];

  const auth = resolveTmdbAuth(apiKey);
  const tmdbUrl = buildTmdbUrl('person/popular', apiKey, auth.isBearer);
  tmdbUrl.searchParams.set('include_adult', 'false');
  tmdbUrl.searchParams.set('language', 'en-US');
  tmdbUrl.searchParams.set('page', '1');

  const data = await fetchTmdbJson(tmdbUrl, auth.headers);
  if (!data) {
    cacheSet(cacheKey, [], NEGATIVE_TTL_MS);
    return [];
  }

  const results: any[] = Array.isArray(data.results) ? data.results : [];

  const people: SeoPopularPerson[] = results
    .filter(item => item && typeof item === 'object' && item.adult !== true)
    .map(item => ({
      id: asNumber(item.id),
      name: asString(item.name),
      known_for_department: asString(item.known_for_department),
      profile_path: asNullableString(item.profile_path),
    }))
    .filter(item => Number.isSafeInteger(item.id) && item.id > 0 && item.name !== '')
    .slice(0, POPULAR_PEOPLE_LIMIT);

  cacheSet(
    cacheKey,
    people,
    people.length > 0 ? CACHE_TTL_MS : NEGATIVE_TTL_MS
  );
  return people;
}

/**
 * Fetches TMDB `person/popular` pages 1 and 2 sequentially for the live
 * sitemap, with its own cache key. Same auth and query parameters as
 * `fetchPopularPeopleForSeo`, but up to `limit` deduped non-adult entries.
 *
 * A missing key returns [] without caching (it is a configuration problem).
 * Any request failure also returns [] so the sitemap can keep every other
 * entry; it never throws and never logs the key.
 */
export async function fetchPopularPeopleForSitemap(
  limit = 40
): Promise<SeoPopularPersonSitemap[]> {
  const maxResults = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;
  if (maxResults === 0) return [];

  const cacheKey = `people:popular:sitemap:${maxResults}`;
  const cached = cacheGet<SeoPopularPersonSitemap[]>(cacheKey);
  if (cached.hit) return Array.isArray(cached.value) ? cached.value : [];

  const apiKey = readTmdbApiKey();
  if (!apiKey) return [];

  try {
    const auth = resolveTmdbAuth(apiKey);
    const seen = new Set<number>();
    const people: SeoPopularPersonSitemap[] = [];

    // Pages are fetched sequentially to stay within TMDB rate limits.
    for (const page of [1, 2]) {
      if (people.length >= maxResults) break;

      const tmdbUrl = buildTmdbUrl('person/popular', apiKey, auth.isBearer);
      tmdbUrl.searchParams.set('include_adult', 'false');
      tmdbUrl.searchParams.set('language', 'en-US');
      tmdbUrl.searchParams.set('page', String(page));

      const data = await fetchTmdbJson(tmdbUrl, auth.headers);
      if (!data) {
        cacheSet(cacheKey, [], NEGATIVE_TTL_MS);
        return [];
      }

      const results: any[] = Array.isArray(data.results) ? data.results : [];
      for (const item of results) {
        if (people.length >= maxResults) break;
        if (!item || typeof item !== 'object' || item.adult === true) continue;

        const id = asNumber(item.id);
        const name = asString(item.name);
        if (!Number.isSafeInteger(id) || id <= 0 || name === '') continue;
        if (seen.has(id)) continue;

        seen.add(id);
        people.push({ id, name });
      }
    }

    cacheSet(
      cacheKey,
      people,
      people.length > 0 ? CACHE_TTL_MS : NEGATIVE_TTL_MS
    );
    return people;
  } catch {
    // Never let an unexpected error break the sitemap.
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/* Metadata builders                                                          */
/* -------------------------------------------------------------------------- */

/** Canonical `/person/<id>-<slug>` path, independent of the requested slug. */
function buildPersonCanonicalUrl(person: SeoPerson): string {
  const slug = slugify(asString(person.name));
  return slug
    ? `${SITE_BASE_URL}/person/${person.id}-${slug}`
    : `${SITE_BASE_URL}/person/${person.id}`;
}

/**
 * Title and description wording are identical to the SEOHead call in
 * PersonPage.tsx, including the empty-biography fallback.
 */
export function buildPersonMeta(person: SeoPerson): PersonSeoMeta {
  const name = asString(person.name) || 'Orang';
  const biography = asString(person.biography);
  const flatBiography = biography.replace(/\s+/g, ' ').trim();

  const description = !flatBiography
    ? `Biografi, filmografi, dan daftar kredit ${name} di Sotoy Film.`
    : flatBiography.length > MAX_DESCRIPTION_LENGTH
      ? `${flatBiography.slice(0, MAX_DESCRIPTION_LENGTH - 1).trimEnd()}…`
      : flatBiography;

  const canonicalUrl = buildPersonCanonicalUrl(person);
  const image = person.profile_path
    ? `${PROFILE_IMAGE_BASE}${person.profile_path}`
    : DEFAULT_IMAGE;

  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    url: canonicalUrl,
    description: biography || description,
  };

  // PersonPage.tsx only adds `image` when TMDB returned a profile path.
  if (person.profile_path) schema.image = image;
  if (person.birthday) schema.birthDate = person.birthday;
  if (person.deathday) schema.deathDate = person.deathday;
  if (person.place_of_birth) {
    schema.birthPlace = { '@type': 'Place', name: person.place_of_birth };
  }
  if (person.known_for_department) schema.jobTitle = person.known_for_department;

  return {
    title: `${name} - Biografi dan Filmografi | Sotoy Film`,
    description,
    image,
    canonicalUrl,
    ogType: 'profile',
    schema,
  };
}

/** Plain crawler body for `/person/:id`, styled like buildFilmBodyHtml. */
export function buildPersonBodyHtml(person: SeoPerson): string {
  if (!person || typeof person !== 'object') return '';

  const parts: string[] = [];
  const name = asString(person.name) || 'Orang';
  parts.push(`<h1>${escapeHtml(name)}</h1>`);

  const department = asString(person.known_for_department);
  if (department) {
    parts.push(`<p>${escapeHtml(department)}</p>`);
  }

  const biography = asString(person.biography).replace(/\s+/g, ' ').trim();
  if (biography) {
    parts.push(`<p>${escapeHtml(biography.slice(0, MAX_BIOGRAPHY_LENGTH))}</p>`);
  }

  const credits = Array.isArray(person.credits) ? person.credits : [];
  if (credits.length > 0) {
    const items = credits
      .filter(credit => credit && asString(credit.title) !== '')
      .map(credit => {
        const year = credit.year ? ` (${credit.year})` : '';
        return `<li>${escapeHtml(`${asString(credit.title)}${year}`)}</li>`;
      });
    if (items.length > 0) {
      parts.push(`<h2>Filmografi pilihan</h2><ul>${items.join('')}</ul>`);
    }
  }

  return `<article>${parts.join('')}</article>`;
}

/** Plain crawler body for `/people`: an h1 plus links to the popular people. */
export function buildPeopleListBodyHtml(list: SeoPopularPerson[]): string {
  const people = Array.isArray(list) ? list : [];

  const items = people
    .filter(
      person =>
        person &&
        Number.isSafeInteger(Number(person.id)) &&
        Number(person.id) > 0 &&
        asString(person.name) !== ''
    )
    .slice(0, POPULAR_PEOPLE_LIMIT)
    .map(person => {
      const name = asString(person.name);
      const slug = slugify(name);
      const href = slug ? `/person/${person.id}-${slug}` : `/person/${person.id}`;
      const department = asString(person.known_for_department);
      const suffix = department ? ` — ${escapeHtml(department)}` : '';
      return `<li><a href="${escapeHtml(href)}">${escapeHtml(name)}</a>${suffix}</li>`;
    });

  return `<article><h1>Orang Populer</h1><ul>${items.join('')}</ul></article>`;
}
