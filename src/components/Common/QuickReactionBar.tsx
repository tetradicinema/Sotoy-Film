import React from 'react';
import { ReactionType, BuzzReactions } from '../../types';
import { useApp } from '../../context/AppContext';

interface QuickReactionBarProps {
  buzzId: string;
  reactions?: BuzzReactions;
  myReaction?: ReactionType | null;
  className?: string;
  compact?: boolean;
}

const REACTION_CONFIG: {
  type: ReactionType;
  emoji: string;
  label: string;
  activeBg: string;
  activeBorder: string;
  activeText: string;
}[] = [
  {
    type: 'heart',
    emoji: '❤️',
    label: 'Suka',
    activeBg: 'bg-rose-500/20',
    activeBorder: 'border-rose-500/50',
    activeText: 'text-rose-300 font-bold',
  },
  {
    type: 'mindblown',
    emoji: '🤯',
    label: 'Mind-Blown',
    activeBg: 'bg-amber-500/20',
    activeBorder: 'border-amber-500/50',
    activeText: 'text-amber-300 font-bold',
  },
  {
    type: 'fire',
    emoji: '🔥',
    label: 'Hype',
    activeBg: 'bg-orange-500/20',
    activeBorder: 'border-orange-500/50',
    activeText: 'text-orange-300 font-bold',
  },
  {
    type: 'laugh',
    emoji: '😂',
    label: 'Lucu',
    activeBg: 'bg-yellow-500/20',
    activeBorder: 'border-yellow-500/50',
    activeText: 'text-yellow-300 font-bold',
  },
  {
    type: 'clap',
    emoji: '👏',
    label: 'Respek',
    activeBg: 'bg-emerald-500/20',
    activeBorder: 'border-emerald-500/50',
    activeText: 'text-emerald-300 font-bold',
  },
];

export const QuickReactionBar: React.FC<QuickReactionBarProps> = ({
  buzzId,
  reactions,
  myReaction,
  className = '',
  compact = false,
}) => {
  const { reactToBuzzPost } = useApp();

  const getCount = (type: ReactionType) => {
    if (!reactions) return 0;
    return reactions[type] || 0;
  };

  return (
    <div className={`flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none py-0.5 flex-nowrap sm:flex-wrap ${className}`}>
      {REACTION_CONFIG.map(({ type, emoji, label, activeBg, activeBorder, activeText }) => {
        const count = getCount(type);
        const isActive = myReaction === type;

        return (
          <button
            key={type}
            id={`buzz-react-${type}-${buzzId}`}
            onClick={(e) => {
              e.stopPropagation();
              reactToBuzzPost(buzzId, type);
            }}
            title={`${label} (${count})`}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1 rounded-xl text-xs transition-all duration-200 border cursor-pointer select-none active:scale-95 shrink-0 ${
              isActive
                ? `${activeBg} ${activeBorder} ${activeText} shadow-sm scale-105`
                : 'bg-slate-900/90 hover:bg-slate-800/90 border-slate-800 text-slate-300 hover:border-slate-700'
            } ${compact ? 'px-1.5 py-0.5 text-[11px]' : ''}`}
          >
            <span className="text-sm leading-none transition-transform hover:scale-125 duration-200">
              {emoji}
            </span>
            {count > 0 && (
              <span className={`font-semibold text-[11px] sm:text-xs ${isActive ? activeText : 'text-slate-400'}`}>
                {count}
              </span>
            )}
            {!compact && isActive && (
              <span className="text-[10px] hidden md:inline ml-0.5 opacity-90">
                {label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
