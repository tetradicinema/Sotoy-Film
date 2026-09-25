/**
 * HTML manipulation and OpenGraph / Twitter Card injection utilities
 * for Edge Middleware. Lightweight, pure string operations (zero DOM parser dependencies).
 */

export interface MetaTagsPayload {
  title: string;
  description: string;
  image: string;
  url: string;
  type: string;
}

/**
 * Escapes special HTML characters to prevent XSS or broken tag injection.
 */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Injects OpenGraph, Twitter, and canonical metadata tags into the base HTML template.
 */
export function injectMetaTags(html: string, meta: MetaTagsPayload): string {
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

/**
 * Minimal static HTML fallback if fetching index.html from origin times out.
 */
export const FALLBACK_HTML_TEMPLATE = `<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='46' fill='%23FF2E7E'/><polygon points='40,30 70,50 40,70' fill='%23FFFFFF'/><circle cx='32' cy='32' r='5' fill='%230E1013'/></svg>" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sotoy Film</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800;900&family=Geist+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&display=swap" rel="stylesheet">
  </head>
  <body class="bg-[#0E1013] text-slate-100 antialiased selection:bg-[#FF2E7E] selection:text-white min-h-screen">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
