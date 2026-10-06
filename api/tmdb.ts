import type { IncomingMessage, ServerResponse } from 'http';
import { tmdbRequestSchema } from '../src/validation/tmdbValidation';
import { formatValidationError } from '../src/validation/commonValidation';

interface TmdbHandlerRequest extends IncomingMessage {
  query?: Record<string, string | string[]>;
  url?: string;
  method?: string;
}

interface TmdbHandlerResponse extends ServerResponse {
  status: (code: number) => TmdbHandlerResponse;
  json: (data: any) => void;
}

export async function handleTmdbRequest(req: any, res: any) {
  // Enable basic CORS and JSON response
  res.setHeader?.('Content-Type', 'application/json');

  if (req.method && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Only GET is supported.' });
  }

  const apiKey = process.env.TMDB_API_KEY?.trim();
  if (!apiKey) {
    return res.status(400).json({
      error: 'TMDB_API_KEY environment variable is not configured on the server. Please add TMDB_API_KEY in server environment settings.',
      code: 'MISSING_API_KEY'
    });
  }

  // Extract query parameters (supporting both Express and Vercel serverless request shapes)
  let queryParams: Record<string, string> = {};
  
  if (req.query && typeof req.query === 'object') {
    queryParams = {
      action: String(req.query.action || ''),
      query: String(req.query.query || ''),
      type: String(req.query.type || 'movie'),
      id: String(req.query.id || ''),
      list: String(req.query.list || 'popular'),
      page: String(req.query.page || '1'),
    };
  } else if (req.url) {
    try {
      const parsedUrl = new URL(req.url, 'http://localhost');
      queryParams = {
        action: parsedUrl.searchParams.get('action') || '',
        query: parsedUrl.searchParams.get('query') || '',
        type: parsedUrl.searchParams.get('type') || 'movie',
        id: parsedUrl.searchParams.get('id') || '',
        list: parsedUrl.searchParams.get('list') || 'popular',
        page: parsedUrl.searchParams.get('page') || '1',
      };
    } catch {
      return res.status(400).json({ error: 'Invalid request URL', code: 'INVALID_URL' });
    }
  }

  // Validate request dengan Zod
  const validation = tmdbRequestSchema.safeParse(queryParams);
  if (!validation.success) {
    return res.status(400).json({
      error: 'Invalid request parameters',
      code: 'VALIDATION_ERROR',
      details: formatValidationError(validation.error),
    });
  }

  const validatedParams = validation.data;
  const { action, type } = validatedParams;
  const normalizedType = type === 'tv' ? 'tv' : 'movie';

  // Determine headers and URL params for TMDB authentication
  // Supports both TMDB v3 API Key and v4 Read Access Token
  const isBearer = apiKey.startsWith('ey') || apiKey.length > 50;
  const authHeaders: Record<string, string> = {
    'Accept': 'application/json',
  };
  if (isBearer) {
    authHeaders['Authorization'] = `Bearer ${apiKey}`;
  }

  try {
    if (action === 'search') {
      const { query } = validatedParams as any;
      if (!query || !query.trim()) {
        return res.status(400).json({ error: 'Parameter "query" is required for search action.' });
      }

      const endpoint = normalizedType === 'tv' ? 'search/tv' : 'search/movie';
      const tmdbUrl = new URL(`https://api.themoviedb.org/3/${endpoint}`);
      if (!isBearer) {
        tmdbUrl.searchParams.set('api_key', apiKey);
      }
      tmdbUrl.searchParams.set('query', query.trim());
      tmdbUrl.searchParams.set('include_adult', 'false');
      tmdbUrl.searchParams.set('language', 'en-US');
      tmdbUrl.searchParams.set('page', '1');

      const response = await fetch(tmdbUrl.toString(), {
        method: 'GET',
        headers: authHeaders,
      });

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({
          error: data.status_message || `TMDB API error (${response.status})`,
          code: 'TMDB_API_ERROR'
        });
      }

      // Return raw results array containing id, title/name, release_date/first_air_date, poster_path, overview
      const results = (data.results || []).map((item: any) => ({
        id: item.id,
        title: item.title || item.name || '',
        name: item.name || item.title || '',
        original_title: item.original_title || item.original_name || '',
        original_name: item.original_name || item.original_title || '',
        release_date: item.release_date || item.first_air_date || '',
        first_air_date: item.first_air_date || item.release_date || '',
        poster_path: item.poster_path || null,
        backdrop_path: item.backdrop_path || null,
        overview: item.overview || '',
        vote_average: item.vote_average || 0,
        media_type: normalizedType,
      }));

      return res.status(200).json(results);
    }

    if (action === 'details') {
      const { id } = validatedParams as any;
      if (!id || isNaN(Number(id))) {
        return res.status(400).json({ error: 'Valid numerical parameter "id" is required for details action.' });
      }

      const endpoint = normalizedType === 'tv' ? `tv/${id}` : `movie/${id}`;
      const tmdbUrl = new URL(`https://api.themoviedb.org/3/${endpoint}`);
      if (!isBearer) {
        tmdbUrl.searchParams.set('api_key', apiKey);
      }
      tmdbUrl.searchParams.set('append_to_response', 'credits,videos');
      tmdbUrl.searchParams.set('language', 'en-US');

      const response = await fetch(tmdbUrl.toString(), {
        method: 'GET',
        headers: authHeaders,
      });

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({
          error: data.status_message || `TMDB API error (${response.status})`,
          code: 'TMDB_API_ERROR'
        });
      }

      return res.status(200).json(data);
    }

    if (action === 'list') {
      const { list, page } = validatedParams as any;
      const pageNumber = Math.max(1, Math.min(500, parseInt(page, 10) || 1));
      
      let endpoint = '';
      const normalizedList = list.toLowerCase().trim();

      if (normalizedType === 'tv') {
        switch (normalizedList) {
          case 'popular':
            endpoint = 'tv/popular';
            break;
          case 'top_rated':
            endpoint = 'tv/top_rated';
            break;
          case 'trending':
            endpoint = 'trending/tv/week';
            break;
          case 'now_playing':
            endpoint = 'tv/on_the_air';
            break;
          default:
            return res.status(400).json({
              error: 'Invalid list parameter. Supported lists: "popular", "top_rated", "trending", "now_playing".'
            });
        }
      } else {
        switch (normalizedList) {
          case 'popular':
            endpoint = 'movie/popular';
            break;
          case 'top_rated':
            endpoint = 'movie/top_rated';
            break;
          case 'trending':
            endpoint = 'trending/movie/week';
            break;
          case 'now_playing':
            endpoint = 'movie/now_playing';
            break;
          default:
            return res.status(400).json({
              error: 'Invalid list parameter. Supported lists: "popular", "top_rated", "trending", "now_playing".'
            });
        }
      }

      const tmdbUrl = new URL(`https://api.themoviedb.org/3/${endpoint}`);
      if (!isBearer) {
        tmdbUrl.searchParams.set('api_key', apiKey);
      }
      tmdbUrl.searchParams.set('language', 'en-US');
      tmdbUrl.searchParams.set('page', String(pageNumber));

      const response = await fetch(tmdbUrl.toString(), {
        method: 'GET',
        headers: authHeaders,
      });

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({
          error: data.status_message || `TMDB API error (${response.status})`,
          code: 'TMDB_API_ERROR'
        });
      }

      // Return raw results array containing id, title/name, release_date/first_air_date, poster_path, overview, vote_average
      const results = (data.results || []).map((item: any) => ({
        id: item.id,
        title: item.title || item.name || '',
        name: item.name || item.title || '',
        original_title: item.original_title || item.original_name || '',
        original_name: item.original_name || item.original_title || '',
        release_date: item.release_date || item.first_air_date || '',
        first_air_date: item.first_air_date || item.release_date || '',
        poster_path: item.poster_path || null,
        backdrop_path: item.backdrop_path || null,
        overview: item.overview || '',
        vote_average: item.vote_average || 0,
        media_type: normalizedType,
      }));

      return res.status(200).json(results);
    }

    return res.status(400).json({
      error: 'Invalid action. Supported actions: "search", "details", or "list".'
    });
  } catch (err: any) {
    console.error('TMDB Proxy Server Error:', err);
    return res.status(500).json({
      error: err.message || 'Internal server error while communicating with TMDB API.',
      code: 'SERVER_ERROR'
    });
  }
}

// Default export for Vercel Serverless Function
export default async function handler(req: any, res: any) {
  return handleTmdbRequest(req, res);
}
