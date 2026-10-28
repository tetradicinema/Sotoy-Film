import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ChevronRight, Clapperboard, Layers, Star } from 'lucide-react';
import type { FilmItem } from '../../types';
import { slugify } from '../../utils/slugify';
import { tmdbMediaType } from '../../utils/tmdbSync';
import {
  pickLastSeason,
  type TmdbSeasonSummary,
} from '../../utils/tmdbSeasonsTrim';
import { fetchTmdbSeasons, tmdbSeasonPosterUrl } from '../../utils/tmdbHelper';
import {
  aggregateMediaRatings,
  formatSkorSotoy,
  seasonRatingKey,
  type MediaRatingDoc,
} from '../../utils/mediaRatings';
import { fetchFilmSeasonRatingDocs } from './RateMediaModal';

const seasonLabel = (seasonNumber: number): string =>
  seasonNumber === 0 ? 'Specials' : `Season ${seasonNumber}`;

const formatAirDate = (value: string): string => {
  if (!value) return '';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const airYear = (value: string): string =>
  value && value.length >= 4 ? value.slice(0, 4) : '';

export const FilmLastSeasonCard: React.FC<{ film: FilmItem }> = ({ film }) => {
  const enabled = Boolean(film.tmdbId) && tmdbMediaType(film) === 'tv';

  const [started, setStarted] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [season, setSeason] = useState<TmdbSeasonSummary | null>(null);
  const [ratingDocs, setRatingDocs] = useState<MediaRatingDoc[]>([]);

  const sectionRef = useRef<HTMLElement | null>(null);

  // Lazy load: only fetch once the section is within 300px of the viewport.
  useEffect(() => {
    if (!enabled || started) return;
    const node = sectionRef.current;
    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      setStarted(true);
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, started]);

  useEffect(() => {
    if (!enabled || !started) return;
    let isMounted = true;
    setStatus('loading');
    setSeason(null);

    const load = async () => {
      const data = await fetchTmdbSeasons(film.tmdbId);
      if (!isMounted) return;

      const picked = pickLastSeason(data?.seasons);
      if (!picked) {
        setStatus('error');
        return;
      }
      setSeason(picked);
      setStatus('ready');
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [enabled, started, film.tmdbId]);

  // One query for the film's season-level scores (episodeNumber == null).
  useEffect(() => {
    if (!enabled || !started || !film.id) return;
    let isMounted = true;

    fetchFilmSeasonRatingDocs(film.id).then(docs => {
      if (isMounted) setRatingDocs(docs);
    });

    return () => {
      isMounted = false;
    };
  }, [enabled, started, film.id]);

  const aggregates = useMemo(() => aggregateMediaRatings(ratingDocs), [ratingDocs]);

  if (!enabled) return null;
  if (status === 'error') return null;
  if (status === 'ready' && !season) return null;

  const filmSlug = film.slug || slugify(film.title) || film.id;
  const seasonsPath = `/film/${encodeURIComponent(filmSlug)}/seasons`;
  const seasonAggregate = season
    ? aggregates[seasonRatingKey(season.seasonNumber)]
    : undefined;

  return (
    <section
      id="section-last-season"
      ref={sectionRef}
      className="bg-[#171717] border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-xl space-y-5"
      aria-labelledby="section-last-season-heading"
    >
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2
            id="section-last-season-heading"
            className="font-display font-black text-xl sm:text-2xl text-white flex items-center gap-2.5"
          >
            <Layers className="w-5 h-5 text-[#FF2E7E]" />
            <span>Season Terakhir</span>
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Ringkasan season terbaru dari {film.title}
          </p>
        </div>
      </div>

      {status !== 'ready' || !season ? (
        <div className="flex gap-4 animate-pulse" aria-hidden="true">
          <div className="w-24 sm:w-32 aspect-[2/3] rounded-2xl bg-slate-900 border border-slate-800 shrink-0" />
          <div className="flex-1 space-y-3 pt-1">
            <div className="h-5 w-32 bg-slate-800 rounded" />
            <div className="h-3 w-40 bg-slate-800/80 rounded" />
            <div className="h-3 w-full bg-slate-800/60 rounded" />
            <div className="h-3 w-4/5 bg-slate-800/60 rounded" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          <div className="w-28 sm:w-32 aspect-[2/3] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shrink-0">
            {season.posterPath ? (
              <img
                src={tmdbSeasonPosterUrl(season.posterPath)}
                alt={`Poster ${seasonLabel(season.seasonNumber)} ${film.title}`}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-600">
                <Clapperboard className="w-7 h-7" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-[#FF2E7E] text-white font-black text-[10px] sm:text-xs uppercase px-2.5 py-1 rounded-full">
                {seasonLabel(season.seasonNumber)}
              </span>
              <span className="text-slate-300 text-[11px] sm:text-xs font-semibold bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
                {[airYear(season.airDate), season.episodeCount > 0 ? `${season.episodeCount} Episode` : '']
                  .filter(Boolean)
                  .join(' • ')}
              </span>
              <span className="inline-flex items-center gap-1 bg-amber-500/15 border border-amber-500/40 text-amber-400 text-[10px] font-black px-2.5 py-1 rounded-full">
                <Star className="w-3 h-3 fill-current" />
                {formatSkorSotoy(seasonAggregate)}
              </span>
            </div>

            {formatAirDate(season.airDate) && (
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#FF2E7E]" />
                {formatAirDate(season.airDate)}
              </p>
            )}

            {season.overview && (
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed line-clamp-3">
                {season.overview}
              </p>
            )}

            <Link
              to={seasonsPath}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FF2E7E] hover:text-white transition-colors pt-1"
            >
              Lihat Semua Season
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </section>
  );
};

export default FilmLastSeasonCard;
