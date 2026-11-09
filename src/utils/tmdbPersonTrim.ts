/**
 * Pure TMDB person trimming helpers.
 *
 * Shared by the server proxy (`api/tmdb.ts`) and the client helpers.
 * This module intentionally has no imports: the proxy imports it with an
 * explicit `.js` extension, and the client bundles the same file.
 */

export interface TmdbPersonKnownFor {
  id: number;
  media_type: string;
  title: string;
}

export interface TmdbPersonSearchItem {
  id: number;
  name: string;
  known_for_department: string;
  profile_path: string | null;
  popularity: number;
  known_for: TmdbPersonKnownFor[];
}

export interface TmdbPersonCredit {
  id: number;
  media_type: string;
  title: string;
  character: string;
  job: string;
  department: string;
  release_date: string;
  poster_path: string | null;
  vote_average: number;
  vote_count: number;
  episode_count: number;
  popularity: number;
}

export interface TmdbPersonProfileImage {
  file_path: string;
  width: number;
  height: number;
}

export interface TmdbPersonExternalIds {
  imdb_id: string;
  instagram_id: string;
  twitter_id: string;
  facebook_id: string;
  tiktok_id: string;
  youtube_id: string;
}

export interface TmdbPersonDetails {
  id: number;
  name: string;
  biography: string;
  birthday: string;
  deathday: string;
  place_of_birth: string;
  gender: number;
  known_for_department: string;
  also_known_as: string[];
  homepage: string;
  popularity: number;
  profile_path: string | null;
  imdb_id: string;
  external_ids: TmdbPersonExternalIds;
  images: { profiles: TmdbPersonProfileImage[] };
  credits: { cast: TmdbPersonCredit[]; crew: TmdbPersonCredit[] };
}

const MAX_KNOWN_FOR = 3;
const MAX_ALSO_KNOWN_AS = 8;
const MAX_PROFILES = 10;

const asString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const asNullableString = (value: unknown): string | null => {
  const parsed = asString(value);
  return parsed === '' ? null : parsed;
};

const asNumber = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const trimKnownFor = (raw: any): TmdbPersonKnownFor[] => {
  const items: any[] = Array.isArray(raw) ? raw : [];
  return items
    .filter((item: any) => item && item.adult !== true)
    .map((item: any) => ({
      id: asNumber(item.id),
      media_type: asString(item.media_type) || 'movie',
      title: asString(item.title) || asString(item.name),
    }))
    .filter((item: TmdbPersonKnownFor) => item.title !== '')
    .slice(0, MAX_KNOWN_FOR);
};

/**
 * Normalizes a raw TMDB `search/person` (or `person/popular`) payload into the
 * compact list served by `/api/tmdb?action=person_search` and
 * `action=person_list`. Adult entries are dropped.
 */
export function trimTmdbPersonSearch(raw: any): TmdbPersonSearchItem[] {
  const results: any[] = Array.isArray(raw?.results) ? raw.results : [];

  return results
    .filter((item: any) => item && item.adult !== true)
    .map((item: any) => ({
      id: asNumber(item.id),
      name: asString(item.name),
      known_for_department: asString(item.known_for_department),
      profile_path: asNullableString(item.profile_path),
      popularity: asNumber(item.popularity),
      known_for: trimKnownFor(item.known_for),
    }));
}

const creditDedupeKey = (item: TmdbPersonCredit, kind: 'cast' | 'crew'): string =>
  kind === 'cast'
    ? `${item.media_type}:${item.id}`
    : `${item.media_type}:${item.id}:${item.job}`;

const trimCredits = (raw: any, kind: 'cast' | 'crew'): TmdbPersonCredit[] => {
  const items: any[] = Array.isArray(raw) ? raw : [];
  const seen = new Set<string>();
  const credits: TmdbPersonCredit[] = [];

  for (const item of items) {
    if (!item || item.adult === true) continue;

    const title = asString(item.title) || asString(item.name);
    if (title === '') continue;

    const credit: TmdbPersonCredit = {
      id: asNumber(item.id),
      media_type: asString(item.media_type) || 'movie',
      title,
      character: asString(item.character),
      job: asString(item.job),
      department: asString(item.department),
      release_date: asString(item.release_date) || asString(item.first_air_date),
      poster_path: asNullableString(item.poster_path),
      vote_average: asNumber(item.vote_average),
      vote_count: asNumber(item.vote_count),
      episode_count: asNumber(item.episode_count),
      popularity: asNumber(item.popularity),
    };

    const key = creditDedupeKey(credit, kind);
    if (seen.has(key)) continue;
    seen.add(key);
    credits.push(credit);
  }

  return credits;
};

const trimProfiles = (raw: any): TmdbPersonProfileImage[] => {
  const items: any[] = Array.isArray(raw) ? raw : [];
  return items
    .filter((item: any) => item && asString(item.file_path) !== '')
    .map((item: any) => ({
      file_path: asString(item.file_path),
      width: asNumber(item.width),
      height: asNumber(item.height),
    }))
    .slice(0, MAX_PROFILES);
};

const trimExternalIds = (raw: any): TmdbPersonExternalIds => {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    imdb_id: asString(source.imdb_id),
    instagram_id: asString(source.instagram_id),
    twitter_id: asString(source.twitter_id),
    facebook_id: asString(source.facebook_id),
    tiktok_id: asString(source.tiktok_id),
    youtube_id: asString(source.youtube_id),
  };
};

/**
 * Normalizes a raw TMDB `person/{id}?append_to_response=combined_credits,
 * external_ids,images` payload into the compact shape served by
 * `/api/tmdb?action=person_details`. The raw TMDB payload is never returned.
 * Adult credits and credits without a title are dropped, and duplicate credits
 * are collapsed.
 */
export function trimTmdbPersonDetails(raw: any): TmdbPersonDetails {
  const source = raw && typeof raw === 'object' ? raw : {};

  const rawAlsoKnownAs: any[] = Array.isArray(source.also_known_as)
    ? source.also_known_as
    : [];
  const alsoKnownAs = rawAlsoKnownAs
    .map(asString)
    .filter((name: string) => name !== '')
    .slice(0, MAX_ALSO_KNOWN_AS);

  const combinedCredits =
    source.combined_credits && typeof source.combined_credits === 'object'
      ? source.combined_credits
      : {};
  const rawProfiles = Array.isArray(source.images?.profiles)
    ? source.images.profiles
    : [];

  return {
    id: asNumber(source.id),
    name: asString(source.name),
    biography: asString(source.biography),
    birthday: asString(source.birthday),
    deathday: asString(source.deathday),
    place_of_birth: asString(source.place_of_birth),
    gender: asNumber(source.gender),
    known_for_department: asString(source.known_for_department),
    also_known_as: alsoKnownAs,
    homepage: asString(source.homepage),
    popularity: asNumber(source.popularity),
    profile_path: asNullableString(source.profile_path),
    imdb_id: asString(source.imdb_id),
    external_ids: trimExternalIds(source.external_ids),
    images: { profiles: trimProfiles(rawProfiles) },
    credits: {
      cast: trimCredits(combinedCredits.cast, 'cast'),
      crew: trimCredits(combinedCredits.crew, 'crew'),
    },
  };
}
