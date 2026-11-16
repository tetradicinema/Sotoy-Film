/**
 * Pure helpers for the persisted film aggregate
 * (skorSotoy / totalVotes / criticsSkorSotoy / bases / scoreScale).
 *
 * The `ratings` collection is the source of truth: the aggregate on
 * `films/{filmId}` is always rebuilt from the rating documents for that film
 * (`computeFilmAggregate`), never adjusted incrementally, so an edit or delete
 * of a review self-heals the stored score on the next recompute.
 *
 * The score is split by role:
 * - `skorSotoy`   = mean of COMMUNITY ratings (everything that is not
 *   `si_paling_sotoy`); `totalVotes` = their count. With no community ratings
 *   it falls back to the stored base value `baseSkorSotoy` (default 0) and
 *   `totalVotes` 0.
 * - `criticsSkorSotoy` = mean of CRITIC ratings (`userRole ===
 *   'si_paling_sotoy'`). With no critic ratings it falls back to the stored
 *   base value `baseCriticsSkorSotoy` (default 0), so a curator/TMDB starting
 *   value is never replaced by a fabricated 0.
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
  /** Author role snapshot; only `si_paling_sotoy` counts as a critic. */
  userRole?: unknown;
}

/** The one role whose ratings feed `criticsSkorSotoy`. */
export const CRITIC_ROLE = 'si_paling_sotoy';

export interface FilmAggregateBases {
  baseSkorSotoy?: number;
  baseCriticsSkorSotoy?: number;
}

export interface FilmRatingAggregate {
  /** Mean of valid community ratings (0..10, 1 decimal), or the base fallback. */
  skorSotoy: number;
  /** Number of valid community rating documents behind the score. */
  totalVotes: number;
  /** Mean of valid critic ratings, or the base fallback. */
  criticsSkorSotoy: number;
  /** Number of valid critic rating documents. */
  criticVotes: number;
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

/** Coerces a stored base value to a clean number in 0..10, else 0. */
export const normalizeBaseScore = (value: unknown): number => {
  const num = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return Math.min(10, Math.max(0, num));
};

/**
 * Splits rating documents into community and critic scores.
 *
 * - `userRole === 'si_paling_sotoy'` counts as a critic review; everything
 *   else (including `warga_sotoy`, `penulis_sotoy`, `admin`, and legacy docs
 *   with a missing role) counts as community.
 * - Every valid score counts; duplicate docs from the same user all count.
 * - Invalid scores are ignored and do not count as votes.
 */
export const computeFilmAggregate = (
  ratings: RatingScoreInput[] | null | undefined,
  bases?: FilmAggregateBases
): FilmRatingAggregate => {
  const baseSkor = normalizeBaseScore(bases?.baseSkorSotoy);
  const baseCritics = normalizeBaseScore(bases?.baseCriticsSkorSotoy);

  const empty: FilmRatingAggregate = {
    skorSotoy: baseSkor,
    totalVotes: 0,
    criticsSkorSotoy: baseCritics,
    criticVotes: 0,
    scoreScale: 10,
  };

  if (!Array.isArray(ratings)) return empty;

  let communitySum = 0;
  let communityCount = 0;
  let criticSum = 0;
  let criticCount = 0;

  for (const rating of ratings) {
    const score = normalizeRatingScore(rating);
    if (score === null) continue;
    if (
      rating &&
      typeof rating === 'object' &&
      (rating as { userRole?: unknown }).userRole === CRITIC_ROLE
    ) {
      criticSum += score;
      criticCount += 1;
    } else {
      communitySum += score;
      communityCount += 1;
    }
  }

  const round = (mean: number) =>
    Math.min(10, Math.max(0, Number(mean.toFixed(1))));

  return {
    // No community ratings -> the preserved starting value, 0 votes.
    skorSotoy: communityCount === 0 ? baseSkor : round(communitySum / communityCount),
    totalVotes: communityCount,
    // No critic ratings -> the preserved starting value, 0 votes.
    criticsSkorSotoy: criticCount === 0 ? baseCritics : round(criticSum / criticCount),
    criticVotes: criticCount,
    scoreScale: 10,
  };
};
