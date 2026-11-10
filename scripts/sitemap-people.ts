/**
 * Popular TMDB people for the build-time sitemap snapshot.
 *
 * Mirrors the TMDB authentication of `api/tmdb.ts` and
 * `src/lib/edge/personMeta.ts`: a v4 read access token is detected by its "ey"
 * prefix or its length and sent as a bearer token; everything else is treated
 * as a v3 API key and appended as `api_key`.
 *
 * The key is read lazily inside the fetch function, is never logged, and any
 * failure (missing key, timeout, non-OK response, bad JSON) resolves to an
 * empty list so the sitemap build can never be aborted by TMDB.
 */

import { slugify } from '../src/utils/slugify';

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
/** Hard cap for a single TMDB request during the sitemap build. */
const TMDB_TIMEOUT_MS = 5000;
const POPULAR_PEOPLE_LIMIT = 40;
const POPULAR_PEOPLE_PAGES = [1, 2];

export interface PeopleSitemapEntry {
  loc: string;
  changefreq: 'weekly';
  priority: string;
}

export interface FetchPopularPeopleSitemapOptions {
  baseUrl: string;
}

interface PopularPerson {
  id: number;
  name: string;
}

/** Reads the key lazily from the environment. Never logs it. */
function readTmdbApiKey(): string {
  const raw = process.env.TMDB_API_KEY;
  return typeof raw === 'string' ? raw.trim() : '';
}

/** Same auth rule as api/tmdb.ts and src/lib/edge/personMeta.ts. */
function resolveTmdbAuth(apiKey: string): {
  isBearer: boolean;
  headers: Record<string, string>;
} {
  const isBearer = apiKey.startsWith('ey') || apiKey.length > 50;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (isBearer) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return { isBearer, headers };
}

/**
 * Fetches one `person/popular` page with a 5000 ms AbortController timeout.
 * Throws on timeout, network error, non-OK status or a non-object payload.
 */
async function fetchPopularPage(
  page: number,
  apiKey: string,
  isBearer: boolean,
  headers: Record<string, string>
): Promise<Record<string, any>> {
  const url = new URL(`${TMDB_API_BASE}/person/popular`);
  url.searchParams.set('include_adult', 'false');
  url.searchParams.set('language', 'en-US');
  url.searchParams.set('page', String(page));
  if (!isBearer) {
    url.searchParams.set('api_key', apiKey);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TMDB_TIMEOUT_MS);
  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`TMDB responded with status ${response.status}`);
    }
    const data = await response.json();
    if (!data || typeof data !== 'object') {
      throw new Error('TMDB returned a non-object payload');
    }
    return data as Record<string, any>;
  } finally {
    clearTimeout(timer);
  }
}

/** Drops adult/untitled/invalid entries, dedupes by id, keeps the first 40. */
function pickPopularPeople(pages: Array<Record<string, any>>): PopularPerson[] {
  const seen = new Set<number>();
  const people: PopularPerson[] = [];

  for (const page of pages) {
    const results: any[] = Array.isArray(page?.results) ? page.results : [];
    for (const item of results) {
      if (people.length >= POPULAR_PEOPLE_LIMIT) return people;
      if (!item || typeof item !== 'object' || item.adult === true) continue;

      const id = Number(item.id);
      const name = typeof item.name === 'string' ? item.name.trim() : '';
      if (!Number.isSafeInteger(id) || id <= 0 || !name) continue;
      if (seen.has(id)) continue;

      seen.add(id);
      people.push({ id, name });
    }
  }

  return people;
}

/**
 * Builds `/person/<id>-<slug>` sitemap entries for the most popular TMDB
 * people. Never throws: any failure returns `[]` and logs one short warning
 * that never contains the API key.
 */
export async function fetchPopularPeopleSitemapEntries(
  options: FetchPopularPeopleSitemapOptions
): Promise<PeopleSitemapEntry[]> {
  try {
    const apiKey = readTmdbApiKey();
    if (!apiKey) {
      console.warn(
        '[Sitemap People] TMDB_API_KEY is not set; skipping popular people entries.'
      );
      return [];
    }

    const baseUrl = typeof options?.baseUrl === 'string' ? options.baseUrl : '';
    const auth = resolveTmdbAuth(apiKey);

    // Pages are fetched sequentially to stay within TMDB rate limits.
    const pages: Array<Record<string, any>> = [];
    for (const page of POPULAR_PEOPLE_PAGES) {
      pages.push(await fetchPopularPage(page, apiKey, auth.isBearer, auth.headers));
    }

    return pickPopularPeople(pages).map(person => {
      const slug = slugify(person.name);
      return {
        loc: slug
          ? `${baseUrl}/person/${person.id}-${slug}`
          : `${baseUrl}/person/${person.id}`,
        changefreq: 'weekly' as const,
        priority: '0.5',
      };
    });
  } catch {
    // Do not interpolate the error: fetch/URL errors can include the key.
    console.warn(
      '[Sitemap People] Popular people unavailable; skipping person entries.'
    );
    return [];
  }
}
