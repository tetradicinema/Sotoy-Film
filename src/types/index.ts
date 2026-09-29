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
  email?: string; // Transient / In-memory or joined from Auth / userPrivate for admins
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

export interface UserPrivate {
  email: string;
  updatedAt: string;
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

export type UserTab = 'buzz' | 'replies' | 'reposts' | 'reviews' | 'watchlist' | 'articles' | 'activity' | 'settings' | 'admin' | 'writer';

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

export interface CrewMember {
  name: string;
  job: string;
  department?: string;
  photo: string;
}

export interface FilmItem {
  id: string;
  slug?: string;
  tmdbId?: number;
  title: string;
  originalTitle?: string;
  type: 'movie' | 'series' | 'anime';
  year: number;
  releaseDate?: string; // ISO date string, e.g. "2024-07-12"
  poster: string;
  backdrop: string;
  synopsis: string;
  director: string;
  writer?: string;
  studio?: string;
  cast: string[];
  castDetails?: CastMember[];
  crewDetails?: CrewMember[];
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
  score?: number;
  likedByMe?: boolean;
  myVote?: 'up' | 'down' | null;
  upvotes?: string[];
  downvotes?: string[];
}

export type ReactionType = 'heart';

export interface BuzzReactions {
  heart?: number;
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
  score?: number;
  likedByMe?: boolean;
  myVote?: 'up' | 'down' | null;
  upvotes?: string[];
  downvotes?: string[];
  reactions?: BuzzReactions;
  reactionsByUser?: Record<string, ReactionType>;
  myReaction?: ReactionType | null;
  repliesCount: number;
  replies?: BuzzReply[];
  repostsCount?: number;
  repostedByUsers?: Record<string, string>; // map of userId -> ISO timestamp
  isRepost?: boolean;
  repostedBy?: {
    id: string;
    name: string;
    handle: string;
    avatar: string;
    role?: UserRole;
  };
  repostedAt?: string;
  feedKey?: string;
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

export interface AccountAppeal {
  id: string;
  userId: string;
  userName: string;
  userHandle?: string;
  userEmail?: string;
  userAvatar?: string;
  userRole?: UserRole;
  reason: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  resolvedAt?: string;
}

export type NotificationType = 'comment' | 'like' | 'mention' | 'reply' | 'editor_request' | 'follow' | 'reaction' | 'account_status' | 'repost';

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

export type AuditLogActionType = 
  | 'account_deleted'
  | 'bulk_accounts_deleted'
  | 'account_suspended'
  | 'account_unsuspended'
  | 'bulk_accounts_suspended'
  | 'bulk_accounts_unsuspended'
  | 'role_override'
  | 'bulk_roles_override'
  | 'appeal_approved'
  | 'appeal_rejected'
  | 'content_taken_down'
  | 'content_report_dismissed'
  | 'critic_approved'
  | 'critic_rejected'
  | 'custom_badge_override';

export interface AuditLog {
  id: string;
  action: AuditLogActionType;
  actorId: string;
  actorName: string;
  actorEmail?: string;
  actorRole: UserRole;
  actorAvatar?: string;
  targetId?: string;
  targetName?: string;
  targetEmail?: string;
  targetRole?: string;
  targetType?: 'user' | 'appeal' | 'report' | 'critic_submission' | 'content';
  details?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}


