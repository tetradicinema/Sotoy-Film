import React from 'react';
import { Star } from 'lucide-react';
import { FilmItem, HomepageSectionKey } from '../../types';
import { getCardRating } from '../../utils/filmCardRating';
import { getCardGenres } from '../../utils/filmGenres';
import { tmdbPosterSized } from '../../utils/tmdbImage';
import { CollectionPickerPopover } from '../Common/CollectionPickerPopover';

export interface FilmDbCardProps {
  film: FilmItem;
  sectionKey: HomepageSectionKey;
  onOpen: (film: FilmItem) => void;
  /** Defer the poster download until it nears the viewport (below-the-fold rows). */
  lazyImage?: boolean;
  /** Optional TMDB rank shown as a corner badge (Trending section only). */
  rank?: number;
}

/**
 * Shared poster card used by the Film Database sections and the homepage
 * film rows.
 */
export const FilmDbCard: React.FC<FilmDbCardProps> = ({
  film,
  sectionKey,
  onOpen,
  lazyImage = false,
  rank,
}) => {
  const rating = getCardRating(film);
  const genres = getCardGenres(film);

  const typeLabel =
    sectionKey === 'fd_streaming'
      ? film.type === 'series'
        ? 'Series'
        : film.type === 'animation'
          ? 'Animation'
          : ''
      : '';

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key !== 'Enter') return;

    event.preventDefault();
    onOpen(film);
  };

  return (
    <div
      id={`film-db-card-${sectionKey}-${film.id}`}
      role="button"
      tabIndex={0}
      aria-label={`Buka detail film ${film.title}`}
      onClick={() => onOpen(film)}
      onKeyDown={handleKeyDown}
      className="bg-[#171717] border border-slate-800 rounded-lg overflow-hidden hover:border-[#FF2E7E] hover:-translate-y-1 hover:shadow-lg hover:shadow-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2E7E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#171717] transition-all duration-300 motion-reduce:transition-none motion-reduce:transform-none flex flex-col group cursor-pointer"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-900">
        <img
          src={tmdbPosterSized(film.poster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=300&q=80', 'w342')}
          alt={film.title}
          loading={lazyImage ? 'lazy' : undefined}
          decoding={lazyImage ? 'async' : undefined}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 motion-reduce:transition-none motion-reduce:transform-none"
        />

        {rank !== undefined && (
          <span
            aria-label={`Peringkat ${rank}`}
            className="absolute top-0 left-0 z-10 min-w-[28px] h-7 rounded-br-lg bg-[#FF2E7E] text-slate-950 text-sm font-black tabular-nums inline-flex items-center justify-center px-1"
          >
            {rank}
          </span>
        )}

        {typeLabel && (
          <span
            className={`absolute top-2 left-2 z-10 text-[9px] font-black uppercase px-2 py-0.5 rounded ${
              film.type === 'animation'
                ? 'bg-[#D81B60] text-white'
                : 'bg-slate-800 text-white'
            }`}
          >
            {typeLabel}
          </span>
        )}

        <div
          onClick={e => e.stopPropagation()}
          className="absolute top-2 right-2 z-20"
        >
          <CollectionPickerPopover
            itemId={film.id}
            itemType="film"
            itemName={film.title}
            buttonId={`film-db-watchlist-${sectionKey}-${film.id}`}
            variant="compact"
            hideChevron
            align="right"
            buttonClassName="w-9 h-9 rounded-md bg-[#0A0A0A] hover:bg-slate-800 text-white border border-slate-700 hover:border-[#FF2E7E] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2E7E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#171717] inline-flex items-center justify-center transition-all duration-200 motion-reduce:transition-none motion-reduce:transform-none"
          />
        </div>

        <div
          className={`absolute bottom-2 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-1 ${
            rating.kind === 'score'
              ? 'bg-[#0A0A0A] border-[#FFD000]'
              : 'bg-[#0A0A0A] border-slate-600'
          }`}
        >
          {rating.kind === 'score' ? (
            <>
              <Star className="w-3.5 h-3.5 shrink-0 text-[#FFD000] fill-current" />
              <span className="text-lg font-black text-white leading-none tabular-nums">
                {rating.text}
              </span>
              <span className="text-[10px] font-bold text-slate-400 leading-none">/10</span>
            </>
          ) : (
            <span className="text-[10px] font-bold text-slate-400">Belum ada skor</span>
          )}
        </div>
      </div>

      <div className="bg-black px-2.5 py-2">
        <h3
          className="font-display font-bold text-xs sm:text-sm text-white group-hover:text-[#FF2E7E] transition-colors motion-reduce:transition-none truncate"
          title={film.title}
        >
          {film.title}
        </h3>
        {genres && (
          <p className="mt-0.5 text-[10px] text-slate-400 truncate" title={genres}>
            {genres}
          </p>
        )}
      </div>
    </div>
  );
};
