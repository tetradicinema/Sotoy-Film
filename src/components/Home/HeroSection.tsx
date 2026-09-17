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
  Sparkles,
  Layers,
  PenSquare,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StarRating } from '../Common/StarRating';
import { GEAR_ADDICT_ITEMS } from '../../data/mockData';

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
      <section id="home-hero-section" className="relative pt-6 pb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
            <div className="lg:col-span-8 flex flex-col">
              <div className="animate-pulse w-full flex-1 min-h-[420px] sm:min-h-[520px] rounded-2xl sm:rounded-3xl border border-slate-800 bg-[#121324] flex items-center justify-center">
                <div className="text-center space-y-3">
                  <div className="w-10 h-10 border-4 border-[#FF2E7E] border-t-transparent rounded-full animate-spin mx-auto" />
                  <span className="text-slate-500 font-bold block">Memuat Ulasan Headline...</span>
                </div>
              </div>
            </div>
            <div className="lg:col-span-4 flex flex-col">
              <div className="animate-pulse w-full flex-1 rounded-2xl sm:rounded-3xl border border-slate-800 bg-[#121324]" />
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
    <section id="home-hero-section" className="relative pt-6 pb-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Editorial Creator Action Banner for Penulis Sotoy & Admin */}
        {isLoggedIn && (currentUser.role === 'penulis_sotoy' || currentUser.role === 'admin') && (
          <div
            id="author-editorial-quick-banner"
            className="mb-4 sm:mb-6 bg-gradient-to-r from-[#1b122e] via-[#1a1435] to-[#121428] border border-[#FF2E7E]/40 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 animate-in fade-in slide-in-from-top-3 duration-300"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-[#FF2E7E] to-[#FFD000] p-0.5 shadow-lg shadow-[#FF2E7E]/25 shrink-0">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-full h-full object-cover rounded-[10px] sm:rounded-[14px]"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-white font-bold text-sm sm:text-base truncate">
                    Halo, {currentUser.name}!
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#FF2E7E]/20 text-[#FF2E7E] border border-[#FF2E7E]/30">
                    {currentUser.role === 'admin' ? 'Admin' : 'Penulis'}
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] sm:text-xs mt-0.5 line-clamp-1 sm:line-clamp-none">
                  Tulis berita eksklusif, analisis teknis, atau kurasi film terbaru.
                </p>
              </div>
            </div>

            <div className="w-full sm:w-auto shrink-0">
              <button
                id="quick-write-article-hero-btn"
                onClick={() => navigateTo('write-article')}
                className="w-full sm:w-auto px-4 sm:px-5 py-2.5 bg-gradient-to-r from-[#FF2E7E] via-[#FF8008] to-[#FFD000] text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-[#FF2E7E]/25 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <PenSquare className="w-4 h-4" />
                <span>+ Tulis Artikel Baru</span>
              </button>
            </div>
          </div>
        )}

        {/* Two-column grid: Big Slider on Left, Tabs on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
          
          {/* LEFT: BIG SLIDER (8 Columns) */}
          <div className="lg:col-span-8 flex flex-col">
            <div className="relative w-full flex-1 min-h-[420px] sm:min-h-[520px] rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-[#121324] group">
              {/* Background Backdrop Image */}
              <img
                src={activeArticle.coverImage}
                alt={activeArticle.title}
                className="absolute inset-0 w-full h-full object-cover object-center transform transition-transform duration-1000 scale-100 group-hover:scale-105"
              />

              {/* Gradient Overlays for optimal readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0D0E15] via-[#0D0E15]/70 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0D0E15]/90 via-[#0D0E15]/40 to-transparent" />

              {/* Top Bar on Slider: Category Tag & Skor Sotoy */}
              <div className="absolute top-3 sm:top-6 left-3 sm:left-6 right-3 sm:right-6 flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  <span className="bg-[#FF2E7E] text-white font-black text-[10px] sm:text-xs uppercase px-2.5 sm:px-3 py-1 rounded-full tracking-wider shadow-md shadow-[#FF2E7E]/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#FFD000]" />
                    <span>{activeArticle.category}</span>
                    <span className="hidden sm:inline">• {activeArticle.subCategory}</span>
                  </span>
                  <span className="hidden md:inline-block bg-black/60 backdrop-blur-md text-slate-300 text-xs px-2.5 py-1 rounded-full border border-white/10 font-medium">
                    Headline Pilihan
                  </span>
                </div>

                <div className="bg-black/80 backdrop-blur-md px-2.5 sm:px-3 py-1 rounded-full border border-pink-500/40 shadow-lg text-pink-400 text-xs font-bold flex items-center gap-1.5">
                  <span>♥ {activeArticle.likes}</span>
                </div>
              </div>

              {/* Slider Content Bottom Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-8 z-10 flex flex-col justify-end">
                {/* Author info & Read time */}
                <div className="flex items-center flex-wrap gap-2 mb-2 sm:mb-3 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <img
                      src={activeArticle.author.avatar}
                      alt={activeArticle.author.name}
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover ring-1 ring-[#FFD000]"
                    />
                    <span className="font-semibold text-white truncate max-w-[120px] sm:max-w-none">
                      {activeArticle.author.name}
                    </span>
                  </div>
                  <span className="bg-[#FF2E7E]/20 text-[#FF2E7E] text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded border border-[#FF2E7E]/30 uppercase shrink-0">
                    Penulis
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="flex items-center gap-1 text-slate-400 shrink-0 text-[11px] sm:text-xs">
                    <Clock className="w-3 h-3" />
                    {activeArticle.readTime}
                  </span>
                </div>

                {/* Main Headline */}
                <h1
                  onClick={() => navigateTo('article-detail', { articleId: activeArticle.id })}
                  className="font-display font-black text-lg sm:text-3xl md:text-4xl text-white leading-snug sm:leading-tight mb-2 sm:mb-3 cursor-pointer hover:text-[#FFD000] transition-colors line-clamp-3"
                >
                  {activeArticle.title}
                </h1>

                {/* Excerpt */}
                <p className="text-slate-300 text-xs sm:text-sm line-clamp-2 max-w-2xl mb-4 sm:mb-5 leading-relaxed">
                  {activeArticle.excerpt}
                </p>

                {/* Actions & Navigation Controls */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
                  <button
                    id="hero-read-article-btn"
                    onClick={() => navigateTo('article-detail', { articleId: activeArticle.id })}
                    className="bg-gradient-to-r from-[#FF2E7E] to-[#FFD000] text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider px-4 sm:px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-[#FF2E7E]/20 hover:brightness-110"
                  >
                    <span>Baca Ulasan Lengkap</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {/* Slider Arrows & Dots */}
                  <div className="flex items-center justify-between sm:justify-end gap-2">
                    <div className="flex items-center gap-1.5 mr-2">
                      {sliderArticles.map((_, idx) => (
                        <button
                          key={idx}
                          id={`hero-slide-dot-${idx}`}
                          onClick={() => setCurrentSlide(idx)}
                          className={`h-2 rounded-full transition-all ${
                            currentSlide === idx
                              ? 'w-6 bg-[#FFD000]'
                              : 'w-2 bg-slate-600 hover:bg-slate-400'
                          }`}
                          aria-label={`Slide ${idx + 1}`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        id="hero-slider-prev"
                        onClick={handlePrevSlide}
                        className="w-8 h-8 rounded-lg bg-black/60 hover:bg-[#FF2E7E] text-white border border-white/10 flex items-center justify-center transition-colors"
                        aria-label="Previous Slide"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        id="hero-slider-next"
                        onClick={handleNextSlide}
                        className="w-8 h-8 rounded-lg bg-black/60 hover:bg-[#FF2E7E] text-white border border-white/10 flex items-center justify-center transition-colors"
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

          {/* RIGHT: TABS COMPONENT (Trending, To Watch, Gear Addict) (4 Columns) */}
          <div className="lg:col-span-4 flex flex-col">
            <div className="bg-[#121324] border border-slate-800 rounded-3xl p-4 sm:p-5 flex-1 flex flex-col shadow-xl">
              {/* Tabs Navigation Header */}
              <div className="flex items-center bg-slate-900/90 p-1 rounded-2xl border border-slate-800 mb-4">
                <button
                  id="hero-tab-trending"
                  onClick={() => setActiveTab('trending')}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'trending'
                      ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Trending</span>
                </button>

                <button
                  id="hero-tab-towatch"
                  onClick={() => setActiveTab('to-watch')}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'to-watch'
                      ? 'bg-[#00F0FF] text-slate-950 shadow-md shadow-[#00F0FF]/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>To Watch</span>
                </button>

                <button
                  id="hero-tab-gearaddict"
                  onClick={() => setActiveTab('gear-addict')}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'gear-addict'
                      ? 'bg-[#FFD000] text-slate-950 shadow-md shadow-[#FFD000]/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Gear Addict</span>
                </button>
              </div>

              {/* Tab Content 1: TRENDING */}
              {activeTab === 'trending' && (
                <div className="flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2.5">
                    {trendingFilms.map((film, index) => (
                      <div
                        key={film.id}
                        id={`trending-film-item-${film.id}`}
                        onClick={() => navigateTo('film-detail', { filmId: film.id })}
                        className="group flex items-center gap-3 p-2.5 rounded-2xl bg-slate-900/50 hover:bg-slate-800/80 border border-slate-800/70 hover:border-[#FF2E7E]/50 transition-all cursor-pointer"
                      >
                        {/* Rank Badge */}
                        <div
                          className={`w-7 h-7 rounded-xl font-display font-black text-xs flex items-center justify-center shrink-0 ${
                            index === 0
                              ? 'bg-[#FFD000] text-slate-950'
                              : index === 1
                              ? 'bg-slate-300 text-slate-950'
                              : index === 2
                              ? 'bg-amber-700 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          #{index + 1}
                        </div>

                        {/* Mini Poster */}
                        <img
                          src={film.poster}
                          alt={film.title}
                          className="w-11 h-14 object-cover rounded-lg shrink-0 group-hover:scale-105 transition-transform"
                        />

                        {/* Film Details */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-bold text-xs truncate group-hover:text-[#FF2E7E] transition-colors">
                            {film.title}
                          </h4>
                          <p className="text-slate-400 text-[11px] truncate">
                            {film.year} • {film.genres.slice(0, 2).join(', ')}
                          </p>
                          <div className="mt-1 flex items-center gap-1.5">
                            <Star className="w-3 h-3 fill-current text-[#FFD000]" />
                            <span className="text-[11px] font-black text-[#FFD000]">
                              {film.skorSotoy.toFixed(1)}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              ({film.totalVotes} vote)
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
                    className="w-full py-2.5 rounded-xl border border-slate-800 hover:border-[#FF2E7E] text-slate-300 hover:text-white text-xs font-bold text-center transition-colors flex items-center justify-center gap-1 mt-2"
                  >
                    <span>Jelajahi Tangga Skor Sotoy Lengkap</span>
                    <ArrowRight className="w-3 h-3 text-[#FF2E7E]" />
                  </button>
                </div>
              )}

              {/* Tab Content 2: TO WATCH */}
              {activeTab === 'to-watch' && (
                <div className="flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2.5">
                    {toWatchFilms.map(film => (
                      <div
                        key={film.id}
                        id={`towatch-film-item-${film.id}`}
                        onClick={() => navigateTo('film-detail', { filmId: film.id })}
                        className="group flex items-center gap-3 p-2.5 rounded-2xl bg-slate-900/50 hover:bg-slate-800/80 border border-slate-800/70 hover:border-[#00F0FF]/50 transition-all cursor-pointer"
                      >
                        <img
                          src={film.poster}
                          alt={film.title}
                          className="w-11 h-14 object-cover rounded-lg shrink-0 group-hover:scale-105 transition-transform"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-bold text-xs truncate group-hover:text-[#00F0FF] transition-colors">
                            {film.title}
                          </h4>
                          <p className="text-slate-400 text-[11px] line-clamp-1">
                            {film.curatorNote || film.synopsis}
                          </p>
                          <div className="mt-1 flex items-center gap-1.5">
                            {film.whereToWatch.slice(0, 1).map((w, idx) => (
                              <span
                                key={idx}
                                className="text-[9px] font-black uppercase px-2 py-0.5 rounded text-slate-950 bg-[#00F0FF]"
                              >
                                {w.platform}
                              </span>
                            ))}
                            <span className="text-[10px] font-bold text-[#FFD000] ml-auto">
                              ★ {film.skorSotoy.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    id="see-all-towatch-btn"
                    onClick={() => navigateTo('film-recommendations')}
                    className="w-full py-2.5 rounded-xl border border-slate-800 hover:border-[#00F0FF] text-slate-300 hover:text-white text-xs font-bold text-center transition-colors flex items-center justify-center gap-1 mt-2"
                  >
                    <span>Buka Generator Rekomendasi Film</span>
                    <ArrowRight className="w-3 h-3 text-[#00F0FF]" />
                  </button>
                </div>
              )}

              {/* Tab Content 3: GEAR ADDICT */}
              {activeTab === 'gear-addict' && (
                <div className="flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2.5">
                    {GEAR_ADDICT_ITEMS.map(gear => (
                      <div
                        key={gear.id}
                        id={`gear-addict-item-${gear.id}`}
                        onClick={() => navigateTo('category', { category: 'cinema-gear' })}
                        className="group flex items-center gap-3 p-2.5 rounded-2xl bg-slate-900/50 hover:bg-slate-800/80 border border-slate-800/70 hover:border-[#FFD000]/50 transition-all cursor-pointer"
                      >
                        <img
                          src={gear.image}
                          alt={gear.name}
                          className="w-12 h-12 object-cover rounded-lg shrink-0 group-hover:scale-105 transition-transform"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-[#FFD000]">
                              {gear.badge}
                            </span>
                            <span className="text-[10px] font-black text-white">
                              {gear.price}
                            </span>
                          </div>
                          <h4 className="text-white font-bold text-xs truncate group-hover:text-[#FFD000] transition-colors">
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
                    className="w-full py-2.5 rounded-xl border border-slate-800 hover:border-[#FFD000] text-slate-300 hover:text-white text-xs font-bold text-center transition-colors flex items-center justify-center gap-1 mt-2"
                  >
                    <span>Lihat Semua Ulasan Cinema Gear</span>
                    <ArrowRight className="w-3 h-3 text-[#FFD000]" />
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
