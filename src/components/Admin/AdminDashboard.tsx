import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  FileText, 
  Users, 
  Film, 
  HardDrive, 
  Award, 
  ExternalLink, 
  Eye, 
  Sparkles,
  ArrowRight,
  Database,
  Lock,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { useApp, ADMIN_UIDS } from '../../context/AppContext';
import { AdminStatsOverview } from './AdminStatsOverview';
import { AdminCMSArticles } from './AdminCMSArticles';
import { AdminUserManagement } from './AdminUserManagement';
import { AdminModeration } from './AdminModeration';
import { AdminCatalogManager } from './AdminCatalogManager';
import { AdminStorageFiles } from './AdminStorageFiles';

type AdminTab = 'articles' | 'users' | 'moderation' | 'catalog' | 'storage';

export const AdminDashboard: React.FC = () => {
  const { 
    currentUser, 
    isAdmin, 
    navigateTo, 
    criticSubmissions, 
    moderationReports,
    showToast 
  } = useApp();

  const [activeTab, setActiveTab] = useState<AdminTab>('articles');

  const pendingCriticsCount = criticSubmissions.filter(s => s.status === 'pending').length;
  const pendingReportsCount = moderationReports.filter(r => r.status === 'pending').length;

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
                <span>Admin Utama Terotentikasi</span>
              </div>
              <div className="text-sm font-bold text-white mt-0.5">
                {currentUser.name} ({currentUser.email || 'Admin'})
              </div>
              <div className="text-[10px] font-mono text-purple-400/80 mt-0.5">
                UID: {currentUser.id}
              </div>
            </div>

            {/* Quick Switch Button to Public View */}
            <button
              onClick={() => navigateTo('home')}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Eye className="w-3.5 h-3.5 text-[#00F0FF]" />
              <span>Lihat Tampilan Publik</span>
            </button>
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
            <button
              onClick={() => navigateTo('admin-critic-submissions')}
              className="flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:underline bg-amber-500/15 px-3 py-1 rounded-full border border-amber-500/30"
            >
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>{pendingCriticsCount} Pengajuan Si Paling Sotoy Menunggu Review →</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. METRIK UTAMA PLATFORM (STATISTICS OVERVIEW - 4 KARTU) */}
      <AdminStatsOverview />

      {/* 3. MODUL MANAGEMENT UTAMA (TABS INTERFACE) */}
      <div className="space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-none">
          {/* Tab 1: CMS Artikel */}
          <button
            id="admin-tab-articles"
            onClick={() => setActiveTab('articles')}
            className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'articles'
                ? 'bg-gradient-to-r from-pink-500/20 to-pink-600/10 text-pink-300 border border-pink-500/40 shadow-lg shadow-pink-950/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-850 border border-transparent'
            }`}
          >
            <FileText className={`w-4 h-4 ${activeTab === 'articles' ? 'text-[#FF2E7E]' : 'text-slate-400'}`} />
            <span>CMS Artikel & Penulis</span>
          </button>

          {/* Tab 2: User Management */}
          <button
            id="admin-tab-users"
            onClick={() => setActiveTab('users')}
            className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'users'
                ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-600/10 text-[#00F0FF] border border-cyan-500/40 shadow-lg shadow-cyan-950/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-850 border border-transparent'
            }`}
          >
            <Users className={`w-4 h-4 ${activeTab === 'users' ? 'text-[#00F0FF]' : 'text-slate-400'}`} />
            <span>Manajemen Pengguna & Role</span>
          </button>

          {/* Tab 3: Moderation */}
          <button
            id="admin-tab-moderation"
            onClick={() => setActiveTab('moderation')}
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
          </button>

          {/* Tab 4: Catalog Manager */}
          <button
            id="admin-tab-catalog"
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'catalog'
                ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-[#FFD000] border border-amber-500/40 shadow-lg shadow-amber-950/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-850 border border-transparent'
            }`}
          >
            <Film className={`w-4 h-4 ${activeTab === 'catalog' ? 'text-[#FFD000]' : 'text-slate-400'}`} />
            <span>Database Film & Series</span>
          </button>

          {/* Tab 5: Storage Files */}
          <button
            id="admin-tab-storage"
            onClick={() => setActiveTab('storage')}
            className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'storage'
                ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-emerald-950/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-850 border border-transparent'
            }`}
          >
            <HardDrive className={`w-4 h-4 ${activeTab === 'storage' ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>Arsip Media & Berkas</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="pt-2">
          {activeTab === 'articles' && <AdminCMSArticles />}
          {activeTab === 'users' && <AdminUserManagement />}
          {activeTab === 'moderation' && <AdminModeration />}
          {activeTab === 'catalog' && <AdminCatalogManager />}
          {activeTab === 'storage' && <AdminStorageFiles />}
        </div>
      </div>

    </div>
  );
};
