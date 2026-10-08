import React, { useState, useMemo, useEffect } from 'react';
import { 
  Layout, 
  Sparkles, 
  Search, 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Save, 
  RotateCcw, 
  Sliders, 
  Check, 
  Layers,
  Film,
  FileText,
  GripVertical
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useApp } from '../../context/AppContext';
import { HomepageSectionKey, SectionConfig, MainCategory } from '../../types';
import { HOMEPAGE_SECTIONS_META, SectionMeta, DEFAULT_SECTION_ORDER } from '../../utils/homepageConfigHelper';

const CATEGORY_LABELS: Record<string, string> = {
  movies: 'Movies',
  series: 'Series',
  anime: 'Anime',
  'cinema-gear': 'Cinema Gear',
  'film-studies': 'Film Studies',
  movie: 'Movies',
};

const SUBCATEGORY_LABELS: Record<string, string> = {
  news: 'News / Kabar Utama',
  lists: 'Lists / Rekomendasi & Daftar',
  reviews: 'Reviews / Ulasan Mendalam',
  'gear-news': 'Gear News / Kabar Alat & Tek',
  'gear-reviews': 'Gear Reviews / Ulasan Alat & Kamera',
  producing: 'Producing / Manajemen & Produksi',
  directing: 'Directing / Sutradara',
  cinematography: 'Cinematography / Sinematografi',
  lighting: 'Lighting / Tata Cahaya',
  'post-production': 'Post-Production / Editing & VFX',
};

const CATEGORY_SPECIFIC_SUBCATEGORIES: Record<string, { val: string; label: string }[]> = {
  movies: [
    { val: 'reviews', label: 'Reviews / Ulasan Film' },
    { val: 'lists', label: 'Lists / Rekomendasi & Daftar' },
    { val: 'news', label: 'News / Kabar Film' },
    { val: 'features', label: 'Features / Artikel Khusus' },
    { val: 'interviews', label: 'Interviews / Wawancara' },
  ],
  series: [
    { val: 'reviews', label: 'Reviews / Ulasan Serial' },
    { val: 'lists', label: 'Lists / Rekomendasi Serial' },
    { val: 'news', label: 'News / Kabar Serial' },
    { val: 'features', label: 'Features / Bahasan Serial' },
  ],
  anime: [
    { val: 'news', label: 'News / Kabar Anime' },
    { val: 'reviews', label: 'Reviews / Ulasan Anime' },
    { val: 'lists', label: 'Lists / Rekomendasi Anime' },
    { val: 'features', label: 'Features / Bahasan Khusus' },
  ],
  'cinema-gear': [
    { val: 'gear-reviews', label: 'Gear Reviews / Ulasan Alat & Kamera' },
    { val: 'gear-news', label: 'Gear News / Kabar Alat & Tek' },
    { val: 'tech-guides', label: 'Tech Guides / Panduan Teknikal' },
    { val: 'reviews', label: 'Reviews / Ulasan Peralatan' },
  ],
  'film-studies': [
    { val: 'directing', label: 'Directing / Sutradara' },
    { val: 'producing', label: 'Producing / Manajemen & Produksi' },
    { val: 'cinematography', label: 'Cinematography / Sinematografi' },
    { val: 'lighting', label: 'Lighting / Tata Cahaya' },
    { val: 'post-production', label: 'Post-Production / Editing & VFX' },
  ],
};

interface SortableSectionItemProps {
  keyId: HomepageSectionKey;
  idx: number;
  activeSectionKey: HomepageSectionKey;
  setActiveSectionKey: (key: HomepageSectionKey) => void;
  setSearchQuery: (q: string) => void;
  draftConfigs: Partial<Record<HomepageSectionKey, SectionConfig>>;
  homepageSectionsConfig: any;
  handleMoveSectionOrder: (index: number, direction: 'up' | 'down') => void;
  orderedLength: number;
}

const SortableSectionItem: React.FC<SortableSectionItemProps> = ({
  keyId,
  idx,
  activeSectionKey,
  setActiveSectionKey,
  setSearchQuery,
  draftConfigs,
  homepageSectionsConfig,
  handleMoveSectionOrder,
  orderedLength,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: keyId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 1,
    opacity: isDragging ? 0.6 : 1,
  };

  const meta = HOMEPAGE_SECTIONS_META.find((m) => m.key === keyId) || HOMEPAGE_SECTIONS_META[0];
  const active = keyId === activeSectionKey;
  const sectionConfig = draftConfigs[keyId] || homepageSectionsConfig?.sections?.[keyId];
  const isManual = sectionConfig?.sourceType === 'manual';
  const hasCustomTitle = !!sectionConfig?.title && sectionConfig.title.trim().length > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-2.5 rounded-2xl transition-all flex items-center justify-between gap-2 border ${
        active
          ? 'bg-white/[0.12] border-white/20 text-white shadow-sm'
          : 'hover:bg-white/[0.04] text-slate-300 border-white/[0.04]'
      }`}
    >
      {/* Drag Handle Button */}
      <button
        type="button"
        className="p-1 cursor-grab active:cursor-grabbing text-slate-500 hover:text-white transition-colors shrink-0 touch-none"
        title="Tarik untuk menggeser posisi seksi"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Position Index Badge */}
      <span className="w-5 text-center font-mono font-bold text-[11px] text-slate-500 shrink-0">
        #{idx + 1}
      </span>

      {/* Section Title & Info */}
      <button
        id={`admin-section-tab-${keyId}`}
        type="button"
        onClick={() => {
          setActiveSectionKey(keyId);
          setSearchQuery('');
        }}
        className="min-w-0 flex-1 text-left cursor-pointer"
      >
        <div className="flex items-center gap-1.5 mb-0.5">
          {meta.targetType === 'films' ? (
            <Film className="w-3.5 h-3.5 text-[#FF2E7E] shrink-0" />
          ) : (
            <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          )}
          <span className="font-semibold text-xs truncate">
            {meta.label}
          </span>
        </div>

        <div className="text-[11px] text-slate-400 truncate">
          {hasCustomTitle ? `"${sectionConfig?.title}"` : meta.defaultTitle}
        </div>
      </button>

      {/* Reorder Up/Down Controls & Mode Indicator */}
      <div className="flex items-center gap-1 shrink-0">
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
          isManual 
            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' 
            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
        }`}>
          {isManual ? 'Manual' : 'Auto'}
        </span>

        <div className="flex flex-col gap-0.5 ml-1">
          <button
            type="button"
            disabled={idx === 0}
            onClick={(e) => {
              e.stopPropagation();
              handleMoveSectionOrder(idx, 'up');
            }}
            className="p-0.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-colors cursor-pointer"
            title="Geser Seksi ke Atas"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={idx === orderedLength - 1}
            onClick={(e) => {
              e.stopPropagation();
              handleMoveSectionOrder(idx, 'down');
            }}
            className="p-0.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-colors cursor-pointer"
            title="Geser Seksi ke Bawah"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const AdminHomepageSections: React.FC = () => {
  const {
    films,
    publishedArticles,
    homepageSectionsConfig,
    updateHomepageSectionConfig,
    updateHomepageSectionOrder,
  } = useApp();

  // Ordered list of section keys
  const [orderedKeys, setOrderedKeys] = useState<HomepageSectionKey[]>(() => {
    return homepageSectionsConfig?.sectionOrder || DEFAULT_SECTION_ORDER;
  });

  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // Keep orderedKeys synced with remote config
  useEffect(() => {
    if (homepageSectionsConfig?.sectionOrder && homepageSectionsConfig.sectionOrder.length > 0) {
      setOrderedKeys(homepageSectionsConfig.sectionOrder);
    }
  }, [homepageSectionsConfig?.sectionOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = orderedKeys.indexOf(active.id as HomepageSectionKey);
      const newIndex = orderedKeys.indexOf(over.id as HomepageSectionKey);
      if (oldIndex !== -1 && newIndex !== -1) {
        const nextOrder = arrayMove(orderedKeys, oldIndex, newIndex);
        setOrderedKeys(nextOrder);
        try {
          setIsSavingOrder(true);
          await updateHomepageSectionOrder(nextOrder);
        } catch (err) {
          console.error('Failed to save section order:', err);
        } finally {
          setIsSavingOrder(false);
        }
      }
    }
  };

  const handleMoveSectionOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= orderedKeys.length) return;
    const next = [...orderedKeys];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    setOrderedKeys(next);
    try {
      setIsSavingOrder(true);
      await updateHomepageSectionOrder(next);
    } catch (err) {
      console.error('Failed to save section order:', err);
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleSaveSectionOrder = async () => {
    try {
      setIsSavingOrder(true);
      await updateHomepageSectionOrder(orderedKeys);
    } catch (err) {
      console.error('Failed to save section order:', err);
    } finally {
      setIsSavingOrder(false);
    }
  };

  // Selected section to edit in focus, default to the first one
  const [activeSectionKey, setActiveSectionKey] = useState<HomepageSectionKey>('hero_to_watch');

  // Draft local configs per section key
  const [draftConfigs, setDraftConfigs] = useState<Partial<Record<HomepageSectionKey, SectionConfig>>>(() => {
    return (homepageSectionsConfig?.sections as any) || {};
  });

  // Track saving state per section
  const [isSavingKey, setIsSavingKey] = useState<HomepageSectionKey | null>(null);
  const [savedSuccessKey, setSavedSuccessKey] = useState<HomepageSectionKey | null>(null);

  // Manual search query per section
  const [searchQuery, setSearchQuery] = useState('');

  const currentMeta: SectionMeta = useMemo(() => {
    return HOMEPAGE_SECTIONS_META.find(m => m.key === activeSectionKey) || HOMEPAGE_SECTIONS_META[0];
  }, [activeSectionKey]);

  // Current working section config (draft or from firestore or default)
  const currentConfig: SectionConfig = useMemo(() => {
    const defaultVal: SectionConfig = {
      title: '',
      sourceType: 'auto',
      category: undefined,
      subCategory: '',
      tag: '',
      sortBy: 'newest',
      limit: 5,
      itemIds: [],
    };
    const draft = draftConfigs[activeSectionKey];
    const fromRemote = homepageSectionsConfig?.sections?.[activeSectionKey];
    const base = draft || fromRemote || {};
    return {
      ...defaultVal,
      ...base,
      itemIds: (base as SectionConfig).itemIds || [],
    };
  }, [draftConfigs, homepageSectionsConfig, activeSectionKey]);

  const updateCurrentDraft = (changes: Partial<SectionConfig>) => {
    setDraftConfigs(prev => ({
      ...prev,
      [activeSectionKey]: {
        ...currentConfig,
        ...changes,
      },
    }));
  };

  const handleSaveSection = async (key: HomepageSectionKey) => {
    try {
      setIsSavingKey(key);
      const configToSave = draftConfigs[key] || currentConfig;
      await updateHomepageSectionConfig(key, configToSave);
      setDraftConfigs(prev => ({
        ...prev,
        [key]: configToSave,
      }));
      setSavedSuccessKey(key);
      setTimeout(() => setSavedSuccessKey(null), 3000);
    } catch (err) {
      console.error('Failed to save section config:', err);
    } finally {
      setIsSavingKey(null);
    }
  };

  const handleResetSection = async (key: HomepageSectionKey) => {
    const defaultReset: SectionConfig = {
      title: '',
      sourceType: 'auto',
      category: undefined,
      subCategory: '',
      tag: '',
      sortBy: 'newest',
      limit: 5,
      itemIds: [],
    };
    setDraftConfigs(prev => ({
      ...prev,
      [key]: defaultReset,
    }));
    try {
      setIsSavingKey(key);
      await updateHomepageSectionConfig(key, defaultReset);
      setSavedSuccessKey(key);
      setTimeout(() => setSavedSuccessKey(null), 3000);
    } finally {
      setIsSavingKey(null);
    }
  };

  // Search candidates for manual mode
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.trim().toLowerCase();

    if (currentMeta.targetType === 'films') {
      return films
        .filter(f => f.title.toLowerCase().includes(query) || f.originalTitle?.toLowerCase().includes(query))
        .slice(0, 8);
    } else {
      return publishedArticles
        .filter(a => a.title.toLowerCase().includes(query) || a.tags?.some(t => t.toLowerCase().includes(query)))
        .slice(0, 8);
    }
  }, [searchQuery, currentMeta.targetType, films, publishedArticles]);

  // Resolved manual items for display
  const selectedItemsData = useMemo(() => {
    const itemIds = currentConfig.itemIds || [];
    if (currentMeta.targetType === 'films') {
      const filmMap = new Map(films.map(f => [f.id, f]));
      return itemIds.map(id => filmMap.get(id)).filter(Boolean) as typeof films;
    } else {
      const artMap = new Map(publishedArticles.map(a => [a.id, a]));
      return itemIds.map(id => artMap.get(id)).filter(Boolean) as typeof publishedArticles;
    }
  }, [currentConfig.itemIds, currentMeta.targetType, films, publishedArticles]);

  const handleAddItem = (id: string) => {
    const currentList = currentConfig.itemIds || [];
    if (currentList.includes(id)) return;
    updateCurrentDraft({ itemIds: [...currentList, id] });
    setSearchQuery('');
  };

  const handleRemoveItem = (id: string) => {
    const currentList = currentConfig.itemIds || [];
    updateCurrentDraft({ itemIds: currentList.filter(itemId => itemId !== id) });
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    const currentList = [...(currentConfig.itemIds || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentList.length) return;
    const temp = currentList[index];
    currentList[index] = currentList[targetIndex];
    currentList[targetIndex] = temp;
    updateCurrentDraft({ itemIds: currentList });
  };

  // Subcategory options based on currently selected category
  const availableSubCategories = useMemo(() => {
    const selectedCategory = currentConfig.category;
    if (selectedCategory && CATEGORY_SPECIFIC_SUBCATEGORIES[selectedCategory]) {
      return CATEGORY_SPECIFIC_SUBCATEGORIES[selectedCategory];
    }
    return Object.entries(SUBCATEGORY_LABELS).map(([val, label]) => ({ val, label }));
  }, [currentConfig.category]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#171717] border border-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#FF2E7E]/10 border border-[#FF2E7E]/30 flex items-center justify-center shrink-0 text-[#FF2E7E]">
              <Layout className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-black text-white text-xl tracking-tight">
                  Kontrol Seksi Beranda
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#FF2E7E]/15 border border-[#FF2E7E]/30 text-[#FF2E7E] text-[10px] font-bold tracking-wider uppercase">
                  Shared Config
                </span>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                Kustomisasi judul, mode kurasi otomatis (kategori & sub-kategori), atau pilih item manual secara spesifik untuk tiap seksi di halaman beranda. Geser urutan seksi dengan drag-and-drop. Perubahan tersimpan secara realtime di Firestore.
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-400 bg-black/40 border border-white/[0.06] p-3 rounded-2xl shrink-0">
            <span className="text-slate-300 font-semibold">Total 11 Seksi Terhubung</span>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Tersinkronisasi langsung ke pengunjung publik
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Navigation / Right Config Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: 11 Section Drag-and-Drop Reordering List (4 cols) */}
        <div className="lg:col-span-4 bg-[#171717] border border-white/[0.08] rounded-3xl p-3.5 sm:p-4 space-y-3 shadow-lg">
          <div className="px-2 py-1 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Urutan Seksi Beranda</span>
              <span className="text-[10px] text-slate-500">Tarik ikon ⋮⋮ atau gunakan panah ↑ ↓</span>
            </div>
            <button
              type="button"
              id="save-section-order-btn"
              onClick={handleSaveSectionOrder}
              disabled={isSavingOrder}
              className="px-3 py-1.5 rounded-xl bg-[#FF2E7E] hover:bg-[#FF2E7E]/90 text-white text-[11px] font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1 shrink-0 active:scale-95"
            >
              {isSavingOrder ? (
                <span>Menyimpan...</span>
              ) : (
                <>
                  <Save className="w-3 h-3" />
                  <span>Simpan Urutan</span>
                </>
              )}
            </button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedKeys}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1.5 max-h-[660px] overflow-y-auto pr-1">
                {orderedKeys.map((key, idx) => (
                  <SortableSectionItem
                    key={key}
                    keyId={key}
                    idx={idx}
                    activeSectionKey={activeSectionKey}
                    setActiveSectionKey={setActiveSectionKey}
                    setSearchQuery={setSearchQuery}
                    draftConfigs={draftConfigs}
                    homepageSectionsConfig={homepageSectionsConfig}
                    handleMoveSectionOrder={handleMoveSectionOrder}
                    orderedLength={orderedKeys.length}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Right Column: Configuration Form for Active Section (8 cols) */}
        <div className="lg:col-span-8 bg-[#171717] border border-white/[0.08] rounded-3xl p-5 sm:p-7 space-y-6 shadow-xl">
          
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-[#FF2E7E] uppercase tracking-wider">
                  {currentMeta.key}
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-xs text-slate-400 capitalize">
                  Target: {currentMeta.targetType === 'films' ? 'Database Film' : 'Artikel Redaksi'}
                </span>
              </div>
              <h3 className="font-display font-black text-lg sm:text-xl text-white mt-0.5">
                {currentMeta.label}
              </h3>
              <p className="text-slate-400 text-xs mt-1">
                {currentMeta.description}
              </p>
              <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1.5">
                <span className="font-semibold text-slate-400">Default saat belum diatur:</span>
                <span className="text-slate-400/90">{currentMeta.defaultRule}</span>
              </p>
            </div>

            {/* Quick Mode Indicator */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider ${
                currentConfig.sourceType === 'manual'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              }`}>
                Mode: {currentConfig.sourceType === 'manual' ? 'Manual (Pick Items)' : 'Auto (Filter & Sort)'}
              </span>
            </div>
          </div>

          {/* Form Field 1: Custom Title */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300">
              Judul Seksi Kustom (Title)
            </label>
            <div className="relative">
              <input
                id={`input-section-title-${currentMeta.key}`}
                type="text"
                value={currentConfig.title || ''}
                onChange={(e) => updateCurrentDraft({ title: e.target.value })}
                placeholder={`Default: ${currentMeta.defaultTitle}`}
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/[0.1] focus:border-[#FF2E7E] text-white text-xs sm:text-sm placeholder:text-slate-600 outline-none transition-colors"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Kosongkan jika ingin menggunakan judul bawaan kode ({currentMeta.defaultTitle}).
            </p>
          </div>

          {/* Form Field 2: Source Type Toggle */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300">
              Metode Pengambilan Konten (Source Type)
            </label>
            <div className="grid grid-cols-2 gap-3 p-1 bg-black/40 rounded-2xl border border-white/[0.08]">
              <button
                type="button"
                id="toggle-source-auto"
                onClick={() => updateCurrentDraft({ sourceType: 'auto' })}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  currentConfig.sourceType === 'auto'
                    ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Otomatis (Auto)</span>
              </button>

              <button
                type="button"
                id="toggle-source-manual"
                onClick={() => updateCurrentDraft({ sourceType: 'manual' })}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  currentConfig.sourceType === 'manual'
                    ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Manual (Pilih Item)</span>
              </button>
            </div>
          </div>

          {/* SUB-FORM A: AUTO MODE CONFIG */}
          {currentConfig.sourceType === 'auto' && (
            <div className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-white/[0.08] space-y-4">
              <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5 pb-2 border-b border-white/[0.06]">
                <Sliders className="w-3.5 h-3.5 text-[#FF2E7E]" />
                <span>Pengaturan Filter Otomatis</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category Dropdown */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-slate-400">
                    Kategori Utama Konten
                  </label>
                  <select
                    id="select-category-auto"
                    value={currentConfig.category || ''}
                    onChange={(e) => updateCurrentDraft({ category: (e.target.value as any) || undefined })}
                    className="w-full px-3 py-2 rounded-xl bg-[#171717] border border-white/[0.1] text-white text-xs outline-none focus:border-[#FF2E7E] transition-colors"
                  >
                    <option value="">Semua kategori</option>
                    {currentMeta.allowedCategories.map(cat => (
                      <option key={cat} value={cat}>
                        {CATEGORY_LABELS[cat] || cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sub-Category Dropdown */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-slate-400">
                    Sub-Kategori Konten (Opsional)
                  </label>
                  <select
                    id="select-subcategory-auto"
                    value={currentConfig.subCategory || ''}
                    onChange={(e) => updateCurrentDraft({ subCategory: e.target.value || '' })}
                    className="w-full px-3 py-2 rounded-xl bg-[#171717] border border-white/[0.1] text-white text-xs outline-none focus:border-[#FF2E7E] transition-colors"
                  >
                    <option value="">Semua sub-kategori</option>
                    {availableSubCategories.map(({ val, label }) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Optional Tag Filter */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-slate-400">
                    Filter Kata Kunci / Tag (Opsional)
                  </label>
                  <input
                    type="text"
                    value={currentConfig.tag || ''}
                    onChange={(e) => updateCurrentDraft({ tag: e.target.value })}
                    placeholder="Contoh: review, rekomendasi, 2024"
                    className="w-full px-3 py-2 rounded-xl bg-[#171717] border border-white/[0.1] text-white text-xs outline-none focus:border-[#FF2E7E] placeholder:text-slate-600 transition-colors"
                  />
                </div>

                {/* Sort Order */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-slate-400">
                    Urutan Konten (Sort By)
                  </label>
                  <select
                    id="select-sort-auto"
                    value={currentConfig.sortBy || 'newest'}
                    onChange={(e) => updateCurrentDraft({ sortBy: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-[#171717] border border-white/[0.1] text-white text-xs outline-none focus:border-[#FF2E7E] transition-colors"
                  >
                    <option value="newest">Terbaru (Newest)</option>
                    <option value="rating">Rating / Skor Sotoy Tertinggi</option>
                    <option value="views">Paling Banyak Dilihat (Views)</option>
                  </select>
                </div>

                {/* Limit / Count */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-slate-400">
                    Batas Jumlah Item (Limit)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={currentConfig.limit || 5}
                    onChange={(e) => updateCurrentDraft({ limit: parseInt(e.target.value, 10) || 5 })}
                    className="w-full px-3 py-2 rounded-xl bg-[#171717] border border-white/[0.1] text-white text-xs outline-none focus:border-[#FF2E7E] transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SUB-FORM B: MANUAL MODE CONFIG */}
          {currentConfig.sourceType === 'manual' && (
            <div className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-white/[0.08] space-y-4">
              <div className="text-xs font-bold text-slate-300 flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#FF2E7E]" />
                  <span>Daftar Item Manual Terpilih</span>
                </div>
                <span className="text-[11px] font-mono text-[#FF2E7E]">
                  {(currentConfig.itemIds || []).length} item aktif
                </span>
              </div>

              {/* Search Box to Find & Add Items */}
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-400">
                  Cari & Tambahkan {currentMeta.targetType === 'films' ? 'Film' : 'Artikel'}:
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Ketik judul ${currentMeta.targetType === 'films' ? 'film/serial' : 'artikel'} untuk menambah...`}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#171717] border border-white/[0.1] text-white text-xs outline-none focus:border-[#FF2E7E] placeholder:text-slate-600 transition-colors"
                  />
                </div>

                {/* Dropdown Suggestions */}
                {searchResults.length > 0 && (
                  <div className="bg-[#171717] border border-white/10 rounded-2xl p-2 space-y-1 shadow-2xl max-h-56 overflow-y-auto">
                    {searchResults.map((item: any) => {
                      const isAdded = (currentConfig.itemIds || []).includes(item.id);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.06] transition-colors text-xs"
                        >
                          <div className="min-w-0 flex-1 pr-3">
                            <div className="font-semibold text-white truncate">{item.title}</div>
                            <div className="text-[10px] text-slate-400 truncate">
                              ID: {item.id} {item.category ? `· ${item.category}` : ''}
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={isAdded}
                            onClick={() => handleAddItem(item.id)}
                            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              isAdded
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-[#FF2E7E] hover:bg-[#FF2E7E]/90 text-white shadow-sm'
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Terpilih</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3" />
                                <span>Tambah</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected List with Reordering */}
              <div className="space-y-2 pt-2">
                {selectedItemsData.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-white/10 rounded-2xl text-slate-500 text-xs">
                    Belum ada item manual yang dipilih. Gunakan pencarian di atas untuk menambahkan.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {selectedItemsData.map((item: any, idx) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-[#171717] border border-white/[0.06] hover:border-white/20 transition-all text-xs"
                      >
                        <span className="w-5 font-mono text-[11px] font-bold text-slate-500 shrink-0">
                          #{idx + 1}
                        </span>

                        <div className="min-w-0 flex-1 px-2">
                          <div className="font-semibold text-white truncate">{item.title}</div>
                          <div className="text-[10px] text-slate-400 truncate">
                            ID: {item.id}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveItem(idx, 'up')}
                            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-colors"
                            title="Geser item ke atas"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === selectedItemsData.length - 1}
                            onClick={() => handleMoveItem(idx, 'down')}
                            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-colors"
                            title="Geser item ke bawah"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors ml-1"
                            title="Hapus dari daftar manual"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons: Save / Reset */}
          <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between gap-4">
            <button
              type="button"
              id="reset-section-btn"
              onClick={() => handleResetSection(activeSectionKey)}
              disabled={isSavingKey === activeSectionKey}
              className="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset ke Bawaan Kode</span>
            </button>

            <button
              type="button"
              id="save-section-config-btn"
              onClick={() => handleSaveSection(activeSectionKey)}
              disabled={isSavingKey === activeSectionKey}
              className="px-6 py-2.5 rounded-xl bg-[#FF2E7E] hover:bg-[#FF2E7E]/90 text-white text-xs font-bold transition-all shadow-lg shadow-[#FF2E7E]/25 flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
            >
              {isSavingKey === activeSectionKey ? (
                <span>Menyimpan ke Firestore...</span>
              ) : savedSuccessKey === activeSectionKey ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Tersimpan!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Konfigurasi Seksi ({currentMeta.key})</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export default AdminHomepageSections;
