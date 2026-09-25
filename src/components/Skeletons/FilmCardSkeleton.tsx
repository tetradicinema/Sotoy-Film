import React from 'react';

export const FilmCardSkeleton: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="bg-[#171A1F] border border-white/[0.08] rounded-2xl overflow-hidden flex flex-col shadow-lg animate-pulse select-none"
    >
      {/* Poster Aspect Ratio 2:3 */}
      <div className="relative aspect-[2/3] w-full bg-slate-800/80 overflow-hidden">
        {/* Rating Badge Placeholder */}
        <div className="absolute top-2 left-2 h-5 w-16 bg-slate-700/60 rounded-lg" />
        
        {/* Watchlist Button Placeholder */}
        <div className="absolute top-2 right-2 w-7 h-7 bg-slate-700/60 rounded-lg" />

        {/* Bottom tags */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <div className="h-4 w-10 bg-slate-700/60 rounded" />
          <div className="h-4 w-8 bg-slate-700/60 rounded" />
        </div>
      </div>

      {/* Info Body */}
      <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
        <div className="space-y-1.5">
          {/* Film Title */}
          <div className="h-3.5 w-4/5 bg-slate-800 rounded" />
          {/* Director */}
          <div className="h-2.5 w-3/5 bg-slate-850 rounded" />
          {/* Genre Tags */}
          <div className="flex items-center gap-1 pt-0.5">
            <div className="h-3.5 w-10 bg-slate-800/60 rounded" />
            <div className="h-3.5 w-12 bg-slate-800/60 rounded" />
          </div>
        </div>

        {/* Dual Scores Comparison Placeholder */}
        <div className="pt-2 border-t border-white/[0.08]/80 grid grid-cols-2 gap-1.5 text-center">
          <div className="p-1 rounded bg-slate-900/60 flex flex-col items-center gap-1">
            <div className="h-2 w-8 bg-slate-800 rounded" />
            <div className="h-3 w-6 bg-slate-700/70 rounded" />
          </div>
          <div className="p-1 rounded bg-slate-900/60 flex flex-col items-center gap-1">
            <div className="h-2 w-8 bg-slate-800 rounded" />
            <div className="h-3 w-6 bg-slate-700/70 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
};
