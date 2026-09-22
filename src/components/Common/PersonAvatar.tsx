import React, { useState } from 'react';
import { User } from 'lucide-react';

interface PersonAvatarProps {
  photo?: string;
  name: string;
  className?: string;
}

export const PersonAvatar: React.FC<PersonAvatarProps> = ({
  photo,
  name,
  className = "w-full h-full object-cover group-hover:scale-105 transition-transform duration-300",
}) => {
  const [hasError, setHasError] = useState(false);

  // Consider invalid if empty, missing, unsplash stock URL, or failed to load
  const isRealPhoto =
    Boolean(photo) &&
    typeof photo === 'string' &&
    photo.trim() !== '' &&
    !photo.includes('unsplash.com') &&
    !hasError;

  if (!isRealPhoto) {
    return (
      <div className="w-full h-full bg-slate-950/90 border-b border-slate-800/80 flex flex-col items-center justify-center p-3 text-slate-600 group-hover:text-slate-400 transition-colors select-none">
        <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shadow-inner group-hover:border-slate-700 transition-colors">
          <User className="w-6 h-6 text-slate-500 group-hover:text-slate-400 stroke-[1.75]" />
        </div>
        <span className="text-[10px] text-slate-500 font-medium mt-2 tracking-wide text-center truncate max-w-[90%]">
          {name ? name.split(' ')[0] : 'Profil'}
        </span>
      </div>
    );
  }

  return (
    <img
      src={photo}
      alt={name}
      className={className}
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
};
