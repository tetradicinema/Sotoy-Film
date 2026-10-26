/**
 * Late REST fallback for the initial films/articles load.
 *
 * The Firestore SDK can leave its Listen streams pending forever inside
 * crawler renderers. Four seconds after mount (and at most once per page
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

const REST_FALLBACK_DELAY_MS = 4000;

/** At most one REST fallback run per page load. */
let restFallbackConsumed = false;

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
  const latestRef = useRef(options);
  latestRef.current = options;

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(() => {
      if (restFallbackConsumed) return;
      restFallbackConsumed = true;

      const targets = getRestFallbackTargets({
        filmsCount: latestRef.current.filmsCount,
        articlesCount: latestRef.current.articlesCount,
      });
      if (targets.length === 0) return;

      for (const target of targets) {
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
      }
    }, REST_FALLBACK_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);
}
