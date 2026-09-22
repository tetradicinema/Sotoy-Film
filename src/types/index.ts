// Types for Sotoy Film

export type UserRole = 'warga_sotoy' | 'si_paling_sotoy' | 'penulis_sotoy' | 'admin';

export interface User {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  role: UserRole;
  roleTitle: string;
  customBadge?: string; // e.g. "Verified Critic", "Top Writer", "Redaktur Khusus"
  roleBadge?: string;
  bio: string;
  email?: string;
  createdAt?: string;
  totalReviews: number;
  totalBuzz: number;
  followers?: string[]; // Array of user IDs
  following?: string[]; // Array of user IDs
  followersCount?: number;
  followingCount?: number;
  hasFinishedOnboarding?: boolean;
  watchlist?: string[]; // Saved film IDs
  savedArticles?: string[]; // Saved article IDs
  interestProfile?: InterestProfile;
  lastInterestDecay?: string;
  isSuspended?: boolean;
  suspendedAt?: string;
}

export interface ModerationReport {
  id: string;
  targetType: 'buzz' | 'reply' | 'review';
  targetId: string;
  targetContent: string;
  targetAuthorName: string;
  targetAuthorId: string;
  reporterId: string;
  reporterName: string;
  reason: string;
  createdAt: string;
  status: 'pending' | 'resolved' | 'dismissed';
}

export type UserTab = 'buzz' | 'reviews' | 'watchlist' | 'articles' | 'community' | 'activity' | 'settings' | 'admin' | 'writer';

export type SettingsSubPage =
  | 'profile'
  | 'activity'
  | 'my-content'
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
  authorId?: string;
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
  status?: 'published' | 'draft' | 'scheduled' | 'trash';
  scheduledAt?: string; // ISO date string e.g. "2026-09-25T14:30"
  seoTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  seoKeywords?: string;
  dailyViews?: Record<string, number>;
}

export interface CastMember {
  name: string;
  character: string;
  photo: string;
}

export interface FilmItem {
  id: string;
  slug?: string;
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
  tags?: string[];
  duration?: string; // e.g. "2h 46m" or "12 Episodes"
  skorSotoy: number; // Average 1.0 - 10.0
  totalVotes: number;
  criticsSkorSotoy: number; // Average 1.0 - 10.0
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
  score: number; // 1.0 - 10.0
  headline: string;
  reviewText: string;
  createdAt: string;
  likes: number;
  views?: number;
  commentsCount?: number;
  featured?: boolean;
}

export interface BuzzReply {
  id: string;
  buzzId: string;
  parentId?: string;
  replyToUser?: {
    id: string;
    name: string;
    handle: string;
  };
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

export type ReactionType = 'heart' | 'mindblown' | 'fire' | 'laugh' | 'clap';

export interface BuzzReactions {
  heart?: number;
  mindblown?: number;
  fire?: number;
  laugh?: number;
  clap?: number;
}

export type InterestProfile = Record<string, number>;

export interface RecommendationSignal {
  type: 'interest' | 'following' | 'trending';
  label: string;
  matchedTag?: string;
  score?: number;
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
    type?: 'movie' | 'series' | 'anime' | string;
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
  reactions?: BuzzReactions;
  reactionsByUser?: Record<string, ReactionType>;
  myReaction?: ReactionType | null;
  repliesCount: number;
  replies?: BuzzReply[];
  tags: string[];
  recommendationSignal?: RecommendationSignal;
  feedScore?: number;
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

export interface CriticSubmission {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  publicationName: string;
  publicationUrl: string;
  portfolioUrl: string;
  twitterHandle: string;
  motivation: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface UploadedFile {
  id: string;
  userId: string;
  url: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export type NotificationType = 'comment' | 'like' | 'mention' | 'reply' | 'editor_request' | 'follow' | 'reaction';

export interface NotificationSender {
  id: string;
  name: string;
  avatar: string;
  handle: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  targetView: string;
  targetId?: string;
  isRead: boolean;
  createdAt: string;
  sender: NotificationSender;
}

