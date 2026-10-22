import {
  countSubstantiveSyncChanges,
  evaluateSyncGuard,
  isOriginCountryOnlyUpdate,
  tmdbMediaType,
} from '../src/utils/tmdbSync';
import { parseSyncCliArgs } from './sync-tmdb-cron';

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
    `${message}${same ? '' : ` (expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)})`}`
  );
};

const runTests = () => {
  console.log('Running TMDB Cron Tests...\n');

  // ---------------------------------------------------------------------------
  // evaluateSyncGuard
  // ---------------------------------------------------------------------------

  {
    const result = evaluateSyncGuard({ scanned: 100, toChange: 10, errors: 2 });
    assertEquals(result, { ok: true }, 'guard accepts low error and change rates');
  }

  {
    const result = evaluateSyncGuard({ scanned: 100, toChange: 10, errors: 11 });
    assert(!result.ok, 'guard rejects errors above 10%');
  }

  {
    const result = evaluateSyncGuard({ scanned: 100, toChange: 10, errors: 9 });
    assert(result.ok, 'guard accepts errors below 10%');
  }

  {
    const result = evaluateSyncGuard({ scanned: 100, toChange: 31, errors: 0 });
    assert(!result.ok, 'guard rejects changes above 30%');
  }

  {
    const result = evaluateSyncGuard({ scanned: 100, toChange: 29, errors: 0 });
    assert(result.ok, 'guard accepts changes below 30%');
  }

  {
    const result = evaluateSyncGuard({ scanned: 100, toChange: 30, errors: 10 });
    assert(result.ok, 'guard accepts exactly 10% errors and exactly 30% changes');
  }

  {
    const result = evaluateSyncGuard({ scanned: 100, toChange: 10, errors: 10 });
    assert(result.ok, 'guard accepts exactly 10% errors');
  }

  {
    const result = evaluateSyncGuard({ scanned: 100, toChange: 30, errors: 0 });
    assert(result.ok, 'guard accepts exactly 30% changes');
  }

  {
    const result = evaluateSyncGuard({ scanned: 0, toChange: 0, errors: 0 });
    assert(!result.ok, 'guard rejects a run that scanned nothing');
  }

  {
    const result = evaluateSyncGuard({ scanned: 0, toChange: 0, errors: 0 });
    assert(
      typeof result.reason === 'string' && result.reason.length > 0,
      'guard returns a reason when it rejects a run'
    );
  }

  {
    const result = evaluateSyncGuard({
      scanned: 100,
      toChange: 90,
      errors: 90,
      force: true,
    });
    assertEquals(result, { ok: true }, 'force bypasses the guard');
  }

  {
    const result = evaluateSyncGuard({
      scanned: 0,
      toChange: 0,
      errors: 0,
      force: true,
    });
    assert(result.ok, 'force bypasses the guard even when nothing was scanned');
  }

  // ---------------------------------------------------------------------------
  // tmdbMediaType
  // ---------------------------------------------------------------------------

  {
    assertEquals(
      tmdbMediaType({ type: 'series', duration: '45m' }),
      'tv',
      'tmdbMediaType maps series to tv'
    );
  }

  {
    assertEquals(
      tmdbMediaType({ type: 'movie', duration: '2h 10m' }),
      'movie',
      'tmdbMediaType maps movie to movie'
    );
  }

  {
    assertEquals(
      tmdbMediaType({ type: 'animation', duration: '12 Episodes' }),
      'tv',
      'tmdbMediaType maps animation with episodes to tv'
    );
  }

  {
    assertEquals(
      tmdbMediaType({ type: 'animation', duration: '12 episode' }),
      'tv',
      'tmdbMediaType detects episodes case-insensitively'
    );
  }

  {
    assertEquals(
      tmdbMediaType({ type: 'animation', duration: '1h 42m' }),
      'movie',
      'tmdbMediaType maps animation without episodes to movie'
    );
  }

  {
    assertEquals(
      tmdbMediaType({ type: 'animation', duration: '' }),
      'movie',
      'tmdbMediaType maps animation with no duration to movie'
    );
  }

  // ---------------------------------------------------------------------------
  // CLI flag parsing
  // ---------------------------------------------------------------------------

  {
    const options = parseSyncCliArgs([]);
    assertEquals(
      { apply: options.apply, force: options.force, limit: options.limit },
      { apply: false, force: false, limit: undefined },
      'CLI defaults to dry-run without force or limit'
    );
  }

  {
    const options = parseSyncCliArgs(['--apply']);
    assert(options.apply && !options.force, 'CLI parses --apply');
  }

  {
    const options = parseSyncCliArgs(['--force']);
    assert(options.force && !options.apply, 'CLI parses --force');
  }

  {
    const options = parseSyncCliArgs(['--limit', '5']);
    assertEquals(options.limit, 5, 'CLI parses --limit N');
  }

  {
    const options = parseSyncCliArgs(['--limit=3']);
    assertEquals(options.limit, 3, 'CLI parses --limit=N');
  }

  {
    const options = parseSyncCliArgs(['--apply', '--force', '--limit', '7']);
    assertEquals(
      { apply: options.apply, force: options.force, limit: options.limit },
      { apply: true, force: true, limit: 7 },
      'CLI parses combined flags'
    );
  }

  {
    let threw = false;
    try {
      parseSyncCliArgs(['--limit', 'abc']);
    } catch {
      threw = true;
    }
    assert(threw, 'CLI rejects a non-numeric --limit');
  }

  {
    let threw = false;
    try {
      parseSyncCliArgs(['--limit']);
    } catch {
      threw = true;
    }
    assert(threw, 'CLI rejects a missing --limit value');
  }

  // ---------------------------------------------------------------------------
  // originCountry-only backfills and the change-rate guard
  // ---------------------------------------------------------------------------

  {
    assertEquals(
      isOriginCountryOnlyUpdate({ originCountry: ['ID'] }),
      true,
      'isOriginCountryOnlyUpdate detects an originCountry-only update'
    );
  }

  {
    assertEquals(
      isOriginCountryOnlyUpdate({ originCountry: ['ID'], whereToWatch: [] }),
      false,
      'isOriginCountryOnlyUpdate rejects an update that also changes whereToWatch'
    );
  }

  {
    assertEquals(
      isOriginCountryOnlyUpdate({}),
      false,
      'isOriginCountryOnlyUpdate rejects an empty update'
    );
  }

  {
    const rows = [
      { updates: { originCountry: ['ID'] } },
      { updates: { originCountry: ['ID'] } },
      { updates: { originCountry: ['ID'], idReleaseDate: '2026-10-02' } },
    ];
    assertEquals(
      countSubstantiveSyncChanges(rows),
      1,
      'countSubstantiveSyncChanges excludes originCountry-only rows and keeps mixed rows'
    );
  }

  {
    // 200 one-time backfills must not trip the 30% change-rate guard.
    const rows = Array.from({ length: 200 }, () => ({
      updates: { originCountry: ['ID'] } as any,
    }));
    const toChange = countSubstantiveSyncChanges(rows);
    const result = evaluateSyncGuard({ scanned: 200, toChange, errors: 0 });
    assertEquals(toChange, 0, 'originCountry-only backfills produce zero guard changes');
    assertEquals(result, { ok: true }, 'guard accepts a full originCountry backfill run');
  }

  {
    // 40 backfills + 20 substantive changes: the guard sees 20/100, not 60/100.
    const rows = [
      ...Array.from({ length: 40 }, () => ({ updates: { originCountry: ['ID'] } as any })),
      ...Array.from({ length: 20 }, () => ({
        updates: { originCountry: ['ID'], whereToWatch: [] } as any,
      })),
    ];
    const toChange = countSubstantiveSyncChanges(rows);
    const result = evaluateSyncGuard({ scanned: 100, toChange, errors: 0 });
    assertEquals(toChange, 20, 'mixed updates still count towards the guard');
    assertEquals(result, { ok: true }, 'guard accepts a run below 30% after excluding backfills');
  }

  console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) {
    process.exit(1);
  }
};

runTests();
