/**
 * Pure helpers for keeping article slugs unique in the CMS.
 *
 * Slugs are compared case-insensitively because middleware and
 * ArticleDetailPage look articles up by slug, and two documents with the same
 * slug (for example a draft and the published article) can hide the published
 * one from crawlers.
 */

export interface SlugArticleLike {
  id: string;
  slug?: string;
  title?: string;
  status?: string;
}

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

/**
 * Returns the first non-trash article whose slug matches `slug`
 * case-insensitively, ignoring the article with id `excludeId`.
 */
export function findSlugConflict(
  slug: string,
  articles: ReadonlyArray<SlugArticleLike>,
  excludeId?: string | null
): SlugArticleLike | undefined {
  const normalized = normalizeSlug(slug);
  if (!normalized) return undefined;

  const excluded = excludeId ?? null;

  return articles.find(
    article =>
      article.id !== excluded &&
      article.status !== 'trash' &&
      typeof article.slug === 'string' &&
      normalizeSlug(article.slug) === normalized
  );
}

/**
 * Returns `baseSlug` when it is free, otherwise `baseSlug-2`, `baseSlug-3`, ...
 * until an unused slug is found.
 */
export function makeUniqueSlug(
  baseSlug: string,
  articles: ReadonlyArray<SlugArticleLike>,
  excludeId?: string | null
): string {
  const base = baseSlug.trim();
  if (!base) return baseSlug;

  if (!findSlugConflict(base, articles, excludeId)) return base;

  let suffix = 2;
  while (findSlugConflict(`${base}-${suffix}`, articles, excludeId)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}
