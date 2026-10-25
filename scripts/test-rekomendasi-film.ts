import {
  DEFAULT_FILM_DB_SECTION_ORDER,
  DEFAULT_REC_SECTION_ORDER,
  DEFAULT_SECTION_ORDER,
  HOMEPAGE_SECTIONS_META,
  resolveFilmDbSectionOrder,
} from '../src/utils/homepageConfigHelper';
import {
  buildFilmDbSections,
  parseDurationMinutes,
  resolveFilmDbSection,
} from '../src/utils/filmSections';
import {
  FILM_MOODS,
  filmMatchesMood,
  filterRecommendationFilms,
  getFilmMoodById,
  pickRandomFilm,
} from '../src/utils/filmMoods';
import { FilmItem, SectionConfig } from '../src/types';

const createFilm = (overrides: Partial<FilmItem> = {}): FilmItem => ({
  id: 'film-default',
  title: 'Test Film',
  type: 'movie',
  year: 2024,
  poster: '',
  backdrop: '',
  synopsis: '',
  director: '',
  cast: [],
  genres: [],
  tags: [],
  skorSotoy: 5,
  criticsSkorSotoy: 5,
  totalVotes: 0,
  scoreScale: 10,
  whereToWatch: [],
  ...overrides,
});

const stream = (platform: string): { type: 'stream'; platform: string; badgeColor: string } => ({
  type: 'stream',
  platform,
  badgeColor: '',
});

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
  console.log('Running Rekomendasi Film Tests...\n');

  // ---------------------------------------------------------------------------
  // Moods: canonical genres, aliases, tags and empty results
  // ---------------------------------------------------------------------------

  const bikinMikir = getFilmMoodById('bikin-mikir');
  const santai = getFilmMoodById('santai');
  const romantis = getFilmMoodById('romantis');

  assert(!!bikinMikir && !!santai && !!romantis, 'the six moods are exported with stable ids');
  assertEquals(
    FILM_MOODS.map(mood => mood.label),
    ['Chill', 'Edge of Seat', 'Mind-Bending', 'Hopeless Romantic', 'Adrenaline', 'Tearjerker'],
    'the mood chips use the Watch Next English labels'
  );
  assert(
    !bikinMikir?.genres.includes('Drama') && !romantis?.genres.includes('Drama'),
    'Mind-Bending and Hopeless Romantic no longer include Drama'
  );
  {
    const dramaOnly = createFilm({ id: 'drama-only', genres: ['Drama'] });
    assert(
      !filmMatchesMood(dramaOnly, bikinMikir) && !filmMatchesMood(dramaOnly, romantis),
      'a Drama-only film does not match Mind-Bending or Hopeless Romantic'
    );
    assert(
      filmMatchesMood(dramaOnly, getFilmMoodById('haru')),
      'Drama still matches the Tearjerker mood'
    );
  }

  // 1. Sci-Fi alias matches Bikin Mikir
  {
    const film = createFilm({ id: 'sci-fi-alias', genres: ['Sci-Fi'] });
    assert(
      filmMatchesMood(film, bikinMikir),
      'a Sci-Fi film matches the Mind-Bending mood via canonical genre resolution'
    );
  }

  // 2. Canonical Science Fiction matches Bikin Mikir
  {
    const film = createFilm({ id: 'science-fiction', genres: ['Science Fiction'] });
    assert(
      filmMatchesMood(film, bikinMikir),
      'a Science Fiction film matches the Mind-Bending mood'
    );
  }

  // 3. Mood by tag (case-insensitive)
  {
    const film = createFilm({ id: 'tag-only', genres: ['Western'], tags: ['  BAPER  '] });
    assert(
      filmMatchesMood(film, romantis),
      'a film with only a matching tag (case-insensitive) matches the mood'
    );
  }

  // 4. Non-matching tags and genres return false
  {
    const film = createFilm({ id: 'no-match', genres: ['Western'], tags: ['koboi'] });
    assert(
      !filmMatchesMood(film, santai),
      'a film without matching genres or tags does not match the mood'
    );
  }

  // 5. Mood with no matches yields an empty list
  {
    const films = [createFilm({ id: 'western', genres: ['Western'] })];
    assertEquals(
      filterRecommendationFilms(films, { moodId: 'bikin-mikir' }).map(f => f.id),
      [],
      'a mood with no matching films returns an empty result set'
    );
  }

  // 6. Unknown mood id is ignored (no crash, no filtering)
  {
    const films = [createFilm({ id: 'unknown-mood-film', genres: ['Western'] })];
    assertEquals(
      filterRecommendationFilms(films, { moodId: 'does-not-exist' }).map(f => f.id),
      ['unknown-mood-film'],
      'an unknown mood id is ignored safely'
    );
  }

  // 7. Platform filter normalizes names and matches case-insensitively
  {
    const films = [
      createFilm({ id: 'nf', whereToWatch: [stream('Netflix')] }),
      createFilm({ id: 'pv', whereToWatch: [stream('Amazon Prime')] }),
    ];
    assertEquals(
      filterRecommendationFilms(films, { platform: 'netflix' }).map(f => f.id),
      ['nf'],
      'the platform filter matches platform names case-insensitively'
    );
    assertEquals(
      filterRecommendationFilms(films, { platform: 'Prime Video' }).map(f => f.id),
      ['pv'],
      'the platform filter normalizes platform name variants'
    );
  }

  // 8. Mood plus platform combined
  {
    const films = [
      createFilm({
        id: 'nf-comedy',
        genres: ['Comedy'],
        whereToWatch: [stream('Netflix')],
      }),
      createFilm({
        id: 'nf-horror',
        genres: ['Horror'],
        whereToWatch: [stream('Netflix')],
      }),
      createFilm({
        id: 'pv-comedy',
        genres: ['Comedy'],
        whereToWatch: [stream('Prime Video')],
      }),
    ];
    assertEquals(
      filterRecommendationFilms(films, { moodId: 'santai', platform: 'Netflix' }).map(f => f.id),
      ['nf-comedy'],
      'mood and platform filters are combined'
    );
  }

  // 9. Results are ranked by Bayesian score
  {
    const films = [
      createFilm({ id: 'rank-high', skorSotoy: 8.8, totalVotes: 40 }),
      createFilm({ id: 'rank-low', skorSotoy: 9.5, totalVotes: 1 }),
      createFilm({ id: 'rank-filler-a', skorSotoy: 5, totalVotes: 10 }),
      createFilm({ id: 'rank-filler-b', skorSotoy: 6, totalVotes: 10 }),
    ];
    const ordered = filterRecommendationFilms(films).map(f => f.id);
    assert(
      ordered.indexOf('rank-high') < ordered.indexOf('rank-low'),
      'filterRecommendationFilms sorts by Bayesian rank without a score threshold'
    );
  }

  // 10. Mood data shape
  {
    assert(
      FILM_MOODS.length === 6 &&
        FILM_MOODS.every(mood => mood.id && mood.label && Array.isArray(mood.genres) && Array.isArray(mood.tags)),
      'all six moods expose id, label, genres, and tags'
    );
  }

  // ---------------------------------------------------------------------------
  // rec_* sections
  // ---------------------------------------------------------------------------

  // 11. rec_tonight resolves every film (Bayesian ranked)
  {
    const films = [
      createFilm({ id: 'tonight-high', skorSotoy: 8.8, totalVotes: 40 }),
      createFilm({ id: 'tonight-low', skorSotoy: 9.5, totalVotes: 1 }),
      createFilm({ id: 'tonight-filler-a', skorSotoy: 5, totalVotes: 10 }),
      createFilm({ id: 'tonight-filler-b', skorSotoy: 6, totalVotes: 10 }),
    ];
    const result = resolveFilmDbSection('rec_tonight', films);
    assertEquals(result.length, 4, 'rec_tonight resolves all films by default');
    assert(
      result[0].id === 'tonight-high',
      'rec_tonight defaults to Bayesian ranking'
    );
  }

  // 12. rec_date_night keeps Romance / Comedy / Drama only
  {
    const films = [
      createFilm({ id: 'dn-romance', genres: ['Romance'] }),
      createFilm({ id: 'dn-comedy', genres: ['Comedy'] }),
      createFilm({ id: 'dn-drama', genres: ['Drama'] }),
      createFilm({ id: 'dn-horror', genres: ['Horror'] }),
    ];
    const ids = resolveFilmDbSection('rec_date_night', films).map(f => f.id).sort();
    assertEquals(
      ids,
      ['dn-comedy', 'dn-drama', 'dn-romance'],
      'rec_date_night keeps Romance, Comedy, and Drama films'
    );
  }

  // 13. rec_hidden_gems uses the same default rule as fd_hidden_gems
  {
    const films = [
      createFilm({ id: 'gem-in', skorSotoy: 8.5, totalVotes: 4 }),
      createFilm({ id: 'gem-low-score', skorSotoy: 7.4, totalVotes: 4 }),
      createFilm({ id: 'gem-many-votes', skorSotoy: 9, totalVotes: 40 }),
    ];
    assertEquals(
      resolveFilmDbSection('rec_hidden_gems', films).map(f => f.id),
      resolveFilmDbSection('fd_hidden_gems', films).map(f => f.id),
      'rec_hidden_gems matches the fd_hidden_gems default rule'
    );
    assertEquals(
      resolveFilmDbSection('rec_hidden_gems', films).map(f => f.id),
      ['gem-in'],
      'rec_hidden_gems applies the hidden gems thresholds'
    );
  }

  // 14. rec_short_runtime includes 100 minutes and excludes longer films
  {
    const films = [
      createFilm({ id: 'short-90', duration: '1h 30m' }),
      createFilm({ id: 'short-100', duration: '100 min' }),
      createFilm({ id: 'short-101', duration: '1h 41m' }),
      createFilm({ id: 'short-unknown', duration: '12 Episodes' }),
      createFilm({ id: 'short-missing', duration: undefined }),
    ];
    const ids = resolveFilmDbSection('rec_short_runtime', films).map(f => f.id).sort();
    assertEquals(
      ids,
      ['short-100', 'short-90'],
      'rec_short_runtime includes <= 100 minutes and excludes longer or unparsable runtimes'
    );
  }

  // 15. Each rec_* default resolves
  {
    const films = [
      createFilm({ id: 'all-in-one', genres: ['Romance'], skorSotoy: 9, totalVotes: 5, duration: '95 min' }),
    ];
    const resolved = DEFAULT_REC_SECTION_ORDER.map(key => ({
      key,
      count: resolveFilmDbSection(key, films).length,
    }));
    assert(
      resolved.every(entry => entry.count > 0),
      'all four rec_* defaults resolve a matching film'
    );
    assertEquals(
      resolved.map(entry => entry.key),
      ['rec_tonight', 'rec_date_night', 'rec_hidden_gems', 'rec_short_runtime'],
      'DEFAULT_REC_SECTION_ORDER keeps the fixed editorial order'
    );
  }

  // 16. rec keys are absent from the Film Database order
  {
    const order = resolveFilmDbSectionOrder([...DEFAULT_FILM_DB_SECTION_ORDER]);
    assert(
      !order.some(key => key.startsWith('rec_')),
      'resolveFilmDbSectionOrder never includes rec_* keys'
    );
    assert(
      !DEFAULT_FILM_DB_SECTION_ORDER.some(key => key.startsWith('rec_')),
      'DEFAULT_FILM_DB_SECTION_ORDER never includes rec_* keys'
    );
  }

  // 17. rec keys are absent from the Beranda order and buildFilmDbSections
  {
    assert(
      !DEFAULT_SECTION_ORDER.some(key => key.startsWith('rec_')),
      'DEFAULT_SECTION_ORDER never includes rec_* keys'
    );

    const films = [
      createFilm({ id: 'only-rec', genres: ['Comedy'], skorSotoy: 9, totalVotes: 10, duration: '90 min' }),
    ];
    const sections = buildFilmDbSections(films);
    assert(
      !sections.some(section => section.key.startsWith('rec_')),
      'buildFilmDbSections never renders rec_* sections'
    );
  }

  // 18. rec meta lives in its own area and targets films
  {
    const metas = DEFAULT_REC_SECTION_ORDER.map(key =>
      HOMEPAGE_SECTIONS_META.find(meta => meta.key === key)
    );
    assert(
      metas.every(meta => meta?.area === 'recommendations' && meta?.targetType === 'films'),
      'rec_* meta entries use area recommendations and targetType films'
    );
    assertEquals(
      metas.map(meta => meta?.defaultTitle),
      [
        'Press Play Tonight',
        'Date Night, Sorted',
        'Hidden in Plain Sight',
        'Under 100 Minutes',
      ],
      'rec_* default titles use the Watch Next editorial copy'
    );
    assertEquals(
      metas.map(meta => meta?.defaultDescription),
      [
        'The safest bets right now, ranked by what the community actually rates.',
        'Easy to love, even easier to talk about on the way home.',
        'Great films that never got their moment.',
        'Short, sharp, and done before midnight.',
      ],
      'rec_* default descriptions use the Watch Next editorial copy'
    );
  }

  // 19. Manual mode keeps saved order and skips missing ids
  {
    const films = [
      createFilm({ id: 'manual-a', skorSotoy: 9, totalVotes: 10 }),
      createFilm({ id: 'manual-b', skorSotoy: 8, totalVotes: 10 }),
      createFilm({ id: 'manual-c', skorSotoy: 7, totalVotes: 10 }),
    ];
    const result = resolveFilmDbSection('rec_tonight', films, {
      sourceType: 'manual',
      itemIds: ['manual-c', 'missing-id', 'manual-a'],
      limit: 10,
    } as SectionConfig);
    assertEquals(
      result.map(f => f.id),
      ['manual-c', 'manual-a'],
      'rec_* manual mode keeps the saved order and skips missing ids'
    );
  }

  // 20. Disabled section returns an empty list
  {
    const films = [createFilm({ id: 'disabled-rec', genres: ['Comedy'] })];
    assertEquals(
      resolveFilmDbSection('rec_date_night', films, { enabled: false } as SectionConfig),
      [],
      'a disabled rec_* section returns no films'
    );
  }

  // 21. Genre filter on a rec row
  {
    const films = [
      createFilm({ id: 'genre-comedy', genres: ['Comedy'], skorSotoy: 9, totalVotes: 10 }),
      createFilm({ id: 'genre-horror', genres: ['Horror'], skorSotoy: 7, totalVotes: 10 }),
    ];
    const result = resolveFilmDbSection('rec_tonight', films, {
      genre: 'Comedy',
    } as SectionConfig);
    assertEquals(
      result.map(f => f.id),
      ['genre-comedy'],
      'rec_* rows apply the admin genre filter'
    );
  }

  // 22. Tag filter on a rec row
  {
    const films = [
      createFilm({ id: 'tag-yes', tags: ['Redaksi'], skorSotoy: 9, totalVotes: 10 }),
      createFilm({ id: 'tag-no', tags: ['Lain'], skorSotoy: 8, totalVotes: 10 }),
    ];
    const result = resolveFilmDbSection('rec_tonight', films, {
      tag: 'redaksi',
    } as SectionConfig);
    assertEquals(
      result.map(f => f.id),
      ['tag-yes'],
      'rec_* rows apply the admin tag filter'
    );
  }

  // 23. Default limit is 12 and an explicit limit is respected
  {
    const films = Array.from({ length: 14 }, (_, index) =>
      createFilm({
        id: `limit-${index}`,
        genres: ['Romance'],
        skorSotoy: 8.5,
        totalVotes: 5,
        duration: '95 min',
      })
    );
    assertEquals(
      resolveFilmDbSection('rec_tonight', films).length,
      12,
      'rec_* sections default to a limit of 12'
    );
    assert(
      DEFAULT_REC_SECTION_ORDER.every(
        key => resolveFilmDbSection(key, films).length === 12
      ),
      'all four rec_* defaults return up to 12 films'
    );
    assertEquals(
      resolveFilmDbSection('rec_short_runtime', films, { limit: 3 } as SectionConfig).length,
      3,
      'rec_* sections respect an explicit limit'
    );
  }

  // ---------------------------------------------------------------------------
  // parseDurationMinutes
  // ---------------------------------------------------------------------------

  assertEquals(parseDurationMinutes('1h 40m'), 100, 'parseDurationMinutes parses "1h 40m"');
  assertEquals(parseDurationMinutes('2h'), 120, 'parseDurationMinutes parses "2h"');
  assertEquals(parseDurationMinutes('100 min'), 100, 'parseDurationMinutes parses "100 min"');
  assertEquals(parseDurationMinutes(''), null, 'parseDurationMinutes returns null for an empty string');
  assertEquals(parseDurationMinutes('abc'), null, 'parseDurationMinutes returns null for malformed text');
  assertEquals(parseDurationMinutes('12 Episodes'), null, 'parseDurationMinutes returns null for episode counts');
  assertEquals(parseDurationMinutes(null), null, 'parseDurationMinutes returns null for null');
  assertEquals(parseDurationMinutes(undefined), null, 'parseDurationMinutes returns null for undefined');
  assertEquals(parseDurationMinutes(95), 95, 'parseDurationMinutes accepts a number of minutes');
  assertEquals(parseDurationMinutes('45m'), 45, 'parseDurationMinutes parses minute-only durations');
  assertEquals(parseDurationMinutes('1h40m'), 100, 'parseDurationMinutes parses compact hour/minute durations');

  // ---------------------------------------------------------------------------
  // pickRandomFilm
  // ---------------------------------------------------------------------------

  // never repeats the excluded film while others exist
  {
    const films = [
      createFilm({ id: 'random-a' }),
      createFilm({ id: 'random-b' }),
      createFilm({ id: 'random-c' }),
    ];
    let alwaysDifferent = true;
    for (let attempt = 0; attempt < 30; attempt++) {
      const pick = pickRandomFilm(films, 'random-a');
      if (!pick || pick.id === 'random-a') alwaysDifferent = false;
    }
    assert(alwaysDifferent, 'pickRandomFilm never returns excludeId when another film exists');
  }

  // single film
  {
    const only = createFilm({ id: 'random-only' });
    assertEquals(pickRandomFilm([only]), only, 'pickRandomFilm returns the only film in the list');
  }

  // single film equal to excludeId can only return itself
  {
    const only = createFilm({ id: 'random-single-excluded' });
    assertEquals(
      pickRandomFilm([only], 'random-single-excluded'),
      only,
      'pickRandomFilm falls back to the only film when there is no alternative'
    );
  }

  // empty list
  {
    assertEquals(pickRandomFilm([], 'anything'), null, 'pickRandomFilm returns null for an empty list');
    assertEquals(pickRandomFilm(null), null, 'pickRandomFilm is null-safe for a missing list');
  }

  // ---------------------------------------------------------------------------
  // Null safety for legacy / incomplete film documents
  // ---------------------------------------------------------------------------

  {
    const sparseFilm = {
      id: 'sparse',
      title: 'Sparse Film',
      type: 'movie',
      year: 2020,
    } as FilmItem;

    let threw = false;
    try {
      filmMatchesMood(sparseFilm, bikinMikir);
      filterRecommendationFilms([sparseFilm], { moodId: 'santai', platform: 'Netflix' });
      pickRandomFilm([sparseFilm], null);
      resolveFilmDbSection('rec_tonight', [sparseFilm]);
      resolveFilmDbSection('rec_date_night', [sparseFilm]);
      resolveFilmDbSection('rec_hidden_gems', [sparseFilm]);
      resolveFilmDbSection('rec_short_runtime', [sparseFilm]);
    } catch {
      threw = true;
    }
    assert(!threw, 'films missing skorSotoy, whereToWatch, genres, and duration do not throw');
  }

  console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) {
    process.exit(1);
  }
};

runTests();
