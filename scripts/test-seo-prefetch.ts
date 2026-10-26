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
  serializePrefetchPayload,
} from '../src/lib/edge/metaInjection.js';
import {
  mapArticleData,
  mapFilmData,
  readSeoPrefetch,
} from '../src/utils/seoPrefetch.js';

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

function main(): void {
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

  const failed = checks.filter(item => !item.ok).length;
  console.log('\n============================================================');
  console.log(`📊 Summary: ${checks.length - failed} Passed, ${failed} Failed`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main();
