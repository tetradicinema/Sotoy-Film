import type { BuzzPost } from '../types';

export interface SavedBuzzPointer {
  buzzId: string;
  addedAt?: string;
}

export interface SavedBuzzEntry {
  buzzId: string;
  addedAt?: string;
  status: 'available' | 'unavailable';
  post: BuzzPost | null;
}

const normalizedBuzzId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const validTimestamp = (value?: string): number | null => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
};

/**
 * Newest saved Buzz first. Missing or invalid timestamps go last, and ties keep
 * their original pointer order.
 */
export function sortSavedBuzzPointers(
  pointers: SavedBuzzPointer[]
): SavedBuzzPointer[] {
  return pointers
    .map((pointer, index) => ({
      pointer,
      index,
      timestamp: validTimestamp(pointer.addedAt),
    }))
    .sort((a, b) => {
      if (a.timestamp !== null && b.timestamp !== null) {
        return b.timestamp - a.timestamp || a.index - b.index;
      }
      if (a.timestamp !== null) return -1;
      if (b.timestamp !== null) return 1;
      return a.index - b.index;
    })
    .map(({ pointer }) => pointer);
}

/**
 * Resolves pointers against the posts already loaded by the app and any posts
 * fetched specifically for older saved Buzz. Unknown or deleted posts become
 * explicit unavailable entries so the UI can still offer removal.
 */
export function resolveSavedBuzzEntries(
  pointers: SavedBuzzPointer[],
  knownPosts: BuzzPost[],
  fetchedPosts: BuzzPost[]
): SavedBuzzEntry[] {
  const knownById = new Map<string, BuzzPost>();
  const fetchedById = new Map<string, BuzzPost>();

  knownPosts.forEach((post) => {
    if (post && typeof post.id === 'string' && !knownById.has(post.id)) {
      knownById.set(post.id, post);
    }
  });

  fetchedPosts.forEach((post) => {
    if (post && typeof post.id === 'string' && !fetchedById.has(post.id)) {
      fetchedById.set(post.id, post);
    }
  });

  const seen = new Set<string>();
  const entries: SavedBuzzEntry[] = [];

  pointers.forEach((pointer) => {
    const buzzId = normalizedBuzzId(pointer.buzzId);
    if (!buzzId || seen.has(buzzId)) return;
    seen.add(buzzId);

    const post = knownById.get(buzzId) || fetchedById.get(buzzId) || null;

    entries.push({
      buzzId,
      addedAt: pointer.addedAt,
      status: post ? 'available' : 'unavailable',
      post,
    });
  });

  return entries;
}

/**
 * IDs that must be fetched because the app's known Buzz list does not contain
 * them. The result is unique and preserves pointer order.
 */
export function getMissingBuzzIds(
  pointers: SavedBuzzPointer[],
  knownPosts: BuzzPost[]
): string[] {
  const knownIds = new Set(
    knownPosts
      .map((post) => (post && typeof post.id === 'string' ? post.id : null))
      .filter((id): id is string => Boolean(id))
  );

  const seen = new Set<string>();
  const missing: string[] = [];

  pointers.forEach((pointer) => {
    const buzzId = normalizedBuzzId(pointer.buzzId);
    if (!buzzId || knownIds.has(buzzId) || seen.has(buzzId)) return;
    seen.add(buzzId);
    missing.push(buzzId);
  });

  return missing;
}

/**
 * Short, single-line-ish preview for compact saved Buzz cards.
 */
export function getBuzzExcerpt(content: string, maxLength: number): string {
  const collapsed = (content || '').replace(/\s+/g, ' ').trim();
  if (!collapsed) return '';

  const limit = Math.floor(Number.isFinite(maxLength) ? maxLength : 0);
  if (limit <= 0) return '';
  if (collapsed.length <= limit) return collapsed;

  let cut = collapsed.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > 0) {
    cut = cut.slice(0, lastSpace);
  }

  return `${cut.trimEnd()}…`;
}
