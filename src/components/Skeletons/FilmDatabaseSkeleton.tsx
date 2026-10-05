import React from 'react';
import { FilmCardSkeleton } from './FilmCardSkeleton';

interface FilmDatabaseSkeletonProps {
  cardCount?: number;
}

export const FilmDatabaseSkeleton: React.FC<FilmDatabaseSkeletonProps> = ({ cardCount = 12 }) => {
  return (
    <div className="space-y-8 animate-pulse" aria-busy="true" aria-label="Memuat database film...">
      {/* Top Search & Filter Bar Skeleton */}
      <div className="bg-[#171717] border border-white/[0.08] rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="h-12 flex-1 rounded-2xl bg-slate-800/80" />
          <div className="h-12 w-full md:w-48 rounded-2xl bg-slate-800/60" />
          <div className="h-12 w-full md:w-36 rounded-2xl bg-slate-800/60" />
        </div>

        {/* Genre Tags Shimmer */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={`genre-skeleton-${i}`}
              className="h-9 w-24 sm:w-28 rounded-xl bg-slate-800/60 shrink-0"
            />
          ))}
        </div>
      </div>

      {/* Grid of Film Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-44 bg-slate-800 rounded-lg" />
          <div className="h-4 w-28 bg-slate-850 rounded" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: cardCount }).map((_, index) => (
            <FilmCardSkeleton key={`film-skeleton-${index}`} />
          ))}
        </div>
      </div>
    </div>
  );
};
