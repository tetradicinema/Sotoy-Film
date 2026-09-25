import React, { useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { MainCategory } from '../../types';

export interface CategoryOption {
  id: MainCategory | 'all';
  label: string;
}

export const CATEGORY_OPTIONS: CategoryOption[] = [
  { id: 'all', label: 'Semua Artikel' },
  { id: 'movies', label: 'Movies' },
  { id: 'series', label: 'Series' },
  { id: 'anime', label: 'Anime' },
  { id: 'cinema-gear', label: 'Cinema Gear' },
  { id: 'film-studies', label: 'Film Studies' },
];

export interface ContentCategoryMobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategory: MainCategory | 'all';
  onSelectCategory: (category: MainCategory | 'all') => void;
  categoryCounts?: Record<MainCategory | 'all', number>;
}

export const ContentCategoryMobileMenu: React.FC<ContentCategoryMobileMenuProps> = ({
  isOpen,
  onClose,
  selectedCategory,
  onSelectCategory,
  categoryCounts,
}) => {
  // Close on Escape key and lock body scroll when open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="content-category-mobile-drawer-backdrop"
      className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-drawer-title"
    >
      <div
        id="content-category-mobile-drawer-sheet"
        onClick={(e) => e.stopPropagation()}
        className="w-full bg-[#171A1F] border-t border-white/10 rounded-t-3xl shadow-2xl p-4 sm:p-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto"
      >
        {/* Drag handle affordance */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-3" />

        {/* Drawer Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.08]">
          <div>
            <h2
              id="category-drawer-title"
              className="font-display font-black text-lg text-white tracking-tight"
            >
              Kategori Konten
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Pilih kategori artikel untuk memfilter bacaan
            </p>
          </div>
          <button
            id="close-content-category-drawer-btn"
            type="button"
            onClick={onClose}
            className="p-2 -mr-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Tutup Kategori"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Threads-style Card Container with Dividers */}
        <div className="bg-[#101216] border border-white/[0.08] rounded-2xl overflow-hidden divide-y divide-white/[0.06]">
          {CATEGORY_OPTIONS.map((item) => {
            const isActive = selectedCategory === item.id;
            const count = categoryCounts ? categoryCounts[item.id] : undefined;

            return (
              <button
                key={item.id}
                id={`mobile-cat-option-${item.id}`}
                type="button"
                onClick={() => {
                  onSelectCategory(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors min-h-[48px] active:bg-white/[0.08] ${
                  isActive
                    ? 'bg-white/[0.06] text-white'
                    : 'text-slate-300 hover:bg-white/[0.03]'
                }`}
              >
                <span
                  className={`text-sm tracking-tight ${
                    isActive ? 'font-bold text-white' : 'font-medium text-slate-300'
                  }`}
                >
                  {item.label}
                </span>

                <div className="flex items-center gap-2.5">
                  {typeof count === 'number' && (
                    <span
                      className={`text-xs font-mono tabular-nums ${
                        isActive ? 'text-[#FF2E7E] font-bold' : 'text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                  {isActive && (
                    <Check className="w-4 h-4 text-[#FF2E7E] shrink-0 stroke-[2.5]" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
