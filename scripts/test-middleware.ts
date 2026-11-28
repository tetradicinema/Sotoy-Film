/**
 * Automated Mock Test Suite for Vercel Middleware (middleware.ts - Node.js Runtime)
 * 
 * Simulates various User-Agent headers (bots vs human visitors) and route requests
 * to validate that:
 * 1. Bots on /film/:slug and /artikel/:slug receive pre-rendered HTML with injected meta tags.
 * 2. Real humans pass through untouched with next() (zero latency penalty).
 * 3. Non-matching routes pass through directly.
 * 4. Missing/error documents fail gracefully without throwing a 500 error.
 * 
 * Usage:
 *   npx tsx scripts/test-middleware.ts
 */

import middleware, { isBotUserAgent, config } from '../middleware.js';
import { STATIC_ROUTE_METADATA_CONFIG, TWITTER_CREATOR, buildArticleMetadata } from '../src/utils/seoMetadata.js';
import { clearSeoListsCache } from '../src/lib/edge/firestoreRest.js';
import { injectMetaTags, buildArticleBodyHtml } from '../src/lib/edge/metaInjection.js';

// Setup Mock Fetch for Standalone, Deterministic Test Execution (Bypasses Google API Free Quota Limitations)
const originalFetch = globalThis.fetch;

// The middleware reads the TMDB key lazily on every request. TMDB itself is
// mocked below, so a dummy key is enough for the success paths.
process.env.TMDB_API_KEY = 'test-tmdb-key';

/** Counts per-document GETs so the first read can return meta fields only. */
const docFetchCounts: Record<string, number> = {};
/** Lets tests force a list REST failure for one or both collections. */
const listFetchFailure = { films: false, articles: false };
/** Lets tests force a TMDB failure mode for the person and franchise routes. */
const tmdbMock: {
  person: 'ok' | 'not-found' | 'timeout';
  popular: 'ok' | 'not-found' | 'timeout';
  collection: 'ok' | 'not-found' | 'timeout';
} = {
  person: 'ok',
  popular: 'ok',
  collection: 'ok',
};

/** Deterministic TMDB person payloads used by the /person route tests. */
function tmdbPersonFixture(id: number): Record<string, any> {
  if (id === 287) {
    return {
      id: 287,
      name: 'Brad Pitt',
      adult: false,
      biography:
        'William Bradley Pitt is an American actor and film producer. He has received multiple awards, including an Academy Award.',
      known_for_department: 'Acting',
      profile_path: '/brad-pitt.jpg',
      birthday: '1963-12-18',
      deathday: '',
      place_of_birth: 'Shawnee, Oklahoma, USA',
      combined_credits: {
        cast: [
          {
            id: 550,
            media_type: 'movie',
            title: 'Fight Club',
            release_date: '1999-10-15',
            vote_count: 28000,
            adult: false,
          },
          {
            id: 680,
            media_type: 'movie',
            title: 'Pulp Fiction',
            release_date: '1994-09-10',
            vote_count: 26000,
            adult: false,
          },
          {
            id: 16869,
            media_type: 'movie',
            title: 'Inglourious Basterds',
            release_date: '2009-08-19',
            vote_count: 21000,
            adult: false,
          },
          {
            id: 4242,
            media_type: 'movie',
            title: 'Adult Credit',
            release_date: '2001-01-01',
            vote_count: 99000,
            adult: true,
          },
        ],
        crew: [
          {
            id: 123,
            media_type: 'movie',
            title: 'The Departed',
            release_date: '2006-10-05',
            vote_count: 15000,
            adult: false,
          },
        ],
      },
    };
  }

  if (id === 55555) {
    return {
      id: 55555,
      name: 'Adult Person',
      adult: true,
      biography: 'This profile must never be indexed.',
      known_for_department: 'Acting',
      profile_path: null,
      birthday: '',
      deathday: '',
      place_of_birth: '',
      combined_credits: { cast: [], crew: [] },
    };
  }

  // Script-breaking text with no profile image: the JSON-LD must stay valid
  // and must omit `image` (PersonPage.tsx parity).
  if (id === 31337) {
    return {
      id: 31337,
      name: '</script><b>x</b>',
      adult: false,
      biography: 'Bio </script><b>x</b> end',
      known_for_department: 'Acting',
      profile_path: null,
      birthday: '',
      deathday: '',
      place_of_birth: '',
      combined_credits: { cast: [], crew: [] },
    };
  }

  return {
    id,
    name: `Person ${id}`,
    adult: false,
    biography: '',
    known_for_department: 'Acting',
    profile_path: null,
    birthday: '',
    deathday: '',
    place_of_birth: '',
    combined_credits: { cast: [], crew: [] },
  };
}

/** Deterministic TMDB collection payloads used by the /franchise route tests. */
function tmdbCollectionFixture(id: number): Record<string, any> {
  if (id === 119) {
    return {
      id: 119,
      name: 'The Lord of the Rings Collection',
      parts: [
        {
          id: 122,
          title: 'The Lord of the Rings: The Fellowship of the Ring',
          release_date: '2001-12-19',
          adult: false,
        },
        {
          id: 121,
          title: 'The Lord of the Rings: The Two Towers',
          release_date: '2002-12-18',
          adult: false,
        },
        {
          id: 120,
          title: 'The Lord of the Rings: The Return of the King',
          release_date: '2003-12-01',
          adult: false,
        },
        // Must be dropped from the body and never count as a usable part.
        {
          id: 44444,
          title: 'Adult Part',
          release_date: '2004-01-01',
          adult: true,
        },
      ],
    };
  }

  // Every part is adult: zero usable parts must null out the franchise.
  if (id === 22222) {
    return {
      id: 22222,
      name: 'Adult Collection',
      parts: [
        {
          id: 1,
          title: 'Adult Film',
          release_date: '2020-01-01',
          adult: true,
        },
      ],
    };
  }

  if (id === 33333) {
    return {
      id: 33333,
      name: 'Empty Collection',
      parts: [],
    };
  }

  // Script-breaking text must be escaped in the crawler body.
  if (id === 31337) {
    return {
      id: 31337,
      name: '</script><b>x</b> Collection',
      parts: [
        {
          id: 1,
          title: 'Title </script><b>x</b>',
          release_date: '2020-01-01',
          adult: false,
        },
      ],
    };
  }

  return {
    id,
    name: `Collection ${id}`,
    parts: [
      {
        id: 1,
        title: `Part One of Collection ${id}`,
        release_date: '2020-01-01',
        adult: false,
      },
    ],
  };
}

const RATING_GUARD_DOC_PREFIX =
  'projects/gen-lang-client-0523736875/databases/ai-studio-sotoyfilm-256095db-0c8b-47c2-a6bf-e7c4f8d7cfd3/documents/films';

function ratingGuardFilmDoc(
  slug: string,
  title: string,
  skorSotoy: number,
  totalVotes: number,
  legacy = false
): Record<string, any> {
  const fields: Record<string, any> = {
    title: { stringValue: title },
    slug: { stringValue: slug },
    year: { integerValue: '2026' },
    synopsis: { stringValue: `${title} synopsis.` },
    skorSotoy: { doubleValue: skorSotoy },
    totalVotes: { integerValue: String(totalVotes) },
  };
  if (!legacy) fields.scoreScale = { integerValue: '10' };
  return { name: `${RATING_GUARD_DOC_PREFIX}/${slug}`, fields };
}

const mockFetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
  const urlStr = url.toString();

  // 0a. Mock the TMDB API used by the bot-only person and franchise routes
  if (urlStr.startsWith('https://api.themoviedb.org/3/')) {
    const base = urlStr.split('?')[0];
    const isPopularList = /\/person\/popular$/.test(base);
    const isCollection = /\/collection\/\d+$/.test(base);
    const mode = isCollection
      ? tmdbMock.collection
      : isPopularList
        ? tmdbMock.popular
        : tmdbMock.person;

    if (mode === 'timeout') {
      // Never settles on its own; fetchWithTimeout aborts it after 2000 ms.
      const signal = init?.signal;
      return await new Promise<Response>((_resolve, reject) => {
        const abort = () => reject(new Error('The operation was aborted'));
        if (!signal) return;
        if (signal.aborted) {
          abort();
          return;
        }
        signal.addEventListener('abort', abort);
      });
    }

    if (mode === 'not-found') {
      return new Response(
        JSON.stringify({ status_code: 34, status_message: 'The resource you requested could not be found.' }),
        { status: 404, headers: { 'content-type': 'application/json' } }
      );
    }

    if (isPopularList) {
      return new Response(
        JSON.stringify({
          page: 1,
          results: [
            {
              id: 287,
              name: 'Brad Pitt',
              known_for_department: 'Acting',
              profile_path: '/brad-pitt.jpg',
              adult: false,
            },
            {
              id: 1245,
              name: 'Scarlett Johansson',
              known_for_department: 'Acting',
              profile_path: '/scarlett-johansson.jpg',
              adult: false,
            },
            {
              id: 500,
              name: 'Tom Cruise',
              known_for_department: 'Acting',
              profile_path: null,
              adult: false,
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }

    const personIdMatch = /\/person\/(\d+)$/.exec(base);
    if (personIdMatch) {
      return new Response(JSON.stringify(tmdbPersonFixture(Number(personIdMatch[1]))), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    const collectionIdMatch = /\/collection\/(\d+)$/.exec(base);
    if (collectionIdMatch) {
      return new Response(JSON.stringify(tmdbCollectionFixture(Number(collectionIdMatch[1]))), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  // 0. Simulated list REST failures (collection queries only, not doc GETs)
  if (listFetchFailure.films && /\/documents\/films\?/.test(urlStr)) {
    return new Response(JSON.stringify({ error: { code: 503, message: 'Unavailable' } }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (listFetchFailure.articles && /\/documents\/articles\?/.test(urlStr)) {
    return new Response(JSON.stringify({ error: { code: 503, message: 'Unavailable' } }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  }

  // 0b. One projected runQuery for public author profiles. The entity lookups
  // also use runQuery, but only this branch filters on authorId.
  let authorQueryBody: any = null;
  if (urlStr.includes('/documents:runQuery') && init?.body) {
    try {
      authorQueryBody = JSON.parse(String(init.body));
    } catch {
      authorQueryBody = null;
    }
  }
  if (
    authorQueryBody?.structuredQuery?.from?.[0]?.collectionId === 'articles' &&
    /authorId/.test(JSON.stringify(authorQueryBody.structuredQuery.where || ''))
  ) {
    const whereText = JSON.stringify(authorQueryBody.structuredQuery.where);
    const authorDocs =
      /"stringValue":"author-1"/.test(whereText)
        ? [
            {
              name: 'projects/test/databases/(default)/documents/articles/published-article',
              fields: {
                id: { stringValue: 'published-article' },
                slug: { stringValue: 'published-article' },
                title: { stringValue: 'Published Article Title' },
                status: { stringValue: 'published' },
                publishedAtTimestamp: { stringValue: '2026-10-20T09:30:00.000Z' },
              },
            },
            {
              name: 'projects/test/databases/(default)/documents/articles/author-1-second',
              fields: {
                id: { stringValue: 'author-1-second' },
                slug: { stringValue: 'author-1-second' },
                title: { stringValue: 'Second Author Article' },
                status: { stringValue: 'published' },
                publishedAtTimestamp: { stringValue: '2026-11-02T09:30:00.000Z' },
              },
            },
          ]
        : [];
    return new Response(JSON.stringify(authorDocs.map(document => ({ document }))), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  // 1. Mock index.html subrequest
  if (urlStr.includes('/index.html')) {
    return new Response(`<!doctype html><html><head><title>Sotoy Film</title></head><body><div id="root"></div></body></html>`, {
      status: 200,
      headers: { 'content-type': 'text/html' }
    });
  }

  // 2a. Mock user documents. Private fields are present in the response on
  // purpose: the middleware must drop them via its explicit allowlist.
  const userDocMatch = /\/documents\/users\/([^/?]+)/.exec(urlStr);
  if (userDocMatch) {
    const userId = decodeURIComponent(userDocMatch[1]);
    const users: Record<string, any> = {
      'author-1': {
        name: 'projects/test/databases/(default)/documents/users/author-1',
        fields: {
          name: { stringValue: 'Raka Pratama' },
          bio: { stringValue: 'Penulis sinema dan budaya populer.' },
          avatar: { stringValue: '/raka.jpg' },
          email: { stringValue: 'private-author@example.com' },
          phone: { stringValue: '+62-812-3456-7890' },
          handle: { stringValue: '@raka-privat' },
          role: { stringValue: 'admin' },
          uid: { stringValue: 'auth-uid-abc' },
        },
      },
      'author-empty': {
        name: 'projects/test/databases/(default)/documents/users/author-empty',
        fields: {
          name: { stringValue: 'Tanpa Artikel' },
          bio: { stringValue: 'Belum pernah menulis artikel.' },
          avatar: { stringValue: '/kosong.jpg' },
          email: { stringValue: 'empty-author@example.com' },
          role: { stringValue: 'admin' },
        },
      },
    };
    const doc = users[userId];
    if (!doc) {
      return new Response(JSON.stringify({ error: { code: 404, message: 'Not found' } }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify(doc), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  // 2. Mock Firestore REST API individual document lookups
  if (urlStr.includes('/documents/films/breaking-bad')) {
    return new Response(JSON.stringify({
      name: 'projects/gen-lang-client-0523736875/databases/ai-studio-sotoyfilm-256095db-0c8b-47c2-a6bf-e7c4f8d7cfd3/documents/films/breaking-bad',
      fields: {
        title: { stringValue: 'Breaking Bad' },
        year: { integerValue: '2008' },
        synopsis: { stringValue: 'A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine.' },
        poster: { stringValue: '/breaking-bad-poster.png' },
        backdrop: { stringValue: '/breaking-bad-backdrop.png' },
        director: { stringValue: 'Vince Gilligan' },
        duration: { stringValue: '49m' },
        skorSotoy: { doubleValue: 9.2 },
        totalVotes: { integerValue: '1250' },
        genres: {
          arrayValue: {
            values: [
              { stringValue: 'Drama' },
              { stringValue: 'Crime' }
            ]
          }
        },
        cast: {
          arrayValue: {
            values: [
              { stringValue: 'Bryan Cranston' },
              { stringValue: 'Aaron Paul' }
            ]
          }
        },
        email: { stringValue: 'private-film@example.com' },
        adminNotes: { stringValue: 'Internal film note' }
      }
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }

  if (urlStr.includes('/documents/films/boyhood')) {
    return new Response(JSON.stringify({
      name: 'projects/gen-lang-client-0523736875/databases/ai-studio-sotoyfilm-256095db-0c8b-47c2-a6bf-e7c4f8d7cfd3/documents/films/boyhood',
      fields: {
        title: { stringValue: 'Boyhood' },
        year: { integerValue: '2014' },
        synopsis: { stringValue: 'The life of Mason, from early childhood to his arrival at college.' },
        poster: { stringValue: '/boyhood-poster.png' },
        backdrop: { stringValue: '/boyhood-backdrop.png' },
        director: { stringValue: 'Richard Linklater' }
      }
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }

  // aggregateRating guard fixtures: one legacy doubled score and the
  // insufficient-evidence cases that must never receive rich-result markup.
  const ratingGuardDocs = [
    { slug: 'legacy-rating-film', doc: ratingGuardFilmDoc('legacy-rating-film', 'Legacy Rating Film', 4.6, 3, true) },
    { slug: 'votes-zero-film', doc: ratingGuardFilmDoc('votes-zero-film', 'Votes Zero Film', 8, 0) },
    { slug: 'votes-one-film', doc: ratingGuardFilmDoc('votes-one-film', 'Votes One Film', 8, 1) },
    { slug: 'votes-two-film', doc: ratingGuardFilmDoc('votes-two-film', 'Votes Two Film', 8, 2) },
    { slug: 'zero-score-film', doc: ratingGuardFilmDoc('zero-score-film', 'Zero Score Film', 0, 3) },
  ];
  const ratingGuardDoc = ratingGuardDocs.find(item =>
    urlStr.includes(`/documents/films/${item.slug}`)
  )?.doc;
  if (ratingGuardDoc) {
    return new Response(JSON.stringify(ratingGuardDoc), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }

  if (urlStr.includes('/documents/articles/draft-article')) {
    return new Response(JSON.stringify({
      name: 'projects/gen-lang-client-0523736875/databases/ai-studio-sotoyfilm-256095db-0c8b-47c2-a6bf-e7c4f8d7cfd3/documents/articles/draft-article',
      fields: {
        title: { stringValue: 'Draft Article Title' },
        status: { stringValue: 'draft' },
        slug: { stringValue: 'draft-article' }
      }
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }

  // Canonical article fixture: doc id, slug, seoTitle and title all differ so
  // the redirect tests can prove the document slug wins and the variants fold.
  const canonicalArticleDoc = {
    name: 'projects/gen-lang-client-0523736875/databases/ai-studio-sotoyfilm-256095db-0c8b-47c2-a6bf-e7c4f8d7cfd3/documents/articles/article-doc-id-1',
    fields: {
      id: { stringValue: 'article-doc-id-1' },
      slug: { stringValue: 'canonical-article-slug' },
      title: { stringValue: 'Canonical Article Title' },
      seoTitle: { stringValue: 'Canonical Article SEO Title' },
      status: { stringValue: 'published' },
      excerpt: { stringValue: 'Canonical article excerpt.' },
      publishedAt: { stringValue: '2026-10-23T09:30:00.000Z' },
      content: { stringValue: 'Canonical article body about a heist.' },
      author: {
        mapValue: {
          fields: {
            name: { stringValue: 'Raka Pratama' }
          }
        }
      }
    }
  };

  for (const articleSegment of [
    'article-doc-id-1',
    'canonical-article-slug',
    'canonical-article-title',
    'canonical-article-seo-title'
  ]) {
    if (urlStr.includes(`/documents/articles/${articleSegment}`)) {
      return new Response(JSON.stringify(canonicalArticleDoc), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
  }

  if (urlStr.includes('/documents/articles/published-article')) {
    return new Response(JSON.stringify({
      name: 'projects/gen-lang-client-0523736875/databases/ai-studio-sotoyfilm-256095db-0c8b-47c2-a6bf-e7c4f8d7cfd3/documents/articles/published-article',
      fields: {
        title: { stringValue: 'Published Article Title' },
        status: { stringValue: 'published' },
        slug: { stringValue: 'published-article' },
        excerpt: { stringValue: 'This is a published article excerpt.' },
        authorId: { stringValue: 'author-1' },
        publishedAt: { stringValue: '2026-10-20T09:30:00.000Z' },
        content: { stringValue: 'Dune is a sweeping epic. <script>alert("xss")</script> The spice must flow & the sandworm rises.' },
        author: {
          mapValue: {
            fields: {
              name: { stringValue: 'Raka Pratama' },
              email: { stringValue: 'private-author@example.com' }
            }
          }
        }
      }
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }

  if (urlStr.includes('/documents/articles/branded-article')) {
    return new Response(JSON.stringify({
      name: 'projects/gen-lang-client-0523736875/databases/ai-studio-sotoyfilm-256095db-0c8b-47c2-a6bf-e7c4f8d7cfd3/documents/articles/branded-article',
      fields: {
        id: { stringValue: 'branded-article' },
        title: { stringValue: 'Branded Article Title' },
        seoTitle: { stringValue: 'Branded Article Title | Sotoy Film' },
        status: { stringValue: 'published' },
        slug: { stringValue: 'branded-article' },
        excerpt: { stringValue: 'A branded article excerpt.' },
        publishedAt: { stringValue: '2026-10-21T09:30:00.000Z' },
        content: { stringValue: 'Branded article body about cinema.' },
        author: {
          mapValue: {
            fields: {
              name: { stringValue: 'Raka Pratama' }
            }
          }
        }
      }
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }

  if (urlStr.includes('/documents/articles/tiptap-article')) {
    return new Response(JSON.stringify({
      name: 'projects/gen-lang-client-0523736875/databases/ai-studio-sotoyfilm-256095db-0c8b-47c2-a6bf-e7c4f8d7cfd3/documents/articles/tiptap-article',
      fields: {
        title: { stringValue: 'Tiptap Article Title' },
        status: { stringValue: 'published' },
        slug: { stringValue: 'tiptap-article' },
        excerpt: { stringValue: 'A Tiptap formatted excerpt.' },
        contentFormat: { stringValue: 'tiptap' },
        contentJson: {
          stringValue: JSON.stringify({
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'First Tiptap paragraph about cinema.' }]
              },
              {
                type: 'heading',
                attrs: { level: 2 },
                content: [{ type: 'text', text: 'Second Tiptap heading' }]
              }
            ]
          })
        }
      }
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }

  if (urlStr.includes('/documents/articles/structured-article')) {
    const markdown = [
      '## Mengapa sinema penting',
      '',
      'Baca [panduan film](/artikel/panduan-film) dan [ulasan luar](https://example.com/review).',
      '',
      '- Pendekatan pertama',
      '- Pendekatan kedua',
      '',
      '1. Langkah pertama',
      '2. Langkah kedua',
      '',
      '| Film | Skor |',
      '| --- | --- |',
      '| Dune | 9.2 |',
      '',
      '### Catatan editor',
      '',
      '> Kutipan penting dengan **tebal** dan *miring*.',
      '',
      '<script>alert("xss")</script><div onclick="alert(1)">Teks biasa</div>',
    ].join('\n');
    return new Response(JSON.stringify({
      name: 'projects/gen-lang-client-0523736875/databases/ai-studio-sotoyfilm-256095db-0c8b-47c2-a6bf-e7c4f8d7cfd3/documents/articles/structured-article',
      fields: {
        id: { stringValue: 'structured-article' },
        title: { stringValue: 'Structured Article Title' },
        status: { stringValue: 'published' },
        slug: { stringValue: 'structured-article' },
        excerpt: { stringValue: 'Structured article excerpt.' },
        publishedAt: { stringValue: '2026-10-22T09:30:00.000Z' },
        category: { stringValue: 'movies' },
        relatedFilmId: { stringValue: 'breaking-bad' },
        relatedFilmIds: {
          arrayValue: { values: [{ stringValue: 'boyhood' }] }
        },
        relatedArticleIds: {
          arrayValue: { values: [{ stringValue: 'published-article' }] }
        },
        // Only these embedded details carry a real slug + human title.
        relatedFilms: {
          arrayValue: {
            values: [{
              mapValue: {
                fields: {
                  id: { stringValue: 'film-doc-boyhood' },
                  slug: { stringValue: 'boyhood' },
                  title: { stringValue: 'Boyhood' }
                }
              }
            }]
          }
        },
        relatedArticles: {
          arrayValue: {
            values: [{
              mapValue: {
                fields: {
                  id: { stringValue: 'article-doc-published' },
                  slug: { stringValue: 'published-article' },
                  title: { stringValue: 'Published Article Title' }
                }
              }
            }]
          }
        },
        content: { stringValue: markdown }
      }
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }

  if (urlStr.includes('/documents/articles/unsafe-html-article')) {
    const html = [
      '<h2>Judul bagian</h2>',
      '<p>Taut <a href="/film/breaking-bad" onclick="alert(1)">film</a> dan <a href="https://example.com/ulasan">luar</a>.</p>',
      '<h3>Subbagian</h3>',
      '<ul><li>Satu</li><li>Dua</li></ul>',
      '<ol><li>Pertama</li><li>Kedua</li></ol>',
      '<table><thead><tr><th>Film</th></tr></thead><tbody><tr><td>Dune</td></tr></tbody></table>',
      '<div class="widget" data-x="1">Teks dari div</div>',
      '<img src="https://example.com/pixel.gif" onerror="alert(1)">',
      '<script>alert("xss")</script>',
      '<p><a href="javascript:alert(1)">taut berbahaya</a> tetap menjadi teks.</p>',
    ].join('');
    return new Response(JSON.stringify({
      name: 'projects/gen-lang-client-0523736875/databases/ai-studio-sotoyfilm-256095db-0c8b-47c2-a6bf-e7c4f8d7cfd3/documents/articles/unsafe-html-article',
      fields: {
        id: { stringValue: 'unsafe-html-article' },
        title: { stringValue: 'Unsafe HTML Article Title' },
        status: { stringValue: 'published' },
        slug: { stringValue: 'unsafe-html-article' },
        excerpt: { stringValue: 'Legacy HTML article excerpt.' },
        publishedAt: { stringValue: '2026-10-24T09:30:00.000Z' },
        content: { stringValue: html }
      }
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }

  if (urlStr.includes('/documents/articles/updated-article')) {
    return new Response(JSON.stringify({
      name: 'projects/gen-lang-client-0523736875/databases/ai-studio-sotoyfilm-256095db-0c8b-47c2-a6bf-e7c4f8d7cfd3/documents/articles/updated-article',
      fields: {
        id: { stringValue: 'updated-article' },
        title: { stringValue: 'Updated Article Title' },
        status: { stringValue: 'published' },
        slug: { stringValue: 'updated-article' },
        excerpt: { stringValue: 'An edited article excerpt.' },
        publishedAt: { stringValue: '2026-10-21T09:30:00.000Z' },
        publishedAtTimestamp: { stringValue: '2026-10-21T09:30:00.000Z' },
        updatedAt: { stringValue: '2026-11-21T09:30:00.000Z' },
        content: { stringValue: 'Article body updated long after publication.' }
      }
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }

  if (urlStr.includes('/documents/articles/scheduled-future-article')) {
    return new Response(JSON.stringify({
      name: 'projects/gen-lang-client-0523736875/databases/ai-studio-sotoyfilm-256095db-0c8b-47c2-a6bf-e7c4f8d7cfd3/documents/articles/scheduled-future-article',
      fields: {
        title: { stringValue: 'Scheduled Future Article Title' },
        status: { stringValue: 'scheduled' },
        scheduledAt: { stringValue: '2099-01-01T00:00:00Z' },
        slug: { stringValue: 'scheduled-future-article' }
      }
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }

  if (urlStr.includes('/documents/articles/scheduled-past-article')) {
    return new Response(JSON.stringify({
      name: 'projects/gen-lang-client-0523736875/databases/ai-studio-sotoyfilm-256095db-0c8b-47c2-a6bf-e7c4f8d7cfd3/documents/articles/scheduled-past-article',
      fields: {
        title: { stringValue: 'Scheduled Past Article Title' },
        status: { stringValue: 'scheduled' },
        scheduledAt: { stringValue: '2020-01-01T00:00:00Z' },
        slug: { stringValue: 'scheduled-past-article' },
        excerpt: { stringValue: 'This is a scheduled past article excerpt.' }
      }
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }

  if (urlStr.includes('/documents/articles/meta-only-article')) {
    docFetchCounts['meta-only-article'] = (docFetchCounts['meta-only-article'] || 0) + 1;
    const docName =
      'projects/gen-lang-client-0523736875/databases/ai-studio-sotoyfilm-256095db-0c8b-47c2-a6bf-e7c4f8d7cfd3/documents/articles/meta-only-article';

    // First read mimics fetchEntityData(): meta fields only.
    if (docFetchCounts['meta-only-article'] === 1) {
      return new Response(JSON.stringify({
        name: docName,
        fields: {
          id: { stringValue: 'meta-only-article' },
          title: { stringValue: 'Meta Only Article Title' },
          status: { stringValue: 'published' },
          slug: { stringValue: 'meta-only-article' },
          excerpt: { stringValue: 'Meta-only lookup excerpt.' }
        }
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }

    // Second read mimics fetchFullEntityDoc(): full document, no field mask.
    return new Response(JSON.stringify({
      name: docName,
      fields: {
        id: { stringValue: 'meta-only-article' },
        title: { stringValue: 'Meta Only Article Title' },
        status: { stringValue: 'published' },
        slug: { stringValue: 'meta-only-article' },
        excerpt: { stringValue: 'Meta-only lookup excerpt.' },
        publishedAt: { stringValue: '2026-10-22T08:00:00.000Z' },
        content: { stringValue: 'Meta-only lookup body text about a slow-burn western.' },
        contentFormat: { stringValue: 'markdown' },
        author: {
          mapValue: {
            fields: {
              name: { stringValue: 'Nadia Prameswari' },
              email: { stringValue: 'private-full-author@example.com' }
            }
          }
        }
      }
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }

  if (urlStr.includes('/documents/articles/full-doc-fail-article')) {
    docFetchCounts['full-doc-fail-article'] = (docFetchCounts['full-doc-fail-article'] || 0) + 1;

    // Meta lookup succeeds; the follow-up full-document read fails.
    if (docFetchCounts['full-doc-fail-article'] === 1) {
      return new Response(JSON.stringify({
        name: 'projects/gen-lang-client-0523736875/databases/ai-studio-sotoyfilm-256095db-0c8b-47c2-a6bf-e7c4f8d7cfd3/documents/articles/full-doc-fail-article',
        fields: {
          id: { stringValue: 'full-doc-fail-article' },
          title: { stringValue: 'Full Doc Fail Article' },
          status: { stringValue: 'published' },
          slug: { stringValue: 'full-doc-fail-article' },
          excerpt: { stringValue: 'Metadata-only excerpt survives.' }
        }
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: { code: 503, message: 'Unavailable' } }), {
      status: 503,
      headers: { 'content-type': 'application/json' }
    });
  }

  // 3. Mock general fallback collection requests (Strategic fallback list)
  if (urlStr.includes('/documents/films')) {
    return new Response(JSON.stringify({
      documents: [
        {
          name: 'projects/gen-lang-client-0523736875/databases/ai-studio-sotoyfilm-256095db-0c8b-47c2-a6bf-e7c4f8d7cfd3/documents/films/breaking-bad',
          fields: {
            id: { stringValue: 'breaking-bad' },
            title: { stringValue: 'Breaking Bad' },
            year: { integerValue: '2008' },
            slug: { stringValue: 'breaking-bad' },
            type: { stringValue: 'series' },
            poster: { stringValue: '/breaking-bad-poster.png' },
            director: { stringValue: 'Vince Gilligan' },
            genres: {
              arrayValue: {
                values: [{ stringValue: 'Drama' }, { stringValue: 'Crime' }]
              }
            },
            skorSotoy: { doubleValue: 9.2 },
            totalVotes: { integerValue: '1250' },
            trendingRank: { integerValue: '1' },
            synopsis: { stringValue: 'Chemistry teacher turned meth lord.' },
            email: { stringValue: 'private-film@example.com' },
            adminNotes: { stringValue: 'Internal film note' }
          }
        },
        {
          name: 'projects/gen-lang-client-0523736875/databases/ai-studio-sotoyfilm-256095db-0c8b-47c2-a6bf-e7c4f8d7cfd3/documents/films/boyhood',
          fields: {
            id: { stringValue: 'boyhood' },
            title: { stringValue: 'Boyhood' },
            year: { integerValue: '2014' },
            slug: { stringValue: 'boyhood' },
            type: { stringValue: 'movie' },
            poster: { stringValue: '/boyhood-poster.png' },
            director: { stringValue: 'Richard Linklater' },
            genres: {
              arrayValue: { values: [{ stringValue: 'Drama' }] }
            },
            skorSotoy: { doubleValue: 8.6 },
            totalVotes: { integerValue: '420' },
            trendingRank: { integerValue: '2' },
            synopsis: { stringValue: 'Growing up over 12 years.' }
          }
        }
      ]
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }

  // 3b. Mock the list payload collection for articles
  if (urlStr.includes('/documents/articles?pageSize=')) {
    return new Response(JSON.stringify({
      documents: [
        {
          name: 'projects/gen-lang-client-0523736875/databases/ai-studio-sotoyfilm-256095db-0c8b-47c2-a6bf-e7c4f8d7cfd3/documents/articles/published-article',
          fields: {
            id: { stringValue: 'published-article' },
            title: { stringValue: 'Published Article Title' },
            status: { stringValue: 'published' },
            slug: { stringValue: 'published-article' },
            excerpt: { stringValue: 'This is a published article excerpt.' },
            coverImage: { stringValue: '/published-cover.jpg' },
            category: { stringValue: 'movies' },
            subCategory: { stringValue: 'reviews' },
            authorId: { stringValue: 'author-1' },
            publishedAt: { stringValue: '2026-10-20T09:30:00.000Z' },
            publishedAtTimestamp: { stringValue: '2026-10-20T09:30:00.000Z' },
            readTime: { stringValue: '5 menit' },
            views: { integerValue: '120' },
            likes: { integerValue: '34' },
            commentsCount: { integerValue: '7' },
            tags: {
              arrayValue: { values: [{ stringValue: 'Dune' }] }
            },
            author: {
              mapValue: {
                fields: {
                  id: { stringValue: 'author-1' },
                  name: { stringValue: 'Raka Pratama' },
                  avatar: { stringValue: '/raka.jpg' },
                  email: { stringValue: 'private-author@example.com' }
                }
              }
            },
            content: { stringValue: 'SECRET ARTICLE BODY' },
            contentJson: { stringValue: '{"type":"doc","content":[]}' },
            comments: {
              arrayValue: {
                values: [
                  { mapValue: { fields: { text: { stringValue: 'SECRET COMMENT' } } } }
                ]
              }
            },
            email: { stringValue: 'private-article@example.com' }
          }
        },
        {
          name: 'projects/gen-lang-client-0523736875/databases/ai-studio-sotoyfilm-256095db-0c8b-47c2-a6bf-e7c4f8d7cfd3/documents/articles/draft-article',
          fields: {
            id: { stringValue: 'draft-article' },
            title: { stringValue: 'Draft Article Title' },
            status: { stringValue: 'draft' },
            slug: { stringValue: 'draft-article' },
            excerpt: { stringValue: 'Draft excerpt' }
          }
        },
        {
          name: 'projects/gen-lang-client-0523736875/databases/ai-studio-sotoyfilm-256095db-0c8b-47c2-a6bf-e7c4f8d7cfd3/documents/articles/scheduled-future-article',
          fields: {
            id: { stringValue: 'scheduled-future-article' },
            title: { stringValue: 'Scheduled Future Article Title' },
            status: { stringValue: 'scheduled' },
            scheduledAt: { stringValue: '2099-01-01T00:00:00Z' },
            slug: { stringValue: 'scheduled-future-article' }
          }
        }
      ]
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }

  // Fallback response
  return new Response(JSON.stringify({ documents: [] }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
};

globalThis.fetch = mockFetch;

interface TestCase {
  name: string;
  userAgent: string;
  path: string;
  /** Required unless expectedStatus is set (redirect cases). */
  expectedBranch?: 'BOT' | 'HUMAN';
  expectedStatus?: number;
  expectedLocation?: string;
  expectedMetaPatterns?: string[];
}

const TEST_CASES: TestCase[] = [
  // --- BOTS: Search Engine Crawlers ---
  {
    name: 'Googlebot on Film route (Breaking Bad)',
    userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    path: '/film/breaking-bad',
    expectedBranch: 'BOT',
    expectedMetaPatterns: [
      '<title>Breaking Bad',
      'og:title',
      'og:image',
      'twitter:card',
      'rel="canonical"',
    ],
  },
  {
    name: 'Bingbot on Film route (Boyhood)',
    userAgent: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    path: '/film/boyhood',
    expectedBranch: 'BOT',
    expectedMetaPatterns: [
      '<title>Boyhood',
      'og:title',
      'og:url',
      'summary_large_image',
    ],
  },
  {
    name: 'Google-InspectionTool on Film route (Search Console live test)',
    userAgent: 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 (compatible; Google-InspectionTool/1.0)',
    path: '/film/boyhood',
    expectedBranch: 'BOT',
    expectedMetaPatterns: ['<title>Boyhood', 'og:title', 'og:image', 'rel="canonical"'],
  },
  {
    name: 'GoogleOther crawler on Film route',
    userAgent: 'Mozilla/5.0 (compatible; GoogleOther)',
    path: '/film/boyhood',
    expectedBranch: 'BOT',
    expectedMetaPatterns: ['<title>Boyhood', 'og:title', 'og:url'],
  },
  {
    name: 'Storebot-Google on Film route',
    userAgent: 'Storebot-Google/1.0',
    path: '/film/boyhood',
    expectedBranch: 'BOT',
    expectedMetaPatterns: ['<title>Boyhood', 'og:title', 'og:image'],
  },

  // --- BOTS: Social Media & Messaging Previewers ---
  {
    name: 'Twitterbot on Film route (Breaking Bad)',
    userAgent: 'Twitterbot/1.0',
    path: '/film/breaking-bad',
    expectedBranch: 'BOT',
    expectedMetaPatterns: [
      'twitter:card',
      'twitter:title',
      'twitter:image',
      'og:type" content="video.movie"',
    ],
  },
  {
    name: 'Facebook External Hit on Film route',
    userAgent: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    path: '/film/boyhood',
    expectedBranch: 'BOT',
    expectedMetaPatterns: [
      'og:title',
      'og:description',
      'og:image',
      'og:site_name',
    ],
  },
  {
    name: 'WhatsApp link preview on Film route',
    userAgent: 'WhatsApp/2.23.20.10 A',
    path: '/film/breaking-bad',
    expectedBranch: 'BOT',
    expectedMetaPatterns: ['og:title', 'og:description', 'og:image'],
  },
  {
    name: 'Telegram Bot on Film route',
    userAgent: 'TelegramBot (like TwitterBot)',
    path: '/film/boyhood',
    expectedBranch: 'BOT',
    expectedMetaPatterns: ['<title>', 'og:title', 'twitter:image'],
  },
  {
    name: 'Slackbot on Film route',
    userAgent: 'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
    path: '/film/breaking-bad',
    expectedBranch: 'BOT',
    expectedMetaPatterns: ['og:image', 'og:title'],
  },
  {
    name: 'Discordbot on Film route',
    userAgent: 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
    path: '/film/boyhood',
    expectedBranch: 'BOT',
    expectedMetaPatterns: ['twitter:card', 'og:description'],
  },
  {
    name: 'LinkedInBot on Film route',
    userAgent: 'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)',
    path: '/film/breaking-bad',
    expectedBranch: 'BOT',
    expectedMetaPatterns: ['og:title', 'og:url'],
  },
  {
    name: 'Generic Headless Crawler (Fallback pattern)',
    userAgent: 'CustomCrawlerBot/1.0 (web-scraper)',
    path: '/film/boyhood',
    expectedBranch: 'BOT',
    expectedMetaPatterns: ['<title>', 'og:title'],
  },
  {
    name: 'Meta External Agent on Film route',
    userAgent: 'meta-externalagent/1.0',
    path: '/film/boyhood',
    expectedBranch: 'BOT',
    expectedMetaPatterns: ['og:title', 'og:image'],
  },
  {
    name: 'Meta External Fetcher on Film route',
    userAgent: 'meta-externalfetcher/1.0',
    path: '/film/boyhood',
    expectedBranch: 'BOT',
    expectedMetaPatterns: ['og:title', 'og:image'],
  },
  {
    name: 'Facebot on Film route',
    userAgent: 'facebot/1.0',
    path: '/film/boyhood',
    expectedBranch: 'BOT',
    expectedMetaPatterns: ['og:title', 'og:image'],
  },
  {
    name: 'Skype URI Preview on Film route',
    userAgent: 'skypeuripreview/2.0',
    path: '/film/boyhood',
    expectedBranch: 'BOT',
    expectedMetaPatterns: ['og:title', 'og:image'],
  },
  {
    name: 'Redditbot on Film route',
    userAgent: 'redditbot/1.0',
    path: '/film/boyhood',
    expectedBranch: 'BOT',
    expectedMetaPatterns: ['og:title', 'og:image'],
  },
  {
    name: 'Mastodon bot on Film route',
    userAgent: 'mastodon/4.0',
    path: '/film/boyhood',
    expectedBranch: 'BOT',
    expectedMetaPatterns: ['og:title', 'og:image'],
  },
  {
    name: 'Iframely on Film route',
    userAgent: 'iframely/1.0',
    path: '/film/boyhood',
    expectedBranch: 'BOT',
    expectedMetaPatterns: ['og:title', 'og:image'],
  },
  {
    name: 'Signal Link Preview on Film route',
    userAgent: 'signal/1.0',
    path: '/film/boyhood',
    expectedBranch: 'BOT',
    expectedMetaPatterns: ['og:title', 'og:image'],
  },
  {
    name: 'Line-Poker on Film route',
    userAgent: 'line-poker/1.0',
    path: '/film/boyhood',
    expectedBranch: 'BOT',
    expectedMetaPatterns: ['og:title', 'og:image'],
  },

  // --- HUMANS: Real Desktop & Mobile Browsers ---
  {
    name: 'macOS Google Chrome (Desktop Human)',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    path: '/film/breaking-bad',
    expectedBranch: 'HUMAN',
  },
  {
    name: 'iPhone Safari (Mobile Human)',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    path: '/artikel/dune-part-two-review-villeneuve',
    expectedBranch: 'HUMAN',
  },
  {
    name: 'Windows 11 Firefox (Desktop Human)',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0',
    path: '/film/boyhood',
    expectedBranch: 'HUMAN',
  },
  {
    name: 'Windows Edge (Desktop Human)',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
    path: '/artikel/dune-part-two-review-villeneuve',
    expectedBranch: 'HUMAN',
  },
  {
    name: 'Android Chrome (Mobile Human)',
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
    path: '/film/breaking-bad',
    expectedBranch: 'HUMAN',
  },
  {
    name: 'Windows Chrome on Film route (Desktop Human)',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    path: '/film/boyhood',
    expectedBranch: 'HUMAN',
  },
  {
    name: 'iPhone Safari on Film route (Mobile Human)',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    path: '/film/boyhood',
    expectedBranch: 'HUMAN',
  },

  // --- ROUTE & EDGE CASES ---
  {
    name: 'Bot on community list route (/komunitas)',
    userAgent: 'Googlebot/2.1 (+http://www.google.com/bot.html)',
    path: '/komunitas',
    expectedBranch: 'BOT',
    expectedMetaPatterns: ['rel="canonical"', 'seo-lists'],
  },
  {
    name: 'Bot on non-existent film slug (Graceful fallback test)',
    userAgent: 'Twitterbot/1.0',
    path: '/film/completely-non-existent-film-slug-xyz-999',
    expectedBranch: 'HUMAN', // Falls through gracefully with next() instead of throwing 500
  },
  {
    name: 'Bot on invalid season number (/film/:slug/season/abc) falls through',
    userAgent: 'Googlebot/2.1',
    path: '/film/breaking-bad/season/abc',
    expectedBranch: 'HUMAN',
  },
  {
    name: 'Bot on unknown film subpath (/film/:slug/other) falls through',
    userAgent: 'Googlebot/2.1',
    path: '/film/breaking-bad/other',
    expectedBranch: 'HUMAN',
  },
  {
    name: 'Bot on draft article slug (draft -> generic fallback / pass-through)',
    userAgent: 'Googlebot/2.1',
    path: '/artikel/draft-article',
    expectedBranch: 'HUMAN',
  },
  {
    name: 'Bot on published article slug (published -> meta injected)',
    userAgent: 'Googlebot/2.1',
    path: '/artikel/published-article',
    expectedBranch: 'BOT',
    expectedMetaPatterns: ['Published Article Title', 'og:title'],
  },
  {
    name: 'Bot on scheduled article in the future (future -> generic fallback / pass-through)',
    userAgent: 'Googlebot/2.1',
    path: '/artikel/scheduled-future-article',
    expectedBranch: 'HUMAN',
  },
  {
    name: 'Bot on scheduled article in the past (past -> meta injected)',
    userAgent: 'Googlebot/2.1',
    path: '/artikel/scheduled-past-article',
    expectedBranch: 'BOT',
    expectedMetaPatterns: ['Scheduled Past Article Title', 'og:title'],
  },

  // --- BOTS: TMDB person routes ---
  {
    name: 'Googlebot on /people (popular people list)',
    userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    path: '/people',
    expectedBranch: 'BOT',
    expectedMetaPatterns: [
      '<title>Orang Populer - Aktor, Sutradara, dan Kru | Sotoy Film</title>',
      'rel="canonical"',
      'href="/person/287-brad-pitt"',
    ],
  },
  {
    name: 'Googlebot on /person/287-brad-pitt (TMDB profile)',
    userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    path: '/person/287-brad-pitt',
    expectedBranch: 'BOT',
    expectedMetaPatterns: [
      '<title>Brad Pitt - Biografi dan Filmografi | Sotoy Film</title>',
      'og:type" content="profile"',
      'application/ld+json',
    ],
  },

  // --- BOTS: TMDB franchise routes ---
  {
    name: 'Googlebot on /franchise/119-the-lord-of-the-rings (TMDB collection)',
    userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    path: '/franchise/119-the-lord-of-the-rings',
    expectedBranch: 'BOT',
    expectedMetaPatterns: [
      '<title>The Lord of the Rings Collection - Semua Film Franchise | Sotoy Film</title>',
      'rel="canonical"',
      'application/ld+json',
    ],
  },

  // --- CATEGORY TAXONOMY REDIRECTS ---
  {
    name: 'Googlebot on canonical Animation category (meta injected)',
    userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    path: '/kategori/animation',
    expectedBranch: 'BOT',
    expectedMetaPatterns: ['rel="canonical"', 'seo-lists'],
  },
  {
    name: 'Googlebot on legacy /kategori/anime (301 redirect)',
    userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    path: '/kategori/anime',
    expectedStatus: 301,
    expectedLocation: '/kategori/animation',
  },
  {
    name: 'Human on legacy /kategori/animasi/news (301 redirect, preserves subcategory)',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    path: '/kategori/animasi/news',
    expectedStatus: 301,
    expectedLocation: '/kategori/animation/news',
  },
  {
    name: 'Googlebot on /article/:slug alias (301 to /artikel/:slug)',
    userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    path: '/article/published-article',
    expectedStatus: 301,
    expectedLocation: '/artikel/published-article',
  },
  {
    name: 'Human on /article/:slug alias (301 to /artikel/:slug)',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    path: '/article/canonical-article-slug',
    expectedStatus: 301,
    expectedLocation: '/artikel/canonical-article-slug',
  },
  {
    name: 'Windows Chrome on Franchise route (Desktop Human)',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    path: '/franchise/119-the-lord-of-the-rings',
    expectedBranch: 'HUMAN',
  },
  {
    name: 'Bot on non-numeric franchise id (/franchise/abc) falls through',
    userAgent: 'Googlebot/2.1',
    path: '/franchise/abc',
    expectedBranch: 'HUMAN',
  },
  {
    name: 'Bot on adult-only collection (/franchise/22222) falls through',
    userAgent: 'Googlebot/2.1',
    path: '/franchise/22222-adult-collection',
    expectedBranch: 'HUMAN',
  },
  {
    name: 'Bot on empty collection (/franchise/33333) falls through',
    userAgent: 'Googlebot/2.1',
    path: '/franchise/33333-empty',
    expectedBranch: 'HUMAN',
  },
];

/**
 * Extracts the contents of the #root element from the returned HTML.
 */
function getRootContent(html: string): string {
  const match = /<div\b[^>]*\bid=["']root["'][^>]*>([\s\S]*?)<\/div>/i.exec(html);
  return match ? match[1] : '';
}

function getMetaContent(html: string, name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(
    `<meta\\s+name=["']${escaped}["'][^>]*content=["']([^"']*)["']`,
    'i'
  ).exec(html);
  return match ? match[1] : '';
}

function getOgContent(html: string, property: string): string {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(
    `<meta\\s+property=["']${escaped}["'][^>]*content=["']([^"']*)["']`,
    'i'
  ).exec(html);
  return match ? match[1] : '';
}

function getCanonicalHref(html: string): string {
  const match = /<link\s+rel=["']canonical["'][^>]*href=["']([^"']*)["']/i.exec(html);
  return match ? match[1] : '';
}

function countMatches(html: string, pattern: RegExp): number {
  return (html.match(pattern) || []).length;
}

/** True when every tag in a rendered bot body has a matching closing tag. */
function hasBalancedTags(html: string): boolean {
  const voids = new Set(['br', 'hr', 'img', 'input', 'meta', 'link']);
  const stack: string[] = [];
  for (const match of html.matchAll(/<\/?([a-zA-Z][\w-]*)\b[^>]*>/g)) {
    const token = match[0];
    const name = match[1].toLowerCase();
    if (voids.has(name) || /\/\s*>$/.test(token)) continue;
    if (token.startsWith('</')) {
      if (stack.pop() !== name) return false;
    } else {
      stack.push(name);
    }
  }
  return stack.length === 0;
}

function countLdJson(html: string): number {
  return countMatches(html, /<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>/gi);
}

function getLdJsonRaw(html: string): string {
  return (
    /<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i.exec(html)?.[1] ||
    ''
  );
}

/**
 * Counts BreadcrumbList entities across every ld+json block in the response.
 * Parses JSON instead of grepping for the type name so a block that merely
 * mentions "BreadcrumbList" in a description cannot produce a false positive.
 */
function countBreadcrumbLists(html: string): number {
  const pattern =
    /<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let count = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      const nodes = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.['@graph'])
          ? parsed['@graph']
          : [parsed];
      if (nodes.some((node: any) => node && node['@type'] === 'BreadcrumbList')) {
        count++;
      }
    } catch {
      // Non-JSON payloads are covered by the surrounding ld+json tests.
    }
  }

  return count;
}

function countHelmetOwned(html: string): number {
  return countMatches(html, /data-rh="true"/g);
}

function extractSeoLists(html: string): { films: any[]; articles: any[] } | null {
  const raw = /<script id="seo-lists" type="application\/json">([\s\S]*?)<\/script>/.exec(html)?.[1];
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function expectSingleSeoTagSet(label: string, html: string, check: (name: string, ok: boolean) => void): void {
  const counts = {
    description: countMatches(html, /<meta\s+name=["']description["']/gi),
    canonical: countMatches(html, /<link\s+rel=["']canonical["']/gi),
    ogTitle: countMatches(html, /<meta\s+property=["']og:title["']/gi),
    ogDescription: countMatches(html, /<meta\s+property=["']og:description["']/gi),
    ogUrl: countMatches(html, /<meta\s+property=["']og:url["']/gi),
    twitterTitle: countMatches(html, /<meta\s+name=["']twitter:title["']/gi),
    twitterDescription: countMatches(html, /<meta\s+name=["']twitter:description["']/gi),
  };
  check(
    `${label} has exactly one description/canonical/OG/Twitter tag`,
    Object.values(counts).every(count => count === 1)
  );
}

async function runCrawlerBodyTests(): Promise<{ passed: number; failed: number }> {
  console.log('\n--- Crawler body content assertions ---\n');

  let passed = 0;
  let failed = 0;

  const check = (name: string, ok: boolean) => {
    if (ok) {
      passed++;
      console.log(`✅ ${name}`);
    } else {
      failed++;
      console.error(`❌ ${name}`);
    }
  };

  const botRequest = (path: string) =>
    new Request(`https://www.sotoyfilm.my.id${path}`, {
      method: 'GET',
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      },
    });

  check(
    "'/search' route metadata has noindex true",
    STATIC_ROUTE_METADATA_CONFIG['/search']?.noindex === true
  );

  // Film body content for crawlers
  {
    const response = await middleware(botRequest('/film/breaking-bad'));
    const html = await response.text();
    const root = getRootContent(html);

    check('bot film response injects <article> inside #root', root.includes('<article>'));
    check(
      'bot film body contains the h1 title and year',
      root.includes('<h1>Breaking Bad (2008)</h1>')
    );
    check('bot film body contains synopsis text', root.includes('chemistry teacher'));
    check(
      'bot film body contains director, cast, genres and duration',
      ['Vince Gilligan', 'Bryan Cranston', 'Drama', '49m'].every(value =>
        root.includes(value)
      )
    );
    check(
      'bot film body contains Skor Sotoy and vote count',
      root.includes('Skor Sotoy 9.2/10') && root.includes('1250 votes')
    );
    check(
      'bot film response uses the short HTML cache',
      (response.headers.get('cache-control') || '').includes('s-maxage=60')
    );

    const filmSchemaRaw = getLdJsonRaw(html);
    let filmSchema: any = null;
    try {
      filmSchema = filmSchemaRaw ? JSON.parse(filmSchemaRaw) : null;
    } catch {
      filmSchema = null;
    }
    check(
      'bot film JSON-LD still parses as a Movie',
      filmSchema?.['@type'] === 'Movie' && filmSchema?.name === 'Breaking Bad'
    );
  }

  // aggregateRating guard: the bot-visible score and JSON-LD must agree.
  {
    const response = await middleware(botRequest('/film/legacy-rating-film'));
    const html = await response.text();
    const root = getRootContent(html);
    const rawSchema = getLdJsonRaw(html);
    let schema: any = null;
    try {
      schema = rawSchema ? JSON.parse(rawSchema) : null;
    } catch {
      schema = null;
    }

    check(
      'legacy film body prints the doubled Skor Sotoy 9.2/10',
      root.includes('Skor Sotoy 9.2/10') && root.includes('3 votes')
    );
    check(
      'legacy film JSON-LD ratingValue equals the body score',
      schema?.aggregateRating?.ratingValue === 9.2
    );
    check(
      'legacy film JSON-LD uses numeric bounds and the real ratingCount',
      schema?.aggregateRating?.bestRating === 10 &&
        schema?.aggregateRating?.worstRating === 1 &&
        schema?.aggregateRating?.ratingCount === 3
    );
  }

  for (const slug of [
    'votes-zero-film',
    'votes-one-film',
    'votes-two-film',
    'zero-score-film',
  ]) {
    const response = await middleware(botRequest(`/film/${slug}`));
    const html = await response.text();
    const rawSchema = getLdJsonRaw(html);
    let schema: any = null;
    try {
      schema = rawSchema ? JSON.parse(rawSchema) : null;
    } catch {
      schema = null;
    }
    check(`${slug}: no aggregateRating is emitted`, schema?.aggregateRating === undefined);
  }

  // Article body content for crawlers
  {
    const response = await middleware(botRequest('/artikel/published-article'));
    const html = await response.text();
    const root = getRootContent(html);

    check('bot article response injects <article> inside #root', root.includes('<article>'));
    check(
      'bot article body contains the h1 title',
      root.includes('<h1>Published Article Title</h1>')
    );
    check(
      'bot article byline links to the author profile when authorId exists',
      root.includes('<p>Oleh <a href="/user/author-1">Raka Pratama</a></p>')
    );
    check(
      'bot article body does not leak the author email',
      !root.includes('private-author@example.com')
    );
    check(
      'bot article body uses an ISO datetime and a readable Indonesian date',
      /<time datetime="2026-10-20T[^"]+">20 Oktober 2026<\/time>/.test(root)
    );
    check(
      'bot article emits article:modified_time',
      getOgContent(html, 'article:modified_time') === '2026-10-20T09:30:00.000Z'
    );
    check(
      'bot article body contains the excerpt and article text',
      root.includes('This is a published article excerpt.') && root.includes('sweeping epic')
    );
    check(
      'bot article body strips injected <script> markup',
      !root.includes('<script>') && !root.includes('alert(') && root.includes('sweeping epic')
    );
    check(
      'bot article response uses the short HTML cache',
      (response.headers.get('cache-control') || '').includes('s-maxage=60')
    );

    const articleSchemaRaw = getLdJsonRaw(html);
    let articleSchema: any = null;
    try {
      articleSchema = articleSchemaRaw ? JSON.parse(articleSchemaRaw) : null;
    } catch {
      articleSchema = null;
    }
    check(
      'bot article JSON-LD still parses as a NewsArticle',
      articleSchema?.['@type'] === 'NewsArticle' &&
        articleSchema?.headline === 'Published Article Title'
    );
    check(
      'bot JSON-LD dateModified falls back to datePublished when updatedAt is absent',
      articleSchema?.dateModified === articleSchema?.datePublished &&
        articleSchema?.datePublished === '2026-10-20T09:30:00.000Z'
    );
    check(
      'bot JSON-LD author.url points to the author profile',
      articleSchema?.author?.url === 'https://www.sotoyfilm.my.id/user/author-1'
    );
  }

  // Articles without an authorId keep a plain byline and no author URL
  {
    const html = await (await middleware(botRequest('/artikel/canonical-article-slug'))).text();
    const root = getRootContent(html);
    const schema = JSON.parse(getLdJsonRaw(html));

    check(
      'article without authorId keeps a plain Oleh byline',
      root.includes('<p>Oleh Raka Pratama</p>') && !root.includes('/user/')
    );
    check('article without authorId has no author.url in JSON-LD', schema?.author?.url === undefined);
  }

  // Public author profiles (/user/:id)
  {
    check('middleware matcher includes the author profile route', config.matcher.includes('/user/:path*'));

    const response = await middleware(botRequest('/user/author-1'));
    const html = await response.text();
    const root = getRootContent(html);
    const schema = JSON.parse(getLdJsonRaw(html));

    check('bot author profile returns 200', response.status === 200);
    check('bot author profile title is the author byline title', html.includes('<title>Raka Pratama - Penulis di Sotoy Film</title>'));
    check(
      'bot author profile canonical is the real /user/<id> path',
      getCanonicalHref(html) === 'https://www.sotoyfilm.my.id/user/author-1'
    );
    check(
      'bot author profile keeps standard OpenGraph tags',
      getOgContent(html, 'og:title') === 'Raka Pratama - Penulis di Sotoy Film' &&
        getOgContent(html, 'og:url') === 'https://www.sotoyfilm.my.id/user/author-1' &&
        getOgContent(html, 'og:description') === 'Penulis sinema dan budaya populer.' &&
        getOgContent(html, 'og:type') === 'profile'
    );
    check(
      'bot author profile JSON-LD is a ProfilePage with the Person mainEntity',
      schema?.['@type'] === 'ProfilePage' &&
        schema?.mainEntity?.['@type'] === 'Person' &&
        schema?.mainEntity?.name === 'Raka Pratama' &&
        schema?.mainEntity?.url === 'https://www.sotoyfilm.my.id/user/author-1' &&
        schema?.mainEntity?.description === 'Penulis sinema dan budaya populer.' &&
        typeof schema?.mainEntity?.image === 'string'
    );
    check(
      'bot author profile body lists published articles by title with site paths',
      root.includes('<h1>Raka Pratama</h1>') &&
        root.includes('Penulis sinema dan budaya populer.') &&
        root.includes('<a href="/artikel/published-article">Published Article Title</a>') &&
        root.includes('<a href="/artikel/author-1-second">Second Author Article</a>')
    );
    check(
      'bot author profile emits at most 30 article links',
      countMatches(root, /<a href="\/artikel\//g) <= 30
    );
    check('bot author profile is indexable', response.headers.get('x-robots-tag') === 'all');
    check(
      'bot author profile never exposes private user fields',
      ![
        'private-author@example.com',
        '+62-812-3456-7890',
        '@raka-privat',
        'auth-uid-abc',
        'admin',
      ].some(secret => html.includes(secret))
    );
  }

  {
    const response = await middleware(botRequest('/user/author-empty'));
    const html = await response.text();
    const root = getRootContent(html);

    check('author without published articles stays a 200 page', response.status === 200);
    check(
      'author without published articles is noindex',
      getMetaContent(html, 'robots') === 'noindex, follow' &&
        response.headers.get('x-robots-tag') === 'noindex, follow'
    );
    check('author without published articles has no article list', !root.includes('/artikel/'));
  }

  {
    const response = await middleware(botRequest('/user/author-missing'));
    const html = await response.text();

    check('missing author returns 404', response.status === 404);
    check(
      'missing author is noindex with no article list',
      getMetaContent(html, 'robots') === 'noindex, follow' &&
        !getRootContent(html).includes('/artikel/')
    );
  }

  {
    const humanResponse = await middleware(
      new Request('https://www.sotoyfilm.my.id/user/author-1', {
        headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0' },
      })
    );
    check(
      'human visitor on /user/:id still passes through',
      humanResponse.headers.get('x-middleware-next') === '1' && (await humanResponse.text()) === ''
    );
  }

  // Modified dates: only a meaningful gap produces a second <time>
  {
    const response = await middleware(botRequest('/artikel/updated-article'));
    const html = await response.text();
    const root = getRootContent(html);

    check(
      'edited article keeps the original publish date',
      /<time datetime="2026-10-21T[^"]+">21 Oktober 2026<\/time>/.test(root)
    );
    check(
      'edited article shows Diperbarui when modified is over a day later',
      /<time datetime="2026-11-21T[^"]+">Diperbarui: 21 November 2026<\/time>/.test(root)
    );
    check(
      'edited article emits article:modified_time',
      getOgContent(html, 'article:modified_time') === '2026-11-21T09:30:00.000Z'
    );

    const rawSchema = getLdJsonRaw(html);
    let schema: any = null;
    try {
      schema = rawSchema ? JSON.parse(rawSchema) : null;
    } catch {
      schema = null;
    }
    check(
      'bot JSON-LD dateModified uses pickArticleIsoDate(modified)',
      schema?.datePublished === '2026-10-21T09:30:00.000Z' &&
        schema?.dateModified === '2026-11-21T09:30:00.000Z'
    );

    const noUpdate = buildArticleBodyHtml({
      title: 'No Updated At',
      publishedAtTimestamp: '2026-10-21T09:30:00.000Z',
      publishedAt: '21 Okt 2026',
    });
    check('missing updatedAt does not add a Diperbarui line', !noUpdate.includes('Diperbarui'));

    const smallGap = buildArticleBodyHtml({
      title: 'Small Gap',
      publishedAtTimestamp: '2026-10-21T09:30:00.000Z',
      updatedAt: '2026-10-22T00:30:00.000Z',
    });
    check('a modification within one day does not add Diperbarui', !smallGap.includes('Diperbarui'));
  }

  // Article canonicalization: every alias ends at the document slug in one hop.
  {
    const canonicalPath = '/artikel/canonical-article-slug';
    const canonicalBase = 'https://www.sotoyfilm.my.id';

    const slugResponse = await middleware(botRequest(canonicalPath));
    const slugHtml = await slugResponse.text();

    check('canonical article slug returns 200', slugResponse.status === 200);
    check(
      'canonical article slug emits exactly one canonical tag',
      countMatches(slugHtml, /<link\s+rel=["']canonical["']/gi) === 1
    );
    check(
      'canonical article slug canonical is the document slug',
      getCanonicalHref(slugHtml) === `${canonicalBase}${canonicalPath}`
    );

    for (const aliasPath of [
      '/artikel/canonical-article-title',
      '/artikel/canonical-article-seo-title',
      '/artikel/article-doc-id-1',
    ]) {
      const aliasResponse = await middleware(botRequest(aliasPath));

      check(
        `${aliasPath} 301s to the canonical slug in one hop`,
        aliasResponse.status === 301 &&
          aliasResponse.headers.get('location') === canonicalPath
      );
    }

    const aliasResponse = await middleware(botRequest('/article/canonical-article-slug'));
    check(
      '/article/:slug 301s to /artikel/:slug in one hop',
      aliasResponse.status === 301 &&
        aliasResponse.headers.get('location') === canonicalPath
    );
  }

  // Tiptap JSON keeps its heading structure
  {
    const response = await middleware(botRequest('/artikel/tiptap-article'));
    const root = getRootContent(await response.text());

    check(
      'bot article body renders Tiptap paragraphs and headings structurally',
      root.includes('<p>First Tiptap paragraph about cinema.</p>') &&
        root.includes('<h2>Second Tiptap heading</h2>')
    );
  }

  // Structured markdown body: headings, lists, table and links survive
  {
    const response = await middleware(botRequest('/artikel/structured-article'));
    const root = getRootContent(await response.text());

    check('structured markdown: h2 and h3 are preserved', root.includes('<h2>Mengapa sinema penting</h2>') && root.includes('<h3>Catatan editor</h3>'));
    check(
      'structured markdown: unordered and ordered lists are preserved',
      root.includes('<ul><li>Pendekatan pertama</li><li>Pendekatan kedua</li></ul>') &&
        root.includes('<ol><li>Langkah pertama</li><li>Langkah kedua</li></ol>')
    );
    check(
      'structured markdown: table with thead/tbody/th/td is preserved',
      root.includes('<table><thead><tr><th>Film</th><th>Skor</th></tr></thead><tbody><tr><td>Dune</td><td>9.2</td></tr></tbody></table>')
    );
    check(
      'structured markdown: blockquote, strong and em are preserved',
      root.includes('<blockquote><p>Kutipan penting dengan <strong>tebal</strong> dan <em>miring</em>.</p></blockquote>')
    );
    check(
      'structured markdown: internal link keeps its site path and has no rel',
      /<a href="\/artikel\/panduan-film">panduan film<\/a>/.test(root)
    );
    check(
      'structured markdown: external link gets rel="noopener"',
      /<a href="https:\/\/example\.com\/review" rel="noopener">ulasan luar<\/a>/.test(root)
    );
    check(
      'structured markdown: related block uses real slugs and readable labels',
      root.includes('<a href="/kategori/movies">Kategori Movies</a>') &&
        root.includes('<a href="/film/boyhood">Boyhood</a>') &&
        root.includes('<a href="/artikel/published-article">Published Article Title</a>')
    );
    check(
      'structured markdown: ID-only related references are dropped',
      !root.includes('/film/breaking-bad') &&
        !root.includes('>breaking-bad<') &&
        !root.includes('>published-article<')
    );
    check('structured markdown: raw script markup is never a live tag', !root.includes('<script') && !root.includes('alert('));
    check('structured markdown: all tags are balanced', hasBalancedTags(root));
  }

  // Legacy HTML body is sanitized against the same allowlist
  {
    const response = await middleware(botRequest('/artikel/unsafe-html-article'));
    const root = getRootContent(await response.text());

    check(
      'legacy HTML: structural tags survive sanitization',
      root.includes('<h2>Judul bagian</h2>') &&
        root.includes('<h3>Subbagian</h3>') &&
        root.includes('<ul><li>Satu</li><li>Dua</li></ul>') &&
        root.includes('<ol><li>Pertama</li><li>Kedua</li></ol>') &&
        root.includes('<table><thead><tr><th>Film</th></tr></thead><tbody><tr><td>Dune</td></tr></tbody></table>')
    );
    check(
      'legacy HTML: script/style/iframe/unknown tags are stripped',
      !root.includes('<script') &&
        !root.includes('alert(') &&
        !root.includes('<div') &&
        !root.includes('<img') &&
        root.includes('Teks dari div')
    );
    check(
      'legacy HTML: on* attributes never survive',
      !/\son[a-z]+\s*=/i.test(root) && !root.includes('data-x=') && !root.includes('class=')
    );
    check(
      'legacy HTML: internal link is plain, external link has rel="noopener"',
      /<a href="\/film\/breaking-bad">film<\/a>/.test(root) &&
        /<a href="https:\/\/example\.com\/ulasan" rel="noopener">luar<\/a>/.test(root)
    );
    check(
      'legacy HTML: javascript: link becomes plain text',
      !root.includes('<a href="javascript:') && root.includes('taut berbahaya')
    );
    check('legacy HTML: all tags are balanced', hasBalancedTags(root));
  }

  // The cap is applied to complete elements, with every tag closed
  {
    const root = getRootContent(
      await (await middleware(botRequest('/artikel/structured-article'))).text()
    );
    check('bot article body stays below the 20,000 character cap', root.length <= 20000);

    const oversized = buildArticleBodyHtml({
      title: 'Oversized Structured Article',
      excerpt: 'A long article.',
      content: `## Bagian besar\n\n${Array(5000).fill('kata').join(' ')}\n\n- item\n\n| A | B |\n| --- | --- |\n| 1 | 2 |`,
    });
    check('oversized bot body never exceeds the cap', oversized.length <= 20000);
    check('oversized bot body closes every tag', hasBalancedTags(oversized));
    check('oversized bot body ends with </article>', oversized.endsWith('</article>'));
    check('oversized bot body never contains a cut tag', !/<[^>]*$/.test(oversized.slice(0, -10)));
  }

  // Meta-only lookup is enriched with the full article document
  {
    const response = await middleware(botRequest('/artikel/meta-only-article'));
    const html = await response.text();
    const root = getRootContent(html);

    check(
      'meta-only lookup still renders a bot response',
      response.status === 200 && response.headers.get('x-middleware-next') !== '1'
    );
    check(
      'full-document content reaches the crawler body',
      root.includes('Meta-only lookup body text about a slow-burn western.')
    );
    check(
      'full-document author reaches the crawler body',
      root.includes('Nadia Prameswari')
    );
    check(
      'full-document author email is not rendered in the body',
      !root.includes('private-full-author@example.com')
    );

    const prefetch = /<script id="seo-prefetch" type="application\/json">([\s\S]*?)<\/script>/.exec(
      html
    )?.[1] || '';
    let parsed: any = null;
    try {
      parsed = prefetch ? JSON.parse(prefetch) : null;
    } catch {
      parsed = null;
    }

    check(
      'prefetch payload includes full-document content',
      typeof parsed?.data?.content === 'string' &&
        parsed.data.content.includes('slow-burn western')
    );
    check(
      'prefetch payload includes the full-document author name',
      parsed?.data?.author?.name === 'Nadia Prameswari'
    );
    check(
      'prefetch payload drops the full-document author email',
      prefetch.length > 0 && !prefetch.includes('private-full-author@example.com')
    );
  }

  // Full-document fetch failure keeps the meta-only crawler block
  {
    const response = await middleware(botRequest('/artikel/full-doc-fail-article'));
    const html = await response.text();
    const root = getRootContent(html);

    check(
      'failed full-document fetch still renders a bot response',
      response.status === 200 && response.headers.get('x-middleware-next') !== '1'
    );
    check(
      'failed full-document fetch keeps the meta-only crawler block',
      root.includes('<h1>Full Doc Fail Article</h1>') &&
        root.includes('Metadata-only excerpt survives.')
    );
  }

  // Human visitors are untouched
  {
    const response = await middleware(
      new Request('https://www.sotoyfilm.my.id/film/breaking-bad', {
        method: 'GET',
        headers: {
          'user-agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        },
      })
    );
    const humanBody = await response.text();

    check(
      'normal browser UA still passes through untouched',
      response.headers.get('x-middleware-next') === '1' && humanBody === ''
    );
    check(
      'normal browser response does not include the seo-prefetch script',
      !humanBody.includes('seo-prefetch')
    );
  }

  // Season sub-routes reuse the film response with a noindex canonical
  {
    const canonicalBase = 'https://www.sotoyfilm.my.id/film/breaking-bad';

    const detailResponse = await middleware(botRequest('/film/breaking-bad'));
    const detailHtml = await detailResponse.text();
    check(
      '/film/:slug keeps its detail canonical',
      getCanonicalHref(detailHtml) === canonicalBase
    );
    check(
      '/film/:slug keeps the indexable x-robots-tag',
      detailResponse.headers.get('x-robots-tag') === 'all'
    );
    check(
      '/film/:slug detail title is unchanged',
      detailHtml.includes('<title>Breaking Bad (2008) — Skor Sotoy & Review Film') ||
        detailHtml.includes('Skor Sotoy &amp; Review Film')
    );

    const seasonsResponse = await middleware(botRequest('/film/breaking-bad/seasons'));
    const seasonsHtml = await seasonsResponse.text();
    check(
      '/film/:slug/seasons returns 200 HTML',
      seasonsResponse.status === 200 &&
        (seasonsResponse.headers.get('content-type') || '').includes('text/html')
    );
    check(
      '/film/:slug/seasons canonical points at the film page',
      getCanonicalHref(seasonsHtml) === canonicalBase
    );
    check(
      '/film/:slug/seasons has a noindex,follow robots meta',
      getMetaContent(seasonsHtml, 'robots') === 'noindex, follow'
    );
    check(
      '/film/:slug/seasons sets the noindex x-robots-tag',
      seasonsResponse.headers.get('x-robots-tag') === 'noindex, follow'
    );
    check('/film/:slug/seasons title mentions all seasons', seasonsHtml.includes('Semua Season'));

    const seasonResponse = await middleware(botRequest('/film/breaking-bad/season/2'));
    const seasonHtml = await seasonResponse.text();
    check(
      '/film/:slug/season/:n returns 200 HTML',
      seasonResponse.status === 200 &&
        (seasonResponse.headers.get('content-type') || '').includes('text/html')
    );
    check(
      '/film/:slug/season/:n canonical points at the film page',
      getCanonicalHref(seasonHtml) === canonicalBase
    );
    check(
      '/film/:slug/season/:n has a noindex,follow robots meta',
      getMetaContent(seasonHtml, 'robots') === 'noindex, follow'
    );
    check(
      '/film/:slug/season/:n title mentions the season number',
      seasonHtml.includes('Season 2')
    );

    const invalidSeasonResponse = await middleware(botRequest('/film/breaking-bad/season/abc'));
    check(
      'invalid season number falls through to safeNext()',
      invalidSeasonResponse.headers.get('x-middleware-next') === '1' &&
        (await invalidSeasonResponse.text()) === ''
    );

    const unknownSubpathResponse = await middleware(botRequest('/film/breaking-bad/other'));
    check(
      'unknown film subpath falls through to safeNext()',
      unknownSubpathResponse.headers.get('x-middleware-next') === '1' &&
        (await unknownSubpathResponse.text()) === ''
    );
  }

  // Embedded prefetch payload for JS-rendering crawlers
  {
    const filmResponse = await middleware(botRequest('/film/breaking-bad'));
    const filmHtml = await filmResponse.text();
    check(
      'bot film response embeds <script id="seo-prefetch">',
      filmHtml.includes('<script id="seo-prefetch" type="application/json">')
    );
    const filmPrefetch = /<script id="seo-prefetch" type="application\/json">([\s\S]*?)<\/script>/.exec(
      filmHtml
    )?.[1];
    let filmParsed: any = null;
    try {
      filmParsed = filmPrefetch ? JSON.parse(filmPrefetch) : null;
    } catch {
      filmParsed = null;
    }
    check(
      'bot film prefetch payload is valid, kind=film and matches the URL slug',
      filmParsed?.kind === 'film' &&
        filmParsed?.slug === 'breaking-bad' &&
        filmParsed?.data?.title === 'Breaking Bad'
    );
    check(
      'bot film prefetch payload does not contain emails or admin fields',
      !!filmPrefetch &&
        !filmPrefetch.includes('private-film@example.com') &&
        !filmPrefetch.includes('Internal film note')
    );

    const articleResponse = await middleware(botRequest('/artikel/published-article'));
    const articleHtml = await articleResponse.text();
    check(
      'bot article response embeds <script id="seo-prefetch">',
      articleHtml.includes('<script id="seo-prefetch" type="application/json">')
    );
    const articlePrefetch = /<script id="seo-prefetch" type="application\/json">([\s\S]*?)<\/script>/.exec(
      articleHtml
    )?.[1] || '';
    let articleParsed: any = null;
    try {
      articleParsed = articlePrefetch ? JSON.parse(articlePrefetch) : null;
    } catch {
      articleParsed = null;
    }
    check(
      'bot article prefetch payload is valid, kind=article and matches the URL slug',
      articleParsed?.kind === 'article' &&
        articleParsed?.slug === 'published-article' &&
        articleParsed?.data?.title === 'Published Article Title'
    );
    check(
      'bot article prefetch payload does not contain the author email',
      articlePrefetch.length > 0 && !articlePrefetch.includes('private-author@example.com')
    );
    check(
      'bot prefetch payload escapes <script> content',
      articlePrefetch.length > 0 &&
        !articlePrefetch.includes('</script>') &&
        !articlePrefetch.includes('<script>')
    );
  }

  // --- Person & people routes (TMDB-backed) ---
  {
    const canonicalBase = 'https://www.sotoyfilm.my.id';

    const response = await middleware(botRequest('/person/287-brad-pitt'));
    const html = await response.text();
    const root = getRootContent(html);

    check(
      '/person/:id-slug returns 200 HTML for bots',
      response.status === 200 &&
        (response.headers.get('content-type') || '').includes('text/html')
    );
    check(
      '/person title matches the PersonPage SEOHead wording',
      html.includes('<title>Brad Pitt - Biografi dan Filmografi | Sotoy Film</title>')
    );
    check(
      '/person description comes from the TMDB biography',
      getMetaContent(html, 'description').includes('American actor and film producer')
    );
    check(
      '/person canonical is the canonical id-slug form',
      getCanonicalHref(html) === `${canonicalBase}/person/287-brad-pitt`
    );
    check(
      '/person og:image uses the w500 profile path',
      getOgContent(html, 'og:image') === 'https://image.tmdb.org/t/p/w500/brad-pitt.jpg'
    );
    check('/person og:type is profile', getOgContent(html, 'og:type') === 'profile');
    check(
      '/person sets the indexable x-robots-tag',
      response.headers.get('x-robots-tag') === 'all'
    );
    check(
      '/person uses the short HTML cache',
      (response.headers.get('cache-control') || '').includes('s-maxage=60')
    );

    const schemaRaw = getLdJsonRaw(html);
    let schema: any = null;
    try {
      schema = schemaRaw ? JSON.parse(schemaRaw) : null;
    } catch {
      schema = null;
    }

    check(
      '/person JSON-LD is a Person with birth and job data',
      schema?.['@type'] === 'Person' &&
        schema?.name === 'Brad Pitt' &&
        schema?.birthDate === '1963-12-18' &&
        schema?.birthPlace?.name === 'Shawnee, Oklahoma, USA' &&
        schema?.jobTitle === 'Acting' &&
        schema?.url === `${canonicalBase}/person/287-brad-pitt`
    );

    check(
      '/person body has h1, department, biography and known-for credits',
      root.includes('<h1>Brad Pitt</h1>') &&
        root.includes('<p>Acting</p>') &&
        root.includes('American actor and film producer') &&
        root.includes('Fight Club (1999)')
    );
    check('/person body drops adult credits', !root.includes('Adult Credit'));
    check('/person body escapes biography text', !root.includes('<script>'));
  }

  // A mismatched requested slug never changes the canonical and never redirects
  {
    const response = await middleware(botRequest('/person/287-totally-wrong-slug'));
    const html = await response.text();

    check(
      'requested slug mismatch still yields the canonical URL',
      response.status === 200 &&
        response.headers.get('location') === null &&
        getCanonicalHref(html) === 'https://www.sotoyfilm.my.id/person/287-brad-pitt'
    );
  }

  // Script-breaking TMDB text must never escape the JSON-LD script tag
  {
    const response = await middleware(botRequest('/person/31337-xss-person'));
    const html = await response.text();

    const ldRaw = getLdJsonRaw(html);

    let ldSchema: any = null;
    try {
      ldSchema = ldRaw ? JSON.parse(ldRaw) : null;
    } catch {
      ldSchema = null;
    }

    check(
      'script-breaking person JSON-LD cannot close the script tag',
      ldRaw !== '' && !ldRaw.includes('<') && ldRaw.includes('\\u003c')
    );
    check(
      'script-breaking person JSON-LD round-trips to the original text',
      ldSchema?.['@type'] === 'Person' &&
        ldSchema?.name === '</script><b>x</b>' &&
        ldSchema?.description === 'Bio </script><b>x</b> end'
    );
    check(
      'person JSON-LD omits image when profile_path is empty',
      ldSchema !== null && !('image' in ldSchema)
    );
  }

  // /people gets its own metadata plus a linked crawler body
  {
    const response = await middleware(botRequest('/people'));
    const html = await response.text();
    const root = getRootContent(html);

    check(
      '/people returns 200 HTML for bots',
      response.status === 200 &&
        (response.headers.get('content-type') || '').includes('text/html')
    );
    check(
      '/people title matches the PeoplePage SEOHead wording',
      html.includes('<title>Orang Populer - Aktor, Sutradara, dan Kru | Sotoy Film</title>')
    );
    check(
      '/people description matches the PeoplePage SEOHead wording',
      getMetaContent(html, 'description') ===
        'Daftar aktor, sutradara, dan kru film serta series yang sedang ramai dibicarakan minggu ini, lengkap dengan biografi dan filmografi.'
    );
    check(
      '/people canonical points at /people',
      getCanonicalHref(html) === 'https://www.sotoyfilm.my.id/people'
    );
    check(
      '/people body lists popular people as canonical links',
      root.includes('<h1>Orang Populer</h1>') &&
        root.includes('<a href="/person/287-brad-pitt">Brad Pitt</a>') &&
        root.includes('<a href="/person/1245-scarlett-johansson">Scarlett Johansson</a>')
    );
    check(
      '/people does not receive the film/article list payload',
      !html.includes('id="seo-lists"')
    );
  }

  // Fall-through cases: the SPA must still load for every failure mode
  {
    const invalidId = await middleware(botRequest('/person/abc'));
    check(
      'invalid person id falls through to safeNext()',
      invalidId.headers.get('x-middleware-next') === '1' && (await invalidId.text()) === ''
    );

    const adult = await middleware(botRequest('/person/55555-adult-person'));
    check(
      'adult person falls through to safeNext()',
      adult.headers.get('x-middleware-next') === '1' && (await adult.text()) === ''
    );

    tmdbMock.person = 'not-found';
    const notFound = await middleware(botRequest('/person/999999-missing-person'));
    tmdbMock.person = 'ok';
    check(
      'TMDB 404 falls through to safeNext()',
      notFound.headers.get('x-middleware-next') === '1' && (await notFound.text()) === ''
    );

    tmdbMock.person = 'timeout';
    const timedOut = await middleware(botRequest('/person/77777-timeout-person'));
    tmdbMock.person = 'ok';
    check(
      'TMDB timeout falls through to safeNext()',
      timedOut.headers.get('x-middleware-next') === '1' && (await timedOut.text()) === ''
    );

    const previousKey = process.env.TMDB_API_KEY;
    delete process.env.TMDB_API_KEY;
    const missingKey = await middleware(botRequest('/person/88888-no-key-person'));
    if (previousKey === undefined) {
      delete process.env.TMDB_API_KEY;
    } else {
      process.env.TMDB_API_KEY = previousKey;
    }
    check(
      'missing TMDB_API_KEY falls through to safeNext()',
      missingKey.headers.get('x-middleware-next') === '1' && (await missingKey.text()) === ''
    );

    const humanResponse = await middleware(
      new Request('https://www.sotoyfilm.my.id/person/287-brad-pitt', {
        method: 'GET',
        headers: {
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        },
      })
    );
    check(
      'human UA on /person/:id passes through untouched',
      humanResponse.headers.get('x-middleware-next') === '1' &&
        (await humanResponse.text()) === ''
    );
  }

  // --- Franchise routes (TMDB collection-backed) ---
  {
    const canonicalBase = 'https://www.sotoyfilm.my.id';

    const response = await middleware(botRequest('/franchise/119-the-lord-of-the-rings'));
    const html = await response.text();
    const root = getRootContent(html);

    check(
      '/franchise/:id-slug returns 200 HTML for bots',
      response.status === 200 &&
        (response.headers.get('content-type') || '').includes('text/html')
    );
    check(
      '/franchise title matches the FranchisePage SEOHead wording',
      html.includes('<title>The Lord of the Rings Collection - Semua Film Franchise | Sotoy Film</title>')
    );
    check(
      '/franchise description matches the FranchisePage SEOHead wording',
      getMetaContent(html, 'description') ===
        'Daftar semua film dalam franchise The Lord of the Rings Collection di Sotoy Film, diurutkan berdasarkan tanggal rilis, lengkap dengan Skor Sotoy.'
    );
    check(
      '/franchise canonical is the canonical id-slug form',
      getCanonicalHref(html) === `${canonicalBase}/franchise/119-the-lord-of-the-rings-collection`
    );
    check(
      '/franchise og:image falls back to og-default.png',
      getOgContent(html, 'og:image') === `${canonicalBase}/og-default.png`
    );
    check('/franchise og:type is website', getOgContent(html, 'og:type') === 'website');
    check(
      '/franchise sets the indexable x-robots-tag',
      response.headers.get('x-robots-tag') === 'all'
    );
    check(
      '/franchise uses the short HTML cache',
      (response.headers.get('cache-control') || '').includes('s-maxage=60')
    );

    const schemaRaw = getLdJsonRaw(html);
    let schema: any = null;
    try {
      schema = schemaRaw ? JSON.parse(schemaRaw) : null;
    } catch {
      schema = null;
    }

    check(
      '/franchise JSON-LD is a BreadcrumbList Home -> name',
      schema?.['@type'] === 'BreadcrumbList' &&
        schema?.itemListElement?.[0]?.name === 'Home' &&
        schema?.itemListElement?.[1]?.name === 'The Lord of the Rings Collection' &&
        schema?.itemListElement?.[1]?.item ===
          `${canonicalBase}/franchise/119-the-lord-of-the-rings-collection`
    );

    check(
      '/franchise body has h1 and an ordered list',
      root.includes('<h1>The Lord of the Rings Collection</h1>') &&
        root.includes('<ol>') &&
        root.includes('</ol>')
    );
    check(
      '/franchise body lists parts with titles and years',
      root.includes('The Fellowship of the Ring (2001)') &&
        root.includes('The Two Towers (2002)') &&
        root.includes('The Return of the King (2003)')
    );
    check(
      '/franchise body sorts parts by release date ascending',
      root.indexOf('Fellowship of the Ring (2001)') <
        root.indexOf('The Two Towers (2002)') &&
        root.indexOf('The Two Towers (2002)') <
          root.indexOf('The Return of the King (2003)')
    );
    check('/franchise body drops adult parts', !root.includes('Adult Part'));
    check(
      '/franchise body has no links to non-existent pages',
      !root.includes('<a ')
    );
    check('/franchise body escapes part titles', !root.includes('<script>'));
  }

  // A mismatched requested slug never changes the canonical and never redirects
  {
    const response = await middleware(botRequest('/franchise/119-totally-wrong-slug'));
    const html = await response.text();

    check(
      'requested franchise slug mismatch still yields the canonical URL',
      response.status === 200 &&
        response.headers.get('location') === null &&
        getCanonicalHref(html) ===
          'https://www.sotoyfilm.my.id/franchise/119-the-lord-of-the-rings-collection'
    );
  }

  // Script-breaking TMDB text must stay escaped in the crawler body
  {
    const response = await middleware(botRequest('/franchise/31337-xss-collection'));
    const html = await response.text();
    const root = getRootContent(html);

    check(
      'script-breaking franchise name and part titles are escaped',
      root.includes('&lt;/script&gt;&lt;b&gt;x&lt;/b&gt;') &&
        !root.includes('</script><b>') &&
        getCanonicalHref(html) ===
          'https://www.sotoyfilm.my.id/franchise/31337-scriptbxb-collection'
    );
  }

  // The matcher must cover /franchise/:path*
  {
    check(
      "middleware matcher includes '/franchise/:path*'",
      Array.isArray(config.matcher) && config.matcher.includes('/franchise/:path*')
    );
  }

  // Fall-through cases: the SPA must still load for every failure mode
  {
    const invalidId = await middleware(botRequest('/franchise/abc'));
    check(
      'invalid franchise id falls through to safeNext()',
      invalidId.headers.get('x-middleware-next') === '1' && (await invalidId.text()) === ''
    );

    const adultOnly = await middleware(botRequest('/franchise/22222-adult-collection'));
    check(
      'adult-only collection falls through to safeNext()',
      adultOnly.headers.get('x-middleware-next') === '1' && (await adultOnly.text()) === ''
    );

    const empty = await middleware(botRequest('/franchise/33333-empty'));
    check(
      'empty collection falls through to safeNext()',
      empty.headers.get('x-middleware-next') === '1' && (await empty.text()) === ''
    );

    tmdbMock.collection = 'not-found';
    const notFound = await middleware(botRequest('/franchise/999999-missing-collection'));
    tmdbMock.collection = 'ok';
    check(
      'TMDB 404 falls through to safeNext()',
      notFound.headers.get('x-middleware-next') === '1' && (await notFound.text()) === ''
    );

    tmdbMock.collection = 'timeout';
    const timedOut = await middleware(botRequest('/franchise/77777-timeout-collection'));
    tmdbMock.collection = 'ok';
    check(
      'TMDB timeout falls through to safeNext()',
      timedOut.headers.get('x-middleware-next') === '1' && (await timedOut.text()) === ''
    );

    const previousKey = process.env.TMDB_API_KEY;
    delete process.env.TMDB_API_KEY;
    const missingKey = await middleware(botRequest('/franchise/88888-no-key-collection'));
    if (previousKey === undefined) {
      delete process.env.TMDB_API_KEY;
    } else {
      process.env.TMDB_API_KEY = previousKey;
    }
    check(
      'missing TMDB_API_KEY falls through to safeNext()',
      missingKey.headers.get('x-middleware-next') === '1' && (await missingKey.text()) === ''
    );

    const humanResponse = await middleware(
      new Request('https://www.sotoyfilm.my.id/franchise/119-the-lord-of-the-rings', {
        method: 'GET',
        headers: {
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        },
      })
    );
    check(
      'human UA on /franchise/:id passes through untouched',
      humanResponse.headers.get('x-middleware-next') === '1' &&
        (await humanResponse.text()) === ''
    );
  }

  // Unpublished articles fall through
  {
    const response = await middleware(botRequest('/artikel/draft-article'));

    check(
      'unpublished article still falls through',
      response.headers.get('x-middleware-next') === '1' && (await response.text()) === ''
    );
  }

  // Static list routes expose exactly one tag set and one canonical URL
  {
    const canonicals: string[] = [];

    for (const path of ['/', '/film-database']) {
      const response = await middleware(botRequest(path));
      const html = await response.text();
      const expectedCanonical =
        path === '/' ? 'https://www.sotoyfilm.my.id' : `https://www.sotoyfilm.my.id${path}`;
      const canonical = getCanonicalHref(html);

      expectSingleSeoTagSet(path, html, check);
      check(`${path} canonical points at the clean route`, canonical === expectedCanonical);
      check(
        `${path} uses the short HTML cache`,
        response.headers.get('cache-control') ===
          'public, s-maxage=60, stale-while-revalidate=300'
      );
      canonicals.push(canonical);
    }

    check(
      '/ and /film-database have distinct canonicals',
      canonicals.length === 2 && canonicals[0] !== canonicals[1]
    );
  }

  // About + Editorial Guidelines crawler bodies and structured data
  {
    const aboutResponse = await middleware(botRequest('/tentang-kami'));
    const aboutHtml = await aboutResponse.text();
    const aboutRoot = getRootContent(aboutHtml);
    const aboutSchema = JSON.parse(getLdJsonRaw(aboutHtml));

    check('bot /tentang-kami returns 200', aboutResponse.status === 200);
    check(
      'bot /tentang-kami has exactly one h1',
      countMatches(aboutRoot, /<h1\b/gi) === 1 &&
        aboutRoot.includes('<h1>Media film dan pop-culture dari Indonesia</h1>')
    );
    check(
      'bot /tentang-kami renders every section heading',
      [
        'Siapa di balik Sotoy Film',
        'Kenapa namanya Sotoy Film',
        'Apa yang kami tulis',
        'Tim redaksi',
        'Komunitas',
        'Hubungi kami',
      ].every(heading => aboutRoot.includes(`<h2>${heading}</h2>`))
    );
    check(
      'bot /tentang-kami renders the exact editorial copy',
      aboutRoot.includes(
        '<p>Sotoy Film membahas film, serial, animasi, anime, dan peralatan sinema untuk penonton Indonesia. Kami menulis berita yang dicek ke sumbernya, review dengan skor yang bisa dipertanggungjawabkan, dan tulisan Film Studies tentang cara film dibuat.</p>'
      ) &&
        aboutRoot.includes(
          '<p>Di Indonesia, &quot;sotoy&quot; artinya sok tahu. Kami memakainya dengan sengaja: setiap penonton punya pendapat soal film yang ia tonton, dan pendapat itu layak didengar. Bedanya, di sini pendapat harus disertai alasan.</p>'
        ) &&
        aboutRoot.includes(
          '<p>Kamu bisa memberi Skor Sotoy, menulis buzz, dan menyimpan watchlist. Perannya: Warga Sotoy, Si Paling Sotoy (kritikus terverifikasi), Penulis, dan Admin &amp; Moderasi.</p>'
        )
    );
    check(
      'bot /tentang-kami links all five redaksi profiles',
      [
        'CsG2CY2TaIZmG7yuPfzAxmRYrlY2',
        'QkNGf1ZfhsMyUEk90a6Iz8ZplZS2',
        '4kN1JktShRNalIa7mY5f17NcjhF2',
        'CFYzpNdVpFPc3tiqVR7o11Zx2he2',
        'T3SXkLrZRphyJiM2Ss92yReY1Dz1',
      ].every(id => aboutRoot.includes(`href="/user/${id}"`))
    );
    check(
      'bot /tentang-kami links to the editorial guidelines',
      aboutRoot.includes('href="/pedoman-redaksi"')
    );
    check(
      'bot /tentang-kami body keeps balanced tags',
      hasBalancedTags(aboutRoot)
    );
    check(
      'bot /tentang-kami title and description match the static config',
      aboutHtml.includes(
        '<title>Tentang Sotoy Film - Media Film dan Pop-Culture Indonesia</title>'
      ) &&
        getMetaContent(aboutHtml, 'description') ===
          'Sotoy Film adalah media film dan pop-culture dari Indonesia: berita, review, dan Film Studies, didirikan oleh Tony Tofani.'
    );
    check(
      'bot /tentang-kami canonical is /tentang-kami',
      getCanonicalHref(aboutHtml) === 'https://www.sotoyfilm.my.id/tentang-kami'
    );
    check(
      'bot /tentang-kami JSON-LD is an AboutPage with a NewsMediaOrganization',
      aboutSchema?.['@type'] === 'AboutPage' &&
        aboutSchema?.mainEntity?.['@type'] === 'NewsMediaOrganization' &&
        aboutSchema?.mainEntity?.name === 'Sotoy Film' &&
        aboutSchema?.mainEntity?.url === 'https://www.sotoyfilm.my.id' &&
        aboutSchema?.mainEntity?.logo?.url ===
          'https://www.sotoyfilm.my.id/sotoy-logo-full.webp' &&
        aboutSchema?.mainEntity?.founder?.name === 'Tony Tofani' &&
        aboutSchema?.mainEntity?.founder?.url ===
          'https://www.sotoyfilm.my.id/user/CsG2CY2TaIZmG7yuPfzAxmRYrlY2' &&
        aboutSchema?.mainEntity?.sameAs?.includes('https://www.instagram.com/sotoyfilm.id') &&
        aboutSchema?.mainEntity?.sameAs?.includes('https://www.tiktok.com/@sotoyfilmid') &&
        aboutSchema?.mainEntity?.contactPoint?.email === 'admin.sotoyfilm@gmail.com'
    );

    const aboutAliasResponse = await middleware(botRequest('/about-us'));
    const aboutAliasHtml = await aboutAliasResponse.text();
    check(
      '/about-us canonical points at /tentang-kami',
      getCanonicalHref(aboutAliasHtml) === 'https://www.sotoyfilm.my.id/tentang-kami'
    );

    const guidelinesResponse = await middleware(botRequest('/pedoman-redaksi'));
    const guidelinesHtml = await guidelinesResponse.text();
    const guidelinesRoot = getRootContent(guidelinesHtml);

    check('bot /pedoman-redaksi returns 200', guidelinesResponse.status === 200);
    check(
      'bot /pedoman-redaksi has exactly one h1',
      countMatches(guidelinesRoot, /<h1\b/gi) === 1 &&
        guidelinesRoot.includes('<h1>Pedoman Redaksi</h1>')
    );
    check(
      'bot /pedoman-redaksi renders every section heading',
      [
        'Berita',
        'Review',
        'Film Studies',
        'Opini',
        'Koreksi',
        'Sponsor, afiliasi, dan iklan',
      ].every(heading => guidelinesRoot.includes(`<h2>${heading}</h2>`))
    );
    check(
      'bot /pedoman-redaksi renders the exact editorial copy',
      guidelinesRoot.includes(
        '<li>Tanggal terbit selalu tampil. Pembaruan substansial diberi catatan &quot;Diperbarui&quot; beserta tanggalnya.</li>'
      ) &&
        guidelinesRoot.includes(
          '<li>Skor Sotoy 1 sampai 10: 1-2 Bencana Sinematik, 3-4 Kurang Matang, 5-6 Solid &amp; Layak Tonton, 7-8 Sangat Direkomendasikan, 9-10 Mahakarya Abadi. Sponsor tidak memengaruhi skor.</li>'
        ) &&
        guidelinesRoot.includes(
          '<p>Temukan kesalahan? Kirim ke admin.sotoyfilm@gmail.com dengan subjek &quot;Koreksi&quot;. Kesalahan substansial diperbaiki dan dicatat dengan tanggal.</p>'
        ) &&
        guidelinesRoot.includes(
          '<li>Saat ini Sotoy Film belum menayangkan iklan. Bila nanti ada, iklan dipisahkan dari konten redaksi dan dicatat di halaman ini.</li>'
        )
    );
    check(
      'bot /pedoman-redaksi keeps the updated note',
      guidelinesRoot.includes('Terakhir diperbarui: November 2026.')
    );
    check(
      'bot /pedoman-redaksi body keeps balanced tags',
      hasBalancedTags(guidelinesRoot)
    );
    check(
      'bot /pedoman-redaksi title and description match the static config',
      guidelinesHtml.includes(
        '<title>Pedoman Redaksi Sotoy Film - Cara Kami Menulis dan Menilai</title>'
      ) &&
        getMetaContent(guidelinesHtml, 'description') ===
          'Cara Sotoy Film memilih sumber, menulis berita, menilai review, mengoreksi kesalahan, dan mengungkap sponsor serta afiliasi.'
    );
    check(
      'bot /pedoman-redaksi canonical is /pedoman-redaksi',
      getCanonicalHref(guidelinesHtml) === 'https://www.sotoyfilm.my.id/pedoman-redaksi'
    );

    const forbidden = [
      'tonytofanii27',
      'eksposurmedia',
      'tetradicinema27',
      'next5.basketball',
      'gamail',
    ];
    check(
      'About and guidelines bot HTML never leak private strings',
      forbidden.every(
        value => !aboutHtml.includes(value) && !aboutAliasHtml.includes(value) && !guidelinesHtml.includes(value)
      )
    );

    // Privacy Policy crawler body uses the same shared-content pattern.
    const privacyResponse = await middleware(botRequest('/kebijakan-privasi'));
    const privacyHtml = await privacyResponse.text();
    const privacyRoot = getRootContent(privacyHtml);
    const privacyHeadings = [
      '1. Informasi yang Kami Kumpulkan',
      '2. Bagaimana Kami Menggunakan Informasi Anda',
      '3. Kontrol dan Hak Privasi Anda',
      '4. Penyimpanan Lokal Browser (Local Storage &amp; Cache)',
      '5. Cookie dan Pilihan Anda',
      '6. Iklan',
      '7. Afiliasi dan Konten Sponsor',
      '8. Penyimpanan dan Transfer Data',
      '9. Anak-anak',
      '10. Perubahan Kebijakan',
      '11. Hubungi Petugas Perlindungan Data',
    ];
    const renderedPrivacyHeadings = Array.from(
      privacyRoot.matchAll(/<h2>([\s\S]*?)<\/h2>/g),
      match => match[1]
    );

    check('bot /kebijakan-privasi returns 200', privacyResponse.status === 200);
    check(
      'bot /kebijakan-privasi has exactly one h1',
      countMatches(privacyRoot, /<h1\b/gi) === 1 &&
        privacyRoot.includes('<h1>Kebijakan Privasi (Privacy Policy)</h1>')
    );
    check(
      'bot /kebijakan-privasi renders all 11 section h2s in order',
      renderedPrivacyHeadings.length === privacyHeadings.length &&
        renderedPrivacyHeadings.every((heading, index) => heading === privacyHeadings[index])
    );
    check(
      'bot /kebijakan-privasi header uses the updated effective date and version',
      privacyRoot.includes('<p>Berlaku efektif sejak: 28 November 2026</p>') &&
        privacyRoot.includes('<p>Versi Dokumen: 2.5.0</p>') &&
        !privacyRoot.includes('3 November 2026') &&
        !privacyRoot.includes('2.4.0')
    );
    check(
      'bot /kebijakan-privasi renders the two new collection bullets',
      privacyRoot.includes(
        '<li><strong>Analitik Tambahan:</strong> Kami juga memakai Vercel Analytics dan Vercel Speed Insights untuk mengukur jumlah kunjungan dan kecepatan halaman secara agregat.</li>'
      ) &&
        privacyRoot.includes(
          '<li><strong>Video Tersemat:</strong> Trailer dan video dari YouTube dimuat dalam mode privasi-ditingkatkan (youtube-nocookie.com). Saat Anda memutarnya, YouTube dapat menerima data dari browser Anda sesuai kebijakannya.</li>'
        )
    );
    check(
      'bot /kebijakan-privasi renders the five new sections with their links',
      privacyRoot.includes(
        '<p>Cookie dan pengenal serupa dipakai untuk menjalankan situs (login, tema), mengukur kunjungan (Google Analytics), dan, bila nanti ada, menayangkan iklan. Anda dapat menghapus atau memblokir cookie lewat pengaturan browser, atau memakai Google Analytics Opt-out Browser Add-on. Sebagian fitur mungkin tidak berfungsi tanpa cookie esensial.</p>'
      ) &&
        privacyRoot.includes(
          '<p>Saat ini Sotoy Film belum menayangkan iklan. Bila kami menayangkan iklan lewat Google AdSense, Google dan mitra iklannya dapat memakai cookie untuk menampilkan iklan berdasarkan kunjungan Anda ke situs ini dan situs lain. Anda dapat mengelola atau menonaktifkan iklan yang dipersonalisasi di <a href="https://adssettings.google.com" rel="noopener">adssettings.google.com</a>. Kami akan memperbarui halaman ini sebelum iklan tayang.</p>'
        ) &&
        privacyRoot.includes(
          '<p>Sebagian tautan dapat berupa tautan afiliasi: bila Anda membeli lewat tautan itu, kami dapat menerima komisi tanpa biaya tambahan bagi Anda, dan mitra dapat memakai cookie untuk mencatat pembelian. Tautan afiliasi dan konten berbayar selalu diberi tanda (lihat <a href="/pedoman-redaksi">Pedoman Redaksi</a>).</p>'
        ) &&
        privacyRoot.includes(
          '<p>Layanan yang kami pakai (Firebase/Google, Vercel, Google Analytics) dapat memproses data di server di luar Indonesia. Data akun disimpan selama akun aktif. Setelah Anda meminta penghapusan akun, data akun dan konten Anda dihapus dalam waktu paling lama 30 hari, kecuali data yang wajib kami simpan menurut hukum.</p>'
        ) &&
        privacyRoot.includes(
          '<p>Sotoy Film tidak ditujukan bagi anak di bawah 13 tahun, dan kami tidak sengaja mengumpulkan data pribadi mereka. Bila Anda mengetahui anak di bawah usia itu memiliki akun, hubungi kami di admin.sotoyfilm@gmail.com agar akun tersebut kami hapus.</p>'
        ) &&
        privacyRoot.includes(
          '<p>Bila ada perubahan material, kami memperbarui tanggal di atas dan mencatatnya di halaman ini.</p>'
        )
    );
    check(
      'bot /kebijakan-privasi contact box is unchanged',
      privacyRoot.includes('<p><strong>Email:</strong> admin.sotoyfilm@gmail.com</p>') &&
        privacyRoot.includes(
          '<p><strong>Subjek:</strong> Permohonan Hak Privasi Pengguna Sotoy Film</p>'
        )
    );
    const privacyEmails = privacyRoot.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [];
    check(
      'bot /kebijakan-privasi only exposes the public email address',
      privacyEmails.length > 0 &&
        privacyEmails.every(email => email === 'admin.sotoyfilm@gmail.com')
    );
    check('bot /kebijakan-privasi body keeps balanced tags', hasBalancedTags(privacyRoot));
    check(
      'bot /kebijakan-privasi title, description and canonical match the static config',
      privacyHtml.includes('<title>Kebijakan Privasi - Sotoy Film</title>') &&
        getMetaContent(privacyHtml, 'description') ===
          'Komitmen kami dalam melindungi privasi, data pribadi, dan keamanan akun pengunjung Sotoy Film.' &&
        getCanonicalHref(privacyHtml) === 'https://www.sotoyfilm.my.id/kebijakan-privasi'
    );
    check(
      'privacy bot HTML never leaks private strings',
      forbidden.every(value => !privacyHtml.includes(value))
    );

    const privacyAliasResponse = await middleware(botRequest('/privacy-policy'));
    const privacyAliasHtml = await privacyAliasResponse.text();
    check(
      'bot /privacy-policy serves the same structured body',
      getRootContent(privacyAliasHtml) === privacyRoot
    );

    const humanHeaders = {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    };
    for (const path of [
      '/tentang-kami',
      '/about-us',
      '/pedoman-redaksi',
      '/kebijakan-privasi',
      '/privacy-policy',
    ]) {
      const response = await middleware(
        new Request(`https://www.sotoyfilm.my.id${path}`, { method: 'GET', headers: humanHeaders })
      );
      check(
        `human UA on ${path} passes through untouched`,
        response.headers.get('x-middleware-next') === '1' && (await response.text()) === ''
      );
    }

    const termsResponse = await middleware(botRequest('/syarat-ketentuan'));
    const termsHtml = await termsResponse.text();
    check(
      'other static pages keep their metadata-only crawler response',
      termsResponse.status === 200 &&
        termsHtml.includes('<title>Syarat &amp; Ketentuan Layanan - Sotoy Film</title>') &&
        !getRootContent(termsHtml).includes('<article>')
    );
  }

  // Every known category has a distinct description and canonical URL
  {
    const categoryNames = ['movies', 'series', 'animation', 'cinema-gear', 'film-studies'];
    const descriptions = new Set<string>();
    const canonicals = new Set<string>();

    for (const category of categoryNames) {
      const path = `/kategori/${category}`;
      const response = await middleware(botRequest(path));
      const html = await response.text();
      const description = getMetaContent(html, 'description');
      const canonical = getCanonicalHref(html);

      expectSingleSeoTagSet(path, html, check);
      check(`${path} has a non-empty description`, description.length > 0);
      check(
        `${path} canonical matches the category URL`,
        canonical === `https://www.sotoyfilm.my.id${path}`
      );

      descriptions.add(description);
      canonicals.add(canonical);
    }

    check(
      'category descriptions are all distinct',
      descriptions.size === categoryNames.length
    );
    check('category canonicals are all distinct', canonicals.size === categoryNames.length);
  }

  // Bot list payload on list routes
  {
    clearSeoListsCache();

    for (const path of ['/', '/film-database', '/kategori/movies']) {
      const response = await middleware(botRequest(path));
      const html = await response.text();
      const lists = extractSeoLists(html);
      const raw =
        /<script id="seo-lists" type="application\/json">([\s\S]*?)<\/script>/.exec(html)?.[1] ||
        '';

      check(`${path} embeds a valid #seo-lists payload`, lists !== null);
      if (!lists) continue;

      check(`${path} list payload contains films`, lists.films.length > 0);
      check(
        `${path} list payload contains the published article`,
        lists.articles.some(article => article.id === 'published-article')
      );
      check(
        `${path} list payload excludes draft and future-scheduled articles`,
        lists.articles.every(
          article =>
            article.id !== 'draft-article' &&
            article.id !== 'scheduled-future-article' &&
            article.status !== 'draft'
        )
      );
      check(
        `${path} #seo-lists has no content/contentJson fields`,
        !/"content"\s*:/.test(raw) && !/"contentJson"\s*:/.test(raw)
      );
      check(`${path} #seo-lists has no comments array`, !/"comments"\s*:/.test(raw));
      check(`${path} #seo-lists has no private emails`, !/private-[^"]+@example\.com/.test(raw));
      check(
        `${path} #seo-lists has no admin or token fields`,
        !/"adminNotes"\s*:/.test(raw) && !/"token"\s*:/.test(raw)
      );
      check(
        `${path} #seo-lists keeps public list fields`,
        lists.films.some(film => film.title === 'Breaking Bad' && film.year === 2008) &&
          lists.articles.some(article => article.title === 'Published Article Title')
      );
    }
  }

  // One failed list fetch still injects the other; both failing inject nothing
  {
    clearSeoListsCache();
    listFetchFailure.films = true;
    const filmsFailedHtml = await (await middleware(botRequest('/'))).text();
    listFetchFailure.films = false;
    const filmsFailedLists = extractSeoLists(filmsFailedHtml);

    check(
      'failed film list still injects the article list',
      !!filmsFailedLists &&
        filmsFailedLists.films.length === 0 &&
        filmsFailedLists.articles.some(article => article.id === 'published-article')
    );

    clearSeoListsCache();
    listFetchFailure.articles = true;
    const articlesFailedHtml = await (await middleware(botRequest('/film-database'))).text();
    listFetchFailure.articles = false;
    const articlesFailedLists = extractSeoLists(articlesFailedHtml);

    check(
      'failed article list still injects the film list',
      !!articlesFailedLists &&
        articlesFailedLists.articles.length === 0 &&
        articlesFailedLists.films.length > 0
    );

    clearSeoListsCache();
    listFetchFailure.films = true;
    listFetchFailure.articles = true;
    const bothFailedResponse = await middleware(botRequest('/kategori/movies'));
    const bothFailedHtml = await bothFailedResponse.text();
    listFetchFailure.films = false;
    listFetchFailure.articles = false;

    check(
      'both list fetches failing leaves the page without #seo-lists',
      !bothFailedHtml.includes('id="seo-lists"')
    );
    check(
      'both list fetches failing still returns metadata HTML',
      bothFailedResponse.status === 200 && bothFailedHtml.includes('rel="canonical"')
    );

    clearSeoListsCache();
  }

  // Human browsers never receive the bot list payload
  {
    const response = await middleware(
      new Request('https://www.sotoyfilm.my.id/', {
        method: 'GET',
        headers: {
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        },
      })
    );
    const body = await response.text();

    check(
      'Chrome UA on a list route passes through untouched',
      response.headers.get('x-middleware-next') === '1' && body === ''
    );
    check('Chrome UA does not receive #seo-lists', !body.includes('seo-lists'));
  }

  // Detail routes keep their existing prefetch behavior only
  {
    const filmHtml = await (await middleware(botRequest('/film/breaking-bad'))).text();
    const articleHtml = await (await middleware(botRequest('/artikel/published-article'))).text();

    check(
      'film detail keeps #seo-prefetch and never gets #seo-lists',
      filmHtml.includes('id="seo-prefetch"') && !filmHtml.includes('id="seo-lists"')
    );
    check(
      'article detail keeps #seo-prefetch and never gets #seo-lists',
      articleHtml.includes('id="seo-prefetch"') && !articleHtml.includes('id="seo-lists"')
    );
  }

  // Head tag dedupe: one tag set per bot response, Helmet-owned markers
  {
    const entityPaths = [
      '/film/breaking-bad',
      '/artikel/published-article',
      '/person/287-brad-pitt',
      '/franchise/119-the-lord-of-the-rings',
    ];

    for (const path of entityPaths) {
      const html = await (await middleware(botRequest(path))).text();
      expectSingleSeoTagSet(path, html, check);
      check(`${path} emits exactly one ld+json block`, countLdJson(html) === 1);
      check(
        `${path} injects Helmet-owned tags`,
        countHelmetOwned(html) > 0 &&
          /<meta\s+name=["']description["'][^>]*data-rh="true"/i.test(html) &&
          /<link\s+rel=["']canonical["'][^>]*data-rh="true"/i.test(html)
      );
      check(
        `${path} never marks a robots tag as Helmet-owned`,
        !/<meta\s+name=["']robots["'][^>]*data-rh/i.test(html)
      );
    }

    for (const path of ['/film/breaking-bad/seasons', '/film/breaking-bad/season/2']) {
      const html = await (await middleware(botRequest(path))).text();
      const ldTag =
        /<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>/i.exec(html)?.[0] || '';
      const robotsTag = /<meta\s+name=["']robots["'][^>]*>/i.exec(html)?.[0] || '';
      check(`${path} still emits exactly one ld+json block`, countLdJson(html) === 1);
      check(
        `${path} keeps its Movie JSON-LD through hydration`,
        ldTag.length > 0 && !ldTag.includes('data-rh')
      );
      check(
        `${path} still marks meta tags as Helmet-owned`,
        /<meta\s+name=["']description["'][^>]*data-rh="true"/i.test(html)
      );
      check(
        `${path} has exactly one robots meta`,
        countMatches(html, /<meta\s+name=["']robots["']/gi) === 1
      );
      check(
        `${path} keeps its noindex robots meta out of Helmet's ownership`,
        getMetaContent(html, 'robots') === 'noindex, follow' &&
          robotsTag.length > 0 &&
          !robotsTag.includes('data-rh')
      );
    }
  }

  // BreadcrumbList parity: P0 keeps breadcrumbs client-rendered only. Bot HTML
  // must not regress into emitting a second block: franchise keeps its single
  // entity, and every other route family stays at zero.
  {
    const expectations: Array<[string, number]> = [
      ['/franchise/119-the-lord-of-the-rings', 1],
      ['/person/287-brad-pitt', 0],
      ['/people', 0],
      ['/', 0],
      ['/film/breaking-bad', 0],
      ['/artikel/published-article', 0],
    ];

    for (const [path, expected] of expectations) {
      const html = await (await middleware(botRequest(path))).text();
      check(
        `${path} emits ${expected} BreadcrumbList block(s)`,
        countBreadcrumbLists(html) === expected
      );
    }
  }

  // injectMetaTags replaces a pre-existing tag set and is idempotent
  {
    const baseHtml = `<!doctype html><html><head>
      <title>Sotoy Film</title>
      <meta name="description" content="old description" />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href="https://www.sotoyfilm.my.id/" />
      <meta property="og:title" content="old og title" />
      <meta name="twitter:title" content="old twitter title" />
      <script type="application/ld+json">{"@type":"Thing","name":"old"}</script>
    </head><body><div id="root"></div></body></html>`;
    const payload = {
      title: 'Idempotent Article | Sotoy Film',
      description: 'Idempotent description.',
      image: 'https://www.sotoyfilm.my.id/og-default.png',
      url: 'https://www.sotoyfilm.my.id/artikel/idempotent',
      type: 'article',
      robots: 'noindex, follow',
      schemaJson: {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: 'Idempotent Article',
      },
    };

    const once = injectMetaTags(baseHtml, payload);
    const twice = injectMetaTags(once, payload);

    check(
      'injectMetaTags replaces the shell tag set',
      countMatches(once, /<meta\s+name=["']description["']/gi) === 1 &&
        countMatches(once, /<link\s+rel=["']canonical["']/gi) === 1 &&
        !once.includes('old description')
    );
    check(
      'injectMetaTags writes exactly one non-Helmet robots meta',
      countMatches(once, /<meta\s+name=["']robots["']/gi) === 1 &&
        getMetaContent(once, 'robots') === 'noindex, follow' &&
        !/<meta\s+name=["']robots["'][^>]*data-rh/i.test(once)
    );
    check(
      'injectMetaTags twice stays idempotent',
      countMatches(twice, /<meta\s+name=["']description["']/gi) === 1 &&
        countMatches(twice, /<link\s+rel=["']canonical["']/gi) === 1 &&
        countMatches(twice, /<meta\s+property=["']og:title["']/gi) === 1 &&
        countMatches(twice, /<meta\s+name=["']twitter:title["']/gi) === 1 &&
        countMatches(twice, /<meta\s+name=["']robots["']/gi) === 1 &&
        !/<meta\s+name=["']robots["'][^>]*data-rh/i.test(twice) &&
        countLdJson(twice) === 1 &&
        !twice.includes('"Thing"')
    );
  }

  // Article titles never double-brand, and twitter:creator is the site handle
  {
    const brandedHtml = await (await middleware(botRequest('/artikel/branded-article'))).text();
    const plainHtml = await (await middleware(botRequest('/artikel/published-article'))).text();

    check(
      'article seoTitle that already includes the brand is not double-branded',
      brandedHtml.includes('<title>Branded Article Title | Sotoy Film</title>') &&
        !brandedHtml.includes('Sotoy Film — Sotoy Film')
    );
    check(
      'article without its own brand keeps the — Sotoy Film suffix',
      plainHtml.includes('<title>Published Article Title — Sotoy Film</title>')
    );
    check(
      'bot twitter:creator is the site handle',
      getMetaContent(plainHtml, 'twitter:creator') === TWITTER_CREATOR
    );

    const clientMeta = buildArticleMetadata({
      title: 'Creator Check',
      slug: 'creator-check',
      author: { name: 'Raka Pratama' },
    } as any);
    check(
      'client article metadata twitter:creator is the site handle',
      clientMeta.twitter['twitter:creator'] === TWITTER_CREATOR
    );
  }

  return { passed, failed };
}

async function runTests() {
  console.log('\n============================================================');
  console.log('🧪 Sotoy Film - Edge Middleware Bot Simulation Test Suite');
  console.log('============================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  for (const [index, testCase] of TEST_CASES.entries()) {
    const num = `[${index + 1}/${TEST_CASES.length}]`.padEnd(8);
    const testUrl = `https://www.sotoyfilm.my.id${testCase.path}`;

    try {
      const request = new Request(testUrl, {
        method: 'GET',
        headers: {
          'user-agent': testCase.userAgent,
        },
      });

      // Execute middleware
      const response = await middleware(request);
      const isNextPassThrough = response.headers.get('x-middleware-next') === '1';
      const actualBranch = isNextPassThrough ? 'HUMAN' : 'BOT';

      // Redirect assertions (legacy category taxonomy)
      if (testCase.expectedStatus !== undefined) {
        const actualStatus = response.status;
        const actualLocation = response.headers.get('location');

        if (actualStatus !== testCase.expectedStatus || actualLocation !== testCase.expectedLocation) {
          console.error(`❌ ${num} ${testCase.name}`);
          console.error(
            `   Expected ${testCase.expectedStatus} -> ${testCase.expectedLocation}, got ${actualStatus} -> ${actualLocation}`
          );
          failedCount++;
          continue;
        }

        console.log(`✅ ${num} ${testCase.name} → ${actualStatus} ${actualLocation} (${testCase.path})`);
        passedCount++;
        continue;
      }

      // 1. Verify branch detection
      if (actualBranch !== testCase.expectedBranch) {
        console.error(`❌ ${num} ${testCase.name}`);
        console.error(`   Expected branch: ${testCase.expectedBranch}, got: ${actualBranch}`);
        failedCount++;
        continue;
      }

      // 2. If BOT expected, verify HTTP 200, Content-Type, and Meta tags in HTML
      if (testCase.expectedBranch === 'BOT') {
        if (response.status !== 200) {
          console.error(`❌ ${num} ${testCase.name}`);
          console.error(`   Expected status 200, got: ${response.status}`);
          failedCount++;
          continue;
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('text/html')) {
          console.error(`❌ ${num} ${testCase.name}`);
          console.error(`   Expected Content-Type text/html, got: ${contentType}`);
          failedCount++;
          continue;
        }

        const bodyHtml = await response.text();
        const missingPatterns: string[] = [];

        if (testCase.expectedMetaPatterns) {
          for (const pattern of testCase.expectedMetaPatterns) {
            if (!bodyHtml.includes(pattern)) {
              missingPatterns.push(pattern);
            }
          }
        }

        if (missingPatterns.length > 0) {
          console.error(`❌ ${num} ${testCase.name}`);
          console.error(`   HTML missing expected meta patterns:`, missingPatterns);
          failedCount++;
          continue;
        }
      }

      // Success
      console.log(`✅ ${num} ${testCase.name} → ${actualBranch} (${testCase.path})`);
      passedCount++;
    } catch (err) {
      console.error(`❌ ${num} ${testCase.name} - Threw unexpected error:`, err);
      failedCount++;
    }
  }

  const crawlerResults = await runCrawlerBodyTests();
  passedCount += crawlerResults.passed;
  failedCount += crawlerResults.failed;

  console.log('\n============================================================');
  console.log(`📊 Summary: ${passedCount} Passed, ${failedCount} Failed`);
  console.log('============================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
