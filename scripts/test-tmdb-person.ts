import {
  trimTmdbPersonDetails,
  trimTmdbPersonSearch,
} from '../src/utils/tmdbPersonTrim';

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

const knownFor = (overrides: Record<string, any> = {}) => ({
  id: 100,
  media_type: 'movie',
  title: 'Known Film',
  name: 'Known Film',
  adult: false,
  ...overrides,
});

const personResult = (overrides: Record<string, any> = {}) => ({
  id: 1,
  name: 'Jane Doe',
  known_for_department: 'Acting',
  profile_path: '/jane.jpg',
  popularity: 12.5,
  adult: false,
  known_for: [],
  ...overrides,
});

const credit = (overrides: Record<string, any> = {}) => ({
  id: 100,
  media_type: 'movie',
  title: 'A Film',
  name: 'A Film',
  character: 'Hero',
  job: '',
  department: 'Acting',
  release_date: '2020-01-01',
  first_air_date: '',
  poster_path: '/poster.jpg',
  vote_average: 7.5,
  vote_count: 250,
  episode_count: 0,
  popularity: 4.5,
  adult: false,
  ...overrides,
});

const detailsPayload = (overrides: Record<string, any> = {}) => ({
  id: 9,
  name: 'Jane Doe',
  biography: '  A biography.  ',
  birthday: '1980-05-05',
  deathday: '',
  place_of_birth: 'Jakarta, Indonesia',
  gender: 1,
  known_for_department: 'Acting',
  also_known_as: [],
  homepage: '',
  popularity: 20,
  profile_path: '/jane.jpg',
  imdb_id: 'nm1234567',
  external_ids: {},
  images: { profiles: [] },
  combined_credits: { cast: [], crew: [] },
  ...overrides,
});

const runTests = async () => {
  console.log('Running TMDB Person Tests...\n');

  // ---------------------------------------------------------------------------
  // trimTmdbPersonSearch
  // ---------------------------------------------------------------------------
  const search = trimTmdbPersonSearch({
    results: [
      personResult({
        known_for: [
          knownFor({ id: 1, title: 'First' }),
          knownFor({ id: 2, title: '', name: 'Second By Name' }),
          knownFor({ id: 3, title: 'Third' }),
          knownFor({ id: 4, title: 'Fourth (dropped by cap)' }),
        ],
      }),
    ],
  });
  assertEquals(search.length, 1, 'trimTmdbPersonSearch: keeps valid results');
  assertEquals(
    search[0],
    {
      id: 1,
      name: 'Jane Doe',
      known_for_department: 'Acting',
      profile_path: '/jane.jpg',
      popularity: 12.5,
      known_for: [
        { id: 1, media_type: 'movie', title: 'First' },
        { id: 2, media_type: 'movie', title: 'Second By Name' },
        { id: 3, media_type: 'movie', title: 'Third' },
      ],
    },
    'trimTmdbPersonSearch: maps fields and caps known_for at 3'
  );

  const searchAdult = trimTmdbPersonSearch({
    results: [
      personResult({ id: 1, adult: false }),
      personResult({ id: 2, adult: true }),
      personResult({ id: 3, adult: true, name: 'Adult Entry' }),
    ],
  });
  assertEquals(
    searchAdult.map(item => item.id),
    [1],
    'trimTmdbPersonSearch: drops adult results'
  );

  const searchKnownForAdult = trimTmdbPersonSearch({
    results: [
      personResult({
        known_for: [
          knownFor({ id: 1, adult: true, title: 'Adult Title' }),
          knownFor({ id: 2, title: 'Safe Title' }),
          knownFor({ id: 3, title: '', name: '' }),
        ],
      }),
    ],
  });
  assertEquals(
    searchKnownForAdult[0].known_for,
    [{ id: 2, media_type: 'movie', title: 'Safe Title' }],
    'trimTmdbPersonSearch: drops adult/title-less known_for entries'
  );

  const searchMissing = trimTmdbPersonSearch({
    results: [{ id: 7 }],
  });
  assertEquals(
    searchMissing[0],
    {
      id: 7,
      name: '',
      known_for_department: '',
      profile_path: null,
      popularity: 0,
      known_for: [],
    },
    'trimTmdbPersonSearch: tolerates missing fields'
  );

  const searchEmpty = [
    trimTmdbPersonSearch(null),
    trimTmdbPersonSearch(undefined),
    trimTmdbPersonSearch({}),
    trimTmdbPersonSearch({ results: null }),
  ];
  assert(
    searchEmpty.every(list => Array.isArray(list) && list.length === 0),
    'trimTmdbPersonSearch: empty or malformed input returns []'
  );

  // ---------------------------------------------------------------------------
  // trimTmdbPersonDetails
  // ---------------------------------------------------------------------------
  const details = trimTmdbPersonDetails(
    detailsPayload({
      also_known_as: [
        'Jane',
        'J. Doe',
        'Jane D.',
        'Janey',
        'JD',
        'Jane Doe Sr.',
        'Jane Doe Jr.',
        'Janie',
        'Ninth (dropped by cap)',
        '',
      ],
      external_ids: {
        imdb_id: 'nm1234567',
        instagram_id: 'jane',
        twitter_id: 'janetw',
        facebook_id: 'janefb',
        tiktok_id: 'janettiktok',
        youtube_id: 'janeyt',
      },
      images: {
        profiles: Array.from({ length: 12 }, (_, index) => ({
          file_path: `/profile-${index}.jpg`,
          width: 185,
          height: 278,
        })),
      },
    })
  );
  assertEquals(
    {
      id: details.id,
      name: details.name,
      biography: details.biography,
      birthday: details.birthday,
      deathday: details.deathday,
      place_of_birth: details.place_of_birth,
      gender: details.gender,
      known_for_department: details.known_for_department,
      homepage: details.homepage,
      popularity: details.popularity,
      profile_path: details.profile_path,
      imdb_id: details.imdb_id,
    },
    {
      id: 9,
      name: 'Jane Doe',
      biography: 'A biography.',
      birthday: '1980-05-05',
      deathday: '',
      place_of_birth: 'Jakarta, Indonesia',
      gender: 1,
      known_for_department: 'Acting',
      homepage: '',
      popularity: 20,
      profile_path: '/jane.jpg',
      imdb_id: 'nm1234567',
    },
    'trimTmdbPersonDetails: maps and trims top-level fields'
  );
  assertEquals(
    details.also_known_as.length,
    8,
    'trimTmdbPersonDetails: caps also_known_as at 8'
  );
  assertEquals(
    details.external_ids,
    {
      imdb_id: 'nm1234567',
      instagram_id: 'jane',
      twitter_id: 'janetw',
      facebook_id: 'janefb',
      tiktok_id: 'janettiktok',
      youtube_id: 'janeyt',
    },
    'trimTmdbPersonDetails: maps external_ids'
  );
  assertEquals(
    details.images.profiles.length,
    10,
    'trimTmdbPersonDetails: caps profile images at 10'
  );
  assertEquals(
    details.images.profiles[0],
    { file_path: '/profile-0.jpg', width: 185, height: 278 },
    'trimTmdbPersonDetails: maps profile image fields'
  );

  const detailsProfiles = trimTmdbPersonDetails(
    detailsPayload({
      images: {
        profiles: [
          { file_path: '', width: 185, height: 278 },
          { file_path: '/kept.jpg' },
        ],
      },
    })
  );
  assertEquals(
    detailsProfiles.images.profiles,
    [{ file_path: '/kept.jpg', width: 0, height: 0 }],
    'trimTmdbPersonDetails: drops profiles without file_path'
  );

  const detailsCredits = trimTmdbPersonDetails(
    detailsPayload({
      combined_credits: {
        cast: [
          credit({ id: 10, title: 'Movie Title' }),
          credit({ id: 11, media_type: 'tv', title: '', name: 'TV Title', first_air_date: '2021-02-03', release_date: '' }),
          credit({ id: 12, adult: true, title: 'Adult Movie' }),
          credit({ id: 13, title: '', name: '' }),
        ],
        crew: [
          credit({ id: 10, character: '', job: 'Director', department: 'Directing' }),
          credit({ id: 14, character: '', job: 'Writer', department: 'Writing' }),
        ],
      },
    })
  );
  assertEquals(
    detailsCredits.credits.cast.map(item => item.id),
    [10, 11],
    'trimTmdbPersonDetails: drops adult and title-less cast credits'
  );
  assertEquals(
    detailsCredits.credits.cast[1].release_date,
    '2021-02-03',
    'trimTmdbPersonDetails: falls back to first_air_date for release_date'
  );
  assertEquals(
    detailsCredits.credits.cast[0],
    {
      id: 10,
      media_type: 'movie',
      title: 'Movie Title',
      character: 'Hero',
      job: '',
      department: 'Acting',
      release_date: '2020-01-01',
      poster_path: '/poster.jpg',
      vote_average: 7.5,
      vote_count: 250,
      episode_count: 0,
      popularity: 4.5,
    },
    'trimTmdbPersonDetails: maps the documented credit fields'
  );
  assertEquals(
    detailsCredits.credits.crew.map(item => item.job),
    ['Director', 'Writer'],
    'trimTmdbPersonDetails: keeps distinct crew jobs'
  );

  const detailsDeduped = trimTmdbPersonDetails(
    detailsPayload({
      combined_credits: {
        cast: [
          credit({ id: 10, title: 'Duplicate Movie' }),
          credit({ id: 10, title: 'Duplicate Movie' }),
          credit({ id: 10, media_type: 'tv', title: 'Same id, different media type' }),
        ],
        crew: [
          credit({ id: 20, character: '', job: 'Director' }),
          credit({ id: 20, character: '', job: 'Director' }),
          credit({ id: 20, character: '', job: 'Producer' }),
        ],
      },
    })
  );
  assertEquals(
    detailsDeduped.credits.cast.map(item => `${item.media_type}:${item.id}`),
    ['movie:10', 'tv:10'],
    'trimTmdbPersonDetails: dedupes cast credits per media type/id'
  );
  assertEquals(
    detailsDeduped.credits.crew.map(item => item.job),
    ['Director', 'Producer'],
    'trimTmdbPersonDetails: dedupes crew credits per media type/id/job'
  );

  const detailsEmpty = [
    trimTmdbPersonDetails(null),
    trimTmdbPersonDetails(undefined),
    trimTmdbPersonDetails({}),
    trimTmdbPersonDetails({ combined_credits: null, images: null, external_ids: null }),
  ];
  assert(
    detailsEmpty.every(
      item =>
        item.id === 0 &&
        item.name === '' &&
        item.also_known_as.length === 0 &&
        item.images.profiles.length === 0 &&
        item.credits.cast.length === 0 &&
        item.credits.crew.length === 0
    ),
    'trimTmdbPersonDetails: empty or malformed input returns safe defaults'
  );

  const rawShape = trimTmdbPersonDetails(detailsPayload());
  assert(
    !('combined_credits' in rawShape) &&
      !('adult' in rawShape) &&
      Object.keys(rawShape).sort().join(',') ===
        [
          'also_known_as',
          'biography',
          'birthday',
          'credits',
          'deathday',
          'external_ids',
          'gender',
          'homepage',
          'id',
          'images',
          'imdb_id',
          'known_for_department',
          'name',
          'place_of_birth',
          'popularity',
          'profile_path',
        ].join(','),
    'trimTmdbPersonDetails: does not return the raw TMDB payload'
  );

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
};

runTests();
