/**
 * Automated tests for `scripts/sitemap-people.ts`.
 *
 * Usage:
 *   npx tsx scripts/test-sitemap-people.ts
 */

import {
  fetchPopularPeopleSitemapEntries,
  type PeopleSitemapEntry,
} from './sitemap-people';
import { slugify } from '../src/utils/slugify';

const BASE_URL = 'https://www.sotoyfilm.my.id';

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
/* Mocking helpers (same style as scripts/test-rest-fallback.ts)              */
/* -------------------------------------------------------------------------- */

const realFetch = globalThis.fetch;
const realWarn = console.warn;
const realLog = console.log;
const realError = console.error;

function restoreGlobals(): void {
  globalThis.fetch = realFetch;
  console.warn = realWarn;
  console.log = realLog;
  console.error = realError;
}

function mockFetch(
  handler: (url: string, init?: RequestInit) => Promise<Response>
): void {
  globalThis.fetch = ((input: any, init?: RequestInit) =>
    handler(String(input), init)) as typeof fetch;
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

async function withConsole<T>(
  fn: () => Promise<T>
): Promise<{ value: T; output: string[] }> {
  const output: string[] = [];
  const record = (...args: any[]) => {
    output.push(args.map(String).join(' '));
  };
  console.warn = record;
  console.log = record;
  console.error = record;
  try {
    const value = await fn();
    return { value, output };
  } finally {
    console.warn = realWarn;
    console.log = realLog;
    console.error = realError;
  }
}

async function withKey<T>(key: string | null, fn: () => Promise<T>): Promise<T> {
  const previous = process.env.TMDB_API_KEY;
  if (key === null) {
    delete process.env.TMDB_API_KEY;
  } else {
    process.env.TMDB_API_KEY = key;
  }
  try {
    return await fn();
  } finally {
    if (previous === undefined) {
      delete process.env.TMDB_API_KEY;
    } else {
      process.env.TMDB_API_KEY = previous;
    }
  }
}

interface RunResult {
  entries: PeopleSitemapEntry[];
  output: string[];
  requests: Array<{ url: string; init?: RequestInit }>;
  threw: boolean;
  elapsedMs: number;
}

async function runCase(
  key: string | null,
  handler: (url: string, init?: RequestInit) => Promise<Response>
): Promise<RunResult> {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  mockFetch((url, init) => {
    requests.push({ url, init });
    return handler(url, init);
  });

  const startedAt = Date.now();
  let threw = false;
  try {
    const { value, output } = await withConsole(() =>
      withKey(key, async () => {
        try {
          return await fetchPopularPeopleSitemapEntries({ baseUrl: BASE_URL });
        } catch {
          threw = true;
          return [] as PeopleSitemapEntry[];
        }
      })
    );
    return {
      entries: value,
      output,
      requests,
      threw,
      elapsedMs: Date.now() - startedAt,
    };
  } finally {
    restoreGlobals();
  }
}

const person = (id: any, name: any, adult = false) => ({ id, name, adult });

const peoplePage = (startId: number, count: number) => ({
  page: 1,
  results: Array.from({ length: count }, (_, index) =>
    person(startId + index, `Person ${startId + index}`)
  ),
});

const runTests = async () => {
  console.log('Running Sitemap People Tests...\n');

  const V3_KEY = 'v3-test-key';
  const BEARER_KEY = 'eyJhbGciOiJIUzI1NiJ9.sitemap.test.token.value';
  const LONG_KEY = 'a'.repeat(60);

  // -------------------------------------------------------------------------
  // Success: 40 canonical URLs, in order, across two sequential pages
  // -------------------------------------------------------------------------
  {
    const result = await runCase(V3_KEY, async url => {
      const page = Number(new URL(url).searchParams.get('page'));
      return page === 1 ? jsonResponse(peoplePage(1001, 20)) : jsonResponse(peoplePage(1021, 20));
    });

    const expected = [
      ...Array.from({ length: 20 }, (_, index) => {
        const id = 1001 + index;
        return `${BASE_URL}/person/${id}-person-${id}`;
      }),
      ...Array.from({ length: 20 }, (_, index) => {
        const id = 1021 + index;
        return `${BASE_URL}/person/${id}-person-${id}`;
      }),
    ];

    const actualLocs = result.entries.map(entry => entry.loc);
    assert(
      actualLocs.length === expected.length &&
        actualLocs.every((loc, index) => loc === expected[index]),
      'success: returns 40 canonical URLs in order'
    );
    assert(result.entries.length === 40, 'success: keeps exactly the first 40 people');
    assert(
      result.requests.length === 2 &&
        result.requests.every(request => {
          const url = new URL(request.url);
          return (
            url.searchParams.get('include_adult') === 'false' &&
            url.searchParams.get('language') === 'en-US'
          );
        }),
      'success: requests include_adult=false and language=en-US on both pages'
    );
    assert(
      new URL(result.requests[0].url).searchParams.get('page') === '1' &&
        new URL(result.requests[1].url).searchParams.get('page') === '2',
      'success: fetches page 1 then page 2 sequentially'
    );
    assertEquals(
      result.entries[0],
      {
        loc: `${BASE_URL}/person/1001-person-1001`,
        changefreq: 'weekly',
        priority: '0.5',
      },
      'success: entries use weekly changefreq, 0.5 priority and no lastmod'
    );
    assert(
      result.entries.every(entry => !('lastmod' in entry)),
      'success: no entry has a lastmod (unknown modification date)'
    );
    assert(result.output.length === 0, 'success: logs nothing');
  }

  // -------------------------------------------------------------------------
  // Filtering: adult, duplicate, invalid id/name entries are dropped
  // -------------------------------------------------------------------------
  {
    const result = await runCase(V3_KEY, async url => {
      const page = Number(new URL(url).searchParams.get('page'));
      if (page === 2) return jsonResponse({ page: 2, results: [] });
      return jsonResponse({
        page: 1,
        results: [
          person(1, 'Valid One'),
          person(2, 'Adult Person', true),
          person(0, 'Zero Id'),
          person(-3, 'Negative Id'),
          person(1.5, 'Fractional Id'),
          person('abc', 'String Id'),
          person(4, ''),
          person(5, undefined),
          person(6, '   '),
          person(7, 'Valid Two'),
          person(7, 'Valid Two Duplicate'),
          person(8, 'Valid Three'),
          person(9, '!!!'),
        ],
      });
    });

    assertEquals(
      result.entries.map(entry => entry.loc),
      [
        `${BASE_URL}/person/1-valid-one`,
        `${BASE_URL}/person/7-valid-two`,
        `${BASE_URL}/person/8-valid-three`,
        `${BASE_URL}/person/9`,
      ],
      'filtering: drops adult/duplicate/invalid entries and falls back to /person/<id> for empty slugs'
    );
  }

  // -------------------------------------------------------------------------
  // Slug parity with buildPersonCanonicalUrl (Brad Pitt -> /person/287-brad-pitt)
  // -------------------------------------------------------------------------
  {
    const result = await runCase(V3_KEY, async url => {
      const page = Number(new URL(url).searchParams.get('page'));
      return page === 1
        ? jsonResponse({ page: 1, results: [person(287, 'Brad Pitt')] })
        : jsonResponse({ page: 2, results: [] });
    });

    assertEquals(
      result.entries.map(entry => entry.loc),
      [`${BASE_URL}/person/287-${slugify('Brad Pitt')}`],
      'slug: uses src/utils/slugify, matching buildPersonCanonicalUrl'
    );
    assertEquals(
      result.entries[0]?.loc,
      `${BASE_URL}/person/287-brad-pitt`,
      'slug: Brad Pitt resolves to /person/287-brad-pitt'
    );
  }

  // -------------------------------------------------------------------------
  // Missing TMDB_API_KEY -> [] with one short warning and no request
  // -------------------------------------------------------------------------
  {
    const result = await runCase(null, async () => {
      throw new Error('fetch must not be called when the key is missing');
    });

    assertEquals(result.entries, [], 'missing key: returns []');
    assert(result.requests.length === 0, 'missing key: performs no TMDB request');
    assert(result.output.length === 1, 'missing key: logs exactly one warning');
    assert(!result.threw, 'missing key: does not throw');
  }

  // -------------------------------------------------------------------------
  // Timeout -> [] via the AbortController
  // -------------------------------------------------------------------------
  {
    const result = await runCase(V3_KEY, (_url, init) => {
      return new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        const fail = () => {
          const error = new Error('The operation was aborted');
          error.name = 'AbortError';
          reject(error);
        };
        if (!signal) {
          fail();
          return;
        }
        if (signal.aborted) {
          fail();
          return;
        }
        signal.addEventListener('abort', fail);
      });
    });

    assertEquals(result.entries, [], 'timeout: returns []');
    assert(result.output.length === 1, 'timeout: logs exactly one warning');
    assert(result.elapsedMs >= 4500, `timeout: aborts near the 5000 ms limit (waited ${result.elapsedMs} ms)`);
    assert(!result.threw, 'timeout: does not throw');
  }

  // -------------------------------------------------------------------------
  // Non-OK response -> [] and page 2 is never requested
  // -------------------------------------------------------------------------
  {
    const result = await runCase(V3_KEY, async () => jsonResponse({}, false, 500));

    assertEquals(result.entries, [], 'non-OK: returns []');
    assert(result.requests.length === 1, 'non-OK: stops after the failing page');
    assert(result.output.length === 1, 'non-OK: logs exactly one warning');
    assert(!result.threw, 'non-OK: does not throw');
  }

  // -------------------------------------------------------------------------
  // Bad JSON -> []
  // -------------------------------------------------------------------------
  {
    const result = await runCase(V3_KEY, async () =>
      ({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON');
        },
      }) as unknown as Response
    );

    assertEquals(result.entries, [], 'bad JSON: returns []');
    assert(result.output.length === 1, 'bad JSON: logs exactly one warning');
    assert(!result.threw, 'bad JSON: does not throw');
  }

  // -------------------------------------------------------------------------
  // Auth: v4 token is sent as a bearer header, no api_key param
  // -------------------------------------------------------------------------
  {
    const result = await runCase(BEARER_KEY, async url => {
      const page = Number(new URL(url).searchParams.get('page'));
      return page === 1
        ? jsonResponse({ page: 1, results: [person(10, 'Bearer Person')] })
        : jsonResponse({ page: 2, results: [] });
    });

    const firstRequest = result.requests[0];
    const headers = (firstRequest?.init?.headers || {}) as Record<string, string>;
    assertEquals(result.entries.length, 1, 'auth bearer: works and returns entries');
    assertEquals(
      headers.Authorization,
      `Bearer ${BEARER_KEY}`,
      'auth bearer: sends the token as an Authorization header'
    );
    assert(
      !new URL(firstRequest.url).searchParams.has('api_key'),
      'auth bearer: omits the api_key query parameter'
    );
  }

  // -------------------------------------------------------------------------
  // Auth: long v3 key (> 50 chars) is also treated as bearer
  // -------------------------------------------------------------------------
  {
    const result = await runCase(LONG_KEY, async url => {
      const page = Number(new URL(url).searchParams.get('page'));
      return page === 1
        ? jsonResponse({ page: 1, results: [person(11, 'Long Key Person')] })
        : jsonResponse({ page: 2, results: [] });
    });

    const headers = (result.requests[0]?.init?.headers || {}) as Record<string, string>;
    assert(
      headers.Authorization === `Bearer ${LONG_KEY}` &&
        !new URL(result.requests[0].url).searchParams.has('api_key'),
      'auth bearer: keys longer than 50 chars use the Authorization header'
    );
  }

  // -------------------------------------------------------------------------
  // Auth: short v3 key is sent as api_key, no Authorization header
  // -------------------------------------------------------------------------
  {
    const result = await runCase(V3_KEY, async url => {
      const page = Number(new URL(url).searchParams.get('page'));
      return page === 1
        ? jsonResponse({ page: 1, results: [person(12, 'Api Key Person')] })
        : jsonResponse({ page: 2, results: [] });
    });

    const firstRequest = result.requests[0];
    const headers = (firstRequest?.init?.headers || {}) as Record<string, string>;
    assertEquals(
      new URL(firstRequest.url).searchParams.get('api_key'),
      V3_KEY,
      'auth api_key: short v3 key is sent as a query parameter'
    );
    assertEquals(
      headers.Authorization,
      undefined,
      'auth api_key: omits the Authorization header'
    );
    assertEquals(result.entries.length, 1, 'auth api_key: works and returns entries');
  }

  // -------------------------------------------------------------------------
  // The API key never appears in console output
  // -------------------------------------------------------------------------
  {
    const failingCases = [
      await runCase(V3_KEY, async () => jsonResponse({}, false, 500)),
      await runCase(V3_KEY, async () =>
        ({
          ok: true,
          status: 200,
          json: async () => {
            throw new SyntaxError('bad json');
          },
        }) as unknown as Response
      ),
      await runCase(V3_KEY, async () => {
        const error = new Error('network down');
        error.name = 'AbortError';
        throw error;
      }),
    ];

    const allOutput = failingCases.flatMap(item => item.output).join('\n');
    assert(
      allOutput.length > 0 && !allOutput.includes(V3_KEY),
      'console output: never contains the API key'
    );
    assert(
      failingCases.every(item => item.output.length === 1 && item.output[0].length > 0),
      'console output: each failure logs exactly one short warning line'
    );
    assert(
      failingCases.every(item => !item.threw),
      'console output: no failure throws'
    );
  }

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
};

runTests().catch(error => {
  console.error('Test runner crashed:', error);
  process.exit(1);
});
