import {
  resolveFilmDbSection,
  buildFilmDbSections,
  resolveTrendingForTab,
  getTrendingTabs,
  getFilmTmdbMediaTypes,
  TrendingEntry,
} from '../src/utils/filmSections';
import {
  HOMEPAGE_SECTIONS_META,
  resolveFilmDbSectionOrder,
} from '../src/utils/homepageConfigHelper';
import { FilmItem, HomepageSectionsConfig } from '../src/types';

const createFilm = (overrides: Partial<FilmItem>): FilmItem => ({
  id: `film-${Math.random().toString(36).substr(2, 9)}`,
  title: 'Test Film',
  type: 'movie',
  year: 2024,
  releaseDate: undefined,
  idReleaseDate: undefined,
  whereToWatch: [],
  genres: [],
  tags: [],
  skorSotoy: 0,
  scoreScale: 10,
  totalVotes: 0,
  ...overrides,
});

// Fixture: films in the catalogue
const m100 = createFilm({ id: 'm100', title: 'Movie 100', type: 'movie', tmdbId: 100 });
const s100 = createFilm({ id: 's100', title: 'Series 100', type: 'series', tmdbId: 100 });
const m200 = createFilm({ id: 'm200', title: 'Movie 200', type: 'movie', tmdbId: 200 });
const s300 = createFilm({ id: 's300', title: 'Series 300', type: 'series', tmdbId: 300 });
const a400 = createFilm({ id: 'a400', title: 'Animation 400', type: 'animation', tmdbId: 400 });
const none = createFilm({ id: 'none', title: 'No Match', type: 'movie', tmdbId: 999 });
const films = [m100, s100, m200, s300, a400, none];

// Fixture: TMDB weekly trending, in TMDB rank order (rank = index)
const trending: TrendingEntry[] = [
  { id: 200, mediaType: 'movie' },
  { id: 300, mediaType: 'tv' },
  { id: 100, mediaType: 'movie' },
  { id: 400, mediaType: 'tv' },
];

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

const runTests = () => {
  console.log('Running Trending Section Tests...\n');

  // 1. getFilmTmdbMediaTypes
  {
    assertEquals(getFilmTmdbMediaTypes(m100), ['movie'], 'movie films match the movie trending list');
    assertEquals(getFilmTmdbMediaTypes(s100), ['tv'], 'series films match the tv trending list');
    assertEquals(
      getFilmTmdbMediaTypes(a400),
      ['movie', 'tv'],
      'animation films match both trending lists'
    );
  }

  // 2. missing / empty trending data returns nothing
  {
    assertEquals(
      resolveFilmDbSection('fd_trending', films, undefined, { now: new Date() }),
      [],
      'fd_trending without trending data in opts returns no films'
    );
    assertEquals(
      resolveFilmDbSection('fd_trending', films, undefined, { trending: [] }),
      [],
      'fd_trending with an empty trending list returns no films'
    );
  }

  // 3. order follows TMDB rank and respects the film media type
  {
    assertEquals(
      resolveFilmDbSection('fd_trending', films, undefined, { trending }).map(f => f.id),
      ['m200', 's300', 'm100', 'a400'],
      'fd_trending orders by TMDB rank across media types'
    );
  }

  // 4. limit is respected
  {
    assertEquals(
      resolveFilmDbSection('fd_trending', films, { limit: 2 }, { trending }).map(f => f.id),
      ['m200', 's300'],
      'fd_trending respects the section limit'
    );
  }

  // 5. disabled section returns nothing
  {
    assertEquals(
      resolveFilmDbSection('fd_trending', films, { enabled: false }, { trending }),
      [],
      'fd_trending with enabled false returns no films'
    );
  }

  // 6. movie tab
  {
    assertEquals(
      resolveTrendingForTab(films, { sourceType: 'auto' }, trending, 'movie').map(f => f.id),
      ['m200', 'm100'],
      'the movie tab only keeps movie trending entries'
    );
  }

  // 7. tv tab
  {
    assertEquals(
      resolveTrendingForTab(films, { sourceType: 'auto' }, trending, 'tv').map(f => f.id),
      ['s300', 'a400'],
      'the tv tab only keeps tv trending entries'
    );
  }

  // 8. getTrendingTabs counts
  {
    const tabs = getTrendingTabs(films, { sourceType: 'auto' }, trending);
    assertEquals(tabs.length, 3, 'getTrendingTabs returns all three tabs');
    assertEquals(
      tabs.map(t => [t.id, t.label, t.count]),
      [
        ['all', 'Semua', 4],
        ['movie', 'Film', 2],
        ['tv', 'Series', 2],
      ],
      'getTrendingTabs counts all=4, movie=2, tv=2'
    );
  }

  // 9. tabs with zero results are hidden
  {
    const movieOnly: TrendingEntry[] = [{ id: 200, mediaType: 'movie' }];
    const tabs = getTrendingTabs(films, { sourceType: 'auto' }, movieOnly);
    assertEquals(
      tabs.map(t => t.id),
      ['all', 'movie'],
      'getTrendingTabs hides tabs with zero results'
    );
  }

  // 10. getTrendingTabs for a disabled or manual section
  {
    assertEquals(
      getTrendingTabs(films, { sourceType: 'auto', enabled: false }, trending),
      [],
      'getTrendingTabs returns no tabs for a disabled section'
    );
    assertEquals(
      getTrendingTabs(films, { sourceType: 'manual' }, trending),
      [],
      'getTrendingTabs returns no tabs for a manual section'
    );
    assertEquals(
      getTrendingTabs(films, { sourceType: 'auto' }, []),
      [],
      'getTrendingTabs returns no tabs without trending data'
    );
  }

  // 11. buildFilmDbSections hides fd_trending without trending data
  {
    const config: HomepageSectionsConfig = {
      sections: { fd_trending: { sourceType: 'auto' } },
    };
    const withoutTrending = buildFilmDbSections(films, config);
    assert(
      !withoutTrending.some(s => s.key === 'fd_trending'),
      'buildFilmDbSections hides fd_trending without trending data'
    );

    const withTrending = buildFilmDbSections(films, config, { trending });
    assertEquals(
      withTrending.map(s => s.key),
      ['fd_trending', 'fd_animation'],
      'buildFilmDbSections shows fd_trending when trending data is provided'
    );
    assertEquals(
      withTrending[0]?.films.map(f => f.id),
      ['m200', 's300', 'm100', 'a400'],
      'buildFilmDbSections exposes the ranked trending films'
    );
  }

  // 12. default order puts fd_trending right after fd_on_theatres
  {
    const order = resolveFilmDbSectionOrder();
    assertEquals(
      order.slice(0, 3),
      ['fd_on_theatres', 'fd_trending', 'fd_streaming'],
      'default film db order puts fd_trending right after fd_on_theatres'
    );
    assertEquals(
      order[order.length - 1],
      'fd_film_indonesia',
      'default film db order still ends with fd_film_indonesia'
    );
  }

  // 13. old saved order gets fd_trending appended
  {
    const order = resolveFilmDbSectionOrder(['fd_streaming']);
    assert(
      order.includes('fd_trending'),
      'an old saved order still contains fd_trending'
    );
    assertEquals(
      order[order.length - 1],
      'fd_film_indonesia',
      'an old saved order still ends with fd_film_indonesia'
    );
    assertEquals(
      order.filter(key => key === 'fd_trending').length,
      1,
      'fd_trending appears exactly once in the resolved order'
    );
  }

  // 14. HOMEPAGE_SECTIONS_META entry
  {
    const meta = HOMEPAGE_SECTIONS_META.find(m => m.key === 'fd_trending');
    assertEquals(meta?.area, 'film_database', 'fd_trending lives in the Film Database area');
    assertEquals(meta?.label, 'Trending Minggu Ini', 'fd_trending uses the Trending Minggu Ini label');
    assertEquals(
      meta?.defaultTitle,
      'Trending Minggu Ini',
      'fd_trending uses the Trending Minggu Ini default title'
    );
    assertEquals(
      meta?.defaultDescription,
      'Film dan series yang paling ramai dibicarakan minggu ini.',
      'fd_trending exposes its default description'
    );
    assertEquals(
      meta?.defaultRule,
      'Daftar trending mingguan TMDB yang cocok dengan katalog. Urut peringkat TMDB',
      'fd_trending exposes its default rule'
    );
  }

  console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) {
    process.exit(1);
  }
};

runTests();
