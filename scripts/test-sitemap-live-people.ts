/**
 * Automated tests for the live `/sitemap.xml` handler (`api/sitemap.ts`).
 *
 * Covers the TMDB people section, its failure modes, the unchanged Firestore
 * snapshot fallback, XML validity and key leakage.
 *
 * Usage:
 *   npx tsx scripts/test-sitemap-live-people.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleSitemapRequest } from '../api/sitemap.js';
import { slugify } from '../src/utils/slugify.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const snapshotPath = path.join(repoRoot, 'data', 'sitemap-snapshot.xml');

const BASE_URL = 'https://www.sotoyfilm.my.id';
const TMDB_KEY = 'v3-live-sitemap-test-key';

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
    `${message}${same ? '' : ` — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`}`
  );
};

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                    */
/* -------------------------------------------------------------------------- */

interface PersonFixture {
  id: number;
  name: string;
  adult: boolean;
}

const person = (id: number, name: string, adult = false): PersonFixture => ({
  id,
  name,
  adult,
});

const expectedPeople: Array<{ id: number; name: string }> = [
  { id: 287, name: 'Brad Pitt' },
  { id: 8691, name: 'Zoë Saldaña' },
  ...Array.from({ length: 18 }, (_, index) => {
    const id = 2001 + index;
    return { id, name: `Person ${id}` };
  }),
  ...Array.from({ length: 20 }, (_, index) => {
    const id = 2021 + index;
    return { id, name: `Person ${id}` };
  }),
];

const expectedPeopleLocs = expectedPeople.map(person =>
  `${BASE_URL}/person/${person.id}-${slugify(person.name)}`
);

function tmdbPage(page: number): Record<string, any> {
  if (page === 1) {
    return {
      page: 1,
      results: [
        person(287, 'Brad Pitt'),
        person(8691, 'Zoë Saldaña'),
        ...Array.from({ length: 18 }, (_, index) => {
          const id = 2001 + index;
          return person(id, `Person ${id}`);
        }),
        // Must all be dropped.
        person(666, 'Adult Star', true),
        person(0, 'Zero Id'),
        person(287, 'Brad Pitt Duplicate'),
      ],
    };
  }
  return {
    page: 2,
    results: Array.from({ length: 20 }, (_, index) => {
      const id = 2021 + index;
      return person(id, `Person ${id}`);
    }),
  };
}

const ARTICLE_DOCS = [
  {
    id: 'live-article-one',
    fields: {
      id: 'live-article-one',
      slug: 'live-article-one',
      title: 'Live Article One',
      status: 'published',
      updatedAt: '2026-10-20T00:00:00.000Z',
    },
  },
  {
    id: 'live-article-two',
    fields: {
      id: 'live-article-two',
      slug: 'live-article-two',
      title: 'Live Article Two',
      status: 'published',
      updatedAt: '2026-10-21T00:00:00.000Z',
    },
  },
  {
    id: 'live-article-draft',
    fields: {
      id: 'live-article-draft',
      slug: 'live-article-draft',
      title: 'Live Article Draft',
      status: 'draft',
      updatedAt: '2026-10-22T00:00:00.000Z',
    },
  },
];

const FILM_DOCS = [
  {
    id: 'live-film-one',
    fields: {
      id: 'live-film-one',
      slug: 'live-film-one',
      title: 'Live Film One',
      updatedAt: '2026-10-23T00:00:00.000Z',
    },
  },
  {
    id: 'live-film-two',
    fields: {
      id: 'live-film-two',
      slug: 'live-film-two',
      title: 'Live Film Two',
      updatedAt: '2026-10-24T00:00:00.000Z',
    },
  },
];

const expectedContentLocs = [
  `${BASE_URL}/artikel/live-article-one`,
  `${BASE_URL}/artikel/live-article-two`,
  `${BASE_URL}/film/live-film-one`,
  `${BASE_URL}/film/live-film-two`,
];

/** 13 base static routes (incl. /people) + 5 categories = 18. */
const STATIC_COUNT = 18;
const BASELINE_COUNT = STATIC_COUNT + expectedContentLocs.length; // 22
const SUCCESS_COUNT = BASELINE_COUNT + expectedPeopleLocs.length; // 62

const encodeFields = (fields: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, { stringValue: value }])
  );

function firestoreResults(init?: RequestInit): any[] {
  const body = init?.body ? JSON.parse(String(init.body)) : {};
  const collection = body?.structuredQuery?.from?.[0]?.collectionId;
  const docs =
    collection === 'articles'
      ? ARTICLE_DOCS
      : collection === 'films'
        ? FILM_DOCS
        : [];

  return docs.map(doc => ({
    document: {
      name: `projects/test/databases/(default)/documents/${collection}/${doc.id}`,
      fields: encodeFields(doc.fields),
    },
  }));
}

/* -------------------------------------------------------------------------- */
/* Harness helpers                                                             */
/* -------------------------------------------------------------------------- */

const realFetch = globalThis.fetch;
const realWarn = console.warn;
const realLog = console.log;
const realError = console.error;
const realDateNow = Date.now;

// The personMeta module cache is keyed by Date.now(); advancing a fake clock
// between cases invalidates both the 10-minute positive and 60-second negative
// TTLs without exporting test-only cache hooks from production code.
let fakeNow = realDateNow();
Date.now = () => fakeNow;

function advanceCacheClock(): void {
  fakeNow += 11 * 60 * 1000;
}

function restoreGlobals(): void {
  globalThis.fetch = realFetch;
  console.warn = realWarn;
  console.log = realLog;
  console.error = realError;
  Date.now = realDateNow;
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

function createFetchMock(
  options: SitemapCaseOptions,
  onRequest: (url: string) => void
): typeof fetch {
  return (async (input: any, init?: RequestInit) => {
    const url = String(input);
    onRequest(url);

    if (url.includes('firestore.googleapis.com')) {
      if (options.firestore === 'fail') {
        return jsonResponse({}, false, 500);
      }
      return jsonResponse(firestoreResults(init));
    }

    if (url.includes('api.themoviedb.org')) {
      if (options.tmdb === 'fail') {
        return jsonResponse({}, false, 503);
      }
      if (options.tmdb === 'timeout') {
        return new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;
          const fail = () => {
            const error = new Error('The operation was aborted');
            error.name = 'AbortError';
            reject(error);
          };
          if (!signal || signal.aborted) {
            fail();
            return;
          }
          signal.addEventListener('abort', fail);
        });
      }
      const page = Number(new URL(url).searchParams.get('page'));
      return jsonResponse(tmdbPage(page));
    }

    return jsonResponse({});
  }) as typeof fetch;
}

function createResponse(): any {
  const headers: Record<string, string> = {};
  let status = 0;
  let body = '';

  const res: any = {
    setHeader(name: string, value: string) {
      headers[name.toLowerCase()] = value;
    },
    removeHeader(name: string) {
      delete headers[name.toLowerCase()];
    },
    status(code: number) {
      status = code;
      return res;
    },
    send(payload: string) {
      body = String(payload);
      return res;
    },
    writeHead(code: number) {
      status = code;
    },
    end(payload?: string) {
      if (payload !== undefined) body = String(payload);
    },
    getHeaders: () => headers,
    getBody: () => body,
    getStatus: () => status,
  };

  return res;
}

interface SitemapCaseOptions {
  key: string | null;
  firestore: 'ok' | 'fail';
  tmdb: 'ok' | 'fail' | 'timeout';
}

interface SitemapCaseResult {
  xml: string;
  status: number;
  headers: Record<string, string>;
  output: string[];
  requests: string[];
  threw: boolean;
}

async function runSitemapCase(
  options: SitemapCaseOptions
): Promise<SitemapCaseResult> {
  advanceCacheClock();

  const requests: string[] = [];
  globalThis.fetch = createFetchMock(options, url => requests.push(url));

  const previousKey = process.env.TMDB_API_KEY;
  if (options.key === null) {
    delete process.env.TMDB_API_KEY;
  } else {
    process.env.TMDB_API_KEY = options.key;
  }

  const output: string[] = [];
  const record = (...args: any[]) => {
    output.push(args.map(String).join(' '));
  };
  console.warn = record;
  console.log = record;
  console.error = record;

  const res = createResponse();
  let threw = false;

  try {
    await handleSitemapRequest({ url: '/sitemap.xml', query: {} }, res);
  } catch {
    threw = true;
  } finally {
    if (previousKey === undefined) {
      delete process.env.TMDB_API_KEY;
    } else {
      process.env.TMDB_API_KEY = previousKey;
    }
    restoreGlobals();
    // keep the fake clock alive for the next case
    Date.now = () => fakeNow;
  }

  return {
    xml: res.getBody(),
    status: res.getStatus(),
    headers: res.getHeaders(),
    output,
    requests,
    threw,
  };
}

function extractLocs(xml: string): string[] {
  const locs: string[] = [];
  const pattern = /<loc>([^<]*)<\/loc>/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(xml)) !== null) {
    locs.push(match[1]);
  }
  return locs;
}

function isWellFormedSitemap(xml: string): boolean {
  if (!xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')) return false;
  if (!xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')) {
    return false;
  }
  if (!xml.trimEnd().endsWith('</urlset>')) return false;

  const urlOpen = (xml.match(/<url>/g) || []).length;
  const urlClose = (xml.match(/<\/url>/g) || []).length;
  const locOpen = (xml.match(/<loc>/g) || []).length;
  const locClose = (xml.match(/<\/loc>/g) || []).length;
  if (urlOpen !== urlClose || locOpen !== locClose || locOpen !== urlOpen) {
    return false;
  }

  // No raw ampersand outside a valid XML entity.
  if (/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/.test(xml)) {
    return false;
  }

  const blocks = xml.match(/<url>[\s\S]*?<\/url>/g) || [];
  return (
    blocks.length === urlOpen &&
    blocks.every(
      block =>
        /<loc>[^<]*<\/loc>/.test(block) &&
        /<changefreq>[^<]*<\/changefreq>/.test(block) &&
        /<priority>[^<]*<\/priority>/.test(block)
    )
  );
}

function urlBlock(xml: string, loc: string): string | null {
  const blocks = xml.match(/<url>[\s\S]*?<\/url>/g) || [];
  return (
    blocks.find(
      block => block.includes(`<loc>${loc}</loc>`) || block.includes(`<loc>${loc.replace(/&/g, '&amp;')}</loc>`)
    ) || null
  );
}

/* -------------------------------------------------------------------------- */
/* Tests                                                                       */
/* -------------------------------------------------------------------------- */

const runTests = async () => {
  console.log('Running Live Sitemap People Tests...\n');

  const success = await runSitemapCase({
    key: TMDB_KEY,
    firestore: 'ok',
    tmdb: 'ok',
  });
  const successLocs = extractLocs(success.xml);
  const successPersonLocs = successLocs.filter(loc =>
    loc.startsWith(`${BASE_URL}/person/`)
  );

  assert(success.status === 200, 'success: responds with HTTP 200');
  assert(
    success.headers['content-type'] === 'application/xml; charset=utf-8',
    'success: serves application/xml; charset=utf-8'
  );
  assertEquals(
    success.headers['cache-control'],
    'public, s-maxage=3600, stale-while-revalidate=86400',
    'success: handler cache-control header is unchanged'
  );
  assertEquals(
    success.headers['x-robots-tag'],
    'all',
    'success: sitemap remains indexable'
  );
  assert(isWellFormedSitemap(success.xml), 'success: XML is well-formed');
  assert(successLocs.includes(`${BASE_URL}/people`), 'success: includes /people');
  assert(
    successPersonLocs.length === 40,
    'success: includes exactly 40 /person/ URLs'
  );
  assertEquals(
    successPersonLocs,
    expectedPeopleLocs,
    'success: person URLs match the build-time canonical rule, in order'
  );
  assert(
    successPersonLocs.includes(`${BASE_URL}/person/287-brad-pitt`),
    'success: Brad Pitt resolves to /person/287-brad-pitt'
  );
  assert(
    successPersonLocs.includes(`${BASE_URL}/person/8691-zoe-saldana`),
    'success: slugify strips diacritics (Zoë Saldaña)'
  );
  assert(
    !success.xml.includes('/person/666') && !success.xml.includes('Adult Star'),
    'success: adult entries are never emitted'
  );
  assert(
    successPersonLocs.filter(loc => loc.startsWith(`${BASE_URL}/person/287-`))
      .length === 1,
    'success: duplicate person ids are emitted once'
  );
  assertEquals(successLocs.length, SUCCESS_COUNT, 'success: total URL count is 62');

  for (const loc of expectedContentLocs) {
    assert(successLocs.includes(loc), `success: keeps ${loc}`);
  }
  assert(
    !successLocs.includes(`${BASE_URL}/artikel/live-article-draft`),
    'success: still excludes draft articles'
  );

  const peopleBlock = urlBlock(success.xml, `${BASE_URL}/people`);
  assert(
    Boolean(
      peopleBlock &&
        peopleBlock.includes('<changefreq>weekly</changefreq>') &&
        peopleBlock.includes('<priority>0.7</priority>') &&
        peopleBlock.includes('<lastmod>2026-10-25</lastmod>')
    ),
    'success: /people uses weekly, 0.7 and STATIC_LASTMOD'
  );

  const firstPersonBlock = urlBlock(success.xml, expectedPeopleLocs[0]);
  assert(
    Boolean(
      firstPersonBlock &&
        !firstPersonBlock.includes('<lastmod>') &&
        firstPersonBlock.includes('<changefreq>weekly</changefreq>') &&
        firstPersonBlock.includes('<priority>0.5</priority>')
    ),
    'success: person entries use weekly and 0.5 with no lastmod'
  );

  const tmdbRequests = success.requests.filter(url =>
    url.includes('api.themoviedb.org')
  );
  assert(tmdbRequests.length === 2, 'success: fetches exactly two TMDB pages');
  assert(
    new URL(tmdbRequests[0]).searchParams.get('page') === '1' &&
      new URL(tmdbRequests[1]).searchParams.get('page') === '2',
    'success: TMDB pages are fetched sequentially (1 then 2)'
  );
  assert(
    tmdbRequests.every(url => {
      const parsed = new URL(url);
      return (
        parsed.searchParams.get('include_adult') === 'false' &&
        parsed.searchParams.get('language') === 'en-US' &&
        parsed.searchParams.get('api_key') === TMDB_KEY
      );
    }),
    'success: TMDB requests use include_adult=false, en-US and the api_key param'
  );
  assert(success.output.length === 0, 'success: no console output');
  assert(!success.threw, 'success: handler does not throw');

  // -------------------------------------------------------------------------
  // TMDB failures: /people stays, person URLs disappear, everything else stays
  // -------------------------------------------------------------------------
  const failureCases: Array<{ name: string; result: SitemapCaseResult }> = [
    {
      name: 'non-OK',
      result: await runSitemapCase({
        key: TMDB_KEY,
        firestore: 'ok',
        tmdb: 'fail',
      }),
    },
    {
      name: 'timeout',
      result: await runSitemapCase({
        key: TMDB_KEY,
        firestore: 'ok',
        tmdb: 'timeout',
      }),
    },
    {
      name: 'missing key',
      result: await runSitemapCase({
        key: null,
        firestore: 'ok',
        tmdb: 'ok',
      }),
    },
  ];

  for (const { name, result } of failureCases) {
    const locs = extractLocs(result.xml);
    assert(result.status === 200, `${name}: still responds with HTTP 200`);
    assert(isWellFormedSitemap(result.xml), `${name}: XML stays well-formed`);
    assert(locs.includes(`${BASE_URL}/people`), `${name}: still includes /people`);
    assert(
      locs.filter(loc => loc.startsWith(`${BASE_URL}/person/`)).length === 0,
      `${name}: includes no /person/ URLs`
    );
    assertEquals(locs.length, BASELINE_COUNT, `${name}: keeps all 22 baseline URLs`);
    for (const loc of expectedContentLocs) {
      assert(locs.includes(loc), `${name}: keeps ${loc}`);
    }
    assert(!result.xml.includes('Adult Star'), `${name}: no adult entries`);
    assert(!result.threw, `${name}: handler does not throw`);
  }

  assert(
    failureCases
      .find(item => item.name === 'non-OK')!
      .result.requests.filter(url => url.includes('api.themoviedb.org')).length === 1,
    'non-OK: stops after the failing first TMDB page'
  );
  assert(
    failureCases
      .find(item => item.name === 'missing key')!
      .result.requests.filter(url => url.includes('api.themoviedb.org')).length === 0,
    'missing key: performs no TMDB request'
  );

  const timeoutResult = failureCases.find(item => item.name === 'timeout')!.result;
  assert(
    timeoutResult.output.length === 0,
    'timeout: no logging (the helper returns [] silently)'
  );

  // -------------------------------------------------------------------------
  // Firestore failure still falls back to the build-time snapshot, unchanged
  // -------------------------------------------------------------------------
  const fallback = await runSitemapCase({
    key: TMDB_KEY,
    firestore: 'fail',
    tmdb: 'ok',
  });

  assert(fallback.status === 200, 'fallback: responds with HTTP 200');
  assert(fallback.threw === false, 'fallback: handler does not throw');
  assert(fs.existsSync(snapshotPath), 'fallback: snapshot file exists');

  const snapshot = fs.readFileSync(snapshotPath, 'utf-8');
  assertEquals(fallback.xml, snapshot, 'fallback: serves data/sitemap-snapshot.xml unchanged');
  assert(
    fallback.output.some(line => line.includes('[Live Sitemap]')),
    'fallback: logs the existing Firestore fallback warning'
  );

  // -------------------------------------------------------------------------
  // The API key never appears in any response body or console output
  // -------------------------------------------------------------------------
  const allBodies = [success.xml, ...failureCases.map(item => item.result.xml), fallback.xml].join('\n');
  const allOutput = [
    ...success.output,
    ...failureCases.flatMap(item => item.result.output),
    ...fallback.output,
  ].join('\n');

  assert(!allBodies.includes(TMDB_KEY), 'key: never appears in the XML body');
  assert(!allOutput.includes(TMDB_KEY), 'key: never appears in console output');
  assert(
    allOutput.length > 0 && !/TMDB_API_KEY\s*[:=]\s*\S+/.test(allOutput),
    'key: warning text never echoes the TMDB_API_KEY value'
  );

  // -------------------------------------------------------------------------
  // Adult entries never appear anywhere
  // -------------------------------------------------------------------------
  for (const xml of [success.xml, ...failureCases.map(item => item.result.xml), fallback.xml]) {
    assert(
      !xml.includes('/person/666') && !xml.includes('Adult Star'),
      'adult: never appears in any sitemap response'
    );
  }

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
};

runTests()
  .catch(error => {
    console.error('Test runner crashed:', error);
    process.exit(1);
  })
  .finally(() => {
    restoreGlobals();
  });
