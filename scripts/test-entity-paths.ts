import {
  buildArticlePath,
  buildFilmPath,
  buildCategoryPath,
  type EntityPathArticle,
  type EntityPathFilm,
} from '../src/utils/entityPaths';
import { handleSitemapRequest } from '../api/sitemap.js';
import { buildAuthorSitemapEntries } from '../src/lib/edge/authorSitemap.js';

const SITE_BASE_URL = 'https://www.sotoyfilm.my.id';

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
 * Replicates the article URL rule of api/sitemap.ts and generate-sitemap.ts:
 * `data.slug || data.id` (article paths never slugify the title).
 */
const sitemapArticleUrl = (data: { id: string; slug?: string; title?: string }): string => {
  const slug = data.slug || data.id;
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

/* -------------------------------------------------------------------------- */
/* Live sitemap parity                                                        */
/* -------------------------------------------------------------------------- */

const SITEMAP_ARTICLES = [
  {
    id: 'art-with-slug',
    slug: 'review-dune-2',
    title: 'Review Dune 2',
    status: 'published',
    authorId: 'author-a',
    publishedAtTimestamp: '2026-10-05T00:00:00.000Z',
    updatedAt: '2026-11-10T00:00:00.000Z',
  },
  {
    id: 'art-no-slug',
    title: 'Judul Tanpa Slug',
    status: 'published',
    authorId: 'author-a',
    publishedAtTimestamp: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'art special/:id',
    title: 'Special Chars',
    status: 'published',
    authorId: 'author-b',
    publishedAtTimestamp: '2026-10-05T00:00:00.000Z',
  },
  {
    id: 'art-edited',
    slug: 'artikel-diedit',
    title: 'Artikel Diedit',
    status: 'published',
    authorId: 'author-b',
    publishedAtTimestamp: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-11-20T00:00:00.000Z',
  },
  { id: 'art-draft', title: 'Draft Article', status: 'draft', authorId: 'draft-only-author' },
];

const SITEMAP_FILMS = [
  { id: 'film-dune-2', slug: 'dune-part-two', title: 'Dune Part Two' },
];

function toFirestoreRestDoc(collection: string, doc: Record<string, unknown>) {
  return {
    document: {
      name: `projects/test/databases/(default)/documents/${collection}/${doc.id}`,
      fields: Object.fromEntries(
        Object.entries(doc).map(([key, value]) => [key, { stringValue: String(value) }])
      ),
    },
  };
}

/**
 * Runs the real `/sitemap.xml` handler against a deterministic Firestore mock
 * and returns only the `/artikel/` locs, so the sitemap rule is asserted on
 * actual output instead of a local copy of it.
 */
async function fetchLiveSitemap(): Promise<{ articleLocs: string[]; xml: string }> {
  const realFetch = globalThis.fetch;
  const previousKey = process.env.TMDB_API_KEY;
  process.env.TMDB_API_KEY = 'test-sitemap-key';

  globalThis.fetch = (async (input: any, init?: RequestInit) => {
    const url = String(input);

    if (url.includes('firestore.googleapis.com')) {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      const collection = body?.structuredQuery?.from?.[0]?.collectionId;
      const docs =
        collection === 'articles'
          ? SITEMAP_ARTICLES
          : collection === 'films'
            ? SITEMAP_FILMS
            : [];

      return {
        ok: true,
        status: 200,
        json: async () => docs.map(doc => toFirestoreRestDoc(collection, doc)),
      } as unknown as Response;
    }

    // TMDB people are out of scope here; an empty page keeps the live
    // article/film result healthy without extra fixtures.
    return {
      ok: true,
      status: 200,
      json: async () => ({ page: 1, results: [] }),
    } as unknown as Response;
  }) as typeof fetch;

  let body = '';
  const res: any = {
    setHeader() {},
    removeHeader() {},
    status() {
      return res;
    },
    send(payload: string) {
      body = String(payload);
      return res;
    },
    writeHead() {},
    end(payload?: string) {
      if (payload !== undefined) body = String(payload);
    },
  };

  try {
    await handleSitemapRequest({ url: '/sitemap.xml', query: {} }, res);
  } finally {
    globalThis.fetch = realFetch;
    if (previousKey === undefined) {
      delete process.env.TMDB_API_KEY;
    } else {
      process.env.TMDB_API_KEY = previousKey;
    }
  }

  const locs: string[] = [];
  const pattern = /<loc>([^<]*)<\/loc>/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body)) !== null) {
    locs.push(match[1]);
  }
  return {
    articleLocs: locs.filter(loc => loc.startsWith(`${SITE_BASE_URL}/artikel/`)),
    xml: body,
  };
}

/** Extracts /user/<id> URLs and their lastmod values from a sitemap XML. */
function getSitemapUserEntries(xml: string): Array<{ loc: string; lastmod: string }> {
  return (xml.match(/<url>[\s\S]*?<\/url>/g) || [])
    .map(block => {
      const loc = /<loc>([^<]*)<\/loc>/.exec(block)?.[1] || '';
      if (!loc.startsWith(`${SITE_BASE_URL}/user/`)) return null;
      return {
        loc,
        lastmod: /<lastmod>([^<]*)<\/lastmod>/.exec(block)?.[1] || '',
      };
    })
    .filter((entry): entry is { loc: string; lastmod: string } => entry !== null);
}

const runTests = async () => {
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

  // ---- live sitemap parity ----------------------------------------------
  const sitemap = await fetchLiveSitemap();
  const sitemapArticleLocs = sitemap.articleLocs.sort();
  const publishedSitemapArticles = SITEMAP_ARTICLES.filter(article => article.status === 'published');
  assertEquals(
    sitemapArticleLocs,
    publishedSitemapArticles
      .map(article => `${SITE_BASE_URL}${buildArticlePath(article)}`)
      .sort(),
    'every sitemap article URL equals buildArticlePath(doc)'
  );
  assert(
    sitemapArticleLocs.includes(`${SITE_BASE_URL}/artikel/art-no-slug`),
    'a slugless article is listed by its raw id'
  );
  assert(
    !sitemapArticleLocs.includes(`${SITE_BASE_URL}/artikel/judul-tanpa-slug`),
    'a slugless article is not listed under a slugified title'
  );

  const editedBlock =
    /<url>[\s\S]*?<loc>https:\/\/www\.sotoyfilm\.my\.id\/artikel\/artikel-diedit<\/loc>[\s\S]*?<\/url>/.exec(
      sitemap.xml
    )?.[0] || '';
  assert(
    editedBlock.includes('<lastmod>2026-11-20</lastmod>'),
    'sitemap lastmod uses updatedAt when it differs from publishedAtTimestamp'
  );
  assert(
    !editedBlock.includes('<lastmod>2026-10-01</lastmod>'),
    'sitemap lastmod never falls back to the immutable publish date'
  );

  // ---- public author sitemap entries ------------------------------------
  const userEntries = getSitemapUserEntries(sitemap.xml);
  const publishedArticles = SITEMAP_ARTICLES.filter(article => article.status === 'published');
  const ymd = (value: any) =>
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : '';
  const expectedAuthorEntries = buildAuthorSitemapEntries(publishedArticles, SITE_BASE_URL, ymd)
    .map(entry => `${entry.loc}|${entry.lastmod}`)
    .sort();

  assertEquals(
    userEntries.map(entry => `${entry.loc}|${entry.lastmod}`).sort(),
    expectedAuthorEntries,
    'live sitemap author URLs/lastmod match the shared helper used by both sitemaps'
  );
  assertEquals(
    userEntries.map(entry => entry.loc).sort(),
    [`${SITE_BASE_URL}/user/author-a`, `${SITE_BASE_URL}/user/author-b`].sort(),
    'sitemap has exactly one /user/<id> per distinct published article author'
  );
  assert(
    !sitemap.xml.includes(`${SITE_BASE_URL}/user/draft-only-author`),
    'draft-only authors never enter the sitemap'
  );
  assert(
    userEntries.find(entry => entry.loc.endsWith('/user/author-a'))?.lastmod === '2026-11-10',
    'author lastmod uses the newest article updatedAt'
  );
  assert(
    userEntries.find(entry => entry.loc.endsWith('/user/author-b'))?.lastmod === '2026-11-20',
    'author lastmod ignores the older article of the same author'
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
