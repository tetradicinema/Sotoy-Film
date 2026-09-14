import React, { useState } from 'react';
import {
  Award,
  Sparkles,
  Compass,
  Star,
  Film,
  Zap,
  Heart,
  Eye,
  Coffee,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AdBannerSlot } from '../Common/AdBannerSlot';

export const FilmRecommendationsPage: React.FC = () => {
  const { films, navigateTo } = useApp();

  const [selectedMood, setSelectedMood] = useState<string>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');

  const moods = [
    { id: 'all', label: 'Semua Mood', icon: Compass },
    { id: 'mind-bending', label: 'Mind-Bending & Mikir', icon: Zap, genre: 'Sci-Fi' },
    { id: 'visual', label: 'Sinematografi Juara', icon: Eye, genre: 'Adventure' },
    { id: 'romance', label: 'Bikin Baper / Galau', icon: Heart, genre: 'Romance' },
    { id: 'chill', label: 'Santai Akhir Pekan', icon: Coffee, genre: 'Animation' },
  ];

  // Filter recommendations
  const recommendedFilms = films.filter(f => {
    if (selectedMood === 'mind-bending' && !f.genres.includes('Sci-Fi') && !f.genres.includes('History')) return false;
    if (selectedMood === 'visual' && f.skorSotoy < 4.8) return false;
    if (selectedMood === 'romance' && !f.genres.includes('Romance') && !f.genres.includes('Drama')) return false;
    if (selectedMood === 'chill' && !f.genres.includes('Animation') && !f.genres.includes('Action')) return false;
    if (selectedPlatform !== 'all' && !f.whereToWatch.some(w => w.platform.toLowerCase().includes(selectedPlatform.toLowerCase()))) return false;
    return true;
  });

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Hero Header */}
        <div
          id="recommendation-header"
          className="bg-gradient-to-r from-[#111A2E] via-[#162744] to-[#0E1524] border border-[#00F0FF]/40 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute -right-12 -bottom-12 w-72 h-72 bg-[#00F0FF]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl">
            <span className="bg-[#00F0FF] text-slate-950 font-black text-xs uppercase px-3 py-1 rounded-full tracking-wider inline-flex items-center gap-1 mb-3">
              <Award className="w-3.5 h-3.5" />
              SOTOY CURATOR ENGINE
            </span>
            <h1 className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight mb-2">
              Rekomendasi Film Pilihan Redaksi
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed mb-6">
              Bingung mau nonton apa malam ini? Pilih mood dan suasana hati kamu, lalu biarkan algoritma kurasi Sotoy Film mencarikan tontonan berkualitas dengan Skor Sotoy di atas rata-rata.
            </p>

            {/* Mood selector buttons */}
            <div className="flex flex-wrap gap-2">
              {moods.map(m => {
                const Icon = m.icon;
                const isSelected = selectedMood === m.id;
                return (
                  <button
                    key={m.id}
                    id={`mood-btn-${m.id}`}
                    onClick={() => setSelectedMood(m.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      isSelected
                        ? 'bg-[#00F0FF] text-slate-950 font-black shadow-lg shadow-[#00F0FF]/25'
                        : 'bg-slate-900/90 text-slate-300 hover:text-white border border-slate-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Global Page Ad Banner */}
        <AdBannerSlot variant="leaderboard" />

        {/* Platform Filter Bar */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Filter Platform Nonton:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {['all', 'Cinema XXI', 'Netflix', 'HBO', 'Disney+'].map(plat => (
                <button
                  key={plat}
                  onClick={() => setSelectedPlatform(plat)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    selectedPlatform === plat
                      ? 'bg-white text-slate-950 font-black'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {plat === 'all' ? 'Semua Platform' : plat}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-400">
            Ditemukan <strong>{recommendedFilms.length}</strong> rekomendasi film
          </div>
        </div>

        {/* Recommendations List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recommendedFilms.map(film => (
            <div
              key={film.id}
              id={`rec-card-${film.id}`}
              className="bg-[#121324] border border-slate-800 hover:border-[#00F0FF]/60 rounded-3xl p-5 flex flex-col sm:flex-row gap-5 group transition-all duration-300 shadow-xl"
            >
              <img
                src={film.poster}
                alt={film.title}
                className="sm:w-36 h-52 object-cover rounded-2xl shrink-0 border border-white/10 group-hover:scale-105 transition-transform"
              />

              <div className="flex-1 flex flex-col justify-between min-w-0">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 text-[10px] font-black uppercase px-2 py-0.5 rounded">
                      {film.type} • {film.year}
                    </span>
                    <span className="text-[#FFD000] font-black text-xs flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {film.skorSotoy.toFixed(1)} / 5.0
                    </span>
                  </div>

                  <h3 className="font-display font-black text-lg text-white group-hover:text-[#00F0FF] transition-colors leading-tight mb-1">
                    {film.title}
                  </h3>
                  <p className="text-slate-400 text-xs mb-2">
                    Dir. {film.director} • {film.genres.join(', ')}
                  </p>

                  {film.curatorNote && (
                    <div className="bg-slate-900/80 border-l-2 border-[#00F0FF] p-2.5 rounded-r-xl mb-3">
                      <span className="text-[10px] font-bold text-[#00F0FF] uppercase block">
                        Catatan Kurator:
                      </span>
                      <p className="text-slate-300 text-xs italic">"{film.curatorNote}"</p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {film.whereToWatch.slice(0, 1).map((w, idx) => (
                      <span key={idx} className="text-[10px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                        {w.platform}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => navigateTo('film-detail', { filmId: film.id })}
                    className="bg-[#00F0FF] hover:bg-[#3bf4ff] text-slate-950 font-black text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1 transition-transform active:scale-95 shadow"
                  >
                    <span>Detail & Ulasan</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Infeed Ad Banner */}
        <AdBannerSlot variant="infeed" />
      </div>
    </div>
  );
};
