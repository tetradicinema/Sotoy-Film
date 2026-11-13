import {
  buildRestorePayload,
  classifyFilm,
  parseFlags,
  RESTORE_DELETE,
  WHITELISTED_FIELDS,
} from './migrate-film-scores';
import type { MigratableFilm, ClassifyResult } from './migrate-film-scores';

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
  assert(
    same,
    `${message} (expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)})`
  );
};

const film = (overrides: Partial<MigratableFilm> = {}): MigratableFilm => ({
  id: 'film-1',
  title: 'Film One',
  tmdbId: 100,
  type: 'movie',
  duration: '2h',
  skorSotoy: 0,
  criticsSkorSotoy: 0,
  totalVotes: 0,
  scoreScale: undefined,
  ...overrides,
});

const tmdb = (voteAverage: number, voteCount: number) => ({ voteAverage, voteCount });

const runTests = () => {
  console.log('Running Migrate Film Scores Tests...\n');

  // ---------------------------------------------------------------------------
  // Bucket D: films with real ratings are never written
  // ---------------------------------------------------------------------------
  const withRatings = classifyFilm(
    film({ skorSotoy: 5, totalVotes: 7, criticsSkorSotoy: 5 }),
    3,
    tmdb(5, 900)
  );
  assertEquals(withRatings.category, 'has-ratings', 'has-ratings: category is has-ratings');
  assertEquals(withRatings.changes, null, 'has-ratings: never produces changes');
  assertEquals(withRatings.flags, ['totalVotes-does-not-match-ratings'], 'has-ratings: flags mismatched totalVotes');

  const withRatingsMatched = classifyFilm(film({ skorSotoy: 8, totalVotes: 3 }), 3, tmdb(8, 500));
  assertEquals(withRatingsMatched.changes, null, 'has-ratings: still no changes when votes match');
  assertEquals(withRatingsMatched.flags, [], 'has-ratings: no flag when totalVotes matches ratings');

  // ---------------------------------------------------------------------------
  // Rule A: totalVotes 1 -> 0
  // ---------------------------------------------------------------------------
  const seed = classifyFilm(film({ totalVotes: 1, skorSotoy: 8 }), 0, tmdb(7.1, 3000));
  assertEquals(seed.category, 'mismatch', 'rule A: unrelated score state keeps its own bucket');
  assertEquals(seed.changes, { totalVotes: 0 }, 'rule A: totalVotes 1 becomes 0');

  const seedManual = classifyFilm(film({ tmdbId: undefined, totalVotes: 1, skorSotoy: 7 }), 0, null);
  assertEquals(seedManual.category, 'manual', 'rule A: manual film without tmdbId');
  assertEquals(seedManual.changes, { totalVotes: 0 }, 'rule A: rule A still applies to manual films');

  // ---------------------------------------------------------------------------
  // Rule A2: high votes report-only by default, fixed with --include-high-votes
  // ---------------------------------------------------------------------------
  const highDefault = classifyFilm(film({ totalVotes: 5, skorSotoy: 8 }), 0, tmdb(0, 0));
  assertEquals(highDefault.category, 'fabricated', 'rule A2 default: score bucket kept');
  assertEquals(highDefault.changes, { skorSotoy: 0, criticsSkorSotoy: 0, scoreScale: 10 }, 'rule A2 default: votes not touched');

  const highOnlyDefault = classifyFilm(film({ totalVotes: 5, scoreScale: 10 }), 0, tmdb(0, 0));
  assertEquals(highOnlyDefault.category, 'high-votes', 'rule A2 default: high-votes bucket');
  assertEquals(highOnlyDefault.changes, null, 'rule A2 default: report only, no changes');

  const highInclude = classifyFilm(film({ totalVotes: 5, scoreScale: 10 }), 0, tmdb(0, 0), {
    includeHighVotes: true,
  });
  assertEquals(highInclude.category, 'high-votes', 'rule A2 include: high-votes bucket');
  assertEquals(highInclude.changes, { totalVotes: 0 }, 'rule A2 include: totalVotes fixed to 0');

  // ---------------------------------------------------------------------------
  // Rule B1: TMDB-derived legacy score -> only scoreScale 10 (+ critics keep)
  // ---------------------------------------------------------------------------
  const derived = classifyFilm(film({ skorSotoy: 4.5, criticsSkorSotoy: 7.5 }), 0, tmdb(4.5, 1200));
  assertEquals(derived.category, 'tmdb-derived', 'B1: category tmdb-derived');
  assertEquals(derived.changes, { scoreScale: 10 }, 'B1: writes only scoreScale 10 (critics not equal, kept)');

  const derivedEqual = classifyFilm(film({ skorSotoy: 4.5, criticsSkorSotoy: 4.5 }), 0, tmdb(4.52, 1200));
  assertEquals(
    derivedEqual.changes,
    { scoreScale: 10, criticsSkorSotoy: 4.5 },
    'B1: critics kept equal only when it already equals skorSotoy'
  );

  // 0.051 tolerance absorbs TMDB rounding (4.5 stored vs 4.55 from TMDB).
  const derivedTolerance = classifyFilm(
    film({ skorSotoy: 4.5, criticsSkorSotoy: 7.5 }),
    0,
    tmdb(4.55, 800)
  );
  assertEquals(derivedTolerance.category, 'tmdb-derived', 'B1 tolerance: 4.5 vs 4.55 is TMDB-derived');
  assertEquals(derivedTolerance.changes, { scoreScale: 10 }, 'B1 tolerance: only scoreScale 10 is written');

  // A differing critics score in (0, 5] is flagged, but not rewritten.
  const criticsDiffers = classifyFilm(
    film({ skorSotoy: 4.5, criticsSkorSotoy: 3.0 }),
    0,
    tmdb(4.5, 800)
  );
  assertEquals(criticsDiffers.category, 'tmdb-derived', 'critics flag: category tmdb-derived');
  assertEquals(criticsDiffers.changes, { scoreScale: 10 }, 'critics flag: changes payload unchanged');
  assert(
    criticsDiffers.flags.includes('critics-differs-may-change-display'),
    'critics flag: differing in-range critics score is flagged'
  );
  assert(
    !derived.flags.includes('critics-differs-may-change-display'),
    'critics flag: out-of-range critics score (7.5) is not flagged'
  );

  // ---------------------------------------------------------------------------
  // Rule B2: stored 5.0 with < 5 TMDB votes (fabricated unrated seed)
  // ---------------------------------------------------------------------------
  const unrated = classifyFilm(film({ skorSotoy: 5.0, criticsSkorSotoy: 5.0, totalVotes: 1 }), 0, tmdb(0, 2));
  assertEquals(unrated.category, 'fabricated', 'B2: category fabricated');
  assertEquals(
    unrated.changes,
    { totalVotes: 0, skorSotoy: 0, criticsSkorSotoy: 0, scoreScale: 10 },
    'B2: writes 0/0/scoreScale 10 (plus rule A vote fix)'
  );

  // stored 5.0 but well-rated on TMDB -> B1, not fabricated
  const popularFive = classifyFilm(film({ skorSotoy: 5.0, criticsSkorSotoy: 5.0 }), 0, tmdb(5.0, 900));
  assertEquals(popularFive.category, 'tmdb-derived', 'B2 vs B1: rated 5.0 with many votes is TMDB-derived');
  assertEquals(popularFive.changes, { scoreScale: 10, criticsSkorSotoy: 5.0 }, 'B2 vs B1: only scoreScale stamped');

  // ---------------------------------------------------------------------------
  // Rule B3: stored 8.0 with no TMDB vote_average (fabricated mapper fallback)
  // ---------------------------------------------------------------------------
  const mapperFallback = classifyFilm(film({ skorSotoy: 8.0, criticsSkorSotoy: 8.0, totalVotes: 1 }), 0, tmdb(0, 0));
  assertEquals(mapperFallback.category, 'fabricated', 'B3: category fabricated');
  assertEquals(
    mapperFallback.changes,
    { totalVotes: 0, skorSotoy: 0, criticsSkorSotoy: 0, scoreScale: 10 },
    'B3: writes 0/0/scoreScale 10 (plus rule A vote fix)'
  );

  // ---------------------------------------------------------------------------
  // Rule B4: mismatch is report-only
  // ---------------------------------------------------------------------------
  const mismatch = classifyFilm(film({ skorSotoy: 8.0, criticsSkorSotoy: 8.0 }), 0, tmdb(7.1, 3400));
  assertEquals(mismatch.category, 'mismatch', 'B4: stored 8.0 vs TMDB 7.1 is a mismatch');
  assertEquals(mismatch.changes, null, 'B4: mismatch never writes');

  const mismatchUnratedAvg = classifyFilm(film({ skorSotoy: 6.3, criticsSkorSotoy: 6.3 }), 0, tmdb(0, 40));
  assertEquals(mismatchUnratedAvg.category, 'mismatch', 'B4: unknown stored value with 0 average is a mismatch');
  assertEquals(mismatchUnratedAvg.changes, null, 'B4: unknown mismatch never writes');

  // ---------------------------------------------------------------------------
  // Rule C: manual films (no tmdbId) never get score changes
  // ---------------------------------------------------------------------------
  const manual = classifyFilm(film({ tmdbId: undefined, skorSotoy: 7.5, criticsSkorSotoy: 7.5 }), 0, tmdb(7.5, 2000));
  assertEquals(manual.category, 'manual', 'C: category manual');
  assertEquals(manual.changes, null, 'C: manual films never get score changes');

  const manualDefault4 = classifyFilm(film({ tmdbId: undefined, skorSotoy: 4.0, totalVotes: 0 }), 0, null);
  assertEquals(manualDefault4.changes, null, 'C: stored 4.0 manual film is not rewritten');
  assert(
    manualDefault4.flags.includes('likely-old-admin-default-4'),
    'C: stored 4.0 manual film is flagged as likely old admin default'
  );

  // ---------------------------------------------------------------------------
  // TMDB unavailable / null never changes a score
  // ---------------------------------------------------------------------------
  const unavailable = classifyFilm(film({ skorSotoy: 5.0, criticsSkorSotoy: 5.0, totalVotes: 1 }), 0, 'unavailable');
  assertEquals(unavailable.category, 'no-tmdb-data', 'unavailable: bucket no-tmdb-data');
  assertEquals(unavailable.changes, { totalVotes: 0 }, 'unavailable: only rule A vote fix, no score change');

  const noData = classifyFilm(film({ skorSotoy: 5.0, criticsSkorSotoy: 5.0 }), 0, null);
  assertEquals(noData.category, 'no-tmdb-data', 'null tmdb: bucket no-tmdb-data');
  assertEquals(noData.changes, null, 'null tmdb: score never changed');

  // ---------------------------------------------------------------------------
  // scoreScale 10 docs are never touched by rule B
  // ---------------------------------------------------------------------------
  const scaled = classifyFilm(film({ skorSotoy: 5.0, criticsSkorSotoy: 5.0, scoreScale: 10 }), 0, tmdb(0, 2));
  assertEquals(scaled.category, 'ok', 'scaled: scoreScale 10 doc with nothing else to fix');
  assertEquals(scaled.changes, null, 'scaled: rule B never touches scoreScale 10 docs');

  const scaledFabricated = classifyFilm(film({ skorSotoy: 5.0, scoreScale: 10, totalVotes: 1 }), 0, tmdb(0, 2));
  assertEquals(scaledFabricated.changes, { totalVotes: 0 }, 'scaled: rule A may still apply');

  // ---------------------------------------------------------------------------
  // Idempotency: applying the changes and re-classifying yields no changes
  // ---------------------------------------------------------------------------
  const before = film({ skorSotoy: 4.5, criticsSkorSotoy: 4.5, totalVotes: 1 });
  const firstPass = classifyFilm(before, 0, tmdb(4.5, 800), { includeHighVotes: true });
  const applied: MigratableFilm = { ...before, ...firstPass.changes };
  const secondPass = classifyFilm(applied, 0, tmdb(4.5, 800), { includeHighVotes: true });
  assertEquals(secondPass.category, 'ok', 'idempotency (tmdb-derived): second pass is ok');
  assertEquals(secondPass.changes, null, 'idempotency (tmdb-derived): second pass has no changes');

  const beforeFabricated = film({ skorSotoy: 5.0, criticsSkorSotoy: 5.0, totalVotes: 1 });
  const firstFabricated = classifyFilm(beforeFabricated, 0, tmdb(0, 2), { includeHighVotes: true });
  const appliedFabricated: MigratableFilm = { ...beforeFabricated, ...firstFabricated.changes };
  const secondFabricated = classifyFilm(appliedFabricated, 0, tmdb(0, 2), { includeHighVotes: true });
  assertEquals(secondFabricated.category, 'ok', 'idempotency (fabricated): second pass is ok');
  assertEquals(secondFabricated.changes, null, 'idempotency (fabricated): second pass has no changes');

  // ---------------------------------------------------------------------------
  // Rule B: legacy stored skorSotoy 0 is already displayed as 0 -> nothing to fix
  // ---------------------------------------------------------------------------
  const zeroScore = classifyFilm(film({ skorSotoy: 0 }), 0, tmdb(7.1, 3000));
  assertEquals(zeroScore.category, 'ok', 'stored 0: category ok, not mismatch');
  assertEquals(zeroScore.changes, null, 'stored 0: no score changes');

  const zeroScoreSeed = classifyFilm(film({ skorSotoy: 0, totalVotes: 1 }), 0, tmdb(7.1, 3000));
  assertEquals(zeroScoreSeed.changes, { totalVotes: 0 }, 'stored 0: only the rule A vote fix applies');

  // ---------------------------------------------------------------------------
  // Restore payload: only changed fields, absent old values become deletes
  // ---------------------------------------------------------------------------
  const onlyChanged = buildRestorePayload(
    { skorSotoy: 5, criticsSkorSotoy: 5, totalVotes: 1, scoreScale: 10 },
    ['scoreScale']
  );
  assertEquals(onlyChanged, { scoreScale: 10 }, 'restore payload: only keys from newKeys are included');
  assertEquals(Object.keys(onlyChanged), ['scoreScale'], 'restore payload: unchanged fields are never in the payload');

  const absentOld = buildRestorePayload(
    { skorSotoy: 5, totalVotes: 1 },
    ['skorSotoy', 'criticsSkorSotoy', 'totalVotes', 'scoreScale']
  );
  assert(absentOld.criticsSkorSotoy === RESTORE_DELETE, 'restore payload: absent old value becomes RESTORE_DELETE');
  assert(absentOld.scoreScale === RESTORE_DELETE, 'restore payload: null/absent old scoreScale becomes RESTORE_DELETE');
  assertEquals(absentOld.skorSotoy, 5, 'restore payload: present old value is restored');
  assertEquals(absentOld.totalVotes, 1, 'restore payload: present old votes are restored');

  const nullOld = buildRestorePayload({ skorSotoy: null, totalVotes: 0 }, ['skorSotoy', 'totalVotes']);
  assert(nullOld.skorSotoy === RESTORE_DELETE, 'restore payload: explicit null old value becomes RESTORE_DELETE');
  assertEquals(nullOld.totalVotes, 0, 'restore payload: numeric zero is restored, not deleted');

  const fallbackAll = buildRestorePayload({ skorSotoy: 8, totalVotes: 1 }, null);
  assertEquals(
    Object.keys(fallbackAll).sort(),
    [...WHITELISTED_FIELDS].sort(),
    'restore payload: null newKeys falls back to all whitelisted fields'
  );
  assertEquals(fallbackAll.skorSotoy, 8, 'restore payload: fallback restores present old values');
  assert(fallbackAll.criticsSkorSotoy === RESTORE_DELETE, 'restore payload: fallback deletes absent old values');

  const ignoredKeys = buildRestorePayload(
    { skorSotoy: 5, totalVotes: 1, scoreScale: 10 },
    ['scoreScale', 'title', 'poster', 'notAField']
  );
  assertEquals(ignoredKeys, { scoreScale: 10 }, 'restore payload: non-whitelisted newKeys are ignored');

  // ---------------------------------------------------------------------------
  // Flag parser: strict, but accepts --allow-orphan-ratings
  // ---------------------------------------------------------------------------
  let unknownFlagThrew = false;
  try {
    parseFlags(['--bogus']);
  } catch {
    unknownFlagThrew = true;
  }
  assert(unknownFlagThrew, 'parseFlags: unknown flags are rejected');

  const orphanFlag = parseFlags(['--apply', '--allow-orphan-ratings']);
  assert(orphanFlag.apply, 'parseFlags: --apply is parsed');
  assert(orphanFlag.allowOrphanRatings, 'parseFlags: --allow-orphan-ratings is accepted');
  assertEquals(orphanFlag.restorePath, null, 'parseFlags: no restore path by default');

  let missingRestoreThrew = false;
  try {
    parseFlags(['--restore']);
  } catch {
    missingRestoreThrew = true;
  }
  assert(missingRestoreThrew, 'parseFlags: --restore without a value is rejected');

  // ---------------------------------------------------------------------------
  // Whitelist guard: changes keys are always within the whitelist
  // ---------------------------------------------------------------------------
  const cases: Array<ReturnType<typeof classifyFilm>> = [
    classifyFilm(film({ totalVotes: 1 }), 0, tmdb(7.1, 3000)),
    classifyFilm(film({ totalVotes: 5, scoreScale: 10 }), 0, tmdb(0, 0), { includeHighVotes: true }),
    classifyFilm(film({ skorSotoy: 4.5, criticsSkorSotoy: 4.5 }), 0, tmdb(4.5, 1200)),
    classifyFilm(film({ skorSotoy: 5.0, totalVotes: 1 }), 0, tmdb(0, 2)),
    classifyFilm(film({ skorSotoy: 8.0, totalVotes: 1 }), 0, tmdb(0, 0)),
    classifyFilm(film({ tmdbId: undefined, totalVotes: 1 }), 0, null),
    classifyFilm(film({ skorSotoy: 6 }), 2, tmdb(6, 100)),
  ];
  const allKeysOk = cases.every(
    (result) =>
      !result.changes || Object.keys(result.changes).every((key) => (WHITELISTED_FIELDS as readonly string[]).includes(key))
  );
  assert(allKeysOk, 'whitelist: every proposed change key is a whitelisted field');
  assertEquals(WHITELISTED_FIELDS, ['skorSotoy', 'criticsSkorSotoy', 'totalVotes', 'scoreScale'], 'whitelist: exact field list');

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
};

runTests();
