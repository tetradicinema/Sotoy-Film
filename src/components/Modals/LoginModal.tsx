import React, { useState } from 'react';
import { X, LogIn, Star, PenSquare, Shield, User as UserIcon, Sparkles, CheckCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { INITIAL_USERS } from '../../data/mockData';

export const LoginModal: React.FC = () => {
  const { loginModalOpen, setLoginModalOpen, login, logout, showToast } = useApp();
  const [customHandle, setCustomHandle] = useState('');

  if (!loginModalOpen) return null;

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customHandle.trim()) {
      showToast('Masukkan nama atau username kamu');
      return;
    }
    // Log in as Warga Sotoy with customized handle
    login('warga');
  };

  return (
    <div
      id="login-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        id="login-modal-container"
        className="bg-[#151624] border border-slate-700/80 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#121324] via-[#1a1b32] to-[#121324] p-6 border-b border-slate-800 flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF2E7E] via-[#FFD000] to-[#00F0FF] p-0.5 shadow-lg shadow-[#FF2E7E]/30">
              <div className="w-full h-full bg-[#151624] rounded-[14px] flex items-center justify-center">
                <LogIn className="w-5 h-5 text-[#FFD000]" />
              </div>
            </div>
            <div>
              <h3 className="font-display font-black text-white text-lg leading-tight">
                Masuk ke Sotoy Film
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Pilih akun untuk berkomentar, beri skor, atau ulas film
              </p>
            </div>
          </div>

          <button
            id="close-login-modal-btn"
            onClick={() => setLoginModalOpen(false)}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-white/20 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Information Pill */}
          <div className="bg-[#FFD000]/10 border border-[#FFD000]/30 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-[#FFD000]">
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>Perhatian:</strong> Komentar artikel dan ulasan film hanya dapat dikirimkan oleh pengguna yang telah Masuk (Log In). Pilih salah satu akun persona di bawah ini:
            </span>
          </div>

          {/* Quick 1-Click Persona Logins */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
              Pilih Akun Persona (Masuk 1-Klik):
            </span>

            {/* Warga Sotoy */}
            <button
              id="login-as-warga-btn"
              onClick={() => login('warga')}
              className="w-full p-3 bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/30 hover:border-cyan-500 rounded-2xl flex items-center justify-between text-left transition-all group"
            >
              <div className="flex items-center gap-3">
                <img
                  src={INITIAL_USERS.warga.avatar}
                  alt={INITIAL_USERS.warga.name}
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-cyan-500/40"
                />
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                    <span>{INITIAL_USERS.warga.name}</span>
                    <span className="text-[10px] font-black px-2 py-0.2 rounded-full bg-cyan-500/20 text-[#00F0FF] border border-cyan-500/40">
                      Warga Sotoy
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Mendarat di <strong>Buzz Feed</strong>. Beri Skor Sotoy, ulasan, & ikuti sesama cinephile.
                  </div>
                </div>
              </div>
              <div className="text-xs font-bold text-[#00F0FF] px-2.5 py-1 rounded-lg bg-cyan-500/10 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors shrink-0">
                Masuk (Buzz Feed) →
              </div>
            </button>

            {/* Si Paling Sotoy (Critic) */}
            <button
              id="login-as-critic-btn"
              onClick={() => login('critic')}
              className="w-full p-3 bg-slate-900/90 hover:bg-slate-800 border border-amber-500/30 hover:border-amber-500 rounded-2xl flex items-center justify-between text-left transition-all group"
            >
              <div className="flex items-center gap-3">
                <img
                  src={INITIAL_USERS.critic.avatar}
                  alt={INITIAL_USERS.critic.name}
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-amber-500/40"
                />
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                    <span>{INITIAL_USERS.critic.name}</span>
                    <span className="text-[10px] font-black px-2 py-0.2 rounded-full bg-amber-500/20 text-[#FFD000] border border-amber-500/40 flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 fill-current" /> Si Paling Sotoy
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Mendarat di <strong>Film Database</strong>. Kurasi sinema berbobot & ulasan teknis.
                  </div>
                </div>
              </div>
              <div className="text-xs font-bold text-[#FFD000] px-2.5 py-1 rounded-lg bg-amber-500/10 group-hover:bg-[#FFD000] group-hover:text-slate-950 transition-colors shrink-0">
                Masuk (Database) →
              </div>
            </button>

            {/* Penulis Sotoy (Writer) */}
            <button
              id="login-as-writer-btn"
              onClick={() => login('writer')}
              className="w-full p-3 bg-slate-900/90 hover:bg-slate-800 border border-pink-500/30 hover:border-pink-500 rounded-2xl flex items-center justify-between text-left transition-all group"
            >
              <div className="flex items-center gap-3">
                <img
                  src={INITIAL_USERS.writer.avatar}
                  alt={INITIAL_USERS.writer.name}
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-pink-500/40"
                />
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-pink-400 transition-colors flex items-center gap-1.5">
                    <span>{INITIAL_USERS.writer.name}</span>
                    <span className="text-[10px] font-black px-2 py-0.2 rounded-full bg-pink-500/20 text-[#FF2E7E] border border-pink-500/40 flex items-center gap-0.5">
                      <PenSquare className="w-2.5 h-2.5" /> Penulis Sotoy
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Mendarat di <strong>Beranda</strong> + Tombol Akses <strong>Tulis Artikel Baru</strong>.
                  </div>
                </div>
              </div>
              <div className="text-xs font-bold text-[#FF2E7E] px-2.5 py-1 rounded-lg bg-pink-500/10 group-hover:bg-[#FF2E7E] group-hover:text-white transition-colors shrink-0">
                Masuk (Beranda) →
              </div>
            </button>

            {/* Admin */}
            <button
              id="login-as-admin-btn"
              onClick={() => login('admin')}
              className="w-full p-3 bg-slate-900/90 hover:bg-slate-800 border border-purple-500/30 hover:border-purple-500 rounded-2xl flex items-center justify-between text-left transition-all group"
            >
              <div className="flex items-center gap-3">
                <img
                  src={INITIAL_USERS.admin.avatar}
                  alt={INITIAL_USERS.admin.name}
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-purple-500/40"
                />
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors flex items-center gap-1.5">
                    <span>{INITIAL_USERS.admin.name}</span>
                    <span className="text-[10px] font-black px-2 py-0.2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-0.5">
                      <Shield className="w-2.5 h-2.5" /> Admin
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Mendarat di <strong>Beranda</strong> + Tombol <strong>Tulis Artikel & Kelola</strong>.
                  </div>
                </div>
              </div>
              <div className="text-xs font-bold text-purple-400 px-2.5 py-1 rounded-lg bg-purple-500/10 group-hover:bg-purple-600 group-hover:text-white transition-colors shrink-0">
                Masuk (Admin) →
              </div>
            </button>
          </div>

          <div className="pt-2 text-center border-t border-slate-800/80">
            <button
              id="continue-as-guest-btn"
              onClick={() => {
                setLoginModalOpen(false);
                logout();
              }}
              className="text-xs text-slate-400 hover:text-white transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-800/60"
            >
              👀 Lanjutkan sebagai Pengunjung / Visitor (Buka Beranda)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
