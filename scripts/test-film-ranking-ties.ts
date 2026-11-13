/**
 * Tests for ranking robustness after vote counts are cleaned up.
 *
 * Covers:
 * - Bayesian scores are not all equal when every film has totalVotes 0, and
 *   their order follows the normalized (TMDB-derived) score.
 * - A single film with real votes does not zero or flatten the rest.
 * - computeMeanScore fallback when no film has votes.
 * - "views"/"votes" sorting ties: votes desc, score desc, title asc.
 * - The v > 0 Bayesian formula is unchanged from the original implementation.
 */

import {
  compareFilmsByVotesThenScore,
  computeBayesianScore,
  computeMeanScore,
  normalizeFilmScore,
  resolveFilmDbSection,
} from '../src/utils/filmSections';
import { filterRecommendationFilms } from '../src/utils/filmMoods';
import { resolveConfigFilms } from '../src/utils/homepageConfigHelper';
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
  skorSotoy: 0,
  criticsSkorSotoy: 0,
  totalVotes: 0,
  scoreScale: 10,
  whereToWatch: [],
  ...overrides,
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

const assertClose = (actual: number, expected: number, message: string, epsilon = 1e-12) => {
  assert(
    Math.abs(actual - expected) <= epsilon,
    `${message} (expected: ${expected}, got: ${actual})`
  );
};

const titles = (films: FilmItem[]): string[] => films.map(film => film.title);

const runTests = () => {
  // ---------------------------------------------------------------------------
  // (a) Every film has totalVotes 0: Bayesian scores stay distinct and ordered
  //     by the normalized score instead of all collapsing to the mean.
  // ---------------------------------------------------------------------------
  const unvoted = [
    createFilm({ id: 'a', title: 'Alpha', skorSotoy: 6, totalVotes: 0 }),
    createFilm({ id: 'b', title: 'Bravo', skorSotoy: 9, totalVotes: 0 }),
    createFilm({ id: 'c', title: 'Charlie', skorSotoy: 7.5, totalVotes: 0 }),
  ];
  const unvotedMean = computeMeanScore(unvoted);
  assertClose(unvotedMean, 7.5, '(a) mean falls back to the mean of positive normalized scores');

  const unvotedScores = unvoted.map(film => computeBayesianScore(film, unvotedMean));
  assert(
    new Set(unvotedScores.map(score => score.toFixed(6))).size === unvoted.length,
    '(a) Bayesian scores are not all equal when no film has votes'
  );
  unvoted.forEach((film, index) => {
    assertClose(
      unvotedScores[index],
      normalizeFilmScore(film),
      `(a) ${film.title} ranks by its own normalized score`
    );
  });

  const unvotedSorted = [...unvoted].sort(compareFilmsByVotesThenScore);
  assertEquals(titles(unvotedSorted), ['Bravo', 'Charlie', 'Alpha'], '(a) order follows normalized score');

  // Same result through the recommendation mood path.
  const moodSorted = filterRecommendationFilms(unvoted);
  assertEquals(
    titles(moodSorted),
    ['Bravo', 'Charlie', 'Alpha'],
    '(a) filterRecommendationFilms orders unvoted films by normalized score'
  );

  // ---------------------------------------------------------------------------
  // (b) One film with real votes: unvoted films still use their own score and
  //     none of them becomes 0.
  // ---------------------------------------------------------------------------
  const mixed = [
    createFilm({ id: 'd', title: 'Delta', skorSotoy: 8, totalVotes: 0 }),
    createFilm({ id: 'e', title: 'Echo', skorSotoy: 6, totalVotes: 0 }),
    createFilm({ id: 'f', title: 'Foxtrot', skorSotoy: 7, totalVotes: 2 }),
  ];
  const mixedMean = computeMeanScore(mixed);
  assertClose(mixedMean, 7, '(b) mean uses only the films that have real votes');

  const deltaScore = computeBayesianScore(mixed[0], mixedMean);
  const echoScore = computeBayesianScore(mixed[1], mixedMean);
  assertClose(deltaScore, 8, '(b) unvoted Delta keeps its own score');
  assertClose(echoScore, 6, '(b) unvoted Echo keeps its own score');
  assert(deltaScore > 0 && echoScore > 0, '(b) unvoted films never become 0');

  const mixedSorted = [...mixed].sort(compareFilmsByVotesThenScore);
  assertEquals(titles(mixedSorted), ['Foxtrot', 'Delta', 'Echo'], '(b) real votes still rank first');

  // ---------------------------------------------------------------------------
  // (c) computeMeanScore fallback details.
  // ---------------------------------------------------------------------------
  const withZeroScores = [
    createFilm({ id: 'g', title: 'Golf', skorSotoy: 8, totalVotes: 0 }),
    createFilm({ id: 'h', title: 'Hotel', skorSotoy: 0, totalVotes: 0 }),
    createFilm({ id: 'i', title: 'India', skorSotoy: 6, totalVotes: 0 }),
  ];
  assertClose(
    computeMeanScore(withZeroScores),
    7,
    '(c) fallback ignores normalized scores of 0'
  );
  assertEquals(
    computeMeanScore([
      createFilm({ id: 'j', title: 'Juliet', skorSotoy: 0, totalVotes: 0 }),
      createFilm({ id: 'k', title: 'Kilo', skorSotoy: 0, totalVotes: 0 }),
    ]),
    0,
    '(c) fallback returns 0 when no positive normalized score exists'
  );

  const oneVoted = [
    createFilm({ id: 'l', title: 'Lima', skorSotoy: 4, totalVotes: 3 }),
    createFilm({ id: 'm', title: 'Mike', skorSotoy: 10, totalVotes: 0 }),
  ];
  assertClose(
    computeMeanScore(oneVoted),
    4,
    '(c) behaviour is unchanged when at least one film has votes'
  );

  // scoreScale is honoured by the fallback (5-point legacy score doubles).
  assertClose(
    computeMeanScore([
      createFilm({ id: 'n', title: 'November', skorSotoy: 4, scoreScale: 5, totalVotes: 0 }),
      createFilm({ id: 'o', title: 'Oscar', skorSotoy: 8, scoreScale: 10, totalVotes: 0 }),
    ]),
    8,
    '(c) fallback normalizes the legacy 5-point scale'
  );

  // ---------------------------------------------------------------------------
  // (d) votes-sort ties: votes desc, then score desc, then title asc.
  // ---------------------------------------------------------------------------
  const sameVotes = [
    createFilm({ id: 'p', title: 'Zulu', skorSotoy: 9, totalVotes: 5 }),
    createFilm({ id: 'q', title: 'Alpha', skorSotoy: 7, totalVotes: 5 }),
    createFilm({ id: 'r', title: 'Bravo', skorSotoy: 9, totalVotes: 5 }),
    createFilm({ id: 's', title: 'Yankee', skorSotoy: 9.5, totalVotes: 6 }),
  ];
  const tieSorted = [...sameVotes].sort(compareFilmsByVotesThenScore);
  assertEquals(
    titles(tieSorted),
    ['Yankee', 'Bravo', 'Zulu', 'Alpha'],
    '(d) votes first, then score, then title'
  );

  const votesConfig: SectionConfig = { sourceType: 'auto', sortBy: 'votes' };
  const sectionSorted = resolveFilmDbSection('rec_tonight', sameVotes, votesConfig);
  assertEquals(
    titles(sectionSorted),
    ['Yankee', 'Bravo', 'Zulu', 'Alpha'],
    '(d) resolveFilmDbSection applies the same deterministic votes order'
  );

  const configSorted = resolveConfigFilms(sameVotes, {
    sourceType: 'auto',
    sortBy: 'votes',
    limit: 10,
  });
  assertEquals(
    titles(configSorted),
    ['Yankee', 'Bravo', 'Zulu', 'Alpha'],
    '(d) resolveConfigFilms applies the same deterministic votes order'
  );

  // ---------------------------------------------------------------------------
  // (e) The v > 0 Bayesian formula is unchanged.
  // ---------------------------------------------------------------------------
  const oldFormula = (film: FilmItem, meanScore: number, m = 3): number => {
    const v = film.totalVotes || 0;
    const R = normalizeFilmScore(film);
    if (v + m <= 0) return 0;
    return (v / (v + m)) * R + (m / (v + m)) * meanScore;
  };

  const votedCases = [
    createFilm({ id: 't', title: 'Tango', skorSotoy: 8.4, totalVotes: 1 }),
    createFilm({ id: 'u', title: 'Uniform', skorSotoy: 3.2, totalVotes: 12 }),
    createFilm({ id: 'v', title: 'Victor', skorSotoy: 7, totalVotes: 250 }),
    createFilm({ id: 'w', title: 'Whiskey', skorSotoy: 9.1, scoreScale: 10, totalVotes: 40 }),
  ];
  const votedMean = 6.25;
  votedCases.forEach(film => {
    assertClose(
      computeBayesianScore(film, votedMean),
      oldFormula(film, votedMean),
      `(e) formula unchanged for ${film.title} (${film.totalVotes} votes)`
    );
  });

  // A positive score never collapses to 0 even with a zero prior mean.
  assert(
    computeBayesianScore(
      createFilm({ id: 'x', title: 'Xray', skorSotoy: 7.7, totalVotes: 2 }),
      0
    ) > 0,
    '(e) positive score stays positive with a zero mean'
  );

  console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) {
    process.exit(1);
  }
};

runTests();
