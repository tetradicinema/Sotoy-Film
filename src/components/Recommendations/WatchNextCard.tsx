import React from 'react';
import { DEFAULT_POSTER } from '../../data/mockData';
import { FilmItem } from '../../types';
import { getFilmGenreList } from '../../utils/filmGenres';

interface WatchNextCardProps {
  film: FilmItem;
  onOpen: (film: FilmItem) => void;
}

/**
 * Poster-first card built only for Watch Next. It intentionally drops the
 * shared Database card chrome: no nested panel, rating badge, or collection
 * control sits between the poster and the film title.
 */
export const WatchNextCard: React.FC<WatchNextCardProps> = ({ film, onOpen }) => {
  const score = Number(film.skorSotoy);
  const scoreLabel = Number.isFinite(score) && score > 0 ? score.toFixed(1) : '';
  const genres = getFilmGenreList(film).slice(0, 2).join(' / ');

  return (
    <button
      type="button"
      onClick={() => onOpen(film)}
      aria-label={`View film: ${film.title || 'Untitled'}`}
      className="group w-full text-left"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg border border-slate-800 bg-surface">
        <img
          src={film.poster?.trim() || DEFAULT_POSTER}
          alt=""
          loading="lazy"
          onError={event => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = DEFAULT_POSTER;
          }}
          className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out motion-safe:group-hover:scale-[1.03]"
        />
      </div>

      <div className="mt-3">
        <h3 className="line-clamp-2 font-display text-sm font-semibold leading-snug text-slate-50 transition-colors group-hover:text-accent motion-reduce:transition-none">
          {film.title || 'Untitled'}
        </h3>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-slate-400">
          {scoreLabel && (
            <>
              <span className="font-medium tabular-nums text-accent">{scoreLabel}</span>
              <span aria-hidden="true">·</span>
            </>
          )}
          <span className="tabular-nums">{film.year || '—'}</span>
          {genres && (
            <>
              <span aria-hidden="true">·</span>
              <span className="line-clamp-1">{genres}</span>
            </>
          )}
        </p>
      </div>
    </button>
  );
};
