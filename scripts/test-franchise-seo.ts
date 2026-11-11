/**
 * Unit tests for the edge franchise SEO helpers.
 *
 * Covers:
 * 1. parseFranchiseRouteId (must stay identical to
 *    src/utils/franchiseHelpers.ts parseFranchiseRouteParam).
 * 2. buildFranchiseCanonicalUrl (must match buildFranchisePath output).
 * 3. buildFranchiseSitemapEntries (min 2 catalog films, cap, sort, slug).
 * 4. HTML escaping in buildFranchiseBodyHtml.
 *
 * TMDB fetching itself is covered by scripts/test-middleware.ts with a mocked
 * fetch; this file never needs an API key.
 *
 * Usage:
 *   npx tsx scripts/test-franchise-seo.ts
 */

import {
  buildFranchisePath,
  parseFranchiseRouteParam,
} from '../src/utils/franchiseHelpers';
import {
  buildFranchiseBodyHtml,
  buildFranchiseCanonicalUrl,
  buildFranchiseSitemapEntries,
  FRANCHISE_SITEMAP_LIMIT,
  parseFranchiseRouteId,
} from '../src/lib/edge/franchiseMeta';

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
    `${message}${same ? '' : ` (expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)})`}`
  );
};

const SITE_BASE_URL = 'https://www.sotoyfilm.my.id';

// --- parseFranchiseRouteId mirrors parseFranchiseRouteParam exactly ---
console.log('parseFranchiseRouteId:');
{
  const cases: Array<[string, any]> = [
    ['119-the-lord-of-the-rings', 119],
    ['119', 119],
    ['  42  ', 42],
    ['12abc', 12],
    ['abc', null],
    ['', null],
    ['0-x', null],
    ['-5', null],
    ['999999999999999999999', null],
    ['119-the%20lord', 119],
  ];
  for (const [input, expected] of cases) {
    assertEquals(parseFranchiseRouteId(input), expected, `parseFranchiseRouteId('${input}')`);
    assertEquals(
      parseFranchiseRouteParam(input),
      expected,
      `parseFranchiseRouteParam('${input}') agrees`
    );
  }
  // Malformed escapes: both must keep the raw value and parse the same way.
  const malformed = '11%9zz';
  assertEquals(
    parseFranchiseRouteId(malformed),
    parseFranchiseRouteParam(malformed),
    'malformed escape handling matches franchiseHelpers'
  );
}

// --- buildFranchiseCanonicalUrl equals buildFranchisePath with the site base ---
console.log('\nbuildFranchiseCanonicalUrl:');
{
  const names = [
    'The Lord of the Rings Collection',
    '',
    '   ',
    'José Antonio García',
    'Harry Potter & the Philosopher Stone!',
    '  Trimmed  Name  ',
  ];
  const ids = [119, 5, 7, 10];

  for (const id of ids) {
    for (const name of names) {
      const expectedPath = buildFranchisePath(id, name);
      assertEquals(
        buildFranchiseCanonicalUrl(id, name),
        `${SITE_BASE_URL}${expectedPath}`,
        `canonical for ${id} + '${name}' matches buildFranchisePath`
      );
      // The edge path inside the sitemap entries must use the same slug.
      const sitemapEntry = buildFranchiseSitemapEntries(
        [
          { collectionId: id, collectionName: name },
          { collectionId: id, collectionName: name },
        ],
        { minFilms: 2 }
      );
      assertEquals(
        sitemapEntry[0]?.path,
        expectedPath,
        `sitemap path for ${id} + '${name}' matches buildFranchisePath`
      );
    }
  }

  assertEquals(
    buildFranchiseCanonicalUrl(0, 'Zero'),
    `${SITE_BASE_URL}/franchise`,
    'zero id falls back to /franchise'
  );
  assertEquals(
    buildFranchiseCanonicalUrl(-3, 'Negative'),
    `${SITE_BASE_URL}/franchise`,
    'negative id falls back to /franchise'
  );
  assertEquals(
    buildFranchiseCanonicalUrl(NaN, 'NaN'),
    `${SITE_BASE_URL}/franchise`,
    'NaN id falls back to /franchise'
  );
}

// --- Sitemap grouping ---
console.log('\nbuildFranchiseSitemapEntries:');
{
  assertEquals(
    buildFranchiseSitemapEntries([]),
    [],
    'empty film list yields no entries'
  );

  assertEquals(
    buildFranchiseSitemapEntries(undefined as any),
    [],
    'undefined film list never throws and yields no entries'
  );

  assertEquals(
    buildFranchiseSitemapEntries(null as any),
    [],
    'null film list never throws and yields no entries'
  );

  // A single catalog film is a thin page and must stay out of the sitemap.
  assertEquals(
    buildFranchiseSitemapEntries([
      { collectionId: 119, collectionName: 'The Lord of the Rings Collection' },
    ]),
    [],
    'a franchise with 1 catalog film is excluded'
  );

  // Two catalog films qualify; the name comes from collectionName.
  assertEquals(
    buildFranchiseSitemapEntries([
      { collectionId: 119, collectionName: 'The Lord of the Rings Collection' },
      { collectionId: 119, collectionName: 'Ignored Later Name' },
    ]),
    [
      {
        id: 119,
        name: 'The Lord of the Rings Collection',
        filmCount: 2,
        path: '/franchise/119-the-lord-of-the-rings-collection',
      },
    ],
    'two catalog films qualify and the first name wins'
  );

  // Films without a numeric collectionId are skipped.
  assertEquals(
    buildFranchiseSitemapEntries([
      { collectionId: 0, collectionName: 'Zero' },
      { collectionId: -5, collectionName: 'Negative' },
      { collectionId: 'abc', collectionName: 'Not Numeric' },
      { collectionId: NaN, collectionName: 'NaN' },
      { collectionName: 'Missing Id' },
      null,
      'a string',
    ]),
    [],
    'films without a valid numeric collectionId are skipped'
  );

  // Numeric strings still count (Firestore REST parses integers to numbers,
  // but the helper accepts both shapes).
  assertEquals(
    buildFranchiseSitemapEntries([
      { collectionId: '119', collectionName: 'Collection A' },
      { collectionId: '119', collectionName: 'Collection A' },
    ])[0]?.id,
    119,
    'numeric string collectionIds still group'
  );

  // Sorting: film count desc, then name asc; cap applies after sorting.
  const manyFilms: any[] = [];
  // ids 1..FRANCHISE_SITEMAP_LIMIT + 5, each with a distinct film count:
  // id 1 gets 3 films, ids 2..N get 2 films, so after the cap the tail drops.
  const totalFranchises = FRANCHISE_SITEMAP_LIMIT + 5;
  for (let id = 1; id <= totalFranchises; id++) {
    const count = id === 1 ? 3 : 2;
    for (let i = 0; i < count; i++) {
      manyFilms.push({ collectionId: id, collectionName: `Collection ${String(id).padStart(4, '0')}` });
    }
  }
  const capped = buildFranchiseSitemapEntries(manyFilms);
  assertEquals(
    capped.length,
    FRANCHISE_SITEMAP_LIMIT,
    'entries are capped at FRANCHISE_SITEMAP_LIMIT'
  );
  assertEquals(
    capped[0],
    {
      id: 1,
      name: 'Collection 0001',
      filmCount: 3,
      path: '/franchise/1-collection-0001',
    },
    'the franchise with the most catalog films comes first'
  );
  assertEquals(
    capped[1]?.id,
    2,
    'ties are ordered by name ascending'
  );
  assertEquals(
    capped.every((entry, index) =>
      index === 0 || entry.filmCount === 2
    ),
    true,
    'the cap keeps the highest-count franchises'
  );
  assertEquals(
    capped.slice(1).every(
      (entry, index, list) =>
        index === 0 ||
        list[index - 1].name.localeCompare(entry.name) <= 0
    ),
    true,
    'equal-count entries are sorted by name ascending'
  );

  // Slug must match the edge canonical exactly.
  assertEquals(
    buildFranchiseCanonicalUrl(capped[0].id, capped[0].name),
    `${SITE_BASE_URL}${capped[0].path}`,
    'sitemap slug equals the edge canonical slug'
  );

  // Empty slug names fall back to the bare-id path (the raw collectionName
  // is kept as the display name, exactly like the edge canonical).
  const barePathEntries = buildFranchiseSitemapEntries([
    { collectionId: 42, collectionName: '   ' },
    { collectionId: 42, collectionName: '!!!' },
  ]);
  assertEquals(
    barePathEntries[0]?.path,
    '/franchise/42',
    'an un-sluggable name falls back to the bare-id path'
  );
  assertEquals(
    buildFranchiseCanonicalUrl(barePathEntries[0].id, barePathEntries[0].name),
    `${SITE_BASE_URL}${barePathEntries[0].path}`,
    'the bare-id sitemap path still matches the edge canonical'
  );
}

// --- buildFranchiseBodyHtml escaping ---
console.log('\nbuildFranchiseBodyHtml:');
{
  const html = buildFranchiseBodyHtml({
    id: 31337,
    name: '</script><b>Franchise</b>',
    parts: [
      { tmdbId: 1, title: 'Title <script>alert(1)</script>', releaseDate: '2020-01-01' },
      { tmdbId: 2, title: 'Safe Title', releaseDate: '' },
    ],
  });

  assert(
    html.startsWith('<article><h1>') && html.endsWith('</article>'),
    'body is wrapped in <article> with an h1'
  );
  assert(
    html.includes('<h1>&lt;/script&gt;&lt;b&gt;Franchise&lt;/b&gt;</h1>'),
    'the h1 escapes the franchise name'
  );
  assert(
    html.includes('<ol>') && html.includes('<li>') && html.includes('</ol>'),
    'parts render inside an ordered list'
  );
  assert(
    html.includes('<li>Title &lt;script&gt;alert(1)&lt;/script&gt; (2020)</li>'),
    'part titles are escaped and the year is appended'
  );
  assert(
    html.includes('<li>Safe Title</li>'),
    'undated parts render without a year'
  );
  assert(!html.includes('<script>'), 'no raw <script> tag reaches the body');
  assert(!html.includes('<a '), 'the body has no links to non-existent pages');

  assertEquals(
    buildFranchiseBodyHtml(null as any),
    '',
    'null franchise renders an empty body'
  );
  assertEquals(
    buildFranchiseBodyHtml({ id: 1, name: 'X', parts: [] }),
    '',
    'zero parts render an empty body'
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
