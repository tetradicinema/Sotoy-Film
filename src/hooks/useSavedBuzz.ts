import { useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import {
  getMissingBuzzIds,
  resolveSavedBuzzEntries,
  sortSavedBuzzPointers,
  type SavedBuzzEntry,
  type SavedBuzzPointer,
} from '../utils/savedBuzz';
import type { BuzzPost } from '../types';

const normalizeAddedAt = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value || undefined;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }

  if (value && typeof value === 'object') {
    const timestamp = value as {
      toDate?: () => Date;
      seconds?: number;
      nanoseconds?: number;
    };

    if (typeof timestamp.toDate === 'function') {
      try {
        const date = timestamp.toDate();
        return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
      } catch (err) {
        console.warn('[SavedBuzz] Could not normalize timestamp:', err);
      }
    }

    if (typeof timestamp.seconds === 'number') {
      const date = new Date(timestamp.seconds * 1000);
      return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
    }
  }

  return undefined;
};

/**
 * Lists the signed-in user's saved Buzz pointers, using the loaded feed as a
 * fast path and fetching only older/unknown Buzz documents individually.
 */
export function useSavedBuzz(uid?: string | null) {
  const { buzzList } = useApp();
  const [pointers, setPointers] = useState<SavedBuzzPointer[]>([]);
  const [fetchedPosts, setFetchedPosts] = useState<BuzzPost[]>([]);
  const [loadingPointers, setLoadingPointers] = useState(false);
  const [loadingFetched, setLoadingFetched] = useState(false);
  const knownPostsRef = useRef<BuzzPost[]>(buzzList);

  useEffect(() => {
    knownPostsRef.current = buzzList;
  }, [buzzList]);

  const pointerSignature = useMemo(
    () => pointers.map((pointer) => pointer.buzzId).join('|'),
    [pointers]
  );

  const knownIdSignature = useMemo(() => {
    const ids = new Set(
      buzzList
        .map((post) => (post && typeof post.id === 'string' ? post.id : null))
        .filter((id): id is string => Boolean(id))
    );
    return Array.from(ids).sort().join('|');
  }, [buzzList]);

  useEffect(() => {
    if (!uid) {
      setPointers([]);
      setFetchedPosts([]);
      setLoadingPointers(false);
      setLoadingFetched(false);
      return;
    }

    let cancelled = false;
    setPointers([]);
    setFetchedPosts([]);
    setLoadingPointers(true);

    const unsubscribe = onSnapshot(
      collection(db, 'users', uid, 'savedBuzz'),
      (snapshot) => {
        if (cancelled) return;

        const nextPointers: SavedBuzzPointer[] = [];
        snapshot.forEach((pointerDoc) => {
          const data = pointerDoc.data() as { buzzId?: unknown; addedAt?: unknown };
          const rawBuzzId =
            typeof data.buzzId === 'string' && data.buzzId.trim()
              ? data.buzzId.trim()
              : pointerDoc.id;

          if (!rawBuzzId) return;

          nextPointers.push({
            buzzId: rawBuzzId,
            addedAt: normalizeAddedAt(data.addedAt),
          });
        });

        setPointers(sortSavedBuzzPointers(nextPointers));
        setLoadingPointers(false);
      },
      (err) => {
        console.error('[SavedBuzz] Subscription failed:', err);
        if (cancelled) return;
        setPointers([]);
        setLoadingPointers(false);
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [uid]);

  useEffect(() => {
    if (!uid) {
      setFetchedPosts([]);
      setLoadingFetched(false);
      return;
    }

    let cancelled = false;
    const missingIds = getMissingBuzzIds(pointers, knownPostsRef.current);

    if (missingIds.length === 0) {
      setFetchedPosts([]);
      setLoadingFetched(false);
      return;
    }

    setLoadingFetched(true);

    void Promise.all(
      missingIds.map(async (buzzId) => {
        try {
          const snapshot = await getDoc(doc(db, 'buzz', buzzId));
          if (!snapshot.exists()) return null;

          const data = snapshot.data() as BuzzPost;
          return {
            ...data,
            id: data.id || buzzId,
          } as BuzzPost;
        } catch (err) {
          console.warn(`[SavedBuzz] Could not fetch Buzz ${buzzId}:`, err);
          return null;
        }
      })
    )
      .then((posts) => {
        if (cancelled) return;
        setFetchedPosts(posts.filter((post): post is BuzzPost => Boolean(post)));
      })
      .catch((err) => {
        console.error('[SavedBuzz] Could not resolve saved Buzz:', err);
        if (cancelled) return;
        setFetchedPosts([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingFetched(false);
      });

    return () => {
      cancelled = true;
    };
  }, [uid, pointerSignature, knownIdSignature]);

  const entries = useMemo<SavedBuzzEntry[]>(
    () => resolveSavedBuzzEntries(pointers, buzzList, fetchedPosts),
    [pointers, buzzList, fetchedPosts]
  );

  return {
    entries,
    loading: loadingPointers || loadingFetched,
    count: pointers.length,
  };
}
