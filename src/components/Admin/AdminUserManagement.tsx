import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Unlock, 
  Mail, 
  Calendar, 
  Copy, 
  Check, 
  ExternalLink,
  MessageSquare,
  Star,
  FileText,
  UserX,
  Sparkles,
  CheckSquare,
  Square,
  MinusSquare,
  X,
  UserCheck,
  Layers,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Info
} from 'lucide-react';
import { useApp, ADMIN_UIDS } from '../../context/AppContext';
import { User, UserRole } from '../../types';
import { getRoleBadgeStyle, ROLES_CONFIG } from '../../utils/roleStyles';
import { RoleBadge } from '../Common/RoleBadge';

export const AdminUserManagement: React.FC = () => {
  const { 
    allUsers, 
    updateUserRole, 
    toggleUserSuspension, 
    bulkUpdateUserRoles,
    bulkToggleUserSuspension,
    deleteUserAccount,
    bulkDeleteUserAccounts,
    showToast, 
    currentUser, 
    navigateTo,
    refreshAllUsers,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole | 'suspended'>('all');
  const [copiedUid, setCopiedUid] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Trigger immediate refresh on mount so the admin sees up-to-the-second live accuracy
  useEffect(() => {
    refreshAllUsers();
  }, [refreshAllUsers]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAllUsers();
      showToast('Data pengguna berhasil diperbarui! 🔄');
    } catch {
      showToast('Gagal memperbarui data pengguna.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Bulk Selection State
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isBulkOperating, setIsBulkOperating] = useState(false);

  // Dedicated In-App Action Modals
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkSuspendModalOpen, setIsBulkSuspendModalOpen] = useState<{ isOpen: boolean; isSuspending: boolean } | null>(null);
  const [userToSuspend, setUserToSuspend] = useState<{ user: User; isSuspending: boolean } | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Filtered Users List
  const filteredUsers = allUsers.filter(user => {
    // Role / Suspended filter
    if (roleFilter === 'suspended') {
      if (!user.isSuspended) return false;
    } else if (roleFilter !== 'all') {
      if (user.role !== roleFilter) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const term = searchQuery.toLowerCase();
      const matchesName = user.name?.toLowerCase().includes(term);
      const matchesHandle = user.handle?.toLowerCase().includes(term);
      const matchesEmail = user.email?.toLowerCase().includes(term);
      const matchesId = user.id?.toLowerCase().includes(term);
      if (!matchesName && !matchesHandle && !matchesEmail && !matchesId) return false;
    }

    return true;
  });

  // Bulk Selection Helpers
  const isAllSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedUserIds.includes(u.id));
  const isSomeSelected = filteredUsers.some(u => selectedUserIds.includes(u.id)) && !isAllSelected;

  const handleToggleSelectUser = (id: string) => {
    setSelectedUserIds(prev =>
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    if (isAllSelected) {
      const filteredIdSet = new Set(filteredUsers.map(u => u.id));
      setSelectedUserIds(prev => prev.filter(id => !filteredIdSet.has(id)));
    } else {
      const newSelected = new Set([...selectedUserIds, ...filteredUsers.map(u => u.id)]);
      setSelectedUserIds(Array.from(newSelected));
    }
  };

  const handleClearSelection = () => {
    setSelectedUserIds([]);
  };

  const handleBulkRoleChange = async (targetRole: UserRole) => {
    if (selectedUserIds.length === 0) return;
    setIsBulkOperating(true);
    try {
      await bulkUpdateUserRoles(selectedUserIds, targetRole);
      setSelectedUserIds([]);
    } catch (err: any) {
      showToast('Gagal mengubah role massal: ' + (err?.message || 'Error'));
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleBulkToggleSuspension = async (suspend: boolean) => {
    if (selectedUserIds.length === 0) return;
    const filteredUids = suspend ? selectedUserIds.filter(id => id !== currentUser.id) : selectedUserIds;
    if (filteredUids.length === 0) {
      showToast('Tidak ada pengguna valid yang dapat dibekukan.');
      return;
    }
    setIsBulkSuspendModalOpen({ isOpen: true, isSuspending: suspend });
  };

  const handleExecuteBulkSuspension = async () => {
    if (!isBulkSuspendModalOpen) return;
    const { isSuspending } = isBulkSuspendModalOpen;
    const filteredUids = isSuspending ? selectedUserIds.filter(id => id !== currentUser.id) : selectedUserIds;
    if (filteredUids.length === 0) {
      showToast('Tidak ada akun valid untuk diproses.');
      setIsBulkSuspendModalOpen(null);
      return;
    }

    setIsProcessingAction(true);
    try {
      await bulkToggleUserSuspension(filteredUids, isSuspending);
      setSelectedUserIds([]);
      setIsBulkSuspendModalOpen(null);
    } catch (err: any) {
      showToast('Gagal memproses status pengguna massal: ' + (err?.message || 'Error'));
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleExecuteBulkDelete = async () => {
    if (selectedUserIds.length === 0) return;
    const filteredUids = selectedUserIds.filter(id => id !== currentUser.id);
    if (filteredUids.length === 0) {
      showToast('Anda tidak dapat menghapus akun Anda sendiri.');
      setIsBulkDeleteModalOpen(false);
      return;
    }

    setIsProcessingAction(true);
    try {
      await bulkDeleteUserAccounts(filteredUids);
      setSelectedUserIds([]);
      setIsBulkDeleteModalOpen(false);
    } catch (err: any) {
      showToast('Gagal menghapus akun terpilih: ' + (err?.message || 'Error'));
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleExecuteSingleDelete = async () => {
    if (!userToDelete) return;
    if (userToDelete.id === currentUser.id) {
      showToast('Anda tidak dapat menghapus akun sendiri.');
      setUserToDelete(null);
      return;
    }

    setIsProcessingAction(true);
    try {
      const success = await deleteUserAccount(userToDelete.id);
      if (success) {
        setUserToDelete(null);
        setSelectedUserIds(prev => prev.filter(id => id !== userToDelete.id));
      }
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleExecuteSuspend = async () => {
    if (!userToSuspend) return;
    setIsProcessingAction(true);
    try {
      await toggleUserSuspension(userToSuspend.user.id, userToSuspend.isSuspending);
      setUserToSuspend(null);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleBulkCopyUids = () => {
    if (selectedUserIds.length === 0) return;
    navigator.clipboard.writeText(selectedUserIds.join('\n'));
    showToast(`${selectedUserIds.length} UID pengguna disalin ke clipboard!`);
  };

  const handleCopyUid = (uid: string) => {
    navigator.clipboard.writeText(uid);
    setCopiedUid(uid);
    showToast(`UID ${uid.slice(0, 8)}... disalin ke clipboard!`);
    setTimeout(() => setCopiedUid(null), 2000);
  };

  const handleRoleChange = async (user: User, newRole: UserRole) => {
    if (user.role === newRole) return;
    await updateUserRole(user.id, newRole);
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Tidak diketahui';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display font-black text-xl text-white tracking-tight flex items-center gap-2.5">
            <span>Manajemen Pengguna & Otoritas Role</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/[0.06] text-slate-300 border border-white/10 font-sans font-bold">
              {allUsers.length} Anggota Terdaftar
            </span>
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Ubah hak akses role secara instan, kelola penangguhan akun, dan bersihkan akun pengguna beserta ulasan dan postingan mereka secara permanen.
          </p>
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-slate-200 border border-white/10 flex items-center gap-2 transition-colors disabled:opacity-50"
          title="Segarkan data pengguna dari Firestore"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#FF2E7E]' : 'text-slate-400'}`} />
          <span>{isRefreshing ? 'Memuat...' : 'Segarkan Data'}</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#171A1F] border border-white/10 rounded-2xl p-4 space-y-3 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Role Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-medium pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                roleFilter === 'all'
                  ? 'bg-[#FF2E7E] text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              Semua ({allUsers.length})
            </button>

            <button
              onClick={() => setRoleFilter('warga_sotoy')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                roleFilter === 'warga_sotoy'
                  ? 'bg-[#FF2E7E] text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              Warga
            </button>

            <button
              onClick={() => setRoleFilter('si_paling_sotoy')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                roleFilter === 'si_paling_sotoy'
                  ? 'bg-[#FF2E7E] text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              Kritikus
            </button>

            <button
              onClick={() => setRoleFilter('penulis_sotoy')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                roleFilter === 'penulis_sotoy'
                  ? 'bg-[#FF2E7E] text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              Penulis
            </button>

            <button
              onClick={() => setRoleFilter('admin')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                roleFilter === 'admin'
                  ? 'bg-[#FF2E7E] text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              Admin
            </button>

            <button
              onClick={() => setRoleFilter('suspended')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                roleFilter === 'suspended'
                  ? 'bg-red-500/20 text-red-300 font-semibold border border-red-500/40'
                  : 'text-slate-400 hover:text-red-300 hover:bg-white/[0.04]'
              }`}
            >
              <Lock className="w-3 h-3 text-red-400" />
              <span>Terkunci / Banned</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama, handle, email, atau UID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#0E1013] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E] transition-colors"
            />
          </div>
        </div>

        {/* Bulk Actions Floating Bar */}
        {selectedUserIds.length > 0 && (
          <div className="bg-[#171A1F] border border-white/10 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-white/[0.08] text-white font-mono tabular-nums text-xs border border-white/15">
                {selectedUserIds.length}
              </span>
              <span className="text-xs text-white font-semibold">
                {selectedUserIds.length} Pengguna Terpilih
              </span>
              <button
                onClick={handleClearSelection}
                className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
              >
                Batal Pilih
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Bulk Change Role */}
              <div className="flex items-center gap-1.5 bg-[#0E1013] border border-white/10 px-2.5 py-1 rounded-xl">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-[11px] text-slate-400 font-semibold">Ubah Role:</span>
                <select
                  disabled={isBulkOperating}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkRoleChange(e.target.value as UserRole);
                      e.target.value = '';
                    }
                  }}
                  defaultValue=""
                  className="bg-transparent text-xs text-white font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="" disabled className="bg-[#171A1F] text-slate-400">Pilih Role...</option>
                  <option value="warga_sotoy" className="bg-[#171A1F] text-slate-300">Warga Sotoy</option>
                  <option value="si_paling_sotoy" className="bg-[#171A1F] text-white">Si Paling Sotoy (Kritikus)</option>
                  <option value="penulis_sotoy" className="bg-[#171A1F] text-[#FF2E7E]">Penulis Sotoy</option>
                  <option value="admin" className="bg-[#171A1F] text-slate-200">Admin Sotoy</option>
                </select>
              </div>

              {/* Bulk Suspend */}
              <button
                type="button"
                disabled={isBulkOperating}
                onClick={() => setIsBulkSuspendModalOpen({ isOpen: true, isSuspending: true })}
                className="px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Bekukan Akun ({selectedUserIds.filter(id => id !== currentUser.id).length})</span>
              </button>

              {/* Bulk Unsuspend */}
              <button
                type="button"
                disabled={isBulkOperating}
                onClick={() => setIsBulkSuspendModalOpen({ isOpen: true, isSuspending: false })}
                className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Buka Blokir ({selectedUserIds.length})</span>
              </button>

              {/* Bulk Delete */}
              <button
                type="button"
                disabled={isBulkOperating}
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Akun ({selectedUserIds.length})</span>
              </button>

              {/* Copy all UIDs */}
              <button
                type="button"
                onClick={handleBulkCopyUids}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Salin semua UID terpilih"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Salin UID</span>
              </button>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-850">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#17182b] text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3.5 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title={isAllSelected ? "Batal pilih semua" : "Pilih semua pengguna di halaman ini"}
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-purple-400" />
                    ) : isSomeSelected ? (
                      <MinusSquare className="w-4 h-4 text-purple-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-600" />
                    )}
                  </button>
                </th>
                <th className="p-3.5">Pengguna & Akun</th>
                <th className="p-3.5">Role Platform</th>
                <th className="p-3.5">Firebase UID</th>
                <th className="p-3.5">Bergabung</th>
                <th className="p-3.5">Aktivitas</th>
                <th className="p-3.5">Ubah Role</th>
                <th className="p-3.5 text-right">Moderasi & Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Tidak ada pengguna yang cocok dengan filter atau pencarian.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => {
                  const isSuspended = !!user.isSuspended;
                  const isCurrentAdmin = user.id === currentUser.id;
                  const isHardcodedAdmin = ADMIN_UIDS.includes(user.id);
                  const isSelected = selectedUserIds.includes(user.id);

                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-slate-850/60 transition-colors ${
                        isSuspended ? 'bg-red-950/15' : ''
                      } ${isSelected ? 'bg-purple-950/20' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectUser(user.id)}
                          className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-purple-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600 hover:text-slate-400" />
                          )}
                        </button>
                      </td>

                      {/* User Avatar & Info */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              user.avatar ||
                              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'
                            }
                            alt={user.name}
                            className={`w-9 h-9 rounded-full object-cover shrink-0 border ${
                              isSuspended ? 'border-red-500/50 grayscale' : 'border-slate-700'
                            }`}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => navigateTo('user-profile', { userId: user.id })}
                                className="font-semibold text-white hover:text-[#FF2E7E] transition-colors truncate text-left max-w-[150px] sm:max-w-[200px]"
                              >
                                {user.name}
                              </button>
                              {isCurrentAdmin && (
                                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-white/[0.08] text-white border border-white/20 shrink-0">
                                  Anda
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                              <span>{user.handle || `@${user.name.toLowerCase().replace(/\s+/g, '')}`}</span>
                              {user.email && (
                                <span className="text-slate-400/80 truncate hidden sm:inline">
                                  • {user.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="p-3.5">
                        <RoleBadge role={user.role} size="sm" />
                      </td>

                      {/* UID Copy */}
                      <td className="p-3.5 font-mono text-[10px] text-slate-400">
                        <div className="flex items-center gap-1.5 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-800 w-fit">
                          <span className="truncate max-w-[90px]">{user.id}</span>
                          <button
                            onClick={() => handleCopyUid(user.id)}
                            className="text-slate-500 hover:text-white transition-colors p-0.5"
                            title="Salin UID pengguna"
                          >
                            {copiedUid === user.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Joined Date */}
                      <td className="p-3.5 text-slate-400 text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{formatDate(user.createdAt)}</span>
                        </div>
                      </td>

                      {/* Activity */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1">
                            <MessageSquare className="w-2.5 h-2.5 text-cyan-400" />
                            {user.totalBuzz || 0}
                          </span>
                          <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1">
                            <Star className="w-2.5 h-2.5 text-amber-400" />
                            {user.totalReviews || 0}
                          </span>
                        </div>
                      </td>

                      {/* Instant Role Modifier Dropdown */}
                      <td className="p-3.5">
                        <div className="relative">
                          <select
                            value={user.role}
                            onChange={e => handleRoleChange(user, e.target.value as UserRole)}
                            className="w-full py-1.5 px-2.5 rounded-lg text-xs font-medium border border-white/10 bg-[#0E1013] text-slate-200 focus:border-[#FF2E7E] focus:outline-none transition-colors cursor-pointer"
                          >
                            <option value="warga_sotoy" className="bg-[#171A1F] text-slate-300">
                              Warga Sotoy
                            </option>
                            <option value="si_paling_sotoy" className="bg-[#171A1F] text-white font-semibold">
                              Si Paling Sotoy (Kritikus)
                            </option>
                            <option value="penulis_sotoy" className="bg-[#171A1F] text-[#FF2E7E] font-semibold">
                              Penulis Sotoy
                            </option>
                            <option value="admin" className="bg-[#171A1F] text-slate-200">
                              Admin Sotoy
                            </option>
                          </select>
                        </div>
                      </td>

                      {/* Suspend / Ban & Delete Actions */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isSuspended ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 border border-red-500/40">
                              <Lock className="w-2.5 h-2.5" />
                              BANNED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              AKTIF
                            </span>
                          )}

                          <button
                            onClick={() => setUserToSuspend({ user, isSuspending: !isSuspended })}
                            className={`p-1.5 rounded-lg border text-xs font-bold transition-colors flex items-center gap-1 ${
                              isSuspended
                                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30'
                            }`}
                            title={isSuspended ? 'Buka Blokir Akun' : 'Kunci / Bekukan Akun (Ban)'}
                          >
                            {isSuspended ? (
                              <>
                                <Unlock className="w-3 h-3" />
                                <span className="hidden lg:inline text-[10px]">Buka</span>
                              </>
                            ) : (
                              <>
                                <UserX className="w-3 h-3" />
                                <span className="hidden lg:inline text-[10px]">Bekukan</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => setUserToDelete(user)}
                            className="p-1.5 rounded-lg border bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border-slate-700 hover:border-red-500/30 text-xs font-bold transition-colors flex items-center gap-1"
                            title="Hapus Akun & Data Pengguna Secara Permanen"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span className="hidden lg:inline text-[10px]">Hapus</span>
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
      </div>

      {/* MODAL 1: SINGLE USER DELETE CONFIRMATION */}
      {userToDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#171A1F] border border-red-500/30 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-red-500/10 border-b border-red-500/20 p-6 flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-black text-xl text-white">Hapus Akun Pengguna</h3>
                <p className="text-red-300 text-xs mt-1">
                  Tindakan ini permanen dan akan membersihkan seluruh data pengguna dari database Firestore.
                </p>
              </div>
              <button
                onClick={() => setUserToDelete(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.05] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target User Details */}
            <div className="p-6 space-y-5">
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 flex items-center gap-3">
                <img
                  src={userToDelete.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                  alt={userToDelete.name}
                  className="w-12 h-12 rounded-full object-cover border border-white/20"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-sm truncate">{userToDelete.name}</span>
                    <RoleBadge role={userToDelete.role} size="sm" />
                  </div>
                  <div className="text-slate-400 text-xs truncate">
                    {userToDelete.handle || `@${userToDelete.name.toLowerCase().replace(/\s+/g, '')}`}
                    {userToDelete.email ? ` • ${userToDelete.email}` : ''}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">UID: {userToDelete.id}</div>
                </div>
              </div>

              {/* Data Cleanup Checklist */}
              <div className="bg-red-950/20 border border-red-500/20 rounded-xl p-4 space-y-2">
                <div className="text-xs font-semibold text-red-300 flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4 text-red-400" />
                  <span>Data yang akan dibersihkan secara menyeluruh:</span>
                </div>
                <ul className="text-[11px] text-slate-300 space-y-1 pl-5 list-disc">
                  <li>Dokumen profil pengguna (<code className="text-red-300 font-mono">users/{userToDelete.id}</code>)</li>
                  <li>Semua ulasan & rating film pengguna (<code className="text-red-300 font-mono">ratings</code>)</li>
                  <li>Semua postingan Buzz dan balasan (<code className="text-red-300 font-mono">buzz</code>)</li>
                  <li>Notifikasi dan catatan permohonan banding</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  disabled={isProcessingAction}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/[0.05] text-xs font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteSingleDelete}
                  disabled={isProcessingAction}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-sm flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isProcessingAction ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menghapus Data...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Permanen Akun & Data</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: BULK USERS DELETE CONFIRMATION */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#171A1F] border border-red-500/30 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-red-500/10 border-b border-red-500/20 p-6 flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center text-red-400 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-black text-xl text-white">
                  Hapus Massal {selectedUserIds.length} Akun Pengguna
                </h3>
                <p className="text-red-300 text-xs mt-1">
                  Seluruh akun yang dipilih beserta ulasan dan postingan mereka akan dihapus permanen.
                </p>
              </div>
              <button
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.05] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-black/30 border border-white/10 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2">
                {selectedUserIds.map(uid => {
                  const targetUser = allUsers.find(u => u.id === uid);
                  return (
                    <div key={uid} className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                      <span className="font-semibold text-white truncate max-w-[200px]">{targetUser?.name || uid}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{uid.slice(0, 8)}...</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteModalOpen(false)}
                  disabled={isProcessingAction}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/[0.05] text-xs font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteBulkDelete}
                  disabled={isProcessingAction}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-sm flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isProcessingAction ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menghapus Massal...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus {selectedUserIds.length} Akun Permanen</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: SUSPENSION CONFIRMATION */}
      {userToSuspend && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#171A1F] border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className={`p-6 border-b flex items-start gap-4 ${
              userToSuspend.isSuspending ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'
            }`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                userToSuspend.isSuspending ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}>
                {userToSuspend.isSuspending ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="font-display font-black text-lg text-white">
                  {userToSuspend.isSuspending ? 'Bekukan Akun Pengguna' : 'Buka Blokir Akun'}
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  {userToSuspend.isSuspending 
                    ? `Akun "${userToSuspend.user.name}" akan dibatasi dari membuat ulasan dan postingan.`
                    : `Akun "${userToSuspend.user.name}" akan dipulihkan dan dapat kembali beraktivitas.`}
                </p>
              </div>
            </div>

            <div className="p-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setUserToSuspend(null)}
                disabled={isProcessingAction}
                className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/[0.05] text-xs font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteSuspend}
                disabled={isProcessingAction}
                className={`px-5 py-2.5 rounded-xl text-white text-xs font-semibold shadow-sm flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer ${
                  userToSuspend.isSuspending 
                    ? 'bg-red-600 hover:bg-red-500' 
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {isProcessingAction ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : userToSuspend.isSuspending ? (
                  <Lock className="w-3.5 h-3.5" />
                ) : (
                  <Unlock className="w-3.5 h-3.5" />
                )}
                <span>{userToSuspend.isSuspending ? 'Konfirmasi Pembekuan' : 'Konfirmasi Buka Blokir'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: BULK SUSPENSION CONFIRMATION */}
      {isBulkSuspendModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#171A1F] border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className={`p-6 border-b flex items-start gap-4 ${
              isBulkSuspendModalOpen.isSuspending ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'
            }`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                isBulkSuspendModalOpen.isSuspending 
                  ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}>
                {isBulkSuspendModalOpen.isSuspending ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
              </div>
              <div className="flex-1">
                <h3 className="font-display font-black text-xl text-white">
                  {isBulkSuspendModalOpen.isSuspending ? 'Bekukan Massal Akun Pengguna' : 'Buka Blokir Massal Pengguna'}
                </h3>
                <p className="text-slate-300 text-xs mt-1">
                  {isBulkSuspendModalOpen.isSuspending 
                    ? `Membekukan ${selectedUserIds.filter(id => id !== currentUser.id).length} akun pengguna terpilih secara bersamaan.`
                    : `Mengaktifkan kembali ${selectedUserIds.length} akun pengguna terpilih.`}
                </p>
              </div>
              <button
                onClick={() => setIsBulkSuspendModalOpen(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.05] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of Target Users */}
            <div className="p-6 space-y-4">
              <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Daftar Akun Terpilih:</span>
                <span className="text-slate-400 text-[11px]">
                  {selectedUserIds.length} Pengguna
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 max-h-52 overflow-y-auto space-y-2">
                {selectedUserIds.map(uid => {
                  const targetUser = allUsers.find(u => u.id === uid);
                  const isSelf = uid === currentUser.id;

                  return (
                    <div 
                      key={uid} 
                      className={`flex items-center justify-between text-xs py-2 px-3 rounded-xl border ${
                        isSelf 
                          ? 'bg-slate-900/60 border-slate-750 opacity-60' 
                          : 'bg-slate-950/60 border-slate-850'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={targetUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                          alt={targetUser?.name || 'User'}
                          className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-700"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white truncate max-w-[160px]">
                              {targetUser?.name || uid}
                            </span>
                            {isSelf && (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                Akun Anda (Dilewati)
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {targetUser?.email || uid.slice(0, 10) + '...'}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {targetUser?.isSuspended ? (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                            Terkunci
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            Aktif
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkSuspendModalOpen(null)}
                  disabled={isProcessingAction}
                  className="px-4 py-2.5 rounded-xl border border-slate-750 text-slate-300 hover:bg-slate-800 text-xs font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteBulkSuspension}
                  disabled={isProcessingAction}
                  className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-lg flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer ${
                    isBulkSuspendModalOpen.isSuspending 
                      ? 'bg-red-600 hover:bg-red-500 shadow-red-600/30' 
                      : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  }`}
                >
                  {isProcessingAction ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : isBulkSuspendModalOpen.isSuspending ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Bekukan {selectedUserIds.filter(id => id !== currentUser.id).length} Akun</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Buka Blokir {selectedUserIds.length} Akun</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
