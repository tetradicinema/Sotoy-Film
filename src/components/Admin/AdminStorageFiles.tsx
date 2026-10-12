import React, { useState, useEffect } from 'react';
import { 
  HardDrive, 
  Search, 
  FileText, 
  Download, 
  ExternalLink, 
  Eye, 
  Clock, 
  Image as ImageIcon,
  Database,
  Calendar,
  ChevronRight,
  User as UserIcon,
  Filter
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { User, UploadedFile } from '../../types';
import { RoleBadge } from '../Common/RoleBadge';

export const AdminStorageFiles: React.FC = () => {
  const { allUsers, files, fetchAdminFiles, hasMoreFiles } = useApp();

  useEffect(() => {
    fetchAdminFiles();
  }, [fetchAdminFiles]);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFileFilter, setActiveFileFilter] = useState<'all' | 'images' | 'other'>('all');
  const [activeLightboxFile, setActiveLightboxFile] = useState<UploadedFile | null>(null);

  // Filter users
  const filteredUsers = allUsers.filter(user => {
    const term = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(term) ||
      (user.handle && user.handle.toLowerCase().includes(term)) ||
      (user.email && user.email.toLowerCase().includes(term)) ||
      user.id.toLowerCase().includes(term)
    );
  });

  const totalFiles = files.length;
  const totalStorageBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

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
    } catch {
      return isoString;
    }
  };

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display font-black text-xl text-white tracking-tight flex items-center gap-2.5">
            <span>Arsip Berkas Media & Penyimpanan</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-sans font-bold">
              {totalFiles} Berkas ({formatFileSize(totalStorageBytes)})
            </span>
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Pelacakan berkas foto profil dan unggahan media pengguna yang terindeks di sistem penyimpanan Firestore.
          </p>
        </div>
      </div>

      {/* Main Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: User Explorer */}
        <div className="lg:col-span-6 bg-[#171717] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 bg-[#171717]/60 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-white text-sm">
                Pilih Pengguna ({allUsers.length})
              </h3>
              <span className="text-[10px] text-slate-400">
                Klik untuk menampilkan berkas
              </span>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari user berdasarkan nama / UID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-750 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F0FF]"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-850 max-h-[500px] overflow-y-auto custom-scrollbar">
            {filteredUsers.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                Tidak ada pengguna yang cocok.
              </div>
            ) : (
              filteredUsers.map(user => {
                const userFileCount = files.filter(f => f.userId === user.id).length;
                const isSelected = selectedUser?.id === user.id;

                return (
                  <button
                    key={user.id}
                    onClick={() => {
                      setSelectedUser(user);
                      setActiveFileFilter('all');
                    }}
                    className={`w-full p-3.5 flex items-center justify-between text-left transition-all ${
                      isSelected 
                        ? 'bg-amber-500/10 border-l-4 border-amber-400' 
                        : 'hover:bg-slate-900/50 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-3">
                      <img
                        src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80'}
                        alt={user.name}
                        className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-800 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-white truncate max-w-[140px]">
                            {user.name}
                          </span>
                          <RoleBadge role={user.role} size="xs" showTooltip={false} />
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          UID: {user.id.slice(0, 10)}...
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        userFileCount > 0 
                          ? 'bg-[#FF2E7E]/10 text-[#FF2E7E] border border-[#FF2E7E]/20' 
                          : 'bg-white/[0.04] text-slate-500'
                      }`}>
                        {userFileCount} File
                      </span>
                      <ChevronRight className={`w-3.5 h-3.5 ${
                        isSelected ? 'text-[#FF2E7E]' : 'text-slate-600'
                      }`} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Files Grid */}
        <div className="lg:col-span-6 bg-[#171717] border border-slate-800 rounded-2xl overflow-hidden shadow-xl min-h-[500px] flex flex-col">
          {selectedUser ? (
            <div className="flex-1 flex flex-col">
              <div className="p-4 border-b border-slate-800 bg-[#171717]/60 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-xs">
                    Arsip: {selectedUser.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono">
                    UID: {selectedUser.id}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[10px]">
                  {(['all', 'images', 'other'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveFileFilter(tab)}
                      className={`px-2.5 py-1 rounded-lg capitalize font-bold transition-colors ${
                        activeFileFilter === tab 
                          ? 'bg-cyan-400 text-slate-950' 
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {tab === 'all' ? 'Semua' : tab === 'images' ? 'Gambar' : 'Lainnya'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 p-4 overflow-y-auto max-h-[440px] custom-scrollbar bg-slate-950/20">
                {filteredUserFiles.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2">
                    <ImageIcon className="w-8 h-8 text-slate-600" />
                    <p className="text-xs font-bold text-slate-400">Tidak ada berkas media terunggah</p>
                    <p className="text-[10px] text-slate-500">Pengguna belum mengunggah foto profil baru.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {filteredUserFiles.map(file => (
                      <div key={file.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col group">
                        <div className="aspect-video bg-slate-950 relative flex items-center justify-center overflow-hidden">
                          {file.type.startsWith('image/') && file.url?.trim() ? (
                            <img src={file.url.trim()} alt={file.name} className="w-full h-full object-cover" />
                          ) : (
                            <FileText className="w-6 h-6 text-cyan-400" />
                          )}
                          <div className="hidden md:flex absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 items-center justify-center gap-2 transition-opacity">
                            {file.type.startsWith('image/') && (
                              <button
                                onClick={() => setActiveLightboxFile(file)}
                                className="w-7 h-7 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center"
                                title="Lihat Foto"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center"
                              title="Tautan Langsung"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                        <div className="flex md:hidden items-center justify-center gap-2 py-1.5 bg-slate-950 border-t border-slate-800">
                          {file.type.startsWith('image/') && (
                            <button
                              onClick={() => setActiveLightboxFile(file)}
                              className="w-7 h-7 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center"
                              title="Lihat Foto"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center"
                            title="Tautan Langsung"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                        <div className="p-2.5 space-y-1">
                          <p className="text-[10px] font-bold text-white truncate" title={file.name}>
                            {file.name}
                          </p>
                          <div className="flex items-center justify-between text-[9px] text-slate-500">
                            <span>{formatFileSize(file.size)}</span>
                            <span>{formatDate(file.uploadedAt).split(',')[0]}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
              <Database className="w-10 h-10 text-slate-600" />
              <p className="text-xs font-bold text-slate-300">Pilih Pengguna</p>
              <p className="text-[10px] text-slate-500 max-w-xs">
                Pilih pengguna di daftar kiri untuk melihat berkas yang diunggah.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {activeLightboxFile && (
        <div
          onClick={() => setActiveLightboxFile(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="relative max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl bg-[#0A0A0A] border border-slate-800 flex flex-col">
            <button
              onClick={() => setActiveLightboxFile(null)}
              className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold"
            >
              ✕
            </button>
            <div className="p-2 flex items-center justify-center bg-slate-950">
              {activeLightboxFile.url?.trim() ? (
                <img src={activeLightboxFile.url.trim()} alt={activeLightboxFile.name} className="max-w-full max-h-[65vh] object-contain" />
              ) : null}
            </div>
            <div className="p-3 bg-slate-900 border-t border-slate-800 text-xs text-white">
              <p className="font-bold">{activeLightboxFile.name}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {formatFileSize(activeLightboxFile.size)} • Diunggah: {formatDate(activeLightboxFile.uploadedAt)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
