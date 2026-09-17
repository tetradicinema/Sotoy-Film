import React, { useState, useMemo } from 'react';
import {
  FileText,
  Clock,
  Check,
  Calendar,
  Trash2,
  Search,
  X,
  Edit3,
  Star,
  Eye,
  ThumbsUp,
  MessageSquare,
  User as UserIcon,
  Folder,
  ChevronDown,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Article, MainCategory, SubCategory, UserRole } from '../../types';
import { RoleBadge } from '../Common/RoleBadge';

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

interface CMSArticleTableProps {
  mode?: 'writer' | 'admin' | 'auto';
}

export const CMSArticleTable: React.FC<CMSArticleTableProps> = ({ mode = 'auto' }) => {
  const {
    currentUser,
    articles,
    allUsers,
    isAdmin: isAppAdmin,
    navigateTo,
    showToast,
    updateArticle,
    bulkUpdateArticles,
    bulkDeleteArticles,
    bulkReassignAuthor,
  } = useApp();

  const isAdminView = useMemo(() => {
    if (mode === 'admin') return true;
    if (mode === 'writer') return false;
    return isAppAdmin || currentUser.role === 'admin';
  }, [mode, isAppAdmin, currentUser.role]);

  // Scope Articles based on Role
  const scopedArticles = useMemo(() => {
    if (isAdminView) {
      return articles;
    }
    return articles.filter(a => a.author?.id === currentUser.id || a.authorId === currentUser.id);
  }, [articles, isAdminView, currentUser.id]);

  // Status Filter Tabs
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'scheduled' | 'trash'>('all');

  // Toolbar Dropdown Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [authorFilter, setAuthorFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk Selection & Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionSelect, setBulkActionSelect] = useState<string>('');
  const [isBulkAuthorModalOpen, setIsBulkAuthorModalOpen] = useState(false);
  const [bulkAuthorChoice, setBulkAuthorChoice] = useState<string>(currentUser.id || '');

  // Quick Edit State (Inline WordPress Style)
  const [quickEditingId, setQuickEditingId] = useState<string | null>(null);
  const [quickForm, setQuickForm] = useState<{
    title: string;
    slug: string;
    category: MainCategory;
    subCategory: SubCategory;
    status: 'published' | 'draft' | 'scheduled' | 'trash';
    scheduledAt: string;
    authorId: string;
    tags: string;
    isFeatured: boolean;
  }>({
    title: '',
    slug: '',
    category: 'movies',
    subCategory: 'reviews',
    status: 'published',
    scheduledAt: '',
    authorId: '',
    tags: '',
    isFeatured: false,
  });

  // Available authors list for Admin re-assign dropdown
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

  // Counts for each status tab
  const statusCounts = useMemo(() => {
    const all = scopedArticles.filter(a => a.status !== 'trash').length;
    const published = scopedArticles.filter(a => a.status === 'published' || (!a.status && a.status !== 'draft' && a.status !== 'trash' && a.status !== 'scheduled')).length;
    const draft = scopedArticles.filter(a => a.status === 'draft').length;
    const scheduled = scopedArticles.filter(a => a.status === 'scheduled').length;
    const trash = scopedArticles.filter(a => a.status === 'trash').length;

    return { all, published, draft, scheduled, trash };
  }, [scopedArticles]);

  // Apply search & toolbar filters
  const filteredArticles = useMemo(() => {
    return scopedArticles.filter(article => {
      // 1. Status Tab filter
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
        if (article.status === 'trash') return false;
      }

      // 2. Category Filter
      if (categoryFilter !== 'all' && article.category !== categoryFilter) {
        return false;
      }

      // 3. Author Filter (Admin only)
      if (isAdminView && authorFilter !== 'all') {
        const articleAuthorId = article.author?.id || article.authorId;
        if (articleAuthorId !== authorFilter) {
          return false;
        }
      }

      // 4. Live Search query (Title or Slug)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = article.title?.toLowerCase().includes(query);
        const matchesSlug = article.slug?.toLowerCase().includes(query);
        const matchesTags = article.tags?.some(t => t.toLowerCase().includes(query));
        if (!matchesTitle && !matchesSlug && !matchesTags) return false;
      }

      return true;
    });
  }, [scopedArticles, statusFilter, categoryFilter, authorFilter, searchQuery, isAdminView]);

  // Bulk selections
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredArticles.map(a => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Quick Edit Inline Form handlers
  const startQuickEdit = (article: Article) => {
    setQuickEditingId(article.id);
    setQuickForm({
      title: article.title || '',
      slug: article.slug || '',
      category: (article.category as MainCategory) || 'movies',
      subCategory: (article.subCategory as SubCategory) || 'reviews',
      status: article.status || 'published',
      scheduledAt: article.scheduledAt || '',
      authorId: article.author?.id || article.authorId || currentUser.id,
      tags: article.tags ? article.tags.join(', ') : '',
      isFeatured: !!article.featured,
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

    const foundAuthor = availableAuthors.find(a => a.id === quickForm.authorId) || {
      id: currentUser.id,
      name: currentUser.name,
      avatar: currentUser.avatar,
      role: currentUser.role,
    };

    const updates: Partial<Article> = {
      title: quickForm.title.trim(),
      slug: cleanSlug,
      category: quickForm.category,
      subCategory: quickForm.subCategory,
      status: quickForm.status,
      scheduledAt: quickForm.status === 'scheduled' ? quickForm.scheduledAt : undefined,
      tags: parsedTags,
      featured: quickForm.isFeatured,
    };

    if (isAdminView) {
      updates.authorId = foundAuthor.id;
      updates.author = {
        id: foundAuthor.id,
        name: foundAuthor.name.replace(' (Saya)', ''),
        avatar: foundAuthor.avatar,
        role: foundAuthor.role as UserRole,
      };
    }

    const success = await updateArticle(id, updates);
    if (success !== false) {
      setQuickEditingId(null);
      showToast(`Artikel "${quickForm.title}" berhasil diperbarui via Quick Edit!`);
    } else {
      showToast('Gagal memperbarui artikel.');
    }
  };

  // Bulk Action Execution
  const handleApplyBulkAction = async () => {
    if (selectedIds.length === 0) {
      showToast('Pilih setidaknya 1 artikel untuk menerapkan tindakan massal.');
      return;
    }

    if (!bulkActionSelect) {
      showToast('Pilih tindakan massal terlebih dahulu.');
      return;
    }

    if (bulkActionSelect === 'publish') {
      const success = await bulkUpdateArticles(selectedIds, { status: 'published' });
      if (success !== false) {
        showToast(`${selectedIds.length} artikel berhasil diterbitkan.`);
        setSelectedIds([]);
        setBulkActionSelect('');
      }
    } else if (bulkActionSelect === 'draft') {
      const success = await bulkUpdateArticles(selectedIds, { status: 'draft' });
      if (success !== false) {
        showToast(`${selectedIds.length} artikel diubah ke draf.`);
        setSelectedIds([]);
        setBulkActionSelect('');
      }
    } else if (bulkActionSelect === 'trash') {
      const success = await bulkUpdateArticles(selectedIds, { status: 'trash' });
      if (success !== false) {
        showToast(`${selectedIds.length} artikel dipindahkan ke Tempat Sampah.`);
        setSelectedIds([]);
        setBulkActionSelect('');
      }
    } else if (bulkActionSelect === 'cat_movies') {
      const success = await bulkUpdateArticles(selectedIds, { category: 'movies', subCategory: 'reviews' });
      if (success !== false) {
        showToast(`${selectedIds.length} artikel dipindahkan ke kategori Movies.`);
        setSelectedIds([]);
        setBulkActionSelect('');
      }
    } else if (bulkActionSelect === 'cat_series') {
      const success = await bulkUpdateArticles(selectedIds, { category: 'series', subCategory: 'reviews' });
      if (success !== false) {
        showToast(`${selectedIds.length} artikel dipindahkan ke kategori Series.`);
        setSelectedIds([]);
        setBulkActionSelect('');
      }
    } else if (bulkActionSelect === 'cat_anime') {
      const success = await bulkUpdateArticles(selectedIds, { category: 'anime', subCategory: 'news' });
      if (success !== false) {
        showToast(`${selectedIds.length} artikel dipindahkan ke kategori Anime.`);
        setSelectedIds([]);
        setBulkActionSelect('');
      }
    } else if (bulkActionSelect === 'cat_gear') {
      const success = await bulkUpdateArticles(selectedIds, { category: 'cinema-gear', subCategory: 'gear-reviews' });
      if (success !== false) {
        showToast(`${selectedIds.length} artikel dipindahkan ke kategori Cinema Gear.`);
        setSelectedIds([]);
        setBulkActionSelect('');
      }
    } else if (bulkActionSelect === 'cat_studies') {
      const success = await bulkUpdateArticles(selectedIds, { category: 'film-studies', subCategory: 'directing' });
      if (success !== false) {
        showToast(`${selectedIds.length} artikel dipindahkan ke kategori Film Studies.`);
        setSelectedIds([]);
        setBulkActionSelect('');
      }
    } else if (bulkActionSelect === 'reassign_modal') {
      if (!isAdminView) {
        showToast('Hanya Admin yang dapat memindahkan kepemilikan penulis artikel.');
        return;
      }
      setIsBulkAuthorModalOpen(true);
    } else if (bulkActionSelect === 'delete_permanently') {
      if (window.confirm(`PERINGATAN PERMANEN: Hapus selamanya ${selectedIds.length} artikel dari database Firestore? Tindakan ini tidak dapat dibatalkan!`)) {
        const success = await bulkDeleteArticles(selectedIds);
        if (success !== false) {
          showToast(`${selectedIds.length} artikel dihapus permanen dari Firestore.`);
          setSelectedIds([]);
          setBulkActionSelect('');
        }
      }
    }
  };

  const handleApplyReassignAuthor = async () => {
    if (selectedIds.length === 0) return;
    
    const selectedUser = availableAuthors.find(a => a.id === bulkAuthorChoice) || {
      id: currentUser.id,
      name: currentUser.name,
      avatar: currentUser.avatar,
      role: currentUser.role,
    };

    const success = await bulkReassignAuthor(selectedIds, {
      id: selectedUser.id,
      name: selectedUser.name.replace(' (Saya)', ''),
      avatar: selectedUser.avatar,
      role: selectedUser.role as UserRole,
    });

    if (success !== false) {
      showToast(`Kepemilikan ${selectedIds.length} artikel dialihkan ke ${selectedUser.name}.`);
      setIsBulkAuthorModalOpen(false);
      setSelectedIds([]);
      setBulkActionSelect('');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. WORDPRESS-STYLE STATUS TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800 scrollbar-none text-xs font-bold">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          <span>Semua</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-700 text-slate-300 text-[10px] font-black">
            {statusCounts.all}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('published')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            statusFilter === 'published'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>Terbit</span>
          <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black">
            {statusCounts.published}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('draft')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            statusFilter === 'draft'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>Draf</span>
          <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black">
            {statusCounts.draft}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('scheduled')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            statusFilter === 'scheduled'
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-blue-400" />
          <span>Terjadwal</span>
          <span className="px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-black">
            {statusCounts.scheduled}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('trash')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            statusFilter === 'trash'
              ? 'bg-red-500/20 text-red-300 border border-red-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
          <span>Sampah</span>
          <span className="px-1.5 py-0.2 rounded-full bg-red-500/20 text-red-300 text-[10px] font-black">
            {statusCounts.trash}
          </span>
        </button>
      </div>

      {/* 2. TOOLBAR FILTER BAR & BULK ACTIONS */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* BULK ACTIONS CONTROL */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={bulkActionSelect}
              onChange={(e) => setBulkActionSelect(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-pink-500 transition-colors"
            >
              <option value="">Tindakan Massal (Bulk Actions)</option>
              <option value="publish">Publikasikan Terpilih</option>
              <option value="draft">Ubah ke Draf Terpilih</option>
              <option value="cat_movies">Ubah Kategori: Movies</option>
              <option value="cat_series">Ubah Kategori: Series</option>
              <option value="cat_anime">Ubah Kategori: Anime</option>
              <option value="cat_gear">Ubah Kategori: Cinema Gear</option>
              <option value="cat_studies">Ubah Kategori: Film Studies</option>
              {isAdminView && (
                <option value="reassign_modal">Re-assign Penulis (Admin Only)...</option>
              )}
              <option value="trash">Pindahkan ke Sampah</option>
              <option value="delete_permanently">Hapus Permanen dari Firestore</option>
            </select>

            <button
              onClick={handleApplyBulkAction}
              disabled={selectedIds.length === 0}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedIds.length > 0
                  ? 'bg-pink-600 hover:bg-pink-500 text-white shadow-md shadow-pink-950/30'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span>Terapkan</span>
              {selectedIds.length > 0 && (
                <span className="px-1.5 py-0.2 rounded bg-pink-800 text-pink-100 text-[10px] font-black">
                  {selectedIds.length}
                </span>
              )}
            </button>
          </div>

          {/* FILTER DROPDOWNS & LIVE SEARCH */}
          <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap">
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-pink-500 transition-colors"
            >
              <option value="all">Semua Kategori</option>
              <option value="movies">Movies</option>
              <option value="series">Series</option>
              <option value="anime">Anime</option>
              <option value="cinema-gear">Cinema Gear</option>
              <option value="film-studies">Film Studies</option>
            </select>

            {/* Author Filter Dropdown (Admin View Only) */}
            {isAdminView && (
              <select
                value={authorFilter}
                onChange={(e) => setAuthorFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-purple-500 transition-colors max-w-[160px]"
              >
                <option value="all">Semua Penulis</option>
                {availableAuthors.map(auth => (
                  <option key={auth.id} value={auth.id}>
                    {auth.name}
                  </option>
                ))}
              </select>
            )}

            {/* Live Search Input */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari judul atau URL slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:border-pink-500 placeholder:text-slate-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. WORDPRESS-STYLE TABLE LIST VIEW */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4 w-10 text-center">
                  <input
                     type="checkbox"
                     checked={filteredArticles.length > 0 && selectedIds.length === filteredArticles.length}
                     onChange={handleSelectAll}
                     className="rounded border-slate-700 bg-slate-900 text-pink-600 focus:ring-pink-500 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4">Judul Artikel</th>
                {isAdminView && <th className="py-3.5 px-4">Penulis</th>}
                <th className="py-3.5 px-4">Kategori</th>
                <th className="py-3.5 px-4 text-center">Statistik</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredArticles.length === 0 ? (
                <tr>
                  <td colSpan={isAdminView ? 7 : 6} className="py-12 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto mb-3 text-slate-500">
                      <FileText className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-sm text-slate-300">Tidak ada artikel ditemukan</p>
                    <p className="text-xs text-slate-500 mt-1">Coba sesuaikan kata kunci pencarian atau filter status yang Anda pilih.</p>
                  </td>
                </tr>
              ) : (
                filteredArticles.map((article) => {
                  const isSelected = selectedIds.includes(article.id);
                  const isQuickEditing = quickEditingId === article.id;
                  const isPublished = article.status === 'published' || (!article.status && article.status !== 'draft' && article.status !== 'trash' && article.status !== 'scheduled');

                  if (isQuickEditing) {
                    // INLINE QUICK EDIT FORM ROW (WORDPRESS STYLE)
                    return (
                      <tr key={`quick-${article.id}`} className="bg-slate-950/90 border-l-4 border-l-pink-500">
                        <td colSpan={isAdminView ? 7 : 6} className="p-5 space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <span className="font-bold text-pink-400 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                              <Edit3 className="w-3.5 h-3.5" />
                              Quick Edit: {article.title}
                            </span>
                            <span className="text-[10px] text-slate-500">ID: {article.id}</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                            {/* Title & Slug */}
                            <div className="space-y-2 lg:col-span-2">
                              <div>
                                <label className="block text-slate-400 font-semibold mb-1">Judul Artikel</label>
                                <input
                                  type="text"
                                  value={quickForm.title}
                                  onChange={(e) => setQuickForm(prev => ({ ...prev, title: e.target.value }))}
                                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-pink-500"
                                />
                              </div>
                              <div>
                                <label className="block text-slate-400 font-semibold mb-1">URL Slug</label>
                                <input
                                  type="text"
                                  value={quickForm.slug}
                                  onChange={(e) => setQuickForm(prev => ({ ...prev, slug: e.target.value }))}
                                  className="w-full bg-slate-900 border border-slate-700 text-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-pink-500"
                                />
                              </div>
                            </div>

                            {/* Category & SubCategory */}
                            <div className="space-y-2">
                              <div>
                                <label className="block text-slate-400 font-semibold mb-1">Kategori Utama</label>
                                <select
                                  value={quickForm.category}
                                  onChange={(e) => {
                                    const cat = e.target.value as MainCategory;
                                    const defaultSub = SUBCATEGORIES_BY_CAT[cat]?.[0]?.value || 'reviews';
                                    setQuickForm(prev => ({ ...prev, category: cat, subCategory: defaultSub }));
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-pink-500"
                                >
                                  <option value="movies">Movies</option>
                                  <option value="series">Series</option>
                                  <option value="anime">Anime</option>
                                  <option value="cinema-gear">Cinema Gear</option>
                                  <option value="film-studies">Film Studies</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-slate-400 font-semibold mb-1">Sub-Kategori</label>
                                <select
                                  value={quickForm.subCategory}
                                  onChange={(e) => setQuickForm(prev => ({ ...prev, subCategory: e.target.value as SubCategory }))}
                                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-1.5 focus:outline-none focus:border-pink-500"
                                >
                                  {(SUBCATEGORIES_BY_CAT[quickForm.category] || []).map(sub => (
                                    <option key={sub.value} value={sub.value}>
                                      {sub.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* Status & Scheduled */}
                            <div className="space-y-2">
                              <div>
                                <label className="block text-slate-400 font-semibold mb-1">Status Artikel</label>
                                <select
                                  value={quickForm.status}
                                  onChange={(e) => setQuickForm(prev => ({ ...prev, status: e.target.value as any }))}
                                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-pink-500"
                                >
                                  <option value="published">Published (Terbit)</option>
                                  <option value="draft">Draft (Draf)</option>
                                  <option value="scheduled">Scheduled (Terjadwal)</option>
                                  <option value="trash">Trash (Tempat Sampah)</option>
                                </select>
                              </div>

                              {quickForm.status === 'scheduled' && (
                                <div>
                                  <label className="block text-slate-400 font-semibold mb-1">Waktu Rilis</label>
                                  <input
                                    type="datetime-local"
                                    value={quickForm.scheduledAt}
                                    onChange={(e) => setQuickForm(prev => ({ ...prev, scheduledAt: e.target.value }))}
                                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-1.5 focus:outline-none focus:border-pink-500"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Author (Admin View Only) */}
                            {isAdminView && (
                              <div className="space-y-2">
                                <label className="block text-slate-400 font-semibold mb-1">Penulis (Admin Re-assign)</label>
                                <select
                                  value={quickForm.authorId}
                                  onChange={(e) => setQuickForm(prev => ({ ...prev, authorId: e.target.value }))}
                                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500"
                                >
                                  {availableAuthors.map(auth => (
                                    <option key={auth.id} value={auth.id}>
                                      {auth.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {/* Tags & Featured */}
                            <div className="space-y-2">
                              <div>
                                <label className="block text-slate-400 font-semibold mb-1">Tag (Pisahkan koma)</label>
                                <input
                                  type="text"
                                  value={quickForm.tags}
                                  placeholder="film, ulasan, oscar"
                                  onChange={(e) => setQuickForm(prev => ({ ...prev, tags: e.target.value }))}
                                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-1.5 focus:outline-none focus:border-pink-500"
                                />
                              </div>

                              <div className="pt-2">
                                <label className="flex items-center gap-2 text-slate-300 font-medium cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={quickForm.isFeatured}
                                    onChange={(e) => setQuickForm(prev => ({ ...prev, isFeatured: e.target.checked }))}
                                    className="rounded border-slate-700 bg-slate-900 text-pink-600 focus:ring-pink-500"
                                  />
                                  <span>Jadikan Artikel Featured</span>
                                </label>
                              </div>
                            </div>
                          </div>

                          {/* INLINE BUTTON ACTIONS */}
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                            <button
                              onClick={cancelQuickEdit}
                              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 font-bold text-xs transition-colors cursor-pointer"
                            >
                              Batal
                            </button>
                            <button
                              onClick={() => saveQuickEdit(article.id)}
                              className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs shadow-md shadow-pink-950/40 transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                              <span>Update Artikel</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  // STANDARD ROW DISPLAY
                  return (
                    <tr 
                      key={article.id} 
                      className={`hover:bg-slate-850/70 transition-colors group ${
                        isSelected ? 'bg-pink-500/5' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(article.id)}
                          className="rounded border-slate-700 bg-slate-900 text-pink-600 focus:ring-pink-500 cursor-pointer"
                        />
                      </td>

                      {/* Title & Hover Action Links */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm line-clamp-1 group-hover:text-pink-300 transition-colors">
                              {article.title}
                            </span>
                            {article.featured && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase tracking-wider flex items-center gap-0.5">
                                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                Featured
                              </span>
                            )}
                          </div>

                          {/* Action Links (Visible on Hover) */}
                          <div className="flex items-center gap-2 pt-1 text-[10px] opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0 text-slate-500">
                            <button
                              onClick={() => startQuickEdit(article)}
                              className="text-pink-400 hover:text-pink-300 font-bold flex items-center gap-0.5 cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Quick Edit</span>
                            </button>
                            <span>|</span>
                            <button
                              onClick={() => navigateTo('write-article', { articleId: article.id })}
                              className="text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer"
                            >
                              Edit Full
                            </button>
                            <span>|</span>
                            <button
                              onClick={() => navigateTo('buzz-detail', { articleId: article.id })}
                              className="text-slate-400 hover:text-white cursor-pointer"
                            >
                              Tinjau Buzz
                            </button>
                            <span>|</span>
                            <button
                              onClick={async () => {
                                if (window.confirm(`Hapus permanen artikel "${article.title}" dari database?`)) {
                                  const success = await bulkDeleteArticles([article.id]);
                                  if (success !== false) {
                                    showToast(`Artikel "${article.title}" berhasil dihapus.`);
                                  }
                                }
                              }}
                              className="text-rose-500 hover:text-rose-400 font-bold cursor-pointer"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Author */}
                      {isAdminView && (
                        <td className="py-3.5 px-4 font-medium text-slate-300">
                          <div className="flex items-center gap-2">
                            <img
                              src={article.author?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80'}
                              alt={article.author?.name}
                              className="w-5 h-5 rounded-full object-cover"
                            />
                            <div>
                              <div className="font-semibold text-slate-200">{article.author?.name || 'Sotoy Curator'}</div>
                              <div className="text-[9px] text-slate-500 scale-90 -ml-1 flex items-center gap-1">
                                <RoleBadge role={article.author?.role || 'penulis_sotoy'} size="xs" showTooltip={false} />
                              </div>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Category */}
                      <td className="py-3.5 px-4 font-semibold text-slate-300 capitalize">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Folder className="w-3.5 h-3.5 text-pink-500/80" />
                          <span>{article.category}</span>
                          {article.subCategory && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              / {article.subCategory}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Stats */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-3 text-slate-400 text-[10px]">
                          <span className="flex items-center gap-1" title="Views">
                            <Eye className="w-3 h-3 text-cyan-400" />
                            <span className="font-mono text-slate-300">{article.views || 0}</span>
                          </span>
                          <span className="flex items-center gap-1" title="Suka">
                            <ThumbsUp className="w-3 h-3 text-pink-400" />
                            <span className="font-mono text-slate-300">{article.likes || 0}</span>
                          </span>
                          <span className="flex items-center gap-1" title="Komentar">
                            <MessageSquare className="w-3 h-3 text-amber-400" />
                            <span className="font-mono text-slate-300">{article.commentsCount || 0}</span>
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          isPublished
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-sm shadow-emerald-950/20'
                            : article.status === 'draft'
                            ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-sm shadow-amber-950/20'
                            : article.status === 'scheduled'
                            ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400 shadow-sm shadow-blue-950/20'
                            : 'bg-red-500/10 border border-red-500/30 text-red-400 shadow-sm shadow-red-950/20'
                        }`}>
                          {isPublished && <Check className="w-2.5 h-2.5" />}
                          {article.status === 'draft' && <Clock className="w-2.5 h-2.5" />}
                          {article.status === 'scheduled' && <Calendar className="w-2.5 h-2.5" />}
                          {article.status === 'trash' && <Trash2 className="w-2.5 h-2.5" />}
                          <span>{article.status || 'published'}</span>
                        </span>
                      </td>

                      {/* Tanggal */}
                      <td className="py-3.5 px-4 text-right text-slate-400 font-medium whitespace-nowrap">
                        <div>{article.publishedAt || '17 Sep 2026'}</div>
                        <div className="text-[9px] text-slate-500">
                          {article.status === 'scheduled' ? 'Dijadwalkan' : 'Diterbitkan'}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Bulk Author Reassign Modal */}
      {isBulkAuthorModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0D0E15] border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-purple-400" />
              Re-assign Penulis Massal
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pilih penulis di bawah ini untuk memindahkan kepemilikan {selectedIds.length} artikel terpilih.
            </p>

            <select
              value={bulkAuthorChoice}
              onChange={(e) => setBulkAuthorChoice(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-500"
            >
              {availableAuthors.map(auth => (
                <option key={auth.id} value={auth.id}>
                  {auth.name} ({auth.roleTitle})
                </option>
              ))}
            </select>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsBulkAuthorModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleApplyReassignAuthor}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-950/40 transition-colors cursor-pointer"
              >
                Ubah Penulis
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
