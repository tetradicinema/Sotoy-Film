import type { Article, FilmItem, UserCollection } from '../types';

export const COLLECTION_NAME_LIMIT = 40;
export const COLLECTION_DESCRIPTION_LIMIT = 300;
export const COLLECTION_SHARE_DESCRIPTION_FALLBACK =
  'Koleksi film dan artikel pilihan di Sotoy Film.';

export interface CollectionDetailsInput {
  name?: string | null;
  description?: string | null;
}

export interface CollectionDetailsValidation {
  ok: boolean;
  name: string;
  description: string;
  error?: string;
}

export interface CollectionShareOwner {
  id: string;
  name?: string;
}

export interface CollectionShareMedia {
  films?: FilmItem[];
  articles?: Article[];
  previewImages?: string[];
}

export interface CollectionShareData {
  title: string;
  text: string;
  description: string;
  url: string;
  type: 'collection';
  image?: string;
  meta: string;
  authorName: string;
  itemCount: number;
  ownerName: string;
  previewImages: string[];
  isPublic: boolean;
  collectionId: string;
  collectionName: string;
  collectionDescription: string;
  collectionItemCount: number;
  collectionOwnerId: string;
  collectionOwnerName: string;
  collectionPreviewImages: string[];
  collectionIsPublic: boolean;
}

/**
 * Moves one array item from `from` to `to` without mutating the source.
 * Invalid indexes (including a single-item array) return an unchanged copy.
 */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (!Array.isArray(items) || items.length < 2) return Array.isArray(items) ? [...items] : [];
  if (!Number.isInteger(from) || !Number.isInteger(to)) return [...items];
  if (from < 0 || from >= items.length || to < 0 || to >= items.length) return [...items];
  if (from === to) return [...items];

  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function getCollectionItemKey(item: { itemId: string; itemType?: string }): string {
  return item.itemType ? `${item.itemType}:${item.itemId}` : item.itemId;
}

/**
 * Reorders items using the supplied keys. Unknown keys are ignored, duplicate
 * keys never duplicate an item, and items missing from `keys` keep their
 * original relative order at the end.
 */
export function reorderByKeys<T extends { itemId: string; itemType?: string }>(
  items: T[],
  keys: string[]
): T[] {
  if (!Array.isArray(items) || items.length === 0) return [];
  const remaining = [...items];
  const ordered: T[] = [];

  const takeMatchingItem = (rawKey: string): T | null => {
    const exactIndex = remaining.findIndex(item => getCollectionItemKey(item) === rawKey);
    if (exactIndex !== -1) {
      return remaining.splice(exactIndex, 1)[0];
    }

    // Accept plain itemId keys as long as they are unambiguous.
    const idMatches = remaining.reduce<number[]>((acc, item, index) => {
      if (item.itemId === rawKey) acc.push(index);
      return acc;
    }, []);
    if (idMatches.length === 1) {
      return remaining.splice(idMatches[0], 1)[0];
    }

    return null;
  };

  (Array.isArray(keys) ? keys : []).forEach(rawKey => {
    if (typeof rawKey !== 'string' || !rawKey) return;
    const item = takeMatchingItem(rawKey);
    if (item) ordered.push(item);
  });

  ordered.push(...remaining);
  return ordered;
}

export function validateCollectionDetails(
  input: CollectionDetailsInput
): CollectionDetailsValidation {
  const rawName = typeof input?.name === 'string' ? input.name : '';
  const rawDescription =
    typeof input?.description === 'string' ? input.description : '';

  const name = rawName.trim().slice(0, COLLECTION_NAME_LIMIT);
  const description = rawDescription.trim().slice(0, COLLECTION_DESCRIPTION_LIMIT);

  if (!name) {
    return {
      ok: false,
      name: '',
      description,
      error: 'Nama koleksi tidak boleh kosong.',
    };
  }

  return { ok: true, name, description };
}

const resolveCollectionPreviewImages = (
  collection: UserCollection,
  media?: CollectionShareMedia
): string[] => {
  if (media?.previewImages && media.previewImages.length > 0) {
    return media.previewImages
      .map(src => (typeof src === 'string' ? src.trim() : ''))
      .filter(Boolean)
      .slice(0, 4);
  }

  const filmsById = new Map<string, string | undefined>(
    (media?.films || []).map(film => [film.id, film.poster] as const)
  );
  const articlesById = new Map<string, string | undefined>(
    (media?.articles || []).map(article => [article.id, article.coverImage] as const)
  );

  const images: string[] = [];
  for (const item of collection.items.slice(0, 4)) {
    let src = '';
    if (item.itemType === 'film') {
      src = filmsById.get(item.itemId) || '';
    } else {
      src = articlesById.get(item.itemId) || '';
    }

    if (!src) {
      const enriched = item as typeof item & {
        poster?: string;
        coverImage?: string;
        image?: string;
      };
      src = enriched.poster || enriched.coverImage || enriched.image || '';
    }

    if (src && src.trim()) images.push(src.trim());
  }

  return images;
};

/**
 * Builds the data consumed by SocialShareModal for a collection. Pass the
 * local films/articles arrays (or pre-computed previewImages) so item ids can
 * be resolved to posters and article covers.
 */
export function buildCollectionShareData(
  collection: UserCollection,
  owner: CollectionShareOwner,
  baseUrl: string,
  media?: CollectionShareMedia
): CollectionShareData {
  const collectionName = (collection.name || '').trim() || 'Koleksi';
  const description = (collection.description || '').trim();
  const resolvedDescription = description || COLLECTION_SHARE_DESCRIPTION_FALLBACK;
  const ownerName = (owner.name || '').trim() || 'Pengguna Sotoy';
  const previewImages = resolveCollectionPreviewImages(collection, media);
  const cleanBaseUrl = (baseUrl || '').replace(/\/+$/, '');
  const url = `${cleanBaseUrl}/koleksi/${encodeURIComponent(owner.id)}/${encodeURIComponent(collection.id)}`;
  const itemCount = Array.isArray(collection.items) ? collection.items.length : 0;
  const isPublic = collection.isPublic !== false;

  return {
    title: collectionName,
    text: resolvedDescription,
    description: resolvedDescription,
    url,
    type: 'collection',
    image: previewImages[0],
    meta: `${itemCount} judul • ${ownerName}`,
    authorName: ownerName,
    itemCount,
    ownerName,
    previewImages,
    isPublic,
    collectionId: collection.id,
    collectionName,
    collectionDescription: description,
    collectionItemCount: itemCount,
    collectionOwnerId: owner.id,
    collectionOwnerName: ownerName,
    collectionPreviewImages: previewImages,
    collectionIsPublic: isPublic,
  };
}
