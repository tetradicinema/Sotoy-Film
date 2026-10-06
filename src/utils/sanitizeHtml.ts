import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content untuk mencegah XSS attacks
 * Digunakan untuk user-generated content yang akan di-render sebagai HTML
 */

// DOMPurify configuration untuk berbagai use cases
const STRICT_CONFIG = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
};

const MARKDOWN_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'code', 'pre', 'hr',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'img',
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'class'],
  ALLOW_DATA_ATTR: false,
};

/**
 * Sanitize user input dengan strict rules (untuk buzz posts, comments, dll)
 */
export function sanitizeUserInput(dirty: string): string {
  if (typeof window === 'undefined') {
    // Server-side: return as-is, will be sanitized on client
    return dirty;
  }
  
  return DOMPurify.sanitize(dirty, STRICT_CONFIG);
}

/**
 * Sanitize markdown/rich text content (untuk articles)
 */
export function sanitizeRichText(dirty: string): string {
  if (typeof window === 'undefined') {
    // Server-side: return as-is
    return dirty;
  }
  
  return DOMPurify.sanitize(dirty, MARKDOWN_CONFIG);
}

/**
 * Strip all HTML tags (untuk plaintext preview/excerpt)
 */
export function stripHtml(dirty: string): string {
  if (typeof window === 'undefined') {
    // Server-side simple strip
    return dirty.replace(/<[^>]*>/g, '');
  }
  
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
}

/**
 * Sanitize URL untuk href attributes
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  
  // Whitelist safe protocols
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  
  if (trimmed.startsWith('mailto:')) {
    return trimmed;
  }
  
  // Relative URLs
  if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
    return trimmed;
  }
  
  // Default: prepend https
  return `https://${trimmed}`;
}
