import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  MessageSquare, 
  Star, 
  AlertTriangle, 
  UserX, 
  Clock, 
  ExternalLink,
  Search,
  Filter,
  Eye,
  Check,
  Shield
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ModerationReport, BuzzPost, UserRating } from '../../types';

export const AdminModeration: React.FC = () => {
  const { 
    moderationReports, 
    resolveReport, 
    toggleUserSuspension, 
    buzzList, 
    deleteBuzzPost, 
    deleteBuzzReply,
    deleteFilmRating,
    ratings,
    showToast,
    navigateTo
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'reports' | 'buzz' | 'reviews'>('reports');
  const [reportStatusFilter, setReportStatusFilter] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter reports
  const filteredReports = moderationReports.filter(report => {
    if (reportStatusFilter !== 'all' && report.status !== reportStatusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchReason = report.reason?.toLowerCase().includes(q);
      const matchContent = report.targetContent?.toLowerCase().includes(q);
      const matchAuthor = report.targetAuthorName?.toLowerCase().includes(q);
      const matchReporter = report.reporterName?.toLowerCase().includes(q);
      if (!matchReason && !matchContent && !matchAuthor && !matchReporter) return false;
    }
    return true;
  });

  // Filter buzz posts
  const filteredBuzz = buzzList.filter(buzz => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return buzz.content.toLowerCase().includes(q) || buzz.author.name.toLowerCase().includes(q);
  });

  // Filter reviews
  const filteredReviews = ratings.filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (r.reviewText && r.reviewText.toLowerCase().includes(q)) || r.userName.toLowerCase().includes(q);
  });

  const handleResolve = async (report: ModerationReport, action: 'dismiss' | 'take_down') => {
    await resolveReport(report.id, action, {
      targetType: report.targetType,
      targetId: report.targetId,
    });
  };

  const handleBanAuthor = async (authorId: string, authorName: string) => {
    if (!authorId) {
      showToast('ID pengguna tidak valid.');
      return;
    }
    if (window.confirm(`Yakin ingin MEMBEKUKAN akun ${authorName} (UID: ${authorId}) karena pelanggaran konten?`)) {
      await toggleUserSuspension(authorId, true);
    }
  };

  const handleDeleteBuzz = async (buzzId: string) => {
    if (window.confirm('Yakin ingin menghapus obrolan Buzz ini secara permanen?')) {
      await deleteBuzzPost(buzzId);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (window.confirm('Yakin ingin menghapus ulasan film ini?')) {
      await deleteFilmRating(reviewId);
    }
  };

  const pendingCount = moderationReports.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display font-black text-xl text-white tracking-tight flex items-center gap-2.5">
            <span>Moderasi Komunitas & Kontrol Pelanggaran</span>
            {pendingCount > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-sans font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {pendingCount} Laporan Menunggu
              </span>
            )}
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Tinjau konten yang dilaporkan warga, hapus komentar yang melanggar etika, dan bekukan akun pelaku secara langsung.
          </p>
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex border border-white/10 bg-[#171717] rounded-2xl p-1.5 gap-1.5">
        <button
          onClick={() => setActiveSubTab('reports')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'reports'
              ? 'bg-[#FF2E7E] text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-white" />
          <span>Laporan Warga ({moderationReports.length})</span>
          {pendingCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-white text-slate-950 font-black text-[10px] flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('buzz')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'buzz'
              ? 'bg-[#FF2E7E] text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-slate-400" />
          <span>Semua Obrolan Buzz ({buzzList.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('reviews')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'reviews'
              ? 'bg-[#FF2E7E] text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          <Star className="w-4 h-4 text-slate-400" />
          <span>Semua Ulasan Film ({ratings.length})</span>
        </button>
      </div>

      {/* Sub-Tab 1: Reports Moderation */}
      {activeSubTab === 'reports' && (
        <div className="space-y-4">
          {/* Status Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#171717] border border-white/10 rounded-2xl p-3.5">
            <div className="flex items-center gap-1.5">
              {(['all', 'pending', 'resolved', 'dismissed'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setReportStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
                    reportStatusFilter === status
                      ? 'bg-white/[0.12] text-white'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  {status === 'all' ? 'Semua' : status === 'pending' ? 'Menunggu (Pending)' : status === 'resolved' ? 'Ditindaklanjuti' : 'Diabaikan'}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari alasan, konten, nama..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
              />
            </div>
          </div>

          {/* Reports List */}
          <div className="space-y-3">
            {filteredReports.length === 0 ? (
              <div className="bg-[#171717] border border-white/10 rounded-2xl p-8 text-center text-slate-500 text-xs">
                <CheckCircle className="w-8 h-8 text-emerald-400/60 mx-auto mb-2" />
                <p className="font-bold text-slate-300">Tidak ada laporan aktif dalam kategori ini.</p>
                <p className="text-slate-500 mt-1">Komunitas Sotoy Film kondusif dan tertib.</p>
              </div>
            ) : (
              filteredReports.map(report => (
                <div 
                  key={report.id}
                  className={`bg-[#171717] border rounded-2xl p-4 sm:p-5 transition-all space-y-4 ${
                    report.status === 'pending'
                      ? 'border-[#FF2E7E]/40 bg-[#171717]'
                      : 'border-white/10 opacity-75'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30">
                        {report.targetType.toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-300 font-bold">
                        Alasan: <span className="text-red-400">{report.reason}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(report.createdAt).toLocaleString('id-ID')}</span>
                      <span className={`px-2 py-0.2 rounded-full font-bold uppercase ${
                        report.status === 'pending'
                          ? 'bg-amber-500/20 text-amber-300'
                          : report.status === 'resolved'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {report.status}
                      </span>
                    </div>
                  </div>

                  {/* Target Content Snippet */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Penulis Konten: <strong className="text-white">{report.targetAuthorName}</strong> (UID: <code className="text-amber-400">{report.targetAuthorId}</code>)</span>
                      <span>Pelapor: <strong className="text-cyan-400">{report.reporterName}</strong></span>
                    </div>
                    <div className="text-xs text-slate-200 italic bg-black/30 p-2.5 rounded-lg border-l-2 border-red-400">
                      "{report.targetContent}"
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  {report.status === 'pending' ? (
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => handleResolve(report, 'dismiss')}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Abaikan Laporan</span>
                      </button>

                      <button
                        onClick={() => handleResolve(report, 'take_down')}
                        className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-red-900/30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus Konten & Tuntaskan</span>
                      </button>

                      <button
                        onClick={() => handleBanAuthor(report.targetAuthorId, report.targetAuthorName)}
                        className="px-3 py-1.5 rounded-xl bg-[#FF2E7E] hover:bg-[#e0266e] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-[0.98]"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>Bekukan Akun Pelaku</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-right text-[11px] text-slate-500 font-bold">
                      Laporan ini telah diselesaikan.
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Live Buzz Stream */}
      {activeSubTab === 'buzz' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-[#171717] border border-white/10 rounded-2xl p-3.5">
            <span className="text-xs text-slate-400 font-bold">
              Menampilkan {filteredBuzz.length} utas obrolan Buzz warga di Firestore
            </span>
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari obrolan buzz..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredBuzz.length === 0 ? (
              <div className="bg-[#171717] border border-white/10 rounded-2xl p-8 text-center text-slate-500 text-xs">
                Tidak ada obrolan buzz yang cocok dengan pencarian.
              </div>
            ) : (
              filteredBuzz.map(buzz => (
                <div key={buzz.id} className="bg-[#171717] border border-white/10 hover:border-white/20 rounded-2xl p-4 flex items-start justify-between gap-4 transition-all">
                  <div className="flex items-start gap-3 min-w-0">
                    <img
                      src={buzz.author.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80'}
                      alt={buzz.author.name}
                      className="w-9 h-9 rounded-xl object-cover shrink-0"
                    />
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-xs">{buzz.author.name}</span>
                        <span className="text-[10px] text-slate-500">@{buzz.author.handle}</span>
                        <span className="text-[10px] text-slate-600">• {buzz.createdAt ? new Date(buzz.createdAt).toLocaleDateString('id-ID') : 'Baru'}</span>
                      </div>
                      <p className="text-xs text-slate-300 line-clamp-3">{buzz.content}</p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-1">
                        <span>{buzz.likes || 0} Suka</span>
                        <span>{buzz.repliesCount || buzz.replies?.length || 0} Balasan</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleBanAuthor(buzz.author.id, buzz.author.name)}
                      className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 border border-white/10 transition-colors"
                      title="Bekukan Akun Penulis"
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteBuzz(buzz.id)}
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors"
                      title="Hapus Obrolan Buzz Ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Film Reviews Stream */}
      {activeSubTab === 'reviews' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-[#171717] border border-white/10 rounded-2xl p-3.5">
            <span className="text-xs text-slate-400 font-bold">
              Menampilkan {filteredReviews.length} ulasan skor warga di Firestore
            </span>
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari teks ulasan / penilai..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredReviews.length === 0 ? (
              <div className="bg-[#171717] border border-white/10 rounded-2xl p-8 text-center text-slate-500 text-xs">
                Tidak ada ulasan yang cocok dengan pencarian.
              </div>
            ) : (
              filteredReviews.map(review => (
                <div key={review.id} className="bg-[#171717] border border-white/10 hover:border-white/20 rounded-2xl p-4 flex items-start justify-between gap-4 transition-all">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">{review.userName}</span>
                      <span className="text-[10px] text-[#FF2E7E] bg-[#FF2E7E]/10 px-2 py-0.5 rounded-full border border-[#FF2E7E]/30 font-black">
                        ★ {review.score} / 10
                      </span>
                      <span className="text-[10px] text-slate-500">• Film ID: {review.filmId}</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">{review.reviewText || '(Hanya memberikan rating angka)'}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleBanAuthor(review.userId, review.userName)}
                      className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 border border-white/10 transition-colors"
                      title="Bekukan Akun Warga"
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteReview(review.id)}
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors"
                      title="Hapus Ulasan Ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
