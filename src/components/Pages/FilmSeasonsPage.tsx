import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, ChevronRight, Clapperboard, Layers, Star } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SEOHead } from '../SEO/SEOHead';
import { FilmDetailSkeleton } from '../Skeletons';
import type { FilmItem } from '../../types';
import { slugify } from '../../utils/slugify';
import { tmdbMediaType } from '../../utils/tmdbSync';
import type { TmdbSeasonsData } from '../../utils/tmdbSeasonsTrim';
import {
  fetchTmdbSeasons,
  tmdbSeasonPosterUrl,
} from '../../utils/tmdbHelper';
import { fetchFilmBySlugRest, mapFilmData, readSeoPrefetch } from '../../utils/seoPrefetch';

/**
 * Resolves the film for a slug exactly like FilmDetailPage: context films by
 * slug / slugified title / id (plus the selected film), then the bot SEO
 * prefetch payload, then one REST lookup once the context has finished loading.
 */
export const useResolvedFilm = (
  slug: string | undefined
): { film: FilmItem | undefined; isResolving: boolean } => {
  const { films, selectedFilmId, isLoadingFilms } = useApp();

  const contextFilm: FilmItem | undefined =
    (slug
      ? films.find(
          f =>
            (f.slug && f.slug === slug) ||
            slugify(f.title) === slug ||
            f.id === slug
        )
      : undefined) || films.find(f => f.id === selectedFilmId) || undefined;

  const prefetchedFilm = useMemo(() => {
    if (contextFilm || !slug) return null;
    const data = readSeoPrefetch('film', slug);
    return data ? mapFilmData(data, slug) : null;
  }, [contextFilm, slug]);

  const [restFilm, setRestFilm] = useState<FilmItem | null>(null);
  const [isRestFetching, setIsRestFetching] = useState(false);
  const restAttemptedSlugRef = useRef<string | null>(null);
  const restRequestIdRef = useRef(0);

  const restFilmForSlug =
    restFilm && (restFilm.slug === slug || restFilm.id === slug) ? restFilm : null;
  const film: FilmItem | undefined =
    contextFilm || prefetchedFilm || restFilmForSlug || undefined;

  useEffect(() => {
    if (!slug || contextFilm || prefetchedFilm || isLoadingFilms) return;
    if (restAttemptedSlugRef.current === slug) return;

    restAttemptedSlugRef.current = slug;
    const requestId = restRequestIdRef.current + 1;
    restRequestIdRef.current = requestId;
    setIsRestFetching(true);

    fetchFilmBySlugRest(slug)
      .then(data => {
        if (restRequestIdRef.current !== requestId) return;
        setRestFilm(data ? mapFilmData(data, slug) : null);
      })
      .catch(() => {
        if (restRequestIdRef.current !== requestId) return;
        setRestFilm(null);
      })
      .finally(() => {
        if (restRequestIdRef.current !== requestId) return;
        setIsRestFetching(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, contextFilm, prefetchedFilm, isLoadingFilms]);

  const shouldFetchRest =
    !contextFilm &&
    !prefetchedFilm &&
    !restFilmForSlug &&
    !!slug &&
    restAttemptedSlugRef.current !== slug;

  const isResolving = !film && (isLoadingFilms || isRestFetching || shouldFetchRest);

  return { film, isResolving };
};

export const filmPathFor = (film: FilmItem): string => {
  const filmSlug = film.slug || slugify(film.title) || film.id;
  return `/film/${encodeURIComponent(filmSlug)}`;
};

export const seasonLabel = (seasonNumber: number): string =>
  seasonNumber === 0 ? 'Specials' : `Season ${seasonNumber}`;

export const formatAirDateId = (value: string): string => {
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

const TMDB_NOTE = 'Data season dan rating episode dari TMDB.';

const SeasonStateMessage: React.FC<{
  filmTitle: string;
  filmPath: string;
  message: string;
}> = ({ filmTitle, filmPath, message }) => (
  <div className="bg-[#171717] border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-3">
    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
      <Clapperboard className="w-6 h-6" />
    </div>
    <p className="text-slate-300 text-sm">{message}</p>
    <Link
      to={filmPath}
      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FF2E7E] hover:text-white transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
      Kembali ke {filmTitle}
    </Link>
  </div>
);

export const FilmSeasonsPage: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const { film, isResolving } = useResolvedFilm(slug);

  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [data, setData] = useState<TmdbSeasonsData | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  useEffect(() => {
    if (!film || !film.tmdbId) return;
    if (tmdbMediaType(film) !== 'tv') return;

    let isMounted = true;
    setStatus('loading');
    setData(null);

    fetchTmdbSeasons(film.tmdbId).then(result => {
      if (!isMounted) return;
      if (!result) {
        setStatus('error');
        return;
      }
      setData(result);
      setStatus('ready');
    });

    return () => {
      isMounted = false;
    };
  }, [film?.id, film?.tmdbId, film?.type, film?.duration]);

  if (isResolving) {
    return <FilmDetailSkeleton />;
  }

  if (!film) {
    return (
      <div className="min-h-[60vh] py-16 flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-md mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
            <Clapperboard className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-display font-black text-white">Film Tidak Ditemukan</h2>
          <p className="text-slate-400 text-xs leading-relaxed">
            Data film atau tayangan yang Anda tuju tidak tersedia dalam katalog Sotoy Film.
          </p>
          <Link
            to="/film-database"
            className="inline-flex px-5 py-2.5 rounded-xl bg-white text-slate-950 text-xs font-bold hover:bg-slate-200 transition-colors"
          >
            Kembali ke Film Database
          </Link>
        </div>
      </div>
    );
  }

  const filmPath = filmPathFor(film);
  const isValidTv = Boolean(film.tmdbId) && tmdbMediaType(film) === 'tv';
  if (!isValidTv) {
    return <Navigate to={filmPath} replace />;
  }

  const seasons = data?.seasons ?? [];
  const orderedSeasons = [
    ...seasons
      .filter(season => season.seasonNumber !== 0)
      .sort((a, b) => a.seasonNumber - b.seasonNumber),
    ...seasons.filter(season => season.seasonNumber === 0),
  ];

  const seasonsUrl = `${filmPath}/seasons`;
  const canonicalUrl = `https://www.sotoyfilm.my.id${filmPath}`;

  return (
    <div className="min-h-screen py-6 sm:py-8">
      <SEOHead
        title={`${film.title} – Semua Season | Sotoy Film`}
        description={`Daftar lengkap season dan episode ${film.title} (${film.year}) lengkap dengan rating TMDB.`}
        image={film.backdrop || film.poster}
        url={`https://www.sotoyfilm.my.id${seasonsUrl}`}
        canonicalUrl={canonicalUrl}
        type="video.tv_show"
        noindex
        robots="noindex, follow"
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <Link
          to={filmPath}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Film
        </Link>

        <header className="flex items-center gap-4 sm:gap-5 bg-[#171717] border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl">
          <div className="w-20 sm:w-24 aspect-[2/3] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shrink-0">
            {film.poster ? (
              <img
                src={film.poster}
                alt={`Poster ${film.title}`}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-600">
                <Clapperboard className="w-6 h-6" />
              </div>
            )}
          </div>
          <div className="min-w-0 space-y-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#FF2E7E] bg-[#FF2E7E]/10 border border-[#FF2E7E]/30 px-2 py-0.5 rounded-full">
              <Layers className="w-3 h-3" />
              Semua Season
            </span>
            <h1 className="font-display font-black text-xl sm:text-3xl text-white leading-tight">
              {film.title}
            </h1>
            <p className="text-slate-400 text-xs">
              {[film.year ? String(film.year) : '', film.type].filter(Boolean).join(' • ')}
            </p>
          </div>
        </header>

        {status === 'loading' || status === 'idle' ? (
          <div className="space-y-4" aria-busy="true">
            {[0, 1].map(index => (
              <div
                key={index}
                className="h-44 rounded-3xl bg-[#171717] border border-slate-800 animate-pulse"
              />
            ))}
          </div>
        ) : status === 'error' ? (
          <SeasonStateMessage
            filmTitle={film.title}
            filmPath={filmPath}
            message="Gagal memuat data season dari TMDB. Coba muat ulang halaman ini."
          />
        ) : orderedSeasons.length === 0 ? (
          <SeasonStateMessage
            filmTitle={film.title}
            filmPath={filmPath}
            message="Belum ada data season yang tersedia untuk tayangan ini."
          />
        ) : (
          <div className="space-y-4">
            {orderedSeasons.map(season => {
              const seasonHref = `${filmPath}/season/${season.seasonNumber}`;
              return (
                <article
                  key={`season-${season.seasonNumber}`}
                  className="bg-[#171717] border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl flex flex-col sm:flex-row gap-4 sm:gap-6 hover:border-[#FF2E7E]/50 transition-colors"
                >
                  <div className="w-24 sm:w-28 aspect-[2/3] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shrink-0">
                    {season.posterPath ? (
                      <img
                        src={tmdbSeasonPosterUrl(season.posterPath)}
                        alt={`Poster ${seasonLabel(season.seasonNumber)} ${film.title}`}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <Clapperboard className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display font-black text-base sm:text-lg text-white">
                        {seasonLabel(season.seasonNumber)}
                      </h2>
                      {season.voteAverage > 0 && (
                        <span className="inline-flex items-center gap-1 bg-amber-500/15 border border-amber-500/40 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-full">
                          <Star className="w-3 h-3 fill-current" />
                          {season.voteAverage.toFixed(1)} TMDB
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] sm:text-xs font-semibold text-slate-300 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800 inline-block">
                      {[airYear(season.airDate), season.episodeCount > 0 ? `${season.episodeCount} Episode` : '']
                        .filter(Boolean)
                        .join(' • ')}
                    </p>

                    {formatAirDateId(season.airDate) && (
                      <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#FF2E7E]" />
                        {formatAirDateId(season.airDate)}
                      </p>
                    )}

                    {season.overview && (
                      <p className="text-slate-300 text-xs sm:text-sm leading-relaxed line-clamp-3">
                        {season.overview}
                      </p>
                    )}

                    <Link
                      to={seasonHref}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FF2E7E] hover:text-white transition-colors pt-1"
                    >
                      Lihat Episode
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <p className="text-[11px] text-slate-500 text-center">{TMDB_NOTE}</p>
      </div>
    </div>
  );
};

export default FilmSeasonsPage;
