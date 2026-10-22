import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getCardRating } from '../src/utils/filmCardRating';
import { getCardGenres } from '../src/utils/filmGenres';
import type { FilmItem } from '../src/types';

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

const createFilm = (overrides: Partial<FilmItem> = {}): FilmItem => ({
  id: 'film-test',
  title: 'Test Film',
  type: 'movie',
  year: 2026,
  poster: '',
  backdrop: '',
  synopsis: '',
  director: '',
  cast: [],
  genres: [],
  skorSotoy: 8.4,
  totalVotes: 10,
  criticsSkorSotoy: 8.4,
  whereToWatch: [],
  scoreScale: 10,
  ...overrides,
});

const runTests = () => {
  console.log('Running Film Card Tests...\n');

  // ---------------------------------------------------------------------------
  // getCardRating: score formatting
  // ---------------------------------------------------------------------------
  assertEquals(
    getCardRating(createFilm({ skorSotoy: 8.4 })),
    { kind: 'score', text: '8.4' },
    'getCardRating: shows a one-decimal score'
  );
  assertEquals(
    getCardRating(createFilm({ skorSotoy: 8.46 })),
    { kind: 'score', text: '8.5' },
    'getCardRating: rounds to one decimal'
  );
  assertEquals(
    getCardRating(createFilm({ skorSotoy: 10, totalVotes: 5 })),
    { kind: 'score', text: '10.0' },
    'getCardRating: keeps a perfect 10.0'
  );
  assertEquals(
    getCardRating(createFilm({ skorSotoy: 11 })),
    { kind: 'score', text: '10.0' },
    'getCardRating: clamps a score above 10'
  );

  // ---------------------------------------------------------------------------
  // getCardRating: scale normalization
  // ---------------------------------------------------------------------------
  assertEquals(
    getCardRating(createFilm({ skorSotoy: 4.25, scoreScale: 5, totalVotes: 12 })),
    { kind: 'score', text: '8.5' },
    'getCardRating: normalizes a 5-point score to 10'
  );
  assertEquals(
    getCardRating(createFilm({ skorSotoy: 5, scoreScale: 5, totalVotes: 1 })),
    { kind: 'score', text: '10.0' },
    'getCardRating: normalizes a full 5-point score to 10.0'
  );
  assertEquals(
    getCardRating(createFilm({ skorSotoy: 85, scoreScale: 100 })),
    { kind: 'score', text: '8.5' },
    'getCardRating: normalizes a 100-point score to 10'
  );
  assertEquals(
    getCardRating(createFilm({ skorSotoy: 7.25, scoreScale: undefined })),
    { kind: 'score', text: '7.3' },
    'getCardRating: missing scoreScale defaults to 10'
  );
  assertEquals(
    getCardRating(createFilm({ skorSotoy: 6.04, scoreScale: 0 })),
    { kind: 'score', text: '6.0' },
    'getCardRating: invalid scoreScale defaults to 10'
  );

  // ---------------------------------------------------------------------------
  // getCardRating: no score states
  // ---------------------------------------------------------------------------
  assertEquals(
    getCardRating(createFilm({ skorSotoy: 0, totalVotes: 10 })),
    { kind: 'none' },
    'getCardRating: zero score shows no score'
  );
  assertEquals(
    getCardRating(createFilm({ skorSotoy: 8.7, totalVotes: 0 })),
    { kind: 'none' },
    'getCardRating: zero votes shows no score'
  );
  assertEquals(
    getCardRating(createFilm({ skorSotoy: 8.7, totalVotes: undefined as unknown as number })),
    { kind: 'none' },
    'getCardRating: missing votes shows no score'
  );
  assertEquals(
    getCardRating(createFilm({ skorSotoy: undefined as unknown as number })),
    { kind: 'none' },
    'getCardRating: missing score shows no score'
  );
  assertEquals(
    getCardRating(createFilm({ skorSotoy: -1 })),
    { kind: 'none' },
    'getCardRating: negative score shows no score'
  );
  assertEquals(
    getCardRating(createFilm({ skorSotoy: Number.NaN })),
    { kind: 'none' },
    'getCardRating: non-finite score shows no score'
  );
  assertEquals(
    getCardRating(createFilm({ totalVotes: Number.NaN })),
    { kind: 'none' },
    'getCardRating: non-finite votes shows no score'
  );

  // ---------------------------------------------------------------------------
  // getCardRating: very small score
  // ---------------------------------------------------------------------------
  assertEquals(
    getCardRating(createFilm({ skorSotoy: 0.04, totalVotes: 1 })),
    { kind: 'score', text: '0.0' },
    'getCardRating: a very small positive score still renders one decimal'
  );
  assertEquals(
    getCardRating(createFilm({ skorSotoy: 0.05, totalVotes: 1 })),
    { kind: 'score', text: '0.1' },
    'getCardRating: a very small score rounds up to 0.1'
  );

  // ---------------------------------------------------------------------------
  // getCardGenres: single-line genre label
  // ---------------------------------------------------------------------------
  assertEquals(
    getCardGenres(createFilm({ genres: ['Drama', 'Thriller'] })),
    'Drama, Thriller',
    'getCardGenres: joins two genres'
  );
  assertEquals(
    getCardGenres(createFilm({ genres: ['Action', 'Drama', 'Thriller'] })),
    'Action, Drama',
    'getCardGenres: caps the label at two genres'
  );
  assertEquals(
    getCardGenres(createFilm({ genres: [] })),
    '',
    'getCardGenres: empty genres renders nothing'
  );
  assertEquals(
    getCardGenres(createFilm({ genres: undefined as unknown as string[] })),
    '',
    'getCardGenres: missing genres renders nothing'
  );
  assertEquals(
    getCardGenres(createFilm({ genres: ['Drama', 'drama', 'DRAMA'] })),
    'Drama',
    'getCardGenres: removes duplicate genres case-insensitively'
  );
  assertEquals(
    getCardGenres(createFilm({ genres: ['28', '53'] })),
    'Action, Thriller',
    'getCardGenres: maps TMDB id strings to names'
  );
  assertEquals(
    getCardGenres(createFilm({ genres: [28, 53] as unknown as string[] })),
    'Action, Thriller',
    'getCardGenres: maps numeric TMDB ids to names'
  );
  assertEquals(
    getCardGenres(createFilm({ genres: ['28', 'Action', 'Drama'] })),
    'Action, Drama',
    'getCardGenres: deduplicates a mapped id and its name'
  );
  assertEquals(
    getCardGenres(createFilm({ genres: ['Drama', 'Thriller', 'Crime'] }), 1),
    'Drama',
    'getCardGenres: honors a custom max'
  );
  assertEquals(
    getCardGenres(createFilm({ genres: ['Drama'] }), 0),
    '',
    'getCardGenres: max zero renders nothing'
  );
  assertEquals(
    getCardGenres(createFilm({ genres: ['', '  ', 'Drama'] })),
    'Drama',
    'getCardGenres: ignores blank genres'
  );
  assertEquals(
    getCardGenres(createFilm({ genres: ['9999', 'Drama'] })),
    'Drama',
    'getCardGenres: ignores unknown numeric ids'
  );

  // ---------------------------------------------------------------------------
  // SocialShareModal must no longer contain the verdict helper
  // ---------------------------------------------------------------------------
  const socialSharePath = fileURLToPath(
    new URL('../src/components/Modals/SocialShareModal.tsx', import.meta.url)
  );
  const socialShareSource = readFileSync(socialSharePath, 'utf8');
  assert(
    !socialShareSource.includes('getScoreVerdict'),
    'SocialShareModal: getScoreVerdict no longer exists'
  );

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
};

runTests();
