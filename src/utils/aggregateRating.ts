/**
 * Shared, edge-safe guard for schema.org `aggregateRating`.
 *
 * Reuses `normalizeRatingScore()` from filmRatings.ts so the JSON-LD score is
 * the same 1-10 value the app displays (legacy 5-scale docs are doubled there).
 * A rating is only marked up when it has enough real vote evidence; no build
 * time, current date, or TMDB vote_count is ever used as a fallback.
 */

import { normalizeRatingScore } from './filmRatings.js';

/** Minimum number of real votes before a score is an "aggregate" at all. */
export const MIN_AGGREGATE_VOTES = 3;

export interface AggregateRatingInput {
  skorSotoy: unknown;
  scoreScale?: unknown;
  totalVotes: unknown;
  /** Real count of visible review documents with text; omit when unknown. */
  reviewCount?: unknown;
}

export interface AggregateRatingValue {
  '@type': 'AggregateRating';
  ratingValue: number;
  bestRating: number;
  worstRating: number;
  ratingCount: number;
  reviewCount?: number;
}

/** Returns a valid AggregateRating object, or null when evidence is insufficient. */
export function resolveAggregateRating(
  input: AggregateRatingInput
): AggregateRatingValue | null {
  const ratingValue = normalizeRatingScore({
    score: Number(input.skorSotoy),
    scoreScale: input.scoreScale,
  });
  if (ratingValue === null) return null;

  const ratingCount = Number(input.totalVotes);
  if (
    !Number.isFinite(ratingCount) ||
    !Number.isInteger(ratingCount) ||
    ratingCount < MIN_AGGREGATE_VOTES
  ) {
    return null;
  }

  const result: AggregateRatingValue = {
    '@type': 'AggregateRating',
    ratingValue: Number(ratingValue.toFixed(1)),
    bestRating: 10,
    worstRating: 1,
    ratingCount,
  };

  // Only add reviewCount for an actual count of visible review docs with text.
  if (input.reviewCount !== undefined) {
    const reviewCount = Number(input.reviewCount);
    if (
      Number.isFinite(reviewCount) &&
      Number.isInteger(reviewCount) &&
      reviewCount > 0
    ) {
      result.reviewCount = reviewCount;
    }
  }

  return result;
}
