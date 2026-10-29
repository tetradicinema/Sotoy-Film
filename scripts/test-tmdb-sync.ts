import { FilmItem } from '../src/types';
import {
  decideTmdbFallback,
  pickIdReleaseDate,
  getBadgeColor,
  buildWhereToWatch,
  isPlaceholderWhereToWatch,
  computeInTheatres,
  computeFilmSyncUpdate,
  evaluateFilmSync,
  titlesMatch,
  mapTmdbOriginCountry,
  normalizeCountryCodes,
  originCountryEqual,
  TmdbSyncData,
} from '../src/utils/tmdbSync';
import { fetchTmdbSyncData } from '../src/utils/tmdbServerFetch';

const FIXED_NOW = new Date('2026-10-19T12:00:00Z');
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const createFilm = (overrides: Partial<FilmItem> = {}): FilmItem => ({
  id: 'film-test',
  tmdbId: 123,
  title: 'Test Film',
  type: 'movie',
  year: 2026,
  releaseDate: undefined,
  idReleaseDate: undefined,
  whereToWatch: [],
  genres: [],
  ...overrides,
});

const createSync = (overrides: Partial<TmdbSyncData> = {}): TmdbSyncData => ({
  tmdbId: 123,
  type: 'movie',
  title: 'Test Film',
  originalTitle: 'Test Film',
  releaseDate: '2026-10-02',
  releaseDatesID: [],
  providersID: { flatrate: [], rent: [], buy: [] },
  status: 'Released',
  originCountry: [],
  ...overrides,
});

const daysAgoIso = (days: number): string =>
  new Date(FIXED_NOW.getTime() - days * MS_PER_DAY).toISOString().slice(0, 10);

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

/**
 * Runs a callback while `globalThis.fetch` returns the supplied TMDB payload,
 * restoring the original implementation afterwards.
 */
const withFakeFetch = async (payload: any, fn: () => Promise<void>): Promise<void> => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => ({
    ok: true,
    status: 200,
    json: async () => payload,
  })) as any;

  try {
    await fn();
  } finally {
    globalThis.fetch = originalFetch;
  }
};

const runTests = async () => {
  console.log('Running TMDB Sync Tests...\n');

  // -------------------------------------------------------------------------
  // pickIdReleaseDate
  // -------------------------------------------------------------------------

  // 1
  assertEquals(
    pickIdReleaseDate([
      { type: 3, date: '2026-10-10' },
      { type: 3, date: '2026-10-02' },
      { type: 2, date: '2026-09-01' },
    ]),
    '2026-10-02',
    'pickIdReleaseDate picks the earliest theatrical type 3 date'
  );

  // 2
  assertEquals(
    pickIdReleaseDate([
      { type: 3, date: 'invalid' },
      { type: 2, date: '2026-09-15' },
      { type: 2, date: '2026-09-10' },
    ]),
    '2026-09-10',
    'pickIdReleaseDate falls back to the earliest valid type 2 date'
  );

  // 3
  assertEquals(
    pickIdReleaseDate([]),
    undefined,
    'pickIdReleaseDate returns undefined when there are no dates'
  );

  // 4
  assertEquals(
    pickIdReleaseDate([
      { type: 4, date: '2026-01-01' },
      { type: 5, date: '2026-02-02' },
    ]),
    undefined,
    'pickIdReleaseDate never guesses from digital or other release types'
  );

  // 5
  assertEquals(
    pickIdReleaseDate([
      { type: 3, date: '2026-13-01' },
      { type: 3, date: 'not-a-date' },
      { type: 3, date: '' },
    ]),
    undefined,
    'pickIdReleaseDate ignores invalid calendar dates'
  );

  // 6
  assertEquals(
    pickIdReleaseDate([{ type: 3, date: '2026-10-02T00:00:00.000Z' }]),
    '2026-10-02',
    'pickIdReleaseDate normalizes a valid date-time to YYYY-MM-DD'
  );

  // -------------------------------------------------------------------------
  // getBadgeColor / buildWhereToWatch
  // -------------------------------------------------------------------------

  // 7
  assertEquals(getBadgeColor('Netflix'), '#E50914', 'getBadgeColor returns the Netflix color');

  // 8
  assertEquals(
    getBadgeColor('HBO Max'),
    '#5A2CD9',
    'getBadgeColor normalizes an HBO Max alias to Max'
  );

  // 9
  assertEquals(
    getBadgeColor('Some Unknown Platform'),
    '#475569',
    'getBadgeColor falls back to the default slate color'
  );

  // 9a
  assertEquals(
    getBadgeColor('Crunchyroll'),
    '#F47521',
    'getBadgeColor returns the Crunchyroll color'
  );

  // 9b
  assertEquals(
    {
      catchplay: getBadgeColor('Catchplay'),
      mubi: getBadgeColor('Mubi'),
    },
    {
      catchplay: '#E4007F',
      mubi: '#1E1E1E',
    },
    'getBadgeColor returns the Catchplay and MUBI colors'
  );

  // 10
  assertEquals(
    buildWhereToWatch({
      existing: [
        { type: 'cinema', platform: 'Bioskop / Cinema', badgeColor: '#E50914' },
        { type: 'stream', platform: 'Netflix', badgeColor: '#E50914' },
      ],
      providersFlatrate: [],
      inTheatres: false,
    }),
    [],
    'buildWhereToWatch drops placeholder and manual entries when TMDB has nothing'
  );

  // 11
  assertEquals(
    buildWhereToWatch({
      existing: [
        { type: 'cinema', platform: 'Cinema XXI', badgeColor: '#111111' },
        { type: 'rent', platform: 'Google Play', badgeColor: '#222222' },
        { type: 'stream', platform: 'Vidio', badgeColor: '#E2231A' },
      ],
      providersFlatrate: ['Netflix'],
      inTheatres: false,
    }),
    [{ type: 'stream', platform: 'Netflix', badgeColor: '#E50914', source: 'tmdb' }],
    'buildWhereToWatch discards manual entries and keeps only TMDB providers'
  );

  // 11a
  assertEquals(
    buildWhereToWatch({
      existing: [{ type: 'cinema', platform: 'Bioskop / Cinema', badgeColor: '#E50914' }],
      providersFlatrate: ['Netflix'],
      inTheatres: true,
    }),
    [
      { type: 'cinema', platform: 'Bioskop', badgeColor: '#E50914', source: 'tmdb' },
      { type: 'stream', platform: 'Netflix', badgeColor: '#E50914', source: 'tmdb' },
    ],
    'buildWhereToWatch rebuilds only TMDB cinema and flatrate entries'
  );

  // 11b
  assertEquals(
    isPlaceholderWhereToWatch({ type: 'stream', platform: '  TMDB Global  ', badgeColor: '#000' }),
    true,
    'isPlaceholderWhereToWatch detects TMDB Global ignoring case and whitespace'
  );
  assertEquals(
    isPlaceholderWhereToWatch({ type: 'cinema', platform: 'bioskop / cinema', badgeColor: '#000' }),
    true,
    'isPlaceholderWhereToWatch detects Bioskop / Cinema ignoring case'
  );
  assertEquals(
    isPlaceholderWhereToWatch({ type: 'stream', platform: 'Netflix', badgeColor: '#000' }),
    false,
    'isPlaceholderWhereToWatch ignores real platforms'
  );

  // 12
  const deduped = buildWhereToWatch({
    existing: [],
    providersFlatrate: ['Amazon Prime Video', 'Prime Video', 'Netflix'],
    inTheatres: false,
  });
  assertEquals(
    deduped,
    [
      { type: 'stream', platform: 'Netflix', badgeColor: '#E50914', source: 'tmdb' },
      { type: 'stream', platform: 'Prime Video', badgeColor: '#00A8E1', source: 'tmdb' },
    ],
    'buildWhereToWatch dedupes providers after normalization'
  );

  // 13
  assertEquals(
    buildWhereToWatch({
      existing: [],
      providersFlatrate: ['Disney Plus'],
      inTheatres: false,
    }),
    [{ type: 'stream', platform: 'Disney+ Hotstar', badgeColor: '#1B3F94', source: 'tmdb' }],
    'buildWhereToWatch normalizes Disney Plus to Disney+ Hotstar'
  );

  // 14
  assertEquals(
    buildWhereToWatch({
      existing: [
        { type: 'stream', platform: 'Vidio', badgeColor: '#E2231A' },
        { type: 'cinema', platform: 'Bioskop / Cinema', badgeColor: '#E50914' },
      ],
      providersFlatrate: ['Prime Video', 'Netflix'],
      inTheatres: true,
    }).map(entry => `${entry.type}:${entry.platform}`),
    ['cinema:Bioskop', 'stream:Netflix', 'stream:Prime Video'],
    'buildWhereToWatch returns cinema first, then streams sorted by platform name'
  );

  // 15
  assertEquals(
    buildWhereToWatch({ existing: [], providersFlatrate: ['Netflix'], inTheatres: false }),
    [{ type: 'stream', platform: 'Netflix', badgeColor: '#E50914', source: 'tmdb' }],
    'buildWhereToWatch does not add cinema when inTheatres is false'
  );

  // 16
  assertEquals(
    buildWhereToWatch({ existing: [], providersFlatrate: [], inTheatres: true }),
    [{ type: 'cinema', platform: 'Bioskop', badgeColor: '#E50914', source: 'tmdb' }],
    'buildWhereToWatch adds Bioskop when inTheatres is true'
  );

  // 17
  assertEquals(
    buildWhereToWatch({
      existing: [
        { type: 'stream', platform: 'Netflix', badgeColor: '#E50914', source: 'tmdb' },
        { type: 'cinema', platform: 'Bioskop', badgeColor: '#E50914', source: 'tmdb' },
      ],
      providersFlatrate: [],
      inTheatres: false,
    }),
    [],
    'buildWhereToWatch removes previous TMDB entries before rebuilding'
  );

  // 18
  assertEquals(
    buildWhereToWatch({
      existing: [{ type: 'stream', platform: 'Netflix', badgeColor: '#E50914' }],
      providersFlatrate: ['Netflix'],
      inTheatres: false,
    }),
    [{ type: 'stream', platform: 'Netflix', badgeColor: '#E50914', source: 'tmdb' }],
    'buildWhereToWatch replaces a manual platform pair with the TMDB entry'
  );

  // -------------------------------------------------------------------------
  // computeInTheatres
  // -------------------------------------------------------------------------

  // 19
  assertEquals(
    computeInTheatres({
      mediaType: 'tv',
      tmdbId: 123,
      nowPlayingIds: [123],
      idReleaseDate: daysAgoIso(1),
      now: FIXED_NOW,
    }),
    false,
    'computeInTheatres is false for tv media even when in now playing'
  );

  // 20
  assertEquals(
    computeInTheatres({
      mediaType: 'movie',
      tmdbId: 123,
      nowPlayingIds: [123],
      idReleaseDate: daysAgoIso(1),
      now: FIXED_NOW,
    }),
    true,
    'computeInTheatres is true for an animation film fetched as movie and in now playing'
  );

  // 21
  assertEquals(
    computeInTheatres({
      mediaType: 'movie',
      tmdbId: 123,
      nowPlayingIds: [999, 123],
      now: FIXED_NOW,
    }),
    true,
    'computeInTheatres is true when tmdbId is in now playing'
  );

  // 22
  assertEquals(
    computeInTheatres({
      mediaType: 'movie',
      tmdbId: 123,
      nowPlayingIds: [],
      idReleaseDate: daysAgoIso(56),
      now: FIXED_NOW,
    }),
    true,
    'computeInTheatres includes a release exactly 56 days ago'
  );

  // 23
  assertEquals(
    computeInTheatres({
      mediaType: 'movie',
      tmdbId: 123,
      nowPlayingIds: [],
      idReleaseDate: daysAgoIso(57),
      now: FIXED_NOW,
    }),
    false,
    'computeInTheatres excludes a release 57 days ago'
  );

  // 24
  assertEquals(
    computeInTheatres({
      mediaType: 'movie',
      tmdbId: 123,
      nowPlayingIds: [],
      now: FIXED_NOW,
    }),
    false,
    'computeInTheatres is false when there is no release date'
  );

  // 25
  assertEquals(
    computeInTheatres({
      mediaType: 'movie',
      tmdbId: 123,
      nowPlayingIds: [],
      idReleaseDate: '2026-12-01',
      now: FIXED_NOW,
    }),
    false,
    'computeInTheatres is false for a future release date'
  );

  // 26
  assertEquals(
    computeInTheatres({
      mediaType: 'movie',
      tmdbId: 123,
      nowPlayingIds: [],
      idReleaseDate: 'not-a-date',
      now: FIXED_NOW,
    }),
    false,
    'computeInTheatres is false for an invalid release date'
  );

  // -------------------------------------------------------------------------
  // titlesMatch
  // -------------------------------------------------------------------------

  // 27
  assertEquals(
    titlesMatch(createFilm({ title: 'Dune' }), createSync({ title: 'Dune' })),
    true,
    'titlesMatch accepts an exact normalized title'
  );

  // 28
  assertEquals(
    titlesMatch(createFilm({ title: 'Amelie' }), createSync({ title: 'Amélie' })),
    true,
    'titlesMatch ignores accents'
  );

  // 29
  assertEquals(
    titlesMatch(
      createFilm({ title: 'Spider-Man: No Way Home' }),
      createSync({ title: 'Spider Man No Way Home' })
    ),
    true,
    'titlesMatch ignores punctuation differences'
  );

  // 30
  assertEquals(
    titlesMatch(createFilm({ title: 'Dune' }), createSync({ title: 'Dune: Part Two' })),
    true,
    'titlesMatch accepts a longer TMDB subtitle containing the film title'
  );

  // 31
  assertEquals(
    titlesMatch(createFilm({ title: 'Dune: Part Two' }), createSync({ title: 'Dune' })),
    true,
    'titlesMatch accepts a film title containing the TMDB title'
  );

  // 32
  assertEquals(
    titlesMatch(
      createFilm({ title: 'The Rainbow Troops', originalTitle: 'Laskar Pelangi' }),
      createSync({ title: 'Laskar Pelangi' })
    ),
    true,
    'titlesMatch checks the film originalTitle'
  );

  // 33
  assertEquals(
    titlesMatch(
      createFilm({ title: 'The Rainbow Troops' }),
      createSync({ title: 'Unknown', originalTitle: 'The Rainbow Troops' })
    ),
    true,
    'titlesMatch checks the TMDB originalTitle'
  );

  // 34
  assertEquals(
    titlesMatch(createFilm({ title: 'Up' }), createSync({ title: 'Up' })),
    true,
    'titlesMatch accepts a short exact title'
  );

  // 35
  assertEquals(
    titlesMatch(createFilm({ title: 'Up' }), createSync({ title: 'Up in the Air' })),
    false,
    'titlesMatch does not use containment for short titles'
  );

  // 36
  assertEquals(
    titlesMatch(createFilm({ title: 'Dune' }), createSync({ title: 'Arrival' })),
    false,
    'titlesMatch rejects unrelated titles'
  );

  // 37
  assertEquals(
    titlesMatch(
      createFilm({ title: '', originalTitle: '' }),
      createSync({ title: 'Dune' })
    ),
    false,
    'titlesMatch rejects an empty film title'
  );

  // 38
  assertEquals(
    titlesMatch(
      createFilm({ title: 'Dune' }),
      createSync({ title: '', originalTitle: '' })
    ),
    false,
    'titlesMatch rejects an empty TMDB title'
  );

  // -------------------------------------------------------------------------
  // evaluateFilmSync
  // -------------------------------------------------------------------------

  // 39
  const noTmdbEvaluation = evaluateFilmSync({
    film: createFilm({ tmdbId: undefined }),
    sync: createSync(),
    nowPlayingIds: [],
    now: FIXED_NOW,
  });
  assertEquals(
    noTmdbEvaluation.status,
    'no_tmdb_id',
    'evaluateFilmSync returns no_tmdb_id without a TMDB ID'
  );
  assertEquals(
    noTmdbEvaluation.result,
    undefined,
    'evaluateFilmSync returns no result for no_tmdb_id'
  );

  // 40
  const mismatchEvaluation = evaluateFilmSync({
    film: createFilm({ title: 'Dune' }),
    sync: createSync({ title: 'Arrival' }),
    nowPlayingIds: [],
    now: FIXED_NOW,
  });
  assertEquals(
    mismatchEvaluation.status,
    'title_mismatch',
    'evaluateFilmSync returns title_mismatch for a different title'
  );
  assertEquals(
    mismatchEvaluation.result,
    undefined,
    'evaluateFilmSync returns no result for title_mismatch'
  );

  // 41
  const unchangedFilm = createFilm({
    idReleaseDate: '2026-10-02',
    releaseDate: '2026-10-02',
    whereToWatch: [
      { type: 'cinema', platform: 'Bioskop', badgeColor: '#E50914', source: 'tmdb' },
      { type: 'stream', platform: 'Netflix', badgeColor: '#E50914', source: 'tmdb' },
    ],
  });
  const unchangedEvaluation = evaluateFilmSync({
    film: unchangedFilm,
    sync: createSync({
      releaseDatesID: [{ type: 3, date: '2026-10-02' }],
      providersID: { flatrate: ['Netflix'], rent: [], buy: [] },
    }),
    nowPlayingIds: [123],
    now: FIXED_NOW,
  });
  assertEquals(
    unchangedEvaluation.status,
    'unchanged',
    'evaluateFilmSync returns unchanged when nothing differs'
  );
  assertEquals(
    unchangedEvaluation.result,
    undefined,
    'evaluateFilmSync returns no result for unchanged'
  );

  // 42
  const okEvaluation = evaluateFilmSync({
    film: createFilm({ title: 'Dune' }),
    sync: createSync({
      title: 'Dune',
      releaseDatesID: [{ type: 3, date: '2026-10-02' }],
    }),
    nowPlayingIds: [],
    now: FIXED_NOW,
  });
  assertEquals(okEvaluation.status, 'ok', 'evaluateFilmSync returns ok when there are updates');
  assertEquals(
    okEvaluation.result?.updates.idReleaseDate,
    '2026-10-02',
    'evaluateFilmSync exposes the update result for ok'
  );

  // -------------------------------------------------------------------------
  // computeFilmSyncUpdate
  // -------------------------------------------------------------------------

  // 27
  const dateUpdate = computeFilmSyncUpdate({
    film: createFilm({ idReleaseDate: undefined, releaseDate: undefined }),
    sync: createSync({
      releaseDatesID: [{ type: 3, date: '2026-10-02' }],
      releaseDate: '2026-10-02',
    }),
    nowPlayingIds: [],
    now: FIXED_NOW,
  });
  assertEquals(
    dateUpdate?.updates.idReleaseDate,
    '2026-10-02',
    'computeFilmSyncUpdate sets idReleaseDate from the picked theatrical date'
  );
  assertEquals(
    dateUpdate?.updates.releaseDate,
    '2026-10-02',
    'computeFilmSyncUpdate sets releaseDate when the film has none'
  );

  // 28
  const existingRelease = computeFilmSyncUpdate({
    film: createFilm({
      releaseDate: '2020-01-01',
      idReleaseDate: '2026-10-02',
      whereToWatch: [
        { type: 'cinema', platform: 'Bioskop', badgeColor: '#E50914', source: 'tmdb' },
      ],
    }),
    sync: createSync({
      releaseDatesID: [{ type: 3, date: '2026-10-02' }],
      releaseDate: '2026-10-02',
    }),
    nowPlayingIds: [],
    now: FIXED_NOW,
  });
  assertEquals(
    existingRelease,
    null,
    'computeFilmSyncUpdate never overwrites an existing releaseDate'
  );

  // 29
  const invalidRelease = computeFilmSyncUpdate({
    film: createFilm({ releaseDate: undefined }),
    sync: createSync({ releaseDate: 'not-a-date', releaseDatesID: [] }),
    nowPlayingIds: [],
    now: FIXED_NOW,
  });
  assertEquals(
    invalidRelease,
    null,
    'computeFilmSyncUpdate ignores an invalid TMDB releaseDate'
  );

  // 30
  const fallbackDate = computeFilmSyncUpdate({
    film: createFilm({ idReleaseDate: undefined }),
    sync: createSync({ releaseDatesID: [{ type: 2, date: '2026-09-20' }], releaseDate: '' }),
    nowPlayingIds: [],
    now: FIXED_NOW,
  });
  assertEquals(
    fallbackDate?.updates.idReleaseDate,
    '2026-09-20',
    'computeFilmSyncUpdate sets idReleaseDate from a type 2 fallback'
  );

  // 31
  const noTmdbId = computeFilmSyncUpdate({
    film: createFilm({ tmdbId: undefined }),
    sync: createSync({ releaseDatesID: [{ type: 3, date: '2026-10-02' }] }),
    nowPlayingIds: [],
    now: FIXED_NOW,
  });
  assertEquals(noTmdbId, null, 'computeFilmSyncUpdate never modifies films without tmdbId');

  // 32
  const providerUpdate = computeFilmSyncUpdate({
    film: createFilm({
      idReleaseDate: '2026-10-02',
      whereToWatch: [{ type: 'cinema', platform: 'Bioskop / Cinema', badgeColor: '#E50914' }],
    }),
    sync: createSync({
      releaseDatesID: [{ type: 3, date: '2026-10-02' }],
      releaseDate: '2026-10-02',
      providersID: { flatrate: ['Amazon Prime Video', 'Netflix'], rent: [], buy: [] },
    }),
    nowPlayingIds: [123],
    now: FIXED_NOW,
  });
  assertEquals(
    providerUpdate?.updates.whereToWatch,
    [
      { type: 'cinema', platform: 'Bioskop', badgeColor: '#E50914', source: 'tmdb' },
      { type: 'stream', platform: 'Netflix', badgeColor: '#E50914', source: 'tmdb' },
      { type: 'stream', platform: 'Prime Video', badgeColor: '#00A8E1', source: 'tmdb' },
    ],
    'computeFilmSyncUpdate rebuilds whereToWatch from flatrate providers and cinema status'
  );

  // 33
  assert(
    Boolean(providerUpdate?.changes.includes('hapus placeholder bioskop')) &&
      Boolean(providerUpdate?.changes.includes('streaming: Netflix, Prime Video')) &&
      Boolean(providerUpdate?.changes.includes('bioskop: ya')),
    'computeFilmSyncUpdate reports placeholder, streaming, and cinema changes'
  );

  // 34
  assert(
    Object.keys(providerUpdate?.updates || {}).every(key =>
      ['idReleaseDate', 'releaseDate', 'whereToWatch', 'originCountry'].includes(key)
    ),
    'computeFilmSyncUpdate only writes idReleaseDate, releaseDate, whereToWatch, and originCountry'
  );

  // 34a
  const manualRemoval = computeFilmSyncUpdate({
    film: createFilm({
      releaseDate: '2026-10-02',
      whereToWatch: [
        { type: 'stream', platform: 'Vidio', badgeColor: '#E2231A' },
        { type: 'stream', platform: 'TMDB Global', badgeColor: 'bg-cyan-500' },
      ],
    }),
    sync: createSync({ releaseDate: '2026-10-02' }),
    nowPlayingIds: [],
    now: FIXED_NOW,
  });
  assertEquals(
    manualRemoval?.updates.whereToWatch,
    [],
    'computeFilmSyncUpdate empties whereToWatch when TMDB has no availability'
  );
  assert(
    Boolean(manualRemoval?.changes.includes('hapus data non-TMDB')),
    'computeFilmSyncUpdate reports removal of non-TMDB data'
  );

  // 35
  const identicalFilm = createFilm({
    idReleaseDate: '2026-10-02',
    releaseDate: '2026-10-02',
    whereToWatch: [
      { type: 'cinema', platform: 'Bioskop', badgeColor: '#E50914', source: 'tmdb' },
      { type: 'stream', platform: 'Netflix', badgeColor: '#E50914', source: 'tmdb' },
    ],
  });
  const identical = computeFilmSyncUpdate({
    film: identicalFilm,
    sync: createSync({
      releaseDatesID: [{ type: 3, date: '2026-10-02' }],
      releaseDate: '2026-10-02',
      providersID: { flatrate: ['Netflix'], rent: [], buy: [] },
    }),
    nowPlayingIds: [123],
    now: FIXED_NOW,
  });
  assertEquals(identical, null, 'computeFilmSyncUpdate returns null when nothing changes');

  // 36
  const noCinema = computeFilmSyncUpdate({
    film: createFilm({
      idReleaseDate: '2026-10-02',
      releaseDate: '2026-10-02',
      whereToWatch: [
        { type: 'cinema', platform: 'Bioskop', badgeColor: '#E50914', source: 'tmdb' },
        { type: 'stream', platform: 'Netflix', badgeColor: '#E50914', source: 'tmdb' },
      ],
    }),
    sync: createSync({
      releaseDatesID: [{ type: 3, date: '2026-10-02' }],
      releaseDate: '2026-10-02',
      providersID: { flatrate: ['Netflix'], rent: [], buy: [] },
    }),
    nowPlayingIds: [],
    now: FIXED_NOW,
  });
  assertEquals(
    noCinema,
    null,
    'computeFilmSyncUpdate keeps theatrical cinema while inside the 56-day window'
  );

  // 37
  const outsideWindow = computeFilmSyncUpdate({
    film: createFilm({
      idReleaseDate: daysAgoIso(57),
      releaseDate: '2026-08-01',
      whereToWatch: [
        { type: 'cinema', platform: 'Bioskop', badgeColor: '#E50914', source: 'tmdb' },
      ],
    }),
    sync: createSync({
      releaseDatesID: [{ type: 3, date: daysAgoIso(57) }],
      releaseDate: '2026-08-01',
      providersID: { flatrate: [], rent: [], buy: [] },
    }),
    nowPlayingIds: [],
    now: FIXED_NOW,
  });
  assertEquals(
    outsideWindow?.updates.whereToWatch,
    [],
    'computeFilmSyncUpdate removes stale cinema after the 56-day window'
  );

  // -------------------------------------------------------------------------
  // decideTmdbFallback
  // -------------------------------------------------------------------------

  // 38
  const fallbackAfterError = decideTmdbFallback('animation', 'error', 'ok');
  assertEquals(
    fallbackAfterError.retryAlternate,
    true,
    'decideTmdbFallback retries the other media type when animation fetch errors'
  );
  assertEquals(
    fallbackAfterError.useAlternate,
    true,
    'decideTmdbFallback uses the alternate result after a fetch error'
  );
  assertEquals(
    fallbackAfterError.finalStatus,
    'ok',
    'decideTmdbFallback reports the successful alternate status'
  );

  // 39
  const fallbackBothErrors = decideTmdbFallback('animation', 'error', 'error');
  assertEquals(
    fallbackBothErrors.retryAlternate,
    true,
    'decideTmdbFallback still retries the alternate after a 404'
  );
  assertEquals(
    fallbackBothErrors.useAlternate,
    false,
    'decideTmdbFallback does not use a failed alternate'
  );
  assertEquals(
    fallbackBothErrors.finalStatus,
    'error',
    'decideTmdbFallback counts an error only when both attempts fail'
  );

  // 40
  const fallbackAfterMismatch = decideTmdbFallback('animation', 'title_mismatch', 'ok');
  assertEquals(
    fallbackAfterMismatch.retryAlternate,
    true,
    'decideTmdbFallback retries the other media type after a title mismatch'
  );
  assertEquals(
    fallbackAfterMismatch.useAlternate,
    true,
    'decideTmdbFallback uses the alternate result after a title mismatch'
  );
  assertEquals(
    fallbackAfterMismatch.finalStatus,
    'ok',
    'decideTmdbFallback reports ok when the alternate title matches'
  );

  // 41
  const fallbackMovie = decideTmdbFallback('movie', 'error', 'ok');
  assertEquals(
    fallbackMovie.retryAlternate,
    false,
    'decideTmdbFallback never retries for movie films'
  );
  assertEquals(
    fallbackMovie.useAlternate,
    false,
    'decideTmdbFallback ignores an alternate result for movie films'
  );
  assertEquals(
    fallbackMovie.finalStatus,
    'error',
    'decideTmdbFallback keeps the primary error for movie films'
  );

  // 42
  const fallbackMismatchThenError = decideTmdbFallback('animation', 'title_mismatch', 'error');
  assertEquals(
    fallbackMismatchThenError.finalStatus,
    'title_mismatch',
    'decideTmdbFallback keeps a known title mismatch when the alternate errors'
  );

  // 43
  const fallbackNoRetry = decideTmdbFallback('animation', 'unchanged');
  assertEquals(
    fallbackNoRetry.retryAlternate,
    false,
    'decideTmdbFallback does not retry when the primary result is usable'
  );

  // -------------------------------------------------------------------------
  // originCountry
  // -------------------------------------------------------------------------

  // 44
  assertEquals(
    normalizeCountryCodes(['id', ' US ', 'id', '', null]),
    ['ID', 'US'],
    'normalizeCountryCodes trims, upper-cases, dedupes, and sorts'
  );

  // 45
  assertEquals(
    mapTmdbOriginCountry({ origin_country: ['id', 'us', 'ID'] }),
    ['ID', 'US'],
    'mapTmdbOriginCountry maps origin_country to sorted unique codes'
  );

  // 46
  assertEquals(
    mapTmdbOriginCountry({
      origin_country: [],
      production_countries: [
        { iso_3166_1: 'id' },
        { iso_3166_1: 'MY' },
        { iso_3166_1: 'ID' },
      ],
    }),
    ['ID', 'MY'],
    'mapTmdbOriginCountry falls back to production_countries'
  );

  // 47
  assertEquals(
    mapTmdbOriginCountry({ origin_country: ['ID'], production_countries: [{ iso_3166_1: 'US' }] }),
    ['ID'],
    'mapTmdbOriginCountry prefers origin_country over production_countries'
  );

  // 48
  assertEquals(
    mapTmdbOriginCountry({}),
    [],
    'mapTmdbOriginCountry returns an empty array without country data'
  );

  // 49
  assertEquals(
    originCountryEqual(['ID', 'US'], ['us', 'id']),
    true,
    'originCountryEqual compares as sets, ignoring order and case'
  );

  // 50
  assertEquals(
    originCountryEqual(['ID'], ['ID', 'US']),
    false,
    'originCountryEqual detects different sets'
  );

  await withFakeFetch(
    {
      id: 501,
      title: 'Test Film',
      release_dates: { results: [] },
      'watch/providers': { results: {} },
      origin_country: ['id', 'US', 'id'],
    },
    async () => {
      const data = await fetchTmdbSyncData('movie', 501, 'test-key');
      assertEquals(
        data.originCountry,
        ['ID', 'US'],
        'fetchTmdbSyncData returns the mapped origin_country'
      );
    }
  );

  await withFakeFetch(
    {
      id: 502,
      title: 'Test Film',
      release_dates: { results: [] },
      'watch/providers': { results: {} },
      production_countries: [{ iso_3166_1: 'id' }, { iso_3166_1: 'MY' }],
    },
    async () => {
      const data = await fetchTmdbSyncData('movie', 502, 'test-key');
      assertEquals(
        data.originCountry,
        ['ID', 'MY'],
        'fetchTmdbSyncData falls back to production_countries'
      );
    }
  );

  await withFakeFetch(
    {
      id: 503,
      title: 'Test Film',
      release_dates: { results: [] },
      'watch/providers': { results: {} },
    },
    async () => {
      const data = await fetchTmdbSyncData('movie', 503, 'test-key');
      assertEquals(
        data.originCountry,
        [],
        'fetchTmdbSyncData returns an empty array when TMDB has no countries'
      );
    }
  );

  // 54
  const originMissing = evaluateFilmSync({
    film: createFilm({ title: 'Dune' }),
    sync: createSync({ title: 'Dune', originCountry: ['ID'] }),
    nowPlayingIds: [],
    now: FIXED_NOW,
  });
  assertEquals(
    originMissing.result?.updates.originCountry,
    ['ID'],
    'evaluateFilmSync writes originCountry when the film has none'
  );
  assert(
    Boolean(originMissing.result?.changes.includes('negara: ID')),
    'evaluateFilmSync reports the originCountry change as "negara: ID"'
  );

  // 55
  const originEqual = evaluateFilmSync({
    film: createFilm({ title: 'Dune', releaseDate: '2026-10-02', originCountry: ['US', 'ID'] }),
    sync: createSync({ title: 'Dune', originCountry: ['id', 'us'] }),
    nowPlayingIds: [],
    now: FIXED_NOW,
  });
  assertEquals(
    originEqual.status,
    'unchanged',
    'evaluateFilmSync does not write originCountry when the sets are equal in a different order'
  );

  // 56
  const originEmpty = evaluateFilmSync({
    film: createFilm({ title: 'Dune', releaseDate: '2026-10-02', originCountry: ['ID'] }),
    sync: createSync({ title: 'Dune', originCountry: [] }),
    nowPlayingIds: [],
    now: FIXED_NOW,
  });
  assertEquals(
    originEmpty.status,
    'unchanged',
    'evaluateFilmSync never clears an existing originCountry with an empty TMDB list'
  );
  assert(
    !('originCountry' in (originEmpty.result?.updates || {})),
    'evaluateFilmSync never writes an empty originCountry array'
  );

  // 57
  const originMismatch = evaluateFilmSync({
    film: createFilm({ title: 'Dune' }),
    sync: createSync({ title: 'Arrival', originCountry: ['ID'] }),
    nowPlayingIds: [],
    now: FIXED_NOW,
  });
  assertEquals(
    originMismatch.status,
    'title_mismatch',
    'evaluateFilmSync still skips a title mismatch even with originCountry data'
  );

  // 58
  const originMixed = evaluateFilmSync({
    film: createFilm({ title: 'Dune', releaseDate: undefined }),
    sync: createSync({
      title: 'Dune',
      releaseDate: '2026-10-02',
      originCountry: ['ID'],
    }),
    nowPlayingIds: [],
    now: FIXED_NOW,
  });
  assertEquals(
    {
      originCountry: originMixed.result?.updates.originCountry,
      releaseDate: originMixed.result?.updates.releaseDate,
    },
    { originCountry: ['ID'], releaseDate: '2026-10-02' },
    'evaluateFilmSync keeps other updates intact when originCountry is added'
  );

  // 59
  const multiCountry = evaluateFilmSync({
    film: createFilm({ title: 'Dune' }),
    sync: createSync({ title: 'Dune', originCountry: ['US', 'ID'] }),
    nowPlayingIds: [],
    now: FIXED_NOW,
  });
  assertEquals(
    multiCountry.result?.updates.originCountry,
    ['ID', 'US'],
    'evaluateFilmSync stores normalized, sorted multi-country codes'
  );

  console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) {
    process.exit(1);
  }
};

runTests().catch(error => {
  console.error(error);
  process.exit(1);
});
