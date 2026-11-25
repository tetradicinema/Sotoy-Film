/**
 * Shared sitemap rule for public author profiles. Both the live API sitemap
 * and the build-time snapshot derive /user/<id> entries from the published
 * articles they already loaded, so the two outputs cannot drift apart.
 */

export interface AuthorSitemapArticle {
  authorId?: unknown;
  updatedAt?: unknown;
  publishedAtTimestamp?: unknown;
  publishedAt?: unknown;
}

export interface AuthorSitemapEntry {
  loc: string;
  lastmod: string;
}

function toTimeMs(value: unknown): number {
  if (!value) return 0;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value instanceof Date) {
    const parsed = value.getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const candidate = value as { toDate?: () => Date; seconds?: number };
  if (typeof candidate.toDate === 'function') {
    const parsed = candidate.toDate().getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof candidate.seconds === 'number' && Number.isFinite(candidate.seconds)) {
    return candidate.seconds * 1000;
  }
  return 0;
}

function pickArticleDate(article: AuthorSitemapArticle): unknown {
  return article.updatedAt || article.publishedAtTimestamp || article.publishedAt;
}

/**
 * Returns one entry per distinct authorId among the given articles. `authorId`
 * is taken from the article document only: no user documents are fetched.
 */
export function buildAuthorSitemapEntries(
  articles: AuthorSitemapArticle[],
  baseUrl: string,
  formatDateToYMD: (value: any, fallbackDate: string) => string
): AuthorSitemapEntry[] {
  const newestByAuthor = new Map<string, { ms: number; raw: unknown }>();

  for (const article of articles) {
    if (!article || typeof article !== 'object') continue;
    const authorId =
      typeof article.authorId === 'string' ? article.authorId.trim() : '';
    if (!authorId) continue;

    const raw = pickArticleDate(article);
    const ms = toTimeMs(raw);
    const existing = newestByAuthor.get(authorId);
    if (!existing || ms > existing.ms) {
      newestByAuthor.set(authorId, { ms, raw });
    }
  }

  return Array.from(newestByAuthor.entries()).map(([authorId, { raw }]) => ({
    loc: `${baseUrl}/user/${encodeURIComponent(authorId)}`,
    lastmod: formatDateToYMD(raw, ''),
  }));
}
