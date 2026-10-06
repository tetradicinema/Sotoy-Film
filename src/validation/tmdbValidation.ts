import { z } from 'zod';

/**
 * Validation schemas untuk TMDB API proxy requests
 */

export const tmdbSearchSchema = z.object({
  action: z.literal('search'),
  query: z.string().min(1).max(500, 'Query terlalu panjang'),
  type: z.enum(['movie', 'tv']).optional().default('movie'),
});

export const tmdbDetailsSchema = z.object({
  action: z.literal('details'),
  id: z.string().regex(/^\d+$/, 'ID harus berupa angka').max(20),
  type: z.enum(['movie', 'tv']).optional().default('movie'),
});

export const tmdbListSchema = z.object({
  action: z.literal('list'),
  list: z.enum(['popular', 'top_rated', 'trending', 'now_playing']).optional().default('popular'),
  type: z.enum(['movie', 'tv']).optional().default('movie'),
  page: z.string().regex(/^\d+$/).optional().default('1'),
});

export const tmdbRequestSchema = z.discriminatedUnion('action', [
  tmdbSearchSchema,
  tmdbDetailsSchema,
  tmdbListSchema,
]);

export type TmdbSearchRequest = z.infer<typeof tmdbSearchSchema>;
export type TmdbDetailsRequest = z.infer<typeof tmdbDetailsSchema>;
export type TmdbListRequest = z.infer<typeof tmdbListSchema>;
export type TmdbRequest = z.infer<typeof tmdbRequestSchema>;
