import { User, UserRating } from '../types';

export const REVIEW_WEIGHT = 10;
export const LIKE_WEIGHT = 3;
export const RATING_ONLY_WEIGHT = 1;

export type LeaderboardPeriod = 'week' | 'month' | 'all';

export interface LeaderboardEntry {
  user: User;
  rank: number;
  ratings: number;
  reviews: number;
  likes: number;
  score: number;
  totalReviews: number; // alias for reviews
  helpfulVotes: number; // alias for likes
}

/**
 * WIB Time helper (Asia/Jakarta, UTC+7).
 * Returns starting UTC Date object for the current week's Monday 00:00:00 WIB.
 */
export function getWibStartOfWeek(): Date {
  const now = new Date();
  const wibOffsetMs = 7 * 3600 * 1000;
  const wibMs = now.getTime() + wibOffsetMs;
  const wibDate = new Date(wibMs);
  
  const day = wibDate.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diffToMonday = (day + 6) % 7;
  
  const mondayWibMs = wibMs - diffToMonday * 86400 * 1000;
  const mondayWib = new Date(mondayWibMs);
  mondayWib.setUTCHours(0, 0, 0, 0);
  
  return new Date(mondayWib.getTime() - wibOffsetMs);
}

/**
 * WIB Time helper (Asia/Jakarta, UTC+7).
 * Returns starting UTC Date object for the 1st of the current month 00:00:00 WIB.
 */
export function getWibStartOfMonth(): Date {
  const now = new Date();
  const wibOffsetMs = 7 * 3600 * 1000;
  const wibMs = now.getTime() + wibOffsetMs;
  const wibDate = new Date(wibMs);
  
  const firstWib = new Date(Date.UTC(wibDate.getUTCFullYear(), wibDate.getUTCMonth(), 1, 0, 0, 0, 0));
  return new Date(firstWib.getTime() - wibOffsetMs);
}

/**
 * Helper to compute user stats for a given period.
 */
function computeStatsForUser(
  user: User,
  userRatings: UserRating[],
  period: LeaderboardPeriod
): {
  ratings: number;
  reviews: number;
  likes: number;
  score: number;
  hasActivity: boolean;
} {
  const startOfWeek = getWibStartOfWeek().getTime();
  const startOfMonth = getWibStartOfMonth().getTime();

  const filteredRatings = userRatings.filter(r => {
    if (period === 'all') return true;
    if (!r.createdAt) return false; // missing/invalid createdAt counts only for 'all'
    const t = new Date(r.createdAt).getTime();
    if (isNaN(t)) return false;
    if (period === 'week') return t >= startOfWeek;
    if (period === 'month') return t >= startOfMonth;
    return true;
  });

  const ratingsCount = filteredRatings.length;
  const reviewsList = filteredRatings.filter(r => (r.reviewText || '').trim().length > 0);
  const reviewsCount = reviewsList.length;
  const ratingsWithoutReview = ratingsCount - reviewsCount;

  // Likes do not have individual timestamps in UserRating, so for period filtering
  // we count likes accumulated on reviews that were CREATED within the target period.
  const likesCount = reviewsList.reduce((sum, r) => sum + (r.likes || 0), 0);

  const score =
    reviewsCount * REVIEW_WEIGHT +
    likesCount * LIKE_WEIGHT +
    ratingsWithoutReview * RATING_ONLY_WEIGHT;

  return {
    ratings: ratingsCount,
    reviews: reviewsCount,
    likes: likesCount,
    score,
    hasActivity: ratingsCount > 0,
  };
}

/**
 * Computes individual user leaderboard score (for backward compatibility and single-user lookups).
 */
export const computeUserLeaderboardScore = (
  user: User,
  ratings: UserRating[] = []
): {
  score: number;
  totalReviews: number;
  helpfulVotes: number;
  ratings: number;
  reviews: number;
  likes: number;
} => {
  const userRatings = (ratings || []).filter(r => r.userId === user.id);
  const stats = computeStatsForUser(user, userRatings, 'all');
  return {
    score: stats.score,
    totalReviews: stats.reviews,
    helpfulVotes: stats.likes,
    ratings: stats.ratings,
    reviews: stats.reviews,
    likes: stats.likes,
  };
};

/**
 * Returns sorted leaderboard entries for a given role ('si_paling_sotoy' or 'warga_sotoy').
 */
export const getRoleLeaderboard = (
  role: 'si_paling_sotoy' | 'warga_sotoy',
  allUsers: User[] = [],
  ratings: UserRating[] = [],
  period: LeaderboardPeriod = 'all'
): LeaderboardEntry[] => {
  const filteredUsers = (allUsers || []).filter(u => u.role === role);

  const rawEntries: { user: User; ratings: number; reviews: number; likes: number; score: number }[] = [];

  for (const u of filteredUsers) {
    const userRatings = (ratings || []).filter(r => r.userId === u.id);
    const stats = computeStatsForUser(u, userRatings, period);

    // For week/month, exclude users with 0 ratings in that period
    if (period !== 'all' && !stats.hasActivity) {
      continue;
    }

    rawEntries.push({
      user: u,
      ratings: stats.ratings,
      reviews: stats.reviews,
      likes: stats.likes,
      score: stats.score,
    });
  }

  // Tie-breakers: score desc, reviews desc, likes desc, ratings desc, name A-Z
  rawEntries.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.reviews !== a.reviews) return b.reviews - a.reviews;
    if (b.likes !== a.likes) return b.likes - a.likes;
    if (b.ratings !== a.ratings) return b.ratings - a.ratings;
    return (a.user.name || '').localeCompare(b.user.name || '');
  });

  return rawEntries.map((entry, idx) => ({
    ...entry,
    rank: idx + 1,
    totalReviews: entry.reviews,
    helpfulVotes: entry.likes,
  }));
};

/**
 * Ranks critics ('si_paling_sotoy') and warga ('warga_sotoy') together in one list.
 */
export const getCombinedLeaderboard = (
  allUsers: User[] = [],
  ratings: UserRating[] = [],
  period: LeaderboardPeriod = 'all'
): LeaderboardEntry[] => {
  const targetUsers = (allUsers || []).filter(
    u => u.role === 'si_paling_sotoy' || u.role === 'warga_sotoy'
  );

  const rawEntries: { user: User; ratings: number; reviews: number; likes: number; score: number }[] = [];

  for (const u of targetUsers) {
    const userRatings = (ratings || []).filter(r => r.userId === u.id);
    const stats = computeStatsForUser(u, userRatings, period);

    if (period !== 'all' && !stats.hasActivity) {
      continue;
    }

    rawEntries.push({
      user: u,
      ratings: stats.ratings,
      reviews: stats.reviews,
      likes: stats.likes,
      score: stats.score,
    });
  }

  rawEntries.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.reviews !== a.reviews) return b.reviews - a.reviews;
    if (b.likes !== a.likes) return b.likes - a.likes;
    if (b.ratings !== a.ratings) return b.ratings - a.ratings;
    return (a.user.name || '').localeCompare(b.user.name || '');
  });

  return rawEntries.map((entry, idx) => ({
    ...entry,
    rank: idx + 1,
    totalReviews: entry.reviews,
    helpfulVotes: entry.likes,
  }));
};

/**
 * Returns rank information for a specific user within their role on 'all' period.
 */
export const getUserRankInRole = (
  user: User,
  allUsers: User[] = [],
  ratings: UserRating[] = []
): { rank: number; totalInRole: number; score: number; totalReviews: number; helpfulVotes: number } | null => {
  if (!user || (user.role !== 'si_paling_sotoy' && user.role !== 'warga_sotoy')) {
    return null;
  }

  const userList = allUsers.some(u => u.id === user.id)
    ? allUsers
    : [...allUsers, user];

  const board = getRoleLeaderboard(user.role, userList, ratings, 'all');
  const userEntry = board.find(e => e.user.id === user.id);
  if (!userEntry) {
    const fallbackStats = computeUserLeaderboardScore(user, ratings);
    return {
      rank: board.length + 1,
      totalInRole: board.length + 1,
      score: fallbackStats.score,
      totalReviews: fallbackStats.reviews,
      helpfulVotes: fallbackStats.likes,
    };
  }

  return {
    rank: userEntry.rank,
    totalInRole: board.length,
    score: userEntry.score,
    totalReviews: userEntry.reviews,
    helpfulVotes: userEntry.likes,
  };
};
