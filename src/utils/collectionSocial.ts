import type { CollectionItem, UserCollection } from '../types';

/**
 * A shared Buzz snapshot is only a fallback for visitors. It intentionally
 * keeps the same shape as the old inline snapshot type so callers can pass the
 * document data through without copying collection fields around.
 */
export interface CollectionSnapshotData {
  collectionId?: string;
  ownerId?: string;
  name?: string;
  description?: string;
  itemCount?: number;
  previewImages?: string[];
  isPublic?: boolean;
  items?: Array<{
    itemId: string;
    itemType: 'film' | 'article';
    addedAt?: string;
  }>;
}

export type CollectionAvailabilitySource = 'live' | 'snapshot' | 'unavailable';

export interface CollectionAvailability {
  source: CollectionAvailabilitySource;
  collection: UserCollection | null;
}

export interface ResolveCollectionAvailabilityInput {
  liveCollection?: UserCollection | null;
  snapshot?: CollectionSnapshotData | null;
  ownerId?: string;
  collectionId?: string;
}

export interface OptimisticLikeResult {
  liked: boolean;
  count: number;
}

export type CollectionInteractionReason = 'guest' | 'owner' | 'private' | null;

export interface CollectionInteraction {
  canLike: boolean;
  canSave: boolean;
  reason: CollectionInteractionReason;
}

export interface CollectionInteractionInput {
  isLoggedIn: boolean;
  viewerId?: string | null;
  ownerId?: string | null;
  isPublic?: boolean;
}

export function buildLikeId(ownerId: string, collectionId: string, uid: string): string {
  return `${ownerId}_${collectionId}_${uid}`;
}

export function buildSavedKey(ownerId: string, collectionId: string): string {
  return `${ownerId}_${collectionId}`;
}

/**
 * Applies a like toggle without ever allowing a negative visible count.
 */
export function applyOptimisticLike(count: number, wasLiked: boolean): OptimisticLikeResult {
  const safeCount = Math.max(0, Number.isFinite(count) ? Math.floor(count) : 0);
  const liked = !wasLiked;
  return {
    liked,
    count: liked ? safeCount + 1 : Math.max(0, safeCount - 1),
  };
}

/**
 * Single source of truth for who can interact with a collection. The owner is
 * checked before visibility so an owner never sees a misleading "private"
 * message on their own private collection.
 */
export function canInteractWithCollection({
  isLoggedIn,
  viewerId,
  ownerId,
  isPublic,
}: CollectionInteractionInput): CollectionInteraction {
  if (!isLoggedIn || !viewerId || viewerId === 'guest') {
    return { canLike: false, canSave: false, reason: 'guest' };
  }

  if (ownerId && viewerId === ownerId) {
    return { canLike: false, canSave: false, reason: 'owner' };
  }

  if (isPublic === false) {
    return { canLike: false, canSave: false, reason: 'private' };
  }

  return { canLike: true, canSave: true, reason: null };
}

const normalizeSnapshotItems = (
  items: CollectionSnapshotData['items']
): CollectionItem[] => {
  if (!Array.isArray(items)) return [];
  return items
    .filter(
      (item): item is NonNullable<CollectionSnapshotData['items']>[number] =>
        Boolean(item) &&
        typeof item.itemId === 'string' &&
        (item.itemType === 'film' || item.itemType === 'article')
    )
    .map((item) => ({
      itemId: item.itemId,
      itemType: item.itemType,
      addedAt: item.addedAt || '',
    }));
};

const snapshotToCollection = (
  snapshot: CollectionSnapshotData,
  ownerId: string,
  collectionId: string
): UserCollection => ({
  id: snapshot.collectionId || collectionId,
  name: snapshot.name || 'Koleksi',
  description: snapshot.description || '',
  isDefault: false,
  isPublic: snapshot.isPublic !== false,
  items: normalizeSnapshotItems(snapshot.items),
  createdAt: '',
  updatedAt: '',
});

/**
 * Prefers the live collection document, falls back to a shared Buzz snapshot,
 * and otherwise reports the unavailable state. A live private document is
 * never exposed to a visitor, even if a snapshot exists.
 */
export function resolveCollectionAvailability({
  liveCollection,
  snapshot,
  ownerId = '',
  collectionId = '',
}: ResolveCollectionAvailabilityInput): CollectionAvailability {
  if (liveCollection) {
    if (liveCollection.isPublic === false) {
      return { source: 'unavailable', collection: null };
    }

    return {
      source: 'live',
      collection: {
        ...liveCollection,
        id: liveCollection.id || collectionId,
        items: Array.isArray(liveCollection.items) ? liveCollection.items : [],
      },
    };
  }

  if (snapshot) {
    return {
      source: 'snapshot',
      collection: snapshotToCollection(snapshot, ownerId, collectionId),
    };
  }

  return { source: 'unavailable', collection: null };
}
