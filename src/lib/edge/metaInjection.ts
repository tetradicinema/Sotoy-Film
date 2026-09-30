/**
 * HTML manipulation and OpenGraph / Twitter Card injection utilities
 * for Edge Middleware & Server-side pre-rendering.
 * Lightweight, pure string operations (zero DOM parser dependencies).
 */

export interface MetaTagsPayload {
  title: string;
  description: string;
  image: string;
  url: string;
  type: string;
  imageAlt?: string;
  locale?: string;
  keywords?: string | string[];
  publishedTime?: string;
  modifiedTime?: string;
  authorName?: string;
  section?: string;
  tags?: string[];
  // Film specific OpenGraph video metadata
  videoDirector?: string;
  videoReleaseDate?: string;
  videoDuration?: string | number;
  videoTags?: string[];
  videoActors?: string[];
  // Twitter Card metadata
  twitterCard?: string;
  twitterSite?: string;
  twitterCreator?: string;
  // Schema.org JSON-LD
  schemaJson?: Record<string, any> | Record<string, any>[] | string;
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
 * Injects OpenGraph, Twitter, canonical, and Schema.org metadata tags into the base HTML template.
 */
export function injectMetaTags(html: string, meta: MetaTagsPayload): string {
  const safeTitle = escapeHtml(meta.title);
  const safeDesc = escapeHtml(meta.description);
  const safeImage = escapeHtml(meta.image);
  const safeUrl = escapeHtml(meta.url);
  const safeImageAlt = escapeHtml(meta.imageAlt || meta.title);
  const safeLocale = escapeHtml(meta.locale || 'id_ID');
  const safeCard = escapeHtml(meta.twitterCard || 'summary_large_image');
  const safeSite = escapeHtml(meta.twitterSite || '@sotoyfilm');
  const safeCreator = escapeHtml(meta.twitterCreator || safeSite);

  // Replace <title>
  let modified = html;
  if (/<title>.*?<\/title>/i.test(modified)) {
    modified = modified.replace(/<title>.*?<\/title>/i, `<title>${safeTitle}</title>`);
  } else {
    modified = modified.replace('</head>', `  <title>${safeTitle}</title>\n  </head>`);
  }

  // Remove existing static tags that we will replace
  modified = modified.replace(/<meta\s+name=["']description["'][^>]*>/gi, '');
  modified = modified.replace(/<meta\s+name=["']keywords["'][^>]*>/gi, '');
  modified = modified.replace(/<meta\s+property=["']og:[^"']*["'][^>]*>/gi, '');
  modified = modified.replace(/<meta\s+property=["']video:[^"']*["'][^>]*>/gi, '');
  modified = modified.replace(/<meta\s+property=["']article:[^"']*["'][^>]*>/gi, '');
  modified = modified.replace(/<meta\s+name=["']twitter:[^"']*["'][^>]*>/gi, '');
  modified = modified.replace(/<link\s+rel=["']canonical["'][^>]*>/gi, '');

  let dynamicExtraTags = '';

  // Keywords
  if (meta.keywords) {
    const kwStr = Array.isArray(meta.keywords) ? meta.keywords.join(', ') : meta.keywords;
    dynamicExtraTags += `\n    <meta name="keywords" content="${escapeHtml(kwStr)}" />`;
  }

  // Article Specific Tags
  if (meta.type === 'article') {
    if (meta.publishedTime) {
      dynamicExtraTags += `\n    <meta property="article:published_time" content="${escapeHtml(meta.publishedTime)}" />`;
    }
    if (meta.modifiedTime) {
      dynamicExtraTags += `\n    <meta property="article:modified_time" content="${escapeHtml(meta.modifiedTime)}" />`;
    }
    if (meta.authorName) {
      dynamicExtraTags += `\n    <meta property="article:author" content="${escapeHtml(meta.authorName)}" />`;
    }
    if (meta.section) {
      dynamicExtraTags += `\n    <meta property="article:section" content="${escapeHtml(meta.section)}" />`;
    }
    if (meta.tags && Array.isArray(meta.tags)) {
      meta.tags.forEach(tag => {
        dynamicExtraTags += `\n    <meta property="article:tag" content="${escapeHtml(tag)}" />`;
      });
    }
  }

  // Video / Movie Specific Tags
  if (meta.type === 'video.movie') {
    if (meta.videoDirector) {
      dynamicExtraTags += `\n    <meta property="video:director" content="${escapeHtml(meta.videoDirector)}" />`;
    }
    if (meta.videoReleaseDate) {
      dynamicExtraTags += `\n    <meta property="video:release_date" content="${escapeHtml(meta.videoReleaseDate)}" />`;
    }
    if (meta.videoDuration) {
      dynamicExtraTags += `\n    <meta property="video:duration" content="${escapeHtml(String(meta.videoDuration))}" />`;
    }
    if (meta.videoTags && Array.isArray(meta.videoTags)) {
      meta.videoTags.forEach(tag => {
        dynamicExtraTags += `\n    <meta property="video:tag" content="${escapeHtml(tag)}" />`;
      });
    }
    if (meta.videoActors && Array.isArray(meta.videoActors)) {
      meta.videoActors.slice(0, 5).forEach(actor => {
        dynamicExtraTags += `\n    <meta property="video:actor" content="${escapeHtml(actor)}" />`;
      });
    }
  }

  // Schema.org JSON-LD injection
  if (meta.schemaJson) {
    const rawJson = typeof meta.schemaJson === 'string' ? meta.schemaJson : JSON.stringify(meta.schemaJson);
    dynamicExtraTags += `\n    <script type="application/ld+json">${rawJson}</script>`;
  }

  const tags = `
    <meta name="description" content="${safeDesc}" />
    <link rel="canonical" href="${safeUrl}" />
    <meta property="og:type" content="${meta.type}" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDesc}" />
    <meta property="og:image" content="${safeImage}" />
    <meta property="og:image:secure_url" content="${safeImage}" />
    <meta property="og:image:alt" content="${safeImageAlt}" />
    <meta property="og:locale" content="${safeLocale}" />
    <meta property="og:url" content="${safeUrl}" />
    <meta property="og:site_name" content="Sotoy Film" />
    <meta name="twitter:card" content="${safeCard}" />
    <meta name="twitter:site" content="${safeSite}" />
    <meta name="twitter:creator" content="${safeCreator}" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDesc}" />
    <meta name="twitter:image" content="${safeImage}" />
    <meta name="twitter:image:alt" content="${safeImageAlt}" />
    <meta name="twitter:url" content="${safeUrl}" />${dynamicExtraTags}
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
    <link rel="icon" type="image/png" href="/stacked logo-sotoyfilm.PNG" />
    <link rel="apple-touch-icon" href="/stacked logo-sotoyfilm.PNG" />
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
