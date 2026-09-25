import React from 'react';

export const ArticleCardSkeleton: React.FC = () => {
  return (
    <article
      aria-hidden="true"
      className="bg-[#171A1F] border border-white/[0.08] rounded-3xl overflow-hidden flex flex-col shadow-lg animate-pulse select-none"
    >
      {/* Cover Image Placeholder */}
      <div className="relative h-48 w-full bg-slate-800/80 overflow-hidden">
        {/* Category Pill Placeholder */}
        <div className="absolute top-3 left-3 h-5 w-16 bg-slate-700/80 rounded-full" />
        {/* Likes Pill Placeholder */}
        <div className="absolute top-3 right-3 h-5 w-12 bg-slate-700/60 rounded-full" />
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Author & Read Time */}
          <div className="flex items-center gap-2 mb-2.5">
            <div className="h-3 w-24 bg-slate-800 rounded" />
            <div className="w-1 h-1 rounded-full bg-slate-700" />
            <div className="h-3 w-12 bg-slate-850 rounded" />
          </div>

          {/* Title Lines */}
          <div className="space-y-1.5 mb-3">
            <div className="h-4.5 w-full bg-slate-800 rounded" />
            <div className="h-4.5 w-3/4 bg-slate-800 rounded" />
          </div>

          {/* Excerpt Lines */}
          <div className="space-y-1.5 mb-4">
            <div className="h-3 w-full bg-slate-850/80 rounded" />
            <div className="h-3 w-5/6 bg-slate-850/70 rounded" />
          </div>
        </div>

        {/* Card Footer */}
        <div className="pt-3 border-t border-white/[0.08]/80 flex items-center justify-between">
          <div className="h-3.5 w-20 bg-slate-850 rounded" />
          <div className="h-3.5 w-24 bg-slate-800/80 rounded" />
        </div>
      </div>
    </article>
  );
};
