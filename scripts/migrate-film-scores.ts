/**
 * Migrate Film Scores Script (one-off)
 *
 * Cleans fabricated vote counts and fabricated or mis-scaled scores on legacy
 * film documents in the `films` collection:
 *
 * - Real reviews live in the top-level `ratings` collection (field `filmId`).
 *   Ground truth for "real votes" is the number of rating docs per filmId,
 *   built from ONE read of the whole collection (`mediaRatings` is ignored).
 * - Legacy docs stored scores on a 5-point scale with `scoreScale === undefined`
 *   and the read path doubles 0 < stored <= 5.0 (AppContext.tsx and
 *   src/utils/firestoreRestClient.ts). Detection here always uses STORED values.
 *
 * Buckets (exported pure `classifyFilm` is the single decision point):
 * - D  `has-ratings`:   real reviews exist -> NEVER write anything (report only).
 * - A  `votes-seed`:    totalVotes === 1 (old import seed)      -> totalVotes 0.
 * - A2 `high-votes`:    totalVotes > 1 with 0 ratings -> report only, unless
 *      --include-high-votes is passed (then totalVotes 0).
 * - B1 `tmdb-derived`:  stored score within 0.051 of the TMDB vote_average
 *      -> write scoreScale 10 only; keep skorSotoy; keep criticsSkorSotoy equal
 *      only when it already equals skorSotoy (flag it when a differing legacy
 *      critics score may change display).
 * - B2 `fabricated`:    stored 5.0 exactly AND tmdb vote_count < 5 (old daily
 *      "unrated" seed that displayed as 10.0) -> skorSotoy 0, criticsSkorSotoy 0,
 *      scoreScale 10.
 * - B3 `fabricated`:    stored 8.0 exactly AND tmdb vote_average 0/undefined
 *      (old mapper fallback) -> skorSotoy 0, criticsSkorSotoy 0, scoreScale 10.
 * - B4 `mismatch`:      any other legacy mismatch -> REPORT ONLY.
 * - `no-tmdb-data`:     rule B candidate but TMDB lookup failed/404, or --no-tmdb
 *      -> REPORT ONLY, never changes a score.
 * - `manual`:           films without tmdbId -> scores are NEVER changed;
 *      report counts/samples and flag stored 4.0 exactly (old admin default).
 *      Only rule A may apply to them.
 *
 * Whitelist: the script only ever writes skorSotoy, criticsSkorSotoy,
 * totalVotes, scoreScale. Nothing else, in any mode.
 *
 * Safety rules:
 * - Dry-run by default; nothing is written unless --apply is passed.
 * - --apply first writes data/film-scores-backup-<timestamp>.json with the old
 *   values of every doc it will change, then updates each doc individually with
 *   `update(data, { lastUpdateTime })` from the snapshot that was read, so a doc
 *   changed meanwhile (new review, cron, admin edit) fails FAILED_PRECONDITION
 *   and is counted as "skipped (changed during run)" instead of overwritten.
 * - --restore <backup.json> writes the old values back (whitelisted fields
 *   only, and only the fields that entry's `new` object actually changed; no
 *   lastUpdateTime precondition); dry-run by default, --apply to write.
 * - Orphan ratings (a rating `filmId` matching no `films` doc id) are always
 *   reported. With --apply the run aborts before any write unless
 *   --allow-orphan-ratings is passed.
 * - Idempotency: after --apply, a re-run reports 0 changes in every fixable
 *   category.
 *
 * Requirements:
 * - GOOGLE_APPLICATION_CREDENTIALS must point to a valid service account JSON key file.
 * - TMDB_API_KEY must be set (v3 key or v4 read access token) unless --no-tmdb.
 *
 * Usage:
 * Dry-Run Mode (default, no writes):
 *   node --env-file=.env --import tsx scripts/migrate-film-scores.ts
 * Apply Mode:
 *   node --env-file=.env --import tsx scripts/migrate-film-scores.ts --apply
 * Include high-vote fixes:
 *   node --env-file=.env --import tsx scripts/migrate-film-scores.ts --apply --include-high-votes
 * Skip all TMDB rule B fixes (report only):
 *   node --env-file=.env --import tsx scripts/migrate-film-scores.ts --no-tmdb
 * Allow --apply despite orphan ratings:
 *   node --env-file=.env --import tsx scripts/migrate-film-scores.ts --apply --allow-orphan-ratings
 * Restore a backup (dry-run by default):
 *   node --env-file=.env --import tsx scripts/migrate-film-scores.ts --restore data/film-scores-backup-<ts>.json
 *   node --env-file=.env --import tsx scripts/migrate-film-scores.ts --restore data/film-scores-backup-<ts>.json --apply
 *
 * The full report is always written to data/film-scores-report.json.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { DocumentData, UpdateData } from 'firebase-admin/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { tmdbMediaType } from '../src/utils/tmdbSync';
import type { FilmItem } from '../src/types';

// ---------------------------------------------------------------------------
// Pure classification (unit-tested in scripts/test-migrate-film-scores.ts)
// ---------------------------------------------------------------------------

/** Fields the script may ever write. Anything outside this is a bug. */
export const WHITELISTED_FIELDS = [
  'skorSotoy',
  'criticsSkorSotoy',
  'totalVotes',
  'scoreScale',
] as const;

export type WhitelistedField = (typeof WHITELISTED_FIELDS)[number];

export interface ClassifyChanges {
  skorSotoy?: number;
  criticsSkorSotoy?: number;
  totalVotes?: number;
  scoreScale?: number;
}

/** Minimal film shape; values are coerced defensively (stored values only). */
export interface MigratableFilm {
  id?: unknown;
  title?: unknown;
  tmdbId?: unknown;
  type?: unknown;
  duration?: unknown;
  skorSotoy?: unknown;
  criticsSkorSotoy?: unknown;
  totalVotes?: unknown;
  scoreScale?: unknown;
}

/** TMDB lookup result for one film, or null (no data) / 'unavailable' (404, error). */
export type TmdbInfo = { voteAverage: number; voteCount: number } | null | 'unavailable';

export interface ClassifyOptions {
  /** Rule A2: allow fixing fabricated totalVotes > 1 down to 0. */
  includeHighVotes?: boolean;
}

export type ClassifyCategory =
  | 'has-ratings' // D: real reviews exist, report only, never written
  | 'votes-seed' // A: totalVotes === 1 -> 0
  | 'high-votes' // A2: totalVotes > 1 -> report only (or fixed with --include-high-votes)
  | 'tmdb-derived' // B1: legacy score matches TMDB vote_average -> scoreScale 10
  | 'fabricated' // B2/B3: known fabricated seeds -> 0 / 0 / scoreScale 10
  | 'mismatch' // B4: legacy score matches nothing known -> report only
  | 'no-tmdb-data' // rule B candidate without usable TMDB data -> report only
  | 'manual' // C: no tmdbId -> scores never changed
  | 'ok'; // nothing to do (skip)

export interface ClassifyReport {
  /** Stored values as found in Firestore (null when the field is absent). */
  stored: {
    skorSotoy: number | null;
    criticsSkorSotoy: number | null;
    totalVotes: number | null;
    scoreScale: number | null;
  };
  ratingsCount: number;
  tmdb: { voteAverage: number; voteCount: number } | 'unavailable' | null;
  /** Extra detail, e.g. which fabricated rule fired. */
  reason?: string;
}

export interface ClassifyResult {
  category: ClassifyCategory;
  /** Fields to write, or null when this film must not be written. */
  changes: ClassifyChanges | null;
  flags: string[];
  report: ClassifyReport;
}

const asStoredNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const hasTmdbId = (film: MigratableFilm): boolean => {
  const numeric = typeof film.tmdbId === 'number' ? film.tmdbId : Number(film.tmdbId);
  return Number.isFinite(numeric) && numeric > 0;
};

const isLegacyUnscaled = (film: MigratableFilm): boolean =>
  film.scoreScale === undefined || film.scoreScale === null;

/**
 * Pure decision function for one film.
 *
 * Never proposes a write when the film has real ratings (bucket D), when the
 * film has no tmdbId (bucket manual), when it is already scaled, or when the
 * TMDB lookup failed. Changes keys are always within the whitelist.
 */
export function classifyFilm(
  film: MigratableFilm,
  ratingsCount: number,
  tmdb: TmdbInfo,
  options: ClassifyOptions = {}
): ClassifyResult {
  const stored = {
    skorSotoy: asStoredNumber(film.skorSotoy),
    criticsSkorSotoy: asStoredNumber(film.criticsSkorSotoy),
    totalVotes: asStoredNumber(film.totalVotes),
    scoreScale: asStoredNumber(film.scoreScale),
  };

  // ---------------------------------------------------------------------------
  // Bucket D: films with real reviews are never written, only reported.
  // ---------------------------------------------------------------------------
  if (ratingsCount > 0) {
    const flags: string[] = [];
    if (stored.totalVotes !== null && stored.totalVotes !== ratingsCount) {
      flags.push('totalVotes-does-not-match-ratings');
    }
    return {
      category: 'has-ratings',
      changes: null,
      flags,
      report: {
        stored,
        ratingsCount,
        tmdb: tmdb === 'unavailable' ? 'unavailable' : tmdb ? { ...tmdb } : null,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Rules A / A2: fabricated vote counts (apply to every film with 0 ratings).
  // ---------------------------------------------------------------------------
  const voteChanges: ClassifyChanges = {};
  const voteFlags: string[] = [];
  let votesFixed = false;

  if (stored.totalVotes === 1) {
    // Rule A: old import seed of exactly 1 vote.
    voteChanges.totalVotes = 0;
    votesFixed = true;
  } else if (stored.totalVotes !== null && stored.totalVotes > 1) {
    if (options.includeHighVotes) {
      voteChanges.totalVotes = 0;
      votesFixed = true;
    } else {
      voteFlags.push('high-votes-report-only');
    }
  }

  // ---------------------------------------------------------------------------
  // Rule C: films without tmdbId never get score changes; only rule A applies.
  // ---------------------------------------------------------------------------
  if (!hasTmdbId(film)) {
    const flags = [...voteFlags];
    if (stored.skorSotoy === 4) flags.push('likely-old-admin-default-4');
    return {
      category: 'manual',
      changes: votesFixed ? { ...voteChanges } : null,
      flags,
      report: {
        stored,
        ratingsCount,
        tmdb: null,
        reason: flags.includes('likely-old-admin-default-4')
          ? 'stored 4.0 with no tmdbId (ambiguous old admin default)'
          : 'no tmdbId; scores are never changed',
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Rule B: score fixes only for legacy (scoreScale === undefined) docs.
  // ---------------------------------------------------------------------------
  if (!isLegacyUnscaled(film)) {
    // Already on the 10-point scale; rule B never touches it. Rule A may still
    // have proposed a vote fix.
    const flags = [...voteFlags];
    if (stored.scoreScale === 10) flags.push('already-scoreScale-10');
    const votesWereHigh = stored.totalVotes !== null && stored.totalVotes > 1;
    return {
      category: votesWereHigh ? 'high-votes' : votesFixed ? 'votes-seed' : 'ok',
      changes: votesFixed ? { ...voteChanges } : null,
      flags,
      report: { stored, ratingsCount, tmdb: null, reason: 'already scaled; rule B skipped' },
    };
  }

  const finish = (
    category: ClassifyCategory,
    scoreChanges: ClassifyChanges,
    extraFlags: string[],
    reason?: string
  ): ClassifyResult => ({
    category,
    changes: votesFixed || Object.keys(scoreChanges).length > 0
      ? { ...voteChanges, ...scoreChanges }
      : null,
    flags: [...voteFlags, ...extraFlags],
    report: {
      stored,
      ratingsCount,
      tmdb: tmdb === 'unavailable' ? 'unavailable' : tmdb ? { ...tmdb } : null,
      reason,
    },
  });

  // TMDB data is unusable: report only, never change a score.
  if (tmdb === 'unavailable' || tmdb === null) {
    return finish(
      'no-tmdb-data',
      {},
      [],
      tmdb === 'unavailable'
        ? 'TMDB lookup failed or --no-tmdb; score left untouched'
        : 'no TMDB data available; score left untouched'
    );
  }

  const storedSkor = stored.skorSotoy;
  if (storedSkor === null) {
    return finish('mismatch', {}, [], 'no stored skorSotoy to compare against TMDB');
  }

  // Legacy zero score: the read-time doubling only applies to 0 < stored <= 5.0,
  // so a stored 0 already displays as 0 and there is nothing to fix.
  if (storedSkor === 0) {
    const flags = [...voteFlags];
    return {
      category: votesFixed ? 'votes-seed' : 'ok',
      changes: votesFixed ? { ...voteChanges } : null,
      flags,
      report: {
        stored,
        ratingsCount,
        tmdb: { ...tmdb },
        reason: 'stored score is 0 (displays as 0 on any scale); nothing to fix',
      },
    };
  }

  // B1: stored value already agrees with TMDB -> just stamp the 10-point scale.
  // Tolerance 0.051 absorbs TMDB one-decimal rounding (e.g. 4.5 vs 4.55).
  if (tmdb.voteAverage > 0 && Math.abs(storedSkor - tmdb.voteAverage) <= 0.051) {
    const scoreChanges: ClassifyChanges = { scoreScale: 10 };
    const extraFlags: string[] = [];
    // Keep critics equal only when it currently equals skorSotoy.
    if (stored.criticsSkorSotoy !== null && stored.criticsSkorSotoy === storedSkor) {
      scoreChanges.criticsSkorSotoy = storedSkor;
    } else if (
      stored.criticsSkorSotoy !== null &&
      stored.criticsSkorSotoy > 0 &&
      stored.criticsSkorSotoy <= 5
    ) {
      // A differing legacy critics score will stop being doubled once
      // scoreScale 10 is stamped, which may change what the UI displays.
      extraFlags.push('critics-differs-may-change-display');
    }
    return finish('tmdb-derived', scoreChanges, extraFlags, 'stored score matches TMDB vote_average');
  }

  // B2: old daily-import "unrated" seed (displays as 10.0 through doubling).
  if (storedSkor === 5 && tmdb.voteCount < 5) {
    return finish(
      'fabricated',
      { skorSotoy: 0, criticsSkorSotoy: 0, scoreScale: 10 },
      [],
      'stored 5.0 with < 5 TMDB votes (fabricated unrated seed)'
    );
  }

  // B3: old mapper fallback for titles TMDB had no vote_average for.
  if (storedSkor === 8 && !(tmdb.voteAverage > 0)) {
    return finish(
      'fabricated',
      { skorSotoy: 0, criticsSkorSotoy: 0, scoreScale: 10 },
      [],
      'stored 8.0 with no TMDB vote_average (fabricated mapper fallback)'
    );
  }

  // B4: anything else that does not match a known pattern.
  return finish(
    'mismatch',
    {},
    [],
    'stored score matches no known TMDB-derived or fabricated pattern'
  );
}

// ---------------------------------------------------------------------------
// TMDB fetch (auth/env pattern copied from scripts/fill-tmdb-ids.ts)
// ---------------------------------------------------------------------------

const TMDB_CONCURRENCY = 8;
const WRITE_CONCURRENCY = 10;
const TMDB_MAX_ATTEMPTS = 3;
const TMDB_RETRY_DELAY_MS = 1000;
const REPORT_PATH = resolve(process.cwd(), 'data', 'film-scores-report.json');
const SAMPLE_LIMIT = 20;

export type TmdbMediaType = 'movie' | 'tv';

const sleep = (ms: number): Promise<void> =>
  new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

/** Bearer keys are JWTs ("ey..." or long); v3 keys go in the query string. */
const isBearerKey = (apiKey: string): boolean => apiKey.startsWith('ey') || apiKey.length > 50;

/**
 * Fetches a single TMDB movie/tv title. Retries 429/5xx with backoff; a 404 or
 * any other error resolves to 'unavailable' (which never changes a film).
 * Secrets are never logged.
 */
async function fetchTmdbTitle(
  apiKey: string,
  mediaType: TmdbMediaType,
  tmdbId: number
): Promise<TmdbInfo> {
  const isBearer = isBearerKey(apiKey);
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (isBearer) headers.Authorization = `Bearer ${apiKey}`;

  const buildUrl = (): URL => {
    const url = new URL(`https://api.themoviedb.org/3/${mediaType}/${tmdbId}`);
    if (!isBearer) url.searchParams.set('api_key', apiKey);
    url.searchParams.set('language', 'en-US');
    return url;
  };

  for (let attempt = 0; attempt < TMDB_MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(buildUrl().toString(), { method: 'GET', headers });
      if (response.ok) {
        const data: any = await response.json();
        const voteAverage = typeof data?.vote_average === 'number' ? data.vote_average : 0;
        const voteCount = typeof data?.vote_count === 'number' ? data.vote_count : 0;
        return { voteAverage, voteCount };
      }

      if (response.status === 404) return 'unavailable';

      const shouldRetry = response.status === 429 || response.status >= 500;
      if (shouldRetry && attempt < TMDB_MAX_ATTEMPTS - 1) {
        await sleep(TMDB_RETRY_DELAY_MS * 2 ** attempt);
        continue;
      }
      return 'unavailable';
    } catch {
      // Network error: retry, then give up as unavailable.
      if (attempt < TMDB_MAX_ATTEMPTS - 1) {
        await sleep(TMDB_RETRY_DELAY_MS * 2 ** attempt);
        continue;
      }
      return 'unavailable';
    }
  }

  return 'unavailable';
}

/** Simple concurrency-limited pool. */
async function runPool<T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  if (items.length === 0) return;
  let next = 0;
  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const index = next++;
        await worker(items[index], index);
      }
    }
  );
  await Promise.all(runners);
}

// ---------------------------------------------------------------------------
// Report / aggregation
// ---------------------------------------------------------------------------

interface ReportEntry {
  id: string;
  title: string;
  category: ClassifyCategory;
  old: {
    skorSotoy: number | null;
    totalVotes: number | null;
    criticsSkorSotoy: number | null;
    scoreScale: number | null;
  };
  new: ClassifyChanges | null;
  tmdb: { voteAverage: number; voteCount: number } | 'unavailable' | null;
  ratingsCount: number;
  flags: string[];
  reason?: string;
}

interface RunSummary {
  mode: 'dry-run' | 'apply' | 'restore-dry-run' | 'restore-apply';
  includeHighVotes: boolean;
  noTmdb: boolean;
  allowOrphanRatings: boolean;
  filmsScanned: number;
  ratingsDocsRead: number;
  filmsWithRatings: number;
  hasRatingsVoteMismatch: number;
  votesSeedFixed: number;
  highVotesReportOnly: number;
  highVotesFixed: number;
  tmdbDerived: number;
  tmdbDerivedCriticsDiffers: number;
  fabricatedUnratedSeed: number;
  fabricatedMapperFallback: number;
  mismatch: number;
  noTmdbData: number;
  noTmdbSkippedByFlag: number;
  manual: number;
  manualOldAdminDefault: number;
  filmsWithNoChanges: number;
  tmdbRequests: number;
  orphanRatingDocs: number;
  orphanFilmIds: number;
  orphanFilmIdSamples: string[];
  updated: number;
  skippedChangedDuringRun: number;
  errors: number;
}

interface RestoreBackupEntry {
  docId: string;
  old: Partial<Record<WhitelistedField, number | null>>;
  new?: ClassifyChanges;
}

interface RestoreBackupFile {
  generatedAt?: string;
  mode?: string;
  note?: string;
  entries?: RestoreBackupEntry[];
}

// ---------------------------------------------------------------------------
// Flag parsing (strict)
// ---------------------------------------------------------------------------

export interface CliOptions {
  apply: boolean;
  includeHighVotes: boolean;
  noTmdb: boolean;
  allowOrphanRatings: boolean;
  restorePath: string | null;
}

const KNOWN_FLAGS = new Set([
  '--apply',
  '--include-high-votes',
  '--no-tmdb',
  '--allow-orphan-ratings',
  '--restore',
]);

export function parseFlags(argv: string[]): CliOptions {
  const opts: CliOptions = {
    apply: false,
    includeHighVotes: false,
    noTmdb: false,
    allowOrphanRatings: false,
    restorePath: null,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const isInlineRestore = arg.startsWith('--restore=');
    const name = isInlineRestore ? '--restore' : arg;

    if (!KNOWN_FLAGS.has(name)) {
      throw new Error(
        `Unknown flag: ${arg}. Allowed flags: --apply, --include-high-votes, --no-tmdb, --allow-orphan-ratings, --restore <backup.json>`
      );
    }

    if (name === '--apply') {
      opts.apply = true;
    } else if (name === '--include-high-votes') {
      opts.includeHighVotes = true;
    } else if (name === '--no-tmdb') {
      opts.noTmdb = true;
    } else if (name === '--allow-orphan-ratings') {
      opts.allowOrphanRatings = true;
    } else {
      const value = isInlineRestore ? arg.slice('--restore='.length).trim() : (argv[++i] ?? '').trim();
      if (!value || value.startsWith('--')) {
        throw new Error('--restore requires a backup file path (e.g. data/film-scores-backup-<ts>.json).');
      }
      opts.restorePath = resolve(process.cwd(), value);
    }
  }

  if (opts.restorePath && (opts.includeHighVotes || opts.noTmdb)) {
    throw new Error('--restore cannot be combined with --include-high-votes or --no-tmdb.');
  }

  return opts;
}

// ---------------------------------------------------------------------------
// Restore mode
// ---------------------------------------------------------------------------

/**
 * Marker used by the pure {@link buildRestorePayload} for "this field did not
 * exist before the migration". The restore runner converts it to
 * FieldValue.delete(); unit tests assert against the marker itself.
 */
export const RESTORE_DELETE = Symbol('restore-delete');

export type RestorePayloadValue = number | typeof RESTORE_DELETE;

/**
 * Pure builder for the per-doc restore payload.
 *
 * Only the fields listed in `newKeys` (the keys of the backup entry's `new`
 * object, i.e. the fields the migration actually changed) are ever written.
 * When `newKeys` is null (old backups without a `new` object), every
 * whitelisted field is considered instead. A field that is allowed but absent
 * (or null) in the old values becomes {@link RESTORE_DELETE}, because it did
 * not exist on the doc before the migration.
 */
export function buildRestorePayload(
  oldValues: Partial<Record<WhitelistedField, number | null>>,
  newKeys: readonly string[] | null
): Partial<Record<WhitelistedField, RestorePayloadValue>> {
  const allowedFields: readonly WhitelistedField[] =
    newKeys === null
      ? WHITELISTED_FIELDS
      : WHITELISTED_FIELDS.filter((field) => newKeys.includes(field));

  const payload: Partial<Record<WhitelistedField, RestorePayloadValue>> = {};
  for (const field of allowedFields) {
    const value = oldValues[field];
    if (value === undefined || value === null) {
      payload[field] = RESTORE_DELETE;
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      payload[field] = value;
    }
  }
  return payload;
}

/** Converts marker values into real Firestore delete sentinels. */
function toFirestorePayload(
  payload: Partial<Record<WhitelistedField, RestorePayloadValue>>
): UpdateData<DocumentData> {
  const result: UpdateData<DocumentData> = {};
  for (const [field, value] of Object.entries(payload)) {
    result[field] = value === RESTORE_DELETE ? FieldValue.delete() : value;
  }
  return result;
}

async function runRestore(backupPath: string, isApply: boolean): Promise<void> {
  console.log(`Restore source: ${backupPath}\n`);

  let rawText: string;
  try {
    rawText = await readFile(backupPath, 'utf8');
  } catch (err: any) {
    console.error('[Fatal] Could not read backup file:', err?.message || String(err));
    process.exit(1);
  }

  let backup: RestoreBackupFile;
  try {
    backup = JSON.parse(rawText) as RestoreBackupFile;
  } catch (err: any) {
    console.error('[Fatal] Backup file is not valid JSON:', err?.message || String(err));
    process.exit(1);
  }

  const entries = Array.isArray(backup?.entries) ? backup.entries : [];
  const valid: Array<{
    docId: string;
    old: Partial<Record<WhitelistedField, number | null>>;
    newKeys: readonly string[] | null;
  }> = [];
  let skipped = 0;
  let legacyEntries = 0;

  for (const entry of entries) {
    const docId = typeof entry?.docId === 'string' ? entry.docId.trim() : '';
    const old = entry?.old;
    if (!docId || !old || typeof old !== 'object' || Array.isArray(old)) {
      skipped++;
      continue;
    }
    // Restore scope: only the fields this entry actually changed. Old backups
    // without a `new` object fall back to every whitelisted field.
    const newObj = entry?.new;
    const newKeys: readonly string[] | null =
      newObj && typeof newObj === 'object' && !Array.isArray(newObj)
        ? Object.keys(newObj)
        : null;
    if (newKeys === null) legacyEntries++;
    valid.push({ docId, old, newKeys });
  }

  console.log('=====================================================');
  console.log(`RESTORE ${isApply ? '(APPLY MODE)' : '(DRY-RUN MODE)'}`);
  console.log('=====================================================');
  console.log(`Backup generated at:               ${backup?.generatedAt ?? '(unknown)'}`);
  console.log(`Backup entries:                    ${entries.length}`);
  console.log(`Valid restore entries:             ${valid.length}`);
  console.log(`Legacy entries (no "new" object):  ${legacyEntries}`);
  console.log(`Skipped (invalid) entries:         ${skipped}`);

  if (valid.length > 0) {
    console.table(
      valid.slice(0, SAMPLE_LIMIT).map((entry) => ({
        'Doc ID': entry.docId,
        skorSotoy: entry.old.skorSotoy ?? '(absent)',
        criticsSkorSotoy: entry.old.criticsSkorSotoy ?? '(absent)',
        totalVotes: entry.old.totalVotes ?? '(absent)',
        scoreScale: entry.old.scoreScale ?? '(absent)',
      }))
    );
    if (valid.length > SAMPLE_LIMIT) {
      console.log(`... and ${valid.length - SAMPLE_LIMIT} more (full list in the backup file).`);
    }
  }

  if (!isApply || valid.length === 0) {
    console.log(
      isApply
        ? '\nNothing to restore.'
        : '\nDry-run complete. Re-run with --apply to write these old values back.'
    );
    console.log('=====================================================\n');
    return;
  }

  if (!getApps().length) {
    initializeApp({
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket || undefined,
    });
  }
  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  const db = getFirestore(getApp(), databaseId);
  console.log(`Target Firestore database: ${databaseId}\n`);

  let updated = 0;
  let errors = 0;
  await runPool(valid, WRITE_CONCURRENCY, async (entry) => {
    try {
      // No lastUpdateTime precondition: restore is an explicit rollback.
      // Only the fields the migration actually changed are restored.
      await db
        .collection('films')
        .doc(entry.docId)
        .update(toFirestorePayload(buildRestorePayload(entry.old, entry.newKeys)));
      updated++;
    } catch (err: any) {
      errors++;
      console.error(`[Restore Error] ${entry.docId}: ${err?.message || String(err)}`);
    }
  });

  console.log('\n=====================================================');
  console.log('RESTORE SUMMARY');
  console.log('=====================================================');
  console.log(`Documents updated:                 ${updated}`);
  console.log(`Errors:                            ${errors}`);
  console.log('=====================================================\n');

  if (errors > 0) process.exitCode = 1;
}

// ---------------------------------------------------------------------------
// Main mode
// ---------------------------------------------------------------------------

interface FilmRow {
  id: string;
  title: string;
  film: MigratableFilm;
  updateTime: Timestamp | undefined;
}

const CATEGORY_LABELS: Record<ClassifyCategory, string> = {
  'has-ratings': 'D has-ratings (report only, never written)',
  'votes-seed': 'A votes-seed (totalVotes 1 -> 0)',
  'high-votes': 'A2 high-votes (report only unless --include-high-votes)',
  'tmdb-derived': 'B1 tmdb-derived (scoreScale 10 stamped)',
  fabricated: 'B2/B3 fabricated (score -> 0, scoreScale 10)',
  mismatch: 'B4 mismatch (report only)',
  'no-tmdb-data': 'no-tmdb-data (report only)',
  manual: 'C manual, no tmdbId (scores never changed)',
  ok: 'ok (nothing to do)',
};

const CATEGORY_ORDER: ClassifyCategory[] = [
  'has-ratings',
  'votes-seed',
  'high-votes',
  'tmdb-derived',
  'fabricated',
  'mismatch',
  'no-tmdb-data',
  'manual',
  'ok',
];

function buildReportEntry(row: FilmRow, result: ClassifyResult): ReportEntry {
  const stored = result.report.stored;
  return {
    id: row.id,
    title: row.title || '(untitled)',
    category: result.category,
    old: {
      skorSotoy: stored.skorSotoy,
      totalVotes: stored.totalVotes,
      criticsSkorSotoy: stored.criticsSkorSotoy,
      scoreScale: stored.scoreScale,
    },
    new: result.changes ? { ...result.changes } : null,
    tmdb: result.report.tmdb,
    ratingsCount: result.report.ratingsCount,
    flags: [...result.flags],
    reason: result.report.reason,
  };
}

async function runMigration(opts: CliOptions): Promise<void> {
  const { apply: isApply, includeHighVotes, noTmdb } = opts;

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) {
    console.error('[Fatal] GOOGLE_APPLICATION_CREDENTIALS is not set.');
    console.error('Point it at a valid Firebase service account JSON key file.');
    process.exit(1);
  }

  const apiKey = process.env.TMDB_API_KEY?.trim() || '';
  if (!noTmdb && !apiKey) {
    console.error('[Fatal] TMDB_API_KEY is not set.');
    console.error('Add TMDB_API_KEY to .env (v3 key or v4 read access token), or pass --no-tmdb to skip all rule B fixes.');
    process.exit(1);
  }

  if (!getApps().length) {
    initializeApp({
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket || undefined,
    });
  }
  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  console.log(`Target Firestore database: ${databaseId}\n`);
  const db = getFirestore(getApp(), databaseId);

  // -------------------------------------------------------------------------
  // ONE read of films, ONE read of ratings.
  // -------------------------------------------------------------------------
  console.log('Loading documents from "films" collection...');
  const filmsSnap = await db.collection('films').get();
  if (filmsSnap.size === 0) {
    console.error('[ABORT GUARD ERROR] 0 documents found in "films" collection. Aborting; no writes were performed.');
    process.exit(1);
  }

  console.log('Loading documents from "ratings" collection (single read)...');
  const ratingsSnap = await db.collection('ratings').get();
  const ratingsCounts = new Map<string, number>();
  let blankFilmIdRatingDocs = 0;
  ratingsSnap.forEach((docSnap) => {
    const filmId = typeof docSnap.data()?.filmId === 'string' ? (docSnap.data().filmId as string).trim() : '';
    if (!filmId) {
      blankFilmIdRatingDocs++;
      return;
    }
    ratingsCounts.set(filmId, (ratingsCounts.get(filmId) || 0) + 1);
  });

  console.log(
    `Found ${filmsSnap.size} film documents and ${ratingsSnap.size} rating documents (${ratingsCounts.size} films with ratings).\n`
  );

  const rows: FilmRow[] = filmsSnap.docs.map((docSnap) => {
    const data = docSnap.data() as Record<string, unknown>;
    return {
      id: docSnap.id,
      title: typeof data.title === 'string' ? data.title : '',
      film: {
        tmdbId: data.tmdbId,
        type: data.type,
        duration: data.duration,
        skorSotoy: data.skorSotoy,
        criticsSkorSotoy: data.criticsSkorSotoy,
        totalVotes: data.totalVotes,
        scoreScale: data.scoreScale,
      },
      updateTime: docSnap.updateTime,
    };
  });

  // -------------------------------------------------------------------------
  // Orphan ratings check: rating docs whose filmId matches no films doc.
  // -------------------------------------------------------------------------
  const filmIdSet = new Set(rows.map((row) => row.id));
  const orphanFilmIdSamples: string[] = [];
  let orphanRatingDocs = blankFilmIdRatingDocs;
  let orphanFilmIds = blankFilmIdRatingDocs > 0 ? 1 : 0;
  if (blankFilmIdRatingDocs > 0) orphanFilmIdSamples.push('(missing filmId)');
  for (const [filmId, count] of ratingsCounts) {
    if (!filmIdSet.has(filmId)) {
      orphanRatingDocs += count;
      orphanFilmIds++;
      if (orphanFilmIdSamples.length < SAMPLE_LIMIT) orphanFilmIdSamples.push(filmId);
    }
  }
  console.log(
    `Orphan ratings (filmId not in "films"): ${orphanRatingDocs} docs across ${orphanFilmIds} filmIds.` +
      (orphanFilmIdSamples.length > 0 ? ` Samples: ${orphanFilmIdSamples.join(', ')}` : '')
  );

  if (orphanRatingDocs > 0 && isApply && !opts.allowOrphanRatings) {
    console.error('=====================================================');
    console.error('[ABORT] Orphan rating docs found. Some rating docs reference');
    console.error('filmIds that match no document in "films"; their ratings are not');
    console.error('counted by this script, so apply-mode results could be misleading.');
    console.error(
      `Found ${orphanRatingDocs} orphan rating docs across ${orphanFilmIds} filmIds.`
    );
    console.error('Dry-run mode still reports them; re-run with --allow-orphan-ratings');
    console.error('to proceed with --apply anyway. Nothing was written.');
    console.error('=====================================================');
    process.exit(1);
  }
  if (orphanRatingDocs > 0 && isApply) {
    console.log('--allow-orphan-ratings passed: continuing with --apply despite orphan ratings.\n');
  }

  // -------------------------------------------------------------------------
  // TMDB lookups for rule B candidates only.
  // -------------------------------------------------------------------------
  const candidates = rows.filter(
    (row) =>
      (ratingsCounts.get(row.id) || 0) === 0 &&
      hasTmdbId(row.film) &&
      isLegacyUnscaled(row.film)
  );

  const tmdbByRowId = new Map<string, TmdbInfo>();
  let tmdbRequests = 0;
  let noTmdbSkippedByFlag = 0;

  if (noTmdb) {
    noTmdbSkippedByFlag = candidates.length;
    console.log(`--no-tmdb: skipping ${candidates.length} rule B candidate TMDB lookups.\n`);
  } else {
    // Reuse the codebase helper (tmdbSync.tmdbMediaType) exactly like the sync
    // paths do: series -> tv, animation with "episode" duration -> tv, else movie.
    const mediaTypeFor = (row: FilmRow): TmdbMediaType =>
      tmdbMediaType({
        type: row.film.type as FilmItem['type'],
        duration: typeof row.film.duration === 'string' ? row.film.duration : undefined,
      });

    const cache = new Map<string, TmdbInfo>();
    console.log(`Fetching TMDB data for ${candidates.length} rule B candidates (concurrency ${TMDB_CONCURRENCY})...`);
    await runPool(candidates, TMDB_CONCURRENCY, async (row) => {
      const numericId = Number(row.film.tmdbId);
      const mediaType = mediaTypeFor(row);
      const cacheKey = `${mediaType}:${numericId}`;
      let info = cache.get(cacheKey);
      if (info === undefined) {
        info = await fetchTmdbTitle(apiKey, mediaType, numericId);
        tmdbRequests++;
        cache.set(cacheKey, info);
      }
      tmdbByRowId.set(row.id, info);
    });
    const unavailable = candidates.filter((row) => tmdbByRowId.get(row.id) === 'unavailable').length;
    console.log(`TMDB done: ${tmdbRequests} requests, ${unavailable} unavailable.\n`);
  }

  // -------------------------------------------------------------------------
  // Classify every film.
  // -------------------------------------------------------------------------
  const entries: ReportEntry[] = [];
  const summary: RunSummary = {
    mode: isApply ? 'apply' : 'dry-run',
    includeHighVotes,
    noTmdb,
    allowOrphanRatings: opts.allowOrphanRatings,
    filmsScanned: filmsSnap.size,
    ratingsDocsRead: ratingsSnap.size,
    filmsWithRatings: 0,
    hasRatingsVoteMismatch: 0,
    votesSeedFixed: 0,
    highVotesReportOnly: 0,
    highVotesFixed: 0,
    tmdbDerived: 0,
    tmdbDerivedCriticsDiffers: 0,
    fabricatedUnratedSeed: 0,
    fabricatedMapperFallback: 0,
    mismatch: 0,
    noTmdbData: 0,
    noTmdbSkippedByFlag,
    manual: 0,
    manualOldAdminDefault: 0,
    filmsWithNoChanges: 0,
    tmdbRequests,
    orphanRatingDocs,
    orphanFilmIds,
    orphanFilmIdSamples,
    updated: 0,
    skippedChangedDuringRun: 0,
    errors: 0,
  };

  const toWrite: Array<ReportEntry & { updateTime: Timestamp | undefined }> = [];

  for (const row of rows) {
    const ratingsCount = ratingsCounts.get(row.id) || 0;
    const result = classifyFilm(row.film, ratingsCount, tmdbByRowId.get(row.id) ?? null, {
      includeHighVotes,
    });
    const entry = buildReportEntry(row, result);
    entries.push(entry);

    switch (result.category) {
      case 'has-ratings':
        summary.filmsWithRatings++;
        if (result.flags.includes('totalVotes-does-not-match-ratings')) {
          summary.hasRatingsVoteMismatch++;
        }
        break;
      case 'votes-seed':
      case 'high-votes':
        // Counted via the rule A / A2 bookkeeping below.
        break;
      case 'tmdb-derived':
        summary.tmdbDerived++;
        if (result.flags.includes('critics-differs-may-change-display')) {
          summary.tmdbDerivedCriticsDiffers++;
        }
        break;
      case 'fabricated':
        if (result.report.reason?.includes('unrated seed')) summary.fabricatedUnratedSeed++;
        else summary.fabricatedMapperFallback++;
        break;
      case 'mismatch':
        summary.mismatch++;
        break;
      case 'no-tmdb-data':
        summary.noTmdbData++;
        break;
      case 'manual':
        summary.manual++;
        if (result.flags.includes('likely-old-admin-default-4')) summary.manualOldAdminDefault++;
        break;
      case 'ok':
        summary.filmsWithNoChanges++;
        break;
    }

    // Rule A / A2 bookkeeping, independent of the score bucket.
    const storedVotes = entry.old.totalVotes;
    if (result.changes?.totalVotes === 0) {
      if (storedVotes === 1) summary.votesSeedFixed++;
      else if (storedVotes !== null && storedVotes > 1) summary.highVotesFixed++;
    }
    if (result.flags.includes('high-votes-report-only')) summary.highVotesReportOnly++;

    if (result.changes) {
      // Whitelist guard: never propose a field outside the whitelist.
      for (const key of Object.keys(result.changes)) {
        if (!WHITELISTED_FIELDS.includes(key as WhitelistedField)) {
          throw new Error(`[Bug guard] Non-whitelisted change key "${key}" for film ${row.id}.`);
        }
      }
      toWrite.push({ ...entry, updateTime: row.updateTime });
    }
  }

  // -------------------------------------------------------------------------
  // Report (always written, both modes).
  // -------------------------------------------------------------------------
  const categories = Object.fromEntries(
    CATEGORY_ORDER.map((category) => [category, entries.filter((entry) => entry.category === category)])
  ) as Record<ClassifyCategory, ReportEntry[]>;

  console.log('=====================================================');
  console.log('COUNTS PER CATEGORY');
  console.log('=====================================================');
  for (const category of CATEGORY_ORDER) {
    console.log(`${CATEGORY_LABELS[category].padEnd(58)} ${categories[category].length}`);
  }
  console.log(`\nOrphan rating docs (filmId not in "films"): ${summary.orphanRatingDocs} across ${summary.orphanFilmIds} filmIds`);
  if (summary.orphanFilmIdSamples.length > 0) {
    console.log(`Orphan filmId samples: ${summary.orphanFilmIdSamples.join(', ')}`);
  }
  console.log(`TMDB-derived films whose legacy critics score differs: ${summary.tmdbDerivedCriticsDiffers}`);

  console.log('\n=====================================================');
  console.log('SAMPLES (up to 20 per category)');
  console.log('=====================================================');
  for (const category of CATEGORY_ORDER) {
    const samples = categories[category];
    if (samples.length === 0) continue;
    console.log(`\n--- ${CATEGORY_LABELS[category]} (${samples.length}) ---`);
    console.table(
      samples.slice(0, SAMPLE_LIMIT).map((entry) => ({
        ID: entry.id,
        Title: entry.title,
        Old: `skor=${entry.old.skorSotoy ?? '-'} votes=${entry.old.totalVotes ?? '-'} critics=${entry.old.criticsSkorSotoy ?? '-'} scale=${entry.old.scoreScale ?? '-'}`,
        New: entry.new ? JSON.stringify(entry.new) : '(report only)',
        TMDB: entry.tmdb === 'unavailable' ? 'unavailable' : entry.tmdb ? `avg=${entry.tmdb.voteAverage} count=${entry.tmdb.voteCount}` : '-',
        'Ratings': entry.ratingsCount,
        Flags: entry.flags.join(', ') || '-',
      }))
    );
    if (samples.length > SAMPLE_LIMIT) {
      console.log(`... and ${samples.length - SAMPLE_LIMIT} more (full list in the report file).`);
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: summary.mode,
    flags: { includeHighVotes, noTmdb, allowOrphanRatings: opts.allowOrphanRatings },
    summary,
    categories,
  };

  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`\nReport written to: ${REPORT_PATH}`);

  // -------------------------------------------------------------------------
  // Apply: backup first, then per-doc writes with lastUpdateTime precondition.
  // -------------------------------------------------------------------------
  if (!isApply) {
    console.log('\nDry-run complete. Nothing was written to Firestore.');
    console.log('Re-run with --apply to write these changes.');
    console.log('=====================================================\n');
    return;
  }

  if (toWrite.length === 0) {
    console.log('\nNothing to write; every fixable category is already migrated.');
    console.log('=====================================================\n');
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = resolve(process.cwd(), 'data', `film-scores-backup-${stamp}.json`);
  const backup: RestoreBackupFile = {
    generatedAt: new Date().toISOString(),
    mode: 'apply',
    note: 'Old values of every doc this run will change. Restore with: --restore <this file> --apply',
    entries: toWrite.map((entry) => ({
      docId: entry.id,
      old: {
        skorSotoy: entry.old.skorSotoy,
        totalVotes: entry.old.totalVotes,
        criticsSkorSotoy: entry.old.criticsSkorSotoy,
        scoreScale: entry.old.scoreScale,
      },
      new: entry.new ?? undefined,
    })),
  };
  await mkdir(dirname(backupPath), { recursive: true });
  await writeFile(backupPath, `${JSON.stringify(backup, null, 2)}\n`, 'utf8');
  console.log(`\nBackup written to: ${backupPath}`);
  console.log(`Writing ${toWrite.length} documents (concurrency ${WRITE_CONCURRENCY}) with lastUpdateTime precondition...`);

  await runPool(toWrite, WRITE_CONCURRENCY, async (entry) => {
    const changes = entry.new as ClassifyChanges;
    try {
      if (!entry.updateTime) {
        throw new Error('snapshot has no updateTime; refusing an unguarded write');
      }
      // Per-doc update with an optimistic-lock precondition so a doc changed
      // meanwhile (new review, cron, admin edit) fails instead of overwriting.
      await db.collection('films').doc(entry.id).update(changes, {
        lastUpdateTime: entry.updateTime,
      });
      summary.updated++;
    } catch (err: any) {
      const code = String(err?.code ?? '');
      if (code === '9' || code.includes('failed-precondition')) {
        summary.skippedChangedDuringRun++;
      } else {
        summary.errors++;
        console.error(`[Write Error] ${entry.id}: ${err?.message || String(err)}`);
      }
    }
  });

  console.log('\n=====================================================');
  console.log('APPLY SUMMARY');
  console.log('=====================================================');
  console.log(`Documents updated:                 ${summary.updated}`);
  console.log(`Skipped (changed during run):      ${summary.skippedChangedDuringRun}`);
  console.log(`Errors:                            ${summary.errors}`);
  console.log('=====================================================\n');

  // Persist the final counts into the report file.
  const finalReport = { ...report, summary };
  await writeFile(REPORT_PATH, `${JSON.stringify(finalReport, null, 2)}\n`, 'utf8');

  if (summary.errors > 0) process.exitCode = 1;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const opts = parseFlags(process.argv.slice(2));

  console.log('=====================================================');
  console.log(
    `Starting Film Score Migration ${
      opts.restorePath
        ? opts.apply
          ? '(RESTORE - APPLY MODE)'
          : '(RESTORE - DRY-RUN MODE)'
        : opts.apply
          ? '(APPLY MODE)'
          : '(DRY-RUN MODE)'
    }`
  );
  console.log('=====================================================\n');

  if (opts.restorePath) {
    await runRestore(opts.restorePath, opts.apply);
    return;
  }

  await runMigration(opts);
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (invokedDirectly) {
  main()
    .then(() => {
      process.exit(process.exitCode ?? 0);
    })
    .catch((err) => {
      console.error('Unhandled failure:', err);
      process.exit(1);
    });
}
