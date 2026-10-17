export const BLOCKED_LINK_DOMAINS = [
  'lk21',
  'indoxxi',
  'layarkaca21',
  'ganool',
  'rebahin',
  'bioskopkeren',
];

export function sanitizeExternalUrl(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null;
  let trimmed = raw.trim();
  if (trimmed.length > 2048) return null;
  // Check control characters
  if (/[\u0000-\u001F\u007F-\u009F]/.test(trimmed)) return null;

  // Reject dangerous schemes immediately
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:') ||
    lower.startsWith('mailto:')
  ) {
    return null;
  }

  let candidate = trimmed;
  if (/^www\./i.test(candidate)) {
    candidate = 'https://' + candidate;
  } else if (!/^https?:\/\//i.test(candidate)) {
    if (
      /^[a-zA-Z0-9][-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/.test(
        candidate
      ) &&
      !candidate.includes(' ')
    ) {
      candidate = 'https://' + candidate;
    } else {
      return null;
    }
  }

  try {
    const parsed = new URL(candidate);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol !== 'http:' && protocol !== 'https:') {
      return null;
    }
    // Check credentials (userinfo) via parsed URL username/password
    if (parsed.username || parsed.password) {
      return null;
    }

    const host = parsed.hostname.toLowerCase();
    const parts = host.split('.');
    for (const blocked of BLOCKED_LINK_DOMAINS) {
      if (
        parts.includes(blocked) ||
        parts.some(p => p.includes(blocked)) ||
        host.includes('.' + blocked + '.') ||
        host.startsWith(blocked + '.') ||
        host.endsWith('.' + blocked)
      ) {
        return null;
      }
    }
    return parsed.href;
  } catch {
    return null;
  }
}

export function getHost(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

export function isInternalUrl(url: string): boolean {
  try {
    const parsed = new URL(
      url,
      typeof window !== 'undefined'
        ? window.location.origin
        : 'https://sotoyfilm.my.id'
    );
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'sotoyfilm.my.id' ||
      host === 'www.sotoyfilm.my.id' ||
      host === 'localhost' ||
      host.endsWith('.vercel.app')
    );
  } catch {
    return false;
  }
}
