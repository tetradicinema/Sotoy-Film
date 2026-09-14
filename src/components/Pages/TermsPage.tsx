import React from 'react';
import {
  FileCheck,
  Scale,
  ShieldAlert,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Ban,
  MessageSquare,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AdBannerSlot } from '../Common/AdBannerSlot';

export const TermsPage: React.FC = () => {
  const { navigateTo } = useApp();

  return (
    <div id="terms-conditions-page" className="min-h-screen py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Header Title */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFD000]/10 border border-[#FFD000]/30 text-[#FFD000] text-xs font-black uppercase tracking-wider">
            <Scale className="w-3.5 h-3.5" />
            <span>Perjanjian Pengguna Platform</span>
          </div>

          <h1 className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight">
            Syarat & Ketentuan (Terms & Conditions)
          </h1>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>Terakhir Diperbarui: September 2026</span>
            <span>•</span>
            <span>Berlaku untuk seluruh Warga & Kontributor Sotoy Film</span>
          </div>
        </div>

        {/* Global Page Ad Banner */}
        <AdBannerSlot variant="leaderboard" />

        {/* Core Principles */}
        <div className="bg-[#121324] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
          <h2 className="font-display font-black text-lg text-white flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-[#FFD000]" />
            <span>Kode Etik Komunitas Warga Sotoy</span>
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Selamat datang di Sotoy Film. Dengan mengakses website, membuat akun, memberikan ulasan Skor Sotoy, atau memposting Buzz opini, Anda menyetujui untuk terikat oleh Syarat dan Ketentuan berikut. Semangat utama kami adalah <strong>kebebasan berpendapat yang bertanggung jawab dan apresiasi seni yang sehat</strong>.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-8 text-slate-300 text-xs sm:text-sm leading-relaxed">
          
          {/* Section 1 */}
          <section className="bg-[#121324] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
            <h3 className="font-display font-black text-lg text-white flex items-center gap-2">
              <span className="text-[#FF2E7E] font-black">1.</span>
              <span>Hak Cipta & Kepemilikan Materi</span>
            </h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Artikel Redaksi:</strong> Seluruh naskah liputan, wawancara sineas, esai film studies, dan infografis yang diproduksi oleh <em>Penulis Sotoy</em> dan <em>Redaksi Sotoy Film</em> dilindungi oleh undang-undang hak cipta. Dilarang menyalin atau mendistribusikan ulang untuk kepentingan komersial tanpa izin tertulis.
              </li>
              <li>
                <strong>Konten Kiriman Pengguna (UGC):</strong> Anda tetap memiliki hak cipta atas ulasan dan buzz yang Anda tulis. Namun dengan memposting di Sotoy Film, Anda memberikan lisensi non-eksklusif, bebas royalti kepada kami untuk menampilkan, mengagregasi, dan mengutip pendapat Anda di platform.
              </li>
              <li>
                <strong>Materi Promosi Film & Poster:</strong> Seluruh poster film, cuplikan foto adegan, dan trailer yang ditampilkan di database adalah hak milik masing-masing studio produksi, distributor, dan pemegang hak cipta resmi yang digunakan untuk tujuan kritik dan ulasan edukatif (*Fair Use*).
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="bg-[#121324] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
            <h3 className="font-display font-black text-lg text-white flex items-center gap-2">
              <span className="text-[#00F0FF] font-black">2.</span>
              <span>Aturan Spoiler & Tata Krama Ulasan</span>
            </h3>
            <p>
              Bebas berpendapat bukan berarti merusak kenikmatan menonton orang lain. Setiap kontributor wajib mematuhi panduan berikut:
            </p>
            <div className="space-y-3 pt-1">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                <AlertTriangle className="w-5 h-5 text-[#FFD000] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white text-xs mb-1">Peringatan Spoiler Wajib</div>
                  <div className="text-slate-400 text-[11px] leading-relaxed">
                    Ulasan atau buzz yang membocorkan plot twist, akhir cerita, atau identitas karakter kunci wajib menyertakan penanda peringatan <em>[SPOILER ALERT]</em> di awal tulisan.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                <Ban className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white text-xs mb-1">Larangan Ujaran Kebencian & SARA</div>
                  <div className="text-slate-400 text-[11px] leading-relaxed">
                    Kritik diarahkan pada karya film (naskah, akting, teknis sinematografi), BUKAN berupa serangan personal, pelecehan, diskriminasi gender, ras, maupun fitnah terhadap sineas maupun sesama pengguna.
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="bg-[#121324] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
            <h3 className="font-display font-black text-lg text-white flex items-center gap-2">
              <span className="text-[#FFD000] font-black">3.</span>
              <span>Integritas Sistem Skor Sotoy & Anti-Review Bombing</span>
            </h3>
            <p>
              Sotoy Film menjunjung tinggi kejujuran rating. Kami secara ketat melarang:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Penggunaan akun palsu ganda (*multi-accounting/bots*) untuk memanipulasi rata-rata skor film (*review bombing* ataupun *astroturfing* positif).</li>
              <li>Menerima bayaran, hadiah rahasia, atau suap dari pihak manapun untuk memanipulasi Skor Sotoy tanpa transparansi tanda sponsor.</li>
              <li>Pelanggaran terhadap poin ini akan berakibat pada pencabutan badge verifikasi dan penonaktifan akun secara permanen.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="bg-[#121324] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
            <h3 className="font-display font-black text-lg text-white flex items-center gap-2">
              <span className="text-purple-400 font-black">4.</span>
              <span>Kewenangan Moderasi & Penegakan Sanksi</span>
            </h3>
            <p>
              Tim Moderator dan Admin Sotoy Film berhak menghapus komentar, menurunkan postingan buzz, atau menangguhkan akun pengguna yang terbukti melanggar kode etik komunitas tanpa pemberitahuan sebelumnya demi menjaga kenyamanan bersama.
            </p>
          </section>

          {/* Section 5 */}
          <section className="bg-[#121324] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
            <h3 className="font-display font-black text-lg text-white flex items-center gap-2">
              <span className="text-emerald-400 font-black">5.</span>
              <span>Hukum yang Berlaku</span>
            </h3>
            <p>
              Syarat dan Ketentuan ini diatur dan ditafsirkan sesuai dengan hukum Negara Kesatuan Republik Indonesia, termasuk Undang-Undang Informasi dan Transaksi Elektronik (UU ITE).
            </p>
          </section>

        </div>

        {/* Footer actions */}
        <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => navigateTo('privacy-policy')}
            className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            ← Kebijakan Privasi
          </button>
          <button
            onClick={() => navigateTo('business-inquiries')}
            className="text-xs font-bold text-[#FFD000] hover:underline"
          >
            Info Kemitraan & Bisnis →
          </button>
        </div>

      </div>
    </div>
  );
};
