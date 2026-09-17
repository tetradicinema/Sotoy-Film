import React, { useMemo } from 'react';
import { 
  FileText, 
  Eye, 
  Plus, 
  Clock, 
  ThumbsUp, 
  ShieldCheck,
  PenSquare
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CMSArticleTable } from '../CMS/CMSArticleTable';

interface CMSArticleWorkspaceProps {
  mode?: 'writer' | 'admin' | 'auto';
  title?: string;
  subtitle?: string;
  showCreateButton?: boolean;
}

export const CMSArticleWorkspace: React.FC<CMSArticleWorkspaceProps> = ({
  mode = 'auto',
  title,
  subtitle,
  showCreateButton = true,
}) => {
  const { 
    articles, 
    navigateTo, 
    currentUser,
    isAdmin: isAppAdmin,
  } = useApp();

  const isLoading = false;

  // Determine RBAC Scope
  const isAdminView = useMemo(() => {
    if (mode === 'admin') return true;
    if (mode === 'writer') return false;
    return isAppAdmin || currentUser.role === 'admin';
  }, [mode, isAppAdmin, currentUser.role]);

  // Scope Articles based on Role
  const scopedArticles = useMemo(() => {
    if (isAdminView) {
      return articles;
    }
    return articles.filter(a => a.author?.id === currentUser.id || a.authorId === currentUser.id);
  }, [articles, isAdminView, currentUser.id]);

  // Performance Metrics Summary Cards
  const metrics = useMemo(() => {
    const total = scopedArticles.length;
    const views = scopedArticles.reduce((acc, curr) => acc + (curr.views || 0), 0);
    const draftsAndScheduled = scopedArticles.filter(a => a.status === 'draft' || a.status === 'scheduled').length;
    const engagement = scopedArticles.reduce((acc, curr) => acc + (curr.likes || 0) + (curr.commentsCount || 0), 0);

    return { total, views, draftsAndScheduled, engagement };
  }, [scopedArticles]);

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display font-black text-2xl text-white tracking-tight flex items-center gap-2.5">
            <span>{title || (isAdminView ? 'CMS Artikel & Redaksi' : 'Konten & CMS Saya')}</span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-sans font-bold flex items-center gap-1 border ${
              isAdminView 
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' 
                : 'bg-pink-500/20 text-pink-300 border-pink-500/30'
            }`}>
              {isAdminView ? <ShieldCheck className="w-3.5 h-3.5" /> : <PenSquare className="w-3.5 h-3.5" />}
              {isAdminView ? 'Full Control CMS' : 'Writer Mini-CMS'}
            </span>
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            {subtitle || (isAdminView 
              ? 'Kelola seluruh artikel, draf, jadwal rilis, serta penugasan penulis di platform.' 
              : 'Kelola artikel tulisan Anda, draf editorial, dan analisis keterbacaan artikel.')}
          </p>
        </div>

        {showCreateButton && (
          <button
            id="cms-write-article-btn"
            onClick={() => navigateTo('write-article')}
            className="self-start sm:self-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF2E7E] to-pink-600 hover:from-pink-500 hover:to-pink-600 text-white font-bold text-xs shadow-lg shadow-pink-950/40 transition-all flex items-center gap-2 shrink-0 border border-pink-400/30 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tulis Artikel Baru</span>
          </button>
        )}
      </div>

      {/* 1. PERFORMANCE METRICS SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Articles */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-xl backdrop-blur-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 rounded-full blur-2xl group-hover:bg-pink-500/10 transition-all"></div>
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Total Artikel ({isAdminView ? 'Semua' : 'Saya'})</span>
            <div className="w-7 h-7 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-[#FF2E7E]">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {isLoading ? <div className="h-8 w-16 bg-slate-800 animate-pulse rounded"></div> : metrics.total.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-medium">
            Tersimpan di database Firestore
          </div>
        </div>

        {/* Metric 2: Total Views */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-xl backdrop-blur-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all"></div>
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Pembaca / Views</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {isLoading ? <div className="h-8 w-16 bg-slate-800 animate-pulse rounded"></div> : metrics.views.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-400/80 mt-1 font-medium flex items-center gap-1">
            <span>Total tayangan artikel</span>
          </div>
        </div>

        {/* Metric 3: Drafts & Scheduled */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-xl backdrop-blur-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all"></div>
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Draf & Terjadwal</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {isLoading ? <div className="h-8 w-16 bg-slate-800 animate-pulse rounded"></div> : metrics.draftsAndScheduled.toLocaleString()}
          </div>
          <div className="text-[10px] text-amber-300/80 mt-1 font-medium">
            Belum dipublikasi publik
          </div>
        </div>

        {/* Metric 4: Engagement */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-xl backdrop-blur-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-all"></div>
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Interaksi & Suka</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <ThumbsUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {isLoading ? <div className="h-8 w-16 bg-slate-800 animate-pulse rounded"></div> : metrics.engagement.toLocaleString()}
          </div>
          <div className="text-[10px] text-purple-300/80 mt-1 font-medium">
            Akumulasi Like + Komentar
          </div>
        </div>
      </div>

      {/* 2. THE CMS ARTICLE TABLE MODULE */}
      <CMSArticleTable mode={mode} />

    </div>
  );
};
