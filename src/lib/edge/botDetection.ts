/**
 * Bot detection utilities for Vercel Edge Middleware.
 * Identifies search engine crawlers, social media preview bots,
 * and link scrapers with zero dependencies.
 */

export const BOT_PATTERNS: readonly string[] = [
  'facebookexternalhit',
  'twitterbot',
  'slackbot',
  'telegrambot',
  'whatsapp',
  'linkedinbot',
  'discordbot',
  'googlebot',
  'bingbot',
  'applebot',
  'yandexbot',
  'baiduspider',
  'duckduckbot',
  'pinterestbot',
  'embedly',
  'quora link preview',
  'outbrain',
  'vkshare',
  'w3c_validator',
];

/**
 * Checks if an incoming request User-Agent header matches known web crawlers,
 * social media link preview generators, or generic headless scrapers.
 */
export function isBotUserAgent(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  if (BOT_PATTERNS.some(bot => ua.includes(bot))) {
    return true;
  }
  // Generic fallback for headless browsers and crawlers
  return ua.includes('bot') || ua.includes('crawler') || ua.includes('spider');
}
