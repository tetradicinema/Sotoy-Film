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
  'google-inspectiontool',
  'googleother',
  'storebot-google',
  'google-read-aloud',
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
  'meta-externalagent',
  'meta-externalfetcher',
  'facebot',
  'skypeuripreview',
  'redditbot',
  'mastodon',
  'iframely',
  'signal',
  'line-poker',
];

/**
 * Search-engine crawlers whose indexing pass must never receive a degraded
 * SPA shell in place of the real entity HTML. Social/link-preview crawlers are
 * deliberately excluded: a failed preview is harmless and should keep the
 * existing pass-through behavior.
 */
export const SEARCH_CRAWLER_PATTERNS: readonly string[] = [
  'googlebot',
  'google-inspectiontool',
  'bingbot',
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

/**
 * Checks whether the User-Agent belongs to one of the three search crawlers
 * this site relies on for indexing. Bot detection already separates these from
 * social crawlers, so the 503 resilience response only applies here.
 */
export function isSearchCrawlerUserAgent(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return SEARCH_CRAWLER_PATTERNS.some(pattern => ua.includes(pattern));
}
