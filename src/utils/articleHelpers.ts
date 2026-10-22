export function isArticleUnpublished(a: { status?: string; scheduledAt?: string }): boolean {
  if (!a) return false;
  const status = a.status;
  if (status === 'draft' || status === 'trash') return true;
  if (status === 'scheduled') {
    if (!a.scheduledAt) return true;
    try {
      const scheduledTime = new Date(a.scheduledAt).getTime();
      if (isNaN(scheduledTime) || scheduledTime > Date.now()) return true;
    } catch {
      return true;
    }
  }
  return false;
}

export interface ProfileArticleLike {
  status?: string;
  scheduledAt?: string;
}

export interface SplitProfileArticlesOptions {
  /** Owner of the profile or an admin: can see drafts and scheduled posts. */
  isOwnerOrAdmin: boolean;
  /** Injectable clock for deterministic tests. */
  now?: Date;
}

export interface SplitProfileArticlesResult<T> {
  published: T[];
  drafts: T[];
  counts: {
    published: number;
    drafts: number;
    total: number;
  };
}

export type EditorialSubTab = 'published' | 'drafts';

/**
 * Picks which Editorial sub-tab to open by default.
 *
 * "Diterbitkan" is the default unless the author has no published articles
 * and does have drafts, in which case "Draf" is more useful.
 */
export function getDefaultEditorialSubTab(counts: { published: number; drafts: number }): EditorialSubTab {
  if ((counts.published || 0) <= 0 && (counts.drafts || 0) > 0) return 'drafts';
  return 'published';
}

/** Maximum `content` length accepted by isValidArticle in firestore.rules. */
export const ARTICLE_CONTENT_MAX_LENGTH = 100000;

/** Maximum `contentJson` length accepted by isValidArticle in firestore.rules. */
export const ARTICLE_CONTENT_JSON_MAX_LENGTH = 600000;

export interface ArticleImageFields {
  coverImage?: unknown;
  ogImage?: unknown;
}

export interface DataUrlImageFields {
  coverImage: boolean;
  ogImage: boolean;
}

export interface ArticleSizeIssues {
  contentTooLarge: boolean;
  contentJsonTooLarge: boolean;
}

/**
 * True when an image URL is safe to persist and share: an absolute http(s)
 * URL, a protocol-relative URL, or a root-relative path. Data URLs, blob URLs,
 * empty strings, and non-strings are rejected.
 */
export function isShareableImageUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (trimmed.startsWith('/')) return true;
  return false;
}

/**
 * Reports which article image fields still hold an inline `data:` URL. Such
 * values cannot be used in link previews, so they must never be persisted.
 */
export function findDataUrlImages(article: ArticleImageFields | null | undefined): DataUrlImageFields {
  const isDataUrl = (value: unknown): boolean =>
    typeof value === 'string' && /^data:/i.test(value.trim());

  return {
    coverImage: isDataUrl(article?.coverImage),
    ogImage: isDataUrl(article?.ogImage),
  };
}

/**
 * True when markdown, HTML or JSON content embeds an inline base64 image.
 * Inline images make documents too large and break share previews.
 */
export function containsInlineDataImages(content: unknown): boolean {
  return typeof content === 'string' && /data:image\//i.test(content);
}

/**
 * Checks the article body against the same size limits enforced by
 * firestore.rules isValidArticle.
 */
export function getArticleSizeIssues({
  content,
  contentJson,
}: {
  content?: unknown;
  contentJson?: unknown;
}): ArticleSizeIssues {
  const contentLength = typeof content === 'string' ? content.length : 0;
  const contentJsonLength = typeof contentJson === 'string' ? contentJson.length : 0;

  return {
    contentTooLarge: contentLength > ARTICLE_CONTENT_MAX_LENGTH,
    contentJsonTooLarge: contentJsonLength > ARTICLE_CONTENT_JSON_MAX_LENGTH,
  };
}

/** Maximum cover/inline image alt text length recommended for SEO. */
export const ALT_TEXT_MAX_LENGTH = 125;

export interface AltTextValidation {
  valid: boolean;
  warning: string | null;
}

/**
 * Detects alt text that is really a camera/file name rather than a
 * description of the image (IMG_1234, DSC0123, screenshot, only digits).
 */
export function looksLikeFileName(alt: unknown): boolean {
  if (typeof alt !== 'string') return false;
  const value = alt.trim().toLowerCase();
  if (!value) return false;

  if (/^\d+$/.test(value)) return true;
  if (/\.(jpe?g|png|gif|webp|svg|bmp|heic|avif)$/i.test(value)) return true;
  if (/^(img|dsc|dscf|dji|gopr|mvimg|screenshot|screencap)$/i.test(value)) return true;
  if (/^(img|dsc|dscf|dji|gopr|mvimg)[\s_-]*\d/i.test(value)) return true;
  if (/^(screenshot|screen[\s_-]?shot|screencap|screen[\s_-]?capture)/i.test(value)) return true;
  if (/^(photo|foto|image|gambar)[\s_-]*\d{2,}/i.test(value)) return true;
  if (/^\d{8}[\s_-]\d{6}/.test(value)) return true;

  return false;
}

/**
 * Soft validation for image alt text. Empty, file-like and overlong values
 * are reported with a human-readable warning.
 */
export function validateAltText(alt: unknown): AltTextValidation {
  const value = typeof alt === 'string' ? alt.trim() : '';

  if (!value) {
    return { valid: false, warning: 'Teks alternatif belum diisi.' };
  }
  if (value.length > ALT_TEXT_MAX_LENGTH) {
    return { valid: false, warning: `Teks alternatif maksimal ${ALT_TEXT_MAX_LENGTH} karakter.` };
  }
  if (looksLikeFileName(value)) {
    return { valid: false, warning: 'Teks alternatif terlihat seperti nama berkas. Jelaskan isi gambar.' };
  }

  return { valid: true, warning: null };
}

export interface ArticleSaveGuardInput {
  coverImage?: unknown;
  ogImage?: unknown;
  content?: unknown;
  contentJson?: unknown;
}

/**
 * Returns the blocking message for content that must not be written, or null
 * when the article is safe to persist. The message names the offending image
 * field so the editor can point the writer at the right input.
 */
export function getArticleSaveBlockMessage(form: ArticleSaveGuardInput): string | null {
  const dataUrlImages = findDataUrlImages(form);
  if (dataUrlImages.coverImage) {
    return 'Gambar cover belum terunggah. Unggah ulang gambar cover.';
  }
  if (dataUrlImages.ogImage) {
    return 'Gambar OG (SEO) belum terunggah. Kosongkan atau samakan dengan cover.';
  }
  if (containsInlineDataImages(form.content) || containsInlineDataImages(form.contentJson)) {
    return 'Ada gambar yang belum terunggah ke penyimpanan. Hapus lalu unggah ulang gambarnya.';
  }

  const contentLength = typeof form.content === 'string' ? form.content.length : 0;
  const contentJsonLength = typeof form.contentJson === 'string' ? form.contentJson.length : 0;
  const issues = getArticleSizeIssues({
    content: form.content,
    contentJson: form.contentJson,
  });

  if (issues.contentTooLarge) {
    return `Artikel terlalu panjang (${contentLength} dari ${ARTICLE_CONTENT_MAX_LENGTH} karakter).`;
  }
  if (issues.contentJsonTooLarge) {
    return `Artikel terlalu panjang (${contentJsonLength} dari ${ARTICLE_CONTENT_JSON_MAX_LENGTH} karakter).`;
  }

  return null;
}

const isLiveArticle = (a: ProfileArticleLike, nowMs: number): boolean => {
  if (a.status === 'draft' || a.status === 'trash') return false;
  if (a.status === 'scheduled') {
    if (!a.scheduledAt) return false;
    const scheduledTime = new Date(a.scheduledAt).getTime();
    return !isNaN(scheduledTime) && scheduledTime <= nowMs;
  }
  return true;
};

const isDraftArticle = (a: ProfileArticleLike, nowMs: number): boolean => {
  // Trash is never shown anywhere on the profile.
  if (a.status === 'trash') return false;
  if (a.status === 'draft') return true;
  if (a.status === 'scheduled') {
    if (!a.scheduledAt) return true;
    const scheduledTime = new Date(a.scheduledAt).getTime();
    return isNaN(scheduledTime) || scheduledTime > nowMs;
  }
  return false;
};

/**
 * Splits profile articles into the Editorial tab groups.
 *
 * Visitors only see live/published articles. The profile owner and admins see
 * two groups ("Diterbitkan" then "Draf"); scheduled articles that are not live
 * yet belong to drafts, and trash is always hidden.
 */
export function splitProfileArticles<T extends ProfileArticleLike>(
  articles: T[],
  options: SplitProfileArticlesOptions
): SplitProfileArticlesResult<T> {
  if (!Array.isArray(articles)) {
    return { published: [], drafts: [], counts: { published: 0, drafts: 0, total: 0 } };
  }

  const nowMs = options.now ? options.now.getTime() : Date.now();

  if (!options.isOwnerOrAdmin) {
    const published = articles.filter(a => isLiveArticle(a, nowMs));
    return {
      published,
      drafts: [],
      counts: { published: published.length, drafts: 0, total: published.length },
    };
  }

  const published: T[] = [];
  const drafts: T[] = [];

  for (const article of articles) {
    if (isDraftArticle(article, nowMs)) {
      drafts.push(article);
    } else if (isLiveArticle(article, nowMs)) {
      published.push(article);
    }
  }

  return {
    published,
    drafts,
    counts: {
      published: published.length,
      drafts: drafts.length,
      total: published.length + drafts.length,
    },
  };
}
