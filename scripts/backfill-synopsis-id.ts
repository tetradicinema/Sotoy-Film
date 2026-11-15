/**
 * Backfill Indonesian Synopses Script (one-off)
 *
 * Replaces UNEDITED English TMDB synopses with TMDB's official Indonesian
 * overview on documents in the `films` collection. Imported films were built
 * from `?language=en-US` details only (scripts/import-tmdb-daily.ts, api/tmdb.ts),
 * so their synopsis is the English overview — the same text thousands of other
 * sites publish, which contributes to "Crawled - currently not indexed".
 *
 * Detection (pure function classifySynopsis, exported for tests):
 * - Candidates are films with a valid tmdbId. For each candidate BOTH
 *   /movie|tv/{id}?language=en-US and ?language=id-ID are fetched with the
 *   SAME media type, resolved once through the primary/alternate flow
 *   (tmdbMediaType + decideTmdbFallback; an animation retries once with the
 *   other type). A result is only usable when titlesMatch passes against the
 *   en-US detail; anything else is 'unavailable' ("no-tmdb-data").
 * - The synopsis is replaced ONLY when ALL are true:
 *     1. the stored synopsis (trimmed, whitespace-normalised) EQUALS the
 *        en-US overview (trimmed, whitespace-normalised) — an edited synopsis
 *        is never touched;
 *     2. the id-ID overview is non-empty after trim, at least 40 characters,
 *        and differs from the en-US overview (TMDB returns the English text
 *        when no id-ID translation exists).
 * - Films whose synopsis is EMPTY get a separate "empty-fillable" bucket:
 *   REPORT ONLY, unless --fill-empty is passed (then the id-ID overview is
 *   written).
 * - Buckets: replace | already-indonesian-or-edited | no-id-overview |
 *   no-tmdb-data | no-tmdb-id | empty-fillable | skip (synopsis already
 *   equals the id-ID overview — already backfilled).
 * - Only the `synopsis` field is ever written (whitelist).
 * - Idempotent: after applying, the synopsis differs from the en-US overview,
 *   so re-classifying yields no changes ("skip").
 *
 * Modes:
 * - Default is a dry-run: counts + up to 20 samples per bucket are printed and
 *   the full report is written to data/synopsis-id-report.json. Nothing is
 *   written to Firestore.
 * - --apply first writes data/synopsis-id-backup-<timestamp>.json
 *   ({docId, old:{synopsis}, new:{synopsis}}, full old text, null when the
 *   field was absent), then updates each document individually with a
 *   lastUpdateTime precondition taken from the snapshot read, so a document
 *   changed meanwhile fails with FAILED_PRECONDITION and is counted as
 *   "skipped (changed during run)" instead of being overwritten.
 * - --fill-empty also writes the synopsis for films whose stored synopsis is
 *   empty and whose id-ID overview is usable.
 * - --restore <backup.json> restores the old synopsis (null = delete the
 *   field) for the document ids in the backup. Dry-run by default; pass
 *   --apply to write.
 * - --limit <n> processes at most n TMDB candidates (for a trial run).
 *
 * Requirements:
 * - GOOGLE_APPLICATION_CREDENTIALS must point to a valid service account JSON.
 * - TMDB_API_KEY must be set (v3 key or v4 read token).
 *
 * Usage:
 *   npx tsx scripts/backfill-synopsis-id.ts [--apply] [--fill-empty]
 *       [--limit <n>]
 *   npx tsx scripts/backfill-synopsis-id.ts --restore data/synopsis-id-backup-<ts>.json [--apply]
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
// Pure classification (exported for scripts/test-backfill-synopsis-id.ts)
// ---------------------------------------------------------------------------

/** The ONLY field this migration may ever write. */
export const SYNOPSIS_FIELDS = ['synopsis'] as const;
export type SynopsisField = (typeof SYNOPSIS_FIELDS)[number];
export type SynopsisChanges = { synopsis?: string };

/**
 * TMDB detail for one language (title/originalTitle are only meaningful in
 * en-US; the id-ID detail is used for its overview).
 */
export interface TmdbSynopsisData {
  title: string;
  originalTitle: string;
  overview: string;
}

/**
 * TMDB input for classifySynopsis: real detail data, 'unavailable' (fetch
 * error, 404 or title mismatch), or null when TMDB was not fetched.
 */
export type TmdbSynopsisInput = TmdbSynopsisData | 'unavailable' | null;

export interface SynopsisOptions {
  /** --fill-empty: also fill films whose stored synopsis is empty. */
  fillEmpty: boolean;
}

export type SynopsisCategory =
  | 'replace'
  | 'already-indonesian-or-edited'
  | 'no-id-overview'
  | 'no-tmdb-data'
  | 'no-tmdb-id'
  | 'empty-fillable'
  | 'skip';

export interface ClassifySynopsisResult {
  category: SynopsisCategory;
  changes: SynopsisChanges;
}

/** Minimum length for a usable id-ID overview. */
export const MIN_ID_OVERVIEW_LENGTH = 40;

/** Trims and collapses all whitespace runs, so cosmetic differences never matter. */
export function normalizeWhitespace(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

const isValidTmdbId = (value: unknown): boolean => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0;
};

const isUsableIdOverview = (idOverview: string, enOverview: string): boolean =>
  idOverview.length >= MIN_ID_OVERVIEW_LENGTH && idOverview !== enOverview;

/**
 * Decides what (if anything) may be written for one film.
 *
 * `tmdbEn` and `tmdbIdId` are the SAME TMDB detail fetched with en-US and
 * id-ID respectively, or 'unavailable' when the lookup failed, or null when
 * TMDB was not fetched at all.
 */
export function classifySynopsis(
  film: { tmdbId?: unknown; synopsis?: unknown } | null,
  tmdbEn: TmdbSynopsisInput,
  tmdbIdId: TmdbSynopsisInput,
  options: SynopsisOptions
): ClassifySynopsisResult {
  if (!film || !isValidTmdbId(film.tmdbId)) {
    return { category: 'no-tmdb-id', changes: {} };
  }
  if (!tmdbEn || tmdbEn === 'unavailable' || !tmdbIdId || tmdbIdId === 'unavailable') {
    return { category: 'no-tmdb-data', changes: {} };
  }

  const stored = normalizeWhitespace(film.synopsis);
  const en = normalizeWhitespace(tmdbEn.overview);
  const idOverview = normalizeWhitespace(
    typeof tmdbIdId.overview === 'string' ? tmdbIdId.overview : ''
  );

  // Empty synopsis: the id-ID overview can FILL it (report only by default).
  if (stored.length === 0) {
    if (!isUsableIdOverview(idOverview, en)) {
      return { category: 'no-id-overview', changes: {} };
    }
    return {
      category: 'empty-fillable',
      changes: options.fillEmpty ? { synopsis: idOverview.trim() } : {},
    };
  }

  // Already backfilled (or a lucky coincidence): the synopsis IS the id-ID
  // text — which by definition differs from the en-US overview.
  if (stored !== en && stored === idOverview && idOverview.length > 0) {
    return { category: 'skip', changes: {} };
  }

  // An edited (or already-Indonesian) synopsis is NEVER touched.
  if (stored !== en) {
    return { category: 'already-indonesian-or-edited', changes: {} };
  }

  // Unedited English synopsis: replace when the id-ID overview is real text.
  if (!isUsableIdOverview(idOverview, en)) {
    return { category: 'no-id-overview', changes: {} };
  }
  return { category: 'replace', changes: { synopsis: idOverview.trim() } };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

export interface CliOptions {
  apply: boolean;
  fillEmpty: boolean;
  limit?: number;
  restorePath?: string;
}

/**
 * Parses and validates CLI flags. Unknown flags and missing values are
 * rejected; --limit must be a positive integer.
 */
export function parseCliOptions(argv: string[]): CliOptions {
  const options: CliOptions = { apply: false, fillEmpty: false };
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
    } else if (arg === '--fill-empty') {
      options.fillEmpty = true;
    } else if (arg === '--limit' || arg.startsWith('--limit=')) {
      const raw = takeValue();
      const value = Number(raw);
      if (!Number.isInteger(value) || value <= 0) {
        throw new Error('--limit must be a positive integer');
      }
      options.limit = value;
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

const printUsage = (): void => {
  console.error('Usage:');
  console.error('  npx tsx scripts/backfill-synopsis-id.ts [--apply] [--fill-empty]');
  console.error('      [--limit <positive integer>]');
  console.error('  npx tsx scripts/backfill-synopsis-id.ts --restore <backup.json> [--apply]');
};

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

// ---------------------------------------------------------------------------
// TMDB lookups (small dedicated fetch; tmdbServerFetch is NOT modified)
// ---------------------------------------------------------------------------

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_MAX_ATTEMPTS = 3;
const TMDB_RETRY_BASE_MS = 1000;
const TMDB_CONCURRENCY = 8;
const WRITE_CONCURRENCY = 10;

type TmdbSynopsisOutcome =
  | { kind: 'detail'; detail: TmdbSynopsisData }
  | { kind: 'not_found' }
  | { kind: 'request_error' };

/**
 * One detail lookup (/movie/{id} or /tv/{id}) in one language. Retries
 * 429/5xx with backoff; a 404 and other client errors are terminal.
 */
async function fetchTmdbDetailLang(
  apiKey: string,
  mediaType: 'movie' | 'tv',
  tmdbId: number,
  language: 'en-US' | 'id-ID'
): Promise<TmdbSynopsisOutcome> {
  const isBearer = apiKey.startsWith('ey') || apiKey.length > 50;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (isBearer) headers.Authorization = `Bearer ${apiKey}`;
  const url = new URL(`${TMDB_BASE}/${mediaType}/${tmdbId}`);
  url.searchParams.set('language', language);
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
          overview: typeof data.overview === 'string' ? data.overview : '',
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

export type TmdbSynopsisUnavailableReason = 'title_mismatch' | 'not_found' | 'tmdb_error';

export type TmdbSynopsisLookupResult =
  | { status: 'ok'; en: TmdbSynopsisData; idId: TmdbSynopsisData }
  | { status: 'unavailable'; reason: TmdbSynopsisUnavailableReason };

/**
 * Fetches BOTH languages for one film, replicating the cron's primary/alternate
 * flow: the heuristic media type is tried first, and an animation retries once
 * with the other type. The en-US detail must pass titlesMatch; the winning
 * media type is then used for BOTH languages. Anything else is 'unavailable'.
 */
export async function fetchTmdbSynopsisPair(
  apiKey: string,
  film: FilmItem
): Promise<TmdbSynopsisLookupResult> {
  const numericId = Number(film.tmdbId);
  const evaluate = async (
    mediaType: 'movie' | 'tv'
  ): Promise<
    | { status: 'ok'; en: TmdbSynopsisData; idId: TmdbSynopsisData }
    | { status: 'title_mismatch' | 'error'; errorKind: TmdbSynopsisUnavailableReason }
  > => {
    const enOutcome = await fetchTmdbDetailLang(apiKey, mediaType, numericId, 'en-US');
    if (enOutcome.kind !== 'detail') {
      return {
        status: 'error',
        errorKind: enOutcome.kind === 'not_found' ? 'not_found' : 'tmdb_error',
      };
    }
    const sync = {
      title: enOutcome.detail.title,
      originalTitle: enOutcome.detail.originalTitle,
    } as TmdbSyncData;
    if (!titlesMatch(film, sync)) {
      return { status: 'title_mismatch', errorKind: 'title_mismatch' };
    }
    // Same media type (the one that passed titlesMatch) for the id-ID text.
    const idOutcome = await fetchTmdbDetailLang(apiKey, mediaType, numericId, 'id-ID');
    if (idOutcome.kind !== 'detail') {
      return {
        status: 'error',
        errorKind: idOutcome.kind === 'not_found' ? 'not_found' : 'tmdb_error',
      };
    }
    return { status: 'ok', en: enOutcome.detail, idId: idOutcome.detail };
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

  if (chosen.status === 'ok') {
    return { status: 'ok', en: chosen.en, idId: chosen.idId };
  }

  return {
    status: 'unavailable',
    reason: chosen.status === 'error' ? chosen.errorKind : 'title_mismatch',
  };
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

const REPORT_PATH = resolve(process.cwd(), 'data', 'synopsis-id-report.json');
const SAMPLE_LIMIT = 20;
const BUCKET_ORDER: SynopsisCategory[] = [
  'replace',
  'empty-fillable',
  'already-indonesian-or-edited',
  'no-id-overview',
  'no-tmdb-data',
  'no-tmdb-id',
  'skip',
];

interface BucketEntry {
  id: string;
  title: string;
  category: SynopsisCategory;
  old: string | null;
  new: string | null;
}

interface FilmRecord {
  id: string;
  film: FilmItem;
  updateTime?: Timestamp;
}

interface MigrationReport {
  generatedAt: string;
  mode: 'dry-run' | 'apply';
  options: { apply: boolean; fillEmpty: boolean; limit?: number };
  counts: Record<string, number>;
  /** Doc ids of films skipped because --limit cut the candidate list. */
  limitedOutSamples: string[];
  buckets: Record<SynopsisCategory, BucketEntry[]>;
}

const firstChars = (value: string | null, chars = 80): string => {
  if (value === null) return '(absent)';
  if (value === '') return '(empty)';
  const normalized = normalizeWhitespace(value);
  return normalized.length > chars ? `${normalized.slice(0, chars)}...` : normalized;
};

const bucketTitle = (film: FilmRecord): string => film.film.title || '(untitled)';

const oldSynopsisOf = (film: FilmRecord): string | null =>
  typeof film.film.synopsis === 'string' ? film.film.synopsis : null;

function toEntry(record: FilmRecord, result: ClassifySynopsisResult): BucketEntry {
  const hasNew = typeof result.changes.synopsis === 'string';
  return {
    id: record.id,
    title: bucketTitle(record),
    category: result.category,
    old: oldSynopsisOf(record),
    new: hasNew ? (result.changes.synopsis as string) : null,
  };
}

function printSamples(buckets: Record<SynopsisCategory, BucketEntry[]>): void {
  for (const category of BUCKET_ORDER) {
    const entries = buckets[category] || [];
    if (entries.length === 0) continue;
    console.log(`\n[${category}] (${entries.length})`);
    for (const entry of entries.slice(0, SAMPLE_LIMIT)) {
      console.log(
        `  - ${entry.id} "${entry.title}"\n` +
          `      old: ${firstChars(entry.old)}\n` +
          `      new: ${firstChars(entry.new)}`
      );
    }
    if (entries.length > SAMPLE_LIMIT) {
      console.log(`  ... and ${entries.length - SAMPLE_LIMIT} more (see ${REPORT_PATH})`);
    }
  }
}

// ---------------------------------------------------------------------------
// Restore
// ---------------------------------------------------------------------------

interface BackupEntry {
  docId: string;
  old: { synopsis: string | null };
  new: { synopsis: string | null };
}

interface RestoreWrite {
  docId: string;
  data: Record<string, string | FieldValue>;
  sample: string;
}

async function runRestore(db: Firestore, cli: CliOptions): Promise<void> {
  const backupPath = resolve(process.cwd(), cli.restorePath as string);
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
      ? ((raw as { entries: BackupEntry[] }).entries)
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
    const value = entry.old.synopsis;
    if (value === null || value === undefined) {
      writes.push({ docId: entry.docId.trim(), data: { synopsis: FieldValue.delete() }, sample: '(delete field)' });
    } else if (typeof value === 'string') {
      writes.push({ docId: entry.docId.trim(), data: { synopsis: value }, sample: firstChars(value) });
    } else {
      // Anything else is ignored: only whitelisted string/null values are restored.
      invalid++;
    }
  }

  console.log(`Backup entries: ${entries.length} (invalid/ignored: ${invalid}, restorable: ${writes.length})`);

  if (!cli.apply) {
    for (const write of writes.slice(0, SAMPLE_LIMIT)) {
      console.log(`  - ${write.docId}: ${write.sample}`);
    }
    console.log('\nDry-run complete. Re-run with --apply to write these restores.');
    console.log('=====================================================\n');
    return;
  }

  let restored = 0;
  let skippedChanged = 0;
  const errors: string[] = [];
  await runPool(writes, WRITE_CONCURRENCY, async (write) => {
    try {
      await db.collection('films').doc(write.docId).update(write.data);
      restored++;
    } catch (err: any) {
      if (isFailedPrecondition(err)) skippedChanged++;
      else errors.push(`${write.docId}: ${err?.message || String(err)}`);
    }
  });

  console.log('\n=====================================================');
  console.log('RESTORE SUMMARY');
  console.log('=====================================================');
  console.log(`Restored:                          ${restored}`);
  console.log(`Skipped (changed during run):      ${skippedChanged}`);
  console.log(`Errors:                            ${errors.length}`);
  errors.slice(0, 10).forEach((message) => console.error(`  - ${message}`));
  console.log('=====================================================\n');
}

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------

async function runMigration(db: Firestore, cli: CliOptions): Promise<void> {
  console.log('Loading documents from "films" collection...');
  const filmsSnap = await db.collection('films').get();
  if (filmsSnap.size === 0) {
    console.error('[ABORT GUARD ERROR] 0 documents found in "films" collection. Aborting; no writes were performed.');
    process.exit(1);
  }
  console.log(`Loaded ${filmsSnap.size} film documents.`);

  const records: FilmRecord[] = filmsSnap.docs.map((docSnap) => ({
    id: docSnap.id,
    film: docSnap.data() as FilmItem,
    updateTime: docSnap.updateTime,
  }));

  // TMDB is only fetched for films with a valid tmdbId; --limit caps that list.
  const candidates = records.filter((record) => isValidTmdbId(record.film.tmdbId));
  const limitedOut = cli.limit ? candidates.slice(cli.limit) : [];
  const processed = cli.limit ? candidates.slice(0, cli.limit) : candidates;

  const buckets = Object.fromEntries(
    BUCKET_ORDER.map((category) => [category, [] as BucketEntry[]])
  ) as Record<SynopsisCategory, BucketEntry[]>;

  // Films without a tmdbId are never touched and never hit TMDB.
  for (const record of records) {
    if (!isValidTmdbId(record.film.tmdbId)) {
      buckets['no-tmdb-id'].push(
        toEntry(record, { category: 'no-tmdb-id', changes: {} })
      );
    }
  }

  if (processed.length > 0) {
    console.log(
      `Fetching TMDB details (en-US + id-ID) for ${processed.length} candidate film(s)` +
        ` with concurrency ${TMDB_CONCURRENCY}...`
    );
    const tmdbResults = new Map<
      string,
      { en: TmdbSynopsisInput; idId: TmdbSynopsisInput }
    >();
    await runPool(processed, TMDB_CONCURRENCY, async (record) => {
      const lookup = await fetchTmdbSynopsisPair(process.env.TMDB_API_KEY as string, record.film);
      tmdbResults.set(
        record.id,
        lookup.status === 'ok'
          ? { en: lookup.en, idId: lookup.idId }
          : { en: 'unavailable', idId: 'unavailable' }
      );
    });

    for (const record of processed) {
      const tmdb = tmdbResults.get(record.id) || { en: 'unavailable', idId: 'unavailable' };
      const result = classifySynopsis(
        record.film,
        tmdb.en,
        tmdb.idId,
        { fillEmpty: cli.fillEmpty }
      );
      buckets[result.category].push(toEntry(record, result));
    }
  }

  const counts: Record<string, number> = { scanned: records.length };
  for (const category of BUCKET_ORDER) counts[category] = buckets[category].length;

  console.log('\n=====================================================');
  console.log(`Synopsis Backfill ${cli.apply ? '(APPLY MODE)' : '(DRY-RUN MODE)'}`);
  console.log('=====================================================');
  console.log('SUMMARY COUNTS');
  console.log(`Scanned films:                     ${counts.scanned}`);
  console.log(`Replaced with id-ID text:          ${counts['replace']}`);
  console.log(
    `Empty filled (empty-fillable):     ${counts['empty-fillable']}${cli.fillEmpty ? ' (via --fill-empty)' : ' (report only)'}`);
  console.log(`Already Indonesian or edited (RO): ${counts['already-indonesian-or-edited']}`);
  console.log(`No usable id-ID overview (RO):     ${counts['no-id-overview']}`);
  console.log(`TMDB unavailable/404/mismatch:     ${counts['no-tmdb-data']}`);
  console.log(`No tmdbId (RO):                    ${counts['no-tmdb-id']}`);
  console.log(`Already backfilled (skip):         ${counts['skip']}`);
  if (cli.limit) {
    console.log(`Not processed (--limit reached):   ${limitedOut.length}`);
  }
  printSamples(buckets);

  const writable = [
    ...buckets['replace'],
    ...(cli.fillEmpty ? buckets['empty-fillable'] : []),
  ].filter((entry) => entry.new !== null);

  const report: MigrationReport = {
    generatedAt: new Date().toISOString(),
    mode: cli.apply ? 'apply' : 'dry-run',
    options: { apply: cli.apply, fillEmpty: cli.fillEmpty, ...(cli.limit ? { limit: cli.limit } : {}) },
    counts,
    limitedOutSamples: limitedOut.slice(0, SAMPLE_LIMIT).map((record) => record.id),
    buckets,
  };
  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`\nReport written to: ${REPORT_PATH}`);

  if (!cli.apply) {
    console.log('\nDry-run complete. Re-run with --apply to write these changes.');
    console.log('=====================================================\n');
    return;
  }

  if (writable.length === 0) {
    console.log('\nNothing to write; no document needs changes.');
    console.log('=====================================================\n');
    return;
  }

  // Backup before any write: full old text, null when the field was absent.
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = resolve(process.cwd(), 'data', `synopsis-id-backup-${timestamp}.json`);
  await mkdir(dirname(backupPath), { recursive: true });
  await writeFile(
    backupPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        mode: 'apply',
        entries: writable.map((entry) => ({
          docId: entry.id,
          old: { synopsis: entry.old },
          new: { synopsis: entry.new },
        })),
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
  const updateTimeById = new Map(records.map((record) => [record.id, record.updateTime]));
  await runPool(writable, WRITE_CONCURRENCY, async (entry) => {
    try {
      const ref = db.collection('films').doc(entry.id);
      const updateTime = updateTimeById.get(entry.id);
      const precondition = updateTime ? { lastUpdateTime: updateTime } : undefined;
      if (precondition) await ref.update({ synopsis: entry.new as string }, precondition);
      else await ref.update({ synopsis: entry.new as string });
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

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) {
    console.error('[Fatal] GOOGLE_APPLICATION_CREDENTIALS is not set.');
    console.error('Point it at a valid Firebase service account JSON key file.');
    process.exit(1);
  }
  if (!cli.restorePath && !process.env.TMDB_API_KEY?.trim()) {
    console.error('[Fatal] TMDB_API_KEY is not set.');
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

  if (cli.restorePath) {
    await runRestore(db, cli);
  } else {
    await runMigration(db, cli);
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
