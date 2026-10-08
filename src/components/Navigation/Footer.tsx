import React from 'react';
import { Clapperboard, Star, Info, Shield, Scale, Briefcase, HelpCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Footer: React.FC = () => {
  const { navigateTo, currentView } = useApp();

  return (
    <footer id="main-footer" className="bg-[#0A0A0A] border-t border-white/[0.08] pt-12 pb-8 mt-16 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-3">
            <div
              onClick={() => navigateTo('home')}
              className="flex items-center gap-2 cursor-pointer inline-flex group"
            >
              <div className="w-8 h-8 rounded-xl bg-[#171717] border border-white/10 flex items-center justify-center text-[#FF2E7E] transition-all group-hover:border-[#FF2E7E]/50">
                <Clapperboard className="w-4 h-4 text-[#FF2E7E]" />
              </div>
              <div className="flex items-center gap-1 font-display font-black text-xl text-white tracking-tight">
                <span>SOTOY</span>
                <span className="text-[#FF2E7E]">FILM</span>
              </div>
            </div>

            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
              Platform media & jejaring sosial film pop-culture independen. Mengulas film, serial, anime, cinema gear, dan studi filmmaking dengan sistem penilaian jujur <strong>Skor Sotoy (Bintang 1-5)</strong>.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <span className="bg-[#171717] border border-white/[0.08] text-slate-300 text-[10px] font-semibold px-2.5 py-1 rounded-md">
                ★ 1-5 Bintang Skor Sotoy
              </span>
              <span className="bg-[#171717] border border-white/[0.08] text-slate-300 text-[10px] font-semibold px-2.5 py-1 rounded-md">
                Komunitas Terbuka
              </span>
            </div>
          </div>

          {/* Nav Col 1: Kategori */}
          <div className="space-y-2">
            <h4 className="font-semibold text-white uppercase tracking-wider text-xs font-mono">
              Kategori Artikel
            </h4>
            <ul className="space-y-1.5">
              <li>
                <button
                  onClick={() => navigateTo('category', { category: 'movies' })}
                  className="hover:text-white transition-colors"
                >
                  Movies (News, Lists, Reviews)
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('category', { category: 'series' })}
                  className="hover:text-white transition-colors"
                >
                  Series (News, Lists, Reviews)
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('category', { category: 'anime' })}
                  className="hover:text-white transition-colors"
                >
                  Anime (News, Lists)
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('category', { category: 'cinema-gear' })}
                  className="hover:text-white transition-colors"
                >
                  Cinema Gear (News & Reviews)
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('category', { category: 'film-studies' })}
                  className="hover:text-white transition-colors"
                >
                  Film Studies (Producing - Post)
                </button>
              </li>
            </ul>
          </div>

          {/* Nav Col 2: Fitur Utama */}
          <div className="space-y-2">
            <h4 className="font-semibold text-white uppercase tracking-wider text-xs font-mono">
              Fitur Interaktif
            </h4>
            <ul className="space-y-1.5">
              <li>
                <button
                  onClick={() => navigateTo('film-database')}
                  className="hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Star className="w-3.5 h-3.5 text-slate-400" />
                  <span>Rating Film (Skor Sotoy)</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('film-recommendations')}
                  className="hover:text-white transition-colors"
                >
                  Rekomendasi Film Mood
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('community-feed')}
                  className="hover:text-white transition-colors"
                >
                  Live Feed Buzz Sotoy
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('user-profile')}
                  className="hover:text-white transition-colors"
                >
                  Profil & Dashboard Saya
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('write-article')}
                  className="hover:text-white transition-colors"
                >
                  Portal Penulis Sotoy
                </button>
              </li>
            </ul>
          </div>

          {/* Nav Col 3: Informasi & Legal */}
          <div className="space-y-2">
            <h4 className="font-semibold text-white uppercase tracking-wider text-xs font-mono">
              Informasi & Legalitas
            </h4>
            <ul className="space-y-1.5">
              <li>
                <button
                  onClick={() => navigateTo('about-us')}
                  className={`hover:text-white transition-colors flex items-center gap-1.5 ${
                    currentView === 'about-us' ? 'text-[#FF2E7E] font-semibold' : ''
                  }`}
                >
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tentang Kami (About Us)</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('faq-guide')}
                  className={`hover:text-white transition-colors flex items-center gap-1.5 ${
                    currentView === 'faq-guide' ? 'text-[#FF2E7E] font-semibold' : ''
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                  <span>Panduan Lengkap (FAQ)</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('privacy-policy')}
                  className={`hover:text-white transition-colors flex items-center gap-1.5 ${
                    currentView === 'privacy-policy' ? 'text-[#FF2E7E] font-semibold' : ''
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                  <span>Kebijakan Privasi</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('terms-conditions')}
                  className={`hover:text-white transition-colors flex items-center gap-1.5 ${
                    currentView === 'terms-conditions' ? 'text-[#FF2E7E] font-semibold' : ''
                  }`}
                >
                  <Scale className="w-3.5 h-3.5 text-slate-400" />
                  <span>Syarat & Ketentuan</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('business-inquiries')}
                  className={`hover:text-white transition-colors flex items-center gap-1.5 ${
                    currentView === 'business-inquiries' ? 'text-[#FF2E7E] font-semibold' : ''
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span>Kemitraan & Bisnis</span>
                </button>
              </li>
            </ul>


          </div>
        </div>

        {/* BOTTOM MENU NAVIGATION BAR */}
        <div id="footer-bottom-menu" className="pt-6 border-t border-white/[0.08]">
          <div className="bg-[#171717] border border-white/[0.08] rounded-xl p-3 flex flex-wrap items-center justify-center sm:justify-between gap-3 text-xs">
            <div className="text-slate-400 font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF2E7E]" />
              <span>Menu Bawah / Quick Links:</span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <button
                id="bottom-menu-about"
                onClick={() => navigateTo('about-us')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold ${
                  currentView === 'about-us'
                    ? 'bg-[#FF2E7E] text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                <span>About Us</span>
              </button>

              <button
                id="bottom-menu-guide"
                onClick={() => navigateTo('faq-guide')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold ${
                  currentView === 'faq-guide'
                    ? 'bg-[#FF2E7E] text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Panduan Lengkap (FAQ)</span>
              </button>

              <button
                id="bottom-menu-privacy"
                onClick={() => navigateTo('privacy-policy')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold ${
                  currentView === 'privacy-policy'
                    ? 'bg-[#FF2E7E] text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Privacy Policy</span>
              </button>

              <button
                id="bottom-menu-terms"
                onClick={() => navigateTo('terms-conditions')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold ${
                  currentView === 'terms-conditions'
                    ? 'bg-[#FF2E7E] text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Terms and Conditions</span>
              </button>

              <button
                id="bottom-menu-business"
                onClick={() => navigateTo('business-inquiries')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold ${
                  currentView === 'business-inquiries'
                    ? 'bg-[#FF2E7E] text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Business Inquiries</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sponsor space & copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
          <div>
            © {new Date().getFullYear()} <strong className="text-slate-400 font-semibold">Sotoy Film</strong>. All rights reserved. Bebas berpendapat, tetap santun.
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateTo('business-inquiries')}
              className="hover:text-white transition-colors"
            >
              Slot Iklan & Kemitraan: sponsor@sotoyfilm.com
            </button>
            <span>•</span>
            <span>Jakarta, Indonesia</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
