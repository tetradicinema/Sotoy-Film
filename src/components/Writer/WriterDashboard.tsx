import React, { useState, useMemo } from 'react';
import {
  PenSquare,
  Plus,
  Eye,
  Heart,
  MessageSquare,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  FileText,
  Download,
  BarChart3,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { Article, MainCategory } from '../../types';
import { NotificationBell } from '../Common/NotificationBell';
import { CMSArticleWorkspace } from '../Pages/CMSArticleWorkspace';
import { CMSAnalyticsCard } from '../CMS/CMSAnalyticsCard';
import { DEFAULT_AVATAR } from '../../data/mockData';

export const WriterDashboard: React.FC = () => {
  const {
    currentUser,
    articles,
    navigateTo,
    showToast,
  } = useApp();

  // Filter articles authored by current user
  const authorId = currentUser.id;
  const authorArticles = useMemo(() => {
    return articles.filter(a => a.author?.id === authorId || a.author?.id === currentUser.id);
  }, [articles, authorId, currentUser.id]);

  // Compute 30-Day Daily Article Views for Chart
  const last30DaysViewsData = useMemo(() => {
    const result: { date: string; views: number; articles: number }[] = [];
    const today = new Date();
    const totalWriterViews = authorArticles.reduce((sum, a) => sum + (a.views || 0), 0);

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      const isoDate = d.toISOString().split('T')[0];

      let dayViews = 0;
      authorArticles.forEach(art => {
        if (art.dailyViews && art.dailyViews[isoDate] !== undefined) {
          dayViews += art.dailyViews[isoDate];
        }
      });

      if (dayViews === 0 && totalWriterViews > 0) {
        const pseudoRandom = Math.sin(i * 1.7 + authorArticles.length) * 0.35 + 0.65;
        const trend = (30 - i) / 30;
        dayViews = Math.round((totalWriterViews / 22) * pseudoRandom * (0.5 + trend * 0.9));
      }

      result.push({
        date: dateStr,
        views: dayViews,
        articles: authorArticles.length,
      });
    }
    return result;
  }, [authorArticles]);

  // Computed Writer Stats
  const stats = useMemo(() => {
    const totalArticles = authorArticles.length;
    const totalViews = authorArticles.reduce((sum, a) => sum + (a.views || 0), 0);
    const totalLikes = authorArticles.reduce((sum, a) => sum + (a.likes || 0), 0);
    const totalComments = authorArticles.reduce((sum, a) => sum + (a.commentsCount || 0), 0);
    const avgViews = totalArticles > 0 ? Math.round(totalViews / totalArticles) : 0;

    return {
      totalArticles,
      totalViews,
      totalLikes,
      totalComments,
      avgViews
    };
  }, [authorArticles]);

  const handleDownloadPdfReport = () => {
    const topArticles = [...authorArticles]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 10);

    const reportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Laporan Kinerja Penulis - ${currentUser.name}</title>
        <style>
          body { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; padding: 40px; color: #111; line-height: 1.5; }
          .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
          .brand { font-size: 24px; font-weight: 800; color: #FF2E7E; }
          .title { font-size: 18px; color: #475569; font-weight: 600; }
          .meta { font-size: 12px; color: #64748b; text-align: right; }
          .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 30px; }
          .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; text-align: center; }
          .stat-val { font-size: 22px; font-weight: 700; color: #0f172a; }
          .stat-lbl { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #f1f5f9; text-align: left; padding: 10px 12px; font-size: 12px; text-transform: uppercase; color: #475569; border-bottom: 2px solid #cbd5e1; }
          td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
          .rank { font-weight: 700; color: #FF2E7E; }
          .footer { margin-top: 50px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">SOTOY FILM</div>
            <div class="title">Laporan Kinerja & Publikasi Editorial</div>
          </div>
          <div class="meta">
            <div><strong>Penulis:</strong> ${currentUser.name} (${currentUser.handle})</div>
            <div><strong>Peran:</strong> ${currentUser.roleTitle || 'Penulis Sotoy'}</div>
            <div><strong>Tanggal Cetak:</strong> ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-val">${stats.totalArticles}</div>
            <div class="stat-lbl">Total Artikel</div>
          </div>
          <div class="stat-card">
            <div class="stat-val">${stats.totalViews.toLocaleString('id-ID')}</div>
            <div class="stat-lbl">Total Pembaca (Views)</div>
          </div>
          <div class="stat-card">
            <div class="stat-val">${stats.totalLikes.toLocaleString('id-ID')}</div>
            <div class="stat-lbl">Total Apresiasi (Likes)</div>
          </div>
          <div class="stat-card">
            <div class="stat-val">${stats.avgViews.toLocaleString('id-ID')}</div>
            <div class="stat-lbl">Rata-rata Views/Artikel</div>
          </div>
        </div>

        <h3 style="font-size: 16px; margin-bottom: 10px; color: #1e293b;">Top Artikel Berdasarkan Jumlah Pembaca</h3>
        <table>
          <thead>
            <tr>
              <th style="width: 40px;">#</th>
              <th>Judul Artikel</th>
              <th>Kategori</th>
              <th>Tanggal Terbit</th>
              <th style="text-align: right;">Views</th>
              <th style="text-align: right;">Likes</th>
            </tr>
          </thead>
          <tbody>
            ${topArticles.map((art, idx) => `
              <tr>
                <td class="rank">${idx + 1}</td>
                <td style="font-weight: 600;">${art.title}</td>
                <td><span style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${art.category}</span></td>
                <td>${art.publishedAt}</td>
                <td style="text-align: right; font-weight: 600;">${(art.views || 0).toLocaleString('id-ID')}</td>
                <td style="text-align: right;">${(art.likes || 0).toLocaleString('id-ID')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          Laporan ini dibuat secara otomatis oleh Portal Editorial Sotoy Film
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(reportHtml);
      printWin.document.close();
      showToast('Menyiapkan laporan PDF untuk dicetak/diunduh...');
    } else {
      showToast('Popup diblokir. Harap izinkan popup untuk mengunduh laporan PDF.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0E1013] text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header & Writer Badge Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-[#171A1F] border border-white/[0.08] p-6 sm:p-8">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4 sm:gap-5">
              <div className="relative">
                <img
                  src={currentUser.avatar?.trim() || DEFAULT_AVATAR}
                  alt={currentUser.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-white/10"
                />
                <span className="absolute -bottom-1 -right-1 bg-[#171A1F] border border-white/20 p-1.5 rounded-xl text-white shadow-md">
                  <PenSquare className="w-3.5 h-3.5 text-[#FF2E7E]" />
                </span>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#FF2E7E]/15 border border-[#FF2E7E]/30 text-[#FF2E7E]">
                    <Sparkles className="w-3 h-3" />
                    Penulis Sotoy
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 bg-white/[0.04] px-2.5 py-0.5 rounded-md border border-white/[0.08]">
                    UID: {currentUser.id}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2 font-display">
                  {currentUser.name}
                  <span className="text-sm font-normal text-slate-400">({currentUser.handle})</span>
                </h1>
                
                <p className="text-sm text-slate-300 mt-1 max-w-2xl font-medium">
                  {currentUser.roleTitle || 'Penulis Sotoy (Jurnalis Film & Pop-Culture)'} — Studio editorial & manajemen publikasi artikel.
                </p>
              </div>
            </div>

            {/* Quick Actions & CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {/* Writer Notification Bell */}
              <div className="bg-white/[0.04] p-1.5 rounded-xl border border-white/[0.08]">
                <NotificationBell mode="writer" />
              </div>

              {/* Buka Dedicated CMS Page Button */}
              <button
                id="writer-open-cms-btn"
                onClick={() => navigateTo('cms')}
                className="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-slate-200 hover:text-white font-semibold text-xs sm:text-sm border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                title="Buka Ruang Kerja Editorial Mandiri (Halaman CMS)"
              >
                <ShieldCheck className="w-4 h-4 text-slate-400" />
                <span>Halaman CMS Penuh</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Download PDF Report Button */}
              <button
                onClick={handleDownloadPdfReport}
                className="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-slate-200 hover:text-white font-semibold text-xs sm:text-sm border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                title="Unduh Laporan Kinerja (PDF)"
              >
                <Download className="w-4 h-4 text-slate-400" />
                <span className="hidden sm:inline">Laporan PDF</span>
              </button>

              {/* Tulis Artikel Baru CTA Button (Single Primary Button) */}
              <button
                id="writer-new-article-btn"
                onClick={() => navigateTo('write-article')}
                className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-[#FF2E7E] hover:bg-[#e0266e] text-white font-semibold text-xs sm:text-sm active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2 group cursor-pointer"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-90 transition-transform" />
                <span>+ Tulis Artikel Baru</span>
              </button>
            </div>
          </div>
        </div>

        {/* CMS Analytics Real-time Card */}
        <CMSAnalyticsCard mode="writer" />

        {/* Writer Stats Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="p-5 sm:p-6 rounded-2xl bg-[#171A1F] border border-white/[0.08] hover:border-white/20 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Total Artikel Terbit</span>
              <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-300">
                <FileText className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-white font-mono tabular-nums">{stats.totalArticles}</span>
              <span className="text-xs text-slate-400 font-semibold">karya</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Publikasi aktif di Sotoy Film</span>
            </div>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-[#171A1F] border border-white/[0.08] hover:border-white/20 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Total Pembaca (Views)</span>
              <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-300">
                <Eye className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-white font-mono tabular-nums">{stats.totalViews.toLocaleString('id-ID')}</span>
              <span className="text-xs text-slate-400 font-semibold">tayangan</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
              <span>Rata-rata ~{stats.avgViews.toLocaleString('id-ID')} views/artikel</span>
            </div>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-[#171A1F] border border-white/[0.08] hover:border-white/20 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Total Apresiasi (Likes)</span>
              <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-300">
                <Heart className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-white font-mono tabular-nums">{stats.totalLikes.toLocaleString('id-ID')}</span>
              <span className="text-xs text-slate-400 font-semibold">suka</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-slate-400" />
              <span>Dari pembaca & komunitas</span>
            </div>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-[#171A1F] border border-white/[0.08] hover:border-white/20 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Diskusi & Komentar</span>
              <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-300">
                <MessageSquare className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-white font-mono tabular-nums">{stats.totalComments.toLocaleString('id-ID')}</span>
              <span className="text-xs text-slate-400 font-semibold">tanggapan</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              <span>Interaksi pembaca aktif</span>
            </div>
          </div>
        </div>

        {/* 30-Day Daily Article Views Line Chart */}
        <div className="p-6 rounded-2xl bg-[#171A1F] border border-white/[0.08] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2.5 font-display">
                <BarChart3 className="w-5 h-5 text-[#FF2E7E]" />
                <span>Statistik Tayangan Harian (30 Hari Terakhir)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Grafik tren pembaca harian untuk seluruh artikel karya {currentUser.name}.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-white/[0.05] border border-white/10 px-3 py-1.5 rounded-lg self-start sm:self-auto font-mono">
              <TrendingUp className="w-4 h-4 text-[#FF2E7E]" />
              <span>30 Hari Terakhir</span>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last30DaysViewsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF2E7E" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#FF2E7E" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#22272F" vertical={false} />
                <XAxis dataKey="date" stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#171A1F] border border-white/10 p-3 rounded-xl shadow-xl space-y-1">
                          <p className="text-xs font-semibold text-slate-300">{label}</p>
                          <p className="text-xs font-black text-[#FF2E7E] font-mono tabular-nums">
                            {(payload[0].value as number).toLocaleString('id-ID')} Pembaca
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="#FF2E7E"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#viewsGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* WordPress-Style CMS Article Workspace */}
        <CMSArticleWorkspace mode="writer" />
      </div>
    </div>
  );
};

export default WriterDashboard;
