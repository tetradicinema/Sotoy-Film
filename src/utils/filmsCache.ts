/**
 * Pure helpers for the `sotoy_cached_films` localStorage cache.
 *
 * The full films catalog (castDetails/crewDetails/stills included for ~800
 * documents) can exceed the ~5 MB localStorage quota, and the previous
 * write order (data key first, timestamp second, one try/catch) left the OLD
 * cache + OLD timestamp behind whenever setItem threw. These helpers:
 *
 * - project films to a list-safe slim shape (`detailsDeferred: true`) so the
 *   serialized payload fits; FilmDetailPage already refetches the full
 *   document by slug when `detailsDeferred` is set;
 * - always keep the data key and the timestamp key in sync: on any failure
 *   BOTH keys are removed, so a stale pair or a half-written cache can never
 *   survive;
 * - are storage-injected and side-effect free otherwise, so scripts/test-*.ts
 *   can exercise quota failures with an in-memory fake.
 */
import type { FilmItem } from '../types';

export const FILMS_CACHE_KEY = 'sotoy_cached_films';
export const FILMS_CACHE_TS_KEY = 'sotoy_cached_films_ts';
export const FILMS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
/** Hard cap on the serialized films payload; beyond this the cache is dropped. */
export const FILMS_CACHE_MAX_CHARS = 4_000_000;

/** Minimal structural storage surface (satisfied by window.localStorage). */
export interface FilmsCacheStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface WriteFilmsCacheResult {
  ok: boolean;
  /** Serialized payload length in characters (measured even on failure). */
  chars: number;
  /** Error name ('QuotaExceededError') or 'too-large' when ok is false. */
  reason?: string;
}

/** Heavy detail-page fields excluded from the cached projection. */
const HEAVY_FILM_CACHE_FIELDS = ['castDetails', 'crewDetails', 'stills'];

/**
 * Returns NEW objects without castDetails, crewDetails and stills, each marked
 * `detailsDeferred: true`. Every other field (including synopsis, which the
 * navbar/global search filters on) is kept. Never mutates the input array or
 * its objects.
 */
export function projectFilmsForCache(films: FilmItem[]): FilmItem[] {
  return films.map(film => {
    if (!film || typeof film !== 'object') return film;
    const projected: Record<string, unknown> = {};
    for (const key of Object.keys(film)) {
      if (!HEAVY_FILM_CACHE_FIELDS.includes(key)) {
        projected[key] = (film as unknown as Record<string, unknown>)[key];
      }
    }
    projected.detailsDeferred = true;
    return projected as unknown as FilmItem;
  });
}

/** Removes both keys; each removeItem is best-effort so one throw cannot skip the other. */
function removeFilmsCacheKeys(storage: FilmsCacheStorage): void {
  for (const key of [FILMS_CACHE_KEY, FILMS_CACHE_TS_KEY]) {
    try {
      storage.removeItem(key);
    } catch {
      // Storage unavailable/unwritable — nothing more we can do here.
    }
  }
}

/**
 * Projects the films and writes the cache as { films: [...] } + a fresh
 * timestamp. Returns { ok: false } WITHOUT writing anything (and with both
 * keys removed) when the payload would exceed FILMS_CACHE_MAX_CHARS, and
 * removes BOTH keys on any setItem throw so an old pair or a data-without-ts
 * half state can never survive.
 */
export function writeFilmsCache(
  storage: FilmsCacheStorage,
  films: FilmItem[],
  now: number = Date.now()
): WriteFilmsCacheResult {
  const serialized = JSON.stringify({ films: projectFilmsForCache(films) });
  const chars = serialized.length;

  if (chars > FILMS_CACHE_MAX_CHARS) {
    removeFilmsCacheKeys(storage);
    return { ok: false, chars, reason: 'too-large' };
  }

  try {
    storage.setItem(FILMS_CACHE_KEY, serialized);
    storage.setItem(FILMS_CACHE_TS_KEY, String(now));
    return { ok: true, chars };
  } catch (err) {
    removeFilmsCacheKeys(storage);
    const reason =
      (err as { name?: string })?.name ||
      (err instanceof Error ? err.message : String(err));
    return { ok: false, chars, reason };
  }
}

/**
 * Reads and validates the cache. Requires both keys, an integer ts whose age
 * is within FILMS_CACHE_TTL_MS, and a JSON body that parses to a non-empty
 * array of objects (bare array or { films: [...] } — legacy bare arrays stay
 * readable). Corrupt/expired/invalid entries remove both keys and yield null.
 * Every returned film carries `detailsDeferred: true`, marking it as the slim
 * projection so detail/admin flows refetch the full document.
 */
export function readFilmsCache(
  storage: FilmsCacheStorage,
  now: number = Date.now()
): { films: FilmItem[]; ts: number } | null {
  let raw: string | null = null;
  let rawTs: string | null = null;
  try {
    raw = storage.getItem(FILMS_CACHE_KEY);
    rawTs = storage.getItem(FILMS_CACHE_TS_KEY);
  } catch {
    return null;
  }
  if (!raw || !rawTs) return null;

  const ts = Number(rawTs);
  if (!Number.isInteger(ts) || ts <= 0 || now - ts > FILMS_CACHE_TTL_MS) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    removeFilmsCacheKeys(storage);
    return null;
  }

  const rawFilms: unknown[] | null = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as { films?: unknown }).films)
      ? ((parsed as { films: unknown[] }).films)
      : null;

  if (!rawFilms || rawFilms.length === 0) {
    removeFilmsCacheKeys(storage);
    return null;
  }

  if (!rawFilms.every(item => !!item && typeof item === 'object' && !Array.isArray(item))) {
    removeFilmsCacheKeys(storage);
    return null;
  }

  const films = rawFilms.map(
    film => ({ ...(film as FilmItem), detailsDeferred: true }) as FilmItem
  );
  return { films, ts };
}
