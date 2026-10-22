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
