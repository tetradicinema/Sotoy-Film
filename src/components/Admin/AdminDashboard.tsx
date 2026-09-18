import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Users, 
  Film, 
  HardDrive, 
  Award, 
  Eye, 
  CheckCircle2,
  FileText,
  ExternalLink
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AdminStatsOverview } from './AdminStatsOverview';
import { AdminUserManagement } from './AdminUserManagement';
import { AdminModeration } from './AdminModeration';
import { CMSAnalyticsCard } from '../CMS/CMSAnalyticsCard';
import { AdminCatalogManager } from './AdminCatalogManager';
import { AdminStorageFiles } from './AdminStorageFiles';

type AdminTab = 'users' | 'moderation' | 'catalog' | 'storage';

export const AdminDashboard: React.FC = () => {
  const { 
    currentUser, 
    isAdmin, 
    isWriter,
    criticSubmissions, 
    moderationReports 
  } = useApp();

  const location = useLocation();

  // Determine active view directly from standalone URL pathname
  const getActiveTab = (): AdminTab => {
    if (location.pathname === '/admin/moderation') return 'moderation';
    if (location.pathname === '/admin/catalog') return 'catalog';
    if (location.pathname === '/admin/storage') return 'storage';
    return 'users'; // default for /admin or /admin/users
  };

  const activeTab = getActiveTab();

  const pendingCriticsCount = criticSubmissions.filter(s => s.status === 'pending').length;
  const pendingReportsCount = moderationReports.filter(r => r.status === 'pending').length;

  const isUserAdminAuthorized = isAdmin || currentUser.role === 'admin' || currentUser.email === 'eksposurmedia@gmail.com';

  if (!isUserAdminAuthorized) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="font-display font-black text-2xl text-white">Akses Admin Terbatas</h2>
        <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
          Halaman Dasbor Admin hanya diperuntukkan bagi Administrator Utama. Sebagai Penulis, Anda dapat mengelola artikel dan karya Anda melalui Dasbor Penulis.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          {(isWriter || currentUser.role === 'penulis_sotoy') && (
            <Link
              to="/writer"
              className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs shadow-lg shadow-pink-600/30 transition-all"
            >
              Buka Dasbor Penulis →
            </Link>
          )}
          <Link
            to="/"
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* 1. TAMPILAN KHUSUS ADMIN (ADMIN VIEW OVERRIDE HEADER WITH #7928CA PURPLE) */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#170e2b] via-[#121324] to-[#1a0f2e] border-2 border-[#7928CA]/60 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-purple-950/40">
        {/* Glow ambient effects */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-[#7928CA]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Title & Badge */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#7928CA] to-[#A855F7] p-0.5 shadow-xl shadow-purple-600/30 shrink-0">
              <div className="w-full h-full bg-[#110e1d] rounded-[14px] flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-[#C48BFF] animate-pulse" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-display font-black text-white text-2xl sm:text-3xl tracking-tight">
                  Sotoy Admin Control Center
                </h1>

                {/* VISUAL INDICATOR "ADMIN MODE" (Ungu #7928CA) */}
                <div 
                  id="admin-mode-pill-header"
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#7928CA] text-white text-xs font-black uppercase tracking-widest rounded-full shadow-lg shadow-purple-900/60 border border-purple-400/40"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-200"></span>
                  </span>
                  <span>ADMIN MODE</span>
                </div>
              </div>

              <p className="text-slate-300 text-xs sm:text-sm mt-1.5 max-w-2xl leading-relaxed">
                Panel kendali terpadu untuk pengawasan editorial (CMS), pengelolaan hak akses role warga, moderasi laporan komunitas, dan manajemen katalog film.
              </p>
            </div>
          </div>

          {/* Connected Admin Details & Public Switcher */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-4 shrink-0 bg-slate-950/40 border border-purple-500/20 p-4 rounded-2xl">
            <div className="text-left sm:text-right">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-purple-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{currentUser.role === 'admin' ? 'Admin Utama Terotentikasi' : 'Penulis / Redaksi CMS Terotentikasi'}</span>
              </div>
              <div className="text-sm font-bold text-white mt-0.5">
                {currentUser.name} ({currentUser.email || 'Admin'})
              </div>
              <div className="text-[10px] font-mono text-purple-400/80 mt-0.5">
                UID: {currentUser.id}
              </div>
            </div>

            {/* Direct Link to Standalone CMS Page */}
            <Link
              to="/admin/cms"
              id="admin-open-cms-page-btn"
              className="px-3.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              <span>Full Control CMS (Halaman Khusus)</span>
              <ExternalLink className="w-3 h-3 text-purple-400" />
            </Link>

            {/* Quick Switch Button to Public View */}
            <Link
              to="/"
              id="admin-public-view-btn"
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Eye className="w-3.5 h-3.5 text-[#00F0FF]" />
              <span>Lihat Tampilan Publik</span>
            </Link>
          </div>
        </div>

        {/* Authorized Admin UIDs List Banner */}
        <div className="mt-6 pt-4 border-t border-purple-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">
              Otoritas UID Admin Utama:
            </span>
            <code className="bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 rounded text-[11px] text-purple-200 font-mono">
              CsG2CY2TaIZmG7yuPfzAxmRYrlY2
            </code>
            <code className="bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 rounded text-[11px] text-purple-200 font-mono">
              QkNGf1ZfhsMyUEk90a6Iz8ZplZS2
            </code>
          </div>

          {/* Critic verification quick badge */}
          {pendingCriticsCount > 0 && (
            <Link
              to="/admin/submissions"
              id="admin-pending-critics-badge-btn"
              className="flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:underline bg-amber-500/15 px-3 py-1 rounded-full border border-amber-500/30"
            >
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>{pendingCriticsCount} Pengajuan Si Paling Sotoy Menunggu Review →</span>
            </Link>
          )}
        </div>
      </div>

      {/* 2. METRIK UTAMA PLATFORM (STATISTICS OVERVIEW - 4 KARTU) */}
      <AdminStatsOverview />

      {/* CMS Editorial Real-time Analytics Card */}
      <CMSAnalyticsCard mode="admin" />

      {/* 3. MODUL MANAGEMENT UTAMA (STANDALONE URLS NAVIGATION LIST) */}
      <div className="space-y-6">
        {/* Navigation Tabs Bar pointing to Standalone URLs */}
        <nav 
          className="admin-navigation-list flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-none"
          aria-label="Admin Navigation List"
        >
          {/* Link 1: User Management */}
          <Link
            to="/admin/users"
            id="admin-tab-users"
            className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'users'
                ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-600/10 text-[#00F0FF] border border-cyan-500/40 shadow-lg shadow-cyan-950/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-850 border border-transparent'
            }`}
          >
            <Users className={`w-4 h-4 ${activeTab === 'users' ? 'text-[#00F0FF]' : 'text-slate-400'}`} />
            <span>Manajemen Pengguna & Role</span>
          </Link>

          {/* Link 2: Moderation */}
          <Link
            to="/admin/moderation"
            id="admin-tab-moderation"
            className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 relative ${
              activeTab === 'moderation'
                ? 'bg-gradient-to-r from-red-500/20 to-red-600/10 text-red-300 border border-red-500/40 shadow-lg shadow-red-950/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-850 border border-transparent'
            }`}
          >
            <ShieldAlert className={`w-4 h-4 ${activeTab === 'moderation' ? 'text-red-400' : 'text-slate-400'}`} />
            <span>Moderasi Komunitas</span>
            {pendingReportsCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-red-500 text-slate-950 font-black text-[10px] flex items-center justify-center">
                {pendingReportsCount}
              </span>
            )}
          </Link>

          {/* Link 3: Catalog Manager */}
          <Link
            to="/admin/catalog"
            id="admin-tab-catalog"
            className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'catalog'
                ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-[#FFD000] border border-amber-500/40 shadow-lg shadow-amber-950/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-850 border border-transparent'
            }`}
          >
            <Film className={`w-4 h-4 ${activeTab === 'catalog' ? 'text-[#FFD000]' : 'text-slate-400'}`} />
            <span>Database Film & Series</span>
          </Link>

          {/* Link 4: Storage Files */}
          <Link
            to="/admin/storage"
            id="admin-tab-storage"
            className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'storage'
                ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-emerald-950/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-850 border border-transparent'
            }`}
          >
            <HardDrive className={`w-4 h-4 ${activeTab === 'storage' ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>Arsip Media & Berkas</span>
          </Link>

          {/* Link 5: Full Control CMS Standalone URL */}
          <Link
            to="/admin/cms"
            id="admin-tab-cms"
            className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              location.pathname === '/admin/cms' || location.pathname === '/cms'
                ? 'bg-gradient-to-r from-purple-500/20 to-purple-600/10 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-950/30'
                : 'text-slate-400 hover:text-purple-300 hover:bg-slate-850 border border-purple-500/20'
            }`}
          >
            <FileText className="w-4 h-4 text-purple-400" />
            <span>Full Control CMS</span>
            <ExternalLink className="w-3 h-3 text-purple-400" />
          </Link>

          {/* Link 6: Critic Submissions Standalone URL */}
          <Link
            to="/admin/submissions"
            id="admin-tab-submissions"
            className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              location.pathname === '/admin/submissions'
                ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-950/30'
                : 'text-slate-400 hover:text-amber-300 hover:bg-slate-850 border border-amber-500/20'
            }`}
          >
            <Award className="w-4 h-4 text-amber-400" />
            <span>Verifikasi Kritikus</span>
            {pendingCriticsCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center">
                {pendingCriticsCount}
              </span>
            )}
            <ExternalLink className="w-3 h-3 text-amber-400" />
          </Link>
        </nav>

        {/* Section Contents Rendered based on Standalone URL */}
        <div className="pt-2">
          {activeTab === 'users' && <AdminUserManagement />}
          {activeTab === 'moderation' && <AdminModeration />}
          {activeTab === 'catalog' && <AdminCatalogManager />}
          {activeTab === 'storage' && <AdminStorageFiles />}
        </div>
      </div>

    </div>
  );
};

