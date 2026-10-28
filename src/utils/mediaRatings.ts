/**
 * Pure helpers for Sotoy user scores on seasons and episodes.
 *
 * One document is stored per user per target, with a deterministic id, so the
 * aggregate can always be rebuilt from raw docs: no aggregate is persisted.
 * This module intentionally has no imports so it can be unit tested in Node.
 */

export interface MediaRatingDoc {
  id: string;
  filmId: string;
  seasonNumber: number;
  /** `null` for a season score, an episode number for an episode score. */
  episodeNumber: number | null;
  userId: string;
  /** Sotoy score on a 1.0 – 10.0 scale. */
  score: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MediaRatingAggregate {
  /** Average score rounded to one decimal. */
  average: number;
  /** Number of votes behind the average. */
  count: number;
}

export type MediaRatingAggregateMap = Record<string, MediaRatingAggregate>;

export const seasonRatingKey = (seasonNumber: number): string =>
  `s${seasonNumber}`;

export const episodeRatingKey = (
  seasonNumber: number,
  episodeNumber: number
): string => `s${seasonNumber}e${episodeNumber}`;

/** Target key used by `aggregateMediaRatings` for one rating document. */
export const mediaRatingTargetKey = (
  doc: Pick<MediaRatingDoc, 'seasonNumber' | 'episodeNumber'>
): string =>
  doc.episodeNumber === null || doc.episodeNumber === undefined
    ? seasonRatingKey(doc.seasonNumber)
    : episodeRatingKey(doc.seasonNumber, doc.episodeNumber);

/**
 * Deterministic Firestore id: `<filmId>__s<season>__<uid>` for a season and
 * `<filmId>__s<season>__e<episode>__<uid>` for an episode.
 */
export const buildMediaRatingId = (
  filmId: string,
  seasonNumber: number,
  episodeNumber: number | null,
  userId: string
): string => {
  const base = `${filmId}__s${seasonNumber}`;
  const target = episodeNumber === null || episodeNumber === undefined
    ? base
    : `${base}__e${episodeNumber}`;
  return `${target}__${userId}`;
};

/**
 * Groups rating documents by target (season or episode) and returns the
 * average rounded to one decimal plus the vote count. Invalid rows are ignored.
 */
export const aggregateMediaRatings = (
  docs: MediaRatingDoc[] | null | undefined
): MediaRatingAggregateMap => {
  const buckets = new Map<string, { sum: number; count: number }>();

  if (!Array.isArray(docs)) return {};

  for (const doc of docs) {
    if (!doc || typeof doc !== 'object') continue;

    const score = Number(doc.score);
    if (!Number.isFinite(score) || score < 1 || score > 10) continue;

    const season = Number(doc.seasonNumber);
    if (!Number.isInteger(season) || season < 0) continue;

    let key: string;
    if (doc.episodeNumber === null || doc.episodeNumber === undefined) {
      key = seasonRatingKey(season);
    } else {
      const episode = Number(doc.episodeNumber);
      if (!Number.isInteger(episode) || episode < 1) continue;
      key = episodeRatingKey(season, episode);
    }

    const bucket = buckets.get(key) || { sum: 0, count: 0 };
    bucket.sum += score;
    bucket.count += 1;
    buckets.set(key, bucket);
  }

  const result: MediaRatingAggregateMap = {};
  for (const [key, bucket] of buckets) {
    result[key] = {
      average: Number((bucket.sum / bucket.count).toFixed(1)),
      count: bucket.count,
    };
  }
  return result;
};

/** `8.1 Skor Sotoy · 12 vote` or `Belum ada skor` when there are no votes. */
export const formatSkorSotoy = (
  aggregate?: MediaRatingAggregate | null
): string =>
  aggregate && aggregate.count > 0
    ? `${aggregate.average.toFixed(1)} Skor Sotoy · ${aggregate.count} vote`
    : 'Belum ada skor';
