import React from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, CheckCircle, Search, ScrollText } from 'lucide-react';

export const CriticCriteriaPage: React.FC = () => {
  const { navigateTo } = useApp();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 lg:py-16">
      {/* Header */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center justify-center p-3 bg-[#FF2E7E]/10 rounded-2xl mb-6 border border-[#FF2E7E]/30">
          <ShieldCheck className="w-10 h-10 text-[#FF2E7E]" />
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white mb-6">
          Sotoy Film Criteria Code
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
          Ini adalah panduan komprehensif kami untuk menilai kualifikasi <strong>Si Paling Sotoy</strong> (Kritikus Terverifikasi). Kami berkomitmen untuk menyajikan opini yang beragam, profesional, dan dapat diandalkan oleh para cinephile.
        </p>
      </div>

      <div className="space-y-12">
        {/* Section 1 */}
        <section className="bg-[#171A1F] border border-slate-800 rounded-3xl p-6 sm:p-10">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-cyan-500/10 text-cyan-400 rounded-xl flex items-center justify-center shrink-0">
              <ScrollText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white mb-2">1. Kualifikasi Publikasi</h2>
              <p className="text-slate-400">Publikasi (media cetak, digital, atau platform independen) tempat Anda bernaung harus memenuhi standar berikut:</p>
            </div>
          </div>
          
          <ul className="space-y-4 ml-16 text-slate-300 text-sm">
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-[#FF2E7E] shrink-0" />
              <span><strong>Konsistensi Penerbitan:</strong> Media telah menerbitkan ulasan film/serial secara rutin minimal selama 12 bulan terakhir.</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-[#FF2E7E] shrink-0" />
              <span><strong>Jangkauan & Audiens:</strong> Memiliki audiens organik yang jelas dan dapat diverifikasi (misal: traffic website, pelanggan, atau pengikut media sosial).</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-[#FF2E7E] shrink-0" />
              <span><strong>Kualitas Editorial:</strong> Konten disunting dengan baik, profesional, tidak mengandung ujaran kebencian, plagiarisme, atau spam.</span>
            </li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="bg-[#171A1F] border border-slate-800 rounded-3xl p-6 sm:p-10">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-[#FF2E7E]/10 text-[#FF2E7E] rounded-xl flex items-center justify-center shrink-0">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white mb-2">2. Kualifikasi Kritikus Individu</h2>
              <p className="text-slate-400">Bagi Anda yang beroperasi sebagai kritikus mandiri, kreator konten video, atau podcaster:</p>
            </div>
          </div>
          
          <ul className="space-y-4 ml-16 text-slate-300 text-sm">
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-[#FF2E7E] shrink-0" />
              <span><strong>Kreator Video (YouTube/TikTok):</strong> Menghasilkan konten ulasan film yang berdedikasi tinggi, bukan sekadar ringkasan alur cerita (spoiler recap). Memiliki subscriber/pengikut minimal 30.000 organik.</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-[#FF2E7E] shrink-0" />
              <span><strong>Podcaster:</strong> Podcast harus berfokus pada film/TV, telah merilis minimal 30 episode orisinal yang stabil di berbagai platform, dan memiliki pendengar reguler.</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-[#FF2E7E] shrink-0" />
              <span><strong>Kritikus Freelance:</strong> Telah menerbitkan setidaknya 20 ulasan film/serial berkualitas di media atau platform terkemuka dalam kurun waktu 2 tahun terakhir.</span>
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="bg-[#171A1F] border border-slate-800 rounded-3xl p-6 sm:p-10">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white mb-2">3. Pedoman Etika & Pencabutan</h2>
              <p className="text-slate-400">Status <strong>Si Paling Sotoy</strong> adalah hak istimewa yang dipertahankan melalui integritas.</p>
            </div>
          </div>
          
          <div className="ml-16 space-y-4 text-slate-300 text-sm leading-relaxed">
            <p>
              Sotoy Film berhak mencabut status kritikus terverifikasi tanpa pemberitahuan sebelumnya jika ditemukan pelanggaran seperti:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li>Plagiarisme ulasan atau mengambil opini dari pembuat konten lain.</li>
              <li>Menerima bayaran dari studio untuk memberikan skor yang tidak obyektif (bribery).</li>
              <li>Ujaran kebencian, diskriminasi rasial, atau pelecehan yang menargetkan individu maupun komunitas.</li>
              <li>Ketidakaktifan publikasi ulasan selama lebih dari 12 bulan berturut-turut.</li>
            </ul>
          </div>
        </section>
      </div>

      <div className="mt-16 text-center">
        <button
          onClick={() => navigateTo('critic-submission')}
          className="inline-flex items-center gap-2 bg-[#FF2E7E] hover:bg-[#e6bb00] text-slate-950 font-black px-8 py-4 rounded-xl shadow-lg transition-transform hover:scale-105"
        >
          Siap Bergabung? Kembali ke Form Pengajuan
        </button>
      </div>
    </div>
  );
};
