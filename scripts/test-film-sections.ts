import {
  resolveFilmDbSection,
  resolveStreamingForPlatform,
  buildFilmDbSections,
  getStreamingPlatforms,
} from '../src/utils/filmSections';
import { HOMEPAGE_SECTIONS_META, resolveFilmDbSectionOrder } from '../src/utils/homepageConfigHelper';
import { FilmItem, SectionConfig, HomepageSectionKey, HomepageSectionsConfig } from '../src/types';

// Fixed now for deterministic tests
const FIXED_NOW = new Date('2026-10-19T12:00:00Z');
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Helper to create dates
const daysAgo = (days: number): string => {
  const d = new Date(FIXED_NOW.getTime() - days * MS_PER_DAY);
  return d.toISOString();
};

const daysFromNow = (days: number): string => {
  const d = new Date(FIXED_NOW.getTime() + days * MS_PER_DAY);
  return d.toISOString();
};

const today = FIXED_NOW.toISOString();
const tomorrow = daysFromNow(1);
const exactly56DaysAgo = daysAgo(56);
const exactly55DaysAgo = daysAgo(55);
const exactly57DaysAgo = daysAgo(57);

// Helper to create film
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

// Helper to create a batch of streaming films per platform
const createPlatformFilms = (entries: Array<[string, number]>): FilmItem[] =>
  entries.flatMap(([platform, count], groupIndex) =>
    Array.from({ length: count }, (_, i) =>
      createFilm({
        id: `platform-${groupIndex}-${i}`,
        whereToWatch: [{ type: 'stream', platform }],
      })
    )
  );

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

// Test cases
const runTests = () => {
  console.log('Running Film Sections Tests...\n');

  // 1. fd_on_theatres - boundary: exactly 56 days ago (should be included, >= past56DaysMs)
  {
    const film = createFilm({
      id: 'theatre-56ago',
      whereToWatch: [{ type: 'cinema', platform: 'Cinema XXI' }],
      idReleaseDate: exactly56DaysAgo,
    });
    const result = resolveFilmDbSection('fd_on_theatres', [film], undefined, { now: FIXED_NOW });
    assert(result.length === 1, 'fd_on_theatres includes film released exactly 56 days ago');
  }

  // 2. fd_on_theatres - boundary: today (should be included, <= now)
  {
    const film = createFilm({
      id: 'theatre-today',
      whereToWatch: [{ type: 'cinema' }],
      idReleaseDate: today,
    });
    const result = resolveFilmDbSection('fd_on_theatres', [film], undefined, { now: FIXED_NOW });
    assert(result.length === 1, 'fd_on_theatres includes film released today');
  }

  // 3. fd_on_theatres - boundary: 57 days ago (should be excluded, < past56DaysMs)
  {
    const film = createFilm({
      id: 'theatre-57ago',
      whereToWatch: [{ type: 'cinema' }],
      idReleaseDate: exactly57DaysAgo,
    });
    const result = resolveFilmDbSection('fd_on_theatres', [film], undefined, { now: FIXED_NOW });
    assert(result.length === 0, 'fd_on_theatres excludes film released 57 days ago');
  }

  // 4. fd_on_theatres - boundary: tomorrow (should be excluded, > now)
  {
    const film = createFilm({
      id: 'theatre-tomorrow',
      whereToWatch: [{ type: 'cinema' }],
      idReleaseDate: tomorrow,
    });
    const result = resolveFilmDbSection('fd_on_theatres', [film], undefined, { now: FIXED_NOW });
    assert(result.length === 0, 'fd_on_theatres excludes film released tomorrow');
  }

  // 5. idReleaseDate preferred over releaseDate
  {
    const film = createFilm({
      id: 'pref-1',
      whereToWatch: [{ type: 'cinema' }],
      idReleaseDate: exactly55DaysAgo,
      releaseDate: exactly57DaysAgo, // older - should not be used
    });
    const result = resolveFilmDbSection('fd_on_theatres', [film], undefined, { now: FIXED_NOW });
    assert(result.length === 1, 'idReleaseDate is preferred over releaseDate');
  }

  // 6. fallback to releaseDate if idReleaseDate missing
  {
    const film = createFilm({
      id: 'pref-2',
      whereToWatch: [{ type: 'cinema' }],
      releaseDate: exactly55DaysAgo,
    });
    const result = resolveFilmDbSection('fd_on_theatres', [film], undefined, { now: FIXED_NOW });
    assert(result.length === 1, 'releaseDate used when idReleaseDate missing');
  }

  // 7. missing dates excluded
  {
    const filmNoDate = createFilm({
      id: 'no-date-1',
      whereToWatch: [{ type: 'cinema' }],
    });
    const result = resolveFilmDbSection('fd_on_theatres', [filmNoDate], undefined, { now: FIXED_NOW });
    assert(result.length === 0, 'films with missing dates are excluded from fd_on_theatres');
  }

  // 8. fd_coming_soon - boundary: tomorrow should be included (> now)
  {
    const film = createFilm({
      id: 'soon-tomorrow',
      idReleaseDate: tomorrow,
    });
    const result = resolveFilmDbSection('fd_coming_soon', [film], undefined, { now: FIXED_NOW });
    assert(result.length === 1, 'fd_coming_soon includes films with release > now');
  }

  // 9. fd_coming_soon - boundary: today should be excluded (not > now)
  {
    const film = createFilm({
      id: 'soon-today',
      idReleaseDate: today,
    });
    const result = resolveFilmDbSection('fd_coming_soon', [film], undefined, { now: FIXED_NOW });
    assert(result.length === 0, 'fd_coming_soon excludes films released today (needs > now)');
  }

  // 10. manual order with missing id
  {
    const f1 = createFilm({ id: 'keep-1', title: 'Keep 1' });
    const f2 = createFilm({ id: 'keep-2', title: 'Keep 2' });
    const result = resolveFilmDbSection('fd_streaming', [f1, f2], {
      sourceType: 'manual',
      itemIds: ['keep-1', 'missing-id', 'keep-2'],
      limit: 12,
    } as SectionConfig, { now: FIXED_NOW });
    assertEquals(result.map(r => r.id), ['keep-1', 'keep-2'], 'manual mode skips missing IDs');
  }

  // 11. enabled false returns empty
  {
    const film = createFilm({ id: 'disabled-1' });
    const result = resolveFilmDbSection('fd_streaming', [film], {
      enabled: false,
    } as SectionConfig, { now: FIXED_NOW });
    assert(result.length === 0, 'enabled false returns empty list');
  }

  // 12. limit is respected
  {
    const films = Array.from({ length: 20 }, (_, i) => createFilm({
      id: `limit-${i}`,
      whereToWatch: [{ type: 'stream', platform: 'Netflix' }],
    }));
    const result = resolveFilmDbSection('fd_streaming', films, {
      limit: 5,
    } as SectionConfig, { now: FIXED_NOW });
    assertEquals(result.length, 5, 'limit parameter is respected');
  }

  // 13. category filter - movie
  {
    const movie = createFilm({ id: 'cat-m', type: 'movie', whereToWatch: [{ type: 'stream', platform: 'Netflix' }] });
    const series = createFilm({ id: 'cat-s', type: 'series', whereToWatch: [{ type: 'stream', platform: 'Netflix' }] });
    const result = resolveFilmDbSection('fd_streaming', [movie, series], {
      category: 'movie',
    } as SectionConfig, { now: FIXED_NOW });
    assertEquals(result.map(r => r.id), ['cat-m'], 'category filter works for movies');
  }

  // 14. category filter - animation
  {
    const anim = createFilm({ id: 'cat-a', type: 'animation' });
    const anim2 = createFilm({ id: 'cat-a2', type: 'anime' });
    const other = createFilm({ id: 'cat-o', type: 'movie' });
    const result = resolveFilmDbSection('fd_animation', [anim, anim2, other], undefined, { now: FIXED_NOW });
    assertEquals(result.length, 2, 'fd_animation includes animation and anime types');
  }

  // 15. genre filter
  {
    const f1 = createFilm({ id: 'g1', genres: ['Action', 'Thriller'] });
    const f2 = createFilm({ id: 'g2', genres: ['Comedy'] });
    const result = resolveFilmDbSection('fd_streaming', [f1, f2], {
      genre: 'Action', // note: our filter checks genres/subCategory/tag - genre not a direct field, uses subCategory/tag
    } as any, { now: FIXED_NOW });
    // Actually we filter by subCategory or tag or category; genre filtering via subCategory? Let us test properly
  }

  // 15b. subCategory filter (checks genres/tags/type)
  {
    const f1 = createFilm({ id: 'sc1', genres: ['Horror'], whereToWatch: [{ type: 'stream', platform: 'Netflix' }] });
    const f2 = createFilm({ id: 'sc2', genres: ['Comedy'], whereToWatch: [{ type: 'stream', platform: 'Netflix' }] });
    const result = resolveFilmDbSection('fd_streaming', [f1, f2], {
      subCategory: 'Horror',
    } as SectionConfig, { now: FIXED_NOW });
    assertEquals(result.map(r => r.id), ['sc1'], 'subCategory filter works');
  }

  // 16. tag filter
  {
    const f1 = createFilm({ id: 't1', tags: ['rekomendasi'], whereToWatch: [{ type: 'stream', platform: 'Netflix' }] });
    const f2 = createFilm({ id: 't2', tags: ['review'], whereToWatch: [{ type: 'stream', platform: 'Netflix' }] });
    const result = resolveFilmDbSection('fd_streaming', [f1, f2], {
      tag: 'rekomendasi',
    } as SectionConfig, { now: FIXED_NOW });
    assertEquals(result.map(r => r.id), ['t1'], 'tag filter works');
  }

  // 17. platform filter for fd_streaming
  {
    const f1 = createFilm({
      id: 'p1',
      whereToWatch: [{ type: 'stream', platform: 'Netflix' }],
    });
    const f2 = createFilm({
      id: 'p2',
      whereToWatch: [{ type: 'stream', platform: 'Disney+ Hotstar' }],
    });
    const result = resolveFilmDbSection('fd_streaming', [f1, f2], {
      platform: 'netflix',
    } as SectionConfig, { now: FIXED_NOW });
    assertEquals(result.map(r => r.id), ['p1'], 'platform filter works for fd_streaming');
  }

  // 18. Bayesian ranking: 9.5 with 1 vote vs 8.8 with 40 votes
  // mean score across both: (9.5*10/10? scores are normalized; both use scale 10)
  const fLowVotesHigh = createFilm({
    id: 'bayes-low',
    skorSotoy: 9.5,
    scoreScale: 10,
    totalVotes: 1,
  });
  const fHighVotesMed = createFilm({
    id: 'bayes-high',
    skorSotoy: 8.8,
    scoreScale: 10,
    totalVotes: 40,
  });
  {
    const result = resolveFilmDbSection('fd_fans_favourite', [fLowVotesHigh, fHighVotesMed], {
      minVotes: 0, // allow even low votes for test
    } as SectionConfig, { now: FIXED_NOW });
    // mean = (9.5 + 8.8)/2 = 9.15, m=3
    // low: v=1, R=9.5, bayes = (1/4)*9.5 + (3/4)*9.15 = 2.375 + 6.8625 = 9.2375
    // high: v=40, R=8.8, bayes = (40/43)*8.8 + (3/43)*9.15 ~ 8.186 + 0.637 = 8.823
    // So high votes med (bayes ~8.82) ranks below low votes high (9.24)? Wait - lower Bayesian pulls up? 
    // Wait: (v/(v+m))*R + (m/(v+m))*C. With more votes, weighted toward R. C=mean=9.15. 
    // High votes: R=8.8 < mean, so Bayesian pulls toward 9.15? 8.82 is below mean. Low votes: R=9.5 > mean, pulled down to 9.24. So 9.24 > 8.82, so low votes high ranks HIGHER? That depends. But let us check.
    // The requirement states: "Bayesian ranking (9.5 with 1 vote ranks below 8.8 with 40 votes)"
    // So 9.5/1 should come AFTER 8.8/40 in descending order? Meaning 8.8/40 has higher Bayesian score.
    // That happens if 8.8 is high relative to mean? Let us compute with just these two: mean is (9.5+8.8)/2=9.15
    // 8.8 with 40 votes: (40/(43))*8.8 + (3/43)*9.15 = (0.9302)*8.8 + (0.0698)*9.15 ~ 8.186 + 0.638 ~ 8.824
    // 9.5 with 1 vote: (1/4)*9.5 + (3/4)*9.15 = 2.375 + 6.8625 = 9.2375
    // So 9.2375 > 8.824, meaning 9.5/1 ranks ABOVE (first) 8.8/40. But requirement says ranks BELOW. 
    // That means the expected order is [highVotesMed, lowVotesHigh] (highVotesMed first = higher score).
    // So for descending Bayesian score, if requirement says "9.5 with 1 vote ranks below 8.8 with 40 votes", 
    // then Bayesian(8.8,40) > Bayesian(9.5,1). That would be true if mean is very low? Let us recompute - maybe mean across dataset affects? 
    // But in our implementation, meanScore is computed across all films in dataset. In this isolated case with just 2 films, mean is 9.15 as above.
    // But the requirement as stated - maybe I need to set up the data so that mean makes it true? Or maybe the values are different?
    // Let us look up: "Bayesian ranking (9.5 with 1 vote ranks below 8.8 with 40 votes)". 
    // Typical example: with small m, many votes pull toward true rating. If community mean is lower, 8.8 with 40 votes might be higher than 9.5 with 1 vote? 
    // Let us create more films to get a lower mean. For example add films with low scores.
    const low1 = createFilm({ id: 'low1', skorSotoy: 5, totalVotes: 10 });
    const low2 = createFilm({ id: 'low2', skorSotoy: 6, totalVotes: 10 });
    const result2 = resolveFilmDbSection('fd_fans_favourite', [fLowVotesHigh, fHighVotesMed, low1, low2], {
      minVotes: 0,
    } as SectionConfig, { now: FIXED_NOW });
    // mean = (9.5 + 8.8 + 5 + 6)/4 = 7.325
    // highVotesMed (8.8,40): (40/43)*8.8 + (3/43)*7.325 = 8.186 + 0.5105 = 8.6965
    // lowVotesHigh (9.5,1): (1/4)*9.5 + (3/4)*7.325 = 2.375 + 5.49375 = 7.86875
    // Now 8.6965 > 7.86875, so highVotesMed ranks before lowVotesHigh. Correct - matches requirement.
    assert(result2[0].id === 'bayes-high' && result2[1].id === 'bayes-low', 'Bayesian ranking: 8.8 with 40 votes ranks above 9.5 with 1 vote');
  }

  // 19. minVotes - default behavior (fd_fans_favourite default is 3)
  {
    const v2 = createFilm({ id: 'v2', totalVotes: 2, skorSotoy: 9 });
    const v3 = createFilm({ id: 'v3', totalVotes: 3, skorSotoy: 9 });
    const v5 = createFilm({ id: 'v5', totalVotes: 5, skorSotoy: 8 });
    const result = resolveFilmDbSection('fd_fans_favourite', [v2, v3, v5], undefined, { now: FIXED_NOW });
    assertEquals(result.map(r => r.id).sort(), ['v3', 'v5'].sort(), 'minVotes defaults to 3 for fd_fans_favourite');
  }

  // 20. minVotes with explicit number
  {
    const v1 = createFilm({ id: 'mv1', totalVotes: 1 });
    const v10 = createFilm({ id: 'mv10', totalVotes: 10 });
    const result = resolveFilmDbSection('fd_fans_favourite', [v1, v10], {
      minVotes: 5,
    } as SectionConfig, { now: FIXED_NOW });
    assertEquals(result.map(r => r.id), ['mv10'], 'minVotes with explicit number filters correctly');
  }

  // 21. minVotes with empty string '' falls back to 3
  {
    const v2 = createFilm({ id: 'mv2', totalVotes: 2 });
    const v3 = createFilm({ id: 'mv3', totalVotes: 3 });
    const result = resolveFilmDbSection('fd_fans_favourite', [v2, v3], {
      minVotes: '' as any,
    } as SectionConfig, { now: FIXED_NOW });
    assertEquals(result.map(r => r.id), ['mv3'], "minVotes with '' falls back to 3");
  }

  // 22. sortBy '' keeps default order for fd section
  {
    const fNew = createFilm({ id: 's-new', idReleaseDate: daysAgo(1), whereToWatch: [{ type: 'stream', platform: 'Netflix' }] });
    const fOld = createFilm({ id: 's-old', idReleaseDate: daysAgo(10), whereToWatch: [{ type: 'stream', platform: 'Netflix' }] });
    const fOlder = createFilm({ id: 's-older', idReleaseDate: daysAgo(20), whereToWatch: [{ type: 'stream', platform: 'Netflix' }] });
    // fd_streaming defaults to newest release first
    const result = resolveFilmDbSection('fd_streaming', [fOld, fNew, fOlder], {
      sortBy: '' as any,
    } as SectionConfig, { now: FIXED_NOW });
    assertEquals(result.map(r => r.id), ['s-new', 's-old', 's-older'], "sortBy '' keeps default order (newest first for fd_streaming)");
  }

  // 23. sortBy 'newest' explicit
  {
    const fNew = createFilm({ id: 'sn-new', idReleaseDate: daysAgo(1), whereToWatch: [{ type: 'stream', platform: 'Netflix' }] });
    const fOld = createFilm({ id: 'sn-old', idReleaseDate: daysAgo(10), whereToWatch: [{ type: 'stream', platform: 'Netflix' }] });
    const result = resolveFilmDbSection('fd_streaming', [fOld, fNew], {
      sortBy: 'newest',
    } as SectionConfig, { now: FIXED_NOW });
    assertEquals(result.map(r => r.id), ['sn-new', 'sn-old'], 'sortBy newest works');
  }

  // 24. sortBy 'rating'
  {
    const low = createFilm({ id: 'sr-low', skorSotoy: 5, whereToWatch: [{ type: 'stream', platform: 'Netflix' }] });
    const high = createFilm({ id: 'sr-high', skorSotoy: 9, whereToWatch: [{ type: 'stream', platform: 'Netflix' }] });
    const result = resolveFilmDbSection('fd_streaming', [low, high], {
      sortBy: 'rating',
    } as SectionConfig, { now: FIXED_NOW });
    assertEquals(result.map(r => r.id), ['sr-high', 'sr-low'], 'sortBy rating sorts descending');
  }

  // 25. sortBy 'votes'
  {
    const v1 = createFilm({ id: 'sv1', totalVotes: 5, whereToWatch: [{ type: 'stream', platform: 'Netflix' }] });
    const v2 = createFilm({ id: 'sv2', totalVotes: 100, whereToWatch: [{ type: 'stream', platform: 'Netflix' }] });
    const result = resolveFilmDbSection('fd_streaming', [v1, v2], {
      sortBy: 'votes',
    } as SectionConfig, { now: FIXED_NOW });
    assertEquals(result.map(r => r.id), ['sv2', 'sv1'], 'sortBy votes sorts by totalVotes desc');
  }

  // 26. sortBy 'release_soonest' for fd_streaming
  {
    const soon = createFilm({ id: 'rs-soon', idReleaseDate: daysFromNow(1), whereToWatch: [{ type: 'stream', platform: 'Netflix' }] });
    const later = createFilm({ id: 'rs-later', idReleaseDate: daysFromNow(10), whereToWatch: [{ type: 'stream', platform: 'Netflix' }] });
    const result = resolveFilmDbSection('fd_streaming', [later, soon], {
      sortBy: 'release_soonest',
    } as SectionConfig, { now: FIXED_NOW });
    assertEquals(result.map(r => r.id), ['rs-soon', 'rs-later'], 'sortBy release_soonest sorts by date asc');
  }

  // 27. platform normalization - Prime Video variants
  {
    const f1 = createFilm({
      id: 'pn1',
      whereToWatch: [{ type: 'stream', platform: 'prime video' }],
    });
    const f2 = createFilm({
      id: 'pn2',
      whereToWatch: [{ type: 'stream', platform: 'Amazon Prime' }],
    });
    const result = resolveFilmDbSection('fd_streaming', [f1, f2], {
      platform: 'Prime Video',
    } as SectionConfig, { now: FIXED_NOW });
    assert(result.length === 2, 'platform normalization matches prime video variants');
  }

  // 28. platform normalization - Disney+
  {
    const f1 = createFilm({
      id: 'pd1',
      whereToWatch: [{ type: 'stream', platform: 'Disney+' }],
    });
    const f2 = createFilm({
      id: 'pd2',
      whereToWatch: [{ type: 'stream', platform: 'Hotstar' }],
    });
    const result = resolveFilmDbSection('fd_streaming', [f1, f2], {
      platform: 'disney+ hotstar',
    } as SectionConfig, { now: FIXED_NOW });
    assert(result.length === 2, 'platform normalization matches Disney+/Hotstar variants');
  }

  // 29. fd_coming_soon default sort - soonest first
  {
    const far = createFilm({ id: 'cs-far', idReleaseDate: daysFromNow(30) });
    const near = createFilm({ id: 'cs-near', idReleaseDate: daysFromNow(5) });
    const result = resolveFilmDbSection('fd_coming_soon', [far, near], undefined, { now: FIXED_NOW });
    assertEquals(result.map(r => r.id), ['cs-near', 'cs-far'], 'fd_coming_soon defaults to soonest release first');
  }

  // 30. order merge scenario - manual mode with multiple items, some might be filtered by limit
  {
    const films = Array.from({ length: 10 }, (_, i) => createFilm({ id: `merge-${i}` }));
    const result = resolveFilmDbSection('fd_streaming', films, {
      sourceType: 'manual',
      itemIds: ['merge-9', 'merge-0', 'merge-5', 'merge-2'], // specific order
      limit: 3,
    } as SectionConfig, { now: FIXED_NOW });
    assertEquals(result.map(r => r.id), ['merge-9', 'merge-0', 'merge-5'], 'manual mode respects order and limit');
  }

  // 31. Additional: fd_animation default uses Bayesian
  {
    const a1 = createFilm({ id: 'anim1', type: 'animation', skorSotoy: 9, totalVotes: 1 });
    const a2 = createFilm({ id: 'anim2', type: 'anime', skorSotoy: 8.5, totalVotes: 50 });
    const others = [
      createFilm({ id: 'o1', skorSotoy: 5, totalVotes: 10 }),
      createFilm({ id: 'o2', skorSotoy: 6, totalVotes: 10 }),
    ];
    const result = resolveFilmDbSection('fd_animation', [a1, a2, ...others], undefined, { now: FIXED_NOW });
    // mean across all 4 = (9+8.5+5+6)/4 = 7.125
    // a2: (50/53)*8.5 + (3/53)*7.125 = 8.0189 + 0.4033 = 8.4222
    // a1: (1/4)*9 + (3/4)*7.125 = 2.25 + 5.34375 = 7.59375
    assert(result[0].id === 'anim2' && result[1].id === 'anim1', 'fd_animation defaults to Bayesian ranking');
  }

  // ---------------------------------------------------------------------------
  // buildFilmDbSections - configurable Film Database section system
  // ---------------------------------------------------------------------------

  // Shared fixture that satisfies all five default Film Database sections
  const sectionFilms: FilmItem[] = [
    createFilm({
      id: 'cfg-cinema',
      whereToWatch: [{ type: 'cinema', platform: 'Cinema XXI' }],
      idReleaseDate: daysAgo(5),
    }),
    createFilm({
      id: 'cfg-stream',
      whereToWatch: [{ type: 'stream', platform: 'Netflix' }],
    }),
    createFilm({
      id: 'cfg-soon',
      idReleaseDate: daysFromNow(10),
    }),
    createFilm({
      id: 'cfg-anim',
      type: 'animation',
      whereToWatch: [{ type: 'stream', platform: 'Netflix' }],
    }),
    createFilm({
      id: 'cfg-fan',
      totalVotes: 10,
      skorSotoy: 8,
      scoreScale: 10,
    }),
  ];

  // 32. order follows saved filmDbSectionOrder
  {
    const order: HomepageSectionKey[] = [
      'fd_animation',
      'fd_on_theatres',
      'fd_streaming',
      'fd_coming_soon',
      'fd_fans_favourite',
    ];
    const config: HomepageSectionsConfig = { filmDbSectionOrder: order };
    const result = buildFilmDbSections(sectionFilms, config, { now: FIXED_NOW });
    assertEquals(
      result.map(s => s.key),
      [...order, 'fd_hidden_gems'],
      'buildFilmDbSections follows saved filmDbSectionOrder'
    );
  }

  // 33. missing key is appended
  {
    const config: HomepageSectionsConfig = {
      filmDbSectionOrder: ['fd_coming_soon'],
    };
    const result = buildFilmDbSections(sectionFilms, config, { now: FIXED_NOW });
    assertEquals(
      result.map(s => s.key),
      ['fd_coming_soon', 'fd_on_theatres', 'fd_streaming', 'fd_animation', 'fd_fans_favourite', 'fd_hidden_gems'],
      'buildFilmDbSections appends missing keys in default order'
    );
  }

  // 34. disabled section is skipped
  {
    const config: HomepageSectionsConfig = {
      sections: {
        fd_animation: { sourceType: 'auto', enabled: false },
      },
    };
    const result = buildFilmDbSections(sectionFilms, config, { now: FIXED_NOW });
    assert(
      !result.some(s => s.key === 'fd_animation'),
      'buildFilmDbSections skips a disabled section'
    );
    assertEquals(
      result.map(s => s.key),
      ['fd_on_theatres', 'fd_streaming', 'fd_coming_soon', 'fd_fans_favourite', 'fd_hidden_gems'],
      'disabled section does not disturb the remaining order'
    );
  }

  // 35. empty section is skipped
  {
    const onlyStreaming = [
      createFilm({
        id: 'only-stream',
        whereToWatch: [{ type: 'stream', platform: 'Netflix' }],
      }),
    ];
    const result = buildFilmDbSections(onlyStreaming, undefined, { now: FIXED_NOW });
    assertEquals(
      result.map(s => s.key),
      ['fd_streaming'],
      'buildFilmDbSections skips sections that resolve to zero films'
    );
  }

  // 36. custom title overrides default
  {
    const config: HomepageSectionsConfig = {
      sections: {
        fd_streaming: { sourceType: 'auto', title: '  Custom Stream  ' },
      },
    };
    const result = buildFilmDbSections(sectionFilms, config, { now: FIXED_NOW });
    const streaming = result.find(s => s.key === 'fd_streaming');
    assertEquals(streaming?.title, 'Custom Stream', 'custom title overrides the default title');
  }

  // 37. fd_streaming returns platforms
  {
    const films = [
      createFilm({ id: 'plat-netflix', whereToWatch: [{ type: 'stream', platform: 'Netflix' }] }),
      createFilm({ id: 'plat-prime', whereToWatch: [{ type: 'stream', platform: 'Amazon Prime' }] }),
      createFilm({ id: 'plat-disney', whereToWatch: [{ type: 'stream', platform: 'Disney+' }] }),
    ];
    const result = buildFilmDbSections(films, undefined, { now: FIXED_NOW });
    const streaming = result.find(s => s.key === 'fd_streaming');
    assertEquals(streaming?.platforms?.length, 3, 'fd_streaming section exposes streaming platforms');
    assertEquals(
      streaming?.platforms?.map(p => p.name).sort(),
      ['Disney+ Hotstar', 'Netflix', 'Prime Video'],
      'fd_streaming platforms are normalized'
    );
  }

  // 38. fd_streaming platforms is empty when config.platform is set
  {
    const films = [
      createFilm({ id: 'fixed-netflix', whereToWatch: [{ type: 'stream', platform: 'Netflix' }] }),
      createFilm({ id: 'fixed-prime', whereToWatch: [{ type: 'stream', platform: 'Prime Video' }] }),
    ];
    const config: HomepageSectionsConfig = {
      sections: {
        fd_streaming: { sourceType: 'auto', platform: 'Netflix' },
      },
    };
    const result = buildFilmDbSections(films, config, { now: FIXED_NOW });
    const streaming = result.find(s => s.key === 'fd_streaming');
    assert(Array.isArray(streaming?.platforms), 'fd_streaming still returns a platforms array');
    assertEquals(streaming?.platforms?.length, 0, 'fd_streaming platforms is empty when a platform is fixed');
    assertEquals(streaming?.activePlatform, 'Netflix', 'fd_streaming reports the fixed active platform');
  }

  // 39. resolveStreamingForPlatform applies the platform before the limit
  {
    const netflixFilms = Array.from({ length: 5 }, (_, i) =>
      createFilm({
        id: `chip-netflix-${i}`,
        whereToWatch: [{ type: 'stream', platform: 'Netflix' }],
      })
    );
    const primeFilms = Array.from({ length: 3 }, (_, i) =>
      createFilm({
        id: `chip-prime-${i}`,
        whereToWatch: [{ type: 'stream', platform: 'Prime Video' }],
      })
    );
    const config: SectionConfig = { sourceType: 'auto', limit: 2 };
    const result = resolveStreamingForPlatform(
      [...primeFilms, ...netflixFilms],
      config,
      'Netflix',
      { now: FIXED_NOW }
    );
    assertEquals(result.length, 2, 'resolveStreamingForPlatform applies the limit after the platform filter');
    assert(
      result.every(f => f.whereToWatch.some(w => w.platform === 'Netflix')),
      'resolveStreamingForPlatform returns only the selected platform'
    );
  }

  // 40. manual section keeps saved order
  {
    const films = [
      createFilm({ id: 'manual-a' }),
      createFilm({ id: 'manual-b' }),
      createFilm({ id: 'manual-c' }),
    ];
    const config: HomepageSectionsConfig = {
      filmDbSectionOrder: ['fd_streaming'],
      sections: {
        fd_streaming: {
          sourceType: 'manual',
          itemIds: ['manual-c', 'manual-a', 'manual-b'],
          limit: 3,
        },
      },
    };
    const result = buildFilmDbSections(films, config, { now: FIXED_NOW });
    assertEquals(
      result[0]?.films.map(f => f.id),
      ['manual-c', 'manual-a', 'manual-b'],
      'manual section keeps the saved item order'
    );
  }

  // ---------------------------------------------------------------------------
  // getStreamingPlatforms - count ordering, tie-breaks, singleton filtering
  // ---------------------------------------------------------------------------

  // 41. sorted by count descending (not by major-platform order)
  {
    const films = createPlatformFilms([
      ['Netflix', 2],
      ['MUBI', 4],
      ['Prime Video', 3],
      ['Vidio', 2],
    ]);
    const result = getStreamingPlatforms(films);
    assertEquals(
      result.map(p => p.name),
      ['MUBI', 'Prime Video', 'Netflix', 'Vidio'],
      'getStreamingPlatforms sorts by count descending'
    );
  }

  // 42. count ties follow the major-platform order, then alphabetically
  {
    const films = createPlatformFilms([
      ['Disney+ Hotstar', 2],
      ['Netflix', 2],
      ['Zeta', 2],
      ['Alpha', 2],
      ['Max', 2],
    ]);
    const result = getStreamingPlatforms(films);
    assertEquals(
      result.map(p => p.name),
      ['Netflix', 'Disney+ Hotstar', 'Max', 'Alpha', 'Zeta'],
      'getStreamingPlatforms breaks count ties by major order then alphabetically'
    );
  }

  // 43. single-film platforms are hidden when at least 4 platforms remain
  {
    const films = createPlatformFilms([
      ['Netflix', 3],
      ['Prime Video', 2],
      ['Disney+ Hotstar', 2],
      ['Max', 2],
      ['Viu', 1],
      ['Criterion', 1],
    ]);
    const result = getStreamingPlatforms(films);
    assertEquals(
      result.map(p => p.name),
      ['Netflix', 'Prime Video', 'Disney+ Hotstar', 'Max'],
      'getStreamingPlatforms hides single-film platforms when 4 or more remain'
    );
  }

  // 44. single-film platforms are kept when fewer than 4 platforms would remain
  {
    const films = createPlatformFilms([
      ['Netflix', 3],
      ['Prime Video', 2],
      ['MUBI', 1],
      ['Criterion', 1],
    ]);
    const result = getStreamingPlatforms(films);
    assertEquals(
      result.map(p => p.name),
      ['Netflix', 'Prime Video', 'Criterion', 'MUBI'],
      'getStreamingPlatforms keeps single-film platforms when fewer than 4 would remain'
    );
    assertEquals(result.length, 4, 'getStreamingPlatforms keeps singletons to reach four platforms');
  }

  // 45. max 8 platforms, still ordered by the major-platform tie-break
  {
    const films = createPlatformFilms([
      ['WeTV', 2],
      ['iQIYI', 2],
      ['Netflix', 2],
      ['Bioskop Online', 2],
      ['Prime Video', 2],
      ['Crunchyroll', 2],
      ['Disney+ Hotstar', 2],
      ['Max', 2],
      ['Apple TV+', 2],
      ['Vidio', 2],
      ['Viu', 2],
    ]);
    const result = getStreamingPlatforms(films);
    assertEquals(result.length, 8, 'getStreamingPlatforms returns at most 8 platforms');
    assertEquals(
      result.map(p => p.name),
      [
        'Netflix',
        'Prime Video',
        'Disney+ Hotstar',
        'Max',
        'Apple TV+',
        'Vidio',
        'Viu',
        'WeTV',
      ],
      'getStreamingPlatforms caps the list after tie-break ordering'
    );
  }

  // 46. normalization: MAX Stream / HBO Max variants collapse to Max
  {
    const films = createPlatformFilms([
      ['MAX Stream', 2],
      ['HBO Max', 1],
    ]);
    const result = getStreamingPlatforms(films);
    assertEquals(
      result,
      [{ name: 'Max', count: 3 }],
      'getStreamingPlatforms normalizes MAX Stream and HBO Max to Max'
    );
  }

  // 47. normalization: Netflix Kids and ad tiers collapse to Netflix
  {
    const films = createPlatformFilms([
      ['Netflix Kids', 2],
      ['Netflix basic with Ads', 1],
    ]);
    const result = getStreamingPlatforms(films);
    assertEquals(
      result,
      [{ name: 'Netflix', count: 3 }],
      'getStreamingPlatforms normalizes Netflix variants to Netflix'
    );
  }

  // 48. normalization: Crunchyroll
  {
    const films = createPlatformFilms([['Crunchyroll', 3]]);
    const result = getStreamingPlatforms(films);
    assertEquals(
      result,
      [{ name: 'Crunchyroll', count: 3 }],
      'getStreamingPlatforms normalizes Crunchyroll'
    );
  }

  // 49. normalization: Catchplay variants collapse to Catchplay
  {
    const films = createPlatformFilms([
      ['Catchplay', 2],
      ['Catchplay+', 1],
    ]);
    const result = getStreamingPlatforms(films);
    assertEquals(
      result,
      [{ name: 'Catchplay', count: 3 }],
      'getStreamingPlatforms normalizes Catchplay variants to Catchplay'
    );
  }

  // 46. fd_on_theatres default title
  {
    const meta = HOMEPAGE_SECTIONS_META.find(item => item.key === 'fd_on_theatres');
    assertEquals(meta?.label, 'On Theatres Now', 'fd_on_theatres label uses the new default title');
    assertEquals(
      meta?.defaultTitle,
      'On Theatres Now',
      'fd_on_theatres defaultTitle uses the new default title'
    );
  }

  // 47. Film Database sections expose the default description
  {
    const result = buildFilmDbSections(sectionFilms, undefined, { now: FIXED_NOW });
    const streaming = result.find(s => s.key === 'fd_streaming');
    assertEquals(
      streaming?.description,
      'Film dan series yang bisa ditonton sekarang di Netflix, Prime Video, dan platform streaming lainnya.',
      'buildFilmDbSections returns the default description'
    );
  }

  // 48. custom description overrides the default (trimmed)
  {
    const config: HomepageSectionsConfig = {
      sections: {
        fd_streaming: { sourceType: 'auto', description: '  Deskripsi pilihan editor  ' },
      },
    };
    const result = buildFilmDbSections(sectionFilms, config, { now: FIXED_NOW });
    const streaming = result.find(s => s.key === 'fd_streaming');
    assertEquals(
      streaming?.description,
      'Deskripsi pilihan editor',
      'buildFilmDbSections returns the trimmed config description override'
    );
  }

  // 49. blank description falls back to the default
  {
    const config: HomepageSectionsConfig = {
      sections: {
        fd_streaming: { sourceType: 'auto', description: '   ' },
      },
    };
    const result = buildFilmDbSections(sectionFilms, config, { now: FIXED_NOW });
    const streaming = result.find(s => s.key === 'fd_streaming');
    assertEquals(
      streaming?.description,
      'Film dan series yang bisa ditonton sekarang di Netflix, Prime Video, dan platform streaming lainnya.',
      'buildFilmDbSections falls back to the default when the description override is blank'
    );
  }

  // ---------------------------------------------------------------------------
  // Pilihan Redaksi (fd_editors_pick) and Hidden Gems (fd_hidden_gems)
  // ---------------------------------------------------------------------------

  const pickFilms = [
    createFilm({ id: 'ep-a', skorSotoy: 9, totalVotes: 10 }),
    createFilm({ id: 'ep-b', skorSotoy: 8, totalVotes: 5 }),
    createFilm({ id: 'ep-c', skorSotoy: 7, totalVotes: 2 }),
  ];

  // 50. editors pick auto with no filters stays hidden
  {
    const result = resolveFilmDbSection('fd_editors_pick', pickFilms, {
      sourceType: 'auto',
    } as SectionConfig, { now: FIXED_NOW });
    assertEquals(result.map(f => f.id), [], 'fd_editors_pick auto without filters returns no films');
  }

  // 51. editors pick manual keeps order and skips missing ids
  {
    const result = resolveFilmDbSection('fd_editors_pick', pickFilms, {
      sourceType: 'manual',
      itemIds: ['ep-c', 'missing-id', 'ep-a'],
    } as SectionConfig, { now: FIXED_NOW });
    assertEquals(result.map(f => f.id), ['ep-c', 'ep-a'], 'fd_editors_pick manual keeps order and skips missing ids');
  }

  // 52. editors pick manual respects limit
  {
    const result = resolveFilmDbSection('fd_editors_pick', pickFilms, {
      sourceType: 'manual',
      itemIds: ['ep-a', 'ep-b', 'ep-c'],
      limit: 2,
    } as SectionConfig, { now: FIXED_NOW });
    assertEquals(result.map(f => f.id), ['ep-a', 'ep-b'], 'fd_editors_pick manual respects limit');
  }

  // 53. editors pick auto with a tag filter
  {
    const films = [
      createFilm({ id: 'ep-tag-high', skorSotoy: 9, totalVotes: 5, tags: ['redaksi'] }),
      createFilm({ id: 'ep-tag-low', skorSotoy: 7, totalVotes: 5, tags: ['redaksi'] }),
      createFilm({ id: 'ep-tag-other', skorSotoy: 9.5, totalVotes: 5, tags: ['lain'] }),
    ];
    const result = resolveFilmDbSection('fd_editors_pick', films, {
      sourceType: 'auto',
      tag: 'redaksi',
    } as SectionConfig, { now: FIXED_NOW });
    assertEquals(
      result.map(f => f.id).sort(),
      ['ep-tag-high', 'ep-tag-low'],
      'fd_editors_pick auto with a tag filter returns matching films'
    );
  }

  // 54. editors pick disabled
  {
    const result = resolveFilmDbSection('fd_editors_pick', pickFilms, {
      sourceType: 'manual',
      itemIds: ['ep-a'],
      enabled: false,
    } as SectionConfig, { now: FIXED_NOW });
    assertEquals(result.map(f => f.id), [], 'fd_editors_pick disabled returns no films');
  }

  // 55. hidden gems default thresholds include 8.5 with 5 votes
  {
    const result = resolveFilmDbSection('fd_hidden_gems', [
      createFilm({ id: 'hg-in', skorSotoy: 8.5, scoreScale: 10, totalVotes: 5 }),
    ], undefined, { now: FIXED_NOW });
    assertEquals(result.map(f => f.id), ['hg-in'], 'fd_hidden_gems default thresholds include score 8.5 with 5 votes');
  }

  // 56. hidden gems excludes score below 8
  {
    const result = resolveFilmDbSection('fd_hidden_gems', [
      createFilm({ id: 'hg-low-score', skorSotoy: 7.5, scoreScale: 10, totalVotes: 5 }),
    ], undefined, { now: FIXED_NOW });
    assertEquals(result.map(f => f.id), [], 'fd_hidden_gems excludes score 7.5');
  }

  // 57. hidden gems excludes zero votes
  {
    const result = resolveFilmDbSection('fd_hidden_gems', [
      createFilm({ id: 'hg-zero-votes', skorSotoy: 9, scoreScale: 10, totalVotes: 0 }),
    ], undefined, { now: FIXED_NOW });
    assertEquals(result.map(f => f.id), [], 'fd_hidden_gems excludes films with 0 votes');
  }

  // 58. hidden gems excludes more than 15 votes
  {
    const result = resolveFilmDbSection('fd_hidden_gems', [
      createFilm({ id: 'hg-many-votes', skorSotoy: 9, scoreScale: 10, totalVotes: 20 }),
    ], undefined, { now: FIXED_NOW });
    assertEquals(result.map(f => f.id), [], 'fd_hidden_gems excludes films with 20 votes');
  }

  // 59. hidden gems custom minScore and maxVotes
  {
    const films = [
      createFilm({ id: 'hg-custom-low', skorSotoy: 7.5, scoreScale: 10, totalVotes: 5 }),
      createFilm({ id: 'hg-custom-high', skorSotoy: 9, scoreScale: 10, totalVotes: 8 }),
      createFilm({ id: 'hg-custom-too-many', skorSotoy: 9, scoreScale: 10, totalVotes: 12 }),
    ];
    const result = resolveFilmDbSection('fd_hidden_gems', films, {
      minScore: 7,
      maxVotes: 10,
    } as SectionConfig, { now: FIXED_NOW });
    assertEquals(
      result.map(f => f.id),
      ['hg-custom-high', 'hg-custom-low'],
      'fd_hidden_gems respects custom minScore and maxVotes'
    );
  }

  // 60. hidden gems sorts by score desc, then fewer votes first
  {
    const films = [
      createFilm({ id: 'hg-sort-lower', skorSotoy: 8.5, scoreScale: 10, totalVotes: 1 }),
      createFilm({ id: 'hg-sort-many', skorSotoy: 9, scoreScale: 10, totalVotes: 8 }),
      createFilm({ id: 'hg-sort-few', skorSotoy: 9, scoreScale: 10, totalVotes: 3 }),
    ];
    const result = resolveFilmDbSection('fd_hidden_gems', films, undefined, { now: FIXED_NOW });
    assertEquals(
      result.map(f => f.id),
      ['hg-sort-few', 'hg-sort-many', 'hg-sort-lower'],
      'fd_hidden_gems sorts score desc with fewer votes first on ties'
    );
  }

  // 61. hidden gems normalizes scores using scoreScale
  {
    const films = [
      createFilm({ id: 'hg-scale-in', skorSotoy: 85, scoreScale: 100, totalVotes: 5 }),
      createFilm({ id: 'hg-scale-out', skorSotoy: 75, scoreScale: 100, totalVotes: 5 }),
    ];
    const result = resolveFilmDbSection('fd_hidden_gems', films, undefined, { now: FIXED_NOW });
    assertEquals(result.map(f => f.id), ['hg-scale-in'], 'fd_hidden_gems normalizes scores with a non-10 scoreScale');
  }

  // 62. hidden gems explicit sortBy newest overrides the default order
  {
    const films = [
      createFilm({ id: 'hg-newest-old', skorSotoy: 9.5, scoreScale: 10, totalVotes: 5, idReleaseDate: daysAgo(30) }),
      createFilm({ id: 'hg-newest-new', skorSotoy: 8.2, scoreScale: 10, totalVotes: 5, idReleaseDate: daysAgo(1) }),
    ];
    const result = resolveFilmDbSection('fd_hidden_gems', films, {
      sortBy: 'newest',
    } as SectionConfig, { now: FIXED_NOW });
    assertEquals(
      result.map(f => f.id),
      ['hg-newest-new', 'hg-newest-old'],
      'fd_hidden_gems sortBy newest overrides the default order'
    );
  }

  // 63. hidden gems category filter
  {
    const films = [
      createFilm({ id: 'hg-series', type: 'series', skorSotoy: 9, scoreScale: 10, totalVotes: 5 }),
      createFilm({ id: 'hg-movie', type: 'movie', skorSotoy: 9, scoreScale: 10, totalVotes: 5 }),
    ];
    const result = resolveFilmDbSection('fd_hidden_gems', films, {
      category: 'series',
    } as SectionConfig, { now: FIXED_NOW });
    assertEquals(result.map(f => f.id), ['hg-series'], 'fd_hidden_gems applies the category filter');
  }

  // 64. hidden gems default and explicit limit
  {
    const films = Array.from({ length: 15 }, (_, i) =>
      createFilm({ id: `hg-limit-${i}`, skorSotoy: 8 + (i % 5) * 0.1, scoreScale: 10, totalVotes: 5 })
    );
    const defaultResult = resolveFilmDbSection('fd_hidden_gems', films, undefined, { now: FIXED_NOW });
    assertEquals(defaultResult.length, 12, 'fd_hidden_gems defaults to a limit of 12');

    const limitedResult = resolveFilmDbSection('fd_hidden_gems', films, {
      limit: 5,
    } as SectionConfig, { now: FIXED_NOW });
    assertEquals(limitedResult.length, 5, 'fd_hidden_gems respects an explicit limit');
  }

  // 65. hidden gems never returns the same film twice
  {
    const films = [
      createFilm({ id: 'hg-dup', skorSotoy: 9, scoreScale: 10, totalVotes: 5 }),
      createFilm({ id: 'hg-dup', skorSotoy: 9, scoreScale: 10, totalVotes: 5 }),
    ];
    const result = resolveFilmDbSection('fd_hidden_gems', films, undefined, { now: FIXED_NOW });
    assertEquals(result.map(f => f.id), ['hg-dup'], 'fd_hidden_gems does not return duplicate films');
  }

  // 66. buildFilmDbSections omits both new sections when empty
  {
    const films = [
      createFilm({
        id: 'hg-empty-stream',
        skorSotoy: 0,
        scoreScale: 10,
        totalVotes: 0,
        whereToWatch: [{ type: 'stream', platform: 'Netflix' }],
      }),
    ];
    const result = buildFilmDbSections(films, undefined, { now: FIXED_NOW });
    assert(
      !result.some(s => s.key === 'fd_editors_pick' || s.key === 'fd_hidden_gems'),
      'buildFilmDbSections omits empty editors pick and hidden gems sections'
    );
  }

  // 67. buildFilmDbSections shows both new sections when they have films
  {
    const films = [
      createFilm({ id: 'hg-show-pick', skorSotoy: 0, scoreScale: 10, totalVotes: 0 }),
      createFilm({ id: 'hg-show-gem', skorSotoy: 9, scoreScale: 10, totalVotes: 2 }),
    ];
    const config: HomepageSectionsConfig = {
      sections: {
        fd_editors_pick: { sourceType: 'manual', itemIds: ['hg-show-pick'] },
        fd_hidden_gems: { sourceType: 'auto' },
      },
    };
    const result = buildFilmDbSections(films, config, { now: FIXED_NOW });
    assertEquals(
      result.map(s => s.key),
      ['fd_editors_pick', 'fd_hidden_gems'],
      'buildFilmDbSections shows both new sections when they resolve films'
    );
    assertEquals(
      result.find(s => s.key === 'fd_editors_pick')?.films.map(f => f.id),
      ['hg-show-pick'],
      'buildFilmDbSections resolves the manual editors pick list'
    );
    assertEquals(
      result.find(s => s.key === 'fd_hidden_gems')?.films.map(f => f.id),
      ['hg-show-gem'],
      'buildFilmDbSections resolves the hidden gems list'
    );
  }

  // 68. saved order without the new keys appends them at the end
  {
    const order = resolveFilmDbSectionOrder(['fd_streaming']);
    assertEquals(order[0], 'fd_streaming', 'resolveFilmDbSectionOrder keeps the saved first key');
    assertEquals(
      order.slice(-2),
      ['fd_editors_pick', 'fd_hidden_gems'],
      'resolveFilmDbSectionOrder appends the new keys at the end'
    );
  }

  // 69. new section metadata
  {
    const editorsMeta = HOMEPAGE_SECTIONS_META.find(m => m.key === 'fd_editors_pick');
    const gemsMeta = HOMEPAGE_SECTIONS_META.find(m => m.key === 'fd_hidden_gems');
    assertEquals(editorsMeta?.label, 'Pilihan Redaksi', 'fd_editors_pick uses the Pilihan Redaksi label');
    assertEquals(
      editorsMeta?.defaultRule,
      'Daftar manual dari admin. Kosong = seksi disembunyikan',
      'fd_editors_pick exposes its default rule'
    );
    assertEquals(gemsMeta?.label, 'Hidden Gems', 'fd_hidden_gems uses the Hidden Gems label');
    assertEquals(
      gemsMeta?.defaultDescription,
      'Film dan series berskor tinggi yang belum banyak dibicarakan.',
      'fd_hidden_gems exposes its default description'
    );
  }

  console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) {
    process.exit(1);
  }
};

runTests();
