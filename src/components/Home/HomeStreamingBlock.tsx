import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { HOMEPAGE_SECTIONS_META } from '../../utils/homepageConfigHelper';
import { getStreamingPlatforms, resolveHomeStreaming } from '../../utils/filmSections';
import { HOME_FILM_GRID_CLASS, getResponsiveCardVisibilityClass } from '../../utils/filmGrid';
import { FilmDbCard } from '../Film/FilmDbCard';

/**
 * Homepage wide block: "Explore What's Streaming".
 * Renders platform tabs plus a responsive grid of film posters.
 */
export const HomeStreamingBlock: React.FC = () => {
  const { films, homepageSectionsConfig, navigateTo } = useApp();

  const [activePlatform, setActivePlatform] = React.useState<string>('all');

  const config = homepageSectionsConfig?.sections?.home_streaming;
  const meta = HOMEPAGE_SECTIONS_META.find(item => item.key === 'home_streaming');

  const title = config?.title?.trim() || meta?.defaultTitle || "Explore What's Streaming";
  const description = config?.description?.trim() || meta?.defaultDescription || '';

  const platforms = React.useMemo(() => getStreamingPlatforms(films), [films]);

  const visibleFilms = React.useMemo(
    () =>
      resolveHomeStreaming(
        films,
        config,
        activePlatform === 'all' ? undefined : activePlatform
      ),
    [films, config, activePlatform]
  );

  if (visibleFilms.length === 0) return null;

  const showPlatformTabs = !config?.platform && platforms.length > 0;

  return (
    <section id="home-streaming" className="py-6 sm:py-8">
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
            id="home-streaming-see-all-btn"
            onClick={() => navigateTo('film-database')}
            className="self-start sm:self-auto text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>Lihat di Film Database</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#FF2E7E]" />
          </button>
        </div>

        {/* Platform Tabs */}
        {showPlatformTabs && (
          <div
            role="tablist"
            aria-label="Filter platform streaming"
            className="flex items-center gap-2 overflow-x-auto pb-1 mb-3 scrollbar-none scroll-smooth touch-pan-x"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={activePlatform === 'all'}
              onClick={() => setActivePlatform('all')}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                activePlatform === 'all'
                  ? 'bg-[#FF2E7E] text-slate-950 border-[#FF2E7E]'
                  : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white hover:border-[#FF2E7E]'
              }`}
            >
              Semua
            </button>
            {platforms.map(platform => (
              <button
                key={platform.name}
                type="button"
                role="tab"
                aria-selected={activePlatform === platform.name}
                onClick={() => setActivePlatform(platform.name)}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  activePlatform === platform.name
                    ? 'bg-[#FF2E7E] text-slate-950 border-[#FF2E7E]'
                    : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white hover:border-[#FF2E7E]'
                }`}
              >
                <span>{platform.name}</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-black/20">
                  {platform.count}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Responsive poster grid, trimmed to complete rows per breakpoint */}
        <div className={HOME_FILM_GRID_CLASS}>
          {visibleFilms.map((film, index) => (
            <div
              key={film.id}
              className={getResponsiveCardVisibilityClass(index, visibleFilms.length)}
            >
              <FilmDbCard
                film={film}
                sectionKey="fd_streaming"
                onOpen={item => navigateTo('film-detail', { filmId: item.id })}
              />
            </div>
          ))}
        </div>

        <p className="text-slate-500 text-[10px] sm:text-[11px] mt-2">
          Data platform streaming oleh JustWatch via TMDB.
        </p>
      </div>
    </section>
  );
};
