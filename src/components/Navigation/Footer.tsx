import React from 'react';
import { Clapperboard, Star, Heart, Sparkles, MessageSquare, Shield, Info, FileText, Scale, Briefcase } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Footer: React.FC = () => {
  const { navigateTo, currentView } = useApp();

  return (
    <footer id="main-footer" className="bg-[#090A10] border-t border-slate-800/80 pt-12 pb-8 mt-16 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-3">
            <div
              onClick={() => navigateTo('home')}
              className="flex items-center gap-2 cursor-pointer inline-flex"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF2E7E] via-[#FFD000] to-[#00F0FF] p-0.5">
                <div className="w-full h-full bg-[#0D0E15] rounded-[10px] flex items-center justify-center">
                  <Clapperboard className="w-4 h-4 text-[#FFD000]" />
                </div>
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
              <span className="bg-slate-900 border border-slate-800 text-[#FFD000] text-[10px] font-black px-2.5 py-1 rounded-lg">
                ★ 1-5 Bintang Skor Sotoy
              </span>
              <span className="bg-slate-900 border border-slate-800 text-[#00F0FF] text-[10px] font-black px-2.5 py-1 rounded-lg">
                Komunitas Terbuka
              </span>
            </div>
          </div>

          {/* Nav Col 1: Kategori */}
          <div className="space-y-2">
            <h4 className="font-bold text-white uppercase tracking-wider text-xs">
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
            <h4 className="font-bold text-white uppercase tracking-wider text-xs">
              Fitur Interaktif
            </h4>
            <ul className="space-y-1.5">
              <li>
                <button
                  onClick={() => navigateTo('film-database')}
                  className="hover:text-[#FFD000] transition-colors flex items-center gap-1"
                >
                  <Star className="w-3 h-3 text-[#FFD000] fill-current" />
                  <span>Rating Film (Skor Sotoy)</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('film-recommendations')}
                  className="hover:text-[#00F0FF] transition-colors"
                >
                  Rekomendasi Film Mood
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('community-feed')}
                  className="hover:text-[#FF2E7E] transition-colors"
                >
                  Live Feed Buzz Sotoy
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('user-profile')}
                  className="hover:text-[#00F0FF] transition-colors"
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
            <h4 className="font-bold text-white uppercase tracking-wider text-xs">
              Informasi & Legalitas
            </h4>
            <ul className="space-y-1.5">
              <li>
                <button
                  onClick={() => navigateTo('about-us')}
                  className={`hover:text-white transition-colors flex items-center gap-1.5 ${
                    currentView === 'about-us' ? 'text-[#00F0FF] font-bold' : ''
                  }`}
                >
                  <Info className="w-3 h-3" />
                  <span>Tentang Kami (About Us)</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('privacy-policy')}
                  className={`hover:text-white transition-colors flex items-center gap-1.5 ${
                    currentView === 'privacy-policy' ? 'text-[#00F0FF] font-bold' : ''
                  }`}
                >
                  <Shield className="w-3 h-3" />
                  <span>Kebijakan Privasi</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('terms-conditions')}
                  className={`hover:text-white transition-colors flex items-center gap-1.5 ${
                    currentView === 'terms-conditions' ? 'text-[#FFD000] font-bold' : ''
                  }`}
                >
                  <Scale className="w-3 h-3" />
                  <span>Syarat & Ketentuan</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('business-inquiries')}
                  className={`hover:text-white transition-colors flex items-center gap-1.5 ${
                    currentView === 'business-inquiries' ? 'text-[#FF2E7E] font-bold' : ''
                  }`}
                >
                  <Briefcase className="w-3 h-3" />
                  <span>Kemitraan & Bisnis</span>
                </button>
              </li>
            </ul>

            <div className="pt-3 border-t border-slate-800/80">
              <div className="text-[11px] font-bold text-slate-400 mb-1">Peran Akun:</div>
              <div className="text-[10px] space-y-0.5 text-slate-500">
                <div>• <span className="text-[#00F0FF]">Warga</span>: Penonton</div>
                <div>• <span className="text-[#FFD000]">Si Paling Sotoy</span>: Kritikus</div>
                <div>• <span className="text-[#FF2E7E]">Penulis</span>: Jurnalis</div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM MENU NAVIGATION BAR */}
        <div id="footer-bottom-menu" className="pt-6 border-t border-slate-800/80">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center justify-center sm:justify-between gap-3 text-xs">
            <div className="text-slate-400 font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse" />
              <span>Menu Bawah / Quick Links:</span>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
              <button
                id="bottom-menu-about"
                onClick={() => navigateTo('about-us')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-bold ${
                  currentView === 'about-us'
                    ? 'bg-[#00F0FF] text-slate-950 shadow-md shadow-[#00F0FF]/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                <span>About Us</span>
              </button>

              <button
                id="bottom-menu-privacy"
                onClick={() => navigateTo('privacy-policy')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-bold ${
                  currentView === 'privacy-policy'
                    ? 'bg-[#00F0FF] text-slate-950 shadow-md shadow-[#00F0FF]/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Privacy Policy</span>
              </button>

              <button
                id="bottom-menu-terms"
                onClick={() => navigateTo('terms-conditions')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-bold ${
                  currentView === 'terms-conditions'
                    ? 'bg-[#FFD000] text-slate-950 shadow-md shadow-[#FFD000]/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Terms and Conditions</span>
              </button>

              <button
                id="bottom-menu-business"
                onClick={() => navigateTo('business-inquiries')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-bold ${
                  currentView === 'business-inquiries'
                    ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
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
            © {new Date().getFullYear()} <strong>Sotoy Film</strong>. All rights reserved. Bebas berpendapat, tetap santun.
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
