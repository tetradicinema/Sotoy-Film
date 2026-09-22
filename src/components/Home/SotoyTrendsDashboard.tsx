import React from 'react';
import { TrendingUp, Sparkles, Film, MessageSquare, Star, Flame, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SotoyTrendsDashboard: React.FC = () => {
  const { films, publishedArticles, buzzList, navigateTo } = useApp();

  // Top trending films by score
  const trendingFilms = React.useMemo(() => {
    return [...films]
      .sort((a, b) => (b.criticsSkorSotoy || b.skorSotoy) - (a.criticsSkorSotoy || a.skorSotoy))
      .slice(0, 4);
  }, [films]);

  // Active community buzz discussions
  const topBuzz = React.useMemo(() => {
    return [...buzzList]
      .sort((a, b) => (b.likes || 0) - (a.likes || 0))
      .slice(0, 3);
  }, [buzzList]);

  return (
    <section id="sotoy-trends-dashboard" className="py-8 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#121324] via-[#17192f] to-[#0d0e18] border border-slate-800 p-6 sm:p-8 shadow-2xl">
        {/* Glow Effects */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#FF2E7E]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-[#00F0FF]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF2E7E]/10 border border-[#FF2E7E]/30 text-[#FF2E7E] text-xs font-bold mb-2">
              <Flame className="w-3.5 h-3.5" />
              <span>Sotoy Trends Radar</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 tracking-tight">
              <span>Tren & Topik Panas Sinema</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Pantau film terfavorit, perbincangan terhangat komunitas, dan sorotan sinematik minggu ini.
            </p>
          </div>

          <button
            onClick={() => navigateTo('rekomendasi-film')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-white transition-all shadow-md active:scale-95 shrink-0 self-start sm:self-auto"
          >
            <span>Lihat Semua Rekomendasi</span>
            <ArrowRight className="w-4 h-4 text-[#FF2E7E]" />
          </button>
        </div>

        {/* Grid Content */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Trending Film Spotlight */}
          <div className="lg:col-span-7 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-[#FFD000]" />
              <span>Film Rating Tertinggi</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {trendingFilms.map(film => (
                <div
                  key={film.id}
                  onClick={() => navigateTo('film-detail', { filmId: film.id })}
                  className="group bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-[#FF2E7E]/40 rounded-2xl p-3 flex gap-3 cursor-pointer transition-all shadow-md"
                >
                  <img
                    src={film.poster}
                    alt={film.title}
                    className="w-16 h-22 rounded-xl object-cover ring-1 ring-white/10 shrink-0 group-hover:scale-105 transition-transform"
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] text-slate-400 font-bold">{film.year}</span>
                        <span className="flex items-center gap-1 text-[#FFD000] font-mono text-xs font-black bg-[#FFD000]/10 px-1.5 py-0.5 rounded border border-[#FFD000]/20">
                          <Star className="w-3 h-3 fill-current" />
                          <span>{(film.criticsSkorSotoy || film.skorSotoy).toFixed(1)}</span>
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-white group-hover:text-[#FF2E7E] transition-colors truncate mt-1">
                        {film.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {film.director}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-1">
                      {film.genres.slice(0, 2).map(g => (
                        <span key={g} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5">
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hot Community Buzz */}
          <div className="lg:col-span-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-[#00F0FF]" />
              <span>Diskusi Komunitas Populer</span>
            </h3>

            <div className="space-y-2.5">
              {topBuzz.map(buzz => (
                <div
                  key={buzz.id}
                  onClick={() => navigateTo('buzz-detail', { buzzId: buzz.id })}
                  className="group bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-[#00F0FF]/40 rounded-2xl p-3 cursor-pointer transition-all shadow-md"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <img
                      src={buzz.author.avatar}
                      alt={buzz.author.name}
                      className="w-5 h-5 rounded-full object-cover shrink-0"
                    />
                    <span className="text-xs font-bold text-white group-hover:text-[#00F0FF] transition-colors truncate">
                      {buzz.author.name}
                    </span>
                    <span className="text-[10px] text-slate-400">@{buzz.author.handle}</span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {buzz.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
