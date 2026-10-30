import React, { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { HOMEPAGE_SECTIONS_META } from '../../utils/homepageConfigHelper';
import { resolveHomeFilmRecs } from '../../utils/filmSections';
import { FilmDbCard } from '../Film/FilmDbCard';

export const HomeFilmRecommendations: React.FC = () => {
  const {
    films,
    navigateTo,
    homepageSectionsConfig,
  } = useApp();

  const config = homepageSectionsConfig?.sections?.home_film_recs;
  const meta = HOMEPAGE_SECTIONS_META.find(item => item.key === 'home_film_recs');

  const title = config?.title?.trim() || meta?.defaultTitle || 'Curated Film Recommendations';
  const description = config?.description?.trim() || meta?.defaultDescription || '';

  const resolvedFilms = useMemo(
    () => resolveHomeFilmRecs(films, config),
    [films, config]
  );

  if (resolvedFilms.length === 0) return null;

  return (
    <section id="home-film-recommendations" className="py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 mb-6 pb-4 border-b border-white/[0.08]">
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
            id="goto-database-btn"
            onClick={() => navigateTo('film-database')}
            className="self-start sm:self-auto text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1 transition-colors px-3 py-1.5 rounded-xl border border-white/[0.08] hover:border-white/20 shrink-0"
          >
            <span>Katalog</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#FF2E7E]" />
          </button>
        </div>

        {/* Film Posters Cards Grid (2 to 6 columns) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {resolvedFilms.map(film => (
            <FilmDbCard
              key={film.id}
              film={film}
              sectionKey="home_film_recs"
              lazyImage
              onOpen={item => navigateTo('film-detail', { filmId: item.id })}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
