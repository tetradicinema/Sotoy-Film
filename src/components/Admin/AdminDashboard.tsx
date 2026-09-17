import React, { useState } from 'react';
import { 
  Users, 
  FileText, 
  Database, 
  ShieldAlert, 
  ShieldCheck,
  User as UserIcon, 
  Calendar, 
  Mail, 
  Download, 
  ExternalLink, 
  Search, 
  HardDrive, 
  TrendingUp,
  Image as ImageIcon,
  Clock,
  ArrowRight,
  Eye,
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { User, UploadedFile } from '../../types';

export const AdminDashboard: React.FC = () => {
  const { currentUser, allUsers, files, showToast, navigateTo, criticSubmissions } = useApp();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFileFilter, setActiveFileFilter] = useState<'all' | 'images' | 'other'>('all');
  const [activeLightboxFile, setActiveLightboxFile] = useState<UploadedFile | null>(null);

  // Filter users by search query
  const filteredUsers = allUsers.filter(user => {
    const term = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(term) ||
      (user.handle && user.handle.toLowerCase().includes(term)) ||
      (user.email && user.email.toLowerCase().includes(term)) ||
      user.id.toLowerCase().includes(term)
    );
  });

  // Calculate stats
  const totalUsers = allUsers.length;
  const totalFiles = files.length;
  const totalStorageBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);

  // Helper to format file sizes
  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Helper to format dates
  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Tidak diketahui';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return isoString;
    }
  };

  // Filter selected user's files
  const selectedUserFiles = selectedUser
    ? files.filter(f => f.userId === selectedUser.id)
    : [];

  const filteredUserFiles = selectedUserFiles.filter(file => {
    if (activeFileFilter === 'images') {
      return file.type.startsWith('image/');
    }
    if (activeFileFilter === 'other') {
      return !file.type.startsWith('image/');
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Admin View Hero Identifier Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-[#131425] to-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        {/* Glow ambient effects */}
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 p-0.5 shadow-xl shadow-amber-500/20 shrink-0">
            <div className="w-full h-full bg-[#11121d] rounded-[14px] flex items-center justify-center">
              <ShieldAlert className="w-7 h-7 text-amber-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-black text-white text-xl sm:text-2xl tracking-tight">
                Dasbor Kontrol Utama
              </h1>
              <span id="admin-indicator-badge" className="text-[10px] uppercase font-black tracking-widest px-2.5 py-1 bg-amber-500 text-slate-950 rounded-full font-sans shadow-md shadow-amber-500/20">
                SYSTEM ADMIN
              </span>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
              Halaman internal admin untuk melacak seluruh pendaftaran akun warga, indeks berkas media terunggah, serta pemantauan kapasitas Firebase Storage.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end text-right relative z-10 shrink-0">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            Terhubung Sebagai:
          </span>
          <span className="text-sm font-bold text-amber-400 mt-0.5">
            {currentUser.email}
          </span>
          <span className="text-[10px] text-slate-450 mt-0.5">
            UID: {currentUser.id}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-[#151624] border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between shadow-lg">
          <div className="space-y-1.5">
            <span className="text-xs text-slate-400 font-medium block">Total Anggota Terdaftar</span>
            <span className="text-3xl font-black text-white tracking-tight">{totalUsers}</span>
            <div className="flex items-center gap-1 text-[10px] text-cyan-400">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Realtime di Firestore</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 shrink-0">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Total Uploaded Files */}
        <div className="bg-[#151624] border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between shadow-lg">
          <div className="space-y-1.5">
            <span className="text-xs text-slate-400 font-medium block">Total Berkas Media</span>
            <span className="text-3xl font-black text-white tracking-tight">{totalFiles}</span>
            <div className="flex items-center gap-1 text-[10px] text-amber-400">
              <HardDrive className="w-3.5 h-3.5" />
              <span>Terindeks di Firestore</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Total Storage Used */}
        <div className="bg-[#151624] border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between shadow-lg">
          <div className="space-y-1.5">
            <span className="text-xs text-slate-400 font-medium block">Storage Terpakai</span>
            <span className="text-3xl font-black text-white tracking-tight">
              {formatFileSize(totalStorageBytes)}
            </span>
            <div className="flex items-center gap-1 text-[10px] text-emerald-400">
              <Database className="w-3.5 h-3.5" />
              <span>Data-URL Storage</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
            <Database className="w-6 h-6" />
          </div>
        </div>

        {/* Critic Submissions Quick Link */}
        <button
          onClick={() => navigateTo('admin-critic-submissions')}
          className="bg-gradient-to-br from-red-950/40 via-[#1a121a] to-slate-900 border border-red-500/40 hover:border-red-500 rounded-2xl p-5 flex items-center justify-between text-left transition-all hover:scale-[1.02] group shadow-lg"
        >
          <div className="space-y-1.5">
            <span className="text-xs text-red-300/80 font-bold block">Verifikasi Kritikus</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-red-400">
                {criticSubmissions.filter(s => s.status === 'pending').length}
              </span>
              <span className="text-[10px] uppercase font-bold text-red-300">Pending</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-red-400/90 font-semibold group-hover:underline">
              <span>Buka Verifikasi</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-500/20 group-hover:bg-red-500/30 flex items-center justify-center text-red-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </button>
      </div>

      {/* Main Admin Section: Split List/Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: ALL USERS LIST TABLE (Takes 7 cols on desktop) */}
        <div className="lg:col-span-7 bg-[#111220] border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          {/* Header & Search */}
          <div className="p-5 border-b border-slate-800 bg-[#151624]/60 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="font-display font-bold text-white text-base">
                  Daftar Pengguna Sistem
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Klik pada baris pengguna untuk melacak berkas media terunggah miliknya.
                </p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-full px-3 py-1 flex items-center gap-1 text-[10px] text-amber-400 font-bold self-start sm:self-auto">
                <Database className="w-3 h-3" />
                <span>Koneksi Firestore Stabil</span>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                id="admin-user-search"
                type="text"
                placeholder="Cari pengguna berdasarkan nama, email, username, atau ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
          </div>

          {/* User Rows */}
          <div className="divide-y divide-slate-850 max-h-[580px] overflow-y-auto custom-scrollbar">
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Tidak ada pengguna yang cocok dengan kueri pencarian Anda.
              </div>
            ) : (
              filteredUsers.map(user => {
                const userFileCount = files.filter(f => f.userId === user.id).length;
                const isSelected = selectedUser?.id === user.id;

                return (
                  <button
                    key={user.id}
                    id={`admin-user-row-${user.id}`}
                    onClick={() => {
                      setSelectedUser(user);
                      setActiveFileFilter('all');
                    }}
                    className={`w-full p-4 flex items-center justify-between text-left transition-all relative ${
                      isSelected 
                        ? 'bg-amber-500/5 border-l-4 border-amber-400' 
                        : 'hover:bg-slate-900/50 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-4">
                      {/* Avatar */}
                      <img
                        src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                        alt={user.name}
                        className="w-11 h-11 rounded-2xl object-cover ring-2 ring-slate-800 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-white truncate max-w-[150px] sm:max-w-[200px]">
                            {user.name}
                          </span>
                          {user.role === 'admin' ? (
                            <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              Admin
                            </span>
                          ) : user.role === 'si_paling_sotoy' ? (
                            <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                              Kritikus
                            </span>
                          ) : (
                            <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                              {user.role === 'penulis_sotoy' ? 'Penulis' : 'Warga'}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {user.handle || `@user_${user.id.slice(0, 5)}`}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1">
                          <span className="flex items-center gap-1 truncate max-w-[120px] sm:max-w-[180px]">
                            <Mail className="w-3 h-3 shrink-0" />
                            {user.email || 'Tidak ada email'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      {/* Account Creation and Uploads Count */}
                      <div className="text-right flex flex-col items-end">
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>{formatDate(user.createdAt).split(',')[0]}</span>
                        </div>
                        <span className={`text-xs font-black mt-1 px-2.5 py-0.5 rounded-full ${
                          userFileCount > 0 
                            ? 'bg-cyan-500/20 text-[#00F0FF] border border-cyan-500/30' 
                            : 'bg-slate-800/60 text-slate-500'
                        }`}>
                          {userFileCount} File
                        </span>
                      </div>
                      <ChevronRight className={`w-4 h-4 transition-transform ${
                        isSelected ? 'text-amber-400 translate-x-1' : 'text-slate-600'
                      }`} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: USER DETAIL & UPLOADED FILES ARCHIVE (Takes 5 cols on desktop) */}
        <div className="lg:col-span-5 bg-[#111220] border border-slate-800 rounded-3xl overflow-hidden shadow-xl min-h-[580px] flex flex-col">
          {selectedUser ? (
            <div className="flex-1 flex flex-col">
              {/* Target User Panel Header */}
              <div className="p-5 border-b border-slate-800 bg-slate-900/30 flex items-center gap-4 shrink-0">
                <img
                  src={selectedUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                  alt={selectedUser.name}
                  className="w-12 h-12 rounded-2xl object-cover ring-2 ring-amber-400/30 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-display font-bold text-white text-sm truncate">
                    Arsip Berkas: {selectedUser.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    ID Akun: <span className="font-mono bg-slate-900 px-1 py-0.2 rounded text-[9px] text-amber-300">{selectedUser.id}</span>
                  </p>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">
                    Terdaftar: {formatDate(selectedUser.createdAt)}
                  </p>
                </div>
              </div>

              {/* Filtering tabs */}
              <div className="flex border-b border-slate-850 bg-slate-900/10 px-4 shrink-0">
                {(['all', 'images', 'other'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveFileFilter(tab)}
                    className={`py-2 px-3 text-[10px] font-black uppercase tracking-wider relative transition-all ${
                      activeFileFilter === tab 
                        ? 'text-amber-400' 
                        : 'text-slate-450 hover:text-slate-200'
                    }`}
                  >
                    {tab === 'all' ? 'Semua Berkas' : tab === 'images' ? 'Gambar/Foto' : 'Lainnya'}
                    {activeFileFilter === tab && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400 rounded-t-full" />
                    )}
                  </button>
                ))}
              </div>

              {/* Files Grid or Empty State */}
              <div className="flex-1 p-5 overflow-y-auto max-h-[420px] custom-scrollbar bg-slate-950/20">
                {filteredUserFiles.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                    <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-650">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400">Arsip Berkas Kosong</p>
                      <p className="text-[10px] text-slate-500 mt-1 max-w-[200px] mx-auto">
                        Pengguna ini belum pernah mengunggah berkas foto profil baru melalui menu Pengaturan.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3.5">
                    {filteredUserFiles.map(file => {
                      const isImage = file.type.startsWith('image/');
                      return (
                        <div
                          key={file.id}
                          className="bg-slate-900 border border-slate-850 hover:border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col group transition-all"
                        >
                          {/* File Preview */}
                          <div className="aspect-video bg-slate-950 relative flex items-center justify-center overflow-hidden shrink-0 group-hover:opacity-90 transition-opacity">
                            {isImage ? (
                              <img
                                src={file.url}
                                alt={file.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="text-slate-500 flex flex-col items-center gap-1">
                                <FileText className="w-6 h-6 text-amber-500" />
                                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500">
                                  {file.type.split('/')[1] || 'FILE'}
                                </span>
                              </div>
                            )}

                            {/* Hover overlay with triggers */}
                            <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity duration-200">
                              {isImage && (
                                <button
                                  onClick={() => setActiveLightboxFile(file)}
                                  className="w-8 h-8 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center justify-center transition-colors"
                                  title="Pratinjau Foto"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              )}
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noreferrer referrer"
                                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-colors"
                                title="Buka Tautan Langsung"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          </div>

                          {/* File details */}
                          <div className="p-3 flex-1 flex flex-col justify-between">
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-white truncate leading-snug" title={file.name}>
                                {file.name}
                              </p>
                              <div className="flex items-center gap-1.5 text-[9px] text-slate-450 mt-1">
                                <HardDrive className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{formatFileSize(file.size)}</span>
                              </div>
                            </div>
                            <div className="border-t border-slate-850/50 pt-2 mt-2 flex items-center justify-between text-[8px] text-slate-500">
                              <span className="flex items-center gap-0.5 truncate max-w-[100px]">
                                <Clock className="w-2.5 h-2.5 shrink-0" />
                                {formatDate(file.uploadedAt).split(',')[0]}
                              </span>
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noreferrer referrer"
                                className="text-amber-400/80 hover:text-amber-400 font-bold flex items-center gap-0.5 shrink-0"
                              >
                                Unduh
                                <Download className="w-2 h-2" />
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/10 to-yellow-400/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-xl">
                <Database className="w-8 h-8 animate-pulse" />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h4 className="font-display font-bold text-white text-sm">
                  Pilih Pengguna Untuk Pelacakan Berkas
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Silakan pilih salah satu anggota di daftar sebelah kiri untuk menampilkan arsip lengkap file foto profil yang telah diunggah ke Firebase Storage.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Lightbox Modal Component */}
      {activeLightboxFile && (
        <div
          onClick={() => setActiveLightboxFile(null)}
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="relative max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl bg-[#0D0E15] border border-slate-800 flex flex-col shadow-2xl">
            <button
              onClick={() => setActiveLightboxFile(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors font-bold text-xs"
            >
              ✕
            </button>
            <div className="flex-1 flex items-center justify-center bg-slate-950 p-2">
              <img
                src={activeLightboxFile.url}
                alt={activeLightboxFile.name}
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>
            <div className="p-4 bg-slate-900 border-t border-slate-800 text-left">
              <h5 className="text-xs font-bold text-white truncate leading-snug">
                {activeLightboxFile.name}
              </h5>
              <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-400 mt-1">
                <span>Ukuran: <strong>{formatFileSize(activeLightboxFile.size)}</strong></span>
                <span>Tipe MIME: <strong>{activeLightboxFile.type}</strong></span>
                <span>Diunggah: <strong>{formatDate(activeLightboxFile.uploadedAt)}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
