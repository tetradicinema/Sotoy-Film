import React, { useState } from 'react';
import {
  Briefcase,
  TrendingUp,
  Users,
  Eye,
  Mail,
  Phone,
  Send,
  Sparkles,
  Award,
  Film,
  Camera,
  CheckCircle2,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AdBannerSlot } from '../Common/AdBannerSlot';

export const BusinessInquiriesPage: React.FC = () => {
  const { showToast, navigateTo } = useApp();

  const [formState, setFormState] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    partnershipType: 'screening',
    budgetRange: 'idr_10_25m',
    estimatedTimeline: '',
    message: '',
  });

  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.companyName || !formState.contactName || !formState.email || !formState.message) {
      showToast('Mohon lengkapi formulir kemitraan sebelum mengirimkan proposal.');
      return;
    }

    setIsSubmitted(true);
    showToast(`Terima kasih ${formState.contactName}! Proposal kemitraan ${formState.companyName} telah diterima oleh tim Business Development.`);
  };

  return (
    <div id="business-inquiries-page" className="min-h-screen py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header Hero */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FF2E7E]/10 border border-[#FF2E7E]/30 text-[#FF2E7E] text-xs font-black uppercase tracking-wider">
            <Briefcase className="w-3.5 h-3.5" />
            <span>Kemitraan, Iklan & Kolaborasi Sinema</span>
          </div>

          <h1 className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight leading-tight">
            Hubungkan Karya Film & Brand Anda dengan <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF2E7E] via-[#FF2E7E] to-[#FF2E7E]">Audiens Paling Antusias.</span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Sotoy Film menjembatani studio film, rumah produksi, distributor independen, produsen gear kamera, serta brand teknologi dengan komunitas cinephile dan penonton bioskop terbesar di Indonesia.
          </p>
        </div>

        {/* Global Page Ad Banner */}
        <AdBannerSlot variant="leaderboard" />

        {/* Media Kit Snapshot / Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#171717] border border-slate-800 rounded-3xl p-5 text-center space-y-1 shadow-lg">
            <div className="font-display font-black text-3xl sm:text-4xl text-[#FF2E7E]">
              450K+
            </div>
            <div className="text-xs font-bold text-white">Pembaca Aktif / Bulan</div>
            <div className="text-[11px] text-slate-400">Film Enthusiasts & Penonton</div>
          </div>

          <div className="bg-[#171717] border border-slate-800 rounded-3xl p-5 text-center space-y-1 shadow-lg">
            <div className="font-display font-black text-3xl sm:text-4xl text-[#FF2E7E]">
              85K+
            </div>
            <div className="text-xs font-bold text-white">Buzz & Interaksi Opini</div>
            <div className="text-[11px] text-slate-400">Tingkat Retensi Sosial Tinggi</div>
          </div>

          <div className="bg-[#171717] border border-slate-800 rounded-3xl p-5 text-center space-y-1 shadow-lg">
            <div className="font-display font-black text-3xl sm:text-4xl text-[#FF2E7E]">
              72%
            </div>
            <div className="text-xs font-bold text-white">Demografi 18 - 34 Tahun</div>
            <div className="text-[11px] text-slate-400">Gen-Z & Urban Moviegoers</div>
          </div>

          <div className="bg-[#171717] border border-slate-800 rounded-3xl p-5 text-center space-y-1 shadow-lg">
            <div className="font-display font-black text-3xl sm:text-4xl text-purple-400">
              94%
            </div>
            <div className="text-xs font-bold text-white">Full-House Screening</div>
            <div className="text-[11px] text-slate-400">Komunitas Offline Terlibat</div>
          </div>
        </div>

        {/* 4 Partnership Pillars */}
        <div className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="font-display font-black text-2xl sm:text-3xl text-white">
              Solusi & Format Kolaborasi
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm">
              Kami menyusun format promosi yang terasa organik, informatif, dan tidak merusak integritas pengalaman membaca penikmat film.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#171717] border border-slate-800 rounded-3xl p-6 space-y-3 hover:border-[#FF2E7E]/50 transition-colors shadow-lg">
              <div className="w-10 h-10 rounded-2xl bg-[#FF2E7E]/10 text-[#FF2E7E] flex items-center justify-center">
                <Film className="w-5 h-5" />
              </div>
              <h3 className="font-display font-black text-lg text-white">
                Exclusive Premiere & Community Screening
              </h3>
              <p className="text-slate-300 text-xs leading-relaxed">
                Pemutaran perdana bersama 200+ Warga Sotoy dan kritikus terverifikasi (Si Paling Sotoy). Dilengkapi dengan live Q&A bersama sineas/aktor, merchandise kit khusus, dan buzzing serentak di media sosial.
              </p>
            </div>

            <div className="bg-[#171717] border border-slate-800 rounded-3xl p-6 space-y-3 hover:border-[#FF2E7E]/50 transition-colors shadow-lg">
              <div className="w-10 h-10 rounded-2xl bg-[#FF2E7E]/10 text-[#FF2E7E] flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="font-display font-black text-lg text-white">
                Editorial Showcase & Filmmaker In-Depth
              </h3>
              <p className="text-slate-300 text-xs leading-relaxed">
                Artikel liputan mendalam proses kreatif, bedah naskah, wawancara sutradara, dan esai teknis di kategori Film Studies yang ditulis langsung oleh jurnalis Penulis Sotoy dengan penandaan transparansi resmi.
              </p>
            </div>

            <div className="bg-[#171717] border border-slate-800 rounded-3xl p-6 space-y-3 hover:border-[#FF2E7E]/50 transition-colors shadow-lg">
              <div className="w-10 h-10 rounded-2xl bg-[#FF2E7E]/10 text-[#FF2E7E] flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="font-display font-black text-lg text-white">
                Display Ad Placements (Leaderboard & Sidebar)
              </h3>
              <p className="text-slate-300 text-xs leading-relaxed">
                Slot penayangan banner resmi beresolusi tinggi di posisi strategis: Leaderboard halaman utama, artikel detail, in-feed kategori film, dan sticky sidebar desktop dengan pelaporan CTR yang transparan.
              </p>
            </div>

            <div className="bg-[#171717] border border-slate-800 rounded-3xl p-6 space-y-3 hover:border-purple-400/50 transition-colors shadow-lg">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <Camera className="w-5 h-5" />
              </div>
              <h3 className="font-display font-black text-lg text-white">
                Cinema Gear Testing & Tech Review
              </h3>
              <p className="text-slate-300 text-xs leading-relaxed">
                Uji coba langsung kamera sinema, lensa anamorphic, lighting rig, dan software grading oleh praktisi sinematografi kami dalam format artikel video dan review tertulis di kanal Cinema Gear.
              </p>
            </div>
          </div>
        </div>

        {/* Business Inquiry Form */}
        <div className="bg-[#171717] border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#FF2E7E]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-2xl mb-8 space-y-2">
            <h2 className="font-display font-black text-2xl sm:text-3xl text-white">
              Kirimkan Proposal / Brief Kemitraan
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm">
              Tim Business Development kami akan mempelajari materi Anda dan memberikan balasan dalam kurun waktu 1x24 jam hari kerja.
            </p>
          </div>

          {isSubmitted ? (
            <div className="p-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h3 className="font-display font-black text-xl text-white">
                Proposal Berhasil Dikirimkan!
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
                Terima kasih atas ketertarikan Anda berkolaborasi dengan Sotoy Film. Manajer Kemitraan kami akan segera menghubungi email <strong>{formState.email}</strong> beserta penawaran Media Kit & Rate Card lengkap.
              </p>
              <button
                type="button"
                onClick={() => setIsSubmitted(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
              >
                Kirim Proposal Lainnya
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Nama Perusahaan / Brand / PH Film <span className="text-[#FF2E7E]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.companyName}
                    onChange={e => setFormState({ ...formState, companyName: e.target.value })}
                    placeholder="Contoh: Palari Films / Sony Cine"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Nama Kontak PIC <span className="text-[#FF2E7E]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.contactName}
                    onChange={e => setFormState({ ...formState, contactName: e.target.value })}
                    placeholder="Nama lengkap Anda"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Alamat Email Bisnis <span className="text-[#FF2E7E]">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formState.email}
                    onChange={e => setFormState({ ...formState, email: e.target.value })}
                    placeholder="partner@company.com"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Nomor Telepon / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={formState.phone}
                    onChange={e => setFormState({ ...formState, phone: e.target.value })}
                    placeholder="+62 812-xxxx-xxxx"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Jenis Kolaborasi Kemitraan
                  </label>
                  <select
                    value={formState.partnershipType}
                    onChange={e => setFormState({ ...formState, partnershipType: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF2E7E]"
                  >
                    <option value="screening">Special Community Screening & Premiere</option>
                    <option value="editorial">Sponsored Article & Filmmaker Interview</option>
                    <option value="display_ads">Display Banner Ads (Leaderboard & Sidebar)</option>
                    <option value="gear_review">Cinema Gear Testing & Hardware Review</option>
                    <option value="media_partner">Official Media Partner Festival Sinema</option>
                    <option value="custom">Program Kustom / Lainnya</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Estimasi Waktu Pelaksanaan
                  </label>
                  <input
                    type="text"
                    value={formState.estimatedTimeline}
                    onChange={e => setFormState({ ...formState, estimatedTimeline: e.target.value })}
                    placeholder="Contoh: Kuartal 4 2026 / Bulan Depan"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Rincian Brief / Catatan Proposal <span className="text-[#FF2E7E]">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={formState.message}
                  onChange={e => setFormState({ ...formState, message: e.target.value })}
                  placeholder="Ceritakan gambaran kampanye film atau brand Anda, target audiens, serta ekspektasi output kolaborasi bersama Sotoy Film..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E] resize-none"
                />
              </div>

              <div className="flex items-center justify-between flex-wrap gap-4 pt-2">
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#FF2E7E]" />
                  <span>Atau email langsung ke: <strong>business@sotoyfilm.com</strong></span>
                </div>

                <button
                  type="submit"
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#FF2E7E] to-[#FF2E7E] hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#FF2E7E]/20 transition-transform active:scale-95"
                >
                  <span>Kirim Proposal Kemitraan</span>
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Office & Direct Contact Bar */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            <div className="font-bold text-white mb-0.5">Sotoy Film Media Group</div>
            <div>Jl. Senopati No. 88, Kebayoran Baru, Jakarta Selatan 12190</div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#FF2E7E]" />
              <span className="text-slate-300 font-medium">business@sotoyfilm.com</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#FF2E7E]" />
              <span className="text-slate-300 font-medium">+62 812-9900-SOTOY</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
