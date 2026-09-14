import React from 'react';
import { ExternalLink, Sparkles } from 'lucide-react';
import { AD_BANNERS } from '../../data/mockData';

interface AdBannerSlotProps {
  variant?: 'leaderboard' | 'sidebar' | 'infeed' | 'footer';
  customId?: string;
  className?: string;
}

export const AdBannerSlot: React.FC<AdBannerSlotProps> = ({
  variant = 'infeed',
  customId,
  className = '',
}) => {
  const ad = customId
    ? AD_BANNERS.find(a => a.id === customId) || AD_BANNERS[0]
    : variant === 'leaderboard'
    ? AD_BANNERS[0]
    : variant === 'sidebar'
    ? AD_BANNERS[1]
    : AD_BANNERS[2];

  if (variant === 'leaderboard') {
    return (
      <div
        id="ad-banner-leaderboard"
        className={`w-full bg-gradient-to-r from-[#181028] via-[#211138] to-[#120B20] border border-[#7928CA]/40 rounded-2xl p-3 sm:p-4 overflow-hidden relative group transition-all duration-300 hover:border-[#FF2E7E]/60 ${className}`}
      >
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-[#FF2E7E]/15 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <span className="bg-[#FF2E7E] text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#FFD000]" />
              {ad.tag}
            </span>
            <div>
              <h4 className="text-white font-bold text-sm sm:text-base tracking-tight group-hover:text-[#00F0FF] transition-colors">
                {ad.title}
              </h4>
              <p className="text-slate-300 text-xs line-clamp-1">{ad.subtitle}</p>
            </div>
          </div>
          <a
            href={ad.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 bg-gradient-to-r from-[#FF2E7E] to-[#FFD000] hover:brightness-110 text-slate-950 font-black text-xs uppercase px-4 py-2 rounded-xl transition-transform active:scale-95 flex items-center gap-1.5 shadow-lg shadow-[#FF2E7E]/20"
          >
            <span>{ad.ctaText}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    );
  }

  if (variant === 'sidebar') {
    return (
      <div
        id="ad-banner-sidebar"
        className={`w-full bg-[#151624] border border-slate-800 hover:border-[#00F0FF]/50 rounded-2xl p-4 relative overflow-hidden group transition-all ${className}`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF]" />
            {ad.tag}
          </span>
          <span className="text-[10px] text-slate-400">Promoted</span>
        </div>

        <div className="h-32 w-full rounded-xl overflow-hidden mb-3 relative">
          <img
            src={ad.imageUrl}
            alt={ad.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <span className="absolute bottom-2 left-2 text-[11px] font-bold text-white bg-black/60 backdrop-blur px-2 py-0.5 rounded">
            {ad.sponsorName}
          </span>
        </div>

        <h4 className="font-display font-black text-white text-sm leading-tight mb-1 group-hover:text-[#00F0FF] transition-colors">
          {ad.title}
        </h4>
        <p className="text-slate-400 text-xs mb-3 line-clamp-2">{ad.subtitle}</p>

        <a
          href={ad.ctaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-[#00F0FF]/15 hover:bg-[#00F0FF] text-[#00F0FF] hover:text-slate-950 border border-[#00F0FF]/40 font-bold text-xs py-2 px-3 rounded-xl transition-colors flex items-center justify-center gap-1.5"
        >
          <span>{ad.ctaText}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    );
  }

  // infeed / default
  return (
    <div
      id="ad-banner-infeed"
      className={`w-full bg-gradient-to-r from-[#121324] via-[#1A1830] to-[#121324] border border-[#FFD000]/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4 relative overflow-hidden group ${className}`}
    >
      <div className="w-full sm:w-44 h-28 rounded-xl overflow-hidden shrink-0 relative">
        <img
          src={ad.imageUrl}
          alt={ad.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-2 left-2 bg-[#FFD000] text-slate-950 font-black text-[9px] px-2 py-0.5 rounded uppercase">
          {ad.tag}
        </div>
      </div>

      <div className="flex-1 text-center sm:text-left">
        <span className="text-[11px] font-bold text-[#FFD000] uppercase tracking-wider block mb-1">
          Partner Sponsor: {ad.sponsorName}
        </span>
        <h4 className="font-display font-black text-white text-base sm:text-lg mb-1 group-hover:text-[#FFD000] transition-colors">
          {ad.title}
        </h4>
        <p className="text-slate-400 text-xs sm:text-sm line-clamp-2 mb-3 sm:mb-0">
          {ad.subtitle}
        </p>
      </div>

      <a
        href={ad.ctaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 bg-[#FFD000] hover:bg-[#ffe040] text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl uppercase tracking-wider flex items-center gap-1.5 transition-transform active:scale-95 shadow-md shadow-[#FFD000]/20"
      >
        <span>{ad.ctaText}</span>
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
};
