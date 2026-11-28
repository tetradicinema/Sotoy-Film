import React from 'react';
import { useApp } from '../context/AppContext';
import { setConsentState } from '../lib/analyticsConsent';
import { SmartLink } from './Common/SmartLink';

interface CookieConsentBannerProps {
  visible: boolean;
}

/** Global GA consent prompt. Rendering decisions live in cookieConsentVisibility. */
export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({ visible }) => {
  const { setCookieSettingsOpen } = useApp();

  if (!visible) return null;

  const choose = (state: 'granted' | 'denied') => {
    setConsentState(state);
    setCookieSettingsOpen(false);
  };

  return (
    <div
      id="cookie-consent-banner"
      role="dialog"
      aria-label="Pengaturan cookie"
      className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 z-[90] w-[calc(100%-1.5rem)] max-w-xl rounded-2xl border border-white/10 bg-[#171717]/95 backdrop-blur-xl p-4 shadow-[0_18px_50px_rgba(0,0,0,0.65)] sm:p-5"
    >
      <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
        Sotoy Film memakai cookie analitik (Google Analytics) untuk memahami halaman yang dibaca
        pengunjung. Kamu boleh menerima atau menolaknya. Baca{' '}
        <SmartLink
          to="/kebijakan-privasi"
          className="font-semibold text-[#FF2E7E] hover:text-white hover:underline"
        >
          Kebijakan Privasi.
        </SmartLink>
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <button
          id="cookie-consent-reject"
          type="button"
          onClick={() => choose('denied')}
          className="h-11 w-full rounded-xl border border-white/20 bg-transparent text-sm font-semibold text-slate-200 transition-colors hover:border-white/40 hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2E7E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#171717]"
        >
          Tolak
        </button>
        <button
          id="cookie-consent-accept"
          type="button"
          onClick={() => choose('granted')}
          className="h-11 w-full rounded-xl bg-[#FF2E7E] text-sm font-semibold text-white shadow-md shadow-[#FF2E7E]/25 transition-colors hover:bg-[#e0266e] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#171717]"
        >
          Terima
        </button>
      </div>
    </div>
  );
};
