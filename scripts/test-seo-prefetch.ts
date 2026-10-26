/**
 * Automated test suite for the SEO prefetch payload and client reader.
 *
 * Usage:
 *   npm run test:seo-prefetch
 */

import {
  FALLBACK_HTML_TEMPLATE,
  PREFETCH_MAX_LENGTH,
  injectPrefetchData,
  injectSeoLists,
  serializePrefetchPayload,
} from '../src/lib/edge/metaInjection.js';
import {
  mapArticleData,
  mapFilmData,
  readSeoLists,
  readSeoPrefetch,
} from '../src/utils/seoPrefetch.js';
import { handleSitemapRequest } from '../api/sitemap.js';

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

function makeDoc(raw: string | null): Document {
  return {
    querySelector: () => (raw === null ? null : { textContent: raw }),
  } as unknown as Document;
}

function extractPrefetchJson(html: string): string | null {
  const match = /<script id="seo-prefetch" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
  return match ? match[1] : null;
}

function extractListsJson(html: string): string | null {
  const match = /<script id="seo-lists" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
  return match ? match[1] : null;
}

function countMatches(html: string, pattern: RegExp): number {
  return (html.match(pattern) || []).length;
}

async function main(): Promise<void> {
  console.log('\n============================================================');
  console.log('🧪 Sotoy Film - SEO Prefetch Payload Test Suite');
  console.log('============================================================\n');

  // --- readSeoPrefetch (client) -------------------------------------------
  check('no script => null', readSeoPrefetch('article', 'dune', makeDoc(null)) === null);

  check(
    'invalid JSON => null',
    readSeoPrefetch('article', 'dune', makeDoc('{not-json')) === null
  );

  const wrongKind = JSON.stringify({
    kind: 'film',
    slug: 'dune',
    data: { title: 'Dune' },
  });
  check(
    'wrong kind => null',
    readSeoPrefetch('article', 'dune', makeDoc(wrongKind)) === null
  );

  const wrongSlug = JSON.stringify({
    kind: 'article',
    slug: 'dune-part-two',
    data: { title: 'Dune' },
  });
  check(
    'wrong slug => null',
    readSeoPrefetch('article', 'dune', makeDoc(wrongSlug)) === null
  );

  const validPayload = JSON.stringify({
    kind: 'article',
    slug: 'dune',
    data: { title: 'Dune', likes: 3 },
  });
  const validData = readSeoPrefetch('article', 'dune', makeDoc(validPayload));
  check(
    'valid payload returns data',
    !!validData && validData.title === 'Dune' && validData.likes === 3
  );

  check(
    'slug comparison is case-sensitive',
    readSeoPrefetch('article', 'Dune', makeDoc(validPayload)) === null
  );

  const encodedSlug = JSON.stringify({
    kind: 'article',
    slug: 'dune%20part%20two',
    data: { title: 'Dune Part Two' },
  });
  check(
    'encoded payload slug is compared decoded',
    readSeoPrefetch('article', 'dune part two', makeDoc(encodedSlug)) !== null
  );

  // --- readSeoLists (client) ----------------------------------------------
  check('no document => readSeoLists null', readSeoLists(null) === null);
  check('missing #seo-lists => null', readSeoLists(makeDoc(null)) === null);
  check('invalid JSON => readSeoLists null', readSeoLists(makeDoc('{not-json')) === null);
  check('non-object payload => readSeoLists null', readSeoLists(makeDoc('[]')) === null);
  check(
    'payload without arrays => readSeoLists null',
    readSeoLists(makeDoc(JSON.stringify({ films: 'nope' }))) === null
  );

  const listsData = readSeoLists(
    makeDoc(
      JSON.stringify({
        films: [{ id: 'film-1' }, null, 'skip'],
        articles: [{ id: 'article-1' }, [], 42],
      })
    )
  );
  check(
    'valid #seo-lists returns filtered films and articles',
    listsData?.films.length === 1 &&
      listsData.films[0].id === 'film-1' &&
      listsData.articles.length === 1 &&
      listsData.articles[0].id === 'article-1'
  );
  check(
    'empty arrays are still a valid #seo-lists payload',
    readSeoLists(makeDoc(JSON.stringify({ films: [], articles: [] }))) !== null
  );

  // --- serializer / injector (edge) ---------------------------------------
  const nastyContent =
    'Before </script><script>alert("x")</script> after & <b>bold</b> \u2028 line \u2029 end';
  const articleData = {
    id: 'article-1',
    slug: 'dune',
    title: 'Dune: Part Two',
    excerpt: 'A sweeping epic.',
    content: nastyContent,
    contentFormat: 'markdown',
    category: 'movies',
    subCategory: 'reviews',
    tags: ['Dune', 'Sci-Fi'],
    likes: 10,
    commentsCount: 2,
    authorId: 'author-1',
    author: {
      id: 'author-1',
      name: 'Raka Pratama',
      avatar: 'https://example.com/avatar.png',
      role: 'penulis_sotoy',
      email: 'private-author@example.com',
    },
    email: 'private@example.com',
    token: 'secret-token',
    adminNotes: 'internal only',
    comments: [{ text: 'private comment' }],
  };

  const articleHtml = injectPrefetchData(FALLBACK_HTML_TEMPLATE, 'article', articleData);
  check(
    'injects <script id="seo-prefetch"> into the HTML',
    articleHtml.includes('<script id="seo-prefetch" type="application/json">')
  );

  const serialized = extractPrefetchJson(articleHtml);
  check('serialized payload can be extracted', serialized !== null);

  if (serialized) {
    check('serialized payload has no raw <', !serialized.includes('<'));
    check('serialized payload has no raw >', !serialized.includes('>'));
    check('serialized payload has no raw </script>', !serialized.toLowerCase().includes('</script>'));
    check('serialized payload has no U+2028', !serialized.includes('\u2028'));
    check('serialized payload has no U+2029', !serialized.includes('\u2029'));

    let parsed: any = null;
    try {
      parsed = JSON.parse(serialized);
    } catch {
      parsed = null;
    }
    check('serialized payload round-trips through JSON.parse', parsed !== null);
    check(
      'round-trip preserves kind, slug, and body content',
      parsed?.kind === 'article' &&
        parsed?.slug === 'dune' &&
        parsed?.data?.content === nastyContent
    );
    check(
      'payload does not contain the author email',
      !serialized.includes('private-author@example.com')
    );
    check(
      'payload does not contain any generic email field',
      !serialized.includes('private@example.com') && !serialized.includes('"email"')
    );
    check(
      'payload strips tokens and admin internals',
      !serialized.includes('secret-token') && !serialized.includes('internal only')
    );
    check(
      'payload strips article comments but keeps commentsCount',
      !serialized.includes('private comment') &&
        parsed?.data?.commentsCount === 2 &&
        parsed?.data?.comments === undefined
    );
    check(
      'payload keeps the public author name',
      parsed?.data?.author?.name === 'Raka Pratama'
    );

    const readBack = readSeoPrefetch('article', 'dune', makeDoc(serialized));
    check('injected payload is readable by readSeoPrefetch', readBack?.title === 'Dune: Part Two');
  }

  // --- #seo-lists injector (edge) -----------------------------------------
  const listFilmData = {
    id: 'film-1',
    slug: 'dune-part-two',
    title: 'Dune: Part Two',
    year: 2024,
    type: 'movie',
    poster: '/poster.png',
    backdrop: '/backdrop.png',
    director: 'Denis Villeneuve',
    genres: ['Sci-Fi', 'Adventure'],
    skorSotoy: 9.1,
    totalVotes: 1200,
    trendingRank: 1,
    email: 'private-list-film@example.com',
    adminNotes: 'secret admin note',
    content: 'SECRET FILM BODY',
    comments: [{ text: 'SECRET FILM COMMENT' }],
    token: 'secret-token',
  };
  const listArticleData = {
    id: 'article-1',
    slug: 'dune-review',
    title: 'Dune Review',
    status: 'published',
    excerpt: 'A sweeping epic.',
    coverImage: '/cover.jpg',
    category: 'movies',
    tags: ['Dune'],
    likes: 10,
    commentsCount: 3,
    author: { name: 'Raka Pratama', avatar: '/raka.jpg', email: 'private-list-author@example.com' },
    authorId: 'author-1',
    content: 'SECRET ARTICLE BODY',
    contentJson: '{"type":"doc","content":[]}',
    comments: [{ text: 'SECRET ARTICLE COMMENT' }],
    email: 'private-list@example.com',
    adminNotes: 'secret admin note',
    token: 'secret-token',
  };

  const listsHtml = injectSeoLists(FALLBACK_HTML_TEMPLATE, {
    films: [listFilmData],
    articles: [listArticleData],
  });
  check(
    '#seo-lists injector embeds the script tag',
    listsHtml.includes('<script id="seo-lists" type="application/json">')
  );

  const listsJson = extractListsJson(listsHtml);
  let listsParsed: any = null;
  try {
    listsParsed = listsJson ? JSON.parse(listsJson) : null;
  } catch {
    listsParsed = null;
  }
  check('#seo-lists payload round-trips through JSON.parse', listsParsed !== null);
  check(
    '#seo-lists keeps public film and article fields',
    listsParsed?.films?.[0]?.title === 'Dune: Part Two' &&
      listsParsed?.films?.[0]?.genres?.length === 2 &&
      listsParsed?.articles?.[0]?.title === 'Dune Review' &&
      listsParsed?.articles?.[0]?.commentsCount === 3 &&
      listsParsed?.articles?.[0]?.author?.name === 'Raka Pratama'
  );
  check(
    '#seo-lists strips article bodies, JSON content, comments, emails, admin fields and tokens',
    !!listsJson &&
      !listsJson.includes('SECRET ARTICLE BODY') &&
      !listsJson.includes('SECRET ARTICLE COMMENT') &&
      !listsJson.includes('SECRET FILM BODY') &&
      !listsJson.includes('SECRET FILM COMMENT') &&
      !listsJson.includes('private-list-author@example.com') &&
      !listsJson.includes('private-list-film@example.com') &&
      !listsJson.includes('private-list@example.com') &&
      !listsJson.includes('secret admin note') &&
      !listsJson.includes('secret-token') &&
      !/"content"\s*:/.test(listsJson) &&
      !/"contentJson"\s*:/.test(listsJson) &&
      !/"comments"\s*:/.test(listsJson)
  );
  check(
    '#seo-lists payload is readable by readSeoLists',
    readSeoLists(makeDoc(listsJson || ''))?.articles?.[0]?.slug === 'dune-review'
  );

  const replacedListsHtml = injectSeoLists(listsHtml, {
    films: [{ id: 'film-2', slug: 'arrival', title: 'Arrival' }],
    articles: [],
  });
  check(
    '#seo-lists injector replaces an existing payload instead of duplicating it',
    countMatches(replacedListsHtml, /<script\s+id=["']seo-lists["']/gi) === 1 &&
      !!extractListsJson(replacedListsHtml)?.includes('Arrival') &&
      !extractListsJson(replacedListsHtml)?.includes('Dune Review')
  );

  const emptyListsHtml = injectSeoLists(FALLBACK_HTML_TEMPLATE, { films: [], articles: [] });
  check(
    '#seo-lists injector skips empty payloads',
    !emptyListsHtml.includes('id="seo-lists"')
  );

  const filmData = {
    id: 'film-1',
    slug: 'dune-part-two',
    title: 'Dune: Part Two',
    year: 2024,
    type: 'movie',
    synopsis: 'Paul Atreides unites with the Fremen.',
    poster: '/poster.png',
    director: 'Denis Villeneuve',
    cast: ['Timothée Chalamet'],
    genres: ['Sci-Fi', 'Adventure'],
    skorSotoy: 9.1,
    totalVotes: 1200,
    criticsSkorSotoy: 9.4,
    whereToWatch: [{ platform: 'Netflix', type: 'stream', badgeColor: '#E50914' }],
    author: { name: 'Admin', email: 'admin@example.com' },
  };
  const filmHtml = injectPrefetchData(FALLBACK_HTML_TEMPLATE, 'film', filmData);
  const filmSerialized = extractPrefetchJson(filmHtml);
  const filmParsed = filmSerialized ? JSON.parse(filmSerialized) : null;
  check(
    'film payload has kind=film and the requested slug',
    filmParsed?.kind === 'film' && filmParsed?.slug === 'dune-part-two'
  );
  check(
    'film payload strips nested emails',
    !!filmSerialized && !filmSerialized.includes('admin@example.com')
  );

  // --- size cap -----------------------------------------------------------
  const hugeContent = 'x'.repeat(PREFETCH_MAX_LENGTH * 2);
  const hugeHtml = injectPrefetchData(FALLBACK_HTML_TEMPLATE, 'article', {
    ...articleData,
    content: hugeContent,
    contentJson: undefined,
    contentFormat: 'markdown',
  });
  const hugeSerialized = extractPrefetchJson(hugeHtml);
  check(
    'oversized article body is trimmed below the 200 KB cap',
    !!hugeSerialized && hugeSerialized.length <= PREFETCH_MAX_LENGTH
  );

  let hugeParsed: any = null;
  try {
    hugeParsed = hugeSerialized ? JSON.parse(hugeSerialized) : null;
  } catch {
    hugeParsed = null;
  }
  check(
    'trimmed oversized payload is still valid JSON with a shorter body',
    hugeParsed !== null &&
      typeof hugeParsed.data?.content === 'string' &&
      hugeParsed.data.content.length < hugeContent.length
  );

  // --- safe defaults for the detail pages ---------------------------------
  const minimalArticle = mapArticleData({ title: 'Sparse Article' }, 'sparse-article');
  check(
    'article mapping fills array/count/author defaults',
    Array.isArray(minimalArticle.tags) &&
      minimalArticle.tags.length === 0 &&
      minimalArticle.likes === 0 &&
      minimalArticle.commentsCount === 0 &&
      minimalArticle.author.name === 'Tim Redaksi' &&
      minimalArticle.author.avatar.length > 0
  );

  const minimalFilm = mapFilmData({ title: 'Sparse Film' }, 'sparse-film');
  check(
    'film mapping fills array/count/score defaults',
    Array.isArray(minimalFilm.genres) &&
      minimalFilm.genres.length === 0 &&
      Array.isArray(minimalFilm.cast) &&
      minimalFilm.cast.length === 0 &&
      Array.isArray(minimalFilm.whereToWatch) &&
      minimalFilm.whereToWatch.length === 0 &&
      minimalFilm.skorSotoy === 0 &&
      minimalFilm.totalVotes === 0
  );

  const similar = serializePrefetchPayload({ kind: 'film', slug: 'x', data: { text: '<>&\u2028\u2029' } });
  check(
    'serializer escapes <, >, &, U+2028 and U+2029',
    !similar.includes('<') &&
      !similar.includes('>') &&
      !similar.includes('&') &&
      !similar.includes('\u2028') &&
      !similar.includes('\u2029')
  );
  check(
    'escaped serializer output parses back to the original text',
    JSON.parse(similar).data.text === '<>&\u2028\u2029'
  );

  await runSitemapChecks();

  const failed = checks.filter(item => !item.ok).length;
  console.log('\n============================================================');
  console.log(`📊 Summary: ${checks.length - failed} Passed, ${failed} Failed`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

async function runSitemapChecks(): Promise<void> {
  console.log('\n--- Sitemap payload assertions ---\n');

  const capturedQueries: any[] = [];
  const realFetch = globalThis.fetch;

  const typedDoc = (collection: string, id: string, fields: Record<string, any>) => ({
    document: {
      name: `projects/test/databases/test/documents/${collection}/${id}`,
      fields,
    },
  });

  const queryResults: Record<string, any[]> = {
    articles: [
      typedDoc('articles', 'article-no-date', {
        slug: { stringValue: 'article-no-date' },
        title: { stringValue: 'No Date Article' },
        status: { stringValue: 'published' },
        excerpt: { stringValue: 'No dates on this one.' },
      }),
      typedDoc('articles', 'article-dated', {
        slug: { stringValue: 'article-dated' },
        title: { stringValue: 'Dated Article' },
        status: { stringValue: 'published' },
        updatedAt: { stringValue: '2026-10-21T08:00:00.000Z' },
      }),
      typedDoc('articles', 'draft-article', {
        slug: { stringValue: 'draft-article' },
        title: { stringValue: 'Draft Article' },
        status: { stringValue: 'draft' },
      }),
    ],
    films: [
      typedDoc('films', 'film-no-date', {
        slug: { stringValue: 'film-no-date' },
        title: { stringValue: 'No Date Film' },
      }),
      typedDoc('films', 'film-dated', {
        slug: { stringValue: 'film-dated' },
        title: { stringValue: 'Dated Film' },
        updatedAt: { stringValue: '2026-10-22T08:00:00.000Z' },
      }),
    ],
  };

  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const urlStr = url.toString();
    if (!urlStr.includes(':runQuery')) {
      return new Response(JSON.stringify({}), { status: 200 });
    }

    const body = init?.body ? JSON.parse(String(init.body)) : {};
    capturedQueries.push(body);
    const collectionId = body?.structuredQuery?.from?.[0]?.collectionId;

    return new Response(JSON.stringify(queryResults[collectionId] || []), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  const makeRes = () => {
    const state = { status: 0, body: '', headers: {} as Record<string, string> };
    const res: any = {
      setHeader: (name: string, value: string) => {
        state.headers[name.toLowerCase()] = value;
      },
      status: (code: number) => {
        state.status = code;
        return res;
      },
      send: (payload: string) => {
        state.body = payload;
        return res;
      },
      writeHead: (code: number) => {
        state.status = code;
        return res;
      },
      end: (payload: string) => {
        state.body = payload;
        return res;
      },
    };
    return { res, state };
  };

  const findUrlBlock = (xml: string, loc: string): string => {
    const block = xml
      .split('<url>')
      .slice(1)
      .find(part => part.includes(`<loc>${loc}</loc>`));
    return block ? `<url>${block}` : '';
  };

  try {
    const xmlRun = makeRes();
    await handleSitemapRequest({ url: '/api/sitemap', query: {} }, xmlRun.res);
    const xml = xmlRun.state.body;

    check(
      'sitemap responds 200 with XML',
      xmlRun.state.status === 200 &&
        (xmlRun.state.headers['content-type'] || '').includes('application/xml')
    );
    check(
      'sitemap uses the long cache header',
      xmlRun.state.headers['cache-control'] ===
        'public, s-maxage=3600, stale-while-revalidate=86400'
    );
    check('sitemap fetches articles and films in one pass', capturedQueries.length === 2);

    const expectedFields = [
      'id',
      'slug',
      'title',
      'status',
      'scheduledAt',
      'updatedAt',
      'publishedAt',
      'createdAt',
      'excerpt',
    ];
    const selectedFieldSets = capturedQueries.map(query =>
      (query?.structuredQuery?.select?.fields || []).map((field: any) => field.fieldPath)
    );

    check(
      'sitemap selects only the URL/date fields',
      selectedFieldSets.length > 0 &&
        selectedFieldSets.every(
          (fields: string[]) =>
            fields.length === expectedFields.length &&
            expectedFields.every(field => fields.includes(field))
        )
    );
    check(
      'sitemap select omits content, comments, author, email and token fields',
      selectedFieldSets.every((fields: string[]) =>
        fields.every(
          field =>
            ![
              'content',
              'contentJson',
              'comments',
              'author',
              'email',
              'token',
              'adminNotes',
            ].includes(field)
        )
      )
    );

    const articleNoDate = findUrlBlock(
      xml,
      'https://www.sotoyfilm.my.id/artikel/article-no-date'
    );
    const filmNoDate = findUrlBlock(xml, 'https://www.sotoyfilm.my.id/film/film-no-date');

    check(
      'article without dates omits <lastmod>',
      articleNoDate.length > 0 && !articleNoDate.includes('<lastmod>')
    );
    check(
      'film without dates omits <lastmod>',
      filmNoDate.length > 0 && !filmNoDate.includes('<lastmod>')
    );

    const today = new Date().toISOString().split('T')[0];
    check(
      "sitemap never stamps today's date on undated entries",
      !articleNoDate.includes(today) && !filmNoDate.includes(today)
    );

    check(
      'article with updatedAt keeps the real date',
      findUrlBlock(xml, 'https://www.sotoyfilm.my.id/artikel/article-dated').includes(
        '<lastmod>2026-10-21</lastmod>'
      )
    );
    check(
      'film with updatedAt keeps the real date',
      findUrlBlock(xml, 'https://www.sotoyfilm.my.id/film/film-dated').includes(
        '<lastmod>2026-10-22</lastmod>'
      )
    );
    check('draft articles stay out of the sitemap', !xml.includes('/artikel/draft-article'));
    check(
      'static pages keep their stable lastmod',
      findUrlBlock(xml, 'https://www.sotoyfilm.my.id/').includes(
        '<lastmod>2026-10-25</lastmod>'
      )
    );

    const csvRun = makeRes();
    await handleSitemapRequest(
      { url: '/api/sitemap?format=csv', query: { format: 'csv' } },
      csvRun.res
    );
    const csv = csvRun.state.body;

    check(
      'sitemap CSV leaves lastmod empty when absent',
      csv.includes(
        'https://www.sotoyfilm.my.id/artikel/article-no-date,No Date Article,No dates on this one.,Artikel,,0.8'
      )
    );
    check(
      'sitemap CSV keeps real dates',
      csv.includes(
        'https://www.sotoyfilm.my.id/artikel/article-dated,Dated Article,,Artikel,2026-10-21,0.8'
      )
    );
  } finally {
    globalThis.fetch = realFetch;
  }
}

main().catch(error => {
  console.error('❌ SEO prefetch test suite failed unexpectedly:', error);
  process.exit(1);
});
