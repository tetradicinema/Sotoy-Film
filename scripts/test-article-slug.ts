import { findSlugConflict, makeUniqueSlug } from '../src/utils/articleSlug';

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
  console.log('Running Article Slug Tests...\n');

  const articles = [
    { id: 'art-1', slug: 'dune-part-two', title: 'Dune Part Two', status: 'published' },
    { id: 'art-2', slug: 'Dune-Part-Two', title: 'Dune Part Two Draft', status: 'draft' },
    { id: 'art-3', slug: 'old-news', title: 'Old News', status: 'trash' },
  ];

  // findSlugConflict
  assertEquals(
    findSlugConflict('free-slug', articles),
    undefined,
    'free slug has no conflict'
  );
  assertEquals(
    findSlugConflict('dune-part-two', articles)?.id,
    'art-1',
    'exact conflict is found'
  );
  assertEquals(
    findSlugConflict('DUNE-PART-TWO', articles)?.id,
    'art-1',
    'conflict is case-insensitive'
  );
  assertEquals(
    findSlugConflict('dune-part-two', articles, 'art-1')?.id,
    'art-2',
    'excludeId ignores own article and finds the next conflict'
  );
  assertEquals(
    findSlugConflict('old-news', articles),
    undefined,
    'trash articles are ignored'
  );
  assertEquals(
    findSlugConflict('', articles),
    undefined,
    'empty slug has no conflict'
  );

  // makeUniqueSlug
  assertEquals(
    makeUniqueSlug('free-slug', articles),
    'free-slug',
    'makeUniqueSlug returns base slug when free'
  );

  const suffixTwoOnly = [
    { id: 'art-1', slug: 'dune-part-two', title: 'Dune Part Two', status: 'published' },
  ];
  assertEquals(
    makeUniqueSlug('dune-part-two', suffixTwoOnly),
    'dune-part-two-2',
    'makeUniqueSlug produces -2 when free'
  );

  const suffixThree = [
    { id: 'art-1', slug: 'dune-part-two', title: 'Dune Part Two', status: 'published' },
    { id: 'art-2', slug: 'dune-part-two-2', title: 'Dune Part Two Again', status: 'published' },
  ];
  assertEquals(
    makeUniqueSlug('dune-part-two', suffixThree),
    'dune-part-two-3',
    'makeUniqueSlug produces -3 when -2 is taken'
  );
  assertEquals(
    makeUniqueSlug('old-news', articles),
    'old-news',
    'trash slug does not force a suffix'
  );

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
};

runTests();
