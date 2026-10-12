import React, { useState, useEffect } from 'react';
import { 
  History, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  User as UserIcon, 
  Calendar, 
  MessageSquare, 
  ArrowRight, 
  ShieldCheck, 
  ShieldAlert, 
  Search, 
  Filter,
  Trash2,
  ExternalLink,
  Clock,
  RefreshCw,
  Mail,
  UserX
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AccountAppeal } from '../../types';
import { RoleBadge } from '../Common/RoleBadge';

export const AdminAppeals: React.FC = () => {
  const { 
    appeals, 
    resolveAccountAppeal, 
    deleteAccountAppeal,
    allUsers,
    showToast,
    navigateTo,
    fetchAdminAppeals,
    hasMoreAppeals
  } = useApp();

  useEffect(() => {
    fetchAdminAppeals();
  }, [fetchAdminAppeals]);

  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAppeal, setSelectedAppeal] = useState<AccountAppeal | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Appeal Statistics
  const totalCount = appeals.length;
  const pendingCount = appeals.filter(a => a.status === 'pending').length;
  const approvedCount = appeals.filter(a => a.status === 'approved').length;
  const rejectedCount = appeals.filter(a => a.status === 'rejected').length;

  const filteredAppeals = appeals.filter(appeal => {
    const matchesFilter = filter === 'all' ? true : appeal.status === filter;
    const userName = appeal.userName || '';
    const userHandle = appeal.userHandle || '';
    const userEmail = appeal.userEmail || '';
    const reason = appeal.reason || '';
    const term = searchQuery.toLowerCase();
    const matchesSearch = userName.toLowerCase().includes(term) || 
                          userHandle.toLowerCase().includes(term) ||
                          userEmail.toLowerCase().includes(term) ||
                          reason.toLowerCase().includes(term);
    return matchesFilter && matchesSearch;
  });

  const handleResolve = async (status: 'approved' | 'rejected') => {
    if (!selectedAppeal) return;
    setIsProcessing(true);
    try {
      const success = await resolveAccountAppeal(selectedAppeal.id, status, adminNote);
      if (success) {
        setSelectedAppeal(prev => prev ? { ...prev, status, adminNote, resolvedAt: new Date().toISOString() } : null);
        setAdminNote('');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteAppeal = async (appealId: string) => {
    setIsProcessing(true);
    try {
      const success = await deleteAccountAppeal(appealId);
      if (success && selectedAppeal?.id === appealId) {
        setSelectedAppeal(null);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Stats Overview */}
      <div className="space-y-4">
        <div>
          <h2 className="font-display font-black text-xl text-white tracking-tight flex items-center gap-2.5">
            <span>Pusat Banding & Peninjauan Akun</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-sans font-bold">
              {pendingCount} Menunggu Peninjauan
            </span>
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Tinjau penjelasan dari pengguna yang akunnya dibekukan, berikan catatan verifikasi, dan pulihkan akun atau tegakkan sanksi.
          </p>
        </div>

        {/* Stats Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div 
            onClick={() => setFilter('all')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              filter === 'all' ? 'bg-white/[0.08] border-white/20 text-white shadow-sm' : 'bg-[#171717] border-white/[0.08] hover:border-white/20 text-slate-300'
            }`}
          >
            <div className="text-[11px] text-slate-400 font-semibold font-mono">Total Banding</div>
            <div className="text-xl font-display font-black text-white mt-0.5 font-mono tabular-nums">{totalCount}</div>
          </div>

          <div 
            onClick={() => setFilter('pending')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              filter === 'pending' ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm' : 'bg-[#171717] border-white/[0.08] hover:border-amber-500/30 text-slate-300'
            }`}
          >
            <div className="text-[11px] text-amber-400 font-semibold flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3" />
              <span>Menunggu</span>
            </div>
            <div className="text-xl font-display font-black text-amber-300 mt-0.5 font-mono tabular-nums">{pendingCount}</div>
          </div>

          <div 
            onClick={() => setFilter('approved')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              filter === 'approved' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm' : 'bg-[#171717] border-white/[0.08] hover:border-emerald-500/30 text-slate-300'
            }`}
          >
            <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 font-mono">
              <CheckCircle2 className="w-3 h-3" />
              <span>Disetujui</span>
            </div>
            <div className="text-xl font-display font-black text-emerald-300 mt-0.5 font-mono tabular-nums">{approvedCount}</div>
          </div>

          <div 
            onClick={() => setFilter('rejected')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              filter === 'rejected' ? 'bg-red-500/15 border-red-500/40 text-red-300 shadow-sm' : 'bg-[#171717] border-white/[0.08] hover:border-red-500/30 text-slate-300'
            }`}
          >
            <div className="text-[11px] text-red-400 font-semibold flex items-center gap-1 font-mono">
              <XCircle className="w-3 h-3" />
              <span>Ditolak</span>
            </div>
            <div className="text-xl font-display font-black text-red-300 mt-0.5 font-mono tabular-nums">{rejectedCount}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Appeals List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#171717] border border-white/[0.08] p-3 rounded-2xl">
            <div className="flex items-center gap-1.5 bg-[#0A0A0A] rounded-xl p-1 shrink-0 overflow-x-auto">
              <button
                onClick={() => setFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === 'pending' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                Menunggu ({pendingCount})
              </button>
              <button
                onClick={() => setFilter('approved')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                Diterima ({approvedCount})
              </button>
              <button
                onClick={() => setFilter('rejected')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === 'rejected' ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                Ditolak ({rejectedCount})
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === 'all' ? 'bg-[#FF2E7E] text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Semua ({totalCount})
              </button>
            </div>

            <div className="relative flex-1 w-full">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama, handle, email, atau alasan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E] transition-colors"
              />
            </div>
          </div>

          {/* List items */}
          <div className="space-y-3">
            {filteredAppeals.length === 0 ? (
              <div className="bg-[#171717] border border-white/[0.08] rounded-2xl p-12 text-center">
                <History className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400 text-sm font-medium">Tidak ada permohonan banding yang sesuai dengan filter.</p>
              </div>
            ) : (
              filteredAppeals.map(appeal => {
                const targetUser = allUsers.find(u => u.id === appeal.userId);
                const isSelected = selectedAppeal?.id === appeal.id;

                return (
                  <button
                    key={appeal.id}
                    onClick={() => {
                      setSelectedAppeal(appeal);
                      setAdminNote(appeal.adminNote || '');
                    }}
                    className={`w-full text-left bg-[#171717] border transition-all rounded-2xl p-4 flex items-start gap-4 cursor-pointer ${
                      isSelected 
                        ? 'border-[#FF2E7E] bg-[#FF2E7E]/5 ring-1 ring-[#FF2E7E]/30' 
                        : 'border-white/[0.08] hover:border-white/20'
                    }`}
                  >
                    <img
                      src={appeal.userAvatar || targetUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                      alt={appeal.userName}
                      className="w-11 h-11 rounded-xl object-cover border border-white/10 shrink-0"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <h4 className="font-semibold text-white text-sm truncate">{appeal.userName}</h4>
                          <span className="text-xs text-slate-500 truncate">{appeal.userHandle || targetUser?.handle || ''}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 whitespace-nowrap font-mono">{formatDate(appeal.createdAt)}</span>
                      </div>

                      <p className="text-xs text-slate-300 line-clamp-2 mt-1.5 leading-relaxed bg-black/30 p-2.5 rounded-xl border border-white/[0.06]">
                        "{appeal.reason}"
                      </p>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-md border font-mono ${
                            appeal.status === 'pending' 
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' 
                              : appeal.status === 'approved' 
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                              : 'bg-red-500/15 text-red-300 border-red-500/30'
                          }`}>
                            {appeal.status === 'pending' ? '• Menunggu Review' : appeal.status === 'approved' ? '✓ Disetujui' : '✕ Ditolak'}
                          </span>
                          {targetUser?.role && (
                            <RoleBadge role={targetUser.role} size="sm" />
                          )}
                        </div>

                        {appeal.resolvedAt && (
                          <span className="text-[10px] text-slate-500 hidden sm:inline font-mono">
                            Ditinjau: {formatDate(appeal.resolvedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          {hasMoreAppeals && (
            <div className="p-4 text-center border-t border-slate-800 bg-[#171717]/40">
              <button
                onClick={() => fetchAdminAppeals({ loadMore: true })}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all border border-slate-700 shadow-lg cursor-pointer"
              >
                Muat Lebih Banyak Banding
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Appeal Detail & Action Sidebar */}
        <div className="lg:col-span-1">
          {selectedAppeal ? (
            <div className="bg-[#171717] border border-white/[0.08] rounded-2xl p-5 sticky top-8 space-y-5 animate-in slide-in-from-right-4 duration-300 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <h3 className="font-display font-black text-white text-base">Detail Permohonan</h3>
                <button 
                  onClick={() => setSelectedAppeal(null)} 
                  className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-white/[0.05] transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* User Profile Card */}
              <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedAppeal.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                    alt={selectedAppeal.userName}
                    className="w-12 h-12 rounded-xl object-cover border border-white/10"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-white text-sm truncate">{selectedAppeal.userName}</div>
                    <div className="text-slate-400 text-xs truncate">{selectedAppeal.userHandle || `@${selectedAppeal.userName.toLowerCase().replace(/\s+/g, '')}`}</div>
                    {selectedAppeal.userEmail && (
                      <div className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3" />
                        <span>{selectedAppeal.userEmail}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>UID: {selectedAppeal.userId.slice(0, 12)}...</span>
                  <button
                    onClick={() => navigateTo('user-profile', { userId: selectedAppeal.userId })}
                    className="text-[#FF2E7E] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>Lihat Profil</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Explanation Block */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">
                  Penjelasan & Pembelaan Pengguna
                </label>
                <div className="bg-black/30 border border-white/[0.08] rounded-xl p-4 text-xs text-slate-200 leading-relaxed italic">
                  "{selectedAppeal.reason}"
                </div>
                <div className="text-[10px] text-slate-500 text-right font-mono">
                  Dikirim: {formatDate(selectedAppeal.createdAt)}
                </div>
              </div>

              {/* Action Area for Pending Appeals */}
              {selectedAppeal.status === 'pending' ? (
                <div className="space-y-4 pt-3 border-t border-white/[0.08]">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2 font-mono">
                      Catatan Moderator untuk Pengguna
                    </label>
                    <textarea
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="Tuliskan catatan evaluasi atau alasan keputusan Anda..."
                      className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E] min-h-[90px] resize-none transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleResolve('rejected')}
                      disabled={isProcessing}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <ShieldAlert className="w-4 h-4 text-red-400" />
                      <span>Tolak Banding</span>
                    </button>
                    <button
                      onClick={() => handleResolve('approved')}
                      disabled={isProcessing}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 text-white" />
                      <span>Terima & Aktifkan</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-3 border-t border-white/[0.08] space-y-4">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5 font-mono">
                      Status Keputusan
                    </label>
                    <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                      selectedAppeal.status === 'approved' 
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                        : 'bg-red-500/15 text-red-300 border-red-500/30'
                    }`}>
                      <span className="flex items-center gap-2">
                        {selectedAppeal.status === 'approved' ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                        Banding {selectedAppeal.status === 'approved' ? 'Telah Diterima' : 'Telah Ditolak'}
                      </span>
                      <span className="text-[10px] opacity-80 font-mono">{formatDate(selectedAppeal.resolvedAt)}</span>
                    </div>
                  </div>

                  {selectedAppeal.adminNote && (
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5 font-mono">
                        Catatan Admin
                      </label>
                      <div className="bg-black/30 border border-white/[0.08] rounded-xl p-3 text-xs text-slate-300 leading-relaxed">
                        {selectedAppeal.adminNote}
                      </div>
                    </div>
                  )}

                  {/* Clean Up Option */}
                  <div className="pt-2">
                    <button
                      onClick={() => handleDeleteAppeal(selectedAppeal.id)}
                      disabled={isProcessing}
                      className="w-full py-2 bg-white/[0.04] hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-white/10 hover:border-red-500/30 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Catatan Banding</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#171717] border border-white/[0.08] border-dashed rounded-2xl p-10 text-center space-y-2">
              <MessageSquare className="w-10 h-10 text-slate-600 mx-auto" />
              <div className="text-xs text-slate-400 font-semibold">Pilih Permohonan</div>
              <p className="text-[11px] text-slate-500">Klik salah satu tiket banding pada daftar di samping untuk melihat rincian dan melakukan verifikasi.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
