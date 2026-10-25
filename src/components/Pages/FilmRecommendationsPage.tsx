import React, { useMemo, useState } from 'react';
import { ArrowRight, RotateCcw, Shuffle, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AdBannerSlot } from '../Common/AdBannerSlot';
import { SectionHeader } from '../Common/SectionHeader';
import { FilmDbCard } from '../Film/FilmDbCard';
import { DEFAULT_POSTER } from '../../data/mockData';
import { FilmItem, HomepageSectionKey, SectionConfig } from '../../types';
import {
  DEFAULT_REC_SECTION_ORDER,
  HOMEPAGE_SECTIONS_META,
} from '../../utils/homepageConfigHelper';
import { getStreamingPlatforms, resolveFilmDbSection } from '../../utils/filmSections';
import { getFilmGenreList } from '../../utils/filmGenres';
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

const getFilmDetailHref = (film: FilmItem): string =>
  `/film/${encodeURIComponent(film.slug || film.id || '')}`;

export const FilmRecommendationsPage: React.FC = () => {
  const { films, homepageSectionsConfig, navigateTo } = useApp();

  const [selectedMoodId, setSelectedMoodId] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [pickedFilm, setPickedFilm] = useState<FilmItem | null>(null);
  const [randomNotice, setRandomNotice] = useState('');

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
      setRandomNotice('Belum ada film yang bisa diacak untuk filter ini.');
      return;
    }
    setPickedFilm(next);
    setRandomNotice('');
  };

  const openFilm = (film: FilmItem) => navigateTo('film-detail', { filmId: film.id });

  return (
    <div className="min-h-screen py-8 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div
          id="recommendation-header"
          className="bg-[#171717] border border-slate-800 rounded-3xl p-6 sm:p-10"
        >
          <div className="max-w-3xl">
            <span className="bg-[#FF2E7E]/15 text-[#FF2E7E] border border-[#FF2E7E]/30 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg mb-3">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              Kurasi Sotoy
            </span>
            <h1 className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight leading-tight mb-2">
              Rekomendasi Film
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Pilih suasana hati atau platform streaming, lalu temukan film yang paling pas untuk ditonton.
            </p>

            {/* Mood chips */}
            <div
              role="group"
              aria-label="Filter suasana hati"
              className="flex gap-2 overflow-x-auto pb-1 mt-5 scrollbar-none scroll-smooth touch-pan-x"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {FILM_MOODS.map(mood => {
                const active = selectedMoodId === mood.id;
                return (
                  <button
                    key={mood.id}
                    id={`mood-chip-${mood.id}`}
                    type="button"
                    aria-pressed={active}
                    onClick={() => handleMoodToggle(mood.id)}
                    className={`shrink-0 whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                      active
                        ? 'bg-[#FF2E7E] text-slate-950 border-[#FF2E7E] font-black shadow-lg shadow-[#FF2E7E]/25'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white hover:border-[#FF2E7E]'
                    }`}
                  >
                    {mood.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <AdBannerSlot variant="leaderboard" />

        {/* Platform filter + random picker */}
        <div className="flex flex-col gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Filter Platform
            </span>
            <button
              type="button"
              id="random-film-btn"
              onClick={handleRandomPick}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FF2E7E] hover:bg-[#e0266e] text-slate-950 text-xs font-black transition-all active:scale-95 shrink-0"
            >
              <Shuffle className="w-3.5 h-3.5" aria-hidden="true" />
              Acak film
            </button>
          </div>

          {platforms.length > 0 && (
            <div
              role="group"
              aria-label="Filter platform streaming"
              className="flex gap-2 overflow-x-auto pb-1 scrollbar-none scroll-smooth touch-pan-x"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {platforms.map(platform => {
                const active = selectedPlatform === platform.name;
                return (
                  <button
                    key={platform.name}
                    type="button"
                    aria-pressed={active}
                    onClick={() => handlePlatformToggle(platform.name)}
                    className={`shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      active
                        ? 'bg-white text-slate-950 border-white font-black'
                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white hover:border-[#FF2E7E]'
                    }`}
                  >
                    <span>{platform.name}</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-black/20">
                      {platform.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Random pick result */}
        {pickedFilm && (
          <div
            id="random-film-result"
            className="bg-[#171717] border border-[#FF2E7E]/40 rounded-2xl p-4 flex gap-4 items-start"
          >
            <img
              src={pickedFilm.poster?.trim() || DEFAULT_POSTER}
              alt={pickedFilm.title || 'Poster film'}
              loading="lazy"
              onError={event => {
                if (event.currentTarget.src !== DEFAULT_POSTER) {
                  event.currentTarget.src = DEFAULT_POSTER;
                }
              }}
              className="w-20 sm:w-24 aspect-[2/3] object-cover rounded-xl border border-white/10 shrink-0 bg-slate-900"
            />

            <div className="min-w-0 flex-1 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#FF2E7E]">
                Pilihan acak
              </span>
              <div className="min-w-0">
                <h3 className="font-display font-black text-base sm:text-lg text-white leading-tight">
                  {pickedFilm.title || 'Tanpa judul'}
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  {pickedFilm.year || '—'}
                  {getFilmGenreList(pickedFilm).length > 0
                    ? ` • ${getFilmGenreList(pickedFilm).join(', ')}`
                    : ''}
                </p>
              </div>

              {getPlatformNames(pickedFilm).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {getPlatformNames(pickedFilm).map(name => (
                    <span
                      key={name}
                      className="text-[10px] font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <a
                  href={getFilmDetailHref(pickedFilm)}
                  onClick={event => {
                    event.preventDefault();
                    openFilm(pickedFilm);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF2E7E] hover:bg-[#e0266e] text-slate-950 text-xs font-black transition-colors"
                >
                  Lihat film
                  <ArrowRight className="w-3 h-3" aria-hidden="true" />
                </a>
                <button
                  type="button"
                  onClick={handleRandomPick}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
                >
                  <Shuffle className="w-3 h-3" aria-hidden="true" />
                  Acak lagi
                </button>
              </div>
            </div>
          </div>
        )}

        {!pickedFilm && randomNotice && (
          <div
            role="status"
            className="bg-slate-900/60 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-slate-400"
          >
            {randomNotice}
          </div>
        )}

        {/* Content */}
        {hasFilter ? (
          <section id="recommendation-results" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 bg-[#FF2E7E] rounded-full inline-block" aria-hidden="true" />
                <h2 className="font-display font-black text-xl sm:text-2xl text-white tracking-tight">
                  Hasil Filter
                </h2>
                <span className="text-xs font-bold text-slate-400">
                  {filteredFilms.length} film
                </span>
              </div>
              <button
                type="button"
                id="reset-rec-filters-btn"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-[#FF2E7E] text-slate-300 hover:text-white text-xs font-bold transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                Reset filter
              </button>
            </div>

            {filteredFilms.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800">
                <p className="text-slate-400 text-sm">
                  Belum ada film yang cocok dengan filter ini.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-3 text-xs font-bold text-[#FF2E7E] hover:underline"
                >
                  Reset filter
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredFilms.map(film => (
                  <FilmDbCard
                    key={film.id}
                    film={film}
                    sectionKey="rec_tonight"
                    onOpen={openFilm}
                  />
                ))}
              </div>
            )}
          </section>
        ) : recRows.length === 0 ? (
          <div className="text-center py-14 bg-slate-900/50 rounded-2xl border border-slate-800">
            <Sparkles className="w-6 h-6 text-[#FF2E7E] mx-auto mb-3" aria-hidden="true" />
            <p className="text-slate-300 text-sm font-bold">Belum ada rekomendasi film saat ini.</p>
            <p className="text-slate-500 text-xs mt-1">
              Coba pilih mood atau platform lain, atau kembali lagi nanti.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {recRows.map(row => (
              <section key={row.key} id={`rec-section-${row.key}`}>
                <SectionHeader
                  title={row.title}
                  description={row.description}
                  right={
                    <span className="text-xs font-bold text-slate-400">
                      {row.films.length} film
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
  );
};
