import React, { useState } from 'react';
import { X, FolderHeart, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface AddToCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemType: 'film' | 'article';
  itemName: string;
}

export const AddToCollectionModal: React.FC<AddToCollectionModalProps> = ({
  isOpen,
  onClose,
  itemId,
  itemType,
  itemName,
}) => {
  const {
    collections,
    createCollection,
    addItemToCollection,
    removeItemFromCollection,
    showToast,
  } = useApp();

  const [newCollectionName, setNewCollectionName] = useState('');
  const [isCreatingInline, setIsCreatingInline] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleToggle = async (collectionId: string, isChecked: boolean) => {
    if (isChecked) {
      await addItemToCollection(collectionId, itemId, itemType);
    } else {
      await removeItemFromCollection(collectionId, itemId);
    }
  };

  const handleCreateAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) {
      showToast('Nama koleksi wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      const colId = await createCollection(newCollectionName);
      if (colId) {
        await addItemToCollection(colId, itemId, itemType);
        setNewCollectionName('');
        setIsCreatingInline(false);
      }
    } catch (err) {
      console.error('Error creating inline collection:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="add-to-collection-modal-backdrop"
      className="fixed inset-0 z-50 bg-[#0E1013]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        id="add-to-collection-modal-container"
        className="bg-[#171A1F] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="bg-[#171A1F] p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-[#FF2E7E]">
              <FolderHeart className="w-5 h-5 text-[#FF2E7E]" />
            </div>
            <div>
              <h3 className="font-display font-bold text-white text-base leading-tight">
                Simpan ke Koleksi
              </h3>
              <p className="text-slate-400 text-xs mt-0.5 truncate max-w-[250px]">
                {itemName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[300px] overflow-y-auto">
          {collections.map((col) => {
            const hasItem = col.items.some(
              (item) => item.itemId === itemId && item.itemType === itemType
            );

            return (
              <label
                key={col.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={hasItem}
                    onChange={(e) => handleToggle(col.id, e.target.checked)}
                    className="rounded text-[#FF2E7E] focus:ring-[#FF2E7E] bg-slate-800 border-white/10 w-4 h-4"
                  />
                  <div>
                    <span className="text-sm font-medium text-white block">
                      {col.name}
                    </span>
                    {col.isDefault && (
                      <span className="text-[10px] text-slate-400 bg-white/10 px-1.5 py-0.5 rounded">
                        Koleksi Utama
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  {col.items.length} item
                </span>
              </label>
            );
          })}
        </div>

        {/* Modal Footer (Add New Inline) */}
        <div className="p-5 border-t border-white/[0.08] bg-white/[0.01]">
          {!isCreatingInline ? (
            <button
              onClick={() => setIsCreatingInline(true)}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-dashed border-white/10 hover:border-white/20 text-xs text-slate-300 hover:text-white transition-all bg-white/[0.02] hover:bg-white/[0.04]"
            >
              <Plus className="w-4 h-4" />
              <span>Buat koleksi baru</span>
            </button>
          ) : (
            <form onSubmit={handleCreateAndAdd} className="space-y-3">
              <input
                type="text"
                placeholder="Nama koleksi baru..."
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                maxLength={40}
                className="w-full px-3.5 py-2 text-sm bg-slate-800/80 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#FF2E7E]/50 focus:ring-1 focus:ring-[#FF2E7E]/50"
                disabled={loading}
                autoFocus
              />
              <div className="flex gap-2 justify-end text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingInline(false);
                    setNewCollectionName('');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white/[0.05] text-slate-300 hover:bg-white/10 transition-colors"
                  disabled={loading}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-xl bg-[#FF2E7E] hover:bg-[#E0246F] text-white font-medium transition-colors"
                  disabled={loading}
                >
                  {loading ? 'Menyimpan...' : 'Buat & Simpan'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
