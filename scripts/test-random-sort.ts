import { seededShuffle, getPageLoadSeed } from '../src/utils/shuffle';
import { resolveConfigFilms } from '../src/utils/homepageConfigHelper';
import {
  resolveFilmDbSection,
  resolveHomeFilmRecs,
  getHeroToWatch,
  resolveHomeStreaming,
  resolveHomeFilmIndonesia,
} from '../src/utils/filmSections';
import { FilmItem, SectionConfig } from '../src/types';

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
  console.log('Running Random Sort for Auto Sections Tests...\n');

  // -------------------------------------------------------------------------
  // 1. Seeded Shuffle Unit Tests
  // -------------------------------------------------------------------------
  console.log('--- Suite 1: seededShuffle Unit Tests ---');
  {
    const items = Array.from({ length: 20 }, (_, i) => `item-${i + 1}`);
    const originalCopy = [...items];

    // Same seed gives same order
    const shuffle1 = seededShuffle(items, 12345);
    const shuffle2 = seededShuffle(items, 12345);
    assertEquals(
      JSON.stringify(shuffle1),
      JSON.stringify(shuffle2),
      'Same seed gives identical output order'
    );

    // Different seeds give different orders
    const shuffleDiff = seededShuffle(items, 67890);
    assert(
      JSON.stringify(shuffle1) !== JSON.stringify(shuffleDiff),
      'Different seeds give different output orders'
    );

    // Input is not mutated
    assertEquals(
      JSON.stringify(items),
      JSON.stringify(originalCopy),
      'Input array is not mutated by seededShuffle'
    );

    // Edge cases: empty and single element
    assertEquals(seededShuffle([], 42).length, 0, 'Empty array returns empty array');
    const single = ['only'];
    const singleShuffled = seededShuffle(single, 42);
    assertEquals(singleShuffled.length, 1, 'Single item returns array of length 1');
    assertEquals(singleShuffled[0], 'only', 'Single item content preserved');
    assert(single !== singleShuffled, 'Single item returns new array copy');
  }

  // -------------------------------------------------------------------------
  // 2. getPageLoadSeed Stability
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 2: getPageLoadSeed Stability ---');
  {
    const seed1 = getPageLoadSeed();
    const seed2 = getPageLoadSeed();
    assert(typeof seed1 === 'number' && !isNaN(seed1), 'getPageLoadSeed returns a valid number');
    assertEquals(seed1, seed2, 'getPageLoadSeed is stable across multiple calls');
  }

  // -------------------------------------------------------------------------
  // 3. resolveConfigFilms with sortBy: 'random'
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 3: resolveConfigFilms with sortBy: random ---');
  {
    const testFilms: FilmItem[] = Array.from({ length: 15 }, (_, i) =>
      createFilm({
        id: `film-${i + 1}`,
        title: `Film ${i + 1}`,
        year: 2010 + i,
        genres: i % 2 === 0 ? ['Action'] : ['Drama'],
        skorSotoy: 5 + (i * 0.3),
        totalVotes: 10 + i * 5,
      })
    );

    // Same seed gives same order
    const configRandom: SectionConfig = {
      sourceType: 'auto',
      sortBy: 'random',
      limit: 15,
    };
    const resA = resolveConfigFilms(testFilms, configRandom, [], { seed: 999 });
    const resB = resolveConfigFilms(testFilms, configRandom, [], { seed: 999 });
    assertEquals(
      resA.map(f => f.id).join(','),
      resB.map(f => f.id).join(','),
      'resolveConfigFilms: same seed produces identical film order'
    );

    // Different seed gives different order
    const resC = resolveConfigFilms(testFilms, configRandom, [], { seed: 888 });
    assert(
      resA.map(f => f.id).join(',') !== resC.map(f => f.id).join(','),
      'resolveConfigFilms: different seeds produce different film orders'
    );

    // Filters are strictly respected before shuffling
    const configActionRandom: SectionConfig = {
      sourceType: 'auto',
      genre: 'Action',
      sortBy: 'random',
      limit: 10,
    };
    const resAction = resolveConfigFilms(testFilms, configActionRandom, [], { seed: 777 });
    assert(resAction.length > 0, 'Action films found');
    assert(
      resAction.every(f => f.genres.includes('Action')),
      'All randomly shuffled films strictly match the genre filter'
    );

    // Limit applies AFTER shuffling (all items reachable across seeds)
    const allSeenIds = new Set<string>();
    const configSmallLimit: SectionConfig = {
      sourceType: 'auto',
      sortBy: 'random',
      limit: 4,
    };
    for (let s = 1; s <= 40; s++) {
      const slice = resolveConfigFilms(testFilms, configSmallLimit, [], { seed: s * 1337 });
      slice.forEach(f => allSeenIds.add(f.id));
    }
    assertEquals(
      allSeenIds.size,
      15,
      'Limit applies AFTER shuffling: all 15 matching films are reachable across seeds'
    );

    // Manual mode ignores random sort
    const manualConfig: SectionConfig = {
      sourceType: 'manual',
      sortBy: 'random',
      itemIds: ['film-5', 'film-2', 'film-9'],
    };
    const manualRes = resolveConfigFilms(testFilms, manualConfig, [], { seed: 42 });
    assertEquals(
      manualRes.map(f => f.id).join(','),
      'film-5,film-2,film-9',
      'Manual mode preserves itemIds order and ignores sortBy: random'
    );
  }

  // -------------------------------------------------------------------------
  // 4. resolveFilmDbSection with sortBy: 'random'
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 4: resolveFilmDbSection with sortBy: random ---');
  {
    const streamFilms: FilmItem[] = Array.from({ length: 12 }, (_, i) =>
      createFilm({
        id: `stream-${i + 1}`,
        title: `Streaming Film ${i + 1}`,
        year: 2020 + (i % 4),
        whereToWatch: [{ platform: 'Netflix', type: 'stream', badgeColor: '#E50914' }],
      })
    );

    const configStreamRandom: SectionConfig = {
      sourceType: 'auto',
      sortBy: 'random',
      limit: 6,
    };

    const run1 = resolveFilmDbSection('fd_streaming', streamFilms, configStreamRandom, { seed: 101 });
    const run2 = resolveFilmDbSection('fd_streaming', streamFilms, configStreamRandom, { seed: 101 });
    const run3 = resolveFilmDbSection('fd_streaming', streamFilms, configStreamRandom, { seed: 202 });

    assertEquals(
      run1.map(f => f.id).join(','),
      run2.map(f => f.id).join(','),
      'resolveFilmDbSection: same seed gives same order'
    );
    assert(
      run1.map(f => f.id).join(',') !== run3.map(f => f.id).join(','),
      'resolveFilmDbSection: different seeds give different orders'
    );
    assertEquals(run1.length, 6, 'resolveFilmDbSection: respects limit');

    // Section filters are preserved (e.g. fd_streaming only returns films with stream type)
    const mixedFilms: FilmItem[] = [
      ...streamFilms,
      createFilm({ id: 'cinema-only', title: 'Cinema Only', whereToWatch: [{ platform: 'XXI', type: 'cinema', badgeColor: '#000' }] }),
    ];
    const streamRes = resolveFilmDbSection('fd_streaming', mixedFilms, configStreamRandom, { seed: 303 });
    assert(
      streamRes.every(f => f.whereToWatch.some(w => w.type === 'stream')),
      'resolveFilmDbSection: keeps only films that pass section filters'
    );
    assert(
      !streamRes.some(f => f.id === 'cinema-only'),
      'Cinema-only film excluded from fd_streaming section under random sort'
    );

    // Manual mode ignores random sort in resolveFilmDbSection
    const manualDbConfig: SectionConfig = {
      sourceType: 'manual',
      sortBy: 'random',
      itemIds: ['stream-4', 'stream-1'],
    };
    const manualDbRes = resolveFilmDbSection('fd_streaming', streamFilms, manualDbConfig, { seed: 404 });
    assertEquals(
      manualDbRes.map(f => f.id).join(','),
      'stream-4,stream-1',
      'resolveFilmDbSection: manual mode ignores random sort'
    );
  }

  // -------------------------------------------------------------------------
  // 5. Existing sort options behave exactly as before
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 5: Existing sort options behave as before ---');
  {
    const films = [
      createFilm({ id: 'f-1', title: 'Low Rating', skorSotoy: 4.0, totalVotes: 50, releaseDate: '2023-01-01', year: 2023 }),
      createFilm({ id: 'f-2', title: 'High Rating', skorSotoy: 9.5, totalVotes: 10, releaseDate: '2022-01-01', year: 2022 }),
      createFilm({ id: 'f-3', title: 'Most Votes', skorSotoy: 7.0, totalVotes: 200, releaseDate: '2024-06-01', year: 2024 }),
      createFilm({ id: 'f-4', title: 'Soonest Release', skorSotoy: 6.0, totalVotes: 5, releaseDate: '2025-01-01', year: 2025 }),
    ];

    // Rating sort
    const byRating = resolveConfigFilms(films, { sourceType: 'auto', sortBy: 'rating' });
    assertEquals(byRating[0].id, 'f-2', 'Rating sort puts highest score first (9.5)');

    // Votes sort
    const byVotes = resolveConfigFilms(films, { sourceType: 'auto', sortBy: 'votes' });
    assertEquals(byVotes[0].id, 'f-3', 'Votes sort puts most votes first (200)');

    // Release soonest
    const bySoonest = resolveConfigFilms(films, { sourceType: 'auto', sortBy: 'release_soonest' });
    assertEquals(bySoonest[0].id, 'f-2', 'Release soonest puts earliest date first (2022-01-01)');

    // Newest (default)
    const byNewest = resolveConfigFilms(films, { sourceType: 'auto', sortBy: 'newest' });
    assertEquals(byNewest[0].id, 'f-4', 'Newest puts latest date first (2025-01-01)');
  }

  // -------------------------------------------------------------------------
  // 6. Home Section Resolvers (Curated, Hero, Streaming, Film Indonesia)
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 6: Home section resolvers support random sort ---');
  {
    const films: FilmItem[] = Array.from({ length: 14 }, (_, i) =>
      createFilm({
        id: `film-home-${i + 1}`,
        title: `Home Film ${i + 1}`,
        originCountry: ['ID'],
        whereToWatch: [{ platform: 'Netflix', type: 'stream', badgeColor: '#E50914' }],
      })
    );

    const recs = resolveHomeFilmRecs(films, { sourceType: 'auto', sortBy: 'random' }, { seed: 555 });
    assertEquals(recs.length, 6, 'resolveHomeFilmRecs returns default 6 items');

    const hero = getHeroToWatch(films, { sourceType: 'auto', sortBy: 'random' }, { seed: 555 });
    assertEquals(hero.length, 5, 'getHeroToWatch returns default 5 items');

    const stream = resolveHomeStreaming(films, { sourceType: 'auto', sortBy: 'random' }, undefined, { seed: 555 });
    assert(stream.length > 0, 'resolveHomeStreaming returns items with random sort');

    const indo = resolveHomeFilmIndonesia(films, { sourceType: 'auto', sortBy: 'random' }, { seed: 555 });
    assert(indo.length > 0, 'resolveHomeFilmIndonesia returns items with random sort');
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log(`\n========================================`);
  console.log(`Tests finished: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
};

runTests();
