import React, { useState, useMemo } from 'react';
import { 
  ScrollText, 
  Search, 
  Filter, 
  ShieldAlert, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Trash2, 
  UserCheck, 
  UserX, 
  Award, 
  RefreshCw, 
  Download, 
  Calendar, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info, 
  Eye, 
  Clock, 
  FileText,
  Copy,
  Check,
  X,
  ExternalLink,
  Layers,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AuditLog, AuditLogActionType, UserRole } from '../../types';
import { RoleBadge } from '../Common/RoleBadge';

export const AdminAuditLog: React.FC = () => {
  const { auditLogs, clearAuditLogs, deleteAuditLog, showToast, currentUser, navigateTo } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [actionCategory, setActionCategory] = useState<'all' | 'roles' | 'suspensions' | 'deletions' | 'appeals' | 'moderation' | 'critics'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = auditLogs.length;
    const roles = auditLogs.filter(l => l.action.includes('role')).length;
    const suspensions = auditLogs.filter(l => l.action.includes('suspend')).length;
    const deletions = auditLogs.filter(l => l.action.includes('deleted')).length;
    const appeals = auditLogs.filter(l => l.action.includes('appeal')).length;
    const moderation = auditLogs.filter(l => l.action.includes('content')).length;
    const critics = auditLogs.filter(l => l.action.includes('critic')).length;

    return { total, roles, suspensions, deletions, appeals, moderation, critics };
  }, [auditLogs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      // Category filter
      if (actionCategory === 'roles' && !log.action.includes('role')) return false;
      if (actionCategory === 'suspensions' && !log.action.includes('suspend')) return false;
      if (actionCategory === 'deletions' && !log.action.includes('deleted')) return false;
      if (actionCategory === 'appeals' && !log.action.includes('appeal')) return false;
      if (actionCategory === 'moderation' && !log.action.includes('content')) return false;
      if (actionCategory === 'critics' && !log.action.includes('critic')) return false;

      // Time filter
      if (timeFilter !== 'all') {
        const logDate = new Date(log.timestamp).getTime();
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        if (timeFilter === 'today' && now - logDate > oneDay) return false;
        if (timeFilter === '7days' && now - logDate > 7 * oneDay) return false;
        if (timeFilter === '30days' && now - logDate > 30 * oneDay) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const term = searchQuery.toLowerCase();
        const matchAction = log.action.toLowerCase().includes(term);
        const matchActor = log.actorName?.toLowerCase().includes(term) || log.actorEmail?.toLowerCase().includes(term) || log.actorId?.toLowerCase().includes(term);
        const matchTarget = log.targetName?.toLowerCase().includes(term) || log.targetEmail?.toLowerCase().includes(term) || log.targetId?.toLowerCase().includes(term);
        const matchDetails = log.details?.toLowerCase().includes(term);
        const matchMetadata = log.metadata ? JSON.stringify(log.metadata).toLowerCase().includes(term) : false;

        if (!matchAction && !matchActor && !matchTarget && !matchDetails && !matchMetadata) {
          return false;
        }
      }

      return true;
    });
  }, [auditLogs, actionCategory, timeFilter, searchQuery]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    showToast(`${label} disalin ke clipboard!`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      showToast('Tidak ada data audit log untuk diekspor.');
      return;
    }

    const headers = ['ID', 'Waktu (ISO)', 'Aksi', 'Aktor (Nama)', 'Aktor (Role)', 'Aktor (UID)', 'Target (Nama)', 'Target (Tipe)', 'Target (UID)', 'Rincian'];
    const rows = filteredLogs.map(l => [
      `"${l.id}"`,
      `"${l.timestamp}"`,
      `"${l.action}"`,
      `"${l.actorName || ''}"`,
      `"${l.actorRole || ''}"`,
      `"${l.actorId || ''}"`,
      `"${l.targetName || ''}"`,
      `"${l.targetType || ''}"`,
      `"${l.targetId || ''}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `audit-logs-sotoy-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Berhasil mengekspor ${filteredLogs.length} baris audit log ke CSV!`, 'success');
  };

  const handleExportJSON = () => {
    if (filteredLogs.length === 0) {
      showToast('Tidak ada data audit log untuk diekspor.');
      return;
    }

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `audit-logs-sotoy-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(`Berhasil mengekspor ${filteredLogs.length} catatan audit log ke JSON!`, 'success');
  };

  const handleExecuteClear = async () => {
    setIsProcessing(true);
    try {
      const success = await clearAuditLogs();
      if (success) {
        setIsClearModalOpen(false);
        setSelectedLog(null);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSingleLog = async (logId: string) => {
    setIsProcessing(true);
    try {
      const success = await deleteAuditLog(logId);
      if (success && selectedLog?.id === logId) {
        setSelectedLog(null);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper formatters
  const formatDate = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const getActionBadge = (action: AuditLogActionType) => {
    switch (action) {
      case 'role_override':
      case 'bulk_roles_override':
        return {
          label: action === 'bulk_roles_override' ? 'Role Override Massal' : 'Manual Role Override',
          bg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
        };
      case 'account_suspended':
      case 'bulk_accounts_suspended':
        return {
          label: action === 'bulk_accounts_suspended' ? 'Pembekuan Massal' : 'Akun Dibekukan',
          bg: 'bg-red-500/15 text-red-300 border-red-500/30',
          icon: <Lock className="w-3.5 h-3.5 text-red-400" />
        };
      case 'account_unsuspended':
      case 'bulk_accounts_unsuspended':
        return {
          label: action === 'bulk_accounts_unsuspended' ? 'Pemulihan Massal' : 'Akun Dipulihkan',
          bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          icon: <Unlock className="w-3.5 h-3.5 text-emerald-400" />
        };
      case 'account_deleted':
      case 'bulk_accounts_deleted':
        return {
          label: action === 'bulk_accounts_deleted' ? 'Hapus Akun Massal' : 'Hapus Akun Permanen',
          bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-black',
          icon: <Trash2 className="w-3.5 h-3.5 text-rose-400" />
        };
      case 'appeal_approved':
        return {
          label: 'Banding Diterima',
          bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        };
      case 'appeal_rejected':
        return {
          label: 'Banding Ditolak',
          bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          icon: <XCircle className="w-3.5 h-3.5 text-amber-400" />
        };
      case 'content_taken_down':
        return {
          label: 'Konten Dihapus',
          bg: 'bg-red-500/15 text-red-300 border-red-500/30',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
        };
      case 'content_report_dismissed':
        return {
          label: 'Laporan Diabaikan',
          bg: 'bg-slate-700/40 text-slate-300 border-slate-600',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
        };
      case 'critic_approved':
        return {
          label: 'Kritikus Disetujui',
          bg: 'bg-yellow-500/15 text-[#FFD000] border-yellow-500/30',
          icon: <Award className="w-3.5 h-3.5 text-[#FFD000]" />
        };
      case 'critic_rejected':
        return {
          label: 'Kritikus Ditolak',
          bg: 'bg-slate-700/30 text-slate-400 border-slate-700',
          icon: <XCircle className="w-3.5 h-3.5 text-slate-400" />
        };
      default:
        return {
          label: action,
          bg: 'bg-slate-800 text-slate-300 border-slate-700',
          icon: <Info className="w-3.5 h-3.5 text-slate-400" />
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display font-black text-xl text-white tracking-tight flex items-center gap-2.5">
            <span>Audit Log & Jejak Transparansi Moderasi</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-sans font-bold">
              {auditLogs.length} Riwayat Tercatat
            </span>
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Rekaman kronologis lengkap seluruh tindakan administratif: penghapusan akun, penangguhan status, perubahan role hak akses, dan moderasi konten.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Export Dropdown / Buttons */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Ekspor ke CSV"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ekspor CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportJSON}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Ekspor ke JSON"
          >
            <FileText className="w-3.5 h-3.5 text-purple-400" />
            <span>JSON</span>
          </button>

          {auditLogs.length > 0 && (
            <button
              type="button"
              onClick={() => setIsClearModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Bersihkan Semua Log"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bersihkan Log</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div 
          onClick={() => setActionCategory('all')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            actionCategory === 'all' ? 'bg-slate-800 border-purple-500/60 shadow-md' : 'bg-[#121324] border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-[10px] text-slate-400 font-bold uppercase">Total Log</div>
          <div className="text-lg font-display font-black text-white mt-0.5">{stats.total}</div>
        </div>

        <div 
          onClick={() => setActionCategory('roles')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            actionCategory === 'roles' ? 'bg-purple-950/40 border-purple-500/60 shadow-md' : 'bg-[#121324] border-slate-800 hover:border-purple-500/30'
          }`}
        >
          <div className="text-[10px] text-purple-300 font-bold uppercase">Role Overrides</div>
          <div className="text-lg font-display font-black text-purple-200 mt-0.5">{stats.roles}</div>
        </div>

        <div 
          onClick={() => setActionCategory('suspensions')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            actionCategory === 'suspensions' ? 'bg-red-950/40 border-red-500/60 shadow-md' : 'bg-[#121324] border-slate-800 hover:border-red-500/30'
          }`}
        >
          <div className="text-[10px] text-red-400 font-bold uppercase">Penangguhan</div>
          <div className="text-lg font-display font-black text-red-300 mt-0.5">{stats.suspensions}</div>
        </div>

        <div 
          onClick={() => setActionCategory('deletions')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            actionCategory === 'deletions' ? 'bg-rose-950/40 border-rose-500/60 shadow-md' : 'bg-[#121324] border-slate-800 hover:border-rose-500/30'
          }`}
        >
          <div className="text-[10px] text-rose-400 font-bold uppercase">Hapus Akun</div>
          <div className="text-lg font-display font-black text-rose-300 mt-0.5">{stats.deletions}</div>
        </div>

        <div 
          onClick={() => setActionCategory('appeals')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            actionCategory === 'appeals' ? 'bg-amber-950/40 border-amber-500/60 shadow-md' : 'bg-[#121324] border-slate-800 hover:border-amber-500/30'
          }`}
        >
          <div className="text-[10px] text-amber-400 font-bold uppercase">Banding</div>
          <div className="text-lg font-display font-black text-amber-300 mt-0.5">{stats.appeals}</div>
        </div>

        <div 
          onClick={() => setActionCategory('moderation')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            actionCategory === 'moderation' ? 'bg-cyan-950/40 border-cyan-500/60 shadow-md' : 'bg-[#121324] border-slate-800 hover:border-cyan-500/30'
          }`}
        >
          <div className="text-[10px] text-[#00F0FF] font-bold uppercase">Moderasi</div>
          <div className="text-lg font-display font-black text-cyan-300 mt-0.5">{stats.moderation}</div>
        </div>

        <div 
          onClick={() => setActionCategory('critics')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            actionCategory === 'critics' ? 'bg-yellow-950/40 border-yellow-500/60 shadow-md' : 'bg-[#121324] border-slate-800 hover:border-yellow-500/30'
          }`}
        >
          <div className="text-[10px] text-[#FFD000] font-bold uppercase">Kritikus</div>
          <div className="text-lg font-display font-black text-yellow-300 mt-0.5">{stats.critics}</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#121324] border border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Action Category Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-medium pb-1 lg:pb-0 scrollbar-none">
            <button
              onClick={() => setActionCategory('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                actionCategory === 'all'
                  ? 'bg-purple-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Semua ({stats.total})
            </button>

            <button
              onClick={() => setActionCategory('roles')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                actionCategory === 'roles'
                  ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40'
                  : 'text-slate-400 hover:text-purple-300 hover:bg-slate-800'
              }`}
            >
              Role Overrides
            </button>

            <button
              onClick={() => setActionCategory('suspensions')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                actionCategory === 'suspensions'
                  ? 'bg-red-500/20 text-red-300 font-bold border border-red-500/40'
                  : 'text-slate-400 hover:text-red-300 hover:bg-slate-800'
              }`}
            >
              Penangguhan (Bans)
            </button>

            <button
              onClick={() => setActionCategory('deletions')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                actionCategory === 'deletions'
                  ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40'
                  : 'text-slate-400 hover:text-rose-300 hover:bg-slate-800'
              }`}
            >
              Hapus Akun
            </button>

            <button
              onClick={() => setActionCategory('appeals')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                actionCategory === 'appeals'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                  : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800'
              }`}
            >
              Banding Akun
            </button>

            <button
              onClick={() => setActionCategory('moderation')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                actionCategory === 'moderation'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800'
              }`}
            >
              Laporan Konten
            </button>

            <button
              onClick={() => setActionCategory('critics')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                actionCategory === 'critics'
                  ? 'bg-yellow-500/20 text-yellow-300 font-bold border border-yellow-500/40'
                  : 'text-slate-400 hover:text-yellow-300 hover:bg-slate-800'
              }`}
            >
              Verifikasi Kritikus
            </button>
          </div>

          {/* Time & Search Controls */}
          <div className="flex items-center gap-3">
            {/* Time filter */}
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as any)}
              className="bg-slate-900 border border-slate-750 text-xs text-slate-300 rounded-xl px-3 py-1.5 focus:outline-none focus:border-purple-400 cursor-pointer"
            >
              <option value="all">Sepanjang Waktu</option>
              <option value="today">Hari Ini (24 Jam)</option>
              <option value="7days">7 Hari Terakhir</option>
              <option value="30days">30 Hari Terakhir</option>
            </select>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari aktor, target, UID, detail..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-750 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Live sync indicator bar */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-400 font-medium">Sinkronisasi Realtime Aktif (Firestore Firestore listener)</span>
          </div>
          <span>Menampilkan {filteredLogs.length} dari {auditLogs.length} catatan</span>
        </div>
      </div>

      {/* Main Table Layout */}
      <div className="overflow-x-auto rounded-2xl border border-slate-850 bg-[#121324] shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#17182b] text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="p-3.5 whitespace-nowrap">Waktu & Tanggal</th>
              <th className="p-3.5">Tindakan Moderasi</th>
              <th className="p-3.5">Aktor (Admin / Moderator)</th>
              <th className="p-3.5">Target Pengguna / Entitas</th>
              <th className="p-3.5 min-w-[200px]">Rincian Transparansi</th>
              <th className="p-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-slate-500 space-y-2">
                  <ScrollText className="w-10 h-10 mx-auto opacity-30 text-slate-400" />
                  <p className="text-sm font-bold text-slate-400">Tidak ada catatan audit log yang cocok.</p>
                  <p className="text-xs text-slate-500">Setiap tindakan administratif yang Anda lakukan akan otomatis tercatat di sini secara transparan.</p>
                </td>
              </tr>
            ) : (
              filteredLogs.map(log => {
                const badge = getActionBadge(log.action);
                const isSelected = selectedLog?.id === log.id;

                return (
                  <tr 
                    key={log.id} 
                    className={`hover:bg-slate-850/60 transition-colors ${isSelected ? 'bg-purple-950/20' : ''}`}
                  >
                    {/* Timestamp */}
                    <td className="p-3.5 whitespace-nowrap text-slate-400 text-[11px]">
                      <div className="flex items-center gap-1.5 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{formatDate(log.timestamp)}</span>
                      </div>
                    </td>

                    {/* Action Badge */}
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-xl border ${badge.bg}`}>
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>
                    </td>

                    {/* Actor (Admin) */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5 min-w-[140px]">
                        <img
                          src={log.actorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                          alt={log.actorName}
                          className="w-7 h-7 rounded-full object-cover border border-slate-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-white text-xs truncate">{log.actorName || 'Admin'}</div>
                          <div className="text-[10px] text-purple-400/80 font-mono truncate">{log.actorRole || 'admin'}</div>
                        </div>
                      </div>
                    </td>

                    {/* Target */}
                    <td className="p-3.5">
                      {log.targetName || log.targetId ? (
                        <div className="min-w-0 max-w-[180px]">
                          <div className="font-bold text-slate-200 text-xs truncate">
                            {log.targetName || log.targetId}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono truncate flex items-center gap-1">
                            {log.targetType && (
                              <span className="uppercase text-[9px] bg-slate-900 px-1 rounded border border-slate-800 text-slate-400">
                                {log.targetType}
                              </span>
                            )}
                            {log.targetId && <span>{log.targetId.slice(0, 10)}...</span>}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-xs italic">-</span>
                      )}
                    </td>

                    {/* Details */}
                    <td className="p-3.5">
                      <div className="text-xs text-slate-300 line-clamp-2 leading-relaxed max-w-md">
                        {log.details || 'Tindakan selesai dieksekusi.'}
                      </div>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-purple-400/70 font-mono">
                          <Layers className="w-3 h-3" />
                          <span>{Object.keys(log.metadata).length} atribut metadata tersimpan</span>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                          title="Lihat Rincian Log"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detail</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* DETAIL MODAL / DRAWER */}
      {selectedLog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[#121324] border-2 border-purple-500/40 rounded-3xl overflow-hidden shadow-2xl shadow-purple-950/40 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-950/60 via-slate-900/90 to-purple-950/60 border-b border-purple-500/30 p-6 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
                  <ScrollText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display font-black text-xl text-white">Rincian Audit Log</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-purple-300 font-mono">ID: {selectedLog.id}</span>
                    <button
                      onClick={() => handleCopy(selectedLog.id, 'Log ID')}
                      className="text-slate-400 hover:text-white p-0.5"
                      title="Salin ID"
                    >
                      {copiedText === 'Log ID' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Action Banner */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-xl border ${getActionBadge(selectedLog.action).bg}`}>
                    {getActionBadge(selectedLog.action).icon}
                    <span>{getActionBadge(selectedLog.action).label}</span>
                  </span>
                  <span className="text-xs text-slate-400 font-mono">({selectedLog.action})</span>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Waktu Kejadian</div>
                  <div className="text-xs font-bold text-white font-mono mt-0.5">{formatDate(selectedLog.timestamp)}</div>
                </div>
              </div>

              {/* Actor vs Target Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Actor Card */}
                <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-widest text-purple-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                    <span>Aktor / Eksekutor</span>
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <img
                      src={selectedLog.actorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                      alt={selectedLog.actorName}
                      className="w-10 h-10 rounded-full object-cover border border-slate-700"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-white text-xs">{selectedLog.actorName}</div>
                      <div className="text-[11px] text-slate-400">{selectedLog.actorEmail || 'email tidak tersedia'}</div>
                      <div className="text-[10px] font-mono text-purple-400 mt-0.5">Role: {selectedLog.actorRole} • UID: {selectedLog.actorId.slice(0, 8)}...</div>
                    </div>
                  </div>
                </div>

                {/* Target Card */}
                <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-widest text-cyan-300 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Objek Target / Entitas</span>
                  </div>
                  {selectedLog.targetName || selectedLog.targetId ? (
                    <div className="pt-1 space-y-1">
                      <div className="font-bold text-white text-xs">{selectedLog.targetName || selectedLog.targetId}</div>
                      {selectedLog.targetEmail && <div className="text-[11px] text-slate-400">{selectedLog.targetEmail}</div>}
                      <div className="text-[10px] font-mono text-cyan-400">
                        {selectedLog.targetType && <span className="uppercase bg-slate-800 px-1 rounded mr-1">[{selectedLog.targetType}]</span>}
                        {selectedLog.targetRole && <span>Role: {selectedLog.targetRole} • </span>}
                        {selectedLog.targetId && <span>UID: {selectedLog.targetId}</span>}
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 text-xs text-slate-500 italic">Target entitas global / sistem.</div>
                  )}
                </div>
              </div>

              {/* Narrative Details */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-1.5">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Deskripsi Transparansi
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  {selectedLog.details || 'Tidak ada deskripsi rinci.'}
                </p>
              </div>

              {/* Metadata / Raw Diff View */}
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Metadata & Konteks Perubahan
                    </label>
                    <button
                      onClick={() => handleCopy(JSON.stringify(selectedLog.metadata, null, 2), 'Metadata')}
                      className="text-[11px] text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Salin Payload JSON</span>
                    </button>
                  </div>
                  <pre className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {/* Modal Footer Controls */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleDeleteSingleLog(selectedLog.id)}
                  disabled={isProcessing}
                  className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Log Ini</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CLEAR ALL LOGS CONFIRMATION MODAL */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#121324] border-2 border-red-500/40 rounded-3xl overflow-hidden shadow-2xl shadow-red-950/40 animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-red-500/15 border-b border-red-500/30 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-black text-lg text-white">Bersihkan Riwayat Audit Log?</h3>
                <p className="text-red-300 text-xs mt-1">
                  Seluruh ({auditLogs.length}) entri riwayat audit log akan dihapus dari Firestore secara permanen.
                </p>
              </div>
              <button
                onClick={() => setIsClearModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                disabled={isProcessing}
                className="px-4 py-2.5 rounded-xl border border-slate-750 text-slate-300 hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteClear}
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Membersihkan...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Konfirmasi Bersihkan</span>
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
