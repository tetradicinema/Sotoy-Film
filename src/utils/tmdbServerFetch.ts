/**
 * Server-side TMDB fetch helpers shared by the `/api/tmdb` proxy actions
 * (`sync`, `now_playing_ids`) and the scheduled sync script.
 *
 * This module must stay free of React and browser APIs: it only uses the
 * global `fetch` available in Node 18+ / modern runtimes.
 */

import type { TmdbSyncData } from './tmdbSync';

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const WATCH_REGION = 'ID';
const RETRY_DELAY_MS = 1000;
const NOW_PLAYING_PAGES = 3;

/**
 * Error thrown when TMDB responds with a non-OK status. The HTTP status is
 * kept so the API proxy can preserve its original `TMDB_API_ERROR` response
 * shape while the cron script only needs the message.
 */
export class TmdbRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'TmdbRequestError';
    this.status = status;
  }
}

interface TmdbAuth {
  isBearer: boolean;
  headers: Record<string, string>;
}

/**
 * Supports both a TMDB v3 API key and a v4 read access token, matching the
 * behaviour of the API proxy.
 */
function resolveAuth(apiKey: string): TmdbAuth {
  const isBearer = apiKey.startsWith('ey') || apiKey.length > 50;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (isBearer) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return { isBearer, headers };
}

function buildUrl(path: string, apiKey: string, isBearer: boolean): URL {
  const url = new URL(`${TMDB_API_BASE}/${path}`);
  if (!isBearer) {
    url.searchParams.set('api_key', apiKey);
  }
  return url;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Performs one TMDB GET request. HTTP 429 and 5xx responses are retried once
 * after 1000 ms. Non-OK responses throw a `TmdbRequestError` carrying TMDB's
 * `status_message` when available.
 */
async function requestTmdbJson(
  url: URL,
  headers: Record<string, string>
): Promise<any> {
  let response = await fetch(url.toString(), {
    method: 'GET',
    headers,
  });

  if (response.status === 429 || response.status >= 500) {
    await delay(RETRY_DELAY_MS);
    response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new TmdbRequestError(
      data?.status_message || `TMDB API error (${response.status})`,
      response.status
    );
  }

  return data;
}

/**
 * Fetches the sync payload for one movie or TV show: Indonesian release dates
 * (movies only), Indonesian watch providers, title/original title, release
 * date and status.
 */
export async function fetchTmdbSyncData(
  type: 'movie' | 'tv',
  id: number,
  apiKey: string
): Promise<TmdbSyncData> {
  const auth = resolveAuth(apiKey);
  const endpoint = type === 'tv' ? `tv/${id}` : `movie/${id}`;
  const tmdbUrl = buildUrl(endpoint, apiKey, auth.isBearer);
  tmdbUrl.searchParams.set(
    'append_to_response',
    type === 'movie' ? 'release_dates,watch/providers' : 'watch/providers'
  );
  tmdbUrl.searchParams.set('watch_region', WATCH_REGION);
  tmdbUrl.searchParams.set('language', 'en-US');

  const data = await requestTmdbJson(tmdbUrl, auth.headers);

  const releaseDatesID = type === 'movie'
    ? ((data.release_dates?.results || [])
        .find((entry: any) => entry.iso_3166_1 === WATCH_REGION)?.release_dates || [])
        .map((entry: any) => ({
          type: Number(entry.type),
          date: String(entry.release_date || ''),
        }))
        .filter((entry: any) => Number.isFinite(entry.type) && entry.date.length > 0)
    : [];

  const regionProviders = data['watch/providers']?.results?.[WATCH_REGION] || {};
  const providerNames = (providerList: any): string[] => {
    const names = (Array.isArray(providerList) ? providerList : [])
      .map((provider: any) => String(provider?.provider_name || '').trim())
      .filter(Boolean);
    return Array.from(new Set(names));
  };

  return {
    tmdbId: Number(id),
    type,
    title: data.title || data.name || '',
    originalTitle: data.original_title || data.original_name || '',
    releaseDate: data.release_date || data.first_air_date || '',
    releaseDatesID,
    providersID: {
      flatrate: providerNames(regionProviders.flatrate),
      rent: providerNames(regionProviders.rent),
      buy: providerNames(regionProviders.buy),
    },
    status: data.status || '',
  };
}

/**
 * Fetches the first three pages of TMDB's Indonesian "now playing" list and
 * returns the unique numeric movie IDs.
 */
export async function fetchNowPlayingIdsID(apiKey: string): Promise<number[]> {
  const auth = resolveAuth(apiKey);
  const ids = new Set<number>();

  for (let page = 1; page <= NOW_PLAYING_PAGES; page++) {
    const tmdbUrl = buildUrl('movie/now_playing', apiKey, auth.isBearer);
    tmdbUrl.searchParams.set('region', WATCH_REGION);
    tmdbUrl.searchParams.set('language', 'en-US');
    tmdbUrl.searchParams.set('page', String(page));

    const data = await requestTmdbJson(tmdbUrl, auth.headers);

    for (const item of data.results || []) {
      const numericId = Number(item?.id);
      if (Number.isFinite(numericId) && numericId > 0) {
        ids.add(numericId);
      }
    }
  }

  return Array.from(ids);
}
