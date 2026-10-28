import type { IncomingMessage, ServerResponse } from 'http';
import {
  fetchNowPlayingIdsID,
  fetchTmdbSyncData,
  TmdbRequestError,
} from '../src/utils/tmdbServerFetch.js';
import { trimTmdbMedia } from '../src/utils/tmdbMediaTrim.js';
import {
  trimTmdbSeasons,
  trimTmdbSeason,
  trimTmdbEpisodeImages,
} from '../src/utils/tmdbSeasonsTrim.js';

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
  let season = '';
  let episode = '';

  if (req.query && typeof req.query === 'object') {
    action = String(req.query.action || '');
    query = String(req.query.query || '');
    type = String(req.query.type || 'movie');
    id = String(req.query.id || '');
    list = String(req.query.list || 'popular');
    page = String(req.query.page || '1');
    season = String(req.query.season || '');
    episode = String(req.query.episode || '');
  } else if (req.url) {
    try {
      const parsedUrl = new URL(req.url, 'http://localhost');
      action = parsedUrl.searchParams.get('action') || '';
      query = parsedUrl.searchParams.get('query') || '';
      type = parsedUrl.searchParams.get('type') || 'movie';
      id = parsedUrl.searchParams.get('id') || '';
      list = parsedUrl.searchParams.get('list') || 'popular';
      page = parsedUrl.searchParams.get('page') || '1';
      season = parsedUrl.searchParams.get('season') || '';
      episode = parsedUrl.searchParams.get('episode') || '';
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

    if (action === 'media') {
      if (!/^\d+$/.test(id) || Number(id) <= 0) {
        return res.status(400).json({
          error: 'Valid numerical parameter "id" is required for media action.'
        });
      }

      const endpoint = normalizedType === 'tv' ? `tv/${id}` : `movie/${id}`;
      const tmdbUrl = new URL(`https://api.themoviedb.org/3/${endpoint}`);
      if (!isBearer) {
        tmdbUrl.searchParams.set('api_key', apiKey);
      }
      tmdbUrl.searchParams.set('append_to_response', 'videos,images');
      tmdbUrl.searchParams.set('include_image_language', 'en,id,null');
      tmdbUrl.searchParams.set('include_video_language', 'en,id,null');
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

      res.setHeader?.('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).json(trimTmdbMedia(data));
    }

    if (action === 'collection') {
      if (!/^\d+$/.test(id) || Number(id) <= 0) {
        return res.status(400).json({
          error: 'Valid numerical parameter "id" is required for collection action.'
        });
      }

      const tmdbUrl = new URL(`https://api.themoviedb.org/3/collection/${id}`);
      if (!isBearer) {
        tmdbUrl.searchParams.set('api_key', apiKey);
      }
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

      const rawParts = Array.isArray(data.parts) ? data.parts : [];
      const parts = rawParts.map((part: any) => ({
        tmdbId: Number(part.id),
        title: part.title || part.name || '',
        releaseDate: part.release_date || part.first_air_date || '',
        posterPath: part.poster_path || null,
        voteAverage: typeof part.vote_average === 'number' ? part.vote_average : 0,
      }));

      // Sort by releaseDate ascending, undated last
      parts.sort((a: any, b: any) => {
        const dateA = a.releaseDate ? a.releaseDate.trim() : '';
        const dateB = b.releaseDate ? b.releaseDate.trim() : '';
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA.localeCompare(dateB);
      });

      res.setHeader?.('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).json({
        id: Number(data.id),
        name: data.name || '',
        parts,
      });
    }

    if (action === 'seasons') {
      if (!/^\d+$/.test(id) || Number(id) <= 0) {
        return res.status(400).json({
          error: 'Valid numerical parameter "id" is required for seasons action.'
        });
      }

      const tmdbUrl = new URL(`https://api.themoviedb.org/3/tv/${id}`);
      if (!isBearer) {
        tmdbUrl.searchParams.set('api_key', apiKey);
      }
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

      res.setHeader?.('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).json(trimTmdbSeasons(data));
    }

    if (action === 'season') {
      if (!/^\d+$/.test(id) || Number(id) <= 0) {
        return res.status(400).json({
          error: 'Valid numerical parameter "id" is required for season action.'
        });
      }

      if (!/^\d{1,3}$/.test(season) || Number(season) < 0 || Number(season) > 100) {
        return res.status(400).json({
          error: 'Valid integer parameter "season" (0-100) is required for season action.'
        });
      }

      const tmdbUrl = new URL(`https://api.themoviedb.org/3/tv/${id}/season/${Number(season)}`);
      if (!isBearer) {
        tmdbUrl.searchParams.set('api_key', apiKey);
      }
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

      res.setHeader?.('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).json(trimTmdbSeason(data));
    }

    if (action === 'episode_images') {
      if (!/^\d+$/.test(id) || Number(id) <= 0) {
        return res.status(400).json({
          error: 'Valid numerical parameter "id" is required for episode_images action.'
        });
      }

      if (!/^\d{1,3}$/.test(season) || Number(season) < 0 || Number(season) > 100) {
        return res.status(400).json({
          error: 'Valid integer parameter "season" (0-100) is required for episode_images action.'
        });
      }

      if (!/^\d{1,4}$/.test(episode) || Number(episode) < 1) {
        return res.status(400).json({
          error: 'Valid integer parameter "episode" (>= 1) is required for episode_images action.'
        });
      }

      const tmdbUrl = new URL(
        `https://api.themoviedb.org/3/tv/${id}/season/${Number(season)}/episode/${Number(episode)}/images`
      );
      if (!isBearer) {
        tmdbUrl.searchParams.set('api_key', apiKey);
      }

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

      res.setHeader?.('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).json(trimTmdbEpisodeImages(data));
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

      try {
        const syncData = await fetchTmdbSyncData(normalizedType, Number(id), apiKey);
        return res.status(200).json(syncData);
      } catch (err: any) {
        if (err instanceof TmdbRequestError) {
          return res.status(err.status).json({
            error: err.message,
            code: 'TMDB_API_ERROR'
          });
        }
        throw err;
      }
    }

    if (action === 'now_playing_ids') {
      try {
        const ids = await fetchNowPlayingIdsID(apiKey);
        return res.status(200).json({ ids });
      } catch (err: any) {
        if (err instanceof TmdbRequestError) {
          return res.status(err.status).json({
            error: err.message,
            code: 'TMDB_API_ERROR'
          });
        }
        throw err;
      }
    }

    return res.status(400).json({
      error: 'Invalid action. Supported actions: "search", "details", "media", "collection", "list", "sync", "now_playing_ids", "seasons", "season", or "episode_images".'
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
