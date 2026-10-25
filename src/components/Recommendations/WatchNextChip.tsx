import React from 'react';

interface WatchNextChipProps {
  id?: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}

/**
 * Page-local filter chip. Kept deliberately plain so mood and platform filters
 * read like editorial tags rather than buttons from a component library.
 */
export const WatchNextChip: React.FC<WatchNextChipProps> = ({
  id,
  active,
  onClick,
  children,
  count,
}) => {
  return (
    <button
      id={id}
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border px-4 text-sm transition-colors motion-reduce:transition-none ${
        active
          ? 'border-accent bg-accent/10 font-medium text-accent'
          : 'border-slate-800 text-slate-300 hover:border-slate-600 hover:text-slate-50'
      }`}
    >
      <span>{children}</span>
      {typeof count === 'number' && (
        <span
          className={`text-xs tabular-nums ${
            active ? 'text-accent' : 'text-slate-400'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
};
