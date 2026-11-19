import {
  MIN_AGGREGATE_VOTES,
  resolveAggregateRating,
  type AggregateRatingInput,
} from '../src/utils/aggregateRating.js';
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

const validInput = (overrides: Partial<AggregateRatingInput> = {}): AggregateRatingInput => ({
  skorSotoy: 8.0,
  scoreScale: 10,
  totalVotes: 3,
  ...overrides,
});

const runTests = () => {
  console.log('Running Rating Schema Tests...\n');

  // ---------------------------------------------------------------------------
  // Shared helper: invalid scores are never marked up
  // ---------------------------------------------------------------------------
  assertEquals(
    resolveAggregateRating(validInput({ skorSotoy: 0 })),
    null,
    'score 0 -> null'
  );
  assertEquals(
    resolveAggregateRating(validInput({ skorSotoy: 0.5 })),
    null,
    'score 0.5 on the 10-point scale -> null'
  );
  assertEquals(
    resolveAggregateRating(validInput({ skorSotoy: 11 })),
    null,
    'score 11 -> null'
  );
  assertEquals(
    resolveAggregateRating(validInput({ skorSotoy: NaN })),
    null,
    'score NaN -> null'
  );
  assertEquals(
    resolveAggregateRating(validInput({ skorSotoy: Infinity })),
    null,
    'score Infinity -> null'
  );

  // ---------------------------------------------------------------------------
  // Shared helper: invalid vote evidence is never marked up
  // ---------------------------------------------------------------------------
  for (const totalVotes of [0, 1, 2, undefined, NaN, -1, 3.5]) {
    assertEquals(
      resolveAggregateRating(validInput({ totalVotes })),
      null,
      `totalVotes ${String(totalVotes)} -> null`
    );
  }

  assertEquals(
    MIN_AGGREGATE_VOTES,
    3,
    'MIN_AGGREGATE_VOTES is 3'
  );
  assertEquals(
    resolveAggregateRating(validInput()),
    {
      '@type': 'AggregateRating',
      ratingValue: 8.0,
      bestRating: 10,
      worstRating: 1,
      ratingCount: 3,
    },
    '3 votes emits numeric best/worst and no reviewCount'
  );

  assertEquals(
    resolveAggregateRating(validInput({ reviewCount: 2 })),
    {
      '@type': 'AggregateRating',
      ratingValue: 8.0,
      bestRating: 10,
      worstRating: 1,
      ratingCount: 3,
      reviewCount: 2,
    },
    'real reviewCount is added when provided'
  );
  assertEquals(
    resolveAggregateRating(validInput({ reviewCount: 0 }))?.reviewCount,
    undefined,
    'reviewCount 0 is omitted rather than advertised'
  );

  // ---------------------------------------------------------------------------
  // Shared helper: legacy 5-scale docs use the visible doubled value
  // ---------------------------------------------------------------------------
  assertEquals(
    resolveAggregateRating({
      skorSotoy: 4.6,
      scoreScale: undefined,
      totalVotes: 3,
    }),
    {
      '@type': 'AggregateRating',
      ratingValue: 9.2,
      bestRating: 10,
      worstRating: 1,
      ratingCount: 3,
    },
    'legacy 4.6 without scoreScale + 3 votes -> ratingValue 9.2'
  );

  // ---------------------------------------------------------------------------
  // createMovieSchemaFromFilm: reviews no longer bypass the vote guard
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

  const twoVotes = createMovieSchemaFromFilm(
    createFilm({ skorSotoy: 8.0, totalVotes: 2 })
  );
  assertEquals(
    twoVotes.aggregateRating,
    undefined,
    'totalVotes 2 with 0 reviews -> no aggregateRating'
  );

  const zeroScore = createMovieSchemaFromFilm(
    createFilm({ skorSotoy: 0, totalVotes: 3 })
  );
  assertEquals(
    zeroScore.aggregateRating,
    undefined,
    'skorSotoy 0 -> no aggregateRating'
  );

  const reviewsWithoutVotes = createMovieSchemaFromFilm(
    createFilm({ skorSotoy: 8.0, totalVotes: 0 }),
    { reviews: realReviews }
  );
  assertEquals(
    reviewsWithoutVotes.aggregateRating,
    undefined,
    '3 review docs with totalVotes 0 -> still no aggregateRating'
  );
  assertEquals(
    reviewsWithoutVotes.review?.length,
    3,
    'Review entries are kept even when aggregateRating is omitted'
  );

  const legacyFilm = createMovieSchemaFromFilm(
    createFilm({ skorSotoy: 4.6, scoreScale: undefined, totalVotes: 3 })
  );
  assertEquals(
    legacyFilm.aggregateRating?.ratingValue,
    9.2,
    'legacy film schema ratingValue matches the visible doubled score'
  );

  const withReviews = createMovieSchemaFromFilm(
    createFilm({ skorSotoy: 8.0, totalVotes: 3 }),
    { reviews: realReviews }
  );
  assert(
    withReviews.aggregateRating !== undefined,
    'real reviews plus 3 votes -> aggregateRating emitted'
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
    '4 votes with 0 review docs -> aggregateRating emitted'
  );
  assertEquals(
    votesOnly.aggregateRating?.ratingCount,
    4,
    '4 votes with 0 review docs -> ratingCount is the real vote count'
  );
  assertEquals(
    votesOnly.aggregateRating?.reviewCount,
    undefined,
    '4 votes with 0 review docs -> reviewCount omitted, never faked'
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
