import {
  aggregateShareEvents,
  buildShareEvent,
  mapShareLinkName,
  resetShareAnalyticsDedupe,
  shouldRecordShareEvent,
} from '../src/utils/shareAnalytics';
import type { ShareData } from '../src/components/Modals/SocialShareModal';

let passed = 0;
let failed = 0;

const assert = (condition: boolean, message: string) => {
  if (condition) {
    passed += 1;
    console.log(`✓ ${message}`);
  } else {
    failed += 1;
    console.error(`✗ ${message}`);
  }
};

const baseData = (overrides: Partial<ShareData> = {}): ShareData => ({
  title: 'Contoh Konten',
  text: 'Deskripsi konten untuk pengujian.',
  url: 'https://sotoyfilm.my.id/artikel/contoh-konten',
  type: 'article',
  ...overrides,
});

const makeEvent = (
  platform: string,
  contentType: string,
  contentId: string,
  createdAt: string
) => ({ platform, contentType, contentId, createdAt });

const now = new Date('2026-10-23T12:00:00.000Z');

console.log('\nRunning Share Analytics Tests...\n');

assert(mapShareLinkName('WhatsApp') === 'whatsapp', 'link name maps WhatsApp');
assert(mapShareLinkName('X (Twitter)') === 'x', 'link name maps X (Twitter)');
assert(mapShareLinkName('Telegram') === 'telegram', 'link name maps Telegram');
assert(mapShareLinkName('Facebook') === 'facebook', 'link name maps Facebook');
assert(mapShareLinkName(' LinkedIn ') === null, 'unknown link name maps to null');

assert(buildShareEvent('linkedin', baseData()) === null, 'invalid platform returns null');
assert(
  buildShareEvent('whatsapp', { ...baseData(), type: 'podcast' as ShareData['type'] }) ===
    null,
  'invalid content type returns null'
);
assert(
  buildShareEvent(
    'whatsapp',
    baseData({
      type: 'collection',
      collectionId: 'private-collection',
      collectionIsPublic: false,
    })
  ) === null,
  'private collection with collectionIsPublic false returns null'
);
assert(
  buildShareEvent(
    'whatsapp',
    baseData({
      type: 'collection',
      collectionId: 'private-collection',
      isPublic: false,
    })
  ) === null,
  'private collection with isPublic false returns null'
);

const collectionEvent = buildShareEvent(
  'copy_link',
  baseData({
    type: 'collection',
    collectionId: 'collection-42',
    collectionIsPublic: true,
  })
);
assert(
  collectionEvent?.contentId === 'collection-42',
  'collection contentId comes from collectionId'
);

const truncatedEvent = buildShareEvent(
  'facebook',
  baseData({ contentId: 'x'.repeat(200) })
);
assert(
  truncatedEvent?.contentId.length === 128 &&
    truncatedEvent.contentId === 'x'.repeat(128),
  'contentId is truncated to 128 characters'
);

const longUrlSegment = 'y'.repeat(200);
const truncatedUrlEvent = buildShareEvent(
  'facebook',
  baseData({ url: `https://sotoyfilm.my.id/artikel/${longUrlSegment}` })
);
assert(
  truncatedUrlEvent?.contentId.length === 128 &&
    truncatedUrlEvent.contentId === longUrlSegment.slice(0, 128),
  'contentId derived from a URL path is truncated to 128 characters'
);

assert(
  buildShareEvent(
    'telegram',
    baseData({ url: 'https://sotoyfilm.my.id/artikel/inside-out-2' })
  )?.contentId === 'inside-out-2',
  'article contentId is derived from the URL path'
);
assert(
  buildShareEvent(
    'telegram',
    baseData({ type: 'film', url: 'https://sotoyfilm.my.id/film/dune-part-two' })
  )?.contentId === 'dune-part-two',
  'film contentId is derived from the URL path'
);
assert(
  buildShareEvent(
    'telegram',
    baseData({ type: 'buzz', url: 'https://sotoyfilm.my.id/buzz/buzz-123' })
  )?.contentId === 'buzz-123',
  'buzz contentId is derived from the URL path'
);
assert(
  buildShareEvent(
    'telegram',
    baseData({
      type: 'collection',
      collectionIsPublic: true,
      url: 'https://sotoyfilm.my.id/koleksi/user-1/collection-9',
    })
  )?.contentId === 'collection-9',
  'collection contentId falls back to the collection URL segment'
);

const noPiiData = baseData({
  title: 'Judul Rahasia',
  authorName: 'Nama Penulis',
  authorHandle: '@nama_penulis',
  authorAvatar: 'https://example.com/avatar.jpg',
  filmTitle: 'Judul Film',
});
const noPiiEvent = buildShareEvent('whatsapp', noPiiData, 'uid-123');
assert(
  noPiiEvent !== null &&
    Object.keys(noPiiEvent).sort().join(',') ===
      'contentId,contentType,createdAt,platform,uid',
  'event contains only the allowed fields'
);
assert(
  noPiiEvent !== null &&
    !JSON.stringify(noPiiEvent).includes('Judul Rahasia') &&
    !JSON.stringify(noPiiEvent).includes('Nama Penulis') &&
    !JSON.stringify(noPiiEvent).includes('nama_penulis'),
  'event does not contain titles, names, handles, or emails'
);
assert(
  noPiiEvent?.uid === 'uid-123',
  'event includes the signed-in uid when supplied'
);

const aggregateEvents = [
  makeEvent('whatsapp', 'article', 'article-a', '2026-10-21T08:00:00.000Z'),
  makeEvent('whatsapp', 'article', 'article-b', '2026-10-22T08:00:00.000Z'),
  makeEvent('x', 'film', 'film-a', '2026-10-22T09:00:00.000Z'),
  makeEvent('copy_link', 'review', 'review-a', '2026-10-23T09:00:00.000Z'),
  makeEvent('instagram_story', 'collection', 'collection-a', '2026-10-23T10:00:00.000Z'),
];
const aggregate = aggregateShareEvents(aggregateEvents, 3, now);

assert(aggregate.total === 5, 'aggregate counts total valid events');
assert(
  aggregate.byPlatform.whatsapp === 2 &&
    aggregate.byPlatform.x === 1 &&
    aggregate.byPlatform.instagram_story === 1,
  'aggregate counts shares by platform'
);
assert(
  aggregate.byContentType.article === 2 &&
    aggregate.byContentType.film === 1 &&
    aggregate.byContentType.review === 1 &&
    aggregate.byContentType.collection === 1,
  'aggregate counts shares by content type'
);
assert(
  aggregate.matrix.whatsapp.article === 2 &&
    aggregate.matrix.copy_link.review === 1 &&
    aggregate.matrix.facebook.film === 0,
  'aggregate builds a zero-filled platform x content type matrix'
);

const emptyDaily = aggregateShareEvents([], 3, now);
assert(
  emptyDaily.daily.length === 3 &&
    emptyDaily.daily[0].date === '2026-10-21' &&
    emptyDaily.daily[2].date === '2026-10-23',
  'daily series is zero-filled for N days'
);
assert(
  emptyDaily.daily.every((point) => point.total === 0),
  'zero-filled daily series keeps zero totals'
);
assert(
  aggregate.daily.length === 3 &&
    aggregate.daily[0].total === 1 &&
    aggregate.daily[1].total === 2 &&
    aggregate.daily[2].total === 2,
  'daily series counts events on the matching UTC day'
);

const topEvents: ReturnType<typeof makeEvent>[] = [];
for (let contentIndex = 0; contentIndex < 12; contentIndex += 1) {
  const contentId = `film-${String(contentIndex).padStart(2, '0')}`;
  for (let shareIndex = 0; shareIndex <= contentIndex; shareIndex += 1) {
    topEvents.push(
      makeEvent('whatsapp', 'film', contentId, '2026-10-23T10:00:00.000Z')
    );
  }
}
const topAggregate = aggregateShareEvents(topEvents, 30, now);
assert(
  topAggregate.topContent.length === 10,
  'top content list is limited to 10 content ids'
);
assert(
  topAggregate.topContent[0].contentId === 'film-11' &&
    topAggregate.topContent[0].shares === 12,
  'top content is ordered by share count'
);
assert(
  topAggregate.topContent.every(
    (item, index, list) =>
      index === 0 || list[index - 1].shares >= item.shares
  ),
  'top content ordering is descending'
);

const malformed = [
  null,
  {},
  'not-an-object',
  makeEvent('linkedin', 'article', 'article-a', '2026-10-23T10:00:00.000Z'),
  makeEvent('whatsapp', 'podcast', 'article-a', '2026-10-23T10:00:00.000Z'),
  makeEvent('whatsapp', 'article', '', '2026-10-23T10:00:00.000Z'),
  makeEvent('whatsapp', 'article', 'x'.repeat(129), '2026-10-23T10:00:00.000Z'),
  makeEvent('whatsapp', 'article', 'article-a', 'not-a-date'),
];
const malformedAggregate = aggregateShareEvents(malformed, 3, now);
assert(
  malformedAggregate.total === 0 &&
    malformedAggregate.topContent.length === 0,
  'malformed events are ignored'
);

resetShareAnalyticsDedupe();
assert(
  shouldRecordShareEvent('whatsapp', 'dedupe-content', 1000),
  'first share event is recorded'
);
assert(
  !shouldRecordShareEvent('whatsapp', 'dedupe-content', 3999),
  'same platform and contentId within 3 seconds is deduped'
);
assert(
  shouldRecordShareEvent('whatsapp', 'dedupe-content', 4000),
  'same share is allowed again after 3 seconds'
);
assert(
  shouldRecordShareEvent('x', 'dedupe-content', 4000),
  'dedupe is scoped to the platform and contentId pair'
);

console.log(`\nShare Analytics Tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
