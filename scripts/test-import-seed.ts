/**
 * Import Seed Tests
 *
 * Asserts the seed values written by `buildImportFilm` (the daily TMDB import,
 * `scripts/import-tmdb-daily.ts`):
 * - `totalVotes` is always 0 — only real reviews build the vote count; TMDB's
 *   vote_count is never copied into it.
 * - `skorSotoy` mirrors the TMDB vote_average only when the title has at least
 *   `IMPORT_CONFIG.minVoteCount` votes; otherwise it is 0 (no fabricated
 *   fallback number).
 * - `criticsSkorSotoy` always equals `skorSotoy`.
 * - `scoreScale` is 10, so the legacy read-time doubling in
 *   AppContext.refreshFilms never applies to imported docs.
 */
import { buildImportFilm } from '../src/utils/tmdbImport';

let passed = 0;
let failed = 0;

const assert = (condition: boolean, message: string) => {
  if (condition) {
    passed++;
    console.log(`✓ ${message}`);
  } else {
    failed++;
    console.error(`✗ ${message}`);
  }
};

const assertEquals = (actual: any, expected: any, message: string) => {
  const same = actual === expected;
  assert(same, `${message} (expected: ${expected}, got: ${actual})`);
};

/** Minimal TMDB details response that passes buildImportFilm's guards. */
const makeDetails = (overrides: Record<string, any> = {}): any => ({
  id: 550,
  title: 'Test Film',
  original_title: 'Test Film Original',
  overview: 'A test synopsis.',
  poster_path: '/poster.jpg',
  backdrop_path: '/backdrop.jpg',
  release_date: '2024-01-01',
  runtime: 120,
  genres: [{ id: 18, name: 'Drama' }],
  vote_average: 7.4,
  vote_count: 500,
  credits: { cast: [], crew: [] },
  videos: { results: [] },
  ...overrides,
});

const build = (overrides: Record<string, any> = {}) =>
  buildImportFilm(makeDetails(overrides), 'movie', new Set<string>(), new Date('2026-01-01T00:00:00Z'));

const runTests = () => {
  console.log('Running TMDB Import Seed Tests...\n');

  // -------------------------------------------------------------------------
  // 1. No TMDB votes at all: score 0, votes 0
  // -------------------------------------------------------------------------
  console.log('--- Suite 1: vote_count 0 -> no score, no votes ---');
  {
    const result = build({ vote_count: 0, vote_average: 6.1 });
    assert(result.ok, 'vote_count 0 -> film is still built');
    if (result.ok) {
      assertEquals(result.film.totalVotes, 0, 'vote_count 0 -> totalVotes 0');
      assertEquals(result.film.skorSotoy, 0, 'vote_count 0 -> skorSotoy 0 (no fabricated fallback)');
    }
  }

  // -------------------------------------------------------------------------
  // 2. Below minVoteCount (5): score 0 even with a high vote_average
  // -------------------------------------------------------------------------
  console.log('--- Suite 2: vote_count 3 with vote_average 9 -> no score ---');
  {
    const result = build({ vote_count: 3, vote_average: 9 });
    assert(result.ok, 'vote_count 3 -> film is still built (quality filter is not re-applied here)');
    if (result.ok) {
      assertEquals(result.film.skorSotoy, 0, 'vote_count 3 -> skorSotoy 0');
      assertEquals(result.film.totalVotes, 0, 'vote_count 3 -> totalVotes 0');
    }
  }

  // -------------------------------------------------------------------------
  // 3. Enough votes: score mirrors the TMDB vote_average, votes stay 0
  // -------------------------------------------------------------------------
  console.log('--- Suite 3: vote_count 500 with vote_average 7.4 -> real score ---');
  {
    const result = build({ vote_count: 500, vote_average: 7.4 });
    assert(result.ok, 'vote_count 500 -> film is built');
    if (result.ok) {
      assertEquals(result.film.skorSotoy, 7.4, 'vote_count 500 -> skorSotoy is the TMDB vote_average');
      assertEquals(result.film.totalVotes, 0, 'vote_count 500 -> totalVotes is still 0');
    }
  }

  // -------------------------------------------------------------------------
  // 4. criticsSkorSotoy always equals skorSotoy
  // -------------------------------------------------------------------------
  console.log('--- Suite 4: criticsSkorSotoy equals skorSotoy ---');
  {
    const cases = [
      { vote_count: 0, vote_average: 6.1 },
      { vote_count: 3, vote_average: 9 },
      { vote_count: 500, vote_average: 7.4 },
    ];
    for (const item of cases) {
      const result = build(item);
      if (result.ok) {
        assertEquals(
          result.film.criticsSkorSotoy,
          result.film.skorSotoy,
          `criticsSkorSotoy equals skorSotoy (vote_count ${item.vote_count})`
        );
      } else {
        assert(false, `criticsSkorSotoy equals skorSotoy (vote_count ${item.vote_count}) -> film failed to build`);
      }
    }
  }

  // -------------------------------------------------------------------------
  // 5. scoreScale is 10 on every imported doc
  // -------------------------------------------------------------------------
  console.log('--- Suite 5: scoreScale 10 (no legacy read-time doubling) ---');
  {
    const cases = [
      { vote_count: 0, vote_average: 6.1 },
      { vote_count: 3, vote_average: 9 },
      { vote_count: 500, vote_average: 7.4 },
    ];
    for (const item of cases) {
      const result = build(item);
      if (result.ok) {
        assertEquals(result.film.scoreScale, 10, `scoreScale is 10 (vote_count ${item.vote_count})`);
      } else {
        assert(false, `scoreScale is 10 (vote_count ${item.vote_count}) -> film failed to build`);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
};

runTests();
