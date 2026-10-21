import React from 'react';
import { Star } from 'lucide-react';
import { FilmItem, HomepageSectionKey } from '../../types';
import { normalizePlatform } from '../../utils/filmSections';
import { formatReleaseDate } from '../../utils/formatRelativeTime';

export interface FilmDbCardProps {
  film: FilmItem;
  sectionKey: HomepageSectionKey;
  onGenreClick?: (genre: string) => void;
  onOpen: (film: FilmItem) => void;
  activePlatform?: string;
}

/**
 * Shared poster card used by the Film Database sections and the homepage
 * "Explore What's Streaming" block.
 */
export const FilmDbCard: React.FC<FilmDbCardProps> = ({
  film,
  sectionKey,
  onGenreClick,
  onOpen,
  activePlatform,
}) => {
  const streamPlatform = film.whereToWatch?.find(w => w.type === 'stream' && w.platform);

  let bottomLine = `${film.duration ? `${film.duration} • ` : ''}${film.year}`;
  if (sectionKey === 'fd_on_theatres' || sectionKey === 'fd_coming_soon') {
    bottomLine = formatReleaseDate(film.idReleaseDate ?? film.releaseDate);
  } else if (sectionKey === 'fd_streaming') {
    const activeTabPlatform = activePlatform && activePlatform !== 'all' ? activePlatform : '';
    bottomLine =
      activeTabPlatform || (streamPlatform ? normalizePlatform(streamPlatform.platform) : '');
  }

  return (
    <div
      id={`film-db-card-${sectionKey}-${film.id}`}
      onClick={() => onOpen(film)}
      className="bg-[#171717] border border-slate-800 rounded-2xl overflow-hidden hover:border-[#FF2E7E]/70 hover:-translate-y-1 hover:scale-[1.015] transition-all duration-300 flex flex-col group cursor-pointer"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-900">
        <img
          src={film.poster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=300&q=80'}
          alt={film.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        <div className="absolute top-2 left-2 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded-lg border border-[#FFD000]/30 text-[#FFD000] text-[11px] font-black flex items-center gap-1">
          <Star className="w-3 h-3 fill-current text-[#FFD000]" />
          <span>{film.skorSotoy.toFixed(1)}</span>
        </div>

        {sectionKey === 'fd_streaming' && film.type === 'series' && (
          <span className="absolute top-2 right-2 bg-slate-800 border border-slate-700 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded">
            Series
          </span>
        )}
        {sectionKey === 'fd_streaming' && film.type === 'animation' && (
          <span className="absolute top-2 right-2 bg-[#FF2E7E] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded">
            Animation
          </span>
        )}

        {bottomLine && (
          <div
            className="absolute bottom-2 left-2 right-2 text-[10px] text-slate-300 font-bold truncate bg-black/60 rounded px-1 py-0.5"
            title={bottomLine}
          >
            {bottomLine}
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-display font-bold text-xs sm:text-sm text-white group-hover:text-[#FF2E7E] transition-colors line-clamp-1 mb-1">
          {film.title}
        </h3>
        <div className="flex flex-wrap gap-1">
          {film.genres.slice(0, 2).map(g => (
            onGenreClick ? (
              <button
                key={g}
                onClick={e => {
                  e.stopPropagation();
                  onGenreClick(g);
                }}
                className="text-[9px] font-medium px-1.5 py-0.2 rounded text-slate-400 bg-slate-800/80 hover:text-white transition-colors"
              >
                {g}
              </button>
            ) : (
              <span
                key={g}
                className="text-[9px] font-medium px-1.5 py-0.2 rounded text-slate-400 bg-slate-800/80"
              >
                {g}
              </span>
            )
          ))}
        </div>
      </div>
    </div>
  );
};
