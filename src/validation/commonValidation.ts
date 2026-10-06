import { z } from 'zod';

/**
 * Common validation utilities
 */

/**
 * Sanitize string input - remove dangerous characters
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, ''); // Remove potential XSS vectors
}

/**
 * Validate and sanitize email
 */
export const emailSchema = z.string()
  .email('Format email tidak valid')
  .toLowerCase()
  .trim();

/**
 * ID validation - alphanumeric, dash, underscore only
 */
export const idSchema = z.string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/, 'ID hanya boleh berisi huruf, angka, dash, dan underscore');

/**
 * Slug validation
 */
export const slugSchema = z.string()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9-]+$/, 'Slug hanya boleh berisi huruf kecil, angka, dan dash');

/**
 * URL validation
 */
export const urlSchema = z.string()
  .url('Format URL tidak valid')
  .max(2048);

/**
 * Safe HTML content validation (untuk user input yang akan di-render)
 */
export function validateSafeContent(content: string, maxLength: number = 50000): boolean {
  if (content.length > maxLength) return false;
  
  // Check for dangerous patterns
  const dangerousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // onclick, onerror, etc
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(content));
}

/**
 * Generic validation error formatter
 */
export function formatValidationError(error: z.ZodError): string {
  return error.errors
    .map(err => `${err.path.join('.')}: ${err.message}`)
    .join(', ');
}
