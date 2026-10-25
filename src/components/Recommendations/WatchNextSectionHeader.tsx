import React from 'react';

interface WatchNextSectionHeaderProps {
  title: string;
  description?: string;
  count?: string;
  action?: React.ReactNode;
}

/**
 * Editorial row heading for Watch Next. The top rule and large sentence-case
 * title carry the section without badges, icons, or extra containers.
 */
export const WatchNextSectionHeader: React.FC<WatchNextSectionHeaderProps> = ({
  title,
  description,
  count,
  action,
}) => {
  return (
    <div className="flex flex-col gap-4 border-t border-slate-800 pt-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="max-w-2xl">
        <h2 className="font-display text-2xl font-semibold tracking-[-0.04em] text-slate-50 sm:text-3xl">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-4 sm:justify-end">
        {count && (
          <span className="text-xs tabular-nums text-slate-400">{count}</span>
        )}
        {action}
      </div>
    </div>
  );
};
