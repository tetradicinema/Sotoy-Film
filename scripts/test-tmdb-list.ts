/**
 * Tests the TMDB list proxy (`api/tmdb.ts`, action "list") for the optional
 * `region` parameter and the movie-only "upcoming" list.
 *
 * `handleTmdbRequest` is called with fake req/res objects and a mocked global
 * `fetch` that records the requested TMDB URL. No network access is performed.
 */

import { handleTmdbRequest } from '../api/tmdb.js';

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

interface FakeResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
}

const createRes = (): FakeResponse => {
  const res: any = {
    statusCode: 0,
    headers: {},
    body: undefined,
    setHeader(name: string, value: string) {
      res.headers[String(name).toLowerCase()] = String(value);
      return res;
    },
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: any) {
      res.body = payload;
      return res;
    },
  };
  return res as FakeResponse;
};

const TMDB_LIST_BODY = {
  dates: { minimum: '2026-11-01', maximum: '2026-12-01' },
  page: 1,
  total_pages: 5,
  total_results: 100,
  results: [
    {
      adult: false,
      id: 101,
      title: 'Alpha',
      original_title: 'Alpha',
      release_date: '2026-11-05',
      poster_path: '/alpha.jpg',
      backdrop_path: '/alpha-backdrop.jpg',
      overview: 'Alpha overview',
      vote_average: 7.1,
      popularity: 500,
    },
    {
      adult: false,
      id: 102,
      title: 'Beta',
      original_title: 'Beta',
      release_date: '2026-11-12',
      poster_path: '/beta.jpg',
      backdrop_path: '/beta-backdrop.jpg',
      overview: 'Beta overview',
      vote_average: 6.2,
      popularity: 400,
    },
  ],
};

let requestedUrls: string[] = [];
const originalFetch = globalThis.fetch;
const originalApiKey = process.env.TMDB_API_KEY;

/** Fake TMDB transport: records the URL and returns a canned list payload. */
const mockFetch = (async (input: any) => {
  requestedUrls.push(String(input));
  return {
    ok: true,
    status: 200,
    json: async () => TMDB_LIST_BODY,
  };
}) as typeof fetch;

const call = async (req: any): Promise<FakeResponse> => {
  requestedUrls = [];
  const res = createRes();
  await handleTmdbRequest(req, res);
  return res;
};

const queryReq = (params: Record<string, string>) => ({
  method: 'GET',
  query: params,
});

const urlReq = (search: string) => ({
  method: 'GET',
  url: `/api/tmdb?${search}`,
});

const parseRequestedUrl = (): URL => {
  assertEquals(requestedUrls.length, 1, 'exactly one TMDB request is made');
  return new URL(requestedUrls[0]);
};

const runTests = async () => {
  console.log('Running TMDB List Proxy Tests...\n');

  process.env.TMDB_API_KEY = 'test-api-key';
  globalThis.fetch = mockFetch;

  // ---------------------------------------------------------------------------
  // now_playing movie without region: must be identical to the old behaviour
  // ---------------------------------------------------------------------------

  {
    const res = await call(
      queryReq({ action: 'list', list: 'now_playing', type: 'movie', page: '1' })
    );
    const url = parseRequestedUrl();

    assertEquals(res.statusCode, 200, 'now_playing movie without region returns 200');
    assertEquals(url.pathname, '/3/movie/now_playing', 'now_playing movie maps to movie/now_playing');
    assert(!url.searchParams.has('region'), 'now_playing movie without region sends no region param');
    assertEquals(
      requestedUrls[0],
      'https://api.themoviedb.org/3/movie/now_playing?api_key=test-api-key&language=en-US&page=1',
      'now_playing movie URL is byte-identical to the pre-region behaviour'
    );
    assert(Array.isArray(res.body), 'success response is a bare array');
    assertEquals(res.body.length, 2, 'bare array keeps every TMDB result');
    assertEquals(res.body[0].media_type, 'movie', 'mapped items carry media_type');
    assertEquals(res.body[1].release_date, '2026-11-12', 'mapped items keep release_date');
    assert(!('dates' in res.body), 'the TMDB dates window is not returned');
    assertEquals(
      res.headers['cache-control'],
      'public, s-maxage=3600, stale-while-revalidate=86400',
      'success response keeps the existing Cache-Control header'
    );
  }

  // ---------------------------------------------------------------------------
  // now_playing movie with region=id -> uppercase ID
  // ---------------------------------------------------------------------------

  {
    const res = await call(
      queryReq({ action: 'list', list: 'now_playing', type: 'movie', page: '1', region: 'id' })
    );
    const url = parseRequestedUrl();

    assertEquals(res.statusCode, 200, 'now_playing movie with region=id returns 200');
    assertEquals(url.pathname, '/3/movie/now_playing', 'region does not change the now_playing endpoint');
    assertEquals(url.searchParams.get('region'), 'ID', 'lowercase region is uppercased before the TMDB call');
  }

  // ---------------------------------------------------------------------------
  // upcoming movie with region=ID
  // ---------------------------------------------------------------------------

  {
    const res = await call(
      queryReq({ action: 'list', list: 'upcoming', type: 'movie', page: '1', region: 'ID' })
    );
    const url = parseRequestedUrl();

    assertEquals(res.statusCode, 200, 'upcoming movie with region=ID returns 200');
    assertEquals(url.pathname, '/3/movie/upcoming', 'upcoming maps to movie/upcoming');
    assertEquals(url.searchParams.get('region'), 'ID', 'upcoming forwards the region param');
    assert(Array.isArray(res.body), 'upcoming success response is a bare array');
  }

  // ---------------------------------------------------------------------------
  // upcoming movie without region
  // ---------------------------------------------------------------------------

  {
    const res = await call(queryReq({ action: 'list', list: 'upcoming', type: 'movie' }));
    const url = parseRequestedUrl();

    assertEquals(res.statusCode, 200, 'upcoming movie without region returns 200');
    assertEquals(url.pathname, '/3/movie/upcoming', 'upcoming endpoint is used without a region');
    assert(!url.searchParams.has('region'), 'upcoming without region sends no region param');
  }

  // ---------------------------------------------------------------------------
  // upcoming tv -> 400 (TMDB has no TV upcoming list)
  // ---------------------------------------------------------------------------

  {
    const res = await call(queryReq({ action: 'list', list: 'upcoming', type: 'tv' }));

    assertEquals(res.statusCode, 400, 'upcoming tv returns 400');
    assert(
      typeof res.body?.error === 'string' && res.body.error.includes('upcoming'),
      'upcoming tv error message mentions the upcoming list'
    );
    assertEquals(requestedUrls.length, 0, 'upcoming tv never calls TMDB');
  }

  // ---------------------------------------------------------------------------
  // invalid region values are ignored (no error)
  // ---------------------------------------------------------------------------

  {
    const res = await call(
      queryReq({ action: 'list', list: 'now_playing', type: 'movie', region: 'XYZ' })
    );
    const url = parseRequestedUrl();

    assertEquals(res.statusCode, 200, 'region=XYZ does not fail the request');
    assert(!url.searchParams.has('region'), 'region=XYZ is ignored');
  }

  {
    const res = await call(queryReq({ action: 'list', list: 'now_playing', type: 'movie', region: '' }));
    const url = parseRequestedUrl();

    assertEquals(res.statusCode, 200, 'empty region does not fail the request');
    assert(!url.searchParams.has('region'), 'empty region is ignored');
  }

  // ---------------------------------------------------------------------------
  // region is ignored for lists other than now_playing/upcoming
  // ---------------------------------------------------------------------------

  {
    await call(queryReq({ action: 'list', list: 'popular', type: 'movie', region: 'ID' }));
    const url = parseRequestedUrl();

    assertEquals(url.pathname, '/3/movie/popular', 'popular keeps its endpoint');
    assert(!url.searchParams.has('region'), 'region is ignored for the popular list');
  }

  {
    await call(queryReq({ action: 'list', list: 'trending', type: 'movie', region: 'ID' }));
    const url = parseRequestedUrl();

    assertEquals(url.pathname, '/3/trending/movie/week', 'trending keeps its endpoint');
    assert(!url.searchParams.has('region'), 'region is ignored for the trending list');
  }

  {
    await call(queryReq({ action: 'list', list: 'now_playing', type: 'tv', region: 'ID' }));
    const url = parseRequestedUrl();

    assertEquals(url.pathname, '/3/tv/on_the_air', 'tv now_playing keeps the on_the_air endpoint');
    assert(!url.searchParams.has('region'), 'region is ignored for tv now_playing');
  }

  // ---------------------------------------------------------------------------
  // invalid list still returns 400 and now advertises upcoming
  // ---------------------------------------------------------------------------

  {
    const res = await call(queryReq({ action: 'list', list: 'nope', type: 'movie' }));

    assertEquals(res.statusCode, 400, 'invalid list still returns 400');
    assert(
      typeof res.body?.error === 'string' && res.body.error.includes('upcoming'),
      'invalid list message now includes upcoming'
    );
    assertEquals(requestedUrls.length, 0, 'invalid list never calls TMDB');
  }

  // ---------------------------------------------------------------------------
  // region is also parsed from the req.url branch
  // ---------------------------------------------------------------------------

  {
    const res = await call(urlReq('action=list&list=upcoming&type=movie&region=id'));
    const url = parseRequestedUrl();

    assertEquals(res.statusCode, 200, 'req.url branch handles the upcoming list');
    assertEquals(url.pathname, '/3/movie/upcoming', 'req.url branch maps upcoming correctly');
    assertEquals(url.searchParams.get('region'), 'ID', 'req.url branch uppercases the region');
  }

  console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) {
    process.exit(1);
  }
};

runTests()
  .catch(error => {
    console.error('[TMDB List Tests] Fatal error:', error);
    process.exit(1);
  })
  .finally(() => {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) {
      delete process.env.TMDB_API_KEY;
    } else {
      process.env.TMDB_API_KEY = originalApiKey;
    }
  });
