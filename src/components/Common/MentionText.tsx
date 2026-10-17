import React from 'react';
import { LinkifiedText } from './LinkifiedText';

interface MentionTextProps {
  content: string;
  className?: string;
}

export const MentionText: React.FC<MentionTextProps> = ({ content, className = '' }) => {
  return <LinkifiedText content={content} className={className} interactive={true} />;
};
