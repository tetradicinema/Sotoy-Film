import { PopularPeopleSection } from '../Common/PopularPeopleSection';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Star,
  Search,
  ChevronRight,
  Heart,
  RotateCcw,
  ArrowUpDown,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { RoleBadge } from '../Common/RoleBadge';
import { FilmItem, SectionConfig } from '../../types';
import { FilmDbCard } from '../Film/FilmDbCard';
import { FilmDbCarousel } from '../Film/FilmDbCarousel';
import { CollectionPickerPopover } from '../Common/CollectionPickerPopover';
import { RateFilmModal } from '../Modals/RateFilmModal';
import { AddToCollectionModal } from '../Modals/AddToCollectionModal';
import { AdBannerSlot } from '../Common/AdBannerSlot';
import { formatRelativeTime, formatFullDateTime } from '../../utils/formatRelativeTime';
import { FilmCardSkeleton } from '../Skeletons';
import { getRoleLeaderboard, LeaderboardPeriod } from '../../utils/leaderboard';
import { LeaderboardCard, LeaderboardPeriodTabs } from '../Common/LeaderboardCard';
import {
  buildFilmDbSections,
  resolveStreamingForPlatform,
  resolveComingSoonForTab,
  getComingSoonTabs,
  ComingSoonTab,
} from '../../utils/filmSections';
import {
  HOMEPAGE_SECTIONS_META,
  resolveFilmDbSectionOrder,
} from '../../utils/homepageConfigHelper';
import { SectionHeader } from '../Common/SectionHeader';

export const FilmDatabasePage: React.FC = () => {
  const {
    films,
    isLoadingFilms,
    ratings,
    isLoggedIn,
    setLoginModalOpen,
    navigateTo,
    watchlist,
    allUsers,
    collections,
    isItemInAnyCollection,
    addItemToCollection,
    removeItemFromCollection,
    getOrCreateDefaultCollection,
    showToast,
    homepageSectionsConfig,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<'all' | 'movie' | 'series' | 'animation'>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'rating' | 'votes' | 'year' | 'title'>('rating');
  const [ratingModalFilm, setRatingModalFilm] = useState<FilmItem | null>(null);
  const [collectionModalFilm, setCollectionModalFilm] = useState<FilmItem | null>(null);

  // Pagination state for "Jelajahi Database Lengkap"
  const [visibleCount, setVisibleCount] = useState<number>(20);

  // Reset visibleCount to 20 whenever searchQuery, selectedFormat, selectedGenre, ratingFilter or sortBy changes
  useEffect(() => {
    setVisibleCount(20);
  }, [searchQuery, selectedFormat, selectedGenre, ratingFilter, sortBy]);

  // Review Filter Role State
  const [reviewsFilterRole, setReviewsFilterRole] = useState<'all' | 'critic' | 'warga'>('all');

  // Shared Leaderboard Period State
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<LeaderboardPeriod>('all');

  // Active platform chip for the streaming section
  const [activePlatform, setActivePlatform] = useState<string>('all');

  // Active Coming Soon tab state & carousel ref
  const [activeComingSoonTab, setActiveComingSoonTab] = useState<ComingSoonTab>('movies');
  const comingSoonCarouselRef = useRef<HTMLDivElement>(null);

  const comingSoonConfig: SectionConfig =
    homepageSectionsConfig?.sections?.fd_coming_soon ?? { sourceType: 'auto' };

  // Helper function to match genres
  const matchesGenre = (film: FilmItem, targetGenre: string): boolean => {
    if (!targetGenre || targetGenre === 'all') return true;
    const lowerTarget = targetGenre.toLowerCase();

    return film.genres.some(g => {
      const lowerG = g.toLowerCase();
      if (lowerG === lowerTarget) return true;
      if (lowerTarget === 'horror' && (lowerG.includes('horr') || lowerG.includes('misteri') || lowerG.includes('thriller'))) return true;
      if (lowerTarget === 'sci-fi' && (lowerG.includes('sci') || lowerG.includes('fiksi') || lowerG.includes('futur') || lowerG.includes('space'))) return true;
      if (lowerTarget === 'animation' && (lowerG.includes('animation') || film.type === 'animation')) return true;
      if (lowerTarget === 'drama' && (lowerG.includes('dram') || lowerG.includes('romance') || lowerG.includes('kehidupan'))) return true;
      if (lowerTarget === 'action' && (lowerG.includes('aksi') || lowerG.includes('act') || lowerG.includes('petualangan'))) return true;
      return false;
    });
  };

  // Helper count for genre pills
  const getGenreCount = (genreId: string): number => {
    if (genreId === 'all') return films.length;
    return films.filter(f => matchesGenre(f, genreId)).length;
  };

  // Film Database sections resolved from the saved homepage configuration
  const filmDbSections = useMemo(
    () => buildFilmDbSections(films, homepageSectionsConfig),
    [films, homepageSectionsConfig]
  );

  // First two sections get skeleton rows while the film catalogue is loading
  const filmDbLoadingSections = useMemo(() => {
    const order = resolveFilmDbSectionOrder(homepageSectionsConfig?.filmDbSectionOrder);
    return order
      .filter(key => homepageSectionsConfig?.sections?.[key]?.enabled !== false)
      .filter(key => HOMEPAGE_SECTIONS_META.some(meta => meta.key === key && meta.area === 'film_database'))
      .slice(0, 2)
      .map(key => {
        const meta = HOMEPAGE_SECTIONS_META.find(item => item.key === key);
        return {
          key,
          title: homepageSectionsConfig?.sections?.[key]?.title?.trim() || meta?.defaultTitle || '',
          description:
            homepageSectionsConfig?.sections?.[key]?.description?.trim() ||
            meta?.defaultDescription ||
            '',
        };
      });
  }, [homepageSectionsConfig]);

  const streamingConfig: SectionConfig =
    homepageSectionsConfig?.sections?.fd_streaming ?? { sourceType: 'auto' };

  // Coming Soon tabs computed with counts
  const comingSoonTabs = useMemo(() => {
    return getComingSoonTabs(films, comingSoonConfig);
  }, [films, comingSoonConfig]);

  // Default to the first non-empty tab (Movies if it has films), and reset active tab to a valid one if data changes
  useEffect(() => {
    if (comingSoonTabs.length > 0) {
      if (!comingSoonTabs.some(t => t.id === activeComingSoonTab)) {
        setActiveComingSoonTab(comingSoonTabs[0].id);
      }
    }
  }, [comingSoonTabs, activeComingSoonTab]);

  // Search results with smart genre matching
  const allGenres = Array.from(new Set(films.flatMap(f => f.genres)));

  const searchResults = films.filter(f => {
    if (selectedFormat !== 'all' && f.type !== selectedFormat) return false;
    if (!matchesGenre(f, selectedGenre)) return false;
    if (ratingFilter > 0 && f.skorSotoy < ratingFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        f.title.toLowerCase().includes(q) ||
        (f.originalTitle && f.originalTitle.toLowerCase().includes(q)) ||
        f.director.toLowerCase().includes(q) ||
        f.cast.some(c => c.toLowerCase().includes(q)) ||
        f.genres.some(g => g.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Sorted search results - prioritize Critics Score
  const sortedSearchResults = [...searchResults].sort((a, b) => {
    if (sortBy === 'rating') {
      const aScore = a.criticsSkorSotoy || a.skorSotoy;
      const bScore = b.criticsSkorSotoy || b.skorSotoy;
      return bScore - aScore;
    }
    if (sortBy === 'votes') return b.totalVotes - a.totalVotes;
    if (sortBy === 'year') return b.year - a.year;
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    return 0;
  });

  // Filtered popular reviews
  const filteredReviews = ratings.filter(r => {
    if (reviewsFilterRole === 'critic') return r.userRole === 'si_paling_sotoy';
    if (reviewsFilterRole === 'warga') return r.userRole === 'warga_sotoy';
    return true;
  });

  // Leaderboards split by role
  const criticLeaderboard = useMemo(() => {
    return getRoleLeaderboard('si_paling_sotoy', allUsers, ratings, leaderboardPeriod);
  }, [allUsers, ratings, leaderboardPeriod]);

  const wargaLeaderboard = useMemo(() => {
    return getRoleLeaderboard('warga_sotoy', allUsers, ratings, leaderboardPeriod);
  }, [allUsers, ratings, leaderboardPeriod]);

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Header Hero Banner */}
        <div
          id="film-database-header"
          className="bg-[#171717] border border-slate-800 rounded-3xl p-6 sm:p-10"
        >
          <div className="max-w-3xl">
            <h1 className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight leading-tight mb-3">
              Film Database
            </h1>

            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Katalog lengkap film bioskop, series drama prestisius, dan animation terkini. Bandingkan Skor Komunitas penonton dengan ulasan kurator Si Paling Sotoy, serta telusuri ulasan populer komunitas.
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FILM DATABASE SECTIONS (CONFIGURABLE) */}
        {/* ========================================================================= */}
        {isLoadingFilms && films.length === 0 ? (
          filmDbLoadingSections.map(({ key, title, description }) => (
            <section key={key} id={`film-db-${key}`}>
              <SectionHeader title={title} description={description || 'Memuat koleksi film...'} />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <FilmCardSkeleton key={`${key}-skeleton-${i}`} />
                ))}
              </div>
            </section>
          ))
        ) : (
          filmDbSections.map(section => {
            let displayFilms = section.films;
            if (section.key === 'fd_streaming' && activePlatform !== 'all') {
              displayFilms = resolveStreamingForPlatform(films, streamingConfig, activePlatform);
            } else if (section.key === 'fd_coming_soon') {
              const currentTab = comingSoonTabs.some(t => t.id === activeComingSoonTab)
                ? activeComingSoonTab
                : comingSoonTabs[0]?.id ?? 'movies';
              displayFilms = resolveComingSoonForTab(films, comingSoonConfig, currentTab);
            }

            if (displayFilms.length === 0) return null;

            const platforms = section.platforms ?? [];
            const isSlider = section.key === 'fd_on_theatres' || section.key === 'fd_coming_soon';

            return (
              <section key={section.key} id={`film-db-${section.key}`}>
                <SectionHeader
                  title={section.title}
                  description={section.description}
                  right={
                    <span className="text-xs font-bold text-slate-400">
                      {displayFilms.length} Judul
                    </span>
                  }
                />

                {section.key === 'fd_coming_soon' && comingSoonTabs.length > 1 && (
                  <div
                    role="tablist"
                    aria-label="Filter coming soon"
                    className="flex items-center gap-2 overflow-x-auto pb-1 mb-4 scrollbar-none scroll-smooth touch-pan-x"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                  >
                    {comingSoonTabs.map(tab => {
                      const isSelected = activeComingSoonTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          role="tab"
                          aria-selected={isSelected}
                          onClick={() => {
                            setActiveComingSoonTab(tab.id);
                            comingSoonCarouselRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
                          }}
                          className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#FF2E7E] text-slate-950 border-[#FF2E7E]'
                              : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white hover:border-[#FF2E7E]'
                          }`}
                        >
                          <span>{tab.label}</span>
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-black/20">
                            {tab.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {section.key === 'fd_streaming' && platforms.length > 0 && !streamingConfig.platform && (
                  <div
                    role="tablist"
                    aria-label="Filter platform streaming"
                    className="flex items-center gap-2 overflow-x-auto pb-1 mb-2 scrollbar-none scroll-smooth touch-pan-x"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activePlatform === 'all'}
                      onClick={() => setActivePlatform('all')}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        activePlatform === 'all'
                          ? 'bg-[#FF2E7E] text-slate-950 border-[#FF2E7E]'
                          : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white hover:border-[#FF2E7E]'
                      }`}
                    >
                      Semua
                    </button>
                    {platforms.map(platform => (
                      <button
                        key={platform.name}
                        type="button"
                        role="tab"
                        aria-selected={activePlatform === platform.name}
                        onClick={() => setActivePlatform(platform.name)}
                        className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          activePlatform === platform.name
                            ? 'bg-[#FF2E7E] text-slate-950 border-[#FF2E7E]'
                            : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white hover:border-[#FF2E7E]'
                        }`}
                      >
                        <span>{platform.name}</span>
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-black/20">
                          {platform.count}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {section.key === 'fd_streaming' && (
                  <p className="text-slate-500 text-[10px] sm:text-[11px] mb-4">
                    Data platform streaming oleh JustWatch via TMDB.
                  </p>
                )}

                {isSlider ? (
                  <FilmDbCarousel
                    ref={section.key === 'fd_coming_soon' ? comingSoonCarouselRef : undefined}
                    ariaLabel={section.title}
                  >
                    {displayFilms.map(film => (
                      <FilmDbCard
                        key={film.id}
                        film={film}
                        sectionKey={section.key}
                        onOpen={item => navigateTo('film-detail', { filmId: item.id })}
                      />
                    ))}
                  </FilmDbCarousel>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {displayFilms.map(film => (
                      <FilmDbCard
                        key={film.id}
                        film={film}
                        sectionKey={section.key}
                        onOpen={item => navigateTo('film-detail', { filmId: item.id })}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })
        )}

        {/* Global Page Ad Banner */}
        <AdBannerSlot variant="leaderboard" />

        {/* ========================================================================= */}
        {/* SECTION: SOTOY LEADERBOARD (SPLIT KRITIKUS & WARGA) */}
        {/* ========================================================================= */}
        <section id="sotoy-leaderboard-section">
          <SectionHeader
            title="Sotoy Leaderboard"
            description="Peringkat kritikus dan warga berdasarkan penilaian Skor Sotoy."
            right={
              <div className="flex flex-wrap items-center gap-2">
                <LeaderboardPeriodTabs
                  activePeriod={leaderboardPeriod}
                  onChangePeriod={setLeaderboardPeriod}
                />
                <button
                  onClick={() => navigateTo('panduan-leaderboard')}
                  className="inline-flex items-center px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 hover:border-[#FF2E7E] transition-all shrink-0"
                >
                  Panduan Leaderboard
                </button>
              </div>
            }
          />

          {/* Two Side-by-side Panels on Desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <LeaderboardCard
              title="Leaderboard Kritikus"
              subtitle="Si Paling Sotoy"
              entries={criticLeaderboard}
              hideGuideButton={true}
              limit={5}
            />

            <LeaderboardCard
              title="Leaderboard Warga"
              subtitle="Warga Sotoy"
              entries={wargaLeaderboard}
              hideGuideButton={true}
              limit={5}
            />
          </div>
        </section>

        {/* ========================================================================= */}
        {/* POPULAR REVIEWS SECTION */}
        {/* ========================================================================= */}
        <section id="popular-reviews-section" className="pt-2 space-y-5">
          <SectionHeader
            title="Popular Reviews"
            description="Ulasan paling banyak dibaca dari kritikus dan warga."
            right={
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
                <button
                  onClick={() => setReviewsFilterRole('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                    reviewsFilterRole === 'all'
                      ? 'bg-[#FF2E7E] text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setReviewsFilterRole('critic')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                    reviewsFilterRole === 'critic'
                      ? 'bg-[#FF2E7E] text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Si Paling Sotoy
                </button>
                <button
                  onClick={() => setReviewsFilterRole('warga')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                    reviewsFilterRole === 'warga'
                      ? 'bg-[#FF2E7E] text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Warga Sotoy
                </button>
              </div>
            }
          />

          {/* Reviews Feed List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredReviews.map(rev => {
              const targetFilm = films.find(f => f.id === rev.filmId);

              return (
                <div
                  key={rev.id}
                  id={`popular-review-item-${rev.id}`}
                  className="bg-[#171717] border border-slate-800 rounded-3xl p-5 sm:p-6 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-4">
                    {/* Reviewer Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={rev.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                          alt={rev.userName}
                          className="w-10 h-10 rounded-xl object-cover ring-2 ring-white/10"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-white">{rev.userName}</span>
                            {rev.userRole && (
                              <RoleBadge role={rev.userRole} size="xs" />
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400" title={formatFullDateTime(rev.createdAt)}>{formatRelativeTime(rev.createdAt)}</div>
                        </div>
                      </div>

                      {/* Star Rating Badge */}
                      <div className="bg-black/60 border border-[#FFD000]/40 px-3 py-1 rounded-xl text-[#FFD000] font-black text-xs sm:text-sm flex items-center gap-1 shadow-md">
                        <Star className="w-4 h-4 fill-current text-[#FFD000]" />
                        <span>{rev.score.toFixed(1)}</span>
                        <span className="text-slate-500 font-normal text-[10px]">/ 10.0</span>
                      </div>
                    </div>

                    {/* Film Target Reference Box */}
                    {targetFilm && (
                      <div
                        onClick={() => navigateTo('film-detail', { filmId: targetFilm.id })}
                        className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-[#FF2E7E]/50 cursor-pointer group transition-colors"
                      >
                        <img
                          src={targetFilm.poster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=120&q=80'}
                          alt={targetFilm.title}
                          className="w-10 h-14 object-cover rounded-lg shrink-0 group-hover:scale-105 transition-transform"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] text-slate-400 uppercase font-bold">Ulasan untuk:</div>
                          <div className="text-xs font-bold text-white group-hover:text-[#FF2E7E] truncate">
                            {targetFilm.title} ({targetFilm.year})
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {targetFilm.director} • {targetFilm.genres.join(', ')}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
                      </div>
                    )}

                    {/* Review Headline & Body */}
                    <div className="space-y-1.5">
                      <h3 className="font-display font-black text-base text-white leading-snug">
                        "{rev.headline}"
                      </h3>
                      <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                        {rev.reviewText}
                      </p>
                    </div>
                  </div>

                  {/* Review Card Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs text-slate-400">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1 text-[#FF2E7E] font-bold">
                        <Heart className="w-3.5 h-3.5 fill-current" />
                        {rev.likes} suka ulasan ini
                      </span>
                    </div>
                    {targetFilm && (
                      <button
                        onClick={() => {
                          if (!isLoggedIn) setLoginModalOpen(true);
                          else setRatingModalFilm(targetFilm);
                        }}
                        className="text-[11px] font-bold text-[#FF2E7E] hover:underline"
                      >
                        Tulis Ulasan Tandingan →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION: BROWSE ALL DATABASE (SEARCH, FILTERS, RESULTS GRID) - MOVED TO BOTTOM */}
        {/* ========================================================================= */}
        <PopularPeopleSection />

        <section id="database-lengkap" className="bg-[#171717] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 scroll-mt-20">
          <SectionHeader
            title="Jelajahi Database Lengkap"
            description="Cari dan filter seluruh katalog film, series, dan animation."
            right={
              <div className="relative w-full md:w-80">
                <input
                  id="database-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Cari Dune, Nolan, Shōgun, Horror, Animation..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 pl-10 pr-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E] focus:ring-1 focus:ring-[#FF2E7E] transition-all"
                />
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    aria-label="Hapus pencarian"
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            }
          />

          {/* Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Format Pills */}
            <div
              className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none scroll-smooth touch-pan-x"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <span className="text-slate-400 font-bold mr-1 shrink-0">Format:</span>
              <button
                onClick={() => setSelectedFormat('all')}
                className={`px-3.5 py-2 rounded-xl font-bold transition-all shrink-0 min-h-[38px] cursor-pointer active:scale-95 ${
                  selectedFormat === 'all'
                    ? 'bg-[#FF2E7E] text-slate-950 border border-[#FF2E7E] font-black'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setSelectedFormat('movie')}
                className={`px-3.5 py-2 rounded-xl font-bold transition-all shrink-0 min-h-[38px] cursor-pointer active:scale-95 ${
                  selectedFormat === 'movie'
                    ? 'bg-[#FF2E7E] text-slate-950 border border-[#FF2E7E]'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Movies
              </button>
              <button
                onClick={() => setSelectedFormat('series')}
                className={`px-3.5 py-2 rounded-xl font-bold transition-all shrink-0 min-h-[38px] cursor-pointer active:scale-95 ${
                  selectedFormat === 'series'
                    ? 'bg-[#FF2E7E] text-slate-950 border border-[#FF2E7E]'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Series
              </button>
              <button
                onClick={() => setSelectedFormat('animation')}
                className={`px-3.5 py-2 rounded-xl font-bold transition-all shrink-0 min-h-[38px] cursor-pointer active:scale-95 ${
                  selectedFormat === 'animation'
                    ? 'bg-[#FF2E7E] text-slate-950 border border-[#FF2E7E]'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Animation
              </button>
            </div>

            {/* Genre, Minimum Rating, and Sort by filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Synced Genre Selector */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1">
                <span className="text-slate-400 text-[11px] font-bold">Genre:</span>
                <select
                  id="genre-filter-select"
                  value={selectedGenre}
                  onChange={e => setSelectedGenre(e.target.value)}
                  className="bg-transparent text-slate-200 text-xs focus:outline-none focus:text-[#FF2E7E] font-medium cursor-pointer"
                >
                  <option value="all" className="bg-slate-900 text-slate-200">All Genres ({films.length})</option>
                  {allGenres
                    .sort((a, b) => a.localeCompare(b))
                    .map(g => (
                      <option key={g} value={g} className="bg-slate-900 text-slate-300">
                        {g} ({getGenreCount(g)})
                      </option>
                    ))}
                </select>
              </div>

              {/* Rating Filter */}
              <select
                value={ratingFilter}
                onChange={e => setRatingFilter(Number(e.target.value))}
                className="bg-slate-900 border border-slate-700 text-slate-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-[#FF2E7E] cursor-pointer"
              >
                <option value={0}>Semua Skor Sotoy</option>
                <option value={9.0}>9.0+ / 10.0</option>
                <option value={8.0}>8.0+ / 10.0</option>
                <option value={7.0}>7.0+ / 10.0</option>
                <option value={6.0}>6.0+ / 10.0</option>
              </select>

              {/* Sort By Selector */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1">
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="bg-transparent text-slate-300 text-xs focus:outline-none focus:text-[#FF2E7E] cursor-pointer font-medium"
                >
                  <option value="rating" className="bg-slate-900 text-slate-200">Skor Tertinggi</option>
                  <option value="votes" className="bg-slate-900 text-slate-200">Paling Banyak Diulas</option>
                  <option value="year" className="bg-slate-900 text-slate-200">Tahun Rilis</option>
                  <option value="title" className="bg-slate-900 text-slate-200">Judul (A-Z)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Search Result Posters Grid */}
          <div className="pt-2">
            <div className="flex flex-wrap items-center justify-between mb-3 text-xs text-slate-400 gap-2">
              <div className="flex items-center gap-2">
                <span>
                  Menampilkan <strong className="text-white">{sortedSearchResults.length}</strong> judul film & series
                  {selectedGenre !== 'all' && (
                    <span className="ml-1 text-[#FF2E7E] font-bold">
                      (Genre: {selectedGenre})
                    </span>
                  )}
                  :
                </span>
              </div>

              {(selectedGenre !== 'all' || selectedFormat !== 'all' || ratingFilter > 0 || searchQuery) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedFormat('all');
                    setSelectedGenre('all');
                    setRatingFilter(0);
                  }}
                  className="text-xs font-bold text-slate-400 hover:text-[#FF2E7E] transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Semua Filter</span>
                </button>
              )}
            </div>

            {isLoadingFilms && films.length === 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <FilmCardSkeleton key={`search-film-skeleton-${i}`} />
                ))}
              </div>
            ) : sortedSearchResults.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800">
                <p className="text-slate-400 text-sm">
                  Tidak ada film {selectedGenre !== 'all' ? `dengan genre "${selectedGenre}"` : ''} yang cocok dengan filter pencarian.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedFormat('all');
                    setSelectedGenre('all');
                    setRatingFilter(0);
                  }}
                  className="mt-3 text-xs font-bold text-[#FF2E7E] hover:underline"
                >
                  Reset Filter Pencarian
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {sortedSearchResults.slice(0, visibleCount).map(film => {
                    const inWatchlist = isItemInAnyCollection(film.id, 'film');

                    return (
                      <div
                        key={film.id}
                        id={`search-film-card-${film.id}`}
                        className="bg-[#171717] border border-slate-800 rounded-2xl overflow-hidden hover:border-[#FF2E7E] hover:-translate-y-1 hover:scale-[1.015] transition-all duration-300 flex flex-col group"
                      >
                        {/* Movie Poster */}
                        <div
                          onClick={() => navigateTo('film-detail', { filmId: film.id })}
                          className="relative aspect-[2/3] w-full overflow-hidden cursor-pointer bg-[#0A0A0A]"
                        >
                          <img
                            src={film.poster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=300&q=80'}
                            alt={film.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />

                          {/* Rating Badge */}
                          <div className="absolute top-2 left-2 bg-black/90 backdrop-blur-md px-2 py-0.5 rounded-lg border border-[#FFD000]/30 text-[#FFD000] text-[11px] font-black flex items-center gap-1 shadow-md">
                            <Star className="w-3 h-3 fill-current text-[#FFD000]" />
                            <span>{film.criticsSkorSotoy ? film.criticsSkorSotoy.toFixed(1) : film.skorSotoy.toFixed(1)}</span>
                          </div>

                          {/* Watchlist / Collection Picker Popover */}
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-2 right-2 z-10"
                          >
                            <CollectionPickerPopover
                              itemId={film.id}
                              itemType="film"
                              itemName={film.title}
                              variant="compact"
                              align="right"
                            />
                          </div>

                          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-bold text-slate-300">
                            <span className="bg-slate-900/90 px-1.5 py-0.5 rounded uppercase">
                              {film.type === 'animation' ? 'Animation' : film.type}
                            </span>
                            <span>{film.year}</span>
                          </div>
                        </div>

                        {/* Content info */}
                        <div className="p-3 flex-1 flex flex-col justify-between">
                          <div>
                            <h3
                              onClick={() => navigateTo('film-detail', { filmId: film.id })}
                              className="font-display font-bold text-xs sm:text-sm text-white group-hover:text-[#FF2E7E] transition-colors line-clamp-1 cursor-pointer mb-1"
                              title={film.title}
                            >
                              {film.title}
                            </h3>
                            <div className="text-[10px] text-slate-400 line-clamp-1 mb-1.5">
                              {film.director}
                            </div>

                            {/* Clickable Genre Tags */}
                            <div className="flex flex-wrap gap-1 mb-2">
                              {film.genres.slice(0, 2).map(g => {
                                const isTagActive = selectedGenre.toLowerCase() === g.toLowerCase();
                                return (
                                  <button
                                    key={g}
                                    onClick={e => {
                                      e.stopPropagation();
                                      setSelectedGenre(isTagActive ? 'all' : g);
                                    }}
                                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors ${
                                      isTagActive
                                        ? 'bg-[#FF2E7E] text-slate-950 font-black'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                                    }`}
                                    title={`Filter genre ${g}`}
                                  >
                                    {g}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1.5">
                            <button
                              onClick={() => navigateTo('film-detail', { filmId: film.id })}
                              className="flex-1 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold text-center transition-colors"
                            >
                              Detail
                            </button>
                            <button
                              onClick={() => {
                                if (!isLoggedIn) setLoginModalOpen(true);
                                else setRatingModalFilm(film);
                              }}
                              className="py-1 px-2 rounded-lg bg-[#FF2E7E]/15 hover:bg-[#FF2E7E] text-[#FF2E7E] hover:text-slate-950 text-[11px] font-black transition-colors"
                            >
                              Ulas
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls / Tampilkan Lebih Banyak */}
                {visibleCount < sortedSearchResults.length && (
                  <div className="pt-6 flex flex-col items-center justify-center gap-2">
                    <button
                      onClick={() => setVisibleCount(prev => prev + 20)}
                      className="px-6 py-2.5 rounded-xl bg-[#FF2E7E] hover:bg-[#e0266e] active:scale-95 text-white font-bold text-xs transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <span>Tampilkan Lebih Banyak</span>
                    </button>
                    <span className="text-[11px] text-slate-400">
                      Menampilkan <strong className="text-white">{Math.min(visibleCount, sortedSearchResults.length)}</strong> dari <strong className="text-white">{sortedSearchResults.length}</strong> film
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Modal for rating film */}
        {ratingModalFilm && (
          <RateFilmModal
            film={ratingModalFilm}
            isOpen={!!ratingModalFilm}
            onClose={() => setRatingModalFilm(null)}
          />
        )}

        {collectionModalFilm && (
          <AddToCollectionModal
            isOpen={!!collectionModalFilm}
            onClose={() => setCollectionModalFilm(null)}
            itemId={collectionModalFilm.id}
            itemType="film"
            itemName={collectionModalFilm.title}
          />
        )}
      </div>
    </div>
  );
};
