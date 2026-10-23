import {
  applyOptimisticLike,
  buildLikeId,
  buildSavedKey,
  canInteractWithCollection,
  resolveCollectionAvailability,
} from '../src/utils/collectionSocial';
import type { UserCollection } from '../src/types';

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

const assertEquals = (actual: unknown, expected: unknown, message: string) => {
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  assert(
    same,
    `${message} (expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)})`
  );
};

const makeCollection = (overrides: Partial<UserCollection> = {}): UserCollection => ({
  id: 'collection-1',
  name: 'Watchlist Akhir Pekan',
  description: 'Film pilihan.',
  isDefault: false,
  isPublic: true,
  items: [
    {
      itemId: 'film-1',
      itemType: 'film',
      addedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

// Id formats
assertEquals(
  buildLikeId('owner-1', 'collection-2', 'viewer-3'),
  'owner-1_collection-2_viewer-3',
  'buildLikeId: joins owner, collection and viewer with underscores'
);
assertEquals(
  buildSavedKey('owner-1', 'collection-2'),
  'owner-1_collection-2',
  'buildSavedKey: joins owner and collection with an underscore'
);
assertEquals(
  buildLikeId('owner_with_under', 'col-lection_1', 'viewer_with-hyphen'),
  'owner_with_under_col-lection_1_viewer_with-hyphen',
  'buildLikeId: preserves underscores and hyphens in every id'
);
assertEquals(
  buildSavedKey('owner_with_under', 'col-lection_1'),
  'owner_with_under_col-lection_1',
  'buildSavedKey: preserves underscores and hyphens in every id'
);

// Optimistic like transitions
assertEquals(
  applyOptimisticLike(4, false),
  { liked: true, count: 5 },
  'applyOptimisticLike: increments the count when liking'
);
assertEquals(
  applyOptimisticLike(4, true),
  { liked: false, count: 3 },
  'applyOptimisticLike: decrements the count when unliking'
);
assertEquals(
  applyOptimisticLike(0, true),
  { liked: false, count: 0 },
  'applyOptimisticLike: never goes below zero'
);
assertEquals(
  applyOptimisticLike(-8, false),
  { liked: true, count: 1 },
  'applyOptimisticLike: normalizes an invalid negative count before liking'
);
assertEquals(
  applyOptimisticLike(Number.NaN, true),
  { liked: false, count: 0 },
  'applyOptimisticLike: treats a non-finite count as zero'
);

// Interaction permissions
const guest = canInteractWithCollection({
  isLoggedIn: false,
  viewerId: null,
  ownerId: 'owner-1',
  isPublic: true,
});
assertEquals(guest, { canLike: false, canSave: false, reason: 'guest' }, 'guests cannot like or save');

const owner = canInteractWithCollection({
  isLoggedIn: true,
  viewerId: 'owner-1',
  ownerId: 'owner-1',
  isPublic: true,
});
assertEquals(owner, { canLike: false, canSave: false, reason: 'owner' }, 'owners cannot like or save their own collection');

const privateViewer = canInteractWithCollection({
  isLoggedIn: true,
  viewerId: 'viewer-2',
  ownerId: 'owner-1',
  isPublic: false,
});
assertEquals(
  privateViewer,
  { canLike: false, canSave: false, reason: 'private' },
  'private collections cannot be liked or saved'
);

const publicViewer = canInteractWithCollection({
  isLoggedIn: true,
  viewerId: 'viewer-2',
  ownerId: 'owner-1',
  isPublic: true,
});
assertEquals(
  publicViewer,
  { canLike: true, canSave: true, reason: null },
  'a signed-in viewer can like and save a public collection'
);

const missingPublicFlag = canInteractWithCollection({
  isLoggedIn: true,
  viewerId: 'viewer-2',
  ownerId: 'owner-1',
  isPublic: undefined,
});
assert(
  missingPublicFlag.canLike && missingPublicFlag.canSave,
  'a missing isPublic flag defaults to public interaction'
);

// Availability
const liveCollection = makeCollection({ isPublic: true });
const liveAvailability = resolveCollectionAvailability({
  liveCollection,
  snapshot: {
    collectionId: 'snapshot-collection',
    name: 'Snapshot',
    isPublic: true,
  },
  ownerId: 'owner-1',
  collectionId: 'collection-1',
});
assertEquals(liveAvailability.source, 'live', 'availability: prefers a live public collection');
assertEquals(liveAvailability.collection?.name, liveCollection.name, 'availability: returns the live collection');

const snapshotAvailability = resolveCollectionAvailability({
  liveCollection: null,
  snapshot: {
    collectionId: 'snapshot-collection',
    ownerId: 'owner-1',
    name: 'Snapshot Publik',
    description: 'Dari Buzz',
    isPublic: true,
    itemCount: 1,
    items: [{ itemId: 'film-2', itemType: 'film', addedAt: '2026-01-02T00:00:00.000Z' }],
  },
  ownerId: 'owner-1',
  collectionId: 'collection-1',
});
assertEquals(snapshotAvailability.source, 'snapshot', 'availability: falls back to a Buzz snapshot');
assertEquals(snapshotAvailability.collection?.id, 'snapshot-collection', 'availability: keeps the snapshot collection id');
assertEquals(snapshotAvailability.collection?.items[0]?.itemId, 'film-2', 'availability: normalizes snapshot items');

const privateSnapshotAvailability = resolveCollectionAvailability({
  liveCollection: null,
  snapshot: {
    collectionId: 'snapshot-private',
    name: 'Privat tapi dibagikan',
    isPublic: false,
  },
  ownerId: 'owner-1',
  collectionId: 'collection-1',
});
assertEquals(
  privateSnapshotAvailability.source,
  'snapshot',
  'availability: a privately shared snapshot still falls back to Buzz'
);

const unavailableAvailability = resolveCollectionAvailability({
  liveCollection: null,
  snapshot: null,
});
assertEquals(
  unavailableAvailability,
  { source: 'unavailable', collection: null },
  'availability: reports unavailable when both reads fail'
);

const privateLiveAvailability = resolveCollectionAvailability({
  liveCollection: makeCollection({ isPublic: false }),
  snapshot: null,
});
assertEquals(
  privateLiveAvailability,
  { source: 'unavailable', collection: null },
  'availability: a live private collection is unavailable instead of falling back'
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
