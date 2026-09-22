import React, { useState } from 'react';
import {
  Award,
  Star,
  ChevronRight,
  Sparkles,
  Film,
  Bookmark,
  Check,
  Eye,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FilmItem } from '../../types';
import { RateFilmModal } from '../Modals/RateFilmModal';

export const HomeFilmRecommendations: React.FC = () => {
  const {
    films,
    navigateTo,
    toggleWatchlist,
    isFilmInWatchlist,
    isLoggedIn,
    setLoginModalOpen,
  } = useApp();

  const [filterType, setFilterType] = useState<'all' | 'recent' | 'popular'>('all');
  const [activeFilmToRate, setActiveFilmToRate] = useState<FilmItem | null>(null);

  const filteredFilms = films.filter(f => {
    if (filterType === 'recent') return f.isRecentRelease || f.year >= 2024;
    if (filterType === 'popular') return f.isPopularRelease || f.isPopularThisWeek || f.skorSotoy >= 4.8;
    return true;
  });

  return (
    <section id="home-film-recommendations" className="py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 mb-6 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-[#FFD000]/20 via-[#FF2E7E]/20 to-[#00F0FF]/20 border border-[#FFD000]/40 flex items-center justify-center text-[#FFD000] shrink-0">
              <Award className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display font-black text-lg sm:text-2xl text-white tracking-tight">
                  Rekomendasi Film Pilihan
                </h2>
                <span className="bg-[#FFD000]/20 text-[#FFD000] border border-[#FFD000]/40 text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                  Posters & Skor Sotoy
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                Kurasi film bioskop & serial terbaik lengkap dengan poster, sinopsis, dan Skor Sotoy
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
            {/* Filter pills */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
              <button
                id="rec-filter-all"
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  filterType === 'all'
                    ? 'bg-[#FF2E7E] text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Semua
              </button>
              <button
                id="rec-filter-recent"
                onClick={() => setFilterType('recent')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  filterType === 'recent'
                    ? 'bg-[#FFD000] text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Terbaru
              </button>
              <button
                id="rec-filter-popular"
                onClick={() => setFilterType('popular')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  filterType === 'popular'
                    ? 'bg-[#00F0FF] text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Populer
              </button>
            </div>

            <button
              id="goto-database-btn"
              onClick={() => navigateTo('film-database')}
              className="text-xs font-black text-[#00F0FF] hover:text-white flex items-center gap-1 transition-colors px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 shrink-0"
            >
              <span>Database</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Film Posters Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {filteredFilms.slice(0, 6).map(film => {
            const inWatchlist = isFilmInWatchlist(film.id);

            return (
              <div
                key={film.id}
                id={`rec-film-card-${film.id}`}
                className="bg-[#121324] border border-slate-800 rounded-2xl overflow-hidden hover:border-[#FFD000]/60 transition-all duration-300 flex flex-col group shadow-lg hover:shadow-2xl hover:shadow-[#FFD000]/10"
              >
                {/* Movie Poster with Hover Zoom & Badges */}
                <div
                  onClick={() => navigateTo('film-detail', { filmId: film.id })}
                  className="relative aspect-[2/3] w-full overflow-hidden cursor-pointer bg-slate-900"
                >
                  <img
                    src={film.poster}
                    alt={film.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#121324] via-transparent to-transparent opacity-80" />

                  {/* Skor Critics Badge (Prioritized) */}
                  <div className="absolute top-2 left-2 bg-black/90 backdrop-blur-md px-2 py-0.5 rounded-lg border border-[#FFD000]/50 text-[#FFD000] text-[11px] font-medium flex items-center gap-1 shadow-md">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{film.criticsSkorSotoy ? film.criticsSkorSotoy.toFixed(1) : film.skorSotoy.toFixed(1)}</span>
                    <span className="text-[9px] text-amber-200/80 font-bold">Critics</span>
                  </div>

                  {/* Watchlist Quick Button */}
                  <button
                    id={`rec-watchlist-btn-${film.id}`}
                    onClick={e => {
                      e.stopPropagation();
                      toggleWatchlist(film.id);
                    }}
                    title={inWatchlist ? 'Hapus dari Watchlist' : 'Tambah ke Watchlist'}
                    className={`absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                      inWatchlist
                        ? 'bg-emerald-500 text-white'
                        : 'bg-black/70 backdrop-blur text-white hover:bg-[#FF2E7E]'
                    }`}
                  >
                    {inWatchlist ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                  </button>

                  {/* Year & Type tag */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-bold text-slate-300">
                    <span className="bg-slate-900/90 px-1.5 py-0.5 rounded uppercase">
                      {film.type}
                    </span>
                    <span>{film.year}</span>
                  </div>
                </div>

                {/* Film Info Body */}
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h3
                      onClick={() => navigateTo('film-detail', { filmId: film.id })}
                      className="font-display font-bold text-xs sm:text-sm text-white group-hover:text-[#FFD000] transition-colors line-clamp-1 cursor-pointer mb-1"
                    >
                      {film.title}
                    </h3>
                    <p className="text-slate-400 text-[11px] line-clamp-1 mb-2">
                      {film.genres.slice(0, 2).join(', ')}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1.5">
                    <button
                      onClick={() => navigateTo('film-detail', { filmId: film.id })}
                      className="flex-1 py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold text-center transition-colors"
                    >
                      Detail
                    </button>
                    <button
                      id={`rec-rate-modal-btn-${film.id}`}
                      onClick={() => {
                        if (!isLoggedIn) {
                          setLoginModalOpen(true);
                        } else {
                          setActiveFilmToRate(film);
                        }
                      }}
                      title="Beri Skor Sotoy"
                      className="py-1 px-2 rounded-lg bg-[#FFD000]/15 hover:bg-[#FFD000] text-[#FFD000] hover:text-slate-950 text-[11px] font-black transition-colors flex items-center gap-0.5"
                    >
                      <Star className="w-3 h-3 fill-current" />
                      <span>Ulas</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal for rating film */}
        {activeFilmToRate && (
          <RateFilmModal
            film={activeFilmToRate}
            isOpen={!!activeFilmToRate}
            onClose={() => setActiveFilmToRate(null)}
          />
        )}
      </div>
    </section>
  );
};
