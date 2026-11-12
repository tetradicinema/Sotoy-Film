import { createMovieSchemaFromFilm } from '../src/utils/schemaHelpers';
import type { FilmItem } from '../src/types';

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
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  assert(same, `${message} (expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)})`);
};

const createFilm = (overrides: Partial<FilmItem> = {}): FilmItem => ({
  id: 'film-test',
  title: 'Test Film',
  type: 'movie',
  year: 2026,
  poster: '',
  backdrop: '',
  synopsis: '',
  director: '',
  cast: [],
  genres: [],
  skorSotoy: 8.0,
  totalVotes: 0,
  criticsSkorSotoy: 8.0,
  whereToWatch: [],
  scoreScale: 10,
  ...overrides,
});

const realReviews = [
  { userName: 'Warga A', reviewText: 'Bagus sekali.', score: 9, createdAt: '2026-01-01T00:00:00.000Z' },
  { userName: 'Warga B', reviewText: 'Solid.', score: 8, createdAt: '2026-01-02T00:00:00.000Z' },
  { userName: 'Warga C', reviewText: 'Menarik.', score: 7, createdAt: '2026-01-03T00:00:00.000Z' },
];

const runTests = () => {
  console.log('Running Rating Schema Tests...\n');

  // ---------------------------------------------------------------------------
  // aggregateRating: fabricated evidence must never be emitted
  // ---------------------------------------------------------------------------
  const noVotesNoReviews = createMovieSchemaFromFilm(
    createFilm({ skorSotoy: 8.0, totalVotes: 0 })
  );
  assertEquals(
    noVotesNoReviews.aggregateRating,
    undefined,
    '0 reviews and totalVotes 0 -> no aggregateRating'
  );

  const legacySeed = createMovieSchemaFromFilm(
    createFilm({ skorSotoy: 8.0, totalVotes: 1 })
  );
  assertEquals(
    legacySeed.aggregateRating,
    undefined,
    'legacy totalVotes 1 with 0 reviews -> no aggregateRating'
  );

  const zeroScore = createMovieSchemaFromFilm(
    createFilm({ skorSotoy: 0, totalVotes: 3 })
  );
  assertEquals(
    zeroScore.aggregateRating,
    undefined,
    'skorSotoy 0 -> no aggregateRating'
  );

  // ---------------------------------------------------------------------------
  // aggregateRating: real evidence emits the real counts
  // ---------------------------------------------------------------------------
  const withReviews = createMovieSchemaFromFilm(
    createFilm({ skorSotoy: 8.0, totalVotes: 3 }),
    { reviews: realReviews }
  );
  assert(
    withReviews.aggregateRating !== undefined,
    'real reviews present -> aggregateRating emitted'
  );
  assertEquals(
    withReviews.aggregateRating?.ratingCount,
    3,
    'real reviews present -> ratingCount is the real vote count'
  );
  assertEquals(
    withReviews.aggregateRating?.reviewCount,
    3,
    'real reviews present -> reviewCount is the real review count'
  );
  assertEquals(
    withReviews.aggregateRating?.ratingValue,
    8.0,
    'real reviews present -> ratingValue is the real score'
  );

  const votesOnly = createMovieSchemaFromFilm(
    createFilm({ skorSotoy: 7.5, totalVotes: 4 })
  );
  assert(
    votesOnly.aggregateRating !== undefined,
    'totalVotes > 1 with 0 review docs -> aggregateRating emitted'
  );
  assertEquals(
    votesOnly.aggregateRating?.ratingCount,
    4,
    'totalVotes > 1 with 0 review docs -> ratingCount is the real vote count'
  );
  assertEquals(
    votesOnly.aggregateRating?.reviewCount,
    undefined,
    'totalVotes > 1 with 0 review docs -> reviewCount omitted, never faked'
  );

  // ---------------------------------------------------------------------------
  // director: empty director must not fabricate 'Sutradara'
  // ---------------------------------------------------------------------------
  assertEquals(
    createMovieSchemaFromFilm(createFilm({ director: '' })).director,
    undefined,
    'empty director -> no director property'
  );
  assertEquals(
    createMovieSchemaFromFilm(createFilm({ director: 'Denis Villeneuve' })).director,
    { '@type': 'Person', name: 'Denis Villeneuve' },
    'real director -> director property kept'
  );

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
};

runTests();
