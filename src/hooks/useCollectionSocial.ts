import { useCallback, useEffect, useRef, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import {
  applyOptimisticLike,
  buildLikeId,
  buildSavedKey,
  canInteractWithCollection,
} from '../utils/collectionSocial';
import type { SavedCollectionPointer, UserCollection } from '../types';

export interface UseCollectionSocialOptions {
  ownerId?: string | null;
  collectionId?: string | null;
  isPublic?: boolean;
}

export interface UseCollectionSocialResult {
  likeCount: number;
  liked: boolean;
  saved: boolean;
  loading: boolean;
  likePending: boolean;
  savePending: boolean;
  toggleLike: () => Promise<void>;
  toggleSave: () => Promise<void>;
  refresh: () => void;
}

interface SocialState {
  likeCount: number;
  liked: boolean;
  saved: boolean;
  loading: boolean;
}

export interface SavedCollectionEntry extends SavedCollectionPointer {
  key: string;
  ownerName: string;
  collection: UserCollection | null;
  status: 'loading' | 'available' | 'unavailable';
}

const readLikeCount = async (
  ownerId: string,
  collectionId: string
): Promise<number | null> => {
  try {
    const snapshot = await getCountFromServer(
      query(
        collection(db, 'collectionLikes'),
        where('ownerId', '==', ownerId),
        where('collectionId', '==', collectionId)
      )
    );
    return Math.max(0, snapshot.data().count);
  } catch (err) {
    console.warn('[CollectionSocial] Could not read like count:', err);
    return null;
  }
};

const guestMessage = (action: 'like' | 'save') =>
  action === 'like'
    ? 'Silakan masuk terlebih dahulu untuk menyukai koleksi.'
    : 'Silakan masuk terlebih dahulu untuk menyimpan koleksi.';

/**
 * Firestore-backed social state for a single collection. Every read/write is
 * guarded so a denied request can never throw into React render.
 */
export function useCollectionSocial({
  ownerId,
  collectionId,
  isPublic,
}: UseCollectionSocialOptions): UseCollectionSocialResult {
  const { currentUser, isLoggedIn, setLoginModalOpen, showToast } = useApp();
  const [state, setState] = useState<SocialState>({
    likeCount: 0,
    liked: false,
    saved: false,
    loading: false,
  });
  const [refreshToken, setRefreshToken] = useState(0);
  const [likePending, setLikePending] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const stateRef = useRef(state);
  const likeBusyRef = useRef(false);
  const saveBusyRef = useRef(false);
  const viewerId = isLoggedIn && currentUser?.id && currentUser.id !== 'guest'
    ? currentUser.id
    : null;

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let cancelled = false;

    if (!ownerId || !collectionId) {
      setState({ likeCount: 0, liked: false, saved: false, loading: false });
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));

    const load = async () => {
      const count = await readLikeCount(ownerId, collectionId);
      let liked = false;
      let saved = false;

      if (viewerId) {
        if (viewerId !== ownerId) {
          try {
            const likeSnap = await getDoc(
              doc(db, 'collectionLikes', buildLikeId(ownerId, collectionId, viewerId))
            );
            liked = likeSnap.exists();
          } catch (err) {
            console.warn('[CollectionSocial] Could not read my like:', err);
          }
        }

        try {
          const savedSnap = await getDoc(
            doc(db, 'users', viewerId, 'savedCollections', buildSavedKey(ownerId, collectionId))
          );
          saved = savedSnap.exists();
        } catch (err) {
          console.warn('[CollectionSocial] Could not read saved pointer:', err);
        }
      }

      if (cancelled) return;
      setState({
        likeCount: count ?? 0,
        liked,
        saved,
        loading: false,
      });
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [ownerId, collectionId, viewerId, refreshToken]);

  const toggleLike = useCallback(async () => {
    if (!ownerId || !collectionId || likeBusyRef.current) return;

    const interaction = canInteractWithCollection({
      isLoggedIn: Boolean(viewerId),
      viewerId,
      ownerId,
      isPublic,
    });

    if (interaction.reason === 'guest') {
      setLoginModalOpen(true);
      showToast(guestMessage('like'));
      return;
    }

    if (!interaction.canLike) {
      showToast(
        interaction.reason === 'owner'
          ? 'Kamu tidak dapat menyukai koleksi sendiri.'
          : 'Koleksi privat tidak dapat disukai.',
        'error'
      );
      return;
    }

    const before = stateRef.current;
    const next = applyOptimisticLike(before.likeCount, before.liked);
    likeBusyRef.current = true;
    setLikePending(true);
    setState((prev) => ({ ...prev, liked: next.liked, likeCount: next.count }));

    try {
      const likeRef = doc(
        db,
        'collectionLikes',
        buildLikeId(ownerId, collectionId, viewerId as string)
      );

      if (before.liked) {
        await deleteDoc(likeRef);
      } else {
        await setDoc(likeRef, {
          ownerId,
          collectionId,
          uid: viewerId,
          createdAt: serverTimestamp(),
        });
      }

      const latestCount = await readLikeCount(ownerId, collectionId);
      if (latestCount !== null) {
        setState((prev) => ({ ...prev, likeCount: Math.max(0, latestCount) }));
      }
    } catch (err) {
      console.error('[CollectionSocial] Could not toggle like:', err);
      setState((prev) => ({
        ...prev,
        liked: before.liked,
        likeCount: Math.max(0, before.likeCount),
      }));
      showToast('Gagal mengubah suka koleksi.', 'error');
    } finally {
      likeBusyRef.current = false;
      setLikePending(false);
    }
  }, [ownerId, collectionId, viewerId, isPublic, setLoginModalOpen, showToast]);

  const toggleSave = useCallback(async () => {
    if (!ownerId || !collectionId || saveBusyRef.current) return;

    const interaction = canInteractWithCollection({
      isLoggedIn: Boolean(viewerId),
      viewerId,
      ownerId,
      isPublic,
    });

    if (interaction.reason === 'guest') {
      setLoginModalOpen(true);
      showToast(guestMessage('save'));
      return;
    }

    if (!interaction.canSave) {
      showToast(
        interaction.reason === 'owner'
          ? 'Kamu tidak dapat menyimpan koleksi sendiri.'
          : 'Koleksi privat tidak dapat disimpan.',
        'error'
      );
      return;
    }

    const before = stateRef.current;
    saveBusyRef.current = true;
    setSavePending(true);
    setState((prev) => ({ ...prev, saved: !before.saved }));

    try {
      const key = buildSavedKey(ownerId, collectionId);
      const savedRef = doc(db, 'users', viewerId as string, 'savedCollections', key);

      if (before.saved) {
        await deleteDoc(savedRef);
      } else {
        await setDoc(savedRef, {
          ownerId,
          collectionId,
          savedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error('[CollectionSocial] Could not toggle save:', err);
      setState((prev) => ({ ...prev, saved: before.saved }));
      showToast('Gagal memperbarui koleksi tersimpan.', 'error');
    } finally {
      saveBusyRef.current = false;
      setSavePending(false);
    }
  }, [ownerId, collectionId, viewerId, isPublic, setLoginModalOpen, showToast]);

  const refresh = useCallback(() => {
    setRefreshToken((token) => token + 1);
  }, []);

  return {
    likeCount: Math.max(0, state.likeCount),
    liked: state.liked,
    saved: state.saved,
    loading: state.loading,
    likePending,
    savePending,
    toggleLike,
    toggleSave,
    refresh,
  };
}

/**
 * Subscribes to the signed-in user's saved collection pointers and resolves
 * each pointer with a getDoc. Pointers are never expanded into copied
 * collection documents, so deleted/private targets degrade to "unavailable".
 */
export function useSavedCollections(uid?: string | null) {
  const { showToast } = useApp();
  const showToastRef = useRef(showToast);
  const [entries, setEntries] = useState<SavedCollectionEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  useEffect(() => {
    if (!uid) {
      setEntries([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const unsubscribe = onSnapshot(
      collection(db, 'users', uid, 'savedCollections'),
      (snapshot) => {
        const pointers: Array<SavedCollectionPointer & { key: string }> = [];
        snapshot.forEach((pointerDoc) => {
          const data = pointerDoc.data() as SavedCollectionPointer;
          if (!data.ownerId || !data.collectionId) return;
          pointers.push({ ...data, key: pointerDoc.id });
        });

        const resolveEntry = async (
          pointer: SavedCollectionPointer & { key: string }
        ): Promise<SavedCollectionEntry> => {
          let collection: UserCollection | null = null;
          let ownerName = pointer.ownerId;

          const [collectionSnap, ownerSnap] = await Promise.all([
            getDoc(doc(db, 'users', pointer.ownerId, 'collections', pointer.collectionId)).catch(
              (err) => {
                console.warn('[CollectionSocial] Saved collection unavailable:', err);
                return null;
              }
            ),
            getDoc(doc(db, 'users', pointer.ownerId)).catch((err) => {
              console.warn('[CollectionSocial] Saved collection owner unavailable:', err);
              return null;
            }),
          ]);

          if (collectionSnap?.exists()) {
            const data = collectionSnap.data() as UserCollection;
            if (data.isPublic !== false) {
              collection = {
                ...data,
                id: data.id || pointer.collectionId,
                items: Array.isArray(data.items) ? data.items : [],
              };
            }
          }

          if (ownerSnap?.exists()) {
            const ownerData = ownerSnap.data() as { name?: string };
            if (typeof ownerData.name === 'string' && ownerData.name.trim()) {
              ownerName = ownerData.name;
            }
          }

          return {
            ...pointer,
            ownerName,
            collection,
            status: collection ? 'available' : 'unavailable',
          };
        };

        void Promise.all(pointers.map(resolveEntry))
          .then((resolved) => {
            if (cancelled) return;
            setEntries(resolved);
            setLoading(false);
          })
          .catch((err) => {
            console.error('[CollectionSocial] Could not resolve saved collections:', err);
            if (cancelled) return;
            setEntries([]);
            setLoading(false);
            showToastRef.current('Gagal memuat koleksi tersimpan.', 'error');
          });
      },
      (err) => {
        console.error('[CollectionSocial] Saved collections subscription failed:', err);
        if (cancelled) return;
        setEntries([]);
        setLoading(false);
        showToastRef.current('Gagal memuat koleksi tersimpan.', 'error');
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [uid]);

  const removeSaved = useCallback(
    async (key: string): Promise<boolean> => {
      if (!uid) return false;

      const previous = entries;
      setEntries((prev) => prev.filter((entry) => entry.key !== key));

      try {
        await deleteDoc(doc(db, 'users', uid, 'savedCollections', key));
        return true;
      } catch (err) {
        console.error('[CollectionSocial] Could not remove saved pointer:', err);
        setEntries(previous);
        showToastRef.current('Gagal menghapus koleksi tersimpan.', 'error');
        return false;
      }
    },
    [uid, entries]
  );

  return { entries, loading, removeSaved };
}
