import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const EmailVerificationBanner: React.FC = () => {
  const { 
    isLoggedIn, 
    isEmailVerified, 
    currentUser, 
    resendVerificationEmail, 
    refreshEmailVerification 
  } = useApp();

  const [cooldown, setCooldown] = useState<number>(0);
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  if (!isLoggedIn || isEmailVerified || !currentUser?.email) {
    return null;
  }

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    const sent = await resendVerificationEmail();
    setIsResending(false);
    if (sent) {
      setCooldown(60);
    }
  };

  const handleCheckVerified = async () => {
    if (isChecking) return;
    setIsChecking(true);
    await refreshEmailVerification();
    setIsChecking(false);
  };

  return (
    <div
      id="email-verification-banner"
      role="alert"
      className="bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-amber-500/20 border-b border-amber-500/40 text-amber-200 px-4 py-2.5 shadow-md relative z-40"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4 text-xs">
        <div className="flex items-center gap-2 text-center sm:text-left">
          <Mail className="w-4 h-4 text-amber-400 shrink-0 hidden sm:inline" />
          <span>
            Verifikasi email kamu untuk mulai berinteraksi. Cek inbox{' '}
            <strong className="text-white underline decoration-amber-400/50 font-bold">{currentUser.email}</strong>{' '}
            (termasuk folder spam).
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            id="btn-resend-verification"
            onClick={handleResend}
            disabled={cooldown > 0 || isResending}
            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${
              cooldown > 0 || isResending
                ? 'bg-slate-800/80 text-slate-400 cursor-not-allowed border border-slate-700/50'
                : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 active:scale-95'
            }`}
          >
            {isResending ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <Mail className="w-3 h-3" />
            )}
            <span>{cooldown > 0 ? `Kirim ulang (${cooldown}s)` : 'Kirim ulang'}</span>
          </button>

          <button
            id="btn-check-verified"
            onClick={handleCheckVerified}
            disabled={isChecking}
            className="px-3 py-1 rounded-lg text-[11px] font-bold bg-[#FF2E7E] hover:bg-[#e0266e] text-white shadow-sm transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            {isChecking ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3 h-3" />
            )}
            <span>Saya sudah verifikasi</span>
          </button>
        </div>
      </div>
    </div>
  );
};
