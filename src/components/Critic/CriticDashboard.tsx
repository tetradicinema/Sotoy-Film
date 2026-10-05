import React, { useState, useMemo } from 'react';
import {
  Award,
  Star,
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
  Pin,
  BarChart3,
  Calendar,
  Share2,
  Download,
  Flame,
  LayoutDashboard,
  Film
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { DEFAULT_AVATAR } from '../../data/mockData';
import { UserRating, FilmItem } from '../../types';
import { NotificationBell } from '../Common/NotificationBell';

export const CriticDashboard: React.FC = () => {
  const {
    currentUser,
    ratings,
    films,
    deleteFilmRating,
    updateFilmRating,
    navigateTo,
    showToast,
    isCritic
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilmType, setSelectedFilmType] = useState<'all' | 'movie' | 'series' | 'anime'>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'score-desc' | 'likes-desc' | 'views-desc'>('date-desc');
  const [ratingToDelete, setRatingToDelete] = useState<UserRating | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Filter ratings authored by current user
  const criticRatings = useMemo(() => {
    return ratings.filter(r => r.userId === currentUser.id);
  }, [ratings, currentUser.id]);

  // Compute stats
  const stats = useMemo(() => {
    const totalReviews = criticRatings.length;
    const avgScore = totalReviews > 0 
      ? Number((criticRatings.reduce((sum, r) => sum + r.score, 0) / totalReviews).toFixed(1))
      : 0;
    const totalLikes = criticRatings.reduce((sum, r) => sum + (r.likes || 0), 0);
    const totalViews = criticRatings.reduce((sum, r) => sum + (r.views || 0), 0);
    const totalComments = criticRatings.reduce((sum, r) => sum + (r.commentsCount || 0), 0);

    return {
      totalReviews,
      avgScore,
      totalLikes,
      totalViews,
      totalComments
    };
  }, [criticRatings]);

  // Performance data for chart
  const last30DaysPerformance = useMemo(() => {
    const result: { date: string; views: number; reviews: number }[] = [];
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      
      // Pseudo-random data for demonstration in POC if no real daily views
      const pseudoRandom = Math.sin(i * 0.8 + criticRatings.length) * 0.4 + 0.6;
      const views = Math.round((stats.totalViews / 25) * pseudoRandom);

      result.push({
        date: dateStr,
        views: views,
        reviews: criticRatings.length,
      });
    }
    return result;
  }, [criticRatings, stats.totalViews]);

  // Join ratings with film data
  const ratingsWithFilmData = useMemo(() => {
    return criticRatings.map(r => ({
      ...r,
      film: films.find(f => f.id === r.filmId)
    }));
  }, [criticRatings, films]);

  // Filtered and sorted ratings
  const displayedRatings = useMemo(() => {
    return ratingsWithFilmData
      .filter(r => {
        const matchesSearch = 
          r.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.film?.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = selectedFilmType === 'all' || r.film?.type === selectedFilmType;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        if (sortBy === 'score-desc') return b.score - a.score;
        if (sortBy === 'likes-desc') return (b.likes || 0) - (a.likes || 0);
        if (sortBy === 'views-desc') return (b.views || 0) - (a.views || 0);
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [ratingsWithFilmData, searchQuery, selectedFilmType, sortBy]);

  const handleTogglePin = async (rating: UserRating) => {
    try {
      await updateFilmRating(rating.id, { featured: !rating.featured });
      showToast(rating.featured ? 'Ulasan dilepas dari pin profil.' : 'Ulasan berhasil dipin ke profil! 📌');
    } catch (err) {
      showToast('Gagal mengubah status pin.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!ratingToDelete) return;
    setIsDeleting(true);
    try {
      await deleteFilmRating(ratingToDelete.id);
      setRatingToDelete(null);
    } catch (err) {
      showToast('Gagal menghapus ulasan.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadReport = () => {
    showToast('Menyiapkan laporan performa kritikus...');
    // Logic for report download could go here
  };

  if (!isCritic) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 space-y-6">
        <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
          <AlertTriangle className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white">Access Denied</h2>
          <p className="text-slate-400 max-w-md">
            Maaf, halaman ini hanya tersedia untuk pengguna dengan peran <strong>Si Paling Sotoy</strong> atau Admin.
          </p>
        </div>
        <button
          onClick={() => navigateTo('home')}
          className="px-6 py-3 rounded-2xl bg-[#FF2E7E] text-white font-bold hover:bg-[#e0266e] transition-all shadow-sm active:scale-[0.98]"
        >
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8 pb-20 lg:pb-8">
        
        {/* Header & Critic Profile Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-[#171717] border border-white/10 p-6 sm:p-8 shadow-xl">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-[#FF2E7E]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4 sm:gap-5">
              <div className="relative">
                <img
                  src={currentUser.avatar?.trim() || DEFAULT_AVATAR}
                  alt={currentUser.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-white/10 shadow-sm"
                />
                <span className="absolute -bottom-1 -right-1 bg-[#FF2E7E] p-1.5 rounded-xl text-white shadow-sm">
                  <Award className="w-3.5 h-3.5" />
                </span>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/[0.06] border border-white/10 text-white shadow-sm">
                    <Sparkles className="w-3 h-3 text-[#FF2E7E]" />
                    Si Paling Sotoy
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 bg-white/[0.04] px-2.5 py-0.5 rounded-md border border-white/10">
                    UID: {currentUser.id}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                  {currentUser.name}
                  <span className="text-sm font-normal text-slate-400">({currentUser.handle})</span>
                </h1>
                
                <p className="text-sm text-slate-300 mt-1 max-w-2xl font-medium">
                  {currentUser.roleTitle || 'Si Paling Sotoy (Kritikus Film)'} — Studio kurasi & manajemen kritik film profesional.
                </p>
              </div>
            </div>

            {/* Quick Actions & Notifications */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div className="bg-[#0A0A0A] p-1.5 rounded-2xl border border-white/10 shadow-sm">
                <NotificationBell mode="critic" />
              </div>

              <button
                onClick={handleDownloadReport}
                className="px-4 py-3 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 font-bold text-xs sm:text-sm border border-white/10 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                <Download className="w-4 h-4 text-slate-300" />
                <span className="hidden sm:inline">Laporan PDF</span>
              </button>

              <button
                onClick={() => navigateTo('film-database')}
                className="px-5 sm:px-6 py-3 sm:py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-xs sm:text-sm hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2 group cursor-pointer"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-90 transition-transform" />
                <span>+ Buat Ulasan Baru</span>
              </button>
            </div>
          </div>
        </div>

        {/* Critic Stats Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="p-5 sm:p-6 rounded-2xl bg-[#171717] border border-white/10 hover:border-[#FF2E7E]/40 transition-all shadow-lg group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider group-hover:text-[#FF2E7E] transition-colors">Total Ulasan</span>
              <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-[#FF2E7E]">
                <Star className="w-5 h-5 fill-current" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-white">{stats.totalReviews}</span>
              <span className="text-xs text-slate-400 font-semibold">film</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Kontribusi ulasan terverifikasi</span>
            </div>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-[#171717] border border-white/10 hover:border-[#FF2E7E]/40 transition-all shadow-lg group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider group-hover:text-[#FF2E7E] transition-colors">Rata-rata Skor</span>
              <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-[#FF2E7E]">
                <Flame className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-medium text-white">{stats.avgScore}</span>
              <span className="text-xs text-slate-400 font-semibold">/ 10.0</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-[#FF2E7E] fill-current" />
              <span>Kualitas penilaian kritikus</span>
            </div>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-[#171717] border border-white/10 hover:border-[#FF2E7E]/40 transition-all shadow-lg group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider group-hover:text-[#FF2E7E] transition-colors">Apresiasi (Likes)</span>
              <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-[#FF2E7E]">
                <Heart className="w-5 h-5 fill-current" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-white">{stats.totalLikes.toLocaleString('id-ID')}</span>
              <span className="text-xs text-slate-400 font-semibold">suka</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#FF2E7E]" />
              <span>Dukungan dari komunitas</span>
            </div>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-[#171717] border border-white/10 hover:border-[#FF2E7E]/40 transition-all shadow-lg group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider group-hover:text-[#FF2E7E] transition-colors">Engagement</span>
              <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-[#FF2E7E]">
                <MessageSquare className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-white">{stats.totalComments.toLocaleString('id-ID')}</span>
              <span className="text-xs text-slate-400 font-semibold">komentar</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span>{stats.totalViews.toLocaleString('id-ID')} total tayangan</span>
            </div>
          </div>
        </div>

        {/* Analytics Chart */}
        <div className="p-6 rounded-3xl bg-[#171717] border border-white/10 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2.5">
                <BarChart3 className="w-5 h-5 text-[#FF2E7E]" />
                <span>Statistik Jangkauan Ulasan (30 Hari)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Volume pembaca harian untuk seluruh kurasi dan ulasan film Anda.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#FF2E7E] bg-[#FF2E7E]/10 border border-[#FF2E7E]/20 px-3 py-1.5 rounded-xl self-start sm:self-auto">
              <TrendingUp className="w-4 h-4" />
              <span>Performa Stabil</span>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last30DaysPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="viewsGradientCritic" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#171717" vertical={false} />
                <XAxis dataKey="date" stroke="#737373" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#737373" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#0A0A0A] border border-slate-700 p-3 rounded-xl shadow-xl space-y-1">
                          <p className="text-xs font-bold text-slate-300">{label}</p>
                          <p className="text-xs font-black text-cyan-400">
                            {(payload[0].value as number).toLocaleString('id-ID')} Pembaca
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="#06b6d4"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#viewsGradientCritic)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Review Management List */}
        <div className="rounded-3xl bg-[#171717] border border-white/10 p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2.5">
                <LayoutDashboard className="w-5 h-5 text-[#FF2E7E]" />
                Manajemen Ulasan & Kritik
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/[0.06] text-slate-300 border border-white/10">
                  {criticRatings.length} Total
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Pantau statistik, sunting narasi kritik, atau sematkan ulasan terbaik di profil Anda.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari ulasan film..."
                  className="w-full pl-9 pr-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
                />
              </div>

              <select
                value={selectedFilmType}
                onChange={(e) => setSelectedFilmType(e.target.value as any)}
                className="bg-[#0A0A0A] border border-white/10 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#FF2E7E] cursor-pointer"
              >
                <option value="all" className="bg-[#171717]">Semua Tipe</option>
                <option value="movie" className="bg-[#171717]">Movie</option>
                <option value="series" className="bg-[#171717]">Series</option>
                <option value="anime" className="bg-[#171717]">Anime</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-[#0A0A0A] border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="date-desc">Terbaru</option>
                <option value="score-desc">Skor Tertinggi</option>
                <option value="likes-desc">Likes Terbanyak</option>
                <option value="views-desc">Views Terbanyak</option>
              </select>
            </div>
          </div>

          {displayedRatings.length > 0 ? (
            <div className="grid gap-4">
              {displayedRatings.map((rating) => (
                <div 
                  key={rating.id}
                  className="group relative overflow-hidden bg-[#0A0A0A] border border-slate-800 rounded-2xl hover:border-cyan-500/40 transition-all p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-center"
                >
                  {/* Film Thumbnail */}
                  <div className="relative w-20 h-28 sm:w-16 sm:h-20 shrink-0">
                    <img 
                      src={rating.film?.poster || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=300&q=80'} 
                      alt={rating.film?.title} 
                      className="w-full h-full object-cover rounded-xl border border-slate-700"
                    />
                    <div className="absolute top-1 left-1 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded-lg border border-white/10 flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                      <span className="text-[10px] font-medium text-white">{rating.score}</span>
                    </div>
                  </div>

                  {/* Review Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors truncate">
                        {rating.film?.title}
                      </h3>
                      {rating.featured && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[9px] font-black uppercase text-cyan-400">
                          <Pin className="w-2.5 h-2.5" />
                          Pinned
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-slate-300 line-clamp-1 italic">
                      "{rating.headline}"
                    </p>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {rating.reviewText}
                    </p>
                    <div className="flex items-center gap-4 pt-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(rating.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-bold">
                        <span className="flex items-center gap-1 text-cyan-400">
                          <Eye className="w-3 h-3" />
                          {(rating.views || 0).toLocaleString('id-ID')}
                        </span>
                        <span className="flex items-center gap-1 text-rose-400">
                          <Heart className="w-3 h-3 fill-rose-500/20" />
                          {(rating.likes || 0).toLocaleString('id-ID')}
                        </span>
                        <span className="flex items-center gap-1 text-amber-400">
                          <MessageSquare className="w-3 h-3" />
                          {(rating.commentsCount || 0).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 justify-end sm:justify-start">
                    <button
                      onClick={() => handleTogglePin(rating)}
                      className={`p-2 rounded-xl border transition-all ${
                        rating.featured 
                          ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' 
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-cyan-400'
                      }`}
                      title={rating.featured ? 'Lepas Sematan' : 'Sematkan ke Profil'}
                    >
                      <Pin className={`w-4 h-4 ${rating.featured ? 'fill-cyan-400' : ''}`} />
                    </button>
                    
                    <button
                      onClick={() => navigateTo('film-detail', { filmId: rating.filmId })}
                      className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-all"
                      title="Lihat Halaman Film"
                    >
                      <Film className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => showToast('Fitur edit ulasan sedang dalam pengembangan.')}
                      className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-amber-400 transition-all"
                      title="Edit Ulasan"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setRatingToDelete(rating)}
                      className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all"
                      title="Hapus Ulasan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-slate-800 bg-[#0A0A0A]/50 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Star className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-white">
                  {criticRatings.length === 0 ? 'Belum Ada Ulasan Film' : 'Tidak Ada Ulasan yang Cocok'}
                </h3>
                <p className="text-xs text-slate-400">
                  {criticRatings.length === 0
                    ? 'Mulailah memberikan ulasan dan kritik tajam Anda untuk membangun portofolio sebagai Si Paling Sotoy.'
                    : 'Coba ubah kata kunci pencarian atau filter tipe film yang Anda pilih.'}
                </p>
              </div>
              {criticRatings.length === 0 && (
                <button
                  onClick={() => navigateTo('film-database')}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs hover:brightness-110 transition-all inline-flex items-center gap-2 shadow-lg shadow-cyan-900/30"
                >
                  <Plus className="w-4 h-4" />
                  <span>Jelajahi Film & Berikan Ulasan</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {ratingToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#171717] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Hapus Ulasan Ini?</h3>
                <p className="text-xs text-slate-400">Ulasan dan skor sotoy Anda akan dihapus secara permanen.</p>
              </div>
            </div>

            <div className="p-3.5 bg-[#0A0A0A] rounded-2xl border border-white/10">
              <div className="text-xs font-bold text-white line-clamp-1">
                {ratingToDelete.filmId}
              </div>
              <div className="text-xs text-slate-400 italic mt-1 line-clamp-1">
                "{ratingToDelete.headline}"
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setRatingToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl bg-white/[0.06] text-slate-300 hover:bg-white/[0.12] text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors shadow-lg shadow-rose-900/40 flex items-center gap-2 cursor-pointer"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CriticDashboard;
