import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronLeft,
  Clapperboard,
  Clock,
  Star,
  Tv,
} from 'lucide-react';
import { SEOHead } from '../SEO/SEOHead';
import { FilmDetailSkeleton } from '../Skeletons';
import { useApp } from '../../context/AppContext';
import { tmdbMediaType } from '../../utils/tmdbSync';
import type {
  TmdbEpisode,
  TmdbSeasonData,
  TmdbSeasonSummary,
} from '../../utils/tmdbSeasonsTrim';
import {
  fetchTmdbSeason,
  fetchTmdbSeasons,
  tmdbEpisodeStillUrl,
} from '../../utils/tmdbHelper';
import {
  aggregateMediaRatings,
  buildMediaRatingId,
  episodeRatingKey,
  formatSkorSotoy,
  seasonRatingKey,
  type MediaRatingDoc,
} from '../../utils/mediaRatings';
import {
  RateMediaModal,
  fetchSeasonRatingDocs,
  useMediaRatingGate,
} from '../Film/RateMediaModal';
import { EpisodeDetailPanel } from '../Film/EpisodeDetailPanel';
import {
  filmPathFor,
  formatAirDateId,
  seasonLabel,
  useResolvedFilm,
} from './FilmSeasonsPage';

const TMDB_NOTE =
  'Data season dan episode dari TMDB. Skor Sotoy berasal dari penonton Sotoy Film.';

interface RatingTarget {
  seasonNumber: number;
  episodeNumber: number | null;
  episodeTitle?: string;
  initialScore: number | null;
}

export const FilmSeasonPage: React.FC = () => {
  const { slug, seasonNumber } = useParams<{ slug?: string; seasonNumber?: string }>();
  const { currentUser } = useApp();
  const { film, isResolving } = useResolvedFilm(slug);
  const requireRatingAccess = useMediaRatingGate();

  const rawSeason = seasonNumber ?? '';
  const parsedSeason = /^\d+$/.test(rawSeason) ? Number(rawSeason) : null;

  const [seasonStatus, setSeasonStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [season, setSeason] = useState<TmdbSeasonData | null>(null);
  const [seasonList, setSeasonList] = useState<TmdbSeasonSummary[]>([]);
  const [ratingDocs, setRatingDocs] = useState<MediaRatingDoc[]>([]);
  const [ratingTarget, setRatingTarget] = useState<RatingTarget | null>(null);
  const [expandedEpisodes, setExpandedEpisodes] = useState<Set<number>>(new Set());

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug, rawSeason]);

  // Season list powers the chip row; a failure only hides the chips.
  useEffect(() => {
    if (!film || !film.tmdbId) return;
    if (tmdbMediaType(film) !== 'tv') return;

    let isMounted = true;
    fetchTmdbSeasons(film.tmdbId).then(result => {
      if (!isMounted || !result) return;
      setSeasonList(result.seasons);
    });

    return () => {
      isMounted = false;
    };
  }, [film?.id, film?.tmdbId, film?.type, film?.duration]);

  useEffect(() => {
    if (!film || !film.tmdbId) return;
    if (tmdbMediaType(film) !== 'tv') return;
    if (parsedSeason === null) return;

    let isMounted = true;
    setSeasonStatus('loading');
    setSeason(null);

    fetchTmdbSeason(film.tmdbId, parsedSeason).then(result => {
      if (!isMounted) return;
      if (!result) {
        setSeasonStatus('error');
        return;
      }
      setSeason(result);
      setSeasonStatus('ready');
    });

    return () => {
      isMounted = false;
    };
  }, [film?.id, film?.tmdbId, film?.type, film?.duration, parsedSeason]);

  // One query per season: the season itself plus every episode, aggregated
  // client-side. No aggregate is persisted.
  useEffect(() => {
    if (!film?.id || parsedSeason === null) return;
    let isMounted = true;

    fetchSeasonRatingDocs(film.id, parsedSeason).then(docs => {
      if (isMounted) setRatingDocs(docs);
    });

    return () => {
      isMounted = false;
    };
  }, [film?.id, parsedSeason]);

  useEffect(() => {
    setExpandedEpisodes(new Set());
  }, [film?.id, parsedSeason]);

  const aggregates = useMemo(() => aggregateMediaRatings(ratingDocs), [ratingDocs]);

  const ownScores = useMemo(() => {
    const map: Record<string, number> = {};
    if (!currentUser?.id) return map;
    for (const doc of ratingDocs) {
      if (doc.userId !== currentUser.id) continue;
      const key =
        doc.episodeNumber === null
          ? seasonRatingKey(doc.seasonNumber)
          : episodeRatingKey(doc.seasonNumber, doc.episodeNumber);
      map[key] = doc.score;
    }
    return map;
  }, [ratingDocs, currentUser?.id]);

  const toggleEpisode = (episodeNumber: number) => {
    setExpandedEpisodes(prev => {
      const next = new Set(prev);
      if (next.has(episodeNumber)) next.delete(episodeNumber);
      else next.add(episodeNumber);
      return next;
    });
  };

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
  const seasonsPath = `${filmPath}/seasons`;
  const isValidTv = Boolean(film.tmdbId) && tmdbMediaType(film) === 'tv';

  if (!isValidTv || parsedSeason === null) {
    return <Navigate to={filmPath} replace />;
  }

  const label = seasonLabel(parsedSeason);
  const headingName = season?.name?.trim() || label;
  const canonicalUrl = `https://www.sotoyfilm.my.id${filmPath}`;

  const seasonKey = seasonRatingKey(parsedSeason);
  const seasonAggregate = aggregates[seasonKey];
  const ownSeasonScore = ownScores[seasonKey];

  const handleRateSeason = () => {
    if (!requireRatingAccess()) return;
    setRatingTarget({
      seasonNumber: parsedSeason,
      episodeNumber: null,
      initialScore: ownScores[seasonKey] ?? null,
    });
  };

  const handleRateEpisode = (episode: TmdbEpisode) => {
    if (!requireRatingAccess()) return;
    setRatingTarget({
      seasonNumber: parsedSeason,
      episodeNumber: episode.episodeNumber,
      episodeTitle: episode.name || undefined,
      initialScore:
        ownScores[episodeRatingKey(parsedSeason, episode.episodeNumber)] ?? null,
    });
  };

  const handleRatingSaved = (score: number) => {
    const userId = currentUser?.id;
    if (!ratingTarget || !userId) return;

    const { seasonNumber: targetSeason, episodeNumber } = ratingTarget;
    setRatingDocs(prev => {
      const next = prev.filter(
        doc =>
          !(
            doc.seasonNumber === targetSeason &&
            doc.episodeNumber === episodeNumber &&
            doc.userId === userId
          )
      );
      next.push({
        id: buildMediaRatingId(film.id, targetSeason, episodeNumber, userId),
        filmId: film.id,
        seasonNumber: targetSeason,
        episodeNumber,
        userId,
        score,
      });
      return next;
    });
  };

  const orderedSeasons = [
    ...seasonList
      .filter(item => item.seasonNumber !== 0)
      .sort((a, b) => a.seasonNumber - b.seasonNumber),
    ...seasonList.filter(item => item.seasonNumber === 0),
  ];

  return (
    <div className="min-h-screen py-6 sm:py-8">
      <SEOHead
        title={`${film.title} ${label} – Daftar Episode & Rating | Sotoy Film`}
        description={`Daftar episode ${label} ${film.title} lengkap dengan tanggal tayang, durasi, dan Skor Sotoy dari penonton Sotoy Film.`}
        image={film.backdrop || film.poster}
        url={`${canonicalUrl}/season/${parsedSeason}`}
        canonicalUrl={canonicalUrl}
        type="video.tv_show"
        noindex
        robots="noindex, follow"
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={seasonsPath}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700"
          >
            <ChevronLeft className="w-4 h-4" />
            Semua Season
          </Link>
          <Link
            to={filmPath}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Halaman Film
          </Link>
        </div>

        <header className="bg-[#171717] border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#FF2E7E] bg-[#FF2E7E]/10 border border-[#FF2E7E]/30 px-2 py-0.5 rounded-full">
            <Tv className="w-3 h-3" />
            {label}
          </span>
          <h1 className="font-display font-black text-xl sm:text-3xl text-white leading-tight">
            {film.title}
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm">{headingName}</p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1 bg-amber-500/15 border border-amber-500/40 text-amber-400 text-[11px] font-black px-2.5 py-1 rounded-full">
              <Star className="w-3.5 h-3.5 fill-current" />
              {formatSkorSotoy(seasonAggregate)}
            </span>
            <button
              type="button"
              onClick={handleRateSeason}
              className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border border-[#FF2E7E]/50 text-[#FF2E7E] hover:bg-[#FF2E7E] hover:text-slate-950 transition-colors"
            >
              {ownSeasonScore !== undefined
                ? `Skor kamu ${ownSeasonScore.toFixed(1)} · Ubah`
                : 'Beri Skor'}
            </button>
          </div>
        </header>

        {orderedSeasons.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px] sm:text-xs font-bold">
            {orderedSeasons.map(item => {
              const isActive = item.seasonNumber === parsedSeason;
              return (
                <Link
                  key={`season-chip-${item.seasonNumber}`}
                  to={`${filmPath}/season/${item.seasonNumber}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={`px-3 py-1.5 rounded-full border shrink-0 transition-colors ${
                    isActive
                      ? 'bg-[#FF2E7E] text-white border-[#FF2E7E]'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-[#FF2E7E]/60'
                  }`}
                >
                  {seasonLabel(item.seasonNumber)}
                </Link>
              );
            })}
          </div>
        )}

        {seasonStatus === 'loading' || seasonStatus === 'idle' ? (
          <div className="space-y-4" aria-busy="true">
            {[0, 1, 2].map(index => (
              <div
                key={index}
                className="h-40 rounded-3xl bg-[#171717] border border-slate-800 animate-pulse"
              />
            ))}
          </div>
        ) : seasonStatus === 'error' || !season ? (
          <div className="bg-[#171717] border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
              <Clapperboard className="w-6 h-6" />
            </div>
            <p className="text-slate-300 text-sm">
              Gagal memuat daftar episode {label} dari TMDB. Coba muat ulang halaman ini.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to={seasonsPath}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FF2E7E] hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Semua Season
              </Link>
              <Link
                to={filmPath}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Kembali ke {film.title}
              </Link>
            </div>
          </div>
        ) : season.episodes.length === 0 ? (
          <div className="bg-[#171717] border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-3">
            <p className="text-slate-300 text-sm">Belum ada episode yang tersedia untuk {label}.</p>
            <Link
              to={seasonsPath}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FF2E7E] hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Semua Season
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {season.episodes.map(episode => {
              const episodeKey = episodeRatingKey(parsedSeason, episode.episodeNumber);
              const ownScore = ownScores[episodeKey];
              const isExpanded = expandedEpisodes.has(episode.episodeNumber);
              const panelId = `episode-detail-${episode.episodeNumber}`;
              return (
                <div key={`episode-${episode.episodeNumber}`}>
                  <article
                    className={`bg-[#171717] border border-slate-800 p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row gap-4 hover:border-[#FF2E7E]/40 transition-colors ${
                      isExpanded ? 'rounded-t-3xl' : 'rounded-3xl'
                    }`}
                  >
                    <div className="w-full sm:w-56 md:w-64 aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shrink-0">
                      {episode.stillPath ? (
                        <img
                          src={tmdbEpisodeStillUrl(episode.stillPath)}
                          alt={`Still E${episode.episodeNumber} ${episode.name || label}`}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-slate-600">
                          <Clapperboard className="w-6 h-6" />
                          <span className="text-[10px] font-semibold uppercase tracking-wide">
                            Tanpa Gambar
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-[#FF2E7E]/15 border border-[#FF2E7E]/40 text-[#FF2E7E] text-[10px] font-black px-2 py-0.5 rounded-full">
                          E{episode.episodeNumber}
                        </span>
                        <h2 className="font-display font-black text-sm sm:text-base text-white leading-snug min-w-0">
                          {episode.name || `Episode ${episode.episodeNumber}`}
                        </h2>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                        {formatAirDateId(episode.airDate) && (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#FF2E7E]" />
                            {formatAirDateId(episode.airDate)}
                          </span>
                        )}
                        {episode.runtime > 0 && (
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[#FF2E7E]" />
                            {episode.runtime} mnt
                          </span>
                        )}
                      </div>

                      {episode.overview && (
                        <p className="text-slate-300 text-xs sm:text-sm leading-relaxed line-clamp-3">
                          {episode.overview}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <span className="inline-flex items-center gap-1 text-amber-400 font-black text-[11px] sm:text-xs">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          {formatSkorSotoy(aggregates[episodeKey])}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRateEpisode(episode)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#FF2E7E]/50 text-[#FF2E7E] hover:bg-[#FF2E7E] hover:text-slate-950 transition-colors"
                        >
                          {ownScore !== undefined
                            ? `Skor kamu ${ownScore.toFixed(1)} · Ubah`
                            : 'Beri Skor'}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleEpisode(episode.episodeNumber)}
                          aria-expanded={isExpanded}
                          aria-controls={panelId}
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-700 text-slate-300 hover:border-[#FF2E7E]/60 hover:text-white transition-colors"
                        >
                          Detail
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </article>

                  {isExpanded && (
                    <EpisodeDetailPanel
                      id={panelId}
                      tmdbId={String(film.tmdbId)}
                      seasonNumber={parsedSeason}
                      episode={episode}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-[11px] text-slate-500 text-center">{TMDB_NOTE}</p>
      </div>

      <RateMediaModal
        film={film}
        isOpen={ratingTarget !== null}
        onClose={() => setRatingTarget(null)}
        seasonNumber={ratingTarget?.seasonNumber ?? parsedSeason}
        episodeNumber={ratingTarget?.episodeNumber ?? null}
        episodeTitle={ratingTarget?.episodeTitle}
        initialScore={ratingTarget?.initialScore ?? null}
        onSaved={handleRatingSaved}
      />
    </div>
  );
};

export default FilmSeasonPage;
