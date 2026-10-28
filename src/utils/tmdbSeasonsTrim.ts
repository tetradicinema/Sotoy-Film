/**
 * Pure TMDB season/episode trimming helpers.
 *
 * Shared by the server proxy (`api/tmdb.ts`) and the client season pages.
 * This module intentionally has no imports: the proxy imports it with an
 * explicit `.js` extension, and the client bundles the same file.
 */

export interface TmdbEpisodeRef {
  seasonNumber: number;
  episodeNumber: number;
  airDate: string;
}

export interface TmdbSeasonSummary {
  seasonNumber: number;
  name: string;
  overview: string;
  airDate: string;
  episodeCount: number;
  posterPath: string;
  voteAverage: number;
}

export interface TmdbSeasonsData {
  numberOfSeasons: number;
  numberOfEpisodes: number;
  status: string;
  seasons: TmdbSeasonSummary[];
  lastEpisodeToAir: TmdbEpisodeRef | null;
  nextEpisodeToAir: TmdbEpisodeRef | null;
}

export interface TmdbEpisode {
  episodeNumber: number;
  name: string;
  overview: string;
  airDate: string;
  runtime: number;
  stillPath: string;
  voteAverage: number;
  voteCount: number;
}

export interface TmdbSeasonData {
  seasonNumber: number;
  name: string;
  overview: string;
  airDate: string;
  posterPath: string;
  episodes: TmdbEpisode[];
}

const asString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const asNumber = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const asRecord = (value: unknown): Record<string, any> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : null;

const trimEpisodeRef = (raw: unknown): TmdbEpisodeRef | null => {
  const episode = asRecord(raw);
  if (!episode) return null;
  return {
    seasonNumber: asNumber(episode.season_number),
    episodeNumber: asNumber(episode.episode_number),
    airDate: asString(episode.air_date),
  };
};

/**
 * Normalizes a raw TMDB `tv/{id}` payload into the compact shape served by
 * `/api/tmdb?action=seasons`. Season 0 ("Specials") is kept and all seasons
 * are sorted by season number ascending.
 */
export function trimTmdbSeasons(raw: any): TmdbSeasonsData {
  const rawSeasons: any[] = Array.isArray(raw?.seasons) ? raw.seasons : [];

  const seasons: TmdbSeasonSummary[] = rawSeasons
    .filter((season: any) => season && typeof season === 'object')
    .map((season: any) => ({
      seasonNumber: asNumber(season.season_number),
      name: asString(season.name),
      overview: asString(season.overview),
      airDate: asString(season.air_date),
      episodeCount: asNumber(season.episode_count),
      posterPath: asString(season.poster_path),
      voteAverage: asNumber(season.vote_average),
    }))
    .sort((a, b) => a.seasonNumber - b.seasonNumber);

  return {
    numberOfSeasons: asNumber(raw?.number_of_seasons),
    numberOfEpisodes: asNumber(raw?.number_of_episodes),
    status: asString(raw?.status),
    seasons,
    lastEpisodeToAir: trimEpisodeRef(raw?.last_episode_to_air),
    nextEpisodeToAir: trimEpisodeRef(raw?.next_episode_to_air),
  };
}

/**
 * Normalizes a raw TMDB `tv/{id}/season/{n}` payload into the compact shape
 * served by `/api/tmdb?action=season`. Episodes are sorted ascending.
 */
export function trimTmdbSeason(raw: any): TmdbSeasonData {
  const rawEpisodes: any[] = Array.isArray(raw?.episodes) ? raw.episodes : [];

  const episodes: TmdbEpisode[] = rawEpisodes
    .filter((episode: any) => episode && typeof episode === 'object')
    .map((episode: any) => ({
      episodeNumber: asNumber(episode.episode_number),
      name: asString(episode.name),
      overview: asString(episode.overview),
      airDate: asString(episode.air_date),
      runtime: asNumber(episode.runtime),
      stillPath: asString(episode.still_path),
      voteAverage: asNumber(episode.vote_average),
      voteCount: asNumber(episode.vote_count),
    }))
    .sort((a, b) => a.episodeNumber - b.episodeNumber);

  return {
    seasonNumber: asNumber(raw?.season_number),
    name: asString(raw?.name),
    overview: asString(raw?.overview),
    airDate: asString(raw?.air_date),
    posterPath: asString(raw?.poster_path),
    episodes,
  };
}

const airedOnOrBefore = (airDate: string, nowMs: number): boolean => {
  if (!airDate) return false;
  const parsed = Date.parse(airDate);
  if (Number.isNaN(parsed)) return false;
  return parsed <= nowMs;
};

/**
 * Picks the season to feature on the detail page:
 * - the highest season number >= 1 whose air date is on/before `now`;
 * - if no regular season has aired yet, the lowest season number >= 1;
 * - if only season 0 exists, season 0;
 * - `null` for an empty list.
 */
export function pickLastSeason(
  seasons: TmdbSeasonSummary[] | null | undefined,
  now: Date = new Date()
): TmdbSeasonSummary | null {
  if (!Array.isArray(seasons) || seasons.length === 0) return null;

  const list = seasons.filter(
    season => season && Number.isFinite(season.seasonNumber)
  );
  if (list.length === 0) return null;

  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();

  const regular = list.filter(season => season.seasonNumber >= 1);
  if (regular.length === 0) {
    return list.find(season => season.seasonNumber === 0) || null;
  }

  const aired = regular.filter(season => airedOnOrBefore(season.airDate, nowMs));
  if (aired.length > 0) {
    return aired.reduce((best, season) =>
      season.seasonNumber > best.seasonNumber ? season : best
    );
  }

  return regular.reduce((best, season) =>
    season.seasonNumber < best.seasonNumber ? season : best
  );
}
