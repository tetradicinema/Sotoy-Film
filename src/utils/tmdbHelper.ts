import { CastMember, CrewMember, FilmItem } from '../types';
import { slugify } from './slugify';
import { classifyFilmType, FilmFormat } from './filmType';
import { mapTmdbOriginCountry } from './tmdbCountry';
import { tmdbMediaType, normalizeTitle } from './tmdbSync';
import type { TmdbMediaData } from './tmdbMediaTrim';
import type { TmdbSeasonData, TmdbSeasonsData, TmdbEpisodeImagesData } from './tmdbSeasonsTrim';
import type {
  TmdbPersonCredit,
  TmdbPersonDetails,
  TmdbPersonSearchItem,
} from './tmdbPersonTrim';

export type { TmdbPersonCredit, TmdbPersonDetails, TmdbPersonSearchItem };

export interface MappedTmdbFilm {
  title: string;
  originalTitle: string;
  slug?: string;
  type: FilmFormat;
  year: number;
  releaseDate?: string;
  duration: string;
  poster: string;
  backdrop: string;
  synopsis: string;
  director: string;
  writer: string;
  studio: string;
  cast: string;
  castDetails: CastMember[];
  crewDetails: CrewMember[];
  genres: string;
  tags: string[];
  suggestedTags: string[];
  skorSotoy: number;
  trailerUrl: string;
  featuredRecommendation: boolean;
  tmdbId: number;
  originCountry: string[];
  collectionId?: number;
  collectionName?: string;
}

export interface TmdbCollectionPart {
  tmdbId: number;
  title: string;
  releaseDate: string;
  posterPath: string | null;
  voteAverage: number;
}

export interface TmdbCollectionResponse {
  id: number;
  name: string;
  parts: TmdbCollectionPart[];
}

export interface TmdbSearchResultItem {
  id: number;
  title: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  vote_average: number;
  media_type: 'movie' | 'tv';
}

/**
 * Searches TMDB for movies or TV series matching queryText
 */
export const searchTmdbFilms = async (
  queryText: string,
  type: 'movie' | 'tv' | 'all' = 'movie'
): Promise<TmdbSearchResultItem[]> => {
  if (!queryText || !queryText.trim()) return [];
  const clean = queryText.trim();
  try {
    if (type === 'all') {
      const [moviesRes, tvRes] = await Promise.allSettled([
        fetch(`/api/tmdb?action=search&query=${encodeURIComponent(clean)}&type=movie`),
        fetch(`/api/tmdb?action=search&query=${encodeURIComponent(clean)}&type=tv`),
      ]);

      const results: TmdbSearchResultItem[] = [];
      if (moviesRes.status === 'fulfilled' && moviesRes.value.ok) {
        const movieData = await moviesRes.value.json();
        if (Array.isArray(movieData)) {
          results.push(...movieData.map((m: any) => ({ ...m, media_type: 'movie' as const })));
        }
      }
      if (tvRes.status === 'fulfilled' && tvRes.value.ok) {
        const tvData = await tvRes.value.json();
        if (Array.isArray(tvData)) {
          results.push(...tvData.map((t: any) => ({ ...t, media_type: 'tv' as const })));
        }
      }
      return results;
    } else {
      const res = await fetch(`/api/tmdb?action=search&query=${encodeURIComponent(clean)}&type=${type}`);
      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data.map((item: any) => ({
        ...item,
        media_type: item.media_type || (type === 'tv' ? 'tv' : 'movie'),
      }));
    }
  } catch (err) {
    console.warn('[tmdbHelper] Search TMDB error:', err);
    return [];
  }
};

/**
 * Fetches curated list items from TMDB (popular, top_rated, trending, now_playing, upcoming).
 * `region` is only forwarded to TMDB for the movie now_playing/upcoming lists.
 */
export const fetchTmdbList = async (
  list: 'popular' | 'top_rated' | 'trending' | 'now_playing' | 'upcoming',
  type: 'movie' | 'tv' = 'movie',
  page: number = 1,
  region?: string
): Promise<TmdbSearchResultItem[]> => {
  try {
    let url = `/api/tmdb?action=list&list=${encodeURIComponent(list)}&type=${encodeURIComponent(type)}&page=${page}`;
    if (region) {
      url += `&region=${encodeURIComponent(region)}`;
    }
    const res = await fetch(url);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Gagal mengambil daftar ${list} dari TMDB (${res.status})`);
    }
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((item: any) => ({
      ...item,
      media_type: item.media_type || (type === 'tv' ? 'tv' : 'movie'),
    }));
  } catch (err: any) {
    console.warn('[tmdbHelper] Fetch TMDB list error:', err);
    throw err;
  }
};

// Helper to format minutes as "Xh Ym"
export const formatDuration = (minutes?: number): string => {
  if (!minutes || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

export const asPositiveTmdbId = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 ? value : undefined;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  }
  return undefined;
};

/** Menghasilkan `{ id }` hanya bila id orang TMDB valid (Firestore menolak nilai undefined). */
const personIdField = (value: unknown): { id?: number } => {
  const id = asPositiveTmdbId(value);
  return id !== undefined ? { id } : {};
};

/**
 * Builds the `tmdbId` portion of a film payload. Only a positive integer is
 * ever written, so undefined/0/NaN values are omitted. On edit, a missing form
 * value keeps the film's existing ID instead of erasing it.
 */
export const buildFilmPayloadTmdbId = (
  formTmdbId?: unknown,
  existingTmdbId?: unknown
): { tmdbId?: number } => {
  const nextTmdbId = asPositiveTmdbId(formTmdbId);
  if (nextTmdbId !== undefined) return { tmdbId: nextTmdbId };

  const preservedTmdbId = asPositiveTmdbId(existingTmdbId);
  return preservedTmdbId !== undefined ? { tmdbId: preservedTmdbId } : {};
};

// Generates relevant suggested tags based on film's genre, title, year, rating, and synopsis
export const generateSuggestedTags = (
  title: string,
  genres: string[],
  year?: number,
  overview?: string,
  voteAverage?: number,
  director?: string
): string[] => {
  const suggested = new Set<string>();
  const lowerTitle = (title || '').toLowerCase();
  const lowerOverview = (overview || '').toLowerCase();
  const lowerDirector = (director || '').toLowerCase();

  // 1. Era / Decade tags based on year (e.g. '90s cinema', '80s cinema')
  if (year && !isNaN(year)) {
    if (year >= 2020) suggested.add('2020s modern');
    else if (year >= 2010) suggested.add('2010s cinema');
    else if (year >= 2000) suggested.add('2000s era');
    else if (year >= 1990 && year < 2000) suggested.add('90s cinema');
    else if (year >= 1980 && year < 1990) suggested.add('80s cinema');
    else if (year >= 1970 && year < 1980) suggested.add('70s cinema');
    else if (year < 1970) suggested.add('vintage cinema');
  }

  // 2. Genre-derived tags
  genres.forEach(g => {
    const lg = g.toLowerCase().trim();
    if (lg.includes('thriller')) {
      suggested.add('thriller');
      suggested.add('mind-bending');
      suggested.add('suspense');
    }
    if (lg.includes('action')) {
      suggested.add('action-packed');
      suggested.add('adrenaline');
    }
    if (lg.includes('sci') || lg.includes('science')) {
      suggested.add('sci-fi');
      suggested.add('futuristic');
    }
    if (lg.includes('horror')) {
      suggested.add('horror');
      suggested.add('psychological horror');
    }
    if (lg.includes('drama')) {
      suggested.add('drama');
      suggested.add('character-driven');
    }
    if (lg.includes('crime')) {
      suggested.add('crime-saga');
      suggested.add('neo-noir');
    }
    if (lg.includes('comedy')) {
      suggested.add('comedy');
      suggested.add('satire');
    }
    if (lg.includes('romance')) {
      suggested.add('romance');
      suggested.add('heartfelt');
    }
    if (lg.includes('animation')) {
      suggested.add('animation');
      suggested.add('visual-masterpiece');
    }
    if (lg.includes('mystery')) {
      suggested.add('mystery');
      suggested.add('whodunit');
    }
    if (lg.includes('documentary')) {
      suggested.add('documentary');
      suggested.add('real-story');
    }
    if (lg.includes('fantasy')) {
      suggested.add('fantasy');
      suggested.add('world-building');
    }
    if (lg.includes('adventure')) {
      suggested.add('epic-journey');
    }
  });

  // 3. Oscar & Award-winning cinema detection
  const combinedText = `${lowerTitle} ${lowerOverview}`;
  const oscarTitles = [
    'oppenheimer', 'parasite', 'everything everywhere', 'nomadland', 'green book',
    'the shape of water', 'moonlight', 'spotlight', 'birdman', '12 years a slave',
    'argo', 'the artist', 'the king\'s speech', 'the hurt locker', 'slumdog millionaire',
    'no country for old men', 'the departed', 'gladiator', 'titanic', 'schindler\'s list',
    'forrest gump', 'the godfather', 'casablanca', 'zone of interest', 'anatomy of a fall',
    'dune', 'poor things', 'interstellar', 'la la land', 'whiplash', 'the lord of the rings'
  ];

  if (
    combinedText.includes('oscar') ||
    combinedText.includes('academy award') ||
    combinedText.includes('palme d\'or') ||
    combinedText.includes('cannes') ||
    combinedText.includes('golden globe') ||
    combinedText.includes('bafta') ||
    oscarTitles.some(ot => lowerTitle.includes(ot))
  ) {
    suggested.add('oscar-winner');
    suggested.add('critically-acclaimed');
  }

  // 4. Score or Acclaim
  if (voteAverage && voteAverage >= 7.8) {
    suggested.add('critically-acclaimed');
    suggested.add('must-watch');
  }

  // 5. Auteur Director Cinema
  const auteurs = [
    'christopher nolan', 'denis villeneuve', 'quentin tarantino', 'martin scorsese',
    'bong joon-ho', 'hayao miyazaki', 'david fincher', 'steven spielberg', 'stanley kubrick',
    'wes anderson', 'greta gerwig', 'ridley scott', 'guillermo del toro', 'jordan peele',
    'alfred hitchcock', 'akira kurosawa', 'coen brothers', 'paul thomas anderson'
  ];
  if (auteurs.some(a => lowerDirector.includes(a))) {
    suggested.add('auteur-cinema');
  }

  // 6. Keywords from synopsis/title
  if (combinedText.includes('time travel') || combinedText.includes('multiverse')) suggested.add('time-travel');
  if (combinedText.includes('space') || combinedText.includes('galaxy') || combinedText.includes('planet')) suggested.add('space-odyssey');
  if (combinedText.includes('artificial intelligence') || combinedText.includes('ai') || combinedText.includes('robot')) suggested.add('ai-dystopia');
  if (combinedText.includes('heist') || combinedText.includes('bank robbery')) suggested.add('heist');
  if (combinedText.includes('serial killer') || combinedText.includes('detective') || combinedText.includes('murder')) suggested.add('investigation');
  if (combinedText.includes('superhero') || combinedText.includes('marvel') || combinedText.includes('dc')) suggested.add('superhero');
  if (combinedText.includes('indie') || combinedText.includes('sundance')) suggested.add('indie-gem');
  if (combinedText.includes('twist') || combinedText.includes('revelation')) suggested.add('plot-twist');

  return Array.from(suggested);
};

// Fetches full details for a TMDB item
export const fetchTmdbDetails = async (id: number | string, type: 'movie' | 'tv'): Promise<any> => {
  const res = await fetch(`/api/tmdb?action=details&id=${id}&type=${type}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Gagal mengambil data TMDB (${res.status})`);
  }
  return await res.json();
};

// Maps TMDB details response into Film structure with top 5 cast details and auto-tags
export const mapTmdbDetailsToFilm = (details: any, type: 'movie' | 'tv'): MappedTmdbFilm => {
  const isMovie = type === 'movie';
  const mappedTitle = (isMovie ? details.title : details.name) || '';
  const mappedOriginalTitle = (isMovie ? details.original_title : details.original_name) || '';

  // Release year
  const rawDate = (isMovie ? details.release_date : details.first_air_date) || '';
  let mappedYear = new Date().getFullYear();
  if (rawDate && rawDate.length >= 4) {
    const parsed = parseInt(rawDate.substring(0, 4), 10);
    if (!isNaN(parsed)) mappedYear = parsed;
  }

  // Poster & Backdrop
  const mappedPoster = details.poster_path
    ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
    : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';
  const mappedBackdrop = details.backdrop_path
    ? `https://image.tmdb.org/t/p/original${details.backdrop_path}`
    : 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1200&q=80';

  // Synopsis
  const mappedSynopsis = details.overview || '';

  // Director and Writer
  let mappedDirector = '';
  let mappedWriter = '';
  const crew: any[] = details.credits?.crew || [];

  if (isMovie) {
    const directorEntry = crew.find((c: any) => c.job === 'Director');
    if (directorEntry) mappedDirector = directorEntry.name;

    const screenplayEntry = crew.find((c: any) => c.job === 'Screenplay');
    const writerEntry = crew.find((c: any) => c.job === 'Writer' || c.department === 'Writing');
    if (screenplayEntry) {
      mappedWriter = screenplayEntry.name;
    } else if (writerEntry) {
      mappedWriter = writerEntry.name;
    }
  } else {
    if (Array.isArray(details.created_by) && details.created_by.length > 0) {
      mappedDirector = details.created_by.map((c: any) => c.name).join(', ');
      mappedWriter = mappedDirector;
    }
  }

  // Cast: Top 10 with profile photos
  const topCastList = (details.credits?.cast || []).slice(0, 10);
  const castDetails: CastMember[] = topCastList
    .map((c: any) => ({
      ...personIdField(c.id),
      name: c.name || '',
      character: c.character || '',
      photo: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : '',
    }))
    .filter((c: CastMember) => Boolean(c.name));

  // Crew mapping: Prioritize Directing, Writing, Production, Camera, Music, Editing
  const rawCrew: any[] = details.credits?.crew || [];
  const priorityJobs = [
    'Director',
    'Screenplay',
    'Writer',
    'Story',
    'Producer',
    'Executive Producer',
    'Director of Photography',
    'Original Music Composer',
    'Music',
    'Editor',
    'Film Editor',
    'Production Design',
    'Costume Design',
    'Sound Designer',
    'Visual Effects Supervisor',
  ];

  // Sort crew by priority jobs first
  const sortedCrew = [...rawCrew].sort((a, b) => {
    const aIdx = priorityJobs.indexOf(a.job);
    const bIdx = priorityJobs.indexOf(b.job);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return (b.popularity || 0) - (a.popularity || 0);
  });

  // Unique crew members by name + job
  const seenCrewKeys = new Set<string>();
  const crewDetails: CrewMember[] = [];
  for (const c of sortedCrew) {
    if (!c.name) continue;
    const key = `${c.name}-${c.job}`;
    if (seenCrewKeys.has(key)) continue;
    seenCrewKeys.add(key);

    crewDetails.push({
      ...personIdField(c.id),
      name: c.name,
      job: c.job || c.department || 'Crew',
      department: c.department || 'Production',
      photo: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : '',
    });
  }

  // Cast names string
  const castNames = (details.credits?.cast || [])
    .slice(0, 10)
    .map((c: any) => c.name)
    .filter(Boolean)
    .join(', ');

  // Genres
  const genresArray = (details.genres || []).map((g: any) => g.name).filter(Boolean);
  const mappedGenres = genresArray.join(', ');

  // Duration
  let mappedDuration = '';
  if (isMovie) {
    mappedDuration = formatDuration(details.runtime);
  } else {
    if (Array.isArray(details.episode_run_time) && details.episode_run_time.length > 0) {
      mappedDuration = formatDuration(details.episode_run_time[0]);
    } else if (details.number_of_episodes) {
      mappedDuration = `${details.number_of_episodes} Episodes`;
    }
  }

  // Trailer URL
  let mappedTrailerUrl = '';
  if (details.videos && Array.isArray(details.videos.results)) {
    const trailer = details.videos.results.find(
      (v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
    );
    if (trailer && trailer.key) {
      mappedTrailerUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
    }
  }

  // Studio
  const mappedStudio = (details.production_companies && details.production_companies[0]?.name) || '';

  // Auto-generate suggested tags
  const suggestedTags = generateSuggestedTags(
    mappedTitle,
    genresArray,
    mappedYear,
    mappedSynopsis,
    details.vote_average,
    mappedDirector
  );

  // Auto-selected initial tags (top 4-5)
  const initialTags = suggestedTags.slice(0, 5);

  const collectionId =
    isMovie && details.belongs_to_collection?.id
      ? Number(details.belongs_to_collection.id)
      : undefined;
  const collectionName =
    isMovie && details.belongs_to_collection?.name
      ? String(details.belongs_to_collection.name).trim()
      : undefined;

  return {
    title: mappedTitle,
    originalTitle: mappedOriginalTitle,
    slug: slugify(mappedTitle),
    type: classifyFilmType({
      mediaType: isMovie ? 'movie' : 'tv',
      genres: (details.genres || []).map((g: any) => g.id ?? g.name),
    }),
    year: mappedYear,
    releaseDate: rawDate || undefined,
    duration: mappedDuration,
    poster: mappedPoster,
    backdrop: mappedBackdrop,
    synopsis: mappedSynopsis,
    director: mappedDirector,
    writer: mappedWriter,
    studio: mappedStudio,
    cast: castNames,
    castDetails,
    crewDetails,
    genres: mappedGenres,
    tags: initialTags,
    suggestedTags,
    // skorSotoy mirrors the TMDB vote_average and must never be fabricated:
    // without a vote average the score is 0 and the UI hides it until the
    // first real review lands. Clamped to the 1.0–10.0 scale only when a
    // genuine TMDB vote exists.
    skorSotoy:
      details.vote_average > 0
        ? Math.min(10, Math.max(1, Number(details.vote_average.toFixed(1))))
        : 0,
    trailerUrl: mappedTrailerUrl,
    featuredRecommendation: (details.vote_average || 0) >= 8.0,
    tmdbId: details.id,
    originCountry: mapTmdbOriginCountry(details),
    ...(collectionId ? { collectionId } : {}),
    ...(collectionName ? { collectionName } : {}),
  };
};

const collectionCache = new Map<number, TmdbCollectionResponse | null>();
const inFlightCollections = new Map<number, Promise<TmdbCollectionResponse | null>>();

/**
 * Fetches TMDB collection details with in-memory module cache and in-flight deduplication.
 * Returns null silently on error.
 */
export const fetchTmdbCollection = async (
  collectionId: number
): Promise<TmdbCollectionResponse | null> => {
  if (!collectionId || typeof collectionId !== 'number' || isNaN(collectionId) || collectionId <= 0) {
    return null;
  }
  if (collectionCache.has(collectionId)) {
    return collectionCache.get(collectionId) ?? null;
  }
  if (inFlightCollections.has(collectionId)) {
    return inFlightCollections.get(collectionId)!;
  }

  const promise = (async () => {
    try {
      const res = await fetch(`/api/tmdb?action=collection&id=${collectionId}`);
      if (!res.ok) {
        collectionCache.set(collectionId, null);
        return null;
      }
      const data = await res.json();
      if (!data || typeof data.id !== 'number') {
        collectionCache.set(collectionId, null);
        return null;
      }
      const result: TmdbCollectionResponse = {
        id: data.id,
        name: data.name || '',
        parts: Array.isArray(data.parts) ? data.parts : [],
      };
      collectionCache.set(collectionId, result);
      return result;
    } catch {
      collectionCache.set(collectionId, null);
      return null;
    } finally {
      inFlightCollections.delete(collectionId);
    }
  })();

  inFlightCollections.set(collectionId, promise);
  return promise;
};

/**
 * Fetches and returns full cast and crew for a movie or TV series from TMDB
 */
export const fetchFullTmdbCredits = async (
  identifier: number | string,
  type: 'movie' | 'tv' | 'series' = 'movie',
  titleFallback?: string
): Promise<{ cast: CastMember[]; crew: CrewMember[]; rawCredits?: any }> => {
  const normType = type === 'series' || type === 'tv' ? 'tv' : 'movie';
  let data: any = null;

  // 1. Try fetching by numerical ID first
  const numId = Number(identifier);
  if (!isNaN(numId) && numId > 0) {
    try {
      data = await fetchTmdbDetails(numId, normType);
    } catch {
      // ignore, fall back to title search
    }
  }

  // 2. If no data, try searching by title
  const searchTitle = titleFallback || (typeof identifier === 'string' && isNaN(Number(identifier)) ? identifier : '');
  if (!data && searchTitle.trim()) {
    try {
      const searchRes = await fetch(`/api/tmdb?action=search&query=${encodeURIComponent(searchTitle.trim())}&type=${normType}`);
      if (searchRes.ok) {
        const searchJson = await searchRes.json();
        const results = Array.isArray(searchJson) ? searchJson : searchJson?.results || [];
        if (results.length > 0 && results[0].id) {
          data = await fetchTmdbDetails(results[0].id, normType);
        }
      }
    } catch {
      // ignore
    }
  }

  if (!data || !data.credits) {
    return { cast: [], crew: [] };
  }

  const cast: CastMember[] = (data.credits.cast || [])
    .filter((c: any) => Boolean(c.name))
    .map((c: any) => ({
      ...personIdField(c.id),
      name: c.name,
      character: c.character || 'Karakter',
      photo: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : '',
    }));

  const priorityJobs = [
    'Director',
    'Screenplay',
    'Writer',
    'Story',
    'Producer',
    'Executive Producer',
    'Director of Photography',
    'Original Music Composer',
    'Music',
    'Editor',
    'Film Editor',
    'Production Design',
    'Costume Design',
    'Sound Designer',
    'Visual Effects Supervisor',
  ];

  const rawCrew: any[] = data.credits.crew || [];
  const sortedCrew = [...rawCrew].sort((a, b) => {
    const aIdx = priorityJobs.indexOf(a.job);
    const bIdx = priorityJobs.indexOf(b.job);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return (b.popularity || 0) - (a.popularity || 0);
  });

  const seenCrewKeys = new Set<string>();
  const crew: CrewMember[] = [];
  for (const c of sortedCrew) {
    if (!c.name) continue;
    const key = `${c.name}-${c.job}`;
    if (seenCrewKeys.has(key)) continue;
    seenCrewKeys.add(key);

    crew.push({
      ...personIdField(c.id),
      name: c.name,
      job: c.job || c.department || 'Crew',
      department: c.department || 'Production',
      photo: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : '',
    });
  }

  return { cast, crew, rawCredits: data.credits };
};

// ---------------------------------------------------------------------------
// Media gallery (videos, backdrops, posters)
// ---------------------------------------------------------------------------

const mediaCache = new Map<string, TmdbMediaData>();
const mediaInFlight = new Map<string, Promise<TmdbMediaData | null>>();

const emptyMediaData = (): TmdbMediaData => ({ videos: [], backdrops: [], posters: [] });

const normalizeMediaData = (data: any): TmdbMediaData => {
  if (!data || typeof data !== 'object') return emptyMediaData();
  return {
    videos: Array.isArray(data.videos) ? data.videos : [],
    backdrops: Array.isArray(data.backdrops) ? data.backdrops : [],
    posters: Array.isArray(data.posters) ? data.posters : [],
  };
};

/**
 * Fetches trimmed TMDB media for a movie/series. Results are cached at module
 * level and concurrent calls for the same id are de-duplicated. Any failure
 * resolves to `null` without throwing.
 */
export const fetchTmdbMedia = async (
  tmdbId: number | string | null | undefined,
  type: 'movie' | 'tv'
): Promise<TmdbMediaData | null> => {
  const id = String(tmdbId ?? '').trim();
  if (!/^\d+$/.test(id) || Number(id) <= 0) return null;

  const mediaType: 'movie' | 'tv' = type === 'tv' ? 'tv' : 'movie';
  const cacheKey = `${mediaType}:${id}`;

  const cached = mediaCache.get(cacheKey);
  if (cached) return cached;

  const inFlight = mediaInFlight.get(cacheKey);
  if (inFlight) return inFlight;

  const request = (async (): Promise<TmdbMediaData | null> => {
    try {
      const res = await fetch(`/api/tmdb?action=media&id=${encodeURIComponent(id)}&type=${mediaType}`);
      if (!res.ok) return null;
      const data = await res.json();
      return normalizeMediaData(data);
    } catch {
      return null;
    } finally {
      mediaInFlight.delete(cacheKey);
    }
  })();

  mediaInFlight.set(cacheKey, request);

  const result = await request;
  if (result) mediaCache.set(cacheKey, result);
  return result;
};

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export const tmdbBackdropThumbUrl = (filePath: string): string =>
  `${TMDB_IMAGE_BASE}/w780${filePath}`;

export const tmdbBackdropFullUrl = (filePath: string): string =>
  `${TMDB_IMAGE_BASE}/w1280${filePath}`;

export const tmdbPosterThumbUrl = (filePath: string): string =>
  `${TMDB_IMAGE_BASE}/w342${filePath}`;

export const tmdbPosterFullUrl = (filePath: string): string =>
  `${TMDB_IMAGE_BASE}/w780${filePath}`;

export const tmdbYoutubeThumbUrl = (key: string): string =>
  `https://i.ytimg.com/vi/${key}/hqdefault.jpg`;

export const tmdbYoutubeEmbedUrl = (key: string): string =>
  `https://www.youtube.com/embed/${key}?autoplay=1&rel=0`;

// ---------------------------------------------------------------------------
// TV seasons & episodes
// ---------------------------------------------------------------------------

const seasonsCache = new Map<string, TmdbSeasonsData>();
const seasonsInFlight = new Map<string, Promise<TmdbSeasonsData | null>>();
const seasonCache = new Map<string, TmdbSeasonData>();
const seasonInFlight = new Map<string, Promise<TmdbSeasonData | null>>();

const asTmdbId = (tmdbId: number | string | null | undefined): string => {
  const id = String(tmdbId ?? '').trim();
  return /^\d+$/.test(id) && Number(id) > 0 ? id : '';
};

/**
 * Fetches the trimmed season list for a TV show. Results are cached at module
 * level and concurrent calls for the same id are de-duplicated. Any failure
 * resolves to `null` without throwing.
 */
export const fetchTmdbSeasons = async (
  tmdbId: number | string | null | undefined
): Promise<TmdbSeasonsData | null> => {
  const id = asTmdbId(tmdbId);
  if (!id) return null;

  const cached = seasonsCache.get(id);
  if (cached) return cached;

  const inFlight = seasonsInFlight.get(id);
  if (inFlight) return inFlight;

  const request = (async (): Promise<TmdbSeasonsData | null> => {
    try {
      const res = await fetch(`/api/tmdb?action=seasons&id=${encodeURIComponent(id)}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data || typeof data !== 'object' || !Array.isArray(data.seasons)) return null;
      return data as TmdbSeasonsData;
    } catch {
      return null;
    } finally {
      seasonsInFlight.delete(id);
    }
  })();

  seasonsInFlight.set(id, request);

  const result = await request;
  if (result) seasonsCache.set(id, result);
  return result;
};

/**
 * Fetches the trimmed episode list for one season of a TV show. Results are
 * cached at module level and concurrent calls are de-duplicated. Any failure
 * resolves to `null` without throwing.
 */
export const fetchTmdbSeason = async (
  tmdbId: number | string | null | undefined,
  seasonNumber: number | string
): Promise<TmdbSeasonData | null> => {
  const id = asTmdbId(tmdbId);
  if (!id) return null;

  const rawSeason = String(seasonNumber ?? '').trim();
  if (!/^\d+$/.test(rawSeason)) return null;
  const season = Number(rawSeason);
  if (!Number.isInteger(season) || season < 0 || season > 100) return null;

  const cacheKey = `${id}:${season}`;

  const cached = seasonCache.get(cacheKey);
  if (cached) return cached;

  const inFlight = seasonInFlight.get(cacheKey);
  if (inFlight) return inFlight;

  const request = (async (): Promise<TmdbSeasonData | null> => {
    try {
      const res = await fetch(
        `/api/tmdb?action=season&id=${encodeURIComponent(id)}&season=${season}`
      );
      if (!res.ok) return null;
      const data = await res.json();
      if (!data || typeof data !== 'object' || !Array.isArray(data.episodes)) return null;
      return data as TmdbSeasonData;
    } catch {
      return null;
    } finally {
      seasonInFlight.delete(cacheKey);
    }
  })();

  seasonInFlight.set(cacheKey, request);

  const result = await request;
  if (result) seasonCache.set(cacheKey, result);
  return result;
};

export const tmdbSeasonPosterUrl = (filePath: string): string =>
  `${TMDB_IMAGE_BASE}/w342${filePath}`;

export const tmdbEpisodeStillUrl = (filePath: string): string =>
  `${TMDB_IMAGE_BASE}/w300${filePath}`;

export const tmdbEpisodeStillFullUrl = (filePath: string): string =>
  `${TMDB_IMAGE_BASE}/w780${filePath}`;

export const tmdbProfileThumbUrl = (filePath: string): string =>
  `${TMDB_IMAGE_BASE}/w185${filePath}`;

const episodeImagesCache = new Map<string, TmdbEpisodeImagesData>();
const episodeImagesInFlight = new Map<string, Promise<TmdbEpisodeImagesData | null>>();

/**
 * Fetches the stills for one episode. Results are cached per episode and
 * concurrent calls are de-duplicated; any failure resolves to `null`.
 */
export const fetchTmdbEpisodeImages = async (
  tmdbId: number | string | null | undefined,
  seasonNumber: number | string,
  episodeNumber: number | string
): Promise<TmdbEpisodeImagesData | null> => {
  const id = asTmdbId(tmdbId);
  if (!id) return null;

  const rawSeason = String(seasonNumber ?? '').trim();
  const rawEpisode = String(episodeNumber ?? '').trim();
  if (!/^\d+$/.test(rawSeason) || !/^\d+$/.test(rawEpisode)) return null;

  const season = Number(rawSeason);
  const episode = Number(rawEpisode);
  if (!Number.isInteger(season) || season < 0 || season > 100) return null;
  if (!Number.isInteger(episode) || episode < 1) return null;

  const cacheKey = `${id}:${season}:${episode}`;

  const cached = episodeImagesCache.get(cacheKey);
  if (cached) return cached;

  const inFlight = episodeImagesInFlight.get(cacheKey);
  if (inFlight) return inFlight;

  const request = (async (): Promise<TmdbEpisodeImagesData | null> => {
    try {
      const res = await fetch(
        `/api/tmdb?action=episode_images&id=${encodeURIComponent(id)}&season=${season}&episode=${episode}`
      );
      if (!res.ok) return null;
      const data = await res.json();
      if (!data || typeof data !== 'object' || !Array.isArray(data.stills)) return null;
      return data as TmdbEpisodeImagesData;
    } catch {
      return null;
    } finally {
      episodeImagesInFlight.delete(cacheKey);
    }
  })();

  episodeImagesInFlight.set(cacheKey, request);

  const result = await request;
  if (result) episodeImagesCache.set(cacheKey, result);
  return result;
};

// ---------------------------------------------------------------------------
// TMDB Duplicate Prevention Helpers
// ---------------------------------------------------------------------------

export interface CandidateFilmMeta {
  title?: string;
  year?: number | string;
  release_date?: string;
  first_air_date?: string;
  name?: string;
}

/**
 * Searches the catalog films for a duplicate of a TMDB item.
 *
 * Identity key: (mediaType, tmdbId) where mediaType is determined using
 * tmdbMediaType(film) on catalog films and normalized to 'movie' | 'tv' for
 * the incoming query.
 *
 * Fallback: Only for catalog films WITHOUT a tmdbId, matches if:
 * normalized title (lowercase, trimmed, punctuation stripped) + same year + same media type.
 */
export function findExistingFilmByTmdb(
  films: readonly FilmItem[] | undefined | null,
  tmdbId: unknown,
  mediaType: unknown,
  candidateMeta?: CandidateFilmMeta | string | null,
  candidateYear?: number | string | null
): FilmItem | null {
  if (!Array.isArray(films) || films.length === 0) {
    return null;
  }

  // 1. Normalize mediaType
  const rawType = typeof mediaType === 'string' ? mediaType.trim().toLowerCase() : '';
  const targetType: 'movie' | 'tv' = (rawType === 'tv' || rawType === 'series') ? 'tv' : 'movie';

  // 2. Normalize target TMDB ID
  const targetTmdbId = asPositiveTmdbId(tmdbId);

  // 3. Extract candidate title & year for fallback if supplied
  let candTitle: string | undefined;
  let candYear: number | undefined;

  if (typeof candidateMeta === 'string') {
    candTitle = candidateMeta.trim();
    if (candidateYear !== undefined && candidateYear !== null) {
      const y = typeof candidateYear === 'number' ? candidateYear : parseInt(String(candidateYear).slice(0, 4), 10);
      if (!isNaN(y) && y > 0) candYear = y;
    }
  } else if (candidateMeta && typeof candidateMeta === 'object') {
    const rawTitle = candidateMeta.title || candidateMeta.name;
    if (typeof rawTitle === 'string') candTitle = rawTitle.trim();
    const rawY = candidateMeta.year ?? candidateMeta.release_date ?? candidateMeta.first_air_date;
    if (rawY !== undefined && rawY !== null) {
      const y = typeof rawY === 'number' ? rawY : parseInt(String(rawY).slice(0, 4), 10);
      if (!isNaN(y) && y > 0) candYear = y;
    }
  }

  // 4. Primary check: (mediaType, tmdbId)
  if (targetTmdbId !== undefined) {
    for (const film of films) {
      if (!film) continue;
      const filmTmdbId = asPositiveTmdbId(film.tmdbId);
      const isTmdbIdMatch =
        filmTmdbId === targetTmdbId ||
        film.id === `tmdb-${targetTmdbId}` ||
        film.id === `film-tmdb-${targetTmdbId}`;

      if (isTmdbIdMatch) {
        if (tmdbMediaType(film) === targetType) {
          return film;
        }
      }
    }
  }

  // 5. Fallback ONLY for catalog films WITHOUT a tmdbId:
  // normalized title + same year + same media type
  if (candTitle && candYear !== undefined) {
    const normCandTitle = normalizeTitle(candTitle);
    if (normCandTitle.length > 0) {
      for (const film of films) {
        if (!film) continue;
        const filmTmdbId = asPositiveTmdbId(film.tmdbId);
        // Fallback ONLY applies when the catalog film has NO tmdbId
        if (filmTmdbId !== undefined) {
          continue;
        }

        if (tmdbMediaType(film) !== targetType) {
          continue;
        }

        if (film.year !== candYear) {
          continue;
        }

        const normFilmTitle = normalizeTitle(film.title);
        const normFilmOrig = film.originalTitle ? normalizeTitle(film.originalTitle) : '';
        if (normFilmTitle === normCandTitle || (normFilmOrig && normFilmOrig === normCandTitle)) {
          return film;
        }
      }
    }
  }

  return null;
}

export interface TmdbDuplicateGroup {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  films: FilmItem[];
}

/**
 * Finds all groups of films in the catalog that share the exact same (mediaType, tmdbId).
 * Does not mutate or delete anything.
 */
export function findTmdbDuplicateGroups(films: readonly FilmItem[] | undefined | null): TmdbDuplicateGroup[] {
  if (!Array.isArray(films) || films.length === 0) {
    return [];
  }

  const map = new Map<string, { tmdbId: number; mediaType: 'movie' | 'tv'; films: FilmItem[] }>();

  for (const film of films) {
    if (!film) continue;
    const tmdbId = asPositiveTmdbId(film.tmdbId);
    if (!tmdbId) continue;
    const mediaType = tmdbMediaType(film);
    const key = `${mediaType}:${tmdbId}`;

    const existing = map.get(key);
    if (existing) {
      existing.films.push(film);
    } else {
      map.set(key, { tmdbId, mediaType, films: [film] });
    }
  }

  const duplicateGroups: TmdbDuplicateGroup[] = [];
  for (const group of map.values()) {
    if (group.films.length > 1) {
      duplicateGroups.push(group);
    }
  }

  // Sort groups by tmdbId
  return duplicateGroups.sort((a, b) => a.tmdbId - b.tmdbId);
}

// ---------------------------------------------------------------------------
// People (search, details, popular)
// ---------------------------------------------------------------------------

const asTmdbPersonPage = (page: number | string): number => {
  const parsed = typeof page === 'number' ? page : parseInt(String(page), 10);
  const safe = Number.isFinite(parsed) ? Math.trunc(parsed) : 1;
  return Math.max(1, Math.min(500, safe || 1));
};

const fetchTmdbPeopleList = async (url: string): Promise<TmdbPersonSearchItem[]> => {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data as TmdbPersonSearchItem[];
  } catch (err) {
    console.warn('[tmdbHelper] Fetch TMDB people error:', err);
    return [];
  }
};

/**
 * Searches TMDB for people matching `query`. Any failure resolves to `[]`
 * without throwing.
 */
export const searchTmdbPeople = async (
  query: string,
  page: number = 1
): Promise<TmdbPersonSearchItem[]> => {
  if (!query || !query.trim()) return [];
  return fetchTmdbPeopleList(
    `/api/tmdb?action=person_search&query=${encodeURIComponent(query.trim())}&page=${asTmdbPersonPage(page)}`
  );
};

/**
 * Fetches a trimmed TMDB person profile. Invalid ids and request failures
 * resolve to `null` without throwing.
 */
export const getTmdbPerson = async (
  id: number | string
): Promise<TmdbPersonDetails | null> => {
  const rawId = String(id ?? '').trim();
  if (!/^\d+$/.test(rawId) || Number(rawId) <= 0) return null;

  try {
    const res = await fetch(`/api/tmdb?action=person_details&id=${encodeURIComponent(rawId)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || typeof data !== 'object' || typeof data.id !== 'number') return null;
    return data as TmdbPersonDetails;
  } catch (err) {
    console.warn('[tmdbHelper] Fetch TMDB person error:', err);
    return null;
  }
};

/**
 * Fetches TMDB's popular people list. Any failure resolves to `[]` without
 * throwing.
 */
export const getTmdbPopularPeople = async (
  page: number = 1
): Promise<TmdbPersonSearchItem[]> => {
  return fetchTmdbPeopleList(
    `/api/tmdb?action=person_list&list=popular&page=${asTmdbPersonPage(page)}`
  );
};

