import { sanitizeExternalUrl } from './safeUrl.ts';

export interface Token {
  type: 'text' | 'url' | 'mention';
  value: string;
  href?: string;
}

export function tokenize(text: string): Token[] {
  if (!text || typeof text !== 'string') {
    return [{ type: 'text', value: text || '' }];
  }

  // Regex to match URLs: http(s)://..., www..., or domain.tld/...
  const urlRegex =
    /(?:https?:\/\/|www\.)[^\s<]+|[a-zA-Z0-9][-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

  const tokens: Token[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = urlRegex.exec(text)) !== null) {
    const rawMatch = match[0];
    const matchStart = match.index;

    // Text before URL
    if (matchStart > lastIndex) {
      const beforeText = text.substring(lastIndex, matchStart);
      tokens.push(...tokenizeMentions(beforeText));
    }

    // Clean URL: strip trailing punctuation . , ! ? ; : and unbalanced ) ]
    let cleanedUrl = rawMatch;
    let trailing = '';

    while (cleanedUrl.length > 0) {
      const lastChar = cleanedUrl[cleanedUrl.length - 1];
      if (['.', ',', '!', '?', ';', ':'].includes(lastChar)) {
        trailing = lastChar + trailing;
        cleanedUrl = cleanedUrl.substring(0, cleanedUrl.length - 1);
      } else if (lastChar === ')') {
        const openCount = (cleanedUrl.match(/\(/g) || []).length;
        const closeCount = (cleanedUrl.match(/\)/g) || []).length;
        if (closeCount > openCount) {
          trailing = lastChar + trailing;
          cleanedUrl = cleanedUrl.substring(0, cleanedUrl.length - 1);
        } else {
          break;
        }
      } else if (lastChar === ']') {
        const openCount = (cleanedUrl.match(/\[/g) || []).length;
        const closeCount = (cleanedUrl.match(/\]/g) || []).length;
        if (closeCount > openCount) {
          trailing = lastChar + trailing;
          cleanedUrl = cleanedUrl.substring(0, cleanedUrl.length - 1);
        } else {
          break;
        }
      } else {
        break;
      }
    }

    const sanitized = sanitizeExternalUrl(cleanedUrl);
    if (sanitized) {
      tokens.push({
        type: 'url',
        value: cleanedUrl,
        href: sanitized,
      });
    } else {
      tokens.push(...tokenizeMentions(cleanedUrl));
    }

    if (trailing) {
      tokens.push(...tokenizeMentions(trailing));
    }

    lastIndex = matchStart + rawMatch.length;
  }

  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    tokens.push(...tokenizeMentions(remainingText));
  }

  return tokens;
}

function tokenizeMentions(text: string): Token[] {
  if (!text) return [];
  const mentionRegex = /(@[a-zA-Z0-9_.-]+)/g;
  const parts = text.split(mentionRegex);
  const result: Token[] = [];
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('@')) {
      result.push({
        type: 'mention',
        value: part,
      });
    } else {
      result.push({
        type: 'text',
        value: part,
      });
    }
  }
  return result;
}
