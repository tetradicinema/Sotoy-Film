import {
  aggregateMediaRatings,
  buildMediaRatingId,
  episodeRatingKey,
  formatSkorSotoy,
  mediaRatingTargetKey,
  seasonRatingKey,
  type MediaRatingDoc,
} from '../src/utils/mediaRatings';

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

const rating = (overrides: Partial<MediaRatingDoc> = {}): MediaRatingDoc => ({
  id: 'id',
  filmId: 'film-1',
  seasonNumber: 1,
  episodeNumber: null,
  userId: 'uid-1',
  score: 8,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const runTests = () => {
  console.log('Running Media Ratings Tests...\n');

  // ---------------------------------------------------------------------------
  // buildMediaRatingId
  // ---------------------------------------------------------------------------
  assertEquals(
    buildMediaRatingId('film-1', 2, null, 'uid-1'),
    'film-1__s2__uid-1',
    'buildMediaRatingId: season id uses film__s<season>__uid'
  );
  assertEquals(
    buildMediaRatingId('film-1', 2, 5, 'uid-1'),
    'film-1__s2__e5__uid-1',
    'buildMediaRatingId: episode id adds __e<episode>'
  );
  assertEquals(
    buildMediaRatingId('film-1', 0, null, 'uid-1'),
    'film-1__s0__uid-1',
    'buildMediaRatingId: keeps season 0 (Specials)'
  );
  assertEquals(
    buildMediaRatingId('film-1', 2, 5, 'uid-2'),
    'film-1__s2__e5__uid-2',
    'buildMediaRatingId: includes the voter uid'
  );
  assert(
    buildMediaRatingId('film-1', 2, null, 'uid-1') !==
      buildMediaRatingId('film-1', 2, 5, 'uid-1'),
    'buildMediaRatingId: season and episode targets never collide'
  );

  // ---------------------------------------------------------------------------
  // Key helpers
  // ---------------------------------------------------------------------------
  assertEquals(seasonRatingKey(3), 's3', 'seasonRatingKey: prefixes the season number');
  assertEquals(
    episodeRatingKey(3, 7),
    's3e7',
    'episodeRatingKey: combines season and episode'
  );
  assertEquals(
    mediaRatingTargetKey({ seasonNumber: 1, episodeNumber: null }),
    's1',
    'mediaRatingTargetKey: a null episode is a season target'
  );
  assertEquals(
    mediaRatingTargetKey({ seasonNumber: 1, episodeNumber: 4 }),
    's1e4',
    'mediaRatingTargetKey: an episode number is an episode target'
  );

  // ---------------------------------------------------------------------------
  // aggregateMediaRatings
  // ---------------------------------------------------------------------------
  assertEquals(aggregateMediaRatings([]), {}, 'aggregateMediaRatings: empty list returns no targets');
  assertEquals(aggregateMediaRatings(null), {}, 'aggregateMediaRatings: null returns no targets');
  assertEquals(
    aggregateMediaRatings(undefined),
    {},
    'aggregateMediaRatings: undefined returns no targets'
  );

  const mixed = aggregateMediaRatings([
    rating({ id: 'a', userId: 'u1', seasonNumber: 1, episodeNumber: null, score: 8.0 }),
    rating({ id: 'b', userId: 'u2', seasonNumber: 1, episodeNumber: null, score: 8.5 }),
    rating({ id: 'c', userId: 'u1', seasonNumber: 1, episodeNumber: 2, score: 9 }),
    rating({ id: 'd', userId: 'u2', seasonNumber: 1, episodeNumber: 2, score: 7 }),
    rating({ id: 'e', userId: 'u3', seasonNumber: 1, episodeNumber: 2, score: 10 }),
    rating({ id: 'f', userId: 'u1', seasonNumber: 2, episodeNumber: null, score: 6 }),
  ]);
  assertEquals(
    mixed[seasonRatingKey(1)],
    { average: 8.3, count: 2 },
    'aggregateMediaRatings: rounds the season average to one decimal'
  );
  assertEquals(
    mixed[episodeRatingKey(1, 2)],
    { average: 8.7, count: 3 },
    'aggregateMediaRatings: aggregates each episode separately'
  );
  assertEquals(
    mixed[seasonRatingKey(2)],
    { average: 6.0, count: 1 },
    'aggregateMediaRatings: keeps a single vote as its own average'
  );
  assert(
    Object.keys(mixed).sort().join(',') === 's1,s1e2,s2',
    'aggregateMediaRatings: season and episode keys stay separate'
  );

  const rounded = aggregateMediaRatings([
    rating({ id: 'a', score: 8.04 }),
    rating({ id: 'b', score: 8.04 }),
    rating({ id: 'c', score: 8.05 }),
  ]);
  assertEquals(
    rounded[seasonRatingKey(1)],
    { average: 8.0, count: 3 },
    'aggregateMediaRatings: divides then rounds to one decimal'
  );

  const invalid = aggregateMediaRatings([
    rating({ id: 'too-low', score: 0.9 }),
    rating({ id: 'too-high', score: 10.1 }),
    rating({ id: 'nan', score: Number.NaN }),
    rating({ id: 'bad-season', seasonNumber: -1 }),
    rating({ id: 'bad-episode', episodeNumber: 0 }),
    rating({ id: 'ok', score: 9 }),
  ]);
  assertEquals(
    invalid,
    { [seasonRatingKey(1)]: { average: 9.0, count: 1 } },
    'aggregateMediaRatings: ignores out-of-range scores and invalid targets'
  );

  // ---------------------------------------------------------------------------
  // formatSkorSotoy
  // ---------------------------------------------------------------------------
  assertEquals(
    formatSkorSotoy({ average: 8.1, count: 12 }),
    '8.1 Skor Sotoy · 12 vote',
    'formatSkorSotoy: renders the Skor Sotoy label'
  );
  assertEquals(
    formatSkorSotoy({ average: 8.1, count: 0 }),
    'Belum ada skor',
    'formatSkorSotoy: zero votes reads as Belum ada skor'
  );
  assertEquals(
    formatSkorSotoy(undefined),
    'Belum ada skor',
    'formatSkorSotoy: a missing aggregate reads as Belum ada skor'
  );

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
};

runTests();
