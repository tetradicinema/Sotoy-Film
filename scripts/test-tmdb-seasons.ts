import {
  pickLastSeason,
  trimTmdbSeason,
  trimTmdbSeasons,
  type TmdbSeasonSummary,
} from '../src/utils/tmdbSeasonsTrim';

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

const season = (overrides: Partial<TmdbSeasonSummary> = {}): TmdbSeasonSummary => ({
  seasonNumber: 1,
  name: 'Season 1',
  overview: 'Overview',
  airDate: '2020-01-01',
  episodeCount: 8,
  posterPath: '/poster.jpg',
  voteAverage: 7.5,
  ...overrides,
});

const now = new Date('2026-10-28T00:00:00.000Z');

const runTests = () => {
  console.log('Running TMDB Seasons Tests...\n');

  // ---------------------------------------------------------------------------
  // trimTmdbSeasons
  // ---------------------------------------------------------------------------
  const emptyInputs = [trimTmdbSeasons(null), trimTmdbSeasons(undefined), trimTmdbSeasons({})];
  assert(
    emptyInputs.every(
      data =>
        data.seasons.length === 0 &&
        data.numberOfSeasons === 0 &&
        data.numberOfEpisodes === 0 &&
        data.status === '' &&
        data.lastEpisodeToAir === null &&
        data.nextEpisodeToAir === null
    ),
    'trimTmdbSeasons: empty or malformed input returns safe defaults'
  );

  const sorted = trimTmdbSeasons({
    number_of_seasons: 3,
    number_of_episodes: 24,
    status: 'Ended',
    seasons: [
      { season_number: 2, name: 'Season 2', air_date: '2021-01-01' },
      { season_number: 0, name: 'Specials', air_date: '2019-01-01' },
      { season_number: 1, name: 'Season 1', air_date: '2020-01-01' },
    ],
    last_episode_to_air: { season_number: 2, episode_number: 10, air_date: '2021-03-01' },
    next_episode_to_air: null,
  });
  assertEquals(
    sorted.seasons.map(item => item.seasonNumber),
    [0, 1, 2],
    'trimTmdbSeasons: keeps season 0 and sorts seasons ascending'
  );
  assertEquals(
    sorted.lastEpisodeToAir,
    { seasonNumber: 2, episodeNumber: 10, airDate: '2021-03-01' },
    'trimTmdbSeasons: maps lastEpisodeToAir'
  );
  assertEquals(sorted.nextEpisodeToAir, null, 'trimTmdbSeasons: null nextEpisodeToAir stays null');
  assertEquals(sorted.numberOfSeasons, 3, 'trimTmdbSeasons: maps numberOfSeasons');
  assertEquals(sorted.numberOfEpisodes, 24, 'trimTmdbSeasons: maps numberOfEpisodes');
  assertEquals(sorted.status, 'Ended', 'trimTmdbSeasons: maps status');

  const missingFields = trimTmdbSeasons({
    seasons: [{ season_number: 5 }],
  });
  assertEquals(
    missingFields.seasons[0],
    {
      seasonNumber: 5,
      name: '',
      overview: '',
      airDate: '',
      episodeCount: 0,
      posterPath: '',
      voteAverage: 0,
    },
    'trimTmdbSeasons: tolerates missing season fields'
  );

  const zeroVotes = trimTmdbSeasons({
    seasons: [{ season_number: 1, vote_average: 0, episode_count: 0 }],
  });
  assertEquals(zeroVotes.seasons[0].voteAverage, 0, 'trimTmdbSeasons: preserves zero vote average');
  assertEquals(zeroVotes.seasons[0].episodeCount, 0, 'trimTmdbSeasons: preserves zero episode count');

  // ---------------------------------------------------------------------------
  // trimTmdbSeason
  // ---------------------------------------------------------------------------
  const emptySeason = [trimTmdbSeason(null), trimTmdbSeason({})];
  assert(
    emptySeason.every(
      data =>
        data.episodes.length === 0 &&
        data.seasonNumber === 0 &&
        data.name === '' &&
        data.overview === '' &&
        data.airDate === '' &&
        data.posterPath === ''
    ),
    'trimTmdbSeason: empty or malformed input returns safe defaults'
  );

  const sortedEpisodes = trimTmdbSeason({
    season_number: 2,
    name: 'Season 2',
    episodes: [
      { episode_number: 3, name: 'Third' },
      { episode_number: 1, name: 'First' },
      { episode_number: 2, name: 'Second' },
    ],
  });
  assertEquals(
    sortedEpisodes.episodes.map(item => item.episodeNumber),
    [1, 2, 3],
    'trimTmdbSeason: sorts episodes ascending'
  );
  assertEquals(sortedEpisodes.seasonNumber, 2, 'trimTmdbSeason: maps seasonNumber');
  assertEquals(sortedEpisodes.name, 'Season 2', 'trimTmdbSeason: maps name');

  const episodeMissingFields = trimTmdbSeason({
    season_number: 1,
    episodes: [{ episode_number: 4 }],
  });
  assertEquals(
    episodeMissingFields.episodes[0],
    {
      episodeNumber: 4,
      name: '',
      overview: '',
      airDate: '',
      runtime: 0,
      stillPath: '',
      voteAverage: 0,
      voteCount: 0,
    },
    'trimTmdbSeason: tolerates missing episode fields'
  );

  const episodeZeroRating = trimTmdbSeason({
    season_number: 1,
    episodes: [{ episode_number: 1, vote_average: 0, vote_count: 0 }],
  });
  assertEquals(
    {
      voteAverage: episodeZeroRating.episodes[0].voteAverage,
      voteCount: episodeZeroRating.episodes[0].voteCount,
    },
    { voteAverage: 0, voteCount: 0 },
    'trimTmdbSeason: preserves zero episode rating and vote count'
  );

  const episodeMapped = trimTmdbSeason({
    season_number: 1,
    episodes: [
      {
        episode_number: 7,
        name: '  The Finale  ',
        overview: '  Wrap up.  ',
        air_date: '2024-05-05',
        runtime: 48,
        still_path: '/still.jpg',
        vote_average: 8.1,
        vote_count: 321,
      },
    ],
  });
  assertEquals(
    episodeMapped.episodes[0],
    {
      episodeNumber: 7,
      name: 'The Finale',
      overview: 'Wrap up.',
      airDate: '2024-05-05',
      runtime: 48,
      stillPath: '/still.jpg',
      voteAverage: 8.1,
      voteCount: 321,
    },
    'trimTmdbSeason: maps and trims the documented episode fields'
  );

  // ---------------------------------------------------------------------------
  // pickLastSeason
  // ---------------------------------------------------------------------------
  assertEquals(
    pickLastSeason(
      [
        season({ seasonNumber: 1, airDate: '2020-01-01' }),
        season({ seasonNumber: 2, airDate: '2099-01-01' }),
      ],
      now
    )?.seasonNumber,
    1,
    'pickLastSeason: skips a season that has not aired yet'
  );

  assertEquals(
    pickLastSeason(
      [
        season({ seasonNumber: 1, airDate: '2030-01-01' }),
        season({ seasonNumber: 2, airDate: '2040-01-01' }),
      ],
      now
    )?.seasonNumber,
    1,
    'pickLastSeason: when none aired, returns the lowest regular season'
  );

  assertEquals(
    pickLastSeason([season({ seasonNumber: 0, airDate: '2010-01-01' })], now)?.seasonNumber,
    0,
    'pickLastSeason: only season 0 returns season 0'
  );

  assertEquals(pickLastSeason([], now), null, 'pickLastSeason: empty list returns null');
  assertEquals(pickLastSeason(null, now), null, 'pickLastSeason: null list returns null');

  assertEquals(
    pickLastSeason(
      [
        season({ seasonNumber: 1, airDate: '2020-01-01' }),
        season({ seasonNumber: 2, airDate: '2023-01-01' }),
        season({ seasonNumber: 3, airDate: '2099-01-01' }),
      ],
      now
    )?.seasonNumber,
    2,
    'pickLastSeason: returns the highest season that already aired'
  );

  assertEquals(
    pickLastSeason([season({ seasonNumber: 2, airDate: 'not-a-date' })], now)?.seasonNumber,
    2,
    'pickLastSeason: invalid air date counts as not aired and falls back to the lowest season'
  );

  assertEquals(
    pickLastSeason([season({ seasonNumber: 1, airDate: '2026-10-28' })], now)?.seasonNumber,
    1,
    'pickLastSeason: a season airing exactly now counts as aired'
  );

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
};

runTests();
