import React from 'react';
import { BuzzCardSkeleton } from './BuzzCardSkeleton';

interface BuzzFeedSkeletonProps {
  count?: number;
}

export const BuzzFeedSkeleton: React.FC<BuzzFeedSkeletonProps> = ({ count = 4 }) => {
  return (
    <div className="divide-y divide-white/10" aria-busy="true" aria-label="Memuat linimasa Komunitas...">
      {Array.from({ length: count }).map((_, index) => (
        <BuzzCardSkeleton key={`buzz-skeleton-${index}`} hasMedia={index % 2 === 1} />
      ))}
    </div>
  );
};
