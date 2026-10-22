/**
 * Daily TMDB sync (GitHub Actions / manual).
 *
 * Reuses the same pure logic as the admin "Sinkron TMDB" modal
 * (`evaluateFilmSync`, `decideTmdbFallback`, `tmdbMediaType`) and the shared
 * server fetch helpers in `src/utils/tmdbServerFetch.ts`, but writes through
 * the Firebase Admin SDK so it can run unattended.
 *
 * Only `idReleaseDate`, `releaseDate` (when currently empty), `whereToWatch`
 * and `originCountry` (when missing or different) are ever written, plus the
 * `siteConfig/tmdbSync` status document after a successful `--apply`.
 *
 * Requirements:
 * - GOOGLE_APPLICATION_CREDENTIALS must point to a valid service account JSON key file.
 * - TMDB_API_KEY must be set (v3 API key or v4 read access token).
 *
 * Usage:
 *   Dry-run (default, no writes):
 *     npx tsx scripts/sync-tmdb-cron.ts
 *   Apply:
 *     npx tsx scripts/sync-tmdb-cron.ts --apply
 *   Apply, bypassing the safety guard:
 *     npx tsx scripts/sync-tmdb-cron.ts --apply --force
 *   Test with the first 10 films that have a TMDB ID:
 *     npx tsx scripts/sync-tmdb-cron.ts --limit 10
 */

import path from 'node:path';
import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import type { FilmItem } from '../src/types';
import {
  countSubstantiveSyncChanges,
  decideTmdbFallback,
  evaluateFilmSync,
  evaluateSyncGuard,
  isOriginCountryOnlyUpdate,
  tmdbMediaType,
} from '../src/utils/tmdbSync';
import {
  fetchNowPlayingIdsID,
  fetchTmdbSyncData,
} from '../src/utils/tmdbServerFetch';

const CONCURRENCY = 4;
const BATCH_SIZE = 400;
const REQUEST_DELAY_MS = 150;

export interface SyncCliOptions {
  apply: boolean;
  force: boolean;
  limit?: number;
}

/**
 * Parses the cron CLI flags. Pure and exported so it can be unit tested
 * without touching Firestore or TMDB.
 */
export function parseSyncCliArgs(argv: string[]): SyncCliOptions {
  const options: SyncCliOptions = {
    apply: false,
    force: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--apply') {
      options.apply = true;
      continue;
    }

    if (arg === '--force') {
      options.force = true;
      continue;
    }

    if (arg === '--limit' || arg.startsWith('--limit=')) {
      const rawValue = arg === '--limit' ? argv[++i] : arg.slice('--limit='.length);
      const parsed = Number(rawValue);

      if (!rawValue || !Number.isInteger(parsed) || parsed <= 0) {
        throw new Error('--limit requires a positive integer value.');
      }

      options.limit = parsed;
    }
  }

  return options;
}

const hasTmdbId = (film: FilmItem): boolean => {
  const numericId = Number(film.tmdbId);
  return Boolean(film.tmdbId) && Number.isFinite(numericId) && numericId > 0;
};

const errorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Appends a short Markdown summary to the GitHub Actions step summary when
 * available. Best-effort: a missing or unwritable file never fails the sync.
 */
function appendStepSummary(lines: string[]): void {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;

  try {
    appendFileSync(summaryPath, `${lines.join('\n')}\n`);
  } catch {
    // Ignore summary write failures.
  }
}

interface ChangeRow {
  film: FilmItem;
  updates: Partial<FilmItem>;
  changes: string[];
}

interface MismatchRow {
  title: string;
  tmdbId?: number;
}

async function main(): Promise<void> {
  const options = parseSyncCliArgs(process.argv.slice(2));

  const apiKey = process.env.TMDB_API_KEY?.trim();
  if (!apiKey) {
    console.error('TMDB_API_KEY environment variable is required. Aborting; no writes were performed.');
    process.exit(1);
  }

  console.log('=====================================================');
  console.log(`TMDB Sync ${options.apply ? '(APPLY MODE)' : '(DRY-RUN MODE)'}`);
  if (options.force) console.log('Safety guard: BYPASSED (--force)');
  if (options.limit !== undefined) console.log(`Limit: first ${options.limit} films with a TMDB ID`);
  console.log('=====================================================\n');

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
  const films: FilmItem[] = filmsSnap.docs.map(
    docSnap => ({ id: docSnap.id, ...docSnap.data() } as FilmItem)
  );

  const withoutTmdbId = films.filter(film => !hasTmdbId(film));
  let withTmdbId = films.filter(hasTmdbId);

  if (options.limit !== undefined) {
    withTmdbId = withTmdbId.slice(0, options.limit);
  }

  console.log(`Films loaded: ${films.length}`);
  console.log(`Films without TMDB ID (counted only): ${withoutTmdbId.length}`);
  console.log(`Films to scan: ${withTmdbId.length}\n`);

  if (withTmdbId.length === 0) {
    console.log('Nothing to do: no films with a TMDB ID.');
    console.log('=====================================================\n');
    return;
  }

  // Fetch once. A failure aborts the run before anything is written.
  let nowPlayingIds: number[];
  try {
    console.log('Fetching Indonesian "now playing" IDs from TMDB...');
    nowPlayingIds = await fetchNowPlayingIdsID(apiKey);
    console.log(`Now playing IDs: ${nowPlayingIds.length}\n`);
  } catch (error) {
    console.error('=====================================================');
    console.error('[ABORT] Failed to fetch now_playing_ids.');
    console.error(errorMessage(error, 'Gagal mengambil data now playing dari TMDB.'));
    console.error('Aborting; no writes were performed.');
    console.error('=====================================================\n');
    process.exit(1);
  }

  const now = new Date();
  const queue = [...withTmdbId];
  const rows: ChangeRow[] = [];
  const titleMismatches: MismatchRow[] = [];
  const errors: string[] = [];
  let scanned = 0;

  const worker = async (): Promise<void> => {
    while (queue.length > 0) {
      const film = queue.shift();
      if (!film) break;

      try {
        const primaryType = tmdbMediaType(film);
        let primaryEvaluation: ReturnType<typeof evaluateFilmSync> | undefined;
        let primaryError: unknown;

        try {
          primaryEvaluation = evaluateFilmSync({
            film,
            sync: await fetchTmdbSyncData(primaryType, Number(film.tmdbId), apiKey),
            nowPlayingIds,
            now,
          });
        } catch (error) {
          primaryError = error;
        }

        const primaryStatus = primaryEvaluation ? primaryEvaluation.status : 'error';
        let decision = decideTmdbFallback(film.type, primaryStatus);
        let evaluation = primaryEvaluation;
        let alternateType: 'movie' | 'tv' | undefined;
        let alternateError: unknown;

        if (decision.retryAlternate) {
          alternateType = primaryType === 'movie' ? 'tv' : 'movie';
          let alternateEvaluation: ReturnType<typeof evaluateFilmSync> | undefined;

          try {
            alternateEvaluation = evaluateFilmSync({
              film,
              sync: await fetchTmdbSyncData(alternateType, Number(film.tmdbId), apiKey),
              nowPlayingIds,
              now,
            });
          } catch (error) {
            alternateError = error;
          }

          decision = decideTmdbFallback(
            film.type,
            primaryStatus,
            alternateEvaluation ? alternateEvaluation.status : 'error'
          );

          if (decision.useAlternate) {
            evaluation = alternateEvaluation;
            primaryError = undefined;
          }
        }

        if (evaluation?.status === 'ok' && evaluation.result) {
          rows.push({
            film,
            updates: evaluation.result.updates,
            changes: evaluation.result.changes,
          });
        } else if (evaluation?.status === 'title_mismatch') {
          titleMismatches.push({ title: film.title, tmdbId: film.tmdbId });
        } else if (!evaluation) {
          const detail = [primaryError, alternateError]
            .filter(error => error !== undefined)
            .map(error => errorMessage(error, 'Gagal sinkron dari TMDB.'))
            .join(' | ');
          const attemptLabel = alternateType
            ? ` (${primaryType} & ${alternateType})`
            : ` (${primaryType})`;
          errors.push(
            `${film.title}${attemptLabel}: ${detail || 'Gagal sinkron dari TMDB.'}`
          );
        }
      } catch (error) {
        errors.push(`${film.title}: ${errorMessage(error, 'Gagal sinkron dari TMDB.')}`);
      } finally {
        scanned++;
        if (REQUEST_DELAY_MS > 0) await delay(REQUEST_DELAY_MS);
      }
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  rows.sort((a, b) => a.film.title.localeCompare(b.film.title));
  titleMismatches.sort((a, b) => a.title.localeCompare(b.title));

  // One-time originCountry backfills are written like any other update but do
  // not count towards the change-rate guard, otherwise a full backfill would
  // be rejected.
  const originCountryOnlyRows = rows.filter(row =>
    isOriginCountryOnlyUpdate(row.updates)
  );
  const substantiveChangeCount = countSubstantiveSyncChanges(rows);

  console.log('=====================================================');
  console.log('SUMMARY');
  console.log('=====================================================');
  console.log(`Scanned:                         ${scanned}`);
  console.log(`Films to change:                 ${rows.length}`);
  console.log(`Negara asal diisi:               ${originCountryOnlyRows.length}`);
  console.log(`Title mismatches (skipped):      ${titleMismatches.length}`);
  console.log(`TMDB errors:                     ${errors.length}`);
  console.log(`Films without TMDB ID:           ${withoutTmdbId.length}`);

  if (rows.length > 0) {
    console.log('\nFilms that will change:');
    console.table(
      rows.map(row => ({
        Title: row.film.title,
        TMDB: `#${row.film.tmdbId}`,
        Changes: row.changes.join('; ') || 'Perubahan metadata',
      }))
    );
  } else {
    console.log('\nNo films need changes.');
  }

  if (titleMismatches.length > 0) {
    console.log('\nTitle mismatches (skipped, fix TMDB ID manually):');
    titleMismatches.forEach(item => {
      console.log(`- ${item.title} (TMDB #${item.tmdbId})`);
    });
  }

  if (errors.length > 0) {
    console.log('\nTMDB errors:');
    errors.forEach(message => {
      console.log(`- ${message}`);
    });
  }

  console.log('\n=====================================================');
  const guard = evaluateSyncGuard({
    scanned,
    toChange: substantiveChangeCount,
    errors: errors.length,
    force: options.force,
  });

  appendStepSummary([
    `## TMDB Sync (${options.apply ? 'apply' : 'dry-run'})`,
    '',
    `- Scanned: ${scanned}`,
    `- Films to change: ${rows.length}`,
    `- negara asal diisi: ${originCountryOnlyRows.length}`,
    `- Title mismatches (skipped): ${titleMismatches.length}`,
    `- TMDB errors: ${errors.length}`,
    `- Films without TMDB ID: ${withoutTmdbId.length}`,
    `- Guard: ${guard.ok ? 'ok' : `rejected (${guard.reason})`}`,
  ]);

  if (!guard.ok) {
    console.error(`[GUARD] ${guard.reason}`);
    console.error('Aborting; no writes were performed.');
    console.error('=====================================================\n');
    process.exit(1);
  }

  if (!options.apply) {
    console.log('Dry-run complete. Re-run with --apply to write these changes.');
    console.log('=====================================================\n');
    return;
  }

  let updated = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    chunk.forEach(row => {
      // Only the keys present in `updates` are written.
      batch.update(db.collection('films').doc(row.film.id), row.updates);
    });

    await batch.commit();
    updated += chunk.length;
    console.log(`Committed batch: ${updated}/${rows.length} films updated.`);
  }

  const lastRunAt = new Date().toISOString();
  await db.collection('siteConfig').doc('tmdbSync').set(
    {
      lastRunAt,
      scanned,
      updated,
      titleMismatches: titleMismatches.length,
      errors: errors.length,
      mode: 'cron',
    },
    { merge: true }
  );

  console.log(`\nSync applied: ${updated} films updated.`);
  console.log(`Status written to siteConfig/tmdbSync at ${lastRunAt}.`);
  console.log('=====================================================\n');
}

const isDirectRun = (() => {
  const entry = process.argv[1];
  if (!entry) return false;

  try {
    return path.resolve(entry) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();

if (isDirectRun) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error(
        '[TMDB Sync] Fatal error:',
        errorMessage(error, 'Unknown error while running the TMDB sync.')
      );
      process.exit(1);
    });
}
