import { CastMember } from '../types';

export interface MappedTmdbFilm {
  title: string;
  originalTitle: string;
  type: 'movie' | 'series' | 'anime';
  year: number;
  duration: string;
  poster: string;
  backdrop: string;
  synopsis: string;
  director: string;
  writer: string;
  studio: string;
  cast: string;
  castDetails: CastMember[];
  genres: string;
  tags: string[];
  suggestedTags: string[];
  skorSotoy: number;
  trailerUrl: string;
  featuredRecommendation: boolean;
  tmdbId: number;
}

// Helper to format minutes as "Xh Ym"
export const formatDuration = (minutes?: number): string => {
  if (!minutes || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
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

  // Cast: Top 5 with profile photos
  const topCastList = (details.credits?.cast || []).slice(0, 5);
  const castDetails: CastMember[] = topCastList
    .map((c: any) => ({
      name: c.name || '',
      character: c.character || '',
      photo: c.profile_path
        ? `https://image.tmdb.org/t/p/w185${c.profile_path}`
        : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    }))
    .filter((c: CastMember) => Boolean(c.name));

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

  return {
    title: mappedTitle,
    originalTitle: mappedOriginalTitle,
    type: isMovie ? 'movie' : 'series',
    year: mappedYear,
    duration: mappedDuration,
    poster: mappedPoster,
    backdrop: mappedBackdrop,
    synopsis: mappedSynopsis,
    director: mappedDirector,
    writer: mappedWriter,
    studio: mappedStudio,
    cast: castNames,
    castDetails,
    genres: mappedGenres,
    tags: initialTags,
    suggestedTags,
    skorSotoy: details.vote_average ? Math.min(5, Math.max(1, Number((details.vote_average / 2).toFixed(1)))) : 4.0,
    trailerUrl: mappedTrailerUrl,
    featuredRecommendation: (details.vote_average || 0) >= 8.0,
    tmdbId: details.id,
  };
};
