import { User, UserRating } from '../types';

export interface LeaderboardEntry {
  user: User;
  rank: number;
  totalReviews: number;
  helpfulVotes: number;
  score: number;
}

/**
 * Computes individual user leaderboard score.
 * Formula: (totalReviews * 10) + helpfulVotes (sum of likes received on reviews)
 */
export const computeUserLeaderboardScore = (
  user: User,
  ratings: UserRating[] = []
): { score: number; totalReviews: number; helpfulVotes: number } => {
  const userRatings = (ratings || []).filter(r => r.userId === user.id);
  const helpfulVotes = userRatings.reduce((acc, r) => acc + (r.likes || 0), 0);
  const totalReviews = (user.totalReviews !== undefined && user.totalReviews > 0)
    ? user.totalReviews
    : userRatings.length;
  const score = totalReviews * 10 + helpfulVotes;
  return { score, totalReviews, helpfulVotes };
};

/**
 * Returns sorted leaderboard entries for a given role ('si_paling_sotoy' or 'warga_sotoy').
 */
export const getRoleLeaderboard = (
  role: 'si_paling_sotoy' | 'warga_sotoy',
  allUsers: User[] = [],
  ratings: UserRating[] = []
): LeaderboardEntry[] => {
  const filteredUsers = (allUsers || []).filter(u => u.role === role);

  const entries: { user: User; totalReviews: number; helpfulVotes: number; score: number }[] = filteredUsers.map(u => {
    const stats = computeUserLeaderboardScore(u, ratings);
    return {
      user: u,
      ...stats,
    };
  });

  entries.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.totalReviews !== a.totalReviews) return b.totalReviews - a.totalReviews;
    if (b.helpfulVotes !== a.helpfulVotes) return b.helpfulVotes - a.helpfulVotes;
    return (a.user.name || '').localeCompare(b.user.name || '');
  });

  return entries.map((entry, idx) => ({
    ...entry,
    rank: idx + 1,
  }));
};

/**
 * Returns rank information for a specific user within their role.
 * Returns null if user's role is not part of the leaderboard (e.g. admin or penulis_sotoy).
 */
export const getUserRankInRole = (
  user: User,
  allUsers: User[] = [],
  ratings: UserRating[] = []
): { rank: number; totalInRole: number; score: number; totalReviews: number; helpfulVotes: number } | null => {
  if (!user || (user.role !== 'si_paling_sotoy' && user.role !== 'warga_sotoy')) {
    return null;
  }

  // Ensure target user is included in calculation pool
  const userList = allUsers.some(u => u.id === user.id)
    ? allUsers
    : [...allUsers, user];

  const board = getRoleLeaderboard(user.role, userList, ratings);
  const userEntry = board.find(e => e.user.id === user.id);
  if (!userEntry) {
    const fallbackStats = computeUserLeaderboardScore(user, ratings);
    return {
      rank: board.length + 1,
      totalInRole: board.length + 1,
      ...fallbackStats,
    };
  }

  return {
    rank: userEntry.rank,
    totalInRole: board.length,
    score: userEntry.score,
    totalReviews: userEntry.totalReviews,
    helpfulVotes: userEntry.helpfulVotes,
  };
};
