import React from 'react';
import {
  Clapperboard,
  Sparkles,
  Star,
  Users,
  Shield,
  Award,
  BookOpen,
  ArrowRight,
  Heart,
  Film,
  Camera,
  MessageSquare,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AdBannerSlot } from '../Common/AdBannerSlot';

export const AboutUsPage: React.FC = () => {
  const { navigateTo } = useApp();

  return (
    <div id="about-us-page" className="min-h-screen py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header Hero */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FF2E7E]/10 border border-[#FF2E7E]/30 text-[#FF2E7E] text-xs font-black uppercase tracking-wider">
            <Clapperboard className="w-3.5 h-3.5" />
            <span>Tentang Sotoy Film</span>
          </div>

          <h1 className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight leading-tight">
            Ulasan film yang jujur, dari penonton dan penulis Indonesia.
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Sotoy Film adalah media film dan komunitas penonton dari Indonesia. Kami membahas film bioskop, film festival, serial, animasi, sampai peralatan dan teknik pembuatan film. Di sini kamu bisa membaca ulasan, memberi skor, dan ngobrol soal film yang baru kamu tonton.
          </p>
        </div>

        {/* Global Page Ad Banner */}
        <AdBannerSlot variant="leaderboard" />

        {/* Kisah Awal & Misi */}
        <div className="bg-[#171717] border border-slate-800 rounded-3xl p-6 sm:p-10 space-y-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-[#FF2E7E]/10 rounded-full blur-3xl pointer-events-none" />
          
          <h2 className="font-display font-black text-2xl text-white flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-[#FF2E7E]" />
            <span>Kenapa namanya "Sotoy Film"?</span>
          </h2>

          <div className="space-y-4 text-slate-300 text-sm sm:text-base leading-relaxed">
            <p>
              Di Indonesia, <em>"sotoy"</em> artinya sok tahu. Kami memakai kata itu dengan sengaja: setiap penonton punya pendapat soal film yang baru ditontonnya, dan pendapat itu layak didengar tanpa harus bergelar kritikus.
            </p>
            <p>
              Ulasan film berbahasa Indonesia sering terbagi dua: tulisan akademis yang berjarak, atau ulasan pesanan yang isinya pujian saja. Sotoy Film mencoba jalan tengahnya, tempat penonton biasa, kritikus, dan penulis bisa menilai film dengan jujur dan saling membaca.
            </p>
          </div>
        </div>

        {/* 10 Poin Filosofi Skor Sotoy */}
        <div className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="font-display font-black text-2xl sm:text-3xl text-white">
              Filosofi Sistem Skor Sotoy (★ 1.0 - 10.0)
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm">
              Cara kami memberi skor, dari 1 sampai 10. Sponsor tidak memengaruhi skor.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {[
              { score: '★ 1.0 - 2.0', label: 'Bencana Sinematik', desc: 'Naskah rapuh, teknis berantakan, atau manipulatif tanpa visi artistik yang jelas.', color: 'border-red-500/40 text-red-400' },
              { score: '★ 3.0 - 4.0', label: 'Kurang Matang', desc: 'Punya secuil potensi namun eksekusi membosankan dan pacing tersendat-sendat.', color: 'border-orange-500/40 text-orange-400' },
              { score: '★ 5.0 - 6.0', label: 'Solid & Layak Tonton', desc: 'Menghibur, memenuhi ekspektasi genre, dan memiliki momen sinematik yang layak diapresiasi.', color: 'border-yellow-500/40 text-[#FF2E7E]' },
              { score: '★ 7.0 - 8.0', label: 'Sangat Direkomendasikan', desc: 'Penyutradaraan prima, akting memikat, sinematografi indah, dan menyentuh emosi penonton.', color: 'border-cyan-500/40 text-[#FF2E7E]' },
              { score: '★ 9.0 - 10.0', label: 'Mahakarya Abadi', desc: 'Pencapaian sinematik langka yang mendefinisikan zaman dan layak dikenang sepanjang masa.', color: 'border-pink-500/40 text-[#FF2E7E]' },
            ].map((tier, idx) => (
              <div
                key={idx}
                className={`bg-[#171717] border ${tier.color} rounded-2xl p-4 flex flex-col justify-between space-y-3`}
              >
                <div>
                  <div className="font-display font-black text-lg mb-1">{tier.score}</div>
                  <div className="font-bold text-xs text-white mb-2">{tier.label}</div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">{tier.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4 Pilar Ekosistem Peran */}
        <div className="bg-[#171717] border border-slate-800 rounded-3xl p-6 sm:p-10 space-y-8 shadow-xl">
          <div className="max-w-2xl">
            <h2 className="font-display font-black text-2xl text-white mb-2">
              Struktur Peran Komunitas Kami
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm">
              Ada empat peran di Sotoy Film, masing-masing dengan wewenang yang berbeda.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-[#FF2E7E]">
                <Users className="w-5 h-5" />
                <h3 className="font-display font-black text-base text-white">Warga Sotoy</h3>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                Penonton umum penikmat bioskop dan serial. Berhak memposting buzz opini harian, memberikan rating Skor Sotoy 1-10, dan mengoleksi film ke dalam Watchlist pribadi.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-[#FF2E7E]">
                <Award className="w-5 h-5" />
                <h3 className="font-display font-black text-base text-white">Si Paling Sotoy (Verified Critic)</h3>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                Kritikus terverifikasi dan kurator festival dengan badge emas resmi. Ulasan mendalam mereka memiliki bobot agregasi khusus pada tab skor kurator di Database Film.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-[#FF2E7E]">
                <BookOpen className="w-5 h-5" />
                <h3 className="font-display font-black text-base text-white">Penulis Sotoy (Jurnalis Redaksi)</h3>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                Penulis redaksi yang menulis liputan, wawancara sineas, panduan kamera dan lensa, serta bahasan teknik pembuatan film.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-purple-400">
                <Shield className="w-5 h-5" />
                <h3 className="font-display font-black text-base text-white">Admin & Moderasi</h3>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                Pengawal etika komunitas, pemelihara integritas database film, penyaring spoiler ilegal, dan penjamin keamanan platform.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Bottom Box */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 sm:p-8 rounded-3xl bg-[#171717] border border-slate-800 space-y-3">
              <h3 className="font-display font-black text-2xl text-white">
                Mau kerja sama?
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Untuk rumah produksi, distributor, komunitas film, dan brand. Kirim brief lewat halaman kemitraan.
              </p>
              <button
                onClick={() => navigateTo('business-inquiries')}
                className="px-6 py-2.5 rounded-xl bg-[#FF2E7E] hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-transform active:scale-95 shadow-lg shadow-[#FF2E7E]/20"
              >
                Hubungi Kemitraan →
              </button>
            </div>

            <div className="p-6 sm:p-8 rounded-3xl bg-[#171717] border border-slate-800 space-y-3">
              <h3 className="font-display font-black text-2xl text-white">
                Mau jadi penulis?
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Punya sudut pandang soal film dan senang menulis? Kirim portofolio dan topik yang ingin kamu tulis lewat formulir pendaftaran.
              </p>
              <button
                onClick={() => navigateTo('writer-application')}
                className="px-6 py-2.5 rounded-xl bg-[#FF2E7E] hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-transform active:scale-95 shadow-lg shadow-[#FF2E7E]/20"
              >
                Daftar Jadi Penulis →
              </button>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={() => navigateTo('community-feed')}
              className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
            >
              Jelajahi Buzz Komunitas
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
