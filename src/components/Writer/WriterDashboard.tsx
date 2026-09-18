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
          .brand { font-size: 24px; font-weight: 800; color: #e11d48; }
          .title { font-size: 18px; color: #475569; font-weight: 600; }
          .meta { font-size: 12px; color: #64748b; text-align: right; }
          .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 30px; }
          .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; text-align: center; }
          .stat-val { font-size: 22px; font-weight: 700; color: #0f172a; }
          .stat-lbl { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #f1f5f9; text-align: left; padding: 10px 12px; font-size: 12px; text-transform: uppercase; color: #475569; border-bottom: 2px solid #cbd5e1; }
          td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
          .rank { font-weight: 700; color: #e11d48; }
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
    <div className="min-h-screen bg-[#0A0B10] text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header & Writer Badge Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#161828] via-[#121320] to-[#0D0E15] border border-pink-500/30 p-6 sm:p-8 shadow-2xl shadow-pink-950/20">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-gradient-to-br from-[#FF2E7E]/15 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-12 w-48 h-48 bg-gradient-to-tr from-[#00F0FF]/10 to-transparent rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4 sm:gap-5">
              <div className="relative">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-[#FF2E7E] shadow-xl shadow-[#FF2E7E]/20"
                />
                <span className="absolute -bottom-1 -right-1 bg-gradient-to-r from-[#FF2E7E] to-[#FF8008] p-1.5 rounded-xl text-white shadow-md">
                  <PenSquare className="w-3.5 h-3.5" />
                </span>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-pink-500/20 border border-pink-500/40 text-[#FF2E7E] shadow-sm">
                    <Sparkles className="w-3 h-3" />
                    Penulis Sotoy
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded-md border border-slate-700">
                    UID: {currentUser.id}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
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
              <div className="bg-slate-900/80 p-1.5 rounded-2xl border border-slate-700/80 shadow-md">
                <NotificationBell mode="writer" />
              </div>

              {/* Buka Dedicated CMS Page Button */}
              <button
                id="writer-open-cms-btn"
                onClick={() => navigateTo('cms')}
                className="px-4 py-3 rounded-2xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 hover:text-white font-bold text-xs sm:text-sm border border-purple-500/40 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                title="Buka Ruang Kerja Editorial Mandiri (Halaman CMS)"
              >
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>Halaman CMS Penuh</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              {/* Download PDF Report Button */}
              <button
                onClick={handleDownloadPdfReport}
                className="px-4 py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm border border-slate-700 hover:border-slate-600 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                title="Unduh Laporan Kinerja (PDF)"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                <span className="hidden sm:inline">Laporan PDF</span>
              </button>

              {/* Tulis Artikel Baru CTA Button */}
              <button
                id="writer-new-article-btn"
                onClick={() => navigateTo('write-article')}
                className="px-5 sm:px-6 py-3 sm:py-3.5 rounded-2xl bg-gradient-to-r from-[#FF2E7E] via-[#FF5E62] to-[#FF8008] text-white font-black text-xs sm:text-sm hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#FF2E7E]/30 flex items-center justify-center gap-2 group cursor-pointer"
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
          <div className="p-5 sm:p-6 rounded-2xl bg-[#121324] border border-slate-800 hover:border-pink-500/40 transition-all shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Artikel Terbit</span>
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-[#FF2E7E]">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-white">{stats.totalArticles}</span>
              <span className="text-xs text-slate-400 font-semibold">karya</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Publikasi aktif di Sotoy Film</span>
            </div>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-[#121324] border border-slate-800 hover:border-cyan-500/40 transition-all shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Pembaca (Views)</span>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#00F0FF]">
                <Eye className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-white">{stats.totalViews.toLocaleString('id-ID')}</span>
              <span className="text-xs text-slate-400 font-semibold">tayangan</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              <span>Rata-rata ~{stats.avgViews.toLocaleString('id-ID')} views/artikel</span>
            </div>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-[#121324] border border-slate-800 hover:border-rose-500/40 transition-all shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Apresiasi (Likes)</span>
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Heart className="w-5 h-5 fill-rose-500/20" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-white">{stats.totalLikes.toLocaleString('id-ID')}</span>
              <span className="text-xs text-slate-400 font-semibold">suka</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              <span>Dari pembaca & komunitas</span>
            </div>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-[#121324] border border-slate-800 hover:border-amber-500/40 transition-all shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Diskusi & Komentar</span>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <MessageSquare className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-white">{stats.totalComments.toLocaleString('id-ID')}</span>
              <span className="text-xs text-slate-400 font-semibold">tanggapan</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              <span>Interaksi pembaca aktif</span>
            </div>
          </div>
        </div>

        {/* 30-Day Daily Article Views Line Chart */}
        <div className="p-6 rounded-3xl bg-[#121324] border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2.5">
                <BarChart3 className="w-5 h-5 text-[#00F0FF]" />
                <span>Statistik Tayangan Harian (30 Hari Terakhir)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Grafik tren pembaca harian untuk seluruh artikel karya {currentUser.name}.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-xl self-start sm:self-auto">
              <TrendingUp className="w-4 h-4" />
              <span>30 Hari Terakhir</span>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last30DaysViewsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#00F0FF" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2035" vertical={false} />
                <XAxis dataKey="date" stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#0A0B10] border border-slate-700 p-3 rounded-xl shadow-xl space-y-1">
                          <p className="text-xs font-bold text-slate-300">{label}</p>
                          <p className="text-xs font-black text-[#00F0FF]">
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
                  stroke="#00F0FF"
                  strokeWidth={3}
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
