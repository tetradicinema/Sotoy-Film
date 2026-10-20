import React, { useEffect } from 'react';
import { X, Check, Film, Tv, Sparkles, Camera, BookOpen, Layers } from 'lucide-react';
import { MainCategory } from '../../types';

export interface CategoryOption {
  id: MainCategory | 'all';
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    id: 'all',
    label: 'Semua Artikel',
    description: 'Seluruh arsip artikel, review, berita, dan panduan sinema.',
    icon: Layers,
  },
  {
    id: 'movies',
    label: 'Movies',
    description: 'Ulasan film box office, film festival, dan kabar perfilman terkini.',
    icon: Film,
  },
  {
    id: 'series',
    label: 'Series',
    description: 'Bedah serial televisi, streaming shows, episode breakdowns, dan drama.',
    icon: Tv,
  },
  {
    id: 'animation',
    label: 'Animation',
    description: 'Rekomendasi animation, ulasan musiman, analisis manga, dan pop culture Jepang.',
    icon: Sparkles,
  },
  {
    id: 'cinema-gear',
    label: 'Cinema Gear',
    description: 'Kamera sinema, lensa anamorphic, lighting kit, dan perlengkapan produksi.',
    icon: Camera,
  },
  {
    id: 'film-studies',
    label: 'Film Studies',
    description: 'Kajian sinematografi, directing, producing, tata visual, dan teori film.',
    icon: BookOpen,
  },
];

interface ContentCategoryMobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategory: MainCategory | 'all';
  onSelectCategory: (cat: MainCategory | 'all') => void;
  categoryCounts: Record<MainCategory | 'all', number>;
}

export const ContentCategoryMobileMenu: React.FC<ContentCategoryMobileMenuProps> = ({
  isOpen,
  onClose,
  selectedCategory,
  onSelectCategory,
  categoryCounts,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      id="category-mobile-drawer-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm transition-opacity duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Pilih Kategori Konten"
    >
      <div
        id="category-mobile-drawer-sheet"
        className="relative w-full max-w-lg bg-[#14171C] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-250"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle pill on mobile */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto sm:hidden mb-2" />

        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div>
            <h3 className="font-display font-bold text-white text-base">
              Pilih Kategori Konten
            </h3>
            <p className="text-xs text-slate-400">
              Filter ulasan & artikel berdasarkan topik pilihan
            </p>
          </div>
          <button
            id="close-category-drawer-btn"
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category List */}
        <div className="space-y-2">
          {CATEGORY_OPTIONS.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const Icon = cat.icon;
            const count = categoryCounts[cat.id] ?? 0;

            return (
              <button
                key={cat.id}
                id={`drawer-cat-${cat.id}`}
                type="button"
                onClick={() => {
                  onSelectCategory(cat.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? 'bg-white/[0.10] border-[#FF2E7E] text-white shadow-md'
                    : 'bg-[#171717]/60 border-white/[0.06] text-slate-300 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-[#FF2E7E] text-white'
                        : 'bg-white/[0.08] text-slate-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">
                        {cat.label}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-bold text-[#FF2E7E] bg-[#FF2E7E]/10 border border-[#FF2E7E]/20 px-1.5 py-0.2 rounded-full">
                          Aktif
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate max-w-[240px]">
                      {cat.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 ml-2">
                  <span className="text-xs font-mono tabular-nums text-slate-400 px-2 py-0.5 rounded-lg bg-black/40 border border-white/[0.06]">
                    {count}
                  </span>
                  {isSelected && (
                    <Check className="w-4 h-4 text-[#FF2E7E]" />
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
