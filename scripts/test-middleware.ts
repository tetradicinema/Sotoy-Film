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

import middleware, { isBotUserAgent } from '../middleware.js';
import { STATIC_ROUTE_METADATA_CONFIG } from '../src/utils/seoMetadata.js';
import { clearSeoListsCache } from '../src/lib/edge/firestoreRest.js';

// Setup Mock Fetch for Standalone, Deterministic Test Execution (Bypasses Google API Free Quota Limitations)
const originalFetch = globalThis.fetch;
/** Counts per-document GETs so the first read can return meta fields only. */
const docFetchCounts: Record<string, number> = {};
/** Lets tests force a list REST failure for one or both collections. */
const listFetchFailure = { films: false, articles: false };
const mockFetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
  const urlStr = url.toString();

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

  // 1. Mock index.html subrequest
  if (urlStr.includes('/index.html')) {
    return new Response(`<!doctype html><html><head><title>Sotoy Film</title></head><body><div id="root"></div></body></html>`, {
      status: 200,
      headers: { 'content-type': 'text/html' }
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

  if (urlStr.includes('/documents/articles/published-article')) {
    return new Response(JSON.stringify({
      name: 'projects/gen-lang-client-0523736875/databases/ai-studio-sotoyfilm-256095db-0c8b-47c2-a6bf-e7c4f8d7cfd3/documents/articles/published-article',
      fields: {
        title: { stringValue: 'Published Article Title' },
        status: { stringValue: 'published' },
        slug: { stringValue: 'published-article' },
        excerpt: { stringValue: 'This is a published article excerpt.' },
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
    check('bot article body contains the author name', root.includes('Raka Pratama'));
    check(
      'bot article body does not leak the author email',
      !root.includes('private-author@example.com')
    );
    check('bot article body contains the publish date', root.includes('2026-10-20'));
    check(
      'bot article body contains the excerpt and article text',
      root.includes('This is a published article excerpt.') && root.includes('sweeping epic')
    );
    check(
      'bot article body escapes special characters like <script>',
      root.includes('&lt;script&gt;') && !root.includes('<script>')
    );
    check(
      'bot article response uses the short HTML cache',
      (response.headers.get('cache-control') || '').includes('s-maxage=60')
    );
  }

  // Tiptap JSON content is flattened to plain paragraphs
  {
    const response = await middleware(botRequest('/artikel/tiptap-article'));
    const root = getRootContent(await response.text());

    check(
      'bot article body extracts Tiptap text nodes as paragraphs',
      root.includes('<p>First Tiptap paragraph about cinema.</p>') &&
        root.includes('<p>Second Tiptap heading</p>')
    );
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
