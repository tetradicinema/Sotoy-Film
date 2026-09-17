import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  CheckSquare, 
  Square, 
  Edit3, 
  Trash2, 
  Eye, 
  ExternalLink, 
  Plus, 
  Check, 
  X, 
  Clock, 
  UserCheck, 
  Filter, 
  ChevronDown, 
  ArrowUpDown,
  Calendar,
  AlertCircle,
  Zap,
  Sparkles,
  BarChart3,
  Flame,
  MessageSquare,
  ThumbsUp,
  Tag,
  RefreshCw,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useApp, ADMIN_UIDS } from '../../context/AppContext';
import { Article, MainCategory, SubCategory, UserRole } from '../../types';
import { RoleBadge } from '../Common/RoleBadge';

import { DEFAULT_FALLBACK_AUTHOR } from '../../data/mockData';
export const TARGET_MIGRATION_AUTHOR = DEFAULT_FALLBACK_AUTHOR;

const SUBCATEGORIES_BY_CAT: Record<MainCategory, { value: SubCategory; label: string }[]> = {
  movies: [
    { value: 'reviews', label: 'Reviews' },
    { value: 'news', label: 'News' },
    { value: 'lists', label: 'Lists' },
  ],
  series: [
    { value: 'reviews', label: 'Reviews' },
    { value: 'news', label: 'News' },
    { value: 'lists', label: 'Lists' },
  ],
  anime: [
    { value: 'news', label: 'News' },
    { value: 'lists', label: 'Lists' },
  ],
  'cinema-gear': [
    { value: 'gear-reviews', label: 'Gear Reviews' },
    { value: 'gear-news', label: 'Gear News' },
  ],
  'film-studies': [
    { value: 'producing', label: 'Producing' },
    { value: 'directing', label: 'Directing' },
    { value: 'cinematography', label: 'Cinematography' },
    { value: 'lighting', label: 'Lighting' },
    { value: 'post-production', label: 'Post-Production' },
  ],
};

export const AdminCMSArticles: React.FC = () => {
  const { 
    articles, 
    updateArticle, 
    deleteArticle, 
    bulkUpdateArticles, 
    bulkDeleteArticles, 
    bulkReassignAuthor,
    migrateAllOldArticlesToTargetAuthor,
    navigateTo, 
    showToast,
    allUsers,
    currentUser
  } = useApp();

  // Status Filter Tabs (WordPress Style)
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'scheduled' | 'trash'>('all');
  
  // Toolbar Dropdown Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [authorFilter, setAuthorFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk Selection & Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionSelect, setBulkActionSelect] = useState<string>('');
  const [isBulkAuthorModalOpen, setIsBulkAuthorModalOpen] = useState(false);
  const [bulkAuthorChoice, setBulkAuthorChoice] = useState<string>('targetMigration');

  // Quick Edit State (Inline WordPress Style)
  const [quickEditingId, setQuickEditingId] = useState<string | null>(null);
  const [quickForm, setQuickForm] = useState<{
    title: string;
    slug: string;
    category: MainCategory;
    subCategory: SubCategory;
    status: 'published' | 'draft' | 'scheduled' | 'trash';
    scheduledAt?: string;
    authorId: string;
    tags: string;
  }>({
    title: '',
    slug: '',
    category: 'movies',
    subCategory: 'reviews',
    status: 'published',
    authorId: currentUser.id || DEFAULT_FALLBACK_AUTHOR.id,
    tags: '',
  });

  // Dedicated One-Click Migration Modal State
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState(0);

  // Available authors dynamically fetched from Firestore users collection
  const availableAuthors = useMemo(() => {
    const list = (allUsers.length > 0 ? allUsers : [currentUser]).map(u => ({
      id: u.id,
      name: u.id === currentUser.id ? `${u.name} (Saya)` : u.name,
      roleTitle: u.roleTitle || u.role,
      avatar: u.avatar,
      role: u.role,
    }));
    if (currentUser.id && currentUser.id !== 'guest' && !list.some(u => u.id === currentUser.id)) {
      list.unshift({
        id: currentUser.id,
        name: `${currentUser.name} (Saya)`,
        roleTitle: currentUser.roleTitle || currentUser.role,
        avatar: currentUser.avatar,
        role: currentUser.role,
      });
    }
    return list;
  }, [allUsers, currentUser]);

  // Distinct dates / months for filter dropdown
  const availableDateMonths = useMemo(() => {
    const dates = new Set<string>();
    articles.forEach(art => {
      if (art.publishedAt) {
        const d = new Date(art.publishedAt);
        if (!isNaN(d.getTime())) {
          const monthYear = d.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
          dates.add(monthYear);
        }
      }
    });
    return Array.from(dates);
  }, [articles]);

  // Un-migrated articles count (not linked to an active real user)
  const unmigratedArticles = useMemo(() => {
    return articles.filter(a => !a.authorId || a.authorId === DEFAULT_FALLBACK_AUTHOR.id || !allUsers.some(u => u.id === a.authorId));
  }, [articles, allUsers]);

  // WordPress 4 Core Metrics
  const totalCount = articles.length;
  const totalViews = useMemo(() => {
    return articles.reduce((acc, curr) => acc + (curr.views || 0), 0);
  }, [articles]);
  const publishedCount = useMemo(() => {
    return articles.filter(a => a.status === 'published' || (!a.status && a.status !== 'draft' && a.status !== 'trash' && a.status !== 'scheduled')).length;
  }, [articles]);
  const draftCount = useMemo(() => {
    return articles.filter(a => a.status === 'draft').length;
  }, [articles]);
  const scheduledCount = useMemo(() => {
    return articles.filter(a => a.status === 'scheduled').length;
  }, [articles]);
  const trashCount = useMemo(() => {
    return articles.filter(a => a.status === 'trash').length;
  }, [articles]);

  // Filtered Articles based on Tabs & Toolbar Dropdowns
  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      // 1. Status Filter Tab (WordPress)
      if (statusFilter === 'published') {
        const isPub = article.status === 'published' || (!article.status && article.status !== 'draft' && article.status !== 'trash' && article.status !== 'scheduled');
        if (!isPub) return false;
      } else if (statusFilter === 'draft') {
        if (article.status !== 'draft') return false;
      } else if (statusFilter === 'scheduled') {
        if (article.status !== 'scheduled') return false;
      } else if (statusFilter === 'trash') {
        if (article.status !== 'trash') return false;
      } else if (statusFilter === 'all') {
        // By default WordPress "All" excludes items moved to Trash unless on Trash tab
        if (article.status === 'trash') return false;
      }

      // 2. Category Dropdown Filter
      if (categoryFilter !== 'all' && article.category !== categoryFilter) {
        return false;
      }

      // 3. Author Dropdown Filter
      if (authorFilter !== 'all') {
        if (authorFilter === 'target') {
          if (article.author?.id !== TARGET_MIGRATION_AUTHOR.id && article.authorId !== TARGET_MIGRATION_AUTHOR.id) return false;
        } else if (article.author?.id !== authorFilter) {
          return false;
        }
      }

      // 4. Date/Month Dropdown Filter
      if (dateFilter !== 'all') {
        if (!article.publishedAt) return false;
        const d = new Date(article.publishedAt);
        if (isNaN(d.getTime())) return false;
        const monthYear = d.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
        if (monthYear !== dateFilter) return false;
      }

      // 5. Keyword Search Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = article.title.toLowerCase().includes(query);
        const matchesAuthor = article.author?.name.toLowerCase().includes(query);
        const matchesCategory = article.category.toLowerCase().includes(query);
        const matchesTags = article.tags?.some(t => t.toLowerCase().includes(query));
        if (!matchesTitle && !matchesAuthor && !matchesCategory && !matchesTags) return false;
      }

      return true;
    });
  }, [articles, statusFilter, categoryFilter, authorFilter, dateFilter, searchQuery]);

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedIds.length === filteredArticles.length && filteredArticles.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredArticles.map(a => a.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Quick Edit Inline Handlers
  const startQuickEdit = (article: Article) => {
    setQuickEditingId(article.id);
    const subCat = article.subCategory || 'news';
    setQuickForm({
      title: article.title,
      slug: article.slug || article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      category: article.category,
      subCategory: subCat,
      status: article.status || 'published',
      scheduledAt: article.scheduledAt || '',
      authorId: article.author?.id || TARGET_MIGRATION_AUTHOR.id,
      tags: article.tags ? article.tags.join(', ') : '',
    });
  };

  const cancelQuickEdit = () => {
    setQuickEditingId(null);
  };

  const saveQuickEdit = async (id: string) => {
    if (!quickForm.title.trim()) {
      showToast('Judul artikel tidak boleh kosong!');
      return;
    }
    const cleanSlug = quickForm.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    const parsedTags = quickForm.tags.split(',').map(t => t.trim()).filter(Boolean);

    // Selected author object
    const foundAuthor = availableAuthors.find(a => a.id === quickForm.authorId) || {
      id: TARGET_MIGRATION_AUTHOR.id,
      name: TARGET_MIGRATION_AUTHOR.name,
      avatar: TARGET_MIGRATION_AUTHOR.avatar,
      role: TARGET_MIGRATION_AUTHOR.role,
    };

    await updateArticle(id, {
      title: quickForm.title.trim(),
      slug: cleanSlug,
      category: quickForm.category,
      subCategory: quickForm.subCategory,
      status: quickForm.status,
      scheduledAt: quickForm.status === 'scheduled' ? quickForm.scheduledAt : undefined,
      authorId: foundAuthor.id,
      author: {
        id: foundAuthor.id,
        name: foundAuthor.name.replace(' (Target Migrasi)', '').replace(' (Saya)', ''),
        avatar: foundAuthor.avatar,
        role: foundAuthor.role,
      },
      tags: parsedTags,
    });

    setQuickEditingId(null);
    showToast(`Artikel "${quickForm.title}" berhasil diperbarui!`);
  };

  // Bulk Action Execution (WordPress standard dropdown)
  const handleApplyBulkAction = async () => {
    if (selectedIds.length === 0) {
      showToast('Pilih setidaknya 1 artikel untuk menerapkan aksi massal.');
      return;
    }

    if (!bulkActionSelect) {
      showToast('Pilih tindakan massal yang ingin diterapkan.');
      return;
    }

    if (bulkActionSelect === 'publish') {
      await bulkUpdateArticles(selectedIds, { status: 'published' });
      setSelectedIds([]);
      setBulkActionSelect('');
    } else if (bulkActionSelect === 'draft') {
      await bulkUpdateArticles(selectedIds, { status: 'draft' });
      setSelectedIds([]);
      setBulkActionSelect('');
    } else if (bulkActionSelect === 'trash') {
      await bulkUpdateArticles(selectedIds, { status: 'trash' });
      setSelectedIds([]);
      setBulkActionSelect('');
      showToast(`${selectedIds.length} artikel dipindahkan ke Tempat Sampah.`);
    } else if (bulkActionSelect === 'reassign_target') {
      const targetAuth = availableAuthors[0] || {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
        role: currentUser.role,
      };
      await bulkReassignAuthor(selectedIds, targetAuth);
      setSelectedIds([]);
      setBulkActionSelect('');
    } else if (bulkActionSelect === 'reassign_modal') {
      setIsBulkAuthorModalOpen(true);
    } else if (bulkActionSelect === 'delete_permanently') {
      if (window.confirm(`PERINGATAN: Hapus permanen ${selectedIds.length} artikel yang dipilih dari Firestore?`)) {
        await bulkDeleteArticles(selectedIds);
        setSelectedIds([]);
        setBulkActionSelect('');
      }
    }
  };

  // Modal Reassign Author Execution
  const handleApplyReassignAuthor = async () => {
    if (selectedIds.length === 0) return;
    
    const selectedUser = availableAuthors.find(a => a.id === bulkAuthorChoice) || availableAuthors[0] || {
      id: currentUser.id,
      name: currentUser.name,
      avatar: currentUser.avatar,
      role: currentUser.role,
    };

    await bulkReassignAuthor(selectedIds, selectedUser);
    setIsBulkAuthorModalOpen(false);
    setSelectedIds([]);
    setBulkActionSelect('');
  };

  // Dedicated One-Click Migration to active user UID
  const handleExecuteFullMigration = async () => {
    setIsMigrating(true);
    setMigrationProgress(20);
    try {
      setMigrationProgress(50);
      const res = await migrateAllOldArticlesToTargetAuthor(currentUser.id);
      setMigrationProgress(100);
      setTimeout(() => {
        setIsMigrating(false);
        setIsMigrationModalOpen(false);
        setMigrationProgress(0);
      }, 500);
    } catch (e) {
      setIsMigrating(false);
      showToast('Gagal memigrasikan artikel. Silakan coba kembali.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. TOP HEADER & METRIC SUMMARY CARDS (WORDPRESS METRICS) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="font-display font-black text-2xl text-white tracking-tight flex items-center gap-2.5">
              <span>CMS Artikel & Kurasi Editorial</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-pink-500/20 text-[#FF2E7E] border border-pink-500/30 font-sans font-bold flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                WordPress Style CMS
              </span>
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Pusat kendali penerbitan artikel, aksi massal, sunting cepat inline, dan sinkronisasi kepemilikan penulis.
            </p>
          </div>

          {/* Action Buttons: Write & Quick Migration Button */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setIsMigrationModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#7928CA] to-indigo-600 hover:from-[#8e38ea] hover:to-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-purple-900/30 border border-purple-400/30"
              title="Migrasikan seluruh artikel ke Akun Penulis Resmi (0PCmaBvJrzeaQgpf3sSTC4mnsh02)"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300 animate-bounce" />
              <span>⚡ Migrasi Penulis (0PCmaBvJrzeaQgpf3sSTC4mnsh02)</span>
              {unmigratedArticles.length > 0 && (
                <span className="bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded-full text-[10px]">
                  {unmigratedArticles.length}
                </span>
              )}
            </button>

            <button
              onClick={() => navigateTo('write-article')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF2E7E] to-[#FF8008] text-white text-xs font-black hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-pink-500/25 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tulis Artikel Baru</span>
            </button>
          </div>
        </div>

        {/* 4 WORDPRESS STATS CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Total Articles */}
          <div className="bg-[#121324] border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Artikel
              </div>
              <div className="text-2xl font-black text-white font-display mt-1">
                {totalCount}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {publishedCount} terbit aktif di portal
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          {/* Total Views */}
          <div className="bg-[#121324] border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Views
              </div>
              <div className="text-2xl font-black text-cyan-400 font-display mt-1">
                {totalViews.toLocaleString('id-ID')}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Akumulasi seluruh pembaca
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>

          {/* Total Drafts */}
          <div className="bg-[#121324] border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Draf
              </div>
              <div className="text-2xl font-black text-amber-400 font-display mt-1">
                {draftCount}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Menunggu finalisasi redaksi
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Edit3 className="w-5 h-5" />
            </div>
          </div>

          {/* Scheduled Articles */}
          <div className="bg-[#121324] border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Artikel Terjadwal
              </div>
              <div className="text-2xl font-black text-blue-400 font-display mt-1">
                {scheduledCount}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Otomatis tayang sesuai tanggal
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. WORDPRESS STATUS TABS (ALL | PUBLISHED | DRAFTS | SCHEDULED | TRASH) */}
      <div className="bg-[#121324] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
        
        {/* Status Filter Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2 overflow-x-auto text-xs font-medium pb-1 lg:pb-0 scrollbar-none">
            {/* All */}
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-slate-700 text-white font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>Semua</span>
              <span className="text-[10px] bg-slate-900/90 px-1.5 py-0.2 rounded-full text-slate-300 font-mono">
                {totalCount}
              </span>
            </button>

            <span className="text-slate-700">|</span>

            {/* Published */}
            <button
              onClick={() => setStatusFilter('published')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                statusFilter === 'published'
                  ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30'
                  : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800'
              }`}
            >
              <span>Terbit</span>
              <span className="text-[10px] bg-emerald-950/70 px-1.5 py-0.2 rounded-full text-emerald-400 font-mono">
                {publishedCount}
              </span>
            </button>

            <span className="text-slate-700">|</span>

            {/* Drafts */}
            <button
              onClick={() => setStatusFilter('draft')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                statusFilter === 'draft'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                  : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800'
              }`}
            >
              <span>Draf</span>
              <span className="text-[10px] bg-amber-950/70 px-1.5 py-0.2 rounded-full text-amber-300 font-mono">
                {draftCount}
              </span>
            </button>

            <span className="text-slate-700">|</span>

            {/* Scheduled */}
            <button
              onClick={() => setStatusFilter('scheduled')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                statusFilter === 'scheduled'
                  ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30'
                  : 'text-slate-400 hover:text-blue-300 hover:bg-slate-800'
              }`}
            >
              <span>Terjadwal</span>
              <span className="text-[10px] bg-blue-950/70 px-1.5 py-0.2 rounded-full text-blue-300 font-mono">
                {scheduledCount}
              </span>
            </button>

            <span className="text-slate-700">|</span>

            {/* Trash */}
            <button
              onClick={() => setStatusFilter('trash')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                statusFilter === 'trash'
                  ? 'bg-red-500/20 text-red-300 font-bold border border-red-500/30'
                  : 'text-slate-400 hover:text-red-300 hover:bg-slate-800'
              }`}
            >
              <span>Sampah</span>
              <span className="text-[10px] bg-red-950/70 px-1.5 py-0.2 rounded-full text-red-400 font-mono">
                {trashCount}
              </span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative w-full lg:w-72">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari judul, tag, atau penulis..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* 3. WORDPRESS TOOLBAR: BULK ACTIONS & DROPDOWN FILTERS */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
          {/* Left: Bulk Action Select + Apply Button */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={bulkActionSelect}
              onChange={e => setBulkActionSelect(e.target.value)}
              className="bg-slate-900 border border-slate-700/90 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            >
              <option value="">Aksi Massal (Bulk Action)</option>
              <option value="publish">Terbitkan (Publish)</option>
              <option value="draft">Jadikan Draf (Draft)</option>
              <option value="trash">Pindahkan ke Sampah</option>
              <option value="reassign_target">Pindahkan ke Jm0raI2h47TJG9ZtZAR1HLVcjSj2</option>
              <option value="reassign_modal">Pindahkan Penulis (Pilih Akun...)</option>
              <option value="delete_permanently">Hapus Permanen</option>
            </select>

            <button
              onClick={handleApplyBulkAction}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all border border-slate-700 active:scale-95"
            >
              Terapkan
            </button>

            {selectedIds.length > 0 && (
              <span className="text-xs text-purple-300 font-bold ml-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                {selectedIds.length} dipilih
              </span>
            )}
          </div>

          {/* Right: Category, Month & Author Dropdown Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Category */}
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500"
            >
              <option value="all">Semua Kategori</option>
              <option value="movies">Movies</option>
              <option value="series">Series</option>
              <option value="anime">Anime</option>
              <option value="cinema-gear">Cinema Gear</option>
              <option value="film-studies">Film Studies</option>
            </select>

            {/* Filter Date/Month */}
            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500 max-w-[140px]"
            >
              <option value="all">Semua Tanggal</option>
              {availableDateMonths.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            {/* Filter Author */}
            <select
              value={authorFilter}
              onChange={e => setAuthorFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500 max-w-[160px]"
            >
              <option value="all">Semua Penulis</option>
              <option value="target">Rian Sinematografer (Jm0raI2h47TJG9ZtZAR1HLVcjSj2)</option>
              <option value="CsG2CY2TaIZmG7yuPfzAxmRYrlY2">Admin 1 (CsG2CY2TaIZmG7yuPfzAxmRYrlY2)</option>
              <option value="QkNGf1ZfhsMyUEk90a6Iz8ZplZS2">Admin 2 (QkNGf1ZfhsMyUEk90a6Iz8ZplZS2)</option>
            </select>

            {/* Clear Filters button if any active */}
            {(categoryFilter !== 'all' || dateFilter !== 'all' || authorFilter !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setCategoryFilter('all');
                  setDateFilter('all');
                  setAuthorFilter('all');
                  setSearchQuery('');
                }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs"
                title="Reset Semua Filter"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* 4. COMPREHENSIVE WORDPRESS ARTICLES TABLE */}
        <div className="overflow-x-auto rounded-xl border border-slate-850">
          <table className="w-full text-left text-xs">
            {/* Table Header */}
            <thead className="bg-[#17182b] text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3.5 w-10 text-center">
                  <button 
                    onClick={handleSelectAll} 
                    className="text-slate-400 hover:text-white transition-colors"
                    title="Pilih Semua"
                  >
                    {selectedIds.length === filteredArticles.length && filteredArticles.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-purple-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-3.5 min-w-[280px]">Judul Artikel & Slug</th>
                <th className="p-3.5 min-w-[170px]">Penulis</th>
                <th className="p-3.5 min-w-[130px]">Kategori & Tag</th>
                <th className="p-3.5 min-w-[100px]">Status</th>
                <th className="p-3.5 min-w-[110px] text-right">Statistik</th>
                <th className="p-3.5 min-w-[110px]">Tanggal</th>
                <th className="p-3.5 min-w-[100px] text-right">Aksi</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-850/80 bg-[#111220]">
              {filteredArticles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-500 text-xs">
                    <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                    Tidak ada artikel yang sesuai dengan kriteria filter atau pencarian Anda.
                  </td>
                </tr>
              ) : (
                filteredArticles.map(article => {
                  const isSelected = selectedIds.includes(article.id);
                  const isQuickEditing = quickEditingId === article.id;
                  const isPublished = article.status === 'published' || (!article.status && article.status !== 'draft' && article.status !== 'trash' && article.status !== 'scheduled');
                  const isDraft = article.status === 'draft';
                  const isScheduled = article.status === 'scheduled';
                  const isTrash = article.status === 'trash';
                  const isTargetAuthor = article.author?.id === TARGET_MIGRATION_AUTHOR.id || article.authorId === TARGET_MIGRATION_AUTHOR.id;

                  return (
                    <React.Fragment key={article.id}>
                      {/* Main Article Row */}
                      <tr className={`hover:bg-slate-850/40 transition-colors group ${isSelected ? 'bg-purple-950/25' : ''}`}>
                        {/* Checkbox */}
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => handleToggleSelect(article.id)}
                            className="text-slate-500 hover:text-white transition-colors"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-purple-400" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        {/* Title, Slug & WordPress Hover Actions */}
                        <td className="p-3.5">
                          <div className="space-y-1">
                            <span 
                              onClick={() => navigateTo('article-detail', { articleId: article.id })}
                              className="font-bold text-white hover:text-[#00F0FF] cursor-pointer transition-colors block text-xs line-clamp-1"
                            >
                              {article.title}
                            </span>
                            <div className="text-[10px] text-slate-500 font-mono truncate max-w-sm">
                              /{article.slug || article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
                            </div>

                            {/* WordPress Style Hover Action Row */}
                            <div className="flex items-center gap-2 pt-1 opacity-95 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-[10px] font-semibold">
                              <button
                                onClick={() => startQuickEdit(article)}
                                className="text-amber-400 hover:underline flex items-center gap-1"
                              >
                                Sunting Cepat
                              </button>
                              <span className="text-slate-600">|</span>
                              <button
                                onClick={() => navigateTo('write-article', { articleId: article.id })}
                                className="text-[#00F0FF] hover:underline"
                              >
                                Edit Penuh
                              </button>
                              <span className="text-slate-600">|</span>
                              <button
                                onClick={() => navigateTo('article-detail', { articleId: article.id })}
                                className="text-emerald-400 hover:underline flex items-center gap-1"
                              >
                                Lihat
                              </button>
                              <span className="text-slate-600">|</span>
                              {isTrash ? (
                                <button
                                  onClick={async () => {
                                    if (window.confirm(`Hapus permanen artikel "${article.title}"?`)) {
                                      await deleteArticle(article.id);
                                    }
                                  }}
                                  className="text-red-400 hover:underline"
                                >
                                  Hapus Permanen
                                </button>
                              ) : (
                                <button
                                  onClick={async () => {
                                    await updateArticle(article.id, { status: 'trash' });
                                    showToast(`Artikel "${article.title}" dipindahkan ke Sampah.`);
                                  }}
                                  className="text-red-400 hover:underline"
                                >
                                  Sampah
                                </button>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Author */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={article.author?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80'}
                              alt={article.author?.name}
                              className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-700 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="text-xs text-slate-200 font-bold truncate max-w-[130px] flex items-center gap-1">
                                <span>{article.author?.name || 'Admin'}</span>
                                {isTargetAuthor && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Target Author UID Jm0raI2h47TJG9ZtZAR1HLVcjSj2" />
                                )}
                              </div>
                              <div className="text-[9px] text-purple-400/90 font-mono truncate max-w-[130px]">
                                {article.author?.id ? `${article.author.id.slice(0, 8)}...` : 'N/A'}
                              </div>
                              <div className="mt-0.5">
                                <RoleBadge role={article.author?.role || 'penulis_sotoy'} size="xs" />
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category & Tags */}
                        <td className="p-3.5">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 uppercase tracking-wide inline-block">
                              {article.category}
                            </span>
                            {article.subCategory && (
                              <div className="text-[10px] text-slate-400 capitalize">
                                • {article.subCategory}
                              </div>
                            )}
                            {article.tags && article.tags.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                                {article.tags.slice(0, 2).map(t => (
                                  <span key={t} className="text-[9px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                                    #{t}
                                  </span>
                                ))}
                                {article.tags.length > 2 && (
                                  <span className="text-[9px] text-slate-500">+{article.tags.length - 2}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="p-3.5">
                          {isPublished && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Terbit
                            </span>
                          )}
                          {isDraft && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
                              Draf
                            </span>
                          )}
                          {isScheduled && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
                              <Clock className="w-3 h-3" />
                              Terjadwal
                            </span>
                          )}
                          {isTrash && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
                              <Trash2 className="w-3 h-3" />
                              Sampah
                            </span>
                          )}
                        </td>

                        {/* Statistics (Views, Likes, Comments) */}
                        <td className="p-3.5 text-right font-mono">
                          <div className="space-y-0.5">
                            <div className="text-white font-bold text-xs flex items-center justify-end gap-1">
                              <Eye className="w-3 h-3 text-slate-500" />
                              {(article.views || 0).toLocaleString()}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center justify-end gap-2 font-sans">
                              <span className="flex items-center gap-0.5">
                                <ThumbsUp className="w-2.5 h-2.5 text-slate-500" />
                                {article.likes || 0}
                              </span>
                              <span className="flex items-center gap-0.5">
                                <MessageSquare className="w-2.5 h-2.5 text-slate-500" />
                                {article.commentsCount || 0}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Date */}
                        <td className="p-3.5 text-[11px] text-slate-300 whitespace-nowrap">
                          {isScheduled && article.scheduledAt ? (
                            <div className="text-blue-300">
                              <div className="font-bold">Jadwal:</div>
                              <div className="text-[10px] text-blue-400 font-mono">
                                {new Date(article.scheduledAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div>{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('id-ID') : 'Baru'}</div>
                              <div className="text-[10px] text-slate-500">{article.readTime || '5 mnt baca'}</div>
                            </div>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => startQuickEdit(article)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 transition-colors"
                              title="Sunting Cepat (Quick Edit)"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => navigateTo('article-detail', { articleId: article.id })}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-500/20 text-slate-400 hover:text-[#00F0FF] transition-colors"
                              title="Lihat Artikel di Portal"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={async () => {
                                if (window.confirm(`Pindahkan artikel "${article.title}" ke Sampah?`)) {
                                  await updateArticle(article.id, { status: 'trash' });
                                  showToast('Artikel dipindahkan ke Sampah.');
                                }
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                              title="Pindahkan ke Sampah"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* INLINE QUICK EDIT FORM (WORDPRESS STYLE) */}
                      {isQuickEditing && (
                        <tr className="bg-slate-900/90 border-y-2 border-amber-400/60 animate-in fade-in duration-150">
                          <td colSpan={8} className="p-4 sm:p-6">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                                <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                                  <Edit3 className="w-4 h-4" />
                                  Sunting Cepat (Quick Edit Inline) — #{article.id}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  Penulis Saat Ini: {article.author?.name} ({article.author?.id})
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {/* Title Input */}
                                <div className="sm:col-span-2 space-y-1">
                                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                                    Judul Artikel
                                  </label>
                                  <input
                                    type="text"
                                    value={quickForm.title}
                                    onChange={e => setQuickForm({ ...quickForm, title: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-medium"
                                  />
                                </div>

                                {/* Slug Input */}
                                <div className="sm:col-span-2 space-y-1">
                                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                                    Slug URL
                                  </label>
                                  <input
                                    type="text"
                                    value={quickForm.slug}
                                    onChange={e => setQuickForm({ ...quickForm, slug: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-750 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-400"
                                  />
                                </div>

                                {/* Main Category */}
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                                    Kategori Utama
                                  </label>
                                  <select
                                    value={quickForm.category}
                                    onChange={e => {
                                      const newCat = e.target.value as MainCategory;
                                      const defaultSub = SUBCATEGORIES_BY_CAT[newCat]?.[0]?.value || 'news';
                                      setQuickForm({ ...quickForm, category: newCat, subCategory: defaultSub });
                                    }}
                                    className="w-full bg-slate-950 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                                  >
                                    <option value="movies">Movies</option>
                                    <option value="series">Series</option>
                                    <option value="anime">Anime</option>
                                    <option value="cinema-gear">Cinema Gear</option>
                                    <option value="film-studies">Film Studies</option>
                                  </select>
                                </div>

                                {/* Subcategory */}
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                                    Subkategori
                                  </label>
                                  <select
                                    value={quickForm.subCategory}
                                    onChange={e => setQuickForm({ ...quickForm, subCategory: e.target.value as SubCategory })}
                                    className="w-full bg-slate-950 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                                  >
                                    {SUBCATEGORIES_BY_CAT[quickForm.category]?.map(sub => (
                                      <option key={sub.value} value={sub.value}>{sub.label}</option>
                                    ))}
                                  </select>
                                </div>

                                {/* Ganti Penulis (Author Selector) */}
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1">
                                    <UserCheck className="w-3 h-3 text-purple-400" />
                                    Ganti Penulis
                                  </label>
                                  <select
                                    value={quickForm.authorId}
                                    onChange={e => setQuickForm({ ...quickForm, authorId: e.target.value })}
                                    className="w-full bg-slate-950 border border-purple-500/50 rounded-xl px-3 py-2 text-xs text-purple-200 focus:outline-none focus:border-purple-400"
                                  >
                                    {availableAuthors.map(auth => (
                                      <option key={auth.id} value={auth.id}>
                                        {auth.name} [{auth.role}]
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Status Publikasi */}
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                                    Status Publikasi
                                  </label>
                                  <select
                                    value={quickForm.status}
                                    onChange={e => setQuickForm({ ...quickForm, status: e.target.value as any })}
                                    className="w-full bg-slate-950 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                                  >
                                    <option value="published">Terbit (Published)</option>
                                    <option value="draft">Simpan Draf (Draft)</option>
                                    <option value="scheduled">Jadwalkan (Scheduled)</option>
                                    <option value="trash">Pindahkan ke Sampah (Trash)</option>
                                  </select>
                                </div>

                                {/* Tags Input */}
                                <div className="sm:col-span-2 space-y-1">
                                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                                    <Tag className="w-3 h-3 text-slate-400" />
                                    Tags (Pisahkan dengan koma)
                                  </label>
                                  <input
                                    type="text"
                                    value={quickForm.tags}
                                    onChange={e => setQuickForm({ ...quickForm, tags: e.target.value })}
                                    placeholder="Sci-Fi, Denis Villeneuve, IMAX..."
                                    className="w-full bg-slate-950 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                                  />
                                </div>

                                {/* Scheduled Date Picker if scheduled */}
                                {quickForm.status === 'scheduled' && (
                                  <div className="sm:col-span-2 space-y-1">
                                    <label className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      Waktu Terjadwal
                                    </label>
                                    <input
                                      type="datetime-local"
                                      value={quickForm.scheduledAt || ''}
                                      onChange={e => setQuickForm({ ...quickForm, scheduledAt: e.target.value })}
                                      className="w-full bg-slate-950 border border-blue-500/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-400"
                                    />
                                  </div>
                                )}
                              </div>

                              {/* Form Footer Buttons */}
                              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                                <button
                                  onClick={cancelQuickEdit}
                                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                                >
                                  Batal
                                </button>
                                <button
                                  onClick={() => saveQuickEdit(article.id)}
                                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/25"
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  <span>Perbarui (Update)</span>
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. DEDICATED ONE-CLICK MIGRATION MODAL (Jm0raI2h47TJG9ZtZAR1HLVcjSj2) */}
      {isMigrationModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#121324] border-2 border-[#7928CA]/80 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl shadow-purple-950/60 space-y-6 relative overflow-hidden">
            {/* Ambient background glow */}
            <div className="absolute top-0 right-0 w-60 h-60 bg-[#7928CA]/20 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-[#C48BFF]">
                  <Zap className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-display font-black text-white text-lg sm:text-xl">
                    Migrasi Penulis Artikel ke UID Target
                  </h3>
                  <p className="text-purple-300 text-xs mt-0.5">
                    Re-assign seluruh artikel generated & mock lama ke akun resmi
                  </p>
                </div>
              </div>

              <button 
                onClick={() => !isMigrating && setIsMigrationModalOpen(false)}
                disabled={isMigrating}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Account Summary Card */}
            <div className="bg-slate-900/90 border border-purple-500/30 rounded-2xl p-4 space-y-3 relative z-10">
              <div className="text-[11px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Akun Penulis Tujuan (Target Author)</span>
              </div>

              <div className="flex items-center gap-3.5">
                <img
                  src={currentUser.avatar || DEFAULT_FALLBACK_AUTHOR.avatar}
                  alt={currentUser.name}
                  className="w-12 h-12 rounded-2xl object-cover ring-2 ring-purple-500/60"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{currentUser.name} (Saya)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/30 text-[#FF2E7E] border border-pink-400/30 font-bold">
                      Akun Aktif
                    </span>
                  </div>
                  <div className="text-xs font-mono text-purple-300 mt-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-purple-500/20 inline-block">
                    UID: {currentUser.id}
                  </div>
                </div>
              </div>
            </div>

            {/* Migration Scope Details */}
            <div className="space-y-2 text-xs text-slate-300 leading-relaxed relative z-10">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400">Total Artikel di Sistem:</span>
                <span className="font-bold text-white font-mono">{articles.length} artikel</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400">Artikel yang Perlu Dimigrasikan:</span>
                <span className="font-bold text-amber-400 font-mono">
                  {unmigratedArticles.length} artikel
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400">Database Target:</span>
                <span className="font-bold text-emerald-400">Cloud Firestore + Local State Sync</span>
              </div>
            </div>

            {/* Animated Progress Bar if Migrating */}
            {isMigrating && (
              <div className="space-y-2 relative z-10 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs text-purple-300 font-bold">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Sinkronisasi Firestore sedang berlangsung...
                  </span>
                  <span>{migrationProgress}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-[#7928CA] to-[#00F0FF] h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${migrationProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800 relative z-10">
              <button
                onClick={() => setIsMigrationModalOpen(false)}
                disabled={isMigrating}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all disabled:opacity-50"
              >
                Batal
              </button>

              <button
                onClick={handleExecuteFullMigration}
                disabled={isMigrating || unmigratedArticles.length === 0}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7928CA] via-purple-600 to-indigo-600 hover:brightness-110 text-white text-xs font-black transition-all shadow-xl shadow-purple-900/50 flex items-center gap-2 disabled:opacity-50"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>
                  {unmigratedArticles.length === 0 
                    ? 'Semua Sudah Terhubung' 
                    : `Migrasikan Sekarang (${unmigratedArticles.length} Artikel)`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL PILIH AKUN PEMINDAHAN PENULIS MASSAL */}
      {isBulkAuthorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#121324] border border-purple-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                <UserCheck className="w-4 h-4" />
                <span>Pindahkan Penulis ({selectedIds.length} Artikel Terpilih)</span>
              </div>
              <button 
                onClick={() => setIsBulkAuthorModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Pilih akun penulis yang akan mengambil alih kepemilikan editorial atas <strong>{selectedIds.length} artikel</strong> yang dipilih:
            </p>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {availableAuthors.map(auth => (
                <label 
                  key={auth.id}
                  className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-colors ${
                    bulkAuthorChoice === auth.id
                      ? 'bg-purple-500/20 border-purple-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                  }`}
                >
                  <input
                    type="radio"
                    name="bulkAuthor"
                    value={auth.id}
                    checked={bulkAuthorChoice === auth.id}
                    onChange={() => setBulkAuthorChoice(auth.id)}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white flex items-center justify-between">
                      <span>{auth.name}</span>
                      <RoleBadge role={auth.role} size="xs" />
                    </div>
                    <div className="text-[10px] text-purple-300 font-mono truncate mt-0.5">
                      UID: {auth.id}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsBulkAuthorModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleApplyReassignAuthor}
                className="px-4 py-2 rounded-xl bg-[#7928CA] hover:bg-[#8e38ea] text-white text-xs font-bold transition-all shadow-md shadow-purple-900/40"
              >
                Terapkan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
