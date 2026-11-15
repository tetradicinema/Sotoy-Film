import {
  DEFAULT_TOLERANCE,
  classifyFilm,
  needsTmdb,
  parseCliOptions,
  resolveRatingsCount,
  SCORE_FIELDS,
  type ClassifyResult,
  type TmdbInput,
} from './migrate-film-scores';
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
  skorSotoy: 8.4,
  totalVotes: 0,
  criticsSkorSotoy: 8.4,
  whereToWatch: [],
  scoreScale: undefined as unknown as number,
  ...overrides,
});

const opts = { includeHighVotes: false, tolerance: DEFAULT_TOLERANCE, replaceFakeEight: false };
const highOpts = { includeHighVotes: true, tolerance: DEFAULT_TOLERANCE, replaceFakeEight: false };
const b5Opts = { includeHighVotes: false, tolerance: DEFAULT_TOLERANCE, replaceFakeEight: true };

const runTests = () => {
  console.log('Running Migrate Film Scores Tests...\n');

  // ---------------------------------------------------------------------------
  // needsTmdb
  // ---------------------------------------------------------------------------
  assertEquals(
    needsTmdb(createFilm({ skorSotoy: 4.5, tmdbId: 123 })),
    true,
    'needsTmdb: true for a legacy 5-range score with a tmdbId'
  );
  assertEquals(
    needsTmdb(createFilm({ skorSotoy: 8, tmdbId: 123 })),
    true,
    'needsTmdb: true for the fabricated 8.0 mapper fallback'
  );
  assertEquals(
    needsTmdb(createFilm({ skorSotoy: 6.2, tmdbId: 123 })),
    false,
    'needsTmdb: false for a stored 6.2 (display is unaffected)'
  );
  assertEquals(
    needsTmdb(createFilm({ skorSotoy: 4.5, scoreScale: 10, tmdbId: 123 })),
    false,
    'needsTmdb: false when scoreScale is defined'
  );
  assertEquals(
    needsTmdb(createFilm({ skorSotoy: 4.5, tmdbId: undefined as unknown as number })),
    false,
    'needsTmdb: false without a tmdbId'
  );

  // ---------------------------------------------------------------------------
  // Films with real reviews are never changed
  // ---------------------------------------------------------------------------
  const reviewed = classifyFilm(
    createFilm({ skorSotoy: 4.5, totalVotes: 5, tmdbId: 123 }),
    2,
    { voteAverage: 4.5, voteCount: 900 } as TmdbInput,
    opts
  );
  assertEquals(reviewed.category, 'has-real-reviews', 'reviewed film: bucket has-real-reviews');
  assertEquals(reviewed.changes, {}, 'reviewed film: never changed');
  assert(
    Boolean(reviewed.details.flag?.includes('rating doc')),
    'reviewed film: flagged when totalVotes !== ratingsCount (5 vs 2)'
  );
  const reviewedMatching = classifyFilm(
    createFilm({ skorSotoy: 4.5, totalVotes: 2, tmdbId: 123 }),
    2,
    null,
    opts
  );
  assertEquals(reviewedMatching.changes, {}, 'reviewed film with matching votes: still never changed');
  assert(
    !reviewedMatching.details.flag,
    'reviewed film with matching votes: not flagged'
  );

  // ---------------------------------------------------------------------------
  // Rule A / A2 (votes)
  // ---------------------------------------------------------------------------
  const votesOne = classifyFilm(createFilm({ totalVotes: 1 }), 0, null, opts);
  assertEquals(votesOne.category, 'vote-fix', 'rule A: totalVotes 1 -> vote-fix');
  assertEquals(votesOne.changes, { totalVotes: 0 }, 'rule A: totalVotes 1 -> 0');

  const highVotes = classifyFilm(createFilm({ skorSotoy: 7.9, totalVotes: 5 }), 0, null, opts);
  assertEquals(highVotes.category, 'high-votes', 'rule A2: totalVotes 5 -> high-votes bucket');
  assertEquals(highVotes.changes, {}, 'rule A2: report only by default');
  const highVotesFixed = classifyFilm(createFilm({ skorSotoy: 7.9, totalVotes: 5 }), 0, null, highOpts);
  assertEquals(highVotesFixed.changes, { totalVotes: 0 }, 'rule A2: fixed with includeHighVotes');

  // ---------------------------------------------------------------------------
  // Rule B1: TMDB-derived score -> write scoreScale 10 only
  // ---------------------------------------------------------------------------
  const b1 = classifyFilm(
    createFilm({ skorSotoy: 4.5, criticsSkorSotoy: undefined as unknown as number, tmdbId: 123 }),
    0,
    { voteAverage: 4.5, voteCount: 900 },
    opts
  );
  assertEquals(b1.category, 'score-scale', 'B1: score-scale bucket');
  assertEquals(b1.changes, { scoreScale: 10 }, 'B1: writes only scoreScale 10 (score kept)');

  const b1Pinned = classifyFilm(
    createFilm({ skorSotoy: 4.5, criticsSkorSotoy: 4.5, tmdbId: 123 }),
    0,
    { voteAverage: 4.5, voteCount: 900 },
    opts
  );
  assertEquals(
    b1Pinned.changes,
    { scoreScale: 10, criticsSkorSotoy: 4.5 },
    'B1: critics equal to the score is kept equal'
  );

  const b1Drift = classifyFilm(
    createFilm({ skorSotoy: 4.5, criticsSkorSotoy: undefined as unknown as number, tmdbId: 123 }),
    0,
    { voteAverage: 4.9, voteCount: 900 },
    opts
  );
  assertEquals(b1Drift.category, 'score-scale', 'B1 drift: within default tolerance still B1');
  assertEquals(b1Drift.changes, { scoreScale: 10 }, 'B1 drift: writes only scoreScale 10');

  const b1Tight = classifyFilm(
    createFilm({ skorSotoy: 4.5, criticsSkorSotoy: undefined as unknown as number, tmdbId: 123 }),
    0,
    { voteAverage: 4.9, voteCount: 900 },
    { includeHighVotes: false, tolerance: 0.1, replaceFakeEight: false }
  );
  assertEquals(b1Tight.category, 'score-mismatch', 'B1 drift: mismatch with tolerance 0.1');
  assertEquals(b1Tight.changes, {}, 'B1 drift: no write with tolerance 0.1');

  const criticsDiffer = classifyFilm(
    createFilm({ skorSotoy: 4.5, criticsSkorSotoy: 3.9, tmdbId: 123 }),
    0,
    { voteAverage: 4.5, voteCount: 900 },
    opts
  );
  assertEquals(criticsDiffer.changes, { scoreScale: 10 }, 'differing critics: scoreScale still written');
  assert(
    Boolean(criticsDiffer.details.note?.includes('criticsSkorSotoy')),
    'differing critics: left alone and reported'
  );

  // ---------------------------------------------------------------------------
  // Rule B2 / B3: fabricated seeds -> zeroed
  // ---------------------------------------------------------------------------
  const b2 = classifyFilm(
    createFilm({ skorSotoy: 5, criticsSkorSotoy: 5, tmdbId: 123 }),
    0,
    { voteAverage: 4.9, voteCount: 2 },
    opts
  );
  assertEquals(b2.category, 'score-zero', 'B2: score-zero bucket');
  assertEquals(
    b2.changes,
    { skorSotoy: 0, criticsSkorSotoy: 0, scoreScale: 10 },
    'B2: stored 5.0 with TMDB voteCount 2 -> zeroed'
  );

  const b2LosesToB1 = classifyFilm(
    createFilm({ skorSotoy: 5, criticsSkorSotoy: undefined as unknown as number, tmdbId: 123 }),
    0,
    { voteAverage: 5.1, voteCount: 900 },
    opts
  );
  assertEquals(b2LosesToB1.category, 'score-scale', 'stored 5.0 with real votes -> B1 wins over B2');
  assertEquals(b2LosesToB1.changes, { scoreScale: 10 }, 'stored 5.0 with real votes -> only scale written');

  const b3 = classifyFilm(
    createFilm({ skorSotoy: 8, criticsSkorSotoy: 8, tmdbId: 123 }),
    0,
    { voteAverage: 0, voteCount: 0 },
    opts
  );
  assertEquals(b3.category, 'score-zero', 'B3: score-zero bucket');
  assertEquals(
    b3.changes,
    { skorSotoy: 0, criticsSkorSotoy: 0, scoreScale: 10 },
    'B3: stored 8.0 with TMDB voteAverage 0 -> zeroed'
  );

  const b3Mismatch = classifyFilm(
    createFilm({ skorSotoy: 8, criticsSkorSotoy: undefined as unknown as number, tmdbId: 123 }),
    0,
    { voteAverage: 7.1, voteCount: 1200 },
    opts
  );
  assertEquals(b3Mismatch.category, 'score-mismatch', 'stored 8.0 with TMDB 7.1 -> mismatch');
  assertEquals(b3Mismatch.changes, {}, 'stored 8.0 with TMDB 7.1 -> no write');
  assert(
    Boolean(b3Mismatch.details.note?.includes('--replace-fake-eight')),
    'stored 8.0 mismatch note mentions that --replace-fake-eight would replace it'
  );

  // ---------------------------------------------------------------------------
  // Rule B5 (opt-in --replace-fake-eight): fabricated 8.0 -> real TMDB score
  // ---------------------------------------------------------------------------
  const b5Off = classifyFilm(
    createFilm({ skorSotoy: 8, criticsSkorSotoy: undefined as unknown as number, tmdbId: 123 }),
    0,
    { voteAverage: 5, voteCount: 19 },
    opts
  );
  assertEquals(b5Off.category, 'score-mismatch', 'B5 off: stored 8.0 with TMDB 5.0/19 stays mismatch');
  assertEquals(b5Off.changes, {}, 'B5 off: no changes');

  const b5 = classifyFilm(
    createFilm({ skorSotoy: 8, criticsSkorSotoy: 8, tmdbId: 123 }),
    0,
    { voteAverage: 5, voteCount: 19 },
    b5Opts
  );
  assertEquals(b5.category, 'score-replaced', 'B5: score-replaced bucket');
  assertEquals(
    b5.changes,
    { skorSotoy: 5, criticsSkorSotoy: 5, scoreScale: 10 },
    'B5: stored 8.0 with TMDB 5.0/19 -> skorSotoy 5, scale 10, critics follows'
  );
  assert(
    Boolean(b5.details.note?.includes('replaced')),
    'B5: note mentions the replacement'
  );

  const b5CriticsDiffer = classifyFilm(
    createFilm({ skorSotoy: 8, criticsSkorSotoy: 7.1, tmdbId: 123 }),
    0,
    { voteAverage: 5, voteCount: 19 },
    b5Opts
  );
  assertEquals(
    b5CriticsDiffer.changes,
    { skorSotoy: 5, scoreScale: 10 },
    'B5 differing critics: skorSotoy and scale written, critics left alone'
  );
  assert(
    Boolean(b5CriticsDiffer.details.note?.includes('criticsSkorSotoy')),
    'B5 differing critics: left alone and noted'
  );

  const b5Zero = classifyFilm(
    createFilm({ skorSotoy: 8, criticsSkorSotoy: 8, tmdbId: 123 }),
    0,
    { voteAverage: 7, voteCount: 1 },
    b5Opts
  );
  assertEquals(b5Zero.category, 'score-replaced', 'B5 low votes: score-replaced bucket');
  assertEquals(
    b5Zero.changes,
    { skorSotoy: 0, criticsSkorSotoy: 0, scoreScale: 10 },
    'B5: TMDB 7.0/1 (voteCount < 5) -> skorSotoy 0'
  );

  const b5Rounded = classifyFilm(
    createFilm({ skorSotoy: 8, criticsSkorSotoy: 8, tmdbId: 123 }),
    0,
    { voteAverage: 6.205, voteCount: 166 },
    b5Opts
  );
  assertEquals(
    b5Rounded.changes,
    { skorSotoy: 6.2, criticsSkorSotoy: 6.2, scoreScale: 10 },
    'B5: TMDB 6.205/166 -> 6.2 (one decimal)'
  );

  const b5Clamped = classifyFilm(
    createFilm({ skorSotoy: 8, criticsSkorSotoy: undefined as unknown as number, tmdbId: 123 }),
    0,
    { voteAverage: 0.4, voteCount: 900 },
    b5Opts
  );
  assertEquals(
    b5Clamped.changes,
    { skorSotoy: 1, scoreScale: 10 },
    'B5: TMDB vote_average is clamped into 1..10'
  );

  const b5LosesToB1 = classifyFilm(
    createFilm({ skorSotoy: 8, criticsSkorSotoy: undefined as unknown as number, tmdbId: 123 }),
    0,
    { voteAverage: 7.9, voteCount: 900 },
    b5Opts
  );
  assertEquals(b5LosesToB1.category, 'score-scale', 'B5: stored 8.0 within tolerance of TMDB 7.9 is still B1');
  assertEquals(b5LosesToB1.changes, { scoreScale: 10 }, 'B5: B1 wins even with the flag');

  const b5ManualScore = classifyFilm(
    createFilm({ skorSotoy: 4.3, criticsSkorSotoy: undefined as unknown as number, tmdbId: 123 }),
    0,
    { voteAverage: 8.7, voteCount: 900 },
    b5Opts
  );
  assertEquals(
    b5ManualScore.category,
    'score-mismatch',
    'B5: stored 4.3 with TMDB 8.7 is never touched even with the flag'
  );
  assertEquals(b5ManualScore.changes, {}, 'B5: stored 4.3 -> no write');

  const b5EightPointThree = classifyFilm(
    createFilm({ skorSotoy: 8.3, criticsSkorSotoy: undefined as unknown as number, tmdbId: 123 }),
    0,
    { voteAverage: 5, voteCount: 19 },
    b5Opts
  );
  assertEquals(b5EightPointThree.category, 'skip', 'B5: stored 8.3 is not a score candidate');
  assertEquals(b5EightPointThree.changes, {}, 'B5: stored 8.3 is never touched');

  const b5Unavailable = classifyFilm(
    createFilm({ skorSotoy: 8, criticsSkorSotoy: undefined as unknown as number, tmdbId: 123 }),
    0,
    'unavailable' as TmdbInput,
    b5Opts
  );
  assertEquals(b5Unavailable.category, 'score-no-tmdb', 'B5: unavailable TMDB is never touched');
  assertEquals(b5Unavailable.changes, {}, 'B5: unavailable TMDB -> no write');

  const b5Reviewed = classifyFilm(
    createFilm({ skorSotoy: 8, totalVotes: 3, tmdbId: 123 }),
    2,
    { voteAverage: 5, voteCount: 19 },
    b5Opts
  );
  assertEquals(b5Reviewed.category, 'has-real-reviews', 'B5: reviewed films are never touched');
  assertEquals(b5Reviewed.changes, {}, 'B5: reviewed films -> no changes');

  const b5Scaled = classifyFilm(
    createFilm({ skorSotoy: 8, scoreScale: 10, tmdbId: 123 }),
    0,
    { voteAverage: 5, voteCount: 19 },
    b5Opts
  );
  assertEquals(b5Scaled.category, 'skip', 'B5: scoreScale 10 docs are never touched');
  assertEquals(b5Scaled.changes, {}, 'B5: scoreScale 10 -> no changes');

  // ---------------------------------------------------------------------------
  // Non-candidates and guarded buckets
  // ---------------------------------------------------------------------------
  const sixPointTwo = classifyFilm(createFilm({ skorSotoy: 6.2, tmdbId: 123 }), 0, null, opts);
  assertEquals(sixPointTwo.category, 'skip', 'stored 6.2: needsTmdb false and skipped');
  assertEquals(sixPointTwo.changes, {}, 'stored 6.2: no score change');

  const manual = classifyFilm(
    createFilm({ skorSotoy: 4, tmdbId: undefined as unknown as number }),
    0,
    null,
    opts
  );
  assertEquals(manual.category, 'manual', 'manual film: manual bucket');
  assertEquals(manual.changes, {}, 'manual film: never gets a score change');
  assert(
    Boolean(manual.details.flag?.includes('4.0')),
    'manual film: stored 4.0 is flagged as the likely old admin default'
  );
  const manualWithVote = classifyFilm(
    createFilm({ skorSotoy: 4, totalVotes: 1, tmdbId: undefined as unknown as number }),
    0,
    null,
    opts
  );
  assertEquals(manualWithVote.category, 'manual', 'manual film with 1 vote: still manual');
  assertEquals(manualWithVote.changes, { totalVotes: 0 }, 'manual film with 1 vote: rule A still applies');

  const unavailable = classifyFilm(
    createFilm({ skorSotoy: 4.5, tmdbId: 123 }),
    0,
    'unavailable' as TmdbInput,
    opts
  );
  assertEquals(unavailable.category, 'score-no-tmdb', 'tmdb unavailable: no-tmdb-data bucket');
  assertEquals(unavailable.changes, {}, 'tmdb unavailable: never changes a score');

  const scaledDoc = classifyFilm(
    createFilm({ skorSotoy: 4.5, scoreScale: 10, tmdbId: 123 }),
    0,
    { voteAverage: 4.5, voteCount: 900 },
    opts
  );
  assertEquals(scaledDoc.category, 'skip', 'scoreScale 10: never touched by rule B');
  assertEquals(scaledDoc.changes, {}, 'scoreScale 10: no changes');

  const noTmdbFlag = classifyFilm(
    createFilm({ skorSotoy: 4.5, tmdbId: 123 }),
    0,
    null,
    opts
  );
  assertEquals(noTmdbFlag.category, 'manual', '--no-tmdb (tmdb null): manual bucket, score untouched');
  assertEquals(noTmdbFlag.changes, {}, '--no-tmdb: no changes');

  // ---------------------------------------------------------------------------
  // Whitelist: no other field can ever appear in changes
  // ---------------------------------------------------------------------------
  const allResults: ClassifyResult[] = [
    reviewed,
    votesOne,
    highVotes,
    highVotesFixed,
    b1,
    b1Pinned,
    b1Drift,
    b1Tight,
    criticsDiffer,
    b2,
    b2LosesToB1,
    b3,
    b3Mismatch,
    b5,
    b5CriticsDiffer,
    b5Zero,
    b5Rounded,
    b5Clamped,
    b5LosesToB1,
    b5ManualScore,
    manual,
    manualWithVote,
    unavailable,
  ];
  const usedFields = new Set(allResults.flatMap((result) => Object.keys(result.changes)));
  assert(
    Array.from(usedFields).every((field) => (SCORE_FIELDS as readonly string[]).includes(field)),
    'whitelist: every produced change is a whitelisted field'
  );

  // ---------------------------------------------------------------------------
  // Idempotency: applying the changes, then classifying again -> no changes
  // ---------------------------------------------------------------------------
  const applyAndReclassify = (
    film: FilmItem,
    result: ClassifyResult,
    tmdb: TmdbInput
  ): ClassifyResult => classifyFilm({ ...film, ...result.changes } as FilmItem, 0, tmdb, opts);

  const idemB1 = applyAndReclassify(
    createFilm({ skorSotoy: 4.5, criticsSkorSotoy: 4.5, totalVotes: 1, tmdbId: 123 }),
    classifyFilm(
      createFilm({ skorSotoy: 4.5, criticsSkorSotoy: 4.5, totalVotes: 1, tmdbId: 123 }),
      0,
      { voteAverage: 4.5, voteCount: 900 },
      opts
    ),
    { voteAverage: 4.5, voteCount: 900 }
  );
  assertEquals(idemB1.category, 'skip', 'idempotency: B1 + vote fix -> skip on reclassify');
  assertEquals(idemB1.changes, {}, 'idempotency: B1 + vote fix -> no further changes');

  const idemB2 = applyAndReclassify(
    createFilm({ skorSotoy: 5, criticsSkorSotoy: 5, totalVotes: 1, tmdbId: 123 }),
    classifyFilm(
      createFilm({ skorSotoy: 5, criticsSkorSotoy: 5, totalVotes: 1, tmdbId: 123 }),
      0,
      { voteAverage: 4.9, voteCount: 2 },
      opts
    ),
    { voteAverage: 4.9, voteCount: 2 }
  );
  assertEquals(idemB2.category, 'skip', 'idempotency: B2 zeroed film -> skip on reclassify');
  assertEquals(idemB2.changes, {}, 'idempotency: B2 zeroed film -> no further changes');

  const idemB3 = applyAndReclassify(
    createFilm({ skorSotoy: 8, criticsSkorSotoy: 8, tmdbId: 123 }),
    classifyFilm(
      createFilm({ skorSotoy: 8, criticsSkorSotoy: 8, tmdbId: 123 }),
      0,
      { voteAverage: 0, voteCount: 0 },
      opts
    ),
    { voteAverage: 0, voteCount: 0 }
  );
  assertEquals(idemB3.changes, {}, 'idempotency: B3 zeroed film -> no further changes');

  const idemB5 = applyAndReclassify(
    createFilm({ skorSotoy: 8, criticsSkorSotoy: 8, totalVotes: 1, tmdbId: 123 }),
    classifyFilm(
      createFilm({ skorSotoy: 8, criticsSkorSotoy: 8, totalVotes: 1, tmdbId: 123 }),
      0,
      { voteAverage: 5, voteCount: 19 },
      b5Opts
    ),
    { voteAverage: 5, voteCount: 19 }
  );
  assertEquals(idemB5.category, 'skip', 'idempotency: B5 replaced film -> skip on reclassify');
  assertEquals(idemB5.changes, {}, 'idempotency: B5 replaced film -> no further changes');

  const idemB5Zero = applyAndReclassify(
    createFilm({ skorSotoy: 8, criticsSkorSotoy: 8, tmdbId: 123 }),
    classifyFilm(
      createFilm({ skorSotoy: 8, criticsSkorSotoy: 8, tmdbId: 123 }),
      0,
      { voteAverage: 7, voteCount: 1 },
      b5Opts
    ),
    { voteAverage: 7, voteCount: 1 }
  );
  assertEquals(idemB5Zero.category, 'skip', 'idempotency: B5 zeroed film -> skip on reclassify');
  assertEquals(idemB5Zero.changes, {}, 'idempotency: B5 zeroed film -> no further changes');

  // ---------------------------------------------------------------------------
  // resolveRatingsCount
  // ---------------------------------------------------------------------------
  const ratingCounts = new Map<string, number>([
    ['doc-a', 3],
    ['data-b', 5],
    ['doc-c', 7],
    ['data-c', 2],
    ['9', 4],
  ]);
  assertEquals(
    resolveRatingsCount(ratingCounts, 'doc-a'),
    3,
    'resolveRatingsCount: docId match is used'
  );
  assertEquals(
    resolveRatingsCount(ratingCounts, 'doc-x', 'data-b'),
    5,
    'resolveRatingsCount: data.id match is used'
  );
  assertEquals(
    resolveRatingsCount(ratingCounts, 'doc-c', 'data-c'),
    7,
    'resolveRatingsCount: both keys present takes the max'
  );
  assertEquals(
    resolveRatingsCount(ratingCounts, 'doc-x'),
    0,
    'resolveRatingsCount: neither key matches -> 0'
  );
  assertEquals(
    resolveRatingsCount(ratingCounts, 'doc-x', undefined),
    0,
    'resolveRatingsCount: undefined dataId -> 0'
  );
  assertEquals(
    resolveRatingsCount(ratingCounts, 'doc-x', '   '),
    0,
    'resolveRatingsCount: blank dataId -> 0'
  );
  assertEquals(
    resolveRatingsCount(ratingCounts, 'doc-x', 9),
    4,
    'resolveRatingsCount: numeric dataId looks up its string form'
  );
  assertEquals(
    resolveRatingsCount(ratingCounts, 'doc-a', 9),
    4,
    'resolveRatingsCount: numeric dataId and docId both match -> max'
  );

  // ---------------------------------------------------------------------------
  // CLI parsing
  // ---------------------------------------------------------------------------
  assertEquals(
    parseCliOptions([]),
    { apply: false, noTmdb: false, includeHighVotes: false, replaceFakeEight: false, tolerance: 0.5, restorePath: undefined },
    'CLI: defaults'
  );
  assertEquals(
    parseCliOptions(['--apply', '--include-high-votes', '--tolerance', '0.3']),
    { apply: true, noTmdb: false, includeHighVotes: true, replaceFakeEight: false, tolerance: 0.3, restorePath: undefined },
    'CLI: parses flags and values'
  );
  assertEquals(
    parseCliOptions(['--replace-fake-eight', '--apply']),
    { apply: true, noTmdb: false, includeHighVotes: false, replaceFakeEight: true, tolerance: 0.5, restorePath: undefined },
    'CLI: --replace-fake-eight is parsed'
  );
  assertEquals(
    parseCliOptions(['--restore=data/film-scores-backup-x.json', '--apply']),
    { apply: true, noTmdb: false, includeHighVotes: false, replaceFakeEight: false, tolerance: 0.5, restorePath: 'data/film-scores-backup-x.json' },
    'CLI: --restore=path is parsed'
  );

  const expectThrow = (argv: string[], message: string) => {
    try {
      parseCliOptions(argv);
      assert(false, message);
    } catch {
      assert(true, message);
    }
  };
  expectThrow(['--bogus'], 'CLI: unknown flag is rejected');
  expectThrow(['--tolerance'], 'CLI: missing tolerance value is rejected');
  expectThrow(['--tolerance', '2.5'], 'CLI: tolerance above 2 is rejected');
  expectThrow(['--tolerance', '-0.5'], 'CLI: negative tolerance is rejected');

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
};

runTests();
