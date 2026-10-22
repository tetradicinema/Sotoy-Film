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
