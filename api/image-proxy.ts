import type { IncomingMessage, ServerResponse } from 'http';

const ALLOWED_HOSTS = new Set([
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
  'image.tmdb.org',
  'images.unsplash.com',
  'lh3.googleusercontent.com',
  'www.sotoyfilm.my.id',
]);

const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB
const TIMEOUT_MS = 8000; // 8 seconds
const MAX_REDIRECTS = 3;

/**
 * Validates whether a URL is an allowed HTTPS image URL from our trusted hosts.
 */
function validateAllowedUrl(rawUrl: string): { valid: boolean; url?: URL; error?: string } {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') {
      return { valid: false, error: 'Only HTTPS URLs are supported' };
    }
    const hostname = parsed.hostname.toLowerCase();
    if (!ALLOWED_HOSTS.has(hostname)) {
      return { valid: false, error: `Host "${hostname}" is not in the allowlist` };
    }
    return { valid: true, url: parsed };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Core image proxy handler shared between Vercel Serverless Functions and Express server.ts.
 */
export async function handleImageProxy(req: any, res: any) {
  // Enable CORS headers
  res.setHeader?.('Access-Control-Allow-Origin', '*');
  res.setHeader?.('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status ? res.status(204).end() : res.writeHead(204).end();
  }

  if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
    const errorJson = { error: 'Method not allowed. Only GET and HEAD requests are supported.' };
    return res.status
      ? res.status(405).json(errorJson)
      : (res.writeHead(405, { 'Content-Type': 'application/json' }), res.end(JSON.stringify(errorJson)));
  }

  // Extract `url` query parameter (supporting both Express and Vercel serverless request shapes)
  let rawTargetUrl = '';
  if (req.query && typeof req.query === 'object') {
    rawTargetUrl = String(req.query.url || '');
  } else if (req.url) {
    try {
      const parsedReq = new URL(req.url, 'http://localhost');
      rawTargetUrl = parsedReq.searchParams.get('url') || '';
    } catch {
      // ignore
    }
  }

  if (!rawTargetUrl) {
    const errorJson = { error: 'Missing required query parameter "url"' };
    return res.status
      ? res.status(400).json(errorJson)
      : (res.writeHead(400, { 'Content-Type': 'application/json' }), res.end(JSON.stringify(errorJson)));
  }

  const initialValidation = validateAllowedUrl(rawTargetUrl);
  if (!initialValidation.valid || !initialValidation.url) {
    const errorJson = { error: initialValidation.error || 'Invalid or disallowed URL' };
    return res.status
      ? res.status(400).json(errorJson)
      : (res.writeHead(400, { 'Content-Type': 'application/json' }), res.end(JSON.stringify(errorJson)));
  }

  let currentUrl = initialValidation.url.toString();
  let response: Response | null = null;

  try {
    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
      const stepValidation = validateAllowedUrl(currentUrl);
      if (!stepValidation.valid) {
        const errorJson = { error: `Redirect to disallowed target rejected: ${stepValidation.error}` };
        return res.status
          ? res.status(400).json(errorJson)
          : (res.writeHead(400, { 'Content-Type': 'application/json' }), res.end(JSON.stringify(errorJson)));
      }

      const signal = (AbortSignal as any).timeout
        ? (AbortSignal as any).timeout(TIMEOUT_MS)
        : new AbortController().signal;

      response = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SotoyFilmImageProxy/1.0; +https://www.sotoyfilm.my.id)',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
      });

      // Handle 3xx Redirects safely with re-validation
      if (response.status >= 300 && response.status < 400) {
        const locationHeader = response.headers.get('location');
        if (!locationHeader) {
          const errorJson = { error: `Upstream returned ${response.status} redirect without Location header` };
          return res.status
            ? res.status(502).json(errorJson)
            : (res.writeHead(502, { 'Content-Type': 'application/json' }), res.end(JSON.stringify(errorJson)));
        }
        currentUrl = new URL(locationHeader, currentUrl).toString();
        continue;
      }

      break;
    }

    if (!response) {
      const errorJson = { error: 'Failed to obtain upstream response' };
      return res.status
        ? res.status(502).json(errorJson)
        : (res.writeHead(502, { 'Content-Type': 'application/json' }), res.end(JSON.stringify(errorJson)));
    }

    if (!response.ok) {
      const errorJson = { error: `Upstream server returned error status ${response.status}` };
      return res.status
        ? res.status(response.status).json(errorJson)
        : (res.writeHead(response.status, { 'Content-Type': 'application/json' }), res.end(JSON.stringify(errorJson)));
    }

    // Verify content-type is an image
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().startsWith('image/')) {
      const errorJson = {
        error: `Upstream returned non-image content-type: "${contentType || 'unknown'}"`,
      };
      return res.status
        ? res.status(400).json(errorJson)
        : (res.writeHead(400, { 'Content-Type': 'application/json' }), res.end(JSON.stringify(errorJson)));
    }

    // Check Content-Length header if present
    const contentLengthHeader = response.headers.get('content-length');
    if (contentLengthHeader && parseInt(contentLengthHeader, 10) > MAX_SIZE_BYTES) {
      const errorJson = { error: `Image size exceeds limit of ${MAX_SIZE_BYTES / (1024 * 1024)}MB` };
      return res.status
        ? res.status(413).json(errorJson)
        : (res.writeHead(413, { 'Content-Type': 'application/json' }), res.end(JSON.stringify(errorJson)));
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_SIZE_BYTES) {
      const errorJson = { error: `Image size (${arrayBuffer.byteLength} bytes) exceeds limit of 8MB` };
      return res.status
        ? res.status(413).json(errorJson)
        : (res.writeHead(413, { 'Content-Type': 'application/json' }), res.end(JSON.stringify(errorJson)));
    }

    const buffer = Buffer.from(arrayBuffer);

    // Set client caching and response headers
    res.setHeader?.('Content-Type', contentType);
    res.setHeader?.('Content-Length', buffer.length);
    res.setHeader?.('Access-Control-Allow-Origin', '*');
    res.setHeader?.('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');

    if (req.method === 'HEAD') {
      return res.status ? res.status(200).end() : res.end();
    }

    if (res.send) {
      return res.send(buffer);
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': buffer.length,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
      });
      return res.end(buffer);
    }
  } catch (err: any) {
    console.error('[ImageProxy Error]:', err);
    const isTimeout = err?.name === 'TimeoutError' || err?.message?.includes('timeout') || err?.name === 'AbortError';
    const statusCode = isTimeout ? 504 : 500;
    const errorJson = {
      error: isTimeout ? 'Image request timed out (8s limit)' : err?.message || 'Failed to proxy image',
      code: isTimeout ? 'TIMEOUT' : 'PROXY_ERROR',
    };
    return res.status
      ? res.status(statusCode).json(errorJson)
      : (res.writeHead(statusCode, { 'Content-Type': 'application/json' }), res.end(JSON.stringify(errorJson)));
  }
}

// Default export for Vercel Serverless Function
export default async function handler(req: any, res: any) {
  return handleImageProxy(req, res);
}
