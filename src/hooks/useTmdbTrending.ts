import { useEffect, useState } from 'react';
import { fetchTmdbList } from '../utils/tmdbHelper';
import { TrendingEntry } from '../utils/filmSections';

/** Trending lists only change weekly, so the fetched data is cached 30 minutes. */
const TRENDING_CACHE_TTL_MS = 30 * 60 * 1000;

interface TrendingCache {
  entries: TrendingEntry[];
  fetchedAt: number;
}

/** Module-level cache shared by every component that mounts this hook. */
let trendingCache: TrendingCache | null = null;

/** Shared in-flight promise so parallel mounts trigger a single fetch pair. */
let trendingPromise: Promise<TrendingEntry[]> | null = null;

const isFresh = (cache: TrendingCache | null): boolean =>
  Boolean(cache && Date.now() - cache.fetchedAt < TRENDING_CACHE_TTL_MS);

/**
 * Keeps only valid positive integer TMDB ids and tags them with the media type
 * of the list they came from.
 */
const toEntries = (items: unknown, mediaType: 'movie' | 'tv'): TrendingEntry[] => {
  if (!Array.isArray(items)) return [];
  const entries: TrendingEntry[] = [];
  for (const item of items) {
    const id = (item as { id?: unknown })?.id;
    if (typeof id === 'number' && Number.isInteger(id) && id > 0) {
      entries.push({ id, mediaType });
    }
  }
  return entries;
};

/**
 * Interleaves the movie and tv trending lists by TMDB rank
 * (movie 1, tv 1, movie 2, tv 2, ...).
 */
const interleaveByRank = (
  movies: TrendingEntry[],
  tvEntries: TrendingEntry[]
): TrendingEntry[] => {
  const result: TrendingEntry[] = [];
  const longest = Math.max(movies.length, tvEntries.length);
  for (let i = 0; i < longest; i++) {
    if (i < movies.length) result.push(movies[i]);
    if (i < tvEntries.length) result.push(tvEntries[i]);
  }
  return result;
};

const loadTrending = async (): Promise<TrendingEntry[]> => {
  if (isFresh(trendingCache)) return trendingCache!.entries;

  if (!trendingPromise) {
    trendingPromise = (async () => {
      // Weekly trending for movies and tv, fetched in parallel. A failing list
      // only removes that half of the interleave instead of breaking the hook.
      const [movies, tvEntries] = await Promise.all([
        fetchTmdbList('trending', 'movie')
          .then(items => toEntries(items, 'movie'))
          .catch(() => [] as TrendingEntry[]),
        fetchTmdbList('trending', 'tv')
          .then(items => toEntries(items, 'tv'))
          .catch(() => [] as TrendingEntry[]),
      ]);

      const entries = interleaveByRank(movies, tvEntries);

      // Cache only non-empty results so a transient failure is retried.
      if (entries.length > 0) {
        trendingCache = { entries, fetchedAt: Date.now() };
      }

      return entries;
    })().finally(() => {
      trendingPromise = null;
    });
  }

  return trendingPromise;
};

/**
 * Fetches the TMDB weekly trending lists (movie + tv) and returns them as
 * catalog-matching entries in TMDB rank order. No fetch happens while
 * `enabled` is false.
 */
export function useTmdbTrending(enabled: boolean): TrendingEntry[] {
  const [entries, setEntries] = useState<TrendingEntry[]>(() =>
    isFresh(trendingCache) ? trendingCache!.entries : []
  );

  useEffect(() => {
    if (!enabled) return;

    let isActive = true;

    loadTrending()
      .then(result => {
        if (isActive) setEntries(result);
      })
      .catch(() => {
        // Errors already collapse to empty lists; nothing to do.
      });

    return () => {
      isActive = false;
    };
  }, [enabled]);

  return entries;
}
