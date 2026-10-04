import React, { useState } from 'react';
import {
  Star,
  ChevronRight,
  Bookmark,
  Check,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FilmItem } from '../../types';
import { DEFAULT_POSTER } from '../../data/mockData';
import { RateFilmModal } from '../Modals/RateFilmModal';
import { AddToCollectionModal } from '../Modals/AddToCollectionModal';

export const HomeFilmRecommendations: React.FC = () => {
  const {
    films,
    navigateTo,
    isLoggedIn,
    setLoginModalOpen,
    collections,
    isItemInAnyCollection,
    addItemToCollection,
    removeItemFromCollection,
    getOrCreateDefaultCollection,
    showToast,
  } = useApp();

  const [filterType, setFilterType] = useState<'all' | 'recent' | 'popular'>('all');
  const [activeFilmToRate, setActiveFilmToRate] = useState<FilmItem | null>(null);
  const [collectionModalFilm, setCollectionModalFilm] = useState<FilmItem | null>(null);

  const filteredFilms = films.filter(f => {
    if (filterType === 'recent') return f.isRecentRelease || f.year >= 2024;
    if (filterType === 'popular') return f.isPopularRelease || f.isPopularThisWeek || f.skorSotoy >= 4.8;
    return true;
  });

  return (
    <section id="home-film-recommendations" className="py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 mb-6 pb-4 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-white rounded-full inline-block" />
              <h2 className="font-display font-black text-xl sm:text-2xl text-white tracking-tight">
                Curated Film Recommendations
              </h2>
            </div>
            <p className="text-slate-400 text-xs sm:text-[13px] mt-1 ml-3.5">
              Kurasi film bioskop & serial pilihan redaksi lengkap dengan Skor Sotoy dan catatan kuratorial.
            </p>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
            {/* Clean Segmented Control Tabs */}
            <div className="flex items-center p-1 bg-black/40 rounded-xl border border-white/[0.08] text-xs">
              <button
                id="rec-filter-all"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  filterType === 'all'
                    ? 'bg-white/[0.12] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Semua
              </button>
              <button
                id="rec-filter-recent"
                onClick={() => setFilterType('recent')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  filterType === 'recent'
                    ? 'bg-white/[0.12] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Terbaru
              </button>
              <button
                id="rec-filter-popular"
                onClick={() => setFilterType('popular')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  filterType === 'popular'
                    ? 'bg-white/[0.12] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Populer
              </button>
            </div>

            <button
              id="goto-database-btn"
              onClick={() => navigateTo('film-database')}
              className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1 transition-colors px-3 py-1.5 rounded-xl border border-white/[0.08] hover:border-white/20 shrink-0"
            >
              <span>Katalog</span>
              <ChevronRight className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>

        {/* Film Posters Cards Grid (2 to 6 columns) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredFilms.slice(0, 6).map(film => {
            const inWatchlist = isItemInAnyCollection(film.id, 'film');

            return (
              <div
                key={film.id}
                id={`rec-film-card-${film.id}`}
                className="bg-[#171A1F] border border-white/[0.08] hover:border-white/20 rounded-2xl overflow-hidden hover:-translate-y-1 transition-all duration-300 flex flex-col group shadow-lg"
              >
                {/* Movie Poster with Hover Zoom */}
                <div
                  onClick={() => navigateTo('film-detail', { filmId: film.id })}
                  className="relative aspect-[2/3] w-full overflow-hidden cursor-pointer bg-slate-950"
                >
                  <img
                    src={film.poster?.trim() || DEFAULT_POSTER}
                    alt={film.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#171A1F] via-transparent to-transparent opacity-80" />

                  {/* Rating Tag */}
                  <div className="absolute top-2 left-2 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded-lg border border-[#FFD000]/30 text-[#FFD000] text-xs font-mono tabular-nums flex items-center gap-1 shadow-md">
                    <Star className="w-3 h-3 fill-[#FFD000] text-[#FFD000]" />
                    <span>{film.criticsSkorSotoy ? film.criticsSkorSotoy.toFixed(1) : film.skorSotoy.toFixed(1)}</span>
                  </div>

                  {/* Watchlist Quick Button */}
                  <button
                    id={`rec-watchlist-btn-${film.id}`}
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!isLoggedIn) {
                        setLoginModalOpen(true);
                        showToast('Silakan Log In terlebih dahulu untuk menyimpan ke Daftar Tonton!');
                        return;
                      }
                      const defaultCol = await getOrCreateDefaultCollection();
                      if (!defaultCol) return;
                      const isInDefault = defaultCol.items.some((i: any) => i.itemId === film.id && i.itemType === 'film');
                      if (isInDefault) {
                        await removeItemFromCollection(defaultCol.id, film.id);
                      } else {
                        await addItemToCollection(defaultCol.id, film.id, 'film');
                      }
                    }}
                    title={inWatchlist ? 'Hapus dari Watchlist' : 'Tambah ke Watchlist'}
                    className={`absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                      inWatchlist
                        ? 'bg-[#FF2E7E] text-white shadow-md'
                        : 'bg-black/60 backdrop-blur-md text-white/80 hover:text-white hover:bg-black/90'
                    }`}
                  >
                    {inWatchlist ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                  </button>

                  {/* Year & Format subtle footer */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-300">
                    <span className="capitalize text-slate-400">{film.type}</span>
                    <span>{film.year}</span>
                  </div>
                </div>

                {/* Film Info Body */}
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h3
                      onClick={() => navigateTo('film-detail', { filmId: film.id })}
                      className="font-display font-semibold text-xs text-white group-hover:text-white transition-colors line-clamp-1 cursor-pointer mb-0.5"
                    >
                      {film.title}
                    </h3>
                    <p className="text-slate-400 text-[11px] line-clamp-1 mb-2">
                      {film.genres.slice(0, 2).join(', ')}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-white/[0.08] flex items-center gap-1.5">
                    <button
                      onClick={() => navigateTo('film-detail', { filmId: film.id })}
                      className="flex-1 py-1 px-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 text-[11px] font-medium text-center transition-colors"
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
                      className="py-1 px-2 rounded-lg bg-white/15 hover:bg-white text-white hover:text-slate-950 text-[11px] font-semibold transition-colors flex items-center gap-0.5 font-mono tabular-nums"
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
    </section>
  );
};
