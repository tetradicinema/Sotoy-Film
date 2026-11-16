/**
 * Pure helpers for the persisted film aggregate (skorSotoy / totalVotes).
 *
 * The `ratings` collection is the source of truth: the aggregate on
 * `films/{filmId}` is always rebuilt from the rating documents for that film
 * (`computeFilmAggregate`), never adjusted incrementally, so an edit or delete
 * of a review self-heals the stored score on the next recompute.
 *
 * `criticsSkorSotoy` is intentionally NOT derived here: it stays the
 * TMDB/curator value on the film document and is never written by the
 * aggregate recompute.
 *
 * This module intentionally has no imports so it can be unit tested in Node
 * (same pattern as src/utils/mediaRatings.ts).
 */

/** Minimal rating-document shape needed to compute the aggregate. */
export interface RatingScoreInput {
  /** Stored Sotoy score. Legacy 5-scale docs are detected via `scoreScale`. */
  score?: unknown;
  /** `undefined` marks a legacy document stored on the 1-5 scale. */
  scoreScale?: unknown;
}

export interface FilmRatingAggregate {
  /** Mean of all valid rating scores, rounded to 1 decimal (0 when no votes). */
  skorSotoy: number;
  /** Number of valid rating documents behind the score. */
  totalVotes: number;
  /** Always 10: the aggregate and every write are on the 1-10 scale. */
  scoreScale: 10;
}

/**
 * Normalizes one rating score to the 1-10 scale.
 *
 * Mirrors AppContext `normalizeRating`: a legacy document (scoreScale
 * undefined) with a stored value in (0, 5.0] is doubled.
 *
 * Returns `null` for non-numbers, non-finite values, or values outside
 * 1.0-10.0 after normalization (they must never influence the aggregate).
 */
export const normalizeRatingScore = (
  rating: RatingScoreInput | null | undefined
): number | null => {
  if (!rating || typeof rating !== 'object') return null;

  const raw = (rating as { score?: unknown }).score;
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;

  const scale = (rating as { scoreScale?: unknown }).scoreScale;
  const isLegacy = scale === undefined;
  const normalized =
    isLegacy && raw > 0 && raw <= 5.0 ? Number((raw * 2).toFixed(1)) : raw;

  if (!Number.isFinite(normalized)) return null;
  if (normalized < 1 || normalized > 10) return null;

  return normalized;
};

/**
 * Rebuilds the film aggregate from all rating documents of one film.
 *
 * - Every valid score counts, regardless of the author's role (critic and
 *   normal reviews are treated the same) and duplicate docs from the same
 *   user all count.
 * - Invalid scores are ignored and do not count as votes.
 * - Zero valid ratings -> `{ skorSotoy: 0, totalVotes: 0, scoreScale: 10 }`
 *   (the "last review deleted" state; the score is hidden by the UI).
 */
export const computeFilmAggregate = (
  ratings: RatingScoreInput[] | null | undefined
): FilmRatingAggregate => {
  if (!Array.isArray(ratings)) {
    return { skorSotoy: 0, totalVotes: 0, scoreScale: 10 };
  }

  let sum = 0;
  let count = 0;

  for (const rating of ratings) {
    const score = normalizeRatingScore(rating);
    if (score === null) continue;
    sum += score;
    count += 1;
  }

  if (count === 0) {
    return { skorSotoy: 0, totalVotes: 0, scoreScale: 10 };
  }

  const mean = sum / count;
  const skorSotoy = Math.min(10, Math.max(0, Number(mean.toFixed(1))));

  return { skorSotoy, totalVotes: count, scoreScale: 10 };
};
