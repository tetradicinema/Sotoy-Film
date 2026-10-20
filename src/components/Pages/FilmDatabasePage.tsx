import React, { useState, useMemo, useEffect } from 'react';
import {
  Star,
  Search,
  Filter,
  Film,
  Sparkles,
  Flame,
  TrendingUp,
  Clock,
  Award,
  ChevronRight,
  Heart,
  MessageSquare,
  CheckCircle2,
  Bookmark,
  Check,
  Trophy,
  UserCheck,
  Info,
  Ghost,
  Rocket,
  Clapperboard,
  Zap,
  Eye,
  Tv,
  SlidersHorizontal,
  Layers,
  RotateCcw,
  ArrowUpDown,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getRoleBadgeStyle } from '../../utils/roleStyles';
import { RoleBadge } from '../Common/RoleBadge';
import { FilmItem, UserRating, UserRole } from '../../types';
import { StarRating } from '../Common/StarRating';
import { CollectionPickerPopover } from '../Common/CollectionPickerPopover';
import { RateFilmModal } from '../Modals/RateFilmModal';
import { AddToCollectionModal } from '../Modals/AddToCollectionModal';
import { AdBannerSlot } from '../Common/AdBannerSlot';
import { formatRelativeTime, formatFullDateTime, formatReleaseDate } from '../../utils/formatRelativeTime';
import { FilmCardSkeleton, FilmDatabaseSkeleton } from '../Skeletons';
import { getRoleLeaderboard, LeaderboardPeriod } from '../../utils/leaderboard';
import { LeaderboardCard, LeaderboardPeriodTabs } from '../Common/LeaderboardCard';

export interface GenreCategory {
  id: string;
  name: string;
  icon: React.ElementType;
  badgeClass: string;
  activeClass: string;
  description: string;
  themeColor: string;
}

export const GENRE_CATEGORIES: GenreCategory[] = [
  {
    id: 'all',
    name: 'Semua Genre',
    icon: Layers,
    badgeClass: 'text-slate-300 border-slate-700 bg-slate-900/60',
    activeClass: 'bg-white text-slate-950 border-white shadow-lg shadow-white/10 ring-2 ring-white/20 font-black',
    description: 'Jelajahi seluruh katalog film bioskop, tayangan serial, dan animasi di database Sotoy Film.',
    themeColor: '#ffffff',
  },
  {
    id: 'Horror',
    name: 'Horror',
    icon: Ghost,
    badgeClass: 'text-rose-400 border-rose-900/50 bg-rose-950/30 hover:border-rose-600/60',
    activeClass: 'bg-gradient-to-r from-red-600 to-rose-600 text-white border-red-500 shadow-lg shadow-red-600/30 ring-2 ring-red-400/40 font-black',
    description: 'Sensasi mencekam, teror supernatural, dan misteri psikologis pilihan kurator & penonton.',
    themeColor: '#ef4444',
  },
  {
    id: 'Sci-Fi',
    name: 'Sci-Fi',
    icon: Rocket,
    badgeClass: 'text-cyan-400 border-cyan-900/50 bg-cyan-950/30 hover:border-cyan-600/60',
    activeClass: 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 border-cyan-400 shadow-lg shadow-cyan-500/30 ring-2 ring-cyan-300/40 font-black',
    description: 'Fiksi ilmiah futuristik, eksplorasi luar angkasa, distopia teknologi, dan multiverse spektakuler.',
    themeColor: '#FF2E7E',
  },
  {
    id: 'Drama',
    name: 'Drama',
    icon: Clapperboard,
    badgeClass: 'text-amber-400 border-amber-900/50 bg-amber-950/30 hover:border-amber-600/60',
    activeClass: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/30 ring-2 ring-amber-300/40 font-black',
    description: 'Konflik emosional mendalam, pergulatan nurani manusia, drama persidangan, dan relasi autentik.',
    themeColor: '#FF2E7E',
  },
  {
    id: 'Anime',
    name: 'Anime',
    icon: Sparkles,
    badgeClass: 'text-pink-400 border-pink-900/50 bg-pink-950/30 hover:border-pink-600/60',
    activeClass: 'bg-gradient-to-r from-pink-500 to-rose-500 text-white border-pink-400 shadow-lg shadow-pink-500/30 ring-2 ring-pink-300/40 font-black',
    description: 'Mahakarya animasi Jepang, aksi sakuga spektakuler, adaptasi manga hits, dan film layar lebar studio papan atas.',
    themeColor: '#FF2E7E',
  },
  {
    id: 'Action',
    name: 'Action',
    icon: Zap,
    badgeClass: 'text-orange-400 border-orange-900/50 bg-orange-950/30 hover:border-orange-600/60',
    activeClass: 'bg-gradient-to-r from-orange-500 to-red-500 text-white border-orange-400 shadow-lg shadow-orange-500/30 ring-2 ring-orange-300/40 font-black',
    description: 'Koreografi pertarungan memukau, kejar-kejaran tinggi adrenalin, dan ledakan aksi tanpa henti.',
    themeColor: '#FF2E7E',
  },
];

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

  // Helper function to match genres
  const matchesGenre = (film: FilmItem, targetGenre: string): boolean => {
    if (!targetGenre || targetGenre === 'all') return true;
    const lowerTarget = targetGenre.toLowerCase();

    return film.genres.some(g => {
      const lowerG = g.toLowerCase();
      if (lowerG === lowerTarget) return true;
      if (lowerTarget === 'horror' && (lowerG.includes('horr') || lowerG.includes('misteri') || lowerG.includes('thriller'))) return true;
      if (lowerTarget === 'sci-fi' && (lowerG.includes('sci') || lowerG.includes('fiksi') || lowerG.includes('futur') || lowerG.includes('space'))) return true;
      if (lowerTarget === 'anime' && (lowerG.includes('anime') || lowerG.includes('animasi') || film.type === 'animation')) return true;
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

  // Find current active category config
  const activeCategoryConfig = GENRE_CATEGORIES.find(
    c => c.id.toLowerCase() === selectedGenre.toLowerCase()
  ) || {
    id: selectedGenre,
    name: selectedGenre,
    icon: Film,
    badgeClass: 'text-slate-300 border-slate-700 bg-slate-900/60',
    activeClass: 'bg-[#FF2E7E] text-slate-950 border-[#FF2E7E]',
    description: `Koleksi film dan tayangan dengan genre ${selectedGenre}.`,
    themeColor: '#FF2E7E',
  };

  // Film sections data (respects selectedGenre if set)
  const recentReleased = [...films]
    .filter(f => f.isRecentRelease || f.year >= 2024)
    .sort((a, b) => {
      const aDate = a.releaseDate ? new Date(a.releaseDate).getTime() : null;
      const bDate = b.releaseDate ? new Date(b.releaseDate).getTime() : null;

      // Both have valid dates -> newest date first
      if (aDate !== null && bDate !== null && !isNaN(aDate) && !isNaN(bDate)) {
        if (aDate !== bDate) return bDate - aDate;
      }

      // Dated films always outrank undated films
      if (aDate !== null && !isNaN(aDate) && (bDate === null || isNaN(bDate))) return -1;
      if ((aDate === null || isNaN(aDate)) && bDate !== null && !isNaN(bDate)) return 1;

      // Fallback: year descending for equal or undated
      return b.year - a.year;
    });
  const popularReleased = films.filter(f => f.isPopularRelease || f.totalVotes > 600);
  const popularThisWeek = films.filter(f => f.isPopularThisWeek || f.skorSotoy >= 4.8);

  const filteredRecentReleased = recentReleased.filter(f => matchesGenre(f, selectedGenre));
  const filteredPopularReleased = popularReleased.filter(f => matchesGenre(f, selectedGenre));
  const filteredPopularThisWeek = popularThisWeek.filter(f => matchesGenre(f, selectedGenre));

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

  // Calculate average rating for current genre selection
  const genreFilms = films.filter(f => matchesGenre(f, selectedGenre));
  const avgGenreScore = genreFilms.length > 0
    ? (genreFilms.reduce((acc, curr) => acc + curr.skorSotoy, 0) / genreFilms.length).toFixed(1)
    : '0.0';
  const topRatedGenreFilm = genreFilms.length > 0
    ? [...genreFilms].sort((a, b) => b.skorSotoy - a.skorSotoy)[0]
    : null;

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

  const scrollToDatabase = () => {
    const el = document.getElementById('database-lengkap');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Header Hero Banner */}
        <div
          id="film-database-header"
          className="bg-gradient-to-br from-[#181428] via-[#141529] to-[#0d0e19] border border-[#FF2E7E]/40 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute -right-16 -top-16 w-80 h-80 bg-[#FF2E7E]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-80 h-80 bg-[#FF2E7E]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl">
            <h1 className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight leading-tight mb-3">
              Film Database
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
              Katalog lengkap film bioskop, series drama prestisius, dan animasi terkini. Bandingkan Skor Komunitas penonton dengan ulasan kurator Si Paling Sotoy, serta telusuri ulasan populer komunitas.
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* GENRE-BASED FILTERING SYSTEM & QUICK BROWSE PILLS */}
        {/* ========================================================================= */}
        <section id="genre-filter-system" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#FF2E7E]/20 text-[#FF2E7E] flex items-center justify-center shadow-inner">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display font-black text-xl text-white">Browse by Genre</h2>
                  {selectedGenre !== 'all' && (
                    <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FF2E7E] text-slate-950 shadow-sm animate-pulse">
                      Filter Aktif
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-xs">Pilih kategori genre untuk memfilter katalog film, serial, dan animasi secara instan</p>
              </div>
            </div>

            {/* Clear Filter Button if active */}
            {selectedGenre !== 'all' && (
              <button
                id="reset-genre-filter-btn"
                onClick={() => setSelectedGenre('all')}
                className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-[#FF2E7E] text-xs font-bold transition-all shadow-sm group"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#FF2E7E] group-hover:-rotate-45 transition-transform" />
                <span>Reset ke Semua ({films.length})</span>
              </button>
            )}
          </div>

          {/* Genre Category Pills */}
          <div
            className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none scroll-smooth touch-pan-x"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {GENRE_CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const count = getGenreCount(cat.id);
              const isActive = selectedGenre.toLowerCase() === cat.id.toLowerCase();

              return (
                <button
                  key={cat.id}
                  id={`genre-pill-${cat.id.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  onClick={() => setSelectedGenre(isActive ? 'all' : cat.id)}
                  className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer select-none min-h-[44px] active:scale-95 ${
                    isActive
                      ? cat.activeClass
                      : `${cat.badgeClass} hover:scale-[1.02]`
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'scale-110' : 'opacity-80'}`} />
                  <span>{cat.name}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      isActive
                        ? 'bg-black/25 text-inherit'
                        : 'bg-slate-800/90 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Genre Spotlight Banner when a specific genre is selected */}
          {selectedGenre !== 'all' && (
            <div
              id="genre-spotlight-banner"
              className="bg-gradient-to-r from-[#17182e] via-[#171717] to-[#15162a] border border-slate-800/90 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl relative overflow-hidden"
            >
              <div
                className="absolute top-0 right-0 w-64 h-full pointer-events-none opacity-20 blur-3xl"
                style={{ backgroundColor: activeCategoryConfig.themeColor }}
              />

              <div className="flex items-start sm:items-center gap-3.5 relative z-10">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg border border-white/10"
                  style={{ backgroundColor: `${activeCategoryConfig.themeColor}20`, color: activeCategoryConfig.themeColor }}
                >
                  {React.createElement(activeCategoryConfig.icon, { className: 'w-6 h-6' })}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-black text-lg text-white">
                      Koleksi Film: {activeCategoryConfig.name}
                    </h3>
                    <span className="bg-slate-800 text-slate-300 text-xs px-2.5 py-0.5 rounded-full border border-slate-700 font-bold">
                      {searchResults.length} Film Ditemukan
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5 max-w-xl">
                    {activeCategoryConfig.description}
                  </p>
                </div>
              </div>

              {/* Genre Stats pill */}
              <div className="flex items-center gap-4 text-xs relative z-10 self-stretch sm:self-auto justify-between sm:justify-start border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-0 sm:pl-5">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-black">Rata-Rata Skor</div>
                  <div className="font-medium text-sm text-[#FF2E7E] flex items-center gap-1 mt-0.5">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{avgGenreScore} / 10.0</span>
                  </div>
                </div>

                {topRatedGenreFilm && (
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-black">Rating Tertinggi</div>
                    <div
                      onClick={() => navigateTo('film-detail', { filmId: topRatedGenreFilm.id })}
                      className="font-bold text-sm text-white hover:text-[#FF2E7E] truncate max-w-[140px] cursor-pointer mt-0.5 transition-colors"
                      title={topRatedGenreFilm.title}
                    >
                      {topRatedGenreFilm.title}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Global Page Ad Banner */}
        <AdBannerSlot variant="leaderboard" />

        {/* ========================================================================= */}
        {/* SECTION 1: RECENT RELEASED (Capped to 8 items) */}
        {/* ========================================================================= */}
        <section id="recent-released-section" className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-[#FF2E7E] flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display font-black text-xl text-white">Recent Released</h2>
                <p className="text-slate-400 text-xs">Film bioskop dan tayangan serial yang baru saja dirilis resmi</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400">
                {filteredRecentReleased.length} Judul
              </span>
              <button
                onClick={() => {
                  setSortBy('year');
                  scrollToDatabase();
                }}
                className="text-xs font-bold text-slate-300 hover:text-white bg-slate-900 border border-slate-700 hover:border-[#FF2E7E] px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shrink-0"
              >
                <span>Lihat Semua</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#FF2E7E]" />
              </button>
            </div>
          </div>

          {isLoadingFilms && films.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <FilmCardSkeleton key={`recent-film-skeleton-${i}`} />
              ))}
            </div>
          ) : filteredRecentReleased.length === 0 ? (
            <div className="text-center py-8 bg-slate-900/30 rounded-2xl border border-slate-800/80">
              <p className="text-slate-400 text-xs">
                Tidak ada film rilis baru untuk genre <strong className="text-white">{activeCategoryConfig.name}</strong>.
              </p>
              <button
                onClick={() => setSelectedGenre('all')}
                className="mt-2 text-xs font-bold text-[#FF2E7E] hover:underline"
              >
                Lihat semua rilis baru
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {filteredRecentReleased.slice(0, 8).map(film => (
                <div
                  key={film.id}
                  id={`recent-film-card-${film.id}`}
                  onClick={() => navigateTo('film-detail', { filmId: film.id })}
                  className="bg-[#171717] border border-slate-800 rounded-2xl overflow-hidden hover:border-[#FF2E7E]/70 hover:shadow-[0_0_24px_rgba(255,46,126,0.18)] hover:-translate-y-1 hover:scale-[1.015] transition-all duration-300 flex flex-col group cursor-pointer shadow-md"
                >
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-900">
                    <img
                      src={film.poster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=300&q=80'}
                      alt={film.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#171717] via-transparent to-transparent opacity-80" />

                    <div className="absolute top-2 left-2 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded-lg border border-[#FFD000]/30 text-[#FFD000] text-[11px] font-black flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current text-[#FFD000]" />
                      <span>{film.skorSotoy.toFixed(1)}</span>
                    </div>

                    <span className="absolute top-2 right-2 bg-cyan-500 text-slate-950 text-[9px] font-black uppercase px-2 py-0.5 rounded shadow">
                      NEW
                    </span>

                    <div className="absolute bottom-2 left-2 right-2 text-[10px] text-slate-300 font-bold truncate" title={film.releaseDate ? `Rilis: ${formatReleaseDate(film.releaseDate)}` : `Tahun: ${film.year}`}>
                      {film.releaseDate ? formatReleaseDate(film.releaseDate) : `${film.duration ? `${film.duration} • ` : ''}${film.year}`}
                    </div>
                  </div>

                  <div className="p-3">
                    <h3 className="font-display font-bold text-xs sm:text-sm text-white group-hover:text-[#FF2E7E] transition-colors line-clamp-1 mb-1">
                      {film.title}
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {film.genres.slice(0, 2).map(g => (
                        <span
                          key={g}
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedGenre(g);
                          }}
                          className={`text-[9px] font-medium px-1.5 py-0.2 rounded ${
                            selectedGenre.toLowerCase() === g.toLowerCase()
                              ? 'bg-cyan-500 text-slate-950 font-bold'
                              : 'text-slate-400 bg-slate-800/80 hover:text-white'
                          }`}
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* SECTION 2: POPULAR RELEASED (Capped to 8 items) */}
        {/* ========================================================================= */}
        <section id="popular-released-section" className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-pink-500/20 text-[#FF2E7E] flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display font-black text-xl text-white">Popular Released</h2>
                <p className="text-slate-400 text-xs">Film dengan jumlah vote ulasan tertinggi dan antusiasme penonton terbesar</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400">
                {filteredPopularReleased.length} Judul
              </span>
              <button
                onClick={() => {
                  setSortBy('votes');
                  scrollToDatabase();
                }}
                className="text-xs font-bold text-slate-300 hover:text-white bg-slate-900 border border-slate-700 hover:border-[#FF2E7E] px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shrink-0"
              >
                <span>Lihat Semua</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#FF2E7E]" />
              </button>
            </div>
          </div>

          {isLoadingFilms && films.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <FilmCardSkeleton key={`popular-film-skeleton-${i}`} />
              ))}
            </div>
          ) : filteredPopularReleased.length === 0 ? (
            <div className="text-center py-8 bg-slate-900/30 rounded-2xl border border-slate-800/80">
              <p className="text-slate-400 text-xs">
                Belum ada film populer dalam kurasi untuk genre <strong className="text-white">{activeCategoryConfig.name}</strong>.
              </p>
              <button
                onClick={() => setSelectedGenre('all')}
                className="mt-2 text-xs font-bold text-[#FF2E7E] hover:underline"
              >
                Lihat semua film populer
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {filteredPopularReleased.slice(0, 8).map(film => (
                <div
                  key={film.id}
                  id={`popular-film-card-${film.id}`}
                  onClick={() => navigateTo('film-detail', { filmId: film.id })}
                  className="bg-[#171717] border border-slate-800 rounded-2xl overflow-hidden hover:border-[#FF2E7E]/70 hover:shadow-[0_0_24px_rgba(255,46,126,0.18)] hover:-translate-y-1 hover:scale-[1.015] transition-all duration-300 flex flex-col group cursor-pointer shadow-md"
                >
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-900">
                    <img
                      src={film.poster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=300&q=80'}
                      alt={film.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#171717] via-transparent to-transparent opacity-80" />

                    <div className="absolute top-2 left-2 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded-lg border border-[#FFD000]/30 text-[#FFD000] text-[11px] font-black flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current text-[#FFD000]" />
                      <span>{film.skorSotoy.toFixed(1)}</span>
                    </div>

                    <span className="absolute top-2 right-2 bg-[#FF2E7E] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded shadow">
                      HOT
                    </span>

                    <div className="absolute bottom-2 left-2 right-2 text-[10px] text-slate-300 font-bold">
                      {film.totalVotes} votes
                    </div>
                  </div>

                  <div className="p-3">
                    <h3 className="font-display font-bold text-xs sm:text-sm text-white group-hover:text-[#FF2E7E] transition-colors line-clamp-1 mb-1">
                      {film.title}
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {film.genres.slice(0, 2).map(g => (
                        <span
                          key={g}
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedGenre(g);
                          }}
                          className={`text-[9px] font-medium px-1.5 py-0.2 rounded ${
                            selectedGenre.toLowerCase() === g.toLowerCase()
                              ? 'bg-[#FF2E7E] text-white font-bold'
                              : 'text-slate-400 bg-slate-800/80 hover:text-white'
                          }`}
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* SECTION 3: POPULAR THIS WEEK (Capped to 8 items) */}
        {/* ========================================================================= */}
        <section id="popular-this-week-section" className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#FF2E7E]/20 text-[#FF2E7E] flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display font-black text-xl text-white">Popular This Week</h2>
                <p className="text-slate-400 text-xs">Paling banyak dibicarakan di Buzz Feed dan media sosial pekan ini</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400">
                {filteredPopularThisWeek.length} Judul
              </span>
              <button
                onClick={() => {
                  setSortBy('rating');
                  scrollToDatabase();
                }}
                className="text-xs font-bold text-slate-300 hover:text-white bg-slate-900 border border-slate-700 hover:border-[#FF2E7E] px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shrink-0"
              >
                <span>Lihat Semua</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#FF2E7E]" />
              </button>
            </div>
          </div>

          {isLoadingFilms && films.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <FilmCardSkeleton key={`trending-film-skeleton-${i}`} />
              ))}
            </div>
          ) : filteredPopularThisWeek.length === 0 ? (
            <div className="text-center py-8 bg-slate-900/30 rounded-2xl border border-slate-800/80">
              <p className="text-slate-400 text-xs">
                Tidak ada film trending pekan ini untuk genre <strong className="text-white">{activeCategoryConfig.name}</strong>.
              </p>
              <button
                onClick={() => setSelectedGenre('all')}
                className="mt-2 text-xs font-bold text-[#FF2E7E] hover:underline"
              >
                Lihat semua film trending
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {filteredPopularThisWeek.slice(0, 8).map(film => (
                <div
                  key={film.id}
                  id={`trending-film-card-${film.id}`}
                  onClick={() => navigateTo('film-detail', { filmId: film.id })}
                  className="bg-[#171717] border border-slate-800 rounded-2xl overflow-hidden hover:border-[#FF2E7E]/70 hover:shadow-[0_0_24px_rgba(255,46,126,0.18)] hover:-translate-y-1 hover:scale-[1.015] transition-all duration-300 flex flex-col group cursor-pointer shadow-md"
                >
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-900">
                    <img
                      src={film.poster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=300&q=80'}
                      alt={film.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#171717] via-transparent to-transparent opacity-80" />

                    <div className="absolute top-2 left-2 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded-lg border border-[#FFD000]/30 text-[#FFD000] text-[11px] font-black flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current text-[#FFD000]" />
                      <span>{film.skorSotoy.toFixed(1)}</span>
                    </div>

                    <span className="absolute top-2 right-2 bg-cyan-500 text-slate-950 text-[9px] font-black uppercase px-2 py-0.5 rounded shadow">
                      TRENDING
                    </span>

                    <div className="absolute bottom-2 left-2 right-2 text-[10px] text-slate-300 font-bold">
                      {film.whereToWatch[0]?.platform}
                    </div>
                  </div>

                  <div className="p-3">
                    <h3 className="font-display font-bold text-xs sm:text-sm text-white group-hover:text-[#FF2E7E] transition-colors line-clamp-1 mb-1">
                      {film.title}
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {film.genres.slice(0, 2).map(g => (
                        <span
                          key={g}
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedGenre(g);
                          }}
                          className={`text-[9px] font-medium px-1.5 py-0.2 rounded ${
                            selectedGenre.toLowerCase() === g.toLowerCase()
                              ? 'bg-[#FF2E7E] text-slate-950 font-bold'
                              : 'text-slate-400 bg-slate-800/80 hover:text-white'
                          }`}
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* SECTION: SOTOY LEADERBOARD (SPLIT KRITIKUS & WARGA) */}
        {/* ========================================================================= */}
        <section id="sotoy-leaderboard-section" className="space-y-6 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#FF2E7E]/10 border border-[#FF2E7E]/30 text-[#FF2E7E] flex items-center justify-center shadow-lg">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display font-black text-2xl text-white tracking-tight">
                  Sotoy Leaderboard
                </h2>
                <p className="text-slate-400 text-xs">
                  Peringkat teratas kontributor ulasan sinema berdasarkan ulasan, suka, dan rating
                </p>
              </div>
            </div>

            <button
              onClick={() => navigateTo('panduan-leaderboard')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 hover:border-[#FF2E7E] transition-all shrink-0 self-start sm:self-auto shadow-sm"
            >
              <Info className="w-4 h-4 text-[#FF2E7E]" />
              <span>Panduan Leaderboard</span>
            </button>
          </div>

          {/* ONE Shared Period Tab Bar Above Both Panels */}
          <div className="flex items-center justify-start">
            <LeaderboardPeriodTabs
              activePeriod={leaderboardPeriod}
              onChangePeriod={setLeaderboardPeriod}
            />
          </div>

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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h2 className="font-display font-black text-xl sm:text-2xl text-white flex items-center gap-2">
                <Star className="w-5 h-5 text-[#FF2E7E] fill-current" />
                <span>Popular Reviews</span>
              </h2>
              <p className="text-slate-400 text-xs">Ulasan mendalam dan penilaian skor film dari kritikus & komunitas</p>
            </div>

            {/* Filter critic vs warga */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
              <button
                onClick={() => setReviewsFilterRole('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  reviewsFilterRole === 'all'
                    ? 'bg-[#FF2E7E] text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setReviewsFilterRole('critic')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  reviewsFilterRole === 'critic'
                    ? 'bg-[#FF2E7E] text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Si Paling Sotoy
              </button>
              <button
                onClick={() => setReviewsFilterRole('warga')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  reviewsFilterRole === 'warga'
                    ? 'bg-[#FF2E7E] text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Warga Sotoy
              </button>
            </div>
          </div>

          {/* Reviews Feed List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredReviews.map(rev => {
              const targetFilm = films.find(f => f.id === rev.filmId);

              return (
                <div
                  key={rev.id}
                  id={`popular-review-item-${rev.id}`}
                  className="bg-[#171717] border border-slate-800/80 rounded-3xl p-5 sm:p-6 hover:border-slate-700 transition-all shadow-xl flex flex-col justify-between space-y-4"
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
        <section id="database-lengkap" className="bg-[#171717] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 pt-6 scroll-mt-20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h2 className="font-display font-black text-2xl text-white flex items-center gap-2.5">
                <Search className="w-6 h-6 text-[#FF2E7E]" />
                <span>Jelajahi Database Lengkap</span>
              </h2>
              <p className="text-slate-400 text-xs mt-1">
                Cari judul film, sutradara, atau filter berdasarkan genre, rating bintang, dan format tayangan
              </p>
            </div>

            {/* Quick Search Input */}
            <div className="relative w-full md:w-80">
              <input
                id="database-search-input"
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari Dune, Nolan, Shōgun, Horror, Anime..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 pl-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E] focus:ring-1 focus:ring-[#FF2E7E] transition-all"
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800 text-xs">
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
                    ? 'bg-white text-slate-950 shadow-md font-black'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setSelectedFormat('movie')}
                className={`px-3.5 py-2 rounded-xl font-bold transition-all shrink-0 min-h-[38px] cursor-pointer active:scale-95 ${
                  selectedFormat === 'movie'
                    ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/25 border border-[#FF2E7E]'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Movies
              </button>
              <button
                onClick={() => setSelectedFormat('series')}
                className={`px-3.5 py-2 rounded-xl font-bold transition-all shrink-0 min-h-[38px] cursor-pointer active:scale-95 ${
                  selectedFormat === 'series'
                    ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/25 border border-[#FF2E7E]'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Series
              </button>
              <button
                onClick={() => setSelectedFormat('animation')}
                className={`px-3.5 py-2 rounded-xl font-bold transition-all shrink-0 min-h-[38px] cursor-pointer active:scale-95 ${
                  selectedFormat === 'animation'
                    ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/25 border border-[#FF2E7E]'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Animasi
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
                <option value={9.0}>★ 9.0+ / 10.0</option>
                <option value={8.0}>★ 8.0+ / 10.0</option>
                <option value={7.0}>★ 7.0+ / 10.0</option>
                <option value={6.0}>★ 6.0+ / 10.0</option>
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
                      (Genre: {activeCategoryConfig.name})
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
                        className="bg-[#171717] border border-white/10 rounded-2xl overflow-hidden hover:border-[#FF2E7E] hover:-translate-y-1 hover:scale-[1.015] transition-all duration-300 flex flex-col group shadow-lg"
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
                          <div className="absolute inset-0 bg-gradient-to-t from-[#171717] via-transparent to-transparent opacity-80" />

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
                              {film.type === 'animation' ? 'Animasi' : film.type}
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
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#FF2E7E] to-[#e0266e] hover:brightness-110 active:scale-95 text-white font-bold text-xs shadow-lg shadow-[#FF2E7E]/25 transition-all flex items-center gap-2 cursor-pointer"
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
