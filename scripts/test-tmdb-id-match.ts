import {
  findDuplicateTmdbIds,
  pickTmdbMatch,
  TmdbCandidate,
  TmdbMatchFilm,
  validateTmdbOverrides,
} from './fill-tmdb-ids';

const createFilm = (overrides: Partial<TmdbMatchFilm> = {}): TmdbMatchFilm => ({
  title: 'Test Film',
  type: 'movie',
  year: 2024,
  ...overrides,
});

const createCandidate = (overrides: Partial<TmdbCandidate> = {}): TmdbCandidate => ({
  id: 1,
  title: 'Test Film',
  release_date: '2024-05-01',
  media_type: 'movie',
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
  assert(same, `${message} (expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)})`);
};

const runTests = () => {
  console.log('Running Fill TMDB IDs Tests...\n');

  // -------------------------------------------------------------------------
  // pickTmdbMatch
  // -------------------------------------------------------------------------

  // 1. exact title + same year
  const exact = pickTmdbMatch(createFilm(), [
    createCandidate({ id: 101, title: 'Test Film', release_date: '2024-07-12' }),
  ]);
  assertEquals(exact.status, 'confident', 'exact title and same year is confident');
  assertEquals(exact.best?.id, 101, 'exact match returns the expected candidate');

  // 2. year off by 1
  const yearOffByOne = pickTmdbMatch(createFilm({ year: 2024 }), [
    createCandidate({ id: 102, release_date: '2023-11-01' }),
  ]);
  assertEquals(yearOffByOne.status, 'confident', 'year off by 1 is still confident');
  assertEquals(yearOffByOne.best?.id, 102, 'year off by 1 returns the expected candidate');

  // 3. year off by 2
  const yearOffByTwo = pickTmdbMatch(createFilm({ year: 2024 }), [
    createCandidate({ id: 103, release_date: '2022-01-01' }),
  ]);
  assertEquals(yearOffByTwo.status, 'ambiguous', 'year off by 2 is ambiguous');
  assertEquals(yearOffByTwo.best, undefined, 'ambiguous match has no best candidate');

  // 4. accents and punctuation
  const accented = pickTmdbMatch(createFilm({ title: 'Amélie', year: 2001 }), [
    createCandidate({ id: 104, title: 'Amelie', release_date: '2001-04-25' }),
  ]);
  assertEquals(accented.status, 'confident', 'accents and punctuation are normalized');
  assertEquals(accented.best?.id, 104, 'accented match returns the expected candidate');

  // 5. originalTitle match
  const originalTitle = pickTmdbMatch(
    createFilm({ title: 'The Rainbow Troops', originalTitle: 'Laskar Pelangi', year: 2008 }),
    [createCandidate({ id: 105, title: 'Laskar Pelangi', release_date: '2008-09-25' })]
  );
  assertEquals(originalTitle.status, 'confident', 'film originalTitle can produce a confident match');
  assertEquals(originalTitle.best?.id, 105, 'originalTitle match returns the expected candidate');

  // 6. containment only
  const containment = pickTmdbMatch(createFilm({ title: 'Dune', year: 2021 }), [
    createCandidate({ id: 106, title: 'Dune: Part Two', release_date: '2024-02-27' }),
  ]);
  assertEquals(containment.status, 'ambiguous', 'containment-only match is ambiguous');
  assertEquals(containment.candidates[0]?.id, 106, 'containment-only candidate is kept for the report');

  // 7. same title, movie vs tv, film is movie
  const movieVsTv = pickTmdbMatch(createFilm({ title: 'Fargo', type: 'movie', year: 1996 }), [
    createCandidate({
      id: 107,
      title: 'Fargo',
      release_date: '1996-03-08',
      media_type: 'movie',
    }),
    createCandidate({
      id: 108,
      name: 'Fargo',
      release_date: undefined,
      first_air_date: '2014-04-15',
      media_type: 'tv',
    }),
  ]);
  assertEquals(movieVsTv.status, 'confident', 'matching media type resolves a movie/tv tie');
  assertEquals(movieVsTv.best?.id, 107, 'movie film chooses the movie candidate');

  // 8. unrelated results
  const unrelated = pickTmdbMatch(createFilm({ title: 'Dune' }), [
    createCandidate({ id: 109, title: 'Arrival', release_date: '2016-11-11' }),
  ]);
  assertEquals(unrelated.status, 'not_found', 'unrelated results are not found');
  assertEquals(unrelated.candidates, [], 'not_found returns no candidates');

  // 9. empty candidates
  const empty = pickTmdbMatch(createFilm(), []);
  assertEquals(empty.status, 'not_found', 'empty candidate list is not found');
  assertEquals(empty.candidates, [], 'empty candidate list returns no candidates');

  // 10. animation with a tv candidate
  const animationTv = pickTmdbMatch(createFilm({ title: 'Bluey', type: 'animation', year: 2018 }), [
    createCandidate({
      id: 110,
      name: 'Bluey',
      release_date: undefined,
      first_air_date: '2018-10-01',
      media_type: 'tv',
    }),
  ]);
  assertEquals(animationTv.status, 'confident', 'animation can match a tv candidate');
  assertEquals(animationTv.best?.id, 110, 'animation tv match returns the expected candidate');

  // 11. missing year on film
  const missingFilmYear = pickTmdbMatch(createFilm({ title: 'Test Film', year: undefined }), [
    createCandidate({ id: 111, release_date: '2024-05-01' }),
  ]);
  assertEquals(missingFilmYear.status, 'ambiguous', 'missing film year cannot be confident');
  assertEquals(missingFilmYear.best, undefined, 'missing film year has no best candidate');

  // 12. missing date on candidate
  const missingCandidateDate = pickTmdbMatch(createFilm(), [
    createCandidate({ id: 112, release_date: undefined, first_air_date: undefined }),
  ]);
  assertEquals(
    missingCandidateDate.status,
    'ambiguous',
    'candidate without a release/first-air date cannot be confident'
  );

  // 13. series film chooses the tv candidate
  const seriesTv = pickTmdbMatch(createFilm({ title: 'Dark', type: 'series', year: 2017 }), [
    createCandidate({ id: 113, title: 'Dark', release_date: '2017-01-01', media_type: 'movie' }),
    createCandidate({
      id: 114,
      name: 'Dark',
      release_date: undefined,
      first_air_date: '2017-12-01',
      media_type: 'tv',
    }),
  ]);
  assertEquals(seriesTv.status, 'confident', 'series film resolves a movie/tv tie');
  assertEquals(seriesTv.best?.id, 114, 'series film chooses the tv candidate');

  // 14. multiple qualified candidates stay ambiguous and are capped at 3
  const multiple = pickTmdbMatch(createFilm({ title: 'Twilight', type: 'movie', year: 2008 }), [
    createCandidate({ id: 115, title: 'Twilight', release_date: '2008-01-01' }),
    createCandidate({ id: 116, title: 'Twilight', release_date: '2008-02-01' }),
    createCandidate({ id: 117, title: 'Twilight', release_date: '2008-03-01' }),
    createCandidate({ id: 118, title: 'Twilight', release_date: '2008-04-01' }),
  ]);
  assertEquals(multiple.status, 'ambiguous', 'multiple qualified candidates are ambiguous');
  assertEquals(multiple.candidates.length, 3, 'ambiguous report keeps only the top 3 candidates');

  // 15. originalTitle must differ from the candidate title to be usable
  const wrongOriginalTitle = pickTmdbMatch(
    createFilm({ title: 'The Rainbow Troops', originalTitle: 'Laskar Pelangi', year: 2008 }),
    [createCandidate({ id: 119, title: 'The Rainbow Troops', release_date: '2010-01-01' })]
  );
  assertEquals(
    wrongOriginalTitle.status,
    'ambiguous',
    'exact title with a wrong year is ambiguous even when originalTitle is present'
  );

  // -------------------------------------------------------------------------
  // validateTmdbOverrides
  // -------------------------------------------------------------------------

  // 19. valid override
  const validOverride = validateTmdbOverrides(
    { 'film-valid': 4200 },
    new Map([['film-valid', { title: 'Valid Film' }]])
  );
  assertEquals(validOverride.valid.length, 1, 'valid override entry is accepted');
  assertEquals(validOverride.valid[0]?.filmId, 'film-valid', 'valid override keeps the film ID');
  assertEquals(validOverride.valid[0]?.tmdbId, 4200, 'valid override keeps the TMDB ID');
  assertEquals(validOverride.skipped.length, 0, 'valid override has no skipped entries');

  // 20. missing document
  const missingOverride = validateTmdbOverrides(
    { 'film-missing': 4300 },
    new Map([['film-valid', { title: 'Valid Film' }]])
  );
  assertEquals(
    missingOverride.valid.length,
    0,
    'override for a missing film document is not written'
  );
  assertEquals(
    missingOverride.skipped[0]?.reason,
    'missing_film',
    'missing film document is reported as missing_film'
  );

  // 21. film already has tmdbId
  const filledOverride = validateTmdbOverrides(
    { 'film-filled': 4400 },
    new Map([['film-filled', { title: 'Filled Film', tmdbId: 123 }]])
  );
  assertEquals(
    filledOverride.valid.length,
    0,
    'override for a film that already has a tmdbId is not written'
  );
  assertEquals(
    filledOverride.skipped[0]?.reason,
    'already_has_tmdb_id',
    'existing tmdbId is reported as already_has_tmdb_id'
  );

  // 22. invalid TMDB ID
  const invalidOverride = validateTmdbOverrides(
    { 'film-valid': 'not-a-number' },
    new Map([['film-valid', { title: 'Valid Film' }]])
  );
  assertEquals(
    invalidOverride.skipped[0]?.reason,
    'invalid_tmdb_id',
    'non-numeric override value is reported as invalid_tmdb_id'
  );

  // -------------------------------------------------------------------------
  // findDuplicateTmdbIds
  // -------------------------------------------------------------------------

  // 16. two films with the same TMDB ID are both marked
  const shared = findDuplicateTmdbIds([
    { filmId: 'film-a', filmTitle: 'A', tmdbId: 500 },
    { filmId: 'film-b', filmTitle: 'B', tmdbId: 500 },
    { filmId: 'film-c', filmTitle: 'C', tmdbId: 501 },
  ]);
  assertEquals(shared.has('film-a'), true, 'first film sharing a TMDB ID is a duplicate');
  assertEquals(shared.has('film-b'), true, 'second film sharing a TMDB ID is a duplicate');
  assertEquals(shared.has('film-c'), false, 'unique TMDB ID is not a duplicate');
  assertEquals(shared.get('film-a')?.filmIds, ['film-a', 'film-b'], 'duplicate info lists both films');

  // 17. a TMDB ID already used by another film is a duplicate
  const alreadyUsed = findDuplicateTmdbIds(
    [{ filmId: 'film-d', filmTitle: 'D', tmdbId: 600 }],
    new Map([[600, 'existing-film']])
  );
  assertEquals(alreadyUsed.has('film-d'), true, 'TMDB ID already used by another film is a duplicate');
  assertEquals(
    alreadyUsed.get('film-d')?.existingFilmIds,
    ['existing-film'],
    'duplicate info records the existing film'
  );

  // 18. no duplicates
  const unique = findDuplicateTmdbIds([
    { filmId: 'film-e', filmTitle: 'E', tmdbId: 700 },
    { filmId: 'film-f', filmTitle: 'F', tmdbId: 701 },
  ]);
  assertEquals(unique.size, 0, 'unique TMDB IDs produce no duplicates');

  console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) {
    process.exit(1);
  }
};

runTests();
