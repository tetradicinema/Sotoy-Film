import React, { useState } from 'react';
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
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FilmItem, UserRating } from '../../types';
import { StarRating } from '../Common/StarRating';
import { RateFilmModal } from '../Modals/RateFilmModal';
import { AdBannerSlot } from '../Common/AdBannerSlot';

export const FilmDatabasePage: React.FC = () => {
  const {
    films,
    ratings,
    navigateTo,
    currentUser,
    isLoggedIn,
    setLoginModalOpen,
    toggleWatchlist,
    isFilmInWatchlist,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<'all' | 'movie' | 'series' | 'anime'>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<number>(0);
  const [ratingModalFilm, setRatingModalFilm] = useState<FilmItem | null>(null);
  const [reviewsFilterRole, setReviewsFilterRole] = useState<'all' | 'critic' | 'warga'>('all');

  // Film sections data
  const recentReleased = films.filter(f => f.isRecentRelease || f.year >= 2024);
  const popularReleased = films.filter(f => f.isPopularRelease || f.totalVotes > 600);
  const popularThisWeek = films.filter(f => f.isPopularThisWeek || f.skorSotoy >= 4.8);

  // Search results
  const allGenres = Array.from(new Set(films.flatMap(f => f.genres)));

  const searchResults = films.filter(f => {
    if (selectedFormat !== 'all' && f.type !== selectedFormat) return false;
    if (selectedGenre !== 'all' && !f.genres.includes(selectedGenre)) return false;
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

  // Filtered popular reviews
  const filteredReviews = ratings.filter(r => {
    if (reviewsFilterRole === 'critic') return r.userRole === 'si_paling_sotoy';
    if (reviewsFilterRole === 'warga') return r.userRole === 'warga_sotoy';
    return true;
  });

  // Top Reviewers Leaderboard data
  const topReviewers = [
    {
      id: 'rev-1',
      rank: 1,
      name: 'Rian Sinematografer',
      handle: '@riansinema',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80',
      role: 'si_paling_sotoy',
      roleTitle: 'Verified Critic',
      totalReviews: 84,
      helpfulVotes: 1420,
      avgScoreGiven: 4.2,
      bio: 'Alumni FFTV IKJ. Menilai film dari ketelitian framing, tone kurva warna, dan kejujuran narasi audio visual.',
      badges: ['Critic of the Month', 'Anamorphic Enthusiast', 'Master Reviewer'],
    },
    {
      id: 'rev-2',
      rank: 2,
      name: 'Dinda Redaksi',
      handle: '@dindaredaksi',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
      role: 'penulis_sotoy',
      roleTitle: 'Lead Writer',
      totalReviews: 67,
      helpfulVotes: 980,
      avgScoreGiven: 4.5,
      bio: 'Penulis esai film & kurator festival. Fokus pada world-building, naskah, dan penulisan karakter perempuan.',
      badges: ['Festival Insider', 'Story Analyst'],
    },
    {
      id: 'rev-3',
      rank: 3,
      name: 'Budi Cinephile',
      handle: '@budicinephile',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      role: 'warga_sotoy',
      roleTitle: 'Warga Teladan',
      totalReviews: 42,
      helpfulVotes: 512,
      avgScoreGiven: 4.1,
      bio: 'Penonton maraton bioskop akhir pekan. Berpendapat apa adanya tanpa pretensi teknis yang berbelit.',
      badges: ['Warga Teladan', 'Box Office Buff'],
    },
    {
      id: 'rev-4',
      rank: 4,
      name: 'Sarah Film Noir',
      handle: '@sarahnoir',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      role: 'si_paling_sotoy',
      roleTitle: 'Verified Critic',
      totalReviews: 39,
      helpfulVotes: 429,
      avgScoreGiven: 3.9,
      bio: 'Penyuka film misteri neo-noir, thriller psikologis Skandinavia, dan sinema Asia kontemporer.',
      badges: ['Noir Specialist'],
    },
    {
      id: 'rev-5',
      rank: 5,
      name: 'Fikri Soundstage',
      handle: '@fikrisound',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      role: 'warga_sotoy',
      roleTitle: 'Warga Sotoy',
      totalReviews: 28,
      helpfulVotes: 310,
      avgScoreGiven: 4.4,
      bio: 'Audiophile yang menilai film dari dynamic range Dolby Atmos dan scoring orkestrasi orisinal.',
      badges: ['Atmos Buff'],
    },
  ];

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Header Hero Banner */}
        <div
          id="film-database-header"
          className="bg-gradient-to-br from-[#181428] via-[#141529] to-[#0d0e19] border border-[#FFD000]/40 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute -right-16 -top-16 w-80 h-80 bg-[#FFD000]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-80 h-80 bg-[#FF2E7E]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-3 bg-[#FFD000]/20 text-[#FFD000] border border-[#FFD000]/40">
              <Film className="w-3.5 h-3.5" />
              <span>SOTOY FILM DATABASE & SKOR KOMUNITAS</span>
            </div>

            <h1 className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight leading-tight mb-3">
              Film Database
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
              Katalog lengkap film bioskop, series drama prestisius, dan anime terkini. Bandingkan Skor Komunitas penonton dengan ulasan kurator Si Paling Sotoy, serta telusuri ulasan populer komunitas.
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SEARCH SECTION WITH POSTERS & RATINGS */}
        {/* ========================================================================= */}
        <section id="film-search-section" className="bg-[#121324] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="font-display font-black text-xl text-white flex items-center gap-2">
                <Search className="w-5 h-5 text-[#FFD000]" />
                <span>Pencarian Film & Penilaian</span>
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Cari judul film, sutradara, atau filter berdasarkan rating bintang dan format tayangan
              </p>
            </div>

            {/* Quick Search Input */}
            <div className="relative w-full md:w-80">
              <input
                id="database-search-input"
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari Dune, Nolan, Shōgun, Horror..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 pl-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FFD000] focus:ring-1 focus:ring-[#FFD000] transition-all"
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
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
            {/* Format Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              <span className="text-slate-400 font-bold mr-1">Format:</span>
              <button
                onClick={() => setSelectedFormat('all')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  selectedFormat === 'all'
                    ? 'bg-white text-slate-950 shadow'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setSelectedFormat('movie')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  selectedFormat === 'movie'
                    ? 'bg-[#FF2E7E] text-white shadow'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Movies
              </button>
              <button
                onClick={() => setSelectedFormat('series')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  selectedFormat === 'series'
                    ? 'bg-[#00F0FF] text-slate-950 shadow'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Series
              </button>
              <button
                onClick={() => setSelectedFormat('anime')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  selectedFormat === 'anime'
                    ? 'bg-[#FFD000] text-slate-950 shadow'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Anime
              </button>
            </div>

            {/* Genre and Minimum Rating filter */}
            <div className="flex items-center gap-2">
              <select
                value={selectedGenre}
                onChange={e => setSelectedGenre(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-[#FFD000]"
              >
                <option value="all">Semua Genre</option>
                {allGenres.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>

              <select
                value={ratingFilter}
                onChange={e => setRatingFilter(Number(e.target.value))}
                className="bg-slate-900 border border-slate-700 text-slate-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-[#FFD000]"
              >
                <option value={0}>Semua Skor Sotoy</option>
                <option value={4.5}>★ 4.5+ Bintang</option>
                <option value={4.0}>★ 4.0+ Bintang</option>
                <option value={3.5}>★ 3.5+ Bintang</option>
              </select>
            </div>
          </div>

          {/* Search Result Posters Grid */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
              <span>Menampilkan {searchResults.length} judul film & series:</span>
            </div>

            {searchResults.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800">
                <p className="text-slate-400 text-sm">Tidak ada film yang cocok dengan filter pencarian.</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedFormat('all');
                    setSelectedGenre('all');
                    setRatingFilter(0);
                  }}
                  className="mt-3 text-xs font-bold text-[#FFD000] hover:underline"
                >
                  Reset Filter Pencarian
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {searchResults.map(film => {
                  const inWatchlist = isFilmInWatchlist(film.id);

                  return (
                    <div
                      key={film.id}
                      id={`search-film-card-${film.id}`}
                      className="bg-[#151628] border border-slate-800 rounded-2xl overflow-hidden hover:border-[#FFD000] transition-all duration-300 flex flex-col group shadow-lg"
                    >
                      {/* Movie Poster */}
                      <div
                        onClick={() => navigateTo('film-detail', { filmId: film.id })}
                        className="relative aspect-[2/3] w-full overflow-hidden cursor-pointer bg-slate-900"
                      >
                        <img
                          src={film.poster}
                          alt={film.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#151628] via-transparent to-transparent opacity-80" />

                        {/* Rating Badge */}
                        <div className="absolute top-2 left-2 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded-lg border border-[#FFD000]/50 text-[#FFD000] text-[11px] font-black flex items-center gap-1 shadow-md">
                          <Star className="w-3 h-3 fill-current" />
                          <span>{film.skorSotoy.toFixed(1)}</span>
                        </div>

                        {/* Watchlist toggle */}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            toggleWatchlist(film.id);
                          }}
                          className={`absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                            inWatchlist
                              ? 'bg-emerald-500 text-white'
                              : 'bg-black/70 text-white hover:bg-[#FF2E7E]'
                          }`}
                        >
                          {inWatchlist ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                        </button>

                        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-bold text-slate-300">
                          <span className="bg-slate-900/90 px-1.5 py-0.5 rounded uppercase">
                            {film.type}
                          </span>
                          <span>{film.year}</span>
                        </div>
                      </div>

                      {/* Content info */}
                      <div className="p-3 flex-1 flex flex-col justify-between">
                        <div>
                          <h3
                            onClick={() => navigateTo('film-detail', { filmId: film.id })}
                            className="font-display font-bold text-xs sm:text-sm text-white group-hover:text-[#FFD000] transition-colors line-clamp-1 cursor-pointer mb-0.5"
                          >
                            {film.title}
                          </h3>
                          <div className="text-[10px] text-slate-400 line-clamp-1 mb-2">
                            {film.director} • {film.genres[0]}
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
                            className="py-1 px-2 rounded-lg bg-[#FFD000]/15 hover:bg-[#FFD000] text-[#FFD000] hover:text-slate-950 text-[11px] font-black transition-colors"
                          >
                            Ulas
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Global Page Ad Banner */}
        <AdBannerSlot variant="leaderboard" />

        {/* ========================================================================= */}
        {/* SECTION 1: RECENT RELEASED */}
        {/* ========================================================================= */}
        <section id="recent-released-section" className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-[#00F0FF] flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display font-black text-xl text-white">Recent Released</h2>
                <p className="text-slate-400 text-xs">Film bioskop dan tayangan serial yang baru saja dirilis resmi</p>
              </div>
            </div>
            <span className="text-xs font-bold text-[#00F0FF]">{recentReleased.length} Judul Rilis Baru</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {recentReleased.map(film => (
              <div
                key={film.id}
                id={`recent-film-card-${film.id}`}
                onClick={() => navigateTo('film-detail', { filmId: film.id })}
                className="bg-[#121324] border border-slate-800 rounded-2xl overflow-hidden hover:border-[#00F0FF] transition-all duration-300 flex flex-col group cursor-pointer shadow-md"
              >
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-900">
                  <img
                    src={film.poster}
                    alt={film.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#121324] via-transparent to-transparent opacity-80" />

                  <div className="absolute top-2 left-2 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded-lg border border-[#FFD000]/50 text-[#FFD000] text-[11px] font-black flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{film.skorSotoy.toFixed(1)}</span>
                  </div>

                  <span className="absolute top-2 right-2 bg-cyan-500 text-slate-950 text-[9px] font-black uppercase px-2 py-0.5 rounded shadow">
                    NEW
                  </span>

                  <div className="absolute bottom-2 left-2 right-2 text-[10px] text-slate-300 font-bold">
                    {film.duration} • {film.year}
                  </div>
                </div>

                <div className="p-3">
                  <h3 className="font-display font-bold text-xs sm:text-sm text-white group-hover:text-[#00F0FF] transition-colors line-clamp-1 mb-1">
                    {film.title}
                  </h3>
                  <div className="text-[11px] text-slate-400 line-clamp-1">
                    {film.genres.slice(0, 2).join(', ')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 2: POPULAR RELEASED */}
        {/* ========================================================================= */}
        <section id="popular-released-section" className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-pink-500/20 text-[#FF2E7E] flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display font-black text-xl text-white">Popular Released</h2>
                <p className="text-slate-400 text-xs">Film dengan jumlah vote ulasan tertinggi dan antusiasme penonton terbesar</p>
              </div>
            </div>
            <span className="text-xs font-bold text-[#FF2E7E]">Paling Banyak Diulas</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {popularReleased.map(film => (
              <div
                key={film.id}
                id={`popular-film-card-${film.id}`}
                onClick={() => navigateTo('film-detail', { filmId: film.id })}
                className="bg-[#121324] border border-slate-800 rounded-2xl overflow-hidden hover:border-[#FF2E7E] transition-all duration-300 flex flex-col group cursor-pointer shadow-md"
              >
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-900">
                  <img
                    src={film.poster}
                    alt={film.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#121324] via-transparent to-transparent opacity-80" />

                  <div className="absolute top-2 left-2 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded-lg border border-[#FFD000]/50 text-[#FFD000] text-[11px] font-black flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" />
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
                  <div className="text-[11px] text-slate-400 line-clamp-1">
                    {film.director}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 3: POPULAR THIS WEEK */}
        {/* ========================================================================= */}
        <section id="popular-this-week-section" className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-[#FFD000] flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display font-black text-xl text-white">Popular This Week</h2>
                <p className="text-slate-400 text-xs">Paling banyak dibicarakan di Buzz Feed dan media sosial pekan ini</p>
              </div>
            </div>
            <span className="text-xs font-bold text-[#FFD000]">Trending Minggu Ini</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {popularThisWeek.map(film => (
              <div
                key={film.id}
                id={`trending-film-card-${film.id}`}
                onClick={() => navigateTo('film-detail', { filmId: film.id })}
                className="bg-[#121324] border border-slate-800 rounded-2xl overflow-hidden hover:border-[#FFD000] transition-all duration-300 flex flex-col group cursor-pointer shadow-md"
              >
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-900">
                  <img
                    src={film.poster}
                    alt={film.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#121324] via-transparent to-transparent opacity-80" />

                  <div className="absolute top-2 left-2 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded-lg border border-[#FFD000]/50 text-[#FFD000] text-[11px] font-black flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{film.skorSotoy.toFixed(1)}</span>
                  </div>

                  <span className="absolute top-2 right-2 bg-amber-400 text-slate-950 text-[9px] font-black uppercase px-2 py-0.5 rounded shadow">
                    TRENDING
                  </span>

                  <div className="absolute bottom-2 left-2 right-2 text-[10px] text-slate-300 font-bold">
                    {film.whereToWatch[0]?.platform}
                  </div>
                </div>

                <div className="p-3">
                  <h3 className="font-display font-bold text-xs sm:text-sm text-white group-hover:text-[#FFD000] transition-colors line-clamp-1 mb-1">
                    {film.title}
                  </h3>
                  <div className="text-[11px] text-slate-400 line-clamp-1">
                    {film.genres.slice(0, 2).join(', ')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* TWO-COLUMN GRID: POPULAR REVIEWS + REVIEW LEADERBOARD */}
        {/* ========================================================================= */}
        <section id="reviews-and-leaderboard-grid" className="pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN: POPULAR REVIEWS (7 Columns) */}
            <div className="lg:col-span-7 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <h2 className="font-display font-black text-xl sm:text-2xl text-white flex items-center gap-2">
                    <Star className="w-5 h-5 text-[#FFD000] fill-current" />
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
                        ? 'bg-[#FFD000] text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Si Paling Sotoy
                  </button>
                  <button
                    onClick={() => setReviewsFilterRole('warga')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                      reviewsFilterRole === 'warga'
                        ? 'bg-[#00F0FF] text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Warga Sotoy
                  </button>
                </div>
              </div>

              {/* Reviews Feed List */}
              <div className="space-y-4">
                {filteredReviews.map(rev => {
                  const targetFilm = films.find(f => f.id === rev.filmId);

                  return (
                    <div
                      key={rev.id}
                      id={`popular-review-item-${rev.id}`}
                      className="bg-[#121324] border border-slate-800/80 rounded-3xl p-5 sm:p-6 hover:border-slate-700 transition-all shadow-xl space-y-4"
                    >
                      {/* Reviewer Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={rev.userAvatar}
                            alt={rev.userName}
                            className="w-10 h-10 rounded-xl object-cover ring-2 ring-white/10"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm text-white">{rev.userName}</span>
                              {rev.userRole === 'si_paling_sotoy' && (
                                <span className="bg-[#FFD000]/20 text-[#FFD000] border border-[#FFD000]/40 text-[9px] font-black uppercase px-2 py-0.5 rounded">
                                  CRITIC
                                </span>
                              )}
                              {rev.userRole === 'warga_sotoy' && (
                                <span className="bg-cyan-500/15 text-[#00F0FF] border border-cyan-500/30 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded">
                                  WARGA
                                </span>
                              )}
                              {rev.userRole === 'penulis_sotoy' && (
                                <span className="bg-pink-500/20 text-[#FF2E7E] border border-pink-500/30 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded">
                                  PENULIS
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400">{rev.createdAt}</div>
                          </div>
                        </div>

                        {/* Star Rating Badge */}
                        <div className="bg-black/60 border border-[#FFD000]/40 px-3 py-1 rounded-xl text-[#FFD000] font-black text-xs sm:text-sm flex items-center gap-1 shadow-md">
                          <Star className="w-4 h-4 fill-current" />
                          <span>{rev.score.toFixed(1)}</span>
                          <span className="text-slate-500 text-[10px]">/ 5.0</span>
                        </div>
                      </div>

                      {/* Film Target Reference Box */}
                      {targetFilm && (
                        <div
                          onClick={() => navigateTo('film-detail', { filmId: targetFilm.id })}
                          className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-[#FFD000]/50 cursor-pointer group transition-colors"
                        >
                          <img
                            src={targetFilm.poster}
                            alt={targetFilm.title}
                            className="w-10 h-14 object-cover rounded-lg shrink-0 group-hover:scale-105 transition-transform"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] text-slate-400 uppercase font-bold">Ulasan untuk:</div>
                            <div className="text-xs font-bold text-white group-hover:text-[#FFD000] truncate">
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

                      {/* Review Card Footer */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs text-slate-400">
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
                            className="text-[11px] font-bold text-[#00F0FF] hover:underline"
                          >
                            Tulis Ulasan Tandingan →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT COLUMN: REVIEW LEADERBOARD & TOP REVIEWER (5 Columns) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* TOP REVIEWER OF THE MONTH SPOTLIGHT */}
              <div
                id="top-reviewer-spotlight"
                className="bg-gradient-to-br from-[#1C162E] via-[#16172E] to-[#121324] border-2 border-[#FFD000]/50 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD000]/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
                  <Trophy className="w-5 h-5 text-[#FFD000]" />
                  <div>
                    <h3 className="font-display font-black text-sm uppercase tracking-wider text-white">
                      Top Reviewer Spotlight
                    </h3>
                    <span className="text-[10px] text-[#FFD000] font-bold">Kritikus Terpopuler Bulan Ini</span>
                  </div>
                </div>

                {/* Profile Card */}
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src={topReviewers[0].avatar}
                    alt={topReviewers[0].name}
                    className="w-16 h-16 rounded-2xl object-cover ring-2 ring-[#FFD000] shadow-lg"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-display font-black text-lg text-white">
                        {topReviewers[0].name}
                      </h4>
                      <UserCheck className="w-4 h-4 text-[#FFD000]" />
                    </div>
                    <div className="text-xs text-slate-400">{topReviewers[0].handle}</div>
                    <span className="inline-block mt-1 bg-[#FFD000]/20 text-[#FFD000] border border-[#FFD000]/40 text-[10px] font-black px-2 py-0.5 rounded">
                      SI PALING SOTOY (CRITIC)
                    </span>
                  </div>
                </div>

                {/* Reviewer Description / Editorial Philosophy */}
                <div className="bg-black/40 border border-slate-800/80 rounded-2xl p-4 mb-4 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Filosofi & Pendekatan Review:
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed italic">
                    "{topReviewers[0].bio}"
                  </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-800">
                  <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                    <div className="text-base font-black text-white">{topReviewers[0].totalReviews}</div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase">Ulasan</div>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                    <div className="text-base font-black text-[#FF2E7E]">{topReviewers[0].helpfulVotes}</div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase">Suka</div>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                    <div className="text-base font-black text-[#FFD000]">★ {topReviewers[0].avgScoreGiven}</div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase">Rerata Skor</div>
                  </div>
                </div>
              </div>

              {/* REVIEW LEADERBOARD LIST */}
              <div id="review-leaderboard-card" className="bg-[#121324] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-[#00F0FF]" />
                    <h3 className="font-display font-black text-base text-white">
                      Review Leaderboard
                    </h3>
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-900 px-2 py-0.5 rounded">
                    Musim Ini
                  </span>
                </div>

                {/* List of top 5 reviewers */}
                <div className="space-y-3">
                  {topReviewers.map((user, idx) => (
                    <div
                      key={user.id}
                      id={`leaderboard-item-${user.id}`}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-colors ${
                        idx === 0
                          ? 'bg-[#FFD000]/10 border-[#FFD000]/30'
                          : idx === 1
                          ? 'bg-[#FF2E7E]/10 border-[#FF2E7E]/30'
                          : idx === 2
                          ? 'bg-cyan-500/10 border-cyan-500/30'
                          : 'bg-slate-900/50 border-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Rank Badge */}
                        <div
                          className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center ${
                            idx === 0
                              ? 'bg-[#FFD000] text-slate-950 shadow-md'
                              : idx === 1
                              ? 'bg-[#FF2E7E] text-white shadow-md'
                              : idx === 2
                              ? 'bg-[#00F0FF] text-slate-950 shadow-md'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {user.rank}
                        </div>

                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-9 h-9 rounded-xl object-cover ring-1 ring-white/10"
                        />

                        <div>
                          <div className="text-xs font-bold text-white line-clamp-1">
                            {user.name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {user.roleTitle} • {user.totalReviews} ulasan
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-black text-[#FFD000]">
                          ★ {user.avgScoreGiven}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {user.helpfulVotes} likes
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* How to become a top reviewer info */}
                <div className="mt-4 p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Info className="w-3.5 h-3.5 text-[#00F0FF]" />
                    <span>Mau Jadi Si Paling Sotoy (Verified Critic)?</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Tulis ulasan berbobot minimal 10 ulasan film dengan argumen sinematik mendalam. Tim redaksi akan memverifikasi dan menyematkan badge resmi Si Paling Sotoy!
                  </p>
                </div>
              </div>

              {/* Sidebar Infeed Ad */}
              <AdBannerSlot variant="sidebar" />
            </div>
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
      </div>
    </div>
  );
};
