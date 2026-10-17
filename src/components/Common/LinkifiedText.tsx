import React from 'react';
import { useApp } from '../../context/AppContext';
import { tokenize } from '../../utils/linkify';
import { isInternalUrl } from '../../utils/safeUrl';

export interface LinkifiedTextProps {
  content: string;
  className?: string;
  interactive?: boolean;
  maxDisplayLength?: number;
}

export const LinkifiedText: React.FC<LinkifiedTextProps> = ({
  content,
  className = '',
  interactive = true,
  maxDisplayLength = 45,
}) => {
  const { allUsers, navigateTo } = useApp();

  if (!content) {
    return <span className={className}>{content}</span>;
  }

  const tokens = tokenize(content);

  return (
    <span className={`break-words ${className}`} style={{ overflowWrap: 'anywhere' }}>
      {tokens.map((token, idx) => {
        if (token.type === 'mention') {
          const rawHandle = token.value.toLowerCase();
          const cleanHandle = rawHandle.replace('@', '');
          const matchedUser = allUsers.find(
            u =>
              u.handle.toLowerCase() === rawHandle ||
              u.handle.toLowerCase().replace('@', '') === cleanHandle
          );

          if (!interactive) {
            return (
              <span
                key={idx}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded-md bg-[#FF2E7E]/15 border border-[#FF2E7E]/30 text-[#FF2E7E] font-mono font-bold text-xs sm:text-sm"
              >
                {token.value}
              </span>
            );
          }

          return (
            <span
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                if (matchedUser) {
                  navigateTo('user-profile', { userId: matchedUser.id });
                } else {
                  navigateTo('community-feed');
                }
              }}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded-md bg-[#FF2E7E]/15 border border-[#FF2E7E]/30 text-[#FF2E7E] font-mono font-bold text-xs sm:text-sm hover:bg-[#FF2E7E]/30 cursor-pointer transition-colors shadow-sm"
              title={matchedUser ? `Buka profil ${matchedUser.name}` : `Mention ${token.value}`}
            >
              {token.value}
            </span>
          );
        }

        if (token.type === 'url' && token.href) {
          const href = token.href;
          const isInternal = isInternalUrl(href);
          let displayText = token.value;
          if (displayText.length > maxDisplayLength) {
            displayText = displayText.substring(0, maxDisplayLength) + '...';
          }

          if (!interactive) {
            return (
              <span
                key={idx}
                className="text-[#FF2E7E] underline decoration-[#FF2E7E]/50 cursor-default"
                style={{ overflowWrap: 'anywhere' }}
                title={href}
              >
                {displayText}
              </span>
            );
          }

          if (isInternal) {
            return (
              <a
                key={idx}
                href={href}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="text-[#FF2E7E] underline decoration-[#FF2E7E]/50 hover:text-[#ff5295] transition-colors"
                style={{ overflowWrap: 'anywhere' }}
                title={href}
              >
                {displayText}
              </a>
            );
          }

          return (
            <a
              key={idx}
              href={href}
              target="_blank"
              rel="noopener noreferrer nofollow ugc"
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="text-[#FF2E7E] underline decoration-[#FF2E7E]/50 hover:text-[#ff5295] transition-colors"
              style={{ overflowWrap: 'anywhere' }}
              title={href}
            >
              {displayText}
            </a>
          );
        }

        return <React.Fragment key={idx}>{token.value}</React.Fragment>;
      })}
    </span>
  );
};
