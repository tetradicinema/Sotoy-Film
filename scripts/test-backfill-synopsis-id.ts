import {
  MIN_ID_OVERVIEW_LENGTH,
  classifySynopsis,
  normalizeWhitespace,
  parseCliOptions,
  SYNOPSIS_FIELDS,
  type ClassifySynopsisResult,
  type TmdbSynopsisInput,
} from './backfill-synopsis-id';

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

const EN_OVERVIEW =
  'When a mysterious force threatens the city, a young hero must embrace her destiny and unite old rivals before everything she loves is destroyed.';

const ID_OVERVIEW =
  'Ketika kekuatan misterius mengancam kota, seorang pahlawan muda harus menerima takdirnya dan menyatukan para rival lama sebelum segala hal yang ia cintai hancur.';

const makeTmdbEn = (overrides: Partial<{ title: string; originalTitle: string; overview: string }> = {}): {
  title: string;
  originalTitle: string;
  overview: string;
} => ({ title: 'Test Film', originalTitle: 'Test Film', overview: EN_OVERVIEW, ...overrides });

const makeTmdbIdId = (overrides: Partial<{ title: string; originalTitle: string; overview: string }> = {}): {
  title: string;
  originalTitle: string;
  overview: string;
} => ({ title: 'Film Uji', originalTitle: 'Test Film', overview: ID_OVERVIEW, ...overrides });

const makeFilm = (overrides: { tmdbId?: unknown; synopsis?: unknown } = {}): { tmdbId?: unknown; synopsis?: unknown } => ({
  tmdbId: 123,
  synopsis: EN_OVERVIEW,
  ...overrides,
});

const opts = { fillEmpty: false };
const fillOpts = { fillEmpty: true };

const runTests = () => {
  console.log('Running Backfill Synopsis id-ID Tests...\n');

  // ---------------------------------------------------------------------------
  // classifySynopsis: replace
  // ---------------------------------------------------------------------------
  const replace = classifySynopsis(makeFilm(), makeTmdbEn(), makeTmdbIdId(), opts);
  assertEquals(replace.category, 'replace', 'equal to en-US with a real id-ID text -> replace');
  assertEquals(replace.changes, { synopsis: ID_OVERVIEW }, 'replace: changes carry the id-ID overview');

  // Whitespace-only differences still count as equal.
  const messyFilm = makeFilm({ synopsis: `  ${EN_OVERVIEW.replace(/ /g, '  ').replace('mysterious', 'mysterious\n  ')}  ` });
  const messy = classifySynopsis(messyFilm, makeTmdbEn(), makeTmdbIdId(), opts);
  assertEquals(messy.category, 'replace', 'whitespace-only differences still count as equal -> replace');

  // Multi-line / extra-spaced TMDB text still compares equal after normalization.
  const spacedEn = makeTmdbEn({ overview: EN_OVERVIEW.replace('. ', '.\n\n') });
  const spaced = classifySynopsis(makeFilm(), spacedEn, makeTmdbIdId(), opts);
  assertEquals(spaced.category, 'replace', 'whitespace differences in the TMDB text are normalised away');

  // The written value is the trimmed id-ID overview.
  const messyId = makeTmdbIdId({ overview: `  \n ${ID_OVERVIEW} \n ` });
  const messyIdResult = classifySynopsis(makeFilm(), makeTmdbEn(), messyId, opts);
  assertEquals(
    messyIdResult.changes,
    { synopsis: ID_OVERVIEW },
    'the written synopsis is the trimmed id-ID overview'
  );

  // ---------------------------------------------------------------------------
  // Edited synopsis is never touched
  // ---------------------------------------------------------------------------
  const edited = classifySynopsis(
    makeFilm({ synopsis: 'Sinopsis yang sudah diedit kurator. Jauh lebih panjang dan berbeda dari TMDB.' }),
    makeTmdbEn(),
    makeTmdbIdId(),
    opts
  );
  assertEquals(edited.category, 'already-indonesian-or-edited', 'edited synopsis (differs from en-US) -> never touched');
  assertEquals(edited.changes, {}, 'edited synopsis -> no changes');

  // ---------------------------------------------------------------------------
  // no-id-overview
  // ---------------------------------------------------------------------------
  const identical = classifySynopsis(makeFilm(), makeTmdbEn(), makeTmdbIdId({ overview: EN_OVERVIEW }), opts);
  assertEquals(identical.category, 'no-id-overview', 'id-ID identical to en-US -> no-id-overview');
  assertEquals(identical.changes, {}, 'id-ID identical to en-US -> no changes');

  const shortId = makeTmdbIdId({ overview: 'Terlalu pendek.' });
  assertEquals(
    shortId.overview.trim().length < MIN_ID_OVERVIEW_LENGTH,
    true,
    'test setup: the short id-ID overview is below the minimum length'
  );
  const tooShort = classifySynopsis(makeFilm(), makeTmdbEn(), shortId, opts);
  assertEquals(tooShort.category, 'no-id-overview', 'id-ID shorter than 40 chars -> no-id-overview');

  const emptyId = classifySynopsis(makeFilm(), makeTmdbEn(), makeTmdbIdId({ overview: '   ' }), opts);
  assertEquals(emptyId.category, 'no-id-overview', 'empty id-ID overview -> no-id-overview');

  const missingOverview = classifySynopsis(
    makeFilm(),
    makeTmdbEn(),
    makeTmdbIdId({ overview: undefined as unknown as string }),
    opts
  );
  assertEquals(missingOverview.category, 'no-id-overview', 'missing id-ID overview field -> no-id-overview');

  // Exactly 40 chars is usable.
  const forty = 'A'.repeat(40);
  const exactlyForty = classifySynopsis(makeFilm(), makeTmdbEn(), makeTmdbIdId({ overview: forty }), opts);
  assertEquals(exactlyForty.category, 'replace', 'id-ID overview of exactly 40 chars is usable');

  // ---------------------------------------------------------------------------
  // empty-fillable
  // ---------------------------------------------------------------------------
  const emptyFilm = makeFilm({ synopsis: '' });
  const emptyReport = classifySynopsis(emptyFilm, makeTmdbEn(), makeTmdbIdId(), opts);
  assertEquals(emptyReport.category, 'empty-fillable', 'empty synopsis with id-ID available -> empty-fillable');
  assertEquals(emptyReport.changes, {}, 'empty-fillable without --fill-empty -> no change');

  const emptyFill = classifySynopsis(emptyFilm, makeTmdbEn(), makeTmdbIdId(), fillOpts);
  assertEquals(emptyFill.category, 'empty-fillable', 'empty synopsis with --fill-empty -> empty-fillable');
  assertEquals(emptyFill.changes, { synopsis: ID_OVERVIEW }, 'empty-fillable with --fill-empty -> the id-ID overview is written');

  const emptyWhitespaceFilm = makeFilm({ synopsis: '   \n  ' });
  const emptyWhitespace = classifySynopsis(emptyWhitespaceFilm, makeTmdbEn(), makeTmdbIdId(), opts);
  assertEquals(emptyWhitespace.category, 'empty-fillable', 'whitespace-only synopsis counts as empty');

  const emptyNoId = classifySynopsis(emptyFilm, makeTmdbEn(), makeTmdbIdId({ overview: EN_OVERVIEW }), fillOpts);
  assertEquals(emptyNoId.category, 'no-id-overview', 'empty synopsis with unusable id-ID -> no-id-overview even with --fill-empty');

  // ---------------------------------------------------------------------------
  // skip (already backfilled)
  // ---------------------------------------------------------------------------
  const alreadyDone = classifySynopsis(makeFilm({ synopsis: ID_OVERVIEW }), makeTmdbEn(), makeTmdbIdId(), opts);
  assertEquals(alreadyDone.category, 'skip', 'synopsis already equals the id-ID overview -> skip');
  assertEquals(alreadyDone.changes, {}, 'already backfilled -> no changes');

  // ---------------------------------------------------------------------------
  // no-tmdb-data
  // ---------------------------------------------------------------------------
  const unavailable: TmdbSynopsisInput = 'unavailable';
  const enUnavailable = classifySynopsis(makeFilm(), unavailable, makeTmdbIdId(), opts);
  assertEquals(enUnavailable.category, 'no-tmdb-data', 'unavailable en-US TMDB -> no change');
  assertEquals(enUnavailable.changes, {}, 'unavailable en-US -> no changes');

  const idUnavailable = classifySynopsis(makeFilm(), makeTmdbEn(), unavailable, opts);
  assertEquals(idUnavailable.category, 'no-tmdb-data', 'unavailable id-ID TMDB -> no change');
  assertEquals(idUnavailable.changes, {}, 'unavailable id-ID -> no changes');

  const notFetched = classifySynopsis(makeFilm(), null, null, opts);
  assertEquals(notFetched.category, 'no-tmdb-data', 'null TMDB (not fetched) -> no change');

  // ---------------------------------------------------------------------------
  // no-tmdb-id
  // ---------------------------------------------------------------------------
  const noId = classifySynopsis(makeFilm({ tmdbId: undefined }), makeTmdbEn(), makeTmdbIdId(), opts);
  assertEquals(noId.category, 'no-tmdb-id', 'no tmdbId -> no-tmdb-id, no change');
  assertEquals(noId.changes, {}, 'no tmdbId -> no changes');

  const zeroId = classifySynopsis(makeFilm({ tmdbId: 0 }), makeTmdbEn(), makeTmdbIdId(), opts);
  assertEquals(zeroId.category, 'no-tmdb-id', 'tmdbId 0 is not a valid id');

  const nanId = classifySynopsis(makeFilm({ tmdbId: 'abc' }), makeTmdbEn(), makeTmdbIdId(), opts);
  assertEquals(nanId.category, 'no-tmdb-id', 'non-numeric tmdbId is not a valid id');

  const nullFilm = classifySynopsis(null, makeTmdbEn(), makeTmdbIdId(), opts);
  assertEquals(nullFilm.category, 'no-tmdb-id', 'null film -> no-tmdb-id, no throw');

  // ---------------------------------------------------------------------------
  // Whitelist: only the synopsis field can ever appear in changes
  // ---------------------------------------------------------------------------
  const allResults: ClassifySynopsisResult[] = [
    replace,
    messy,
    spaced,
    messyIdResult,
    edited,
    identical,
    tooShort,
    emptyId,
    missingOverview,
    exactlyForty,
    emptyReport,
    emptyFill,
    emptyWhitespace,
    emptyNoId,
    alreadyDone,
    enUnavailable,
    idUnavailable,
    notFetched,
    noId,
    zeroId,
    nanId,
    nullFilm,
  ];
  const usedFields = new Set(allResults.flatMap((result) => Object.keys(result.changes)));
  assert(
    Array.from(usedFields).every((field) => (SYNOPSIS_FIELDS as readonly string[]).includes(field)),
    'whitelist: every produced change is the synopsis field'
  );
  assert(
    Array.from(usedFields).every((field) => field === 'synopsis'),
    'whitelist: synopsis is the only field ever written'
  );

  // ---------------------------------------------------------------------------
  // Idempotency: applying the changes, then classifying again -> no changes
  // ---------------------------------------------------------------------------
  const applyAndReclassify = (
    film: { tmdbId?: unknown; synopsis?: unknown },
    result: ClassifySynopsisResult
  ): ClassifySynopsisResult => {
    const newSynopsis = result.changes.synopsis;
    const applied = newSynopsis === undefined ? film : { ...film, synopsis: newSynopsis };
    return classifySynopsis(applied, makeTmdbEn(), makeTmdbIdId(), opts);
  };

  const idemReplace = applyAndReclassify(makeFilm(), replace);
  assertEquals(idemReplace.changes, {}, 'idempotency: replaced film -> no further changes');

  const idemFill = applyAndReclassify(emptyFilm, emptyFill);
  assertEquals(idemFill.changes, {}, 'idempotency: filled film -> no further changes');

  // ---------------------------------------------------------------------------
  // normalizeWhitespace
  // ---------------------------------------------------------------------------
  assertEquals(normalizeWhitespace('  a\n\n b \t c '), 'a b c', 'normalizeWhitespace collapses and trims');
  assertEquals(normalizeWhitespace(undefined), '', 'normalizeWhitespace: undefined -> empty string');
  assertEquals(normalizeWhitespace(null), '', 'normalizeWhitespace: null -> empty string');

  // ---------------------------------------------------------------------------
  // CLI parsing
  // ---------------------------------------------------------------------------
  assertEquals(
    parseCliOptions([]),
    { apply: false, fillEmpty: false, limit: undefined, restorePath: undefined },
    'CLI: defaults'
  );
  assertEquals(
    parseCliOptions(['--apply', '--fill-empty']),
    { apply: true, fillEmpty: true, limit: undefined, restorePath: undefined },
    'CLI: parses boolean flags'
  );
  assertEquals(
    parseCliOptions(['--limit', '5', '--apply']),
    { apply: true, fillEmpty: false, limit: 5, restorePath: undefined },
    'CLI: --limit with a separate value'
  );
  assertEquals(
    parseCliOptions(['--limit=12']),
    { apply: false, fillEmpty: false, limit: 12, restorePath: undefined },
    'CLI: --limit with an inline value'
  );
  assertEquals(
    parseCliOptions(['--restore=data/synopsis-id-backup-x.json', '--apply']),
    { apply: true, fillEmpty: false, limit: undefined, restorePath: 'data/synopsis-id-backup-x.json' },
    'CLI: --restore=path is parsed'
  );

  const expectCliError = (argv: string[], message: string, mustInclude: string) => {
    try {
      parseCliOptions(argv);
      assert(false, `${message} (expected an error containing "${mustInclude}")`);
    } catch (err: any) {
      assert(
        String(err?.message || '').includes(mustInclude),
        `${message} (got: "${String(err?.message || err)}")`
      );
    }
  };

  expectCliError(['--bogus'], 'CLI: unknown flag is rejected', 'Unknown flag: --bogus');
  expectCliError(['--limit'], 'CLI: missing value for --limit is rejected', 'Missing value for --limit');
  expectCliError(['--limit', '0'], 'CLI: --limit 0 is rejected', '--limit must be a positive integer');
  expectCliError(['--limit', '-3'], 'CLI: --limit -3 is rejected', '--limit must be a positive integer');
  expectCliError(['--limit', '2.5'], 'CLI: non-integer --limit is rejected', '--limit must be a positive integer');
  expectCliError(['--limit', 'abc'], 'CLI: non-numeric --limit is rejected', '--limit must be a positive integer');
  expectCliError(['--restore'], 'CLI: missing value for --restore is rejected', 'Missing value for --restore');

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
};

runTests();
