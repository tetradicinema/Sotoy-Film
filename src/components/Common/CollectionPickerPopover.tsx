import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Bookmark,
  Check,
  Plus,
  X,
  Lock,
  Globe,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface CollectionPickerPopoverProps {
  itemId: string;
  itemType: 'film' | 'article';
  itemName: string;
  buttonId?: string;
  buttonClassName?: string;
  align?: 'left' | 'right';
  variant?: 'full' | 'compact';
}

export const CollectionPickerPopover: React.FC<CollectionPickerPopoverProps> = ({
  itemId,
  itemType,
  itemName,
  buttonId,
  buttonClassName,
  align = 'left',
  variant = 'full',
}) => {
  const {
    isLoggedIn,
    setLoginModalOpen,
    collections,
    createCollection,
    addItemToCollection,
    removeItemFromCollection,
    isItemInAnyCollection,
    getCollectionsContainingItem,
    getOrCreateDefaultCollection,
    showToast,
  } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [isCreatingInline, setIsCreatingInline] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDesc, setNewCollectionDesc] = useState('');
  const [newCollectionIsPublic, setNewCollectionIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 320,
  });

  const isInAny = isItemInAnyCollection(itemId, itemType);
  const containingCollections = getCollectionsContainingItem(itemId, itemType);
  const containingColIds = new Set(containingCollections.map((c: any) => c.id));

  // Position calculation for Portaled Dropdown
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    
    // Viewport-aware responsive width (capped to max 350px, minimum 280px)
    const availableWidth = window.innerWidth;
    const dropdownWidth = Math.min(340, Math.max(280, availableWidth - 32));
    const estimatedHeight = 360;

    let left = align === 'right' ? rect.right - dropdownWidth : rect.left;

    // Viewport bounds clamping (horizontal)
    if (left + dropdownWidth > availableWidth - 16) {
      left = availableWidth - dropdownWidth - 16;
    }
    if (left < 16) {
      left = 16;
    }

    // Viewport bounds calculation (vertical)
    let top = rect.bottom + 8;
    const availableHeight = window.innerHeight;

    // If overflowing bottom, flip to above the trigger if there's enough space
    if (top + estimatedHeight > availableHeight - 16) {
      if (rect.top - estimatedHeight - 8 >= 16) {
        top = rect.top - estimatedHeight - 8;
      } else {
        // If neither fits easily, clamp top within visible bounds
        top = Math.max(16, availableHeight - estimatedHeight - 16);
      }
    }

    setCoords({
      top: Math.round(top),
      left: Math.round(left),
      width: dropdownWidth,
    });
  };

  // Recalculate position on open, window resize, and scroll
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, align]);

  // Close on outside click (properly checking trigger and portaled dropdown)
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current && triggerRef.current.contains(target)) {
        return;
      }
      if (dropdownRef.current && dropdownRef.current.contains(target)) {
        return;
      }
      setIsOpen(false);
      setIsCreatingInline(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const handleButtonClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isLoggedIn) {
      setLoginModalOpen(true);
      showToast(
        itemType === 'film'
          ? 'Silakan Log In terlebih dahulu untuk menyimpan ke Daftar Tonton!'
          : 'Silakan Log In terlebih dahulu untuk menyimpan artikel ke Perpustakaan!'
      );
      return;
    }

    // If user with zero existing collections clicks for the first time,
    // ensure default collection exists and immediately add the item to it!
    if (collections.length === 0) {
      const defaultCol = await getOrCreateDefaultCollection();
      if (defaultCol) {
        await addItemToCollection(defaultCol.id, itemId, itemType);
      }
    }

    setIsOpen(prev => !prev);
  };

  const handleToggleCollection = async (collectionId: string, alreadyIn: boolean) => {
    if (alreadyIn) {
      await removeItemFromCollection(collectionId, itemId);
    } else {
      await addItemToCollection(collectionId, itemId, itemType);
    }
  };

  const handleCreateAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) {
      showToast('Nama watchlist/koleksi wajib diisi.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const colId = await createCollection(
        newCollectionName.trim(),
        newCollectionDesc.trim(),
        newCollectionIsPublic
      );
      if (colId) {
        await addItemToCollection(colId, itemId, itemType);
        setNewCollectionName('');
        setNewCollectionDesc('');
        setNewCollectionIsPublic(true);
        setIsCreatingInline(false);
      }
    } catch (err) {
      console.error('Error creating inline collection:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative inline-block text-left">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        id={buttonId || `collection-picker-btn-${itemId}`}
        type="button"
        onClick={handleButtonClick}
        className={
          buttonClassName ||
          (variant === 'compact'
            ? `p-2 sm:p-2.5 rounded-xl font-bold transition-all border inline-flex items-center justify-center gap-1 select-none shrink-0 ${
                isInAny
                  ? 'bg-[#FF2E7E]/25 text-[#FF2E7E] border-[#FF2E7E]/50 hover:bg-[#FF2E7E]/35 backdrop-blur-md shadow-sm'
                  : 'bg-black/75 hover:bg-slate-900 text-slate-200 border-white/20 hover:border-white/40 backdrop-blur-md'
              }`
            : `px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all min-h-[40px] select-none ${
                isInAny
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-slate-600'
              }`)
        }
        title={isInAny ? 'Kelola di Koleksi / Watchlist' : 'Simpan ke Watchlist / Koleksi'}
      >
        <Bookmark
          className={`${
            variant === 'compact' ? 'w-3.5 h-3.5' : 'w-4 h-4'
          } shrink-0 transition-colors ${
            isInAny
              ? variant === 'compact'
                ? 'fill-current text-[#FF2E7E]'
                : 'fill-current text-amber-300'
              : 'text-slate-300'
          }`}
        />
        {variant === 'full' && (
          <span>
            {isInAny
              ? 'Tersimpan'
              : itemType === 'film'
              ? 'Simpan ke Watchlist'
              : 'Simpan Artikel'}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 opacity-60 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Portaled Popover Dropdown (Not constrained by any parent overflow-hidden!) */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              maxWidth: 'calc(100vw - 32px)',
              zIndex: 99999,
            }}
            className="rounded-2xl bg-[#171A1F] border border-white/10 shadow-2xl overflow-hidden backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150 text-left"
          >
            {/* Header */}
            <div className="p-3.5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#FF2E7E]/10 border border-[#FF2E7E]/20 flex items-center justify-center text-[#FF2E7E] shrink-0">
                  <Bookmark className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-display font-bold text-xs text-white truncate">
                    Simpan ke Watchlist
                  </h4>
                  <p className="text-[10px] text-slate-400 truncate max-w-[200px]">
                    {itemName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Collection Checklist */}
            <div className="p-2 space-y-1 max-h-60 overflow-y-auto">
              {collections.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  Belum ada koleksi. Buat koleksi pertama di bawah.
                </div>
              ) : (
                collections.map(col => {
                  const isItemInCol = containingColIds.has(col.id);

                  return (
                    <div
                      key={col.id}
                      onClick={() => handleToggleCollection(col.id, isItemInCol)}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.04] cursor-pointer transition-colors group select-none"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Checkbox */}
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                            isItemInCol
                              ? 'bg-[#FF2E7E] border-[#FF2E7E] text-white'
                              : 'border-white/20 bg-slate-800/80 group-hover:border-white/40'
                          }`}
                        >
                          {isItemInCol && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-200 group-hover:text-white truncate">
                              {col.name}
                            </span>
                            {col.isDefault && (
                              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-[#FF2E7E]/20 text-[#FF2E7E] border border-[#FF2E7E]/30 shrink-0">
                                Utama
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span>{col.items.length} item</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              {col.isPublic ? (
                                <>
                                  <Globe className="w-2.5 h-2.5 text-emerald-400" />
                                  <span className="text-emerald-400/80">Publik</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-2.5 h-2.5 text-amber-400" />
                                  <span className="text-amber-400/80">Privat</span>
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer: Inline Create Collection Form */}
            <div className="p-3 border-t border-white/[0.08] bg-white/[0.01]">
              {!isCreatingInline ? (
                <button
                  type="button"
                  onClick={() => setIsCreatingInline(true)}
                  className="w-full py-2 px-3 rounded-xl border border-dashed border-white/10 hover:border-[#FF2E7E]/40 text-xs text-slate-300 hover:text-white transition-all bg-white/[0.02] hover:bg-[#FF2E7E]/5 flex items-center justify-center gap-1.5 font-bold"
                >
                  <Plus className="w-3.5 h-3.5 text-[#FF2E7E]" />
                  <span>+ Buat Watchlist Baru</span>
                </button>
              ) : (
                <form onSubmit={handleCreateAndAdd} className="space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-white uppercase tracking-wider">
                      Watchlist Baru
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingInline(false);
                        setNewCollectionName('');
                        setNewCollectionDesc('');
                        setNewCollectionIsPublic(true);
                      }}
                      className="text-slate-400 hover:text-white text-xs"
                    >
                      Batal
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Nama watchlist (cth: Weekend Movie)..."
                    value={newCollectionName}
                    onChange={e => setNewCollectionName(e.target.value)}
                    maxLength={40}
                    className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#FF2E7E] placeholder:text-slate-500"
                    autoFocus
                    disabled={isSubmitting}
                  />

                  <textarea
                    placeholder="Deskripsi singkat (opsional)..."
                    value={newCollectionDesc}
                    onChange={e => setNewCollectionDesc(e.target.value)}
                    maxLength={100}
                    rows={2}
                    className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#FF2E7E] resize-none placeholder:text-slate-500"
                    disabled={isSubmitting}
                  />

                  {/* Public / Private Toggle Switch matching SettingsPage */}
                  <div className="p-2 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-white flex items-center gap-1">
                        {newCollectionIsPublic ? (
                          <Globe className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Lock className="w-3 h-3 text-amber-400" />
                        )}
                        <span>{newCollectionIsPublic ? 'Watchlist Publik' : 'Watchlist Privat'}</span>
                      </div>
                      <div className="text-[9px] text-slate-400 truncate">
                        {newCollectionIsPublic ? 'Dapat dilihat publik di profil' : 'Hanya kamu yang dapat melihat'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewCollectionIsPublic(prev => !prev)}
                      className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                        newCollectionIsPublic ? 'bg-emerald-500' : 'bg-slate-800'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-black transition-transform ${
                          newCollectionIsPublic ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !newCollectionName.trim()}
                    className="w-full py-1.5 rounded-xl bg-[#FF2E7E] hover:bg-[#E0246F] text-white text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#FF2E7E]/20"
                  >
                    {isSubmitting ? 'Membuat...' : 'Buat & Simpan'}
                  </button>
                </form>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
