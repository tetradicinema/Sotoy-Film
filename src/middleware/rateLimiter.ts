import rateLimit from 'express-rate-limit';

/**
 * Rate limiter untuk API endpoints publik
 * Mencegah abuse dan DoS attacks
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 100, // Max 100 requests per windowMs
  message: {
    error: 'Terlalu banyak permintaan dari IP ini. Silakan coba lagi nanti.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting untuk internal health checks
  skip: (req) => req.path === '/api/health',
});

/**
 * Rate limiter lebih ketat untuk TMDB proxy
 * Karena ada biaya external API
 */
export const tmdbLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  max: 30, // Max 30 requests per menit
  message: {
    error: 'Terlalu banyak permintaan ke TMDB API. Silakan tunggu sebentar.',
    code: 'TMDB_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter untuk image proxy
 */
export const imageProxyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  max: 50, // Max 50 images per menit
  message: {
    error: 'Terlalu banyak permintaan gambar. Silakan tunggu sebentar.',
    code: 'IMAGE_PROXY_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter untuk authentication endpoints
 * Lebih ketat untuk mencegah brute force attacks
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 5, // Max 5 login attempts
  message: {
    error: 'Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Tidak count successful requests
});
