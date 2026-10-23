import type { ShareData } from '../components/Modals/SocialShareModal';

export const SHARE_PLATFORMS = [
  'whatsapp',
  'x',
  'telegram',
  'facebook',
  'native',
  'copy_link',
  'instagram_story',
] as const;

export type SharePlatform = (typeof SHARE_PLATFORMS)[number];

export const SHARE_CONTENT_TYPES = [
  'article',
  'buzz',
  'film',
  'review',
  'collection',
] as const;

export type ShareContentType = (typeof SHARE_CONTENT_TYPES)[number];

export interface ShareEvent {
  platform: SharePlatform;
  contentType: ShareContentType;
  contentId: string;
  uid?: string;
  createdAt: string;
}

export interface ShareDailyPoint {
  date: string;
  displayDate: string;
  total: number;
  byPlatform: Record<SharePlatform, number>;
}

export interface ShareTopContent {
  contentId: string;
  contentType: ShareContentType;
  shares: number;
}

export interface ShareAggregation {
  total: number;
  byPlatform: Record<SharePlatform, number>;
  byContentType: Record<ShareContentType, number>;
  matrix: Record<SharePlatform, Record<ShareContentType, number>>;
  daily: ShareDailyPoint[];
  topContent: ShareTopContent[];
}

const SHARE_LINK_PLATFORMS: Record<string, SharePlatform> = {
  whatsapp: 'whatsapp',
  x: 'x',
  twitter: 'x',
  'x (twitter)': 'x',
  telegram: 'telegram',
  facebook: 'facebook',
  native: 'native',
  'native share': 'native',
  copy_link: 'copy_link',
  'copy link': 'copy_link',
  'salin link': 'copy_link',
  'instagram story': 'instagram_story',
  instagram_story: 'instagram_story',
  instagram: 'instagram_story',
};

const MAX_CONTENT_ID_LENGTH = 128;
const DEDUPE_WINDOW_MS = 3000;
const recentShareEvents = new Map<string, number>();

const isSharePlatform = (value: unknown): value is SharePlatform =>
  typeof value === 'string' &&
  (SHARE_PLATFORMS as readonly string[]).includes(value);

const isShareContentType = (value: unknown): value is ShareContentType =>
  typeof value === 'string' &&
  (SHARE_CONTENT_TYPES as readonly string[]).includes(value);

/**
 * Maps the human-readable link names used by the share modal to the analytics
 * platform ids. Keeping this mapping in one place keeps the modal simple.
 */
export const mapShareLinkName = (name: string): SharePlatform | null => {
  if (typeof name !== 'string') return null;
  const normalized = name.trim().toLowerCase().replace(/\s+/g, ' ');
  return SHARE_LINK_PLATFORMS[normalized] ?? null;
};

const normalizeContentId = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, MAX_CONTENT_ID_LENGTH);
};

const decodePathSegment = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const getContentIdFromUrl = (url?: string): string => {
  if (typeof url !== 'string' || !url.trim()) return '';

  try {
    const parsed = new URL(url.trim(), 'https://sotoyfilm.my.id');
    const segments = parsed.pathname
      .split('/')
      .filter(Boolean)
      .map(decodePathSegment);

    const queryKeys = ['contentId', 'id', 'buzzId', 'articleId', 'filmId', 'collectionId'];
    for (const key of queryKeys) {
      const value = normalizeContentId(parsed.searchParams.get(key));
      if (value) return value;
    }

    const [first, second, third] = segments;
    if (first === 'koleksi' && third) return third;
    if (['artikel', 'article', 'film', 'buzz'].includes(first) && second) {
      return second;
    }
    if (segments.length > 0) return segments[segments.length - 1];
  } catch {
    // Fall through to the generic URL fallback below.
  }

  return normalizeContentId(url);
};

const resolveShareContentId = (data: ShareData): string => {
  if (data.type === 'collection') {
    const collectionId = normalizeContentId(data.collectionId);
    if (collectionId) return collectionId;
  }

  const explicitId = normalizeContentId(data.contentId);
  if (explicitId) return explicitId;

  const urlId = normalizeContentId(getContentIdFromUrl(data.url));
  if (urlId) return urlId;

  return 'unknown';
};

export const buildShareEvent = (
  platform: string,
  data: ShareData | null | undefined,
  uid?: string | null
): ShareEvent | null => {
  if (!isSharePlatform(platform)) return null;
  if (!data || !isShareContentType(data.type)) return null;
  if (
    data.type === 'collection' &&
    (data.collectionIsPublic === false || data.isPublic === false)
  ) {
    return null;
  }

  const event: ShareEvent = {
    platform,
    contentType: data.type,
    contentId: resolveShareContentId(data),
    createdAt: new Date().toISOString(),
  };

  const normalizedUid = typeof uid === 'string' ? uid.trim() : '';
  if (normalizedUid) event.uid = normalizedUid;

  return event;
};

const createPlatformCounts = (): Record<SharePlatform, number> =>
  Object.fromEntries(SHARE_PLATFORMS.map((platform) => [platform, 0])) as Record<
    SharePlatform,
    number
  >;

const createContentTypeCounts = (): Record<ShareContentType, number> =>
  Object.fromEntries(
    SHARE_CONTENT_TYPES.map((contentType) => [contentType, 0])
  ) as Record<ShareContentType, number>;

const createMatrix = (): Record<
  SharePlatform,
  Record<ShareContentType, number>
> =>
  Object.fromEntries(
    SHARE_PLATFORMS.map((platform) => [platform, createContentTypeCounts()])
  ) as Record<SharePlatform, Record<ShareContentType, number>>;

const toEventDate = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (value && typeof value === 'object') {
    const maybeTimestamp = value as {
      toDate?: () => Date;
      seconds?: number;
      nanoseconds?: number;
    };

    if (typeof maybeTimestamp.toDate === 'function') {
      try {
        const date = maybeTimestamp.toDate();
        return Number.isNaN(date.getTime()) ? null : date;
      } catch {
        return null;
      }
    }

    if (typeof maybeTimestamp.seconds === 'number') {
      const date = new Date(maybeTimestamp.seconds * 1000);
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  return null;
};

const readShareEvent = (
  value: unknown
): {
  platform: SharePlatform;
  contentType: ShareContentType;
  contentId: string;
  date: Date;
} | null => {
  if (!value || typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  if (!isSharePlatform(record.platform)) return null;
  if (!isShareContentType(record.contentType)) return null;

  const contentId =
    typeof record.contentId === 'string' ? record.contentId.trim() : '';
  if (!contentId || contentId.length > MAX_CONTENT_ID_LENGTH) return null;

  const date = toEventDate(record.createdAt);
  if (!date) return null;

  return {
    platform: record.platform,
    contentType: record.contentType,
    contentId,
    date,
  };
};

const utcDateKey = (date: Date): string => date.toISOString().slice(0, 10);

export const aggregateShareEvents = (
  events: readonly unknown[],
  days: number,
  now: Date = new Date()
): ShareAggregation => {
  const safeDays = Number.isFinite(days) ? Math.max(0, Math.floor(days)) : 0;
  const byPlatform = createPlatformCounts();
  const byContentType = createContentTypeCounts();
  const matrix = createMatrix();
  const topContentMap = new Map<string, ShareTopContent>();

  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const daily: ShareDailyPoint[] = [];
  const dailyMap = new Map<string, ShareDailyPoint>();

  for (let index = safeDays - 1; index >= 0; index -= 1) {
    const day = new Date(today);
    day.setUTCDate(day.getUTCDate() - index);
    const date = utcDateKey(day);
    const point: ShareDailyPoint = {
      date,
      displayDate: day.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      }),
      total: 0,
      byPlatform: createPlatformCounts(),
    };
    daily.push(point);
    dailyMap.set(date, point);
  }

  const list = Array.isArray(events) ? events : [];

  for (const rawEvent of list) {
    const event = readShareEvent(rawEvent);
    if (!event) continue;

    byPlatform[event.platform] += 1;
    byContentType[event.contentType] += 1;
    matrix[event.platform][event.contentType] += 1;

    const dailyPoint = dailyMap.get(utcDateKey(event.date));
    if (dailyPoint) {
      dailyPoint.total += 1;
      dailyPoint.byPlatform[event.platform] += 1;
    }

    const existing = topContentMap.get(event.contentId);
    if (existing) {
      existing.shares += 1;
    } else {
      topContentMap.set(event.contentId, {
        contentId: event.contentId,
        contentType: event.contentType,
        shares: 1,
      });
    }
  }

  const topContent = Array.from(topContentMap.values())
    .sort(
      (left, right) =>
        right.shares - left.shares ||
        left.contentId.localeCompare(right.contentId)
    )
    .slice(0, 10);

  const total = Object.values(byPlatform).reduce(
    (sum, count) => sum + count,
    0
  );

  return {
    total,
    byPlatform,
    byContentType,
    matrix,
    daily,
    topContent,
  };
};

/**
 * Returns true when this platform/content pair is outside the 3 second dedupe
 * window. Exported separately so the behaviour can be tested without Firebase.
 */
export const shouldRecordShareEvent = (
  platform: SharePlatform,
  contentId: string,
  now: number = Date.now()
): boolean => {
  const key = `${platform}:${contentId}`;

  for (const [existingKey, timestamp] of recentShareEvents) {
    if (now - timestamp >= DEDUPE_WINDOW_MS) {
      recentShareEvents.delete(existingKey);
    }
  }

  const previous = recentShareEvents.get(key);
  if (previous !== undefined && now - previous < DEDUPE_WINDOW_MS) {
    return false;
  }

  recentShareEvents.set(key, now);
  return true;
};

export const resetShareAnalyticsDedupe = (): void => {
  recentShareEvents.clear();
};

/**
 * Fire-and-forget Firestore writer. This never returns a promise to the share
 * UI and never lets an analytics failure interrupt or delay a share action.
 */
export const recordShareEvent = (
  platform: string,
  data: ShareData | null | undefined,
  uid?: string | null
): void => {
  const event = buildShareEvent(platform, data, uid);
  if (!event) return;
  if (!shouldRecordShareEvent(event.platform, event.contentId)) return;

  void (async () => {
    try {
      const [{ addDoc, collection, serverTimestamp }, { db }] =
        await Promise.all([
          import('firebase/firestore'),
          import('../lib/firebase'),
        ]);

      const payload: Record<string, unknown> = {
        platform: event.platform,
        contentType: event.contentType,
        contentId: event.contentId,
        createdAt: serverTimestamp(),
      };

      if (event.uid) payload.uid = event.uid;

      await addDoc(collection(db, 'shareEvents'), payload);
    } catch {
      // Analytics writes must stay invisible to the sharing experience.
    }
  })();
};
