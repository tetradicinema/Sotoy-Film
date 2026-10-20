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

// Setup Mock Fetch for Standalone, Deterministic Test Execution (Bypasses Google API Free Quota Limitations)
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
  const urlStr = url.toString();

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
        director: { stringValue: 'Vince Gilligan' }
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
        excerpt: { stringValue: 'This is a published article excerpt.' }
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

  // 3. Mock general fallback collection requests (Strategic fallback list)
  if (urlStr.includes('/documents/films')) {
    return new Response(JSON.stringify({
      documents: [
        {
          name: 'projects/gen-lang-client-0523736875/databases/ai-studio-sotoyfilm-256095db-0c8b-47c2-a6bf-e7c4f8d7cfd3/documents/films/breaking-bad',
          fields: {
            title: { stringValue: 'Breaking Bad' },
            year: { integerValue: '2008' },
            slug: { stringValue: 'breaking-bad' },
            synopsis: { stringValue: 'Chemistry teacher turned meth lord.' }
          }
        },
        {
          name: 'projects/gen-lang-client-0523736875/databases/ai-studio-sotoyfilm-256095db-0c8b-47c2-a6bf-e7c4f8d7cfd3/documents/films/boyhood',
          fields: {
            title: { stringValue: 'Boyhood' },
            year: { integerValue: '2014' },
            slug: { stringValue: 'boyhood' },
            synopsis: { stringValue: 'Growing up over 12 years.' }
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

  // --- ROUTE & EDGE CASES ---
  {
    name: 'Bot on non-matching path (/komunitas)',
    userAgent: 'Googlebot/2.1 (+http://www.google.com/bot.html)',
    path: '/komunitas',
    expectedBranch: 'HUMAN', // Next() pass-through because route does not match /film/ or /artikel/
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
    name: 'Googlebot on canonical Animation category (pass-through)',
    userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    path: '/kategori/animation',
    expectedBranch: 'HUMAN',
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

  console.log('\n============================================================');
  console.log(`📊 Summary: ${passedCount} Passed, ${failedCount} Failed out of ${TEST_CASES.length} tests`);
  console.log('============================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
