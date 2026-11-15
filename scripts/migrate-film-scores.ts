/**
 * Migrate Film Scores Script (one-off)
 *
 * Cleans fabricated vote counts and fabricated or mis-scaled scores on legacy
 * documents in the `films` collection, based on the REAL number of review
 * documents per film in the top-level `ratings` collection (field `filmId`).
 * `mediaRatings` is never read.
 *
 * Detection uses STORED values, because read-time doubling (AppContext /
 * firestoreRestClient) doubles a legacy film (scoreScale undefined) whenever
 * 0 < stored <= 5.0, independently for skorSotoy and criticsSkorSotoy.
 *
 * Rules (see classifyFilm for the pure implementation):
 * - Films with ratingsCount > 0 are NEVER written; report only, flagged when
 *   totalVotes !== ratingsCount.
 * - ratingsCount === 0:
 *   A.  totalVotes === 1 -> set totalVotes 0 (old seed artefact).
 *   A2. totalVotes > 1  -> "high-votes" bucket, report only, unless
 *       --include-high-votes (then totalVotes -> 0).
 *   B.  Score fixes only when the film has a tmdbId, scoreScale is undefined,
 *       and (0 < stored skorSotoy <= 5.0 OR stored skorSotoy === 8.0).
 *       TMDB is fetched only for those films (needsTmdb).
 *       B1 |stored - tmdb.voteAverage| <= tolerance and voteAverage > 0:
 *          write scoreScale 10 only; keep the score. criticsSkorSotoy is
 *          written (kept equal) only when it currently equals skorSotoy.
 *       B2 stored === 5.0 exactly AND tmdb.voteCount < 5: fabricated unrated
 *          seed -> skorSotoy 0, criticsSkorSotoy 0, scoreScale 10.
 *       B3 stored === 8.0 exactly AND tmdb.voteAverage === 0: fabricated
 *          mapper fallback -> skorSotoy 0, criticsSkorSotoy 0, scoreScale 10.
 *       B4 anything else: "mismatch", report only (the note mentions that
 *          --replace-fake-eight would replace a stored 8.0).
 *       B1 wins whenever B2/B3 do not apply.
 *       tmdb 'unavailable' -> "no-tmdb-data", report only.
 *   B5 (--replace-fake-eight, opt-in): when ratingsCount === 0,
 *       scoreScale is undefined, the film has a tmdbId, stored skorSotoy is
 *       exactly 8.0 and B1/B2/B3 did not match: skorSotoy becomes the TMDB
 *       vote_average rounded to 1 decimal and clamped 1..10 (0 when
 *       voteCount < 5 or voteAverage 0), scoreScale 10; criticsSkorSotoy
 *       follows the new value only when it currently equals the stored
 *       score. Category "score-replaced".
 *   C.  Films without tmdbId: scores are never changed ("manual" bucket,
 *       flagged when stored skorSotoy is exactly 4.0). Only rule A may apply.
 * - Documents with scoreScale defined are never touched by rule B.
 * - Only skorSotoy, criticsSkorSotoy, totalVotes and scoreScale are ever
 *   written (whitelist).
 *
 * Modes:
 * - Default is a dry-run: counts + up to 20 samples per bucket are printed and
 *   the full report is written to data/film-scores-report.json. Nothing is
 *   written to Firestore.
 * - --apply first writes data/film-scores-backup-<timestamp>.json (old and new
 *   values, absent fields as null), then updates each document individually
 *   with a lastUpdateTime precondition taken from the snapshot read, so a
 *   document changed meanwhile fails with FAILED_PRECONDITION and is counted
 *   as "skipped (changed during run)" instead of being overwritten.
 * - --restore <backup.json> restores the old values (null = FieldValue.delete)
 *   for the document ids in the backup, whitelisted fields only. Dry-run by
 *   default; pass --apply to write.
 *
 * Requirements:
 * - GOOGLE_APPLICATION_CREDENTIALS must point to a valid service account JSON.
 * - TMDB_API_KEY must be set (v3 key or v4 read token) unless --no-tmdb.
 *
 * Usage:
 *   npx tsx scripts/migrate-film-scores.ts [--apply]
 *   npx tsx scripts/migrate-film-scores.ts [--no-tmdb] [--include-high-votes]
 *       [--replace-fake-eight] [--tolerance <0..2>]
 *   npx tsx scripts/migrate-film-scores.ts --restore data/film-scores-backup-<ts>.json [--apply]
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import type { Firestore, Timestamp } from 'firebase-admin/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import type { FilmItem } from '../src/types';
import type { TmdbSyncData } from '../src/utils/tmdbSync';
import { tmdbMediaType, titlesMatch, decideTmdbFallback } from '../src/utils/tmdbSync';

// ---------------------------------------------------------------------------
// Pure classification (exported for scripts/test-migrate-film-scores.ts)
// ---------------------------------------------------------------------------

export const DEFAULT_TOLERANCE = 0.5;

/** The ONLY fields this migration may ever write. */
export const SCORE_FIELDS = ['skorSotoy', 'criticsSkorSotoy', 'totalVotes', 'scoreScale'] as const;
export type ScoreField = (typeof SCORE_FIELDS)[number];
export type ScoreSnapshot = Pick<FilmItem, ScoreField>;
export type ScoreChanges = Partial<ScoreSnapshot>;
/** JSON-safe snapshot: absent fields become null so a restore can tell. */
export type ScoreSnapshotPlain = Record<ScoreField, number | null>;

/** Real TMDB voting data for one film. */
export interface TmdbVotes {
  voteAverage: number;
  voteCount: number;
}

/**
 * TMDB input for classifyFilm: real votes, 'unavailable' (fetch error, 404 or
 * title mismatch), or null when TMDB is not needed / not fetched.
 */
export type TmdbInput = TmdbVotes | 'unavailable' | null;

export interface MigrateOptions {
  includeHighVotes: boolean;
  tolerance: number;
  /** Opt-in rule B5: replace the fabricated 8.0 with the real TMDB score. */
  replaceFakeEight: boolean;
}

export type ClassifyCategory =
  | 'has-real-reviews'
  | 'high-votes'
  | 'vote-fix'
  | 'score-scale'
  | 'score-zero'
  | 'score-replaced'
  | 'score-mismatch'
  | 'score-no-tmdb'
  | 'manual'
  | 'skip';

export interface ClassifyDetails {
  ratingsCount: number;
  stored: ScoreSnapshot;
  tmdb?: TmdbVotes | 'unavailable';
  /** stored skorSotoy - tmdb.voteAverage (rule B only). */
  delta?: number;
  /** Human-readable anomaly flag for report-only buckets. */
  flag?: string;
  /** Extra note about decisions taken (e.g. differing criticsSkorSotoy). */
  note?: string;
}

export interface ClassifyResult {
  category: ClassifyCategory;
  changes: ScoreChanges;
  details: ClassifyDetails;
}

const hasValidTmdbId = (film: FilmItem): boolean => {
  const id = Number(film.tmdbId);
  return Number.isFinite(id) && id > 0;
};

const storedSkor = (film: FilmItem): number =>
  typeof film.skorSotoy === 'number' && Number.isFinite(film.skorSotoy) ? film.skorSotoy : Number.NaN;

/**
 * A film is a rule-B score candidate when its stored score is legacy
 * (scoreScale undefined) AND in a range that read-time doubling mangles
 * (0 < score <= 5.0) or equals the fabricated 8.0 mapper fallback.
 */
const isScoreCandidate = (film: FilmItem): boolean => {
  if (film.scoreScale !== undefined) return false;
  const score = storedSkor(film);
  return (score > 0 && score <= 5.0) || score === 8;
};

/**
 * True when the script must fetch TMDB for this film: a rule-B score
 * candidate that actually has a usable tmdbId.
 */
export function needsTmdb(film: FilmItem): boolean {
  return isScoreCandidate(film) && hasValidTmdbId(film);
}

/**
 * Resolves the real review count for a film document. The app keys ratings by
 * `film.id = data.id || docSnap.id` (AppContext), so a document whose ratings
 * are keyed by a different id would otherwise look review-free. Both keys are
 * looked up and the MAX wins (they can never both be real, and taking the max
 * errs on the side of never writing to a reviewed film).
 */
export function resolveRatingsCount(
  counts: ReadonlyMap<string, number>,
  docId: string,
  dataId?: unknown
): number {
  let resolved = counts.get(docId) || 0;
  if (typeof dataId === 'string' || typeof dataId === 'number') {
    const key = String(dataId).trim();
    if (key) resolved = Math.max(resolved, counts.get(key) || 0);
  }
  return resolved;
}

const normalizeOptions = (options?: Partial<MigrateOptions>): MigrateOptions => ({
  includeHighVotes: options?.includeHighVotes === true,
  replaceFakeEight: options?.replaceFakeEight === true,
  tolerance:
    typeof options?.tolerance === 'number' && Number.isFinite(options.tolerance)
      ? options.tolerance
      : DEFAULT_TOLERANCE,
});

/**
 * Pure decision for one film. Never touches Firestore; returns the category,
 * the whitelisted changes to write (empty for report-only buckets) and
 * details for the report.
 */
export function classifyFilm(
  film: FilmItem,
  ratingsCount: number,
  tmdb: TmdbInput,
  options?: Partial<MigrateOptions>
): ClassifyResult {
  const { includeHighVotes, replaceFakeEight, tolerance } = normalizeOptions(options);
  const stored: ScoreSnapshot = {
    skorSotoy: film.skorSotoy,
    criticsSkorSotoy: film.criticsSkorSotoy,
    totalVotes: film.totalVotes,
    scoreScale: film.scoreScale,
  };
  const details = (extra: Partial<ClassifyDetails> = {}): ClassifyDetails => ({
    ratingsCount,
    stored,
    ...(tmdb !== null ? { tmdb } : {}),
    ...extra,
  });
  const score = storedSkor(film);

  // Real reviews exist: this migration must never write anything.
  if (ratingsCount > 0) {
    return {
      category: 'has-real-reviews',
      changes: {},
      details: details({
        flag:
          film.totalVotes !== ratingsCount
            ? `totalVotes (${String(film.totalVotes)}) does not match the ${ratingsCount} real rating doc(s)`
            : undefined,
      }),
    };
  }

  // Rule A / A2 (votes), evaluated once and merged into every outcome.
  const voteBucket: 'vote-fix' | 'high-votes' | null =
    film.totalVotes === 1
      ? 'vote-fix'
      : typeof film.totalVotes === 'number' && film.totalVotes > 1
        ? 'high-votes'
        : null;
  const voteChange: ScoreChanges =
    voteBucket === 'vote-fix' || (voteBucket === 'high-votes' && includeHighVotes)
      ? { totalVotes: 0 }
      : {};
  const withVote = (scoreChanges: ScoreChanges): ScoreChanges => ({ ...voteChange, ...scoreChanges });

  // Rule B: score candidate.
  if (isScoreCandidate(film)) {
    // C / --no-tmdb: no usable TMDB source -> manual, scores untouched.
    if (!hasValidTmdbId(film) || tmdb === null) {
      return {
        category: 'manual',
        changes: voteChange,
        details: details({
          flag:
            film.skorSotoy === 4
              ? 'stored skorSotoy is exactly 4.0 (likely the old admin 5-scale default, displayed as 8.0); ambiguous, needs a manual decision'
              : undefined,
          note: !hasValidTmdbId(film)
            ? 'no tmdbId: the score can only be fixed manually'
            : 'TMDB lookup skipped (not fetched); score left untouched',
        }),
      };
    }

    if (tmdb === 'unavailable') {
      return {
        category: 'score-no-tmdb',
        changes: voteChange,
        details: details({
          note: 'TMDB returned no usable data (error, 404 or title mismatch); score left untouched',
        }),
      };
    }

    const va = tmdb.voteAverage;
    const vc = tmdb.voteCount;
    const delta = Number((score - va).toFixed(4));
    const isB2 = score === 5 && vc < 5;
    const isB3 = score === 8 && va === 0;
    const isB1 = va > 0 && Math.abs(score - va) <= tolerance;

    if (isB2 || isB3) {
      return {
        category: 'score-zero',
        changes: withVote({ skorSotoy: 0, criticsSkorSotoy: 0, scoreScale: 10 }),
        details: details({
          delta,
          note: isB2
            ? `fabricated unrated seed (stored 5.0, TMDB voteCount ${vc} < 5) -> zeroed`
            : `fabricated mapper fallback (stored 8.0, TMDB voteAverage ${va}) -> zeroed`,
        }),
      };
    }

    if (isB1) {
      // Only the scale is corrected; the score itself is kept.
      const changes: ScoreChanges = { scoreScale: 10 };
      if (film.criticsSkorSotoy === score) {
        // Keep critics equal to the score it mirrors.
        changes.criticsSkorSotoy = score;
      } else {
        return {
          category: 'score-scale',
          changes: withVote(changes),
          details: details({
            delta,
            note: `criticsSkorSotoy (${String(film.criticsSkorSotoy)}) differs from skorSotoy and was left unchanged`,
          }),
        };
      }
      return { category: 'score-scale', changes: withVote(changes), details: details({ delta }) };
    }

    // Rule B5 (opt-in via --replace-fake-eight): the stored 8.0 is the old
    // fabricated mapper fallback that still displays on the site. Only when
    // B1/B2/B3 did not match, replace it with the real TMDB score.
    if (replaceFakeEight && score === 8) {
      const usable = vc >= 5 && va > 0;
      const newScore = usable ? Math.min(10, Math.max(1, Number(va.toFixed(1)))) : 0;
      let note = usable
        ? `fabricated mapper fallback 8.0 replaced with the TMDB score ${newScore} (voteAverage ${va}, voteCount ${vc})`
        : `fabricated mapper fallback 8.0 zeroed (TMDB voteCount ${vc} < 5 or voteAverage ${va} <= 0)`;
      const changes: ScoreChanges = { skorSotoy: newScore };
      if (film.criticsSkorSotoy === score) {
        // Keep critics equal to the score it mirrors.
        changes.criticsSkorSotoy = newScore;
      } else {
        note += `; criticsSkorSotoy (${String(film.criticsSkorSotoy)}) differs from skorSotoy and was left unchanged`;
      }
      changes.scoreScale = 10;
      return { category: 'score-replaced', changes: withVote(changes), details: details({ delta, note }) };
    }

    return {
      category: 'score-mismatch',
      changes: voteChange,
      details: details({
        delta,
        note:
          score === 8
            ? `stored skorSotoy does not match TMDB vote_average within tolerance ${tolerance}; needs manual review (--replace-fake-eight would replace the fabricated 8.0 with the TMDB score)`
            : `stored skorSotoy does not match TMDB vote_average within tolerance ${tolerance}; needs manual review`,
      }),
    };
  }

  // Not a score candidate: only rule A / A2 can apply.
  if (voteBucket === 'high-votes') {
    return {
      category: 'high-votes',
      changes: voteChange,
      details: details({
        flag:
          voteChange.totalVotes === undefined
            ? 'totalVotes > 1 with zero real rating docs (the old client import copied the TMDB vote count); report only unless --include-high-votes'
            : undefined,
      }),
    };
  }

  if (voteBucket === 'vote-fix') {
    return { category: 'vote-fix', changes: voteChange, details: details() };
  }

  return { category: 'skip', changes: {}, details: details() };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

export interface CliOptions {
  apply: boolean;
  restorePath?: string;
  noTmdb: boolean;
  includeHighVotes: boolean;
  replaceFakeEight: boolean;
  tolerance: number;
}

/**
 * Parses and validates CLI flags. Unknown flags and missing values are
 * rejected; --tolerance must be a number between 0 and 2.
 */
export function parseCliOptions(argv: string[]): CliOptions {
  const options: CliOptions = {
    apply: false,
    noTmdb: false,
    includeHighVotes: false,
    replaceFakeEight: false,
    tolerance: DEFAULT_TOLERANCE,
  };
  let restorePath: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const takeValue = (): string => {
      const inline = arg.includes('=') ? arg.slice(arg.indexOf('=') + 1) : '';
      if (inline !== '') return inline;
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        throw new Error(`Missing value for ${arg}`);
      }
      i++;
      return next;
    };

    if (arg === '--apply') {
      options.apply = true;
    } else if (arg === '--no-tmdb') {
      options.noTmdb = true;
    } else if (arg === '--include-high-votes') {
      options.includeHighVotes = true;
    } else if (arg === '--replace-fake-eight') {
      options.replaceFakeEight = true;
    } else if (arg === '--tolerance' || arg.startsWith('--tolerance=')) {
      const raw = takeValue();
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0 || value > 2) {
        throw new Error('--tolerance must be a number between 0 and 2');
      }
      options.tolerance = value;
    } else if (arg === '--restore' || arg.startsWith('--restore=')) {
      const raw = takeValue();
      if (!raw.trim()) throw new Error('Missing value for --restore');
      restorePath = raw.trim();
    } else {
      throw new Error(`Unknown flag: ${arg}`);
    }
  }

  return { ...options, restorePath };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const sleep = (ms: number): Promise<void> =>
  new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

async function runPool<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  const queue = [...items];
  const size = Math.max(1, Math.min(limit, queue.length));
  await Promise.all(
    Array.from({ length: size }, async () => {
      for (;;) {
        const item = queue.shift();
        if (item === undefined) return;
        await worker(item);
      }
    })
  );
}

const toPlainSnapshot = (snapshot: ScoreSnapshot): ScoreSnapshotPlain => ({
  skorSotoy: typeof snapshot.skorSotoy === 'number' && Number.isFinite(snapshot.skorSotoy) ? snapshot.skorSotoy : null,
  criticsSkorSotoy:
    typeof snapshot.criticsSkorSotoy === 'number' && Number.isFinite(snapshot.criticsSkorSotoy)
      ? snapshot.criticsSkorSotoy
      : null,
  totalVotes: typeof snapshot.totalVotes === 'number' && Number.isFinite(snapshot.totalVotes) ? snapshot.totalVotes : null,
  scoreScale: typeof snapshot.scoreScale === 'number' && Number.isFinite(snapshot.scoreScale) ? snapshot.scoreScale : null,
});

const isFailedPrecondition = (err: unknown): boolean => {
  const code = (err as { code?: unknown })?.code;
  const message = String((err as { message?: unknown })?.message || '');
  return (
    code === 9 ||
    code === 'failed-precondition' ||
    code === 'FAILED_PRECONDITION' ||
    message.includes('FAILED_PRECONDITION')
  );
};

const printUsage = (): void => {
  console.error('Usage:');
  console.error('  npx tsx scripts/migrate-film-scores.ts [--apply]');
  console.error('      [--no-tmdb] [--include-high-votes] [--replace-fake-eight]');
  console.error('      [--tolerance <0..2>]');
  console.error('  npx tsx scripts/migrate-film-scores.ts --restore <backup.json> [--apply]');
};

// ---------------------------------------------------------------------------
// TMDB lookups (small dedicated fetch; tmdbServerFetch is NOT modified)
// ---------------------------------------------------------------------------

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_MAX_ATTEMPTS = 3;
const TMDB_RETRY_BASE_MS = 1000;
const TMDB_CONCURRENCY = 8;
const WRITE_CONCURRENCY = 10;

interface TmdbDetail {
  title: string;
  originalTitle: string;
  voteAverage: number;
  voteCount: number;
}

type TmdbDetailOutcome =
  | { kind: 'detail'; detail: TmdbDetail }
  | { kind: 'not_found' }
  | { kind: 'request_error' };

/**
 * One detail lookup (/movie/{id} or /tv/{id}). Retries 429/5xx with backoff;
 * a 404 and other client errors are terminal.
 */
async function fetchTmdbDetail(
  apiKey: string,
  mediaType: 'movie' | 'tv',
  tmdbId: number
): Promise<TmdbDetailOutcome> {
  const isBearer = apiKey.startsWith('ey') || apiKey.length > 50;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (isBearer) headers.Authorization = `Bearer ${apiKey}`;
  const url = new URL(`${TMDB_BASE}/${mediaType}/${tmdbId}`);
  if (!isBearer) url.searchParams.set('api_key', apiKey);

  for (let attempt = 1; attempt <= TMDB_MAX_ATTEMPTS; attempt++) {
    let response: Response;
    try {
      response = await fetch(url.toString(), { method: 'GET', headers });
    } catch {
      if (attempt < TMDB_MAX_ATTEMPTS) {
        await sleep(TMDB_RETRY_BASE_MS * attempt);
        continue;
      }
      return { kind: 'request_error' };
    }

    if (response.ok) {
      const data = (await response.json().catch(() => null)) as any;
      if (!data) return { kind: 'request_error' };
      const title = mediaType === 'tv' ? data.name : data.title;
      const originalTitle = mediaType === 'tv' ? data.original_name : data.original_title;
      return {
        kind: 'detail',
        detail: {
          title: typeof title === 'string' ? title : '',
          originalTitle: typeof originalTitle === 'string' ? originalTitle : '',
          voteAverage: typeof data.vote_average === 'number' ? data.vote_average : Number.NaN,
          voteCount: typeof data.vote_count === 'number' ? data.vote_count : Number.NaN,
        },
      };
    }

    if (response.status === 404) return { kind: 'not_found' };
    if (response.status === 429 || response.status >= 500) {
      if (attempt < TMDB_MAX_ATTEMPTS) {
        await sleep(TMDB_RETRY_BASE_MS * attempt);
        continue;
      }
    }
    return { kind: 'request_error' };
  }

  return { kind: 'request_error' };
}

export type TmdbUnavailableReason = 'title_mismatch' | 'not_found' | 'tmdb_error';

export type TmdbLookupResult =
  | { status: 'ok'; votes: TmdbVotes }
  | { status: 'unavailable'; reason: TmdbUnavailableReason };

/**
 * Fetches the real TMDB votes for one film, replicating the cron's
 * primary/alternate flow: the heuristic media type is tried first, and an
 * animation retries once with the other type. A result is only usable when
 * titlesMatch passes; anything else is 'unavailable'.
 */
export async function fetchTmdbVotes(apiKey: string, film: FilmItem): Promise<TmdbLookupResult> {
  const numericId = Number(film.tmdbId);
  const evaluate = async (
    mediaType: 'movie' | 'tv'
  ): Promise<{ status: 'ok'; detail: TmdbDetail } | { status: 'title_mismatch' | 'error'; errorKind: TmdbUnavailableReason }> => {
    const outcome = await fetchTmdbDetail(apiKey, mediaType, numericId);
    if (outcome.kind !== 'detail') {
      return { status: 'error', errorKind: outcome.kind === 'not_found' ? 'not_found' : 'tmdb_error' };
    }
    const sync = {
      title: outcome.detail.title,
      originalTitle: outcome.detail.originalTitle,
    } as TmdbSyncData;
    if (!titlesMatch(film, sync)) {
      return { status: 'title_mismatch', errorKind: 'title_mismatch' };
    }
    return { status: 'ok', detail: outcome.detail };
  };

  const primaryType = tmdbMediaType(film);
  const primary = await evaluate(primaryType);
  let decision = decideTmdbFallback(film.type, primary.status);
  let chosen = primary;

  if (decision.retryAlternate) {
    const alternateType = primaryType === 'movie' ? 'tv' : 'movie';
    const alternate = await evaluate(alternateType);
    decision = decideTmdbFallback(film.type, primary.status, alternate.status);
    if (decision.useAlternate) chosen = alternate;
  }

  if (chosen.status === 'ok' && 'detail' in chosen) {
    const { voteAverage, voteCount } = chosen.detail;
    if (!Number.isFinite(voteAverage) || !Number.isFinite(voteCount)) {
      return { status: 'unavailable', reason: 'tmdb_error' };
    }
    return { status: 'ok', votes: { voteAverage, voteCount } };
  }

  return {
    status: 'unavailable',
    reason: chosen.status === 'error' ? chosen.errorKind : 'title_mismatch',
  };
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

const REPORT_PATH = resolve(process.cwd(), 'data', 'film-scores-report.json');
const SAMPLE_LIMIT = 20;
const BUCKET_ORDER: ClassifyCategory[] = [
  'has-real-reviews',
  'high-votes',
  'vote-fix',
  'score-scale',
  'score-zero',
  'score-replaced',
  'score-mismatch',
  'score-no-tmdb',
  'manual',
  'skip',
];

interface BucketEntry {
  id: string;
  title: string;
  type: string | null;
  tmdbId: number | null;
  ratingsCount: number;
  old: ScoreSnapshotPlain;
  changes: ScoreChanges;
  new: ScoreSnapshotPlain;
  tmdb?: TmdbVotes | 'unavailable';
  delta?: number;
  flag?: string;
  note?: string;
}

interface MigrationReport {
  generatedAt: string;
  mode: 'dry-run' | 'apply';
  options: { includeHighVotes: boolean; tolerance: number; noTmdb: boolean; replaceFakeEight: boolean };
  counts: Record<string, number>;
  /** filmIds of rating docs matching no film (up to 20 samples). */
  ratingsUnmatchedSamples?: string[];
  tmdb: {
    needed: number;
    resolved: number;
    unavailable: number;
    titleMismatch: number;
    notFound: number;
    tmdbError: number;
    skippedByFlag: number;
  };
  buckets: Record<ClassifyCategory, BucketEntry[]>;
}

interface FilmRecord {
  id: string;
  /** Raw `data.id` from the document, as the app keys ratings by it. */
  dataId?: unknown;
  film: FilmItem;
  updateTime?: Timestamp;
}

const toBucketEntry = (record: FilmRecord, result: ClassifyResult): BucketEntry => {
  const old = toPlainSnapshot(result.details.stored);
  const fresh = {} as ScoreSnapshotPlain;
  for (const field of SCORE_FIELDS) {
    const change = result.changes[field];
    fresh[field] = change !== undefined ? change : old[field];
  }
  return {
    id: record.id,
    title: record.film.title || '(untitled)',
    type: typeof record.film.type === 'string' ? record.film.type : null,
    tmdbId: hasValidTmdbId(record.film) ? Number(record.film.tmdbId) : null,
    ratingsCount: result.details.ratingsCount,
    old,
    changes: result.changes,
    new: fresh,
    ...(result.details.tmdb !== undefined ? { tmdb: result.details.tmdb } : {}),
    ...(result.details.delta !== undefined ? { delta: result.details.delta } : {}),
    ...(result.details.flag ? { flag: result.details.flag } : {}),
    ...(result.details.note ? { note: result.details.note } : {}),
  };
};

const tmdbCell = (tmdb: BucketEntry['tmdb']): string | number => {
  if (!tmdb) return '-';
  if (tmdb === 'unavailable') return 'unavailable';
  return `${tmdb.voteAverage} / ${tmdb.voteCount}`;
};

const printBucketSamples = (category: ClassifyCategory, entries: BucketEntry[]): void => {
  console.log(`\n--- ${category}: ${entries.length} film(s) ---`);
  if (entries.length === 0) return;
  console.table(
    entries.slice(0, SAMPLE_LIMIT).map((entry) => ({
      ID: entry.id,
      Title: entry.title,
      'Old skor': entry.old.skorSotoy,
      'Old critics': entry.old.criticsSkorSotoy,
      'Old votes': entry.old.totalVotes,
      'Old scale': entry.old.scoreScale,
      'New skor': entry.new.skorSotoy,
      'New critics': entry.new.criticsSkorSotoy,
      'New votes': entry.new.totalVotes,
      'New scale': entry.new.scoreScale,
      'TMDB (avg/count)': tmdbCell(entry.tmdb),
      Delta: entry.delta ?? '-',
      Flag: entry.flag ?? entry.note ?? '-',
    }))
  );
  if (entries.length > SAMPLE_LIMIT) {
    console.log(`... and ${entries.length - SAMPLE_LIMIT} more (full list in the report file).`);
  }
};

async function writeReport(report: MigrationReport): Promise<void> {
  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`\nReport written to: ${REPORT_PATH}`);
}

// ---------------------------------------------------------------------------
// Restore mode
// ---------------------------------------------------------------------------

interface BackupEntry {
  docId: string;
  old: Partial<Record<ScoreField, number | null>>;
  new?: Partial<Record<ScoreField, number | null>>;
}

interface RestoreWrite {
  docId: string;
  data: Record<string, unknown>;
  sample: Record<string, string>;
}

async function runRestore(cli: CliOptions): Promise<void> {
  console.log('=====================================================');
  console.log(`Starting Film Scores Restore ${cli.apply ? '(APPLY MODE)' : '(DRY-RUN MODE)'}`);
  console.log('=====================================================\n');

  if (!cli.restorePath) {
    console.error('[Fatal] Missing backup path after --restore.');
    printUsage();
    process.exit(1);
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) {
    console.error('[Fatal] GOOGLE_APPLICATION_CREDENTIALS is not set.');
    console.error('Point it at a valid Firebase service account JSON key file.');
    process.exit(1);
  }
  if (!getApps().length) {
    initializeApp({
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket || undefined,
    });
  }
  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  console.log(`Target Firestore database: ${databaseId}`);
  const db = getFirestore(getApp(), databaseId);

  const backupPath = resolve(process.cwd(), cli.restorePath);
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(backupPath, 'utf8'));
  } catch (err: any) {
    console.error(`[Fatal] Could not read backup file: ${backupPath}`);
    console.error(err?.message || String(err));
    process.exit(1);
  }
  const entries: BackupEntry[] = Array.isArray(raw)
    ? (raw as BackupEntry[])
    : Array.isArray((raw as { entries?: BackupEntry[] })?.entries)
      ? (raw as { entries: BackupEntry[] }).entries
      : [];

  if (entries.length === 0) {
    console.error(`[Fatal] No backup entries found in: ${backupPath}`);
    process.exit(1);
  }

  const writes: RestoreWrite[] = [];
  let invalid = 0;
  for (const entry of entries) {
    if (!entry || typeof entry.docId !== 'string' || !entry.docId.trim() || !entry.old || typeof entry.old !== 'object') {
      invalid++;
      continue;
    }
    const data: Record<string, unknown> = {};
    const sample: Record<string, string> = {};
    for (const field of SCORE_FIELDS) {
      const value = entry.old[field];
      if (value === null || value === undefined) {
        data[field] = FieldValue.delete();
        sample[field] = '(delete field)';
      } else if (typeof value === 'number' && Number.isFinite(value)) {
        data[field] = value;
        sample[field] = String(value);
      }
      // Anything else is ignored: only whitelisted numeric values are restored.
    }
    if (Object.keys(data).length > 0) {
      writes.push({ docId: entry.docId.trim(), data, sample });
    }
  }

  console.log(`Backup entries read: ${entries.length} (invalid: ${invalid}, restorable: ${writes.length})\n`);
  console.table(
    writes.slice(0, SAMPLE_LIMIT).map((write) => ({
      ID: write.docId,
      skorSotoy: write.sample.skorSotoy,
      criticsSkorSotoy: write.sample.criticsSkorSotoy,
      totalVotes: write.sample.totalVotes,
      scoreScale: write.sample.scoreScale,
    }))
  );

  if (!cli.apply) {
    console.log('\nDry-run complete. Re-run with --apply to write the old values back.');
    console.log('=====================================================\n');
    return;
  }

  let updated = 0;
  const errors: string[] = [];
  await runPool(writes, WRITE_CONCURRENCY, async (write) => {
    try {
      await db.collection('films').doc(write.docId).update(write.data);
      updated++;
    } catch (err: any) {
      errors.push(`${write.docId}: ${err?.message || String(err)}`);
    }
  });

  console.log('=====================================================');
  console.log('RESTORE SUMMARY');
  console.log('=====================================================');
  console.log(`Entries restored:                  ${updated}`);
  console.log(`Errors:                            ${errors.length}`);
  errors.slice(0, 10).forEach((message) => console.error(`  - ${message}`));
  console.log('=====================================================\n');
}

// ---------------------------------------------------------------------------
// Migration main flow
// ---------------------------------------------------------------------------

async function runMigration(cli: CliOptions): Promise<void> {
  console.log('=====================================================');
  console.log(`Starting Film Scores Migration ${cli.apply ? '(APPLY MODE)' : '(DRY-RUN MODE)'}`);
  console.log('=====================================================\n');

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) {
    console.error('[Fatal] GOOGLE_APPLICATION_CREDENTIALS is not set.');
    console.error('Point it at a valid Firebase service account JSON key file.');
    process.exit(1);
  }

  const apiKey = process.env.TMDB_API_KEY?.trim() || '';
  if (!cli.noTmdb && !apiKey) {
    console.error('[Fatal] TMDB_API_KEY is not set.');
    console.error('Add it to .env, or pass --no-tmdb to skip all rule B score fixes.');
    printUsage();
    process.exit(1);
  }

  if (!getApps().length) {
    initializeApp({
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket || undefined,
    });
  }
  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  console.log(`Target Firestore database: ${databaseId}`);
  const db = getFirestore(getApp(), databaseId);

  console.log('Loading documents from "films" collection...');
  const filmsSnap = await db.collection('films').get();
  if (filmsSnap.size === 0) {
    console.error('[ABORT GUARD ERROR] 0 documents found in "films" collection. Aborting; no writes were performed.');
    process.exit(1);
  }
  console.log(`Loaded ${filmsSnap.size} film documents.`);

  console.log('Counting real reviews from "ratings" (single collection read)...');
  const ratingsSnap = await db.collection('ratings').get();
  const ratingsCountById = new Map<string, number>();
  ratingsSnap.docs.forEach((docSnap) => {
    const rawFilmId = docSnap.get('filmId');
    const filmId = rawFilmId == null ? '' : String(rawFilmId).trim();
    if (!filmId) return;
    ratingsCountById.set(filmId, (ratingsCountById.get(filmId) || 0) + 1);
  });
  console.log(`Loaded ${ratingsSnap.size} rating document(s).\n`);

  const records: FilmRecord[] = filmsSnap.docs.map((docSnap) => ({
    id: docSnap.id,
    dataId: docSnap.get('id'),
    film: docSnap.data() as FilmItem,
    updateTime: docSnap.updateTime,
  }));

  // Rating docs keyed to neither docSnap.id nor data.id can never be matched
  // by any film; count and sample them so the operator can investigate.
  const matchedFilmIds = new Set<string>([...records.map((record) => record.id)]);
  for (const record of records) {
    if (typeof record.dataId === 'string' || typeof record.dataId === 'number') {
      const key = String(record.dataId).trim();
      if (key) matchedFilmIds.add(key);
    }
  }
  let ratingsUnmatched = 0;
  const ratingsUnmatchedSamples: string[] = [];
  for (const [filmId, count] of ratingsCountById) {
    if (matchedFilmIds.has(filmId)) continue;
    ratingsUnmatched += count;
    if (ratingsUnmatchedSamples.length < SAMPLE_LIMIT) ratingsUnmatchedSamples.push(filmId);
  }

  // TMDB is fetched only for zero-review rule-B candidates with a tmdbId.
  const candidates = records.filter(
    (record) => resolveRatingsCount(ratingsCountById, record.id, record.dataId) === 0 && needsTmdb(record.film)
  );
  const tmdbNeeded = cli.noTmdb ? 0 : candidates.length;
  const skippedByFlag = cli.noTmdb ? candidates.length : 0;
  const tmdbResults = new Map<string, TmdbLookupResult>();

  if (tmdbNeeded > 0) {
    console.log(`Fetching TMDB votes for ${tmdbNeeded} film(s) (concurrency ${TMDB_CONCURRENCY})...`);
    let done = 0;
    await runPool(candidates, TMDB_CONCURRENCY, async (record) => {
      tmdbResults.set(record.id, await fetchTmdbVotes(apiKey, record.film));
      done++;
      if (done % 50 === 0 || done === tmdbNeeded) {
        console.log(`  TMDB progress: ${done}/${tmdbNeeded}`);
      }
    });
    console.log('TMDB lookups done.\n');
  }

  // Classify every film.
  const buckets = Object.fromEntries(
    BUCKET_ORDER.map((category) => [category, [] as BucketEntry[]])
  ) as Record<ClassifyCategory, BucketEntry[]>;
  const writable: Array<{ entry: BucketEntry; updateTime?: Timestamp }> = [];
  let flaggedHasRealReviews = 0;
  let flaggedManual4 = 0;
  let resolvedCount = 0;
  let unavailableCount = 0;
  let titleMismatchCount = 0;
  let notFoundCount = 0;
  let tmdbErrorCount = 0;

  for (const record of records) {
    const ratingsCount = resolveRatingsCount(ratingsCountById, record.id, record.dataId);
    const lookup = tmdbResults.get(record.id);
    const tmdbInput: TmdbInput = lookup && lookup.status === 'ok' ? lookup.votes : lookup ? 'unavailable' : null;

    if (lookup) {
      if (lookup.status === 'ok') {
        resolvedCount++;
      } else {
        unavailableCount++;
        if (lookup.reason === 'title_mismatch') titleMismatchCount++;
        else if (lookup.reason === 'not_found') notFoundCount++;
        else tmdbErrorCount++;
      }
    }

    const result = classifyFilm(record.film, ratingsCount, tmdbInput, cli);
    const entry = toBucketEntry(record, result);
    buckets[result.category].push(entry);

    if (result.category === 'has-real-reviews' && result.details.flag) flaggedHasRealReviews++;
    if (result.category === 'manual' && result.details.flag) flaggedManual4++;
    if (Object.keys(result.changes).length > 0) {
      writable.push({ entry, updateTime: record.updateTime });
    }
  }

  const counts: Record<string, number> = { scanned: records.length };
  for (const category of BUCKET_ORDER) counts[category] = buckets[category].length;
  counts.flaggedHasRealReviews = flaggedHasRealReviews;
  counts.flaggedManual4 = flaggedManual4;
  counts.ratingsUnmatched = ratingsUnmatched;

  // Console output: counts, then up to 20 samples per bucket.
  console.log('=====================================================');
  console.log('SUMMARY COUNTS');
  console.log('=====================================================');
  console.log(`Execution Mode:                    ${cli.apply ? 'APPLY (WILL WRITE CHANGES)' : 'DRY-RUN (NO CHANGES MADE)'}`);
  console.log(`Films scanned:                     ${counts.scanned}`);
  console.log(`Films with real reviews (RO):      ${counts['has-real-reviews']} (flagged: ${flaggedHasRealReviews})`);
  console.log(`Vote fix (1 -> 0):                 ${counts['vote-fix']}`);
  console.log(`High votes (>1, 0 ratings):        ${counts['high-votes']}${cli.includeHighVotes ? ' (fixed via --include-high-votes)' : ' (report only)'}`);
  console.log(`Score scale fix (B1):              ${counts['score-scale']}`);
  console.log(`Fabricated score zeroed (B2/B3):   ${counts['score-zero']}`);
  console.log(`Fake 8.0 replaced (B5):            ${counts['score-replaced']}${cli.replaceFakeEight ? ' (via --replace-fake-eight)' : ''}`);
  console.log(`TMDB mismatch (B4, RO):            ${counts['score-mismatch']}`);
  console.log(`No TMDB data (RO):                 ${counts['score-no-tmdb']}`);
  console.log(`Manual (no tmdbId / skipped):      ${counts.manual} (flagged 4.0: ${flaggedManual4})`);
  console.log(`Unchanged (skip):                  ${counts.skip}`);
  console.log(`Documents to write:                ${writable.length}`);
  console.log(`Rating docs matching no film:      ${ratingsUnmatched}`);
  if (ratingsUnmatched > 0) {
    console.log(`  Sample unmatched filmIds:        ${ratingsUnmatchedSamples.join(', ')}`);
  }
  console.log('\nTMDB lookups:');
  console.log(`  Needed:                          ${tmdbNeeded}`);
  console.log(`  Resolved:                        ${resolvedCount}`);
  console.log(`  Unavailable:                     ${unavailableCount} (title mismatch: ${titleMismatchCount}, 404: ${notFoundCount}, error: ${tmdbErrorCount})`);
  if (cli.noTmdb) {
    console.log(`  Rule B films skipped (--no-tmdb): ${skippedByFlag}`);
  }

  for (const category of BUCKET_ORDER) {
    if (category === 'skip' && buckets.skip.length === 0) continue;
    printBucketSamples(category, buckets[category]);
  }

  const report: MigrationReport = {
    generatedAt: new Date().toISOString(),
    mode: cli.apply ? 'apply' : 'dry-run',
    options: {
      includeHighVotes: cli.includeHighVotes,
      tolerance: cli.tolerance,
      noTmdb: cli.noTmdb,
      replaceFakeEight: cli.replaceFakeEight,
    },
    counts,
    tmdb: {
      needed: tmdbNeeded,
      resolved: resolvedCount,
      unavailable: unavailableCount,
      titleMismatch: titleMismatchCount,
      notFound: notFoundCount,
      tmdbError: tmdbErrorCount,
      skippedByFlag,
    },
    buckets,
    ...(ratingsUnmatched > 0 ? { ratingsUnmatchedSamples } : {}),
  };
  await writeReport(report);

  if (!cli.apply) {
    console.log('\nDry-run complete. Re-run with --apply to write these changes.');
    console.log('=====================================================\n');
    return;
  }

  if (ratingsUnmatched > 0) {
    console.warn(
      `[WARNING] ${ratingsUnmatched} rating doc(s) match NO film document (neither doc id nor data.id).` +
        '\nTheir films may have been misclassified as having zero reviews in this run.' +
        '\nReview ratingsUnmatchedSamples in data/film-scores-report.json before trusting these results.' +
        '\nContinuing; no abort.'
    );
  }

  if (writable.length === 0) {
    console.log('\nNothing to write; no document needs changes.');
    console.log('=====================================================\n');
    return;
  }

  // Backup before any write: old + new values, absent fields as null.
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = resolve(process.cwd(), 'data', `film-scores-backup-${timestamp}.json`);
  await mkdir(dirname(backupPath), { recursive: true });
  await writeFile(
    backupPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        mode: 'apply',
        entries: writable.map(({ entry }) => ({ docId: entry.id, old: entry.old, new: entry.new })),
      },
      null,
      2
    )}\n`,
    'utf8'
  );
  console.log(`\nBackup written to: ${backupPath}`);
  console.log(`Applying ${writable.length} document update(s) with concurrency ${WRITE_CONCURRENCY} and lastUpdateTime preconditions...`);

  let updated = 0;
  let skippedChanged = 0;
  const errors: string[] = [];
  await runPool(writable, WRITE_CONCURRENCY, async ({ entry, updateTime }) => {
    try {
      const ref = db.collection('films').doc(entry.id);
      const precondition = updateTime ? { lastUpdateTime: updateTime } : undefined;
      if (precondition) await ref.update(entry.changes, precondition);
      else await ref.update(entry.changes);
      updated++;
    } catch (err: any) {
      if (isFailedPrecondition(err)) {
        skippedChanged++;
      } else {
        errors.push(`${entry.id}: ${err?.message || String(err)}`);
      }
    }
  });

  console.log('\n=====================================================');
  console.log('APPLY SUMMARY');
  console.log('=====================================================');
  console.log(`Updated:                           ${updated}`);
  console.log(`Skipped (changed during run):      ${skippedChanged}`);
  console.log(`Errors:                            ${errors.length}`);
  errors.slice(0, 10).forEach((message) => console.error(`  - ${message}`));
  console.log(`Backup file:                       ${backupPath}`);
  console.log('=====================================================\n');
}

async function main(): Promise<void> {
  let cli: CliOptions;
  try {
    cli = parseCliOptions(process.argv.slice(2));
  } catch (err: any) {
    console.error(`[Fatal] ${err?.message || String(err)}`);
    printUsage();
    process.exit(1);
  }

  if (cli.restorePath) {
    await runRestore(cli);
  } else {
    await runMigration(cli);
  }
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (invokedDirectly) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('Unhandled failure:', err);
      process.exit(1);
    });
}
