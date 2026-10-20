import type { FilmItem } from '../types';
import { normalizePlatform } from './filmSections';

export interface TmdbReleaseDateEntry {
  type: number;
  date: string;
}

export interface TmdbSyncProviders {
  flatrate: string[];
  rent: string[];
  buy: string[];
}

export interface TmdbSyncData {
  tmdbId: number;
  type: 'movie' | 'tv';
  title: string;
  originalTitle: string;
  releaseDate: string;
  releaseDatesID: TmdbReleaseDateEntry[];
  providersID: TmdbSyncProviders;
  status: string;
}

export type WhereToWatchEntry = FilmItem['whereToWatch'][number];

export interface BuildWhereToWatchArgs {
  existing?: WhereToWatchEntry[];
  providersFlatrate?: string[];
  inTheatres: boolean;
}

export interface ComputeInTheatresArgs {
  mediaType: 'movie' | 'tv';
  tmdbId?: number;
  nowPlayingIds: number[] | Set<number>;
  idReleaseDate?: string;
  now: Date;
}

export interface FilmSyncResult {
  updates: Partial<FilmItem>;
  changes: string[];
}

export type FilmSyncStatus = 'ok' | 'title_mismatch' | 'no_tmdb_id' | 'unchanged';

export type TmdbSyncAttemptStatus = FilmSyncStatus | 'error';

export interface TmdbFallbackDecision {
  retryAlternate: boolean;
  useAlternate: boolean;
  finalStatus: TmdbSyncAttemptStatus;
}

/**
 * Decides whether an animation film should retry TMDB with the other media
 * type. Animations have no reliable media type, so a 404/fetch error or a
 * title mismatch on the heuristic type is retried exactly once. Movies and
 * series never retry.
 *
 * When both attempt statuses are supplied, the alternate result wins only
 * when it is usable. A title mismatch on either attempt is preferred over an
 * error, so a film is reported as a TMDB error only when both attempts failed
 * to return any usable or mismatched result.
 */
export function decideTmdbFallback(
  filmType: string | undefined,
  primaryStatus: TmdbSyncAttemptStatus,
  alternateStatus?: TmdbSyncAttemptStatus
): TmdbFallbackDecision {
  const retryAlternate =
    filmType === 'animation' &&
    (primaryStatus === 'error' || primaryStatus === 'title_mismatch');

  if (!retryAlternate || alternateStatus === undefined) {
    return { retryAlternate, useAlternate: false, finalStatus: primaryStatus };
  }

  const isUsable = (status: TmdbSyncAttemptStatus): boolean =>
    status !== 'error' && status !== 'title_mismatch';

  const finalStatus: TmdbSyncAttemptStatus = isUsable(alternateStatus)
    ? alternateStatus
    : isUsable(primaryStatus)
      ? primaryStatus
      : alternateStatus === 'title_mismatch' || primaryStatus === 'title_mismatch'
        ? 'title_mismatch'
        : 'error';

  return {
    retryAlternate,
    useAlternate: alternateStatus !== 'error' && finalStatus === alternateStatus,
    finalStatus,
  };
}

export interface FilmSyncEvaluation {
  status: FilmSyncStatus;
  result?: FilmSyncResult;
}

export interface ComputeFilmSyncUpdateArgs {
  film: FilmItem;
  sync: TmdbSyncData;
  nowPlayingIds: number[] | Set<number>;
  now: Date;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ISO_DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;

export const STREAM_BADGE_COLORS: Record<string, string> = {
  Netflix: '#E50914',
  'Prime Video': '#00A8E1',
  'Disney+ Hotstar': '#1B3F94',
  Max: '#5A2CD9',
  'Apple TV+': '#555555',
  Vidio: '#E2231A',
  Viu: '#F5A623',
  WeTV: '#2F7DE1',
  iQIYI: '#19B259',
  'Bioskop Online': '#D31F26',
};

const DEFAULT_STREAM_BADGE_COLOR = '#475569';

/**
 * Normalizes a title for safe comparison: lowercase, no accents, no
 * punctuation, and collapsed whitespace.
 */
export function normalizeTitle(value?: string | null): string {
  if (!value) return '';

  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Guards against writing TMDB data to the wrong film. A match is either an
 * exact normalized title or a containment match where both titles are at
 * least four characters long.
 */
export function titlesMatch(film: FilmItem, sync: TmdbSyncData): boolean {
  const filmTitles = [film.title, film.originalTitle]
    .map(normalizeTitle)
    .filter(Boolean);
  const syncTitles = [sync.title, sync.originalTitle]
    .map(normalizeTitle)
    .filter(Boolean);

  if (filmTitles.length === 0 || syncTitles.length === 0) return false;

  return filmTitles.some(filmTitle =>
    syncTitles.some(syncTitle => {
      if (filmTitle === syncTitle) return true;
      if (filmTitle.length < 4 || syncTitle.length < 4) return false;
      return filmTitle.includes(syncTitle) || syncTitle.includes(filmTitle);
    })
  );
}

/**
 * Parses a TMDB date into a strict YYYY-MM-DD string. Date-time values are
 * accepted when they start with a valid date, but invalid calendar dates are
 * ignored rather than guessed.
 */
function toIsoDate(value?: string | null): string | undefined {
  if (!value) return undefined;

  const match = ISO_DATE_PREFIX.exec(String(value).trim());
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;

  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return undefined;
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

/**
 * Returns the earliest valid Indonesian theatrical date. Type 3 (theatrical)
 * wins; type 2 (limited theatrical) is only used when no valid type 3 date
 * exists. Other release types are never used as a guess.
 */
export function pickIdReleaseDate(
  releaseDatesID?: TmdbReleaseDateEntry[]
): string | undefined {
  const earliestOfType = (type: number): string | undefined => {
    const dates = (releaseDatesID || [])
      .filter(entry => entry && entry.type === type)
      .map(entry => toIsoDate(entry.date))
      .filter((date): date is string => Boolean(date))
      .sort();

    return dates[0];
  };

  return earliestOfType(3) ?? earliestOfType(2);
}

export function getBadgeColor(platform: string): string {
  const normalized = normalizePlatform(platform || '');
  return STREAM_BADGE_COLORS[normalized] || DEFAULT_STREAM_BADGE_COLOR;
}

export function whereToWatchEqual(
  a: WhereToWatchEntry[] | undefined,
  b: WhereToWatchEntry[] | undefined
): boolean {
  const left = a || [];
  const right = b || [];
  if (left.length !== right.length) return false;

  return left.every((entry, index) => {
    const other = right[index];
    return (
      entry.type === other.type &&
      entry.platform === other.platform &&
      entry.badgeColor === other.badgeColor &&
      entry.source === other.source
    );
  });
}

/**
 * Rebuilds whereToWatch from manual entries plus TMDB flatrate providers.
 * Exact placeholder cinema entries and previous TMDB entries are removed.
 * Cinema entries come first, followed by streams sorted by platform name.
 */
export function buildWhereToWatch({
  existing,
  providersFlatrate,
  inTheatres,
}: BuildWhereToWatchArgs): WhereToWatchEntry[] {
  const kept = (existing || []).filter(entry => {
    if (!entry) return false;
    if (entry.source === 'tmdb') return false;
    if (entry.type === 'cinema' && entry.platform === 'Bioskop / Cinema') return false;
    return true;
  });

  const seen = new Set<string>();
  const dedupe = (entries: WhereToWatchEntry[]): WhereToWatchEntry[] =>
    entries.filter(entry => {
      const key = `${entry.type}|${entry.platform}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const normalizedProviders = Array.from(
    new Set(
      (providersFlatrate || [])
        .map(name => normalizePlatform(name || ''))
        .filter(Boolean)
    )
  );

  const tmdbStreams: WhereToWatchEntry[] = normalizedProviders.map(platform => ({
    type: 'stream',
    platform,
    badgeColor: getBadgeColor(platform),
    source: 'tmdb',
  }));

  const tmdbCinema: WhereToWatchEntry[] = inTheatres
    ? [{
        type: 'cinema',
        platform: 'Bioskop',
        badgeColor: '#E50914',
        source: 'tmdb',
      }]
    : [];

  const cinemaEntries = dedupe([
    ...kept.filter(entry => entry.type === 'cinema'),
    ...tmdbCinema,
  ]);

  const streamEntries = dedupe([
    ...kept.filter(entry => entry.type === 'stream'),
    ...tmdbStreams,
  ]).sort((a, b) => a.platform.localeCompare(b.platform));

  const otherEntries = dedupe(
    kept.filter(entry => entry.type !== 'cinema' && entry.type !== 'stream')
  );

  return [...cinemaEntries, ...streamEntries, ...otherEntries];
}

/**
 * A film is considered to be in Indonesian theatres when TMDB lists it in
 * now_playing or its Indonesian theatrical release is within the last 56 days.
 */
export function computeInTheatres({
  mediaType,
  tmdbId,
  nowPlayingIds,
  idReleaseDate,
  now,
}: ComputeInTheatresArgs): boolean {
  if (mediaType !== 'movie') return false;

  if (tmdbId !== undefined && tmdbId !== null) {
    const numericId = Number(tmdbId);
    const isNowPlaying = nowPlayingIds instanceof Set
      ? nowPlayingIds.has(numericId)
      : nowPlayingIds.includes(numericId);
    if (Number.isFinite(numericId) && isNowPlaying) return true;
  }

  const isoDate = toIsoDate(idReleaseDate);
  if (!isoDate) return false;

  const releaseDay = Date.parse(`${isoDate}T00:00:00.000Z`);
  const nowDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return releaseDay >= nowDay - 56 * MS_PER_DAY && releaseDay <= nowDay;
}

/**
 * Evaluates one film against its TMDB sync payload without writing anything.
 * A title mismatch is returned separately so the admin UI can skip the film
 * and show it for manual TMDB ID correction.
 */
export function evaluateFilmSync({
  film,
  sync,
  nowPlayingIds,
  now,
}: ComputeFilmSyncUpdateArgs): FilmSyncEvaluation {
  const numericTmdbId = Number(film.tmdbId);
  if (!film.tmdbId || !Number.isFinite(numericTmdbId) || numericTmdbId <= 0) {
    return { status: 'no_tmdb_id' };
  }

  if (!titlesMatch(film, sync)) {
    return { status: 'title_mismatch' };
  }

  const updates: Partial<FilmItem> = {};
  const changes: string[] = [];

  const pickedIdReleaseDate = pickIdReleaseDate(sync.releaseDatesID);
  if (pickedIdReleaseDate && pickedIdReleaseDate !== film.idReleaseDate) {
    updates.idReleaseDate = pickedIdReleaseDate;
    changes.push(`idReleaseDate: ${pickedIdReleaseDate}`);
  }

  if (!film.releaseDate && sync.releaseDate) {
    const normalizedReleaseDate = toIsoDate(sync.releaseDate);
    if (normalizedReleaseDate && normalizedReleaseDate !== film.releaseDate) {
      updates.releaseDate = normalizedReleaseDate;
      changes.push(`releaseDate: ${normalizedReleaseDate}`);
    }
  }

  const effectiveIdReleaseDate = pickedIdReleaseDate ?? film.idReleaseDate;
  const inTheatres = computeInTheatres({
    mediaType: sync.type,
    tmdbId: film.tmdbId,
    nowPlayingIds,
    idReleaseDate: effectiveIdReleaseDate,
    now,
  });

  const nextWhereToWatch = buildWhereToWatch({
    existing: film.whereToWatch,
    providersFlatrate: sync.providersID?.flatrate || [],
    inTheatres,
  });

  if (!whereToWatchEqual(film.whereToWatch, nextWhereToWatch)) {
    updates.whereToWatch = nextWhereToWatch;

    const hadPlaceholder = (film.whereToWatch || []).some(
      entry => entry.type === 'cinema' && entry.platform === 'Bioskop / Cinema'
    );
    const hadTmdbEntries = (film.whereToWatch || []).some(entry => entry.source === 'tmdb');
    const newStreamPlatforms = nextWhereToWatch
      .filter(entry => entry.type === 'stream' && entry.source === 'tmdb')
      .map(entry => entry.platform);

    if (hadPlaceholder) changes.push('hapus placeholder bioskop');
    if (newStreamPlatforms.length > 0) {
      changes.push(`streaming: ${newStreamPlatforms.join(', ')}`);
    }
    if (inTheatres) changes.push('bioskop: ya');
    if (hadTmdbEntries) changes.push('hapus data TMDB lama');
    if (
      !hadPlaceholder &&
      !hadTmdbEntries &&
      newStreamPlatforms.length === 0 &&
      !inTheatres
    ) {
      changes.push('whereToWatch diperbarui');
    }
  }

  if (Object.keys(updates).length === 0) {
    return { status: 'unchanged' };
  }

  return { status: 'ok', result: { updates, changes } };
}

/**
 * Computes the minimal metadata update for one film. Only idReleaseDate,
 * releaseDate (when currently empty) and whereToWatch can ever be written.
 */
export function computeFilmSyncUpdate(
  args: ComputeFilmSyncUpdateArgs
): FilmSyncResult | null {
  return evaluateFilmSync(args).result ?? null;
}
