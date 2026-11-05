/**
 * Late REST fallback for the initial films/articles load.
 *
 * The Firestore SDK can leave its Listen streams pending forever inside
 * crawler renderers. After a short delay (and at most once per collection per page
 * load) this hook reads whichever collection is still empty through the
 * plain REST client, so Googlebot gets real content instead of empty states.
 */

import { useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Article, FilmItem } from '../types';
import {
  fetchCollectionViaRest,
  normalizeRestArticle,
  normalizeRestFilm,
} from '../utils/firestoreRestClient';

export type RestFallbackCollection = 'films' | 'articles';

export interface RestFallbackCounts {
  filmsCount: number;
  articlesCount: number;
}

/**
 * Both collections wait 4s so the SDK snapshot gets a chance to fill state
 * first. The REST call then only runs when the collection is still empty.
 */
const REST_FALLBACK_DELAY_MS: Record<RestFallbackCollection, number> = {
  articles: 4000,
  films: 4000,
};

/** At most one REST fallback run per collection per page load. */
const restFallbackConsumed = new Set<RestFallbackCollection>();

/**
 * Pure decision helper: returns only the collections whose current count is
 * still 0. Both counts above 0 means nothing is fetched.
 */
export function getRestFallbackTargets({
  filmsCount,
  articlesCount,
}: RestFallbackCounts): RestFallbackCollection[] {
  const targets: RestFallbackCollection[] = [];
  if (!(filmsCount > 0)) targets.push('films');
  if (!(articlesCount > 0)) targets.push('articles');
  return targets;
}

export interface UseRestDataFallbackOptions {
  filmsCount: number;
  articlesCount: number;
  setFilms: Dispatch<SetStateAction<FilmItem[]>>;
  setArticles: Dispatch<SetStateAction<Article[]>>;
  setIsLoadingFilms: Dispatch<SetStateAction<boolean>>;
  setIsLoadingArticles: Dispatch<SetStateAction<boolean>>;
}

/**
 * Runs one delayed fallback. State setters and counts are read through a ref
 * so the timer never acts on stale initial values. Results are ignored after
 * unmount and the hook never re-fetches on later renders.
 */
export function useRestDataFallback(options: UseRestDataFallbackOptions): void {
  const { filmsCount, articlesCount } = options;
  const latestRef = useRef(options);
  latestRef.current = options;

  const timersRef = useRef<Record<RestFallbackCollection, ReturnType<typeof setTimeout> | null>>({
    films: null,
    articles: null,
  });

  useEffect(() => {
    let cancelled = false;

    const runTarget = (target: RestFallbackCollection) => {
      timersRef.current[target] = null;
      if (restFallbackConsumed.has(target)) return;
      restFallbackConsumed.add(target);

      const stillEmpty = getRestFallbackTargets({
        filmsCount: latestRef.current.filmsCount,
        articlesCount: latestRef.current.articlesCount,
      }).includes(target);
      if (!stillEmpty) return;

      void (async () => {
        if (target === 'films') {
          const docs = await fetchCollectionViaRest('films');
          if (cancelled || docs.length === 0) return;

          const films = docs
            .map(normalizeRestFilm)
            .filter((film): film is FilmItem => film !== null)
            .sort((a, b) => (a.trendingRank || 99) - (b.trendingRank || 99));
          if (films.length === 0) return;

          latestRef.current.setFilms(films);
          latestRef.current.setIsLoadingFilms(false);
          return;
        }

        const docs = await fetchCollectionViaRest('articles');
        if (cancelled || docs.length === 0) return;

        const articles = normalizeRestArticle(docs);
        if (articles.length === 0) return;

        latestRef.current.setArticles(articles);
        latestRef.current.setIsLoadingArticles(false);
      })();
    };

    (Object.keys(REST_FALLBACK_DELAY_MS) as RestFallbackCollection[]).forEach(target => {
      timersRef.current[target] = setTimeout(
        () => runTarget(target),
        REST_FALLBACK_DELAY_MS[target]
      );
    });

    return () => {
      cancelled = true;
      (Object.keys(timersRef.current) as RestFallbackCollection[]).forEach(target => {
        const timer = timersRef.current[target];
        if (timer) clearTimeout(timer);
        timersRef.current[target] = null;
      });
    };
  }, []);

  // Cancel a pending fallback as soon as the SDK snapshot fills the collection,
  // so we never issue a redundant REST read after the real data arrives.
  useEffect(() => {
    (Object.keys(timersRef.current) as RestFallbackCollection[]).forEach(target => {
      const isFilled = target === 'films' ? filmsCount > 0 : articlesCount > 0;
      if (!isFilled) return;
      const timer = timersRef.current[target];
      if (timer) clearTimeout(timer);
      timersRef.current[target] = null;
    });
  }, [filmsCount, articlesCount]);
}
