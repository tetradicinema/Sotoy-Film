import { findExistingFilmByTmdb, findTmdbDuplicateGroups } from '../src/utils/tmdbHelper';
import { FilmItem } from '../src/types';

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

const createFilm = (overrides: Partial<FilmItem> = {}): FilmItem => ({
  id: 'film-' + Math.random().toString(36).substring(2, 9),
  title: 'Test Film',
  type: 'movie',
  year: 2024,
  poster: 'https://example.com/poster.jpg',
  backdrop: 'https://example.com/backdrop.jpg',
  synopsis: 'Synopsis',
  director: 'Director',
  cast: ['Actor 1'],
  genres: ['Drama'],
  skorSotoy: 8.0,
  totalVotes: 10,
  criticsSkorSotoy: 8.0,
  whereToWatch: [],
  ...overrides,
});

const runTests = () => {
  console.log('Running TMDB Duplicate Prevention Tests...\n');

  // -------------------------------------------------------------------------
  // 1. Same ID Different Media Type is NOT a Duplicate
  // -------------------------------------------------------------------------
  console.log('--- Suite 1: Same ID Different Media Type ---');
  {
    // Movie with tmdbId 1399 in catalog
    const movieCatalog: FilmItem[] = [
      createFilm({ id: 'catalog-movie-1399', title: 'Some Movie 1399', type: 'movie', tmdbId: 1399 }),
    ];

    // Searching for TV with tmdbId 1399 (e.g. Game of Thrones)
    const matchTv = findExistingFilmByTmdb(movieCatalog, 1399, 'tv');
    assertEquals(matchTv, null, 'TMDB ID 1399 with mediaType "tv" does not match movie 1399');

    // Series with tmdbId 2000 in catalog
    const seriesCatalog: FilmItem[] = [
      createFilm({ id: 'catalog-series-2000', title: 'Some TV Show', type: 'series', tmdbId: 2000 }),
    ];

    // Searching for movie with tmdbId 2000
    const matchMovie = findExistingFilmByTmdb(seriesCatalog, 2000, 'movie');
    assertEquals(matchMovie, null, 'TMDB ID 2000 with mediaType "movie" does not match series 2000');
  }

  // -------------------------------------------------------------------------
  // 2. Same ID Same Type IS a Duplicate
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 2: Same ID Same Type ---');
  {
    const movieFilm = createFilm({ id: 'cat-oppenheimer', title: 'Oppenheimer', type: 'movie', tmdbId: 872585 });
    const seriesFilm = createFilm({ id: 'cat-got', title: 'Game of Thrones', type: 'series', tmdbId: 1399 });
    const animTvFilm = createFilm({ id: 'cat-bluey', title: 'Bluey', type: 'animation', duration: '150 Episodes', tmdbId: 82728 });
    const animMovieFilm = createFilm({ id: 'cat-spirited', title: 'Spirited Away', type: 'animation', duration: '125m', tmdbId: 129 });

    const catalog: FilmItem[] = [movieFilm, seriesFilm, animTvFilm, animMovieFilm];

    // Movie match
    const matchMovie = findExistingFilmByTmdb(catalog, 872585, 'movie');
    assertEquals(matchMovie?.id, 'cat-oppenheimer', 'Same ID same type (movie) matches existing film');

    // String tmdbId query
    const matchStringId = findExistingFilmByTmdb(catalog, '872585', 'movie');
    assertEquals(matchStringId?.id, 'cat-oppenheimer', 'String tmdbId parses and matches existing movie');

    // TV match
    const matchTv = findExistingFilmByTmdb(catalog, 1399, 'tv');
    assertEquals(matchTv?.id, 'cat-got', 'Same ID same type (tv/series) matches existing series');

    // Animation with episodes duration acts as TV
    const matchAnimTv = findExistingFilmByTmdb(catalog, 82728, 'tv');
    assertEquals(matchAnimTv?.id, 'cat-bluey', 'Animation with episodes duration matches tv query');

    // Animation with minutes duration acts as movie
    const matchAnimMovie = findExistingFilmByTmdb(catalog, 129, 'movie');
    assertEquals(matchAnimMovie?.id, 'cat-spirited', 'Animation with minute duration matches movie query');

    // tmdb-prefixed document ID match
    const syntheticDocFilm = createFilm({ id: 'tmdb-550', title: 'Fight Club', type: 'movie', tmdbId: undefined });
    const matchSynthetic = findExistingFilmByTmdb([syntheticDocFilm], 550, 'movie');
    assertEquals(matchSynthetic?.id, 'tmdb-550', 'Film with document ID tmdb-550 matches tmdbId 550');
  }

  // -------------------------------------------------------------------------
  // 3. Title + Year Fallback ONLY When Catalog Film Has NO tmdbId
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 3: Title + Year Fallback ---');
  {
    // Film without tmdbId
    const noTmdbFilm = createFilm({
      id: 'cat-no-tmdb',
      title: 'Laskar Pelangi',
      originalTitle: 'The Rainbow Troops',
      type: 'movie',
      year: 2008,
      tmdbId: undefined,
    });

    const catalog: FilmItem[] = [noTmdbFilm];

    // Fallback succeeds for film without tmdbId: exact normalized title + same year + same media type
    const fallbackMatch = findExistingFilmByTmdb(
      catalog,
      123456, // Incoming has a TMDB ID
      'movie',
      { title: 'Laskar Pelangi', year: 2008 }
    );
    assertEquals(fallbackMatch?.id, 'cat-no-tmdb', 'Title + year fallback matches catalog film without tmdbId');

    // Fallback with punctuation & case differences
    const punctMatch = findExistingFilmByTmdb(
      catalog,
      123456,
      'movie',
      { title: '  laskar pelangi!  ', year: '2008-09-25' }
    );
    assertEquals(punctMatch?.id, 'cat-no-tmdb', 'Normalized title ignores casing, trimming, and punctuation');

    // Fallback matches originalTitle
    const origMatch = findExistingFilmByTmdb(
      catalog,
      123456,
      'movie',
      { title: 'The Rainbow Troops', year: 2008 }
    );
    assertEquals(origMatch?.id, 'cat-no-tmdb', 'Fallback matches originalTitle when title differs');

    // Fallback MUST NOT match if year differs
    const wrongYearMatch = findExistingFilmByTmdb(
      catalog,
      123456,
      'movie',
      { title: 'Laskar Pelangi', year: 2010 }
    );
    assertEquals(wrongYearMatch, null, 'Fallback does not match when year is different');

    // Fallback MUST NOT match if media type differs
    const wrongTypeMatch = findExistingFilmByTmdb(
      catalog,
      123456,
      'tv',
      { title: 'Laskar Pelangi', year: 2008 }
    );
    assertEquals(wrongTypeMatch, null, 'Fallback does not match when media type is different');

    // CRITICAL: Film WITH a tmdbId must NEVER match via fallback
    const filmWithTmdb = createFilm({
      id: 'cat-with-tmdb',
      title: 'Avatar',
      type: 'movie',
      year: 2009,
      tmdbId: 19995,
    });
    const catalogWithTmdb: FilmItem[] = [filmWithTmdb];

    const attemptedFallback = findExistingFilmByTmdb(
      catalogWithTmdb,
      999999, // different TMDB ID
      'movie',
      { title: 'Avatar', year: 2009 }
    );
    assertEquals(
      attemptedFallback,
      null,
      'Catalog film WITH a tmdbId does NOT trigger fallback for a different tmdbId'
    );
  }

  // -------------------------------------------------------------------------
  // 4. Null / Empty Inputs
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 4: Null / Empty Inputs ---');
  {
    const sampleFilm = createFilm({ id: 'sample', title: 'Sample', type: 'movie', tmdbId: 100 });
    const catalog = [sampleFilm];

    assertEquals(findExistingFilmByTmdb([], 100, 'movie'), null, 'Empty films array returns null');
    assertEquals(findExistingFilmByTmdb(null, 100, 'movie'), null, 'Null films returns null');
    assertEquals(findExistingFilmByTmdb(undefined, 100, 'movie'), null, 'Undefined films returns null');
    assertEquals(findExistingFilmByTmdb(catalog, null, 'movie'), null, 'Null tmdbId without candidate returns null');
    assertEquals(findExistingFilmByTmdb(catalog, undefined, 'movie'), null, 'Undefined tmdbId without candidate returns null');
    assertEquals(findExistingFilmByTmdb(catalog, 0, 'movie'), null, 'Zero tmdbId returns null');
    assertEquals(findExistingFilmByTmdb(catalog, -5, 'movie'), null, 'Negative tmdbId returns null');
    assertEquals(findExistingFilmByTmdb(catalog, 'abc', 'movie'), null, 'Non-numeric string tmdbId returns null');
    assertEquals(findExistingFilmByTmdb(catalog, '', 'movie'), null, 'Empty string tmdbId returns null');
    assertEquals(findExistingFilmByTmdb(catalog, null, 'movie', { title: '', year: 2024 }), null, 'Empty title returns null');
    assertEquals(findExistingFilmByTmdb(catalog, null, 'movie', { title: 'Sample', year: undefined }), null, 'Missing year returns null');
  }

  // -------------------------------------------------------------------------
  // 5. findTmdbDuplicateGroups
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 5: findTmdbDuplicateGroups ---');
  {
    const filmA1 = createFilm({ id: 'f-a1', title: 'Dune (Cut 1)', type: 'movie', tmdbId: 438631 });
    const filmA2 = createFilm({ id: 'f-a2', title: 'Dune (Cut 2)', type: 'movie', tmdbId: 438631 });
    const filmUniqueMovie = createFilm({ id: 'f-u1', title: 'Interstellar', type: 'movie', tmdbId: 157336 });
    const filmTvSameId = createFilm({ id: 'f-tv-1', title: 'TV Show 438631', type: 'series', tmdbId: 438631 });
    const filmNoTmdb = createFilm({ id: 'f-no-tmdb', title: 'Indie Film', type: 'movie', tmdbId: undefined });

    const allFilms = [filmA1, filmA2, filmUniqueMovie, filmTvSameId, filmNoTmdb];
    const groups = findTmdbDuplicateGroups(allFilms);

    assertEquals(groups.length, 1, 'Only 1 duplicate group detected');
    assertEquals(groups[0]?.tmdbId, 438631, 'Duplicate group has TMDB ID 438631');
    assertEquals(groups[0]?.mediaType, 'movie', 'Duplicate group has mediaType "movie"');
    assertEquals(groups[0]?.films.length, 2, 'Duplicate group has 2 duplicate films');
    assertEquals(groups[0]?.films.map(f => f.id).sort().join(','), 'f-a1,f-a2', 'Lists the 2 matching films');
  }

  console.log(`\n============================================================`);
  console.log(`📊 Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`============================================================`);

  if (failed > 0) {
    process.exit(1);
  }
};

runTests();
