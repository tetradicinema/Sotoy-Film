import React from 'react';

export const GenericPageSkeleton: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-pulse" aria-busy="true" aria-label="Memuat halaman...">
      {/* Top Header Shimmer */}
      <div className="space-y-3">
        <div className="h-4 w-32 bg-slate-800 rounded" />
        <div className="h-8 sm:h-10 w-64 sm:w-96 bg-slate-800 rounded-xl" />
        <div className="h-4 w-full max-w-lg bg-slate-850 rounded" />
      </div>

      {/* Content Cards Grid Shimmer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-48 rounded-3xl bg-[#171717] border border-white/[0.08]/80 p-6 space-y-3">
          <div className="h-6 w-1/3 bg-slate-800 rounded" />
          <div className="h-4 w-full bg-slate-850 rounded" />
          <div className="h-4 w-3/4 bg-slate-850 rounded" />
        </div>
        <div className="h-48 rounded-3xl bg-[#171717] border border-white/[0.08]/80 p-6 space-y-3">
          <div className="h-6 w-1/3 bg-slate-800 rounded" />
          <div className="h-4 w-full bg-slate-850 rounded" />
          <div className="h-4 w-3/4 bg-slate-850 rounded" />
        </div>
        <div className="h-48 rounded-3xl bg-[#171717] border border-white/[0.08]/80 p-6 space-y-3">
          <div className="h-6 w-1/3 bg-slate-800 rounded" />
          <div className="h-4 w-full bg-slate-850 rounded" />
          <div className="h-4 w-3/4 bg-slate-850 rounded" />
        </div>
      </div>

      {/* Main Container Shimmer */}
      <div className="h-72 rounded-3xl bg-[#171717] border border-white/[0.08]/80 p-6 space-y-4">
        <div className="h-6 w-48 bg-slate-800 rounded" />
        <div className="h-4 w-full bg-slate-850 rounded" />
        <div className="h-4 w-5/6 bg-slate-850 rounded" />
        <div className="h-4 w-2/3 bg-slate-850 rounded" />
      </div>
    </div>
  );
};

export const ArticleDetailSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen py-8 animate-pulse select-none" aria-busy="true" aria-label="Memuat artikel sinematik...">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
        {/* Breadcrumb skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-4 w-16 bg-slate-800 rounded" />
          <div className="h-4 w-4 bg-slate-850 rounded" />
          <div className="h-4 w-24 bg-slate-800 rounded" />
        </div>

        {/* Headline skeleton */}
        <div className="space-y-3">
          <div className="h-6 w-28 bg-[#FF2E7E]/30 rounded-full" />
          <div className="h-9 sm:h-12 w-full bg-slate-800 rounded-2xl" />
          <div className="h-9 sm:h-12 w-4/5 bg-slate-800 rounded-2xl" />
        </div>

        {/* Author row skeleton */}
        <div className="flex items-center justify-between py-4 border-y border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-slate-800" />
            <div className="space-y-1.5">
              <div className="h-4 w-32 bg-slate-800 rounded" />
              <div className="h-3 w-24 bg-slate-850 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-20 bg-slate-800 rounded-xl" />
            <div className="h-8 w-20 bg-slate-800 rounded-xl" />
          </div>
        </div>

        {/* Hero Image skeleton */}
        <div className="aspect-video w-full rounded-3xl bg-slate-800/80 overflow-hidden" />

        {/* Body content lines */}
        <div className="space-y-4 pt-4">
          <div className="h-4 w-full bg-slate-800/80 rounded" />
          <div className="h-4 w-[98%] bg-slate-800/80 rounded" />
          <div className="h-4 w-[94%] bg-slate-800/80 rounded" />
          <div className="h-4 w-[88%] bg-slate-800/70 rounded" />
          <div className="h-4 w-[92%] bg-slate-800/70 rounded" />
          <div className="h-20 w-full bg-slate-850/40 rounded-2xl border border-white/[0.08]/80 my-6" />
          <div className="h-4 w-full bg-slate-800/80 rounded" />
          <div className="h-4 w-[95%] bg-slate-800/80 rounded" />
          <div className="h-4 w-[70%] bg-slate-800/60 rounded" />
        </div>
      </div>
    </div>
  );
};

export const FilmDetailSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen pb-16 animate-pulse select-none" aria-busy="true" aria-label="Memuat database film...">
      {/* Backdrop Header Skeleton */}
      <div className="relative h-[320px] sm:h-[420px] w-full bg-slate-900 border-b border-white/[0.08]">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/60 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-36 sm:-mt-48 relative z-10 space-y-10">
        {/* Main Info Header Grid */}
        <div className="flex flex-col md:flex-row gap-6 sm:gap-8 items-start">
          {/* Poster Skeleton */}
          <div className="w-48 sm:w-60 aspect-[2/3] rounded-3xl bg-slate-800/90 border border-slate-700/80 shrink-0 shadow-2xl" />

          {/* Title & Stats */}
          <div className="space-y-4 flex-1 w-full pt-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-16 bg-slate-800 rounded-md" />
              <div className="h-6 w-16 bg-slate-800 rounded-md" />
              <div className="h-6 w-20 bg-slate-800 rounded-md" />
            </div>

            <div className="h-10 sm:h-12 w-3/4 bg-slate-850 rounded-2xl" />
            <div className="h-5 w-1/2 bg-slate-800 rounded-lg" />

            {/* Score pills */}
            <div className="flex items-center gap-3 pt-2">
              <div className="h-14 w-28 rounded-2xl bg-slate-800" />
              <div className="h-14 w-28 rounded-2xl bg-slate-800" />
              <div className="h-12 w-32 rounded-2xl bg-slate-800/60" />
            </div>
          </div>
        </div>

        {/* Synopsis & Tabs Shimmer */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-8 w-40 bg-slate-800 rounded-xl" />
            <div className="space-y-2.5">
              <div className="h-4 w-full bg-slate-800/80 rounded" />
              <div className="h-4 w-full bg-slate-800/80 rounded" />
              <div className="h-4 w-4/5 bg-slate-800/70 rounded" />
            </div>
            <div className="h-64 rounded-3xl bg-slate-850/60 border border-white/[0.08]" />
          </div>

          <div className="space-y-4">
            <div className="h-8 w-36 bg-slate-800 rounded-xl" />
            <div className="h-48 rounded-3xl bg-[#171717] border border-white/[0.08] p-5 space-y-3" />
          </div>
        </div>
      </div>
    </div>
  );
};
