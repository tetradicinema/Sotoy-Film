import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Star, ShieldCheck, FileText, Send, CheckCircle2 } from 'lucide-react';

export const CriticSubmissionPage: React.FC = () => {
  const { navigateTo, isLoggedIn, setLoginModalOpen, showToast } = useApp();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    publicationName: '',
    publicationUrl: '',
    twitterHandle: '',
    portfolioUrl: '',
    motivation: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      setLoginModalOpen(true);
      showToast('Harap masuk terlebih dahulu untuk mengirimkan form.');
      return;
    }
    
    // Simulate submission
    setTimeout(() => {
      setIsSubmitted(true);
      showToast('Formulir pengajuan kritikus berhasil dikirim!');
    }, 800);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (isSubmitted) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-black text-white mb-4">Pengajuan Diterima!</h1>
        <p className="text-slate-400 mb-8 max-w-lg mx-auto">
          Terima kasih telah mendaftar menjadi Si Paling Sotoy (Kritikus Terverifikasi). Seleksi diadakan setahun sekali dan dikurasi langsung oleh tim internal kami. Kami akan menghubungi Anda melalui email jika Anda terpilih.
        </p>
        <button
          onClick={() => navigateTo('home')}
          className="bg-cyan-500 text-slate-950 font-bold px-6 py-3 rounded-xl hover:bg-cyan-400 transition-colors"
        >
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 lg:py-12">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center justify-center p-3 bg-[#FFD000]/10 rounded-full mb-4 ring-1 ring-[#FFD000]/30">
          <Star className="w-8 h-8 text-[#FFD000] fill-current" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-4">
          Critic Submission
        </h1>
        <p className="text-slate-400 text-sm sm:text-base">
          Apakah kamu memiliki pandangan kritis yang tajam tentang sinema? Daftar menjadi <strong className="text-white">Si Paling Sotoy</strong> (Kritikus Terverifikasi) dan jadikan suaramu bagian dari agregasi skor kurator film tahunan kami.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-8 lg:gap-12">
        {/* Info & Criteria */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-[#FFD000]" />
              Tentang Si Paling Sotoy
            </h2>
            <p className="text-sm text-slate-400 mb-4 leading-relaxed">
              Kami mencari suara-suara unik dan berdedikasi dalam kritik film. Sebagai kritikus terverifikasi, ulasan Anda akan berkontribusi langsung pada agregat <strong>Skor Sotoy Kritikus</strong> di database kami.
            </p>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Seleksi pendaftaran ini diadakan secara ketat <strong className="text-white">satu tahun sekali</strong> dan diseleksi langsung secara manual oleh kurator internal Sotoy Film untuk memastikan kualitas ulasan.
            </p>

            <button
              onClick={() => navigateTo('critic-criteria')}
              className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Baca Criteria Code Kami
            </button>
          </div>
        </div>

        {/* Application Form */}
        <div className="lg:col-span-3">
          <div className="bg-[#121324] border border-slate-800 rounded-3xl p-6 sm:p-8">
            <h2 className="text-xl font-black text-white mb-6">Formulir Pendaftaran</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="fullName" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nama Lengkap</label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#FFD000] focus:ring-1 focus:ring-[#FFD000]"
                  placeholder="Nama sesuai identitas"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label htmlFor="publicationName" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nama Publikasi / Media</label>
                  <input
                    type="text"
                    id="publicationName"
                    name="publicationName"
                    required
                    value={formData.publicationName}
                    onChange={handleChange}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#FFD000] focus:ring-1 focus:ring-[#FFD000]"
                    placeholder="Contoh: Pop Culture Media"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="publicationUrl" className="text-xs font-bold text-slate-400 uppercase tracking-wider">URL Publikasi / Media</label>
                  <input
                    type="url"
                    id="publicationUrl"
                    name="publicationUrl"
                    required
                    value={formData.publicationUrl}
                    onChange={handleChange}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#FFD000] focus:ring-1 focus:ring-[#FFD000]"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label htmlFor="portfolioUrl" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Link Portofolio (Contoh Ulasan)</label>
                  <input
                    type="url"
                    id="portfolioUrl"
                    name="portfolioUrl"
                    required
                    value={formData.portfolioUrl}
                    onChange={handleChange}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#FFD000] focus:ring-1 focus:ring-[#FFD000]"
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="twitterHandle" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Akun Twitter / X</label>
                  <input
                    type="text"
                    id="twitterHandle"
                    name="twitterHandle"
                    value={formData.twitterHandle}
                    onChange={handleChange}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#FFD000] focus:ring-1 focus:ring-[#FFD000]"
                    placeholder="@username"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="motivation" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mengapa kamu layak menjadi Si Paling Sotoy?</label>
                <textarea
                  id="motivation"
                  name="motivation"
                  required
                  rows={4}
                  value={formData.motivation}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#FFD000] focus:ring-1 focus:ring-[#FFD000]"
                  placeholder="Ceritakan singkat tentang dedikasi kamu dalam mengulas film..."
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-4 rounded-xl bg-[#FFD000] text-slate-950 font-black text-sm hover:brightness-110 shadow-lg shadow-[#FFD000]/20 flex items-center justify-center gap-2 transition-all"
                >
                  <Send className="w-4 h-4" />
                  Kirim Pengajuan
                </button>
                <p className="text-center text-[11px] text-slate-500 mt-4">
                  Dengan mengirimkan formulir ini, Anda menyetujui syarat & ketentuan pengajuan kritikus Sotoy Film.
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
