import {
  DEFAULT_BLOCK_ORDER,
  DEFAULT_SECTION_ORDER,
  HOMEPAGE_SECTIONS_META,
  WIDE_BLOCK_KEYS,
  isBlockWide,
  resolveBlockOrder,
} from '../src/utils/homepageConfigHelper';
import {
  getHomeFilmRecsDefault,
  getHeroToWatch,
  resolveHomeFilmIndonesia,
  resolveHomeFilmRecs,
  resolveHomeStreaming,
} from '../src/utils/filmSections';
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

const createStreamFilm = (
  id: string,
  platform: string,
  daysAgo: number
): FilmItem =>
  createFilm({
    id,
    title: `Film ${id}`,
    whereToWatch: [{ type: 'stream', platform, badgeColor: '' }],
    idReleaseDate: new Date(Date.UTC(2026, 9, 20 - daysAgo)).toISOString(),
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
  console.log('Running Home Film Sections Tests...\n');

  // ---------------------------------------------------------------------------
  // Meta & resolveBlockOrder
  // ---------------------------------------------------------------------------

  // 1
  {
    const metaKeys = HOMEPAGE_SECTIONS_META.map(item => item.key);
    assert(
      metaKeys.includes('home_film_recs') &&
        metaKeys.includes('home_streaming') &&
        metaKeys.includes('home_film_indonesia'),
      'HOMEPAGE_SECTIONS_META includes the three Beranda film sections'
    );
    const filmRecsMeta = HOMEPAGE_SECTIONS_META.find(item => item.key === 'home_film_recs');
    const streamingMeta = HOMEPAGE_SECTIONS_META.find(item => item.key === 'home_streaming');
    const indonesiaMeta = HOMEPAGE_SECTIONS_META.find(item => item.key === 'home_film_indonesia');
    assert(
      filmRecsMeta?.area === 'home' && filmRecsMeta?.targetType === 'films',
      'home_film_recs meta uses area home and target films'
    );
    assert(
      streamingMeta?.area === 'home' && streamingMeta?.targetType === 'films',
      'home_streaming meta uses area home and target films'
    );
    assert(
      indonesiaMeta?.area === 'home' && indonesiaMeta?.targetType === 'films',
      'home_film_indonesia meta mirrors home_streaming with area home and target films'
    );
    assertEquals(
      filmRecsMeta?.allowedCategories,
      ['movie', 'series', 'animation'],
      'home_film_recs allows the three film categories'
    );
  }

  // 2
  {
    const tail = DEFAULT_SECTION_ORDER.slice(-2);
    assertEquals(
      tail,
      ['home_streaming', 'home_film_indonesia'],
      'DEFAULT_SECTION_ORDER appends the Beranda film sections, with Film Indonesia last'
    );
    const order = DEFAULT_SECTION_ORDER;
    assertEquals(
      order[order.indexOf('home_streaming') + 1],
      'home_film_indonesia',
      'DEFAULT_SECTION_ORDER places home_film_indonesia after home_streaming'
    );
  }

  // 3
  {
    const order = resolveBlockOrder();
    const recIndex = order.indexOf('film_recommendations');
    assertEquals(
      order[recIndex + 1],
      'streaming',
      'default block order places streaming right after film_recommendations'
    );
    assertEquals(order, DEFAULT_BLOCK_ORDER, 'default block order matches DEFAULT_BLOCK_ORDER');
  }

  // 4
  {
    const saved = ['hero', 'featured_news', 'film_recommendations', 'watchlists'];
    const order = resolveBlockOrder(saved as any);
    const recIndex = order.indexOf('film_recommendations');
    assertEquals(
      order[recIndex + 1],
      'streaming',
      'saved order without streaming inserts it after film_recommendations'
    );
  }

  // 5
  {
    const saved = ['hero', 'featured_news', 'watchlists'];
    const order = resolveBlockOrder(saved as any);
    assertEquals(
      order.slice(-2),
      ['streaming', 'film_indonesia'],
      'saved order without film_recommendations appends streaming then film_indonesia at the end'
    );
  }

  // 6
  {
    const saved = ['hero', 'streaming', 'featured_news'];
    const order = resolveBlockOrder(saved as any);
    assertEquals(
      order.slice(0, 2),
      ['hero', 'streaming'],
      'saved order that already has streaming is respected'
    );
    assertEquals(
      order[order.indexOf('streaming') + 1],
      'film_indonesia',
      'saved order that already has streaming inserts film_indonesia right after it'
    );
    assert(
      order.includes('featured_news'),
      'saved order keeps its non-film blocks after the new insert'
    );
  }

  // 7
  {
    const saved = ['hero', 'unknown_key', 'featured_news', 'film_recommendations'];
    const order = resolveBlockOrder(saved as any);
    assert(!order.includes('unknown_key' as any), 'resolveBlockOrder drops unknown keys');
    assertEquals(
      order[order.indexOf('film_recommendations') + 1],
      'streaming',
      'unknown keys do not disturb the streaming insertion point'
    );
  }

  // 8
  {
    const saved = ['hero', 'hero', 'streaming', 'streaming'];
    const order = resolveBlockOrder(saved as any);
    assertEquals(
      order[0],
      'hero',
      'resolveBlockOrder keeps the first occurrence of duplicated keys'
    );
    assertEquals(
      order.filter(key => key === 'streaming').length,
      1,
      'resolveBlockOrder deduplicates streaming'
    );
  }

  // ---------------------------------------------------------------------------
  // getHomeFilmRecsDefault
  // ---------------------------------------------------------------------------

  const recommendationFilms: FilmItem[] = [
    createFilm({ id: 'feat-a', title: 'Featured A', skorSotoy: 8, totalVotes: 50, featuredRecommendation: true }),
    createFilm({ id: 'feat-b', title: 'Featured B', skorSotoy: 9.5, totalVotes: 1, featuredRecommendation: true }),
    createFilm({ id: 'rest-a', title: 'Rest A', skorSotoy: 9, totalVotes: 100 }),
    createFilm({ id: 'rest-b', title: 'Rest B', skorSotoy: 7, totalVotes: 10 }),
    createFilm({ id: 'rest-c', title: 'Rest C', skorSotoy: 10, totalVotes: 0 }),
  ];

  // 9
  {
    const result = getHomeFilmRecsDefault(recommendationFilms);
    assertEquals(
      result.slice(0, 2).map(f => f.id),
      ['feat-b', 'feat-a'],
      'getHomeFilmRecsDefault puts featured films first, ordered by Bayesian score'
    );
    assertEquals(
      result.slice(2).map(f => f.id),
      ['rest-c', 'rest-a', 'rest-b'],
      'getHomeFilmRecsDefault orders the remaining films by Bayesian score'
    );
  }

  // 10
  {
    const withDuplicate = [...recommendationFilms, recommendationFilms[0], recommendationFilms[2]];
    const result = getHomeFilmRecsDefault(withDuplicate);
    const ids = result.map(f => f.id);
    assertEquals(
      ids.length,
      new Set(ids).size,
      'getHomeFilmRecsDefault never returns duplicate films'
    );
  }

  // 11
  {
    const result = getHomeFilmRecsDefault(recommendationFilms, 3);
    assertEquals(result.length, 3, 'getHomeFilmRecsDefault respects the limit');
    assertEquals(result[0].id, 'feat-b', 'getHomeFilmRecsDefault keeps featured first when limited');
  }

  // ---------------------------------------------------------------------------
  // resolveHomeFilmRecs
  // ---------------------------------------------------------------------------

  // 12
  {
    assertEquals(
      resolveHomeFilmRecs(recommendationFilms, { sourceType: 'auto', enabled: false }),
      [],
      'resolveHomeFilmRecs returns [] when disabled'
    );
  }

  // 13
  {
    const manualFilms = [
      createFilm({ id: 'manual-a', title: 'Manual A', totalVotes: 10, skorSotoy: 8 }),
      createFilm({ id: 'manual-b', title: 'Manual B', totalVotes: 10, skorSotoy: 7 }),
      createFilm({ id: 'manual-c', title: 'Manual C', totalVotes: 10, skorSotoy: 6 }),
    ];
    const result = resolveHomeFilmRecs(manualFilms, {
      sourceType: 'manual',
      itemIds: ['manual-c', 'missing-id', 'manual-a'],
      limit: 10,
    } as SectionConfig);
    assertEquals(
      result.map(f => f.id),
      ['manual-c', 'manual-a'],
      'resolveHomeFilmRecs manual mode keeps saved order and skips missing ids'
    );
  }

  // 14
  {
    const manualFilms = [
      createFilm({ id: 'fallback-a', totalVotes: 5, skorSotoy: 9 }),
      createFilm({ id: 'fallback-b', totalVotes: 5, skorSotoy: 8 }),
    ];
    const expected = getHomeFilmRecsDefault(manualFilms, 6).map(f => f.id);
    const result = resolveHomeFilmRecs(manualFilms, {
      sourceType: 'manual',
      itemIds: ['does-not-exist'],
    } as SectionConfig);
    assertEquals(
      result.map(f => f.id),
      expected,
      'resolveHomeFilmRecs manual mode falls back to the default list without matches'
    );
  }

  // 15
  {
    const manyFilms = Array.from({ length: 20 }, (_, i) =>
      createFilm({ id: `limit-${i}`, totalVotes: 10, skorSotoy: 5 + (i % 5) })
    );
    const result = resolveHomeFilmRecs(manyFilms, { sourceType: 'auto' } as SectionConfig);
    assertEquals(result.length, 6, 'resolveHomeFilmRecs defaults to 6 films');
  }

  // 16
  {
    const manyFilms = Array.from({ length: 20 }, (_, i) =>
      createFilm({ id: `cap-${i}`, totalVotes: 10, skorSotoy: 5 + (i % 5) })
    );
    const result = resolveHomeFilmRecs(manyFilms, {
      sourceType: 'auto',
      limit: 50,
    } as SectionConfig);
    assertEquals(result.length, 12, 'resolveHomeFilmRecs caps the limit at 12');
  }

  // 17
  {
    const categoryFilms = [
      createFilm({ id: 'cat-movie', type: 'movie', totalVotes: 10, skorSotoy: 8 }),
      createFilm({ id: 'cat-series', type: 'series', totalVotes: 10, skorSotoy: 8 }),
      createFilm({ id: 'cat-animation', type: 'animation', totalVotes: 10, skorSotoy: 8 }),
    ];
    const result = resolveHomeFilmRecs(categoryFilms, {
      sourceType: 'auto',
      category: 'series',
    } as SectionConfig);
    assertEquals(
      result.map(f => f.id),
      ['cat-series'],
      'resolveHomeFilmRecs applies the category filter'
    );
  }

  // 18
  {
    const ratedFilms = [
      createFilm({ id: 'rating-low', skorSotoy: 5, totalVotes: 10 }),
      createFilm({ id: 'rating-high', skorSotoy: 9, totalVotes: 10 }),
      createFilm({ id: 'rating-mid', skorSotoy: 7, totalVotes: 10 }),
    ];
    const result = resolveHomeFilmRecs(ratedFilms, {
      sourceType: 'auto',
      sortBy: 'rating',
    } as SectionConfig);
    assertEquals(
      result.map(f => f.id),
      ['rating-high', 'rating-mid', 'rating-low'],
      'resolveHomeFilmRecs applies sortBy rating'
    );
  }

  // 19
  {
    const result = resolveHomeFilmRecs(recommendationFilms, { sourceType: 'auto' } as SectionConfig);
    const expected = getHomeFilmRecsDefault(recommendationFilms, 6).map(f => f.id);
    assertEquals(
      result.map(f => f.id),
      expected,
      'resolveHomeFilmRecs without filters uses the editorial default list'
    );
  }

  // ---------------------------------------------------------------------------
  // resolveHomeStreaming
  // ---------------------------------------------------------------------------

  // 20
  {
    const films = Array.from({ length: 15 }, (_, i) =>
      createStreamFilm(`stream-${i}`, 'Netflix', i)
    );
    const result = resolveHomeStreaming(films);
    assertEquals(result.length, 12, 'resolveHomeStreaming defaults to 12 films');
  }

  // 21
  {
    const netflixFilms = Array.from({ length: 5 }, (_, i) =>
      createStreamFilm(`nf-${i}`, 'Netflix', i)
    );
    const primeFilms = Array.from({ length: 3 }, (_, i) =>
      createStreamFilm(`pv-${i}`, 'Prime Video', i)
    );
    const result = resolveHomeStreaming(
      [...netflixFilms, ...primeFilms],
      { sourceType: 'auto', limit: 2 } as SectionConfig,
      'Netflix'
    );
    assertEquals(result.length, 2, 'resolveHomeStreaming applies the platform before the limit');
    assert(
      result.every(f => f.whereToWatch.some(w => w.platform === 'Netflix')),
      'resolveHomeStreaming returns only the selected platform tab'
    );
  }

  // 22
  {
    const netflixFilms = Array.from({ length: 2 }, (_, i) =>
      createStreamFilm(`fixed-nf-${i}`, 'Netflix', i)
    );
    const primeFilms = Array.from({ length: 2 }, (_, i) =>
      createStreamFilm(`fixed-pv-${i}`, 'Prime Video', i)
    );
    const result = resolveHomeStreaming([...netflixFilms, ...primeFilms], {
      sourceType: 'auto',
      platform: 'Prime Video',
    } as SectionConfig);
    assert(
      result.length === 2 && result.every(f => f.whereToWatch.some(w => w.platform === 'Prime Video')),
      'resolveHomeStreaming honors an admin-fixed platform'
    );
  }

  // 23
  {
    const films = [createStreamFilm('disabled-1', 'Netflix', 1)];
    const result = resolveHomeStreaming(films, {
      sourceType: 'auto',
      enabled: false,
    } as SectionConfig);
    assertEquals(result, [], 'resolveHomeStreaming returns [] when disabled');
  }

  // 24
  {
    const tabOverrideFilms = [
      createStreamFilm('override-nf', 'Netflix', 3),
      createStreamFilm('override-pv', 'Prime Video', 1),
    ];
    const result = resolveHomeStreaming(tabOverrideFilms, {
      sourceType: 'auto',
      platform: 'Prime Video',
    } as SectionConfig, 'Netflix');
    assertEquals(
      result.map(f => f.id),
      ['override-nf'],
      'resolveHomeStreaming lets a platform tab override the admin-fixed platform'
    );
  }

  // ---------------------------------------------------------------------------
  // Hero: To Watch
  // ---------------------------------------------------------------------------

  const heroFilms: FilmItem[] = [
    createFilm({ id: 'hero-rest-a', title: 'Rest A', skorSotoy: 9, totalVotes: 100 }),
    createFilm({ id: 'hero-rest-b', title: 'Rest B', skorSotoy: 8, totalVotes: 50 }),
    createFilm({ id: 'hero-rest-c', title: 'Rest C', skorSotoy: 7, totalVotes: 20 }),
    createFilm({ id: 'hero-rest-d', title: 'Rest D', skorSotoy: 6, totalVotes: 10 }),
    createFilm({ id: 'hero-feat-low', title: 'Featured Low', skorSotoy: 5, totalVotes: 4, featuredRecommendation: true }),
    createFilm({ id: 'hero-feat-high', title: 'Featured High', skorSotoy: 9.5, totalVotes: 1, featuredRecommendation: true }),
  ];

  // 25
  {
    const result = getHeroToWatch(heroFilms);
    assertEquals(result.length, 5, 'getHeroToWatch defaults to 5 films');
  }

  // 26
  {
    const result = getHeroToWatch(heroFilms);
    assertEquals(
      result.slice(0, 2).map(f => f.id),
      ['hero-feat-high', 'hero-feat-low'],
      'getHeroToWatch puts featured films first, ordered by Bayesian score'
    );
  }

  // 27
  {
    const result = getHeroToWatch(heroFilms);
    assertEquals(
      result.slice(2).map(f => f.id),
      ['hero-rest-a', 'hero-rest-b', 'hero-rest-c'],
      'getHeroToWatch fills the remaining slots by Bayesian score'
    );
  }

  // 28
  {
    const withDuplicate = [...heroFilms, heroFilms[0], heroFilms[2]];
    const ids = getHeroToWatch(withDuplicate).map(f => f.id);
    assertEquals(ids.length, new Set(ids).size, 'getHeroToWatch never returns duplicate films');
  }

  // 29
  {
    const result = getHeroToWatch(heroFilms, {
      sourceType: 'manual',
      itemIds: ['hero-rest-c', 'missing-id', 'hero-rest-a'],
      limit: 10,
    } as SectionConfig);
    assertEquals(
      result.map(f => f.id),
      ['hero-rest-c', 'hero-rest-a'],
      'getHeroToWatch manual mode keeps saved order and skips missing ids'
    );
  }

  // 30
  {
    const expected = getHeroToWatch(heroFilms).map(f => f.id);
    const result = getHeroToWatch(heroFilms, {
      sourceType: 'manual',
      itemIds: ['legacy-article-1', 'legacy-article-2'],
    } as SectionConfig);
    assertEquals(
      result.map(f => f.id),
      expected,
      'getHeroToWatch falls back to the default list when itemIds are articles'
    );
  }

  // 31
  {
    assertEquals(
      getHeroToWatch(heroFilms, { sourceType: 'auto', enabled: false } as SectionConfig),
      [],
      'getHeroToWatch returns [] when disabled'
    );
  }

  // 32
  {
    const manyFilms = Array.from({ length: 12 }, (_, i) =>
      createFilm({ id: `hero-cap-${i}`, skorSotoy: 5 + (i % 5), totalVotes: 10 })
    );
    const result = getHeroToWatch(manyFilms, {
      sourceType: 'auto',
      limit: 50,
    } as SectionConfig);
    assertEquals(result.length, 8, 'getHeroToWatch caps the limit at 8');
  }

  // 33
  {
    const order = DEFAULT_SECTION_ORDER;
    assertEquals(
      order[order.indexOf('hero_to_watch') + 1],
      'hero_film_studies',
      'DEFAULT_SECTION_ORDER places hero_film_studies after hero_to_watch'
    );
    assert(!order.includes('gear' as any), 'DEFAULT_SECTION_ORDER no longer includes the hero gear tab');
  }

  // 34
  {
    const metaKeys = HOMEPAGE_SECTIONS_META.map(item => item.key);
    assert(!metaKeys.includes('gear' as any), 'HOMEPAGE_SECTIONS_META no longer includes the hero gear tab');
    const toWatch = HOMEPAGE_SECTIONS_META.find(item => item.key === 'hero_to_watch');
    const filmStudies = HOMEPAGE_SECTIONS_META.find(item => item.key === 'hero_film_studies');
    assert(
      toWatch?.targetType === 'films' && toWatch?.defaultTitle === 'To Watch',
      'hero_to_watch meta targets films with the To Watch title'
    );
    assert(
      filmStudies?.targetType === 'articles' && filmStudies?.area === 'home',
      'hero_film_studies meta targets articles in the home area'
    );
  }

  // ---------------------------------------------------------------------------
  // Film Indonesia block & resolveHomeFilmIndonesia
  // ---------------------------------------------------------------------------

  const indonesianFilms: FilmItem[] = [
    createFilm({
      id: 'id-old',
      title: 'Old Indonesian Film',
      originCountry: ['ID'],
      idReleaseDate: '2024-01-10T00:00:00.000Z',
    }),
    createFilm({
      id: 'id-new',
      title: 'New Indonesian Film',
      originCountry: ['ID'],
      idReleaseDate: '2026-05-01T00:00:00.000Z',
    }),
    createFilm({
      id: 'id-lowercase',
      title: 'Lowercase Country',
      originCountry: ['id'],
      idReleaseDate: '2025-03-01T00:00:00.000Z',
    }),
    createFilm({
      id: 'id-tagged',
      title: 'Tagged Only',
      tags: ['Film Indonesia'],
      idReleaseDate: '2025-06-01T00:00:00.000Z',
    }),
    createFilm({
      id: 'id-wrong-tag',
      title: 'Similar But Different Tag',
      tags: ['film indonesia klasik'],
      idReleaseDate: '2025-07-01T00:00:00.000Z',
    }),
    createFilm({
      id: 'non-id',
      title: 'Hollywood Film',
      originCountry: ['US'],
      idReleaseDate: '2026-06-01T00:00:00.000Z',
    }),
    createFilm({
      id: 'no-country',
      title: 'Unknown Country',
      idReleaseDate: '2026-07-01T00:00:00.000Z',
    }),
  ];

  // 35
  {
    const order = DEFAULT_BLOCK_ORDER;
    assertEquals(
      order[order.indexOf('streaming') + 1],
      'film_indonesia',
      'DEFAULT_BLOCK_ORDER places film_indonesia right after streaming'
    );
  }

  // 36
  {
    assert(
      WIDE_BLOCK_KEYS.has('film_indonesia') && isBlockWide('film_indonesia' as any),
      'WIDE_BLOCK_KEYS marks film_indonesia as a wide block'
    );
  }

  // 37
  {
    const order = resolveBlockOrder(['hero', 'streaming', 'reviews'] as any);
    assertEquals(
      order.indexOf('film_indonesia'),
      order.indexOf('streaming') + 1,
      'saved order without film_indonesia inserts it right after streaming'
    );
  }

  // 38
  {
    const order = resolveBlockOrder(['hero', 'watchlists'] as any);
    assertEquals(
      order.slice(-2),
      ['streaming', 'film_indonesia'],
      'saved order without film_recommendations appends streaming then film_indonesia'
    );
  }

  // 39
  {
    const result = resolveHomeFilmIndonesia(indonesianFilms);
    assertEquals(
      result.map(f => f.id),
      ['id-new', 'id-tagged', 'id-lowercase', 'id-old'],
      'resolveHomeFilmIndonesia keeps Indonesian films (country or tag) and sorts newest first'
    );
  }

  // 40
  {
    const ids = resolveHomeFilmIndonesia(indonesianFilms).map(f => f.id);
    assert(
      !ids.includes('non-id') && !ids.includes('no-country'),
      'resolveHomeFilmIndonesia excludes films from other or unknown countries'
    );
    assert(
      !ids.includes('id-wrong-tag'),
      'resolveHomeFilmIndonesia only matches the exact Film Indonesia tag'
    );
  }

  // 41
  {
    assertEquals(
      resolveHomeFilmIndonesia([]),
      [],
      'resolveHomeFilmIndonesia returns [] without films'
    );
  }

  // 42
  {
    assertEquals(
      resolveHomeFilmIndonesia(indonesianFilms, { sourceType: 'auto', enabled: false }),
      [],
      'resolveHomeFilmIndonesia returns [] when disabled'
    );
  }

  // 43
  {
    const manyFilms = Array.from({ length: 15 }, (_, i) =>
      createFilm({ id: `id-limit-${i}`, originCountry: ['ID'] })
    );
    const result = resolveHomeFilmIndonesia(manyFilms);
    assertEquals(result.length, 12, 'resolveHomeFilmIndonesia defaults to 12 films');
  }

  // 44
  {
    const result = resolveHomeFilmIndonesia(indonesianFilms, {
      sourceType: 'manual',
      itemIds: ['id-old', 'missing-id', 'id-new', 'id-tagged'],
      limit: 2,
    } as SectionConfig);
    assertEquals(
      result.map(f => f.id),
      ['id-old', 'id-new'],
      'resolveHomeFilmIndonesia manual mode keeps order, skips missing ids, and respects the limit'
    );
  }

  // 45
  {
    const categoryFilms = [
      createFilm({ id: 'id-movie', originCountry: ['ID'], type: 'movie' }),
      createFilm({ id: 'id-series', originCountry: ['ID'], type: 'series' }),
    ];
    const result = resolveHomeFilmIndonesia(categoryFilms, {
      sourceType: 'auto',
      category: 'series',
    } as SectionConfig);
    assertEquals(
      result.map(f => f.id),
      ['id-series'],
      'resolveHomeFilmIndonesia applies the category filter'
    );
  }

  // 46
  {
    const taggedFilms = [
      createFilm({ id: 'id-horror', originCountry: ['ID'], tags: ['Horor'] }),
      createFilm({ id: 'id-drama', originCountry: ['ID'], tags: ['Drama'] }),
      createFilm({ id: 'non-id-horror', originCountry: ['US'], tags: ['Horor'] }),
    ];
    const result = resolveHomeFilmIndonesia(taggedFilms, {
      sourceType: 'auto',
      tag: 'Horor',
    } as SectionConfig);
    assertEquals(
      result.map(f => f.id),
      ['id-horror'],
      'resolveHomeFilmIndonesia applies the tag filter on top of the Indonesian default'
    );
  }

  // 47
  {
    const withDuplicate = [...indonesianFilms, indonesianFilms[0], indonesianFilms[2]];
    const ids = resolveHomeFilmIndonesia(withDuplicate).map(f => f.id);
    assertEquals(ids.length, new Set(ids).size, 'resolveHomeFilmIndonesia never returns duplicate films');
  }

  // 48
  {
    const undatedFilms = [
      createFilm({ id: 'id-undated-2020', originCountry: ['ID'], year: 2020, title: 'B Film' }),
      createFilm({ id: 'id-undated-2023', originCountry: ['ID'], year: 2023, title: 'Z Film' }),
      createFilm({ id: 'id-undated-tie-a', originCountry: ['ID'], year: 2020, title: 'A Film' }),
    ];
    const result = resolveHomeFilmIndonesia(undatedFilms);
    assertEquals(
      result.map(f => f.id),
      ['id-undated-2023', 'id-undated-tie-a', 'id-undated-2020'],
      'resolveHomeFilmIndonesia falls back to year then title without release dates'
    );
  }

  console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) {
    process.exit(1);
  }
};

runTests();
