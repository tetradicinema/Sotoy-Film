/**
 * Regression test: admin film updates must always stamp the document `id`.
 *
 * Background: `updateFilm` writes with updateDoc(), which merges only the
 * changed fields into the existing document. Legacy film docs created before
 * the `id` field existed (e.g. films/film-tmdb-movie-1616419) therefore stayed
 * without `id`, and firestore.rules isValidFilmItem() — which requires
 * id/title/type/year/genres — rejected every admin save with
 * "Missing or insufficient permissions".
 *
 * This test is fully pure and offline:
 *   1. Source guard: asserts updateFilm() stamps `id` after the JSON clone and
 *      after the detailsDeferred strip, and mirrors that in the local merge.
 *   2. Semantics: runs the same merge pipeline against a legacy doc fixture to
 *      prove the resulting document satisfies the rules' field requirements.
 *
 * It never contacts Firestore.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = '') {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// --- 1. Source guard -------------------------------------------------------

const here = path.dirname(fileURLToPath(import.meta.url));
const contextPath = path.resolve(here, '../src/context/AppContext.tsx');
const source = fs.readFileSync(contextPath, 'utf8');

function extractUpdateFilm(src: string): string {
  const start = src.indexOf('const updateFilm = async (');
  if (start === -1) throw new Error('updateFilm definition not found in AppContext.tsx');
  const end = src.indexOf('\n  const deleteFilm = async', start);
  if (end === -1) throw new Error('end of updateFilm (deleteFilm) not found in AppContext.tsx');
  return src.slice(start, end);
}

const updateFilmBody = extractUpdateFilm(source);

const guardIndex = updateFilmBody.indexOf('existingFilm?.detailsDeferred');
const stripIndex = updateFilmBody.indexOf('detailsDeferred: _deferredMarker');
const stampIndex = updateFilmBody.indexOf('const sanitizedUpdates = { ...safeUpdates, id }');
const updateDocIndex = updateFilmBody.indexOf("updateDoc(doc(db, 'films', id), sanitizedUpdates)");
const localMergeIndex = updateFilmBody.indexOf('{ ...f, ...updates, id }');

console.log('updateFilm source guard:\n');

check('1. detailsDeferred safety guard is still present', guardIndex !== -1);
check('2. detailsDeferred is still stripped from the payload', stripIndex !== -1);
check('3. sanitizedUpdates is built as { ...safeUpdates, id }', stampIndex !== -1);
check('4. updateDoc receives the stamped sanitizedUpdates', updateDocIndex !== -1);
check('5. local setFilms merge also stamps id', localMergeIndex !== -1);

check(
  '6. id is stamped after the JSON clone / detailsDeferred strip',
  stripIndex !== -1 && stampIndex !== -1 && stripIndex < stampIndex
);
check(
  '7. id is stamped before updateDoc is called',
  stampIndex !== -1 && updateDocIndex !== -1 && stampIndex < updateDocIndex
);
check(
  '8. id stamp wins over caller-supplied values (spread last)',
  /const sanitizedUpdates = \{ \.\.\.safeUpdates, id \}/.test(updateFilmBody)
);
check(
  '9. detailsDeferred is never re-added to the payload',
  !/sanitizedUpdates\.detailsDeferred/.test(updateFilmBody)
);

// --- 2. Merge semantics ----------------------------------------------------

// Mirrors the updateFilm() pipeline exactly: clone -> strip detailsDeferred ->
// stamp the document id last.
function buildFilmUpdatePayload(id: string, updates: Record<string, any>) {
  const { detailsDeferred: _deferredMarker, ...safeUpdates } = JSON.parse(
    JSON.stringify(updates)
  ) as Record<string, any> & { detailsDeferred?: boolean };
  void _deferredMarker;
  return { ...safeUpdates, id };
}

// Required by firestore.rules isValidFilmItem(incoming()).
const REQUIRED_FILM_FIELDS = ['id', 'title', 'type', 'year', 'genres'];

function satisfiesFilmItemRule(doc: Record<string, any>) {
  return REQUIRED_FILM_FIELDS.every(field => doc[field] !== undefined && doc[field] !== null);
}

console.log('\nMerge semantics on a legacy doc (no id field):\n');

const legacyDoc: Record<string, any> = {
  title: 'Siksa Kubur',
  type: 'movie',
  year: 2024,
  genres: ['Horror', 'Drama'],
  slug: 'siksa-kubur',
};

check('10. legacy fixture really lacks id', !('id' in legacyDoc));

const payload = buildFilmUpdatePayload('film-tmdb-movie-1616419', { title: 'Siksa Kubur (2024)' });
const merged = { ...legacyDoc, ...payload };

check('11. payload includes the document id', payload.id === 'film-tmdb-movie-1616419');
check('12. merged document now passes isValidFilmItem()', satisfiesFilmItemRule(merged));
check('13. merged id matches the doc path id', merged.id === 'film-tmdb-movie-1616419');
check('14. only intended fields changed', merged.title === 'Siksa Kubur (2024)' && merged.year === 2024);

const legacyWithoutId = buildFilmUpdatePayload('film-tmdb-movie-1616419', {
  id: 'should-be-overwritten',
  title: 'X',
});
check('15. caller-supplied id is overwritten by the document id', legacyWithoutId.id === 'film-tmdb-movie-1616419');

const slimUpdate = buildFilmUpdatePayload('film-1', {
  title: 'Y',
  detailsDeferred: true,
} as Record<string, any>);
check('16. detailsDeferred never reaches Firestore', !('detailsDeferred' in slimUpdate));
check('17. other fields survive the pipeline', slimUpdate.title === 'Y');

const original = { title: 'A', detailsDeferred: true };
buildFilmUpdatePayload('film-2', original);
check('18. caller object is not mutated', original.detailsDeferred === true && Object.keys(original).length === 2);

const mergedTv = { ...{ title: 'Series', type: 'series', year: 2022, genres: ['Drama'] }, ...buildFilmUpdatePayload('film-3', {}) };
check('19. an empty update set still yields a valid document', satisfiesFilmItemRule(mergedTv));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
