import { z } from 'zod';

/**
 * Validation schema untuk Image Proxy requests
 */

const ALLOWED_HOSTS = [
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
  'image.tmdb.org',
  'images.unsplash.com',
  'lh3.googleusercontent.com',
  'www.sotoyfilm.my.id',
];

export const imageProxySchema = z.object({
  url: z.string()
    .url('URL tidak valid')
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          return parsed.protocol === 'https:';
        } catch {
          return false;
        }
      },
      { message: 'Hanya HTTPS URLs yang diizinkan' }
    )
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          const hostname = parsed.hostname.toLowerCase();
          return ALLOWED_HOSTS.some(host => hostname === host || hostname.endsWith(`.${host}`));
        } catch {
          return false;
        }
      },
      { message: 'Host tidak diizinkan. Hanya trusted domains yang dapat diakses.' }
    ),
});

export type ImageProxyRequest = z.infer<typeof imageProxySchema>;
