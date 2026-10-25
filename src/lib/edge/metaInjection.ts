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
  // Search engine directives (e.g. "noindex, follow")
  robots?: string;
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

  // Search engine directives
  if (meta.robots) {
    dynamicExtraTags += `\n    <meta name="robots" content="${escapeHtml(meta.robots)}" />`;
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

/* -------------------------------------------------------------------------- */
/* Crawler body content                                                       */
/* -------------------------------------------------------------------------- */

/** Hard cap for the article text rendered for crawlers. */
const ARTICLE_TEXT_MAX_LENGTH = 20000;

/**
 * Tags that identify the string as markup rather than plain text. Plain text
 * that merely mentions "<script>" is escaped verbatim instead of stripped.
 */
const HTML_MARKUP_PATTERN =
  /<(?:p|div|br|h[1-6]|ul|ol|li|blockquote|pre|code|strong|em|b|i|a|img|figure|figcaption|table|thead|tbody|tr|td|th|span)\b[^>]*>/i;

const TIPTAP_BLOCK_TYPES = new Set([
  'paragraph',
  'heading',
  'listItem',
  'blockquote',
  'codeBlock',
  'tableCell',
  'tableHeader',
]);

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&#x0*27;/gi, "'");
}

function stripHtmlToText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(
        /<\/(?:p|div|h[1-6]|li|blockquote|pre|tr|td|th|figure|figcaption)>/gi,
        '\n'
      )
      .replace(/<[^>]*>/g, ' ')
  )
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function tiptapInlineText(node: any): string {
  if (!node || typeof node !== 'object') return '';
  if (node.type === 'text' && typeof node.text === 'string') return node.text;
  if (node.type === 'hardBreak') return ' ';
  if (Array.isArray(node.content)) {
    return node.content.map((child: any) => tiptapInlineText(child)).join('');
  }
  return '';
}

function tiptapBlockTexts(node: any): string[] {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap((child: any) => tiptapBlockTexts(child));
  if (node.type === 'text') return [];

  const children = Array.isArray(node.content) ? node.content : [];

  if (TIPTAP_BLOCK_TYPES.has(node.type)) {
    const text = tiptapInlineText(node).replace(/\s+/g, ' ').trim();
    return text ? [text] : [];
  }

  return children.flatMap((child: any) => tiptapBlockTexts(child));
}

function toPlainText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object' && typeof (item as any).name === 'string') {
        return (item as any).name.trim();
      }
      return '';
    })
    .filter(Boolean);
}

function capParagraphs(paragraphs: string[]): string[] {
  let remaining = ARTICLE_TEXT_MAX_LENGTH;
  const capped: string[] = [];

  for (const paragraph of paragraphs) {
    if (remaining <= 0) break;
    if (paragraph.length <= remaining) {
      capped.push(paragraph);
      remaining -= paragraph.length + 2;
    } else {
      capped.push(paragraph.slice(0, remaining).trimEnd());
      remaining = 0;
    }
  }

  return capped;
}

/**
 * Converts stored article content into escaped plain paragraphs. Supports
 * HTML strings, Tiptap JSON (string or object) and plain text.
 */
function extractArticleParagraphs(data: Record<string, any>): string[] {
  const candidates: string[] = [];

  if (typeof data.contentJson === 'string' && data.contentJson.trim()) {
    candidates.push(data.contentJson.trim());
  }
  if (typeof data.content === 'string' && data.content.trim()) {
    candidates.push(data.content.trim());
  }

  for (const candidate of candidates) {
    if (candidate.startsWith('{') || candidate.startsWith('[')) {
      try {
        const blocks = tiptapBlockTexts(JSON.parse(candidate));
        if (blocks.length > 0) return capParagraphs(blocks);
      } catch {
        // Not valid Tiptap JSON; fall through to text handling.
      }
    }

    const text = HTML_MARKUP_PATTERN.test(candidate)
      ? stripHtmlToText(candidate)
      : candidate;

    const paragraphs = text
      .split(/\n{2,}|\r?\n/)
      .map(paragraph => paragraph.replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    if (paragraphs.length > 0) return capParagraphs(paragraphs);
  }

  return [];
}

/**
 * Builds the plain article body injected inside #root for crawlers.
 */
export function buildArticleBodyHtml(data: Record<string, any>): string {
  if (!data || typeof data !== 'object') return '';

  const parts: string[] = [];
  const title = toPlainText(data.title) || 'Artikel';
  parts.push(`<h1>${escapeHtml(title)}</h1>`);

  const authorName =
    toPlainText(data.author?.name) ||
    (typeof data.author === 'string' ? toPlainText(data.author) : '');
  if (authorName) {
    parts.push(`<p>By ${escapeHtml(authorName)}</p>`);
  }

  const publishedAt = toPlainText(data.publishedAt);
  if (publishedAt) {
    const parsedDate = new Date(publishedAt);
    const dateLabel = isNaN(parsedDate.getTime())
      ? publishedAt
      : parsedDate.toISOString().split('T')[0];
    parts.push(
      `<p><time datetime="${escapeHtml(publishedAt)}">${escapeHtml(dateLabel)}</time></p>`
    );
  }

  const excerpt = toPlainText(data.excerpt);
  if (excerpt) {
    parts.push(`<p>${escapeHtml(excerpt)}</p>`);
  }

  for (const paragraph of extractArticleParagraphs(data)) {
    parts.push(`<p>${escapeHtml(paragraph)}</p>`);
  }

  return `<article>${parts.join('')}</article>`;
}

/**
 * Builds the plain film body injected inside #root for crawlers.
 */
export function buildFilmBodyHtml(data: Record<string, any>): string {
  if (!data || typeof data !== 'object') return '';

  const parts: string[] = [];
  const title = toPlainText(data.title) || 'Film';
  const year = Number(data.year);
  const heading = Number.isFinite(year) && year > 0 ? `${title} (${year})` : title;
  parts.push(`<h1>${escapeHtml(heading)}</h1>`);

  const synopsis = toPlainText(data.synopsis);
  if (synopsis) {
    parts.push(`<p>${escapeHtml(synopsis)}</p>`);
  }

  const director = toPlainText(data.director);
  if (director) {
    parts.push(`<p>Director: ${escapeHtml(director)}</p>`);
  }

  const castDetails = toStringList(data.castDetails);
  const cast = castDetails.length > 0 ? castDetails : toStringList(data.cast);
  if (cast.length > 0) {
    parts.push(`<p>Cast: ${escapeHtml(cast.join(', '))}</p>`);
  }

  const genres = toStringList(data.genres);
  if (genres.length > 0) {
    parts.push(`<p>Genres: ${escapeHtml(genres.join(', '))}</p>`);
  }

  const duration = toPlainText(data.duration);
  if (duration) {
    parts.push(`<p>Duration: ${escapeHtml(duration)}</p>`);
  }

  const scoreValue = Number(data.skorSotoy);
  const score =
    Number.isFinite(scoreValue) && scoreValue > 0 ? scoreValue.toFixed(1) : '';
  const votesValue = Number(data.totalVotes);
  const votes =
    Number.isFinite(votesValue) && votesValue > 0
      ? String(Math.floor(votesValue))
      : '';

  if (score || votes) {
    const bits: string[] = [];
    if (score) bits.push(`Skor Sotoy ${score}/10`);
    if (votes) bits.push(`${votes} votes`);
    parts.push(`<p>${escapeHtml(bits.join(' · '))}</p>`);
  }

  return `<article>${parts.join('')}</article>`;
}

/**
 * Inserts a server-rendered block inside the empty <div id="root"> so crawlers
 * get body text before the SPA mounts. React replaces it on hydration.
 * Pure string operations, no DOM dependencies.
 */
export function injectRootContent(html: string, bodyHtml: string): string {
  if (!html || !bodyHtml) return html;

  const rootMatch = /<div\b[^>]*\bid=["']root["'][^>]*>/i.exec(html);
  if (!rootMatch) return html;

  const insertAt = rootMatch.index + rootMatch[0].length;
  return `${html.slice(0, insertAt)}${bodyHtml}${html.slice(insertAt)}`;
}

/**
 * Minimal static HTML fallback if fetching index.html from origin times out.
 */
export const FALLBACK_HTML_TEMPLATE = `<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/favicon-flat.png" />
    <link rel="apple-touch-icon" href="/stacked%20logo-sotoyfilm.PNG" />
    <meta name="apple-mobile-web-app-title" content="Sotoy Film" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sotoy Film</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800;900&family=Geist+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&display=swap" rel="stylesheet">
  </head>
  <body class="bg-[#0A0A0A] text-slate-100 antialiased selection:bg-[#FF2E7E] selection:text-white min-h-screen">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
