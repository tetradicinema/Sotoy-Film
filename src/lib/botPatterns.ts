/**
 * Shared crawler patterns. Used by the edge middleware and by client-side
 * helpers that must avoid rendering UI for crawlers. Keep this module free of
 * runtime-specific globals so both environments can import it safely.
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
 * deliberately excluded from this narrower set.
 */
export const SEARCH_CRAWLER_PATTERNS: readonly string[] = [
  'googlebot',
  'google-inspectiontool',
  'bingbot',
];
