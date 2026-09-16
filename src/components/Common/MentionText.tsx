import React from 'react';
import { useApp } from '../../context/AppContext';

interface MentionTextProps {
  content: string;
  className?: string;
}

export const MentionText: React.FC<MentionTextProps> = ({ content, className = '' }) => {
  const { allUsers, navigateTo } = useApp();

  // Regex to match handles starting with @ (e.g. @riansinotoy or @budi_film)
  const mentionRegex = /(@[a-zA-Z0-9_.-]+)/g;
  const parts = content.split(mentionRegex);

  return (
    <span className={className}>
      {parts.map((part, idx) => {
        if (part.startsWith('@')) {
          const rawHandle = part.toLowerCase();
          const cleanHandle = rawHandle.replace('@', '');

          // Find user by handle or clean handle
          const matchedUser = allUsers.find(
            u =>
              u.handle.toLowerCase() === rawHandle ||
              u.handle.toLowerCase().replace('@', '') === cleanHandle
          );

          return (
            <span
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                if (matchedUser) {
                  navigateTo('user-profile', { userId: matchedUser.id });
                } else {
                  // Fallback search or feed filter
                  navigateTo('community-feed');
                }
              }}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded-md bg-[#00F0FF]/15 border border-[#00F0FF]/30 text-[#00F0FF] font-mono font-bold text-xs sm:text-sm hover:bg-[#00F0FF]/30 cursor-pointer transition-colors shadow-sm"
              title={matchedUser ? `Buka profil ${matchedUser.name}` : `Mention ${part}`}
            >
              {part}
            </span>
          );
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
      })}
    </span>
  );
};
