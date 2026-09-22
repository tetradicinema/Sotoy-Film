import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp,
  Award,
  Sparkles,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Flame,
  Star,
  MessageSquare,
  Eye,
  Film,
  Layers,
  ChevronRight,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { FilmItem } from '../../types';

type Timeframe = '7d' | '30d' | 'all';
type ViewMode = 'genres' | 'categories' | 'ratings' | 'activity';

interface GenreStat {
  name: string;
  totalVotes: number;
  avgScore: number;
  filmCount: number;
  engagement: number;
  color: string;
}

interface CategoryStat {
  category: string;
  label: string;
  avgScore: number;
  articlesCount: number;
  totalViews: number;
  interactionScore: number;
  color: string;
}

const GENRE_COLORS: Record<string, string> = {
  'Sci-Fi': '#00F0FF',
  'Drama': '#FF2E7E',
  'Action': '#FFB800',
  'Thriller': '#A855F7',
  'Crime': '#EC4899',
  'Animation': '#10B981',
  'Romance': '#F43F5E',
  'Horror': '#8B5CF6',
  'Adventure': '#3B82F6',
  'Lainnya': '#64748B',
};

const RATING_RANGE_COLORS = [
  { name: '9.0 - 10.0 (Mahakarya)', color: '#FF2E7E', valueKey: 'masterpiece' },
  { name: '8.0 - 8.9 (Sangat Bagus)', color: '#00F0FF', valueKey: 'excellent' },
  { name: '7.0 - 7.9 (Rekomendasi)', color: '#10B981', valueKey: 'recommended' },
  { name: '5.0 - 6.9 (Rata-rata)', color: '#F59E0B', valueKey: 'average' },
  { name: '< 5.0 (Kurang Recommended)', color: '#64748B', valueKey: 'low' },
];

/**
 * Custom Tooltip for Recharts styled with Sotoy Film dark theme & neon borders
 */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#151628]/95 backdrop-blur-md border border-[#00F0FF]/40 rounded-xl p-3.5 shadow-2xl text-xs space-y-1.5 min-w-[170px] z-50">
        <p className="font-black text-white text-sm border-b border-slate-700/60 pb-1.5 mb-1.5 flex items-center justify-between">
          <span>{label}</span>
          <Sparkles className="w-3.5 h-3.5 text-[#00F0FF]" />
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={`tooltip-item-${index}`} className="flex items-center justify-between gap-3 text-slate-300">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
              {entry.name}:
            </span>
            <span className="font-bold text-white">
              {typeof entry.value === 'number'
                ? entry.value % 1 !== 0
                  ? entry.value.toFixed(1)
                  : entry.value.toLocaleString('id-ID')
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const SotoyTrendsDashboard: React.FC = () => {
  const { films, articles, buzzList, ratings, navigateTo } = useApp();
  const [timeframe, setTimeframe] = useState<Timeframe>('30d');
  const [activeTab, setActiveTab] = useState<ViewMode>('genres');

  // Multiplier for timeframe simulation filtering
  const timeMultiplier = timeframe === '7d' ? 0.35 : timeframe === '30d' ? 1.0 : 2.4;

  // 1. Calculate Genre Stats
  const genreData = useMemo(() => {
    const genreMap: Record<string, { totalVotes: number; totalScore: number; filmCount: number }> = {};

    films.forEach((film) => {
      const genres = film.genres && film.genres.length > 0 ? film.genres : ['Drama'];
      genres.forEach((genre) => {
        if (!genreMap[genre]) {
          genreMap[genre] = { totalVotes: 0, totalScore: 0, filmCount: 0 };
        }
        genreMap[genre].totalVotes += Math.round((film.totalVotes || 120) * timeMultiplier);
        genreMap[genre].totalScore += (film.skorSotoy || 7.5);
        genreMap[genre].filmCount += 1;
      });
    });

    const result: GenreStat[] = Object.entries(genreMap)
      .map(([name, data]) => {
        const avgScore = Number((data.totalScore / data.filmCount).toFixed(1));
        const engagement = Math.round(data.totalVotes * (avgScore / 5));
        return {
          name,
          totalVotes: data.totalVotes,
          avgScore,
          filmCount: data.filmCount,
          engagement,
          color: GENRE_COLORS[name] || '#FF2E7E',
        };
      })
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 8);

    return result;
  }, [films, timeMultiplier]);

  // 2. Calculate Category Stats
  const categoryData = useMemo(() => {
    const categoriesConfig: { category: string; label: string; color: string }[] = [
      { category: 'movies', label: 'Movies & Film', color: '#FF2E7E' },
      { category: 'series', label: 'Series TV', color: '#00F0FF' },
      { category: 'anime', label: 'Anime & Animasi', color: '#10B981' },
      { category: 'cinema-gear', label: 'Cinema Gear', color: '#FFB800' },
      { category: 'film-studies', label: 'Film Studies', color: '#A855F7' },
    ];

    return categoriesConfig.map((cfg) => {
      const categoryArticles = articles.filter((a) => a.category === cfg.category);
      const totalViews = categoryArticles.reduce((acc, a) => acc + (a.views || 0), 0) * timeMultiplier;
      const totalLikes = categoryArticles.reduce((acc, a) => acc + (a.likes || 0), 0) * timeMultiplier;

      // Category films score
      const matchingFilms = films.filter((f) => {
        if (cfg.category === 'movies') return f.type === 'movie';
        if (cfg.category === 'series') return f.type === 'series';
        if (cfg.category === 'anime') return f.type === 'anime';
        return true;
      });

      const avgScore = matchingFilms.length > 0
        ? Number((matchingFilms.reduce((acc, f) => acc + (f.skorSotoy || 8.0), 0) / matchingFilms.length).toFixed(1))
        : 8.2;

      const interactionScore = Math.round((totalViews * 0.4) + (totalLikes * 3) + (categoryArticles.length * 50));

      return {
        category: cfg.category,
        label: cfg.label,
        avgScore,
        articlesCount: categoryArticles.length,
        totalViews: Math.round(totalViews),
        interactionScore: Math.max(interactionScore, 120),
        color: cfg.color,
      };
    });
  }, [articles, films, timeMultiplier]);

  // 3. Rating Distribution Pie/Bar Data
  const ratingDistributionData = useMemo(() => {
    let masterpiece = 0;
    let excellent = 0;
    let recommended = 0;
    let average = 0;
    let low = 0;

    films.forEach((f) => {
      const score = f.skorSotoy || 7.5;
      if (score >= 9.0) masterpiece++;
      else if (score >= 8.0) excellent++;
      else if (score >= 7.0) recommended++;
      else if (score >= 5.0) average++;
      else low++;
    });

    return [
      { name: '9.0-10.0 (Mahakarya)', value: Math.max(masterpiece, 3), color: '#FF2E7E' },
      { name: '8.0-8.9 (Sangat Bagus)', value: Math.max(excellent, 6), color: '#00F0FF' },
      { name: '7.0-7.9 (Rekomendasi)', value: Math.max(recommended, 8), color: '#10B981' },
      { name: '5.0-6.9 (Rata-rata)', value: Math.max(average, 4), color: '#F59E0B' },
      { name: '< 5.0 (Kurang Recommended)', value: Math.max(low, 2), color: '#64748B' },
    ];
  }, [films]);

  // 4. Radar Chart Comparison Data
  const radarData = useMemo(() => {
    return [
      { subject: 'Skor Kurator', Movies: 88, Series: 84, Anime: 92 },
      { subject: 'Popularitas', Movies: 95, Series: 89, Anime: 78 },
      { subject: 'Volume Buzz', Movies: 90, Series: 86, Anime: 82 },
      { subject: 'Sotoy Rating', Movies: 86, Series: 88, Anime: 90 },
      { subject: 'Viralitas', Movies: 92, Series: 91, Anime: 85 },
    ];
  }, []);

  // Top trending film highlight
  const topTrendingFilms = useMemo(() => {
    return [...films]
      .sort((a, b) => (b.skorSotoy * (b.totalVotes || 100)) - (a.skorSotoy * (a.totalVotes || 100)))
      .slice(0, 4);
  }, [films]);

  // Aggregate stats summary
  const totalVotesCount = useMemo(() => {
    return films.reduce((acc, f) => acc + (f.totalVotes || 150), 0);
  }, [films]);

  const topGenre = genreData[0]?.name || 'Sci-Fi';

  return (
    <section id="sotoy-trends-dashboard" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header Container */}
      <div className="bg-gradient-to-r from-[#151628] via-[#121324] to-[#18192E] border border-slate-800/90 rounded-3xl p-6 sm:p-8 mb-8 relative overflow-hidden shadow-2xl">
        {/* Ambient background glows */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#FF2E7E]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#00F0FF]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF2E7E]/15 border border-[#FF2E7E]/40 text-[#FF2E7E] text-xs font-black uppercase tracking-wider mb-3">
              <TrendingUp className="w-3.5 h-3.5 animate-pulse" />
              <span>Analytics & Radar Trend</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <span>Sotoy Trends Dashboard</span>
              <Sparkles className="w-6 h-6 text-[#00F0FF]" />
            </h2>
            <p className="text-sm text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
              Analisis performa genre film, skor kurator, dan dinamika preferensi komunitas sinema berdasarkan impresi ulasan warga Sotoy.
            </p>
          </div>

          {/* Timeframe Selector Pill */}
          <div className="flex items-center gap-1.5 bg-[#0A0B12]/80 p-1.5 rounded-2xl border border-slate-800 shrink-0 self-start md:self-auto">
            {(['7d', '30d', 'all'] as Timeframe[]).map((tf) => (
              <button
                key={`timeframe-${tf}`}
                id={`btn-timeframe-${tf}`}
                onClick={() => setTimeframe(tf)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  timeframe === tf
                    ? 'bg-gradient-to-r from-[#FF2E7E] to-[#E0266F] text-white shadow-lg shadow-[#FF2E7E]/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {tf === '7d' ? '7 Hari' : tf === '30d' ? '30 Hari' : 'Semua Masa'}
              </button>
            ))}
          </div>
        </div>

        {/* Quick KPI Stat Highlights */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800/80">
          <div className="bg-[#0D0E17]/80 rounded-2xl p-4 border border-slate-800/60">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1">
              <span>Genre Teratas</span>
              <Flame className="w-4 h-4 text-[#FF2E7E]" />
            </div>
            <div className="text-xl font-black text-white">{topGenre}</div>
            <div className="text-[11px] text-emerald-400 font-bold mt-1 flex items-center gap-1">
              <span>+24.8% Interaksi</span>
            </div>
          </div>

          <div className="bg-[#0D0E17]/80 rounded-2xl p-4 border border-slate-800/60">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1">
              <span>Rata-Rata Skor</span>
              <Star className="w-4 h-4 text-[#FFB800] fill-[#FFB800]" />
            </div>
            <div className="text-xl font-black text-white">8.4 / 10</div>
            <div className="text-[11px] text-[#00F0FF] font-bold mt-1">
              Sotoy Rating Score
            </div>
          </div>

          <div className="bg-[#0D0E17]/80 rounded-2xl p-4 border border-slate-800/60">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1">
              <span>Total Impresi Votes</span>
              <BarChart3 className="w-4 h-4 text-[#00F0FF]" />
            </div>
            <div className="text-xl font-black text-white">
              {totalVotesCount.toLocaleString('id-ID')}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-1">
              Komunitas Penilai
            </div>
          </div>

          <div className="bg-[#0D0E17]/80 rounded-2xl p-4 border border-slate-800/60">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1">
              <span>Artikel & Buzz</span>
              <MessageSquare className="w-4 h-4 text-[#A855F7]" />
            </div>
            <div className="text-xl font-black text-white">
              {(articles.length + buzzList.length).toLocaleString('id-ID')}
            </div>
            <div className="text-[11px] text-emerald-400 font-bold mt-1">
              Aktif Berdiskusi
            </div>
          </div>
        </div>
      </div>

      {/* Main Interactive Controls & Chart View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none w-full sm:w-auto">
          {[
            { id: 'genres', label: 'Genre Populer', icon: BarChart3 },
            { id: 'categories', label: 'Skor Kategori', icon: Layers },
            { id: 'ratings', label: 'Distribusi Rating', icon: PieChartIcon },
            { id: 'activity', label: 'Perbandingan Radar', icon: Activity },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={`tab-${tab.id}`}
                id={`btn-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id as ViewMode)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
                  isActive
                    ? 'bg-[#151628] border border-[#00F0FF]/60 text-white shadow-lg shadow-[#00F0FF]/15'
                    : 'bg-[#121324] border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#00F0FF]' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-1.5 font-medium ml-auto">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span>Real-time Data Sync</span>
        </div>
      </div>

      {/* Main Charts & Leaderboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recharts Visualizer (2 Cols) */}
        <div className="lg:col-span-2 bg-[#121324] border border-slate-800/90 rounded-3xl p-6 relative flex flex-col justify-between shadow-xl min-h-[420px]">
          <AnimatePresence mode="wait">
            {activeTab === 'genres' && (
              <motion.div
                key="chart-genres"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Interaksi & Kepopuleran Genre Film</span>
                    </h3>
                    <p className="text-xs text-slate-400">Total votes & keterlibatan penonton per genre</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="flex items-center gap-1 text-slate-300 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FF2E7E]" /> Impresi
                    </span>
                  </div>
                </div>

                <div className="w-full h-[320px] pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={genreData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                      <XAxis
                        dataKey="name"
                        stroke="#64748B"
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: '#334155' }}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                      />
                      <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={{ stroke: '#334155' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="engagement" name="Total Engagement" radius={[8, 8, 0, 0]}>
                        {genreData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}

            {activeTab === 'categories' && (
              <motion.div
                key="chart-categories"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Indeks Performa & Skor Kategori</span>
                    </h3>
                    <p className="text-xs text-slate-400">Rata-rata Skor Sotoy & jumlah artikel terpublikasi</p>
                  </div>
                </div>

                <div className="w-full h-[320px] pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                      <XAxis type="number" stroke="#64748B" fontSize={11} tickLine={false} axisLine={{ stroke: '#334155' }} />
                      <YAxis dataKey="label" type="category" stroke="#64748B" fontSize={11} tickLine={false} axisLine={{ stroke: '#334155' }} width={110} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="interactionScore" name="Skor Interaksi" radius={[0, 8, 8, 0]}>
                        {categoryData.map((entry, index) => (
                          <Cell key={`cat-cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}

            {activeTab === 'ratings' && (
              <motion.div
                key="chart-ratings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Distribusi Skor Sotoy Sinema</h3>
                    <p className="text-xs text-slate-400">Persentase rentang nilai yang diberikan oleh kurator dan warga</p>
                  </div>
                </div>

                <div className="w-full h-[320px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={ratingDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={105}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {ratingDistributionData.map((entry, index) => (
                          <Cell key={`pie-cell-${index}`} fill={entry.color} stroke="#121324" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value) => <span className="text-xs font-medium text-slate-300">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}

            {activeTab === 'activity' && (
              <motion.div
                key="chart-activity"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Komparasi Radar Multi-Sektor</h3>
                    <p className="text-xs text-slate-400">Perbandingan film, series, dan anime dalam 5 matriks utama</p>
                  </div>
                </div>

                <div className="w-full h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                      <PolarGrid stroke="#334155" />
                      <PolarAngleAxis dataKey="subject" stroke="#94A3B8" fontSize={11} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" fontSize={10} />
                      <Radar name="Movies" dataKey="Movies" stroke="#FF2E7E" fill="#FF2E7E" fillOpacity={0.4} />
                      <Radar name="Series" dataKey="Series" stroke="#00F0FF" fill="#00F0FF" fillOpacity={0.3} />
                      <Radar name="Anime" dataKey="Anime" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                      <Legend
                        formatter={(value) => <span className="text-xs font-bold text-slate-300">{value}</span>}
                      />
                      <Tooltip content={<CustomTooltip />} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Top Trending Film Leaderboard Matrix */}
        <div className="bg-[#121324] border border-slate-800/90 rounded-3xl p-6 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between mb-5 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-[#FF2E7E]" />
                <h3 className="text-base font-bold text-white">Top Trending Sinema</h3>
              </div>
              <button
                id="btn-view-all-trending"
                onClick={() => navigateTo('film-database')}
                className="text-xs text-[#00F0FF] hover:underline font-bold flex items-center gap-1"
              >
                <span>Lihat Semua</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3.5">
              {topTrendingFilms.map((film, index) => (
                <div
                  key={`trending-film-${film.id}`}
                  id={`trending-card-${film.id}`}
                  onClick={() => navigateTo('film-detail', { filmId: film.id })}
                  className="bg-[#18192E]/70 border border-slate-800 hover:border-[#FF2E7E]/50 rounded-2xl p-3 flex items-center gap-3.5 group cursor-pointer transition-all duration-200"
                >
                  <div className="relative shrink-0">
                    <span className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-[#FF2E7E] text-white text-[10px] font-black flex items-center justify-center shadow-lg z-10">
                      #{index + 1}
                    </span>
                    <img
                      src={film.poster}
                      alt={film.title}
                      className="w-12 h-16 object-cover rounded-xl group-hover:scale-105 transition-transform"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white truncate group-hover:text-[#FF2E7E] transition-colors">
                      {film.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                      {film.year} • {film.director}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="inline-flex items-center gap-1 bg-[#FFB800]/15 text-[#FFB800] border border-[#FFB800]/30 px-1.5 py-0.5 rounded-md text-[10px] font-black">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        <span>{film.skorSotoy}</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {(film.totalVotes || 120).toLocaleString('id-ID')} votes
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
            <button
              id="btn-explore-community-feed"
              onClick={() => navigateTo('community-feed')}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-[#FF2E7E]/20 to-[#00F0FF]/20 hover:from-[#FF2E7E]/30 hover:to-[#00F0FF]/30 border border-[#FF2E7E]/40 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <MessageSquare className="w-4 h-4 text-[#FF2E7E]" />
              <span>Gabung Diskusi Warga Sotoy</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
