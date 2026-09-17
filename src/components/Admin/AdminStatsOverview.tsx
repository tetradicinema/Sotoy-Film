import React from 'react';
import { Users, FileText, MessageSquare, Film, TrendingUp, Sparkles, Shield, Award, PenSquare } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getRoleBadgeStyle } from '../../utils/roleStyles';

export const AdminStatsOverview: React.FC = () => {
  const { allUsers, articles, buzzList, ratings, films } = useApp();

  // Metric 1: Total Users and role breakdown
  const totalUsers = allUsers.length;
  const wargaCount = allUsers.filter(u => u.role === 'warga_sotoy').length;
  const criticCount = allUsers.filter(u => u.role === 'si_paling_sotoy').length;
  const writerCount = allUsers.filter(u => u.role === 'penulis_sotoy').length;
  const adminCount = allUsers.filter(u => u.role === 'admin').length;

  // Metric 2: Total Articles
  const totalArticles = articles.length;
  const publishedCount = articles.filter(a => a.status === 'published' || !a.status).length;
  const draftCount = articles.filter(a => a.status === 'draft').length;
  const scheduledCount = articles.filter(a => a.status === 'scheduled').length;

  // Metric 3: Total Discussions & Comments
  const totalBuzz = buzzList.length;
  const totalReplies = buzzList.reduce((acc, b) => acc + (b.repliesCount || b.replies?.length || 0), 0);
  const totalReviews = ratings.length;
  const totalInteractions = totalBuzz + totalReplies + totalReviews;

  // Metric 4: Total Film & Series
  const totalFilms = films.length;
  const moviesCount = films.filter(f => f.type === 'movie' || !f.type).length;
  const seriesCount = films.filter(f => f.type === 'series').length;
  const animeCount = films.filter(f => f.type === 'anime').length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Warga & Kritikus */}
      <div className="bg-[#121324] border border-slate-800/80 hover:border-cyan-500/40 rounded-2xl p-5 shadow-lg relative overflow-hidden group transition-all">
        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 block">Total Warga & Kritikus</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-white tracking-tight">{totalUsers}</span>
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">User Aktif</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-[#00F0FF] shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Role breakdown chips */}
        <div className="mt-3.5 pt-3 border-t border-slate-800/60 flex flex-wrap items-center gap-1.5 text-[10px]">
          <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-[#00F0FF] border border-cyan-500/30 font-medium">
            {wargaCount} Warga
          </span>
          <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-[#FFD000] border border-amber-500/30 font-medium">
            {criticCount} Kritikus
          </span>
          <span className="px-2 py-0.5 rounded-md bg-pink-500/15 text-[#FF2E7E] border border-pink-500/30 font-medium">
            {writerCount} Penulis
          </span>
          <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30 font-medium">
            {adminCount} Admin
          </span>
        </div>
      </div>

      {/* 2. Total Artikel Terbit & Draft */}
      <div className="bg-[#121324] border border-slate-800/80 hover:border-pink-500/40 rounded-2xl p-5 shadow-lg relative overflow-hidden group transition-all">
        <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 block">Total Artikel Editorial</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-white tracking-tight">{totalArticles}</span>
              <span className="text-[10px] font-bold text-[#FF2E7E] uppercase tracking-wider">Katalog CMS</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-[#FF2E7E] shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Status breakdown chips */}
        <div className="mt-3.5 pt-3 border-t border-slate-800/60 flex items-center gap-2 text-[10px]">
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
            {publishedCount} Terbit
          </span>
          <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium">
            {draftCount} Draf
          </span>
          {scheduledCount > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30 font-medium">
              {scheduledCount} Terjadwal
            </span>
          )}
        </div>
      </div>

      {/* 3. Total Diskusi & Komentar Warga */}
      <div className="bg-[#121324] border border-slate-800/80 hover:border-emerald-500/40 rounded-2xl p-5 shadow-lg relative overflow-hidden group transition-all">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 block">Total Diskusi & Review</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-white tracking-tight">{totalInteractions}</span>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Aktivitas Warga</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>

        {/* Interaction breakdown chips */}
        <div className="mt-3.5 pt-3 border-t border-slate-800/60 flex items-center gap-2 text-[10px]">
          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium">
            {totalBuzz} Buzz Post
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium">
            {totalReplies} Komentar
          </span>
          <span className="px-2 py-0.5 rounded-md bg-[#FFD000]/15 text-[#FFD000] border border-[#FFD000]/30 font-medium">
            {totalReviews} Review Film
          </span>
        </div>
      </div>

      {/* 4. Total Database Film & Series */}
      <div className="bg-[#121324] border border-slate-800/80 hover:border-amber-500/40 rounded-2xl p-5 shadow-lg relative overflow-hidden group transition-all">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 block">Total Database Film</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-white tracking-tight">{totalFilms}</span>
              <span className="text-[10px] font-bold text-[#FFD000] uppercase tracking-wider">Katalog Terindeks</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[#FFD000] shrink-0">
            <Film className="w-5 h-5" />
          </div>
        </div>

        {/* Format breakdown chips */}
        <div className="mt-3.5 pt-3 border-t border-slate-800/60 flex items-center gap-2 text-[10px]">
          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium">
            {moviesCount} Movies
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium">
            {seriesCount} Series
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium">
            {animeCount} Anime
          </span>
        </div>
      </div>
    </div>
  );
};
