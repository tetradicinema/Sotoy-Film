import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Bookmark,
  Camera,
  Star,
  Clock,
  ArrowRight,
  PenSquare,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useDynamicArticleAuthor } from '../../hooks/useDynamicArticleAuthor';
import { GEAR_ADDICT_ITEMS, INITIAL_ARTICLES } from '../../data/mockData';
import { resolveConfigFilms, resolveConfigArticles } from '../../utils/homepageConfigHelper';

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
        </span>
        {author.customBadge && (
          <span className="text-[10px] text-white font-medium">
            · {author.customBadge}
          </span>
        )}
      </div>
    </div>
  );
};

export const HeroSection: React.FC = () => {
  const { publishedArticles, films, navigateTo, currentUser, isLoggedIn, homepageSectionsConfig } = useApp();

  // Ensure article pool is never completely empty
  const articlesPool = publishedArticles.length > 0 ? publishedArticles : INITIAL_ARTICLES;

  // Trending articles for the main hero slider (sorted by popularity / heroSlider flag)
  const trendingArticles = useMemo(() => {
    return [...articlesPool]
      .sort((a, b) => {
        if (a.heroSlider && !b.heroSlider) return -1;
        if (!a.heroSlider && b.heroSlider) return 1;
        return (b.likes || 0) - (a.likes || 0);
      })
      .slice(0, 6);
  }, [articlesPool]);

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
  const [activeTab, setActiveTab] = useState<'trending' | 'to-watch' | 'gear-addict'>('trending');

  // Auto slide
  useEffect(() => {
    if (trendingArticles.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % trendingArticles.length);
    }, 6500);
    return () => clearInterval(interval);
  }, [trendingArticles.length]);

  const safeSlide = trendingArticles.length > 0 ? currentSlide % trendingArticles.length : 0;
  const activeArticle = trendingArticles[safeSlide] || articlesPool[0] || INITIAL_ARTICLES[0];

  const handlePrevSlide = () => {
    setCurrentSlide(prev => (prev === 0 ? trendingArticles.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    setCurrentSlide(prev => (prev + 1) % trendingArticles.length);
  };

  // Default to watch recommendations
  const defaultToWatchFilms = useMemo(() => {
    return films.filter(f => f.featuredRecommendation || f.skorSotoy >= 4.5).slice(0, 5);
  }, [films]);

  // Resolved to watch films using shared homepage config or fallback
  const toWatchFilms = useMemo(() => {
    return resolveConfigFilms(
      films,
      homepageSectionsConfig?.sections?.hero_to_watch,
      defaultToWatchFilms
    );
  }, [films, homepageSectionsConfig?.sections?.hero_to_watch, defaultToWatchFilms]);

  // Default gear articles for the right sidebar tab
  const defaultGearArticles = useMemo(() => {
    return articlesPool.filter(a => a.category === 'cinema-gear').slice(0, 5);
  }, [articlesPool]);

  // Resolved gear articles using shared homepage config or fallback
  const heroGearArticles = useMemo(() => {
    return resolveConfigArticles(
      articlesPool,
      homepageSectionsConfig?.sections?.gear,
      defaultGearArticles
    );
  }, [articlesPool, homepageSectionsConfig?.sections?.gear, defaultGearArticles]);

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
            <div className="relative w-full flex-1 min-h-[460px] sm:min-h-[540px] rounded-3xl overflow-hidden border border-white/[0.08] shadow-2xl bg-[#0A0A0A] group">
              {/* Background Cover Image with cinematic pan/zoom */}
              <img
                src={activeArticle?.coverImage || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80'}
                alt={activeArticle?.title || 'Hero Article'}
                className="absolute inset-0 w-full h-full object-cover object-center transform transition-transform duration-1000 scale-100 group-hover:scale-105"
              />

              {/* Measured contrast scrim: at least 4.5:1 text contrast across entire image */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/75 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A]/90 via-[#0A0A0A]/40 to-transparent" />

              {/* Top Row: Trending Badge, Category & Reading Endorsement */}
              <div className="absolute top-5 sm:top-7 left-5 sm:left-7 right-5 sm:right-7 flex items-center justify-between z-10">
                <div className="flex items-center gap-2 text-xs text-slate-300 font-medium tracking-wide">
                  <span className="bg-[#FF2E7E] text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md shadow-[#FF2E7E]/30">
                    <Flame className="w-3 h-3 fill-current text-white" />
                    <span>Trending</span>
                  </span>
                  <span className="text-[#FF2E7E] font-bold uppercase tracking-wider text-[11px]">
                    {activeArticle?.category || 'Cinematic'}
                  </span>
                  <span className="text-slate-500" aria-hidden="true">·</span>
                  <span className="capitalize">{activeArticle?.subCategory || 'Review'}</span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-300/90 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 font-mono tabular-nums">
                  <span className="text-rose-400">♥</span>
                  <span>{(activeArticle?.likes || 0).toLocaleString()}</span>
                </div>
              </div>

              {/* Bottom Editorial Presentation */}
              <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 z-10 flex flex-col justify-end">
                {/* Author attribution & Read time */}
                <div className="flex items-center flex-wrap gap-2.5 mb-3 text-xs text-slate-300">
                  <HeroActiveAuthorBadge authorId={activeArticle?.authorId} defaultAuthor={activeArticle?.author} />
                  <span className="text-slate-500" aria-hidden="true">·</span>
                  <span className="flex items-center gap-1 text-slate-400 text-xs">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{activeArticle?.readTime || '5 mnt'}</span>
                  </span>
                  <span className="text-slate-500" aria-hidden="true">·</span>
                  <span className="text-slate-400 text-xs">{activeArticle?.publishedAt || 'Terkini'}</span>
                </div>

                {/* Primary Headline */}
                <h1
                  onClick={() => activeArticle?.id && navigateTo('article-detail', { articleId: activeArticle.id })}
                  className="font-display font-black text-2xl sm:text-3xl md:text-4xl text-white leading-tight mb-3 cursor-pointer hover:text-white transition-colors line-clamp-3 text-balance"
                >
                  {activeArticle?.title}
                </h1>

                {/* Excerpt */}
                <p className="text-slate-300 text-xs sm:text-sm line-clamp-2 max-w-2xl mb-6 leading-relaxed">
                  {activeArticle?.excerpt}
                </p>

                {/* Footer Controls & Slider Navigation */}
                <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/[0.08]">
                  <button
                    id="hero-read-article-btn"
                    onClick={() => activeArticle?.id && navigateTo('article-detail', { articleId: activeArticle.id })}
                    className="bg-[#FF2E7E] hover:bg-[#e0266e] text-white font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-[#FF2E7E]/25"
                  >
                    <span>Baca Ulasan Lengkap</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {/* Minimalist Slide Progress & Controls */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-400 tabular-nums">
                      <span className="text-white font-bold">{String(currentSlide + 1).padStart(2, '0')}</span>
                      <span>/</span>
                      <span>{String(trendingArticles.length).padStart(2, '0')}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        id="hero-slider-prev"
                        onClick={handlePrevSlide}
                        className="w-8 h-8 rounded-lg bg-black/40 hover:bg-white/10 text-white border border-white/10 flex items-center justify-center transition-colors cursor-pointer"
                        aria-label="Previous Slide"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        id="hero-slider-next"
                        onClick={handleNextSlide}
                        className="w-8 h-8 rounded-lg bg-black/40 hover:bg-white/10 text-white border border-white/10 flex items-center justify-center transition-colors cursor-pointer"
                        aria-label="Next Slide"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
                  id="hero-tab-trending"
                  onClick={() => setActiveTab('trending')}
                  className={`flex-1 min-w-[85px] py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95 ${
                    activeTab === 'trending'
                      ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/25 font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-current" />
                  <span className="truncate">{homepageSectionsConfig?.sections?.recent?.title?.trim() || 'Recent'}</span>
                </button>

                <button
                  id="hero-tab-towatch"
                  onClick={() => setActiveTab('to-watch')}
                  className={`flex-1 min-w-[85px] py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95 ${
                    activeTab === 'to-watch'
                      ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/25 font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5 text-current" />
                  <span className="truncate">{homepageSectionsConfig?.sections?.hero_to_watch?.title?.trim() || 'To Watch'}</span>
                </button>

                <button
                  id="hero-tab-gearaddict"
                  onClick={() => setActiveTab('gear-addict')}
                  className={`flex-1 min-w-[85px] py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95 ${
                    activeTab === 'gear-addict'
                      ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/25 font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5 text-current" />
                  <span className="truncate">{homepageSectionsConfig?.sections?.gear?.title?.trim() || 'Gear'}</span>
                </button>
              </div>

              {/* Tab Content 1: RECENT ARTICLES */}
              {activeTab === 'trending' && (
                <div className="flex-1 flex flex-col justify-between min-h-0">
                  <div className="divide-y divide-white/[0.06] flex-1 flex flex-col justify-start">
                    {recentArticles.map((art, index) => (
                      <div
                        key={art.id}
                        id={`recent-article-item-${art.id}`}
                        onClick={() => navigateTo('article-detail', { articleId: art.id })}
                        className="group flex items-center gap-3 py-2 px-1.5 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer"
                      >
                        {/* Tabular Index Number */}
                        <span className={`w-4 font-mono tabular-nums text-xs font-bold text-center shrink-0 ${
                          index === 0 ? 'text-[#FF2E7E]' : 'text-slate-500'
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
                          <h4 className="text-white font-semibold text-xs leading-snug line-clamp-2 group-hover:text-[#FF2E7E] transition-colors">
                            {art.title}
                          </h4>
                          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400">
                            <Clock className="w-2.5 h-2.5 text-slate-500" />
                            <span>{art.readTime}</span>
                          </div>
                        </div>

                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-transform group-hover:translate-x-0.5 shrink-0" />
                      </div>
                    ))}
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

              {/* Tab Content 2: TO WATCH */}
              {activeTab === 'to-watch' && (
                <div className="flex-1 flex flex-col justify-between min-h-0">
                  <div className="divide-y divide-white/[0.06] flex-1 flex flex-col justify-start">
                    {toWatchFilms.map(film => (
                      <div
                        key={film.id}
                        id={`towatch-film-item-${film.id}`}
                        onClick={() => navigateTo('film-detail', { filmId: film.id })}
                        className="group flex items-center gap-3 py-2 px-1.5 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer"
                      >
                        <img
                          src={film.poster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=160&q=80'}
                          alt={film.title}
                          className="w-10 h-14 object-cover rounded-lg shrink-0 border border-white/10 group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-semibold text-xs leading-snug truncate group-hover:text-[#FF2E7E] transition-colors">
                            {film.title}
                          </h4>
                          <p className="text-slate-400 text-[11px] line-clamp-1 mt-0.5">
                            {film.curatorNote || film.synopsis}
                          </p>
                          <div className="mt-1 flex items-center gap-2 text-[10px]">
                            {film.whereToWatch.slice(0, 1).map((w, idx) => (
                              <span
                                key={idx}
                                className="text-slate-300 font-medium"
                              >
                                {w.platform}
                              </span>
                            ))}
                            <span className="text-slate-600">·</span>
                            <span className="font-mono tabular-nums text-amber-400 font-semibold flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span>{film.criticsSkorSotoy ? film.criticsSkorSotoy.toFixed(1) : film.skorSotoy.toFixed(1)}</span>
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-transform group-hover:translate-x-0.5 shrink-0" />
                      </div>
                    ))}
                  </div>

                  <button
                    id="see-all-towatch-btn"
                    onClick={() => navigateTo('film-recommendations')}
                    className="w-full py-2.5 rounded-xl border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.04] text-slate-300 hover:text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-3 shrink-0"
                  >
                    <span>Buka Generator Rekomendasi Film</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#FF2E7E]" />
                  </button>
                </div>
              )}

              {/* Tab Content 3: GEAR ADDICT */}
              {activeTab === 'gear-addict' && (
                <div className="flex-1 flex flex-col justify-between min-h-0">
                  <div className="divide-y divide-white/[0.06] flex-1 flex flex-col justify-start">
                    {heroGearArticles.length > 0 ? (
                      heroGearArticles.map((art, index) => (
                        <div
                          key={art.id}
                          id={`gear-article-item-${art.id}`}
                          onClick={() => navigateTo('article-detail', { articleId: art.id })}
                          className="group flex items-center gap-3 py-2 px-1.5 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer"
                        >
                          <span className={`w-4 font-mono tabular-nums text-xs font-bold text-center shrink-0 ${
                            index === 0 ? 'text-[#FF2E7E]' : 'text-slate-500'
                          }`}>
                            {String(index + 1).padStart(2, '0')}
                          </span>

                          <img
                            src={art.coverImage || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=200&q=80'}
                            alt={art.title}
                            className="w-12 h-12 object-cover rounded-xl shrink-0 border border-white/10 group-hover:scale-105 transition-transform duration-300"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5 text-[10px]">
                              <span className="text-[#FF2E7E] font-bold uppercase tracking-wider truncate">
                                {art.subCategory || art.category}
                              </span>
                              <span className="text-slate-600">·</span>
                              <span className="text-slate-400 truncate">{art.publishedAt}</span>
                            </div>
                            <h4 className="text-white font-semibold text-xs leading-snug line-clamp-2 group-hover:text-[#FF2E7E] transition-colors">
                              {art.title}
                            </h4>
                            <div className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400">
                              <Clock className="w-2.5 h-2.5 text-slate-500" />
                              <span>{art.readTime}</span>
                            </div>
                          </div>

                          <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-transform group-hover:translate-x-0.5 shrink-0" />
                        </div>
                      ))
                    ) : (
                      GEAR_ADDICT_ITEMS.slice(0, 5).map(gear => (
                        <div
                          key={gear.id}
                          id={`gear-addict-item-${gear.id}`}
                          onClick={() => navigateTo('category', { category: 'cinema-gear' })}
                          className="group flex items-center gap-3 py-2 px-1.5 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer"
                        >
                          <img
                            src={gear.image || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=200&q=80'}
                            alt={gear.name}
                            className="w-12 h-12 object-cover rounded-xl shrink-0 border border-white/10 group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-[#FF2E7E] font-bold uppercase tracking-wider">
                                {gear.badge}
                              </span>
                              <span className="font-mono tabular-nums text-white font-semibold">
                                {gear.price}
                              </span>
                            </div>
                            <h4 className="text-white font-semibold text-xs leading-snug line-clamp-1 group-hover:text-[#FF2E7E] transition-colors mt-0.5">
                              {gear.name}
                            </h4>
                            <p className="text-slate-400 text-[10px] truncate mt-0.5">
                              {gear.sensor}
                            </p>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-transform group-hover:translate-x-0.5 shrink-0" />
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    id="see-all-gear-btn"
                    onClick={() => navigateTo('category', { category: 'cinema-gear' })}
                    className="w-full py-2.5 rounded-xl border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.04] text-slate-300 hover:text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-3 shrink-0"
                  >
                    <span>Lihat Katalog Cinema Gear</span>
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
