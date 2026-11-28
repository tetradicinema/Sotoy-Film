/**
 * Bot detection utilities for Vercel Edge Middleware.
 * Identifies search engine crawlers, social media preview bots,
 * and link scrapers with zero dependencies.
 */

import {
  BOT_PATTERNS as SHARED_BOT_PATTERNS,
  SEARCH_CRAWLER_PATTERNS as SHARED_SEARCH_CRAWLER_PATTERNS,
} from '../botPatterns.js';

// Re-exported so existing edge imports keep working unchanged.
export const BOT_PATTERNS: readonly string[] = SHARED_BOT_PATTERNS;
export const SEARCH_CRAWLER_PATTERNS: readonly string[] = SHARED_SEARCH_CRAWLER_PATTERNS;

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
