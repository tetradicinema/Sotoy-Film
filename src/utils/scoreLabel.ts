/**
 * Sotoy score labels.
 *
 * Normalizes a raw score to a 10-point scale (mirroring normalizeFilmScore in
 * utils/filmSections.ts) and maps it to a short editorial label plus a colour
 * tone for the UI.
 */

export type ScoreLabelTone = 'pink' | 'amber' | 'neutral' | 'slate';

export interface ScoreLabel {
  label: string;
  tone: ScoreLabelTone;
}

interface ScoreTier {
  min: number;
  label: string;
  tone: ScoreLabelTone;
}

const SCORE_TIERS: ScoreTier[] = [
  { min: 9.0, label: 'Masterpiece', tone: 'pink' },
  { min: 8.0, label: 'Awesome', tone: 'amber' },
  { min: 7.0, label: 'Great', tone: 'amber' },
  { min: 6.0, label: 'Good', tone: 'neutral' },
  { min: 5.0, label: 'Mixed', tone: 'neutral' },
  { min: 4.0, label: 'Weak', tone: 'slate' },
  { min: 0, label: 'Poor', tone: 'slate' },
];

/**
 * Returns the tier label for a score on a 10-point scale, or null when the
 * score is missing/zero or the film has no votes.
 *
 * @param score Raw score value (on `scale`).
 * @param scale Scale the raw score is expressed in (defaults to 10).
 * @param totalVotes Number of votes behind the score; 0 means unrated.
 */
export function getScoreLabel(
  score: number | null | undefined,
  scale: number = 10,
  totalVotes: number | null | undefined = 1,
): ScoreLabel | null {
  if (typeof score !== 'number' || !Number.isFinite(score) || score <= 0) {
    return null;
  }

  const votes =
    typeof totalVotes === 'number' && Number.isFinite(totalVotes)
      ? totalVotes
      : totalVotes === undefined
        ? 1
        : 0;
  if (votes <= 0) return null;

  const safeScale =
    typeof scale === 'number' && Number.isFinite(scale) && scale > 0 ? scale : 10;
  const normalized =
    safeScale === 10
      ? score
      : Math.round(((score / safeScale) * 10) * 100) / 100;

  const tier = SCORE_TIERS.find(t => normalized >= t.min);
  return tier ? { label: tier.label, tone: tier.tone } : null;
}
