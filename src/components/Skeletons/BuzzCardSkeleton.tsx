import React from 'react';

interface BuzzCardSkeletonProps {
  hasMedia?: boolean;
}

export const BuzzCardSkeleton: React.FC<BuzzCardSkeletonProps> = ({ hasMedia = false }) => {
  return (
    <div
      aria-hidden="true"
      className="bg-[#171A1F] border border-white/[0.08]/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl space-y-3.5 sm:space-y-4 animate-pulse select-none"
    >
      {/* Post Author Info Row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Avatar Skeleton */}
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-800 shrink-0" />

          {/* Names and Meta Skeleton */}
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="h-4 w-28 sm:w-36 bg-slate-800 rounded" />
              <div className="h-3.5 w-16 bg-slate-800/70 rounded-md hidden xs:block" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-16 sm:w-20 bg-slate-850 rounded" />
              <div className="w-1 h-1 rounded-full bg-slate-700" />
              <div className="h-3 w-14 bg-slate-850 rounded" />
            </div>
          </div>
        </div>

        {/* Action placeholder */}
        <div className="w-6 h-6 rounded-lg bg-slate-800/50 shrink-0" />
      </div>

      {/* Post Text Body Skeleton */}
      <div className="space-y-2 py-1">
        <div className="h-3.5 w-full bg-slate-800/80 rounded" />
        <div className="h-3.5 w-[92%] bg-slate-800/70 rounded" />
        <div className="h-3.5 w-[65%] bg-slate-800/60 rounded" />
      </div>

      {/* Optional Rich Media / Tagged Entity Card Skeleton */}
      {hasMedia && (
        <div className="p-3 rounded-2xl bg-[#0E1013]/80 border border-white/[0.08]/60 flex items-center gap-3.5">
          <div className="w-12 h-16 rounded-xl bg-slate-800 shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-3.5 w-3/4 bg-slate-800 rounded" />
            <div className="flex items-center gap-2">
              <div className="h-3 w-16 bg-slate-850 rounded" />
              <div className="w-1 h-1 rounded-full bg-slate-700" />
              <div className="h-3 w-20 bg-slate-850 rounded" />
            </div>
          </div>
        </div>
      )}

      {/* Topic Tags Skeleton */}
      <div className="flex items-center gap-2 pt-1">
        <div className="h-5 w-20 bg-slate-850/80 rounded-md" />
        <div className="h-5 w-16 bg-slate-850/60 rounded-md" />
      </div>

      {/* Footer Controls Row */}
      <div className="pt-3 border-t border-white/[0.08]/80 flex items-center justify-between gap-4">
        {/* Quick Reactions Skeleton */}
        <div className="flex items-center gap-1.5 overflow-hidden">
          <div className="h-7 w-20 sm:w-28 rounded-xl bg-slate-800/70" />
          <div className="h-7 w-12 rounded-xl bg-slate-800/40 hidden sm:block" />
        </div>

        {/* Actions (Reply, Share, Bookmark) */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-7 w-16 sm:w-20 rounded-xl bg-slate-800/70" />
          <div className="h-7 w-8 sm:w-16 rounded-xl bg-slate-800/50" />
          <div className="h-7 w-8 sm:w-16 rounded-xl bg-slate-800/50" />
        </div>
      </div>
    </div>
  );
};
