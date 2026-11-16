import {
  normalizeRatingScore,
  computeFilmAggregate,
  type RatingScoreInput,
} from '../src/utils/filmRatings';

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

const rating = (score: number, overrides: Partial<RatingScoreInput> = {}): RatingScoreInput => ({
  score,
  scoreScale: 10,
  ...overrides,
});

const runTests = () => {
  console.log('Running Film Ratings Aggregate Tests...\n');

  // ---------------------------------------------------------------------------
  // normalizeRatingScore
  // ---------------------------------------------------------------------------
  assertEquals(normalizeRatingScore(rating(8.4)), 8.4, 'normalize: 10-scale score kept');
  assertEquals(normalizeRatingScore(rating(4.2, { scoreScale: undefined })), 8.4, 'normalize: legacy 5-scale doubled');
  assertEquals(normalizeRatingScore(rating(5.0, { scoreScale: undefined })), 10, 'normalize: legacy 5.0 doubled to 10');
  assertEquals(normalizeRatingScore(rating(4.2, { scoreScale: 5 })), 4.2, 'normalize: explicit scoreScale 5 is NOT doubled (undefined only is legacy)');
  assertEquals(normalizeRatingScore(rating(0, { scoreScale: undefined })), null, 'normalize: legacy 0 not doubled and rejected (< 1)');
  assertEquals(normalizeRatingScore(rating(5.1, { scoreScale: undefined })), 5.1, 'normalize: legacy > 5.0 kept as-is');
  assertEquals(normalizeRatingScore(rating(10.1)), null, 'normalize: > 10 rejected');
  assertEquals(normalizeRatingScore(rating(0.9)), null, 'normalize: < 1 rejected');
  assertEquals(normalizeRatingScore(rating(Number.NaN)), null, 'normalize: NaN rejected');
  assertEquals(normalizeRatingScore(rating(Number.POSITIVE_INFINITY)), null, 'normalize: Infinity rejected');
  assertEquals(normalizeRatingScore(rating('8' as unknown as number)), null, 'normalize: non-number rejected');
  assertEquals(normalizeRatingScore({}), null, 'normalize: missing score rejected');
  assertEquals(normalizeRatingScore(null), null, 'normalize: null rating rejected');
  assertEquals(normalizeRatingScore(undefined), null, 'normalize: undefined rating rejected');
  assertEquals(normalizeRatingScore('x' as unknown as RatingScoreInput), null, 'normalize: non-object rejected');

  // ---------------------------------------------------------------------------
  // computeFilmAggregate: normal mean
  // ---------------------------------------------------------------------------
  assertEquals(
    computeFilmAggregate([rating(9), rating(8), rating(7)]),
    { skorSotoy: 8, totalVotes: 3, scoreScale: 10 },
    'aggregate: normal mean of three 10-scale ratings'
  );
  assertEquals(
    computeFilmAggregate([rating(8.3), rating(8.4)]),
    { skorSotoy: 8.4, totalVotes: 2, scoreScale: 10 },
    'aggregate: mean rounded to 1 decimal (8.35 -> 8.4)'
  );
  assertEquals(
    computeFilmAggregate([rating(8.31), rating(8.33)]),
    { skorSotoy: 8.3, totalVotes: 2, scoreScale: 10 },
    'aggregate: mean rounded to 1 decimal (8.32 -> 8.3)'
  );

  // ---------------------------------------------------------------------------
  // computeFilmAggregate: legacy 5-scale docs are doubled before averaging
  // ---------------------------------------------------------------------------
  assertEquals(
    computeFilmAggregate([rating(4, { scoreScale: undefined }), rating(9)]),
    { skorSotoy: 8.5, totalVotes: 2, scoreScale: 10 },
    'aggregate: legacy 4/5 doubled to 8/10 then averaged with 9 -> 8.5'
  );
  assertEquals(
    computeFilmAggregate([rating(4.5, { scoreScale: undefined })]),
    { skorSotoy: 9, totalVotes: 1, scoreScale: 10 },
    'aggregate: single legacy rating doubled'
  );

  // ---------------------------------------------------------------------------
  // computeFilmAggregate: invalid scores ignored entirely (no votes)
  // ---------------------------------------------------------------------------
  assertEquals(
    computeFilmAggregate([rating(9), rating(Number.NaN), rating(0), rating(11), rating('x' as unknown as number)]),
    { skorSotoy: 9, totalVotes: 1, scoreScale: 10 },
    'aggregate: NaN/out-of-range/non-number docs ignored and not counted'
  );
  assertEquals(
    computeFilmAggregate([rating(Number.NaN), rating(-1)]),
    { skorSotoy: 0, totalVotes: 0, scoreScale: 10 },
    'aggregate: all-invalid docs -> 0/0/10'
  );
  assertEquals(
    computeFilmAggregate([null, undefined, {}] as unknown as RatingScoreInput[]),
    { skorSotoy: 0, totalVotes: 0, scoreScale: 10 },
    'aggregate: null/undefined/empty objects ignored'
  );

  // ---------------------------------------------------------------------------
  // computeFilmAggregate: zero and empty inputs
  // ---------------------------------------------------------------------------
  assertEquals(
    computeFilmAggregate([]),
    { skorSotoy: 0, totalVotes: 0, scoreScale: 10 },
    'aggregate: empty list -> 0/0/10'
  );
  assertEquals(
    computeFilmAggregate(null),
    { skorSotoy: 0, totalVotes: 0, scoreScale: 10 },
    'aggregate: null -> 0/0/10'
  );
  assertEquals(
    computeFilmAggregate(undefined),
    { skorSotoy: 0, totalVotes: 0, scoreScale: 10 },
    'aggregate: undefined -> 0/0/10'
  );

  // ---------------------------------------------------------------------------
  // computeFilmAggregate: one rating
  // ---------------------------------------------------------------------------
  assertEquals(
    computeFilmAggregate([rating(7.5)]),
    { skorSotoy: 7.5, totalVotes: 1, scoreScale: 10 },
    'aggregate: one rating is the aggregate itself'
  );

  // ---------------------------------------------------------------------------
  // computeFilmAggregate: duplicates from the same user all count
  // ---------------------------------------------------------------------------
  assertEquals(
    computeFilmAggregate([rating(6), rating(6), rating(9)]),
    { skorSotoy: 7, totalVotes: 3, scoreScale: 10 },
    'aggregate: duplicate docs (same user twice) all counted'
  );

  // ---------------------------------------------------------------------------
  // computeFilmAggregate: mixed critic / normal roles all counted
  // ---------------------------------------------------------------------------
  assertEquals(
    computeFilmAggregate([
      { ...rating(9), userRole: 'si_paling_sotoy' },
      { ...rating(7), userRole: 'warga_sotoy' },
    ] as RatingScoreInput[]),
    { skorSotoy: 8, totalVotes: 2, scoreScale: 10 },
    'aggregate: critic and normal reviews all counted (no role split)'
  );

  // ---------------------------------------------------------------------------
  // computeFilmAggregate: clamped to 0..10
  // ---------------------------------------------------------------------------
  assertEquals(
    computeFilmAggregate([rating(10), rating(10)]),
    { skorSotoy: 10, totalVotes: 2, scoreScale: 10 },
    'aggregate: mean 10 stays 10'
  );

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
};

runTests();
