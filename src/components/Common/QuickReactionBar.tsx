import React from 'react';
import { Heart } from 'lucide-react';
import { ReactionType, BuzzReactions } from '../../types';
import { useApp } from '../../context/AppContext';

interface QuickReactionBarProps {
  buzzId: string;
  reactions?: BuzzReactions;
  myReaction?: ReactionType | null;
  className?: string;
  compact?: boolean;
}

export const QuickReactionBar: React.FC<QuickReactionBarProps> = ({
  buzzId,
  reactions,
  myReaction,
  className = '',
  compact = false,
}) => {
  const { reactToBuzzPost } = useApp();

  const getCount = (type: ReactionType = 'heart') => {
    if (!reactions) return 0;
    return reactions[type] || 0;
  };

  const count = getCount('heart');
  const isActive = myReaction === 'heart';

  return (
    <div className={`flex items-center ${className}`}>
      <button
        id={`buzz-react-heart-${buzzId}`}
        onClick={(e) => {
          e.stopPropagation();
          reactToBuzzPost(buzzId, 'heart');
        }}
        title={`Suka (${count})`}
        aria-label={`Suka (${count})`}
        className={`group flex items-center gap-1.5 transition-opacity hover:opacity-80 active:scale-95 cursor-pointer select-none shrink-0 py-1 ${
          isActive ? 'text-[#FF2E7E]' : 'text-slate-400 hover:text-slate-200'
        } ${compact ? 'text-[11px]' : 'text-xs'}`}
      >
        <Heart
          className={`transition-colors duration-150 ${
            compact ? 'w-3.5 h-3.5' : 'w-4 h-4 sm:w-[18px] sm:h-[18px]'
          } ${isActive ? 'fill-current text-[#FF2E7E]' : 'text-current'}`}
        />
        <span className={`font-medium ${isActive ? 'text-[#FF2E7E]' : 'text-slate-400'}`}>
          {count}
        </span>
      </button>
    </div>
  );
};

