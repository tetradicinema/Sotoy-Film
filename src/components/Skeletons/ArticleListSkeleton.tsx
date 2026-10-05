import React from 'react';
import { ArticleCardSkeleton } from './ArticleCardSkeleton';

interface ArticleListSkeletonProps {
  count?: number;
  showHeroBanner?: boolean;
}

export const ArticleListSkeleton: React.FC<ArticleListSkeletonProps> = ({
  count = 6,
  showHeroBanner = true,
}) => {
  return (
    <div className="space-y-8 animate-pulse" aria-busy="true" aria-label="Memuat daftar artikel...">
      {showHeroBanner && (
        <div className="relative rounded-3xl p-6 sm:p-10 overflow-hidden border border-white/[0.08] bg-[#171717] space-y-4">
          <div className="h-6 w-32 rounded-full bg-slate-800/80" />
          <div className="h-10 w-72 sm:w-96 rounded-xl bg-slate-800" />
          <div className="h-4 w-full max-w-xl rounded bg-slate-850" />
          <div className="flex items-center gap-2 pt-2 flex-wrap">
            <div className="h-9 w-20 rounded-xl bg-slate-800" />
            <div className="h-9 w-24 rounded-xl bg-slate-800/60" />
            <div className="h-9 w-24 rounded-xl bg-slate-800/60" />
            <div className="h-9 w-24 rounded-xl bg-slate-800/60" />
          </div>
        </div>
      )}

      {/* Grid of articles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: count }).map((_, index) => (
          <ArticleCardSkeleton key={`article-skeleton-${index}`} />
        ))}
      </div>
    </div>
  );
};
