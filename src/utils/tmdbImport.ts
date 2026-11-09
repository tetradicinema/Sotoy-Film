/**
 * Pure logic for the daily TMDB import (`scripts/import-tmdb-daily.ts`).
 *
 * No Firestore and no network access here, so everything in this file can be
 * unit tested. Film documents are built with the same mapper and the same
 * field defaults as the admin batch import (`AdminBatchTmdbModal`), so an
 * auto-imported film looks exactly like one added by hand.
 *
 * Differences from the manual flow, on purpose:
 * - `featuredRecommendation` is always false (an editor decides what is featured).
 * - Films with fewer than `minVoteCount` TMDB votes get `unratedScore` instead of
 *   the mapper's 8.0 default for "no rating".
 * - Slugs are made unique against the catalog (remakes share titles).
 */

import type { FilmItem } from '../types';
import { findExistingFilmByTmdb, mapTmdbDetailsToFilm } from './tmdbHelper';
import { slugify } from './slugify';

export type ImportMediaType = 'movie' | 'tv';

/** Tune these to change what gets imported. Everything else follows from them. */
export const IMPORT_CONFIG = {
  /** Max new titles written per run. */
  dailyLimit: 50,
  /** Hard ceiling for `--limit`. */
  maxLimit: 200,
  /** A title passes when it has at least this many votes OR enough popularity. */
  minVoteCount: 5,
  minPopularity: 20,
  /** skorSotoy for titles with too few votes to have a meaningful rating. */
  unratedScore: 5.0,
  /** "Recent" discover window: release date from (today - back) to (today + ahead). */
  recentDaysBack: 45,
  recentDaysAhead: 14,
  /** Pages (20 titles each) read from now_playing, trending and recent discover. */
  listPages: 2,
  /** Backlog of well-known titles; one rotating page per day fills spare slots. */
  backlogMinVotes: { movie: 2000, tv: 500 } as Record<ImportMediaType, number>,
  backlogPageCycle: { movie: 50, tv: 30 } as Record<ImportMediaType, number>,
  /** TMDB genre ids never imported: Talk, News, Soap, TV Movie. */
  excludedGenreIds: [10767, 10763, 10766, 10770] as readonly number[],
};

export interface ImportCliOptions {
  apply: boolean;
  force: boolean;
  limit: number;
}

export function parseImportCliArgs(argv: string[]): ImportCliOptions {
  const options: ImportCliOptions = {
    apply: false,
    force: false,
    limit: IMPORT_CONFIG.dailyLimit,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--apply') {
      options.apply = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--limit' || arg.startsWith('--limit=')) {
      const raw = arg === '--limit' ? argv[++i] : arg.slice('--limit='.length);
      const parsed = Number(raw);
      if (!raw || !Number.isInteger(parsed) || parsed <= 0) {
        throw new Error('--limit requires a positive integer value.');
      }
      if (parsed > IMPORT_CONFIG.maxLimit) {
        throw new Error(`--limit may not exceed ${IMPORT_CONFIG.maxLimit}.`);
      }
      options.limit = parsed;
    }
  }

  return options;
}

export interface TmdbListItem {
  id?: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  adult?: boolean;
  vote_count?: number;
  popularity?: number;
  genre_ids?: number[];
}

export interface ImportSource {
  name: string;
  mediaType: ImportMediaType;
  items: TmdbListItem[];
}

export interface ImportCandidate {
  id: number;
  mediaType: ImportMediaType;
  source: string;
  title: string;
}

const positiveId = (value: unknown): number | undefined => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

/** Quality filter applied to the lightweight list results, before any detail request. */
export function isQualityListItem(item: TmdbListItem): boolean {
  if (positiveId(item.id) === undefined) return false;
  if (item.adult) return false;
  if (!item.poster_path) return false;
  if (!(item.overview || '').trim()) return false;
  if ((item.genre_ids || []).some(g => IMPORT_CONFIG.excludedGenreIds.includes(g))) {
    return false;
  }
  const votes = Number(item.vote_count) || 0;
  const popularity = Number(item.popularity) || 0;
  return votes >= IMPORT_CONFIG.minVoteCount || popularity >= IMPORT_CONFIG.minPopularity;
}

export interface PickResult {
  candidates: ImportCandidate[];
  duplicatesInLists: number;
  filteredOut: number;
  alreadyInCatalog: number;
}

/**
 * Merges the source lists in priority order (first source wins), drops
 * low-quality titles and titles already in the catalog.
 */
export function pickCandidates(
  sources: readonly ImportSource[],
  films: readonly FilmItem[]
): PickResult {
  const seen = new Set<string>();
  const result: PickResult = {
    candidates: [],
    duplicatesInLists: 0,
    filteredOut: 0,
    alreadyInCatalog: 0,
  };

  for (const source of sources) {
    for (const item of source.items) {
      const id = positiveId(item.id);
      if (id === undefined) {
        result.filteredOut++;
        continue;
      }

      const key = `${source.mediaType}:${id}`;
      if (seen.has(key)) {
        result.duplicatesInLists++;
        continue;
      }
      seen.add(key);

      if (!isQualityListItem(item)) {
        result.filteredOut++;
        continue;
      }

      const title = String(item.title || item.name || '').trim();
      if (findExistingFilmByTmdb(films, id, source.mediaType, { title })) {
        result.alreadyInCatalog++;
        continue;
      }

      result.candidates.push({ id, mediaType: source.mediaType, source: source.name, title });
    }
  }

  return result;
}

/** Deterministic Firestore id, so a re-run can never create the same title twice. */
export const importDocId = (mediaType: ImportMediaType, tmdbId: number): string =>
  `film-tmdb-${mediaType}-${tmdbId}`;

/** Slug that does not collide with an existing one: base, then base-year, then base-year-tmdbId. */
export function uniqueSlug(
  base: string,
  year: number,
  tmdbId: number,
  taken: ReadonlySet<string>
): string {
  const root = base || `film-${tmdbId}`;
  if (!taken.has(root)) return root;
  const withYear = `${root}-${year}`;
  if (!taken.has(withYear)) return withYear;
  return `${withYear}-${tmdbId}`;
}

export type BuildImportResult =
  | { ok: true; film: Omit<FilmItem, 'id'> }
  | { ok: false; reason: string };

const splitList = (value: string): string[] =>
  value ? value.split(',').map(part => part.trim()).filter(Boolean) : [];

/** Day-of-year based page number, so each day reads a different backlog page. */
export function backlogPage(now: Date, cycle: number): number {
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start) / 86_400_000);
  return (dayOfYear % cycle) + 1;
}

export const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

export function recentWindow(now: Date): { from: string; to: string } {
  const day = 86_400_000;
  return {
    from: toIsoDate(new Date(now.getTime() - IMPORT_CONFIG.recentDaysBack * day)),
    to: toIsoDate(new Date(now.getTime() + IMPORT_CONFIG.recentDaysAhead * day)),
  };
}

/**
 * Builds the Firestore document for one TMDB title from its `details`
 * response (`append_to_response=credits,videos`). Returns a reason instead of
 * a film when the title is not good enough to publish.
 */
export function buildImportFilm(
  details: any,
  mediaType: ImportMediaType,
  takenSlugs: ReadonlySet<string>,
  now: Date
): BuildImportResult {
  if (!details || typeof details !== 'object') {
    return { ok: false, reason: 'respons TMDB kosong' };
  }
  if (!details.poster_path) return { ok: false, reason: 'tanpa poster' };

  const mapped = mapTmdbDetailsToFilm(details, mediaType);
  if (!mapped.title.trim()) return { ok: false, reason: 'tanpa judul' };
  if (!mapped.synopsis.trim()) return { ok: false, reason: 'tanpa sinopsis' };

  const tmdbId = positiveId(mapped.tmdbId ?? details.id);
  if (tmdbId === undefined) return { ok: false, reason: 'id TMDB tidak valid' };

  const rated = (Number(details.vote_count) || 0) >= IMPORT_CONFIG.minVoteCount;
  const score = rated ? mapped.skorSotoy : IMPORT_CONFIG.unratedScore;

  const film: Omit<FilmItem, 'id'> = {
    title: mapped.title,
    originalTitle: mapped.originalTitle || undefined,
    slug: uniqueSlug(mapped.slug || slugify(mapped.title), mapped.year, tmdbId, takenSlugs),
    type: mapped.type,
    year: mapped.year,
    releaseDate: mapped.releaseDate || undefined,
    duration: mapped.duration || undefined,
    poster: mapped.poster,
    backdrop: mapped.backdrop,
    synopsis: mapped.synopsis,
    director: mapped.director,
    writer: mapped.writer || undefined,
    studio: mapped.studio || undefined,
    cast: splitList(mapped.cast),
    castDetails: mapped.castDetails,
    crewDetails: mapped.crewDetails,
    genres: splitList(mapped.genres),
    tags: mapped.tags,
    ...(mapped.originCountry.length > 0 ? { originCountry: mapped.originCountry } : {}),
    skorSotoy: score,
    totalVotes: 1,
    criticsSkorSotoy: score,
    whereToWatch: [],
    trailerUrl: mapped.trailerUrl || undefined,
    featuredRecommendation: false,
    tmdbId,
    ...(mapped.collectionId ? { collectionId: mapped.collectionId } : {}),
    ...(mapped.collectionName ? { collectionName: mapped.collectionName } : {}),
    createdAt: now.toISOString(),
  };

  // Firestore rejects undefined values; same approach as AppContext.addFilm.
  return { ok: true, film: JSON.parse(JSON.stringify(film)) };
}
