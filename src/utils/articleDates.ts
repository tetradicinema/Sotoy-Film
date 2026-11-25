/**
 * Publish-date invariants for editorial articles.
 *
 * - `publishedAt` / `publishedAtTimestamp` are written once, on the first
 *   transition to live (draft -> published, or the first scheduled publish).
 *   Content edits must never move them.
 * - `updatedAt` is written on every write.
 * - `createdAt` is written once, on insert.
 *
 * "First publish" is decided from the existing document status, never from the
 * presence of a date field: drafts created by the old editor already carry a
 * stamp that must not be treated as a real publication.
 */

export type ArticleDateStatus = 'published' | 'draft' | 'scheduled' | 'trash';

export interface ArticleDateSnapshot {
  status?: ArticleDateStatus | string | null;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  publishedAtTimestamp?: string | null;
}

export interface ArticleDateInput {
  /** The document as it currently exists in Firestore, if any. */
  existing?: ArticleDateSnapshot | null;
  /** The status this write is moving the article to. */
  status: string;
  /** Schedule time for `status: 'scheduled'`. */
  scheduledAt?: string | null;
  /** Injectable clock for tests. */
  now?: Date;
  /** True only for an insert (addArticle), so `createdAt` is written once. */
  isNew?: boolean;
}

export interface ArticleDateDecision {
  /** True when this write is the first time the article becomes live. */
  firstPublish: boolean;
  /** Value to persist as `publishedAtTimestamp` when `firstPublish` is true. */
  publishedAtTimestamp?: string;
  /** Value to persist as `publishedAt` when `firstPublish` is true. */
  publishedAt?: string;
  /** Always present; every write bumps `updatedAt`. */
  updatedAt: string;
  /** Present only on insert. */
  createdAt?: string;
}

/** Same display format the editor and API have always stored. */
export function formatArticleDisplayDate(date: Date): string {
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function parseTime(value?: string | null): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * A document counts as live when it is already published, or scheduled with a
 * schedule time that has passed. Legacy documents without a status are treated
 * as published, matching `isArticlePublished`.
 */
export function isArticleLive(
  article: ArticleDateSnapshot | null | undefined,
  now: Date = new Date()
): boolean {
  if (!article) return false;
  if (article.status === undefined || article.status === null) return true;
  if (article.status === 'published') return true;
  if (article.status === 'scheduled') {
    const scheduled = parseTime(article.scheduledAt);
    return scheduled !== null && scheduled <= now.getTime();
  }
  return false;
}

function hasValidPublishDate(article: ArticleDateSnapshot | null | undefined): boolean {
  if (!article) return false;
  return (
    parseTime(article.publishedAtTimestamp) !== null ||
    parseTime(article.publishedAt) !== null
  );
}

/**
 * Resolves the date patch for a create/update.
 *
 * When the document is already live, no publish fields are returned so callers
 * keep the stored values. For a first publish, the timestamp is the schedule
 * time when scheduling, otherwise the current time.
 */
export function resolveArticleDates(input: ArticleDateInput): ArticleDateDecision {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const decision: ArticleDateDecision = {
    firstPublish: false,
    updatedAt: nowIso,
  };

  if (input.isNew) {
    decision.createdAt = nowIso;
  }

  if (isArticleLive(input.existing, now) && hasValidPublishDate(input.existing)) {
    return decision;
  }

  if (input.status === 'published') {
    decision.firstPublish = true;
    decision.publishedAtTimestamp = nowIso;
    decision.publishedAt = formatArticleDisplayDate(now);
    return decision;
  }

  if (input.status === 'scheduled') {
    const scheduled = parseTime(input.scheduledAt);
    if (scheduled !== null) {
      const scheduledDate = new Date(scheduled);
      decision.firstPublish = true;
      decision.publishedAtTimestamp = scheduledDate.toISOString();
      decision.publishedAt = formatArticleDisplayDate(scheduledDate);
    }
  }

  return decision;
}
