import type { FilmItem } from '../types';
import { normalizeFilmScore } from './filmSections';

export type CardRating =
  | { kind: 'score'; text: string }
  | { kind: 'none' };

/**
 * Decides what the poster card's rating box should show.
 *
 * A film gets a score whenever it has a positive, finite score after
 * normalization — vote count is not required (imported films may have
 * zero votes but a real TMDB-derived score, which is shown as-is).
 * A zero, missing, negative or non-finite score shows nothing, and the
 * score itself is never fabricated. The returned text is always a
 * single-decimal 10-point value.
 */
export function getCardRating(film: FilmItem): CardRating {
  const score = normalizeFilmScore(film);
  if (!Number.isFinite(score) || score <= 0) return { kind: 'none' };

  const clamped = Math.min(10, score);
  return { kind: 'score', text: clamped.toFixed(1) };
}
