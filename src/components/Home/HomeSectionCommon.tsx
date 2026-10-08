import React from 'react';

export const SectionEmptyState: React.FC<{ icon: React.ReactNode; message: string; submessage?: string }> = ({
  icon,
  message,
  submessage,
}) => (
  <div className="p-8 sm:p-10 text-center rounded-3xl bg-[#171717]/80 border border-white/[0.06] flex flex-col items-center justify-center space-y-2.5">
    <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-slate-500 mb-1">
      {icon}
    </div>
    <p className="text-xs sm:text-sm font-semibold text-slate-300">{message}</p>
    {submessage && <p className="text-xs text-slate-500 max-w-sm leading-relaxed">{submessage}</p>}
  </div>
);
