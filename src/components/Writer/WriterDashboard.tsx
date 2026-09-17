import React, { useState, useMemo } from 'react';
import {
  PenSquare,
  BookOpen,
  Plus,
  Eye,
  Heart,
  MessageSquare,
  Clock,
  Search,
  Filter,
  Trash2,
  Edit3,
  ExternalLink,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FileText,
  Tag,
  Share2,
  Calendar,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Article, MainCategory, SubCategory } from '../../types';

export const WriterDashboard: React.FC = () => {
  const {
    currentUser,
    articles,
    deleteArticle,
    navigateTo,
    showToast,
    isAdmin,
    isWriter
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'views-desc' | 'likes-desc'>('date-desc');
  const [articleToDelete, setArticleToDelete] = useState<Article | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter articles authored by current user (or all if admin wanting to view specific)
  const authorId = currentUser.id;
  const authorArticles = useMemo(() => {
    return articles.filter(a => a.author?.id === authorId || a.author?.id === currentUser.id);
  }, [articles, authorId, currentUser.id]);

  // Computed Writer Stats
  const stats = useMemo(() => {
    const totalArticles = authorArticles.length;
    const totalViews = authorArticles.reduce((sum, a) => sum + (a.views || 0), 0);
    const totalLikes = authorArticles.reduce((sum, a) => sum + (a.likes || 0), 0);
    const totalComments = authorArticles.reduce((sum, a) => sum + (a.commentsCount || 0), 0);
    const avgViews = totalArticles > 0 ? Math.round(totalViews / totalArticles) : 0;

    return {
      totalArticles,
      totalViews,
      totalLikes,
      totalComments,
      avgViews
    };
  }, [authorArticles]);

  // Filtered and sorted articles for the table
  const displayedArticles = useMemo(() => {
    return authorArticles
      .filter(art => {
        const matchesSearch =
          art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          art.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
          art.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesCat = selectedCategory === 'all' || art.category === selectedCategory;
        return matchesSearch && matchesCat;
      })
      .sort((a, b) => {
        if (sortBy === 'views-desc') return (b.views || 0) - (a.views || 0);
        if (sortBy === 'likes-desc') return (b.likes || 0) - (a.likes || 0);
        return 0; // default order
      });
  }, [authorArticles, searchQuery, selectedCategory, sortBy]);

  const handleEditArticle = (article: Article) => {
    navigateTo('write-article', { articleId: article.id });
  };

  const handleConfirmDelete = async () => {
    if (!articleToDelete) return;
    setIsDeleting(true);
    try {
      await deleteArticle(articleToDelete.id);
      setArticleToDelete(null);
    } catch (err) {
      showToast('Gagal menghapus artikel');
    } finally {
      setIsDeleting(false);
    }
  };

  const getCategoryLabel = (category: MainCategory) => {
    switch (category) {
      case 'movies':
        return { label: 'Movies', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' };
      case 'series':
        return { label: 'Series', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
      case 'anime':
        return { label: 'Anime', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
      case 'cinema-gear':
        return { label: 'Cinema Gear', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
      case 'film-studies':
        return { label: 'Film Studies', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' };
      default:
        return { label: category, color: 'bg-slate-700/50 text-slate-300 border-slate-600/30' };
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0B10] text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header & Writer Badge Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#161828] via-[#121320] to-[#0D0E15] border border-pink-500/30 p-6 sm:p-8 shadow-2xl shadow-pink-950/20">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-gradient-to-br from-[#FF2E7E]/15 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-12 w-48 h-48 bg-gradient-to-tr from-[#00F0FF]/10 to-transparent rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4 sm:gap-5">
              <div className="relative">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-[#FF2E7E] shadow-xl shadow-[#FF2E7E]/20"
                />
                <span className="absolute -bottom-1 -right-1 bg-gradient-to-r from-[#FF2E7E] to-[#FF8008] p-1.5 rounded-xl text-white shadow-md">
                  <PenSquare className="w-3.5 h-3.5" />
                </span>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-pink-500/20 border border-pink-500/40 text-[#FF2E7E] shadow-sm">
                    <Sparkles className="w-3 h-3" />
                    Penulis Sotoy
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded-md border border-slate-700">
                    UID: {currentUser.id}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                  {currentUser.name}
                  <span className="text-sm font-normal text-slate-400">({currentUser.handle})</span>
                </h1>
                
                <p className="text-sm text-slate-300 mt-1 max-w-2xl font-medium">
                  {currentUser.roleTitle || 'Penulis Sotoy (Jurnalis Film & Pop-Culture)'} — Studio editorial & manajemen publikasi artikel.
                </p>
              </div>
            </div>

            {/* Quick Publishing CTA Button */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                id="writer-new-article-btn"
                onClick={() => navigateTo('write-article')}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF2E7E] via-[#FF5E62] to-[#FF8008] text-white font-black text-sm hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#FF2E7E]/30 flex items-center justify-center gap-2 group cursor-pointer"
              >
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                <span>+ Tulis Artikel Baru</span>
              </button>
            </div>
          </div>
        </div>

        {/* Writer Stats Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="p-5 sm:p-6 rounded-2xl bg-[#121324] border border-slate-800 hover:border-pink-500/40 transition-all shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Artikel Terbit</span>
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-[#FF2E7E]">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-white">{stats.totalArticles}</span>
              <span className="text-xs text-slate-400 font-semibold">karya</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Publikasi aktif di Sotoy Film</span>
            </div>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-[#121324] border border-slate-800 hover:border-cyan-500/40 transition-all shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Pembaca (Views)</span>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#00F0FF]">
                <Eye className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-white">{stats.totalViews.toLocaleString('id-ID')}</span>
              <span className="text-xs text-slate-400 font-semibold">tayangan</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              <span>Rata-rata ~{stats.avgViews.toLocaleString('id-ID')} views/artikel</span>
            </div>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-[#121324] border border-slate-800 hover:border-rose-500/40 transition-all shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Apresiasi (Likes)</span>
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Heart className="w-5 h-5 fill-rose-500/20" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-white">{stats.totalLikes.toLocaleString('id-ID')}</span>
              <span className="text-xs text-slate-400 font-semibold">suka</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              <span>Dari pembaca & komunitas</span>
            </div>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-[#121324] border border-slate-800 hover:border-amber-500/40 transition-all shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Diskusi & Komentar</span>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <MessageSquare className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-white">{stats.totalComments.toLocaleString('id-ID')}</span>
              <span className="text-xs text-slate-400 font-semibold">tanggapan</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              <span>Interaksi pembaca aktif</span>
            </div>
          </div>
        </div>

        {/* Article Management Section */}
        <div className="rounded-3xl bg-[#121324] border border-slate-800 p-6 sm:p-8 shadow-xl space-y-6">
          
          {/* Controls Bar: Search, Category Filter, Sort, Count */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-[#FF2E7E]" />
                Manajemen Artikel Saya
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {authorArticles.length} Total
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Kelola naskah, pantau statistik performa tayangan, sunting atau hapus artikel karya Anda.
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search input */}
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari judul artikel/tag..."
                  className="w-full pl-9 pr-3 py-2 bg-[#0A0B10] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E] focus:ring-1 focus:ring-[#FF2E7E]"
                />
              </div>

              {/* Category dropdown */}
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-[#0A0B10] border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#FF2E7E] cursor-pointer"
                >
                  <option value="all">Semua Kategori</option>
                  <option value="movies">Movies</option>
                  <option value="series">Series</option>
                  <option value="anime">Anime</option>
                  <option value="cinema-gear">Cinema Gear</option>
                  <option value="film-studies">Film Studies</option>
                </select>
              </div>

              {/* Sort dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-[#0A0B10] border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#FF2E7E] cursor-pointer"
                >
                  <option value="date-desc">Terbaru</option>
                  <option value="views-desc">Paling Banyak Dilihat</option>
                  <option value="likes-desc">Paling Banyak Disukai</option>
                </select>
              </div>
            </div>
          </div>

          {/* Articles Table */}
          {displayedArticles.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#0D0E15]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#161828] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Artikel</th>
                    <th className="py-3.5 px-4">Kategori & Rubrik</th>
                    <th className="py-3.5 px-4">Tanggal Terbit</th>
                    <th className="py-3.5 px-4 text-center">Performa</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {displayedArticles.map((article) => {
                    const catBadge = getCategoryLabel(article.category);

                    return (
                      <tr key={article.id} className="hover:bg-slate-800/30 transition-colors group">
                        
                        {/* Title & Cover */}
                        <td className="py-4 px-4 max-w-md">
                          <div className="flex items-center gap-3.5">
                            <img
                              src={article.coverImage}
                              alt={article.title}
                              className="w-16 h-12 rounded-xl object-cover bg-slate-800 shrink-0 border border-slate-700 group-hover:scale-105 transition-transform"
                            />
                            <div className="min-w-0 flex-1">
                              <h3
                                onClick={() => navigateTo('article-detail', { articleId: article.id })}
                                className="text-sm font-bold text-white hover:text-[#FF2E7E] transition-colors line-clamp-1 cursor-pointer"
                                title={article.title}
                              >
                                {article.title}
                              </h3>
                              <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                                {article.excerpt}
                              </p>
                              {article.tags && article.tags.length > 0 && (
                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                  {article.tags.slice(0, 3).map((t, idx) => (
                                    <span key={idx} className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded border border-slate-700">
                                      #{t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Category & Subcategory */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${catBadge.color}`}>
                              {catBadge.label}
                            </span>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Rubrik: {article.subCategory}
                            </div>
                          </div>
                        </td>

                        {/* Date & Read Time */}
                        <td className="py-4 px-4 whitespace-nowrap text-slate-300">
                          <div className="flex items-center gap-1.5 text-xs">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            <span>{article.publishedAt}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                            <Clock className="w-3 h-3" />
                            <span>{article.readTime}</span>
                          </div>
                        </td>

                        {/* Performance Stats */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-3 font-semibold text-slate-300">
                            <span className="flex items-center gap-1 text-cyan-400" title="Views">
                              <Eye className="w-3.5 h-3.5" />
                              {(article.views || 0).toLocaleString('id-ID')}
                            </span>
                            <span className="flex items-center gap-1 text-rose-400" title="Likes">
                              <Heart className="w-3.5 h-3.5 fill-rose-500/20" />
                              {(article.likes || 0).toLocaleString('id-ID')}
                            </span>
                            <span className="flex items-center gap-1 text-amber-400" title="Comments">
                              <MessageSquare className="w-3.5 h-3.5" />
                              {(article.commentsCount || 0).toLocaleString('id-ID')}
                            </span>
                          </div>
                        </td>

                        {/* Quick Actions */}
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Article */}
                            <button
                              onClick={() => navigateTo('article-detail', { articleId: article.id })}
                              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-cyan-400 hover:bg-slate-700 transition-colors"
                              title="Lihat Artikel"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>

                            {/* Edit Article */}
                            <button
                              id={`edit-article-${article.id}`}
                              onClick={() => handleEditArticle(article)}
                              className="p-2 rounded-xl bg-pink-500/10 text-[#FF2E7E] hover:bg-pink-500/20 border border-pink-500/30 transition-colors flex items-center gap-1 font-bold"
                              title="Edit Artikel"
                            >
                              <Edit3 className="w-4 h-4" />
                              <span className="hidden sm:inline text-xs">Sunting</span>
                            </button>

                            {/* Delete Article */}
                            <button
                              id={`delete-article-${article.id}`}
                              onClick={() => setArticleToDelete(article)}
                              className="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
                              title="Hapus Artikel"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-slate-800 bg-[#0A0B10]/50 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-[#FF2E7E]">
                <PenSquare className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-white">
                  {authorArticles.length === 0 ? 'Belum Ada Artikel yang Dipublikasikan' : 'Tidak Ada Artikel yang Cocok dengan Pencarian'}
                </h3>
                <p className="text-xs text-slate-400">
                  {authorArticles.length === 0
                    ? 'Sebagai Penulis Sotoy resmi, Anda dapat menulis artikel mendalam, liputan berita bioskop, dan panduan perfilman.'
                    : 'Coba ubah kata kunci pencarian atau filter kategori yang Anda pilih.'}
                </p>
              </div>
              {authorArticles.length === 0 && (
                <button
                  onClick={() => navigateTo('write-article')}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF2E7E] to-[#FF8008] text-white font-bold text-xs hover:brightness-110 transition-all inline-flex items-center gap-2 shadow-lg shadow-pink-900/30"
                >
                  <Plus className="w-4 h-4" />
                  <span>Mulai Tulis Artikel Pertamamu</span>
                </button>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {articleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#121324] border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Hapus Artikel Ini?</h3>
                <p className="text-xs text-slate-400">Tindakan ini permanen dan tidak dapat dibatalkan.</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800">
              <div className="text-xs font-bold text-white line-clamp-2">
                "{articleToDelete.title}"
              </div>
              <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400 font-mono">
                <span>ID: {articleToDelete.id}</span>
                <span>•</span>
                <span>{articleToDelete.views || 0} views</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setArticleToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors shadow-lg shadow-rose-900/40 flex items-center gap-2 cursor-pointer"
              >
                {isDeleting ? (
                  <span>Menghapus...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Ya, Hapus Artikel</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
