import { classifyFilmType, normalizeFilmType } from '../src/utils/filmType';

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
  console.log('Running Film Type Tests...\n');

  // ---------------------------------------------------------------------------
  // classifyFilmType
  // ---------------------------------------------------------------------------

  // 1. movie + Animation genre name -> animation
  assertEquals(
    classifyFilmType({ mediaType: 'movie', genres: ['Animation'] }),
    'animation',
    'classifyFilmType: movie with "Animation" genre -> animation'
  );

  // 2. tv + Animation genre name -> animation
  assertEquals(
    classifyFilmType({ mediaType: 'tv', genres: ['Animation'] }),
    'animation',
    'classifyFilmType: tv with "Animation" genre -> animation'
  );

  // 3. tv without animation genres -> series
  assertEquals(
    classifyFilmType({ mediaType: 'tv', genres: ['Drama', 'Mystery'] }),
    'series',
    'classifyFilmType: tv without animation genres -> series'
  );

  // 4. movie without animation genres -> movie
  assertEquals(
    classifyFilmType({ mediaType: 'movie', genres: ['Action', 'Thriller'] }),
    'movie',
    'classifyFilmType: movie without animation genres -> movie'
  );

  // 5. TMDB genre id 16 (numeric) -> animation
  assertEquals(
    classifyFilmType({ mediaType: 'movie', genres: [16, 28] }),
    'animation',
    'classifyFilmType: numeric TMDB genre id 16 -> animation'
  );

  // 6. TMDB genre id "16" (string) -> animation
  assertEquals(
    classifyFilmType({ mediaType: 'tv', genres: ['16'] }),
    'animation',
    'classifyFilmType: string TMDB genre id "16" -> animation'
  );

  // 7. "Animasi" genre name -> animation
  assertEquals(
    classifyFilmType({ mediaType: 'movie', genres: ['Animasi'] }),
    'animation',
    'classifyFilmType: "Animasi" genre -> animation'
  );

  // 8. Case-insensitive and whitespace-trimmed genre matching
  assertEquals(
    classifyFilmType({ mediaType: 'tv', genres: ['  aNiMaTiOn  '] }),
    'animation',
    'classifyFilmType: genre matching is case-insensitive and trimmed'
  );

  // 9. Unknown genre does not falsely flag animation
  assertEquals(
    classifyFilmType({ mediaType: 'tv', genres: ['Anime', 'Documentary'] }),
    'series',
    'classifyFilmType: "Anime" genre label alone does not force animation'
  );

  // 10. Missing genres defaults to media type mapping
  assertEquals(
    classifyFilmType({ mediaType: 'movie' }),
    'movie',
    'classifyFilmType: missing genres on movie -> movie'
  );
  assertEquals(
    classifyFilmType({ mediaType: 'tv' }),
    'series',
    'classifyFilmType: missing genres on tv -> series'
  );

  // 11. Mixed genre list containing id 16 -> animation
  assertEquals(
    classifyFilmType({ mediaType: 'movie', genres: ['Adventure', 16, 'Family'] }),
    'animation',
    'classifyFilmType: mixed genres containing id 16 -> animation'
  );

  // 12. Empty genre list on tv -> series
  assertEquals(
    classifyFilmType({ mediaType: 'tv', genres: [] }),
    'series',
    'classifyFilmType: empty genres on tv -> series'
  );

  // ---------------------------------------------------------------------------
  // normalizeFilmType
  // ---------------------------------------------------------------------------

  // 13. Legacy "anime" -> animation
  assertEquals(normalizeFilmType('anime'), 'animation', 'normalizeFilmType: legacy "anime" -> animation');

  // 14. "animation" stays animation
  assertEquals(normalizeFilmType('animation'), 'animation', 'normalizeFilmType: "animation" -> animation');

  // 15. Case-insensitive + trimmed legacy "ANIME"
  assertEquals(normalizeFilmType('  ANIME  '), 'animation', 'normalizeFilmType: trims and lowercases "ANIME"');

  // 16. "movie" -> movie
  assertEquals(normalizeFilmType('movie'), 'movie', 'normalizeFilmType: "movie" -> movie');

  // 17. "series" and "tv" -> series
  assertEquals(normalizeFilmType('series'), 'series', 'normalizeFilmType: "series" -> series');
  assertEquals(normalizeFilmType('tv'), 'series', 'normalizeFilmType: "tv" -> series');

  // 18. Unknown value -> movie
  assertEquals(normalizeFilmType('documentary'), 'movie', 'normalizeFilmType: unknown "documentary" -> movie');

  // 19. Empty-ish values -> movie
  assertEquals(normalizeFilmType(undefined), 'movie', 'normalizeFilmType: undefined -> movie');
  assertEquals(normalizeFilmType(null), 'movie', 'normalizeFilmType: null -> movie');
  assertEquals(normalizeFilmType(''), 'movie', 'normalizeFilmType: empty string -> movie');

  // 20. Legacy admin value "anime" is no longer a FilmFormat
  assert(
    (normalizeFilmType('anime') as string) !== 'anime',
    'normalizeFilmType: never returns the legacy "anime" format'
  );

  console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) {
    process.exit(1);
  }
};

runTests();
