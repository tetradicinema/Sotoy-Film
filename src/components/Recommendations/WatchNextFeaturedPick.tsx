import React from 'react';
import { Shuffle } from 'lucide-react';
import { DEFAULT_POSTER } from '../../data/mockData';
import { FilmItem } from '../../types';
import { getFilmGenreList } from '../../utils/filmGenres';

interface WatchNextFeaturedPickProps {
  film: FilmItem;
  onView: (film: FilmItem) => void;
  onAnother: () => void;
}

const getPlatformNames = (film: FilmItem): string[] => {
  if (!Array.isArray(film.whereToWatch)) return [];

  const seen = new Set<string>();
  const names: string[] = [];

  for (const entry of film.whereToWatch) {
    const name = typeof entry?.platform === 'string' ? entry.platform.trim() : '';
    if (!name || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }

  return names;
};

/**
 * The random result is the page's one featured moment: a wide, quiet panel
 * where the poster and the film title carry the composition.
 */
export const WatchNextFeaturedPick: React.FC<WatchNextFeaturedPickProps> = ({
  film,
  onView,
  onAnother,
}) => {
  const score = Number(film.skorSotoy);
  const genres = getFilmGenreList(film).slice(0, 3).join(' / ');
  const details = [
    Number.isFinite(score) && score > 0 ? score.toFixed(1) : '',
    film.year ? String(film.year) : '',
    film.duration?.trim() || '',
    genres,
  ].filter(Boolean);
  const platforms = getPlatformNames(film);

  return (
    <section
      id="random-film-result"
      aria-live="polite"
      className="rounded-lg border border-slate-800 bg-surface p-5 sm:p-6 md:p-8"
    >
      <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-4 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-6 md:gap-8">
        <img
          src={film.poster?.trim() || DEFAULT_POSTER}
          alt=""
          loading="lazy"
          onError={event => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = DEFAULT_POSTER;
          }}
          className="aspect-[2/3] w-full rounded-lg border border-slate-800 bg-background object-cover"
        />

        <div className="min-w-0">
          <p className="text-sm font-medium text-accent">Tonight, watch this</p>
          <h2 className="mt-2 font-display text-2xl font-black leading-tight tracking-tight text-white sm:text-4xl">
            {film.title || 'Untitled'}
          </h2>

          {details.length > 0 && (
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-400">
              {details.map((detail, index) => (
                <React.Fragment key={`${detail}-${index}`}>
                  {index > 0 && <span aria-hidden="true">·</span>}
                  <span className={index === 0 ? 'tabular-nums text-slate-300' : ''}>
                    {detail}
                  </span>
                </React.Fragment>
              ))}
            </p>
          )}

          {film.synopsis?.trim() && (
            <p className="mt-4 line-clamp-3 max-w-2xl text-sm leading-6 text-slate-400">
              {film.synopsis.trim()}
            </p>
          )}

          {platforms.length > 0 && (
            <p className="mt-3 text-xs leading-5 text-slate-400">
              Streaming on {platforms.join(', ')}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onView(film)}
              className="inline-flex min-h-11 items-center rounded-lg bg-accent px-5 text-sm font-semibold text-background transition-colors hover:bg-accent-hover motion-reduce:transition-none"
            >
              View film
            </button>
            <button
              type="button"
              onClick={onAnother}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-700 px-5 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:text-slate-50 motion-reduce:transition-none"
            >
              <Shuffle className="h-4 w-4" aria-hidden="true" />
              Another one
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
