import { next } from '@vercel/edge';
import { INITIAL_FILMS, INITIAL_ARTICLES } from './src/data/mockData';
import { slugify } from './src/utils/slugify';

export const config = {
  matcher: ['/film/:path*', '/artikel/:path*'],
};

const BOT_PATTERNS = [
  'facebookexternalhit',
  'twitterbot',
  'slackbot',
  'telegrambot',
  'whatsapp',
  'linkedinbot',
  'discordbot',
  'googlebot',
  'bingbot',
  'applebot',
  'yandexbot',
  'baiduspider',
  'duckduckbot',
  'pinterestbot',
  'embedly',
  'quora link preview',
  'outbrain',
  'vkshare',
  'w3c_validator',
];

/**
 * Checks if incoming request is from a search engine crawler or social share preview bot.
 */
function isBotUserAgent(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  if (BOT_PATTERNS.some(bot => ua.includes(bot))) {
    return true;
  }
  // Generic fallback for headless browsers and crawlers
  return ua.includes('bot') || ua.includes('crawler') || ua.includes('spider');
}

/**
 * Parses raw Firestore REST API document fields into a plain JavaScript object.
 */
function parseFirestoreFields(doc: any): Record<string, any> {
  if (!doc || !doc.fields) return {};
  const result: Record<string, any> = {};
  for (const [key, valueObj] of Object.entries(doc.fields as Record<string, any>)) {
    if ('stringValue' in valueObj) {
      result[key] = valueObj.stringValue;
    } else if ('integerValue' in valueObj) {
      result[key] = parseInt(valueObj.integerValue, 10);
    } else if ('doubleValue' in valueObj) {
      result[key] = parseFloat(valueObj.doubleValue);
    } else if ('booleanValue' in valueObj) {
      result[key] = valueObj.booleanValue;
    } else if ('arrayValue' in valueObj) {
      result[key] = (valueObj.arrayValue?.values || []).map((v: any) => {
        if ('stringValue' in v) return v.stringValue;
        if ('mapValue' in v) return parseFirestoreFields(v.mapValue);
        return v;
      });
    } else if ('mapValue' in valueObj) {
      result[key] = parseFirestoreFields(valueObj.mapValue);
    }
  }
  return result;
}

/**
 * Escapes special HTML characters to prevent XSS or broken tag injection.
 */
function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const FIRESTORE_DOCUMENTS_URL =
  'https://firestore.googleapis.com/v1/projects/gen-lang-client-0523736875/databases/ai-studio-sotoyfilm-256095db-0c8b-47c2-a6bf-e7c4f8d7cfd3/documents';

/**
 * Fetches content from Firestore REST API or fallback seed data by slug or docId.
 */
async function fetchEntityData(
  collection: 'films' | 'articles',
  slug: string
): Promise<Record<string, any> | null> {
  // 1. Direct document GET if slug happens to be the document ID (e.g., film-7, art-1)
  try {
    const directRes = await fetch(`${FIRESTORE_DOCUMENTS_URL}/${collection}/${encodeURIComponent(slug)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(2000),
    });
    if (directRes.ok) {
      const doc = await directRes.json();
      const parsed = parseFirestoreFields(doc);
      if (parsed && Object.keys(parsed).length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    // Non-fatal, proceed to runQuery
  }

  // 2. Query Firestore by `slug` field
  try {
    const queryRes = await fetch(`${FIRESTORE_DOCUMENTS_URL}:runQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: collection }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'slug' },
              op: 'EQUAL',
              value: { stringValue: slug },
            },
          },
          limit: 1,
        },
      }),
      signal: AbortSignal.timeout(2500),
    });

    if (queryRes.ok) {
      const results = await queryRes.json();
      if (Array.isArray(results) && results.length > 0 && results[0]?.document) {
        const parsed = parseFirestoreFields(results[0].document);
        if (parsed && Object.keys(parsed).length > 0) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.error('[Middleware] Firestore query error:', err);
  }

  // 3. Fallback to initial seed data if not found or Firestore cold
  if (collection === 'films') {
    const fallbackFilm = INITIAL_FILMS.find(
      f => (f.slug && f.slug === slug) || slugify(f.title) === slug || f.id === slug
    );
    if (fallbackFilm) return fallbackFilm;
  } else if (collection === 'articles') {
    const fallbackArt = INITIAL_ARTICLES.find(
      a => a.slug === slug || a.id === slug
    );
    if (fallbackArt) return fallbackArt;
  }

  return null;
}

/**
 * Injects OpenGraph, Twitter, and canonical metadata tags into the base HTML template.
 */
function injectMetaTags(
  html: string,
  meta: {
    title: string;
    description: string;
    image: string;
    url: string;
    type: string;
  }
): string {
  const safeTitle = escapeHtml(meta.title);
  const safeDesc = escapeHtml(meta.description);
  const safeImage = escapeHtml(meta.image);
  const safeUrl = escapeHtml(meta.url);

  // Replace <title>
  let modified = html;
  if (/<title>.*?<\/title>/i.test(modified)) {
    modified = modified.replace(/<title>.*?<\/title>/i, `<title>${safeTitle}</title>`);
  } else {
    modified = modified.replace('</head>', `  <title>${safeTitle}</title>\n  </head>`);
  }

  // Remove existing static tags that we will replace
  modified = modified.replace(/<meta\s+name=["']description["'][^>]*>/gi, '');
  modified = modified.replace(/<meta\s+property=["']og:[^"']*["'][^>]*>/gi, '');
  modified = modified.replace(/<meta\s+name=["']twitter:[^"']*["'][^>]*>/gi, '');
  modified = modified.replace(/<link\s+rel=["']canonical["'][^>]*>/gi, '');

  const tags = `
    <meta name="description" content="${safeDesc}" />
    <link rel="canonical" href="${safeUrl}" />
    <meta property="og:type" content="${meta.type}" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDesc}" />
    <meta property="og:image" content="${safeImage}" />
    <meta property="og:url" content="${safeUrl}" />
    <meta property="og:site_name" content="Sotoy Film" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDesc}" />
    <meta name="twitter:image" content="${safeImage}" />
  `;

  return modified.replace('</head>', `${tags}\n  </head>`);
}

const FALLBACK_HTML_TEMPLATE = `<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='46' fill='%23FF3366'/><polygon points='40,30 70,50 40,70' fill='%23FFEE00'/><circle cx='32' cy='32' r='5' fill='%23FFFFFF'/></svg>" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sotoy Film</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600&display=swap" rel="stylesheet">
  </head>
  <body class="bg-[#0D0E15] text-slate-100 antialiased selection:bg-[#FF2E7E] selection:text-white min-h-screen">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;

export default async function middleware(request: Request): Promise<Response> {
  try {
    const userAgent = request.headers.get('user-agent');

    // 1. Pass through immediately for normal human visitors
    if (!isBotUserAgent(userAgent)) {
      return next();
    }

    const url = new URL(request.url);
    const pathname = url.pathname;

    let collection: 'films' | 'articles' | null = null;
    let slug = '';

    if (pathname.startsWith('/film/')) {
      collection = 'films';
      slug = decodeURIComponent(pathname.replace(/^\/film\/?/, '')).replace(/\/$/, '');
    } else if (pathname.startsWith('/artikel/')) {
      collection = 'articles';
      slug = decodeURIComponent(pathname.replace(/^\/artikel\/?/, '')).replace(/\/$/, '');
    }

    if (!collection || !slug) {
      return next();
    }

    // 2. Fetch the entity data from Firestore REST API
    const data = await fetchEntityData(collection, slug);
    if (!data) {
      // Fall through to normal SPA rather than returning an error
      return next();
    }

    // 3. Prepare metadata based on collection type
    const baseUrl = 'https://www.sotoyfilm.my.id';
    const canonicalUrl = `${baseUrl}/${collection === 'films' ? 'film' : 'artikel'}/${encodeURIComponent(slug)}`;

    let title = 'Sotoy Film';
    let description = 'Platform komunitas & media pop-culture film, series, anime, dan ulasan Skor Sotoy.';
    let image = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1200&q=80';
    const type = collection === 'films' ? 'video.movie' : 'article';

    if (collection === 'films') {
      title = `${data.title || 'Film'}${data.year ? ` (${data.year})` : ''} — Skor Sotoy & Review Film`;
      description = data.synopsis || data.curatorNote || `Lihat ulasan sinema, rating Skor Sotoy, dan tempat nonton film ${data.title}.`;
      image = data.poster || data.backdrop || image;
    } else {
      title = `${data.seoTitle || data.title || 'Artikel'} — Sotoy Film`;
      description = data.metaDescription || data.excerpt || (typeof data.content === 'string' ? data.content.slice(0, 160) : description);
      image = data.ogImage || data.coverImage || image;
    }

    // 4. Fetch the base index.html from self/origin
    let baseHtml = '';
    try {
      const indexUrl = new URL('/index.html', request.url);
      const htmlRes = await fetch(indexUrl.toString(), {
        headers: { 'x-middleware-subrequest': '1' },
        signal: AbortSignal.timeout(2000),
      });
      if (htmlRes.ok) {
        baseHtml = await htmlRes.text();
      }
    } catch {
      // If fetching index.html fails or times out, fallback to local template
    }

    if (!baseHtml) {
      baseHtml = FALLBACK_HTML_TEMPLATE;
    }

    // 5. Inject meta tags and return the pre-rendered HTML response
    const modifiedHtml = injectMetaTags(baseHtml, {
      title,
      description,
      image,
      url: canonicalUrl,
      type,
    });

    return new Response(modifiedHtml, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'x-robots-tag': 'all',
      },
    });
  } catch (err) {
    // Fail gracefully: log and pass request through
    console.error('[Middleware Error]', err);
    return next();
  }
}
