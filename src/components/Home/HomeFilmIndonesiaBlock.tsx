import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { HOMEPAGE_SECTIONS_META } from '../../utils/homepageConfigHelper';
import { resolveHomeFilmIndonesia } from '../../utils/filmSections';
import { FilmDbCard } from '../Film/FilmDbCard';

/**
 * Homepage wide block: "Film Indonesia".
 * Renders a horizontally scrollable row of Indonesian film posters resolved
 * from TMDB country of origin or the manual "Film Indonesia" tag override.
 */
export const HomeFilmIndonesiaBlock: React.FC = () => {
  const { films, homepageSectionsConfig, navigateTo } = useApp();

  const config = homepageSectionsConfig?.sections?.home_film_indonesia;
  const meta = HOMEPAGE_SECTIONS_META.find(item => item.key === 'home_film_indonesia');

  const title = config?.title?.trim() || meta?.defaultTitle || 'Film Indonesia';
  const description = config?.description?.trim() || meta?.defaultDescription || '';

  const visibleFilms = React.useMemo(
    () => resolveHomeFilmIndonesia(films, config),
    [films, config]
  );

  if (visibleFilms.length === 0) return null;

  return (
    <section id="home-film-indonesia" className="py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 mb-5 pb-3 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#FF2E7E] rounded-full inline-block" />
              <h2 className="font-display font-black text-xl sm:text-2xl text-white tracking-tight">
                {title}
              </h2>
            </div>
            {description && (
              <p className="text-slate-400 text-xs sm:text-[13px] mt-1 ml-3.5">
                {description}
              </p>
            )}
          </div>

          <button
            id="home-film-indonesia-see-all-btn"
            onClick={() => navigateTo('film-database')}
            className="self-start sm:self-auto text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>Lihat di Film Database</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#FF2E7E]" />
          </button>
        </div>

        {/* Horizontally scrollable poster row */}
        <div
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-none scroll-smooth touch-pan-x"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {visibleFilms.map(film => (
            <div key={film.id} className="w-36 sm:w-40 shrink-0 snap-start">
              <FilmDbCard
                film={film}
                sectionKey="fd_film_indonesia"
                onOpen={item => navigateTo('film-detail', { filmId: item.id })}
              />
            </div>
          ))}
        </div>

        <p className="text-slate-500 text-[10px] sm:text-[11px] mt-2">
          Data negara asal film oleh TMDB.
        </p>
      </div>
    </section>
  );
};
