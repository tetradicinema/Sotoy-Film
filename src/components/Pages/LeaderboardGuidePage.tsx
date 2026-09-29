import React from 'react';
import { useApp } from '../../context/AppContext';
import { Trophy, Award, ShieldCheck, Heart, FileText, ArrowRight, Sparkles, CheckCircle2, Star, Users, Clock, Flame } from 'lucide-react';
import { REVIEW_WEIGHT, LIKE_WEIGHT, RATING_ONLY_WEIGHT } from '../../utils/leaderboard';

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
                1. Dua Papan Peringkat Komunitas
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

        {/* Section 2: Aturan Resmi & Formula Poin */}
        <section className="bg-[#171A1F] border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-cyan-500/10 text-cyan-400 rounded-2xl flex items-center justify-center shrink-0 border border-cyan-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-white">
                2. Cara Poin & Peringkat Dihitung
              </h2>
              {/* Official Rules Statement */}
              <blockquote className="p-3.5 bg-slate-900/90 border-l-4 border-[#FF2E7E] text-slate-300 text-xs sm:text-sm italic leading-relaxed rounded-r-xl">
                "Leaderboards are calculated based on ratings submitted, reviews published, and the amount of likes received on those published reviews. Reviews are prioritized above ratings in the calculation."
              </blockquote>
            </div>
          </div>

          {/* Definitions */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-300">
              Komponen Penilaian (Definisi)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-400" />
                    <span>Rating</span>
                  </span>
                  <span className="text-[11px] font-black text-amber-400">
                    +{RATING_ONLY_WEIGHT} Poin / Rating
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Pemberian skor bintang pada film di katalog (tanpa teks ulasan tertulis).
                </p>
              </div>

              <div className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#FF2E7E]" />
                    <span>Ulasan (Review)</span>
                  </span>
                  <span className="text-[11px] font-black text-[#FF2E7E]">
                    +{REVIEW_WEIGHT} Poin / Ulasan
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Rating yang dilengkapi dengan opini/teks ulasan tertulis yang dipublikasikan.
                </p>
              </div>

              <div className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-[#FF2E7E]" />
                    <span>Suka (Likes)</span>
                  </span>
                  <span className="text-[11px] font-black text-cyan-400">
                    +{LIKE_WEIGHT} Poin / Suka
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Apresiasi suka dari pengguna lain yang diterima khusus pada ulasan tertulis Anda.
                </p>
              </div>
            </div>
          </div>

          {/* Formula summary */}
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#FF2E7E] shrink-0" />
              <span>
                <strong>Formula Total Skor:</strong> Skor = (Ulasan × {REVIEW_WEIGHT}) + (Suka Ulasan × {LIKE_WEIGHT}) + (Rating Tanpa Ulasan × {RATING_ONLY_WEIGHT})
              </span>
            </div>
            <span className="font-mono text-[11px] text-slate-500 shrink-0">Real-time sync</span>
          </div>

          {/* Time Periods */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#FF2E7E]" />
              <span>Periode Peringkat</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-1">
                <h4 className="font-bold text-xs text-[#FF2E7E]">This Week (Minggu Ini)</h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Dihitung sejak hari Senin pukul 00:00 WIB minggu berjalan hingga saat ini. Suka dihitung untuk ulasan yang dibuat di periode ini.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-1">
                <h4 className="font-bold text-xs text-[#FF2E7E]">This Month (Bulan Ini)</h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Dihitung sejak tanggal 1 pukul 00:00 WIB bulan berjalan hingga saat ini.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-1">
                <h4 className="font-bold text-xs text-[#FF2E7E]">All Time (Semua Waktu)</h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Seluruh akumulasi histori aktivitas tanpa batasan tanggal.
                </p>
              </div>
            </div>
          </div>

          {/* Tie-breaker & Badges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2">
              <h4 className="font-bold text-xs text-white flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-[#FF2E7E]" />
                <span>Aturan Penentuan Penentu Seri (Tie-Breakers)</span>
              </h4>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Jika dua pengguna memiliki skor total yang sama, peringkat ditentukan berurutan berdasarkan:
              </p>
              <ol className="list-decimal list-inside text-[11px] text-slate-300 space-y-0.5 font-medium">
                <li>Skor Total (score)</li>
                <li>Jumlah Ulasan (reviews)</li>
                <li>Jumlah Suka Ulasan (likes)</li>
                <li>Jumlah Rating (ratings)</li>
                <li>Nama Pengguna (A-Z)</li>
              </ol>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2">
              <h4 className="font-bold text-xs text-white flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-[#FF2E7E]" />
                <span>Simbol & Badge Peringkat Visual</span>
              </h4>
              <ul className="text-[11px] text-slate-300 space-y-1 font-medium">
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full border border-[#F5C542]/60 bg-[#F5C542]/15 text-[#F5C542] flex items-center justify-center font-black text-[10px]">1</span>
                  <span>#1 Emas / Gold (`#F5C542`) — Juara 1 Leaderboard</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full border border-[#C0C7D1]/60 bg-[#C0C7D1]/15 text-[#C0C7D1] flex items-center justify-center font-black text-[10px]">2</span>
                  <span>#2 Perak / Silver (`#C0C7D1`) — Juara 2 Leaderboard</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full border border-[#CD7F32]/60 bg-[#CD7F32]/15 text-[#CD7F32] flex items-center justify-center font-black text-[10px]">3</span>
                  <span>#3 Perunggu / Bronze (`#CD7F32`) — Juara 3 Leaderboard</span>
                </li>
                <li className="flex items-center gap-2 text-slate-400">
                  <span className="w-5 text-[#FF2E7E] font-black text-[11px] text-center">#4</span>
                  <span>#4+ Nomor Peringkat dalam Pink (`#FF2E7E`)</span>
                </li>
              </ul>
            </div>
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
              className="w-full sm:w-auto px-6 py-3 bg-[#FF2E7E] hover:bg-[#e0266e] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-[#FF2E7E]/25 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <span>Daftar Verifikasi Kritikus</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => navigateTo('critic-criteria')}
              className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
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
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-[#FF2E7E] transition-colors cursor-pointer"
          >
            <span>← Kembali ke Film Database</span>
          </button>
        </div>
      </div>
    </div>
  );
};
