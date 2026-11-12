import {
  IMPORT_CONFIG,
  parseImportCliArgs,
  pickCandidates,
  type ImportSource,
  type TmdbListItem,
} from '../src/utils/tmdbImport';

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

/** List item that passes isQualityListItem (poster, overview, enough votes). */
const makeItem = (id: number, overrides: Partial<TmdbListItem> = {}): TmdbListItem => ({
  id,
  title: `Title ${id}`,
  overview: 'An overview.',
  poster_path: '/poster.jpg',
  vote_count: 100,
  popularity: 50,
  genre_ids: [18],
  release_date: '2024-01-01',
  ...overrides,
});

const makeSource = (name: string, ids: number[], mediaType: ImportSource['mediaType'] = 'movie'): ImportSource => ({
  name,
  mediaType,
  items: ids.map(id => makeItem(id, mediaType === 'tv' ? { name: `Title ${id}` } : {})),
});

const runTests = () => {
  console.log('Running TMDB Import Limit Tests...\n');

  // -------------------------------------------------------------------------
  // 1. Defaults: dailyLimit 10, backlogMax 3
  // -------------------------------------------------------------------------
  console.log('--- Suite 1: Config and CLI defaults ---');
  {
    assertEquals(IMPORT_CONFIG.dailyLimit, 10, 'dailyLimit default is 10');
    assertEquals(IMPORT_CONFIG.backlogMax, 3, 'backlogMax default is 3');

    const options = parseImportCliArgs([]);
    assertEquals(options.limit, 10, 'CLI default limit is 10');
    assertEquals(options.backlogMax, 3, 'CLI default backlogMax is 3');
  }

  // -------------------------------------------------------------------------
  // 2. Backlog capped at 3 even with plentiful backlog candidates
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 2: Backlog cap ---');
  {
    const sources: ImportSource[] = [makeSource('backlog movie', [1, 2, 3, 4, 5, 6, 7, 8])];
    const picked = pickCandidates(sources, []);

    assertEquals(picked.candidates.length, 3, 'Only 3 backlog candidates kept by default');
    assertEquals(picked.backlogCount, 3, 'backlogCount is 3');
    assertEquals(picked.backlogMax, 3, 'Effective backlogMax is 3');
    assertEquals(picked.backlogSkipped, 5, 'Excess backlog candidates counted as backlogSkipped');
  }

  // -------------------------------------------------------------------------
  // 3. Priority order preserved: non-backlog first, backlog fills the rest
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 3: Source priority ---');
  {
    const sources: ImportSource[] = [
      makeSource('trending movie', [1, 2]),
      makeSource('backlog movie', [3, 4, 5, 6, 7, 8]),
    ];
    const picked = pickCandidates(sources, []);

    assertEquals(picked.candidates.length, 5, 'Two trending plus capped backlog kept');
    assertEquals(
      picked.candidates[0].source,
      'trending movie',
      'First candidate is from the higher-priority source'
    );
    assertEquals(
      picked.candidates.slice(2).every(c => c.source === 'backlog movie'),
      true,
      'Remaining candidates come from backlog'
    );
    assertEquals(picked.backlogCount, 3, 'Backlog still capped behind trending');
  }

  // -------------------------------------------------------------------------
  // 4. Limit: 12 non-backlog candidates with limit 10 gives 10
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 4: Limit enforcement ---');
  {
    const sources: ImportSource[] = [makeSource('trending movie', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])];
    const picked = pickCandidates(sources, [], { limit: 10 });

    assertEquals(picked.candidates.length, 10, 'Limit 10 keeps exactly 10 non-backlog candidates');
    assertEquals(picked.limit, 10, 'Effective limit is 10');
  }

  // -------------------------------------------------------------------------
  // 5. Explicit limit 50 still works
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 5: Explicit limit 50 ---');
  {
    const options = parseImportCliArgs(['--limit', '50']);
    assertEquals(options.limit, 50, '--limit 50 is accepted');

    const sources: ImportSource[] = [makeSource('trending movie', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])];
    const picked = pickCandidates(sources, [], { limit: 50 });
    assertEquals(picked.candidates.length, 12, 'All 12 candidates kept under limit 50');
    assertEquals(picked.limit, 50, 'Effective limit is 50');
  }

  // -------------------------------------------------------------------------
  // 6. backlogMax greater than limit is clamped to the limit
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 6: backlogMax clamping ---');
  {
    const sources: ImportSource[] = [makeSource('backlog movie', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])];
    const picked = pickCandidates(sources, [], { limit: 5, backlogMax: 20 });

    assertEquals(picked.backlogMax, 5, 'backlogMax clamped to limit');
    assertEquals(picked.candidates.length, 5, 'Backlog yield capped at the limit');

    const cli = parseImportCliArgs(['--limit', '10', '--backlog-max', '20']);
    assertEquals(cli.backlogMax, 10, 'CLI backlogMax clamped to limit');
  }

  // -------------------------------------------------------------------------
  // 7. backlogMax 0 excludes backlog entirely
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 7: backlogMax 0 ---');
  {
    const sources: ImportSource[] = [
      makeSource('trending movie', [1, 2]),
      makeSource('backlog movie', [3, 4, 5]),
    ];
    const picked = pickCandidates(sources, [], { backlogMax: 0 });

    assertEquals(picked.candidates.length, 2, 'Only non-backlog candidates kept');
    assertEquals(
      picked.candidates.every(c => !c.source.startsWith('backlog')),
      true,
      'No candidate from a backlog source'
    );
    assertEquals(picked.backlogCount, 0, 'backlogCount is 0');

    const cli = parseImportCliArgs(['--backlog-max', '0']);
    assertEquals(cli.backlogMax, 0, '--backlog-max 0 is accepted');
  }

  // -------------------------------------------------------------------------
  // 8. Duplicates across sources are still removed
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 8: Duplicate removal ---');
  {
    const sources: ImportSource[] = [
      makeSource('trending movie', [1, 2, 3]),
      makeSource('recent movie', [3, 4]),
      makeSource('backlog movie', [4, 5]),
    ];
    const picked = pickCandidates(sources, [], { limit: 10, backlogMax: 3 });

    assertEquals(picked.duplicatesInLists, 2, 'Both cross-source duplicates counted');
    assertEquals(picked.candidates.length, 5, 'Duplicates removed from candidate list');
    assertEquals(picked.backlogCount, 1, 'Backlog cap not consumed by duplicate entries');
  }

  console.log(`\n============================================================`);
  console.log(`Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`============================================================`);

  if (failed > 0) {
    process.exit(1);
  }
};

runTests();
