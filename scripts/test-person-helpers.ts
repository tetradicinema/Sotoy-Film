import {
  buildPersonPath,
  calcAge,
  getDepartments,
  groupCreditsByYear,
  parsePersonRouteParam,
  pickKnownFor,
  socialLinks,
} from '../src/utils/personHelpers';
import type { TmdbPersonCredit } from '../src/utils/tmdbPersonTrim';

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

const credit = (overrides: Partial<TmdbPersonCredit> = {}): TmdbPersonCredit => ({
  id: 100,
  media_type: 'movie',
  title: 'A Film',
  character: 'Hero',
  job: '',
  department: '',
  release_date: '2020-01-01',
  poster_path: '/poster.jpg',
  vote_average: 7.5,
  vote_count: 250,
  episode_count: 0,
  popularity: 4.5,
  ...overrides,
});

const titles = (items: TmdbPersonCredit[]) => items.map(item => item.title);
const years = (sections: ReturnType<typeof groupCreditsByYear>) =>
  sections.map(section => section.year);

// --- parsePersonRouteParam ---
console.log('parsePersonRouteParam:');
assertEquals(parsePersonRouteParam('287-brad-pitt'), 287, '1. parses id from id-slug');
assertEquals(parsePersonRouteParam('287'), 287, '2. parses a bare numeric id');
assertEquals(parsePersonRouteParam('  42  '), 42, '3. trims surrounding whitespace');
assertEquals(parsePersonRouteParam('12abc'), 12, '4. keeps leading digits only');
assertEquals(parsePersonRouteParam('abc'), null, '5. rejects a slug with no leading id');
assertEquals(parsePersonRouteParam(''), null, '6. rejects an empty string');
assertEquals(parsePersonRouteParam(undefined), null, '7. rejects undefined');
assertEquals(parsePersonRouteParam(null), null, '8. rejects null');
assertEquals(parsePersonRouteParam('0'), null, '9. rejects zero');
assertEquals(parsePersonRouteParam('-5'), null, '10. rejects negative values');
assertEquals(parsePersonRouteParam('999999999999999999999'), null, '11. rejects unsafe integers');

// --- buildPersonPath ---
console.log('\nbuildPersonPath:');
assertEquals(
  buildPersonPath(287, 'Brad Pitt'),
  '/person/287-brad-pitt',
  '12. builds id + slug path'
);
assertEquals(buildPersonPath(5, ''), '/person/5', '13. omits the slug when the name is empty');
assertEquals(buildPersonPath(5), '/person/5', '14. omits the slug when the name is missing');
assertEquals(
  buildPersonPath(7, 'José Antonio García'),
  '/person/7-jose-antonio-garcia',
  '15. strips diacritics from the slug'
);
assertEquals(buildPersonPath(0, 'Nobody'), '/person', '16. rejects an invalid id');
assertEquals(
  buildPersonPath(287, '  Brad   Pitt  '),
  '/person/287-brad-pitt',
  '17. normalizes repeated spaces'
);

// --- calcAge ---
console.log('\ncalcAge:');
const now = new Date('2026-11-09T12:00:00Z');
assertEquals(calcAge('1980-05-05', '', now), 46, '18. computes age at now');
assertEquals(calcAge('1980-12-31', '', now), 45, '19. subtracts one before the birthday');
assertEquals(
  calcAge('1980-05-05', '2010-05-04', now),
  29,
  '20. computes age at death when a deathday exists'
);
assertEquals(
  calcAge('1980-05-05', '2010-05-05', now),
  30,
  '21. counts the birthday on the death day'
);
assertEquals(calcAge('2000-02-29', '', new Date('2021-02-28T00:00:00Z')), 20, '22. handles leap-day birthdays');
assertEquals(calcAge('', '', now), null, '23. returns null for a missing birthday');
assertEquals(calcAge('not-a-date', '', now), null, '24. returns null for an invalid birthday');
assertEquals(calcAge('2030-01-01', '', now), null, '25. returns null for a future birthday');
assertEquals(
  calcAge('2000-01-01', '1990-01-01', now),
  null,
  '26. returns null when the deathday precedes the birthday'
);
assertEquals(calcAge('1980-05-05', null, now), 46, '27. accepts a null deathday');

// --- pickKnownFor ---
console.log('\npickKnownFor:');
const pickCast = credit({ id: 1, title: 'Low Popular Cast', popularity: 1 });
const pickCastHigh = credit({ id: 2, title: 'High Popular Cast', popularity: 99, vote_count: 10 });
const pickCrewHigh = credit({
  id: 3,
  title: 'High Popular Crew',
  media_type: 'tv',
  popularity: 500,
  job: 'Director',
  department: 'Directing',
  character: '',
});
const pickShared = credit({ id: 4, title: 'Shared Cast', popularity: 50 });
const pickSharedCrew = credit({
  id: 4,
  title: 'Shared Crew',
  media_type: 'movie',
  popularity: 70,
  job: 'Writer',
  department: 'Writing',
  character: '',
});

const actingPick = pickKnownFor(
  { cast: [pickCast, pickCastHigh, pickShared], crew: [pickCrewHigh, pickSharedCrew] },
  'Acting'
);
assertEquals(
  titles(actingPick),
  ['Shared Cast', 'Low Popular Cast', 'High Popular Cast', 'High Popular Crew'],
  '28. Acting prefers cast, sorts by vote count then popularity, then fills from crew'
);

const directingPick = pickKnownFor(
  { cast: [pickCastHigh], crew: [pickCrewHigh, pickSharedCrew] },
  'Directing'
);
assertEquals(
  titles(directingPick),
  ['High Popular Crew', 'Shared Crew', 'High Popular Cast'],
  '29. non-Acting prefers crew, then fills from cast'
);

assertEquals(
  pickKnownFor(
    { cast: [pickCast, pickCastHigh], crew: [] },
    'Acting',
    1
  ).map(item => item.id),
  [1],
  '30. respects the max limit'
);
assertEquals(pickKnownFor({ cast: [], crew: [] }, 'Acting'), [], '31. returns [] for empty credits');
assertEquals(pickKnownFor(null, 'Acting'), [], '32. is safe for null credits');
assertEquals(pickKnownFor({ cast: [pickCast] }, 'Acting', 0), [], '33. returns [] for max=0');

const dedupePick = pickKnownFor(
  {
    cast: [credit({ id: 9, title: 'Duplicate Cast', popularity: 90 })],
    crew: [credit({ id: 9, title: 'Duplicate Crew', popularity: 100, job: 'Writer', department: 'Writing' })],
  },
  'Acting',
  8
);
assertEquals(titles(dedupePick), ['Duplicate Cast'], '34. dedupes by media_type:id');

const selfPick = pickKnownFor(
  {
    cast: [
      credit({ id: 50, title: 'Talk Show', media_type: 'tv', character: 'Self', popularity: 200, vote_count: 900 }),
      credit({ id: 51, title: 'Real Movie', character: 'Detective', popularity: 5, vote_count: 3000 }),
      credit({ id: 52, title: 'Old Clip', character: 'Himself (archive footage)', popularity: 300, vote_count: 10 }),
    ],
    crew: [],
  },
  'Acting',
  2
);
assertEquals(titles(selfPick), ['Real Movie', 'Talk Show'], '34b. real roles first, Self/archive only fill leftover slots');

// --- groupCreditsByYear ---
console.log('\ngroupCreditsByYear:');
const cast2020 = credit({ id: 20, title: 'Cast 2020', release_date: '2020-03-01', popularity: 5 });
const cast2022 = credit({ id: 21, title: 'Cast 2022', release_date: '2022-06-10', popularity: 10 });
const castUndated = credit({ id: 22, title: 'Cast Undated', release_date: '', popularity: 1 });
const tv2021 = credit({
  id: 23,
  title: 'TV 2021',
  media_type: 'tv',
  release_date: '2021-09-09',
  character: 'Detective',
  episode_count: 12,
  popularity: 8,
});
const crew2020 = credit({
  id: 24,
  title: 'Crew 2020',
  release_date: '2020-01-01',
  job: 'Director',
  department: 'Directing',
  character: '',
  popularity: 7,
});

const castSections = groupCreditsByYear(
  { cast: [cast2020, cast2022, castUndated, tv2021], crew: [crew2020] },
  { department: 'Acting' }
);
assertEquals(years(castSections), [null, 2022, 2021, 2020], '35. undated first, then newest year first');
assertEquals(titles(castSections[0].items), ['Cast Undated'], '36. groups undated credits separately');
assertEquals(titles(castSections[1].items), ['Cast 2022'], '37. groups by release year');
assertEquals(
  castSections[2].items[0].episode_count,
  12,
  '38. keeps episode_count on the credit'
);

const tvOnly = groupCreditsByYear(
  { cast: [cast2020, tv2021], crew: [] },
  { department: 'Acting', mediaType: 'tv' }
);
assertEquals(years(tvOnly), [2021], '39. filters by media type');
assertEquals(titles(tvOnly[0].items), ['TV 2021'], '40. keeps only tv credits');

const allTypes = groupCreditsByYear(
  { cast: [cast2020, tv2021], crew: [] },
  { department: 'Acting', mediaType: 'all' }
);
assertEquals(years(allTypes), [2021, 2020], '41. treats mediaType=all as no filter');

const directingSections = groupCreditsByYear(
  { cast: [cast2020], crew: [crew2020] },
  { department: 'Directing' }
);
assertEquals(
  titles(directingSections[0].items),
  ['Crew 2020'],
  '42. filters crew credits by department'
);

const noDepartment = groupCreditsByYear({ cast: [cast2020, tv2021], crew: [crew2020] });
assertEquals(
  noDepartment.reduce((total, section) => total + section.items.length, 0),
  3,
  '43. includes cast and crew when no department is selected'
);

const sortWithinYear = groupCreditsByYear(
  {
    cast: [
      credit({ id: 30, title: 'Lower', release_date: '2020-01-01', popularity: 1, vote_count: 10 }),
      credit({ id: 31, title: 'Higher', release_date: '2020-01-01', popularity: 9, vote_count: 5 }),
      credit({ id: 32, title: 'Tie Winner', release_date: '2020-01-01', popularity: 9, vote_count: 100 }),
    ],
    crew: [],
  },
  { department: 'Acting' }
);
assertEquals(
  titles(sortWithinYear[0].items),
  ['Tie Winner', 'Higher', 'Lower'],
  '44. sorts items by popularity then vote_count'
);

const arrayInput = groupCreditsByYear(
  [credit({ id: 40, title: 'Array Acting', department: '', character: 'Lead' }), crew2020],
  { department: 'Acting' }
);
assertEquals(titles(arrayInput[0].items), ['Array Acting'], '45. supports a flat credit array');
assertEquals(groupCreditsByYear(null).length, 0, '46. is safe for null credits');
assertEquals(groupCreditsByYear(undefined).length, 0, '47. is safe for undefined credits');

// --- getDepartments ---
console.log('\ngetDepartments:');
const departments = getDepartments({
  cast: [cast2020, cast2022],
  crew: [
    crew2020,
    credit({ id: 50, department: 'Writing', job: 'Writer' }),
    credit({ id: 51, department: '', job: 'Producer' }),
  ],
});
assertEquals(
  JSON.stringify(departments),
  JSON.stringify([
    { department: 'Acting', count: 2 },
    { department: 'Crew', count: 1 },
    { department: 'Directing', count: 1 },
    { department: 'Writing', count: 1 },
  ]),
  '48. counts departments with Acting first'
);
assertEquals(getDepartments(null), [], '49. is safe for null credits');
assertEquals(getDepartments({ cast: [], crew: [] }), [], '50. returns [] for empty credits');

// --- socialLinks ---
console.log('\nsocialLinks:');
const links = socialLinks(
  {
    imdb_id: 'nm0000093',
    instagram_id: 'bradpitt',
    twitter_id: 'bradpitt',
    facebook_id: 'bradpitt',
    tiktok_id: '@bradpitt',
    youtube_id: 'UC1234567890123456789012',
  },
  'https://www.bradpitt.com',
  'nm0000093'
);
assertEquals(
  links.map(link => link.key),
  ['instagram', 'x', 'facebook', 'tiktok', 'youtube', 'imdb', 'website'],
  '51. returns links in stable order'
);
assertEquals(links[0].url, 'https://www.instagram.com/bradpitt', '52. builds Instagram URL');
assertEquals(links[1].url, 'https://x.com/bradpitt', '53. builds X URL');
assertEquals(links[2].url, 'https://www.facebook.com/bradpitt', '54. builds Facebook URL');
assertEquals(links[3].url, 'https://www.tiktok.com/@bradpitt', '55. strips a leading @ from TikTok');
assertEquals(
  links[4].url,
  'https://www.youtube.com/channel/UC1234567890123456789012',
  '56. detects a YouTube channel id'
);
assertEquals(links[5].url, 'https://www.imdb.com/name/nm0000093', '57. builds IMDb URL');
assertEquals(links[6].url, 'https://www.bradpitt.com/', '58. normalizes the website URL');

const youtubeHandle = socialLinks({ youtube_id: '@SotoyFilm' });
assertEquals(
  youtubeHandle[0].url,
  'https://www.youtube.com/@SotoyFilm',
  '59. builds a YouTube handle URL'
);

const imdbFallback = socialLinks({} , '', 'nm1234567');
assertEquals(imdbFallback[0].key, 'imdb', '60. falls back to the top-level imdb_id');

const noLinks = socialLinks(null, null, null);
assertEquals(noLinks, [], '61. returns [] when there are no links');

const unsafeWebsite = socialLinks(null, 'javascript:alert(1)', '');
assertEquals(unsafeWebsite, [], '62. drops non-http(s) website URLs');

const bareWebsite = socialLinks(null, 'example.com/profile', null);
assertEquals(
  bareWebsite[0].url,
  'https://example.com/profile',
  '63. adds https:// to a bare website host'
);

const deduped = socialLinks(
  { imdb_id: 'nm111', instagram_id: 'same' },
  'https://www.instagram.com/same',
  'nm111'
);
assertEquals(
  deduped.map(link => link.key),
  ['instagram', 'imdb'],
  '64. dedupes identical URLs'
);

console.log(`\nSummary: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
