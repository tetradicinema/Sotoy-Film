/**
 * REST fallback for the initial films/articles load.
 *
 * The Firestore SDK can leave its Listen streams pending forever inside
 * crawler renderers. Articles are fetched immediately through the light REST
 * projection (no bodies) so the homepage hero does not wait on the SDK. Films
 * wait for the hero cover to settle (plus an idle slot) so the catalog fetch
 * never competes with the LCP image; a hard cap keeps crawlers working when no
 * image event ever fires. If the light article fetch fails, the SDK list
 * refresh runs after 1.5s as a safety net.
 */

import { useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Article, FilmItem } from '../types';
import {
  fetchCollectionViaRest,
  normalizeRestArticle,
  normalizeRestFilm,
} from '../utils/firestoreRestClient';
import { onHeroImageSettled } from '../utils/heroImageSignal';

export type RestFallbackCollection = 'films' | 'articles';

export interface RestFallbackCounts {
  filmsCount: number;
  articlesCount: number;
}

/** Articles use the light REST projection immediately. */
const ARTICLE_REST_DELAY_MS = 0;

/** Never start the films fallback before this point after mount. */
const FILM_FALLBACK_MIN_DELAY_MS = 1500;

/** Hard cap so crawlers (no image load/error event) still receive films. */
const FILM_FALLBACK_HARD_CAP_MS = 5000;

/** How long requestIdleCallback may wait for an idle slot. */
const FILM_FALLBACK_IDLE_TIMEOUT_MS = 1500;

/** How long to wait before the SDK list refresh acts as an article fallback. */
const ARTICLE_SDK_FALLBACK_DELAY_MS = 1500;

/** At most one REST fallback run per collection per page load. */
const restFallbackConsumed = new Set<RestFallbackCollection>();

function getArticleTimestamp(article: Article): number {
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

function hasArticleBody(article: Article): boolean {
  return Boolean(article.content || article.contentJson);
}

/**
 * Merges a light REST list into the current article state.
 * - Articles missing from state are added.
 * - An older incoming article never replaces a newer one.
 * - A body-less incoming article keeps any body already in state.
 */
export function mergeArticleCollections(
  existing: ReadonlyArray<Article>,
  incoming: ReadonlyArray<Article>
): Article[] {
  const merged = new Map<string, Article>(existing.map(article => [article.id, article]));

  for (const next of incoming) {
    const current = merged.get(next.id);
    if (!current) {
      merged.set(next.id, next);
      continue;
    }

    if (getArticleTimestamp(current) > getArticleTimestamp(next)) continue;

    const combined: Article = { ...current, ...next };
    if (!hasArticleBody(next) && hasArticleBody(current)) {
      combined.content = current.content;
      combined.contentJson = current.contentJson;
      combined.contentFormat = current.contentFormat;
    }
    merged.set(next.id, combined);
  }

  return Array.from(merged.values()).sort(
    (a, b) => getArticleTimestamp(b) - getArticleTimestamp(a)
  );
}

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

export type ArticleLoadMode = 'light' | 'full';

export interface UseRestDataFallbackOptions {
  filmsCount: number;
  articlesCount: number;
  setFilms: Dispatch<SetStateAction<FilmItem[]>>;
  setArticles: Dispatch<SetStateAction<Article[]>>;
  setIsLoadingFilms: Dispatch<SetStateAction<boolean>>;
  setIsLoadingArticles: Dispatch<SetStateAction<boolean>>;
  /** 'full' skips the light REST read on editor/admin routes. Default: 'light'. */
  articlesMode?: ArticleLoadMode;
  /** SDK list refresh used only when the light article REST read fails. */
  refreshArticles: () => Promise<void>;
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
    let articleSdkFallbackTimer: ReturnType<typeof setTimeout> | null = null;
    let filmDelayTimer: ReturnType<typeof setTimeout> | null = null;
    let filmIdleHandle: number | null = null;
    const mountedAt = Date.now();

    const scheduleArticleSdkFallback = () => {
      if (cancelled || articleSdkFallbackTimer) return;
      articleSdkFallbackTimer = setTimeout(() => {
        articleSdkFallbackTimer = null;
        if (cancelled) return;
        void latestRef.current.refreshArticles();
      }, ARTICLE_SDK_FALLBACK_DELAY_MS);
    };

    const cancelFilmIdle = () => {
      const win = typeof window !== 'undefined'
        ? (window as typeof window & { cancelIdleCallback?: (handle: number) => void })
        : null;
      if (filmIdleHandle !== null && win && typeof win.cancelIdleCallback === 'function') {
        win.cancelIdleCallback(filmIdleHandle);
      }
      filmIdleHandle = null;
      if (filmDelayTimer) {
        clearTimeout(filmDelayTimer);
        filmDelayTimer = null;
      }
    };

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
        if (cancelled) return;
        if (docs.length === 0) {
          scheduleArticleSdkFallback();
          return;
        }

        const articles = normalizeRestArticle(docs);
        if (articles.length === 0) {
          scheduleArticleSdkFallback();
          return;
        }

        latestRef.current.setArticles(prev => mergeArticleCollections(prev, articles));
        latestRef.current.setIsLoadingArticles(false);
      })();
    };

    // Articles: unchanged — light REST immediately, unless a body route already
    // runs the full SDK refresh.
    if (latestRef.current.articlesMode !== 'full') {
      timersRef.current.articles = setTimeout(
        () => runTarget('articles'),
        ARTICLE_REST_DELAY_MS
      );
    }

    const triggerFilms = () => {
      if (cancelled) return;
      const capTimer = timersRef.current.films;
      if (capTimer) clearTimeout(capTimer);
      timersRef.current.films = null;
      cancelFilmIdle();
      if (latestRef.current.filmsCount > 0) return;
      runTarget('films');
    };

    // Films: earliest of (hero cover settled + idle) or the 5s hard cap, and
    // never before the 1.5s minimum.
    const scheduleFilmsAfterIdle = () => {
      if (cancelled || latestRef.current.filmsCount > 0) return;

      const runWhenIdle = () => {
        if (cancelled || latestRef.current.filmsCount > 0) return;
        const win = typeof window !== 'undefined'
          ? (window as typeof window & {
              requestIdleCallback?: (
                callback: () => void,
                options?: { timeout?: number }
              ) => number;
            })
          : null;

        if (win && typeof win.requestIdleCallback === 'function') {
          filmIdleHandle = win.requestIdleCallback(() => {
            filmIdleHandle = null;
            triggerFilms();
          }, { timeout: FILM_FALLBACK_IDLE_TIMEOUT_MS });
        } else {
          filmDelayTimer = setTimeout(triggerFilms, FILM_FALLBACK_IDLE_TIMEOUT_MS);
        }
      };

      const remainingMinDelay = Math.max(
        0,
        FILM_FALLBACK_MIN_DELAY_MS - (Date.now() - mountedAt)
      );
      if (remainingMinDelay > 0) {
        filmDelayTimer = setTimeout(runWhenIdle, remainingMinDelay);
      } else {
        runWhenIdle();
      }
    };

    timersRef.current.films = setTimeout(triggerFilms, FILM_FALLBACK_HARD_CAP_MS);
    const unsubscribeHero = onHeroImageSettled(scheduleFilmsAfterIdle);

    return () => {
      cancelled = true;
      unsubscribeHero();
      if (articleSdkFallbackTimer) clearTimeout(articleSdkFallbackTimer);
      articleSdkFallbackTimer = null;
      cancelFilmIdle();
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
