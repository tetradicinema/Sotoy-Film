import React from 'react';

interface SectionHeaderProps {
  title: string;
  description?: string;
  right?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, description, right }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 mb-5 pb-3 border-b border-white/[0.08]">
      <div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-4 bg-[#FF2E7E] rounded-full inline-block" />
          <h2 className="font-display font-black text-xl sm:text-2xl text-white tracking-tight">
            {title}
          </h2>
        </div>
        {description ? (
          <p className="text-slate-400 text-xs sm:text-[13px] mt-1 ml-3.5">{description}</p>
        ) : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
};
