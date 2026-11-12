import {
  FILMS_CACHE_KEY,
  FILMS_CACHE_TS_KEY,
  FILMS_CACHE_TTL_MS,
  FILMS_CACHE_MAX_CHARS,
  projectFilmsForCache,
  writeFilmsCache,
  readFilmsCache,
  type FilmsCacheStorage,
} from '../src/utils/filmsCache';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed++;
    console.log(`[PASS] ${message}`);
  } else {
    failed++;
    console.error(`[FAIL] ${message}`);
  }
}

/** In-memory Storage that can be told to throw QuotaExceededError per key. */
class FakeStorage implements FilmsCacheStorage {
  private map = new Map<string, string>();
  failOnSet = new Set<string>();

  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }

  setItem(key: string, value: string): void {
    if (this.failOnSet.has(key)) {
      const err = new Error('The quota has been exceeded');
      err.name = 'QuotaExceededError';
      throw err;
    }
    this.map.set(key, value);
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  has(key: string): boolean {
    return this.map.has(key);
  }
}

const NOW = 1_700_000_000_000;

const baseFilm: any = {
  id: 'f1',
  slug: 'film-satu',
  title: 'Film Satu',
  type: 'movie',
  year: 2024,
  poster: 'https://img/poster.jpg',
  backdrop: 'https://img/backdrop.jpg',
  synopsis: 'Sinopsis lengkap film satu.',
  director: 'Sutradara Satu',
  cast: ['Aktor A', 'Aktor B'],
  castDetails: [{ name: 'Aktor A', character: 'Raka', photo: 'https://img/a.jpg' }],
  crewDetails: [{ name: 'Crew C', job: 'Director', department: 'Directing', photo: 'https://img/c.jpg' }],
  genres: ['Drama'],
  tags: ['tag-1'],
  skorSotoy: 8.0,
  totalVotes: 10,
  criticsSkorSotoy: 8.0,
  whereToWatch: [{ platform: 'Netflix', type: 'stream', badgeColor: '#E50914', source: 'tmdb' }],
  stills: ['https://img/s1.jpg', 'https://img/s2.jpg'],
  scoreScale: 10,
  trendingRank: 1,
};

console.log('=== Running filmsCache Tests ===\n');

// ---------------------------------------------------------------------------
// 1. projection drops exactly the three heavy fields, keeps synopsis,
//    sets detailsDeferred, never mutates the input
// ---------------------------------------------------------------------------
{
  const input = [baseFilm, { ...baseFilm, id: 'f2', slug: 'film-dua', title: 'Film Dua' }];
  const snapshot = JSON.stringify(input);
  const projected = projectFilmsForCache(input as any);

  assert(JSON.stringify(input) === snapshot, 'projection does not mutate the input array/objects');
  assert(projected.length === 2, 'projection returns one object per input film');
  assert(projected !== input && projected[0] !== input[0], 'projection returns NEW objects');
  assert(projected.every(f => !('castDetails' in f)), 'projection drops castDetails');
  assert(projected.every(f => !('crewDetails' in f)), 'projection drops crewDetails');
  assert(projected.every(f => !('stills' in f)), 'projection drops stills');
  assert(projected.every(f => f.synopsis === 'Sinopsis lengkap film satu.'), 'projection keeps synopsis');
  assert(projected.every(f => Array.isArray(f.cast) && f.cast.length === 2), 'projection keeps cast');
  assert(
    projected.every(f => Array.isArray(f.whereToWatch) && f.whereToWatch.length === 1),
    'projection keeps whereToWatch'
  );
  assert(projected.every(f => f.detailsDeferred === true), 'projection sets detailsDeferred: true');
  assert(projected.every(f => f.id && f.title && f.skorSotoy === 8.0), 'projection keeps every other field');
}

// ---------------------------------------------------------------------------
// 2. write ok path stores both keys; read round-trips it
// ---------------------------------------------------------------------------
{
  const storage = new FakeStorage();
  const result = writeFilmsCache(storage, [baseFilm], NOW);
  assert(result.ok === true, 'writeFilmsCache returns ok on success');
  assert(result.chars === storage.getItem(FILMS_CACHE_KEY)!.length, 'result.chars matches serialized size');
  assert(storage.has(FILMS_CACHE_KEY) && storage.has(FILMS_CACHE_TS_KEY), 'write stores both keys');
  assert(storage.getItem(FILMS_CACHE_TS_KEY) === String(NOW), 'ts key stores the provided now');

  const read = readFilmsCache(storage, NOW + 1000);
  assert(read !== null, 'read returns the freshly written cache');
  assert(read!.ts === NOW, 'read returns the stored ts');
  assert(read!.films.length === 1 && read!.films[0].id === 'f1', 'read returns the films');
  assert(read!.films[0].detailsDeferred === true, 'read marks every film detailsDeferred');
  assert(!('stills' in read!.films[0]), 'read-back films carry no stills (projection happened at write)');
  assert(read!.films[0].synopsis === 'Sinopsis lengkap film satu.', 'read-back films keep synopsis');
}

// ---------------------------------------------------------------------------
// 3. read returns null when either key is missing
// ---------------------------------------------------------------------------
{
  const s1 = new FakeStorage();
  writeFilmsCache(s1, [baseFilm], NOW);
  s1.removeItem(FILMS_CACHE_TS_KEY);
  assert(readFilmsCache(s1, NOW + 1000) === null, 'read returns null when the ts key is missing');

  const s2 = new FakeStorage();
  writeFilmsCache(s2, [baseFilm], NOW);
  s2.removeItem(FILMS_CACHE_KEY);
  assert(readFilmsCache(s2, NOW + 1000) === null, 'read returns null when the data key is missing');
}

// ---------------------------------------------------------------------------
// 4. read returns null for an invalid ts
// ---------------------------------------------------------------------------
{
  const storage = new FakeStorage();
  storage.setItem(FILMS_CACHE_KEY, JSON.stringify({ films: [baseFilm] }));
  storage.setItem(FILMS_CACHE_TS_KEY, 'not-a-number');
  assert(readFilmsCache(storage, NOW + 1000) === null, 'read returns null for a non-numeric ts');

  storage.setItem(FILMS_CACHE_TS_KEY, '1700000000abc');
  assert(readFilmsCache(storage, NOW + 1000) === null, 'read returns null for a partially numeric ts');

  storage.setItem(FILMS_CACHE_TS_KEY, '0');
  assert(readFilmsCache(storage, NOW + 1000) === null, 'read returns null for a zero ts');
}

// ---------------------------------------------------------------------------
// 5. read returns null when ts is older than the TTL
// ---------------------------------------------------------------------------
{
  const storage = new FakeStorage();
  writeFilmsCache(storage, [baseFilm], NOW);
  assert(readFilmsCache(storage, NOW + FILMS_CACHE_TTL_MS) !== null, 'read accepts a cache exactly at TTL');
  assert(
    readFilmsCache(storage, NOW + FILMS_CACHE_TTL_MS + 1) === null,
    'read returns null one millisecond past the TTL'
  );
}

// ---------------------------------------------------------------------------
// 6. corrupt JSON is removed and both keys are gone afterwards
// ---------------------------------------------------------------------------
{
  const storage = new FakeStorage();
  storage.setItem(FILMS_CACHE_KEY, '{"films": [oops');
  storage.setItem(FILMS_CACHE_TS_KEY, String(NOW));
  assert(readFilmsCache(storage, NOW + 1000) === null, 'read returns null for corrupt JSON');
  assert(!storage.has(FILMS_CACHE_KEY) && !storage.has(FILMS_CACHE_TS_KEY), 'corrupt JSON removes both keys');
}

// ---------------------------------------------------------------------------
// 7. invalid shapes (non-object entries / wrong root / empty) are rejected
// ---------------------------------------------------------------------------
{
  const storage = new FakeStorage();
  storage.setItem(FILMS_CACHE_KEY, JSON.stringify({ films: [baseFilm, null] }));
  storage.setItem(FILMS_CACHE_TS_KEY, String(NOW));
  assert(readFilmsCache(storage, NOW + 1000) === null, 'read returns null when an entry is not an object');
  assert(!storage.has(FILMS_CACHE_KEY) && !storage.has(FILMS_CACHE_TS_KEY), 'non-object entries remove both keys');

  const s2 = new FakeStorage();
  s2.setItem(FILMS_CACHE_KEY, '"just a string"');
  s2.setItem(FILMS_CACHE_TS_KEY, String(NOW));
  assert(readFilmsCache(s2, NOW + 1000) === null, 'read returns null for a non-array root');

  const s3 = new FakeStorage();
  s3.setItem(FILMS_CACHE_KEY, JSON.stringify({ films: [] }));
  s3.setItem(FILMS_CACHE_TS_KEY, String(NOW));
  assert(readFilmsCache(s3, NOW + 1000) === null, 'read returns null for an empty films array');
}

// ---------------------------------------------------------------------------
// 8. quota error on the DATA write removes BOTH keys and returns ok false
// ---------------------------------------------------------------------------
{
  const storage = new FakeStorage();
  // Old valid pair already in storage:
  writeFilmsCache(storage, [baseFilm], NOW - FILMS_CACHE_TTL_MS / 2);
  assert(storage.has(FILMS_CACHE_KEY) && storage.has(FILMS_CACHE_TS_KEY), 'precondition: old pair stored');

  storage.failOnSet.add(FILMS_CACHE_KEY);
  const result = writeFilmsCache(storage, [baseFilm], NOW);
  assert(result.ok === false, 'quota error on data write returns ok false');
  assert(result.reason === 'QuotaExceededError', 'reason is the error name');
  assert(
    !storage.has(FILMS_CACHE_KEY) && !storage.has(FILMS_CACHE_TS_KEY),
    'quota error on data write removes BOTH keys (old pair gone)'
  );
  assert(readFilmsCache(storage, NOW) === null, 'nothing hydrates after the failed write');
}

// ---------------------------------------------------------------------------
// 9. ts-write failure also removes BOTH keys (no data without a fresh ts)
// ---------------------------------------------------------------------------
{
  const storage = new FakeStorage();
  storage.failOnSet.add(FILMS_CACHE_TS_KEY);
  const result = writeFilmsCache(storage, [baseFilm], NOW);
  assert(result.ok === false, 'ts-write failure returns ok false');
  assert(result.reason === 'QuotaExceededError', 'ts-write failure reason is the error name');
  assert(
    !storage.has(FILMS_CACHE_KEY) && !storage.has(FILMS_CACHE_TS_KEY),
    'ts-write failure removes BOTH keys (no orphaned data key)'
  );
}

// ---------------------------------------------------------------------------
// 10. too-large payload is not written and removes both keys
// ---------------------------------------------------------------------------
{
  const storage = new FakeStorage();
  writeFilmsCache(storage, [baseFilm], NOW - FILMS_CACHE_TTL_MS / 2);
  assert(storage.has(FILMS_CACHE_KEY), 'precondition: old pair stored');

  const hugeFilm = { ...baseFilm, id: 'huge', synopsis: 'x'.repeat(FILMS_CACHE_MAX_CHARS + 100_000) };
  const result = writeFilmsCache(storage, [hugeFilm], NOW);
  assert(result.ok === false, 'too-large payload returns ok false');
  assert(result.reason === 'too-large', 'too-large payload reason is "too-large"');
  assert(result.chars > FILMS_CACHE_MAX_CHARS, 'result.chars reflects the oversized payload');
  assert(!storage.has(FILMS_CACHE_KEY) && !storage.has(FILMS_CACHE_TS_KEY), 'too-large removes both keys');
  assert(readFilmsCache(storage, NOW) === null, 'nothing hydrates after the too-large write');
}

// ---------------------------------------------------------------------------
// 11. bare-array legacy format is still readable
// ---------------------------------------------------------------------------
{
  const storage = new FakeStorage();
  storage.setItem(FILMS_CACHE_KEY, JSON.stringify([baseFilm]));
  storage.setItem(FILMS_CACHE_TS_KEY, String(NOW));
  const read = readFilmsCache(storage, NOW + 1000);
  assert(read !== null && read!.films.length === 1, 'legacy bare-array cache is readable');
  assert(read!.films[0].detailsDeferred === true, 'legacy films are marked detailsDeferred');
  assert(read!.ts === NOW, 'legacy read returns the stored ts');
}

console.log(`\nTest results: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
