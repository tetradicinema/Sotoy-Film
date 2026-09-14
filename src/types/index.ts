// Types for Sotoy Film

export type UserRole = 'warga_sotoy' | 'si_paling_sotoy' | 'penulis_sotoy' | 'admin';

export interface User {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  role: UserRole;
  roleTitle: string;
  bio: string;
  email?: string;
  totalReviews: number;
  totalBuzz: number;
  followers?: string[]; // Array of user IDs
  following?: string[]; // Array of user IDs
  followersCount?: number;
  followingCount?: number;
}

export type UserTab = 'watchlist' | 'reviews' | 'buzz' | 'articles' | 'activity' | 'community' | 'settings';

export type SettingsSubPage =
  | 'profile'
  | 'activity'
  | 'security'
  | 'privacy'
  | 'preferences'
  | 'notifications';

export interface UserSettings {
  favoriteGenres: string[];
  autoplayTrailer: boolean;
  notifyReviewLikes: boolean;
  notifyCuratorBuzz: boolean;
  notifyWatchlistRelease: boolean;
  cinemaQuality: '4K Ultra HD' | '1080p Full HD' | 'Auto Data Saver';
  language: 'en' | 'id';
  // Privacy & Security Settings
  isPrivateProfile: boolean;
  isWatchlistPublic: boolean;
  isReviewsPublic: boolean;
  allowTagging: 'everyone' | 'following' | 'none';
  twoFactorEnabled: boolean;
  emailNotifications: boolean;
  dataSharingConsent: boolean;
}

export type MainCategory = 'movies' | 'series' | 'anime' | 'cinema-gear' | 'film-studies';

export type SubCategory =
  // Movies & Series
  | 'news'
  | 'lists'
  | 'reviews'
  // Anime (news, lists)
  // Cinema Gear
  | 'gear-news'
  | 'gear-reviews'
  // Film Studies
  | 'producing'
  | 'directing'
  | 'cinematography'
  | 'lighting'
  | 'post-production';

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: MainCategory;
  subCategory: SubCategory;
  author: {
    id: string;
    name: string;
    avatar: string;
    role: UserRole;
  };
  publishedAt: string;
  readTime: string;
  skorSotoy?: number; // legacy/optional, but articles do not show rating stars
  featured?: boolean;
  heroSlider?: boolean;
  views: number;
  likes: number;
  commentsCount: number;
  tags: string[];
  relatedFilmId?: string; // Links directly to a film discussed in this article
}

export interface CastMember {
  name: string;
  character: string;
  photo: string;
}

export interface FilmItem {
  id: string;
  title: string;
  originalTitle?: string;
  type: 'movie' | 'series' | 'anime';
  year: number;
  poster: string;
  backdrop: string;
  synopsis: string;
  director: string;
  writer?: string;
  studio?: string;
  cast: string[];
  castDetails?: CastMember[];
  genres: string[];
  duration?: string; // e.g. "2h 46m" or "12 Episodes"
  skorSotoy: number; // Average 1.0 - 5.0
  totalVotes: number;
  criticsSkorSotoy: number;
  whereToWatch: {
    platform: string;
    type: 'stream' | 'cinema' | 'rent';
    badgeColor: string;
  }[];
  trailerUrl?: string;
  trailerTitle?: string;
  stills?: string[];
  relatedArticleIds?: string[];
  featuredRecommendation?: boolean;
  trendingRank?: number;
  isRecentRelease?: boolean;
  isPopularRelease?: boolean;
  isPopularThisWeek?: boolean;
  curatorNote?: string;
}

export interface UserRating {
  id: string;
  filmId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userRole: UserRole;
  score: number; // 0.5 - 5.0
  headline: string;
  reviewText: string;
  createdAt: string;
  likes: number;
}

export interface BuzzReply {
  id: string;
  buzzId: string;
  author: {
    id: string;
    name: string;
    handle: string;
    avatar: string;
    role: UserRole;
  };
  content: string;
  createdAt: string;
  likes: number;
  likedByMe?: boolean;
}

export interface BuzzPost {
  id: string;
  author: {
    id: string;
    name: string;
    handle: string;
    avatar: string;
    role: UserRole;
  };
  content: string;
  image?: string;
  taggedFilm?: {
    id: string;
    title: string;
    poster?: string;
    year?: number;
    skorSotoy?: number;
    genres?: string[];
  };
  taggedArticle?: {
    id: string;
    title: string;
    coverImage: string;
    category: string;
    authorName: string;
    readTime?: string;
  };
  skorSotoyMention?: number;
  createdAt: string;
  likes: number;
  likedByMe?: boolean;
  repliesCount: number;
  replies?: BuzzReply[];
  tags: string[];
}

export interface AdBanner {
  id: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaUrl: string;
  imageUrl: string;
  tag: string;
  sponsorName: string;
}
