import React, { useState } from 'react';
import {
  Star,
  Clock,
  User,
  Heart,
  Calendar,
  Share2,
  ArrowLeft,
  Tv,
  CheckCircle2,
  MessageSquare,
  Bookmark,
  Check,
  Play,
  Film,
  Camera,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Maximize2,
  X,
  Volume2,
  Award,
  Video,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getRoleStyle } from '../../utils/roleStyles';
import { FilmItem } from '../../types';
import { RateFilmModal } from '../Modals/RateFilmModal';
import { AdBannerSlot } from '../Common/AdBannerSlot';

export const FilmDetailPage: React.FC = () => {
  const {
    selectedFilmId,
    films,
    articles,
    ratings,
    toggleWatchlist,
    isFilmInWatchlist,
    navigateTo,
    isLoggedIn,
    setLoginModalOpen,
    showToast,
    openShareModal,
  } = useApp();

  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [selectedStill, setSelectedStill] = useState<string | null>(null);
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);

  const film: FilmItem = films.find(f => f.id === selectedFilmId) || films[0];

  if (films.length === 0 || !film) {
    return (
      <div className="min-h-screen py-8 flex items-center justify-center bg-[#090a10]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#00F0FF] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 font-bold">Memuat Detail Film...</p>
        </div>
      </div>
    );
  }

  const filmReviews = ratings.filter(r => r.filmId === film.id);
  const isInWatchlist = isFilmInWatchlist(film.id);

  // Cast with photos fallback
  const castList = film.castDetails && film.castDetails.length > 0
    ? film.castDetails
    : film.cast.map((actorName, idx) => {
        const samplePhotos = [
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
          'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
        ];
        const sampleCharacters: Record<string, string[]> = {
          'Dune: Part Two': ['Paul Atreides', 'Chani', 'Lady Jessica', 'Stilgar', 'Feyd-Rautha Harkonnen'],
          'Oppenheimer': ['J. Robert Oppenheimer', 'Katherine Oppenheimer', 'Leslie Groves', 'Lewis Strauss', 'Jean Tatlock'],
          'Shōgun': ['Lord Yoshii Toranaga', 'John Blackthorne', 'Toda Mariko', 'Kashigi Yabushige'],
        };
        const characters = sampleCharacters[film.title] || ['Pemeran Utama', 'Karakter Penting', 'Pemeran Pendukung', 'Karakter Kunci'];

        return {
          name: actorName,
          character: characters[idx % characters.length] || 'Karakter Utama',
          photo: samplePhotos[idx % samplePhotos.length],
        };
      });

  // Stills gallery
  const stillsList = film.stills && film.stills.length > 0
    ? film.stills
    : [
        film.backdrop || 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1000&q=80',
      ];

  // Articles from Penulis Sotoy discussing this film
  const relatedArticles = articles.filter(a =>
    a.relatedFilmId === film.id ||
    a.title.toLowerCase().includes(film.title.toLowerCase()) ||
    a.tags.some(t => t.toLowerCase() === film.title.toLowerCase()) ||
    (film.id === 'film-1' && a.tags.includes('Sci-Fi')) ||
    (film.id === 'film-2' && a.tags.includes('Cinematography'))
  );

  const handleShare = () => {
    openShareModal({
      title: `${film.title} (${film.year}) - Skor Sotoy: ${film.skorSotoy.toFixed(1)}/5.0`,
      text: film.synopsis,
      headline: `Film Rating & Skor Sotoy Komunitas: ${film.skorSotoy.toFixed(1)} / 5.0`,
      url: window.location.href,
      type: 'film',
      image: film.poster,
      filmTitle: film.title,
      filmYear: film.year,
      filmPoster: film.poster,
      filmBackdrop: film.backdrop,
      filmGenres: film.genres,
      rating: film.skorSotoy,
      reviewerName: 'Komunitas Sotoy Film',
      reviewerRole: `${film.totalVotes.toLocaleString()} Votes Penonton`,
      meta: `${film.title} (${film.year}) • ${film.genres.slice(0, 2).join(', ')}`,
    });
  };

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  // Trailer URL (YouTube embed or Fallback)
  const trailerEmbed = film.trailerUrl || (
    film.id === 'film-1'
      ? 'https://www.youtube.com/embed/Way9Dexny3w?autoplay=1'
      : film.id === 'film-2'
      ? 'https://www.youtube.com/embed/uYPbbksJxIg?autoplay=1'
      : 'https://www.youtube.com/embed/yNNf28kM8L0?autoplay=1'
  );

  return (
    <div className="min-h-screen py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* ========================================================================= */}
        {/* TOP BAR: NAVIGATION & ACTIONS */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between gap-3">
          <button
            id="back-to-database-btn"
            onClick={() => navigateTo('film-database')}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors px-3 sm:px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Kembali ke Film Database</span>
            <span className="sm:hidden">Database Film</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              id="detail-share-btn"
              onClick={handleShare}
              className="px-3 sm:px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold flex items-center gap-2 border border-slate-800 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5 text-[#00F0FF]" />
              <span>Bagikan</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* HERO SECTION: BACKDROP + FLOATING POSTER + HEADLINE METRICS */}
        {/* ========================================================================= */}
        <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-[#121324]">
          {/* Backdrop Banner with Vignette */}
          <div className="h-52 sm:h-80 md:h-96 w-full relative">
            <img
              src={film.backdrop || film.poster}
              alt={film.title}
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#121324] via-[#121324]/65 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#121324]/80 via-transparent to-transparent" />
            
            {/* Quick Play Trailer on Backdrop */}
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                id="hero-play-trailer-btn"
                onClick={() => {
                  setIsPlayingTrailer(true);
                  scrollToSection('section-trailer');
                }}
                className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-[#FF2E7E]/90 hover:bg-[#FF2E7E] text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all group backdrop-blur-sm"
                title="Tonton Trailer Resmi"
              >
                <Play className="w-6 h-6 sm:w-8 sm:h-8 fill-current ml-1 group-hover:text-white" />
              </button>
            </div>
          </div>

          {/* Floating Details Header */}
          <div className="p-4 sm:p-8 -mt-20 sm:-mt-32 md:-mt-40 relative z-10 flex flex-col md:flex-row gap-5 sm:gap-6 items-center md:items-start">
            {/* High-res Vertical Poster with Badge */}
            <div className="relative shrink-0 group mx-auto md:mx-0">
              <img
                src={film.poster}
                alt={film.title}
                className="w-32 sm:w-52 md:w-60 rounded-2xl shadow-2xl border-2 border-white/20 group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-2.5 left-2.5 bg-black/85 backdrop-blur-md px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl border border-[#FFD000]/60 text-[#FFD000] font-black text-xs sm:text-sm flex items-center gap-1 shadow-lg">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{film.skorSotoy.toFixed(1)}</span>
              </div>
            </div>

            {/* Title & Metadata */}
            <div className="flex-1 min-w-0 space-y-3.5 sm:space-y-4 text-center md:text-left w-full">
              {/* Badges */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center md:justify-start">
                <span className="bg-[#FF2E7E] text-white font-black text-[10px] sm:text-xs uppercase px-2.5 sm:px-3 py-1 rounded-full">
                  {film.type}
                </span>
                <span className="bg-slate-800 text-slate-300 font-bold text-[10px] sm:text-xs px-2.5 py-1 rounded-full border border-slate-700">
                  {film.year}
                </span>
                {film.duration && (
                  <span className="text-slate-300 text-[10px] sm:text-xs flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
                    <Clock className="w-3 h-3 text-[#00F0FF]" />
                    {film.duration}
                  </span>
                )}
                {film.genres.map(g => (
                  <span
                    key={g}
                    className="bg-slate-900 text-slate-300 text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-full border border-slate-800"
                  >
                    {g}
                  </span>
                ))}
              </div>

              {/* Film Title */}
              <div>
                <h1 className="font-display font-black text-2xl sm:text-4xl lg:text-5xl text-white tracking-tight leading-tight">
                  {film.title}
                </h1>
                {film.originalTitle && film.originalTitle !== film.title && (
                  <p className="text-slate-400 text-xs sm:text-sm italic mt-1">{film.originalTitle}</p>
                )}
              </div>

              {/* Skor Sotoy Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 bg-slate-900/95 p-3.5 sm:p-4 rounded-2xl border border-slate-800 max-w-2xl">
                <div className="flex items-center justify-between sm:justify-start gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="font-display font-black text-2xl sm:text-3xl text-[#FFD000]">
                      ★ {film.skorSotoy.toFixed(1)}
                    </div>
                    <div className="text-left">
                      <div className="text-[11px] sm:text-xs font-bold text-white uppercase tracking-wider">
                        Skor Komunitas
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {film.totalVotes.toLocaleString()} votes penonton
                      </div>
                    </div>
                  </div>

                  <div className="h-6 w-px bg-slate-800 block" />

                  <div className="text-left">
                    <div className="text-xs sm:text-sm font-black text-[#00F0FF]">
                      ★ {film.criticsSkorSotoy ? film.criticsSkorSotoy.toFixed(1) : film.skorSotoy.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Skor Critics
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                  <button
                    id="hero-share-film-rating-btn"
                    onClick={handleShare}
                    className="flex-1 sm:flex-initial justify-center px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-[#00F0FF] transition-all flex items-center gap-1.5 text-xs font-bold"
                    title="Bagikan Skor Film ke Instagram Story & Feed"
                  >
                    <Share2 className="w-3.5 h-3.5 text-[#00F0FF]" />
                    <span>Bagikan Skor</span>
                  </button>

                  <button
                    id="detail-rate-film-modal-btn"
                    onClick={() => {
                      if (!isLoggedIn) {
                        setLoginModalOpen(true);
                      } else {
                        setRatingModalOpen(true);
                      }
                    }}
                    className="flex-1 sm:flex-initial bg-gradient-to-r from-[#FFD000] to-[#FF8008] text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-[#FFD000]/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Star className="w-4 h-4 fill-current" />
                    <span>Beri Skor</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-1">
                <button
                  id="detail-toggle-watchlist-btn"
                  onClick={() => toggleWatchlist(film.id)}
                  className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all min-h-[40px] ${
                    isInWatchlist
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                  title={isInWatchlist ? 'Hapus dari Perpustakaan & Watchlist' : 'Simpan ke Perpustakaan & Watchlist'}
                >
                  {isInWatchlist ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Tersimpan di Library</span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-3.5 h-3.5 text-[#00F0FF]" />
                      <span>+ Simpan ke Library</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setIsPlayingTrailer(true);
                    scrollToSection('section-trailer');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 border border-slate-700 transition-colors"
                >
                  <Play className="w-3.5 h-3.5 text-[#FF2E7E] fill-current" />
                  <span>Tonton Trailer</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* QUICK JUMP SUB-BAR (EASY ANCHOR SCROLL) */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-bold text-slate-400">
          <span className="text-slate-500 uppercase text-[10px] tracking-wider shrink-0 mr-1">Lompat ke:</span>
          <button
            onClick={() => scrollToSection('section-synopsis')}
            className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-[#00F0FF] hover:text-white transition-colors shrink-0"
          >
            Sinopsis & Trailer
          </button>
          <button
            onClick={() => scrollToSection('section-cast')}
            className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-[#00F0FF] hover:text-white transition-colors shrink-0"
          >
            Pemeran ({castList.length})
          </button>
          <button
            onClick={() => scrollToSection('section-stills')}
            className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-[#00F0FF] hover:text-white transition-colors shrink-0"
          >
            Foto Adegan ({stillsList.length})
          </button>
          <button
            onClick={() => scrollToSection('section-articles')}
            className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-[#00F0FF] hover:text-white transition-colors shrink-0"
          >
            Artikel & Ulasan ({relatedArticles.length})
          </button>
          <button
            onClick={() => scrollToSection('section-reviews')}
            className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-[#00F0FF] hover:text-white transition-colors shrink-0"
          >
            Ulasan Komunitas ({filmReviews.length})
          </button>
        </div>

        {/* Global Page Ad Banner */}
        <AdBannerSlot variant="leaderboard" />

        {/* ========================================================================= */}
        {/* MASTER 2-COLUMN LAYOUT: MAIN CONTENT (LEFT) & SIDEBAR (RIGHT) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ----------------------------------------------------------------------- */}
          {/* MAIN COLUMN (8 COLS): SINOPSIS -> TRAILER -> CAST -> STILLS -> ARTICLES -> REVIEWS */}
          {/* ----------------------------------------------------------------------- */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* 1. SINOPSIS RESMI & CATATAN KURATOR */}
            <div
              id="section-synopsis"
              className="bg-[#121324] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h2 className="font-display font-black text-xl sm:text-2xl text-white flex items-center gap-2.5">
                  <Film className="w-5 h-5 text-[#00F0FF]" />
                  <span>Sinopsis Resmi</span>
                </h2>
                <span className="text-[11px] font-bold text-slate-400 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
                  {film.genres.join(' • ')}
                </span>
              </div>

              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                {film.synopsis}
              </p>

              {film.curatorNote && (
                <div className="bg-[#FFD000]/10 border border-[#FFD000]/30 rounded-2xl p-4 sm:p-5 mt-4">
                  <div className="flex items-center gap-2 text-[11px] font-black uppercase text-[#FFD000] tracking-wider mb-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Catatan Kurator Sotoy Film:</span>
                  </div>
                  <p className="text-slate-200 text-xs sm:text-sm italic leading-relaxed">
                    "{film.curatorNote}"
                  </p>
                </div>
              )}
            </div>

            {/* 2. OFFICIAL TRAILER PREVIEW (TEPAT DI BAWAH SINOPSIS) */}
            <div
              id="section-trailer"
              className="bg-[#121324] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h2 className="font-display font-black text-xl sm:text-2xl text-white flex items-center gap-2.5">
                    <Video className="w-5 h-5 text-[#FF2E7E]" />
                    <span>Official Trailer Preview</span>
                  </h2>
                  <p className="text-slate-400 text-xs mt-1">
                    Tonton cuplikan dan trailer resmi {film.title}
                  </p>
                </div>

                <span className="bg-[#FF2E7E]/20 text-[#FF2E7E] border border-[#FF2E7E]/40 text-xs font-black uppercase px-3 py-1 rounded-full shrink-0">
                  HD Trailer
                </span>
              </div>

              {/* Video Container 16:9 */}
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl">
                {isPlayingTrailer ? (
                  <iframe
                    src={trailerEmbed}
                    title={`Trailer ${film.title}`}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div
                    onClick={() => setIsPlayingTrailer(true)}
                    className="w-full h-full relative cursor-pointer group"
                  >
                    <img
                      src={film.backdrop || film.poster}
                      alt={film.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-70"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#FF2E7E] text-white flex items-center justify-center shadow-2xl shadow-[#FF2E7E]/40 group-hover:scale-110 active:scale-95 transition-all">
                        <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-current ml-1" />
                      </div>
                      <span className="font-display font-black text-xs sm:text-sm uppercase tracking-wider text-white bg-black/60 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur">
                        Klik untuk Memutar Trailer
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. DAFTAR PEMERAN UTAMA (CAST) */}
            <div
              id="section-cast"
              className="bg-[#121324] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h2 className="font-display font-black text-xl sm:text-2xl text-white flex items-center gap-2.5">
                    <User className="w-5 h-5 text-[#00F0FF]" />
                    <span>Daftar Pemeran & Karakter</span>
                  </h2>
                  <p className="text-slate-400 text-xs mt-1">
                    Jajaran aktor dan aktris pendukung utama dalam film {film.title}
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                  {castList.length} Pemeran
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {castList.map((actor, idx) => (
                  <div
                    key={idx}
                    id={`cast-card-${idx}`}
                    className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden hover:border-[#00F0FF] transition-all duration-300 flex flex-col group shadow-md"
                  >
                    <div className="aspect-[3/4] w-full overflow-hidden bg-slate-800 relative">
                      <img
                        src={actor.photo}
                        alt={actor.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-3">
                      <h3 className="font-bold text-xs sm:text-sm text-white group-hover:text-[#00F0FF] transition-colors truncate">
                        {actor.name}
                      </h3>
                      <p className="text-[11px] text-[#00F0FF] font-semibold truncate mt-0.5">
                        sebagai {actor.character}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. GALERI CINEMATIC STILLS */}
            <div
              id="section-stills"
              className="bg-[#121324] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h2 className="font-display font-black text-xl sm:text-2xl text-white flex items-center gap-2.5">
                    <Camera className="w-5 h-5 text-[#FFD000]" />
                    <span>Galeri Cinematic Stills</span>
                  </h2>
                  <p className="text-slate-400 text-xs mt-1">
                    Tangkapan layar adegan dan foto produksi film {film.title}
                  </p>
                </div>
                <span className="text-xs text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                  {stillsList.length} Foto Resolusi Tinggi
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {stillsList.map((still, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedStill(still)}
                    className="aspect-video rounded-2xl overflow-hidden cursor-pointer group relative border border-slate-800 bg-slate-900"
                  >
                    <img
                      src={still}
                      alt={`Production Still ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <div className="p-3 bg-black/60 rounded-full text-white backdrop-blur">
                        <Maximize2 className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. ARTIKEL & ULASAN PENULIS SOTOY */}
            <div
              id="section-articles"
              className="bg-[#121324] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h2 className="font-display font-black text-xl sm:text-2xl text-white flex items-center gap-2.5">
                    <Film className="w-5 h-5 text-[#00F0FF]" />
                    <span>Artikel & Analisis dari Penulis Sotoy</span>
                  </h2>
                  <p className="text-slate-400 text-xs mt-1">
                    Kajian mendalam dan esai editorial khusus film {film.title}
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                  {relatedArticles.length} Artikel
                </span>
              </div>

              {relatedArticles.length === 0 ? (
                <div className="text-center py-10 bg-slate-900/50 rounded-2xl border border-slate-800">
                  <p className="text-slate-400 text-sm">Belum ada artikel ulasan dari Penulis Sotoy untuk film ini.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {relatedArticles.map(art => (
                    <div
                      key={art.id}
                      id={`film-article-${art.id}`}
                      onClick={() => navigateTo('article-detail', { articleId: art.id })}
                      className="bg-[#151628] border border-slate-800 rounded-2xl overflow-hidden hover:border-[#00F0FF] transition-all cursor-pointer group flex flex-col shadow-lg"
                    >
                      <div className="h-40 w-full overflow-hidden relative">
                        <img
                          src={art.coverImage}
                          alt={art.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <span className="absolute top-2 left-2 bg-[#00F0FF] text-slate-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded shadow">
                          {art.subCategory}
                        </span>
                      </div>

                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div>
                          {/* Author */}
                          <div className="flex items-center gap-2 mb-2">
                            <img
                              src={art.author.avatar}
                              alt={art.author.name}
                              className="w-5 h-5 rounded-full object-cover"
                            />
                            <span className="text-[11px] font-bold text-slate-300">{art.author.name}</span>
                            <span className="bg-pink-500/20 text-[#FF2E7E] text-[9px] font-black px-1.5 py-0.2 rounded">
                              PENULIS
                            </span>
                          </div>

                          <h3 className="font-display font-bold text-sm text-white group-hover:text-[#00F0FF] transition-colors line-clamp-2">
                            {art.title}
                          </h3>

                          <p className="text-slate-400 text-xs line-clamp-2 mt-1">
                            {art.excerpt}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1 text-[#FF2E7E]">
                            <Heart className="w-3 h-3 fill-current" />
                            {art.likes} likes
                          </span>
                          <span>{art.readTime}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 6. ULASAN & KOMENTAR PENONTON (REVIEWS) */}
            <div
              id="section-reviews"
              className="bg-[#121324] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h2 className="font-display font-black text-xl sm:text-2xl text-white flex items-center gap-2.5">
                    <Star className="w-5 h-5 text-[#FFD000] fill-current" />
                    <span>Ulasan Skor Sotoy Komunitas ({filmReviews.length})</span>
                  </h2>
                  <p className="text-slate-400 text-xs mt-1">
                    Opini dan penilaian jujur penonton film {film.title}
                  </p>
                </div>

                <button
                  id="tab-write-review-btn"
                  onClick={() => {
                    if (!isLoggedIn) {
                      setLoginModalOpen(true);
                    } else {
                      setRatingModalOpen(true);
                    }
                  }}
                  className="bg-gradient-to-r from-[#FFD000] to-[#FF8008] text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-[#FFD000]/20 active:scale-95 transition-all flex items-center gap-2 self-start sm:self-auto"
                >
                  <Star className="w-4 h-4 fill-current" />
                  <span>Beri Skor & Ulas Film Ini</span>
                </button>
              </div>

              {filmReviews.length === 0 ? (
                <div className="text-center py-10 bg-slate-900/50 rounded-2xl border border-slate-800">
                  <p className="text-slate-300 text-sm">Belum ada ulasan untuk film ini. Jadilah yang pertama memberikan Skor Sotoy!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filmReviews.map(rev => (
                    <div
                      key={rev.id}
                      className="bg-[#151628] border border-slate-800 rounded-2xl p-5 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={rev.userAvatar}
                            alt={rev.userName}
                            className="w-10 h-10 rounded-xl object-cover"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`font-bold text-sm text-white group-hover:${getRoleStyle('warga_sotoy').text} transition-colors`}>{rev.userName}</span>
                              {rev.userRole && (
                                <span className={`${getRoleStyle(rev.userRole).badge} text-[9px] font-black uppercase px-2 py-0.5 rounded`}>
                                  {getRoleStyle(rev.userRole).name.split(' ').pop()?.toUpperCase()}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400">{rev.createdAt}</span>
                          </div>
                        </div>

                        <div className="bg-black/60 border border-[#FFD000]/40 px-3 py-1 rounded-xl text-[#FFD000] font-black text-sm flex items-center gap-1">
                          <Star className="w-4 h-4 fill-current" />
                          <span>{rev.score.toFixed(1)}</span>
                          <span className="text-slate-500 text-xs">/ 5.0</span>
                        </div>
                      </div>

                      <h4 className="font-display font-black text-sm text-white">
                        "{rev.headline}"
                      </h4>

                      <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                        {rev.reviewText}
                      </p>

                      <div className="flex items-center justify-between pt-2.5 border-t border-slate-800 text-xs text-slate-400 flex-wrap gap-2">
                        <span className="flex items-center gap-1 text-[#FF2E7E]">
                          <Heart className="w-3.5 h-3.5 fill-current" />
                          {rev.likes} suka ulasan ini
                        </span>

                        <button
                          id={`detail-share-review-${rev.id}-btn`}
                          onClick={() => {
                            openShareModal({
                              title: `Rating ${film.title} - ${rev.score.toFixed(1)}/5.0 oleh ${rev.userName}`,
                              text: rev.reviewText,
                              headline: rev.headline,
                              url: window.location.href,
                              type: 'film',
                              image: film.poster,
                              filmTitle: film.title,
                              filmYear: film.year,
                              filmPoster: film.poster,
                              filmBackdrop: film.backdrop,
                              filmGenres: film.genres,
                              rating: rev.score,
                              reviewerName: rev.userName,
                              reviewerAvatar: rev.userAvatar,
                              reviewerRole: rev.userRole === 'si_paling_sotoy' ? 'Si Paling Sotoy (Kritikus)' : 'Warga Sotoy (Penonton)',
                              meta: `${film.title} (${film.year}) • Skor: ${rev.score.toFixed(1)}/5.0`,
                            });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-[#FF2E7E]/20 text-slate-300 hover:text-white border border-slate-700 hover:border-[#FF2E7E]/50 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                          title="Bagikan Skor & Ulasan ini ke Instagram Story/Feed"
                        >
                          <Share2 className="w-3.5 h-3.5 text-[#00F0FF]" />
                          <span>Bagikan Ulasan</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* SIDEBAR COLUMN (4 COLS, STICKY): WATCH PLATFORMS + SPECS + STATS + ADS */}
          {/* ----------------------------------------------------------------------- */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
            
            {/* 1. DIMANA MENONTON (WHERE TO WATCH) */}
            <div className="bg-[#121324] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="font-display font-black text-base text-white flex items-center gap-2">
                  <Tv className="w-4 h-4 text-[#00F0FF]" />
                  <span>Platform Nonton Resmi</span>
                </h3>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded">
                  Legal & Resmi
                </span>
              </div>

              <div className="space-y-2.5">
                {film.whereToWatch.map((w, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: w.badgeColor }} />
                      <span className="font-bold">{w.platform}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                      {w.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. DETAIL & SPESIFIKASI TEKNIS FILM */}
            <div className="bg-[#121324] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="font-display font-black text-base text-white pb-3 border-b border-slate-800 flex items-center gap-2">
                <Info className="w-4 h-4 text-[#FFD000]" />
                <span>Spesifikasi & Informasi Film</span>
              </h3>

              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-slate-400 block font-bold text-[10px] uppercase tracking-wider">Sutradara:</span>
                  <span className="text-white font-bold text-sm mt-0.5 block">{film.director}</span>
                </div>

                <div>
                  <span className="text-slate-400 block font-bold text-[10px] uppercase tracking-wider">Genre Utama:</span>
                  <span className="text-white font-medium mt-0.5 block">{film.genres.join(', ')}</span>
                </div>

                <div>
                  <span className="text-slate-400 block font-bold text-[10px] uppercase tracking-wider">Tahun Rilis:</span>
                  <span className="text-white font-medium mt-0.5 block">{film.year}</span>
                </div>

                <div>
                  <span className="text-slate-400 block font-bold text-[10px] uppercase tracking-wider">Durasi Tayang:</span>
                  <span className="text-white font-medium mt-0.5 block">{film.duration || 'Standar Bioskop'}</span>
                </div>

                <div>
                  <span className="text-slate-400 block font-bold text-[10px] uppercase tracking-wider">Format & Aspek Rasio:</span>
                  <span className="text-white font-medium mt-0.5 block">IMAX 1.90:1 / Panavision 2.39:1</span>
                </div>

                <div>
                  <span className="text-slate-400 block font-bold text-[10px] uppercase tracking-wider">Format Tata Suara:</span>
                  <span className="text-white font-medium mt-0.5 block">Dolby Atmos, 12-Track Digital Audio</span>
                </div>

                <div>
                  <span className="text-slate-400 block font-bold text-[10px] uppercase tracking-wider">Klasifikasi Usia:</span>
                  <span className="text-emerald-400 font-bold mt-0.5 inline-block bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded text-[11px]">
                    13+ (Bimbingan Orang Tua)
                  </span>
                </div>
              </div>
            </div>

            {/* 3. METRIK REKOMENDASI SKOR SOTOY */}
            <div className="bg-[#121324] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="font-display font-black text-base text-white pb-3 border-b border-slate-800 flex items-center gap-2">
                <Award className="w-4 h-4 text-[#FF2E7E]" />
                <span>Rangkuman Skor Sotoy</span>
              </h3>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                  <div className="font-display font-black text-xl text-[#FFD000]">
                    ★ {film.skorSotoy.toFixed(1)}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
                    Komunitas
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                  <div className="font-display font-black text-xl text-[#00F0FF]">
                    ★ {film.criticsSkorSotoy ? film.criticsSkorSotoy.toFixed(1) : film.skorSotoy.toFixed(1)}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
                    Si Paling Sotoy
                  </div>
                </div>
              </div>

              <div className="pt-1">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                  <span>Tingkat Kepuasan Penonton</span>
                  <span className="font-bold text-[#FFD000]">
                    {Math.round((film.skorSotoy / 5.0) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#FFD000] to-[#FF8008] h-full rounded-full"
                    style={{ width: `${Math.round((film.skorSotoy / 5.0) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Infeed Sidebar Ad */}
            <AdBannerSlot variant="sidebar" />
          </div>

        </div>

        {/* Modal enlarged Still Viewer */}
        {selectedStill && (
          <div
            onClick={() => setSelectedStill(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="relative max-w-5xl w-full">
              <button
                onClick={() => setSelectedStill(null)}
                className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/40"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={selectedStill}
                alt="Enlarged Still"
                className="w-full rounded-2xl shadow-2xl border border-white/20 max-h-[80vh] object-contain mx-auto"
              />
            </div>
          </div>
        )}

        {/* Rate Film Modal */}
        <RateFilmModal
          film={film}
          isOpen={ratingModalOpen}
          onClose={() => setRatingModalOpen(false)}
        />
      </div>
    </div>
  );
};
