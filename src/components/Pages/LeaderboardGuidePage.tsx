import React from 'react';
import { useApp } from '../../context/AppContext';
import { Trophy, Award, ShieldCheck, Heart, FileText, ArrowRight, Sparkles, CheckCircle2, Star, Users } from 'lucide-react';

export const LeaderboardGuidePage: React.FC = () => {
  const { navigateTo } = useApp();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 lg:py-16">
      {/* Header */}
      <div className="text-center mb-14">
        <div className="inline-flex items-center justify-center p-3 bg-[#FF2E7E]/10 rounded-2xl mb-6 border border-[#FF2E7E]/30 shadow-lg shadow-[#FF2E7E]/10">
          <Trophy className="w-10 h-10 text-[#FF2E7E]" />
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white mb-4 tracking-tight">
          Panduan Sotoy Leaderboard
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          Sistem apresiasi & peringkat komunitas cinephile Sotoy Film. Kenali cara mengumpulkan poin ulasan, pembagian kategori peringkat, dan cara bergabung sebagai Kritikus Terverifikasi.
        </p>
      </div>

      <div className="space-y-10">
        {/* Section 1: Dua Kategori Leaderboard Terpisah */}
        <section className="bg-[#171A1F] border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-[#FF2E7E]/10 text-[#FF2E7E] rounded-2xl flex items-center justify-center shrink-0 border border-[#FF2E7E]/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
                1. Mengapa Ada Dua Papan Peringkat Terpisah?
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                Di Sotoy Film, kami menghargai perspektif penonton umum sekaligus kritik sinematik profesional. Oleh karena itu, leaderboard dibagi menjadi dua panggung berbeda:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Kritikus Box */}
            <div className="bg-slate-900/80 border border-[#FF2E7E]/30 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#FF2E7E]" />
                <h3 className="font-display font-black text-white text-base">
                  Leaderboard Kritikus (Si Paling Sotoy)
                </h3>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                Khusus untuk reviewer film, jurnalis, dan kurator terverifikasi yang telah memenuhi standar telaah sinematik, ketajaman analisis mise-en-scène, dan konsistensi publikasi resmi.
              </p>
              <div className="text-[11px] text-[#FF2E7E] font-bold">
                Fokus: Kedalaman kritik, esai komprehensif, dan kurasi festival.
              </div>
            </div>

            {/* Warga Box */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <h3 className="font-display font-black text-white text-base">
                  Leaderboard Warga (Warga Sotoy)
                </h3>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                Panggung bagi seluruh penonton bioskop, penikmat series, dan pecinta anime di komunitas. Setiap ulasan jujur dan penilaian Skor Sotoy kamu berkontribusi langsung pada skor komunitas.
              </p>
              <div className="text-[11px] text-cyan-400 font-bold">
                Fokus: Opini penonton murni, diskusi komunitas, dan ulasan kilat.
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Formula Penghitungan Poin */}
        <section className="bg-[#171A1F] border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-cyan-500/10 text-cyan-400 rounded-2xl flex items-center justify-center shrink-0 border border-cyan-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
                2. Cara Poin Leaderboard Dihitung
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                Peringkat kamu ditentukan oleh konsistensi menulis ulasan dan seberapa bermanfaat ulasanmu bagi sesama penonton:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-black/40 border border-white/10 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <FileText className="w-4 h-4 text-[#FF2E7E]" />
                  <span>Ulasan Film Ditulis</span>
                </div>
                <span className="px-2.5 py-1 bg-[#FF2E7E]/20 text-[#FF2E7E] text-xs font-black rounded-lg border border-[#FF2E7E]/40">
                  +10 Poin / Ulasan
                </span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Setiap kali kamu memberikan rating bintang dan menulis ulasan film, serial, atau anime di database.
              </p>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Heart className="w-4 h-4 text-[#FF2E7E]" />
                  <span>Suka Diterima pada Ulasan</span>
                </div>
                <span className="px-2.5 py-1 bg-cyan-500/20 text-cyan-400 text-xs font-black rounded-lg border border-cyan-500/40">
                  +1 Poin / Suka
                </span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Setiap apresiasi atau tanda suka yang diberikan pengguna lain pada ulasan ulasanmu menambah poin reputasimu.
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between gap-4 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#FF2E7E] shrink-0" />
              <span><strong>Formula Ringkas:</strong> Skor = (Jumlah Ulasan × 10) + Total Suka Ulasan</span>
            </div>
            <span className="font-mono text-[11px] text-slate-500 hidden sm:inline">Diperbarui real-time</span>
          </div>
        </section>

        {/* Section 3: Jalur Menjadi Kritikus Terverifikasi */}
        <section className="bg-gradient-to-br from-[#1c1426] via-[#171A1F] to-[#12131a] border border-[#FF2E7E]/40 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-[#FF2E7E]/10 text-[#FF2E7E] rounded-2xl flex items-center justify-center shrink-0 border border-[#FF2E7E]/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
                3. Ingin Masuk ke Leaderboard Kritikus?
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Jika kamu adalah jurnalis film, pembuat konten kritik video/podcast, atau penulis esai sinema independen, kamu dapat mengajukan verifikasi lencana resmi <strong>Si Paling Sotoy</strong>.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={() => navigateTo('critic-submission')}
              className="w-full sm:w-auto px-6 py-3 bg-[#FF2E7E] hover:bg-[#e0266e] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-[#FF2E7E]/25 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <span>Daftar Verifikasi Kritikus</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => navigateTo('critic-criteria')}
              className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2"
            >
              <Award className="w-4 h-4 text-[#FF2E7E]" />
              <span>Lihat Kriteria Kualifikasi</span>
            </button>
          </div>
        </section>

        {/* Back to Database CTA */}
        <div className="text-center pt-4">
          <button
            onClick={() => navigateTo('film-database')}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-[#FF2E7E] transition-colors"
          >
            <span>← Kembali ke Film Database</span>
          </button>
        </div>
      </div>
    </div>
  );
};
