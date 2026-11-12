import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Clock,
  ArrowRight,
  PenSquare,
  Sparkles,
  Star,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useDynamicArticleAuthor } from '../../hooks/useDynamicArticleAuthor';
import { DEFAULT_POSTER } from '../../data/mockData';
import { tmdbPosterSized } from '../../utils/tmdbImage';
import { resolveConfigArticles } from '../../utils/homepageConfigHelper';
import { getHeroToWatch } from '../../utils/filmSections';
import { markHeroImageSettled } from '../../utils/heroImageSignal';

const FILM_TYPE_LABELS: Record<string, string> = {
  movie: 'Movie',
  series: 'Series',
  animation: 'Animation',
};

const DEFAULT_HERO_COVER =
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80';

const getCoverUrl = (article?: { coverImage?: string } | null) =>
  article?.coverImage || DEFAULT_HERO_COVER;

const HeroActiveAuthorBadge: React.FC<{ authorId?: string; defaultAuthor?: any }> = ({ authorId, defaultAuthor }) => {
  const author = useDynamicArticleAuthor(authorId, defaultAuthor);
  const { navigateTo } = useApp();

  if (author.loading) {
    return (
      <div className="flex items-center gap-2 animate-pulse">
        <div className="w-6 h-6 rounded-full bg-slate-800 shrink-0" />
        <div className="h-3 w-20 bg-slate-800 rounded" />
      </div>
    );
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        navigateTo('user-profile', { userId: author.id });
      }}
      className="flex items-center gap-2.5 group/author cursor-pointer"
      title={`Kunjungi profil ${author.displayName || author.name}`}
    >
      <img
        src={author.avatarURL || author.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
        alt={author.displayName || author.name}
        className="w-6 h-6 rounded-full object-cover ring-1 ring-white/20 group-hover/author:ring-[#FF2E7E] transition-all"
      />
      <div className="flex items-center gap-2 text-xs text-slate-300">
        <span className="font-semibold text-white group-hover/author:text-[#FF2E7E] transition-colors truncate max-w-[140px] sm:max-w-none">
          {author.displayName || author.name}
        </span>      </div>
    </div>
  );
};

export const HeroSection: React.FC = () => {
  const { films, publishedArticles, navigateTo, currentUser, isLoggedIn, homepageSectionsConfig, isLoadingArticles } = useApp();

  const articlesPool = publishedArticles;

  // Default trending articles for the main hero slider (sorted by popularity / heroSlider flag)
  const defaultSliderArticles = useMemo(() => {
    return [...articlesPool]
      .sort((a, b) => {
        if (a.heroSlider && !b.heroSlider) return -1;
        if (!a.heroSlider && b.heroSlider) return 1;
        return (b.likes || 0) - (a.likes || 0);
      })
      .slice(0, 6);
  }, [articlesPool]);

  // Main hero slider articles (configured via hero_slider or default fallback)
  const trendingArticles = useMemo(() => {
    const rawConfig = homepageSectionsConfig?.sections?.hero_slider;
    const effectiveConfig = rawConfig
      ? {
          ...rawConfig,
          sourceType: (rawConfig.sourceType === 'slider' ? 'auto' : rawConfig.sourceType) as 'auto' | 'manual',
          limit: rawConfig.limit && rawConfig.limit > 0 ? rawConfig.limit : 6,
        }
      : undefined;
    const resolved = resolveConfigArticles(
      articlesPool,
      effectiveConfig,
      defaultSliderArticles
    );
    return resolved.length > 0 ? resolved : defaultSliderArticles;
  }, [articlesPool, homepageSectionsConfig?.sections?.hero_slider, defaultSliderArticles]);

  // Default recent articles for the right sidebar tab
  const defaultRecentArticles = useMemo(() => {
    return [...articlesPool]
      .sort((a, b) => {
        const timeA = a.publishedAtTimestamp
          ? new Date(a.publishedAtTimestamp).getTime()
          : new Date(a.publishedAt || 0).getTime();
        const timeB = b.publishedAtTimestamp
          ? new Date(b.publishedAtTimestamp).getTime()
          : new Date(b.publishedAt || 0).getTime();
        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
      })
      .slice(0, 5);
  }, [articlesPool]);

  // Resolved recent articles using shared homepage config or fallback
  const recentArticles = useMemo(() => {
    const resolved = resolveConfigArticles(
      articlesPool,
      homepageSectionsConfig?.sections?.recent,
      defaultRecentArticles
    );
    return resolved.length > 0 ? resolved : articlesPool.slice(0, 5);
  }, [articlesPool, homepageSectionsConfig?.sections?.recent, defaultRecentArticles]);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeTab, setActiveTab] = useState<'to-watch' | 'film-studies' | 'recent'>('to-watch');

  // LCP gating: only the active cover is mounted first. The prev/next covers
  // mount after the active image settles and the browser is idle, or
  // immediately when the user navigates the slider.
  const [neighborsReady, setNeighborsReady] = useState(false);
  const [activeCoverSettled, setActiveCoverSettled] = useState(false);
  const [autoplayReady, setAutoplayReady] = useState(false);
  const heroSignalSentRef = useRef(false);
  const neighborsQueuedRef = useRef(false);
  const idleCallbackRef = useRef<number | null>(null);
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Cover URLs whose <img> already fired onLoad/onError (all mounted covers).
  const loadedCoverUrlsRef = useRef<Set<string>>(new Set());
  // Pending manual navigation: keep the current slide visible until the target
  // cover is ready (loaded event) or an 800 ms watchdog fires.
  const pendingSlideRef = useRef<{ index: number; token: number } | null>(null);
  const pendingSwitchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTokenRef = useRef(0);

  const cancelNeighborIdle = useCallback(() => {
    if (typeof window !== 'undefined' && idleCallbackRef.current !== null) {
      const win = window as typeof window & { cancelIdleCallback?: (handle: number) => void };
      if (typeof win.cancelIdleCallback === 'function') {
        win.cancelIdleCallback(idleCallbackRef.current);
      }
    }
    idleCallbackRef.current = null;
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = null;
    }
  }, []);

  const revealNeighborsOnIdle = useCallback(() => {
    if (neighborsQueuedRef.current) return;
    neighborsQueuedRef.current = true;

    const win = typeof window !== 'undefined'
      ? (window as typeof window & {
          requestIdleCallback?: (
            callback: () => void,
            options?: { timeout?: number }
          ) => number;
        })
      : null;

    if (win && typeof win.requestIdleCallback === 'function') {
      idleCallbackRef.current = win.requestIdleCallback(() => {
        idleCallbackRef.current = null;
        setNeighborsReady(true);
      }, { timeout: 500 });
    } else {
      idleTimeoutRef.current = setTimeout(() => {
        idleTimeoutRef.current = null;
        setNeighborsReady(true);
      }, 500);
    }
  }, []);

  const ensureNeighborsReady = useCallback(() => {
    cancelNeighborIdle();
    neighborsQueuedRef.current = true;
    setNeighborsReady(true);
  }, [cancelNeighborIdle]);

  // First active cover settled: release the films REST signal, allow the
  // neighbours to mount on idle, and let the carousel start.
  const handleActiveCoverSettled = useCallback(() => {
    if (!heroSignalSentRef.current) {
      heroSignalSentRef.current = true;
      markHeroImageSettled();
    }
    setActiveCoverSettled(true);
    setAutoplayReady(true);
    revealNeighborsOnIdle();
  }, [revealNeighborsOnIdle]);

  useEffect(() => () => cancelNeighborIdle(), [cancelNeighborIdle]);

  // Stable slide list: the REST fallback and the Firestore snapshot both refill
  // articlesPool, so trendingArticles is recomputed mid-stream and the active
  // slide would otherwise flip. Rendering only follows the list when the set of
  // resolved ids actually changes; currentSlide is kept (clamped only when the
  // list shrinks past it), never reset to the first slide.
  const trendingKey = useMemo(
    () => trendingArticles.map(article => article.id).join(','),
    [trendingArticles]
  );
  const [slideArticles, setSlideArticles] = useState(trendingArticles);
  const slideArticlesRef = useRef(slideArticles);

  useEffect(() => {
    slideArticlesRef.current = slideArticles;
  }, [slideArticles]);

  useEffect(() => {
    setSlideArticles(prev =>
      prev.map(article => article.id).join(',') === trendingKey ? prev : trendingArticles
    );
    setCurrentSlide(prev =>
      trendingArticles.length === 0 ? 0 : Math.min(prev, trendingArticles.length - 1)
    );
  }, [trendingKey, trendingArticles]);

  const safeSlide = slideArticles.length > 0 ? currentSlide % slideArticles.length : 0;
  const safeSlideRef = useRef(safeSlide);
  const activeArticle = (slideArticles.length > 0 ? slideArticles[safeSlide] : null) || articlesPool[0] || null;

  useEffect(() => {
    safeSlideRef.current = safeSlide;
  }, [safeSlide]);

  // Keep the ref in sync with state updates from clicks/autoplay so a newer
  // click computes its target from the slide that is actually committed.
  const goToSlide = useCallback((index: number) => {
    const list = slideArticlesRef.current;
    const next = list.length > 0
      ? ((index % list.length) + list.length) % list.length
      : 0;
    safeSlideRef.current = next;
    setCurrentSlide(next);
  }, []);

  const clearPendingSwitch = useCallback(() => {
    if (pendingSwitchTimerRef.current) {
      clearTimeout(pendingSwitchTimerRef.current);
      pendingSwitchTimerRef.current = null;
    }
    pendingSlideRef.current = null;
  }, []);

  useEffect(() => () => clearPendingSwitch(), [clearPendingSwitch]);

  // Commit a pending manual navigation only while its token is still current,
  // so a newer click always overrides an older pending switch.
  const commitPendingSwitch = useCallback((index: number, token: number) => {
    const pending = pendingSlideRef.current;
    if (!pending || pending.token !== token) return;
    clearPendingSwitch();
    goToSlide(index);
  }, [clearPendingSwitch, goToSlide]);

  // Track every mounted cover, not only the active one, so autoplay and the
  // manual watchdog know whether the next/target cover is ready.
  const registerCoverLoaded = useCallback((article: { coverImage?: string } | null | undefined) => {
    const url = getCoverUrl(article);
    loadedCoverUrlsRef.current.add(url);

    const pending = pendingSlideRef.current;
    if (!pending) return;
    const target = slideArticlesRef.current[pending.index];
    if (target && getCoverUrl(target) === url) {
      commitPendingSwitch(pending.index, pending.token);
    }
  }, [commitPendingSwitch]);

  // Auto slide starts only after the first active cover has loaded (or the
  // guard below fires), so the carousel cannot move the LCP candidate while
  // the first cover is still downloading.
  //
  // On every 6.5 s tick the next cover must already be in the loaded set.
  // If it is not, that tick is skipped and re-checked every 500 ms; after
  // 3 s of waiting the slider advances anyway so it can never get stuck.
  useEffect(() => {
    if (!autoplayReady) return;
    if (slideArticles.length <= 1) return;

    let waitPoll: ReturnType<typeof setInterval> | null = null;
    let waitDeadline: ReturnType<typeof setTimeout> | null = null;

    const clearWait = () => {
      if (waitPoll) {
        clearInterval(waitPoll);
        waitPoll = null;
      }
      if (waitDeadline) {
        clearTimeout(waitDeadline);
        waitDeadline = null;
      }
    };

    const isNextCoverLoaded = () => {
      const list = slideArticlesRef.current;
      if (list.length <= 1) return true;
      const index = safeSlideRef.current % list.length;
      return loadedCoverUrlsRef.current.has(getCoverUrl(list[(index + 1) % list.length]));
    };

    const advance = () => {
      // A pending manual switch owns the next transition.
      if (pendingSlideRef.current) return;
      const list = slideArticlesRef.current;
      if (list.length <= 1) return;
      goToSlide((safeSlideRef.current + 1) % list.length);
    };

    const tick = () => {
      if (pendingSlideRef.current) return;
      if (isNextCoverLoaded()) {
        advance();
        return;
      }

      clearWait();
      waitPoll = setInterval(() => {
        if (pendingSlideRef.current) {
          clearWait();
          return;
        }
        if (isNextCoverLoaded()) {
          clearWait();
          advance();
        }
      }, 500);
      waitDeadline = setTimeout(() => {
        clearWait();
        if (pendingSlideRef.current) return;
        advance();
      }, 3000);
    };

    const interval = setInterval(tick, 6500);
    return () => {
      clearInterval(interval);
      clearWait();
    };
  }, [autoplayReady, safeSlide, slideArticles.length, goToSlide]);

  // If no load/error ever fires (blocked image, crawler renderer), do not block
  // the carousel forever.
  const activeArticleId = activeArticle?.id;
  useEffect(() => {
    if (autoplayReady) return;
    if (!activeArticleId) return;
    if (slideArticles.length <= 1) return;
    const timer = setTimeout(() => setAutoplayReady(true), 3000);
    return () => clearTimeout(timer);
  }, [autoplayReady, activeArticleId, slideArticles.length]);

  const nextSlideIndex = slideArticles.length > 1
    ? (safeSlide + 1) % slideArticles.length
    : -1;

  // Crossfade layers: previous, active and next only (by index, wrapping).
  // Until the active cover settles only the active layer is rendered.
  const visibleSlides = useMemo(() => {
    const total = slideArticles.length;
    if (total === 0) return activeArticle ? [{ article: activeArticle, index: 0 }] : [];
    if (total === 1) return [{ article: slideArticles[0], index: 0 }];
    if (total === 2) {
      return [0, 1].map(offset => {
        const index = (safeSlide + offset) % total;
        return { article: slideArticles[index], index };
      });
    }
    return [-1, 0, 1].map(offset => {
      const index = (safeSlide + offset + total) % total;
      return { article: slideArticles[index], index };
    });
  }, [slideArticles, safeSlide, activeArticle]);

  // Warm the next slide's cover only after the active one settled, and only
  // when the browser is idle. Skipped entirely when the user asked to save
  // data.
  useEffect(() => {
    if (!activeCoverSettled) return;
    if (nextSlideIndex < 0) return;
    const nextCover = slideArticles[nextSlideIndex]?.coverImage;
    if (!nextCover) return;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData) return;

    const loadNextCover = () => {
      const img = new Image();
      img.decoding = 'async';
      img.src = nextCover;
    };

    const win = window as typeof window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    let idleHandle: number | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (typeof win.requestIdleCallback === 'function') {
      idleHandle = win.requestIdleCallback(loadNextCover, { timeout: 1500 });
    } else {
      timer = setTimeout(loadNextCover, 1500);
    }

    return () => {
      if (idleHandle !== null && typeof win.cancelIdleCallback === 'function') {
        win.cancelIdleCallback(idleHandle);
      }
      if (timer) clearTimeout(timer);
    };
  }, [activeCoverSettled, nextSlideIndex, slideArticles]);

  const requestManualSlide = useCallback((direction: 'prev' | 'next') => {
    // Mount the target cover immediately; prev/next are part of visibleSlides.
    ensureNeighborsReady();

    const list = slideArticlesRef.current;
    if (list.length <= 1) return;

    const base = safeSlideRef.current % list.length;
    const targetIndex = direction === 'next'
      ? (base + 1) % list.length
      : (base === 0 ? list.length - 1 : base - 1);
    const targetUrl = getCoverUrl(list[targetIndex]);

    // A newer click always cancels the pending switch and its watchdog.
    if (pendingSwitchTimerRef.current) {
      clearTimeout(pendingSwitchTimerRef.current);
      pendingSwitchTimerRef.current = null;
    }
    pendingSlideRef.current = null;
    const token = pendingTokenRef.current + 1;
    pendingTokenRef.current = token;

    if (loadedCoverUrlsRef.current.has(targetUrl)) {
      goToSlide(targetIndex);
      return;
    }

    // Keep the current slide visible until the target cover fires
    // onLoad/onError, or switch after 800 ms at most. Buttons stay usable.
    pendingSlideRef.current = { index: targetIndex, token };
    pendingSwitchTimerRef.current = setTimeout(() => {
      const pending = pendingSlideRef.current;
      if (!pending || pending.token !== token) return;
      pendingSlideRef.current = null;
      pendingSwitchTimerRef.current = null;
      goToSlide(targetIndex);
    }, 800);
  }, [ensureNeighborsReady, goToSlide]);

  const handlePrevSlide = () => requestManualSlide('prev');
  const handleNextSlide = () => requestManualSlide('next');

  // Hero "To Watch" tab: editorial film picks (featured first, then score)
  const heroToWatchFilms = useMemo(
    () => getHeroToWatch(films, homepageSectionsConfig?.sections?.hero_to_watch),
    [films, homepageSectionsConfig?.sections?.hero_to_watch]
  );

  // Default Film Studies articles for the right sidebar tab (newest first, max 5)
  const defaultFilmStudiesArticles = useMemo(() => {
    return articlesPool
      .filter(a => a.category === 'film-studies')
      .sort((a, b) => {
        const timeA = a.publishedAtTimestamp
          ? new Date(a.publishedAtTimestamp).getTime()
          : new Date(a.publishedAt || 0).getTime();
        const timeB = b.publishedAtTimestamp
          ? new Date(b.publishedAtTimestamp).getTime()
          : new Date(b.publishedAt || 0).getTime();
        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
      })
      .slice(0, 5);
  }, [articlesPool]);

  // Resolved Film Studies articles using shared homepage config or fallback
  const filmStudiesArticles = useMemo(() => {
    const resolved = resolveConfigArticles(
      articlesPool,
      homepageSectionsConfig?.sections?.hero_film_studies,
      defaultFilmStudiesArticles
    );
    return resolved.length > 0 ? resolved : defaultFilmStudiesArticles;
  }, [articlesPool, homepageSectionsConfig?.sections?.hero_film_studies, defaultFilmStudiesArticles]);

  const toWatchTitle =
    homepageSectionsConfig?.sections?.hero_to_watch?.title?.trim() || 'To Watch';
  const filmStudiesTitle =
    homepageSectionsConfig?.sections?.hero_film_studies?.title?.trim() || 'Film Studies';
  const recentTitle =
    homepageSectionsConfig?.sections?.recent?.title?.trim() || 'Recent';

  return (
    <section id="home-hero-section" className="relative pt-4 sm:pt-6 pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Editorial Action Strip for Penulis & Admin */}
        {isLoggedIn && (currentUser.role === 'penulis_sotoy' || currentUser.role === 'admin') && (
          <div
            id="author-editorial-quick-banner"
            className="mb-5 sm:mb-6 bg-[#171717]/90 border border-white/[0.08] rounded-2xl p-3.5 sm:p-4 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              <img
                src={currentUser.avatar?.trim() || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                alt={currentUser.name}
                className="w-9 h-9 rounded-full object-cover ring-1 ring-[#FF2E7E]/40 shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-white font-semibold truncate">
                    {currentUser.name}
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="text-[#FF2E7E] font-medium text-[11px] uppercase tracking-wider">
                    {currentUser.role === 'admin' ? 'Pemimpin Redaksi' : 'Penulis Redaksi'}
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Publikasikan liputan festival, ulasan teknis sinema, atau hot take terkini.
                </p>
              </div>
            </div>

            <button
              id="quick-write-article-hero-btn"
              onClick={() => navigateTo('write-article')}
              className="w-full sm:w-auto px-4 py-2 bg-[#FF2E7E] hover:bg-[#e0266e] text-white font-semibold text-xs rounded-xl shadow-lg shadow-[#FF2E7E]/20 active:scale-95 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <PenSquare className="w-3.5 h-3.5" />
              <span>Tulis Artikel Baru</span>
            </button>
          </div>
        )}

        {/* Master 2-Column Hero: 8-Column Cinematic Showcase + 4-Column Curated Tangga */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* LEFT: CINEMATIC COVER SLIDER (8 Columns - Trending Articles) */}
          <div className="lg:col-span-8 flex flex-col">
            {!activeArticle ? (
              <div className="relative w-full flex-1 min-h-[420px] sm:min-h-[480px] lg:min-h-[510px] rounded-3xl overflow-hidden border border-white/[0.08] bg-[#0A0A0A] flex items-center justify-center p-8 shadow-2xl">
                {isLoadingArticles ? (
                  <div className="w-full h-full flex flex-col justify-end p-6 space-y-4 animate-pulse">
                    <div className="h-4 w-32 bg-white/10 rounded" />
                    <div className="h-8 w-3/4 bg-white/10 rounded" />
                    <div className="h-4 w-1/2 bg-white/10 rounded" />
                  </div>
                ) : (
                  <div className="text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/10 text-slate-400 mx-auto flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-[#FF2E7E]" />
                    </div>
                    <p className="text-sm font-semibold text-white">Belum ada artikel</p>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      Artikel kurasi redaksi akan tampil di slider ini setelah dipublikasikan.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative w-full flex-1 min-h-[420px] sm:min-h-[480px] lg:min-h-[510px] rounded-3xl overflow-hidden border border-white/[0.08] shadow-2xl bg-[#0A0A0A] group">
                {/* Background Cover Image with cinematic pan/zoom (prev/active/next crossfade) */}
                {visibleSlides
                  .filter(({ index }) => neighborsReady || index === safeSlide)
                  .map(({ article, index }) => (
                    <img
                      key={article.id || `hero-slide-${index}`}
                      src={getCoverUrl(article)}
                      alt={index === safeSlide ? (article.title || 'Hero Article') : ''}
                      fetchPriority={index === safeSlide ? 'high' : undefined}
                      decoding="async"
                      loading={index === safeSlide ? undefined : 'eager'}
                      aria-hidden={index === safeSlide ? undefined : true}
                      onLoad={() => {
                        registerCoverLoaded(article);
                        if (index === safeSlide) handleActiveCoverSettled();
                      }}
                      onError={() => {
                        registerCoverLoaded(article);
                        if (index === safeSlide) handleActiveCoverSettled();
                      }}
                      className={`absolute inset-0 w-full h-full object-cover object-center ease-out duration-500 ${index === safeSlide ? 'opacity-100 transition-[opacity,transform,scale] group-hover:scale-105' : 'opacity-0 pointer-events-none transition-opacity'}`}
                    />
                  ))}

                {/* Refined contrast scrims: clearer image visibility while keeping text perfectly legible */}
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 via-45% to-transparent pointer-events-none" />

                {/* Top Row: Trending Badge, Category & Reading Endorsement */}
                <div className="absolute top-4 sm:top-6 left-4 sm:left-6 right-4 sm:right-6 flex items-center justify-between z-10">
                  <div className="flex items-center gap-2 text-xs text-slate-300 font-medium tracking-wide">
                    <span className="bg-[#D81B60] text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md shadow-[#FF2E7E]/30">
                      <Flame className="w-3 h-3 fill-current text-white" />
                      <span>Trending</span>
                    </span>
                    <span className="text-[#FF2E7E] font-bold uppercase tracking-wider text-[11px]">
                      {activeArticle.category || 'Cinematic'}
                    </span>
                    <span className="text-slate-500" aria-hidden="true">·</span>
                    <span className="capitalize">{activeArticle.subCategory || 'Review'}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-300/90 bg-black/60 px-3 py-1 rounded-full border border-white/10 font-mono tabular-nums">
                    <span className="text-rose-400">♥</span>
                    <span>{(activeArticle.likes || 0).toLocaleString()}</span>
                  </div>
                </div>

                {/* Bottom Editorial Presentation (Compact & clean layout) */}
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 lg:p-7 z-10 flex flex-col justify-end">
                  {/* Author attribution & Read time */}
                  <div className="flex items-center flex-wrap gap-2 mb-2 text-xs text-slate-300">
                    <HeroActiveAuthorBadge authorId={activeArticle.authorId} defaultAuthor={activeArticle.author} />
                    <span className="text-slate-500" aria-hidden="true">·</span>
                    <span className="flex items-center gap-1 text-slate-300 text-[11px]">
                      <Clock className="w-3 h-3 text-[#FF2E7E]" />
                      <span>{activeArticle.readTime || '5 mnt'}</span>
                    </span>
                    <span className="text-slate-500" aria-hidden="true">·</span>
                    <span className="text-slate-400 text-[11px]">{activeArticle.publishedAt || 'Terkini'}</span>
                  </div>

                  {/* Primary Headline */}
                  <h1
                    onClick={() => activeArticle.id && navigateTo('article-detail', { articleId: activeArticle.id })}
                    className="font-display font-black text-xl sm:text-2xl lg:text-3xl text-white leading-snug mb-2 cursor-pointer hover:text-[#FF2E7E] transition-colors line-clamp-2 text-balance drop-shadow-md"
                  >
                    {activeArticle.title}
                  </h1>

                  {/* Excerpt */}
                  <p className="text-slate-200/90 text-xs sm:text-sm line-clamp-2 max-w-xl mb-3 sm:mb-4 leading-relaxed drop-shadow-sm">
                    {activeArticle.excerpt}
                  </p>

                  {/* Footer Controls & Slider Navigation */}
                  <div className="flex items-center justify-between gap-4 pt-3 border-t border-white/10">
                    <button
                      id="hero-read-article-btn"
                      onClick={() => activeArticle.id && navigateTo('article-detail', { articleId: activeArticle.id })}
                      className="bg-[#D81B60] hover:bg-[#B5174F] text-white font-semibold text-xs sm:text-sm px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-[#FF2E7E]/25 cursor-pointer"
                    >
                      <span>Baca Ulasan Lengkap</span>
                      <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>

                    {/* Minimalist Slide Progress & Controls */}
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300 tabular-nums">
                        <span className="text-white font-bold">{String(safeSlide + 1).padStart(2, '0')}</span>
                        <span className="text-slate-500">/</span>
                        <span className="text-slate-400">{String(slideArticles.length || 1).padStart(2, '0')}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          id="hero-slider-prev"
                          onClick={handlePrevSlide}
                          className="w-8 h-8 rounded-lg bg-black/50 hover:bg-white/15 text-white border border-white/10 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                          aria-label="Previous Slide"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          id="hero-slider-next"
                          onClick={handleNextSlide}
                          className="w-8 h-8 rounded-lg bg-black/50 hover:bg-white/15 text-white border border-white/10 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                          aria-label="Next Slide"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: CURATED TANGGA & SELEKSI SINEMA (4 Columns) */}
          <div className="lg:col-span-4 flex flex-col">
            <div className="bg-[#171717] border border-white/[0.08] rounded-3xl p-4 sm:p-5 flex-1 flex flex-col shadow-xl">
              
              {/* Segmented Control Filter Tabs */}
              <div
                className="flex items-center p-1 bg-black/40 rounded-xl border border-white/[0.06] mb-3 overflow-x-auto scrollbar-none flex-nowrap scroll-smooth touch-pan-x"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                <button
                  id="hero-tab-towatch"
                  onClick={() => setActiveTab('to-watch')}
                  className={`flex-1 min-w-[85px] py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center shrink-0 cursor-pointer active:scale-95 ${
                    activeTab === 'to-watch'
                      ? 'bg-[#D81B60] text-white shadow-md shadow-[#FF2E7E]/25 font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="truncate">{toWatchTitle}</span>
                </button>

                <button
                  id="hero-tab-trending"
                  onClick={() => setActiveTab('recent')}
                  className={`flex-1 min-w-[85px] py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center shrink-0 cursor-pointer active:scale-95 ${
                    activeTab === 'recent'
                      ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/25 font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="truncate">{recentTitle}</span>
                </button>

                <button
                  id="hero-tab-filmstudies"
                  onClick={() => setActiveTab('film-studies')}
                  className={`flex-1 min-w-[85px] py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center shrink-0 cursor-pointer active:scale-95 ${
                    activeTab === 'film-studies'
                      ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/25 font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="truncate">{filmStudiesTitle}</span>
                </button>
              </div>

              {/* Tab Content 1: TO WATCH (FILMS) */}
              {activeTab === 'to-watch' && (
                <div className="flex-1 flex flex-col justify-between min-h-0">
                  <div className="divide-y divide-white/[0.06] flex-1 flex flex-col justify-start">
                    {heroToWatchFilms.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-500">
                        Belum ada rekomendasi film.
                      </div>
                    ) : (
                      heroToWatchFilms.map((film, index) => (
                        <div
                          key={film.id}
                          id={`towatch-film-item-${film.id}`}
                          onClick={() => navigateTo('film-detail', { filmId: film.id })}
                          className="group flex items-center gap-3 py-2 px-1.5 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer"
                        >
                          {/* Tabular Index Number */}
                          <span className={`w-4 font-mono tabular-nums text-xs font-bold text-center shrink-0 ${
                            index === 0 ? 'text-[#FF2E7E]' : 'text-slate-400'
                          }`}>
                            {String(index + 1).padStart(2, '0')}
                          </span>

                          {/* Film Poster */}
                          <img
                            src={tmdbPosterSized(film.poster?.trim() || DEFAULT_POSTER, 'w185')}
                            alt={film.title}
                            className="w-12 h-16 object-cover rounded-lg shrink-0 border border-white/10 group-hover:scale-105 transition-transform duration-300"
                          />

                          {/* Metadata */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-semibold text-xs leading-snug line-clamp-2 group-hover:text-[#FF2E7E] transition-colors">
                              {film.title}
                            </h3>
                            <div className="mt-0.5 text-[10px] text-slate-400 truncate">
                              <span>{film.year}</span>
                              <span className="text-slate-600"> · </span>
                              <span>{FILM_TYPE_LABELS[film.type] || film.type}</span>
                              {film.genres.length > 0 && (
                                <>
                                  <span className="text-slate-600"> · </span>
                                  <span>{film.genres.slice(0, 2).join(', ')}</span>
                                </>
                              )}
                            </div>
                            {Number(film.skorSotoy) > 0 && (
                              <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                                <Star className="w-2.5 h-2.5 fill-[#FFD000] text-[#FFD000]" />
                                <span className="font-mono tabular-nums text-slate-300">
                                  {film.skorSotoy.toFixed(1)}
                                </span>
                              </div>
                            )}
                          </div>

                          <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-transform group-hover:translate-x-0.5 shrink-0" />
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    id="see-all-towatch-btn"
                    onClick={() => navigateTo('film-database')}
                    className="w-full py-2.5 rounded-xl border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.04] text-slate-300 hover:text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-3 shrink-0"
                  >
                    <span>Jelajahi Film Database</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#FF2E7E]" />
                  </button>
                </div>
              )}

              {/* Tab Content 2: RECENT ARTICLES */}
              {activeTab === 'recent' && (
                <div className="flex-1 flex flex-col justify-between min-h-0">
                  <div className="divide-y divide-white/[0.06] flex-1 flex flex-col justify-start">
                    {recentArticles.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-500">
                        Belum ada artikel terbaru.
                      </div>
                    ) : (
                      recentArticles.map((art, index) => (
                        <div
                          key={art.id}
                          id={`recent-article-item-${art.id}`}
                          onClick={() => navigateTo('article-detail', { articleId: art.id })}
                          className="group flex items-center gap-3 py-2 px-1.5 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer"
                        >
                          {/* Tabular Index Number */}
                          <span className={`w-4 font-mono tabular-nums text-xs font-bold text-center shrink-0 ${
                            index === 0 ? 'text-[#FF2E7E]' : 'text-slate-400'
                          }`}>
                            {String(index + 1).padStart(2, '0')}
                          </span>

                          {/* Poster/Cover */}
                          <img
                            src={art.coverImage || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=200&q=80'}
                            alt={art.title}
                            className="w-12 h-12 object-cover rounded-xl shrink-0 border border-white/10 group-hover:scale-105 transition-transform duration-300"
                          />

                          {/* Metadata */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5 text-[10px]">
                              <span className="text-[#FF2E7E] font-bold uppercase tracking-wider truncate">
                                {art.category}
                              </span>
                              <span className="text-slate-600">·</span>
                              <span className="text-slate-400 truncate">{art.publishedAt}</span>
                            </div>
                            <h3 className="text-white font-semibold text-xs leading-snug line-clamp-2 group-hover:text-[#FF2E7E] transition-colors">
                              {art.title}
                            </h3>
                            <div className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400">
                              <Clock className="w-2.5 h-2.5 text-slate-500" />
                              <span>{art.readTime}</span>
                            </div>
                          </div>

                          <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-transform group-hover:translate-x-0.5 shrink-0" />
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    id="see-all-trending-btn"
                    onClick={() => navigateTo('category', { category: 'movies' })}
                    className="w-full py-2.5 rounded-xl border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.04] text-slate-300 hover:text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-3 shrink-0"
                  >
                    <span>Jelajahi Semua Artikel Terbaru</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#FF2E7E]" />
                  </button>
                </div>
              )}

              {/* Tab Content 3: FILM STUDIES (ARTICLES) */}
              {activeTab === 'film-studies' && (
                <div className="flex-1 flex flex-col justify-between min-h-0">
                  <div className="divide-y divide-white/[0.06] flex-1 flex flex-col justify-start">
                    {filmStudiesArticles.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-500">
                        Belum ada artikel Film Studies.
                      </div>
                    ) : (
                      filmStudiesArticles.map((art, index) => (
                        <div
                          key={art.id}
                          id={`filmstudies-article-item-${art.id}`}
                          onClick={() => navigateTo('article-detail', { articleId: art.id })}
                          className="group flex items-center gap-3 py-2 px-1.5 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer"
                        >
                          {/* Tabular Index Number */}
                          <span className={`w-4 font-mono tabular-nums text-xs font-bold text-center shrink-0 ${
                            index === 0 ? 'text-[#FF2E7E]' : 'text-slate-400'
                          }`}>
                            {String(index + 1).padStart(2, '0')}
                          </span>

                          {/* Poster/Cover */}
                          <img
                            src={art.coverImage || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=200&q=80'}
                            alt={art.title}
                            className="w-12 h-12 object-cover rounded-xl shrink-0 border border-white/10 group-hover:scale-105 transition-transform duration-300"
                          />

                          {/* Metadata */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5 text-[10px]">
                              <span className="text-[#FF2E7E] font-bold uppercase tracking-wider truncate">
                                {art.category}
                              </span>
                              <span className="text-slate-600">·</span>
                              <span className="text-slate-400 truncate">{art.publishedAt}</span>
                            </div>
                            <h3 className="text-white font-semibold text-xs leading-snug line-clamp-2 group-hover:text-[#FF2E7E] transition-colors">
                              {art.title}
                            </h3>
                            <div className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400">
                              <Clock className="w-2.5 h-2.5 text-slate-500" />
                              <span>{art.readTime}</span>
                            </div>
                          </div>

                          <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-transform group-hover:translate-x-0.5 shrink-0" />
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    id="see-all-filmstudies-btn"
                    onClick={() => navigateTo('category', { category: 'film-studies' })}
                    className="w-full py-2.5 rounded-xl border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.04] text-slate-300 hover:text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-3 shrink-0"
                  >
                    <span>Jelajahi Film Studies</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#FF2E7E]" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
