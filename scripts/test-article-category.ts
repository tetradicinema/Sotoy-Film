import {
  normalizeArticleCategory,
  normalizeInterestKey,
  normalizeInterestLabel,
  normalizeInterestProfile,
} from '../src/utils/articleCategory';

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
  console.log('Running Article Category Tests...\n');

  // ---------------------------------------------------------------------------
  // normalizeArticleCategory
  // ---------------------------------------------------------------------------
  assertEquals(normalizeArticleCategory('anime'), 'animation', 'normalizeArticleCategory: anime -> animation');
  assertEquals(normalizeArticleCategory('ANIME'), 'animation', 'normalizeArticleCategory: ANIME -> animation');
  assertEquals(normalizeArticleCategory('Anime'), 'animation', 'normalizeArticleCategory: Anime -> animation');
  assertEquals(normalizeArticleCategory('animasi'), 'animation', 'normalizeArticleCategory: animasi -> animation');
  assertEquals(normalizeArticleCategory('ANIMASI'), 'animation', 'normalizeArticleCategory: ANIMASI -> animation');
  assertEquals(normalizeArticleCategory('  anime  '), 'animation', 'normalizeArticleCategory: trims surrounding whitespace');
  assertEquals(normalizeArticleCategory('animation'), 'animation', 'normalizeArticleCategory: animation unchanged');
  assertEquals(normalizeArticleCategory('  animation  '), 'animation', 'normalizeArticleCategory: trims animation');
  assertEquals(normalizeArticleCategory('movies'), 'movies', 'normalizeArticleCategory: movies unchanged');
  assertEquals(normalizeArticleCategory('series'), 'series', 'normalizeArticleCategory: series unchanged');
  assertEquals(normalizeArticleCategory('cinema-gear'), 'cinema-gear', 'normalizeArticleCategory: cinema-gear unchanged');
  assertEquals(normalizeArticleCategory('film-studies'), 'film-studies', 'normalizeArticleCategory: film-studies unchanged');
  assertEquals(normalizeArticleCategory('documentary'), 'documentary', 'normalizeArticleCategory: unknown value unchanged');
  assertEquals(normalizeArticleCategory('  unknown  '), 'unknown', 'normalizeArticleCategory: trims unknown value');
  assertEquals(normalizeArticleCategory(undefined), undefined, 'normalizeArticleCategory: undefined unchanged');
  assertEquals(normalizeArticleCategory(null), null, 'normalizeArticleCategory: null unchanged');
  assertEquals(normalizeArticleCategory(''), '', 'normalizeArticleCategory: empty string unchanged');

  // ---------------------------------------------------------------------------
  // Interest labels / profile keys
  // ---------------------------------------------------------------------------
  assertEquals(normalizeInterestLabel('Anime'), 'Animation', 'normalizeInterestLabel: Anime -> Animation');
  assertEquals(normalizeInterestLabel('animasi'), 'Animation', 'normalizeInterestLabel: animasi -> Animation');
  assertEquals(normalizeInterestLabel('Drama'), 'Drama', 'normalizeInterestLabel: other labels unchanged');
  assertEquals(normalizeInterestKey('anime'), 'animation', 'normalizeInterestKey: anime -> animation');
  assertEquals(normalizeInterestKey('Animasi'), 'animation', 'normalizeInterestKey: Animasi -> animation');
  assertEquals(normalizeInterestKey('sci-fi'), 'sci-fi', 'normalizeInterestKey: other keys unchanged');
  assertEquals(
    normalizeInterestProfile({ anime: 5, horror: 2 }),
    { animation: 5, horror: 2 },
    'normalizeInterestProfile: rewrites legacy keys'
  );
  assertEquals(
    normalizeInterestProfile({ anime: 2, animation: 3 }),
    { animation: 5 },
    'normalizeInterestProfile: merges legacy and canonical keys'
  );

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
};

runTests();
