/**
 * Pure TMDB media trimming helpers.
 *
 * Shared by the server proxy (`api/tmdb.ts`) and the client media section.
 * This module intentionally has no imports: the proxy imports it with an
 * explicit `.js` extension, and the client bundles the same file.
 */

export interface TmdbMediaVideo {
  key: string;
  name: string;
  type: string;
  official: boolean;
  publishedAt: string;
  language: string;
}

export interface TmdbMediaImage {
  filePath: string;
  width: number;
  height: number;
  voteAverage: number;
  voteCount: number;
  language: string;
}

export interface TmdbMediaData {
  videos: TmdbMediaVideo[];
  backdrops: TmdbMediaImage[];
  posters: TmdbMediaImage[];
}

export type TmdbMostPopularItem =
  | { kind: 'video'; video: TmdbMediaVideo }
  | { kind: 'backdrop'; image: TmdbMediaImage }
  | { kind: 'poster'; image: TmdbMediaImage };

const VIDEO_TYPE_ORDER = [
  'Trailer',
  'Teaser',
  'Clip',
  'Featurette',
  'Behind the Scenes',
  'Bloopers',
];

const MAX_VIDEOS = 30;
const MAX_IMAGES = 30;

const videoTypeRank = (type: string): number => {
  const index = VIDEO_TYPE_ORDER.indexOf(type);
  return index === -1 ? VIDEO_TYPE_ORDER.length : index;
};

const timestamp = (value: string): number => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const asString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const asNumber = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const compareVideos = (a: TmdbMediaVideo, b: TmdbMediaVideo): number => {
  const typeDiff = videoTypeRank(a.type) - videoTypeRank(b.type);
  if (typeDiff !== 0) return typeDiff;

  const officialDiff = Number(b.official) - Number(a.official);
  if (officialDiff !== 0) return officialDiff;

  return timestamp(b.publishedAt) - timestamp(a.publishedAt);
};

const compareImages = (a: TmdbMediaImage, b: TmdbMediaImage): number => {
  const voteDiff = b.voteAverage - a.voteAverage;
  if (voteDiff !== 0) return voteDiff;
  return b.voteCount - a.voteCount;
};

/**
 * Normalizes a raw TMDB `append_to_response=videos,images` payload into the
 * compact shape served by `/api/tmdb?action=media`.
 */
export function trimTmdbMedia(raw: any): TmdbMediaData {
  const rawVideos: any[] = Array.isArray(raw?.videos?.results)
    ? raw.videos.results
    : [];
  const rawBackdrops: any[] = Array.isArray(raw?.images?.backdrops)
    ? raw.images.backdrops
    : [];
  const rawPosters: any[] = Array.isArray(raw?.images?.posters)
    ? raw.images.posters
    : [];

  const videos: TmdbMediaVideo[] = rawVideos
    .filter(
      (video: any) =>
        video &&
        video.site === 'YouTube' &&
        typeof video.key === 'string' &&
        video.key.trim() !== ''
    )
    .map((video: any) => ({
      key: video.key.trim(),
      name: asString(video.name),
      type: asString(video.type) || 'Other',
      official: video.official === true,
      publishedAt: asString(video.published_at),
      language: asString(video.iso_639_1),
    }))
    .sort(compareVideos)
    .slice(0, MAX_VIDEOS);

  const mapImage = (image: any): TmdbMediaImage => ({
    filePath: asString(image.file_path),
    width: asNumber(image.width),
    height: asNumber(image.height),
    voteAverage: asNumber(image.vote_average),
    voteCount: asNumber(image.vote_count),
    language: asString(image.iso_639_1),
  });

  const backdrops: TmdbMediaImage[] = rawBackdrops
    .filter((image: any) => image && asString(image.file_path) !== '')
    .map(mapImage)
    .sort(compareImages)
    .slice(0, MAX_IMAGES);

  const posters: TmdbMediaImage[] = rawPosters
    .filter((image: any) => image && asString(image.file_path) !== '')
    .map(mapImage)
    .sort(compareImages)
    .slice(0, MAX_IMAGES);

  return { videos, backdrops, posters };
}

const isTrailerOrTeaser = (video: TmdbMediaVideo): boolean =>
  video.type === 'Trailer' || video.type === 'Teaser';

/**
 * Builds the "Paling Populer" row: up to 2 videos (trailers/teasers first),
 * then 6 backdrops, then 4 posters, in that display order.
 */
export function buildMostPopular(
  media: TmdbMediaData | null | undefined
): TmdbMostPopularItem[] {
  const videos = Array.isArray(media?.videos) ? media!.videos : [];
  const backdrops = Array.isArray(media?.backdrops) ? media!.backdrops : [];
  const posters = Array.isArray(media?.posters) ? media!.posters : [];

  const preferredVideos = videos.filter(isTrailerOrTeaser);
  const remainingVideos = videos.filter(video => !isTrailerOrTeaser(video));

  return [
    ...[...preferredVideos, ...remainingVideos]
      .slice(0, 2)
      .map(video => ({ kind: 'video' as const, video })),
    ...backdrops
      .slice(0, 6)
      .map(image => ({ kind: 'backdrop' as const, image })),
    ...posters.slice(0, 4).map(image => ({ kind: 'poster' as const, image })),
  ];
}

/**
 * Extracts a YouTube video ID from watch, short, embed or raw-ID values.
 */
export function extractYoutubeKey(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return '';
  const value = url.trim();
  if (!value) return '';
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;

  const watchMatch = value.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];

  const embedMatch = value.match(/(?:youtube\.com\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];

  return '';
}
