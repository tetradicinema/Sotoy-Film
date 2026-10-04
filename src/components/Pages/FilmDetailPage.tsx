import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Star,
  Clock,
  User,
  Users,
  Heart,
  Calendar,
  Share2,
  ArrowLeft,
  Tv,
  CheckCircle2,
  MessageSquare,
  Bookmark,
  Check,
  Play,
  Film,
  Camera,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Maximize2,
  X,
  Volume2,
  Award,
  Video,
  Info,
  Clapperboard,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useDynamicArticleAuthor } from '../../hooks/useDynamicArticleAuthor';
import { SEOHead } from '../SEO/SEOHead';
import { createMovieSchemaFromFilm, generateBreadcrumbSchema } from '../../utils/schemaHelpers';
import { slugify } from '../../utils/slugify';
import { INITIAL_FILMS, DEFAULT_AVATAR, DEFAULT_POSTER, DEFAULT_COVER } from '../../data/mockData';
import { formatRelativeTime, formatFullDateTime } from '../../utils/formatRelativeTime';
import { getRoleBadgeStyle } from '../../utils/roleStyles';
import { RoleBadge } from '../Common/RoleBadge';
import { FilmItem, CastMember, CrewMember, UserRating } from '../../types';
import { RateFilmModal } from '../Modals/RateFilmModal';
import { AddToCollectionModal } from '../Modals/AddToCollectionModal';
import { CollectionPickerPopover } from '../Common/CollectionPickerPopover';
import { FullCastCrewModal } from '../Modals/FullCastCrewModal';
import { PersonAvatar } from '../Common/PersonAvatar';
import { AdBannerSlot } from '../Common/AdBannerSlot';
import { FilmDetailSkeleton } from '../Skeletons';
import { BreadcrumbNavigation } from '../Navigation/BreadcrumbNavigation';
import { fetchFullTmdbCredits } from '../../utils/tmdbHelper';

const RelatedArticleAuthorBadge: React.FC<{ authorId?: string; defaultAuthor?: any }> = ({ authorId, defaultAuthor }) => {
  const author = useDynamicArticleAuthor(authorId, defaultAuthor);
  const { navigateTo } = useApp();

  if (author.loading) {
    return (
      <div className="flex items-center gap-2 mb-2 animate-pulse">
        <div className="w-5 h-5 rounded-full bg-slate-800 shrink-0" />
        <div className="h-3 w-20 bg-slate-800 rounded" />
      </div>
    );
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        navigateTo('user-profile', { userId: author.id });
      }}
      className="flex items-center gap-2 mb-2 group/author cursor-pointer hover:text-[#FF2E7E] transition-colors"
      title={`Kunjungi profil ${author.displayName || author.name}`}
    >
      <img
        src={author.avatarURL || author.avatar || DEFAULT_AVATAR}
        alt={author.displayName || author.name}
        className="w-5 h-5 rounded-full object-cover border border-slate-700 group-hover/author:border-[#FF2E7E] transition-colors"
      />
      <span className="text-[11px] font-bold text-slate-300 group-hover/author:text-[#FF2E7E] transition-colors">
        {author.displayName || author.name}
      </span>
      {author.customBadge ? (
        <span className="bg-pink-500/20 text-[#FF2E7E] text-[9px] font-black px-1.5 py-0.2 rounded border border-pink-500/30 uppercase">
          {author.customBadge}
        </span>
      ) : (
        <span className="bg-pink-500/20 text-[#FF2E7E] text-[9px] font-black px-1.5 py-0.2 rounded">
          PENULIS
        </span>
      )}
      <span className="text-[10px] text-slate-400 font-normal">
        • {author.articleCount} artikel
      </span>
    </div>
  );
};

export const FilmDetailPage: React.FC = () => {
  const {
    selectedFilmId,
    films,
    articles,
    ratings,
    getRatingsForFilm,
    toggleWatchlist,
    isFilmInWatchlist,
    navigateTo,
    isLoggedIn,
    setLoginModalOpen,
    showToast,
    openShareModal,
    collections,
    isItemInAnyCollection,
    likedReviewIds,
    toggleLikeReview,
    syncLikedReviews,
    currentUser,
  } = useApp();

  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [isCastCrewModalOpen, setIsCastCrewModalOpen] = useState(false);
  const [selectedStill, setSelectedStill] = useState<string | null>(null);
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'critics' | 'community'>('all');
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);

  const { slug } = useParams<{ slug?: string }>();
  const film: FilmItem = (slug ? (films.find(f => (f.slug && f.slug === slug) || slugify(f.title) === slug || f.id === slug) || INITIAL_FILMS.find(f => (f.slug && f.slug === slug) || slugify(f.title) === slug || f.id === slug)) : null)
    || films.find(f => f.id === selectedFilmId)
    || INITIAL_FILMS.find(f => f.id === selectedFilmId)
    || films[0];

  // TMDB live cast & crew sync
  const [liveCredits, setLiveCredits] = useState<{ cast: CastMember[]; crew: CrewMember[] }>({
    cast: film?.castDetails || [],
    crew: film?.crewDetails || [],
  });
  const [isLoadingCredits, setIsLoadingCredits] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!film) return;

    // If film already has ample cast and crew data, synchronize immediate state
    if (film.castDetails && film.castDetails.length >= 6 && film.crewDetails && film.crewDetails.length >= 6) {
      setLiveCredits({
        cast: film.castDetails,
        crew: film.crewDetails,
      });
      return;
    }

    const loadCredits = async () => {
      setIsLoadingCredits(true);
      try {
        const mediaType = film.type === 'series' ? 'tv' : 'movie';
        const res = await fetchFullTmdbCredits(film.tmdbId || film.title, mediaType, film.title);
        if (isMounted) {
          setLiveCredits({
            cast: res.cast.length > 0 ? res.cast : (film.castDetails || []),
            crew: res.crew.length > 0 ? res.crew : (film.crewDetails || []),
          });
        }
      } catch (err) {
        console.warn('Could not fetch TMDB credits:', err);
      } finally {
        if (isMounted) setIsLoadingCredits(false);
      }
    };

    loadCredits();
    return () => {
      isMounted = false;
    };
  }, [film?.id, film?.tmdbId, film?.title]);

  if (films.length === 0) {
    return <FilmDetailSkeleton />;
  }

  if (!film) {
    return (
      <div className="min-h-[60vh] py-16 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto px-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
            <Clapperboard className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-display font-black text-white">Film Not Found</h2>
          <p className="text-slate-400 text-xs leading-relaxed">
            Data film atau tayangan yang Anda tuju tidak tersedia dalam katalog Sotoy Film.
          </p>
          <button
            onClick={() => navigateTo('film-database')}
            className="px-5 py-2.5 rounded-xl bg-white text-slate-950 text-xs font-bold hover:bg-slate-200 transition-colors"
          >
            Lihat Database Film
          </button>
        </div>
      </div>
    );
  }

  const [loadedFilmRatings, setLoadedFilmRatings] = useState<UserRating[]>(() =>
    ratings.filter(r => film && r.filmId === film.id)
  );

  useEffect(() => {
    if (!film?.id) return;
    let isMounted = true;
    getRatingsForFilm(film.id).then(res => {
      if (isMounted) {
        setLoadedFilmRatings(res);
      }
    }).catch(err => {
      console.warn('[FilmDetailPage] getRatingsForFilm error:', err);
    });
    return () => {
      isMounted = false;
    };
  }, [film?.id, getRatingsForFilm]);

  const filmReviews = useMemo(() => {
    const contextFiltered = ratings.filter(r => r.filmId === film.id);
    if (contextFiltered.length > loadedFilmRatings.length) {
      return contextFiltered;
    }
    return loadedFilmRatings.length > 0 ? loadedFilmRatings : contextFiltered;
  }, [ratings, loadedFilmRatings, film.id]);

  const criticsReviews = filmReviews.filter(r => r.userRole === 'si_paling_sotoy');
  const communityReviews = filmReviews.filter(r => r.userRole !== 'si_paling_sotoy');
  const displayedReviews =
    reviewFilter === 'critics'
      ? criticsReviews
      : reviewFilter === 'community'
      ? communityReviews
      : filmReviews;

  const reviewIdsKey = displayedReviews.map(r => r.id).join(',');

  useEffect(() => {
    if (displayedReviews.length > 0 && currentUser?.id) {
      const ids = displayedReviews.map(r => r.id);
      syncLikedReviews(ids);
    }
  }, [reviewIdsKey, currentUser?.id, syncLikedReviews]);

  const isInWatchlist = isItemInAnyCollection(film.id, 'film');

  // Cast with photos fallback
  const allCastList: CastMember[] = liveCredits.cast && liveCredits.cast.length > 0
    ? liveCredits.cast
    : film.castDetails && film.castDetails.length > 0
    ? film.castDetails
    : film.cast.map((actorName, idx) => {
        const samplePhotos = [
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
          'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
        ];
        const sampleCharacters: Record<string, string[]> = {
          'Dune: Part Two': ['Paul Atreides', 'Chani', 'Lady Jessica', 'Stilgar', 'Feyd-Rautha Harkonnen'],
          'Oppenheimer': ['J. Robert Oppenheimer', 'Katherine Oppenheimer', 'Leslie Groves', 'Lewis Strauss', 'Jean Tatlock'],
          'Shōgun': ['Lord Yoshii Toranaga', 'John Blackthorne', 'Toda Mariko', 'Kashigi Yabushige'],
        };
        const characters = sampleCharacters[film.title] || ['Pemeran Utama', 'Karakter Penting', 'Pemeran Pendukung', 'Karakter Kunci'];

        return {
          name: actorName,
          character: characters[idx % characters.length] || 'Karakter Utama',
          photo: samplePhotos[idx % samplePhotos.length],
        };
      });

  // Crew with fallback
  const allCrewList: CrewMember[] = liveCredits.crew && liveCredits.crew.length > 0
    ? liveCredits.crew
    : film.crewDetails && film.crewDetails.length > 0
    ? film.crewDetails
    : [
        { name: film.director || 'Sutradara', job: 'Director', department: 'Directing', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80' },
        ...(film.writer ? [{ name: film.writer, job: 'Screenplay / Writer', department: 'Writing', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80' }] : []),
        ...(film.studio ? [{ name: film.studio, job: 'Production Studio', department: 'Production', photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80' }] : []),
      ];

  // Subset preview lists (show top 4 on mobile, up to 8 on desktop)
  const previewCastList = allCastList.slice(0, 8);
  const previewCrewList = allCrewList.slice(0, 8);

  // Stills gallery
  const stillsList = film.stills && film.stills.length > 0
    ? film.stills
    : [
        film.backdrop || 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1000&q=80',
      ];

  // Articles from Penulis Sotoy discussing this film
  const relatedArticles = articles.filter(a =>
    a.relatedFilmId === film.id ||
    a.title.toLowerCase().includes(film.title.toLowerCase()) ||
    a.tags.some(t => t.toLowerCase() === film.title.toLowerCase()) ||
    (film.id === 'film-1' && a.tags.includes('Sci-Fi')) ||
    (film.id === 'film-2' && a.tags.includes('Cinematography'))
  );

  const handleShare = () => {
    openShareModal({
      title: `${film.title} (${film.year}) - Skor Sotoy: ${film.skorSotoy.toFixed(1)}/10.0`,
      text: film.synopsis,
      headline: `Film Rating & Skor Sotoy Komunitas: ${film.skorSotoy.toFixed(1)} / 10.0`,
      url: window.location.href,
      type: 'film',
      image: film.poster,
      filmTitle: film.title,
      filmYear: film.year,
      filmPoster: film.poster,
      filmBackdrop: film.backdrop,
      filmGenres: film.genres,
      rating: film.skorSotoy,
      reviewerName: 'Komunitas Sotoy Film',
      reviewerRole: `${film.totalVotes.toLocaleString()} Votes Penonton`,
      meta: `${film.title} (${film.year}) • ${film.genres.slice(0, 2).join(', ')}`,
    });
  };

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  // Helper to convert watch/short YouTube URLs to embed format so they can play in iframes
  const getEmbedUrl = (url: string | undefined): string => {
    if (!url) return '';
    // If it's already an embed URL, return as-is
    if (url.includes('youtube.com/embed/')) {
      return url;
    }
    // If it's a standard watch URL: https://www.youtube.com/watch?v=ID
    if (url.includes('youtube.com/watch?v=')) {
      const parts = url.split('v=');
      if (parts.length > 1) {
        const id = parts[1].split('&')[0];
        return `https://www.youtube.com/embed/${id}?autoplay=1`;
      }
    }
    // If it's a short URL: https://youtu.be/ID
    if (url.includes('youtu.be/')) {
      const parts = url.split('youtu.be/');
      if (parts.length > 1) {
        const id = parts[1].split('?')[0].split('&')[0];
        return `https://www.youtube.com/embed/${id}?autoplay=1`;
      }
    }
    return url;
  };

  // Trailer URL (YouTube embed or Fallback)
  const trailerEmbed = getEmbedUrl(film.trailerUrl) || (
    film.id === 'film-1'
      ? 'https://www.youtube.com/embed/Way9Dexny3w?autoplay=1'
      : film.id === 'film-2'
      ? 'https://www.youtube.com/embed/uYPbbksJxIg?autoplay=1'
      : 'https://www.youtube.com/embed/yNNf28kM8L0?autoplay=1'
  );

  // Prepare SEO Metadata & Structured Schemas
  const filmSlug = film.slug || slugify(film.title) || film.id;
  const seoUrl = `https://www.sotoyfilm.my.id/film/${filmSlug}`;
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', item: 'https://www.sotoyfilm.my.id' },
    { name: 'Film Database', item: 'https://www.sotoyfilm.my.id/film-database' },
    { name: film.title, item: seoUrl },
  ]);

  const movieSchema = createMovieSchemaFromFilm(film, {
    reviews: filmReviews.slice(0, 5).map(r => ({
      userName: r.userName,
      reviewText: r.reviewText,
      score: r.score,
      createdAt: r.createdAt,
    })),
    currentUrl: seoUrl,
  });

  return (
    <div className="min-h-screen py-6 sm:py-8">
      <SEOHead
        title={`${film.title} (${film.year}) - Skor & Review`}
        description={film.synopsis.slice(0, 160) + (film.synopsis.length > 160 ? '...' : '')}
        image={film.backdrop || film.poster}
        url={seoUrl}
        type="video.movie"
        film={film}
        keywords={[film.title, film.director, 'skor sotoy', 'ulasan film', ...(film.genres || [])]}
        schema={[breadcrumbSchema, movieSchema]}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Breadcrumb Navigation */}
        <BreadcrumbNavigation
          currentTitle={film.title}
          customLabels={{ film: film.type === 'series' ? 'Series' : 'Film' }}
        />

        {/* ========================================================================= */}
        {/* TOP BAR: NAVIGATION & ACTIONS */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between gap-3">
          <button
            id="back-to-database-btn"
            onClick={() => navigateTo('film-database')}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors px-3 sm:px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Kembali ke Film Database</span>
            <span className="sm:hidden">Database Film</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              id="detail-share-btn"
              onClick={handleShare}
              className="px-3 sm:px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold flex items-center gap-2 border border-slate-800 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5 text-[#FF2E7E]" />
              <span>Bagikan</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* HERO SECTION: BACKDROP + FLOATING POSTER + HEADLINE METRICS */}
        {/* ========================================================================= */}
        <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-[#171A1F]">
          {/* Backdrop Banner with Vignette */}
          <div className="h-52 sm:h-80 md:h-96 w-full relative">
            <img
              src={film.backdrop || film.poster || DEFAULT_COVER}
              alt={film.title}
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#171A1F] via-[#171A1F]/65 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#171A1F]/80 via-transparent to-transparent" />
            
            {/* Quick Play Trailer on Backdrop */}
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                id="hero-play-trailer-btn"
                onClick={() => {
                  setIsPlayingTrailer(true);
                  scrollToSection('section-trailer');
                }}
                className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-[#FF2E7E]/90 hover:bg-[#FF2E7E] text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all group backdrop-blur-sm"
                title="Tonton Trailer Resmi"
              >
                <Play className="w-6 h-6 sm:w-8 sm:h-8 fill-current ml-1 group-hover:text-white" />
              </button>
            </div>
          </div>

          {/* Floating Details Header */}
          <div className="p-4 sm:p-8 -mt-20 sm:-mt-32 md:-mt-40 relative z-10 flex flex-col md:flex-row gap-5 sm:gap-6 items-center md:items-start">
            {/* High-res Vertical Poster with Badge */}
            <div className="relative shrink-0 group mx-auto md:mx-0">
              <img
                src={film.poster || DEFAULT_POSTER}
                alt={film.title}
                className="w-32 sm:w-52 md:w-60 rounded-2xl shadow-2xl border-2 border-white/20 group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-2.5 left-2.5 bg-black/85 backdrop-blur-md px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl border border-[#FF2E7E]/60 text-[#FF2E7E] font-medium text-xs sm:text-sm flex items-center gap-1 shadow-lg">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{film.skorSotoy.toFixed(1)}</span>
              </div>
            </div>

            {/* Title & Metadata */}
            <div className="flex-1 min-w-0 space-y-3.5 sm:space-y-4 text-center md:text-left w-full">
              {/* Badges */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center md:justify-start">
                <span className="bg-[#FF2E7E] text-white font-black text-[10px] sm:text-xs uppercase px-2.5 sm:px-3 py-1 rounded-full">
                  {film.type}
                </span>
                <span className="bg-slate-800 text-slate-300 font-bold text-[10px] sm:text-xs px-2.5 py-1 rounded-full border border-slate-700">
                  {film.year}
                </span>
                {film.duration && (
                  <span className="text-slate-300 text-[10px] sm:text-xs flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
                    <Clock className="w-3 h-3 text-[#FF2E7E]" />
                    {film.duration}
                  </span>
                )}
                {film.genres.map(g => (
                  <span
                    key={g}
                    className="bg-slate-900 text-slate-300 text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-full border border-slate-800"
                  >
                    {g}
                  </span>
                ))}
              </div>

              {/* Film Title & Sotoy Certified Badge */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                <h1 className="font-display font-black text-2xl sm:text-4xl lg:text-5xl text-white tracking-tight leading-tight">
                  {film.title}
                </h1>

                {/* Sotoy Certified Golden Badge with Pulse & Tooltip */}
                <div className="relative inline-flex items-center group/cert z-20">
                  <div
                    id="sotoy-certified-badge"
                    className="relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#FF2E7E]/20 via-[#e0266e]/15 to-[#FF2E7E]/20 border border-[#FF2E7E]/60 text-[#FF2E7E] text-[10px] sm:text-xs font-bold tracking-wide shadow-[0_0_18px_rgba(255,208,0,0.25)] backdrop-blur-sm shrink-0 transition-all duration-300 hover:scale-105 hover:border-[#FF2E7E] hover:shadow-[0_0_24px_rgba(255,208,0,0.4)] cursor-pointer select-none"
                  >
                    {/* Subtle pulsing indicator */}
                    <span className="relative flex h-2 w-2 mr-0.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF2E7E] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF2E7E]" />
                    </span>

                    <Award className="w-3.5 h-3.5 text-[#FF2E7E] fill-[#FF2E7E]/20 shrink-0" />
                    <span>Sotoy Certified</span>
                  </div>

                  {/* Tooltip with smooth transition on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-950/95 border border-[#FF2E7E]/50 rounded-xl shadow-2xl shadow-black/90 text-[#FF2E7E] text-[11px] font-bold pointer-events-none opacity-0 scale-90 translate-y-1 group-hover/cert:opacity-100 group-hover/cert:scale-100 group-hover/cert:translate-y-0 transition-all duration-200 ease-out z-50 whitespace-nowrap flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#FF2E7E]" />
                    <span>Verified Sotoy Review</span>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-950 border-b border-r border-[#FF2E7E]/50 rotate-45" />
                  </div>
                </div>

                {film.originalTitle && film.originalTitle !== film.title && (
                  <p className="w-full text-slate-400 text-xs sm:text-sm italic mt-0.5">{film.originalTitle}</p>
                )}
              </div>

              {/* Skor Sotoy Bar - Prioritize Critics Score */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 bg-slate-900/95 p-3.5 sm:p-4 rounded-2xl border border-slate-800 max-w-2xl shadow-xl">
                <div className="flex items-center justify-between sm:justify-start gap-4 sm:gap-6">
                  {/* 1. Skor Critics - Emas */}
                  <div className="flex items-center gap-2.5">
                    <div className="font-display font-medium text-2xl sm:text-3xl text-[#FF2E7E] drop-shadow-[0_0_12px_rgba(255,208,0,0.3)]">
                      ★ {film.criticsSkorSotoy ? film.criticsSkorSotoy.toFixed(1) : film.skorSotoy.toFixed(1)}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] sm:text-xs font-black text-white uppercase tracking-wider">
                          Skor Critics
                        </span>
                        <span className="bg-[#FF2E7E]/20 text-[#FF2E7E] border border-[#FF2E7E]/40 text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full">
                          Utama
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Dewan Kritikus Sotoy
                      </div>
                    </div>
                  </div>

                  <div className="h-8 w-px bg-slate-800 block" />

                  {/* 2. Skor Komunitas - Biru / Cyan, Besarnya Sama */}
                  <div className="flex items-center gap-2.5">
                    <div className="font-display font-medium text-2xl sm:text-3xl text-[#FF2E7E] drop-shadow-[0_0_12px_rgba(0,240,255,0.3)]">
                      ★ {film.skorSotoy.toFixed(1)}
                    </div>
                    <div className="text-left">
                      <div className="text-[10px] sm:text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                        Komunitas
                      </div>
                      <div className="text-[9px] text-slate-400">
                        {film.totalVotes.toLocaleString()} votes
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                  <button
                    id="hero-share-film-rating-btn"
                    onClick={handleShare}
                    className="flex-1 sm:flex-initial justify-center px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-[#FF2E7E] transition-all flex items-center gap-1.5 text-xs font-bold"
                    title="Bagikan Skor Film ke Instagram Story & Feed"
                  >
                    <Share2 className="w-3.5 h-3.5 text-[#FF2E7E]" />
                    <span>Bagikan Skor</span>
                  </button>

                  <button
                    id="detail-rate-film-modal-btn"
                    onClick={() => {
                      if (!isLoggedIn) {
                        setLoginModalOpen(true);
                      } else {
                        setRatingModalOpen(true);
                      }
                    }}
                    className="flex-1 sm:flex-initial bg-gradient-to-r from-[#FF2E7E] to-[#e0266e] text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-[#FF2E7E]/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Star className="w-4 h-4 fill-current" />
                    <span>Beri Skor</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-1">
                <CollectionPickerPopover
                  itemId={film.id}
                  itemType="film"
                  itemName={film.title}
                  buttonId="detail-toggle-watchlist-btn"
                />

                <button
                  onClick={() => {
                    setIsPlayingTrailer(true);
                    scrollToSection('section-trailer');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 border border-slate-700 transition-colors"
                >
                  <Play className="w-3.5 h-3.5 text-[#FF2E7E] fill-current" />
                  <span>Tonton Trailer</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* QUICK JUMP SUB-BAR (EASY ANCHOR SCROLL) */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-bold text-slate-400">
          <span className="text-slate-500 uppercase text-[10px] tracking-wider shrink-0 mr-1">Lompat ke:</span>
          <button
            onClick={() => scrollToSection('section-synopsis')}
            className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-[#FF2E7E] hover:text-white transition-colors shrink-0"
          >
            Sinopsis & Trailer
          </button>
          <button
            onClick={() => scrollToSection('section-cast')}
            className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-[#FF2E7E] hover:text-white transition-colors shrink-0"
          >
            Pemeran & Kru ({allCastList.length + allCrewList.length})
          </button>
          <button
            onClick={() => scrollToSection('section-articles')}
            className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-[#FF2E7E] hover:text-white transition-colors shrink-0"
          >
            Artikel & Ulasan ({relatedArticles.length})
          </button>
          <button
            onClick={() => scrollToSection('section-reviews')}
            className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-[#FF2E7E] hover:text-white transition-colors shrink-0"
          >
            Ulasan Komunitas ({filmReviews.length})
          </button>
        </div>

        {/* Global Page Ad Banner */}
        <AdBannerSlot variant="leaderboard" />

        {/* ========================================================================= */}
        {/* MASTER 2-COLUMN LAYOUT: MAIN CONTENT (LEFT) & SIDEBAR (RIGHT) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ----------------------------------------------------------------------- */}
          {/* MAIN COLUMN (8 COLS): SINOPSIS -> TRAILER -> CAST -> STILLS -> ARTICLES -> REVIEWS */}
          {/* ----------------------------------------------------------------------- */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* 1. SINOPSIS RESMI & CATATAN KURATOR */}
            <div
              id="section-synopsis"
              className="bg-[#171A1F] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h2 className="font-display font-black text-xl sm:text-2xl text-white flex items-center gap-2.5">
                  <Film className="w-5 h-5 text-[#FF2E7E]" />
                  <span>Official Synopsis</span>
                </h2>
                <span className="text-[11px] font-bold text-slate-400 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
                  {film.genres.join(' • ')}
                </span>
              </div>

              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                {film.synopsis}
              </p>

              {film.curatorNote && (
                <div className="bg-[#FF2E7E]/10 border border-[#FF2E7E]/30 rounded-2xl p-4 sm:p-5 mt-4">
                  <div className="flex items-center gap-2 text-[11px] font-black uppercase text-[#FF2E7E] tracking-wider mb-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Catatan Kurator Sotoy Film:</span>
                  </div>
                  <p className="text-slate-200 text-xs sm:text-sm italic leading-relaxed">
                    "{film.curatorNote}"
                  </p>
                </div>
              )}
            </div>

            {/* 2. OFFICIAL TRAILER PREVIEW (TEPAT DI BAWAH SINOPSIS) */}
            <div
              id="section-trailer"
              className="bg-[#171A1F] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h2 className="font-display font-black text-xl sm:text-2xl text-white flex items-center gap-2.5">
                    <Video className="w-5 h-5 text-[#FF2E7E]" />
                    <span>Official Trailer Preview</span>
                  </h2>
                  <p className="text-slate-400 text-xs mt-1">
                    Tonton cuplikan dan trailer resmi {film.title}
                  </p>
                </div>

                <span className="bg-[#FF2E7E]/20 text-[#FF2E7E] border border-[#FF2E7E]/40 text-xs font-black uppercase px-3 py-1 rounded-full shrink-0">
                  HD Trailer
                </span>
              </div>

              {/* Video Container 16:9 */}
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl">
                {isPlayingTrailer && trailerEmbed?.trim() ? (
                  <iframe
                    src={trailerEmbed}
                    title={`Trailer ${film.title}`}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div
                    onClick={() => setIsPlayingTrailer(true)}
                    className="w-full h-full relative cursor-pointer group"
                  >
                    <img
                      src={film.backdrop || film.poster || DEFAULT_COVER}
                      alt={film.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-70"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#FF2E7E] text-white flex items-center justify-center shadow-2xl shadow-[#FF2E7E]/40 group-hover:scale-110 active:scale-95 transition-all">
                        <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-current ml-1" />
                      </div>
                      <span className="font-display font-black text-xs sm:text-sm uppercase tracking-wider text-white bg-black/60 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur">
                        Klik untuk Memutar Trailer
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. DAFTAR PEMERAN & TIM PRODUKSI (CAST & CREW) */}
            <div
              id="section-cast"
              className="bg-[#171A1F] border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-xl space-y-7"
            >
              {/* Section Header with Quick Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] sm:text-xs font-black uppercase text-[#FF2E7E] tracking-wider bg-[#FF2E7E]/10 px-2 py-0.5 rounded-full border border-[#FF2E7E]/30">
                      Kredit Sinematik
                    </span>
                    {isLoadingCredits && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 animate-pulse">
                        <Sparkles className="w-3 h-3 text-[#FF2E7E]" />
                        Sinkronisasi TMDB...
                      </span>
                    )}
                  </div>
                  <h2 className="font-display font-black text-xl sm:text-2xl text-white flex items-center gap-2.5">
                    <Users className="w-5 h-5 text-[#FF2E7E]" />
                    <span>Cast & Production Crew</span>
                  </h2>
                  <p className="text-slate-400 text-xs mt-1">
                    Jajaran aktor, aktris, sutradara, dan tim kreatif di balik layar film {film.title}
                  </p>
                </div>

                <button
                  id="open-full-cast-crew-modal-header-btn"
                  onClick={() => setIsCastCrewModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 hover:from-[#FF2E7E]/20 hover:to-[#e0266e]/20 border border-slate-700 hover:border-[#FF2E7E]/60 text-slate-200 hover:text-[#FF2E7E] text-xs font-bold transition-all shadow-md group shrink-0"
                >
                  <Users className="w-4 h-4 text-[#FF2E7E] group-hover:scale-110 transition-transform" />
                  <span>Lihat Cast & Crew Lengkap</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#FF2E7E] group-hover:translate-x-0.5 transition-all" />
                </button>
              </div>

              {/* A. Sub-section: Pemeran & Karakter (Cast) */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-black text-sm sm:text-base text-white flex items-center gap-2">
                    <Film className="w-4 h-4 text-[#FF2E7E]" />
                    <span>Pemeran & Karakter Utama</span>
                  </h3>
                  <span className="text-[11px] font-bold text-[#FF2E7E] bg-[#FF2E7E]/10 border border-[#FF2E7E]/30 px-2.5 py-0.5 rounded-full">
                    {allCastList.length} Pemeran
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 sm:gap-4">
                  {previewCastList.map((actor, idx) => (
                    <div
                      key={`preview-cast-${idx}`}
                      id={`cast-card-${idx}`}
                      className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden hover:border-[#FF2E7E] hover:shadow-[0_0_15px_rgba(0,240,255,0.12)] hover:scale-[1.015] transition-all duration-300 flex flex-col group shadow-md"
                    >
                      <div className="aspect-[3/4] w-full overflow-hidden bg-slate-950 relative">
                        <PersonAvatar photo={actor.photo} name={actor.name} />
                      </div>
                      <div className="p-3">
                        <h4 className="font-bold text-xs sm:text-sm text-white group-hover:text-[#FF2E7E] transition-colors truncate">
                          {actor.name}
                        </h4>
                        <p className="text-[11px] text-[#FF2E7E] font-semibold truncate mt-0.5">
                          {actor.character ? `sebagai ${actor.character}` : 'Pemeran Utama'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* B. Sub-section: Tim Produksi & Kru (Crew) */}
              <div className="space-y-3.5 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-black text-sm sm:text-base text-white flex items-center gap-2">
                    <Clapperboard className="w-4 h-4 text-[#FF2E7E]" />
                    <span>Tim Produksi & Kru Kunci</span>
                  </h3>
                  <span className="text-[11px] font-bold text-[#FF2E7E] bg-[#FF2E7E]/10 border border-[#FF2E7E]/30 px-2.5 py-0.5 rounded-full">
                    {allCrewList.length} Tim Kru
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 sm:gap-4">
                  {previewCrewList.map((crew, idx) => (
                    <div
                      key={`preview-crew-${idx}`}
                      id={`crew-card-${idx}`}
                      className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden hover:border-[#FF2E7E] hover:shadow-[0_0_15px_rgba(255,208,0,0.12)] hover:scale-[1.015] transition-all duration-300 flex flex-col group shadow-md"
                    >
                      <div className="aspect-[3/4] w-full overflow-hidden bg-slate-950 relative">
                        <PersonAvatar photo={crew.photo} name={crew.name} />
                        {crew.department && (
                          <span className="absolute top-2 right-2 bg-black/75 border border-white/10 text-[9px] font-bold text-slate-300 px-1.5 py-0.5 rounded backdrop-blur">
                            {crew.department}
                          </span>
                        )}
                      </div>
                      <div className="p-3">
                        <h4 className="font-bold text-xs sm:text-sm text-white group-hover:text-[#FF2E7E] transition-colors truncate">
                          {crew.name}
                        </h4>
                        <p className="text-[11px] text-[#FF2E7E] font-semibold truncate mt-0.5">
                          {crew.job}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Expand CTA Button */}
              <div className="pt-2 text-center">
                <button
                  id="open-full-cast-crew-modal-bottom-btn"
                  onClick={() => setIsCastCrewModalOpen(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 hover:from-[#FF2E7E]/15 hover:via-[#e0266e]/20 hover:to-[#FF2E7E]/15 border border-slate-700 hover:border-[#FF2E7E]/60 text-slate-200 hover:text-[#FF2E7E] font-bold text-xs sm:text-sm transition-all shadow-lg hover:shadow-[#FF2E7E]/10 group"
                >
                  <Users className="w-4 h-4 text-[#FF2E7E]" />
                  <span>Lihat Cast & Crew Lengkap ({allCastList.length + allCrewList.length} Orang)</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#FF2E7E] group-hover:translate-x-1 transition-all" />
                </button>
              </div>
            </div>

            {/* 5. ARTIKEL & ULASAN PENULIS SOTOY */}
            <div
              id="section-articles"
              className="bg-[#171A1F] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h2 className="font-display font-black text-xl sm:text-2xl text-white flex items-center gap-2.5">
                    <Film className="w-5 h-5 text-[#FF2E7E]" />
                    <span>Editorial Articles & Cinematic Essays</span>
                  </h2>
                  <p className="text-slate-400 text-xs mt-1">
                    Kajian mendalam dan esai editorial khusus film {film.title}
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                  {relatedArticles.length} Artikel
                </span>
              </div>

              {relatedArticles.length === 0 ? (
                <div className="text-center py-10 bg-slate-900/50 rounded-2xl border border-slate-800">
                  <p className="text-slate-400 text-sm">Belum ada artikel ulasan dari Penulis Sotoy untuk film ini.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {relatedArticles.map(art => (
                    <div
                      key={art.id}
                      id={`film-article-${art.id}`}
                      onClick={() => navigateTo('article-detail', { articleId: art.id })}
                      className="bg-[#171A1F] border border-white/10 rounded-2xl overflow-hidden hover:border-[#FF2E7E] transition-all cursor-pointer group flex flex-col shadow-lg"
                    >
                      <div className="h-40 w-full overflow-hidden relative">
                        <img
                          src={art.coverImage || DEFAULT_COVER}
                          alt={art.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <span className="absolute top-2 left-2 bg-[#FF2E7E] text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded shadow">
                          {art.subCategory}
                        </span>
                      </div>

                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div>
                          {/* Author */}
                          <RelatedArticleAuthorBadge authorId={art.authorId} defaultAuthor={art.author} />

                          <h3 className="font-display font-bold text-sm text-white group-hover:text-[#FF2E7E] transition-colors line-clamp-2">
                            {art.title}
                          </h3>

                          <p className="text-slate-400 text-xs line-clamp-2 mt-1">
                            {art.excerpt}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1 text-[#FF2E7E]">
                            <Heart className="w-3 h-3 fill-current" />
                            {art.likes} likes
                          </span>
                          <span>{art.readTime}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 6. ULASAN & KOMENTAR PENONTON (REVIEWS) */}
            <div
              id="section-reviews"
              className="bg-[#171A1F] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h2 className="font-display font-black text-xl sm:text-2xl text-white flex items-center gap-2.5">
                    <Star className="w-5 h-5 text-[#FF2E7E] fill-current" />
                    <span>Reviews & Score Feed ({filmReviews.length})</span>
                  </h2>
                  <p className="text-slate-400 text-xs mt-1">
                    Opini dan penilaian jujur dari Dewan Kritikus Si Paling Sotoy & Komunitas Penonton
                  </p>
                </div>

                <button
                  id="tab-write-review-btn"
                  onClick={() => {
                    if (!isLoggedIn) {
                      setLoginModalOpen(true);
                    } else {
                      setRatingModalOpen(true);
                    }
                  }}
                  className="bg-gradient-to-r from-[#FF2E7E] to-[#e0266e] text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-[#FF2E7E]/20 active:scale-95 transition-all flex items-center gap-2 self-start sm:self-auto"
                >
                  <Star className="w-4 h-4 fill-current" />
                  <span>Beri Skor & Ulas Film Ini</span>
                </button>
              </div>

              {/* Review Filter Tabs (Kritikus vs Komunitas) */}
              <div
                className="flex items-center gap-2 overflow-x-auto pb-1.5 border-b border-slate-800/80 scrollbar-none scroll-smooth touch-pan-x"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                <button
                  id="review-filter-all"
                  onClick={() => setReviewFilter('all')}
                  className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 min-h-[44px] cursor-pointer active:scale-95 ${
                    reviewFilter === 'all'
                      ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/25 border border-[#FF2E7E]'
                      : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800'
                  }`}
                >
                  <span>Semua Ulasan</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    reviewFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {filmReviews.length}
                  </span>
                </button>

                <button
                  id="review-filter-critics"
                  onClick={() => setReviewFilter('critics')}
                  className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 min-h-[44px] cursor-pointer active:scale-95 ${
                    reviewFilter === 'critics'
                      ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/25 border border-[#FF2E7E]'
                      : 'bg-slate-900 text-slate-400 hover:text-[#FF2E7E] hover:bg-slate-800/80 border border-slate-800'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${reviewFilter === 'critics' ? 'fill-current text-white' : 'text-amber-400'}`} />
                  <span>Ulasan Kritikus (Si Paling Sotoy)</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    reviewFilter === 'critics' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {criticsReviews.length}
                  </span>
                </button>

                <button
                  id="review-filter-community"
                  onClick={() => setReviewFilter('community')}
                  className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 min-h-[44px] cursor-pointer active:scale-95 ${
                    reviewFilter === 'community'
                      ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/25 border border-[#FF2E7E]'
                      : 'bg-slate-900 text-slate-400 hover:text-[#FF2E7E] hover:bg-slate-800/80 border border-slate-800'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Komunitas Sotoy</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    reviewFilter === 'community' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {communityReviews.length}
                  </span>
                </button>
              </div>

              {displayedReviews.length === 0 ? (
                <div className="text-center py-10 bg-slate-900/50 rounded-2xl border border-slate-800">
                  <p className="text-slate-300 text-sm">
                    {reviewFilter === 'critics'
                      ? 'Belum ada ulasan dari Dewan Kritikus untuk film ini.'
                      : reviewFilter === 'community'
                      ? 'Belum ada ulasan dari penonton komunitas untuk film ini.'
                      : 'Belum ada ulasan untuk film ini. Jadilah yang pertama memberikan Skor Sotoy!'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {displayedReviews.map(rev => (
                    <div
                      key={rev.id}
                      className="bg-[#171A1F] border border-white/10 rounded-2xl p-5 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={rev.userAvatar || DEFAULT_AVATAR}
                            alt={rev.userName}
                            className="w-10 h-10 rounded-xl object-cover"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`font-bold text-sm text-white group-hover:${getRoleBadgeStyle(rev.userRole || 'warga_sotoy').text} transition-colors`}>{rev.userName}</span>
                              {rev.userRole && (
                                <RoleBadge role={rev.userRole} size="xs" />
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400" title={formatFullDateTime(rev.createdAt)}>{formatRelativeTime(rev.createdAt)}</span>
                          </div>
                        </div>

                        <div className="bg-black/60 border border-[#FF2E7E]/40 px-3 py-1 rounded-xl text-[#FF2E7E] font-black text-sm flex items-center gap-1">
                          <Star className="w-4 h-4 fill-current" />
                          <span>{rev.score.toFixed(1)}</span>
                          <span className="text-slate-500 text-xs">/ 10.0</span>
                        </div>
                      </div>

                      <h4 className="font-display font-black text-sm text-white">
                        "{rev.headline}"
                      </h4>

                      {Boolean(rev.reviewText && rev.reviewText.trim()) && (
                        <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                          {rev.reviewText}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2.5 border-t border-slate-800 text-xs text-slate-400 flex-wrap gap-2">
                        {(() => {
                          const isLiked = likedReviewIds?.includes(rev.id);
                          const isOwnReview = Boolean(currentUser?.id && rev.userId === currentUser.id);
                          return (
                            <button
                              type="button"
                              onClick={() => !isOwnReview && toggleLikeReview(rev.id)}
                              disabled={isOwnReview}
                              title={isOwnReview ? 'Ulasan milik kamu sendiri' : isLiked ? 'Batal suka ulasan' : 'Sukai ulasan ini'}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                                isLiked
                                  ? 'bg-[#FF2E7E]/20 text-[#FF2E7E] border border-[#FF2E7E]/40'
                                  : 'text-slate-400 hover:text-[#FF2E7E] hover:bg-slate-800/60 border border-transparent'
                              } ${isOwnReview ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
                            >
                              <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current text-[#FF2E7E]' : ''}`} />
                              <span>{(rev.likes || 0).toLocaleString('id-ID')} suka ulasan ini</span>
                            </button>
                          );
                        })()}

                        <button
                          id={`detail-share-review-${rev.id}-btn`}
                          onClick={() => {
                            openShareModal({
                              title: `Rating ${film.title} - ${rev.score.toFixed(1)}/10.0 oleh ${rev.userName}`,
                              text: rev.reviewText,
                              headline: rev.headline,
                              url: window.location.href,
                              type: 'film',
                              image: film.poster,
                              filmTitle: film.title,
                              filmYear: film.year,
                              filmPoster: film.poster,
                              filmBackdrop: film.backdrop,
                              filmGenres: film.genres,
                              rating: rev.score,
                              reviewerName: rev.userName,
                              reviewerAvatar: rev.userAvatar,
                              reviewerRole: rev.userRole ? getRoleBadgeStyle(rev.userRole).fullTitle : 'Warga Sotoy (Penonton Santai)',
                              meta: `${film.title} (${film.year}) • Skor: ${rev.score.toFixed(1)}/10.0`,
                            });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-[#FF2E7E]/20 text-slate-300 hover:text-white border border-slate-700 hover:border-[#FF2E7E]/50 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                          title="Bagikan Skor & Ulasan ini ke Instagram Story/Feed"
                        >
                          <Share2 className="w-3.5 h-3.5 text-[#FF2E7E]" />
                          <span>Bagikan Ulasan</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* SIDEBAR COLUMN (4 COLS, STICKY): WATCH PLATFORMS + SPECS + STATS + ADS */}
          {/* ----------------------------------------------------------------------- */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
            
            {/* 1. DIMANA MENONTON (WHERE TO WATCH) */}
            <div className="bg-[#171A1F] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="font-display font-black text-base text-white flex items-center gap-2">
                  <Tv className="w-4 h-4 text-[#FF2E7E]" />
                  <span>Platform Nonton Resmi</span>
                </h3>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded">
                  Legal & Resmi
                </span>
              </div>

              <div className="space-y-2.5">
                {film.whereToWatch.map((w, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: w.badgeColor }} />
                      <span className="font-bold">{w.platform}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                      {w.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. DETAIL & SPESIFIKASI TEKNIS FILM */}
            <div className="bg-[#171A1F] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="font-display font-black text-base text-white pb-3 border-b border-slate-800 flex items-center gap-2">
                <Info className="w-4 h-4 text-[#FF2E7E]" />
                <span>Spesifikasi & Informasi Film</span>
              </h3>

              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-slate-400 block font-bold text-[10px] uppercase tracking-wider">Sutradara:</span>
                  <span className="text-white font-bold text-sm mt-0.5 block">{film.director}</span>
                </div>

                <div>
                  <span className="text-slate-400 block font-bold text-[10px] uppercase tracking-wider">Genre Utama:</span>
                  <span className="text-white font-medium mt-0.5 block">{film.genres.join(', ')}</span>
                </div>

                <div>
                  <span className="text-slate-400 block font-bold text-[10px] uppercase tracking-wider">Tahun Rilis:</span>
                  <span className="text-white font-medium mt-0.5 block">{film.year}</span>
                </div>

                <div>
                  <span className="text-slate-400 block font-bold text-[10px] uppercase tracking-wider">Durasi Tayang:</span>
                  <span className="text-white font-medium mt-0.5 block">{film.duration || 'Standar Bioskop'}</span>
                </div>

                <div>
                  <span className="text-slate-400 block font-bold text-[10px] uppercase tracking-wider">Format & Aspek Rasio:</span>
                  <span className="text-white font-medium mt-0.5 block">IMAX 1.90:1 / Panavision 2.39:1</span>
                </div>

                <div>
                  <span className="text-slate-400 block font-bold text-[10px] uppercase tracking-wider">Format Tata Suara:</span>
                  <span className="text-white font-medium mt-0.5 block">Dolby Atmos, 12-Track Digital Audio</span>
                </div>

                <div>
                  <span className="text-slate-400 block font-bold text-[10px] uppercase tracking-wider">Klasifikasi Usia:</span>
                  <span className="text-emerald-400 font-bold mt-0.5 inline-block bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded text-[11px]">
                    13+ (Bimbingan Orang Tua)
                  </span>
                </div>
              </div>
            </div>

            {/* 3. METRIK REKOMENDASI SKOR SOTOY */}
            <div className="bg-[#171A1F] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="font-display font-black text-base text-white pb-3 border-b border-slate-800 flex items-center gap-2">
                <Award className="w-4 h-4 text-[#FF2E7E]" />
                <span>Rangkuman Skor Sotoy</span>
              </h3>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                  <div className="font-display font-medium text-xl text-[#FF2E7E]">
                    ★ {film.criticsSkorSotoy ? film.criticsSkorSotoy.toFixed(1) : film.skorSotoy.toFixed(1)}
                  </div>
                  <div className="text-[10px] font-bold text-[#FF2E7E] mt-1 uppercase">
                    Si Paling Sotoy
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                  <div className="font-display font-medium text-xl text-[#FF2E7E]">
                    ★ {film.skorSotoy.toFixed(1)}
                  </div>
                  <div className="text-[10px] font-bold text-[#FF2E7E] mt-1 uppercase">
                    Komunitas
                  </div>
                </div>
              </div>

              <div className="pt-1">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                  <span>Tingkat Kepuasan Penonton</span>
                  <span className="font-medium text-[#FF2E7E]">
                    {Math.round((film.skorSotoy / 10.0) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#FF2E7E] to-[#e0266e] h-full rounded-full"
                    style={{ width: `${Math.round((film.skorSotoy / 10.0) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Infeed Sidebar Ad */}
            <AdBannerSlot variant="sidebar" />
          </div>

        </div>

        {/* Modal enlarged Still Viewer */}
        {selectedStill?.trim() && (
          <div
            onClick={() => setSelectedStill(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="relative max-w-5xl w-full">
              <button
                onClick={() => setSelectedStill(null)}
                className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/40"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={selectedStill.trim()}
                alt="Enlarged Still"
                className="w-full rounded-2xl shadow-2xl border border-white/20 max-h-[80vh] object-contain mx-auto"
              />
            </div>
          </div>
        )}

        {/* Rate Film Modal */}
        <RateFilmModal
          film={film}
          isOpen={ratingModalOpen}
          onClose={() => setRatingModalOpen(false)}
        />

        {/* Full Cast & Crew Modal */}
        <FullCastCrewModal
          isOpen={isCastCrewModalOpen}
          onClose={() => setIsCastCrewModalOpen(false)}
          filmTitle={film.title}
          filmYear={film.year}
          filmPoster={film.poster}
          castList={allCastList}
          crewList={allCrewList}
          isLoading={isLoadingCredits}
        />

        {collectionModalOpen && (
          <AddToCollectionModal
            isOpen={collectionModalOpen}
            onClose={() => setCollectionModalOpen(false)}
            itemId={film.id}
            itemType="film"
            itemName={film.title}
          />
        )}
      </div>
    </div>
  );
};
