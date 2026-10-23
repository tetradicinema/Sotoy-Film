/**
 * Collection link-preview tests.
 *
 * Covers the pure preview builders plus the cached Firestore REST lookup and
 * the middleware gate for /koleksi/:userId/:collectionId.
 *
 * Usage:
 *   npm run test:collection-preview
 */

import middleware from '../middleware.js';
import {
  buildCollectionDescription,
  buildCollectionTitle,
  clearCollectionPreviewCache,
  fetchCollectionPreview,
  isCollectionPublic,
  normalizeImageUrl,
  pickCollectionImageFromDocs,
} from '../src/lib/edge/firestoreRest.js';

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

/* -------------------------------------------------------------------------- */
/* Deterministic Firestore REST mock                                          */
/* -------------------------------------------------------------------------- */

const S = (value: string) => ({ stringValue: value });
const B = (value: boolean) => ({ booleanValue: value });
const ITEM = (itemId: string, itemType: 'film' | 'article') =>
  ({
    mapValue: {
      fields: {
        itemId: S(itemId),
        itemType: S(itemType),
        addedAt: S('2026-01-01T00:00:00.000Z'),
      },
    },
  });
const ITEMS = (...values: any[]) => ({ arrayValue: { values } });

const documents = new Map<string, Record<string, any>>();

const setDoc = (path: string, fields: Record<string, any>) => {
  documents.set(path, fields);
};

const INDEX_HTML =
  '<!doctype html><html><head><title>Sotoy Film</title></head><body><div id="root"></div></body></html>';

let requests: string[] = [];

const resetRequests = () => {
  requests = [];
};

const documentRequests = () =>
  requests.filter(url => url.includes('/documents/') && !url.includes(':runQuery'));

const documentPath = (url: string): string | null => {
  const match = /\/documents\/([^?]+)/.exec(url);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
};

const jsonDoc = (path: string, fields: Record<string, any>) =>
  new Response(
    JSON.stringify({
      name: `projects/test/databases/test/documents/${path}`,
      fields,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  );

const originalFetch = globalThis.fetch;
globalThis.fetch = async (input: string | URL | Request): Promise<Response> => {
  const url = input.toString();
  requests.push(url);

  if (url.includes('/index.html')) {
    return new Response(INDEX_HTML, {
      status: 200,
      headers: { 'content-type': 'text/html' },
    });
  }

  const path = documentPath(url);
  if (path && documents.has(path)) {
    return jsonDoc(path, documents.get(path)!);
  }

  // Unknown document, runQuery, or any other Firestore endpoint.
  return new Response(JSON.stringify({ error: { code: 404, status: 'NOT_FOUND' } }), {
    status: 404,
    headers: { 'content-type': 'application/json' },
  });
};

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

setDoc('users/budi', { name: S('Budi Santoso') });

setDoc('users/budi/collections/private-one', {
  name: S('Koleksi Rahasia'),
  isDefault: B(false),
  isPublic: B(false),
  items: ITEMS(ITEM('private-film', 'film')),
});

setDoc('users/budi/collections/missing-public-flag', {
  name: S('Tanpa Flag Publik'),
  description: S('Koleksi lama tanpa isPublic.'),
  isDefault: B(false),
  items: ITEMS(ITEM('flagless-film', 'film')),
});

setDoc('films/flagless-film', {
  title: S('Flagless Film'),
  poster: S('https://cdn.example.com/flagless.jpg'),
});

setDoc('users/budi/collections/film-poster', {
  name: S('Film Poster'),
  description: S('Film pilihan dengan poster.'),
  isDefault: B(false),
  isPublic: B(true),
  items: ITEMS(ITEM('film-poster-1', 'film'), ITEM('article-cover-1', 'article')),
});

setDoc('films/film-poster-1', {
  title: S('Film Poster 1'),
  poster: S('https://cdn.example.com/film-poster.jpg'),
  backdrop: S('/backdrop-ignored.jpg'),
});

setDoc('articles/article-cover-1', {
  title: S('Article Cover 1'),
  coverImage: S('https://cdn.example.com/article-cover.jpg'),
});

setDoc('users/budi/collections/article-cover', {
  name: S('Artikel Pilihan'),
  description: S(''),
  isDefault: B(false),
  isPublic: B(true),
  items: ITEMS(ITEM('article-og-1', 'article')),
});

setDoc('articles/article-og-1', {
  title: S('Article OG 1'),
  ogImage: S('https://cdn.example.com/article-og.jpg'),
  coverImage: S('https://cdn.example.com/article-cover-fallback.jpg'),
});

setDoc('users/budi/collections/data-image', {
  name: S('Data Image'),
  description: S('Gambar data URL tidak boleh dipakai.'),
  isDefault: B(false),
  isPublic: B(true),
  items: ITEMS(ITEM('article-data', 'article')),
});

setDoc('articles/article-data', {
  title: S('Article Data'),
  ogImage: S('data:image/png;base64,AAAA'),
  coverImage: S('data:image/jpeg;base64,BBBB'),
});

setDoc('users/budi/collections/no-items', {
  name: S('Koleksi Kosong'),
  isDefault: B(false),
  isPublic: B(true),
  items: ITEMS(),
});

setDoc('users/budi/collections/owner-missing', {
  name: S('Tanpa Pemilik'),
  isDefault: B(false),
  isPublic: B(true),
  items: ITEMS(ITEM('owner-missing-film', 'film')),
});

setDoc('films/owner-missing-film', {
  title: S('Owner Missing Film'),
  poster: S('https://cdn.example.com/owner-missing.jpg'),
});
// users/owner-missing-owner is intentionally absent -> owner name fallback.

setDoc('users/owner-missing-owner/collections/owner-missing', {
  name: S('Pemilik Tidak Ada'),
  isDefault: B(false),
  isPublic: B(true),
  items: ITEMS(ITEM('owner-missing-film', 'film')),
});

setDoc('users/budi/collections/cap-reads', {
  name: S('Batas Baca'),
  isDefault: B(false),
  isPublic: B(true),
  items: ITEMS(
    ITEM('cap-film-1', 'film'),
    ITEM('cap-film-2', 'film'),
    ITEM('cap-film-3', 'film'),
    ITEM('cap-film-4', 'film'),
    ITEM('cap-film-5', 'film')
  ),
});

for (let i = 1; i <= 5; i++) {
  setDoc(`films/cap-film-${i}`, { title: S(`Cap Film ${i}`) });
}

setDoc('films/breaking-bad', {
  title: S('Breaking Bad'),
  year: S('2008'),
  synopsis: S('Chemistry teacher turned meth lord.'),
  poster: S('/breaking-bad-poster.png'),
  director: S('Vince Gilligan'),
});

setDoc('articles/published-article', {
  title: S('Published Article Title'),
  status: S('published'),
  slug: S('published-article'),
  excerpt: S('This is a published article excerpt.'),
  ogImage: S('https://cdn.example.com/published-article.jpg'),
});

/* -------------------------------------------------------------------------- */
/* Pure helpers                                                               */
/* -------------------------------------------------------------------------- */

async function runPureTests() {
  assertEquals(
    isCollectionPublic({ isPublic: false }),
    false,
    'private collection is rejected (isPublic === false)'
  );
  assertEquals(
    isCollectionPublic({ name: 'Legacy collection' }),
    true,
    'missing isPublic counts as public'
  );
  assertEquals(
    isCollectionPublic(null),
    false,
    'missing collection data is not public'
  );

  assertEquals(
    buildCollectionTitle('Watchlist Akhir Pekan', 'Budi Santoso'),
    'Watchlist Akhir Pekan — Koleksi Budi Santoso | Sotoy Film',
    'title uses "<name> — Koleksi <owner> | Sotoy Film"'
  );
  assertEquals(
    buildCollectionTitle('Tanpa Pemilik', ''),
    'Tanpa Pemilik — Koleksi Sotoy Film | Sotoy Film',
    'title falls back to Sotoy Film when owner name is empty'
  );

  assertEquals(
    buildCollectionDescription('Film pilihan akhir pekan.', 3),
    'Film pilihan akhir pekan.',
    'description uses the collection description when present'
  );
  assertEquals(
    buildCollectionDescription('', 4),
    '4 judul film dan artikel pilihan di Sotoy Film.',
    'empty description falls back to the item count wording'
  );
  assertEquals(
    buildCollectionDescription('   ', 0),
    '0 judul film dan artikel pilihan di Sotoy Film.',
    'blank description fallback handles zero items'
  );

  assertEquals(
    pickCollectionImageFromDocs([
      {
        itemType: 'film',
        data: {
          poster: 'https://cdn.example.com/poster.jpg',
          backdrop: 'https://cdn.example.com/backdrop.jpg',
        },
      },
    ]),
    'https://cdn.example.com/poster.jpg',
    'film image prefers poster'
  );
  assertEquals(
    pickCollectionImageFromDocs([
      {
        itemType: 'film',
        data: { poster: '', backdrop: '/backdrop.jpg' },
      },
    ]),
    'https://www.sotoyfilm.my.id/backdrop.jpg',
    'film image falls back to backdrop and normalizes relative URLs'
  );
  assertEquals(
    pickCollectionImageFromDocs([
      {
        itemType: 'article',
        data: {
          ogImage: 'https://cdn.example.com/og.jpg',
          coverImage: 'https://cdn.example.com/cover.jpg',
        },
      },
    ]),
    'https://cdn.example.com/og.jpg',
    'article image prefers ogImage'
  );
  assertEquals(
    pickCollectionImageFromDocs([
      {
        itemType: 'article',
        data: { coverImage: 'https://cdn.example.com/cover.jpg' },
      },
    ]),
    'https://cdn.example.com/cover.jpg',
    'article image falls back to coverImage'
  );
  assertEquals(
    normalizeImageUrl('data:image/png;base64,AAAA'),
    null,
    'data: URLs are rejected'
  );
  assertEquals(
    pickCollectionImageFromDocs([
      { itemType: 'article', data: { ogImage: 'data:image/png;base64,AAAA' } },
    ]),
    null,
    'collection image picker rejects data: URLs'
  );
  assertEquals(
    pickCollectionImageFromDocs([]),
    null,
    'no item docs yields no image (middleware then uses og-default)'
  );
  assertEquals(
    pickCollectionImageFromDocs([
      { itemType: 'film', data: { poster: 'not-a-url.jpg' } },
      { itemType: 'article', data: { coverImage: 'https://cdn.example.com/ok.jpg' } },
    ]),
    'https://cdn.example.com/ok.jpg',
    'image picker stops at the first valid http(s) image'
  );
}

/* -------------------------------------------------------------------------- */
/* Firestore REST lookup                                                      */
/* -------------------------------------------------------------------------- */

async function runRestTests() {
  clearCollectionPreviewCache();

  resetRequests();
  const privatePreview = await fetchCollectionPreview('budi', 'private-one');
  const privateRequestCount = documentRequests().length;
  const privatePreviewAgain = await fetchCollectionPreview('budi', 'private-one');
  const privateRequestCountAfterCache = documentRequests().length;

  assertEquals(privatePreview, null, 'private collection lookup returns null');
  assertEquals(privatePreviewAgain, null, 'private collection stays null on retry');
  assertEquals(privateRequestCount, 1, 'private collection performs a single read');
  assertEquals(
    privateRequestCountAfterCache,
    1,
    'private collection negative result is cached for 60 seconds'
  );

  const flagless = await fetchCollectionPreview('budi', 'missing-public-flag');
  assert(flagless !== null, 'collection with missing isPublic is treated as public');
  assertEquals(
    flagless?.image,
    'https://cdn.example.com/flagless.jpg',
    'flagless public collection resolves its film poster'
  );

  const filmPreview = await fetchCollectionPreview('budi', 'film-poster');
  assertEquals(
    filmPreview?.image,
    'https://cdn.example.com/film-poster.jpg',
    'collection preview resolves the first film poster'
  );
  assertEquals(
    filmPreview?.description,
    'Film pilihan dengan poster.',
    'collection preview keeps the description'
  );
  assertEquals(
    filmPreview?.ownerName,
    'Budi Santoso',
    'collection preview resolves the owner name'
  );

  const articlePreview = await fetchCollectionPreview('budi', 'article-cover');
  assertEquals(
    articlePreview?.image,
    'https://cdn.example.com/article-og.jpg',
    'collection preview resolves the first article ogImage'
  );

  const dataPreview = await fetchCollectionPreview('budi', 'data-image');
  assertEquals(dataPreview?.image, null, 'data: image URLs never reach the preview');

  const emptyPreview = await fetchCollectionPreview('budi', 'no-items');
  assertEquals(emptyPreview?.image, null, 'collection with no items has no image');
  assertEquals(emptyPreview?.itemCount, 0, 'collection with no items has count 0');

  const ownerMissing = await fetchCollectionPreview('owner-missing-owner', 'owner-missing');
  assertEquals(
    ownerMissing?.ownerName,
    'Sotoy Film',
    'missing owner document falls back to "Sotoy Film"'
  );
  assertEquals(
    ownerMissing?.image,
    'https://cdn.example.com/owner-missing.jpg',
    'missing owner document still resolves the item image'
  );

  // Successful lookups are cached for 5 minutes.
  resetRequests();
  const cachedFirst = await fetchCollectionPreview('budi', 'film-poster');
  const cachedSecond = await fetchCollectionPreview('budi', 'film-poster');
  assertEquals(
    documentRequests().length,
    0,
    'successful collection lookup is served from the 5-minute cache'
  );
  assertEquals(
    cachedFirst?.name,
    cachedSecond?.name,
    'cached lookup returns the same preview'
  );

  // Budget: collection + owner + two item reads = 4 total REST reads.
  clearCollectionPreviewCache();
  resetRequests();
  const capped = await fetchCollectionPreview('budi', 'cap-reads');
  assertEquals(capped?.image, null, 'read budget stops before the third item image');
  assertEquals(
    documentRequests().length,
    4,
    'at most 3 extra REST reads are performed (collection + owner + 2 items)'
  );
}

/* -------------------------------------------------------------------------- */
/* Middleware integration                                                     */
/* -------------------------------------------------------------------------- */

const requestFor = (path: string, userAgent: string) =>
  new Request(`https://www.sotoyfilm.my.id${path}`, {
    method: 'GET',
    headers: { 'user-agent': userAgent },
  });

const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const HUMAN =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

async function runMiddlewareTests() {
  // Human visitors must pass straight through without any lookup.
  resetRequests();
  const humanResponse = await middleware(
    requestFor('/koleksi/budi/film-poster', HUMAN)
  );
  assertEquals(
    humanResponse.headers.get('x-middleware-next'),
    '1',
    'human on /koleksi passes through with safeNext()'
  );
  assertEquals(
    documentRequests().length,
    0,
    'human on /koleksi triggers no Firestore reads'
  );

  // Private collections never render preview HTML.
  const privateResponse = await middleware(
    requestFor('/koleksi/budi/private-one', GOOGLEBOT)
  );
  assertEquals(
    privateResponse.headers.get('x-middleware-next'),
    '1',
    'bot on a private collection falls through to safeNext()'
  );

  // Missing collections fail gracefully too.
  const missingResponse = await middleware(
    requestFor('/koleksi/budi/never-existed-collection', GOOGLEBOT)
  );
  assertEquals(
    missingResponse.headers.get('x-middleware-next'),
    '1',
    'bot on a missing collection falls through to safeNext()'
  );

  // Public collection renders the full preview payload.
  const previewResponse = await middleware(
    requestFor('/koleksi/budi/film-poster', GOOGLEBOT)
  );
  const previewHtml = await previewResponse.text();

  assertEquals(previewResponse.status, 200, 'public collection preview returns 200');
  assertEquals(
    previewResponse.headers.get('content-type'),
    'text/html; charset=utf-8',
    'public collection preview returns HTML'
  );
  assertEquals(
    previewResponse.headers.get('x-robots-tag'),
    'noindex, follow',
    'collection response sends the noindex, follow robots header'
  );
  assert(
    previewHtml.includes(
      '<title>Film Poster — Koleksi Budi Santoso | Sotoy Film</title>'
    ),
    'collection HTML uses the built title'
  );
  assert(
    previewHtml.includes('Film pilihan dengan poster.'),
    'collection HTML uses the collection description'
  );
  assert(
    previewHtml.includes(
      '<link rel="canonical" href="https://www.sotoyfilm.my.id/koleksi/budi/film-poster" />'
    ),
    'collection HTML uses the canonical /koleksi/:userId/:collectionId URL'
  );
  assert(
    previewHtml.includes('og:type" content="website"'),
    'collection HTML uses og:type website'
  );
  assert(
    previewHtml.includes('twitter:card" content="summary_large_image"'),
    'collection HTML uses twitter summary_large_image'
  );
  assert(
    previewHtml.includes('<meta name="robots" content="noindex, follow" />'),
    'collection HTML includes the noindex, follow robots meta tag'
  );
  assert(
    previewHtml.includes('content="https://cdn.example.com/film-poster.jpg"'),
    'collection HTML uses the resolved film poster image'
  );

  // Empty collection: fallback description and default OG image.
  const emptyResponse = await middleware(
    requestFor('/koleksi/budi/no-items', GOOGLEBOT)
  );
  const emptyHtml = await emptyResponse.text();
  assert(
    emptyHtml.includes('0 judul film dan artikel pilihan di Sotoy Film.'),
    'empty description falls back to the item-count wording in middleware'
  );
  assert(
    emptyHtml.includes('https://www.sotoyfilm.my.id/og-default.png'),
    'collection without an image uses the default OG image'
  );

  // Owner fallback in middleware output.
  const ownerFallbackResponse = await middleware(
    requestFor('/koleksi/owner-missing-owner/owner-missing', GOOGLEBOT)
  );
  const ownerFallbackHtml = await ownerFallbackResponse.text();
  assert(
    ownerFallbackHtml.includes(
      '<title>Pemilik Tidak Ada — Koleksi Sotoy Film | Sotoy Film</title>'
    ),
    'middleware title uses the Sotoy Film owner fallback'
  );

  // Film path must remain unchanged.
  const filmResponse = await middleware(requestFor('/film/breaking-bad', GOOGLEBOT));
  const filmHtml = await filmResponse.text();
  assert(
    filmHtml.includes('<title>Breaking Bad (2008) — Skor Sotoy &amp; Review Film</title>'),
    'film title output is unchanged'
  );
  assert(
    filmHtml.includes('og:type" content="video.movie"'),
    'film og:type is unchanged'
  );
  assert(
    !filmHtml.includes('name="robots"'),
    'film output does not gain a robots meta tag'
  );
  assertEquals(
    filmResponse.headers.get('x-robots-tag'),
    'all',
    'film x-robots-tag is unchanged'
  );

  // Article path must remain unchanged.
  const articleResponse = await middleware(
    requestFor('/artikel/published-article', GOOGLEBOT)
  );
  const articleHtml = await articleResponse.text();
  assert(
    articleHtml.includes(
      '<title>Published Article Title — Sotoy Film</title>'
    ),
    'article title output is unchanged'
  );
  assert(
    articleHtml.includes('og:type" content="article"'),
    'article og:type is unchanged'
  );
  assert(
    !articleHtml.includes('name="robots"'),
    'article output does not gain a robots meta tag'
  );
  assertEquals(
    articleResponse.headers.get('x-robots-tag'),
    'all',
    'article x-robots-tag is unchanged'
  );
}

async function main() {
  console.log('\n============================================================');
  console.log('🧪 Sotoy Film - Collection Link Preview Test Suite');
  console.log('============================================================\n');

  await runPureTests();
  await runRestTests();
  await runMiddlewareTests();

  globalThis.fetch = originalFetch;

  console.log('\n============================================================');
  console.log(`📊 Summary: ${passed} Passed, ${failed} Failed`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  globalThis.fetch = originalFetch;
  console.error('Unexpected test failure:', err);
  process.exit(1);
});
