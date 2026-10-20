/**
 * Fill Missing TMDB IDs Script
 *
 * Finds films in the `films` collection that do not have a `tmdbId`, searches
 * TMDB for a match, and (only with --apply) writes the `tmdbId` field.
 *
 * Safety rules:
 * - Dry-run by default; nothing is written unless --apply is passed.
 * - Only the `tmdbId` field is ever written, in batches of at most 400.
 * - Existing `tmdbId` values are never overwritten.
 * - If two films would receive the same TMDB ID, or the ID is already used by
 *   another film, both films are reported as duplicates and neither is written.
 * - Manual overrides (`--overrides`) require an existing film without a
 *   `tmdbId`. Shared TMDB IDs are allowed with a warning because TV and movie
 *   IDs share numbers.
 *
 * Requirements:
 * - GOOGLE_APPLICATION_CREDENTIALS must point to a valid service account JSON key file.
 * - TMDB_API_KEY must be set (v3 API key or v4 read access token) when searching.
 *
 * Usage:
 * Dry-Run Mode (default, no writes):
 *   node --env-file=.env --import tsx scripts/fill-tmdb-ids.ts
 *
 * Apply Mode:
 *   node --env-file=.env --import tsx scripts/fill-tmdb-ids.ts --apply
 *
 * Manual Overrides (no TMDB search; default file data/tmdb-id-overrides.json):
 *   node --env-file=.env --import tsx scripts/fill-tmdb-ids.ts --overrides
 *   node --env-file=.env --import tsx scripts/fill-tmdb-ids.ts --overrides path/to/file.json --apply
 *
 * The full report is always written to data/tmdb-id-report.json.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { normalizeTitle } from '../src/utils/tmdbSync';

const BATCH_SIZE = 400;
const REQUEST_DELAY_MS = 120;
const RETRY_DELAY_MS = 1000;
const MIN_CONTAINMENT_LENGTH = 4;
const REPORT_PATH = resolve(process.cwd(), 'data', 'tmdb-id-report.json');
const DEFAULT_OVERRIDES_PATH = 'data/tmdb-id-overrides.json';

export type TmdbMediaType = 'movie' | 'tv';

export interface TmdbMatchFilm {
  title?: string;
  originalTitle?: string;
  year?: number;
  type?: string;
}

export interface TmdbCandidate {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  media_type: TmdbMediaType;
}

export type TmdbMatchStatus = 'confident' | 'ambiguous' | 'not_found';

export interface TmdbMatchResult {
  status: TmdbMatchStatus;
  best?: TmdbCandidate;
  candidates: TmdbCandidate[];
}

export interface TmdbAssignment {
  filmId: string;
  filmTitle: string;
  tmdbId: number;
}

export interface DuplicateTmdbId {
  tmdbId: number;
  filmIds: string[];
  existingFilmIds: string[];
}

export type TmdbOverrideSkipReason =
  | 'missing_film'
  | 'already_has_tmdb_id'
  | 'invalid_film_id'
  | 'invalid_tmdb_id';

export interface TmdbOverrideFilm {
  title?: string;
  tmdbId?: unknown;
}

export interface ValidTmdbOverride {
  filmId: string;
  tmdbId: number;
  filmTitle: string;
}

export interface SkippedTmdbOverride {
  filmId: string;
  tmdbId?: number;
  filmTitle: string;
  reason: TmdbOverrideSkipReason;
}

export interface TmdbOverrideValidationResult {
  valid: ValidTmdbOverride[];
  skipped: SkippedTmdbOverride[];
}

/**
 * Validates a manual `{ "<filmId>": <tmdbId> }` override map.
 *
 * An override is valid only when the film document exists and does not already
 * have a truthy `tmdbId`. Missing documents, already-filled films, and invalid
 * IDs are returned as skipped entries so the caller can report them. Shared
 * TMDB IDs are intentionally NOT rejected here: TV and movie IDs share numbers.
 */
export function validateTmdbOverrides(
  raw: unknown,
  filmsById: ReadonlyMap<string, TmdbOverrideFilm>
): TmdbOverrideValidationResult {
  const valid: ValidTmdbOverride[] = [];
  const skipped: SkippedTmdbOverride[] = [];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { valid, skipped };
  }

  for (const [rawFilmId, rawTmdbId] of Object.entries(raw)) {
    const filmId = String(rawFilmId).trim();

    if (!filmId) {
      skipped.push({
        filmId: String(rawFilmId),
        filmTitle: '(missing document)',
        reason: 'invalid_film_id',
      });
      continue;
    }

    const film = filmsById.get(filmId);
    const numericTmdbId =
      typeof rawTmdbId === 'number'
        ? rawTmdbId
        : typeof rawTmdbId === 'string' && rawTmdbId.trim() !== ''
          ? Number(rawTmdbId)
          : Number.NaN;

    if (!Number.isInteger(numericTmdbId) || numericTmdbId <= 0) {
      skipped.push({
        filmId,
        tmdbId: Number.isFinite(numericTmdbId) ? numericTmdbId : undefined,
        filmTitle: film?.title || '(unknown)',
        reason: 'invalid_tmdb_id',
      });
      continue;
    }

    if (!film) {
      skipped.push({
        filmId,
        tmdbId: numericTmdbId,
        filmTitle: '(missing document)',
        reason: 'missing_film',
      });
      continue;
    }

    if (film.tmdbId) {
      skipped.push({
        filmId,
        tmdbId: numericTmdbId,
        filmTitle: film.title || '(untitled)',
        reason: 'already_has_tmdb_id',
      });
      continue;
    }

    valid.push({
      filmId,
      tmdbId: numericTmdbId,
      filmTitle: film.title || '(untitled)',
    });
  }

  return { valid, skipped };
}

interface FilmRecord {
  id: string;
  title: string;
  originalTitle?: string;
  year?: number;
  type?: string;
}

interface CandidateMatch {
  candidate: TmdbCandidate;
  exact: boolean;
  yearDiff?: number;
}

interface ReportCandidate {
  id: number;
  title: string;
  year: number | null;
  mediaType: TmdbMediaType;
}

interface ReportConfidentMatch {
  filmId: string;
  filmTitle: string;
  filmYear: number | null;
  filmType: string | null;
  tmdbId: number;
  tmdbTitle: string;
  tmdbYear: number | null;
  mediaType: TmdbMediaType;
}

interface ReportAmbiguousMatch {
  filmId: string;
  filmTitle: string;
  filmYear: number | null;
  filmType: string | null;
  candidates: ReportCandidate[];
}

interface ReportNotFound {
  filmId: string;
  filmTitle: string;
  filmYear: number | null;
  filmType: string | null;
}

interface ReportDuplicate {
  filmId: string;
  filmTitle: string;
  filmYear: number | null;
  filmType: string | null;
  tmdbId: number;
  tmdbTitle: string;
  reason: 'multiple_films_same_tmdb_id' | 'tmdb_id_already_used';
  conflictingFilmIds: string[];
  existingFilmIds: string[];
}

interface ReportError {
  filmId: string;
  filmTitle: string;
  filmYear: number | null;
  filmType: string | null;
  message: string;
}

interface ReportOverrideEntry {
  filmId: string;
  filmTitle: string;
  tmdbId: number | null;
  status: 'written' | 'dry-run' | 'skipped';
  reason?: TmdbOverrideSkipReason;
  warning?: {
    filmId: string;
    filmTitle: string;
  };
}

interface ReportOverrides {
  source: string;
  valid: number;
  skipped: number;
  written: number;
  entries: ReportOverrideEntry[];
}

interface FillSummary {
  scanned: number;
  alreadyHadTmdbId: number;
  confident: number;
  ambiguous: number;
  notFound: number;
  duplicates: number;
  errors: number;
}

interface FillReport {
  generatedAt: string;
  mode: 'dry-run' | 'apply';
  summary: FillSummary;
  confident: ReportConfidentMatch[];
  ambiguous: ReportAmbiguousMatch[];
  notFound: ReportNotFound[];
  duplicates: ReportDuplicate[];
  errors: ReportError[];
  overrides?: ReportOverrides;
}

const sleep = (ms: number): Promise<void> => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

const candidateTitles = (candidate: TmdbCandidate): string[] =>
  Array.from(
    new Set(
      [candidate.title, candidate.name, candidate.original_title, candidate.original_name]
        .map(normalizeTitle)
        .filter(Boolean)
    )
  );

const candidateTitle = (candidate: TmdbCandidate): string =>
  candidate.title || candidate.name || candidate.original_title || candidate.original_name || '(untitled)';

const candidateDate = (candidate: TmdbCandidate): string | undefined =>
  candidate.release_date || candidate.first_air_date;

const extractYear = (value?: string | number | null): number | undefined => {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? Math.trunc(value) : undefined;
  }
  if (typeof value !== 'string') return undefined;

  const match = /^(\d{4})/.exec(value.trim());
  if (!match) return undefined;

  const year = Number(match[1]);
  return Number.isFinite(year) && year > 0 ? year : undefined;
};

const candidateYear = (candidate: TmdbCandidate): number | undefined =>
  extractYear(candidateDate(candidate));

const mediaTypeFitsFilm = (mediaType: TmdbMediaType, filmType?: string): boolean => {
  if (filmType === 'series') return mediaType === 'tv';
  if (filmType === 'animation') return mediaType === 'movie' || mediaType === 'tv';
  return mediaType === 'movie';
};

/**
 * Picks the safest TMDB match for one film.
 *
 * A candidate is a title match when any of its title/name/original fields
 * equals the film title or originalTitle after normalization. Year proximity
 * (+/-1) is required for a confident match. Containment-only matches are never
 * confident. When several candidates qualify, the one whose media type fits
 * the film type wins; anything still ambiguous is reported instead of guessed.
 */
export function pickTmdbMatch(
  film: TmdbMatchFilm,
  candidates: TmdbCandidate[]
): TmdbMatchResult {
  const filmTitles = Array.from(
    new Set([film.title, film.originalTitle].map(normalizeTitle).filter(Boolean))
  );

  if (filmTitles.length === 0 || candidates.length === 0) {
    return { status: 'not_found', candidates: [] };
  }

  const filmYear = extractYear(film.year);

  const matches: CandidateMatch[] = [];
  for (const candidate of candidates) {
    if (!candidate || !Number.isFinite(Number(candidate.id))) continue;

    const titles = candidateTitles(candidate);
    if (titles.length === 0) continue;

    const exact = titles.some((title) => filmTitles.includes(title));
    const containment =
      !exact &&
      titles.some((title) =>
        filmTitles.some(
          (filmTitle) =>
            filmTitle.length >= MIN_CONTAINMENT_LENGTH &&
            title.length >= MIN_CONTAINMENT_LENGTH &&
            (filmTitle.includes(title) || title.includes(filmTitle))
        )
      );

    if (!exact && !containment) continue;

    const matchYear = candidateYear(candidate);
    const yearDiff =
      filmYear !== undefined && matchYear !== undefined ? Math.abs(filmYear - matchYear) : undefined;

    matches.push({ candidate, exact, yearDiff });
  }

  if (matches.length === 0) {
    return { status: 'not_found', candidates: [] };
  }

  matches.sort((a, b) => {
    if (a.exact !== b.exact) return a.exact ? -1 : 1;

    const aYear = a.yearDiff === undefined ? Number.POSITIVE_INFINITY : a.yearDiff;
    const bYear = b.yearDiff === undefined ? Number.POSITIVE_INFINITY : b.yearDiff;
    if (aYear !== bYear) return aYear - bYear;

    return Number(a.candidate.id) - Number(b.candidate.id);
  });

  const topCandidates = matches.slice(0, 3).map((match) => match.candidate);

  const exactMatches = matches.filter((match) => match.exact);
  const confidentMatches = exactMatches.filter(
    (match) => match.yearDiff !== undefined && match.yearDiff <= 1
  );

  if (confidentMatches.length > 0) {
    const fittingMatches = confidentMatches.filter((match) =>
      mediaTypeFitsFilm(match.candidate.media_type, film.type)
    );

    if (confidentMatches.length === 1) {
      return { status: 'confident', best: confidentMatches[0].candidate, candidates: topCandidates };
    }

    if (fittingMatches.length === 1) {
      return { status: 'confident', best: fittingMatches[0].candidate, candidates: topCandidates };
    }

    return { status: 'ambiguous', candidates: topCandidates };
  }

  return { status: 'ambiguous', candidates: topCandidates };
}

/**
 * Finds films that cannot safely be written because their TMDB ID would be
 * shared. Both members of a shared pair are returned, as is any film whose ID
 * is already used by an existing document.
 */
export function findDuplicateTmdbIds(
  assignments: TmdbAssignment[],
  existingTmdbIds: ReadonlyMap<number, string> = new Map()
): Map<string, DuplicateTmdbId> {
  const byTmdbId = new Map<number, TmdbAssignment[]>();

  for (const assignment of assignments) {
    const current = byTmdbId.get(assignment.tmdbId) || [];
    current.push(assignment);
    byTmdbId.set(assignment.tmdbId, current);
  }

  const duplicates = new Map<string, DuplicateTmdbId>();

  for (const [tmdbId, group] of byTmdbId) {
    const existingFilmId = existingTmdbIds.get(tmdbId);
    if (group.length < 2 && !existingFilmId) continue;

    const info: DuplicateTmdbId = {
      tmdbId,
      filmIds: group.map((assignment) => assignment.filmId),
      existingFilmIds: existingFilmId ? [existingFilmId] : [],
    };

    for (const assignment of group) {
      duplicates.set(assignment.filmId, info);
    }
  }

  return duplicates;
}

const isBearerKey = (apiKey: string): boolean => apiKey.startsWith('ey') || apiKey.length > 50;

async function tmdbGet(
  apiKey: string,
  path: string,
  params: Record<string, string>
): Promise<any> {
  const isBearer = isBearerKey(apiKey);
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (isBearer) headers.Authorization = `Bearer ${apiKey}`;

  const buildUrl = (): URL => {
    const url = new URL(`https://api.themoviedb.org/3/${path}`);
    if (!isBearer) url.searchParams.set('api_key', apiKey);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return url;
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch(buildUrl().toString(), { method: 'GET', headers });
    if (response.ok) {
      return response.json();
    }

    const shouldRetry = response.status === 429 || response.status >= 500;
    if (shouldRetry && attempt === 0) {
      await sleep(RETRY_DELAY_MS);
      continue;
    }

    let message = `TMDB API error (${response.status})`;
    try {
      const data = await response.json();
      if (data?.status_message) message = `${message}: ${data.status_message}`;
    } catch {
      // Ignore a non-JSON error body.
    }
    throw new Error(message);
  }

  throw new Error('TMDB request failed after retry.');
}

async function searchTmdb(
  apiKey: string,
  query: string,
  mediaType: TmdbMediaType
): Promise<TmdbCandidate[]> {
  const data = await tmdbGet(apiKey, mediaType === 'tv' ? 'search/tv' : 'search/movie', {
    query,
    include_adult: 'false',
    language: 'en-US',
    page: '1',
  });

  return (Array.isArray(data?.results) ? data.results : [])
    .map((item: any): TmdbCandidate => ({
      id: Number(item?.id),
      title: item?.title,
      name: item?.name,
      original_title: item?.original_title,
      original_name: item?.original_name,
      release_date: item?.release_date,
      first_air_date: item?.first_air_date,
      media_type: mediaType,
    }))
    .filter((candidate: TmdbCandidate) => Number.isFinite(candidate.id) && candidate.id > 0);
}

const mediaTypesForFilm = (type?: string): TmdbMediaType[] => {
  if (type === 'series') return ['tv'];
  if (type === 'animation') return ['movie', 'tv'];
  return ['movie'];
};

const uniqueQueries = (film: FilmRecord): string[] => {
  const queries = [film.title, film.originalTitle]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean);

  const seen = new Set<string>();
  return queries.filter((query) => {
    const key = normalizeTitle(query);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const toReportCandidate = (candidate: TmdbCandidate): ReportCandidate => ({
  id: Number(candidate.id),
  title: candidateTitle(candidate),
  year: candidateYear(candidate) ?? null,
  mediaType: candidate.media_type,
});

const parseOverridesOption = (): { enabled: boolean; path: string } => {
  const argv = process.argv;
  const inlineArg = argv.find((arg) => arg.startsWith('--overrides='));
  if (inlineArg) {
    const value = inlineArg.slice('--overrides='.length).trim();
    return { enabled: true, path: resolve(process.cwd(), value || DEFAULT_OVERRIDES_PATH) };
  }

  const index = argv.indexOf('--overrides');
  if (index === -1) {
    return { enabled: false, path: resolve(process.cwd(), DEFAULT_OVERRIDES_PATH) };
  }

  const next = argv[index + 1];
  const value = next && !next.startsWith('--') ? next.trim() : '';
  return { enabled: true, path: resolve(process.cwd(), value || DEFAULT_OVERRIDES_PATH) };
};

const writeReportFile = async (report: FillReport): Promise<void> => {
  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`\nReport written to: ${REPORT_PATH}`);
};

interface OverridesRunArgs {
  db: ReturnType<typeof getFirestore>;
  overridesPath: string;
  isApply: boolean;
  scanned: number;
  alreadyHadTmdbId: number;
  filmsById: ReadonlyMap<string, TmdbOverrideFilm>;
  tmdbOwners: ReadonlyMap<number, { id: string; title: string }>;
}

async function fillTmdbIdsFromOverrides({
  db,
  overridesPath,
  isApply,
  scanned,
  alreadyHadTmdbId,
  filmsById,
  tmdbOwners,
}: OverridesRunArgs): Promise<void> {
  console.log(`Overrides source: ${overridesPath}\n`);

  let rawText: string;
  try {
    rawText = await readFile(overridesPath, 'utf8');
  } catch (err: any) {
    console.error(`[Fatal] Could not read overrides file: ${overridesPath}`);
    console.error(err?.message || String(err));
    process.exit(1);
  }

  let rawOverrides: unknown;
  try {
    rawOverrides = JSON.parse(rawText);
  } catch (err: any) {
    console.error(`[Fatal] Overrides file is not valid JSON: ${overridesPath}`);
    console.error(err?.message || String(err));
    process.exit(1);
  }

  if (!rawOverrides || typeof rawOverrides !== 'object' || Array.isArray(rawOverrides)) {
    console.error('[Fatal] Overrides file must contain an object: { "<filmId>": <tmdbId> }.');
    process.exit(1);
  }

  const validation = validateTmdbOverrides(rawOverrides, filmsById);
  const entries: ReportOverrideEntry[] = [];
  let warningCount = 0;

  for (const entry of validation.valid) {
    const owner = tmdbOwners.get(entry.tmdbId);
    const warning = owner
      ? { filmId: owner.id, filmTitle: owner.title || '(untitled)' }
      : undefined;

    if (warning) {
      warningCount++;
      console.warn(
        `[Warning] "${entry.filmTitle}" (${entry.filmId}) -> TMDB #${entry.tmdbId} is already used by "${warning.filmTitle}" (${warning.filmId}). Allowing it because TV and movie IDs share numbers.`
      );
    }

    entries.push({
      filmId: entry.filmId,
      filmTitle: entry.filmTitle,
      tmdbId: entry.tmdbId,
      status: isApply ? 'written' : 'dry-run',
      warning,
    });
  }

  for (const entry of validation.skipped) {
    entries.push({
      filmId: entry.filmId,
      filmTitle: entry.filmTitle,
      tmdbId: entry.tmdbId ?? null,
      status: 'skipped',
      reason: entry.reason,
    });
  }

  console.log('=====================================================');
  console.log('OVERRIDE ENTRIES');
  console.log('=====================================================');
  if (validation.valid.length === 0) {
    console.log('No valid override entries.');
  } else {
    console.table(
      validation.valid.map((entry) => ({
        Film: entry.filmTitle,
        'Film ID': entry.filmId,
        'TMDB ID': entry.tmdbId,
        Warning: tmdbOwners.has(entry.tmdbId) ? 'shared TMDB ID' : '-',
      }))
    );
  }

  if (validation.skipped.length > 0) {
    console.log('\nSkipped override entries:');
    console.table(
      validation.skipped.map((entry) => ({
        Film: entry.filmTitle,
        'Film ID': entry.filmId,
        'TMDB ID': entry.tmdbId ?? '-',
        Reason: entry.reason,
      }))
    );
  }

  let written = 0;
  if (isApply && validation.valid.length > 0) {
    for (let i = 0; i < validation.valid.length; i += BATCH_SIZE) {
      const chunk = validation.valid.slice(i, i + BATCH_SIZE);
      const batch = db.batch();
      chunk.forEach((entry) => {
        // Only the `tmdbId` field is modified.
        batch.update(db.collection('films').doc(entry.filmId), { tmdbId: entry.tmdbId });
      });
      await batch.commit();
      written += chunk.length;
      console.log(`Committed batch: ${written}/${validation.valid.length} documents updated.`);
    }
  }

  console.log('\n=====================================================');
  console.log('OVERRIDES SUMMARY');
  console.log('=====================================================');
  console.log(`Execution Mode:                    ${isApply ? 'APPLY (WROTE CHANGES)' : 'DRY-RUN (NO CHANGES MADE)'}`);
  console.log(`Films scanned:                     ${scanned}`);
  console.log(`Already had tmdbId:                ${alreadyHadTmdbId}`);
  console.log(`Override entries valid:            ${validation.valid.length}`);
  console.log(`Override entries skipped:          ${validation.skipped.length}`);
  console.log(`Shared TMDB ID warnings:           ${warningCount}`);
  console.log(`Documents written:                 ${written}`);

  const report: FillReport = {
    generatedAt: new Date().toISOString(),
    mode: isApply ? 'apply' : 'dry-run',
    summary: {
      scanned,
      alreadyHadTmdbId,
      confident: 0,
      ambiguous: 0,
      notFound: 0,
      duplicates: 0,
      errors: 0,
    },
    confident: [],
    ambiguous: [],
    notFound: [],
    duplicates: [],
    errors: [],
    overrides: {
      source: overridesPath,
      valid: validation.valid.length,
      skipped: validation.skipped.length,
      written,
      entries,
    },
  };

  await writeReportFile(report);

  if (isApply && validation.valid.length > 0) {
    console.log(`\nApply complete: ${written} tmdbId values written from overrides.`);
  } else if (isApply) {
    console.log('\nNothing to write; no valid override entries.');
  } else {
    console.log('\nDry-run complete. Re-run with --apply to write these tmdbId values.');
  }

  console.log('=====================================================\n');
  process.exit(0);
}

async function fillTmdbIds() {
  const isApply = process.argv.includes('--apply');
  const overridesOption = parseOverridesOption();

  console.log('=====================================================');
  console.log(
    `Starting Fill Missing TMDB IDs ${
      overridesOption.enabled ? '(OVERRIDES MODE)' : isApply ? '(APPLY MODE)' : '(DRY-RUN MODE)'
    }`
  );
  console.log('=====================================================\n');

  const apiKey = process.env.TMDB_API_KEY?.trim() || '';
  if (!overridesOption.enabled && !apiKey) {
    console.error('[Fatal] TMDB_API_KEY is not set.');
    console.error('Add TMDB_API_KEY to .env (v3 key or v4 read access token) and run:');
    console.error('  node --env-file=.env --import tsx scripts/fill-tmdb-ids.ts');
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

  try {
    console.log('Loading documents from "films" collection...');
    const filmsSnap = await db.collection('films').get();

    if (filmsSnap.size === 0) {
      console.error('=====================================================');
      console.error('[ABORT GUARD ERROR] 0 documents found in "films" collection.');
      console.error('Aborting; no writes were performed.');
      console.error('=====================================================\n');
      process.exit(1);
    }

    const films: FilmRecord[] = [];
    const allFilmsById = new Map<string, TmdbOverrideFilm>();
    const existingTmdbIds = new Map<number, string>();
    const tmdbOwners = new Map<number, { id: string; title: string }>();
    let alreadyHadTmdbId = 0;

    for (const docSnap of filmsSnap.docs) {
      const data = docSnap.data();
      const numericTmdbId = Number(data.tmdbId);
      const title = typeof data.title === 'string' ? data.title : '';

      allFilmsById.set(docSnap.id, { title, tmdbId: data.tmdbId });

      if (data.tmdbId) {
        if (Number.isFinite(numericTmdbId) && numericTmdbId > 0) {
          existingTmdbIds.set(numericTmdbId, docSnap.id);
          tmdbOwners.set(numericTmdbId, { id: docSnap.id, title });
        }
        alreadyHadTmdbId++;
        continue;
      }

      films.push({
        id: docSnap.id,
        title,
        originalTitle: typeof data.originalTitle === 'string' ? data.originalTitle : undefined,
        year: extractYear(data.year),
        type: typeof data.type === 'string' ? data.type.trim().toLowerCase() : undefined,
      });
    }

    console.log(
      `Found ${filmsSnap.size} film documents (${alreadyHadTmdbId} already have tmdbId, ${films.length} to check).\n`
    );

    if (overridesOption.enabled) {
      await fillTmdbIdsFromOverrides({
        db,
        overridesPath: overridesOption.path,
        isApply,
        scanned: filmsSnap.size,
        alreadyHadTmdbId,
        filmsById: allFilmsById,
        tmdbOwners,
      });
      return;
    }

    const confidentMatches: Array<{ film: FilmRecord; candidate: TmdbCandidate }> = [];
    const ambiguousMatches: ReportAmbiguousMatch[] = [];
    const notFound: ReportNotFound[] = [];
    const errors: ReportError[] = [];

    let requestCount = 0;

    for (const film of films) {
      const queries = uniqueQueries(film);
      if (queries.length === 0) {
        notFound.push({
          filmId: film.id,
          filmTitle: '(untitled)',
          filmYear: film.year ?? null,
          filmType: film.type ?? null,
        });
        continue;
      }

      try {
        const candidates: TmdbCandidate[] = [];
        const seenCandidates = new Set<string>();

        for (const query of queries) {
          for (const mediaType of mediaTypesForFilm(film.type)) {
            let results: TmdbCandidate[] = [];
            try {
              results = await searchTmdb(apiKey, query, mediaType);
            } finally {
              requestCount++;
              await sleep(REQUEST_DELAY_MS);
            }

            for (const candidate of results) {
              const key = `${candidate.media_type}:${candidate.id}`;
              if (seenCandidates.has(key)) continue;
              seenCandidates.add(key);
              candidates.push(candidate);
            }
          }
        }

        const result = pickTmdbMatch(film, candidates);

        if (result.status === 'confident' && result.best) {
          confidentMatches.push({ film, candidate: result.best });
        } else if (result.status === 'ambiguous') {
          ambiguousMatches.push({
            filmId: film.id,
            filmTitle: film.title || '(untitled)',
            filmYear: film.year ?? null,
            filmType: film.type ?? null,
            candidates: result.candidates.map(toReportCandidate),
          });
        } else {
          notFound.push({
            filmId: film.id,
            filmTitle: film.title || '(untitled)',
            filmYear: film.year ?? null,
            filmType: film.type ?? null,
          });
        }
      } catch (err: any) {
        errors.push({
          filmId: film.id,
          filmTitle: film.title || '(untitled)',
          filmYear: film.year ?? null,
          filmType: film.type ?? null,
          message: err?.message || String(err),
        });
      }
    }

    const assignments: TmdbAssignment[] = confidentMatches.map(({ film, candidate }) => ({
      filmId: film.id,
      filmTitle: film.title || '(untitled)',
      tmdbId: Number(candidate.id),
    }));
    const duplicateIds = findDuplicateTmdbIds(assignments, existingTmdbIds);

    const confidentReport: ReportConfidentMatch[] = [];
    const duplicateReport: ReportDuplicate[] = [];
    const writable: Array<{ film: FilmRecord; candidate: TmdbCandidate }> = [];

    for (const match of confidentMatches) {
      const duplicate = duplicateIds.get(match.film.id);
      if (duplicate) {
        duplicateReport.push({
          filmId: match.film.id,
          filmTitle: match.film.title || '(untitled)',
          filmYear: match.film.year ?? null,
          filmType: match.film.type ?? null,
          tmdbId: Number(match.candidate.id),
          tmdbTitle: candidateTitle(match.candidate),
          reason:
            duplicate.existingFilmIds.length > 0
              ? 'tmdb_id_already_used'
              : 'multiple_films_same_tmdb_id',
          conflictingFilmIds: duplicate.filmIds.filter((id) => id !== match.film.id),
          existingFilmIds: duplicate.existingFilmIds,
        });
        continue;
      }

      writable.push(match);
      confidentReport.push({
        filmId: match.film.id,
        filmTitle: match.film.title || '(untitled)',
        filmYear: match.film.year ?? null,
        filmType: match.film.type ?? null,
        tmdbId: Number(match.candidate.id),
        tmdbTitle: candidateTitle(match.candidate),
        tmdbYear: candidateYear(match.candidate) ?? null,
        mediaType: match.candidate.media_type,
      });
    }

    const summary: FillSummary = {
      scanned: filmsSnap.size,
      alreadyHadTmdbId,
      confident: confidentReport.length,
      ambiguous: ambiguousMatches.length,
      notFound: notFound.length,
      duplicates: duplicateReport.length,
      errors: errors.length,
    };

    console.log('=====================================================');
    console.log('CONFIDENT MATCHES');
    console.log('=====================================================');
    if (confidentReport.length === 0) {
      console.log('No confident matches to write.');
    } else {
      console.table(
        confidentReport.map((entry) => ({
          Film: entry.filmTitle,
          Year: entry.filmYear ?? '-',
          Type: entry.filmType ?? '-',
          'TMDB Title': entry.tmdbTitle,
          'TMDB Year': entry.tmdbYear ?? '-',
          'TMDB ID': entry.tmdbId,
          Media: entry.mediaType,
        }))
      );
    }

    console.log('\n=====================================================');
    console.log('SUMMARY COUNTS');
    console.log('=====================================================');
    console.log(`Execution Mode:                    ${isApply ? 'APPLY (WROTE CHANGES)' : 'DRY-RUN (NO CHANGES MADE)'}`);
    console.log(`Films scanned:                     ${summary.scanned}`);
    console.log(`Already had tmdbId:                ${summary.alreadyHadTmdbId}`);
    console.log(`Confident matches:                 ${summary.confident}`);
    console.log(`Ambiguous matches:                 ${summary.ambiguous}`);
    console.log(`Not found:                         ${summary.notFound}`);
    console.log(`Duplicate TMDB IDs (skipped):      ${summary.duplicates}`);
    console.log(`Errors:                            ${summary.errors}`);
    console.log(`TMDB requests made:                ${requestCount}`);

    const report: FillReport = {
      generatedAt: new Date().toISOString(),
      mode: isApply ? 'apply' : 'dry-run',
      summary,
      confident: confidentReport,
      ambiguous: ambiguousMatches,
      notFound,
      duplicates: duplicateReport,
      errors,
    };

    await writeReportFile(report);

    if (isApply && writable.length > 0) {
      let written = 0;
      for (let i = 0; i < writable.length; i += BATCH_SIZE) {
        const chunk = writable.slice(i, i + BATCH_SIZE);
        const batch = db.batch();
        chunk.forEach(({ film, candidate }) => {
          // Only the `tmdbId` field is modified.
          batch.update(db.collection('films').doc(film.id), { tmdbId: Number(candidate.id) });
        });
        await batch.commit();
        written += chunk.length;
        console.log(`Committed batch: ${written}/${writable.length} documents updated.`);
      }
      console.log(`\nApply complete: ${written} tmdbId values written.`);
    } else if (isApply) {
      console.log('\nNothing to write; no confident, non-duplicate matches.');
    } else {
      console.log('\nDry-run complete. Re-run with --apply to write these tmdbId values.');
    }

    console.log('=====================================================\n');
    process.exit(0);
  } catch (err: any) {
    console.error('[Fill TMDB IDs Error] Fatal error:', err);
    process.exit(1);
  }
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (invokedDirectly) {
  fillTmdbIds()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('Unhandled failure:', err);
      process.exit(1);
    });
}
