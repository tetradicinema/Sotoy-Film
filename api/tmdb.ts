import type { IncomingMessage, ServerResponse } from 'http';

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
  let action = '';
  let query = '';
  let type = 'movie';
  let id = '';
  let list = 'popular';
  let page = '1';

  if (req.query && typeof req.query === 'object') {
    action = String(req.query.action || '');
    query = String(req.query.query || '');
    type = String(req.query.type || 'movie');
    id = String(req.query.id || '');
    list = String(req.query.list || 'popular');
    page = String(req.query.page || '1');
  } else if (req.url) {
    try {
      const parsedUrl = new URL(req.url, 'http://localhost');
      action = parsedUrl.searchParams.get('action') || '';
      query = parsedUrl.searchParams.get('query') || '';
      type = parsedUrl.searchParams.get('type') || 'movie';
      id = parsedUrl.searchParams.get('id') || '';
      list = parsedUrl.searchParams.get('list') || 'popular';
      page = parsedUrl.searchParams.get('page') || '1';
    } catch {
      // ignore
    }
  }

  const normalizedType = type === 'tv' ? 'tv' : 'movie';
  const pageNumber = Math.max(1, Math.min(500, parseInt(page, 10) || 1));

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
      if (!query.trim()) {
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

    if (action === 'sync') {
      if (!/^\d+$/.test(id) || Number(id) <= 0) {
        return res.status(400).json({
          error: 'Valid numerical parameter "id" is required for sync action.'
        });
      }

      const endpoint = normalizedType === 'tv' ? `tv/${id}` : `movie/${id}`;
      const tmdbUrl = new URL(`https://api.themoviedb.org/3/${endpoint}`);
      if (!isBearer) {
        tmdbUrl.searchParams.set('api_key', apiKey);
      }
      tmdbUrl.searchParams.set(
        'append_to_response',
        normalizedType === 'movie' ? 'release_dates,watch/providers' : 'watch/providers'
      );
      tmdbUrl.searchParams.set('watch_region', 'ID');
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

      const releaseDatesID = normalizedType === 'movie'
        ? ((data.release_dates?.results || []).find((entry: any) => entry.iso_3166_1 === 'ID')?.release_dates || [])
            .map((entry: any) => ({
              type: Number(entry.type),
              date: String(entry.release_date || ''),
            }))
            .filter((entry: any) => Number.isFinite(entry.type) && entry.date.length > 0)
        : [];

      const regionProviders = data['watch/providers']?.results?.ID || {};
      const providerNames = (providerList: any): string[] => {
        const names = (Array.isArray(providerList) ? providerList : [])
          .map((provider: any) => String(provider?.provider_name || '').trim())
          .filter(Boolean);
        return Array.from(new Set(names));
      };

      return res.status(200).json({
        tmdbId: Number(id),
        type: normalizedType,
        releaseDate: data.release_date || data.first_air_date || '',
        releaseDatesID,
        providersID: {
          flatrate: providerNames(regionProviders.flatrate),
          rent: providerNames(regionProviders.rent),
          buy: providerNames(regionProviders.buy),
        },
        status: data.status || '',
      });
    }

    if (action === 'now_playing_ids') {
      const ids = new Set<number>();

      for (let pageNumberToFetch = 1; pageNumberToFetch <= 3; pageNumberToFetch++) {
        const tmdbUrl = new URL('https://api.themoviedb.org/3/movie/now_playing');
        if (!isBearer) {
          tmdbUrl.searchParams.set('api_key', apiKey);
        }
        tmdbUrl.searchParams.set('region', 'ID');
        tmdbUrl.searchParams.set('language', 'en-US');
        tmdbUrl.searchParams.set('page', String(pageNumberToFetch));

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

        for (const item of data.results || []) {
          const numericId = Number(item?.id);
          if (Number.isFinite(numericId) && numericId > 0) {
            ids.add(numericId);
          }
        }
      }

      return res.status(200).json({ ids: Array.from(ids) });
    }

    return res.status(400).json({
      error: 'Invalid action. Supported actions: "search", "details", "list", "sync", or "now_playing_ids".'
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
