import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useApp } from '../../context/AppContext';
import {
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Edit3,
  FileText,
  Film as FilmIcon,
  GripVertical,
  Heart,
  Layers,
  Loader2,
  Lock,
  Share2,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  buildCollectionShareData,
  getCollectionItemKey,
  moveItem,
  validateCollectionDetails,
} from '../../utils/collectionHelpers';
import { getWallLayout } from '../../utils/collectionShareLayout';
import {
  resolveCollectionAvailability,
  type CollectionSnapshotData,
} from '../../utils/collectionSocial';
import { useCollectionSocial } from '../../hooks/useCollectionSocial';
import type { CollectionItem, UserCollection } from '../../types';

type SharedCollectionSnapshot = CollectionSnapshotData;

interface CollectionWallTile {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SortableCollectionCardProps {
  itemKey: string;
  index: number;
  total: number;
  isReorderMode: boolean;
  onMove: (index: number, direction: 'up' | 'down') => void;
  children: React.ReactNode;
}

const COLLAGE_SIZE = 144;
const COLLAGE_GUTTER = 4;

const getInitials = (name?: string): string => {
  const words = (name || 'Koleksi')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (words.length === 0) return 'K';
  return words.map((word) => word.charAt(0).toUpperCase()).join('');
};

const formatFilmType = (type: string): string => {
  if (type === 'series') return 'Series';
  if (type === 'animation' || type === 'anime') return 'Animasi';
  return 'Film';
};

const getYearLabel = (value?: string): string => {
  if (!value) return '';
  const year = new Date(value).getFullYear();
  return Number.isFinite(year) ? String(year) : '';
};

const CollageTile: React.FC<{ image?: string; tile: CollectionWallTile }> = ({
  image,
  tile,
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [image]);

  const style: React.CSSProperties = {
    left: `${tile.x}px`,
    top: `${tile.y}px`,
    width: `${tile.width}px`,
    height: `${tile.height}px`,
  };

  if (!image || failed) {
    return <div className="absolute bg-[#00F0FF]" style={style} aria-hidden="true" />;
  }

  return (
    <img
      src={image}
      alt=""
      loading="lazy"
      className="absolute object-cover"
      style={style}
      onError={() => setFailed(true)}
    />
  );
};

const CollectionCollage: React.FC<{
  images: string[];
  name?: string;
  itemCount: number;
}> = ({ images, name, itemCount }) => {
  if (itemCount === 0) {
    return (
      <div className="w-36 h-36 rounded-2xl bg-[#FF2E7E] flex items-center justify-center shrink-0">
        <span className="font-display font-black text-3xl text-black tracking-tight">
          {getInitials(name)}
        </span>
      </div>
    );
  }

  const layoutCount = Math.min(Math.max(images.length, 1), 4);
  const tiles = getWallLayout(layoutCount, COLLAGE_SIZE, COLLAGE_GUTTER, COLLAGE_SIZE);

  return (
    <div
      className="relative w-36 h-36 rounded-2xl overflow-hidden bg-[#0A0A0A] shrink-0"
      aria-label="Kolase poster koleksi"
    >
      {tiles.map((tile, index) => (
        <CollageTile key={`${tile.x}-${tile.y}-${index}`} image={images[index]} tile={tile} />
      ))}
    </div>
  );
};

const SortableCollectionCard: React.FC<SortableCollectionCardProps> = ({
  itemKey,
  index,
  total,
  isReorderMode,
  onMove,
  children,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: itemKey });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : 1,
    opacity: isDragging ? 0.65 : 1,
  };

  const controlButtonClass =
    'w-8 h-8 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:border-[#FF2E7E] disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center transition-colors';

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {children}

      {isReorderMode && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950/95 px-2 py-1.5 shadow-xl">
          <button
            type="button"
            onClick={() => onMove(index, 'up')}
            disabled={index === 0}
            className={controlButtonClass}
            aria-label="Naikkan item"
            title="Naikkan item"
          >
            <ChevronUp className="w-4 h-4" />
          </button>

          <button
            type="button"
            {...attributes}
            {...listeners}
            className={`${controlButtonClass} cursor-grab active:cursor-grabbing touch-none`}
            aria-label="Tarik untuk mengatur urutan"
            title="Tarik untuk mengatur urutan"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onMove(index, 'down')}
            disabled={index === total - 1}
            className={controlButtonClass}
            aria-label="Turunkan item"
            title="Turunkan item"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export const CollectionDetailPage: React.FC = () => {
  const { userId, collectionId } = useParams<{ userId: string; collectionId: string }>();
  const {
    currentUser,
    isLoggedIn,
    collections,
    films,
    articles,
    updateCollectionDetails,
    reorderCollectionItems,
    removeItemFromCollection,
    openShareModal,
    getUserById,
    navigateTo,
    showToast,
  } = useApp();

  const isOwner = isLoggedIn && currentUser?.id === userId;

  const [liveCollection, setLiveCollection] = useState<UserCollection | null>(null);
  const [liveReadState, setLiveReadState] = useState<'loading' | 'ready' | 'fallback'>(
    isOwner ? 'ready' : 'loading'
  );
  const [sharedSnapshot, setSharedSnapshot] = useState<SharedCollectionSnapshot | null>(null);
  const [snapshotReadState, setSnapshotReadState] = useState<
    'idle' | 'loading' | 'ready' | 'unavailable'
  >('idle');

  const [isEditingDetails, setIsEditingDetails] = useState<boolean>(false);
  const [editNameValue, setEditNameValue] = useState<string>('');
  const [editDescValue, setEditDescValue] = useState<string>('');

  const [isReordering, setIsReordering] = useState<boolean>(false);
  const [isSavingOrder, setIsSavingOrder] = useState<boolean>(false);
  const [orderedItems, setOrderedItems] = useState<CollectionItem[]>([]);

  const myCollection = isOwner ? collections.find((c) => c.id === collectionId) || null : null;

  const availability = useMemo(
    () =>
      isOwner
        ? { source: 'live' as const, collection: myCollection }
        : resolveCollectionAvailability({
            liveCollection,
            snapshot: sharedSnapshot,
            ownerId: userId,
            collectionId,
          }),
    [isOwner, myCollection, liveCollection, sharedSnapshot, userId, collectionId]
  );

  const collectionForDisplay = isOwner ? myCollection : availability.collection;

  const collectionName = collectionForDisplay?.name || 'Koleksi';
  const collectionDesc = collectionForDisplay?.description || '';
  const isDefault = isOwner ? Boolean(myCollection?.isDefault) : false;
  const descriptionText = collectionDesc.trim();

  const itemsList = useMemo<CollectionItem[]>(
    () => collectionForDisplay?.items || [],
    [collectionForDisplay]
  );

  const itemCount = useMemo(() => {
    if (itemsList.length > 0) return itemsList.length;
    if (!isOwner && sharedSnapshot?.itemCount) {
      return Math.max(0, sharedSnapshot.itemCount);
    }
    return 0;
  }, [itemsList.length, isOwner, sharedSnapshot?.itemCount]);

  const displayItems = isReordering ? orderedItems : itemsList;

  const ownerUser = userId ? getUserById(userId) : undefined;
  const ownerName =
    ownerUser?.name || (isOwner ? currentUser?.name : '') || 'Pengguna Sotoy';
  const ownerAvatar =
    ownerUser?.avatar?.trim() || (isOwner ? currentUser?.avatar?.trim() : '') || '';

  const social = useCollectionSocial({
    ownerId: userId,
    collectionId,
    isPublic: collectionForDisplay?.isPublic !== false,
  });

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Visitors read the real collection first. A denied/missing read falls back
  // to the existing Buzz snapshot so privately shared collections still work.
  useEffect(() => {
    if (isOwner || !userId || !collectionId) {
      setLiveCollection(null);
      setLiveReadState('ready');
      setSharedSnapshot(null);
      setSnapshotReadState('idle');
      return;
    }

    let active = true;
    setLiveCollection(null);
    setSharedSnapshot(null);
    setLiveReadState('loading');
    setSnapshotReadState('idle');

    const unsubscribe = onSnapshot(
      doc(db, 'users', userId, 'collections', collectionId),
      (snapshot) => {
        if (!active) return;

        if (!snapshot.exists()) {
          setLiveCollection(null);
          setLiveReadState('fallback');
          return;
        }

        const data = snapshot.data() as UserCollection;
        setLiveCollection({
          ...data,
          id: data.id || collectionId,
          items: Array.isArray(data.items) ? data.items : [],
        });
        setLiveReadState('ready');
      },
      (err) => {
        if (!active) return;
        console.warn('[CollectionDetail] Live collection read unavailable:', err);
        const code = (err as { code?: string } | null)?.code;
        setLiveCollection(null);
        // Only a denied or missing document should fall back to Buzz. Any
        // other read failure leaves the page in the explicit unavailable state.
        setLiveReadState(
          code === 'permission-denied' || code === 'not-found' ? 'fallback' : 'ready'
        );
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [isOwner, userId, collectionId]);

  useEffect(() => {
    if (isOwner || !userId || !collectionId || liveReadState !== 'fallback') {
      return;
    }

    let active = true;
    setSnapshotReadState('loading');

    const snapshotQuery = query(
      collection(db, 'buzz'),
      where('sharedCollection.collectionId', '==', collectionId)
    );

    const unsubscribe = onSnapshot(
      snapshotQuery,
      (snapshot) => {
        if (!active) return;

        const candidates: SharedCollectionSnapshot[] = [];
        snapshot.forEach((postDoc) => {
          const data = postDoc.data();
          if (data.sharedCollection) {
            candidates.push(data.sharedCollection as SharedCollectionSnapshot);
          }
        });

        const selected =
          candidates.find((candidate) => candidate.ownerId === userId) ||
          candidates[0] ||
          null;

        setSharedSnapshot(selected);
        setSnapshotReadState(selected ? 'ready' : 'unavailable');
      },
      (err) => {
        if (!active) return;
        console.warn('[CollectionDetail] Shared snapshot read unavailable:', err);
        setSharedSnapshot(null);
        setSnapshotReadState('unavailable');
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [isOwner, userId, collectionId, liveReadState]);

  const loadingShared =
    !isOwner &&
    (liveReadState === 'loading' ||
      (liveReadState === 'fallback' &&
        (snapshotReadState === 'idle' || snapshotReadState === 'loading')));

  const collageImages = useMemo(() => {
    if (
      !isOwner &&
      availability.source === 'snapshot' &&
      sharedSnapshot?.previewImages?.length
    ) {
      return sharedSnapshot.previewImages.slice(0, 4);
    }

    return itemsList.slice(0, 4).map((item) => {
      if (item.itemType === 'film') {
        return films.find((film) => film.id === item.itemId)?.poster?.trim() || '';
      }

      return articles.find((article) => article.id === item.itemId)?.coverImage?.trim() || '';
    });
  }, [
    isOwner,
    availability.source,
    sharedSnapshot?.previewImages,
    itemsList,
    films,
    articles,
  ]);

  // Keep the edit form in sync when the collection changes outside edit mode.
  useEffect(() => {
    if (!isEditingDetails) {
      setEditNameValue(collectionName);
      setEditDescValue(collectionDesc);
    }
  }, [collectionName, collectionDesc, isEditingDetails]);

  // Keep the local reorder copy in sync while not actively sorting.
  useEffect(() => {
    if (isOwner && myCollection && !isReordering) {
      setOrderedItems(myCollection.items);
    }
  }, [isOwner, myCollection, isReordering]);

  const openEditDetails = () => {
    setEditNameValue(collectionName);
    setEditDescValue(collectionDesc);
    setIsEditingDetails(true);
  };

  const closeEditDetails = () => {
    setIsEditingDetails(false);
    setEditNameValue(collectionName);
    setEditDescValue(collectionDesc);
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectionId) return;

    const validation = validateCollectionDetails({
      name: isDefault ? collectionName : editNameValue,
      description: editDescValue,
    });

    if (!validation.ok) {
      showToast(validation.error || 'Nama koleksi tidak valid.', 'error');
      return;
    }

    const success = await updateCollectionDetails(collectionId, {
      name: validation.name,
      description: validation.description,
    });

    if (success) {
      setEditNameValue(validation.name);
      setEditDescValue(validation.description);
      setIsEditingDetails(false);
    }
  };

  const handleRemoveItem = async (itemId: string, itemName: string) => {
    if (!collectionId) return;
    if (confirm(`Hapus "${itemName}" dari koleksi ini?`)) {
      await removeItemFromCollection(collectionId, itemId);
    }
  };

  const handleStartReorder = () => {
    if (!isOwner || itemsList.length < 2) return;
    setOrderedItems(itemsList);
    setIsReordering(true);
  };

  const handleExitReorder = async () => {
    if (!collectionId) {
      setIsReordering(false);
      return;
    }

    const originalKeys = itemsList.map(getCollectionItemKey);
    const nextKeys = orderedItems.map(getCollectionItemKey);
    const changed =
      originalKeys.length !== nextKeys.length ||
      originalKeys.some((key, index) => key !== nextKeys[index]);

    if (!changed) {
      setIsReordering(false);
      return;
    }

    setIsSavingOrder(true);
    const success = await reorderCollectionItems(collectionId, nextKeys);
    setIsSavingOrder(false);
    setIsReordering(false);

    if (success) {
      showToast('Urutan koleksi berhasil disimpan.', 'success');
    }
  };

  const handleMoveOrder = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= orderedItems.length) return;
    setOrderedItems((prev) => moveItem(prev, index, targetIndex));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedItems.findIndex(
      (item) => getCollectionItemKey(item) === String(active.id)
    );
    const newIndex = orderedItems.findIndex(
      (item) => getCollectionItemKey(item) === String(over.id)
    );
    if (oldIndex === -1 || newIndex === -1) return;

    setOrderedItems((prev) => moveItem(prev, oldIndex, newIndex));
  };

  const handleOpenShare = () => {
    if (!userId || !collectionForDisplay) return;

    openShareModal(
      buildCollectionShareData(
        collectionForDisplay,
        { id: userId, name: ownerName },
        typeof window !== 'undefined'
          ? window.location.origin
          : 'https://www.sotoyfilm.my.id',
        {
          films,
          articles,
          previewImages:
            !isOwner && availability.source === 'snapshot'
              ? sharedSnapshot?.previewImages
              : undefined,
        }
      )
    );
  };

  if (loadingShared) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-[#FF2E7E] border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-xs font-bold">Memuat Detail Koleksi...</p>
      </div>
    );
  }

  if (!collectionForDisplay) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-slate-500 mx-auto border border-slate-800">
          <Lock className="w-6 h-6 text-slate-400" />
        </div>
        <div className="space-y-2">
          <h2 className="font-display font-black text-xl text-white">Koleksi Tidak Tersedia</h2>
          <p className="text-slate-400 text-xs leading-relaxed">
            Koleksi ini privat atau sudah dihapus.
          </p>
        </div>
        <button
          onClick={() =>
            navigateTo('user-profile', {
              userId: userId || currentUser?.id,
            })
          }
          className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs transition-colors border border-slate-800"
        >
          Kembali ke Profil
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      <button
        onClick={() => navigateTo('user-profile', { userId })}
        className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-xs font-bold bg-slate-900/50 hover:bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Kembali ke Profil</span>
      </button>

      <div className="bg-[#171717] border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row gap-5 items-start">
          <CollectionCollage images={collageImages} name={collectionName} itemCount={itemCount} />

          <div className="min-w-0 flex-1 space-y-3 w-full">
            <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase font-black tracking-[0.18em] text-slate-400">
              <span className="text-[#FF2E7E]">KOLEKSI</span>
              <span className="text-slate-600">•</span>
              <span>{itemCount} item</span>
              {isDefault && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="bg-[#FF2E7E] text-black px-2 py-0.5 rounded text-[9px] font-black tracking-normal">
                    Daftar Utama
                  </span>
                </>
              )}
            </div>

            {isEditingDetails ? (
              <form onSubmit={handleSaveDetails} className="space-y-3 max-w-lg w-full text-left">
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <label
                      htmlFor="collection-name-input"
                      className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400"
                    >
                      Nama koleksi
                    </label>
                    <span className="text-[10px] font-bold text-slate-500">
                      {(isDefault ? collectionName : editNameValue).length}/40
                    </span>
                  </div>
                  <input
                    id="collection-name-input"
                    type="text"
                    value={isDefault ? collectionName : editNameValue}
                    onChange={(e) => setEditNameValue(e.target.value)}
                    maxLength={40}
                    disabled={isDefault}
                    className="w-full px-3.5 py-2 text-sm bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-[#FF2E7E] font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                    autoFocus={!isDefault}
                  />
                  {isDefault && (
                    <p className="text-[10px] text-slate-500">
                      Nama daftar utama tidak dapat diubah.
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <label
                      htmlFor="collection-description-input"
                      className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400"
                    >
                      Deskripsi
                    </label>
                    <span className="text-[10px] font-bold text-slate-500">
                      {editDescValue.length}/300
                    </span>
                  </div>
                  <textarea
                    id="collection-description-input"
                    value={editDescValue}
                    onChange={(e) => setEditDescValue(e.target.value)}
                    maxLength={300}
                    rows={3}
                    placeholder="Tulis deskripsi singkat koleksi ini..."
                    className="w-full max-w-full box-border px-3.5 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-white resize-none focus:outline-none focus:border-[#FF2E7E]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-xl bg-[#FF2E7E] hover:bg-[#E0246F] text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Simpan</span>
                  </button>
                  <button
                    type="button"
                    onClick={closeEditDetails}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Batal</span>
                  </button>
                </div>
              </form>
            ) : (
              <>
                <h1 className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight leading-tight break-words">
                  {collectionName}
                </h1>

                {descriptionText ? (
                  <p className="text-slate-400 text-xs sm:text-sm max-w-2xl leading-relaxed line-clamp-3">
                    {descriptionText}
                  </p>
                ) : isOwner ? (
                  <button
                    type="button"
                    onClick={openEditDetails}
                    className="text-slate-500 hover:text-[#FF2E7E] text-xs font-bold transition-colors"
                  >
                    Tambah deskripsi
                  </button>
                ) : null}
              </>
            )}

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => navigateTo('user-profile', { userId: userId || currentUser?.id })}
                className="flex items-center gap-2 min-w-0 text-left group"
                aria-label={`Lihat profil ${ownerName}`}
              >
                {ownerAvatar ? (
                  <img
                    src={ownerAvatar}
                    alt=""
                    className="w-6 h-6 rounded-full object-cover border border-slate-700"
                  />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-black text-slate-300">
                    {getInitials(ownerName)}
                  </span>
                )}
                <span className="text-xs font-bold text-slate-300 group-hover:text-[#FF2E7E] transition-colors truncate">
                  {ownerName}
                </span>
              </button>
              <span className="text-slate-600">•</span>
              <span className="text-[11px] font-bold text-slate-500">
                {itemCount} item
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-4 flex flex-wrap items-center gap-2.5">
          {!isOwner && (
            <>
              <button
                type="button"
                onClick={() => void social.toggleLike()}
                disabled={social.likePending}
                aria-pressed={social.liked}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                  social.liked
                    ? 'bg-[#FF2E7E] border-[#FF2E7E] text-white'
                    : 'bg-[#0A0A0A] border-slate-700 text-slate-300 hover:border-[#FF2E7E]'
                }`}
              >
                {social.likePending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Heart className={`w-3.5 h-3.5 ${social.liked ? 'fill-current' : ''}`} />
                )}
                <span>Suka</span>
                <span className="text-[11px] tabular-nums opacity-80">
                  {social.loading ? '...' : social.likeCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => void social.toggleSave()}
                disabled={social.savePending}
                aria-pressed={social.saved}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                  social.saved
                    ? 'bg-[#FFD000]/10 border-[#FFD000]/60 text-[#FFD000]'
                    : 'bg-[#0A0A0A] border-slate-700 text-slate-300 hover:border-[#FFD000]'
                }`}
              >
                {social.savePending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : social.saved ? (
                  <BookmarkCheck className="w-3.5 h-3.5" />
                ) : (
                  <Bookmark className="w-3.5 h-3.5" />
                )}
                <span>{social.saved ? 'Tersimpan' : 'Simpan'}</span>
              </button>
            </>
          )}

          {isOwner && (
            <>
              {!isEditingDetails && (
                <button
                  type="button"
                  onClick={openEditDetails}
                  className="px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-[#0A0A0A] border border-slate-700 text-slate-300 hover:text-white hover:border-[#FF2E7E] transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              )}

              {itemsList.length > 1 && (
                <button
                  type="button"
                  onClick={isReordering ? handleExitReorder : handleStartReorder}
                  disabled={isSavingOrder}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors border disabled:opacity-60 disabled:cursor-not-allowed ${
                    isReordering
                      ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40'
                      : 'bg-[#0A0A0A] hover:bg-slate-900 text-slate-300 border-slate-700'
                  }`}
                >
                  {isReordering ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <GripVertical className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {isSavingOrder
                      ? 'Menyimpan...'
                      : isReordering
                      ? 'Selesai'
                      : 'Atur Urutan'}
                  </span>
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onClick={handleOpenShare}
            className="px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-[#FF2E7E] hover:bg-[#E0246F] text-white transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Bagikan</span>
          </button>

          {isOwner && (
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 px-2">
              <Heart className="w-3.5 h-3.5 text-[#FF2E7E]" />
              <span>{social.loading ? '...' : social.likeCount} suka</span>
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="font-display font-black text-lg text-white">
            Item dalam Koleksi ({itemCount})
          </h2>
          {isOwner && isReordering && (
            <p className="text-[11px] text-slate-400">
              Tarik kartu atau gunakan tombol panah. Urutan disimpan saat selesai.
            </p>
          )}
        </div>

        {itemsList.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/25 rounded-3xl border border-slate-800 flex flex-col items-center justify-center gap-4 max-w-xl mx-auto px-6">
            <Bookmark className="w-12 h-12 text-slate-700" />
            <div className="space-y-1">
              <h4 className="font-display font-bold text-white text-base">Koleksi Masih Kosong</h4>
              <p className="text-slate-400 text-xs max-w-sm leading-relaxed">
                {isOwner
                  ? 'Koleksi ini belum diisi. Jelajahi katalog film atau artikel dan klik tombol simpan untuk menambahkannya di sini!'
                  : 'Koleksi ini belum memiliki item.'}
              </p>
            </div>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={displayItems.map(getCollectionItemKey)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {displayItems.map((item, index) => {
                  const itemKey = getCollectionItemKey(item);

                  if (item.itemType === 'film') {
                    const film = films.find((candidate) => candidate.id === item.itemId);
                    if (!film) return null;

                    const rating = film.criticsSkorSotoy || film.skorSotoy || 0;
                    const synopsis =
                      film.synopsis || (film as { kurasiRedaksi?: string }).kurasiRedaksi || '';

                    return (
                      <SortableCollectionCard
                        key={itemKey}
                        itemKey={itemKey}
                        index={index}
                        total={displayItems.length}
                        isReorderMode={isReordering}
                        onMove={handleMoveOrder}
                      >
                        <div
                          onClick={
                            isReordering
                              ? undefined
                              : () => navigateTo('film-detail', { filmId: film.id })
                          }
                          className={`relative bg-[#171717] border border-slate-800 rounded-2xl p-3 flex gap-3 transition-all duration-200 hover:border-[#FF2E7E]/50 select-none ${
                            isReordering ? 'cursor-default' : 'cursor-pointer'
                          }`}
                        >
                          <div className="w-20 sm:w-24 shrink-0 aspect-[2/3] rounded-xl overflow-hidden bg-[#0A0A0A]">
                            {film.poster?.trim() ? (
                              <img
                                src={film.poster.trim()}
                                alt={film.title}
                                loading="lazy"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-700">
                                <FilmIcon className="w-7 h-7" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5 pr-7">
                            <div className="space-y-1.5">
                              <h3 className="font-display font-black text-sm text-white leading-snug line-clamp-2">
                                {film.title}
                              </h3>

                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-bold text-slate-400">
                                <span>{film.year}</span>
                                <span className="text-slate-600">•</span>
                                <span className="uppercase">{formatFilmType(film.type)}</span>
                                <span className="ml-auto inline-flex items-center gap-1 text-[#FFD000]">
                                  <Star className="w-3 h-3 fill-current" />
                                  <span>{rating.toFixed(1)}</span>
                                  <span className="text-slate-500 font-black">Sotoy</span>
                                </span>
                              </div>

                              <p className="text-slate-400 text-xs leading-relaxed line-clamp-1">
                                {synopsis}
                              </p>
                            </div>
                          </div>

                          {isOwner && !isReordering && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleRemoveItem(film.id, film.title);
                              }}
                              className="absolute top-2 right-2 w-8 h-8 rounded-xl bg-black/80 hover:bg-rose-600 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all z-10"
                              title="Hapus dari Koleksi"
                              aria-label="Hapus dari Koleksi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </SortableCollectionCard>
                    );
                  }

                  if (item.itemType === 'article') {
                    const article = articles.find((candidate) => candidate.id === item.itemId);
                    if (!article) return null;

                    return (
                      <SortableCollectionCard
                        key={itemKey}
                        itemKey={itemKey}
                        index={index}
                        total={displayItems.length}
                        isReorderMode={isReordering}
                        onMove={handleMoveOrder}
                      >
                        <article
                          onClick={
                            isReordering
                              ? undefined
                              : () =>
                                  navigateTo('article-detail', {
                                    articleId: article.id,
                                  })
                          }
                          className={`relative bg-[#171717] border border-slate-800 rounded-2xl p-3 flex gap-3 transition-all duration-200 hover:border-[#FF2E7E]/50 select-none ${
                            isReordering ? 'cursor-default' : 'cursor-pointer'
                          }`}
                        >
                          <div className="w-20 sm:w-24 shrink-0 aspect-[2/3] rounded-xl overflow-hidden bg-[#0A0A0A]">
                            {article.coverImage?.trim() ? (
                              <img
                                src={article.coverImage.trim()}
                                alt={article.title}
                                loading="lazy"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-700">
                                <FileText className="w-7 h-7" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5 pr-7">
                            <div className="space-y-1.5">
                              <h3 className="font-display font-black text-sm text-white leading-snug line-clamp-2">
                                {article.title}
                              </h3>

                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-bold text-slate-400">
                                <span>{getYearLabel(article.publishedAt) || 'Artikel'}</span>
                                <span className="text-slate-600">•</span>
                                <span className="uppercase">{article.subCategory}</span>
                              </div>

                              <p className="text-slate-400 text-xs leading-relaxed line-clamp-1">
                                {article.excerpt}
                              </p>
                            </div>
                          </div>

                          {isOwner && !isReordering && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleRemoveItem(article.id, article.title);
                              }}
                              className="absolute top-2 right-2 w-8 h-8 rounded-xl bg-black/80 hover:bg-rose-600 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all z-10"
                              title="Hapus dari Koleksi"
                              aria-label="Hapus dari Koleksi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </article>
                      </SortableCollectionCard>
                    );
                  }

                  return null;
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
};
