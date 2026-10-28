import { buildRelatedFilms, RelatedFilmEntry } from '../src/utils/relatedFilms';
import { FilmItem } from '../src/types';
import { TmdbCollectionPart } from '../src/utils/tmdbHelper';

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
  console.log('Running Related Films (Sequels/Franchise) Tests...\n');

  // -------------------------------------------------------------------------
  // 1. Same Collection
  // -------------------------------------------------------------------------
  console.log('--- Suite 1: Same Collection ---');
  {
    const film1 = createFilm({ id: 'f-dune-1', title: 'Dune: Part One', year: 2021, collectionId: 726871 });
    const film2 = createFilm({ id: 'f-dune-2', title: 'Dune: Part Two', year: 2024, collectionId: 726871 });
    const unrelatedFilm = createFilm({ id: 'f-blade-runner', title: 'Blade Runner 2049', year: 2017, collectionId: 555 });

    const related = buildRelatedFilms(film1, [film1, film2, unrelatedFilm]);
    assertEquals(related.length, 2, 'Builds 2 films sharing the same collectionId');
    assertEquals(related[0].title, 'Dune: Part One', 'Sorted by year ascending: Part One (2021) first');
    assertEquals(related[0].isCurrent, true, 'Current film is marked isCurrent: true');
    assertEquals(related[1].title, 'Dune: Part Two', 'Part Two (2024) second');
    assertEquals(related[1].isCurrent, false, 'Other film is marked isCurrent: false');
    assertEquals(related[1].inCatalog, true, 'In catalog film has inCatalog: true');
  }

  // -------------------------------------------------------------------------
  // 2. A Part Missing from the Catalog (TMDB Collection parts)
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 2: Part Missing from the Catalog ---');
  {
    const film1 = createFilm({ id: 'f-matrix-1', title: 'The Matrix', year: 1999, tmdbId: 603, collectionId: 2344 });
    const film2 = createFilm({ id: 'f-matrix-2', title: 'The Matrix Reloaded', year: 2003, tmdbId: 604, collectionId: 2344 });
    // In catalog: only film 1 and 2 exist. The Matrix Revolutions (605) and Resurrections (624860) are not in catalog.

    const tmdbParts: TmdbCollectionPart[] = [
      { tmdbId: 603, title: 'The Matrix', releaseDate: '1999-03-30', posterPath: '/matrix1.jpg', voteAverage: 8.2 },
      { tmdbId: 604, title: 'The Matrix Reloaded', releaseDate: '2003-05-15', posterPath: '/matrix2.jpg', voteAverage: 7.0 },
      { tmdbId: 605, title: 'The Matrix Revolutions', releaseDate: '2003-11-05', posterPath: '/matrix3.jpg', voteAverage: 6.7 },
      { tmdbId: 624860, title: 'The Matrix Resurrections', releaseDate: '2021-12-16', posterPath: '/matrix4.jpg', voteAverage: 5.8 },
    ];

    const related = buildRelatedFilms(film1, [film1, film2], tmdbParts);
    assertEquals(related.length, 4, 'Total 4 parts returned (2 from catalog + 2 uncataloged)');

    // Check catalog items
    const part1 = related.find(r => r.title === 'The Matrix');
    assert(!!part1 && part1.inCatalog === true && part1.isCurrent === true, 'The Matrix is in catalog and current');

    const part2 = related.find(r => r.title === 'The Matrix Reloaded');
    assert(!!part2 && part2.inCatalog === true && part2.isCurrent === false, 'Reloaded is in catalog and not current');

    // Check uncataloged items
    const part3 = related.find(r => r.title === 'The Matrix Revolutions');
    assert(!!part3 && part3.inCatalog === false && part3.film === undefined, 'Revolutions is not in catalog');
    assertEquals(part3?.key, 'tmdb-605', 'Uncataloged key uses tmdb-{id}');
    assertEquals(part3?.year, '2003', 'Uncataloged year extracted from releaseDate');
    assertEquals(part3?.posterUrl, 'https://image.tmdb.org/t/p/w500/matrix3.jpg', 'Uncataloged poster URL constructed correctly');

    const part4 = related.find(r => r.title === 'The Matrix Resurrections');
    assert(!!part4 && part4.inCatalog === false, 'Resurrections is not in catalog');
  }

  // -------------------------------------------------------------------------
  // 3. Symmetric Manual Links
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 3: Symmetric Manual Links ---');
  {
    // Film A manually lists Film B in relatedFilmIds. Film B does NOT list Film A.
    const filmA = createFilm({ id: 'film-a', title: 'Spider-Man: Into the Spider-Verse', year: 2018, relatedFilmIds: ['film-b'] });
    const filmB = createFilm({ id: 'film-b', title: 'Spider-Man: Across the Spider-Verse', year: 2023, relatedFilmIds: [] });

    // When viewing Film A: Film B should appear
    const relatedA = buildRelatedFilms(filmA, [filmA, filmB]);
    assertEquals(relatedA.length, 2, 'Viewing Film A includes Film B');
    assert(relatedA.some(r => r.film?.id === 'film-b'), 'Film B found in related of Film A');

    // When viewing Film B: Film A should ALSO appear (symmetric resolution!)
    const relatedB = buildRelatedFilms(filmB, [filmA, filmB]);
    assertEquals(relatedB.length, 2, 'Viewing Film B includes Film A symmetrically');
    assert(relatedB.some(r => r.film?.id === 'film-a'), 'Film A found in related of Film B');
    const itemA = relatedB.find(r => r.film?.id === 'film-a');
    assertEquals(itemA?.isCurrent, false, 'Film A is not current when viewing Film B');
    const itemB = relatedB.find(r => r.film?.id === 'film-b');
    assertEquals(itemB?.isCurrent, true, 'Film B is current when viewing Film B');
  }

  // -------------------------------------------------------------------------
  // 4. Duplicates Across Sources
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 4: Duplicates Across Sources ---');
  {
    // Film 1 and Film 2 have same collectionId
    // Film 1 ALSO manually lists Film 2 in relatedFilmIds
    // TMDB parts ALSO contains Film 2
    const film1 = createFilm({ id: 'f-hp-1', title: 'Harry Potter 1', year: 2001, tmdbId: 671, collectionId: 1241, relatedFilmIds: ['f-hp-2'] });
    const film2 = createFilm({ id: 'f-hp-2', title: 'Harry Potter 2', year: 2002, tmdbId: 672, collectionId: 1241 });

    const tmdbParts: TmdbCollectionPart[] = [
      { tmdbId: 671, title: 'Harry Potter 1', releaseDate: '2001-11-16', posterPath: '/hp1.jpg', voteAverage: 7.9 },
      { tmdbId: 672, title: 'Harry Potter 2', releaseDate: '2002-11-15', posterPath: '/hp2.jpg', voteAverage: 7.7 },
    ];

    const related = buildRelatedFilms(film1, [film1, film2], tmdbParts);
    assertEquals(related.length, 2, 'Duplicates across collectionId, manual link, and TMDB part are deduplicated to 2');
    assertEquals(related.filter(r => r.film?.id === 'f-hp-2').length, 1, 'Film 2 appears exactly once');
  }

  // -------------------------------------------------------------------------
  // 5. Current Film Marked
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 5: Current Film Marked ---');
  {
    const film1 = createFilm({ id: 'f-lotr-1', title: 'The Fellowship of the Ring', year: 2001, collectionId: 119 });
    const film2 = createFilm({ id: 'f-lotr-2', title: 'The Two Towers', year: 2002, collectionId: 119 });
    const film3 = createFilm({ id: 'f-lotr-3', title: 'The Return of the King', year: 2003, collectionId: 119 });

    // When viewing film 2
    const related = buildRelatedFilms(film2, [film1, film2, film3]);
    assertEquals(related.length, 3, 'All 3 Lord of the Rings films present');

    const currentMatches = related.filter(r => r.isCurrent);
    assertEquals(currentMatches.length, 1, 'Exactly one film marked as isCurrent');
    assertEquals(currentMatches[0].film?.id, 'f-lotr-2', 'The current film (Two Towers) is correctly marked isCurrent: true');

    const nonCurrentMatches = related.filter(r => !r.isCurrent);
    assertEquals(nonCurrentMatches.length, 2, 'Other films marked as isCurrent: false');
  }

  // -------------------------------------------------------------------------
  // 6. Empty and Unknown IDs Ignored
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 6: Empty and Unknown IDs Ignored ---');
  {
    const filmA = createFilm({
      id: 'film-known-1',
      title: 'Valid Film',
      year: 2020,
      relatedFilmIds: ['', '   ', 'non-existent-id-999', 'ghost-film-404', 'film-known-2']
    });
    const filmB = createFilm({ id: 'film-known-2', title: 'Valid Related Film', year: 2022 });

    const related = buildRelatedFilms(filmA, [filmA, filmB]);
    assertEquals(related.length, 2, 'Only valid existing films are included (empty/unknown ignored)');
    assert(!related.some(r => r.key.includes('non-existent') || r.key.includes('ghost')), 'Unknown IDs do not create phantom entries');
  }

  // -------------------------------------------------------------------------
  // 7. TV vs Movie ID Collision Not Matched
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 7: TV vs Movie ID Collision Not Matched ---');
  {
    // A movie in catalog with collectionId
    const movieFilm = createFilm({
      id: 'film-movie-1',
      title: 'Franchise Movie',
      type: 'movie',
      year: 2020,
      tmdbId: 99999,
      collectionId: 8888
    });

    // A TV series in catalog with the SAME numerical tmdbId 12345
    const tvSeries = createFilm({
      id: 'film-series-1',
      title: 'Completely Unrelated TV Series',
      type: 'series',
      year: 2019,
      tmdbId: 12345,
    });

    // TMDB collection parts for movie collection 8888, containing a movie part with tmdbId 12345
    const tmdbParts: TmdbCollectionPart[] = [
      { tmdbId: 99999, title: 'Franchise Movie', releaseDate: '2020-01-01', posterPath: '/m1.jpg', voteAverage: 7.0 },
      { tmdbId: 12345, title: 'Franchise Sequel Movie', releaseDate: '2022-01-01', posterPath: '/m2.jpg', voteAverage: 7.5 },
    ];

    const related = buildRelatedFilms(movieFilm, [movieFilm, tvSeries], tmdbParts);

    // The TV series (tmdbId 12345) must NOT match the TMDB movie part!
    const tvMatch = related.find(r => r.film?.id === 'film-series-1');
    assertEquals(tvMatch, undefined, 'TV series with colliding tmdbId 12345 is NOT matched to movie collection part');

    // The movie part 12345 should instead be treated as uncataloged part
    const uncatalogedSequel = related.find(r => r.key === 'tmdb-12345');
    assert(!!uncatalogedSequel && uncatalogedSequel.inCatalog === false, 'Movie part remains uncataloged with inCatalog: false');
    assertEquals(uncatalogedSequel?.title, 'Franchise Sequel Movie', 'Uncataloged movie part retains its proper movie title');
  }

  // -------------------------------------------------------------------------
  // 8. Cap at 20 items and Year Sorting
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 8: Cap at 20 Items & Undated Last ---');
  {
    const baseFilm = createFilm({ id: 'base-film', title: 'Base Film', year: 2000, collectionId: 100 });
    const allFilmsList: FilmItem[] = [baseFilm];

    for (let i = 1; i <= 25; i++) {
      allFilmsList.push(
        createFilm({
          id: `film-${i}`,
          title: `Sequel ${i}`,
          year: 2000 + i,
          collectionId: 100
        })
      );
    }

    const related = buildRelatedFilms(baseFilm, allFilmsList);
    assertEquals(related.length, 20, 'List is capped at 20 items maximum');
    assertEquals(related[0].year, '2000', 'Earliest year first');
    assertEquals(related[19].year, '2019', '20th item is year 2019');
  }

  console.log('\n=====================================================');
  console.log(`Related Films Tests Finished: ${passed} passed, ${failed} failed.`);
  console.log('=====================================================');

  if (failed > 0) {
    process.exit(1);
  }
};

runTests();
