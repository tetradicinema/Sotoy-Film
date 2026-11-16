import {
  normalizeRatingScore,
  normalizeBaseScore,
  computeFilmAggregate,
  type RatingScoreInput,
  type FilmRatingAggregate,
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

// Key order matches FilmRatingAggregate so JSON comparison is exact.
const agg = (
  skorSotoy: number,
  totalVotes: number,
  criticsSkorSotoy: number,
  criticVotes: number
): FilmRatingAggregate => ({
  skorSotoy,
  totalVotes,
  criticsSkorSotoy,
  criticVotes,
  scoreScale: 10,
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
  // normalizeBaseScore
  // ---------------------------------------------------------------------------
  assertEquals(normalizeBaseScore(7.3), 7.3, 'base: valid value kept');
  assertEquals(normalizeBaseScore(0), 0, 'base: zero kept');
  assertEquals(normalizeBaseScore(11), 10, 'base: above 10 clamped to 10');
  assertEquals(normalizeBaseScore(-2), 0, 'base: negative clamped to 0');
  assertEquals(normalizeBaseScore(Number.NaN), 0, 'base: NaN -> 0');
  assertEquals(normalizeBaseScore(undefined), 0, 'base: undefined -> 0');
  assertEquals(normalizeBaseScore('9' as unknown as number), 0, 'base: non-number -> 0');

  // ---------------------------------------------------------------------------
  // computeFilmAggregate: community-only ratings
  // ---------------------------------------------------------------------------
  assertEquals(
    computeFilmAggregate([rating(9, { userRole: 'warga_sotoy' }), rating(8, { userRole: 'warga_sotoy' }), rating(7, { userRole: 'warga_sotoy' })]),
    agg(8, 3, 0, 0),
    'aggregate: community-only mean, critic side falls back to base 0'
  );
  assertEquals(
    computeFilmAggregate(
      [rating(9, { userRole: 'warga_sotoy' }), rating(8, { userRole: 'warga_sotoy' }), rating(7, { userRole: 'warga_sotoy' })],
      { baseSkorSotoy: 6, baseCriticsSkorSotoy: 8.1 }
    ),
    agg(8, 3, 8.1, 0),
    'aggregate: community mean ignores baseSkorSotoy; critic side uses base'
  );

  // ---------------------------------------------------------------------------
  // computeFilmAggregate: critic-only ratings (skorSotoy falls back to base)
  // ---------------------------------------------------------------------------
  assertEquals(
    computeFilmAggregate([rating(6.5, { userRole: 'si_paling_sotoy' })]),
    agg(0, 0, 6.5, 1),
    'aggregate: critic-only, no base -> skorSotoy 0, totalVotes 0'
  );
  assertEquals(
    computeFilmAggregate(
      [rating(6.5, { userRole: 'si_paling_sotoy' })],
      { baseSkorSotoy: 8, baseCriticsSkorSotoy: 8 }
    ),
    agg(8, 0, 6.5, 1),
    'aggregate: critic-only -> skorSotoy falls to baseSkorSotoy, totalVotes 0, critic mean 6.5'
  );
  assertEquals(
    computeFilmAggregate(
      [rating(6.5, { userRole: 'si_paling_sotoy' })],
      { baseCriticsSkorSotoy: 8 }
    ),
    agg(0, 0, 6.5, 1),
    'aggregate: critic-only with only a critic base still yields the real critic mean'
  );

  // ---------------------------------------------------------------------------
  // computeFilmAggregate: mixed critic / community ratings are split
  // ---------------------------------------------------------------------------
  assertEquals(
    computeFilmAggregate(
      [
        rating(9, { userRole: 'si_paling_sotoy' }),
        rating(7, { userRole: 'warga_sotoy' }),
        rating(8, { userRole: 'warga_sotoy' }),
      ],
      { baseSkorSotoy: 5, baseCriticsSkorSotoy: 5 }
    ),
    agg(7.5, 2, 9, 1),
    'aggregate: mixed -> community mean 7.5 (2 votes), critic mean 9 (1 vote)'
  );

  // ---------------------------------------------------------------------------
  // computeFilmAggregate: missing / non-critic roles count as community
  // ---------------------------------------------------------------------------
  assertEquals(
    computeFilmAggregate([rating(8), rating(6)]),
    agg(7, 2, 0, 0),
    'aggregate: userRole missing counts as community'
  );
  assertEquals(
    computeFilmAggregate([rating(8, { userRole: 'admin' }), rating(9, { userRole: 'penulis_sotoy' })]),
    agg(8.5, 2, 0, 0),
    'aggregate: admin and penulis_sotoy count as community (not critics)'
  );
  assertEquals(
    computeFilmAggregate([{ ...rating(8), userRole: null }, { ...rating(9), userRole: 42 }] as RatingScoreInput[]),
    agg(8.5, 2, 0, 0),
    'aggregate: null / non-string userRole counts as community'
  );

  // ---------------------------------------------------------------------------
  // computeFilmAggregate: empty sides restore the base
  // ---------------------------------------------------------------------------
  assertEquals(
    computeFilmAggregate([], { baseSkorSotoy: 7.2, baseCriticsSkorSotoy: 8.1 }),
    agg(7.2, 0, 8.1, 0),
    'aggregate: empty list -> both bases restored, 0 votes'
  );
  assertEquals(
    computeFilmAggregate(null, { baseSkorSotoy: 7.2, baseCriticsSkorSotoy: 8.1 }),
    agg(7.2, 0, 8.1, 0),
    'aggregate: null -> both bases restored'
  );
  assertEquals(
    computeFilmAggregate(undefined, { baseSkorSotoy: 7.2, baseCriticsSkorSotoy: 8.1 }),
    agg(7.2, 0, 8.1, 0),
    'aggregate: undefined -> both bases restored'
  );
  assertEquals(
    computeFilmAggregate([]),
    agg(0, 0, 0, 0),
    'aggregate: empty list with no bases -> all zero'
  );
  assertEquals(
    computeFilmAggregate(null),
    agg(0, 0, 0, 0),
    'aggregate: null with no bases -> all zero'
  );
  assertEquals(
    computeFilmAggregate(undefined),
    agg(0, 0, 0, 0),
    'aggregate: undefined with no bases -> all zero'
  );

  // ---------------------------------------------------------------------------
  // computeFilmAggregate: last critic removed -> critic base restored
  // ---------------------------------------------------------------------------
  assertEquals(
    computeFilmAggregate(
      [rating(7, { userRole: 'warga_sotoy' })],
      { baseSkorSotoy: 5, baseCriticsSkorSotoy: 8.1 }
    ),
    agg(7, 1, 8.1, 0),
    'aggregate: last critic removed -> critic side falls back to base'
  );
  assertEquals(
    computeFilmAggregate(
      [],
      { baseSkorSotoy: 5, baseCriticsSkorSotoy: 8.1 }
    ),
    agg(5, 0, 8.1, 0),
    'aggregate: all reviews deleted -> both bases restored'
  );

  // ---------------------------------------------------------------------------
  // computeFilmAggregate: last community review removed -> base restored
  // ---------------------------------------------------------------------------
  assertEquals(
    computeFilmAggregate(
      [rating(8.5, { userRole: 'si_paling_sotoy' })],
      { baseSkorSotoy: 6.5, baseCriticsSkorSotoy: 8 }
    ),
    agg(6.5, 0, 8.5, 1),
    'aggregate: last community review removed -> skorSotoy falls back to base, 0 votes'
  );

  // ---------------------------------------------------------------------------
  // computeFilmAggregate: legacy 5-scale docs are doubled before averaging
  // ---------------------------------------------------------------------------
  assertEquals(
    computeFilmAggregate(
      [rating(4, { scoreScale: undefined, userRole: 'warga_sotoy' }), rating(9, { userRole: 'warga_sotoy' })],
      { baseSkorSotoy: 3, baseCriticsSkorSotoy: 8.1 }
    ),
    agg(8.5, 2, 8.1, 0),
    'aggregate: legacy 4/5 doubled to 8/10 then averaged with 9 -> 8.5'
  );
  assertEquals(
    computeFilmAggregate([rating(4.5, { scoreScale: undefined, userRole: 'si_paling_sotoy' })], { baseSkorSotoy: 8 }),
    agg(8, 0, 9, 1),
    'aggregate: single legacy critic rating doubled (4.5 -> 9.0)'
  );

  // ---------------------------------------------------------------------------
  // computeFilmAggregate: invalid scores ignored entirely (no votes)
  // ---------------------------------------------------------------------------
  assertEquals(
    computeFilmAggregate(
      [rating(9, { userRole: 'warga_sotoy' }), rating(Number.NaN), rating(0), rating(11), rating('x' as unknown as number)],
      { baseSkorSotoy: 6, baseCriticsSkorSotoy: 8.1 }
    ),
    agg(9, 1, 8.1, 0),
    'aggregate: NaN/out-of-range/non-number docs ignored and not counted'
  );
  assertEquals(
    computeFilmAggregate([rating(Number.NaN), rating(-1)], { baseSkorSotoy: 6, baseCriticsSkorSotoy: 8.1 }),
    agg(6, 0, 8.1, 0),
    'aggregate: all-invalid docs -> bases restored, 0 votes'
  );
  assertEquals(
    computeFilmAggregate([null, undefined, {}] as unknown as RatingScoreInput[], { baseSkorSotoy: 6, baseCriticsSkorSotoy: 8.1 }),
    agg(6, 0, 8.1, 0),
    'aggregate: null/undefined/empty objects ignored'
  );

  // ---------------------------------------------------------------------------
  // computeFilmAggregate: one rating is the aggregate itself
  // ---------------------------------------------------------------------------
  assertEquals(
    computeFilmAggregate([rating(7.5)]),
    agg(7.5, 1, 0, 0),
    'aggregate: one community rating is the aggregate itself'
  );

  // ---------------------------------------------------------------------------
  // computeFilmAggregate: duplicates from the same user all count
  // ---------------------------------------------------------------------------
  assertEquals(
    computeFilmAggregate([rating(6, { userRole: 'warga_sotoy' }), rating(6, { userRole: 'warga_sotoy' }), rating(9, { userRole: 'warga_sotoy' })]),
    agg(7, 3, 0, 0),
    'aggregate: duplicate docs (same user twice) all counted'
  );
  assertEquals(
    computeFilmAggregate(
      [rating(6, { userRole: 'si_paling_sotoy' }), rating(9, { userRole: 'si_paling_sotoy' })],
      { baseSkorSotoy: 1, baseCriticsSkorSotoy: 1 }
    ),
    agg(1, 0, 7.5, 2),
    'aggregate: duplicate critic docs all counted -> mean 7.5'
  );

  // ---------------------------------------------------------------------------
  // computeFilmAggregate: rounding to 1 decimal, clamped to 0..10
  // ---------------------------------------------------------------------------
  assertEquals(
    computeFilmAggregate([rating(8.3, { userRole: 'warga_sotoy' }), rating(8.4, { userRole: 'warga_sotoy' })]),
    agg(8.4, 2, 0, 0),
    'aggregate: mean rounded to 1 decimal (8.35 -> 8.4)'
  );
  assertEquals(
    computeFilmAggregate([rating(8.31, { userRole: 'warga_sotoy' }), rating(8.33, { userRole: 'warga_sotoy' })]),
    agg(8.3, 2, 0, 0),
    'aggregate: mean rounded to 1 decimal (8.32 -> 8.3)'
  );
  assertEquals(
    computeFilmAggregate(
      [rating(9, { userRole: 'si_paling_sotoy' }), rating(8, { userRole: 'si_paling_sotoy' }), rating(8, { userRole: 'si_paling_sotoy' })],
      { baseSkorSotoy: 1, baseCriticsSkorSotoy: 1 }
    ),
    agg(1, 0, 8.3, 3),
    'aggregate: critic mean rounded to 1 decimal (8.33 -> 8.3)'
  );
  assertEquals(
    computeFilmAggregate([rating(10, { userRole: 'warga_sotoy' }), rating(10, { userRole: 'warga_sotoy' })]),
    agg(10, 2, 0, 0),
    'aggregate: mean 10 stays 10'
  );
  assertEquals(
    computeFilmAggregate(
      [rating(10, { userRole: 'si_paling_sotoy' }), rating(10, { userRole: 'si_paling_sotoy' })],
      { baseSkorSotoy: 1, baseCriticsSkorSotoy: 1 }
    ),
    agg(1, 0, 10, 2),
    'aggregate: critic mean 10 stays 10'
  );

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
};

runTests();
