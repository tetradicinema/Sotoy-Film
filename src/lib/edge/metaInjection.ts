/**
 * HTML manipulation and OpenGraph / Twitter Card injection utilities
 * for Edge Middleware & Server-side pre-rendering.
 * Lightweight, pure string operations (zero DOM parser dependencies).
 */

import { TWITTER_CREATOR } from '../../utils/seoMetadata.js';
import { buildArticlePath, buildFilmPath, buildCategoryPath } from '../../utils/entityPaths.js';
import { pickArticleIsoDate } from './isoDate.js';
import {
  ABOUT_PAGE_CONTENT,
  ABOUT_TEAM,
  EDITORIAL_GUIDELINES_CONTENT,
  type ContentLink,
  type StaticPageContent,
} from '../../content/aboutPages.js';

/**
 * Attribute React Helmet uses to recognise the tags it owns. Marking the
 * server-injected tags with it lets Helmet replace them during hydration
 * instead of leaving a second, conflicting copy in the document head.
 */
export const HELMET_OWNED_ATTRIBUTE = 'data-rh';
const HELMET_OWNED = ` ${HELMET_OWNED_ATTRIBUTE}="true"`;

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
  /**
   * Keep the JSON-LD block out of Helmet's ownership so it survives
   * hydration. Used by routes whose client renderer does not emit an
   * equivalent schema (e.g. film season subpages).
   */
  preserveSchemaOnHydration?: boolean;
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
  const safeSite = escapeHtml(meta.twitterSite || TWITTER_CREATOR);
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
  modified = modified.replace(/<meta\s+name=["']robots["'][^>]*>/gi, '');
  modified = modified.replace(/<meta\s+property=["']og:[^"']*["'][^>]*>/gi, '');
  modified = modified.replace(/<meta\s+property=["']video:[^"']*["'][^>]*>/gi, '');
  modified = modified.replace(/<meta\s+property=["']article:[^"']*["'][^>]*>/gi, '');
  modified = modified.replace(/<meta\s+name=["']twitter:[^"']*["'][^>]*>/gi, '');
  modified = modified.replace(/<link\s+rel=["']canonical["'][^>]*>/gi, '');
  // JSON-LD only: never touch unrelated script tags.
  modified = modified.replace(
    /<script\b[^>]*\btype\s*=\s*["']?application\/ld\+json["']?[^>]*>[\s\S]*?<\/script>/gi,
    ''
  );

  let dynamicExtraTags = '';

  // Keywords
  if (meta.keywords) {
    const kwStr = Array.isArray(meta.keywords) ? meta.keywords.join(', ') : meta.keywords;
    dynamicExtraTags += `\n    <meta name="keywords" content="${escapeHtml(kwStr)}"${HELMET_OWNED} />`;
  }

  // Search engine directives
  if (meta.robots) {
    // Deliberately not Helmet-owned: on routes whose client SEOHead emits no
    // robots tag (film season subpages) Helmet would otherwise delete the
    // bot noindex during hydration.
    dynamicExtraTags += `\n    <meta name="robots" content="${escapeHtml(meta.robots)}" />`;
  }

  // Article Specific Tags
  if (meta.type === 'article') {
    if (meta.publishedTime) {
      dynamicExtraTags += `\n    <meta property="article:published_time" content="${escapeHtml(meta.publishedTime)}"${HELMET_OWNED} />`;
    }
    if (meta.modifiedTime) {
      dynamicExtraTags += `\n    <meta property="article:modified_time" content="${escapeHtml(meta.modifiedTime)}"${HELMET_OWNED} />`;
    }
    if (meta.authorName) {
      dynamicExtraTags += `\n    <meta property="article:author" content="${escapeHtml(meta.authorName)}"${HELMET_OWNED} />`;
    }
    if (meta.section) {
      dynamicExtraTags += `\n    <meta property="article:section" content="${escapeHtml(meta.section)}"${HELMET_OWNED} />`;
    }
    if (meta.tags && Array.isArray(meta.tags)) {
      meta.tags.forEach(tag => {
        dynamicExtraTags += `\n    <meta property="article:tag" content="${escapeHtml(tag)}"${HELMET_OWNED} />`;
      });
    }
  }

  // Video / Movie Specific Tags
  if (meta.type === 'video.movie') {
    if (meta.videoDirector) {
      dynamicExtraTags += `\n    <meta property="video:director" content="${escapeHtml(meta.videoDirector)}"${HELMET_OWNED} />`;
    }
    if (meta.videoReleaseDate) {
      dynamicExtraTags += `\n    <meta property="video:release_date" content="${escapeHtml(meta.videoReleaseDate)}"${HELMET_OWNED} />`;
    }
    if (meta.videoDuration) {
      dynamicExtraTags += `\n    <meta property="video:duration" content="${escapeHtml(String(meta.videoDuration))}"${HELMET_OWNED} />`;
    }
    if (meta.videoTags && Array.isArray(meta.videoTags)) {
      meta.videoTags.forEach(tag => {
        dynamicExtraTags += `\n    <meta property="video:tag" content="${escapeHtml(tag)}"${HELMET_OWNED} />`;
      });
    }
    if (meta.videoActors && Array.isArray(meta.videoActors)) {
      meta.videoActors.slice(0, 5).forEach(actor => {
        dynamicExtraTags += `\n    <meta property="video:actor" content="${escapeHtml(actor)}"${HELMET_OWNED} />`;
      });
    }
  }

  // Schema.org JSON-LD injection
  if (meta.schemaJson) {
    const rawJson = typeof meta.schemaJson === 'string' ? meta.schemaJson : JSON.stringify(meta.schemaJson);
    // `<` is the only character that can terminate the surrounding script
    // element (via `</script>`), and U+2028/U+2029 are invalid inside
    // JavaScript string literals. Escaping all three keeps the payload valid
    // JSON while making it impossible to break out of the tag. Applied once
    // here so every caller (film, article, person) is covered.
    const safeJson = rawJson
      .replace(/</g, '\\u003c')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');
    const schemaOwnership = meta.preserveSchemaOnHydration ? '' : HELMET_OWNED;
    dynamicExtraTags += `\n    <script type="application/ld+json"${schemaOwnership}>${safeJson}</script>`;
  }

  const tags = `
    <meta name="description" content="${safeDesc}"${HELMET_OWNED} />
    <link rel="canonical" href="${safeUrl}"${HELMET_OWNED} />
    <meta property="og:type" content="${meta.type}"${HELMET_OWNED} />
    <meta property="og:title" content="${safeTitle}"${HELMET_OWNED} />
    <meta property="og:description" content="${safeDesc}"${HELMET_OWNED} />
    <meta property="og:image" content="${safeImage}"${HELMET_OWNED} />
    <meta property="og:image:secure_url" content="${safeImage}"${HELMET_OWNED} />
    <meta property="og:image:alt" content="${safeImageAlt}"${HELMET_OWNED} />
    <meta property="og:locale" content="${safeLocale}"${HELMET_OWNED} />
    <meta property="og:url" content="${safeUrl}"${HELMET_OWNED} />
    <meta property="og:site_name" content="Sotoy Film"${HELMET_OWNED} />
    <meta name="twitter:card" content="${safeCard}"${HELMET_OWNED} />
    <meta name="twitter:site" content="${safeSite}"${HELMET_OWNED} />
    <meta name="twitter:creator" content="${safeCreator}"${HELMET_OWNED} />
    <meta name="twitter:title" content="${safeTitle}"${HELMET_OWNED} />
    <meta name="twitter:description" content="${safeDesc}"${HELMET_OWNED} />
    <meta name="twitter:image" content="${safeImage}"${HELMET_OWNED} />
    <meta name="twitter:image:alt" content="${safeImageAlt}"${HELMET_OWNED} />
    <meta name="twitter:url" content="${safeUrl}"${HELMET_OWNED} />${dynamicExtraTags}
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

/* -------------------------------------------------------------------------- */
/* Structured crawler body                                                    */
/* -------------------------------------------------------------------------- */

/** Tags kept in the crawler-visible article body. Everything else becomes text. */
const ARTICLE_BODY_TAGS = new Set([
  'h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li', 'table', 'thead', 'tbody',
  'tr', 'th', 'td', 'blockquote', 'a', 'strong', 'em', 'br',
]);
const ARTICLE_VOID_TAGS = new Set(['br']);
/** Tags whose contents must never reach the bot HTML at all. */
const ARTICLE_DROP_TAGS = new Set([
  'script', 'style', 'iframe', 'noscript', 'template', 'object', 'embed',
  'form', 'input', 'svg', 'canvas', 'video', 'audio',
]);

interface ArticleHref {
  href: string;
  external: boolean;
}

/**
 * Only http(s) URLs and relative paths may become links. Schemes such as
 * `javascript:` and protocol-relative `//host` are rejected (the label text is
 * still kept). Internal links are emitted verbatim — never rewritten.
 */
function sanitizeArticleHref(raw: unknown): ArticleHref | null {
  if (typeof raw !== 'string') return null;
  const href = raw.trim();
  if (!href || /[\u0000-\u001F\u007F\s]/.test(href)) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) {
    return /^https?:\/\//i.test(href) ? { href, external: true } : null;
  }
  if (href.startsWith('//')) return null;
  return { href, external: false };
}

function articleAnchor(href: string, external: boolean, label: string): string {
  return `<a href="${escapeHtml(href)}"${external ? ' rel="noopener"' : ''}>${label}</a>`;
}

function readHtmlAttribute(attrs: string, name: string): string {
  const quoted = new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i').exec(attrs);
  if (quoted) return quoted[2];
  const bare = new RegExp(`\\b${name}\\s*=\\s*([^\\s>]+)`, 'i').exec(attrs);
  return bare ? bare[1] : '';
}

/**
 * Allowlist sanitizer for legacy HTML bodies. Unknown tags are discarded but
 * their text survives; script/style/iframe blocks are dropped entirely. All
 * attributes except a safe `href` are ignored, so no on* handler can pass.
 */
function sanitizeArticleHtml(html: string): string {
  const tokens = html.match(/<!--[\s\S]*?-->|<[^>]*>|[^<]+/g);
  if (!tokens) return '';

  const out: string[] = [];
  const open: string[] = [];
  let dropUntil: string | null = null;

  for (const token of tokens) {
    if (dropUntil) {
      const close = new RegExp(`^<\\/\\s*${dropUntil}\\s*>$`, 'i');
      if (close.test(token)) dropUntil = null;
      continue;
    }
    if (token.startsWith('<!--')) continue;

    if (!token.startsWith('<')) {
      out.push(escapeHtml(decodeHtmlEntities(token)));
      continue;
    }

    const match = /^<\s*(\/)?\s*([a-zA-Z][\w-]*)\b([^>]*)>$/.exec(token);
    if (!match) {
      out.push(escapeHtml(token));
      continue;
    }
    const closing = Boolean(match[1]);
    const name = match[2].toLowerCase();

    if (ARTICLE_DROP_TAGS.has(name)) {
      if (!closing) dropUntil = name;
      continue;
    }
    if (!ARTICLE_BODY_TAGS.has(name)) continue;

    if (closing) {
      if (!open.includes(name)) continue;
      while (open.length) {
        const tag = open.pop()!;
        out.push(`</${tag}>`);
        if (tag === name) break;
      }
      continue;
    }

    const attrs = match[3] || '';
    if (name === 'a') {
      const href = sanitizeArticleHref(readHtmlAttribute(attrs, 'href'));
      if (!href) continue; // unsafe link: keep the text, drop the anchor
      out.push(`<a href="${escapeHtml(href.href)}"${href.external ? ' rel="noopener"' : ''}>`);
      open.push('a');
      continue;
    }
    if (ARTICLE_VOID_TAGS.has(name)) {
      out.push('<br>');
      continue;
    }
    out.push(`<${name}>`);
    open.push(name);
  }

  while (open.length) out.push(`</${open.pop()!}>`);
  return out.join('');
}

/** Markdown link/image syntax is turned into allowlisted HTML only. */
function renderMarkdownInline(raw: string): string {
  let out = '';
  let text = '';
  const flush = () => {
    if (text) {
      out += escapeHtml(text);
      text = '';
    }
  };

  let i = 0;
  while (i < raw.length) {
    const rest = raw.slice(i);
    let match: RegExpMatchArray | null;

    // Images are not allowed; keep their alt text.
    if ((match = rest.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+(?:"[^"]*"|'[^']*'))?\)/))) {
      flush();
      out += escapeHtml(match[1]);
      i += match[0].length;
      continue;
    }
    if ((match = rest.match(/^\[([^\]]+)\]\(([^)\s]+)(?:\s+(?:"[^"]*"|'[^']*'))?\)/))) {
      flush();
      const label = renderMarkdownInline(match[1]);
      const href = sanitizeArticleHref(match[2]);
      out += href ? articleAnchor(href.href, href.external, label) : label;
      i += match[0].length;
      continue;
    }
    if ((match = rest.match(/^\*\*([^*]+)\*\*/)) || (match = rest.match(/^__([^_]+)__/))) {
      flush();
      out += `<strong>${renderMarkdownInline(match[1])}</strong>`;
      i += match[0].length;
      continue;
    }
    if ((match = rest.match(/^\*([^*\n]+)\*/)) || (match = rest.match(/^_([^_\n]+)_/))) {
      flush();
      out += `<em>${renderMarkdownInline(match[1])}</em>`;
      i += match[0].length;
      continue;
    }
    if ((match = rest.match(/^`([^`]+)`/))) {
      flush();
      out += escapeHtml(match[1]);
      i += match[0].length;
      continue;
    }
    // Raw HTML is not part of the markdown format: drop the tag so no on*
    // attribute or remote handler can reach the bot HTML, but keep its text.
    if ((match = rest.match(/^<\/?[a-zA-Z][\w-]*(?:\s[^><]*)?\/?>/))) {
      i += match[0].length;
      continue;
    }
    text += raw[i++];
  }
  flush();
  return out;
}

function markdownListPattern(line: string): { indent: number; ordered: boolean; text: string } | null {
  const match = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(line);
  if (!match) return null;
  return { indent: match[1].length, ordered: /\d/.test(match[2]), text: match[3] };
}

function isMarkdownTableSeparator(line: string): boolean {
  return /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function splitMarkdownTableRow(line: string): string[] {
  return line
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map(cell => cell.trim());
}

function renderMarkdownList(lines: string[], start: number, indent: number): { html: string; next: number } {
  const items: string[] = [];
  let ordered = false;
  let i = start;

  while (i < lines.length) {
    const item = markdownListPattern(lines[i]);
    if (!item || item.indent < indent) break;
    if (item.indent > indent) {
      if (items.length === 0) break;
      const nested = renderMarkdownList(lines, i, item.indent);
      items[items.length - 1] += nested.html;
      i = nested.next;
      continue;
    }

    ordered = item.ordered;
    let body = renderMarkdownInline(item.text);
    i++;
    while (i < lines.length) {
      const nextItem = markdownListPattern(lines[i]);
      if (nextItem && nextItem.indent > indent) {
        const nested = renderMarkdownList(lines, i, nextItem.indent);
        body += nested.html;
        i = nested.next;
        continue;
      }
      if (nextItem || !lines[i].trim()) break;
      if (/^\s{2,}\S/.test(lines[i])) {
        body += `<br>${renderMarkdownInline(lines[i].trim())}`;
        i++;
        continue;
      }
      break;
    }
    items.push(`<li>${body}</li>`);
  }

  const tag = ordered ? 'ol' : 'ul';
  return { html: `<${tag}>${items.join('')}</${tag}>`, next: i };
}

/** Converts the editor's markdown serialization into allowlisted HTML blocks. */
function renderMarkdownBlocks(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let paragraph: string[] = [];
  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<p>${paragraph.map(renderMarkdownInline).join('<br>')}</p>`);
      paragraph = [];
    }
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      flushParagraph();
      i++;
      continue;
    }

    // Fenced code: pre/code are not allowed, so keep the text in a paragraph.
    const fence = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fence) {
      flushParagraph();
      const marker = fence[1][0];
      i++;
      const codeLines: string[] = [];
      const end = new RegExp(`^\\s*${marker}{3,}`);
      while (i < lines.length && !end.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      if (codeLines.length) {
        out.push(`<p>${codeLines.map(entry => escapeHtml(entry)).join('<br>')}</p>`);
      }
      continue;
    }

    if (line.includes('|') && i + 1 < lines.length && isMarkdownTableSeparator(lines[i + 1])) {
      flushParagraph();
      const header = splitMarkdownTableRow(line)
        .map(cell => `<th>${renderMarkdownInline(cell)}</th>`)
        .join('');
      i += 2;
      const rows: string[] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(
          `<tr>${splitMarkdownTableRow(lines[i])
            .map(cell => `<td>${renderMarkdownInline(cell)}</td>`)
            .join('')}</tr>`
        );
        i++;
      }
      out.push(`<table><thead><tr>${header}</tr></thead><tbody>${rows.join('')}</tbody></table>`);
      continue;
    }

    const heading = /^\s*(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (heading) {
      flushParagraph();
      const level = Math.min(4, Math.max(2, heading[1].length));
      out.push(`<h${level}>${renderMarkdownInline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      flushParagraph();
      const quoted: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quoted.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      out.push(`<blockquote>${renderMarkdownBlocks(quoted.join('\n'))}</blockquote>`);
      continue;
    }

    const listItem = markdownListPattern(line);
    if (listItem) {
      flushParagraph();
      const list = renderMarkdownList(lines, i, listItem.indent);
      out.push(list.html);
      i = list.next;
      continue;
    }

    paragraph.push(line.trim());
    i++;
  }
  flushParagraph();
  return out.join('');
}

function parseTiptapDoc(value: unknown): any | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  if (!value.trimStart().startsWith('{') && !value.trimStart().startsWith('[')) return null;
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function renderTiptapInline(node: any): string {
  if (!node || typeof node !== 'object') return '';
  if (node.type === 'text') {
    let html = escapeHtml(typeof node.text === 'string' ? node.text : '');
    for (const mark of Array.isArray(node.marks) ? node.marks : []) {
      if (mark?.type === 'bold') html = `<strong>${html}</strong>`;
      else if (mark?.type === 'italic') html = `<em>${html}</em>`;
      else if (mark?.type === 'link') {
        const href = sanitizeArticleHref(mark?.attrs?.href);
        if (href) html = articleAnchor(href.href, href.external, html);
      }
    }
    return html;
  }
  if (node.type === 'hardBreak') return '<br>';
  if (Array.isArray(node.content)) return node.content.map(renderTiptapInline).join('');
  return '';
}

function renderTiptapBlocks(node: any): string {
  if (!node || typeof node !== 'object') return '';
  if (Array.isArray(node)) return node.map(renderTiptapBlocks).join('');

  const children = Array.isArray(node.content) ? node.content.map(renderTiptapBlocks).join('') : '';
  switch (node.type) {
    case 'paragraph':
      return `<p>${renderTiptapInline(node)}</p>`;
    case 'heading': {
      const raw = Number(node.attrs?.level);
      const level = Number.isFinite(raw) ? Math.min(4, Math.max(2, raw)) : 2;
      return `<h${level}>${renderTiptapInline(node)}</h${level}>`;
    }
    case 'bulletList':
      return `<ul>${children}</ul>`;
    case 'orderedList':
      return `<ol>${children}</ol>`;
    case 'listItem':
      return `<li>${children || renderTiptapInline(node)}</li>`;
    case 'blockquote':
      return `<blockquote>${children}</blockquote>`;
    case 'table':
      return `<table>${children}</table>`;
    case 'tableRow':
      return `<tr>${children}</tr>`;
    case 'tableHeader':
      return `<th>${children || renderTiptapInline(node)}</th>`;
    case 'tableCell':
      return `<td>${children || renderTiptapInline(node)}</td>`;
    case 'text':
    case 'hardBreak':
      return renderTiptapInline(node);
    default:
      // Unknown/unsupported nodes contribute their text, never their markup.
      return children;
  }
}

/**
 * Editor content is markdown; only legacy documents start with raw HTML block
 * markup. Checking the opening of the body keeps inline HTML mentioned in
 * prose from flipping a markdown article into the sanitizer path.
 */
function isLegacyHtmlArticleContent(content: string): boolean {
  return /^\s*<(?:p|div|h[1-6]|ul|ol|li|table|thead|tbody|tr|td|th|blockquote|br|img|span|a|strong|em)\b/i.test(
    content
  );
}

/** Renders the stored article body in its actual format (Tiptap JSON, markdown, legacy HTML). */
function renderArticleContentHtml(data: Record<string, any>): string {
  const tiptapDoc = parseTiptapDoc(data.contentJson);
  const content = typeof data.content === 'string' ? data.content.trim() : '';

  if (tiptapDoc && (data.contentFormat === 'tiptap' || !content)) {
    return sanitizeArticleHtml(renderTiptapBlocks(tiptapDoc));
  }
  if (!content) return '';

  if (content.startsWith('{') || content.startsWith('[')) {
    const inlineDoc = parseTiptapDoc(content);
    if (inlineDoc) return sanitizeArticleHtml(renderTiptapBlocks(inlineDoc));
  }

  if (isLegacyHtmlArticleContent(content)) {
    return sanitizeArticleHtml(content);
  }

  // Markdown prose is escaped rather than parsed as markup, but explicit
  // script/style/iframe blocks must not contribute any text either.
  const withoutEmbeddedBlocks = content
    .replace(/<(script|style|iframe)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(script|style|iframe)\b[^>]*\/?>/gi, '');
  const html = renderMarkdownBlocks(withoutEmbeddedBlocks);
  return sanitizeArticleHtml(html);
}

function closingArticleTags(stack: string[]): string {
  return stack.slice().reverse().map(tag => `</${tag}>`).join('');
}

/** Caps markup at a token boundary and always closes the open elements. */
function capStructuredHtml(html: string, limit: number): string {
  if (!html || limit <= 0) return '';
  if (html.length <= limit) return html;

  const tokens = html.match(/<\/?[a-zA-Z][^>]*>|[^<]+/g) || [];
  let out = '';
  const stack: string[] = [];

  for (const token of tokens) {
    const closings = closingArticleTags(stack);
    if (out.length + token.length + closings.length > limit) {
      // A long text run can still be cut at a word/entity boundary; tags are
      // never split and the open elements are closed below.
      if (!token.startsWith('<')) {
        const available = limit - out.length - closings.length;
        if (available > 0) {
          let slice = token.slice(0, available);
          const word = slice.lastIndexOf(' ');
          if (word > 0) slice = slice.slice(0, word);
          const entity = slice.lastIndexOf('&');
          if (entity >= 0 && slice.indexOf(';', entity) === -1) slice = slice.slice(0, entity);
          if (slice.trim()) out += slice.trimEnd();
        }
      }
      break;
    }

    if (token.startsWith('</')) {
      out += token;
      const name = token.slice(2, -1).trim().toLowerCase();
      const index = stack.lastIndexOf(name);
      if (index >= 0) stack.length = index;
      continue;
    }
    if (token.startsWith('<')) {
      out += token;
      const name = (/^<([a-zA-Z][\w-]*)/.exec(token)?.[1] || '').toLowerCase();
      if (name && name !== 'br' && !/\/\s*>$/.test(token)) stack.push(name);
      continue;
    }
    out += token;
  }

  return out + closingArticleTags(stack);
}

function relatedEntityRefs(value: unknown): Array<{ id: string; slug?: string; title?: string }> {
  const rawList = Array.isArray(value)
    ? value
    : typeof value === 'string' && value.trim()
      ? [value]
      : [];
  const refs: Array<{ id: string; slug?: string; title?: string }> = [];
  for (const item of rawList) {
    if (typeof item === 'string') {
      const id = item.trim();
      // An ID alone is not a link target: never turn it into a path or a label.
      if (id) refs.push({ id });
      continue;
    }
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, any>;
    const id = toPlainText(record.id) || toPlainText(record.slug);
    const slug = toPlainText(record.slug);
    const title = toPlainText(record.title) || toPlainText(record.name);
    if (!id && !slug) continue;
    refs.push({ id: id || slug, slug, title });
  }
  return refs;
}

function readableCategoryLabel(category: string): string {
  return category
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
    .trim();
}

function formatIndonesianDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Small related block built exclusively from fields already present on the
 * article document. No extra reads, no fabricated URLs: an ID-only reference
 * is dropped because its real slug/title cannot be resolved here.
 */
function buildArticleRelatedHtml(data: Record<string, any>): string {
  const links: string[] = [];
  const seen = new Set<string>();
  const add = (href: string, label: string) => {
    if (seen.has(href) || links.length >= 8) return;
    seen.add(href);
    links.push(articleAnchor(href, false, escapeHtml(label)));
  };
  const addResolved = (
    refs: Array<{ id: string; slug?: string; title?: string }>,
    buildPath: (ref: { id: string; slug?: string; title?: string }) => string
  ) => {
    for (const ref of refs) {
      // Both values must come from the document: no ID-based path, no ID label.
      if (!ref.slug || !ref.title) continue;
      add(buildPath(ref), ref.title);
    }
  };

  const category = toPlainText(data.category);
  if (category && sanitizeArticleHref(buildCategoryPath(category))) {
    add(buildCategoryPath(category), `Kategori ${readableCategoryLabel(category)}`);
  }

  // Only embedded film details carry a real slug and human title. Bare
  // relatedFilmId(s) are intentionally ignored: resolving them needs a fetch.
  for (const field of ['relatedFilms', 'linkedFilms', 'relatedFilmId', 'relatedFilmIds']) {
    addResolved(relatedEntityRefs(data[field]), ref => buildFilmPath(ref));
  }
  // Article documents do not normally carry related-article details; honour
  // them when present, but never fall back to a bare ID.
  for (const field of ['relatedArticles', 'relatedArticleIds', 'relatedArticleDetails']) {
    addResolved(relatedEntityRefs(data[field]), ref => buildArticlePath(ref));
  }

  return links.length ? `<p>Related: ${links.join(' ')}</p>` : '';
}

/**
 * Builds the structured article body injected inside #root for crawlers.
 */
export function buildArticleBodyHtml(data: Record<string, any>): string {
  if (!data || typeof data !== 'object') return '';

  const parts: string[] = [];
  const title = toPlainText(data.title) || 'Artikel';
  parts.push(`<h1>${escapeHtml(title)}</h1>`);

  const authorName =
    toPlainText(data.author?.name) ||
    (typeof data.author === 'string' ? toPlainText(data.author) : '');
  const authorId =
    toPlainText(data.authorId) ||
    (typeof data.author === 'object' && data.author ? toPlainText(data.author.id) : '');
  if (authorName) {
    const byline = authorId
      ? `<a href="${escapeHtml(`/user/${encodeURIComponent(authorId)}`)}">${escapeHtml(authorName)}</a>`
      : escapeHtml(authorName);
    parts.push(`<p>Oleh ${byline}</p>`);
  }

  const publishedIso = pickArticleIsoDate(data, 'published');
  if (publishedIso) {
    parts.push(
      `<p><time datetime="${escapeHtml(publishedIso)}">${escapeHtml(formatIndonesianDate(publishedIso))}</time></p>`
    );
  }

  // Only surface an edit date when it is meaningfully later than publication.
  // With no updatedAt, pickArticleIsoDate falls back to the publish date, so
  // this comparison also preserves the old "no separate modified date" behavior.
  const modifiedIso = pickArticleIsoDate(data, 'modified');
  if (
    modifiedIso &&
    publishedIso &&
    new Date(modifiedIso).getTime() - new Date(publishedIso).getTime() > 24 * 60 * 60 * 1000
  ) {
    parts.push(
      `<p><time datetime="${escapeHtml(modifiedIso)}">Diperbarui: ${escapeHtml(formatIndonesianDate(modifiedIso))}</time></p>`
    );
  }

  const excerpt = toPlainText(data.excerpt);
  if (excerpt) {
    parts.push(`<p>${escapeHtml(excerpt)}</p>`);
  }

  const related = buildArticleRelatedHtml(data);
  const budget =
    ARTICLE_TEXT_MAX_LENGTH - `<article>${parts.join('')}${related}</article>`.length;
  parts.push(capStructuredHtml(renderArticleContentHtml(data), budget));

  return `<article>${parts.join('')}${related}</article>`;
}

export interface AuthorBodyProfile {
  name: string;
  bio: string;
}

export interface AuthorBodyArticle {
  id: string;
  slug?: string;
  title?: string;
}

/**
 * Crawler body for a public author profile. Only allowlisted profile/article
 * fields reach this function; every value is escaped before rendering.
 */
export function buildAuthorBodyHtml(
  profile: AuthorBodyProfile,
  articles: AuthorBodyArticle[]
): string {
  if (!profile || typeof profile !== 'object') return '';

  const parts: string[] = [
    `<h1>${escapeHtml(toPlainText(profile.name))}</h1>`,
    '<p>Penulis di Sotoy Film</p>',
  ];
  const bio = toPlainText(profile.bio);
  if (bio) parts.push(`<p>${escapeHtml(bio)}</p>`);

  const links = (Array.isArray(articles) ? articles : [])
    .slice(0, 30)
    .map(article => {
      if (!article || typeof article !== 'object') return '';
      const id = toPlainText(article.id);
      const slug = toPlainText(article.slug);
      if (!id && !slug) return '';
      const href = buildArticlePath({ id, slug });
      const label =
        toPlainText(article.title) || toPlainText(article.slug) || toPlainText(article.id);
      return `<li><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></li>`;
    })
    .filter(Boolean);

  if (links.length) {
    parts.push(`<p>Artikel karya ${escapeHtml(toPlainText(profile.name))}:</p>`);
    parts.push(`<ul>${links.join('')}</ul>`);
  }

  return `<article>${parts.join('')}</article>`;
}

function contentAnchor(link: ContentLink): string {
  const label = escapeHtml(toPlainText(link.label));
  const href = sanitizeArticleHref(link.href);
  if (!href) return label;
  const external = href.external || link.external === true;
  return `<a href="${escapeHtml(href.href)}"${external ? ' rel="noopener"' : ''}>${label}</a>`;
}

/**
 * Renders one of the shared editorial pages (About / Pedoman Redaksi) as a
 * crawler-only body. All text is escaped; only h1/h2/p/ul/li/a are emitted,
 * mirroring the allowlisted article body sanitizer.
 */
function buildSharedStaticPageBodyHtml(page: StaticPageContent): string {
  const parts: string[] = [`<h1>${escapeHtml(page.h1)}</h1>`];

  for (const paragraph of page.intro || []) {
    parts.push(`<p>${escapeHtml(paragraph)}</p>`);
  }

  for (const section of page.sections || []) {
    parts.push(`<h2>${escapeHtml(section.heading)}</h2>`);

    for (const paragraph of section.paragraphs || []) {
      parts.push(`<p>${escapeHtml(paragraph)}</p>`);
    }

    if (section.bullets && section.bullets.length > 0) {
      const items = section.bullets
        .map(bullet => `<li>${escapeHtml(bullet)}</li>`)
        .join('');
      parts.push(`<ul>${items}</ul>`);
    }

    if (section.showTeam) {
      const items = ABOUT_TEAM.map(member => {
        const href = `/user/${encodeURIComponent(member.userId)}`;
        return `<li><a href="${escapeHtml(href)}">${escapeHtml(member.name)}</a> - ${escapeHtml(member.role)}</li>`;
      }).join('');
      parts.push(`<ul>${items}</ul>`);
    }

    if (section.links && section.links.length > 0) {
      const items = section.links
        .map(link => `<li>${contentAnchor(link)}</li>`)
        .join('');
      parts.push(`<ul>${items}</ul>`);
    }
  }

  if (page.footerNote) {
    parts.push(`<p>${escapeHtml(page.footerNote)}</p>`);
  }

  return `<article>${parts.join('')}</article>`;
}

/** Crawler body for /tentang-kami and /about-us. */
export function buildAboutPageBodyHtml(): string {
  return buildSharedStaticPageBodyHtml(ABOUT_PAGE_CONTENT);
}

/** Crawler body for /pedoman-redaksi. */
export function buildEditorialGuidelinesBodyHtml(): string {
  return buildSharedStaticPageBodyHtml(EDITORIAL_GUIDELINES_CONTENT);
}

/**
 * Mirrors the app's read-time score handling (AppContext.tsx ~1238-1250 and
 * firestoreRestClient.ts ~260-278): a legacy document (scoreScale undefined)
 * with a stored 5-scale score (0 < stored <= 5.0) is DISPLAYED doubled, rounded
 * to one decimal; everything else is displayed as stored. Returns null when
 * there is no positive displayed score, so the bot HTML never prints "0" or a
 * fabricated fallback number.
 */
function displayedFilmScore(data: Record<string, any>): number | null {
  const stored = Number(data.skorSotoy);
  if (!Number.isFinite(stored)) return null;

  const isLegacy = data.scoreScale === undefined;
  const displayed =
    isLegacy && stored > 0 && stored <= 5.0 ? Number((stored * 2).toFixed(1)) : stored;

  return Number.isFinite(displayed) && displayed > 0 ? displayed : null;
}

/** Maximum curatorNote length before truncation (at a word boundary). */
const CURATOR_NOTE_MAX_LENGTH = 600;

/** Maximum platform entries printed in the "Where to watch" line. */
const WHERE_TO_WATCH_MAX = 8;

/** The only whereToWatch types worth showing as a parenthetical. */
const WHERE_TO_WATCH_TYPES = new Set(['stream', 'rent', 'buy']);

/**
 * Truncates plain text to at most `max` characters, cutting at a word
 * boundary when one exists, and appends a plain "..." marker. Truncation
 * happens BEFORE escaping, so it can never split an HTML entity.
 */
function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const cut = slice.lastIndexOf(' ');
  const truncated = cut > 0 ? slice.slice(0, cut) : slice;
  return `${truncated}...`;
}

/**
 * Builds "A (stream), B (rent)" from a whereToWatch list. Entries without a
 * platform are skipped, platform+type pairs are deduplicated, at most
 * WHERE_TO_WATCH_MAX entries are printed, and the type is shown only for
 * stream/rent/buy. Returns '' when nothing usable remains.
 */
function formatWhereToWatch(value: unknown): string {
  if (!Array.isArray(value)) return '';
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const platform = toPlainText((entry as any).platform);
    if (!platform) continue;
    const type = toPlainText((entry as any).type).toLowerCase();
    const key = `${platform.toLowerCase()}|${type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(WHERE_TO_WATCH_TYPES.has(type) ? `${platform} (${type})` : platform);
    if (labels.length >= WHERE_TO_WATCH_MAX) break;
  }
  return labels.join(', ');
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

  // Extra real, non-fabricated fields, in a fixed order after Duration.
  const rawTitle = toPlainText(data.title);
  const originalTitle = toPlainText(data.originalTitle);
  if (originalTitle && originalTitle.toLowerCase() !== rawTitle.toLowerCase()) {
    parts.push(`<p>Original title: ${escapeHtml(originalTitle)}</p>`);
  }

  const writer = toPlainText(data.writer);
  if (writer) {
    parts.push(`<p>Writer: ${escapeHtml(writer)}</p>`);
  }

  const studio = toPlainText(data.studio);
  if (studio) {
    parts.push(`<p>Studio: ${escapeHtml(studio)}</p>`);
  }

  const whereToWatch = formatWhereToWatch(data.whereToWatch);
  if (whereToWatch) {
    parts.push(`<p>Where to watch: ${escapeHtml(whereToWatch)}</p>`);
  }

  const curatorNote = toPlainText(data.curatorNote);
  if (curatorNote) {
    parts.push(
      `<p>${escapeHtml(truncateAtWord(curatorNote, CURATOR_NOTE_MAX_LENGTH))}</p>`
    );
  }

  // Only a real, positive, app-consistent score is printed, and only with real
  // vote evidence (> 1): legacy seeds had totalVotes 1 without reviews, and a
  // single vote must never look like an aggregate.
  const score = displayedFilmScore(data);
  const votesValue = Number(data.totalVotes);
  const votes =
    Number.isFinite(votesValue) && votesValue > 1 ? String(Math.floor(votesValue)) : '';

  if (score !== null || votes) {
    const bits: string[] = [];
    if (score !== null) bits.push(`Skor Sotoy ${score.toFixed(1)}/10`);
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

/* -------------------------------------------------------------------------- */
/* Client hydration prefetch payload                                          */
/* -------------------------------------------------------------------------- */

export type PrefetchKind = 'article' | 'film';

/** Hard cap for the serialized prefetch payload (about 200 KB). */
export const PREFETCH_MAX_LENGTH = 200 * 1024;

const ARTICLE_PREFETCH_STRING_FIELDS = [
  'id',
  'title',
  'slug',
  'excerpt',
  'content',
  'contentFormat',
  'contentJson',
  'coverImage',
  'coverImageAlt',
  'category',
  'subCategory',
  'authorId',
  'publishedAt',
  'publishedAtTimestamp',
  'readTime',
  'seoTitle',
  'metaDescription',
  'ogImage',
  'seoKeywords',
  'relatedFilmId',
  'status',
  'scheduledAt',
  'updatedAt',
];

const ARTICLE_PREFETCH_NUMBER_FIELDS = [
  'coverImageWidth',
  'coverImageHeight',
  'views',
  'likes',
  'commentsCount',
  'skorSotoy',
];

const FILM_PREFETCH_STRING_FIELDS = [
  'id',
  'slug',
  'title',
  'originalTitle',
  'type',
  'releaseDate',
  'idReleaseDate',
  'poster',
  'backdrop',
  'synopsis',
  'director',
  'writer',
  'studio',
  'duration',
  'trailerUrl',
  'trailerTitle',
  'curatorNote',
  'createdAt',
];

const FILM_PREFETCH_NUMBER_FIELDS = [
  'tmdbId',
  'year',
  'skorSotoy',
  'totalVotes',
  'criticsSkorSotoy',
  'scoreScale',
];

function isPlainObject(value: unknown): value is Record<string, any> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function firstString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function firstNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function stringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === 'string');
}

/**
 * Keeps only public author fields. Email, tokens, and internal admin fields
 * are intentionally dropped, so they can never reach the HTML.
 */
function sanitizeAuthor(value: unknown): Record<string, any> | undefined {
  if (typeof value === 'string') {
    const name = firstString(value);
    return name ? { name } : undefined;
  }
  if (!isPlainObject(value)) return undefined;

  const author: Record<string, any> = {};
  for (const key of ['id', 'name', 'displayName', 'avatar', 'avatarURL', 'role']) {
    const field = firstString(value[key]);
    if (field) author[key] = field;
  }
  return Object.keys(author).length > 0 ? author : undefined;
}

function sanitizeCastDetails(value: unknown): Record<string, any>[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const list = value
    .filter(isPlainObject)
    .map(member => ({
      name: firstString(member.name) || '',
      character: firstString(member.character) || '',
      photo: firstString(member.photo) || '',
    }))
    .filter(member => member.name);
  return list;
}

function sanitizeCrewDetails(value: unknown): Record<string, any>[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const list = value
    .filter(isPlainObject)
    .map(member => {
      const crew: Record<string, any> = {
        name: firstString(member.name) || '',
        job: firstString(member.job) || '',
        photo: firstString(member.photo) || '',
      };
      const department = firstString(member.department);
      if (department) crew.department = department;
      return crew;
    })
    .filter(member => member.name);
  return list;
}

function sanitizeWhereToWatch(value: unknown): Record<string, any>[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const allowedTypes = new Set(['stream', 'cinema', 'rent']);
  const list: Record<string, any>[] = [];

  for (const entry of value) {
    if (!isPlainObject(entry)) continue;
    const platform = firstString(entry.platform);
    if (!platform) continue;
    const rawType = firstString(entry.type) || 'stream';
    const item: Record<string, any> = {
      platform,
      type: allowedTypes.has(rawType) ? rawType : 'stream',
      badgeColor: firstString(entry.badgeColor) || '#FF2E7E',
    };
    if (entry.source === 'tmdb') item.source = 'tmdb';
    list.push(item);
  }

  return list;
}

/**
 * Builds the article payload with an explicit allowlist: article comments,
 * emails, tokens, versions, analytics, and admin internals never survive.
 */
function sanitizeArticlePrefetchData(data: Record<string, any>): Record<string, any> {
  const safe: Record<string, any> = {};

  for (const key of ARTICLE_PREFETCH_STRING_FIELDS) {
    const value = firstString(data[key]);
    if (value !== undefined) safe[key] = value;
  }
  for (const key of ARTICLE_PREFETCH_NUMBER_FIELDS) {
    const value = firstNumber(data[key]);
    if (value !== undefined) safe[key] = value;
  }

  const tags = stringList(data.tags);
  if (tags) safe.tags = tags;
  const relatedFilmIds = stringList(data.relatedFilmIds);
  if (relatedFilmIds) safe.relatedFilmIds = relatedFilmIds;
  const author = sanitizeAuthor(data.author);
  if (author) safe.author = author;

  return safe;
}

/**
 * Builds the film payload with an explicit allowlist. No user reviews,
 * emails, tokens, or private/admin fields are included.
 */
function sanitizeFilmPrefetchData(data: Record<string, any>): Record<string, any> {
  const safe: Record<string, any> = {};

  for (const key of FILM_PREFETCH_STRING_FIELDS) {
    const value = firstString(data[key]);
    if (value !== undefined) safe[key] = value;
  }
  for (const key of FILM_PREFETCH_NUMBER_FIELDS) {
    const value = firstNumber(data[key]);
    if (value !== undefined) safe[key] = value;
  }

  const cast = stringList(data.cast);
  if (cast) safe.cast = cast;
  const genres = stringList(data.genres);
  if (genres) safe.genres = genres;
  const tags = stringList(data.tags);
  if (tags) safe.tags = tags;
  const originCountry = stringList(data.originCountry);
  if (originCountry) safe.originCountry = originCountry;
  const stills = stringList(data.stills);
  if (stills) safe.stills = stills;
  const relatedArticleIds = stringList(data.relatedArticleIds);
  if (relatedArticleIds) safe.relatedArticleIds = relatedArticleIds;

  const castDetails = sanitizeCastDetails(data.castDetails);
  if (castDetails) safe.castDetails = castDetails;
  const crewDetails = sanitizeCrewDetails(data.crewDetails);
  if (crewDetails) safe.crewDetails = crewDetails;
  const whereToWatch = sanitizeWhereToWatch(data.whereToWatch);
  if (whereToWatch) safe.whereToWatch = whereToWatch;

  return safe;
}

/**
 * Serializes a prefetch payload so it cannot break out of its script tag.
 * `<`, `>`, `&`, U+2028, and U+2029 are escaped as JSON unicode sequences.
 */
export function serializePrefetchPayload(payload: unknown): string {
  return JSON.stringify(payload)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function buildPrefetchJson(kind: PrefetchKind, slug: string, data: Record<string, any>): string {
  return serializePrefetchPayload({ kind, slug, data });
}

/**
 * Enforces the ~200 KB cap. Article bodies are trimmed first; Tiptap JSON is
 * kept intact only when it fits, otherwise plain text is used as a fallback.
 */
function fitPrefetchData(
  kind: PrefetchKind,
  slug: string,
  data: Record<string, any>
): { data: Record<string, any>; json: string } {
  let json = buildPrefetchJson(kind, slug, data);
  if (json.length <= PREFETCH_MAX_LENGTH) {
    return { data, json };
  }

  const trimmed: Record<string, any> = { ...data };

  if (kind === 'article') {
    const isTiptap =
      trimmed.contentFormat === 'tiptap' &&
      typeof trimmed.contentJson === 'string' &&
      trimmed.contentJson.length > 0;
    const contentJson = isTiptap ? String(trimmed.contentJson) : '';
    const content = typeof trimmed.content === 'string' ? trimmed.content : '';

    delete trimmed.contentJson;
    delete trimmed.content;

    const baseLength = buildPrefetchJson(kind, slug, trimmed).length;
    let budget = PREFETCH_MAX_LENGTH - baseLength - 128;

    if (budget > 0 && isTiptap && contentJson.length <= budget) {
      trimmed.contentJson = contentJson;
      budget -= contentJson.length;
      if (budget > 0 && content) {
        trimmed.content = content.slice(0, budget);
      }
    } else if (budget > 0 && content) {
      if (isTiptap) trimmed.contentFormat = 'markdown';
      trimmed.content = content.slice(0, budget);
    } else if (budget > 0 && isTiptap) {
      const plain = extractArticleParagraphs({ contentJson }).join('\n\n');
      trimmed.contentFormat = 'markdown';
      trimmed.content = plain.slice(0, budget);
    } else if (isTiptap) {
      trimmed.contentFormat = 'markdown';
    }
  } else {
    const synopsis = typeof trimmed.synopsis === 'string' ? trimmed.synopsis : '';
    delete trimmed.synopsis;

    const baseLength = buildPrefetchJson(kind, slug, trimmed).length;
    const budget = PREFETCH_MAX_LENGTH - baseLength - 64;
    if (budget > 0 && synopsis) {
      trimmed.synopsis = synopsis.slice(0, budget);
    }
  }

  json = buildPrefetchJson(kind, slug, trimmed);

  // Last-resort guard: keep a small, valid payload instead of exceeding the cap.
  if (json.length > PREFETCH_MAX_LENGTH) {
    const minimal: Record<string, any> = {};
    for (const key of ['id', 'slug', 'title', 'excerpt', 'poster', 'coverImage']) {
      const value = firstString(data[key]);
      if (value !== undefined) minimal[key] = value.slice(0, 500);
    }
    const year = firstNumber(data.year);
    if (year !== undefined) minimal.year = year;
    const type = firstString(data.type);
    if (type !== undefined) minimal.type = type;
    return { data: minimal, json: buildPrefetchJson(kind, slug, minimal) };
  }

  return { data: trimmed, json };
}

/**
 * Embeds the entity data used by the client detail pages as a JSON script tag
 * just before `</head>` (or `</body>` as a fallback). This lets React render
 * the real article/film even when Firestore Listen streams are unavailable
 * in a crawler renderer.
 */
export function injectPrefetchData(
  html: string,
  kind: PrefetchKind,
  data: Record<string, any>
): string {
  if (!html || !data || typeof data !== 'object') return html;

  try {
    const safeData =
      kind === 'article'
        ? sanitizeArticlePrefetchData(data)
        : sanitizeFilmPrefetchData(data);
    const slug = firstString(data.slug) || firstString(data.id) || '';
    const { json } = fitPrefetchData(kind, slug, safeData);
    const script = `<script id="seo-prefetch" type="application/json">${json}</script>`;

    if (/<\/head>/i.test(html)) {
      return html.replace(/<\/head>/i, `${script}</head>`);
    }
    if (/<\/body>/i.test(html)) {
      return html.replace(/<\/body>/i, `${script}</body>`);
    }
    return `${html}${script}`;
  } catch {
    return html;
  }
}

/* -------------------------------------------------------------------------- */
/* List-page payload (bot-only #seo-lists script)                             */
/* -------------------------------------------------------------------------- */

export interface SeoListsPayload {
  films: Record<string, any>[];
  articles: Record<string, any>[];
}

const SEO_LIST_FILM_STRING_FIELDS = [
  'id',
  'slug',
  'title',
  'originalTitle',
  'type',
  'poster',
  'backdrop',
  'director',
  'duration',
  'releaseDate',
  'idReleaseDate',
  'createdAt',
  'updatedAt',
  'status',
];

const SEO_LIST_FILM_NUMBER_FIELDS = [
  'year',
  'skorSotoy',
  'criticsSkorSotoy',
  'totalVotes',
  'scoreScale',
  'trendingRank',
];

const SEO_LIST_FILM_STRING_ARRAY_FIELDS = [
  'genres',
  'cast',
  'tags',
  'originCountry',
];

const SEO_LIST_ARTICLE_STRING_FIELDS = [
  'id',
  'slug',
  'title',
  'excerpt',
  'coverImage',
  'coverImageAlt',
  'category',
  'subCategory',
  'authorId',
  'publishedAt',
  'publishedAtTimestamp',
  'readTime',
  'status',
  'scheduledAt',
  'updatedAt',
  'seoTitle',
  'metaDescription',
  'ogImage',
];

const SEO_LIST_ARTICLE_NUMBER_FIELDS = [
  'views',
  'likes',
  'commentsCount',
  'skorSotoy',
  'coverImageWidth',
  'coverImageHeight',
];

const SEO_LIST_ARTICLE_STRING_ARRAY_FIELDS = ['tags', 'relatedFilmIds'];

/**
 * Builds a list-card-safe film record. Only allowlisted public fields survive,
 * so an unfiltered REST response can never leak content, comments, emails or
 * admin internals into the HTML.
 */
function sanitizeSeoListFilm(data: Record<string, any>): Record<string, any> {
  const safe: Record<string, any> = {};

  for (const key of SEO_LIST_FILM_STRING_FIELDS) {
    const value = firstString(data[key]);
    if (value !== undefined) safe[key] = value;
  }
  for (const key of SEO_LIST_FILM_NUMBER_FIELDS) {
    const value = firstNumber(data[key]);
    if (value !== undefined) safe[key] = value;
  }
  for (const key of SEO_LIST_FILM_STRING_ARRAY_FIELDS) {
    const value = stringList(data[key]);
    if (value) safe[key] = value;
  }

  if (typeof data.featuredRecommendation === 'boolean') {
    safe.featuredRecommendation = data.featuredRecommendation;
  }

  const whereToWatch = sanitizeWhereToWatch(data.whereToWatch);
  if (whereToWatch) safe.whereToWatch = whereToWatch;

  return safe;
}

/**
 * Builds a list-card-safe article record with the same allowlist approach.
 */
function sanitizeSeoListArticle(data: Record<string, any>): Record<string, any> {
  const safe: Record<string, any> = {};

  for (const key of SEO_LIST_ARTICLE_STRING_FIELDS) {
    const value = firstString(data[key]);
    if (value !== undefined) safe[key] = value;
  }
  for (const key of SEO_LIST_ARTICLE_NUMBER_FIELDS) {
    const value = firstNumber(data[key]);
    if (value !== undefined) safe[key] = value;
  }
  for (const key of SEO_LIST_ARTICLE_STRING_ARRAY_FIELDS) {
    const value = stringList(data[key]);
    if (value) safe[key] = value;
  }

  const author = sanitizeAuthor(data.author);
  if (author) safe.author = author;

  return safe;
}

/**
 * Embeds the bot-only list payload used by AppContext to hydrate films and
 * articles before the Firestore SDK finishes. Injected once, just before
 * `</head>`. Existing payloads are replaced to avoid duplicates.
 */
export function injectSeoLists(
  html: string,
  lists: { films?: unknown; articles?: unknown }
): string {
  if (!html) return html;

  try {
    const films = Array.isArray(lists?.films)
      ? lists.films.filter(isPlainObject).map(sanitizeSeoListFilm)
      : [];
    const articles = Array.isArray(lists?.articles)
      ? lists.articles.filter(isPlainObject).map(sanitizeSeoListArticle)
      : [];

    if (films.length === 0 && articles.length === 0) return html;

    const json = serializePrefetchPayload({ films, articles });
    const script = `<script id="seo-lists" type="application/json">${json}</script>`;
    const withoutExisting = html.replace(
      /<script\s+id=["']seo-lists["'][^>]*>[\s\S]*?<\/script>/gi,
      ''
    );

    if (/<\/head>/i.test(withoutExisting)) {
      return withoutExisting.replace(/<\/head>/i, `${script}</head>`);
    }
    if (/<\/body>/i.test(withoutExisting)) {
      return withoutExisting.replace(/<\/body>/i, `${script}</body>`);
    }
    return `${withoutExisting}${script}`;
  } catch {
    return html;
  }
}

/**
 * Minimal static HTML fallback if fetching index.html from origin times out.
 */
export const FALLBACK_HTML_TEMPLATE = `<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/v3_favicon%20512%20sotoyfilm.PNG" sizes="32x32" />
    <link rel="icon" type="image/png" href="/sotoy-search-logo-v3-padded.png" sizes="512x512" />
    <link rel="apple-touch-icon" href="/sotoy%20film%20favicon%20512x512.PNG" />
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
