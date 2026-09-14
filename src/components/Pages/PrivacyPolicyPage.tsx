import React from 'react';
import {
  ShieldCheck,
  Lock,
  Eye,
  FileText,
  UserCheck,
  Database,
  Mail,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AdBannerSlot } from '../Common/AdBannerSlot';

export const PrivacyPolicyPage: React.FC = () => {
  const { navigateTo } = useApp();

  return (
    <div id="privacy-policy-page" className="min-h-screen py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Header Title */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00F0FF]/10 border border-[#00F0FF]/30 text-[#00F0FF] text-xs font-black uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Dokumen Resmi & Transparansi</span>
          </div>

          <h1 className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight">
            Kebijakan Privasi (Privacy Policy)
          </h1>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>Berlaku efektif sejak: 1 September 2026</span>
            <span>•</span>
            <span>Versi Dokumen: 2.4.0</span>
          </div>
        </div>

        {/* Global Page Ad Banner */}
        <AdBannerSlot variant="leaderboard" />

        {/* Quick Highlights Callout */}
        <div className="bg-[#121324] border border-[#00F0FF]/30 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
          <h2 className="font-display font-black text-lg text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#00F0FF]" />
            <span>Ringkasan Komitmen Privasi Kami</span>
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Sotoy Film menghargai privasi setiap pengguna. Kami <strong>tidak pernah menjual data pribadi Anda</strong> kepada broker data atau pihak ketiga. Data yang kami simpan murni ditujukan untuk menghitung agregasi Skor Sotoy yang adil, menyimpan Watchlist film Anda, dan menyajikan feed sosial yang relevan.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex items-center gap-2 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-[#00F0FF] shrink-0" />
              <span>Tanpa Pelacakan Lokasi Latar Belakang</span>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex items-center gap-2 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-[#00F0FF] shrink-0" />
              <span>Opsi Ekspor JSON Data Kapan Saja</span>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex items-center gap-2 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-[#00F0FF] shrink-0" />
              <span>Kontrol Penuh Profil Publik/Privat</span>
            </div>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-8 text-slate-300 text-xs sm:text-sm leading-relaxed">
          
          {/* Section 1 */}
          <section className="bg-[#121324] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
            <h3 className="font-display font-black text-lg text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-[#FFD000]" />
              <span>1. Informasi yang Kami Kumpulkan</span>
            </h3>
            <p>
              Saat Anda menggunakan platform Sotoy Film, kami dapat mengumpulkan jenis informasi berikut:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-300">
              <li>
                <strong>Data Profil Pengguna:</strong> Nama tampilan, handle unik (misalnya <em>@wargasotoy</em>), tautan avatar, bio profil, dan peran akun (Warga, Si Paling Sotoy, Penulis, atau Admin).
              </li>
              <li>
                <strong>Aktivitas Sinematik & Konten Buatan Pengguna:</strong> Ulasan teks, angka rating Skor Sotoy (1.0 - 5.0), postingan Buzz kilat, komentar pada artikel, daftar film di Watchlist, dan penanda suka (likes).
              </li>
              <li>
                <strong>Preferensi Akun:</strong> Genre film favorit, preferensi pemutaran cuplikan (trailer), dan pengaturan privasi visibilitas profil yang Anda konfigurasi di menu Pengaturan.
              </li>
              <li>
                <strong>Data Teknis Perangkat:</strong> Alamat IP tersamar, tipe browser, resolusi layar, dan metadata sesi untuk keamanan pencegahan bot review-bombing.
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="bg-[#121324] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
            <h3 className="font-display font-black text-lg text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#FF2E7E]" />
              <span>2. Bagaimana Kami Menggunakan Informasi Anda</span>
            </h3>
            <p>Kami menggunakan data yang dikumpulkan semata-mata untuk:</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-300">
              <li>Menghitung rata-rata Skor Sotoy Warga dan membedakannya dari Skor Kurator Resmi (*Critics Score*).</li>
              <li>Menyimpan dan menyinkronkan daftar film tontonan (*Watchlist*) Anda di berbagai sesi browser.</li>
              <li>Mempersonalisasi rekomendasi film pada fitur <em>Rekomendasi Film Mood</em> berdasarkan genre yang Anda minati.</li>
              <li>Mencegah kecurangan peringkat sinema (*anti-manipulation algorithm*) agar hasil voting film tetap jujur dan organik.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="bg-[#121324] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
            <h3 className="font-display font-black text-lg text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-purple-400" />
              <span>3. Kontrol dan Hak Privasi Anda</span>
            </h3>
            <p>
              Setiap pengguna Sotoy Film memegang kendali penuh atas privasi akun mereka:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-300">
              <li>
                <strong>Profil Privat vs Publik:</strong> Anda dapat mengaktifkan mode Akun Privat di menu Pengaturan agar Watchlist dan riwayat ulasan hanya dapat dilihat oleh diri Anda sendiri.
              </li>
              <li>
                <strong>Ekspor Salinan Data (JSON):</strong> Melalui dashboard pengaturan akun, Anda dapat mengunduh seluruh data riwayat rating, buzz, dan watchlist dalam format JSON standar.
              </li>
              <li>
                <strong>Penghapusan Data:</strong> Anda berhak meminta penghapusan permanen akun beserta seluruh catatan ulasan dengan menghubungi tim perlindungan data kami.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="bg-[#121324] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
            <h3 className="font-display font-black text-lg text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              <span>4. Penyimpanan Lokal Browser (Local Storage & Cache)</span>
            </h3>
            <p>
              Aplikasi Sotoy Film menggunakan teknologi <code>localStorage</code> pada peramban web Anda untuk menyimpan status login simulasi, tema tampilan, daftar tontonan offline cepat, dan draf tulisan artikel. Anda dapat membersihkan data ini kapan saja melalui pengaturan cache browser Anda.
            </p>
          </section>

          {/* Section 5 */}
          <section className="bg-[#121324] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
            <h3 className="font-display font-black text-lg text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#00F0FF]" />
              <span>5. Hubungi Petugas Perlindungan Data</span>
            </h3>
            <p>
              Apabila Anda memiliki pertanyaan, keberatan, atau ingin meminta penghapusan data seputar Kebijakan Privasi ini, silakan hubungi tim legal kami:
            </p>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
              <div><strong>Email:</strong> privacy@sotoyfilm.com / legal@sotoyfilm.com</div>
              <div><strong>Subjek:</strong> Permohonan Hak Privasi Pengguna Sotoy Film</div>
              <div><strong>Alamat:</strong> Jl. Senopati No. 88, Kebayoran Baru, Jakarta Selatan, 12190</div>
            </div>
          </section>

        </div>

        {/* Back navigation */}
        <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => navigateTo('home')}
            className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            ← Kembali ke Beranda
          </button>
          <button
            onClick={() => navigateTo('terms-conditions')}
            className="text-xs font-bold text-[#00F0FF] hover:underline"
          >
            Baca Syarat & Ketentuan →
          </button>
        </div>

      </div>
    </div>
  );
};
