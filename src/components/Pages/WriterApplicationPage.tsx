import React, { useEffect, useState } from 'react';
import {
  PenLine,
  Send,
  CheckCircle2,
  Clock,
  XCircle,
  Link2,
  Sparkles,
  FileText,
  LogIn,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useWriterApplications } from '../../hooks/useWriterApplications';
import type { WriterApplication } from '../../types';

const TOPIC_OPTIONS = [
  'Ulasan film',
  'Kajian sinema',
  'Berita industri',
  'Teknik & peralatan film',
  'Wawancara sineas',
];

const isValidUrl = (value: string): boolean => {
  if (!value.trim()) return true;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const WriterApplicationPage: React.FC = () => {
  const { navigateTo, isLoggedIn, setLoginModalOpen, showToast, currentUser } = useApp();
  const { getMine, submit } = useWriterApplications();

  const [application, setApplication] = useState<WriterApplication | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(isLoggedIn);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    userName: '',
    portfolioUrl: '',
    sampleUrl: '',
    topics: [] as string[],
    motivation: '',
  });

  useEffect(() => {
    let isMounted = true;
    if (!isLoggedIn) {
      setApplication(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    getMine()
      .then(result => {
        if (isMounted) setApplication(result);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
    // getMine is recreated per render; the user identity is the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, currentUser.id]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const accountName = currentUser.name && currentUser.name !== 'Tamu Sotoy' ? currentUser.name : '';
    if (!accountName) return;
    setFormData(prev => (prev.userName.trim() ? prev : { ...prev, userName: accountName }));
  }, [isLoggedIn, currentUser.name]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const toggleTopic = (topic: string) => {
    if (!isLoggedIn) return;
    setFormData(prev => ({
      ...prev,
      topics: prev.topics.includes(topic)
        ? prev.topics.filter(t => t !== topic)
        : [...prev.topics, topic],
    }));
  };

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (!formData.userName.trim()) {
      nextErrors.userName = 'Nama lengkap wajib diisi.';
    }
    if (!isValidUrl(formData.portfolioUrl)) {
      nextErrors.portfolioUrl = 'Masukkan tautan portofolio yang valid (diawali http:// atau https://).';
    }
    if (!isValidUrl(formData.sampleUrl)) {
      nextErrors.sampleUrl = 'Masukkan tautan contoh tulisan yang valid (diawali http:// atau https://).';
    }
    if (formData.motivation.trim().length < 50) {
      nextErrors.motivation = 'Ceritakan motivasimu minimal 50 karakter.';
    } else if (formData.motivation.length > 2000) {
      nextErrors.motivation = 'Motivasi maksimal 2000 karakter.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      setLoginModalOpen(true);
      showToast('Silakan masuk terlebih dahulu.');
      return;
    }
    if (!validate()) return;

    setIsSubmitting(true);
    const success = await submit({
      userName: formData.userName.trim(),
      portfolioUrl: formData.portfolioUrl.trim() || undefined,
      sampleUrl: formData.sampleUrl.trim() || undefined,
      topics: formData.topics.length > 0 ? formData.topics : undefined,
      motivation: formData.motivation.trim(),
    });
    setIsSubmitting(false);

    if (success) {
      setIsSubmitted(true);
      showToast('Pendaftaran penulis berhasil dikirim!', 'success');
    }
  };

  const renderStatusPanel = (app: WriterApplication) => {
    const statusConfig = {
      pending: {
        icon: <Clock className="w-10 h-10" />,
        iconClass: 'bg-amber-500/20 text-amber-400',
        title: 'Pendaftaran sedang ditinjau',
        description: 'Redaksi sedang meninjau pendaftaranmu. Kami akan menghubungi lewat email yang terdaftar di akunmu.',
      },
      approved: {
        icon: <CheckCircle2 className="w-10 h-10" />,
        iconClass: 'bg-emerald-500/20 text-emerald-400',
        title: 'Pendaftaran disetujui. Redaksi akan menghubungi lewat email.',
        description: 'Selamat! Pendaftaranmu sebagai penulis Sotoy Film disetujui. Cek email terdaftar untuk langkah selanjutnya.',
      },
      rejected: {
        icon: <XCircle className="w-10 h-10" />,
        iconClass: 'bg-slate-800 text-slate-400',
        title: 'Pendaftaran belum dapat kami terima saat ini.',
        description: 'Terima kasih sudah mendaftar. Kamu tetap bisa membaca dan ikut berdiskusi di komunitas Sotoy Film.',
      },
    }[app.status];

    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${statusConfig.iconClass}`}>
          {statusConfig.icon}
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white mb-4">{statusConfig.title}</h1>
        <p className="text-slate-400 mb-3 max-w-lg mx-auto leading-relaxed">{statusConfig.description}</p>
        <p className="text-xs text-slate-500 mb-8">Diajukan: {app.date}</p>
        <button
          onClick={() => navigateTo('home')}
          className="bg-[#FF2E7E] text-slate-950 font-bold px-6 py-3 rounded-xl hover:brightness-110 transition-all"
        >
          Kembali ke Beranda
        </button>
      </div>
    );
  };

  if (isSubmitted) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-black text-white mb-4">Pendaftaran Terkirim</h1>
        <p className="text-slate-400 mb-8 max-w-lg mx-auto leading-relaxed">
          Terima kasih. Redaksi akan meninjau pendaftaranmu. Kami menghubungi lewat email yang terdaftar di akunmu.
        </p>
        <button
          onClick={() => navigateTo('about-us')}
          className="bg-[#FF2E7E] text-slate-950 font-bold px-6 py-3 rounded-xl hover:brightness-110 transition-all"
        >
          Kembali ke Tentang Kami
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <div className="w-10 h-10 border-2 border-[#FF2E7E]/30 border-t-[#FF2E7E] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400 text-sm">Memeriksa status pendaftaran...</p>
      </div>
    );
  }

  if (application) {
    return renderStatusPanel(application);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 lg:py-12">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FF2E7E]/10 border border-[#FF2E7E]/30 text-[#FF2E7E] text-xs font-black uppercase tracking-wider mb-4">
          <PenLine className="w-3.5 h-3.5" />
          <span>Gabung Redaksi</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-4">
          Daftar jadi penulis Sotoy Film
        </h1>
        <p className="text-slate-400 text-sm sm:text-base">
          Ceritakan siapa dirimu dan topik film yang ingin kamu tulis. Redaksi meninjau setiap pendaftaran satu per satu.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-8 lg:gap-12">
        {/* Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-[#FF2E7E]" />
              Kenapa menulis di Sotoy Film?
            </h2>
            <p className="text-sm text-slate-400 mb-4 leading-relaxed">
              Kami mencari suara baru yang senang membahas film, dari ulasan jujur sampai kajian sinema dan berita industri.
            </p>
            <div className="space-y-3">
              {[
                'Tulisanmu dibaca komunitas penonton film Indonesia.',
                'Topik bisa kamu pilih sesuai minat dan keahlianmu.',
                'Redaksi meninjau setiap pendaftaran secara manual.',
              ].map(item => (
                <div key={item} className="flex items-start gap-2.5 text-sm text-slate-300 leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 text-[#FF2E7E] shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#171717] border border-slate-800 rounded-3xl p-6">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-[#FF2E7E]" />
              Yang kami nilai
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Ketertarikan pada film, kejelasan topik yang ingin ditulis, dan contoh tulisan yang menunjukkan gaya menulismu.
            </p>
          </div>
        </div>

        {/* Application Form */}
        <div className="lg:col-span-3">
          <div className="bg-[#171717] border border-slate-800 rounded-3xl p-6 sm:p-8">
            <h2 className="text-xl font-black text-white mb-6">Formulir Pendaftaran Penulis</h2>

            {!isLoggedIn && (
              <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
                <p className="text-xs text-amber-200 leading-relaxed">
                  Kamu harus masuk terlebih dahulu untuk mengirim pendaftaran. Formulir di bawah hanya dapat dibaca.
                </p>
                <button
                  type="button"
                  onClick={() => setLoginModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF2E7E] text-slate-950 font-black text-xs hover:brightness-110 transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  Masuk untuk mendaftar
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="userName" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  id="userName"
                  name="userName"
                  required
                  readOnly={!isLoggedIn}
                  value={formData.userName}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#FF2E7E] focus:ring-1 focus:ring-[#FF2E7E] disabled:opacity-60"
                  placeholder="Nama sesuai identitas"
                />
                {errors.userName && <p className="text-xs text-red-400">{errors.userName}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label htmlFor="portfolioUrl" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Tautan Portofolio
                  </label>
                  <div className="relative">
                    <Link2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      id="portfolioUrl"
                      name="portfolioUrl"
                      readOnly={!isLoggedIn}
                      value={formData.portfolioUrl}
                      onChange={handleChange}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#FF2E7E] focus:ring-1 focus:ring-[#FF2E7E] disabled:opacity-60"
                      placeholder="https://..."
                    />
                  </div>
                  {errors.portfolioUrl && <p className="text-xs text-red-400">{errors.portfolioUrl}</p>}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="sampleUrl" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Tautan Satu Contoh Tulisan
                  </label>
                  <div className="relative">
                    <Link2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      id="sampleUrl"
                      name="sampleUrl"
                      readOnly={!isLoggedIn}
                      value={formData.sampleUrl}
                      onChange={handleChange}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#FF2E7E] focus:ring-1 focus:ring-[#FF2E7E] disabled:opacity-60"
                      placeholder="https://..."
                    />
                  </div>
                  {errors.sampleUrl && <p className="text-xs text-red-400">{errors.sampleUrl}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Topik yang Diminati</span>
                <div className="flex flex-wrap gap-2">
                  {TOPIC_OPTIONS.map(topic => {
                    const selected = formData.topics.includes(topic);
                    return (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => toggleTopic(topic)}
                        disabled={!isLoggedIn}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors disabled:opacity-60 ${
                          selected
                            ? 'bg-[#FF2E7E]/20 border-[#FF2E7E]/60 text-[#FF2E7E]'
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        {topic}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="motivation" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Motivasi
                </label>
                <textarea
                  id="motivation"
                  name="motivation"
                  required
                  rows={6}
                  readOnly={!isLoggedIn}
                  value={formData.motivation}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#FF2E7E] focus:ring-1 focus:ring-[#FF2E7E] disabled:opacity-60"
                  placeholder="Ceritakan siapa dirimu, pengalaman menulismu, dan topik film yang ingin kamu tulis..."
                />
                <div className="flex items-center justify-between gap-3">
                  {errors.motivation ? (
                    <p className="text-xs text-red-400">{errors.motivation}</p>
                  ) : (
                    <p className="text-[11px] text-slate-500">Minimal 50 karakter.</p>
                  )}
                  <span className={`text-[11px] font-mono ${formData.motivation.length > 2000 ? 'text-red-400' : 'text-slate-500'}`}>
                    {formData.motivation.length}/2000
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!isLoggedIn || isSubmitting}
                  className="w-full py-4 rounded-xl bg-[#FF2E7E] text-slate-950 font-black text-sm hover:brightness-110 shadow-lg shadow-[#FF2E7E]/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? 'Mengirim...' : 'Kirim Pendaftaran'}
                </button>
                <p className="text-center text-[11px] text-slate-500 mt-4">
                  Dengan mengirimkan formulir ini, kamu menyetujui peninjauan pendaftaran oleh redaksi Sotoy Film.
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
