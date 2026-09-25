import React from 'react';
import { Link } from 'react-router-dom';
import { Users, FileText, MessageSquare, Film, TrendingUp, Sparkles, Shield, Award, PenSquare, ArrowUpRight } from 'lucide-react';
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
      <Link 
        to="/admin/analytics" 
        className="bg-[#171A1F] border border-white/10 hover:border-[#FF2E7E]/50 rounded-2xl p-5 shadow-sm relative overflow-hidden group transition-all block cursor-pointer"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-400 block group-hover:text-white transition-colors">Total Warga & Kritikus</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#FF2E7E] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-white tracking-tight tabular-nums">{totalUsers}</span>
              <span className="text-[10px] font-bold text-[#FF2E7E] uppercase tracking-wider">User Aktif</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-slate-300 shrink-0 group-hover:scale-105 transition-transform">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Role breakdown chips */}
        <div className="mt-3.5 pt-3 border-t border-white/10 flex flex-wrap items-center gap-1.5 text-[10px]">
          <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-slate-300 border border-white/10 font-medium">
            {wargaCount} Warga
          </span>
          <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-slate-300 border border-white/10 font-medium">
            {criticCount} Kritikus
          </span>
          <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-slate-300 border border-white/10 font-medium">
            {writerCount} Penulis
          </span>
          <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-slate-300 border border-white/10 font-medium">
            {adminCount} Admin
          </span>
        </div>
      </Link>

      {/* 2. Total Artikel Terbit & Draft */}
      <div className="bg-[#171A1F] border border-white/10 hover:border-white/20 rounded-2xl p-5 shadow-sm relative overflow-hidden group transition-all">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 block">Total Artikel Editorial</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-white tracking-tight tabular-nums">{totalArticles}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Katalog CMS</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-slate-300 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Status breakdown chips */}
        <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center gap-2 text-[10px]">
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
            {publishedCount} Terbit
          </span>
          <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-slate-300 border border-white/10 font-medium">
            {draftCount} Draf
          </span>
          {scheduledCount > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-slate-300 border border-white/10 font-medium">
              {scheduledCount} Terjadwal
            </span>
          )}
        </div>
      </div>

      {/* 3. Total Diskusi & Komentar Warga */}
      <div className="bg-[#171A1F] border border-white/10 hover:border-white/20 rounded-2xl p-5 shadow-sm relative overflow-hidden group transition-all">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 block">Total Diskusi & Review</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-white tracking-tight tabular-nums">{totalInteractions}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aktivitas Warga</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-slate-300 shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>

        {/* Interaction breakdown chips */}
        <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center gap-2 text-[10px]">
          <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-slate-300 border border-white/10 font-medium">
            {totalBuzz} Buzz Post
          </span>
          <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-slate-300 border border-white/10 font-medium">
            {totalReplies} Komentar
          </span>
          <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-slate-300 border border-white/10 font-medium">
            {totalReviews} Review Film
          </span>
        </div>
      </div>

      {/* 4. Total Database Film & Series */}
      <div className="bg-[#171A1F] border border-white/10 hover:border-white/20 rounded-2xl p-5 shadow-sm relative overflow-hidden group transition-all">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 block">Total Database Film</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-white tracking-tight tabular-nums">{totalFilms}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Katalog Terindeks</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-slate-300 shrink-0">
            <Film className="w-5 h-5" />
          </div>
        </div>

        {/* Format breakdown chips */}
        <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center gap-2 text-[10px]">
          <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-slate-300 border border-white/10 font-medium">
            {moviesCount} Movies
          </span>
          <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-slate-300 border border-white/10 font-medium">
            {seriesCount} Series
          </span>
          <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-slate-300 border border-white/10 font-medium">
            {animeCount} Anime
          </span>
        </div>
      </div>
    </div>
  );
};
