import React, { useEffect, useMemo, useState } from 'react';
import { Shuffle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AdBannerSlot } from '../Common/AdBannerSlot';
import { SectionHeader } from '../Common/SectionHeader';
import { FilmDbCard } from '../Film/FilmDbCard';
import { WatchNextChip } from '../Recommendations/WatchNextChip';
import { WatchNextFeaturedPick } from '../Recommendations/WatchNextFeaturedPick';
import { FilmItem, HomepageSectionKey, SectionConfig } from '../../types';
import {
  DEFAULT_REC_SECTION_ORDER,
  HOMEPAGE_SECTIONS_META,
} from '../../utils/homepageConfigHelper';
import { getStreamingPlatforms, resolveFilmDbSection } from '../../utils/filmSections';
import {
  FILM_MOODS,
  filterRecommendationFilms,
  pickRandomFilm,
} from '../../utils/filmMoods';

interface RecommendationRow {
  key: HomepageSectionKey;
  title: string;
  description: string;
  films: FilmItem[];
}

const filmCountLabel = (count: number): string =>
  `${count} ${count === 1 ? 'film' : 'films'}`;

// The filtered results grid keeps a rec_* card key so shared FilmDbCard ids
// stay valid even though the editorial rows are not rendered in that view.
const FILTERED_RESULTS_SECTION_KEY: HomepageSectionKey = 'rec_tonight';

export const FilmRecommendationsPage: React.FC = () => {
  const { films, homepageSectionsConfig, navigateTo } = useApp();

  const [selectedMoodId, setSelectedMoodId] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [pickedFilm, setPickedFilm] = useState<FilmItem | null>(null);
  const [randomNotice, setRandomNotice] = useState('');

  // The shared fixed navigation can exceed a 375px viewport on this route.
  // Clip horizontal overflow at the document level so the page itself never
  // scrolls sideways; the filter strips keep their own internal scrolling.
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflowX = root.style.overflowX;
    const previousBodyOverflowX = body.style.overflowX;
    root.style.overflowX = 'clip';
    body.style.overflowX = 'clip';

    return () => {
      root.style.overflowX = previousRootOverflowX;
      body.style.overflowX = previousBodyOverflowX;
    };
  }, []);

  // Editorial rows in the fixed recommendation order (disabled/empty hidden).
  const recRows = useMemo<RecommendationRow[]>(() => {
    const metaByKey = new Map(HOMEPAGE_SECTIONS_META.map(meta => [meta.key, meta]));

    return DEFAULT_REC_SECTION_ORDER.reduce<RecommendationRow[]>((rows, key) => {
      const meta = metaByKey.get(key);
      const sectionConfig: SectionConfig =
        homepageSectionsConfig?.sections?.[key] ?? { sourceType: 'auto' };

      if (sectionConfig.enabled === false) return rows;

      const rowFilms = resolveFilmDbSection(key, films, sectionConfig);
      if (rowFilms.length === 0) return rows;

      rows.push({
        key,
        title: sectionConfig.title?.trim() || meta?.defaultTitle || '',
        description: sectionConfig.description?.trim() || meta?.defaultDescription || '',
        films: rowFilms,
      });

      return rows;
    }, []);
  }, [films, homepageSectionsConfig]);

  const hasFilter = Boolean(selectedMoodId || selectedPlatform);

  const filteredFilms = useMemo(
    () => filterRecommendationFilms(films, { moodId: selectedMoodId, platform: selectedPlatform }),
    [films, selectedMoodId, selectedPlatform]
  );

  const platforms = useMemo(() => getStreamingPlatforms(films), [films]);

  // Pool for the random picker: current results, or every editorial row film.
  const randomPool = useMemo<FilmItem[]>(() => {
    const source = hasFilter ? filteredFilms : recRows.flatMap(row => row.films);
    const seen = new Set<string>();
    return source.filter(film => {
      if (!film || !film.id || seen.has(film.id)) return false;
      seen.add(film.id);
      return true;
    });
  }, [hasFilter, filteredFilms, recRows]);

  const clearPick = () => {
    setPickedFilm(null);
    setRandomNotice('');
  };

  const handleMoodToggle = (moodId: string) => {
    setSelectedMoodId(prev => (prev === moodId ? null : moodId));
    clearPick();
  };

  const handlePlatformToggle = (platform: string) => {
    setSelectedPlatform(prev => (prev === platform ? null : platform));
    clearPick();
  };

  const handleResetFilters = () => {
    setSelectedMoodId(null);
    setSelectedPlatform(null);
    clearPick();
  };

  const handleRandomPick = () => {
    const next = pickRandomFilm(randomPool, pickedFilm?.id ?? null);
    if (!next) {
      setPickedFilm(null);
      setRandomNotice('No film to shuffle here yet. Try another mood or platform.');
      return;
    }
    setPickedFilm(next);
    setRandomNotice('');
  };

  const openFilm = (film: FilmItem) => navigateTo('film-detail', { filmId: film.id });

  return (
    <div className="min-h-screen overflow-x-hidden bg-background pb-16 pt-6 sm:pt-10">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <header id="recommendation-header" className="border-b border-slate-800 pb-8 sm:pb-12">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl">
              <h1 className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight leading-tight">
                Watch Next
              </h1>
              <p className="mt-3 max-w-xl text-slate-400 text-sm sm:text-base leading-relaxed">
                Pick a mood, pick a platform, press play.
              </p>
            </div>

            <button
              type="button"
              id="random-film-btn"
              onClick={handleRandomPick}
              className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-6 text-sm font-semibold text-background transition-colors hover:bg-accent-hover motion-reduce:transition-none sm:w-auto"
            >
              <Shuffle className="h-4 w-4" aria-hidden="true" />
              Surprise me
            </button>
          </div>

          <div className="mt-8 space-y-5">
            <div>
              <p className="mb-3 text-sm text-slate-400">Mood</p>
              <div
                role="group"
                aria-label="Filter by mood"
                className="flex w-full gap-2 overflow-x-auto pb-1 scrollbar-none scroll-smooth touch-pan-x"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {FILM_MOODS.map(mood => (
                  <WatchNextChip
                    key={mood.id}
                    id={`mood-chip-${mood.id}`}
                    active={selectedMoodId === mood.id}
                    onClick={() => handleMoodToggle(mood.id)}
                  >
                    {mood.label}
                  </WatchNextChip>
                ))}
              </div>
            </div>

            {platforms.length > 0 && (
              <div>
                <p className="mb-3 text-sm text-slate-400">Platform</p>
                <div
                  role="group"
                  aria-label="Filter by streaming platform"
                  className="flex w-full gap-2 overflow-x-auto pb-1 scrollbar-none scroll-smooth touch-pan-x"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  {platforms.map(platform => (
                    <WatchNextChip
                      key={platform.name}
                      active={selectedPlatform === platform.name}
                      onClick={() => handlePlatformToggle(platform.name)}
                      count={platform.count}
                    >
                      {platform.name}
                    </WatchNextChip>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="mt-8 space-y-12 sm:mt-10 sm:space-y-16">
          <AdBannerSlot variant="leaderboard" />

          {pickedFilm && (
            <WatchNextFeaturedPick
              film={pickedFilm}
              onView={openFilm}
              onAnother={handleRandomPick}
            />
          )}

          {!pickedFilm && randomNotice && (
            <p
              role="status"
              className="border-y border-slate-800 py-4 text-sm text-slate-400"
            >
              {randomNotice}
            </p>
          )}

          {hasFilter ? (
            <section id="recommendation-results">
              <SectionHeader
                title="Your matches"
                right={
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs text-slate-400 tabular-nums">
                      {filmCountLabel(filteredFilms.length)}
                    </span>
                    <button
                      type="button"
                      id="reset-rec-filters-btn"
                      onClick={handleResetFilters}
                      className="inline-flex min-h-11 items-center rounded-lg border border-slate-700 px-4 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:text-slate-50 motion-reduce:transition-none"
                    >
                      Clear filters
                    </button>
                  </div>
                }
              />

              {filteredFilms.length === 0 ? (
                <div className="border-y border-slate-800 py-16 text-center">
                  <p className="font-display text-2xl font-black tracking-tight text-white">
                    Nothing here yet
                  </p>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-400">
                    Try another mood or platform.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {filteredFilms.map(film => (
                    <FilmDbCard
                      key={film.id}
                      film={film}
                      sectionKey={FILTERED_RESULTS_SECTION_KEY}
                      onOpen={openFilm}
                    />
                  ))}
                </div>
              )}
            </section>
          ) : recRows.length === 0 ? (
            <div className="border-y border-slate-800 py-16 text-center">
              <p className="font-display text-2xl font-black tracking-tight text-white">
                Nothing here yet
              </p>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-400">
                Try another mood or platform, or check back later.
              </p>
            </div>
          ) : (
            <div className="space-y-14 sm:space-y-20">
              {recRows.map(row => (
                <section key={row.key} id={`rec-section-${row.key}`}>
                  <SectionHeader
                    title={row.title}
                    description={row.description}
                    right={
                      <span className="text-xs text-slate-400 tabular-nums">
                        {filmCountLabel(row.films.length)}
                      </span>
                    }
                  />

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {row.films.map(film => (
                      <FilmDbCard
                        key={film.id}
                        film={film}
                        sectionKey={row.key}
                        onOpen={openFilm}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          <AdBannerSlot variant="infeed" />
        </div>
      </div>
    </div>
  );
};
