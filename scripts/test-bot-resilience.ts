/**
 * Focused regression tests for bot-facing resilience:
 *
 * - Empty/partial live sitemaps never receive the 1-hour header and fall back
 *   to the validated build-time snapshot (short cache) or 503 + Retry-After.
 * - A transient Firestore failure returns 503 + Retry-After + no-store for
 *   search crawlers (Googlebot/Google-InspectionTool/bingbot) instead of the
 *   empty SPA shell.
 * - A genuinely missing slug keeps the existing pass-through behavior.
 * - An expired cached entity is served when the refresh fails (stale-if-error).
 * - Stale-if-error is bounded to 6 hours and never renews freshness.
 * - Only 5xx/408/429/network failures are transient; other 4xx continue to the
 *   collection scan and resolve as not-found.
 * - Entity lookup order is runQuery -> direct GET (only on empty) -> scan.
 * - Concurrent scan fallbacks share one in-flight scan per isolate.
 *
 * Usage:
 *   npx tsx scripts/test-bot-resilience.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import middleware, { clearBotResilienceCaches } from '../middleware.js';
import {
  clearEntityResilienceCaches,
  fetchEntityDataResult,
} from '../src/lib/edge/firestoreRest.js';
import { handleSitemapRequest } from '../api/sitemap.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const snapshotPath = path.join(repoRoot, 'data', 'sitemap-snapshot.xml');

process.env.TMDB_API_KEY = 'bot-resilience-test-key';

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

const realFetch = globalThis.fetch;
const realDateNow = Date.now;
const realWarn = console.warn;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
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

async function runSitemap(
  fetchImpl: typeof fetch,
  url: string,
  query: Record<string, string> = {}
): Promise<{ status: number; headers: Record<string, string>; body: string }> {
  globalThis.fetch = fetchImpl;
  const res = createResponse();
  try {
    await handleSitemapRequest({ url, query }, res);
  } finally {
    globalThis.fetch = realFetch;
  }
  return { status: res.getStatus(), headers: res.getHeaders(), body: res.getBody() };
}

const countLocs = (xml: string) => (xml.match(/<loc>/g) || []).length;

const emptyLiveFetch = (async (input: any) => {
  const url = String(input);
  if (url.includes('firestore.googleapis.com')) {
    // OK-but-empty arrays for both collections: a degraded live result.
    return jsonResponse([]);
  }
  return jsonResponse({ error: 'unavailable' }, 503);
}) as typeof fetch;

const nonArrayLiveFetch = (async (input: any) => {
  const url = String(input);
  if (url.includes('firestore.googleapis.com')) {
    // OK response without a runQuery array: must be degraded, not cached 1h.
    return jsonResponse({ documents: [] });
  }
  return jsonResponse({ error: 'unavailable' }, 503);
}) as typeof fetch;

const shellHtml =
  '<!doctype html><html><head><title>Sotoy Film</title></head><body><div id="root"></div></body></html>';

const failAllFetch = (async (input: any) => {
  const url = String(input);
  if (url.includes('/index.html')) {
    return new Response(shellHtml, {
      status: 200,
      headers: { 'content-type': 'text/html' },
    });
  }
  return jsonResponse({ error: { code: 503, message: 'Unavailable' } }, 503);
}) as typeof fetch;

function botRequest(pathname: string, userAgent: string): Request {
  return new Request(`https://www.sotoyfilm.my.id${pathname}`, {
    method: 'GET',
    headers: { 'user-agent': userAgent },
  });
}

const GOOGLEBOT =
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const TWITTERBOT = 'Twitterbot/1.0';

function filmDoc(slug: string, title: string, extraFields: Record<string, any> = {}) {
  return {
    name: `projects/test/databases/(default)/documents/films/${slug}`,
    fields: {
      id: { stringValue: slug },
      slug: { stringValue: slug },
      title: { stringValue: title },
      year: { integerValue: '2026' },
      synopsis: { stringValue: 'Resilience test synopsis.' },
      ...extraFields,
    },
  };
}

async function runSitemapTests(): Promise<void> {
  console.log('\n--- Sitemap degraded-result tests ---\n');

  console.warn = () => {};
  const snapshotXml = fs.readFileSync(snapshotPath, 'utf-8');

  const emptyXml = await runSitemap(emptyLiveFetch, '/sitemap.xml', {});
  assert(
    emptyXml.status === 200,
    'empty live XML: falls back to the snapshot with HTTP 200'
  );
  assertEquals(
    emptyXml.headers['cache-control'],
    'public, s-maxage=300, stale-while-revalidate=600',
    'empty live XML: uses the short degraded cache header'
  );
  assert(
    emptyXml.headers['cache-control'] !==
      'public, s-maxage=3600, stale-while-revalidate=86400',
    'empty live XML: never receives the 1-hour healthy header'
  );
  assertEquals(emptyXml.body, snapshotXml, 'empty live XML: serves the snapshot unchanged');
  assert(
    countLocs(emptyXml.body) >= 300,
    'empty live XML: snapshot contains at least 300 <loc> entries'
  );

  const nonArrayXml = await runSitemap(nonArrayLiveFetch, '/sitemap.xml', {});
  assertEquals(
    nonArrayXml.headers['cache-control'],
    'public, s-maxage=300, stale-while-revalidate=600',
    'non-array live XML: uses the short degraded cache header'
  );
  assertEquals(
    nonArrayXml.body,
    snapshotXml,
    'non-array live XML: falls back to the snapshot'
  );

  const emptyCsv = await runSitemap(emptyLiveFetch, '/sitemap.csv', { format: 'csv' });
  assert(
    emptyCsv.status === 200,
    'empty live CSV: falls back to a snapshot-derived CSV'
  );
  assertEquals(
    emptyCsv.headers['cache-control'],
    'public, s-maxage=300, stale-while-revalidate=600',
    'empty live CSV: uses the short degraded cache header'
  );
  assert(
    !(emptyCsv.headers['cache-control'] || '').includes('s-maxage=3600'),
    'empty live CSV: never receives the 1-hour healthy header'
  );
  assert(
    emptyCsv.body.split('\r\n').length >= 300,
    'empty live CSV: is not the 19-row static-only output'
  );

  console.warn = realWarn;
}

async function runMiddlewareTransientTests(): Promise<void> {
  console.log('\n--- Middleware transient-failure tests ---\n');

  clearBotResilienceCaches();
  clearEntityResilienceCaches();
  globalThis.fetch = failAllFetch;

  const googleResponse = await middleware(botRequest('/film/no-cache-transient', GOOGLEBOT));
  assert(googleResponse.status === 503, 'Googlebot transient failure: responds 503');
  assertEquals(
    googleResponse.headers.get('retry-after'),
    '120',
    'Googlebot transient failure: sets Retry-After: 120'
  );
  assertEquals(
    googleResponse.headers.get('cache-control'),
    'no-store',
    'Googlebot transient failure: sets Cache-Control: no-store'
  );
  assert(
    googleResponse.headers.get('x-robots-tag') === null,
    'Googlebot transient failure: 503 has no x-robots-tag'
  );

  clearBotResilienceCaches();
  clearEntityResilienceCaches();
  const inspectionResponse = await middleware(
    botRequest(
      '/film/no-cache-inspection',
      'Mozilla/5.0 (compatible; Google-InspectionTool/1.0)'
    )
  );
  assert(
    inspectionResponse.status === 503 &&
      inspectionResponse.headers.get('retry-after') === '120',
    'Google-InspectionTool transient failure: responds 503 + Retry-After: 120'
  );

  clearBotResilienceCaches();
  clearEntityResilienceCaches();
  const bingResponse = await middleware(
    botRequest('/film/no-cache-bing', 'Mozilla/5.0 (compatible; bingbot/2.0)')
  );
  assert(
    bingResponse.status === 503 && bingResponse.headers.get('retry-after') === '120',
    'bingbot transient failure: responds 503 + Retry-After: 120'
  );

  clearBotResilienceCaches();
  clearEntityResilienceCaches();
  const socialResponse = await middleware(
    botRequest('/film/no-cache-social', TWITTERBOT)
  );
  assert(
    socialResponse.headers.get('x-middleware-next') === '1' &&
      (await socialResponse.text()) === '',
    'social crawler transient failure: keeps the existing pass-through behavior'
  );

  globalThis.fetch = realFetch;
}

async function runMissingSlugTests(): Promise<void> {
  console.log('\n--- Missing slug behavior ---\n');

  clearBotResilienceCaches();
  clearEntityResilienceCaches();

  const calls: string[] = [];
  globalThis.fetch = (async (input: any) => {
    const url = String(input);
    if (url.includes('/index.html')) {
      return new Response(shellHtml, {
        status: 200,
        headers: { 'content-type': 'text/html' },
      });
    }
    if (url.includes(':runQuery')) {
      calls.push('query');
      return jsonResponse([]);
    }
    if (/\/documents\/(?:films|articles)\?/.test(url)) {
      calls.push('scan');
      return jsonResponse({ documents: [] });
    }
    if (/\/documents\/(?:films|articles)\/[^?]+/.test(url)) {
      calls.push('direct');
      return jsonResponse({ error: { code: 404, message: 'Not found' } }, 404);
    }
    return jsonResponse({});
  }) as typeof fetch;

  const response = await middleware(botRequest('/film/definitely-missing-slug', GOOGLEBOT));
  assert(
    response.headers.get('x-middleware-next') === '1' &&
      (await response.text()) === '',
    'missing slug: still passes through to the SPA (no 404 change)'
  );
  assert(
    calls.includes('query') && calls.includes('direct') && calls.includes('scan'),
    'missing slug: completes query -> direct GET -> scan before declaring it missing'
  );

  globalThis.fetch = realFetch;
}

async function runLookupOrderTests(): Promise<void> {
  console.log('\n--- Entity lookup order ---\n');

  const doc = filmDoc('order-slug', 'Order Film');

  // 1. runQuery hit: direct GET and scan must not run.
  {
    clearEntityResilienceCaches();
    const calls: string[] = [];
    globalThis.fetch = (async (input: any) => {
      const url = String(input);
      if (url.includes(':runQuery')) {
        calls.push('query');
        return jsonResponse([{ document: doc }]);
      }
      if (/\/documents\/films\/[^?]+/.test(url)) {
        calls.push('direct');
        return jsonResponse(doc);
      }
      if (/\/documents\/films\?/.test(url)) {
        calls.push('scan');
        return jsonResponse({ documents: [doc] });
      }
      return jsonResponse({});
    }) as typeof fetch;

    const result = await fetchEntityDataResult('films', 'order-slug');
    assert(result.status === 'ok', 'lookup order: runQuery hit resolves the entity');
    assertEquals(calls, ['query'], 'lookup order: direct GET and scan are skipped on a hit');
  }

  // 2. runQuery OK-but-empty: direct GET runs next.
  {
    clearEntityResilienceCaches();
    const calls: string[] = [];
    globalThis.fetch = (async (input: any) => {
      const url = String(input);
      if (url.includes(':runQuery')) {
        calls.push('query');
        return jsonResponse([]);
      }
      if (/\/documents\/films\/[^?]+/.test(url)) {
        calls.push('direct');
        return jsonResponse(doc);
      }
      if (/\/documents\/films\?/.test(url)) {
        calls.push('scan');
        return jsonResponse({ documents: [doc] });
      }
      return jsonResponse({});
    }) as typeof fetch;

    const result = await fetchEntityDataResult('films', 'order-slug');
    assert(result.status === 'ok', 'lookup order: direct GET resolves when the query is empty');
    assertEquals(
      calls,
      ['query', 'direct'],
      'lookup order: direct GET runs only after an OK-but-empty query'
    );
  }

  // 3. query empty + direct 404: the scan fallback runs last.
  {
    clearEntityResilienceCaches();
    const calls: string[] = [];
    globalThis.fetch = (async (input: any) => {
      const url = String(input);
      if (url.includes(':runQuery')) {
        calls.push('query');
        return jsonResponse([]);
      }
      if (/\/documents\/films\/[^?]+/.test(url)) {
        calls.push('direct');
        return jsonResponse({ error: { code: 404 } }, 404);
      }
      if (/\/documents\/films\?/.test(url)) {
        calls.push('scan');
        return jsonResponse({ documents: [doc] });
      }
      return jsonResponse({});
    }) as typeof fetch;

    const result = await fetchEntityDataResult('films', 'order-slug');
    assert(result.status === 'ok', 'lookup order: scan fallback resolves when both are empty');
    assertEquals(
      calls,
      ['query', 'direct', 'scan'],
      'lookup order: scan runs only after query and direct GET are both empty'
    );
  }

  globalThis.fetch = realFetch;
}

async function runStaleIfErrorTests(): Promise<void> {
  console.log('\n--- Stale-if-error ---\n');

  clearBotResilienceCaches();
  clearEntityResilienceCaches();

  let fakeNow = realDateNow();
  Date.now = () => fakeNow;

  const slug = 'stale-resilience-film';
  const doc = filmDoc(slug, 'Stale Resilience Film');

  globalThis.fetch = (async (input: any) => {
    const url = String(input);
    if (url.includes('/index.html')) {
      return new Response(shellHtml, {
        status: 200,
        headers: { 'content-type': 'text/html' },
      });
    }
    if (url.includes(':runQuery')) {
      return jsonResponse([{ document: doc }]);
    }
    if (/\/documents\/films\/[^?]+/.test(url)) {
      return jsonResponse(doc);
    }
    return jsonResponse({});
  }) as typeof fetch;

  const firstResponse = await middleware(botRequest(`/film/${slug}`, GOOGLEBOT));
  const firstHtml = await firstResponse.text();
  assert(
    firstResponse.status === 200 && firstHtml.includes('Stale Resilience Film'),
    'stale-if-error: first request caches a successful entity response'
  );

  // Move past both the 10-minute entity TTL and the 5-minute shell TTL, then
  // make every refresh fail.
  fakeNow += 11 * 60 * 1000;
  globalThis.fetch = (async () => {
    return jsonResponse({ error: { code: 503, message: 'Unavailable' } }, 503);
  }) as typeof fetch;

  const staleResponse = await middleware(botRequest(`/film/${slug}`, GOOGLEBOT));
  const staleHtml = await staleResponse.text();

  assert(
    staleResponse.status === 200,
    'stale-if-error: expired cache serves the stale entity instead of failing'
  );
  assert(
    staleHtml.includes('Stale Resilience Film'),
    'stale-if-error: stale entity content is still rendered'
  );
  assert(
    (staleResponse.headers.get('cache-control') || '').includes('s-maxage=60'),
    'stale-if-error: response keeps the existing 60-second HTML cache header'
  );

  Date.now = realDateNow;
  globalThis.fetch = realFetch;
}

async function runDirectGetStatusTests(): Promise<void> {
  console.log('\n--- Direct GET status classification ---\n');

  for (const status of [400, 403]) {
    clearBotResilienceCaches();
    clearEntityResilienceCaches();

    const calls: string[] = [];
    globalThis.fetch = (async (input: any) => {
      const url = String(input);
      if (url.includes('/index.html')) {
        return new Response(shellHtml, {
          status: 200,
          headers: { 'content-type': 'text/html' },
        });
      }
      if (url.includes(':runQuery')) {
        calls.push('query');
        return jsonResponse([]);
      }
      if (/\/documents\/films\?/.test(url)) {
        calls.push('scan');
        return jsonResponse({ documents: [] });
      }
      if (/\/documents\/films\/[^?]+/.test(url)) {
        calls.push('direct');
        return jsonResponse({ error: { code: status } }, status);
      }
      return jsonResponse({});
    }) as typeof fetch;

    const slug = `direct-status-${status}-film`;
    const response = await middleware(botRequest(`/film/${slug}`, GOOGLEBOT));

    assert(
      response.status === 200 && response.headers.get('x-middleware-next') === '1',
      `direct GET ${status}: continues to the scan and passes through as not-found`
    );
    assert(
      calls.includes('direct') && calls.includes('scan'),
      `direct GET ${status}: the collection scan still runs`
    );
    assert(
      response.status !== 503,
      `direct GET ${status}: is not treated as a transient 503`
    );
  }

  // A 5xx on the direct GET step is a real outage and must stop the lookup.
  clearBotResilienceCaches();
  clearEntityResilienceCaches();

  const serverErrorCalls: string[] = [];
  globalThis.fetch = (async (input: any) => {
    const url = String(input);
    if (url.includes('/index.html')) {
      return new Response(shellHtml, {
        status: 200,
        headers: { 'content-type': 'text/html' },
      });
    }
    if (url.includes(':runQuery')) {
      serverErrorCalls.push('query');
      return jsonResponse([]);
    }
    if (/\/documents\/films\?/.test(url)) {
      serverErrorCalls.push('scan');
      return jsonResponse({ documents: [] });
    }
    if (/\/documents\/films\/[^?]+/.test(url)) {
      serverErrorCalls.push('direct');
      return jsonResponse({ error: { code: 500 } }, 500);
    }
    return jsonResponse({});
  }) as typeof fetch;

  const serverErrorResponse = await middleware(
    botRequest('/film/direct-status-500-film', GOOGLEBOT)
  );

  assert(
    serverErrorResponse.status === 503 &&
      serverErrorResponse.headers.get('retry-after') === '120',
    'direct GET 500: returns 503 + Retry-After: 120 for Googlebot'
  );
  assert(
    !serverErrorCalls.includes('scan'),
    'direct GET 500: stops before the collection scan'
  );

  globalThis.fetch = realFetch;
}

async function runStaleAgeLimitTests(): Promise<void> {
  console.log('\n--- Stale age limit ---\n');

  clearBotResilienceCaches();
  clearEntityResilienceCaches();

  let fakeNow = realDateNow();
  Date.now = () => fakeNow;

  const slug = 'too-old-stale-film';
  const doc = filmDoc(slug, 'Too Old Stale Film');

  globalThis.fetch = (async (input: any) => {
    const url = String(input);
    if (url.includes('/index.html')) {
      return new Response(shellHtml, {
        status: 200,
        headers: { 'content-type': 'text/html' },
      });
    }
    if (url.includes(':runQuery')) {
      return jsonResponse([{ document: doc }]);
    }
    if (/\/documents\/films\/[^?]+/.test(url)) {
      return jsonResponse(doc);
    }
    return jsonResponse({});
  }) as typeof fetch;

  const firstResponse = await middleware(botRequest(`/film/${slug}`, GOOGLEBOT));
  assert(
    firstResponse.status === 200,
    'stale age limit: first request caches the entity'
  );

  // Move past the 6-hour stale ceiling; every refresh now fails.
  fakeNow += 6 * 60 * 60 * 1000 + 60 * 1000;
  globalThis.fetch = failAllFetch;

  const cacheResult = await fetchEntityDataResult('films', slug);
  assertEquals(
    cacheResult.status,
    'error',
    'stale age limit: the Firestore entity cache older than 6h is not served'
  );

  const response = await middleware(botRequest(`/film/${slug}`, GOOGLEBOT));
  assertEquals(
    response.status,
    503,
    'stale age limit: the middleware cache older than 6h returns 503 for Googlebot'
  );

  globalThis.fetch = realFetch;
}

async function runStaleNoRenewalTests(): Promise<void> {
  console.log('\n--- Stale does not renew freshness ---\n');

  clearBotResilienceCaches();
  clearEntityResilienceCaches();

  let fakeNow = realDateNow();
  Date.now = () => fakeNow;

  const slug = 'stale-renewal-film';
  let currentDoc = filmDoc(slug, 'Original Cache Title');

  const successFetch = (async (input: any) => {
    const url = String(input);
    if (url.includes('/index.html')) {
      return new Response(shellHtml, {
        status: 200,
        headers: { 'content-type': 'text/html' },
      });
    }
    if (url.includes(':runQuery')) {
      return jsonResponse([{ document: currentDoc }]);
    }
    if (/\/documents\/films\/[^?]+/.test(url)) {
      return jsonResponse(currentDoc);
    }
    return jsonResponse({});
  }) as typeof fetch;

  globalThis.fetch = successFetch;
  const firstResponse = await middleware(botRequest(`/film/${slug}`, GOOGLEBOT));
  assert(
    firstResponse.status === 200 &&
      (await firstResponse.text()).includes('Original Cache Title'),
    'stale renewal: first request caches the original title'
  );

  // Past the 10-minute TTL but inside the 6-hour ceiling: serve stale.
  fakeNow += 11 * 60 * 1000;
  globalThis.fetch = failAllFetch;

  const staleResponse = await middleware(botRequest(`/film/${slug}`, GOOGLEBOT));
  assert(
    staleResponse.status === 200 &&
      (await staleResponse.text()).includes('Original Cache Title'),
    'stale renewal: the expired entry is served inside the 6h ceiling'
  );

  // One minute later Firestore recovers with new data. If the stale response
  // had renewed the cache timestamp, the old title would still be considered
  // fresh (1 minute into a new 10-minute TTL) and would win here.
  fakeNow += 60 * 1000;
  currentDoc = filmDoc(slug, 'Recovered Fresh Title');
  globalThis.fetch = successFetch;

  const recoveredResponse = await middleware(botRequest(`/film/${slug}`, GOOGLEBOT));
  const recoveredHtml = await recoveredResponse.text();

  assert(
    recoveredHtml.includes('Recovered Fresh Title'),
    'stale renewal: the next request refreshes instead of using a renewed timestamp'
  );
  assert(
    !recoveredHtml.includes('Original Cache Title'),
    'stale renewal: the stale title is not served once Firestore recovers'
  );

  globalThis.fetch = realFetch;
}

async function runConcurrentScanTests(): Promise<void> {
  console.log('\n--- Single concurrent scan ---\n');

  clearEntityResilienceCaches();

  let listCalls = 0;
  let releaseScan: () => void = () => {};
  const scanGate = new Promise<void>(resolve => {
    releaseScan = resolve;
  });

  globalThis.fetch = (async (input: any) => {
    const url = String(input);
    if (url.includes(':runQuery')) {
      return jsonResponse([]);
    }
    if (/\/documents\/films\?/.test(url)) {
      listCalls++;
      await scanGate;
      return jsonResponse({ documents: [] });
    }
    if (/\/documents\/films\/[^?]+/.test(url)) {
      return jsonResponse({ error: { code: 404 } }, 404);
    }
    return jsonResponse({});
  }) as typeof fetch;

  const first = fetchEntityDataResult('films', 'scan-one');
  const second = fetchEntityDataResult('films', 'scan-two');

  await new Promise(resolve => setTimeout(resolve, 20));
  releaseScan();

  const results = await Promise.all([first, second]);
  assert(
    results.every(result => result.status === 'not-found'),
    'concurrent scans: both callers receive a completed result'
  );
  assertEquals(listCalls, 1, 'concurrent scans: only one collection scan runs per isolate');

  globalThis.fetch = realFetch;
}

async function main(): Promise<void> {
  try {
    await runSitemapTests();
    await runMiddlewareTransientTests();
    await runMissingSlugTests();
    await runLookupOrderTests();
    await runDirectGetStatusTests();
    await runStaleIfErrorTests();
    await runStaleAgeLimitTests();
    await runStaleNoRenewalTests();
    await runConcurrentScanTests();
  } finally {
    console.warn = realWarn;
    Date.now = realDateNow;
    globalThis.fetch = realFetch;
  }

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch(error => {
  console.error('Test runner crashed:', error);
  process.exit(1);
});
