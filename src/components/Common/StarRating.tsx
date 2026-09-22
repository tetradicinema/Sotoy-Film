import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  score: number; // 0.0 - 10.0
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  showNumber?: boolean;
  interactive?: boolean;
  onRatingChange?: (newScore: number) => void;
  label?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  score,
  max = 5,
  size = 'md',
  showNumber = true,
  interactive = false,
  onRatingChange,
  label = 'Skor Sotoy',
}) => {
  const starSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
  };

  const handleStarClick = (index: number) => {
    if (!interactive || !onRatingChange) return;
    if (max === 10) {
      onRatingChange(index + 1);
    } else {
      // 5-star scale representing 10 points
      onRatingChange(Number(((index + 1) * 2).toFixed(1)));
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: max }).map((_, i) => {
          // If max is 5, scale score (0-10) to 0-5
          const normalizedScore = max === 5 ? score / 2 : score;
          const fillAmount = Math.max(0, Math.min(1, normalizedScore - i));
          return (
            <div
              key={i}
              id={`star-item-${i}`}
              onClick={() => handleStarClick(i)}
              className={`relative ${interactive ? 'cursor-pointer transition-transform hover:scale-110' : ''}`}
            >
              {/* Background empty star */}
              <Star className={`${starSizes[size]} text-slate-700 fill-slate-800`} />
              {/* Foreground filled star with clip */}
              {fillAmount > 0 && (
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${fillAmount * 100}%` }}
                >
                  <Star className={`${starSizes[size]} text-[#FFD000] fill-[#FFD000] drop-shadow-[0_0_6px_rgba(255,208,0,0.5)]`} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showNumber && (
        <span
          id="star-rating-score-badge"
          className={`font-medium tracking-tight font-display text-[#FFD000] ${
            size === 'lg' ? 'text-xl' : size === 'md' ? 'text-sm' : 'text-xs'
          } bg-[#FFD000]/10 px-2 py-0.5 rounded border border-[#FFD000]/30`}
        >
          {score.toFixed(1)} <span className="text-slate-400 font-normal text-[10px]">/ 10.0</span>
        </span>
      )}

      {label && (
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline-block">
          {label}
        </span>
      )}
    </div>
  );
};
