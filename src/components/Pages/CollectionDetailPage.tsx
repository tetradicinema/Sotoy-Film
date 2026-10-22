import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useApp } from '../../context/AppContext';
import {
  Bookmark,
  Share2,
  Trash2,
  Edit3,
  Check,
  X,
  Star,
  ChevronLeft,
  Calendar,
  Layers,
  FileText,
  Film as FilmIcon,
  MessageCircle,
  Clock,
  Lock,
  GripVertical,
  ChevronUp,
  ChevronDown,
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
import type { CollectionItem, UserCollection } from '../../types';

interface SharedCollectionSnapshot {
  collectionId?: string;
  ownerId?: string;
  name?: string;
  description?: string;
  itemCount?: number;
  previewImages?: string[];
  isPublic?: boolean;
  items?: {
    itemId: string;
    itemType: 'film' | 'article';
    addedAt?: string;
  }[];
}

interface SortableCollectionCardProps {
  itemKey: string;
  index: number;
  total: number;
  isReorderMode: boolean;
  onMove: (index: number, direction: 'up' | 'down') => void;
  children: React.ReactNode;
}

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
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950/95 px-2 py-1.5 shadow-xl">
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

  // Local state for non-owner viewing shared snapshots
  const [sharedSnapshot, setSharedSnapshot] = useState<SharedCollectionSnapshot | null>(null);
  const [loadingShared, setLoadingShared] = useState<boolean>(!isOwner);

  // Combined name + description edit state
  const [isEditingDetails, setIsEditingDetails] = useState<boolean>(false);
  const [editNameValue, setEditNameValue] = useState<string>('');
  const [editDescValue, setEditDescValue] = useState<string>('');

  // Owner-only reorder state
  const [isReordering, setIsReordering] = useState<boolean>(false);
  const [isSavingOrder, setIsSavingOrder] = useState<boolean>(false);
  const [orderedItems, setOrderedItems] = useState<CollectionItem[]>([]);

  // Find the live collection if owner
  const myCollection = isOwner ? collections.find((c) => c.id === collectionId) || null : null;

  // Final collection information to display
  const collectionName = isOwner ? myCollection?.name : sharedSnapshot?.name;
  const collectionDesc = isOwner ? myCollection?.description : sharedSnapshot?.description;
  const isDefault = isOwner ? Boolean(myCollection?.isDefault) : false;
  const itemsList = useMemo<CollectionItem[]>(() => {
    if (isOwner) return myCollection?.items || [];
    return (sharedSnapshot?.items || []).map((item) => ({
      itemId: item.itemId,
      itemType: item.itemType,
      addedAt: item.addedAt || '',
    }));
  }, [isOwner, myCollection, sharedSnapshot]);

  const displayItems = isReordering ? orderedItems : itemsList;
  const descriptionText = collectionDesc?.trim() || '';
  const ownerName =
    (isOwner ? currentUser?.name : getUserById(userId || '')?.name) || 'Pengguna Sotoy';

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

  // Fetch shared snapshot if not owner
  useEffect(() => {
    if (isOwner || !collectionId) {
      setLoadingShared(false);
      return;
    }

    setLoadingShared(true);
    const q = query(
      collection(db, 'buzz'),
      where('sharedCollection.collectionId', '==', collectionId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          // Grab the first buzz post sharing this collection
          const post = snapshot.docs[0].data();
          setSharedSnapshot((post.sharedCollection || null) as SharedCollectionSnapshot | null);
        } else {
          setSharedSnapshot(null);
        }
        setLoadingShared(false);
      },
      (err) => {
        console.error('[CollectionDetail] Error loading shared snapshot:', err);
        setLoadingShared(false);
      }
    );

    return () => unsubscribe();
  }, [collectionId, isOwner]);

  // Keep the edit form in sync when the collection changes outside edit mode.
  useEffect(() => {
    if (!isEditingDetails) {
      setEditNameValue(collectionName || '');
      setEditDescValue(collectionDesc || '');
    }
  }, [collectionName, collectionDesc, isEditingDetails]);

  // Keep the local reorder copy in sync while not actively sorting.
  useEffect(() => {
    if (isOwner && myCollection && !isReordering) {
      setOrderedItems(myCollection.items);
    }
  }, [isOwner, myCollection, isReordering]);

  const openEditDetails = () => {
    setEditNameValue(collectionName || '');
    setEditDescValue(collectionDesc || '');
    setIsEditingDetails(true);
  };

  const closeEditDetails = () => {
    setIsEditingDetails(false);
    setEditNameValue(collectionName || '');
    setEditDescValue(collectionDesc || '');
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectionId) return;

    const validation = validateCollectionDetails({
      name: isDefault ? collectionName || '' : editNameValue,
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
    if (!userId) return;

    let shareCollection: UserCollection | null = null;
    if (isOwner) {
      shareCollection = myCollection;
    } else if (sharedSnapshot) {
      shareCollection = {
        id: sharedSnapshot.collectionId || collectionId || '',
        name: sharedSnapshot.name || 'Koleksi',
        description: sharedSnapshot.description || '',
        isDefault: false,
        isPublic: sharedSnapshot.isPublic !== false,
        items: (sharedSnapshot.items || []).map((item) => ({
          itemId: item.itemId,
          itemType: item.itemType,
          addedAt: item.addedAt || '',
        })),
        createdAt: '',
        updatedAt: '',
      };
    }

    if (!shareCollection) return;

    openShareModal(
      buildCollectionShareData(
        shareCollection,
        { id: userId, name: ownerName },
        typeof window !== 'undefined'
          ? window.location.origin
          : 'https://www.sotoyfilm.my.id',
        {
          films,
          articles,
          previewImages: isOwner ? undefined : sharedSnapshot?.previewImages,
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

  // If collection not found or not owner & no shared snapshot exists
  if ((isOwner && !myCollection) || (!isOwner && !sharedSnapshot)) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-slate-500 mx-auto border border-slate-800">
          <Lock className="w-6 h-6 text-slate-400" />
        </div>
        <div className="space-y-2">
          <h2 className="font-display font-black text-xl text-white">Koleksi Tidak Dapat Diakses</h2>
          <p className="text-slate-400 text-xs leading-relaxed">
            Koleksi ini bersifat pribadi dan hanya dapat dibaca oleh pemiliknya, atau telah dihapus. Koleksi pribadi hanya dapat diakses orang lain jika dibagikan ke forum <strong>Buzz</strong>.
          </p>
        </div>
        <button
          onClick={() => navigateTo('community-feed')}
          className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs transition-colors border border-slate-850"
        >
          Kembali ke Forum Komunitas
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Back button */}
      <button
        onClick={() => navigateTo('user-profile', { userId })}
        className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-xs font-bold bg-slate-900/50 hover:bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-850"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Kembali ke Profil</span>
      </button>

      {/* Playlist-style Header */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row gap-6 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row items-center gap-6 w-full md:w-auto">
          {/* Cover Art Collage Placeholder */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-[#FF2E7E]/10 border border-[#FF2E7E]/20 flex items-center justify-center text-[#FF2E7E] shrink-0 shadow-lg">
            <Layers className="w-8 h-8" />
          </div>

          <div className="space-y-2 text-center sm:text-left w-full">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
              <span>{isOwner ? 'Koleksi Pribadi' : 'Koleksi Berbagi'}</span>
              <span>•</span>
              <span className="text-[#FF2E7E]">{itemsList.length} item</span>
              {isDefault && (
                <>
                  <span>•</span>
                  <span className="bg-[#FF2E7E]/20 text-[#FF2E7E] px-2 py-0.5 rounded border border-[#FF2E7E]/30 text-[9px]">Daftar Utama</span>
                </>
              )}
            </div>

            {isEditingDetails ? (
              <form onSubmit={handleSaveDetails} className="space-y-3 max-w-lg mt-1 w-full text-left">
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="collection-name-input" className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Nama koleksi
                    </label>
                    <span className="text-[10px] font-bold text-slate-500">
                      {(isDefault ? collectionName || '' : editNameValue).length}/40
                    </span>
                  </div>
                  <input
                    id="collection-name-input"
                    type="text"
                    value={isDefault ? collectionName || '' : editNameValue}
                    onChange={(e) => setEditNameValue(e.target.value)}
                    maxLength={40}
                    disabled={isDefault}
                    className="w-full px-3.5 py-2 text-sm bg-slate-850 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-[#FF2E7E] font-bold disabled:opacity-60 disabled:cursor-not-allowed"
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
                    <label htmlFor="collection-description-input" className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
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
                    className="w-full max-w-full box-border px-3.5 py-2 text-xs bg-slate-850 border border-slate-800 rounded-xl text-white resize-none focus:outline-none focus:border-[#FF2E7E]"
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
                <div className="flex items-center justify-center sm:justify-start gap-2.5">
                  <h1 className="font-display font-black text-xl sm:text-2xl text-white tracking-tight">
                    {collectionName}
                  </h1>
                  {isOwner && (
                    <button
                      onClick={openEditDetails}
                      className="text-slate-500 hover:text-[#FF2E7E] transition-colors p-1"
                      title="Edit nama & deskripsi koleksi"
                      aria-label="Edit nama & deskripsi koleksi"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {descriptionText ? (
                  <p className="text-slate-400 text-xs sm:text-sm max-w-2xl leading-relaxed">
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
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-center md:justify-end border-t border-slate-850/60 md:border-t-0 pt-4 md:pt-0">
          <button
            onClick={handleOpenShare}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-[#FF2E7E] hover:bg-[#E0246F] text-white transition-colors shadow-lg shadow-[#FF2E7E]/25"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Bagikan</span>
          </button>

          {isOwner && itemsList.length > 1 && (
            <button
              onClick={isReordering ? handleExitReorder : handleStartReorder}
              disabled={isSavingOrder}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors border ${
                isReordering
                  ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
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
                  : 'Atur urutan'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of mixed items */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="font-display font-black text-lg text-white">Item dalam Koleksi ({itemsList.length})</h2>
          {isOwner && isReordering && (
            <p className="text-[11px] text-slate-400">
              Tarik kartu atau gunakan tombol panah. Urutan disimpan otomatis saat selesai.
            </p>
          )}
        </div>

        {itemsList.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/25 rounded-3xl border border-slate-850 flex flex-col items-center justify-center gap-4 max-w-xl mx-auto px-6">
            <Bookmark className="w-12 h-12 text-slate-700" />
            <div className="space-y-1">
              <h4 className="font-display font-bold text-white text-base">Koleksi Masih Kosong</h4>
              <p className="text-slate-400 text-xs max-w-sm leading-relaxed">
                {isOwner
                  ? 'Koleksi ini belum diisi. Jelajahi katalog film atau artikel dan klik tombol simpan untuk menambahkannya di sini!'
                  : 'Koleksi snapshot ini tidak memiliki item.'}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {displayItems.map((item, index) => {
                  const itemKey = getCollectionItemKey(item);

                  if (item.itemType === 'film') {
                    const film = films.find((f) => f.id === item.itemId);
                    if (!film) return null;

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
                          className={`bg-[#171717] border border-slate-800 rounded-3xl overflow-hidden transition-all duration-300 flex flex-col hover:border-[#FF2E7E]/40 hover:shadow-xl hover:shadow-black/50 hover:-translate-y-1 select-none relative ${
                            isReordering ? 'cursor-default' : 'cursor-pointer'
                          }`}
                        >
                          {/* Image container */}
                          <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-950">
                            <img
                              src={film.poster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=300&q=80'}
                              alt={film.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              loading="lazy"
                            />
                            <div className="absolute inset-x-0 bottom-0 h-20 bg-[#171717]/85" />

                            {/* Rating Badge */}
                            <div className="absolute top-2 left-2 bg-black/90 backdrop-blur-md px-2 py-0.5 rounded-lg border border-[#FFD000]/30 text-[#FFD000] text-[11px] font-black flex items-center gap-1 shadow-md">
                              <Star className="w-3 h-3 fill-current text-[#FFD000]" />
                              <span>{film.criticsSkorSotoy ? film.criticsSkorSotoy.toFixed(1) : film.skorSotoy.toFixed(1)}</span>
                            </div>

                            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-bold text-slate-300">
                              <span className="bg-slate-900/90 px-1.5 py-0.5 rounded uppercase">{film.type}</span>
                              <span>{film.year}</span>
                            </div>
                          </div>

                          {/* Content info */}
                          <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                            <div>
                              <h3 className="font-display font-black text-sm text-slate-100 group-hover:text-[#FF2E7E] transition-colors line-clamp-1 leading-snug">
                                {film.title}
                              </h3>
                              <p className="text-slate-400 text-xs line-clamp-2 mt-1">
                                {film.synopsis || (film as any).kurasiRedaksi || ''}
                              </p>
                            </div>

                            <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between text-[10px] font-bold">
                              <span className="text-[#FF2E7E]">Skor Sotoy</span>
                              <span className="text-white bg-slate-900/80 px-2 py-0.5 rounded-lg border border-slate-800">
                                {film.skorSotoy.toFixed(1)} / 10.0
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Delete Quick Badge (for Owner, outside reorder mode) */}
                        {isOwner && !isReordering && (
                          <button
                            onClick={() => handleRemoveItem(film.id, film.title)}
                            className="absolute top-2 right-2 w-8 h-8 rounded-xl bg-black/80 hover:bg-rose-600 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center shadow-lg transition-all z-10"
                            title="Hapus dari Koleksi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </SortableCollectionCard>
                    );
                  }

                  if (item.itemType === 'article') {
                    const article = articles.find((a) => a.id === item.itemId);
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
                              : () => navigateTo('article-detail', { articleId: article.id })
                          }
                          className={`bg-[#171717] border border-slate-800 rounded-3xl overflow-hidden hover:border-[#FF2E7E]/60 transition-all duration-300 flex flex-col shadow-lg ${
                            isReordering ? 'cursor-default' : 'cursor-pointer'
                          }`}
                        >
                          <div className="relative h-48 w-full overflow-hidden">
                            <img
                              src={article.coverImage || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80'}
                              alt={article.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-black/10" />
                            <span className="absolute top-3 left-3 bg-[#FF2E7E] text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                              {article.subCategory}
                            </span>
                            <span className="absolute top-3 right-3 bg-black/80 backdrop-blur text-pink-400 text-xs font-bold px-2.5 py-0.5 rounded-full border border-pink-500/30 flex items-center gap-1">
                              ♥ {article.likes}
                            </span>
                          </div>

                          <div className="p-5 flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
                                <span className="text-slate-300">{article.author.name}</span>
                                <span>•</span>
                                <span>{article.readTime}</span>
                              </div>

                              <h3 className="font-display font-bold text-sm text-white group-hover:text-[#FF2E7E] transition-colors leading-snug mb-2 line-clamp-2">
                                {article.title}
                              </h3>
                              <p className="text-slate-400 text-xs line-clamp-2 mb-4 leading-relaxed">
                                {article.excerpt}
                              </p>
                            </div>

                            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                              <span className="flex items-center gap-1">
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>{article.commentsCount || 0} Komentar</span>
                              </span>
                            </div>
                          </div>
                        </article>

                        {/* Delete Quick Badge (for Owner, outside reorder mode) */}
                        {isOwner && !isReordering && (
                          <button
                            onClick={() => handleRemoveItem(article.id, article.title)}
                            className="absolute top-3 right-3 w-8 h-8 rounded-xl bg-black/80 hover:bg-rose-600 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center shadow-lg transition-all z-10"
                            title="Hapus dari Koleksi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
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
