import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  PenSquare, 
  ArrowLeft, 
  Plus, 
  Eye, 
  FileText, 
  Sparkles, 
  ExternalLink,
  Layers,
  BarChart3,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { auth } from '../../lib/firebase';
import { CMSArticleWorkspace } from './CMSArticleWorkspace';
import { SEOHead } from '../SEO/SEOHead';
import { RoleBadge } from '../Common/RoleBadge';

export const CMSPage: React.FC = () => {
  const { 
    currentUser, 
    isAdmin: isAppAdmin, 
    isWriter,
    navigateTo 
  } = useApp();

  const isUserAdmin = isAppAdmin || currentUser.role === 'admin' || (currentUser.email === 'eksposurmedia@gmail.com' && auth.currentUser?.emailVerified === true);
  const isUserWriter = isWriter || currentUser.role === 'penulis_sotoy' || currentUser.id === '0PCmaBvJrzeaQgpf3sSTC4mnsh02';
  const isAuthorized = isUserAdmin || isUserWriter;

  // For admins, allow toggling between full platform control (all articles) or their own articles
  const [adminScope, setAdminScope] = useState<'all' | 'mine'>('all');

  if (!isAuthorized) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-16">
        <SEOHead 
          title="Akses CMS Terbatas - Sotoy Film" 
          description="Halaman CMS editorial artikel hanya dapat diakses oleh tim redaksi dan admin." 
        />
        <div className="max-w-lg w-full bg-[#171A1F] border border-purple-500/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl shadow-purple-950/40">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mx-auto text-purple-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h2 className="font-display font-black text-2xl text-white">
              Akses Full Control CMS Terbatas
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-2 leading-relaxed">
              Halaman ini adalah ruang kerja editorial khusus Administrator dan Penulis Resmi Sotoy Film. Akun Anda saat ini belum memiliki hak akses ke modul redaksi ini.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              id="cms-forbidden-back-home-btn"
              onClick={() => navigateTo('home')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-900/40 transition-all cursor-pointer"
            >
              Kembali ke Beranda
            </button>
            <button
              id="cms-forbidden-critic-join-btn"
              onClick={() => navigateTo('critic-submission')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
            >
              Gabung Tim Penulis / Kritikus
            </button>
          </div>
        </div>
      </div>
    );
  }

  const effectiveMode = isUserAdmin ? (adminScope === 'all' ? 'admin' : 'writer') : 'writer';

  return (
    <div className="min-h-screen py-8">
      <SEOHead 
        title={isUserAdmin ? "Full Control CMS & Editorial - Sotoy Film" : "Workspace Penulis (CMS) - Sotoy Film"} 
        description="Panel kendali editorial penuh untuk pengelolaan artikel, draf publikasi, analitik keterbacaan, dan tim penulis Sotoy Film." 
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 animate-in fade-in duration-300">
        
        {/* Top Breadcrumb & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <button 
              onClick={() => navigateTo('home')} 
              className="hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
            >
              Beranda
            </button>
            <span>/</span>
            {isUserAdmin ? (
              <Link 
                to="/admin" 
                className="hover:text-white transition-colors cursor-pointer"
              >
                Admin Control Center
              </Link>
            ) : (
              <Link 
                to="/writer" 
                className="hover:text-white transition-colors cursor-pointer"
              >
                Dasbor Penulis
              </Link>
            )}
            <span>/</span>
            <span className="text-[#FF2E7E] font-bold">
              {isUserAdmin ? 'Full Control CMS' : 'Editor Workspace'}
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {isUserAdmin && (
              <Link
                to="/admin"
                id="cms-nav-admin-dashboard-btn"
                className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-750 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>Admin Dashboard</span>
              </Link>
            )}
            {isUserWriter && (
              <button
                id="cms-nav-writer-dashboard-btn"
                onClick={() => navigateTo('writer-dashboard')}
                className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-750 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <PenSquare className="w-3.5 h-3.5 text-pink-400" />
                <span>Dasbor Penulis</span>
              </button>
            )}
            <button
              id="cms-nav-public-view-btn"
              onClick={() => navigateTo('home')}
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-750 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-[#FF2E7E]" />
              <span>Tampilan Publik</span>
            </button>
            <button
              id="cms-nav-new-article-btn"
              onClick={() => navigateTo('write-article')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF2E7E] to-pink-600 hover:from-pink-500 hover:to-pink-600 text-white text-xs font-bold shadow-lg shadow-pink-950/40 flex items-center gap-1.5 transition-all cursor-pointer border border-pink-400/30 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Tulis Artikel Baru</span>
            </button>
          </div>
        </div>

        {/* Dedicated Page Hero Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#170e2b] via-[#171A1F] to-[#1a0f2e] border-2 border-[#FF2E7E]/60 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-purple-950/40">
          <div className="absolute top-0 right-1/4 w-80 h-80 bg-[#FF2E7E]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#FF2E7E] to-[#A855F7] p-0.5 shadow-xl shadow-purple-600/30 shrink-0">
                <div className="w-full h-full bg-[#110e1d] rounded-[14px] flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-[#C48BFF] animate-pulse" />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="font-display font-black text-white text-2xl sm:text-3xl tracking-tight">
                    {isUserAdmin ? 'Full Control CMS & Editorial' : 'Ruang Kerja Redaksi & Artikel'}
                  </h1>

                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-black uppercase tracking-widest rounded-full shadow-lg border ${
                    isUserAdmin
                      ? 'bg-[#FF2E7E] text-white border-purple-400/40 shadow-purple-900/60'
                      : 'bg-pink-500/20 text-[#FF2E7E] border-pink-500/40 shadow-pink-900/40'
                  }`}>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-200"></span>
                    </span>
                    <span>{isUserAdmin ? 'FULL CONTROL CMS' : 'WRITER WORKSPACE'}</span>
                  </div>
                </div>

                <p className="text-slate-300 text-xs sm:text-sm mt-1.5 max-w-2xl leading-relaxed">
                  {isUserAdmin 
                    ? 'Halaman terpisah berdedikasi tinggi untuk mengelola seluruh konten artikel, draf redaksi, jadwal rilis berkala, reatribusi penulis, hingga pemantauan impresi pembaca platform.'
                    : 'Pusat komando editorial mandiri Anda untuk menyusun artikel mendalam, merevisi naskah draf, dan memantau performa keterbacaan karya.'}
                </p>
              </div>
            </div>

            {/* Admin Scope Switcher (All Articles vs. My Articles Only) */}
            {isUserAdmin && (
              <div className="bg-slate-950/60 border border-purple-500/30 p-2 rounded-2xl flex items-center gap-1.5 self-start lg:self-center">
                <button
                  id="cms-scope-all-btn"
                  onClick={() => setAdminScope('all')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    adminScope === 'all'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-950/40 border border-purple-400/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Semua Artikel ({currentUser.role === 'admin' ? 'Global' : 'Platform'})</span>
                </button>
                <button
                  id="cms-scope-mine-btn"
                  onClick={() => setAdminScope('mine')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    adminScope === 'mine'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-950/40 border border-purple-400/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <PenSquare className="w-3.5 h-3.5" />
                  <span>Artikel Saya Saja</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* The Full Featured CMS Article Workspace */}
        <div className="bg-[#171A1F] border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6">
          <CMSArticleWorkspace 
            mode={effectiveMode}
            title={isUserAdmin && adminScope === 'all' ? 'Katalog Seluruh Artikel Editorial' : 'Artikel & Draf Tulisan'}
            subtitle={
              isUserAdmin && adminScope === 'all'
                ? 'Semua artikel terbit, draf dalam antrian, dan artikel terjadwal dari seluruh staf penulis redaksi.'
                : 'Daftar tulisan dan draf artikel Anda sendiri.'
            }
            showCreateButton={false}
          />
        </div>

      </div>
    </div>
  );
};
