/**
 * Daily TMDB import (GitHub Actions / manual).
 *
 * Adds new films and series from TMDB to the `films` collection, shaped
 * exactly like the admin batch import (see `src/utils/tmdbImport.ts`).
 * Indonesian availability (`whereToWatch`, `idReleaseDate`) is left empty on
 * purpose: `sync-tmdb-cron.ts` fills it a bit later the same day.
 *
 * Sources, in priority order (earlier ones win the daily slots):
 *   1. movie/now_playing (region ID)
 *   2. trending movies and series (day)
 *   3. discover: movies and series released in the recent window
 *   4. backlog: one rotating page per day of well-known titles
 *
 * Writes use `create()` with a deterministic id (`film-tmdb-<type>-<tmdbId>`),
 * so an existing document is never overwritten and a re-run is harmless.
 *
 * Requirements:
 * - GOOGLE_APPLICATION_CREDENTIALS: path to a service account JSON key file.
 * - TMDB_API_KEY: v3 API key or v4 read access token.
 *
 * Usage:
 *   Dry-run (default, no writes):  npx tsx scripts/import-tmdb-daily.ts
 *   Apply:                         npx tsx scripts/import-tmdb-daily.ts --apply
 *   Smaller test run:              npx tsx scripts/import-tmdb-daily.ts --limit 5
 *   Bypass the safety guard:       npx tsx scripts/import-tmdb-daily.ts --apply --force
 */

import path from 'node:path';
import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import type { FilmItem } from '../src/types';
import {
  IMPORT_CONFIG,
  backlogPage,
  buildImportFilm,
  importDocId,
  parseImportCliArgs,
  pickCandidates,
  recentWindow,
  type ImportMediaType,
  type ImportSource,
} from '../src/utils/tmdbImport';

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const REQUEST_DELAY_MS = 150;
const RETRY_DELAY_MS = 1000;
/** Abort before writing when more than half of at least this many detail requests failed. */
const GUARD_MIN_ATTEMPTS = 6;
const GUARD_MAX_ERROR_RATE = 0.5;

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

function appendStepSummary(lines: string[]): void {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;
  try {
    appendFileSync(summaryPath, `${lines.join('\n')}\n`);
  } catch {
    // Best-effort only.
  }
}

/** One TMDB GET. 429 and 5xx are retried once after 1 s. Supports v3 keys and v4 tokens. */
async function tmdbGet(
  apiKey: string,
  endpoint: string,
  params: Record<string, string | number>
): Promise<any> {
  const isBearer = apiKey.startsWith('ey') || apiKey.length > 50;
  const url = new URL(`${TMDB_API_BASE}/${endpoint}`);
  if (!isBearer) url.searchParams.set('api_key', apiKey);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (isBearer) headers.Authorization = `Bearer ${apiKey}`;

  let response = await fetch(url.toString(), { method: 'GET', headers });
  if (response.status === 429 || response.status >= 500) {
    await delay(RETRY_DELAY_MS);
    response = await fetch(url.toString(), { method: 'GET', headers });
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.status_message || `TMDB API error (${response.status})`);
  }
  return data;
}

interface SourceDef {
  name: string;
  mediaType: ImportMediaType;
  endpoint: string;
  params: Record<string, string | number>;
  pages: number[];
}

function buildSourceDefs(now: Date): SourceDef[] {
  const pages = Array.from({ length: IMPORT_CONFIG.listPages }, (_, i) => i + 1);
  const window = recentWindow(now);
  const base = { language: 'en-US', include_adult: 'false' };

  return [
    {
      name: 'now_playing ID',
      mediaType: 'movie',
      endpoint: 'movie/now_playing',
      params: { language: 'en-US', region: 'ID' },
      pages,
    },
    {
      name: 'trending movie',
      mediaType: 'movie',
      endpoint: 'trending/movie/day',
      params: { language: 'en-US' },
      pages,
    },
    {
      name: 'trending tv',
      mediaType: 'tv',
      endpoint: 'trending/tv/day',
      params: { language: 'en-US' },
      pages,
    },
    {
      name: 'recent movie',
      mediaType: 'movie',
      endpoint: 'discover/movie',
      params: {
        ...base,
        sort_by: 'popularity.desc',
        'primary_release_date.gte': window.from,
        'primary_release_date.lte': window.to,
      },
      pages,
    },
    {
      name: 'recent tv',
      mediaType: 'tv',
      endpoint: 'discover/tv',
      params: {
        ...base,
        sort_by: 'popularity.desc',
        'first_air_date.gte': window.from,
        'first_air_date.lte': window.to,
      },
      pages,
    },
    {
      name: 'backlog movie',
      mediaType: 'movie',
      endpoint: 'discover/movie',
      params: {
        ...base,
        sort_by: 'vote_count.desc',
        'vote_count.gte': IMPORT_CONFIG.backlogMinVotes.movie,
      },
      pages: [backlogPage(now, IMPORT_CONFIG.backlogPageCycle.movie)],
    },
    {
      name: 'backlog tv',
      mediaType: 'tv',
      endpoint: 'discover/tv',
      params: {
        ...base,
        sort_by: 'vote_count.desc',
        'vote_count.gte': IMPORT_CONFIG.backlogMinVotes.tv,
      },
      pages: [backlogPage(now, IMPORT_CONFIG.backlogPageCycle.tv)],
    },
  ];
}

async function fetchSources(
  apiKey: string,
  now: Date
): Promise<{ sources: ImportSource[]; failures: string[] }> {
  const sources: ImportSource[] = [];
  const failures: string[] = [];

  for (const def of buildSourceDefs(now)) {
    const items: ImportSource['items'] = [];
    try {
      for (const page of def.pages) {
        const data = await tmdbGet(apiKey, def.endpoint, { ...def.params, page });
        if (Array.isArray(data?.results)) items.push(...data.results);
        await delay(REQUEST_DELAY_MS);
      }
    } catch (error) {
      failures.push(`${def.name}: ${errorMessage(error, 'gagal mengambil daftar')}`);
    }
    sources.push({ name: def.name, mediaType: def.mediaType, items });
  }

  return { sources, failures };
}

interface ImportRow {
  docId: string;
  film: Omit<FilmItem, 'id'>;
  source: string;
}

async function main(): Promise<void> {
  const options = parseImportCliArgs(process.argv.slice(2));

  const apiKey = process.env.TMDB_API_KEY?.trim();
  if (!apiKey) {
    console.error('TMDB_API_KEY environment variable is required. Aborting; no writes were performed.');
    process.exit(1);
  }

  console.log('=====================================================');
  console.log(`TMDB Import ${options.apply ? '(APPLY MODE)' : '(DRY-RUN MODE)'}`);
  console.log(`Limit: ${options.limit} new titles`);
  if (options.force) console.log('Safety guard: BYPASSED (--force)');
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
  const takenSlugs = new Set<string>(
    films.map(film => film.slug).filter((slug): slug is string => Boolean(slug))
  );
  console.log(`Films in catalog: ${films.length}\n`);

  const now = new Date();

  console.log('Fetching TMDB source lists...');
  const { sources, failures } = await fetchSources(apiKey, now);
  sources.forEach(source => console.log(`- ${source.name}: ${source.items.length} titles`));
  if (failures.length > 0) {
    console.log('\nSource failures:');
    failures.forEach(message => console.log(`- ${message}`));
  }

  if (sources.every(source => source.items.length === 0)) {
    console.error('\n[ABORT] No source list could be fetched. No writes were performed.');
    process.exit(1);
  }

  const picked = pickCandidates(sources, films);
  console.log(`\nAlready in catalog:     ${picked.alreadyInCatalog}`);
  console.log(`Filtered out (quality): ${picked.filteredOut}`);
  console.log(`New candidates:         ${picked.candidates.length}\n`);

  const rows: ImportRow[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];
  let attempts = 0;

  for (const candidate of picked.candidates) {
    if (rows.length >= options.limit) break;
    attempts++;

    try {
      const details = await tmdbGet(apiKey, `${candidate.mediaType}/${candidate.id}`, {
        append_to_response: 'credits,videos',
        language: 'en-US',
      });
      const built = buildImportFilm(details, candidate.mediaType, takenSlugs, now);

      if (built.ok) {
        takenSlugs.add(built.film.slug as string);
        rows.push({
          docId: importDocId(candidate.mediaType, candidate.id),
          film: built.film,
          source: candidate.source,
        });
      } else {
        skipped.push(`${candidate.title || `#${candidate.id}`}: ${built.reason}`);
      }
    } catch (error) {
      errors.push(
        `${candidate.title || `#${candidate.id}`} (${candidate.mediaType}): ${errorMessage(error, 'gagal mengambil detail')}`
      );
    }

    await delay(REQUEST_DELAY_MS);
  }

  console.log('=====================================================');
  console.log('SUMMARY');
  console.log('=====================================================');
  console.log(`Detail requests:                 ${attempts}`);
  console.log(`Titles to import:                ${rows.length}`);
  console.log(`Skipped (poster/sinopsis dll):   ${skipped.length}`);
  console.log(`TMDB errors:                     ${errors.length}`);

  if (rows.length > 0) {
    console.log('\nTitles to import:');
    console.table(
      rows.map(row => ({
        Title: row.film.title,
        Type: row.film.type,
        Year: row.film.year,
        TMDB: `#${row.film.tmdbId}`,
        Score: row.film.skorSotoy,
        Slug: row.film.slug,
        Source: row.source,
      }))
    );
  } else {
    console.log('\nNo new titles to import.');
  }

  if (skipped.length > 0) {
    console.log('\nSkipped:');
    skipped.forEach(message => console.log(`- ${message}`));
  }
  if (errors.length > 0) {
    console.log('\nTMDB errors:');
    errors.forEach(message => console.log(`- ${message}`));
  }

  const errorRate = attempts > 0 ? errors.length / attempts : 0;
  const guardRejected =
    !options.force && attempts >= GUARD_MIN_ATTEMPTS && errorRate > GUARD_MAX_ERROR_RATE;

  console.log('\n=====================================================');
  appendStepSummary([
    `## TMDB Import (${options.apply ? 'apply' : 'dry-run'})`,
    '',
    `- Already in catalog: ${picked.alreadyInCatalog}`,
    `- Titles to import: ${rows.length}`,
    `- Skipped: ${skipped.length}`,
    `- TMDB errors: ${errors.length}`,
    `- Guard: ${guardRejected ? 'rejected (too many TMDB errors)' : 'ok'}`,
  ]);

  if (guardRejected) {
    console.error(
      `[GUARD] ${errors.length} of ${attempts} detail requests failed. Aborting; no writes were performed.`
    );
    console.error('=====================================================\n');
    process.exit(1);
  }

  if (!options.apply) {
    console.log('Dry-run complete. Re-run with --apply to write these titles.');
    console.log('=====================================================\n');
    return;
  }

  let created = 0;
  let alreadyExisted = 0;
  const writeErrors: string[] = [];

  for (const row of rows) {
    try {
      await db.collection('films').doc(row.docId).create(row.film);
      created++;
    } catch (error: any) {
      // gRPC code 6 = ALREADY_EXISTS: never overwrite an existing document.
      if (error?.code === 6) {
        alreadyExisted++;
      } else {
        writeErrors.push(`${row.film.title}: ${errorMessage(error, 'gagal menulis')}`);
      }
    }
  }

  console.log(`Created: ${created}, already existed: ${alreadyExisted}, write errors: ${writeErrors.length}`);
  writeErrors.forEach(message => console.log(`- ${message}`));

  const lastRunAt = new Date().toISOString();
  await db.collection('siteConfig').doc('tmdbImport').set(
    {
      lastRunAt,
      created,
      skipped: skipped.length,
      errors: errors.length + writeErrors.length,
      mode: 'cron',
    },
    { merge: true }
  );

  console.log(`Status written to siteConfig/tmdbImport at ${lastRunAt}.`);
  console.log('=====================================================\n');

  if (writeErrors.length > 0) process.exit(1);
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
        '[TMDB Import] Fatal error:',
        errorMessage(error, 'Unknown error while running the TMDB import.')
      );
      process.exit(1);
    });
}
