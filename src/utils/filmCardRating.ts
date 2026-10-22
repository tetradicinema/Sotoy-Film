import type { FilmItem } from '../types';
import { normalizeFilmScore } from './filmSections';

export type CardRating =
  | { kind: 'score'; text: string }
  | { kind: 'none' };

/**
 * Decides what the poster card's rating box should show.
 *
 * A film only gets a score when it has votes and a positive score after
 * normalization. The returned text is always a single-decimal 10-point value.
 */
export function getCardRating(film: FilmItem): CardRating {
  const votes = film.totalVotes ?? 0;
  if (!Number.isFinite(votes) || votes <= 0) return { kind: 'none' };

  const score = normalizeFilmScore(film);
  if (!Number.isFinite(score) || score <= 0) return { kind: 'none' };

  const clamped = Math.min(10, score);
  return { kind: 'score', text: clamped.toFixed(1) };
}
