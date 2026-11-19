/**
 * Automated test suite for the SEO prefetch payload and client reader.
 *
 * Usage:
 *   npm run test:seo-prefetch
 */

import {
  FALLBACK_HTML_TEMPLATE,
  PREFETCH_MAX_LENGTH,
  buildFilmBodyHtml,
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
import {
  clearSeoListsCache,
  fetchListCollectionDocuments,
  shouldKeepSeoList,
  shouldSkipLoadingFlag,
} from '../src/lib/edge/firestoreRest.js';
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

  // --- shouldSkipLoadingFlag ----------------------------------------------
  check(
    'shouldSkipLoadingFlag is false for null lists',
    shouldSkipLoadingFlag(null, 'articles') === false &&
      shouldSkipLoadingFlag(null, 'films') === false
  );
  check(
    'shouldSkipLoadingFlag is false for empty lists',
    shouldSkipLoadingFlag({ films: [], articles: [] }, 'articles') === false &&
      shouldSkipLoadingFlag({ films: [], articles: [] }, 'films') === false
  );

  const articleOnlyLists = { films: [], articles: [{ id: 'article-1' }] };
  check(
    'shouldSkipLoadingFlag is true for a non-empty articles list',
    shouldSkipLoadingFlag(articleOnlyLists, 'articles') === true
  );
  check(
    'shouldSkipLoadingFlag does not skip films when only articles are present',
    shouldSkipLoadingFlag(articleOnlyLists, 'films') === false
  );

  const filmOnlyLists = { films: [{ id: 'film-1' }], articles: [] };
  check(
    'shouldSkipLoadingFlag is true for a non-empty films list',
    shouldSkipLoadingFlag(filmOnlyLists, 'films') === true
  );
  check(
    'shouldSkipLoadingFlag does not skip articles when only films are present',
    shouldSkipLoadingFlag(filmOnlyLists, 'articles') === false
  );

  // --- shouldKeepSeoList ---------------------------------------------------
  const bothLists = { films: [{ id: 'film-1' }], articles: [{ id: 'article-1' }] };

  check(
    'shouldKeepSeoList is false for null lists',
    shouldKeepSeoList(null, 'films', 0) === false &&
      shouldKeepSeoList(null, 'articles', 0) === false
  );
  check(
    'shouldKeepSeoList keeps hydrated lists when the fetched count is zero',
    shouldKeepSeoList(bothLists, 'films', 0) === true &&
      shouldKeepSeoList(bothLists, 'articles', 0) === true
  );
  check(
    'shouldKeepSeoList is false when Firestore returned documents',
    shouldKeepSeoList(bothLists, 'films', 300) === false &&
      shouldKeepSeoList(bothLists, 'articles', 1) === false
  );
  check(
    'shouldKeepSeoList is false when that kind has an empty hydrated list',
    shouldKeepSeoList(articleOnlyLists, 'films', 0) === false &&
      shouldKeepSeoList(filmOnlyLists, 'articles', 0) === false
  );
  check(
    'shouldKeepSeoList evaluates films and articles independently',
    shouldKeepSeoList(articleOnlyLists, 'articles', 0) === true &&
      shouldKeepSeoList(filmOnlyLists, 'films', 0) === true &&
      shouldKeepSeoList(articleOnlyLists, 'films', 0) === false &&
      shouldKeepSeoList(filmOnlyLists, 'articles', 0) === false
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

  // --- bot-facing film body (buildFilmBodyHtml) -----------------------------
  // The raw stored skorSotoy is NOT what the app displays: legacy docs
  // (scoreScale undefined, 0 < stored <= 5.0) are displayed doubled. The bot
  // HTML must match the app, never print "0", and never print a vote count
  // without real evidence (> 1).
  const bodyOf = (data: Record<string, any>): string => buildFilmBodyHtml(data);
  const containsScore = (html: string, expected: string): boolean =>
    html.includes(`Skor Sotoy ${expected}/10`);
  const scoreTexts = (html: string): string[] =>
    [...html.matchAll(/Skor Sotoy ([0-9.]+)\/10/g)].map(match => match[1]);
  const voteTexts = (html: string): string[] =>
    [...html.matchAll(/(\d+) votes/g)].map(match => match[1]);

  check(
    'film body: legacy stored 4.6 (no scoreScale) is doubled to 9.2',
    containsScore(bodyOf({ title: 'F', skorSotoy: 4.6 }), '9.2')
  );
  check(
    'film body: stored 4.6 with scoreScale 10 stays 4.6',
    containsScore(bodyOf({ title: 'F', skorSotoy: 4.6, scoreScale: 10 }), '4.6')
  );
  check(
    'film body: stored 8 (legacy) is not doubled -> 8.0',
    containsScore(bodyOf({ title: 'F', skorSotoy: 8 }), '8.0')
  );
  check(
    'film body: legacy stored 5.0 boundary doubles to 10.0',
    containsScore(bodyOf({ title: 'F', skorSotoy: 5.0 }), '10.0')
  );
  check(
    'film body: legacy stored 5.1 does not double -> 5.1',
    containsScore(bodyOf({ title: 'F', skorSotoy: 5.1 }), '5.1')
  );
  check(
    'film body: stored 0 prints no score text at all',
    bodyOf({ title: 'F', skorSotoy: 0 }).includes('Skor Sotoy') === false &&
      bodyOf({ title: 'F', skorSotoy: 0, totalVotes: 0 }).includes('votes') === false
  );
  check(
    'film body: totalVotes 0 and 1 never print a vote count',
    bodyOf({ title: 'F', totalVotes: 0 }).includes('votes') === false &&
      bodyOf({ title: 'F', totalVotes: 1 }).includes('votes') === false
  );
  check(
    'film body: totalVotes 5 prints "5 votes"',
    voteTexts(bodyOf({ title: 'F', totalVotes: 5 })).join(',') === '5'
  );
  check(
    'film body: totalVotes 1 with a real score shows the score but no votes',
    containsScore(bodyOf({ title: 'F', skorSotoy: 8, totalVotes: 1 }), '8.0') &&
      bodyOf({ title: 'F', skorSotoy: 8, totalVotes: 1 }).includes('votes') === false
  );
  check(
    'film body: totalVotes 3.9 is floored to 3 votes',
    voteTexts(bodyOf({ title: 'F', totalVotes: 3.9 })).join(',') === '3'
  );
  check(
    'film body: non-numeric skorSotoy and null totalVotes print nothing',
    (() => {
      const html = bodyOf({ skorSotoy: 'x', totalVotes: null });
      return scoreTexts(html).length === 0 && voteTexts(html).length === 0;
    })()
  );
  check(
    'film body: missing score/vote fields do not throw and still build a body',
    (() => {
      let html = '';
      try {
        html = bodyOf({ title: 'Only Title' });
      } catch {
        return false;
      }
      return html.startsWith('<article>') &&
        html.includes('<h1>Only Title</h1>') &&
        scoreTexts(html).length === 0 &&
        voteTexts(html).length === 0;
    })()
  );
  check('film body: null data returns an empty string', bodyOf(null as any) === '');
  check('film body: non-object data returns an empty string', bodyOf('nope' as any) === '');
  check(
    'film body: legacy score + votes renders both in one line',
    bodyOf({ title: 'F', skorSotoy: 4.6, totalVotes: 5 }).includes('Skor Sotoy 9.2/10 · 5 votes')
  );

  // --- enriched bot film body (real, non-fabricated fields) -------------------
  // New lines go AFTER Duration and BEFORE the Skor Sotoy line, in this exact
  // order: Original title, Writer, Studio, Where to watch, curator note.
  const whereEntry = (platform: string, type: string) => ({ platform, type, badgeColor: '#000', source: 'x' });
  const richData: Record<string, any> = {
    title: 'Rich Film',
    year: 2024,
    synopsis: 'A synopsis.',
    director: 'Ada Dirigen',
    castDetails: [{ name: 'Player One' }],
    genres: ['Drama'],
    duration: '120 min',
    originalTitle: 'Original Rich Film',
    writer: 'Penulis Satu',
    studio: 'Studio Gambar',
    whereToWatch: [whereEntry('Netflix', 'stream'), whereEntry('Vidio', 'rent')],
    curatorNote: 'Catatan kurator.',
    skorSotoy: 8,
  };
  const richHtml = bodyOf(richData);
  const paragraphTexts = (html: string): string[] =>
    [...html.matchAll(/<p>(.*?)<\/p>/g)].map(match => match[1]);

  check(
    'film body (rich): every new field is printed',
    richHtml.includes('<p>Original title: Original Rich Film</p>') &&
      richHtml.includes('<p>Writer: Penulis Satu</p>') &&
      richHtml.includes('<p>Studio: Studio Gambar</p>') &&
      richHtml.includes('<p>Where to watch: Netflix (stream), Vidio (rent)</p>') &&
      richHtml.includes('<p>Catatan kurator.</p>')
  );

  check(
    'film body (rich): line order is h1, synopsis, Director, Cast, Genres, Duration, Original title, Writer, Studio, Where to watch, curator note, score',
    (() => {
      const paragraphs = paragraphTexts(richHtml);
      const expected = [
        'A synopsis.',
        'Director: Ada Dirigen',
        'Cast: Player One',
        'Genres: Drama',
        'Duration: 120 min',
        'Original title: Original Rich Film',
        'Writer: Penulis Satu',
        'Studio: Studio Gambar',
        'Where to watch: Netflix (stream), Vidio (rent)',
        'Catatan kurator.',
        'Skor Sotoy 8.0/10',
      ];
      return (
        paragraphs.length === expected.length &&
        expected.every((text, index) => paragraphs[index] === escapeCheck(text))
      );
      function escapeCheck(text: string): string {
        return text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }
    })()
  );

  // Each field missing individually -> no label, no empty <p>.
  const base = { title: 'F', synopsis: 'S', director: 'D' };
  check(
    'film body: missing originalTitle prints no label',
    !bodyOf(base).includes('Original title')
  );
  check(
    'film body: originalTitle equal to title (case-insensitive) is omitted',
    (() => {
      const html = bodyOf({ title: 'Same Title', originalTitle: '  same title  ' });
      return !html.includes('Original title');
    })()
  );
  check(
    'film body: originalTitle differing only in case from title is omitted, real difference is printed',
    bodyOf({ title: 'FILM X', originalTitle: 'film x' }).includes('Original title') === false &&
      bodyOf({ title: 'Film X', originalTitle: 'Judul Lain' }).includes('<p>Original title: Judul Lain</p>')
  );
  check(
    'film body: missing writer/studio/whereToWatch/curatorNote print no labels',
    (() => {
      const html = bodyOf(base);
      return (
        !html.includes('Writer:') &&
        !html.includes('Studio:') &&
        !html.includes('Where to watch:') &&
        !html.includes('Original title:')
      );
    })()
  );

  check(
    'film body: empty-string writer/studio/curatorNote print nothing',
    (() => {
      const html = bodyOf({ title: 'F', writer: '', studio: '', curatorNote: '' });
      return !html.includes('Writer:') && !html.includes('Studio:') && paragraphTexts(html).length === 0;
    })()
  );

  check(
    'film body: non-string writer/studio/curatorNote (numbers/objects) print nothing',
    (() => {
      const html = bodyOf({ title: 'F', writer: 42, studio: { a: 1 }, curatorNote: true });
      return !html.includes('Writer:') && !html.includes('Studio:') && !html.includes('object Object');
    })()
  );

  // whereToWatch: dedupe, unknown type, missing platform, > 8 entries.
  check(
    'film body: whereToWatch dedupes by platform+type (case-insensitive)',
    bodyOf({
      title: 'F',
      whereToWatch: [
        whereEntry('Netflix', 'stream'),
        whereEntry('netflix', 'stream'),
        whereEntry('Netflix', 'Stream'),
        whereEntry('Netflix', 'rent'),
      ],
    }).includes('<p>Where to watch: Netflix (stream), Netflix (rent)</p>')
  );
  check(
    'film body: whereToWatch unknown types show no parenthetical',
    bodyOf({
      title: 'F',
      whereToWatch: [whereEntry('Cinemaxx', 'theatrical'), whereEntry('Viu', 'stream')],
    }).includes('<p>Where to watch: Cinemaxx, Viu (stream)</p>')
  );
  check(
    'film body: whereToWatch skips entries without a usable platform',
    bodyOf({
      title: 'F',
      whereToWatch: [whereEntry('  ', 'stream'), { type: 'stream' }, null, 'Netflix', whereEntry('Viu', 'buy')],
    }).includes('<p>Where to watch: Viu (buy)</p>')
  );
  check(
    'film body: whereToWatch prints at most 8 unique entries',
    (() => {
      const platforms = Array.from({ length: 11 }, (_, i) => `Platform${i + 1}`);
      const html = bodyOf({ title: 'F', whereToWatch: platforms.map(p => whereEntry(p, 'stream')) });
      const text = html.match(/<p>Where to watch: (.*?)<\/p>/)?.[1] || '';
      return text.split(', ').length === 8 && text.startsWith('Platform1 (stream)') && text.includes('Platform8') && !text.includes('Platform9');
    })()
  );
  check(
    'film body: malformed whereToWatch (not array / null) prints nothing and does not throw',
    (() => {
      try {
        return (
          !bodyOf({ title: 'F', whereToWatch: 'nope' }).includes('Where to watch') &&
          !bodyOf({ title: 'F', whereToWatch: null }).includes('Where to watch')
        );
      } catch {
        return false;
      }
    })()
  );
  check(
    'film body: whereToWatch entries without type still print the platform name',
    bodyOf({ title: 'F', whereToWatch: [{ platform: 'OnlyPlatform' }] }).includes(
      '<p>Where to watch: OnlyPlatform</p>'
    )
  );

  // curatorNote truncation at a word boundary. Words are 10 chars each, so a
  // mid-word cut would end with a fragment that is not any complete word.
  const noteWords = ['abcdefghij', 'klmnopqrst', 'uvwxyzabcd'];
  const longNote = `${Array.from({ length: 20 }, () => noteWords.join(' ')).join(' ')}`;
  check(
    'film body: long curatorNote is truncated to <= 600 chars at a word boundary with a plain ellipsis',
    (() => {
      const text = paragraphTexts(bodyOf({ title: 'F', curatorNote: longNote }))[0] || '';
      const before = text.slice(0, -3);
      return (
        text.endsWith('...') &&
        before.length <= 600 &&
        before.split(' ').every(word => (noteWords as string[]).includes(word))
      );
    })()
  );
  check(
    'film body: curatorNote exactly at the limit is not truncated',
    (() => {
      const note = 'a'.repeat(600);
      const text = paragraphTexts(bodyOf({ title: 'F', curatorNote: note }))[0] || '';
      return text === note;
    })()
  );
  check(
    'film body: 601-char curatorNote truncates and keeps whole words',
    (() => {
      const note = `${'a'.repeat(598)} bcde`;
      const text = paragraphTexts(bodyOf({ title: 'F', curatorNote: note }))[0] || '';
      return text === `${'a'.repeat(598)}...`;
    })()
  );

  // HTML escaping in every new field.
  check(
    'film body: HTML-special characters are escaped in the new fields',
    (() => {
      const evil = '<b>&"\'</b>';
      const html = bodyOf({
        title: 'F',
        originalTitle: `Orig ${evil}`,
        writer: `W ${evil}`,
        studio: `S ${evil}`,
        whereToWatch: [whereEntry(`P ${evil}`, 'stream')],
        curatorNote: `N ${evil}`,
      });
      return (
        !html.includes('<b>') &&
        !html.includes('&"') &&
        html.includes('<p>Original title: Orig &lt;b&gt;&amp;&quot;&#039;&lt;/b&gt;</p>') &&
        html.includes('<p>Writer: W &lt;b&gt;&amp;&quot;&#039;&lt;/b&gt;</p>') &&
        html.includes('<p>Studio: S &lt;b&gt;&amp;&quot;&#039;&lt;/b&gt;</p>') &&
        html.includes('<p>Where to watch: P &lt;b&gt;&amp;&quot;&#039;&lt;/b&gt; (stream)</p>') &&
        html.includes('<p>N &lt;b&gt;&amp;&quot;&#039;&lt;/b&gt;</p>')
      );
    })()
  );

  await runListPageChecks();
  await runSitemapChecks();

  const failed = checks.filter(item => !item.ok).length;
  console.log('\n============================================================');
  console.log(`📊 Summary: ${checks.length - failed} Passed, ${failed} Failed`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

interface CapturedListRequest {
  url: string;
  method: string;
  body: any;
}

async function runListPageChecks(): Promise<void> {
  console.log('\n--- List pagination assertions ---\n');

  const realFetch = globalThis.fetch;

  const jsonResults = (results: any[]) =>
    new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

  const filmResultPage = (prefix: string, count: number) => {
    const results: any[] = [];
    for (let i = 1; i <= count; i++) {
      const id = `${prefix}-${i}`;
      results.push({
        document: {
          name: `projects/test/databases/test/documents/films/${id}`,
          fields: {
            id: { stringValue: id },
            slug: { stringValue: id },
            title: { stringValue: `Film ${id}` },
          },
        },
      });
    }
    // runQuery always ends with a read-time-only entry; it must be ignored.
    results.push({ readTime: '2026-10-26T00:00:00.000Z' });
    return results;
  };

  const installRunQueryMock = (
    handler: (request: CapturedListRequest) => Response
  ): CapturedListRequest[] => {
    const requests: CapturedListRequest[] = [];
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      const request: CapturedListRequest = {
        url: url.toString(),
        method: init?.method || 'GET',
        body,
      };
      requests.push(request);
      return handler(request);
    }) as typeof fetch;
    return requests;
  };

  const selectedFieldPaths = (body: any): string[] =>
    (body?.structuredQuery?.select?.fields || []).map((field: any) => field.fieldPath);

  const forbiddenFields = ['content', 'contentJson', 'comments'];

  const isRunQueryRequest = (request: CapturedListRequest): boolean =>
    request.method === 'POST' && request.url.includes(':runQuery');

  try {
    // Films page with offsets 0/300/600 and stop after three full pages.
    {
      clearSeoListsCache();
      const requests = installRunQueryMock(request => {
        const offset = request.body?.structuredQuery?.offset ?? 0;
        if (offset === 0) return jsonResults(filmResultPage('p1', 300));
        if (offset === 300) return jsonResults(filmResultPage('p2', 300));
        return jsonResults(filmResultPage('p3', 300));
      });

      const films = await fetchListCollectionDocuments('films');

      check(
        'films use POST runQuery with offsets 0/300/600 and stop after 3 pages',
        films?.length === 900 &&
          requests.length === 3 &&
          requests.every(isRunQueryRequest) &&
          requests[0].body?.structuredQuery?.offset === 0 &&
          requests[1].body?.structuredQuery?.offset === 300 &&
          requests[2].body?.structuredQuery?.offset === 600 &&
          requests.every(
            request => request.body?.structuredQuery?.limit === 300
          ) &&
          films[0].id === 'p1-1' &&
          films[299].id === 'p1-300' &&
          films[300].id === 'p2-1' &&
          films[899].id === 'p3-300'
      );
      check(
        'film runQuery ignores the readTime-only result entry',
        films?.every((film: any) => typeof film.id === 'string') === true
      );
      check(
        'film runQuery selects list fields and never content, contentJson or comments',
        requests.every(request => {
          const fields = selectedFieldPaths(request.body);
          return (
            requests[0].body?.structuredQuery?.from?.[0]?.collectionId === 'films' &&
            fields.includes('id') &&
            fields.includes('title') &&
            fields.includes('poster') &&
            fields.includes('genres') &&
            forbiddenFields.every(field => !fields.includes(field)) &&
            forbiddenFields.every(
              field => !JSON.stringify(request.body).includes(`"${field}"`)
            )
          );
        })
      );
    }

    // A short page means there is nothing left to page through.
    {
      clearSeoListsCache();
      const requests = installRunQueryMock(request => {
        const offset = request.body?.structuredQuery?.offset ?? 0;
        return jsonResults(
          offset === 0 ? filmResultPage('short-a', 300) : filmResultPage('short-b', 10)
        );
      });

      const films = await fetchListCollectionDocuments('films');

      check(
        'films stop early when a page returns fewer than 300 documents',
        requests.length === 2 &&
          requests[1].body?.structuredQuery?.offset === 300 &&
          films?.length === 310 &&
          films[309].id === 'short-b-10'
      );
    }

    // A failure on page 2 returns the first page instead of throwing/losing it.
    {
      clearSeoListsCache();
      const realWarn = console.warn;
      const warnings: string[] = [];
      console.warn = (...args: any[]) => {
        warnings.push(args.map(String).join(' '));
      };
      try {
        const requests = installRunQueryMock(request => {
          const offset = request.body?.structuredQuery?.offset ?? 0;
          if (offset === 0) return jsonResults(filmResultPage('kept', 300));
          return new Response(JSON.stringify({ error: { code: 503 } }), { status: 503 });
        });

        const films = await fetchListCollectionDocuments('films');

        check(
          'a failed second film request keeps the collected documents',
          films?.length === 300 &&
            films[0].id === 'kept-1' &&
            films[299].id === 'kept-300' &&
            requests.length === 2
        );
        check(
          'a failed film request warns with the collection name and status only',
          warnings.length === 1 &&
            warnings[0].includes('films') &&
            warnings[0].includes('503') &&
            !warnings[0].includes('key=') &&
            !warnings[0].includes('http')
        );
      } finally {
        console.warn = realWarn;
      }
    }

    // Articles use exactly one request, filter drafts, sort newest first and
    // fill a missing id from the document name.
    {
      clearSeoListsCache();
      const requests = installRunQueryMock(() =>
        jsonResults([
          {
            document: {
              name: 'projects/test/databases/test/documents/articles/article-old',
              fields: {
                slug: { stringValue: 'article-old' },
                title: { stringValue: 'Article Old' },
                status: { stringValue: 'published' },
                publishedAt: { stringValue: '2026-10-01T00:00:00.000Z' },
              },
            },
          },
          {
            document: {
              name: 'projects/test/databases/test/documents/articles/article-new',
              fields: {
                id: { stringValue: 'article-new' },
                slug: { stringValue: 'article-new' },
                title: { stringValue: 'Article New' },
                status: { stringValue: 'published' },
                publishedAt: { stringValue: '2026-10-20T00:00:00.000Z' },
              },
            },
          },
          {
            document: {
              name: 'projects/test/databases/test/documents/articles/article-draft',
              fields: {
                id: { stringValue: 'article-draft' },
                slug: { stringValue: 'article-draft' },
                title: { stringValue: 'Article Draft' },
                status: { stringValue: 'draft' },
                publishedAt: { stringValue: '2026-10-25T00:00:00.000Z' },
              },
            },
          },
          { readTime: '2026-10-26T00:00:00.000Z' },
        ])
      );

      const articles = await fetchListCollectionDocuments('articles');

      check(
        'articles use a single POST runQuery request',
        requests.length === 1 &&
          isRunQueryRequest(requests[0]) &&
          requests[0].body?.structuredQuery?.offset === 0 &&
          requests[0].body?.structuredQuery?.limit === 300
      );
      check(
        'articles drop drafts, sort newest first and fill id from the document name',
        articles?.length === 2 &&
          articles[0].id === 'article-new' &&
          articles[1].id === 'article-old' &&
          !articles.some((article: any) => article.status === 'draft')
      );
      check(
        'article runQuery selects list fields and never content, contentJson or comments',
        requests.every(request => {
          const fields = selectedFieldPaths(request.body);
          return (
            request.body?.structuredQuery?.from?.[0]?.collectionId === 'articles' &&
            fields.includes('id') &&
            fields.includes('title') &&
            fields.includes('excerpt') &&
            fields.includes('commentsCount') &&
            forbiddenFields.every(field => !fields.includes(field)) &&
            forbiddenFields.every(
              field => !JSON.stringify(request.body).includes(`"${field}"`)
            )
          );
        })
      );
    }

    // A failed first page still reports failure as null.
    {
      clearSeoListsCache();
      const realWarn = console.warn;
      console.warn = () => {};
      try {
        const requests = installRunQueryMock(
          () =>
            new Response(JSON.stringify({ error: { code: 403 } }), {
              status: 403,
            })
        );

        const films = await fetchListCollectionDocuments('films');

        check(
          'a failed first film request returns null',
          films === null && requests.length === 1
        );
      } finally {
        console.warn = realWarn;
      }
    }
  } finally {
    clearSeoListsCache();
    globalThis.fetch = realFetch;
  }
}

async function runSitemapChecks(): Promise<void> {
  console.log('\n--- Sitemap payload assertions ---\n');

  const capturedQueries: any[] = [];
  const realFetch = globalThis.fetch;

  const typedDoc = (
    collection: string,
    id: string,
    fields: Record<string, any>,
    docMeta: Record<string, any> = {}
  ) => ({
    document: {
      name: `projects/test/databases/test/documents/${collection}/${id}`,
      fields,
      ...docMeta,
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
      typedDoc('articles', 'article-iso-timestamp', {
        slug: { stringValue: 'article-iso-timestamp' },
        title: { stringValue: 'ISO Timestamp Article' },
        status: { stringValue: 'published' },
        // Localized text cannot be parsed by `new Date()`; the ISO companion
        // field must supply the real lastmod instead.
        publishedAt: { stringValue: '6 Okt 2026' },
        publishedAtTimestamp: { stringValue: '2026-10-06T06:34:45.769Z' },
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
      typedDoc(
        'films',
        'film-create-time',
        {
          slug: { stringValue: 'film-create-time' },
          title: { stringValue: 'Create Time Film' },
        },
        // No createdAt field: the document-level REST createTime is the only
        // real date available and must be used as the fallback.
        { createTime: '2026-09-15T10:20:30.000Z' }
      ),
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
      'publishedAtTimestamp',
      'createdAt',
      'excerpt',
      'collectionId',
      'collectionName',
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
      'sitemap selects publishedAtTimestamp for real article dates',
      selectedFieldSets.length > 0 &&
        selectedFieldSets.every((fields: string[]) => fields.includes('publishedAtTimestamp'))
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
    check(
      'article with localized publishedAt uses the ISO publishedAtTimestamp',
      findUrlBlock(
        xml,
        'https://www.sotoyfilm.my.id/artikel/article-iso-timestamp'
      ).includes('<lastmod>2026-10-06</lastmod>')
    );
    check(
      'film without createdAt falls back to the document createTime',
      findUrlBlock(xml, 'https://www.sotoyfilm.my.id/film/film-create-time').includes(
        '<lastmod>2026-09-15</lastmod>'
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

    // Verify snapshot fallback on Firestore failure
    const fallbackRun = makeRes();
    const realWarn = console.warn;
    console.warn = () => {};
    try {
      globalThis.fetch = (async () => {
        return new Response(JSON.stringify({ error: { code: 500 } }), { status: 500 });
      }) as typeof fetch;
      await handleSitemapRequest({ url: '/api/sitemap', query: {} }, fallbackRun.res);
      const fallbackXml = fallbackRun.state.body;
      check(
        'sitemap fallback serves snapshot XML with stable static lastmod on Firestore failure',
        fallbackRun.state.status === 200 &&
          (fallbackRun.state.headers['content-type'] || '').includes('application/xml') &&
          fallbackXml.includes('<urlset') &&
          findUrlBlock(fallbackXml, 'https://www.sotoyfilm.my.id/').includes('<lastmod>2026-10-25</lastmod>')
      );
    } finally {
      console.warn = realWarn;
    }
  } finally {
    globalThis.fetch = realFetch;
  }
}

main().catch(error => {
  console.error('❌ SEO prefetch test suite failed unexpectedly:', error);
  process.exit(1);
});
