import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Send, 
  LogOut, 
  MessageSquare, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  Info,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SuspendedAccountModal: React.FC = () => {
  const { currentUser, logout, submitAccountAppeal, appeals } = useApp();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReapplying, setIsReapplying] = useState(false);

  if (!currentUser?.isSuspended) return null;

  // Find user's latest appeal
  const userAppeals = appeals.filter(a => a.userId === currentUser.id);
  const latestAppeal = userAppeals.length > 0 ? userAppeals[0] : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setIsSubmitting(true);
    try {
      const success = await submitAccountAppeal(reason);
      if (success) {
        setReason('');
        setIsReapplying(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-[#171A1F] border-2 border-red-500/30 rounded-3xl overflow-hidden shadow-2xl shadow-red-950/50 animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-950/60 via-red-900/30 to-red-950/60 border-b border-red-500/30 p-6 text-center relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-3 border border-red-500/40 shadow-lg shadow-red-500/20">
            <ShieldAlert className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="font-display font-black text-2xl text-white tracking-tight">Account Suspended</h2>
          <p className="text-red-300/90 text-xs mt-1 font-medium max-w-sm mx-auto">
            Akses interaksi akun Anda dibatasi oleh tim moderator karena terindikasi pelanggaran pedoman komunitas.
          </p>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Status Tracker Flow */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Status Peninjauan Akun</span>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-1">
              {/* Step 1 */}
              <div className="text-center">
                <div className="w-7 h-7 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 flex items-center justify-center mx-auto mb-1 text-xs font-bold">
                  ✓
                </div>
                <div className="text-[10px] text-white font-bold">Dibekukan</div>
              </div>

              {/* Step 2 */}
              <div className="text-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto mb-1 text-xs font-bold border ${
                  latestAppeal 
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' 
                    : 'bg-slate-800 text-slate-500 border-slate-700'
                }`}>
                  {latestAppeal ? '✓' : '2'}
                </div>
                <div className={`text-[10px] ${latestAppeal ? 'text-white font-bold' : 'text-slate-500'}`}>
                  Banding
                </div>
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto mb-1 text-xs font-bold border ${
                  latestAppeal?.status === 'pending'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse'
                    : latestAppeal?.status === 'approved' || latestAppeal?.status === 'rejected'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-slate-800 text-slate-500 border-slate-700'
                }`}>
                  {latestAppeal?.status === 'approved' || latestAppeal?.status === 'rejected' ? '✓' : '3'}
                </div>
                <div className={`text-[10px] ${latestAppeal?.status === 'pending' ? 'text-amber-300 font-bold' : latestAppeal ? 'text-white' : 'text-slate-500'}`}>
                  Peninjauan
                </div>
              </div>

              {/* Step 4 */}
              <div className="text-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto mb-1 text-xs font-bold border ${
                  latestAppeal?.status === 'approved'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : latestAppeal?.status === 'rejected'
                    ? 'bg-red-500/20 text-red-400 border-red-500/40'
                    : 'bg-slate-800 text-slate-500 border-slate-700'
                }`}>
                  {latestAppeal?.status === 'approved' ? '✓' : latestAppeal?.status === 'rejected' ? '✕' : '4'}
                </div>
                <div className={`text-[10px] ${
                  latestAppeal?.status === 'approved' 
                    ? 'text-emerald-400 font-bold' 
                    : latestAppeal?.status === 'rejected' 
                    ? 'text-red-400 font-bold' 
                    : 'text-slate-500'
                }`}>
                  Keputusan
                </div>
              </div>
            </div>
          </div>

          {/* Conditional View Based on Appeal Status */}
          {latestAppeal && latestAppeal.status === 'pending' && !isReapplying ? (
            <div className="bg-gradient-to-b from-amber-500/10 to-amber-950/20 border border-amber-500/30 rounded-2xl p-5 space-y-4 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Clock className="w-5 h-5 animate-spin" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Permohonan Banding Sedang Ditinjau</h3>
                  <p className="text-[11px] text-amber-300/80">Diajukan pada: {formatDate(latestAppeal.createdAt)}</p>
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Penjelasan Anda:</div>
                <p className="text-xs text-slate-300 italic leading-relaxed">"{latestAppeal.reason}"</p>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Tim admin kami biasanya meninjau permohonan dalam waktu 1x24 jam. Anda akan menerima notifikasi status segera setelah keputusan dibuat.
              </p>
            </div>
          ) : latestAppeal && latestAppeal.status === 'rejected' && !isReapplying ? (
            <div className="bg-gradient-to-b from-red-500/10 to-red-950/20 border border-red-500/30 rounded-2xl p-5 space-y-4 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Permohonan Banding Sebelumnya Ditolak</h3>
                  <p className="text-[11px] text-red-300/80">Ditinjau pada: {formatDate(latestAppeal.resolvedAt)}</p>
                </div>
              </div>

              {latestAppeal.adminNote && (
                <div className="bg-slate-900/90 border border-red-500/20 rounded-xl p-3.5 space-y-1.5">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-red-400">Catatan dari Moderator:</div>
                  <p className="text-xs text-slate-300 leading-relaxed">{latestAppeal.adminNote}</p>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsReapplying(true)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Ajukan Penjelasan Tambahan Baru</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">
                    Formulir Banding Akun
                  </label>
                  {isReapplying && (
                    <button
                      type="button"
                      onClick={() => setIsReapplying(false)}
                      className="text-[11px] text-cyan-400 hover:underline cursor-pointer"
                    >
                      Batal
                    </button>
                  )}
                </div>

                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Jelaskan secara jujur dan detail mengapa pembekuan akun Anda merupakan kesalahpahaman atau komitmen Anda mematuhi pedoman komunitas..."
                  className="w-full bg-slate-900 border border-slate-750 rounded-2xl p-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 min-h-[130px] resize-none transition-colors"
                  required
                />
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-400 flex items-start gap-2">
                <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  Pastikan memberikan informasi yang jelas dan sopan agar tim moderator dapat meninjau akun Anda secara adil.
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !reason.trim()}
                className="w-full py-3.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-2xl shadow-lg shadow-cyan-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Mengirimkan Banding...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Kirim Permohonan Banding</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Logout Button */}
          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={() => logout()}
              className="w-full py-3 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/80 font-bold rounded-2xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar dari Akun</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
