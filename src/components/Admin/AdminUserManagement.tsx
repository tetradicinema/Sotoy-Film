import React, { useState } from 'react';
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
  Layers
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
    showToast, 
    currentUser, 
    navigateTo 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole | 'suspended'>('all');
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

  // Bulk Selection State
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isBulkOperating, setIsBulkOperating] = useState(false);

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
    // Don't suspend current user
    const filteredUids = suspend ? selectedUserIds.filter(id => id !== currentUser.id) : selectedUserIds;
    if (filteredUids.length === 0) {
      showToast('Tidak ada pengguna valid yang dapat dibekukan.');
      return;
    }

    setIsBulkOperating(true);
    try {
      await bulkToggleUserSuspension(filteredUids, suspend);
      setSelectedUserIds([]);
    } catch (err: any) {
      showToast('Gagal memproses status pengguna: ' + (err?.message || 'Error'));
    } finally {
      setIsBulkOperating(false);
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
    
    // Prevent self-demotion accidentally
    if (user.id === currentUser.id && newRole !== 'admin') {
      if (!window.confirm('PERINGATAN: Anda sedang mengubah role Anda sendiri dari Admin. Lanjutkan?')) {
        return;
      }
    }

    await updateUserRole(user.id, newRole);
  };

  const handleToggleSuspend = async (user: User) => {
    const isSuspending = !user.isSuspended;
    const actionLabel = isSuspending ? 'membekukan (BANNED)' : 'mengaktifkan kembali';
    
    if (user.id === currentUser.id) {
      showToast('Anda tidak dapat membekukan akun sendiri.');
      return;
    }

    if (window.confirm(`Yakin ingin ${actionLabel} akun pengguna "${user.name}" (@${user.handle || user.id.slice(0, 5)})?`)) {
      await toggleUserSuspension(user.id, isSuspending);
    }
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
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-[#00F0FF] border border-cyan-500/30 font-sans font-bold">
              {allUsers.length} Anggota Terdaftar
            </span>
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Ubah hak akses role secara instan, salin UID otentikasi Firebase, dan bekukan akun yang melanggar pedoman komunitas.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#121324] border border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Role Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-medium pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                roleFilter === 'all'
                  ? 'bg-slate-700 text-white font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Semua ({allUsers.length})
            </button>

            <button
              onClick={() => setRoleFilter('warga_sotoy')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                roleFilter === 'warga_sotoy'
                  ? 'bg-cyan-500/20 text-[#00F0FF] font-bold border border-cyan-500/30'
                  : 'text-slate-400 hover:text-[#00F0FF] hover:bg-slate-800'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF]" />
              Warga
            </button>

            <button
              onClick={() => setRoleFilter('si_paling_sotoy')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                roleFilter === 'si_paling_sotoy'
                  ? 'bg-amber-500/20 text-[#FFD000] font-bold border border-amber-500/30'
                  : 'text-slate-400 hover:text-[#FFD000] hover:bg-slate-800'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFD000]" />
              Kritikus
            </button>

            <button
              onClick={() => setRoleFilter('penulis_sotoy')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                roleFilter === 'penulis_sotoy'
                  ? 'bg-pink-500/20 text-[#FF2E7E] font-bold border border-pink-500/30'
                  : 'text-slate-400 hover:text-[#FF2E7E] hover:bg-slate-800'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF2E7E]" />
              Penulis
            </button>

            <button
              onClick={() => setRoleFilter('admin')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                roleFilter === 'admin'
                  ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30'
                  : 'text-slate-400 hover:text-purple-300 hover:bg-slate-800'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              Admin
            </button>

            <button
              onClick={() => setRoleFilter('suspended')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                roleFilter === 'suspended'
                  ? 'bg-red-500/20 text-red-300 font-bold border border-red-500/30'
                  : 'text-slate-400 hover:text-red-300 hover:bg-slate-800'
              }`}
            >
              <Lock className="w-3 h-3 text-red-400" />
              Terkunci / Banned
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
              className="w-full bg-slate-900 border border-slate-750 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>
        </div>

        {/* Bulk Actions Floating Bar */}
        {selectedUserIds.length > 0 && (
          <div className="bg-gradient-to-r from-purple-950/90 via-slate-900/95 to-purple-950/90 border border-purple-500/40 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-purple-500/20 text-purple-300 font-black text-xs border border-purple-500/30">
                {selectedUserIds.length}
              </span>
              <span className="text-xs text-white font-bold">
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
              <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-750 px-2.5 py-1 rounded-xl">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
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
                  className="bg-transparent text-xs text-white font-bold focus:outline-none cursor-pointer"
                >
                  <option value="" disabled className="bg-slate-900 text-slate-400">Pilih Role...</option>
                  <option value="warga_sotoy" className="bg-slate-900 text-[#00F0FF]">Warga Sotoy (Cyan)</option>
                  <option value="si_paling_sotoy" className="bg-slate-900 text-[#FFD000]">Si Paling Sotoy (Kuning)</option>
                  <option value="penulis_sotoy" className="bg-slate-900 text-[#FF2E7E]">Penulis Sotoy (Pink)</option>
                  <option value="admin" className="bg-slate-900 text-purple-300">Admin Sotoy (Ungu)</option>
                </select>
              </div>

              {/* Bulk Suspend */}
              <button
                type="button"
                disabled={isBulkOperating}
                onClick={() => handleBulkToggleSuspension(true)}
                className="px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Bekukan Akun</span>
              </button>

              {/* Bulk Unsuspend */}
              <button
                type="button"
                disabled={isBulkOperating}
                onClick={() => handleBulkToggleSuspension(false)}
                className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Buka Blokir</span>
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
                      <CheckSquare className="w-4 h-4 text-[#00F0FF]" />
                    ) : isSomeSelected ? (
                      <MinusSquare className="w-4 h-4 text-purple-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                </th>
                <th className="p-3.5 min-w-[240px]">Profil Pengguna</th>
                <th className="p-3.5 min-w-[180px]">UID & Email Akun</th>
                <th className="p-3.5 min-w-[120px]">Bergabung</th>
                <th className="p-3.5 min-w-[120px]">Aktivitas</th>
                <th className="p-3.5 min-w-[180px]">Ubah Role Instant</th>
                <th className="p-3.5 min-w-[140px] text-right">Status Akun</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-850/80 bg-[#111220]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                    Tidak ada pengguna yang cocok dengan kueri pencarian atau filter role.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => {
                  const isAdminUser = user.role === 'admin' || ADMIN_UIDS.includes(user.id);
                  const isSuspended = !!user.isSuspended;
                  const roleStyle = getRoleBadgeStyle(user.role);
                  const isSelected = selectedUserIds.includes(user.id);

                  return (
                    <tr 
                      key={user.id} 
                      className={`hover:bg-slate-850/40 transition-colors ${
                        isSelected 
                          ? 'bg-purple-950/30 ring-1 ring-inset ring-purple-500/30' 
                          : isSuspended ? 'bg-red-950/10' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectUser(user.id)}
                          className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#00F0FF]" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                      </td>

                      {/* Avatar & Name & Handle */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                            alt={user.name}
                            className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-750 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span 
                                onClick={() => navigateTo('user-profile', { userId: user.id })}
                                className="font-bold text-white hover:text-[#00F0FF] cursor-pointer transition-colors text-xs truncate max-w-[160px]"
                              >
                                {user.name}
                              </span>
                              {user.id === currentUser.id && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-[#00F0FF] font-bold">
                                  Anda
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate mt-0.5">
                              {user.handle || `@user_${user.id.slice(0, 5)}`}
                            </div>
                            <div className="mt-1">
                              <RoleBadge role={user.role} size="xs" showTooltip={false} />
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* UID & Email */}
                      <td className="p-3.5">
                        <div className="space-y-1">
                          {/* UID Copy Button */}
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-slate-300 truncate max-w-[130px]">
                              {user.id}
                            </span>
                            <button
                              onClick={() => handleCopyUid(user.id)}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white transition-colors"
                              title="Salin UID Akun"
                            >
                              {copiedUid === user.id ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>

                          {/* Email */}
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 truncate max-w-[170px]">
                            <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                            <span>{user.email || 'Belum terhubung'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Created At */}
                      <td className="p-3.5 text-[11px] text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
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
                            className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-bold border transition-colors focus:outline-none cursor-pointer ${
                              user.role === 'warga_sotoy'
                                ? 'bg-cyan-500/10 text-[#00F0FF] border-cyan-500/40 focus:border-[#00F0FF]'
                                : user.role === 'si_paling_sotoy'
                                ? 'bg-amber-500/10 text-[#FFD000] border-amber-500/40 focus:border-[#FFD000]'
                                : user.role === 'penulis_sotoy'
                                ? 'bg-pink-500/10 text-[#FF2E7E] border-pink-500/40 focus:border-[#FF2E7E]'
                                : 'bg-purple-500/15 text-purple-300 border-purple-500/50 focus:border-purple-400'
                            }`}
                          >
                            <option value="warga_sotoy" className="bg-[#121324] text-[#00F0FF]">
                              Warga Sotoy (Cyan)
                            </option>
                            <option value="si_paling_sotoy" className="bg-[#121324] text-[#FFD000]">
                              Si Paling Sotoy (Kuning)
                            </option>
                            <option value="penulis_sotoy" className="bg-[#121324] text-[#FF2E7E]">
                              Penulis Sotoy (Pink)
                            </option>
                            <option value="admin" className="bg-[#121324] text-purple-300">
                              Admin Sotoy (Ungu)
                            </option>
                          </select>
                        </div>
                      </td>

                      {/* Suspend / Ban Toggle */}
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
                            onClick={() => handleToggleSuspend(user)}
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
    </div>
  );
};
