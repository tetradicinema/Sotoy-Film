import {
  buildMostPopular,
  extractYoutubeKey,
  trimTmdbMedia,
  type TmdbMediaData,
  type TmdbMediaImage,
  type TmdbMediaVideo,
} from '../src/utils/tmdbMediaTrim';
import {
  tmdbBackdropFullUrl,
  tmdbBackdropThumbUrl,
  tmdbPosterFullUrl,
  tmdbPosterThumbUrl,
  tmdbYoutubeEmbedUrl,
  tmdbYoutubeThumbUrl,
} from '../src/utils/tmdbHelper';

let passed = 0;
let failed = 0;

const assert = (condition: boolean, message: string) => {
  if (condition) {
    passed++;
    console.log(`✓ ${message}`);
  } else {
    failed++;
    console.error(`✗ ${message}`);
  }
};

const assertEquals = (actual: any, expected: any, message: string) => {
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  assert(
    same,
    `${message} (expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)})`
  );
};

const youtubeKey = (index: number): string => `vid${String(index).padStart(8, '0')}`;

const rawVideo = (overrides: Record<string, any> = {}) => ({
  key: youtubeKey(1),
  name: 'Official Trailer',
  type: 'Trailer',
  site: 'YouTube',
  official: false,
  published_at: '2024-01-01T00:00:00.000Z',
  iso_639_1: 'en',
  ...overrides,
});

const rawImage = (overrides: Record<string, any> = {}) => ({
  file_path: '/image-1.jpg',
  width: 1920,
  height: 1080,
  vote_average: 5,
  vote_count: 10,
  iso_639_1: 'en',
  ...overrides,
});

const rawPayload = (overrides: Record<string, any> = {}) => ({
  videos: { results: [] },
  images: { backdrops: [], posters: [] },
  ...overrides,
});

const video = (overrides: Partial<TmdbMediaVideo> = {}): TmdbMediaVideo => ({
  key: youtubeKey(1),
  name: 'Trailer',
  type: 'Trailer',
  official: false,
  publishedAt: '2024-01-01T00:00:00.000Z',
  language: 'en',
  ...overrides,
});

const image = (overrides: Partial<TmdbMediaImage> = {}): TmdbMediaImage => ({
  filePath: '/image-1.jpg',
  width: 1920,
  height: 1080,
  voteAverage: 5,
  voteCount: 10,
  language: 'en',
  ...overrides,
});

const runTests = async () => {
  console.log('Running TMDB Media Tests...\n');

  // ---------------------------------------------------------------------------
  // trimTmdbMedia
  // ---------------------------------------------------------------------------
  const nonYoutube = trimTmdbMedia(
    rawPayload({
      videos: {
        results: [
          rawVideo({ key: youtubeKey(1), site: 'Vimeo' }),
          rawVideo({ key: youtubeKey(2), site: 'YouTube', name: 'Kept' }),
          rawVideo({ key: '', site: 'YouTube' }),
        ],
      },
    })
  );
  assertEquals(nonYoutube.videos.length, 1, 'trimTmdbMedia: drops non-YouTube and empty keys');
  assertEquals(nonYoutube.videos[0].key, youtubeKey(2), 'trimTmdbMedia: keeps the YouTube video');

  const typed = trimTmdbMedia(
    rawPayload({
      videos: {
        results: [
          rawVideo({ key: youtubeKey(1), type: 'Bloopers' }),
          rawVideo({ key: youtubeKey(2), type: 'Featurette' }),
          rawVideo({ key: youtubeKey(3), type: 'Clip' }),
          rawVideo({ key: youtubeKey(4), type: 'Teaser' }),
          rawVideo({ key: youtubeKey(5), type: 'Trailer' }),
          rawVideo({ key: youtubeKey(6), type: 'Behind the Scenes' }),
          rawVideo({ key: youtubeKey(7), type: 'Interview' }),
        ],
      },
    })
  );
  assertEquals(
    typed.videos.map(item => item.type),
    ['Trailer', 'Teaser', 'Clip', 'Featurette', 'Behind the Scenes', 'Bloopers', 'Interview'],
    'trimTmdbMedia: sorts by trailer > teaser > clip > featurette > BTS > bloopers > others'
  );

  const officialFirst = trimTmdbMedia(
    rawPayload({
      videos: {
        results: [
          rawVideo({ key: youtubeKey(1), official: false, published_at: '2025-06-01T00:00:00.000Z' }),
          rawVideo({ key: youtubeKey(2), official: true, published_at: '2020-01-01T00:00:00.000Z' }),
          rawVideo({ key: youtubeKey(3), official: true, published_at: '2023-01-01T00:00:00.000Z' }),
        ],
      },
    })
  );
  assertEquals(
    officialFirst.videos.map(item => item.key),
    [youtubeKey(3), youtubeKey(2), youtubeKey(1)],
    'trimTmdbMedia: official videos first, then newest inside a type'
  );

  const manyVideos = trimTmdbMedia(
    rawPayload({
      videos: {
        results: Array.from({ length: 35 }, (_, index) =>
          rawVideo({ key: youtubeKey(index), type: 'Clip' })
        ),
      },
    })
  );
  assertEquals(manyVideos.videos.length, 30, 'trimTmdbMedia: caps videos at 30');

  const manyImages = trimTmdbMedia(
    rawPayload({
      images: {
        backdrops: Array.from({ length: 35 }, (_, index) =>
          rawImage({ file_path: `/backdrop-${index}.jpg` })
        ),
        posters: Array.from({ length: 35 }, (_, index) =>
          rawImage({ file_path: `/poster-${index}.jpg` })
        ),
      },
    })
  );
  assertEquals(
    manyImages.backdrops.length,
    30,
    'trimTmdbMedia: caps backdrops at 30'
  );
  assertEquals(manyImages.posters.length, 30, 'trimTmdbMedia: caps posters at 30');

  const sortedImages = trimTmdbMedia(
    rawPayload({
      images: {
        backdrops: [
          rawImage({ file_path: '/low.jpg', vote_average: 4, vote_count: 100 }),
          rawImage({ file_path: '/high.jpg', vote_average: 9, vote_count: 5 }),
          rawImage({ file_path: '/tie-fewer.jpg', vote_average: 7, vote_count: 10 }),
          rawImage({ file_path: '/tie-more.jpg', vote_average: 7, vote_count: 50 }),
        ],
        posters: [],
      },
    })
  );
  assertEquals(
    sortedImages.backdrops.map(item => item.filePath),
    ['/high.jpg', '/tie-more.jpg', '/tie-fewer.jpg', '/low.jpg'],
    'trimTmdbMedia: sorts images by voteAverage then voteCount'
  );

  const missingFields = trimTmdbMedia(
    rawPayload({
      videos: { results: [{ site: 'YouTube', key: youtubeKey(9) }] },
      images: { backdrops: [{ file_path: '/ok.jpg' }], posters: [{}] },
    })
  );
  assertEquals(
    missingFields.videos[0],
    {
      key: youtubeKey(9),
      name: '',
      type: 'Other',
      official: false,
      publishedAt: '',
      language: '',
    },
    'trimTmdbMedia: tolerates missing video fields'
  );
  assertEquals(
    missingFields.backdrops[0],
    {
      filePath: '/ok.jpg',
      width: 0,
      height: 0,
      voteAverage: 0,
      voteCount: 0,
      language: '',
    },
    'trimTmdbMedia: tolerates missing image fields'
  );
  assertEquals(missingFields.posters.length, 0, 'trimTmdbMedia: drops images without file_path');

  const emptyInputs = [
    trimTmdbMedia(null),
    trimTmdbMedia(undefined),
    trimTmdbMedia({}),
    trimTmdbMedia({ videos: { results: null }, images: { backdrops: null, posters: null } }),
  ];
  assert(
    emptyInputs.every(
      media =>
        media.videos.length === 0 &&
        media.backdrops.length === 0 &&
        media.posters.length === 0
    ),
    'trimTmdbMedia: empty or malformed input returns empty arrays'
  );

  const mappedFields = trimTmdbMedia(
    rawPayload({
      videos: {
        results: [
          rawVideo({
            key: youtubeKey(4),
            name: '  Official Trailer  ',
            type: 'Teaser',
            official: true,
            published_at: '2024-05-05T00:00:00.000Z',
            iso_639_1: 'id',
          }),
        ],
      },
    })
  );
  assertEquals(
    mappedFields.videos[0],
    {
      key: youtubeKey(4),
      name: 'Official Trailer',
      type: 'Teaser',
      official: true,
      publishedAt: '2024-05-05T00:00:00.000Z',
      language: 'id',
    },
    'trimTmdbMedia: maps and trims the documented video fields'
  );

  // ---------------------------------------------------------------------------
  // buildMostPopular
  // ---------------------------------------------------------------------------
  const fullMedia: TmdbMediaData = {
    videos: [
      video({ key: youtubeKey(1), type: 'Featurette', name: 'Featurette' }),
      video({ key: youtubeKey(2), type: 'Clip', name: 'Clip' }),
      video({ key: youtubeKey(3), type: 'Trailer', name: 'Trailer' }),
      video({ key: youtubeKey(4), type: 'Teaser', name: 'Teaser' }),
    ],
    backdrops: Array.from({ length: 8 }, (_, index) =>
      image({ filePath: `/backdrop-${index}.jpg` })
    ),
    posters: Array.from({ length: 6 }, (_, index) =>
      image({ filePath: `/poster-${index}.jpg` })
    ),
  };

  const popular = buildMostPopular(fullMedia);
  assertEquals(popular.length, 2 + 6 + 4, 'buildMostPopular: caps at 2 + 6 + 4 items');
  assertEquals(
    popular.map(item => item.kind),
    [
      'video',
      'video',
      'backdrop',
      'backdrop',
      'backdrop',
      'backdrop',
      'backdrop',
      'backdrop',
      'poster',
      'poster',
      'poster',
      'poster',
    ],
    'buildMostPopular: orders videos, then backdrops, then posters'
  );
  assertEquals(
    popular
      .filter((item): item is { kind: 'video'; video: TmdbMediaVideo } => item.kind === 'video')
      .map(item => item.video.type),
    ['Trailer', 'Teaser'],
    'buildMostPopular: prefers trailers/teasers for the two video slots'
  );

  const withoutTrailers = buildMostPopular({
    videos: [video({ key: youtubeKey(1), type: 'Clip' }), video({ key: youtubeKey(2), type: 'Clip' })],
    backdrops: [image({ filePath: '/only.jpg' })],
    posters: [],
  });
  assertEquals(
    withoutTrailers.map(item => item.kind),
    ['video', 'video', 'backdrop'],
    'buildMostPopular: still fills slots when no trailer/teaser exists'
  );

  const oneVideo = buildMostPopular({
    videos: [video({ key: youtubeKey(1), type: 'Trailer' })],
    backdrops: [],
    posters: [image({ filePath: '/poster.jpg' })],
  });
  assertEquals(
    oneVideo.map(item => item.kind),
    ['video', 'poster'],
    'buildMostPopular: handles a single video and one poster'
  );

  assertEquals(buildMostPopular(null).length, 0, 'buildMostPopular: null input returns no items');
  assertEquals(
    buildMostPopular({ videos: [], backdrops: [], posters: [] }).length,
    0,
    'buildMostPopular: empty media returns no items'
  );

  // ---------------------------------------------------------------------------
  // URL builders / YouTube extraction
  // ---------------------------------------------------------------------------
  assertEquals(
    tmdbBackdropThumbUrl('/b.jpg'),
    'https://image.tmdb.org/t/p/w780/b.jpg',
    'tmdbBackdropThumbUrl: uses w780'
  );
  assertEquals(
    tmdbBackdropFullUrl('/b.jpg'),
    'https://image.tmdb.org/t/p/w1280/b.jpg',
    'tmdbBackdropFullUrl: uses w1280'
  );
  assertEquals(
    tmdbPosterThumbUrl('/p.jpg'),
    'https://image.tmdb.org/t/p/w342/p.jpg',
    'tmdbPosterThumbUrl: uses w342'
  );
  assertEquals(
    tmdbPosterFullUrl('/p.jpg'),
    'https://image.tmdb.org/t/p/w780/p.jpg',
    'tmdbPosterFullUrl: uses w780'
  );
  assertEquals(
    tmdbYoutubeThumbUrl('abc12345678'),
    'https://i.ytimg.com/vi/abc12345678/hqdefault.jpg',
    'tmdbYoutubeThumbUrl: builds the hqdefault thumbnail'
  );
  assertEquals(
    tmdbYoutubeEmbedUrl('abc12345678'),
    'https://www.youtube.com/embed/abc12345678?autoplay=1&rel=0',
    'tmdbYoutubeEmbedUrl: builds the autoplay embed URL'
  );

  assertEquals(
    extractYoutubeKey('https://www.youtube.com/watch?v=abc12345678&t=10'),
    'abc12345678',
    'extractYoutubeKey: parses watch URLs'
  );
  assertEquals(
    extractYoutubeKey('https://youtu.be/abc12345678'),
    'abc12345678',
    'extractYoutubeKey: parses short URLs'
  );
  assertEquals(extractYoutubeKey('https://vimeo.com/12345'), '', 'extractYoutubeKey: rejects non-YouTube URLs');

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
};

runTests();
