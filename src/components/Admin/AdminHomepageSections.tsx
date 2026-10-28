import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
  GripVertical,
  Eye,
  EyeOff,
  AlertTriangle
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
import {
  HomepageSectionKey,
  SectionConfig,
  MainCategory,
  HomeBlockKey,
  HomeSidebarWidgetKey,
} from '../../types';
import {
  HOMEPAGE_SECTIONS_META,
  SectionMeta,
  DEFAULT_SECTION_ORDER,
  DEFAULT_FILM_DB_SECTION_ORDER,
  DEFAULT_REC_SECTION_ORDER,
  DEFAULT_BLOCK_ORDER,
  DEFAULT_SIDEBAR_WIDGET_ORDER,
  HOME_BLOCKS_META,
  SIDEBAR_WIDGETS_META,
  resolveBlockOrder,
  resolveSidebarWidgetOrder,
  resolveHiddenBlocks,
  getSplitColumnBlocks,
  resolveSectionOrder,
  resolveFilmDbSectionOrder,
} from '../../utils/homepageConfigHelper';
import {
  buildFilmPickerSelection,
  getFilmPickerRow,
  getHeroToWatch,
  getStreamingPlatforms,
  resolveFilmDbSection,
  resolveHomeFilmIndonesia,
  resolveHomeFilmRecs,
  resolveHomeStreaming,
  searchFilmPickerItems,
} from '../../utils/filmSections';
import { collectGenreOptions, normalizeGenreName, resolveFilmSectionGenre } from '../../utils/filmGenres';
import { DEFAULT_POSTER } from '../../data/mockData';
import { normalizeArticleCategory } from '../../utils/articleCategory';

const CATEGORY_LABELS: Record<string, string> = {
  movies: 'Movie',
  series: 'Series',
  animation: 'Animation',
  'cinema-gear': 'Cinema Gear',
  'film-studies': 'Film Studies',
  movie: 'Movie',
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
  animation: [
    { val: 'news', label: 'News / Kabar Animation' },
    { val: 'reviews', label: 'Reviews / Ulasan Animation' },
    { val: 'lists', label: 'Lists / Rekomendasi Animation' },
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

// Beranda film sections use film-specific defaults (no default article sort).
const isHomeFilmSectionKey = (key: HomepageSectionKey): boolean =>
  key === 'home_film_recs' || key === 'home_streaming' || key === 'home_film_indonesia';

const getDefaultSectionConfig = (key: HomepageSectionKey, meta: SectionMeta): SectionConfig => {
  const isFilmDb = meta.area === 'film_database';
  const isRec = meta.area === 'recommendations';
  // Editorial film sections use their own default rule instead of a default article sort.
  const usesEditorialFilmDefaults = isHomeFilmSectionKey(key) || key === 'hero_to_watch' || isRec;

  let limit = 5;
  if (key === 'hero_slider' || key === 'home_film_recs') limit = 6;
  else if (key === 'fd_on_theatres' || key === 'fd_coming_soon') limit = 24;
  else if (key === 'home_streaming' || key === 'home_film_indonesia' || isFilmDb) limit = 12;
  else if (isRec) limit = 10;

  return {
    title: '',
    description: '',
    sourceType: key === 'fd_editors_pick' ? 'manual' : 'auto',
    category: undefined,
    subCategory: '',
    tag: '',
    sortBy: isFilmDb || usesEditorialFilmDefaults ? undefined : 'newest',
    limit,
    itemIds: [],
    enabled: true,
    platform: '',
    minVotes: key === 'fd_fans_favourite' ? 3 : key === 'fd_hidden_gems' ? 1 : undefined,
    ...(key === 'fd_hidden_gems' ? { minScore: undefined, maxVotes: undefined } : {}),
  };
};

interface SortableBlockItemProps {
  blockKey: HomeBlockKey;
  idx: number;
  handleMoveBlock: (index: number, direction: 'up' | 'down') => void;
  totalLength: number;
  isHidden: boolean;
  onToggleHidden: (key: HomeBlockKey) => void;
  canHide: boolean;
}

const SortableBlockItem: React.FC<SortableBlockItemProps> = ({
  blockKey,
  idx,
  handleMoveBlock,
  totalLength,
  isHidden,
  onToggleHidden,
  canHide,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: blockKey });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 1,
    opacity: isDragging ? 0.6 : isHidden ? 0.55 : 1,
  };

  const meta = HOME_BLOCKS_META.find((m) => m.key === blockKey) || HOME_BLOCKS_META[0];
  const isWide = meta.type === 'wide';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-2.5 sm:p-3 rounded-2xl transition-all flex items-center justify-between gap-2.5 border ${
        isHidden
          ? 'bg-black/40 border-white/[0.04] text-slate-500'
          : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.06] text-slate-200'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          className="p-1 cursor-grab active:cursor-grabbing text-slate-500 hover:text-white transition-colors shrink-0 touch-none"
          title="Tarik untuk menggeser susunan blok"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <span className="w-5 text-center font-mono font-bold text-[11px] text-slate-500 shrink-0">
          #{idx + 1}
        </span>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-semibold text-xs truncate ${isHidden ? 'text-slate-400 line-through' : 'text-white'}`}>
              {meta.label}
            </span>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                isWide
                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {isWide ? 'Lebar Penuh' : 'Kolom Utama'}
            </span>
            {isHidden && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 bg-red-500/15 text-red-400 border border-red-500/30">
                Disembunyikan
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
            {meta.description}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {/* Toggle Show/Hide Button */}
        <button
          type="button"
          onClick={() => onToggleHidden(blockKey)}
          disabled={!isHidden && !canHide}
          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
            isHidden
              ? 'bg-white/[0.05] border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
              : 'bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/10'
          } disabled:opacity-30 disabled:cursor-not-allowed`}
          title={
            isHidden
              ? 'Tampilkan blok ini di beranda'
              : !canHide
              ? 'Minimal 1 blok harus tetap tampil'
              : 'Sembunyikan blok ini dari beranda'
          }
        >
          {isHidden ? (
            <EyeOff className="w-3.5 h-3.5 text-red-400" />
          ) : (
            <Eye className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
          )}
        </button>

        <div className="flex items-center gap-0.5 ml-0.5">
          <button
            type="button"
            disabled={idx === 0}
            onClick={() => handleMoveBlock(idx, 'up')}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-colors cursor-pointer"
            title="Geser ke Atas"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={idx === totalLength - 1}
            onClick={() => handleMoveBlock(idx, 'down')}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-colors cursor-pointer"
            title="Geser ke Bawah"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface SortableSidebarWidgetItemProps {
  widgetKey: HomeSidebarWidgetKey;
  idx: number;
  handleMoveWidget: (index: number, direction: 'up' | 'down') => void;
  totalLength: number;
}

const SortableSidebarWidgetItem: React.FC<SortableSidebarWidgetItemProps> = ({
  widgetKey,
  idx,
  handleMoveWidget,
  totalLength,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widgetKey });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 1,
    opacity: isDragging ? 0.6 : 1,
  };

  const meta = SIDEBAR_WIDGETS_META.find((m) => m.key === widgetKey) || SIDEBAR_WIDGETS_META[0];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-2 sm:p-2.5 rounded-xl transition-all flex items-center justify-between gap-2 border bg-black/40 hover:bg-white/[0.04] border-white/[0.06] text-slate-200"
    >
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          className="p-1 cursor-grab active:cursor-grabbing text-slate-500 hover:text-white transition-colors shrink-0 touch-none"
          title="Tarik untuk menggeser posisi widget"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>

        <span className="w-4 text-center font-mono font-bold text-[10px] text-slate-500 shrink-0">
          #{idx + 1}
        </span>

        <div className="min-w-0">
          <span className="font-semibold text-xs text-white truncate block">
            {meta.label}
          </span>
          <span className="text-[10px] text-slate-400 line-clamp-1">
            {meta.description}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          disabled={idx === 0}
          onClick={() => handleMoveWidget(idx, 'up')}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-colors cursor-pointer"
          title="Geser ke Atas"
        >
          <ChevronUp className="w-3 h-3" />
        </button>
        <button
          type="button"
          disabled={idx === totalLength - 1}
          onClick={() => handleMoveWidget(idx, 'down')}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-colors cursor-pointer"
          title="Geser ke Bawah"
        >
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
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
  /** Fixed-order groups (recommendation rows) hide the drag handle and arrows. */
  fixedOrder?: boolean;
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
  fixedOrder = false,
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
  const effectiveSourceType =
    sectionConfig?.sourceType ?? (keyId === 'fd_editors_pick' ? 'manual' : 'auto');
  const isManual = effectiveSourceType === 'manual';
  const hasCustomTitle = !!sectionConfig?.title && sectionConfig.title.trim().length > 0;
  const isEnabled = sectionConfig?.enabled !== false;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-2.5 rounded-2xl transition-all flex items-center justify-between gap-2 border ${
        active
          ? 'bg-white/[0.12] border-white/20 text-white shadow-sm'
          : !isEnabled
          ? 'bg-black/30 text-slate-400 border-white/[0.03] opacity-75 hover:opacity-100 hover:bg-white/[0.04]'
          : 'hover:bg-white/[0.04] text-slate-300 border-white/[0.04]'
      }`}
    >
      {/* Drag Handle Button (hidden when the group has a fixed order) */}
      {fixedOrder ? (
        <span className="w-6 shrink-0" aria-hidden="true" />
      ) : (
        <button
          type="button"
          className="p-1 cursor-grab active:cursor-grabbing text-slate-500 hover:text-white transition-colors shrink-0 touch-none"
          title="Tarik untuk menggeser posisi seksi"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}

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
        {!isEnabled && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider bg-red-500/15 text-red-400 border border-red-500/30">
            Off
          </span>
        )}
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
          isManual 
            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' 
            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
        }`}>
          {isManual ? 'Manual' : 'Auto'}
        </span>

        {!fixedOrder && (
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
        )}
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
    updateFilmDbSectionOrder,
    updateHomepageLayout,
    showToast,
  } = useApp();

  // Top-level Area Switch: Beranda | Film Database | Halaman Rekomendasi
  const [adminAreaTab, setAdminAreaTab] = useState<
    'home' | 'film_database' | 'recommendations'
  >('home');

  // Layout Reordering States (9 Blocks & Sidebar)
  const [orderedBlockKeys, setOrderedBlockKeys] = useState<HomeBlockKey[]>(() => {
    return resolveBlockOrder(homepageSectionsConfig?.blockOrder);
  });

  const [sidebarPosition, setSidebarPosition] = useState<'right' | 'left' | 'hidden'>(() => {
    return homepageSectionsConfig?.sidebarPosition || 'right';
  });

  const [orderedWidgetKeys, setOrderedWidgetKeys] = useState<HomeSidebarWidgetKey[]>(() => {
    return resolveSidebarWidgetOrder(homepageSectionsConfig?.sidebarWidgetOrder);
  });

  const [hiddenBlocks, setHiddenBlocks] = useState<HomeBlockKey[]>(() => {
    return resolveHiddenBlocks(homepageSectionsConfig?.hiddenBlocks);
  });

  const [isSavingLayout, setIsSavingLayout] = useState(false);

  // Keep a ref to the latest updateHomepageLayout to avoid re-triggering effects and stale closures
  const updateHomepageLayoutRef = useRef(updateHomepageLayout);
  updateHomepageLayoutRef.current = updateHomepageLayout;

  // Debounced auto-save queue refs
  const pendingLayoutUpdatesRef = useRef<{
    blockOrder?: HomeBlockKey[];
    sidebarPosition?: 'right' | 'left' | 'hidden';
    sidebarWidgetOrder?: HomeSidebarWidgetKey[];
    hiddenBlocks?: HomeBlockKey[];
  }>({});

  const rollbackStateRef = useRef<{
    blockOrder?: HomeBlockKey[];
    sidebarPosition?: 'right' | 'left' | 'hidden';
    sidebarWidgetOrder?: HomeSidebarWidgetKey[];
    hiddenBlocks?: HomeBlockKey[];
  }>({});

  const debounceTimerRef = useRef<any>(null);

  useEffect(() => {
    if (homepageSectionsConfig?.blockOrder) {
      setOrderedBlockKeys(resolveBlockOrder(homepageSectionsConfig.blockOrder));
    }
  }, [homepageSectionsConfig?.blockOrder]);

  useEffect(() => {
    if (homepageSectionsConfig?.sidebarPosition) {
      setSidebarPosition(homepageSectionsConfig.sidebarPosition);
    }
  }, [homepageSectionsConfig?.sidebarPosition]);

  useEffect(() => {
    if (homepageSectionsConfig?.sidebarWidgetOrder) {
      setOrderedWidgetKeys(resolveSidebarWidgetOrder(homepageSectionsConfig.sidebarWidgetOrder));
    }
  }, [homepageSectionsConfig?.sidebarWidgetOrder]);

  useEffect(() => {
    if (homepageSectionsConfig?.hiddenBlocks !== undefined) {
      setHiddenBlocks(resolveHiddenBlocks(homepageSectionsConfig.hiddenBlocks));
    }
  }, [homepageSectionsConfig?.hiddenBlocks]);

  // Flush pending changes to Firestore using the current ref to updateHomepageLayout
  const flushPendingLayoutSave = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const payload = { ...pendingLayoutUpdatesRef.current };
    if (Object.keys(payload).length === 0) return;

    pendingLayoutUpdatesRef.current = {};
    const rollback = { ...rollbackStateRef.current };

    try {
      setIsSavingLayout(true);
      await updateHomepageLayoutRef.current(payload);
      // Succeeded, clear rollback reference
      rollbackStateRef.current = {};
    } catch (err) {
      console.error('[AdminHomepageSections] Failed to save debounced layout:', err);
      // Rollback optimistic states to previous snapshot
      if (rollback.blockOrder) setOrderedBlockKeys(rollback.blockOrder);
      if (rollback.sidebarPosition) setSidebarPosition(rollback.sidebarPosition);
      if (rollback.sidebarWidgetOrder) setOrderedWidgetKeys(rollback.sidebarWidgetOrder);
      if (rollback.hiddenBlocks) setHiddenBlocks(rollback.hiddenBlocks);
    } finally {
      setIsSavingLayout(false);
    }
  }, []);

  // Flush on unmount if any pending saves remain (runs once with [] deps)
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      const payload = { ...pendingLayoutUpdatesRef.current };
      if (Object.keys(payload).length > 0) {
        pendingLayoutUpdatesRef.current = {};
        updateHomepageLayoutRef.current(payload).catch((err) => {
          console.error('[AdminHomepageSections] Flush on unmount failed:', err);
        });
      }
    };
  }, []);

  // Queue a change and debounce save by 800ms
  const queueLayoutFieldSave = useCallback((
    field: 'blockOrder' | 'sidebarPosition' | 'sidebarWidgetOrder' | 'hiddenBlocks',
    nextValue: any,
    previousValue: any
  ) => {
    // Record rollback state if not already set for this batch
    if (!(field in rollbackStateRef.current)) {
      rollbackStateRef.current[field] = previousValue;
    }
    pendingLayoutUpdatesRef.current[field] = nextValue;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      flushPendingLayoutSave();
    }, 800);
  }, [flushPendingLayoutSave]);

  const handleBlockDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = orderedBlockKeys.indexOf(active.id as HomeBlockKey);
      const newIndex = orderedBlockKeys.indexOf(over.id as HomeBlockKey);
      if (oldIndex !== -1 && newIndex !== -1) {
        const prev = [...orderedBlockKeys];
        const next = arrayMove(orderedBlockKeys, oldIndex, newIndex);
        setOrderedBlockKeys(next);
        queueLayoutFieldSave('blockOrder', next, prev);
      }
    }
  };

  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= orderedBlockKeys.length) return;
    const prev = [...orderedBlockKeys];
    const next = [...orderedBlockKeys];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    setOrderedBlockKeys(next);
    queueLayoutFieldSave('blockOrder', next, prev);
  };

  const handleToggleBlockHidden = (blockKey: HomeBlockKey) => {
    const prev = [...hiddenBlocks];
    const isCurrentlyHidden = hiddenBlocks.includes(blockKey);

    if (isCurrentlyHidden) {
      // Unhide
      const next = hiddenBlocks.filter((k) => k !== blockKey);
      setHiddenBlocks(next);
      queueLayoutFieldSave('hiddenBlocks', next, prev);
    } else {
      // Hide - verify at least one visible block remains
      const visibleCount = orderedBlockKeys.filter((k) => !hiddenBlocks.includes(k)).length;
      if (visibleCount <= 1) {
        showToast('Minimal satu blok harus tetap tampil', 'error');
        return; // Don't allow hiding all blocks
      }
      const next = [...hiddenBlocks, blockKey];
      setHiddenBlocks(next);
      queueLayoutFieldSave('hiddenBlocks', next, prev);
    }
  };

  const handleWidgetDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = orderedWidgetKeys.indexOf(active.id as HomeSidebarWidgetKey);
      const newIndex = orderedWidgetKeys.indexOf(over.id as HomeSidebarWidgetKey);
      if (oldIndex !== -1 && newIndex !== -1) {
        const prev = [...orderedWidgetKeys];
        const next = arrayMove(orderedWidgetKeys, oldIndex, newIndex);
        setOrderedWidgetKeys(next);
        queueLayoutFieldSave('sidebarWidgetOrder', next, prev);
      }
    }
  };

  const handleMoveWidget = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= orderedWidgetKeys.length) return;
    const prev = [...orderedWidgetKeys];
    const next = [...orderedWidgetKeys];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    setOrderedWidgetKeys(next);
    queueLayoutFieldSave('sidebarWidgetOrder', next, prev);
  };

  const handleSidebarPositionChange = (pos: 'right' | 'left' | 'hidden') => {
    if (pos === sidebarPosition) return;
    const prev = sidebarPosition;
    setSidebarPosition(pos);
    queueLayoutFieldSave('sidebarPosition', pos, prev);
  };

  // Immediate save on click "Simpan Sekarang" button (flushes any debounce)
  const handleSaveLayout = async () => {
    if (debounceTimerRef.current) {
      await flushPendingLayoutSave();
    } else {
      try {
        setIsSavingLayout(true);
        await updateHomepageLayout({
          blockOrder: orderedBlockKeys,
          sidebarPosition,
          sidebarWidgetOrder: orderedWidgetKeys,
          hiddenBlocks,
        });
      } catch (err) {
        console.error('[AdminHomepageSections] Failed to manual save layout:', err);
      } finally {
        setIsSavingLayout(false);
      }
    }
  };

  const handleResetLayoutToDefault = async () => {
    const confirmed = window.confirm(
      'Kembalikan seluruh susunan beranda (urutan 9 blok, posisi sidebar, dan widget) ke setelan bawaan?'
    );
    if (!confirmed) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    pendingLayoutUpdatesRef.current = {};

    const prevBlocks = [...orderedBlockKeys];
    const prevPos = sidebarPosition;
    const prevWidgets = [...orderedWidgetKeys];
    const prevHidden = [...hiddenBlocks];

    const defaultBlocks = [...DEFAULT_BLOCK_ORDER];
    const defaultPosition = 'right';
    const defaultWidgets = [...DEFAULT_SIDEBAR_WIDGET_ORDER];
    const defaultHidden: HomeBlockKey[] = [];

    setOrderedBlockKeys(defaultBlocks);
    setSidebarPosition(defaultPosition);
    setOrderedWidgetKeys(defaultWidgets);
    setHiddenBlocks(defaultHidden);

    try {
      setIsSavingLayout(true);
      await updateHomepageLayout({
        blockOrder: defaultBlocks,
        sidebarPosition: defaultPosition,
        sidebarWidgetOrder: defaultWidgets,
        hiddenBlocks: defaultHidden,
      });
    } catch (err) {
      console.error('Failed to reset layout:', err);
      // Rollback to previous state
      setOrderedBlockKeys(prevBlocks);
      setSidebarPosition(prevPos);
      setOrderedWidgetKeys(prevWidgets);
      setHiddenBlocks(prevHidden);
    } finally {
      setIsSavingLayout(false);
    }
  };

  // Compute split column blocks that render without sidebar
  const splitColumnBlocks = useMemo(() => {
    return getSplitColumnBlocks(orderedBlockKeys, hiddenBlocks);
  }, [orderedBlockKeys, hiddenBlocks]);

  // Ordered list of section keys
  const [orderedKeys, setOrderedKeys] = useState<HomepageSectionKey[]>(() => {
    return resolveSectionOrder(homepageSectionsConfig?.sectionOrder);
  });

  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // Keep orderedKeys synced with remote config
  useEffect(() => {
    if (homepageSectionsConfig?.sectionOrder && homepageSectionsConfig.sectionOrder.length > 0) {
      setOrderedKeys(resolveSectionOrder(homepageSectionsConfig.sectionOrder));
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

  // Ordered list of section keys for Film Database
  const [orderedFilmDbKeys, setOrderedFilmDbKeys] = useState<HomepageSectionKey[]>(() => {
    return resolveFilmDbSectionOrder(homepageSectionsConfig?.filmDbSectionOrder);
  });

  const [isSavingFilmDbOrder, setIsSavingFilmDbOrder] = useState(false);

  // Keep orderedFilmDbKeys synced with remote config
  useEffect(() => {
    if (homepageSectionsConfig?.filmDbSectionOrder && homepageSectionsConfig.filmDbSectionOrder.length > 0) {
      setOrderedFilmDbKeys(resolveFilmDbSectionOrder(homepageSectionsConfig.filmDbSectionOrder));
    }
  }, [homepageSectionsConfig?.filmDbSectionOrder]);

  const handleFilmDbDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = orderedFilmDbKeys.indexOf(active.id as HomepageSectionKey);
      const newIndex = orderedFilmDbKeys.indexOf(over.id as HomepageSectionKey);
      if (oldIndex !== -1 && newIndex !== -1) {
        const nextOrder = arrayMove(orderedFilmDbKeys, oldIndex, newIndex);
        setOrderedFilmDbKeys(nextOrder);
        try {
          setIsSavingFilmDbOrder(true);
          await updateFilmDbSectionOrder(nextOrder);
        } catch (err) {
          console.error('Failed to save film database section order:', err);
        } finally {
          setIsSavingFilmDbOrder(false);
        }
      }
    }
  };

  const handleMoveFilmDbSectionOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= orderedFilmDbKeys.length) return;
    const next = [...orderedFilmDbKeys];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    setOrderedFilmDbKeys(next);
    try {
      setIsSavingFilmDbOrder(true);
      await updateFilmDbSectionOrder(next);
    } catch (err) {
      console.error('Failed to save film database section order:', err);
    } finally {
      setIsSavingFilmDbOrder(false);
    }
  };

  const handleSaveFilmDbSectionOrder = async () => {
    try {
      setIsSavingFilmDbOrder(true);
      await updateFilmDbSectionOrder(orderedFilmDbKeys);
    } catch (err) {
      console.error('Failed to save film database section order:', err);
    } finally {
      setIsSavingFilmDbOrder(false);
    }
  };

  // Streaming platforms derived from loaded films for fd_streaming dropdown
  const streamingPlatforms = useMemo(() => {
    return getStreamingPlatforms(films);
  }, [films]);

  // Selected section to edit in focus, default to the first one based on area
  const [activeSectionKey, setActiveSectionKey] = useState<HomepageSectionKey>('hero_slider');

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
    const defaultVal = getDefaultSectionConfig(activeSectionKey, currentMeta);
    const draft = draftConfigs[activeSectionKey];
    const fromRemote = homepageSectionsConfig?.sections?.[activeSectionKey];
    const base: Partial<SectionConfig> = draft || fromRemote || {};
    return {
      ...defaultVal,
      ...base,
      itemIds: base.itemIds || [],
      enabled: base.enabled !== undefined ? base.enabled : true,
    };
  }, [draftConfigs, homepageSectionsConfig, activeSectionKey, currentMeta]);

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
    const meta = HOMEPAGE_SECTIONS_META.find(m => m.key === key) || HOMEPAGE_SECTIONS_META[0];
    const defaultReset: SectionConfig = getDefaultSectionConfig(key, meta);
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

    if (currentMeta.targetType === 'films') {
      return searchFilmPickerItems(films, searchQuery, 8);
    }

    const query = searchQuery.trim().toLowerCase();
    return publishedArticles
      .filter(a => a.title.toLowerCase().includes(query) || a.tags?.some(t => t.toLowerCase().includes(query)))
      .slice(0, 8);
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

  // Film manual picker rows, including ids that no longer match a film
  const filmPickerSelection = useMemo(() => {
    if (currentMeta.targetType !== 'films') return [];
    return buildFilmPickerSelection(films, currentConfig.itemIds || []);
  }, [currentConfig.itemIds, currentMeta.targetType, films]);

  const hasSelectedItems =
    currentMeta.targetType === 'films'
      ? filmPickerSelection.length > 0
      : selectedItemsData.length > 0;

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
    const selectedCategory = normalizeArticleCategory(currentConfig.category) || '';
    if (selectedCategory && CATEGORY_SPECIFIC_SUBCATEGORIES[selectedCategory]) {
      return CATEGORY_SPECIFIC_SUBCATEGORIES[selectedCategory];
    }
    return Object.entries(SUBCATEGORY_LABELS).map(([val, label]) => ({ val, label }));
  }, [currentConfig.category]);

  // Genre options for film sections (canonical names + currently saved genre)
  const filmGenreOptions = useMemo(() => {
    const options = collectGenreOptions(films);
    const selected = resolveFilmSectionGenre(currentConfig);
    if (selected) {
      const selectedKey = normalizeGenreName(selected).toLowerCase();
      const exists = options.some(
        option => normalizeGenreName(option.value).toLowerCase() === selectedKey
      );
      if (!exists) {
        options.push({ value: selected, label: selected, count: 0 });
      }
    }
    return options;
  }, [films, currentConfig.genre, currentConfig.subCategory]);

  // Effective genre, including a legacy subCategory that equals a genre name
  const selectedGenreValue = useMemo(
    () => resolveFilmSectionGenre(currentConfig),
    [currentConfig.genre, currentConfig.subCategory]
  );

  // Live match count, resolved exactly like the public section
  const matchingFilmCount = useMemo(() => {
    if (currentMeta.targetType !== 'films') return 0;

    switch (activeSectionKey) {
      case 'home_film_recs':
        return resolveHomeFilmRecs(films, currentConfig).length;
      case 'hero_to_watch':
        return getHeroToWatch(films, currentConfig).length;
      case 'home_streaming':
        return resolveHomeStreaming(films, currentConfig).length;
      case 'home_film_indonesia':
        return resolveHomeFilmIndonesia(films, currentConfig).length;
      default:
        return resolveFilmDbSection(activeSectionKey, films, currentConfig).length;
    }
  }, [activeSectionKey, currentConfig, currentMeta.targetType, films]);

  // Recommendation rows use a fixed order, so they are never drag-reordered.
  const isRecArea = adminAreaTab === 'recommendations';
  const areaSectionKeys: HomepageSectionKey[] =
    adminAreaTab === 'home'
      ? orderedKeys
      : adminAreaTab === 'film_database'
      ? orderedFilmDbKeys
      : DEFAULT_REC_SECTION_ORDER;
  const areaIsSavingOrder =
    adminAreaTab === 'home' ? isSavingOrder : adminAreaTab === 'film_database' ? isSavingFilmDbOrder : false;

  const handleSaveAreaSectionOrder = () => {
    if (adminAreaTab === 'home') {
      handleSaveSectionOrder();
    } else if (adminAreaTab === 'film_database') {
      handleSaveFilmDbSectionOrder();
    }
  };

  const handleMoveAreaSectionOrder = (index: number, direction: 'up' | 'down') => {
    if (adminAreaTab === 'home') {
      handleMoveSectionOrder(index, direction);
    } else if (adminAreaTab === 'film_database') {
      handleMoveFilmDbSectionOrder(index, direction);
    }
    // Recommendation rows are fixed: no-op.
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Area Navigation */}
      <div className="bg-[#171717] border border-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#FF2E7E]/10 border border-[#FF2E7E]/30 flex items-center justify-center shrink-0 text-[#FF2E7E]">
              {adminAreaTab === 'home' ? (
                <Layout className="w-6 h-6" />
              ) : adminAreaTab === 'film_database' ? (
                <Film className="w-6 h-6" />
              ) : (
                <Sparkles className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-black text-white text-xl tracking-tight">
                  {adminAreaTab === 'home'
                    ? 'Kontrol Seksi Beranda'
                    : adminAreaTab === 'film_database'
                    ? 'Kontrol Seksi Film Database'
                    : 'Kontrol Halaman Rekomendasi'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#FF2E7E]/15 border border-[#FF2E7E]/30 text-[#FF2E7E] text-[10px] font-bold tracking-wider uppercase">
                  {adminAreaTab === 'home'
                    ? 'Beranda'
                    : adminAreaTab === 'film_database'
                    ? 'Film Database'
                    : 'Halaman Rekomendasi'}
                </span>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                {adminAreaTab === 'home'
                  ? 'Kustomisasi judul, mode kurasi otomatis (kategori & sub-kategori), atau pilih item manual secara spesifik untuk tiap seksi di halaman beranda. Geser urutan seksi dengan drag-and-drop. Perubahan tersimpan secara realtime di Firestore.'
                  : adminAreaTab === 'film_database'
                  ? 'Konfigurasi 5 seksi kurasi Film Database (On Theatres Now, What\'s Streaming, Coming Soon, Animation Rekomendasi, dan Fan\'s Favourite). Atur urutan seksi, status aktif, filter platform streaming, dan batas minimum voting.'
                  : 'Kelola empat baris editorial di halaman Rekomendasi Film: Malam Ini, Buat Berdua, Hidden Gems, dan Di Bawah 100 Menit. Urutan baris tetap, tetapi judul, mode kurasi, filter genre/tag, dan limit bisa diubah.'}
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-400 bg-black/40 border border-white/[0.06] p-3 rounded-2xl shrink-0">
            <span className="text-slate-300 font-semibold">
              {adminAreaTab === 'home'
                ? `Total ${orderedKeys.length} Seksi Terhubung`
                : adminAreaTab === 'film_database'
                ? `Total ${orderedFilmDbKeys.length} Seksi Film Database`
                : `Total ${DEFAULT_REC_SECTION_ORDER.length} Baris Rekomendasi`}
            </span>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Tersinkronisasi langsung ke pengunjung publik
            </div>
          </div>
        </div>

        {/* Top-Level Tab Switcher: Beranda | Film Database | Halaman Rekomendasi */}
        <div className="pt-2 border-t border-white/[0.06] flex flex-wrap items-center gap-2">
          <button
            type="button"
            id="tab-area-home"
            onClick={() => {
              setAdminAreaTab('home');
              if (currentMeta.area !== 'home') {
                setActiveSectionKey('hero_slider');
              }
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              adminAreaTab === 'home'
                ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/25'
                : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]'
            }`}
          >
            <Layout className="w-4 h-4" />
            <span>Beranda</span>
          </button>

          <button
            type="button"
            id="tab-area-film-database"
            onClick={() => {
              setAdminAreaTab('film_database');
              if (currentMeta.area !== 'film_database') {
                setActiveSectionKey('fd_on_theatres');
              }
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              adminAreaTab === 'film_database'
                ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/25'
                : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Film Database</span>
          </button>

          <button
            type="button"
            id="tab-area-recommendations"
            onClick={() => {
              setAdminAreaTab('recommendations');
              if (currentMeta.area !== 'recommendations') {
                setActiveSectionKey('rec_tonight');
              }
              setSearchQuery('');
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              adminAreaTab === 'recommendations'
                ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/25'
                : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Halaman Rekomendasi</span>
          </button>
        </div>
      </div>

      {/* CARD 1: SUSUNAN BERANDA (REORDER BLOCKS & SIDEBAR) - Only for Beranda */}
      {adminAreaTab === 'home' && (
      <div className="bg-[#171717] border border-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF2E7E]/15 border border-[#FF2E7E]/30 flex items-center justify-center text-[#FF2E7E] shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-black text-white text-lg tracking-tight">
                  Susunan Beranda
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-white/[0.08] text-slate-300 text-[10px] font-bold uppercase tracking-wider">
                  Layout Builder
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">
                Atur urutan tampilan blok di halaman beranda dengan drag-and-drop. Blok <strong>Lebar penuh</strong> membentang penuh, sedangkan blok <strong>Kolom utama</strong> akan berdampingan dengan Sidebar.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              type="button"
              id="reset-homepage-layout-btn"
              onClick={handleResetLayoutToDefault}
              disabled={isSavingLayout}
              className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white text-xs font-bold transition-all border border-white/[0.08] cursor-pointer disabled:opacity-50 flex items-center gap-1.5 active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset ke Default</span>
            </button>

            <button
              type="button"
              id="save-homepage-layout-btn"
              onClick={handleSaveLayout}
              disabled={isSavingLayout}
              className="px-4 py-2 rounded-xl bg-[#FF2E7E] hover:bg-[#FF2E7E]/90 text-white text-xs font-bold transition-all shadow-md shadow-[#FF2E7E]/20 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 active:scale-95"
            >
              {isSavingLayout ? (
                <span>Menyimpan...</span>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Susunan Beranda</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* WARNING BANNER: Split Column Blocks */}
        {splitColumnBlocks.length > 0 && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3 text-amber-300">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-bold text-amber-200 block">
                Perhatian: Sebagian blok Kolom Utama terpisah dari grup utama
              </span>
              <p className="text-amber-300/90 leading-relaxed">
                Blok ini terpisah dari grup utama, sehingga tampil tanpa sidebar dan selebar container:
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {splitColumnBlocks.map((key) => {
                  const meta = HOME_BLOCKS_META.find((m) => m.key === key);
                  return (
                    <span
                      key={key}
                      className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-200 border border-amber-500/30 font-semibold text-[11px]"
                    >
                      {meta?.label || key}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 2-Column Inside Layout Card: Left 9 Blocks (7 cols), Right Sidebar Settings (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left: 9 Blocks Drag-and-Drop */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between pb-1">
              <div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Urutan {orderedBlockKeys.length} Blok Beranda
                </span>
                <span className="text-[11px] text-slate-500">
                  Tarik ikon ⋮⋮ atau panah ↑ ↓, serta gunakan ikon mata untuk menampilkan/menyembunyikan
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded-lg border border-white/[0.06]">
                {orderedBlockKeys.length - hiddenBlocks.length} Aktif / {orderedBlockKeys.length} Total
              </span>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleBlockDragEnd}
            >
              <SortableContext
                items={orderedBlockKeys}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {orderedBlockKeys.map((key, idx) => (
                    <SortableBlockItem
                      key={key}
                      blockKey={key}
                      idx={idx}
                      handleMoveBlock={handleMoveBlock}
                      totalLength={orderedBlockKeys.length}
                      isHidden={hiddenBlocks.includes(key)}
                      onToggleHidden={handleToggleBlockHidden}
                      canHide={orderedBlockKeys.filter((k) => !hiddenBlocks.includes(k)).length > 1}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {/* Right: Sidebar Settings Sub-Card */}
          <div className="lg:col-span-5 bg-black/30 border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-4">
            <div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Pengaturan Sidebar Beranda
              </span>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Sidebar duduk berdampingan dengan kelompok pertama dari blok-blok <strong className="text-slate-200">Kolom Utama</strong>. Jika disembunyikan, kolom utama akan tampil selebar layar container.
              </p>
            </div>

            {/* Position Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Posisi Sidebar
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/50 rounded-xl border border-white/[0.08]">
                <button
                  type="button"
                  id="sidebar-pos-right-btn"
                  onClick={() => handleSidebarPositionChange('right')}
                  className={`py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    sidebarPosition === 'right'
                      ? 'bg-white/[0.15] text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Kanan
                </button>
                <button
                  type="button"
                  id="sidebar-pos-left-btn"
                  onClick={() => handleSidebarPositionChange('left')}
                  className={`py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    sidebarPosition === 'left'
                      ? 'bg-white/[0.15] text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Kiri
                </button>
                <button
                  type="button"
                  id="sidebar-pos-hidden-btn"
                  onClick={() => handleSidebarPositionChange('hidden')}
                  className={`py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    sidebarPosition === 'hidden'
                      ? 'bg-white/[0.15] text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sembunyikan
                </button>
              </div>
            </div>

            {/* Reorderable Sidebar Widgets List */}
            <div className="space-y-2 pt-2 border-t border-white/[0.06]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Urutan Widget Sidebar (5 Item)
                </span>
                <span className="text-[10px] text-slate-500">Tarik ⋮⋮</span>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleWidgetDragEnd}
              >
                <SortableContext
                  items={orderedWidgetKeys}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {orderedWidgetKeys.map((key, idx) => (
                      <SortableSidebarWidgetItem
                        key={key}
                        widgetKey={key}
                        idx={idx}
                        handleMoveWidget={handleMoveWidget}
                        totalLength={orderedWidgetKeys.length}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Main Grid: Left Navigation / Right Config Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Section Content Source List (4 cols) */}
        <div className="lg:col-span-4 bg-[#171717] border border-white/[0.08] rounded-3xl p-3.5 sm:p-4 space-y-3 shadow-lg">
          <div className="px-2 py-1 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                {adminAreaTab === 'home'
                  ? 'Sumber Konten Seksi'
                  : adminAreaTab === 'film_database'
                  ? 'Urutan Seksi Film Database'
                  : 'Halaman Rekomendasi'}
              </span>
              <span className="text-[10px] text-slate-500">
                {isRecArea ? 'Urutan baris tetap (tidak bisa digeser)' : 'Tarik ikon ⋮⋮ atau gunakan panah ↑ ↓'}
              </span>
            </div>
            {isRecArea ? (
              <span className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-400 text-[11px] font-bold shrink-0">
                Urutan tetap
              </span>
            ) : (
              <button
                type="button"
                id="save-section-order-btn"
                onClick={handleSaveAreaSectionOrder}
                disabled={areaIsSavingOrder}
                className="px-3 py-1.5 rounded-xl bg-[#FF2E7E] hover:bg-[#FF2E7E]/90 text-white text-[11px] font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1 shrink-0 active:scale-95"
              >
                {areaIsSavingOrder ? (
                  <span>Menyimpan...</span>
                ) : (
                  <>
                    <Save className="w-3 h-3" />
                    <span>Simpan Urutan</span>
                  </>
                )}
              </button>
            )}
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={
              adminAreaTab === 'home'
                ? handleDragEnd
                : adminAreaTab === 'film_database'
                ? handleFilmDbDragEnd
                : undefined
            }
          >
            <SortableContext
              items={areaSectionKeys}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1.5 max-h-[660px] overflow-y-auto pr-1">
                {areaSectionKeys.map((key, idx) => (
                  <SortableSectionItem
                    key={key}
                    keyId={key}
                    idx={idx}
                    activeSectionKey={activeSectionKey}
                    setActiveSectionKey={setActiveSectionKey}
                    setSearchQuery={setSearchQuery}
                    draftConfigs={draftConfigs}
                    homepageSectionsConfig={homepageSectionsConfig}
                    handleMoveSectionOrder={handleMoveAreaSectionOrder}
                    orderedLength={areaSectionKeys.length}
                    fixedOrder={isRecArea}
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
                  : currentConfig.sourceType === 'slider'
                  ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              }`}>
                Mode: {currentConfig.sourceType === 'manual' ? 'Manual (Pick Items)' : currentConfig.sourceType === 'slider' ? 'Slider / Carousel' : 'Auto (Filter & Sort)'}
              </span>
            </div>
          </div>

          {/* Form Field 0: Aktif Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/40 border border-white/[0.08]">
            <div>
              <span className="text-xs font-bold text-white block">Status Penayangan Seksi</span>
              <span className="text-[11px] text-slate-400">
                {currentConfig.enabled !== false
                  ? 'Seksi ini aktif dan akan ditampilkan di aplikasi.'
                  : 'Seksi ini dinonaktifkan (disembunyikan dari penayangan publik).'}
              </span>
            </div>
            <button
              type="button"
              id="toggle-section-enabled"
              onClick={() => updateCurrentDraft({ enabled: currentConfig.enabled === false ? true : false })}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                currentConfig.enabled !== false
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/15 border border-red-500/30 text-red-300'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  currentConfig.enabled !== false ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                }`}
              />
              <span>{currentConfig.enabled !== false ? 'Aktif' : 'Non-aktif'}</span>
            </button>
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

          {/* Form Field 1b: Custom Description */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300">
              Deskripsi
            </label>
            <input
              id={`input-section-description-${currentMeta.key}`}
              type="text"
              value={currentConfig.description || ''}
              onChange={(e) => updateCurrentDraft({ description: e.target.value })}
              placeholder={`Default: ${currentMeta.defaultDescription || ''}`}
              maxLength={140}
              className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/[0.1] focus:border-[#FF2E7E] text-white text-xs sm:text-sm placeholder:text-slate-600 outline-none transition-colors"
            />
            <p className="text-[11px] text-slate-500">
              Maksimal 140 karakter. Kosongkan untuk memakai deskripsi bawaan kode.
            </p>
          </div>

          {/* Form Field 2: Source Type Toggle */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300">
              Metode Pengambilan Konten (Source Type)
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-black/40 rounded-2xl border border-white/[0.08]">
              <button
                type="button"
                id="toggle-source-auto"
                onClick={() => updateCurrentDraft({ sourceType: 'auto' })}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  currentConfig.sourceType === 'auto'
                    ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Otomatis</span>
              </button>

              <button
                type="button"
                id="toggle-source-manual"
                onClick={() => updateCurrentDraft({ sourceType: 'manual' })}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  currentConfig.sourceType === 'manual'
                    ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Manual</span>
              </button>

              <button
                type="button"
                id="toggle-source-slider"
                onClick={() => updateCurrentDraft({ sourceType: 'slider' })}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  currentConfig.sourceType === 'slider'
                    ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Slider</span>
              </button>
            </div>
          </div>

          {/* SUB-FORM A: AUTO MODE CONFIG */}
          {(currentConfig.sourceType === 'auto' || currentConfig.sourceType === 'slider') && (
            <div className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-white/[0.08] space-y-4">
              <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5 pb-2 border-b border-white/[0.06]">
                <Sliders className="w-3.5 h-3.5 text-[#FF2E7E]" />
                <span>Pengaturan Filter Otomatis</span>
              </div>

              {(activeSectionKey === 'fd_film_indonesia' ||
                activeSectionKey === 'home_film_indonesia') && (
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Otomatis menampilkan film dengan negara asal Indonesia atau tag Film Indonesia.
                  Tambahkan tag Film Indonesia untuk film yang belum punya data TMDB.
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category Dropdown */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-slate-400">
                    Kategori Utama Konten
                  </label>
                  <select
                    id="select-category-auto"
                    value={normalizeArticleCategory(currentConfig.category) || ''}
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

                {/* Genre (films) or Sub-Category (articles) Dropdown */}
                {currentMeta.targetType === 'films' ? (
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-slate-400">
                      Genre (Opsional)
                    </label>
                    <select
                      id="select-genre-auto"
                      value={selectedGenreValue}
                      onChange={(e) => {
                        const value = e.target.value;
                        updateCurrentDraft({
                          genre: value || undefined,
                          subCategory: '',
                        });
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-[#171717] border border-white/[0.1] text-white text-xs outline-none focus:border-[#FF2E7E] transition-colors"
                    >
                      <option value="">Semua genre</option>
                      {filmGenreOptions.map(({ value, label, count }) => (
                        <option key={value} value={value}>
                          {label} ({count})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
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
                )}

                {/* Platform select (only for streaming sections, fed by getStreamingPlatforms) */}
                {(activeSectionKey === 'fd_streaming' || activeSectionKey === 'home_streaming') && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-400">
                      Filter Platform Streaming (Khusus Explore What's Streaming)
                    </label>
                    <select
                      id="select-platform-streaming"
                      value={currentConfig.platform || ''}
                      onChange={(e) => updateCurrentDraft({ platform: e.target.value || undefined })}
                      className="w-full px-3 py-2 rounded-xl bg-[#171717] border border-white/[0.1] text-white text-xs outline-none focus:border-[#FF2E7E] transition-colors"
                    >
                      <option value="">Semua Platform Streaming (Bawaan)</option>
                      {streamingPlatforms.map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.name} ({p.count} judul)
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-500">
                      Pilih satu platform streaming spesifik jika ingin mengunci seksi ini hanya untuk katalog platform tersebut.
                    </p>
                  </div>
                )}

                {/* Hidden Gems: minimum normalized Sotoy score */}
                {activeSectionKey === 'fd_hidden_gems' && (
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-slate-400">
                      Skor Minimal (Min Score)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      step={0.5}
                      value={typeof currentConfig.minScore === 'number' ? currentConfig.minScore : 8}
                      onChange={(e) => {
                        const parsed = parseFloat(e.target.value);
                        const next = isNaN(parsed) ? 8 : Math.min(10, Math.max(0, parsed));
                        updateCurrentDraft({ minScore: next });
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-[#171717] border border-white/[0.1] text-white text-xs outline-none focus:border-[#FF2E7E] transition-colors"
                    />
                    <p className="text-[10px] text-slate-500">
                      Skor Sotoy minimal (skala 0–10) agar film masuk Hidden Gems (default: 8).
                    </p>
                  </div>
                )}

                {/* MinVotes (fd_fans_favourite / fd_hidden_gems) */}
                {(activeSectionKey === 'fd_fans_favourite' || activeSectionKey === 'fd_hidden_gems') && (
                  <div className={`space-y-1.5 ${activeSectionKey === 'fd_fans_favourite' ? 'sm:col-span-2' : ''}`}>
                    <label className="block text-[11px] font-semibold text-slate-400">
                      Batas Minimum Suara (Min Votes)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={
                        typeof currentConfig.minVotes === 'number'
                          ? currentConfig.minVotes
                          : activeSectionKey === 'fd_hidden_gems'
                          ? 1
                          : 3
                      }
                      onChange={(e) => updateCurrentDraft({ minVotes: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                      className="w-full px-3 py-2 rounded-xl bg-[#171717] border border-white/[0.1] text-white text-xs outline-none focus:border-[#FF2E7E] transition-colors"
                    />
                    <p className="text-[10px] text-slate-500">
                      {activeSectionKey === 'fd_hidden_gems'
                        ? 'Film harus memiliki minimal total suara ini agar masuk ke Hidden Gems (default: 1).'
                        : "Film harus memiliki minimal total suara ini agar masuk ke Fan's Favourite (default: 3)."}
                    </p>
                  </div>
                )}

                {/* Hidden Gems: maximum votes */}
                {activeSectionKey === 'fd_hidden_gems' && (
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-slate-400">
                      Vote Maksimal (Max Votes)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={typeof currentConfig.maxVotes === 'number' ? currentConfig.maxVotes : 15}
                      onChange={(e) => updateCurrentDraft({ maxVotes: Math.max(1, parseInt(e.target.value, 10) || 15) })}
                      className="w-full px-3 py-2 rounded-xl bg-[#171717] border border-white/[0.1] text-white text-xs outline-none focus:border-[#FF2E7E] transition-colors"
                    />
                    <p className="text-[10px] text-slate-500">
                      Batas maksimal total suara agar film dianggap belum banyak dibicarakan (default: 15).
                    </p>
                  </div>
                )}

                {activeSectionKey === 'fd_hidden_gems' && (
                  <p className="sm:col-span-2 text-[10px] text-slate-500">
                    Hidden Gems menampilkan film berskor tinggi dengan vote sedikit. Naikkan Vote maksimal jika seksi terlalu kosong.
                  </p>
                )}

                {/* Optional Tag Filter */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-slate-400">
                    Filter Kata Kunci / Tag (Opsional)
                  </label>
                  <input
                    type="text"
                    value={currentConfig.tag || ''}
                    onChange={(e) => updateCurrentDraft({ tag: e.target.value })}
                    placeholder={currentMeta.targetType === 'films' ? 'Contoh: Film Indonesia, A24, Oscar' : 'Contoh: review, rekomendasi, 2024'}
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
                    value={currentConfig.sortBy || ''}
                    onChange={(e) => updateCurrentDraft({ sortBy: (e.target.value as any) || undefined })}
                    className="w-full px-3 py-2 rounded-xl bg-[#171717] border border-white/[0.1] text-white text-xs outline-none focus:border-[#FF2E7E] transition-colors"
                  >
                    {currentMeta.targetType === 'films' ? (
                      <>
                        <option value="">Bawaan seksi (otomatis)</option>
                        <option value="newest">Terbaru (Newest)</option>
                      </>
                    ) : (
                      <option value="newest">Terbaru (Newest)</option>
                    )}
                    <option value="rating">Rating / Skor Sotoy Tertinggi</option>
                    {currentMeta.targetType === 'films' ? (
                      <>
                        <option value="votes">Jumlah Suara Terbanyak (Total Votes)</option>
                        {currentMeta.area === 'film_database' && (
                          <option value="release_soonest">Rilis Paling Dekat (Release Soonest)</option>
                        )}
                        <option value="random">Acak (Random)</option>
                      </>
                    ) : (
                      <option value="views">Paling Banyak Dilihat (Views)</option>
                    )}
                  </select>
                  {currentMeta.targetType === 'films' && currentConfig.sortBy === 'random' && (
                    <p className="text-[10px] text-slate-400">
                      Urutan diacak setiap kali halaman dimuat ulang.
                    </p>
                  )}
                </div>

                {/* Limit / Count */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-slate-400">
                    Batas Jumlah Item (Limit)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={currentConfig.limit || getDefaultSectionConfig(activeSectionKey, currentMeta).limit || 12}
                    onChange={(e) => updateCurrentDraft({ limit: parseInt(e.target.value, 10) || 5 })}
                    className="w-full px-3 py-2 rounded-xl bg-[#171717] border border-white/[0.1] text-white text-xs outline-none focus:border-[#FF2E7E] transition-colors"
                  />
                </div>
              </div>

              {currentMeta.targetType === 'films' && (
                <p id="film-match-count" className="text-[11px] text-slate-400">
                  <span className="font-bold text-white">{matchingFilmCount}</span> film cocok
                </p>
              )}
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

              {activeSectionKey === 'fd_editors_pick' && (
                <p className="text-[10px] text-slate-500">
                  Pilih film satu per satu. Kosong = seksi disembunyikan di halaman Film Database.
                </p>
              )}

              {/* Legacy hero_to_watch data may still contain article ids */}
              {activeSectionKey === 'hero_to_watch' &&
                (currentConfig.itemIds || []).length > 0 &&
                selectedItemsData.length === 0 && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2 text-[11px] text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                    <span>
                      Daftar lama berisi artikel. Pilih ulang film atau tekan Reset ke Bawaan Kode.
                    </span>
                  </div>
                )}

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
                    {currentMeta.targetType === 'films'
                      ? searchResults.map((film: any) => {
                          const row = getFilmPickerRow(film);
                          const isAdded = (currentConfig.itemIds || []).includes(row.id);
                          return (
                            <div
                              key={row.id}
                              title={row.id}
                              className="flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-white/[0.06] transition-colors text-xs"
                            >
                              <img
                                src={row.poster}
                                alt={row.title}
                                loading="lazy"
                                onError={(e) => {
                                  if (e.currentTarget.src !== DEFAULT_POSTER) {
                                    e.currentTarget.src = DEFAULT_POSTER;
                                  }
                                }}
                                className="w-9 h-[54px] rounded-md object-cover shrink-0 bg-white/5"
                              />
                              <div className="min-w-0 flex-1 pr-2">
                                <div className="font-semibold text-white truncate">{row.title}</div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {row.year || '—'} · {row.typeLabel}
                                </div>
                              </div>
                              <button
                                type="button"
                                disabled={isAdded}
                                onClick={() => handleAddItem(row.id)}
                                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
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
                        })
                      : searchResults.map((item: any) => {
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
                {!hasSelectedItems ? (
                  <div className="text-center py-6 border border-dashed border-white/10 rounded-2xl text-slate-500 text-xs">
                    Belum ada item manual yang dipilih. Gunakan pencarian di atas untuk menambahkan.
                  </div>
                ) : currentMeta.targetType === 'films' ? (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {filmPickerSelection.map((entry, idx) => (
                      <div
                        key={`${entry.id}-${idx}`}
                        title={entry.id}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#171717] border border-white/[0.06] hover:border-white/20 transition-all text-xs"
                      >
                        <span className="w-5 font-mono text-[11px] font-bold text-slate-500 shrink-0">
                          #{idx + 1}
                        </span>

                        {entry.found ? (
                          <>
                            <img
                              src={entry.row.poster}
                              alt={entry.row.title}
                              loading="lazy"
                              onError={(e) => {
                                if (e.currentTarget.src !== DEFAULT_POSTER) {
                                  e.currentTarget.src = DEFAULT_POSTER;
                                }
                              }}
                              className="w-9 h-[54px] rounded-md object-cover shrink-0 bg-white/5"
                            />
                            <div className="min-w-0 flex-1 px-2">
                              <div className="font-semibold text-white truncate">{entry.row.title}</div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {entry.row.year || '—'} · {entry.row.typeLabel}
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-9 h-[54px] rounded-md bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                              <Film className="w-3.5 h-3.5 text-slate-600" />
                            </div>
                            <div className="min-w-0 flex-1 px-2">
                              <div className="font-semibold text-slate-500 truncate">
                                Film tidak ditemukan
                              </div>
                              <div className="text-[10px] text-slate-600 truncate font-mono">
                                {entry.id}
                              </div>
                            </div>
                          </>
                        )}

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
                            disabled={idx === filmPickerSelection.length - 1}
                            onClick={() => handleMoveItem(idx, 'down')}
                            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-colors"
                            title="Geser item ke bawah"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(entry.id)}
                            className="p-1 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors ml-1"
                            title="Hapus dari daftar manual"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
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
