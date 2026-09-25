import React, { useState, useEffect } from 'react';
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
import { GEAR_ADDICT_ITEMS } from '../../data/mockData';

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
        src={author.avatarURL || author.avatar}
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
  const { publishedArticles, films, navigateTo, currentUser, isLoggedIn } = useApp();

  // Filter hero slider articles
  const sliderArticles = publishedArticles.filter(a => a.heroSlider);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeTab, setActiveTab] = useState<'trending' | 'to-watch' | 'gear-addict'>('trending');

  // Auto slide
  useEffect(() => {
    if (sliderArticles.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % sliderArticles.length);
    }, 6500);
    return () => clearInterval(interval);
  }, [sliderArticles.length]);

  const activeArticle = sliderArticles[currentSlide] || publishedArticles[0];

  if (publishedArticles.length === 0 || !activeArticle) {
    return (
      <section id="home-hero-section" className="relative pt-6 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-8">
              <div className="animate-pulse w-full min-h-[480px] rounded-3xl border border-white/[0.06] bg-[#171A1F] flex items-center justify-center">
                <div className="text-center space-y-3">
                  <div className="w-8 h-8 border-2 border-[#FF2E7E] border-t-transparent rounded-full animate-spin mx-auto" />
                  <span className="text-slate-400 text-xs font-medium">Memuat Ulasan Headline...</span>
                </div>
              </div>
            </div>
            <div className="lg:col-span-4">
              <div className="animate-pulse w-full h-full min-h-[480px] rounded-3xl border border-white/[0.06] bg-[#171A1F]" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  const handlePrevSlide = () => {
    setCurrentSlide(prev => (prev === 0 ? sliderArticles.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    setCurrentSlide(prev => (prev + 1) % sliderArticles.length);
  };

  // Trending films sorted by rank or score
  const trendingFilms = [...films]
    .sort((a, b) => (a.trendingRank || 99) - (b.trendingRank || 99))
    .slice(0, 4);

  // To watch recommendations
  const toWatchFilms = films.filter(f => f.featuredRecommendation).slice(0, 4);

  return (
    <section id="home-hero-section" className="relative pt-4 sm:pt-6 pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Editorial Action Strip for Penulis & Admin */}
        {isLoggedIn && (currentUser.role === 'penulis_sotoy' || currentUser.role === 'admin') && (
          <div
            id="author-editorial-quick-banner"
            className="mb-5 sm:mb-6 bg-[#171A1F]/90 border border-white/[0.08] rounded-2xl p-3.5 sm:p-4 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              <img
                src={currentUser.avatar}
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
          
          {/* LEFT: CINEMATIC COVER SLIDER (8 Columns) */}
          <div className="lg:col-span-8 flex flex-col">
            <div className="relative w-full flex-1 min-h-[460px] sm:min-h-[540px] rounded-3xl overflow-hidden border border-white/[0.08] shadow-2xl bg-[#0E1013] group">
              {/* Background Cover Image with cinematic pan/zoom */}
              <img
                src={activeArticle.coverImage}
                alt={activeArticle.title}
                className="absolute inset-0 w-full h-full object-cover object-center transform transition-transform duration-1000 scale-100 group-hover:scale-105"
              />

              {/* Measured contrast scrim: at least 4.5:1 text contrast across entire image */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0E1013] via-[#0E1013]/75 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0E1013]/90 via-[#0E1013]/40 to-transparent" />

              {/* Top Row: Clean Unboxed Editorial Kicker & Reading Endorsement */}
              <div className="absolute top-5 sm:top-7 left-5 sm:left-7 right-5 sm:right-7 flex items-center justify-between z-10">
                <div className="flex items-center gap-2 text-xs text-slate-300 font-medium tracking-wide">
                  <span className="text-[#FF2E7E] font-bold uppercase tracking-wider text-[11px]">
                    {activeArticle.category}
                  </span>
                  <span className="text-slate-500" aria-hidden="true">·</span>
                  <span className="capitalize">{activeArticle.subCategory}</span>
                  <span className="hidden sm:inline text-slate-500" aria-hidden="true">·</span>
                  <span className="hidden sm:inline text-slate-400">Headline Pilihan</span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-300/90 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 font-mono tabular-nums">
                  <span className="text-rose-400">♥</span>
                  <span>{activeArticle.likes.toLocaleString()}</span>
                </div>
              </div>

              {/* Bottom Editorial Presentation */}
              <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 z-10 flex flex-col justify-end">
                {/* Author attribution & Read time */}
                <div className="flex items-center flex-wrap gap-2.5 mb-3 text-xs text-slate-300">
                  <HeroActiveAuthorBadge authorId={activeArticle.authorId} defaultAuthor={activeArticle.author} />
                  <span className="text-slate-500" aria-hidden="true">·</span>
                  <span className="flex items-center gap-1 text-slate-400 text-xs">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{activeArticle.readTime}</span>
                  </span>
                  <span className="text-slate-500" aria-hidden="true">·</span>
                  <span className="text-slate-400 text-xs">{activeArticle.publishedAt}</span>
                </div>

                {/* Primary Headline */}
                <h1
                  onClick={() => navigateTo('article-detail', { articleId: activeArticle.id })}
                  className="font-display font-black text-2xl sm:text-3xl md:text-4xl text-white leading-tight mb-3 cursor-pointer hover:text-white transition-colors line-clamp-3 text-balance"
                >
                  {activeArticle.title}
                </h1>

                {/* Excerpt */}
                <p className="text-slate-300 text-xs sm:text-sm line-clamp-2 max-w-2xl mb-6 leading-relaxed">
                  {activeArticle.excerpt}
                </p>

                {/* Footer Controls & Slider Navigation */}
                <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/[0.08]">
                  <button
                    id="hero-read-article-btn"
                    onClick={() => navigateTo('article-detail', { articleId: activeArticle.id })}
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
                      <span>{String(sliderArticles.length).padStart(2, '0')}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        id="hero-slider-prev"
                        onClick={handlePrevSlide}
                        className="w-8 h-8 rounded-lg bg-black/40 hover:bg-white/10 text-white border border-white/10 flex items-center justify-center transition-colors"
                        aria-label="Previous Slide"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        id="hero-slider-next"
                        onClick={handleNextSlide}
                        className="w-8 h-8 rounded-lg bg-black/40 hover:bg-white/10 text-white border border-white/10 flex items-center justify-center transition-colors"
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
            <div className="bg-[#171A1F] border border-white/[0.08] rounded-3xl p-5 flex-1 flex flex-col shadow-xl">
              
              {/* Segmented Control Filter Tabs */}
              <div className="flex items-center p-1 bg-black/40 rounded-xl border border-white/[0.06] mb-4">
                <button
                  id="hero-tab-trending"
                  onClick={() => setActiveTab('trending')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'trending'
                      ? 'bg-white/[0.12] text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-[#FF2E7E]" />
                  <span>Trending</span>
                </button>

                <button
                  id="hero-tab-towatch"
                  onClick={() => setActiveTab('to-watch')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'to-watch'
                      ? 'bg-white/[0.12] text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5 text-slate-300" />
                  <span>To Watch</span>
                </button>

                <button
                  id="hero-tab-gearaddict"
                  onClick={() => setActiveTab('gear-addict')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'gear-addict'
                      ? 'bg-white/[0.12] text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5 text-white" />
                  <span>Gear</span>
                </button>
              </div>

              {/* Tab Content 1: TRENDING */}
              {activeTab === 'trending' && (
                <div className="flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    {trendingFilms.map((film, index) => (
                      <div
                        key={film.id}
                        id={`trending-film-item-${film.id}`}
                        onClick={() => navigateTo('film-detail', { filmId: film.id })}
                        className="group flex items-center gap-3 p-2 rounded-2xl hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-all cursor-pointer"
                      >
                        {/* Tabular Rank Number */}
                        <span className={`w-6 font-mono tabular-nums text-xs font-bold text-center ${
                          index === 0 ? 'text-white' : 'text-slate-500'
                        }`}>
                          {String(index + 1).padStart(2, '0')}
                        </span>

                        {/* Poster */}
                        <img
                          src={film.poster}
                          alt={film.title}
                          className="w-10 h-14 object-cover rounded-lg shrink-0 border border-white/10 group-hover:scale-105 transition-transform"
                        />

                        {/* Metadata & Scores */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-semibold text-xs truncate group-hover:text-white transition-colors">
                            {film.title}
                          </h4>
                          <p className="text-slate-400 text-[11px] truncate mt-0.5">
                            {film.year} · {film.genres.slice(0, 2).join(', ')}
                          </p>
                          <div className="mt-1 flex items-center gap-2 text-[11px] font-mono tabular-nums">
                            <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span>{film.criticsSkorSotoy ? film.criticsSkorSotoy.toFixed(1) : film.skorSotoy.toFixed(1)}</span>
                            </span>
                            <span className="text-slate-500">·</span>
                            <span className="text-slate-400 text-[10px]">
                              Skor Sotoy {film.skorSotoy.toFixed(1)}
                            </span>
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-transform group-hover:translate-x-0.5" />
                      </div>
                    ))}
                  </div>

                  <button
                    id="see-all-trending-btn"
                    onClick={() => navigateTo('film-database')}
                    className="w-full py-2.5 rounded-xl border border-white/[0.08] hover:border-white/20 text-slate-300 hover:text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 mt-2"
                  >
                    <span>Jelajahi Tangga Skor Sotoy Lengkap</span>
                    <ArrowRight className="w-3 h-3 text-[#FF2E7E]" />
                  </button>
                </div>
              )}

              {/* Tab Content 2: TO WATCH */}
              {activeTab === 'to-watch' && (
                <div className="flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    {toWatchFilms.map(film => (
                      <div
                        key={film.id}
                        id={`towatch-film-item-${film.id}`}
                        onClick={() => navigateTo('film-detail', { filmId: film.id })}
                        className="group flex items-center gap-3 p-2 rounded-2xl hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-all cursor-pointer"
                      >
                        <img
                          src={film.poster}
                          alt={film.title}
                          className="w-10 h-14 object-cover rounded-lg shrink-0 border border-white/10 group-hover:scale-105 transition-transform"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-semibold text-xs truncate group-hover:text-white transition-colors">
                            {film.title}
                          </h4>
                          <p className="text-slate-400 text-[11px] line-clamp-1 mt-0.5">
                            {film.curatorNote || film.synopsis}
                          </p>
                          <div className="mt-1 flex items-center gap-2 text-[11px]">
                            {film.whereToWatch.slice(0, 1).map((w, idx) => (
                              <span
                                key={idx}
                                className="text-slate-300 text-[10px] font-medium"
                              >
                                {w.platform}
                              </span>
                            ))}
                            <span className="text-slate-600">·</span>
                            <span className="font-mono tabular-nums text-amber-400 text-[11px] font-semibold flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span>{film.criticsSkorSotoy ? film.criticsSkorSotoy.toFixed(1) : film.skorSotoy.toFixed(1)}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    id="see-all-towatch-btn"
                    onClick={() => navigateTo('film-recommendations')}
                    className="w-full py-2.5 rounded-xl border border-white/[0.08] hover:border-white/20 text-slate-300 hover:text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 mt-2"
                  >
                    <span>Buka Generator Rekomendasi Film</span>
                    <ArrowRight className="w-3 h-3 text-slate-300" />
                  </button>
                </div>
              )}

              {/* Tab Content 3: GEAR ADDICT */}
              {activeTab === 'gear-addict' && (
                <div className="flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    {GEAR_ADDICT_ITEMS.map(gear => (
                      <div
                        key={gear.id}
                        id={`gear-addict-item-${gear.id}`}
                        onClick={() => navigateTo('category', { category: 'cinema-gear' })}
                        className="group flex items-center gap-3 p-2 rounded-2xl hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-all cursor-pointer"
                      >
                        <img
                          src={gear.image}
                          alt={gear.name}
                          className="w-12 h-12 object-cover rounded-lg shrink-0 border border-white/10 group-hover:scale-105 transition-transform"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-white font-medium">
                              {gear.badge}
                            </span>
                            <span className="font-mono tabular-nums text-white text-[11px]">
                              {gear.price}
                            </span>
                          </div>
                          <h4 className="text-white font-semibold text-xs truncate group-hover:text-white transition-colors mt-0.5">
                            {gear.name}
                          </h4>
                          <p className="text-slate-400 text-[10px] truncate">
                            {gear.sensor}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    id="see-all-gear-btn"
                    onClick={() => navigateTo('category', { category: 'cinema-gear' })}
                    className="w-full py-2.5 rounded-xl border border-white/[0.08] hover:border-white/20 text-slate-300 hover:text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 mt-2"
                  >
                    <span>Lihat Semua Ulasan Cinema Gear</span>
                    <ArrowRight className="w-3 h-3 text-white" />
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
