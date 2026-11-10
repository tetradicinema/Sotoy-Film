import { FilmItem } from '../src/types';
import {
  filmMatchesCountry,
  filmMatchesYear,
  getFilmCountryCodes,
  getFilmCountryOptions,
  getFilmYearOptions,
} from '../src/utils/filmFilters';

let passed = 0;
let failed = 0;

const assert = (condition: boolean, message: string) => {
  if (condition) {
    passed++;
    console.log(`OK ${message}`);
  } else {
    failed++;
    console.error(`FAIL ${message}`);
  }
};

const assertEquals = (actual: any, expected: any, message: string) => {
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  assert(same, `${message} (expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)})`);
};

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

const runTests = () => {
  console.log('Running Film Filter Tests...\n');

  // 1. Country codes from originCountry
  {
    assertEquals(
      getFilmCountryCodes(createFilm({ originCountry: [' ID ', 'us', 'ID', 'de'] })),
      ['ID', 'US', 'DE'],
      'getFilmCountryCodes trims, uppercases and dedupes codes'
    );
    assertEquals(
      getFilmCountryCodes(createFilm({ originCountry: ['USA', 'Q1', '', 'fr'] })),
      ['FR'],
      'getFilmCountryCodes ignores codes that are not 2 letters'
    );
  }

  // 2. Country codes without originCountry
  {
    assertEquals(
      getFilmCountryCodes(createFilm()),
      [],
      'getFilmCountryCodes returns an empty list when originCountry is missing'
    );
    assertEquals(
      getFilmCountryCodes(createFilm({ originCountry: [] })),
      [],
      'getFilmCountryCodes returns an empty list for an empty originCountry array'
    );
  }

  // 3. "Film Indonesia" tag override
  {
    assertEquals(
      getFilmCountryCodes(createFilm({ tags: ['Film Indonesia'] })),
      ['ID'],
      'a "Film Indonesia" tag adds ID without country data'
    );
    assertEquals(
      getFilmCountryCodes(createFilm({ originCountry: ['US'], tags: ['  film indonesia  '] })),
      ['US', 'ID'],
      'the tag override keeps existing country codes and adds ID'
    );
    assertEquals(
      getFilmCountryCodes(createFilm({ originCountry: ['ID'] })),
      ['ID'],
      'the tag override does not duplicate an existing ID code'
    );
  }

  // 4. Country option sorting and counts
  {
    const films: FilmItem[] = [
      createFilm({ id: 'us-id', originCountry: ['US', 'ID'] }),
      createFilm({ id: 'us-only', originCountry: ['US'] }),
      createFilm({ id: 'gb-us', originCountry: ['us', ' gb '] }),
      createFilm({ id: 'id-origin', originCountry: ['ID'] }),
      createFilm({ id: 'id-tag', originCountry: ['US'], tags: ['Film Indonesia'] }),
    ];
    const options = getFilmCountryOptions(films);

    assertEquals(
      options.map(option => option.code),
      ['US', 'ID', 'GB'],
      'getFilmCountryOptions sorts by count descending then label'
    );
    assertEquals(
      options.map(option => option.count),
      [4, 3, 1],
      'getFilmCountryOptions counts each film once per country'
    );
    assertEquals(
      options.map(option => option.label),
      ['Amerika Serikat', 'Indonesia', 'Inggris Raya'],
      'getFilmCountryOptions uses Indonesian region display names'
    );
  }

  // 5. Country option label tie-break
  {
    const options = getFilmCountryOptions([
      createFilm({ id: 'it', originCountry: ['IT'] }),
      createFilm({ id: 'de', originCountry: ['DE'] }),
      createFilm({ id: 'fr', originCountry: ['FR'] }),
    ]);
    assertEquals(
      options.map(option => option.label),
      ['Italia', 'Jerman', 'Prancis'],
      'getFilmCountryOptions breaks count ties alphabetically by label'
    );
  }

  // 6. Year options
  {
    const films: FilmItem[] = [
      createFilm({ id: 'a', year: 2024 }),
      createFilm({ id: 'b', year: 2024 }),
      createFilm({ id: 'c', year: 2001 }),
      createFilm({ id: 'd', year: 0 }),
      createFilm({ id: 'e', year: -3 }),
    ];
    assertEquals(
      getFilmYearOptions(films),
      [
        { year: 2024, count: 2 },
        { year: 2001, count: 1 },
      ],
      'getFilmYearOptions counts films, skips non-positive years and sorts newest first'
    );
    assertEquals([], getFilmYearOptions([]), 'getFilmYearOptions returns an empty list for no films');
  }

  // 7. 'all' handling and matching
  {
    const film = createFilm({ originCountry: ['US'], year: 2021 });

    assert(filmMatchesCountry(film, 'all'), "filmMatchesCountry matches every film for 'all'");
    assert(filmMatchesCountry(film, 'US'), 'filmMatchesCountry matches a known country code');
    assert(filmMatchesCountry(film, 'us'), 'filmMatchesCountry is case insensitive');
    assert(!filmMatchesCountry(film, 'ID'), 'filmMatchesCountry rejects other countries');

    assert(filmMatchesYear(film, 'all'), "filmMatchesYear matches every film for 'all'");
    assert(filmMatchesYear(film, '2021'), 'filmMatchesYear matches a string year');
    assert(filmMatchesYear(film, 2021), 'filmMatchesYear matches a numeric year');
    assert(!filmMatchesYear(film, '2020'), 'filmMatchesYear rejects other years');
    assert(!filmMatchesYear(film, 'not-a-year'), 'filmMatchesYear rejects a non-numeric year');
    assert(filmMatchesYear(film, ''), 'filmMatchesYear treats an empty year as all');
  }

  // 8. Bad Intl label falls back to the code
  {
    const originalDisplayNames = Intl.DisplayNames;
    (Intl as any).DisplayNames = class {
      constructor() {}
      of(): string {
        throw new RangeError('invalid region code');
      }
    };

    try {
      const options = getFilmCountryOptions([createFilm({ originCountry: ['US'] })]);
      assertEquals(
        options.map(option => option.label),
        ['US'],
        'getFilmCountryOptions falls back to the raw code when Intl throws'
      );
    } finally {
      (Intl as any).DisplayNames = originalDisplayNames;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
};

runTests();
