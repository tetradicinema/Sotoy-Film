/**
 * Automated test suite for the crawler REST fallback.
 *
 * Usage:
 *   npm run test:rest-fallback
 */

import {
  fetchCollectionViaRest,
  normalizeRestArticle,
  normalizeRestFilm,
} from '../src/utils/firestoreRestClient.js';
import { getRestFallbackTargets } from '../src/hooks/useRestDataFallback.js';

interface Check {
  name: string;
  ok: boolean;
  detail?: string;
}

const checks: Check[] = [];

function check(name: string, ok: boolean, detail?: string): void {
  checks.push({ name, ok, detail });
  if (ok) {
    console.log(`✅ ${name}`);
  } else {
    console.error(`❌ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const realFetch = globalThis.fetch;
const realSetTimeout = globalThis.setTimeout;

function restoreGlobals(): void {
  globalThis.fetch = realFetch;
  globalThis.setTimeout = realSetTimeout;
}

function mockFetch(
  handler: (url: string, init?: RequestInit) => Promise<Response>
): void {
  globalThis.fetch = ((input: any, init?: RequestInit) =>
    handler(String(input), init)) as typeof fetch;
}

function response(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  } as unknown as Response;
}

function rawDoc(
  collection: 'films' | 'articles',
  id: string,
  fields: Record<string, unknown>
): Record<string, unknown> {
  const encoded: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === 'string') encoded[key] = { stringValue: value };
    else if (typeof value === 'number') encoded[key] = { doubleValue: value };
    else if (typeof value === 'boolean') encoded[key] = { booleanValue: value };
    else if (Array.isArray(value)) {
      encoded[key] = {
        arrayValue: {
          values: value.map(item => ({ stringValue: String(item) })),
        },
      };
    }
  }
  return {
    name: `projects/test/databases/test/documents/${collection}/${id}`,
    fields: encoded,
  };
}

async function testPagination(): Promise<void> {
  let pages = 0;
  const urls: string[] = [];

  mockFetch(async url => {
    pages++;
    urls.push(url);
    return response({
      documents: [rawDoc('films', `film-${pages}`, { title: `Film ${pages}` })],
      nextPageToken: `page-${pages}`,
    });
  });

  const docs = await fetchCollectionViaRest('films');
  restoreGlobals();

  check(
    'pagination follows nextPageToken and stops after 5 pages',
    pages === 5 && docs.length === 5,
    `pages=${pages}, docs=${docs.length}`
  );
  check(
    'first request uses pageSize=300 without a field mask',
    urls[0]?.includes(`/films?pageSize=300&key=`) && !urls[0]?.includes('mask.fieldPaths'),
    urls[0]
  );
  check(
    'subsequent requests send pageToken',
    urls[1]?.includes('pageToken=page-1') === true,
    urls[1]
  );
  check(
    'id is taken from the document name when the id field is missing',
    docs[0]?.id === 'film-1' && docs[4]?.id === 'film-5',
    JSON.stringify(docs.map(doc => doc.id))
  );
  check(
    'parsed string fields are kept',
    docs[0]?.title === 'Film 1',
    String(docs[0]?.title)
  );

  mockFetch(async () =>
    response({
      documents: [rawDoc('films', 'only-page', { title: 'Only page' })],
    })
  );
  const singlePage = await fetchCollectionViaRest('films');
  restoreGlobals();
  check(
    'pagination stops when nextPageToken is absent',
    singlePage.length === 1 && singlePage[0]?.id === 'only-page'
  );
}

async function testErrors(): Promise<void> {
  mockFetch(async () => response({ error: 'boom' }, false));
  const httpError = await fetchCollectionViaRest('films');
  restoreGlobals();
  check('HTTP error returns []', Array.isArray(httpError) && httpError.length === 0);

  mockFetch(async () => {
    throw new Error('network down');
  });
  const thrown = await fetchCollectionViaRest('articles');
  restoreGlobals();
  check('thrown fetch returns []', Array.isArray(thrown) && thrown.length === 0);

  // Simulate the AbortController timeout without waiting 15 real seconds.
  globalThis.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: any[]) =>
    realSetTimeout(handler, timeout === 15000 ? 0 : timeout, ...args)) as typeof setTimeout;

  mockFetch(
    (_url, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const error = new Error('The operation was aborted.');
          error.name = 'AbortError';
          reject(error);
        });
      })
  );
  const timedOut = await fetchCollectionViaRest('films');
  restoreGlobals();
  check('timeout returns []', Array.isArray(timedOut) && timedOut.length === 0);
}

function testFilmNormalization(): void {
  const legacy = normalizeRestFilm({
    id: 'legacy-film',
    title: 'Legacy Film',
    type: 'anime',
    skorSotoy: 4.2,
    criticsSkorSotoy: 4.6,
    scoreScale: undefined,
  });
  check(
    'normalizeRestFilm doubles legacy 5-point scores',
    legacy?.skorSotoy === 8.4 && legacy?.criticsSkorSotoy === 9.2,
    `skor=${legacy?.skorSotoy}, critics=${legacy?.criticsSkorSotoy}`
  );
  check(
    'normalizeRestFilm normalises the film type',
    legacy?.type === 'animation',
    String(legacy?.type)
  );

  const modern = normalizeRestFilm({
    id: 'modern-film',
    title: 'Modern Film',
    type: 'series',
    skorSotoy: 9.1,
    criticsSkorSotoy: 8.5,
    scoreScale: 10,
  });
  check(
    'normalizeRestFilm leaves 10-point scores alone',
    modern?.skorSotoy === 9.1 && modern?.criticsSkorSotoy === 8.5,
    `skor=${modern?.skorSotoy}, critics=${modern?.criticsSkorSotoy}`
  );

  const noCritics = normalizeRestFilm({
    id: 'no-critics',
    skorSotoy: 7.5,
    type: 'movie',
  });
  check(
    'normalizeRestFilm falls back to the Sotoy score for critics',
    noCritics?.criticsSkorSotoy === 7.5,
    String(noCritics?.criticsSkorSotoy)
  );

  check(
    'normalizeRestFilm returns null without an id',
    normalizeRestFilm({ title: 'No id' }) === null
  );

  const fromName = normalizeRestFilm({
    name: 'projects/test/databases/test/documents/films/from-name',
    skorSotoy: 6,
  });
  check(
    'normalizeRestFilm uses the document name as id fallback',
    fromName?.id === 'from-name',
    String(fromName?.id)
  );
}

function testArticleNormalization(): void {
  const now = Date.now();
  const past = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const future = new Date(now + 24 * 60 * 60 * 1000).toISOString();

  const docs = [
    { id: 'published', status: 'published', publishedAtTimestamp: past, category: 'movies' },
    { id: 'draft', status: 'draft', publishedAtTimestamp: past, category: 'movies' },
    { id: 'trash', status: 'trash', publishedAtTimestamp: past, category: 'movies' },
    { id: 'future-scheduled', status: 'scheduled', scheduledAt: future, category: 'movies' },
    { id: 'past-scheduled', status: 'scheduled', scheduledAt: past, category: 'anime' },
  ];

  check(
    'normalizeRestArticle drops drafts and trash',
    normalizeRestArticle(docs[1]) === null && normalizeRestArticle(docs[2]) === null
  );
  check(
    'normalizeRestArticle drops future scheduled articles',
    normalizeRestArticle(docs[3]) === null
  );

  const normalized = normalizeRestArticle(docs);
  check(
    'normalizeRestArticle keeps published and past scheduled articles',
    normalized.length === 2 &&
      normalized.some(article => article.id === 'published') &&
      normalized.some(article => article.id === 'past-scheduled'),
    JSON.stringify(normalized.map(article => article.id))
  );
  check(
    'normalizeRestArticle normalises the article category',
    normalized.find(article => article.id === 'past-scheduled')?.category === 'animation'
  );

  const many = Array.from({ length: 55 }, (_, index) => ({
    id: `article-${index}`,
    status: 'published',
    publishedAtTimestamp: new Date(now - index * 60 * 1000).toISOString(),
    category: 'series',
  }));
  const limited = normalizeRestArticle(many);
  check(
    'normalizeRestArticle keeps at most 50 articles',
    limited.length === 50,
    `length=${limited.length}`
  );
  check(
    'normalizeRestArticle sorts newest first',
    limited[0]?.id === 'article-0' && limited[49]?.id === 'article-49',
    `${limited[0]?.id} -> ${limited[49]?.id}`
  );

  const fallbackTimes = normalizeRestArticle([
    { id: 'old-published-at', status: 'published', publishedAt: '2024-01-01T00:00:00.000Z' },
    { id: 'new-scheduled-at', status: 'scheduled', scheduledAt: past },
    { id: 'new-published-ts', status: 'published', publishedAtTimestamp: past },
  ]);
  check(
    'normalizeRestArticle sorts by publishedAtTimestamp, scheduledAt, then publishedAt',
    fallbackTimes[2]?.id === 'old-published-at' && fallbackTimes[0]?.id !== 'old-published-at',
    JSON.stringify(fallbackTimes.map(article => article.id))
  );
}

function testFallbackDecision(): void {
  check(
    'fallback does nothing when both counts are above 0',
    getRestFallbackTargets({ filmsCount: 12, articlesCount: 48 }).length === 0
  );
  check(
    'fallback fetches both collections when both are empty',
    JSON.stringify(getRestFallbackTargets({ filmsCount: 0, articlesCount: 0 })) ===
      JSON.stringify(['films', 'articles'])
  );
  check(
    'fallback fetches only the empty films collection',
    JSON.stringify(getRestFallbackTargets({ filmsCount: 0, articlesCount: 9 })) ===
      JSON.stringify(['films'])
  );
  check(
    'fallback fetches only the empty articles collection',
    JSON.stringify(getRestFallbackTargets({ filmsCount: 7, articlesCount: 0 })) ===
      JSON.stringify(['articles'])
  );
}

async function main(): Promise<void> {
  console.log('\n============================================================');
  console.log('🧪 Sotoy Film - REST Fallback Test Suite');
  console.log('============================================================\n');

  try {
    await testPagination();
    await testErrors();
    testFilmNormalization();
    testArticleNormalization();
    testFallbackDecision();
  } finally {
    restoreGlobals();
  }

  const failed = checks.filter(item => !item.ok).length;
  console.log('\n============================================================');
  console.log(`📊 Summary: ${checks.length - failed} Passed, ${failed} Failed`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

void main();
