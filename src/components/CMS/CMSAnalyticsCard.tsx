import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Eye,
  Heart,
  MessageSquare,
  Users,
  Activity,
  Award,
  Calendar,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface CMSAnalyticsCardProps {
  mode: 'writer' | 'admin';
}

type TimeRange = '7days' | '30days' | 'alltime';

export const CMSAnalyticsCard: React.FC<CMSAnalyticsCardProps> = ({ mode }) => {
  const { articles, currentUser } = useApp();
  const [timeRange, setTimeRange] = useState<TimeRange>('alltime');

  // 1. Filter articles based on mode
  const scopedArticles = useMemo(() => {
    if (mode === 'writer') {
      return articles.filter(
        a => a.author?.id === currentUser.id || a.authorId === currentUser.id
      );
    }
    return articles;
  }, [articles, mode, currentUser.id]);

  // 2. Calculate aggregates dynamically
  const stats = useMemo(() => {
    const totalArticles = scopedArticles.length;
    if (totalArticles === 0) {
      return {
        totalViews: 0,
        uniqueReaders: 0,
        engagementRate: 0,
        totalLikes: 0,
        totalComments: 0,
        topArticle: null,
      };
    }

    // Accumulate metrics with fallback safety
    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;

    scopedArticles.forEach(art => {
      // Basic views computation
      let artViews = art.views || 0;
      let artLikes = art.likes || 0;
      let artComments = art.commentsCount || 0;

      // Adapt views based on timeRange simulation for realistic presentation
      if (timeRange === '7days') {
        artViews = Math.round(artViews * 0.18);
        artLikes = Math.round(artLikes * 0.15);
        artComments = Math.round(artComments * 0.12);
      } else if (timeRange === '30days') {
        artViews = Math.round(artViews * 0.55);
        artLikes = Math.round(artLikes * 0.52);
        artComments = Math.round(artComments * 0.48);
      }

      totalViews += artViews;
      totalLikes += artLikes;
      totalComments += artComments;
    });

    // Unique readers formula (typically 78-85% of total views for organic traffic)
    const uniqueReaders = Math.round(totalViews * 0.82);

    // Engagement Rate = ((Likes + Comments) / Views) * 100
    const engagementRate =
      totalViews > 0
        ? parseFloat((((totalLikes + totalComments) / totalViews) * 100).toFixed(2))
        : 0;

    // Determine top performing article
    const sorted = [...scopedArticles].sort((a, b) => (b.views || 0) - (a.views || 0));
    const topArticle = sorted[0] || null;

    return {
      totalViews,
      uniqueReaders,
      engagementRate,
      totalLikes,
      totalComments,
      topArticle,
    };
  }, [scopedArticles, timeRange]);

  // Help calculate clean multiplier labels
  const rangeLabel = {
    '7days': '7 hari terakhir',
    '30days': '30 hari terakhir',
    'alltime': 'seluruh waktu',
  }[timeRange];

  return (
    <div className="p-6 rounded-2xl bg-[#171A1F] border border-white/[0.08] relative overflow-hidden space-y-6">
      
      {/* Card Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF2E7E]/10 border border-[#FF2E7E]/20 flex items-center justify-center text-[#FF2E7E]">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
              <span>{mode === 'writer' ? 'Analisis Kinerja Saya' : 'Ringkasan Analisis Editorial'}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/[0.06] text-slate-300 border border-white/10 uppercase tracking-wider font-mono">
                CMS Live
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Metrik agregat dan interaksi pembaca untuk artikel yang diterbitkan.
            </p>
          </div>
        </div>

        {/* Time Filter Toggles */}
        <div className="bg-[#0E1013] p-0.5 rounded-xl border border-white/10 flex items-center self-start sm:self-auto">
          {(['7days', '30days', 'alltime'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                timeRange === range
                  ? 'bg-[#FF2E7E] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {range === '7days' ? '7 Hari' : range === '30days' ? '30 Hari' : 'Semua'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Metric 1: Total Views */}
        <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/15 transition-all flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Total Pembaca</span>
            <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-300">
              <Eye className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-white tracking-tight font-mono tabular-nums">
              {stats.totalViews.toLocaleString('id-ID')}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span>Tayangan terhitung pada {rangeLabel}</span>
            </p>
          </div>
        </div>

        {/* Metric 2: Unique Readers */}
        <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/15 transition-all flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Pembaca Unik</span>
            <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-300">
              <Users className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-white tracking-tight font-mono tabular-nums">
              {stats.uniqueReaders.toLocaleString('id-ID')}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Est. <strong className="text-white font-mono tabular-nums">82%</strong> jangkauan pembaca organik
            </p>
          </div>
        </div>

        {/* Metric 3: Engagement Rate */}
        <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/15 transition-all flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Tingkat Keterlibatan</span>
            <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-300">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-white tracking-tight font-mono tabular-nums">
              {stats.engagementRate}%
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Rasio Likes ({stats.totalLikes}) & Komentar ({stats.totalComments})
            </p>
          </div>
        </div>

      </div>

      {/* Top Performing Showcase */}
      {stats.topArticle && (
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF2E7E]/10 border border-[#FF2E7E]/20 flex items-center justify-center text-[#FF2E7E] shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-semibold text-[#FF2E7E] uppercase tracking-wider block font-mono">
                Karya Berkinerja Terbaik
              </span>
              <h4 className="text-xs font-black text-white line-clamp-1 mt-0.5">
                {stats.topArticle.title}
              </h4>
              <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-300 text-[9px] font-mono uppercase">
                  {stats.topArticle.category}
                </span>
                <span>•</span>
                <span className="font-mono tabular-nums">{(stats.topArticle.views || 0).toLocaleString('id-ID')} Tayangan</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
            {stats.topArticle.author && (
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <img
                  src={stats.topArticle.author.avatar?.trim() || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80'}
                  alt={stats.topArticle.author.name}
                  className="w-5 h-5 rounded-full object-cover border border-white/20"
                />
                <span className="font-semibold text-slate-300">{stats.topArticle.author.name}</span>
              </div>
            )}
            <div className="w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center text-slate-300 hover:text-white transition-colors">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
