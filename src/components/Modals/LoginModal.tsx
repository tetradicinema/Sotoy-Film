import React, { useState } from 'react';
import { X, LogIn, User as UserIcon, Mail, Lock, UserPlus, AlertTriangle, Chrome } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const LoginModal: React.FC = () => {
  const { 
    loginModalOpen, 
    setLoginModalOpen, 
    logout, 
    signInWithEmail, 
    signUpWithEmail, 
    signInWithGoogle,
    showToast,
    getLastAuthErrorCode,
    clearAuthError,
  } = useApp();

  // Email Auth States
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRestrictedWarning, setShowRestrictedWarning] = useState(false);

  if (!loginModalOpen) return null;

  const handleSubmitAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      showToast('Email dan password wajib diisi.');
      return;
    }

    if (password.length < 6) {
      showToast('Password minimal berukuran 6 karakter.');
      return;
    }

    setLoading(true);
    setShowRestrictedWarning(false);
    clearAuthError();
    try {
      if (isSignUp) {
        if (!name.trim()) {
          showToast('Nama Lengkap wajib diisi.');
          setLoading(false);
          return;
        }
        const customHandle = handle.trim() ? (handle.startsWith('@') ? handle : `@${handle}`) : `@user_${Math.floor(Math.random() * 10000)}`;
        const success = await signUpWithEmail(email, password, name, customHandle);
        if (success) {
          setEmail('');
          setPassword('');
          setName('');
          setHandle('');
          setShowRestrictedWarning(false);
        } else {
          const errCode = getLastAuthErrorCode();
          if (errCode === 'auth/admin-restricted-operation') {
            setShowRestrictedWarning(true);
          } else {
            setShowRestrictedWarning(false);
          }
        }
      } else {
        const success = await signInWithEmail(email, password);
        if (success) {
          setShowRestrictedWarning(false);
        } else {
          const errCode = getLastAuthErrorCode();
          if (errCode === 'auth/admin-restricted-operation') {
            setShowRestrictedWarning(true);
          } else {
            setShowRestrictedWarning(false);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      const errCode = err?.code || getLastAuthErrorCode();
      if (errCode === 'auth/admin-restricted-operation') {
        setShowRestrictedWarning(true);
      } else {
        setShowRestrictedWarning(false);
        showToast(err?.message || 'Gagal masuk. Mohon coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="login-modal-backdrop"
      className="fixed inset-0 z-50 bg-[#0E1013]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        id="login-modal-container"
        className="bg-[#171A1F] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="bg-[#171A1F] p-5 border-b border-white/[0.08] flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-[#FF2E7E]">
              {isSignUp ? (
                <UserPlus className="w-5 h-5 text-[#FF2E7E]" />
              ) : (
                <LogIn className="w-5 h-5 text-[#FF2E7E]" />
              )}
            </div>
            <div>
              <h3 className="font-display font-bold text-white text-base leading-tight">
                {isSignUp ? 'Daftar Akun Baru' : 'Masuk ke Sotoy Film'}
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Beri skor ulasan film, komentar artikel, dan kumpul bareng cinephile
              </p>
            </div>
          </div>

          <button
            id="close-login-modal-btn"
            onClick={() => setLoginModalOpen(false)}
            className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          
          {/* Primary 1-Click Google Sign In */}
          <div className="space-y-2">
            <button
              id="google-signin-btn"
              type="button"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                setShowRestrictedWarning(false);
                try {
                  await signInWithGoogle();
                } catch (err) {
                  console.error(err);
                } finally {
                  setLoading(false);
                }
              }}
              className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold text-white bg-white/[0.05] border border-white/10 hover:border-white/20 hover:bg-white/[0.08] transition-all flex items-center justify-center gap-3 cursor-pointer group"
            >
              <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center p-0.5 shrink-0 shadow-sm">
                <Chrome className="w-3.5 h-3.5 text-[#EA4335]" />
              </div>
              <span>Lanjut Masuk Cepat dengan Google</span>
            </button>
            <p className="text-[11px] text-slate-400 text-center font-mono">
              Aman & terintegrasi langsung dengan Firebase Google Auth.
            </p>
          </div>

          <div className="relative my-3 flex py-1 items-center">
            <div className="flex-grow border-t border-white/[0.08]"></div>
            <span className="flex-shrink mx-3 text-[10px] text-slate-500 uppercase tracking-wider font-mono">atau dengan Email</span>
            <div className="flex-grow border-t border-white/[0.08]"></div>
          </div>

          <form onSubmit={handleSubmitAuth} className="space-y-3.5">
            {isSignUp && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nama Lengkap <span className="text-[#FF2E7E]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <input
                      id="signup-name-input"
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Contoh: Budi Cinephile"
                      className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Username / Handle
                  </label>
                  <input
                    id="signup-handle-input"
                    type="text"
                    value={handle}
                    onChange={e => setHandle(e.target.value)}
                    placeholder="Contoh: @budisuka_film"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Alamat Email <span className="text-[#FF2E7E]">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="auth-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Kata Sandi (Password) <span className="text-[#FF2E7E]">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="auth-password-input"
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
                />
              </div>
            </div>

            {showRestrictedWarning && (
              <div className="bg-amber-950/40 border border-amber-500/30 rounded-lg p-3 text-left space-y-2.5 animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-start gap-2 text-amber-400">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold">Pendaftaran Email Dibatasi oleh Firebase</p>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                      Metode Email/Password belum diaktifkan di Firebase Console (<span className="text-amber-300 font-mono">auth/admin-restricted-operation</span>).
                    </p>
                  </div>
                </div>
                <div className="text-[11px] text-center pt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      setLoading(true);
                      try {
                        await signInWithGoogle();
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="text-xs font-semibold text-[#FF2E7E] hover:underline cursor-pointer"
                  >
                    👉 Klik di sini untuk Masuk Langsung dengan Google
                  </button>
                </div>
              </div>
            )}

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold text-white bg-[#FF2E7E] hover:bg-[#e0266e] transition-all flex items-center justify-center gap-1.5 shadow-md shadow-sm active:scale-[0.98] cursor-pointer"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isSignUp ? (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  Daftar dengan Email
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5" />
                  Masuk dengan Email
                </>
              )}
            </button>

            <div className="text-center pt-1">
              <button
                id="toggle-signup-mode-btn"
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setShowRestrictedWarning(false);
                  clearAuthError();
                }}
                className="text-xs text-[#FF2E7E] hover:underline cursor-pointer"
              >
                {isSignUp ? 'Sudah punya akun? Masuk dengan Email' : 'Belum punya akun? Daftar dengan Email'}
              </button>
            </div>
          </form>

          <div className="pt-2 text-center border-t border-white/[0.08]">
            <button
              id="continue-as-guest-btn"
              onClick={() => {
                setLoginModalOpen(false);
                logout();
              }}
              className="text-xs text-slate-400 hover:text-white transition-colors py-1 px-3 rounded-lg hover:bg-white/[0.05]"
            >
              Tetap Jelajah Sebagai Pengunjung (Visitor)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
