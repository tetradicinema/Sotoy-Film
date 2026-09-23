import { next } from '@vercel/edge';
import { isBotUserAgent } from './src/lib/edge/botDetection.js';
import { fetchEntityData, fetchWithTimeout } from './src/lib/edge/firestoreRest.js';
import { injectMetaTags, FALLBACK_HTML_TEMPLATE } from './src/lib/edge/metaInjection.js';

// Re-export for unit tests and external consumers
export { isBotUserAgent };

export const config = {
  runtime: 'nodejs',
  matcher: ['/film/:path*', '/artikel/:path*'],
};

/**
 * Safely invokes Vercel next() with fallback to raw x-middleware-next header
 * if helper throws an unexpected runtime error.
 */
function safeNext(): Response {
  try {
    return next();
  } catch {
    return new Response(null, {
      headers: { 'x-middleware-next': '1' },
    });
  }
}

/**
 * Vercel Routing Middleware entrypoint (Node.js runtime).
 * Intercepts incoming requests from search engine bots and social media crawlers
 * to serve dynamically injected OpenGraph, Twitter, and Search Engine meta tags.
 */
export default async function middleware(request: Request): Promise<Response> {
  try {
    if (!request || !request.headers) {
      return safeNext();
    }

    const userAgent = request.headers.get('user-agent');

    // 1. Pass through immediately for normal human visitors with zero latency penalty
    if (!isBotUserAgent(userAgent)) {
      return safeNext();
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
      return safeNext();
    }

    // 2. Fetch the entity data from Firestore REST API (with 3-way slug matching)
    const data = await fetchEntityData(collection, slug);
    if (!data) {
      // Fall through to normal SPA rather than returning an error
      return safeNext();
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

    // 4. Fetch the base index.html from origin
    let baseHtml = '';
    try {
      const indexUrl = new URL('/index.html', request.url);
      const htmlRes = await fetchWithTimeout(
        indexUrl.toString(),
        { headers: { 'x-middleware-subrequest': '1' } },
        2000
      );
      if (htmlRes.ok) {
        baseHtml = await htmlRes.text();
      }
    } catch {
      // Fall back to local template if sub-request times out
    }

    if (!baseHtml) {
      baseHtml = FALLBACK_HTML_TEMPLATE;
    }

    // 5. Inject meta tags and return pre-rendered HTML response
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
    return safeNext();
  }
}

