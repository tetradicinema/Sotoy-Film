import {
  buildArticlePath,
  buildFilmPath,
  buildCategoryPath,
  type EntityPathArticle,
  type EntityPathFilm,
} from '../src/utils/entityPaths';

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

/**
 * Replicates the slug/URL logic of src/utils/generateSitemap.ts exactly,
 * so the builders can be compared against it for sample data.
 */
const sitemapArticleUrl = (data: { id: string; slug?: string; title?: string }): string => {
  const slug = data.slug || (data.title ? slugifyCopy(data.title) : data.id);
  return `/artikel/${encodeURIComponent(slug)}`;
};

const sitemapFilmUrl = (data: { id: string; slug?: string; title?: string }): string => {
  const filmSlug = data.slug || slugifyCopy(data.title || '') || data.id;
  return `/film/${encodeURIComponent(filmSlug)}`;
};

/** Local copy of src/utils/slugify.ts (kept in sync with it). */
function slugifyCopy(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const runTests = () => {
  console.log('Running Entity Paths Tests...\n');

  // ---- buildArticlePath -------------------------------------------------
  const articleWithSlug: EntityPathArticle = { id: 'art-123', slug: 'review-dune-2' };
  assertEquals(
    buildArticlePath(articleWithSlug),
    '/artikel/review-dune-2',
    'buildArticlePath uses the slug when present'
  );
  assertEquals(
    buildArticlePath(articleWithSlug),
    sitemapArticleUrl(articleWithSlug),
    'buildArticlePath matches the sitemap URL for a slug article'
  );

  // Sample matches the sitemap contract: a published article without a slug
  // and without a title resolves to doc.id there, and the builder agrees.
  const articleNoSlug: EntityPathArticle = { id: 'art-abc' };
  assertEquals(
    buildArticlePath(articleNoSlug),
    '/artikel/art-abc',
    'buildArticlePath falls back to the raw id (no slugified title), like the sitemap'
  );
  assertEquals(
    buildArticlePath(articleNoSlug),
    sitemapArticleUrl(articleNoSlug),
    'buildArticlePath matches the sitemap URL for a slugless article'
  );
  // The builder intentionally follows the navigateTo contract (slug || id):
  // a title never produces a slugified article path.
  assertEquals(
    buildArticlePath({ id: 'art-abc', title: 'Judul Tanpa Slug' }),
    '/artikel/art-abc',
    'buildArticlePath ignores the title (article paths use slug || id)'
  );

  assertEquals(
    buildArticlePath({ id: 'art spesial/:x' }),
    '/artikel/art%20spesial%2F%3Ax',
    'buildArticlePath encodes unsafe characters'
  );

  // ---- buildFilmPath ----------------------------------------------------
  const filmWithSlug: EntityPathFilm = { id: 'film-1', slug: 'dune-part-two', title: 'Dune Part Two' };
  assertEquals(
    buildFilmPath(filmWithSlug),
    '/film/dune-part-two',
    'buildFilmPath uses the slug when present'
  );
  assertEquals(
    buildFilmPath(filmWithSlug),
    sitemapFilmUrl(filmWithSlug),
    'buildFilmPath matches the sitemap URL for a slug film'
  );

  const filmNoSlug: EntityPathFilm = { id: 'tmdb-693134', title: 'Dune: Part Two' };
  assertEquals(
    buildFilmPath(filmNoSlug),
    '/film/dune-part-two',
    'buildFilmPath falls back to slugify(title)'
  );
  assertEquals(
    buildFilmPath(filmNoSlug),
    sitemapFilmUrl(filmNoSlug),
    'buildFilmPath matches the sitemap URL for a slugless film'
  );

  const filmIdOnly: EntityPathFilm = { id: 'film-77', title: '' };
  assertEquals(
    buildFilmPath(filmIdOnly),
    '/film/film-77',
    'buildFilmPath falls back to the id when slug and title are empty'
  );
  assertEquals(
    buildFilmPath(filmIdOnly),
    sitemapFilmUrl(filmIdOnly),
    'buildFilmPath matches the sitemap URL for a film with no slug/title'
  );

  assertEquals(
    buildFilmPath({ id: 'f', title: 'Parasite / 기생충' }),
    '/film/parasite',
    'buildFilmPath slugifies non-latin titles exactly like slugify (non-word chars removed)'
  );

  // ---- buildCategoryPath ------------------------------------------------
  assertEquals(
    buildCategoryPath('movies'),
    '/kategori/movies',
    'buildCategoryPath builds the category hub path'
  );
  assertEquals(
    buildCategoryPath('movies', 'reviews'),
    '/kategori/movies/reviews',
    'buildCategoryPath appends the subcategory'
  );
  assertEquals(
    buildCategoryPath('movies', null),
    '/kategori/movies',
    'buildCategoryPath ignores a null subcategory'
  );
  assertEquals(
    buildCategoryPath('cinema-gear', 'gear-news'),
    '/kategori/cinema-gear/gear-news',
    'buildCategoryPath handles hyphenated categories and subcategories'
  );

  // ---- cross-checks with navigateTo parity ------------------------------
  // navigateTo('article-detail') uses `targetArticle?.slug || targetArticleId`
  // navigateTo('film-detail') uses `slug || slugify(title) || filmId`
  assertEquals(
    buildFilmPath({ id: 'x', slug: 'a b', title: 'T' }),
    '/film/a%20b',
    'buildFilmPath encodes spaces inside explicit slugs'
  );

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
};

runTests();
