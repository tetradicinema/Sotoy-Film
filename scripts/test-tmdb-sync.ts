import { FilmItem } from '../src/types';
import {
  pickIdReleaseDate,
  getBadgeColor,
  buildWhereToWatch,
  computeInTheatres,
  computeFilmSyncUpdate,
  TmdbSyncData,
} from '../src/utils/tmdbSync';

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
  releaseDate: '2026-10-02',
  releaseDatesID: [],
  providersID: { flatrate: [], rent: [], buy: [] },
  status: 'Released',
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

const runTests = () => {
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
    [{ type: 'stream', platform: 'Netflix', badgeColor: '#E50914' }],
    'buildWhereToWatch removes the exact placeholder cinema entry'
  );

  // 11
  assertEquals(
    buildWhereToWatch({
      existing: [
        { type: 'cinema', platform: 'Cinema XXI', badgeColor: '#111111' },
        { type: 'rent', platform: 'Google Play', badgeColor: '#222222' },
        { type: 'stream', platform: 'Vidio', badgeColor: '#E2231A' },
      ],
      providersFlatrate: [],
      inTheatres: false,
    }),
    [
      { type: 'cinema', platform: 'Cinema XXI', badgeColor: '#111111' },
      { type: 'stream', platform: 'Vidio', badgeColor: '#E2231A' },
      { type: 'rent', platform: 'Google Play', badgeColor: '#222222' },
    ],
    'buildWhereToWatch keeps manual entries untouched'
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
    ['cinema:Bioskop', 'stream:Netflix', 'stream:Prime Video', 'stream:Vidio'],
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
    [{ type: 'stream', platform: 'Netflix', badgeColor: '#E50914' }],
    'buildWhereToWatch does not duplicate an existing manual type/platform pair'
  );

  // -------------------------------------------------------------------------
  // computeInTheatres
  // -------------------------------------------------------------------------

  // 19
  assertEquals(
    computeInTheatres({
      type: 'series',
      tmdbId: 123,
      nowPlayingIds: [123],
      idReleaseDate: daysAgoIso(1),
      now: FIXED_NOW,
    }),
    false,
    'computeInTheatres is false for series even when in now playing'
  );

  // 20
  assertEquals(
    computeInTheatres({
      type: 'animation',
      tmdbId: 123,
      nowPlayingIds: [123],
      idReleaseDate: daysAgoIso(1),
      now: FIXED_NOW,
    }),
    false,
    'computeInTheatres is false for animation titles'
  );

  // 21
  assertEquals(
    computeInTheatres({
      type: 'movie',
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
      type: 'movie',
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
      type: 'movie',
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
      type: 'movie',
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
      type: 'movie',
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
      type: 'movie',
      tmdbId: 123,
      nowPlayingIds: [],
      idReleaseDate: 'not-a-date',
      now: FIXED_NOW,
    }),
    false,
    'computeInTheatres is false for an invalid release date'
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
      ['idReleaseDate', 'releaseDate', 'whereToWatch'].includes(key)
    ),
    'computeFilmSyncUpdate only writes idReleaseDate, releaseDate, and whereToWatch'
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

  console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) {
    process.exit(1);
  }
};

runTests();
