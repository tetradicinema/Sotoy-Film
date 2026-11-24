import {
  buildArticleBreadcrumbs,
  buildCategoryBreadcrumbs,
  buildFilmBreadcrumbs,
  buildFranchiseBreadcrumbs,
  getCategoryLabel,
  toSchemaItems,
  type BreadcrumbTrailItem,
} from '../src/utils/breadcrumbs';
import { generateBreadcrumbSchema } from '../src/utils/schemaHelpers';

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

const assertEquals = (actual: unknown, expected: unknown, message: string) => {
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  assert(
    same,
    `${message} (expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)})`
  );
};

const HOME: BreadcrumbTrailItem = { label: 'Home', path: '/' };

const runTests = () => {
  console.log('Running Breadcrumb Tests...\n');

  // ---- buildFilmBreadcrumbs ---------------------------------------------
  const filmWithSlug = { id: 'film-1', slug: 'dune-part-two', title: 'Dune Part Two' };
  assertEquals(
    buildFilmBreadcrumbs(filmWithSlug),
    [
      HOME,
      { label: 'Film Database', path: '/film-database' },
      { label: 'Dune Part Two', path: '/film/dune-part-two' },
    ],
    'film with slug: Home > Film Database > title'
  );

  const filmNoSlug = { id: 'film-2', title: 'Dune: Part Two' };
  assertEquals(
    buildFilmBreadcrumbs(filmNoSlug),
    [
      HOME,
      { label: 'Film Database', path: '/film-database' },
      { label: 'Dune: Part Two', path: '/film/dune-part-two' },
    ],
    'film without slug falls back to slugify(title)'
  );

  const filmIdOnly = { id: 'film-77', title: '' };
  assertEquals(
    buildFilmBreadcrumbs(filmIdOnly),
    [
      HOME,
      { label: 'Film Database', path: '/film-database' },
      { label: 'Film', path: '/film/film-77' },
    ],
    'film without slug or title falls back to the id and a generic label'
  );

  // ---- buildArticleBreadcrumbs ------------------------------------------
  const articleWithSub = {
    id: 'art-1',
    slug: 'review-dune-2',
    title: 'Review Dune 2',
    category: 'movies',
    subCategory: 'reviews',
  };
  assertEquals(
    buildArticleBreadcrumbs(articleWithSub),
    [
      HOME,
      { label: 'Movies', path: '/kategori/movies' },
      { label: 'Reviews', path: '/kategori/movies/reviews' },
      { label: 'Review Dune 2', path: '/artikel/review-dune-2' },
    ],
    'article with subcategory includes the subcategory in the trail'
  );

  const legacyArticle = {
    id: 'art-2',
    title: 'Anime Piece',
    category: 'anime',
  };
  assertEquals(
    buildArticleBreadcrumbs(legacyArticle),
    [
      HOME,
      { label: 'Animation', path: '/kategori/animation' },
      { label: 'Anime Piece', path: '/artikel/art-2' },
    ],
    'legacy "anime" article category normalizes to animation'
  );
  assertEquals(
    buildArticleBreadcrumbs({ id: 'art-3', title: 'Animasi Piece', category: 'animasi' })[1],
    { label: 'Animation', path: '/kategori/animation' },
    'legacy "animasi" article category normalizes to animation'
  );

  const articleNoSub = {
    id: 'art-4',
    slug: 'series-recap',
    title: 'Series Recap',
    category: 'series',
    subCategory: null,
  };
  assertEquals(
    buildArticleBreadcrumbs(articleNoSub),
    [
      HOME,
      { label: 'Series', path: '/kategori/series' },
      { label: 'Series Recap', path: '/artikel/series-recap' },
    ],
    'article without subcategory has no subcategory node'
  );

  const articleNoSlug = {
    id: 'art-5',
    title: 'No Slug',
    category: 'cinema-gear',
  };
  assertEquals(
    buildArticleBreadcrumbs(articleNoSlug),
    [
      HOME,
      { label: 'Cinema Gear', path: '/kategori/cinema-gear' },
      { label: 'No Slug', path: '/artikel/art-5' },
    ],
    'article label helper title-cases known categories and path falls back to id'
  );

  // ---- buildCategoryBreadcrumbs -----------------------------------------
  assertEquals(
    buildCategoryBreadcrumbs('movies'),
    [HOME, { label: 'Movies', path: '/kategori/movies' }],
    'top-level category: Home > category (no "Kategori" node)'
  );

  assertEquals(
    buildCategoryBreadcrumbs('movies', 'reviews'),
    [
      HOME,
      { label: 'Movies', path: '/kategori/movies' },
      { label: 'Reviews', path: '/kategori/movies/reviews' },
    ],
    'category with subcategory: Home > category > subcategory'
  );

  assertEquals(
    buildCategoryBreadcrumbs('anime'),
    [HOME, { label: 'Animation', path: '/kategori/animation' }],
    'legacy category key normalizes to animation'
  );

  assertEquals(
    buildCategoryBreadcrumbs('cinema-gear', 'post-production'),
    [
      HOME,
      { label: 'Cinema Gear', path: '/kategori/cinema-gear' },
      { label: 'Post-Production', path: '/kategori/cinema-gear/post-production' },
    ],
    'hyphenated category and subcategory labels are title-cased'
  );

  // ---- buildFranchiseBreadcrumbs ----------------------------------------
  assertEquals(
    buildFranchiseBreadcrumbs(119, 'The Lord of the Rings Collection'),
    [
      HOME,
      {
        label: 'The Lord of the Rings Collection',
        path: '/franchise/119-the-lord-of-the-rings-collection',
      },
    ],
    'franchise: Home > franchise name at its canonical path'
  );

  // ---- shared invariants -------------------------------------------------
  const trails: Array<{ name: string; trail: BreadcrumbTrailItem[] }> = [
    { name: 'film', trail: buildFilmBreadcrumbs(filmWithSlug) },
    { name: 'article', trail: buildArticleBreadcrumbs(articleWithSub) },
    { name: 'category', trail: buildCategoryBreadcrumbs('movies', 'reviews') },
    { name: 'franchise', trail: buildFranchiseBreadcrumbs(119, 'LOTR') },
  ];

  for (const { name, trail } of trails) {
    assert(
      trail[0]?.label === 'Home' && trail[0]?.path === '/',
      `${name} trail starts at Home (/)`
    );

    const schema = generateBreadcrumbSchema(toSchemaItems(trail));
    const positions = schema.itemListElement.map(item => item.position);
    assertEquals(
      positions,
      trail.map((_, index) => index + 1),
      `${name} schema positions increase from 1 to ${trail.length}`
    );

    assert(
      schema.itemListElement.every(item => item.item.startsWith('https://www.sotoyfilm.my.id/')),
      `${name} schema items are absolute canonical URLs`
    );

    assert(
      trail.every(item => !item.path.includes('/database-film')),
      `${name} trail never uses the dead /database-film path`
    );

    assert(
      trail.every(item => item.label !== 'Kategori'),
      `${name} trail never renders a literal "Kategori" node`
    );

    assert(
      trail.every(item => item.path.startsWith('/') && !item.path.includes('://')),
      `${name} trail paths are site-relative (never window.location.href)`
    );
  }

  assertEquals(
    toSchemaItems([HOME, { label: 'X', path: '/x' }]),
    [
      { name: 'Home', item: '/' },
      { name: 'X', item: '/x' },
    ],
    'toSchemaItems maps label/path to name/item without changing values'
  );

  assertEquals(
    getCategoryLabel('film-studies'),
    'Film Studies',
    'getCategoryLabel is the single source of category labels'
  );

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
};

runTests();
