import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare,
  Heart,
  Share2,
  Send,
  Sparkles,
  Film,
  Star,
  Hash,
  Smile,
  AlertCircle,
  Tag,
  Search,
  X,
  FileText,
  ExternalLink,
  ChevronRight,
  BookOpen,
  Calendar,
  UserPlus,
  Check,
  Bookmark,
  Menu,
  MoreHorizontal,
  Home,
  Users,
  Flame,
  UserCheck,
  Plus,
  User as UserIcon,
  Trash2,
  Image as ImageIcon,
  Loader2,
  Repeat2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getRoleBadgeStyle } from '../../utils/roleStyles';
import { RoleBadge } from '../Common/RoleBadge';
import { BuzzPost, User, RecommendationSignal } from '../../types';
import { AdBannerSlot } from '../Common/AdBannerSlot';
import { QuickReactionBar } from '../Common/QuickReactionBar';
import { BuzzFeedSidebar, BuzzFeedTab } from '../Navigation/BuzzFeedSidebar';
import { formatRelativeTime, formatFullDateTime } from '../../utils/formatRelativeTime';
import { MentionText } from '../Common/MentionText';
import { MentionInput } from '../Common/MentionInput';
import { isAllowedImageType, compressBuzzImage } from '../../utils/imageCompression';
import { BuzzImageAttachment } from '../Buzz/BuzzImageAttachment';
import { BuzzFeedSkeleton } from '../Skeletons';

// ==========================================
// FEED RANKING WEIGHT CONSTANTS
// Tunable weight constants for the personalized "For You" algorithm:
// - RECENCY: Weight for post freshness vs older high-engagement content
// - INTEREST_OVERLAP: Influence of tag/genre/category overlap with user interestProfile
// - AUTHOR_AFFINITY: Boost for posts from authors the user follows
// - ENGAGEMENT: Influence of total reactions and conversation replies
// ==========================================
export const FEED_RANKING_WEIGHTS = {
  RECENCY: 0.35,          // Weight for recency / freshness
  INTEREST_OVERLAP: 0.40, // Weight for user interest profile match
  AUTHOR_AFFINITY: 0.22,  // Rebalanced from 0.30: followed accounts / network affinity
  ENGAGEMENT: 0.23,       // Rebalanced from 0.15: reactions & replies volume
} as const;

// Helper to safely parse any post timestamp into epoch milliseconds
const getPostTimestampMs = (createdAt: string): number => {
  if (!createdAt) return 0;
  const parsed = new Date(createdAt).getTime();
  if (!isNaN(parsed)) return parsed;

  const lower = createdAt.toLowerCase().trim();
  const now = Date.now();
  if (lower.includes('baru saja') || lower.includes('just now') || lower.includes('detik')) {
    return now;
  }
  const minMatch = lower.match(/(\d+)\s*menit/);
  if (minMatch) return now - parseInt(minMatch[1], 10) * 60 * 1000;
  const hrMatch = lower.match(/(\d+)\s*jam/);
  if (hrMatch) return now - parseInt(hrMatch[1], 10) * 60 * 60 * 1000;
  const dayMatch = lower.match(/(\d+)\s*hari/);
  if (dayMatch) return now - parseInt(dayMatch[1], 10) * 24 * 60 * 60 * 1000;
  return now - 24 * 60 * 60 * 1000;
};

// Helper to calculate post age in hours
const getPostAgeInHours = (createdAt: string): number => {
  const timestamp = getPostTimestampMs(createdAt);
  const diffHours = (Date.now() - timestamp) / (1000 * 60 * 60);
  return Math.max(0.01, diffHours);
};

/**
 * Applies an author diversity / anti-clustering pass on a score-ranked list of posts.
 * Prevents any single author/reposter from appearing more than once within any window of 3
 * consecutive positions in the feed (i.e. not in the immediate last 2 positions of the output).
 * If the pool contains fewer than 3 distinct actors, it guarantees that no two consecutive
 * adjacent positions share the same actor (alternating pattern), preserving score hierarchy.
 */
function applyAuthorDiversity(
  scoreRankedList: BuzzPost[],
  windowSize = 3
): BuzzPost[] {
  if (scoreRankedList.length <= 2) return scoreRankedList;

  const remaining = [...scoreRankedList];
  const diversified: BuzzPost[] = [];
  const lookbackCount = Math.max(1, windowSize - 1); // For window of 3, inspect last 2 positions

  const getActorId = (post: BuzzPost) =>
    post.isRepost && post.repostedBy ? post.repostedBy.id : post.author.id;

  while (remaining.length > 0) {
    // 1. First priority: Find highest-scoring post whose author/reposter is not in the last (windowSize - 1) positions
    const recentActorIds = new Set(
      diversified.slice(-lookbackCount).map(getActorId)
    );
    let nextIndex = remaining.findIndex(post => !recentActorIds.has(getActorId(post)));

    // 2. Second priority: If no candidate exists from a 3rd distinct actor, prevent adjacent back-to-back clustering
    if (nextIndex === -1 && diversified.length > 0) {
      const immediatePreviousActorId = getActorId(diversified[diversified.length - 1]);
      nextIndex = remaining.findIndex(post => getActorId(post) !== immediatePreviousActorId);
    }

    // 3. Fallback: If all remaining candidates belong to the only remaining actor in the pool
    if (nextIndex === -1) {
      nextIndex = 0;
    }

    const [selectedPost] = remaining.splice(nextIndex, 1);
    diversified.push(selectedPost);
  }

  return diversified;
}

export const CommunityFeedPage: React.FC = () => {
  // =========================================================================
  // RANKING WEIGHT CONSTANTS (FOR-YOU FEED ALGORITHM)
  // Expose and balance how heavily the 'for-you' feed reacts to:
  // - WEIGHT_RECENCY: Freshness decay over time vs older posts
  // - WEIGHT_INTEREST_OVERLAP: User interestProfile match (tags, genres, categories)
  // - WEIGHT_AUTHOR_AFFINITY: Social connection boost for followed creators
  // - WEIGHT_ENGAGEMENT: Community reaction and reply activity
  // =========================================================================
  const WEIGHT_RECENCY = FEED_RANKING_WEIGHTS.RECENCY; // 0.35
  const WEIGHT_INTEREST_OVERLAP = FEED_RANKING_WEIGHTS.INTEREST_OVERLAP; // 0.40
  const WEIGHT_AUTHOR_AFFINITY = FEED_RANKING_WEIGHTS.AUTHOR_AFFINITY; // 0.22 (rebalanced from 0.30)
  const WEIGHT_ENGAGEMENT = FEED_RANKING_WEIGHTS.ENGAGEMENT; // 0.23 (rebalanced from 0.15)

  const {
    buzzList,
    isLoadingBuzz,
    films,
    articles,
    currentUser,
    isLoggedIn,
    setLoginModalOpen,
    addBuzzPost,
    likeBuzzPost,
    toggleRepostBuzzPost,
    deleteBuzzPost,
    navigateTo,
    showToast,
    openShareModal,
    toggleFollowUser,
    isFollowing,
    followingIds,
    allUsers,
    buzzFeedTab,
    setBuzzFeedTab,
    setIsComposeBuzzOpen,
    savedBuzzIds,
    toggleSaveBuzz,
    interestProfile,
  } = useApp();

  const [postContent, setPostContent] = useState('');
  const [selectedFilmId, setSelectedFilmId] = useState<string | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [skorMention, setSkorMention] = useState<number | undefined>(undefined);
  const [activeTagFilter, setActiveTagFilter] = useState<string>('all');

  // Photo Attachment state
  const [attachedImageDataUrl, setAttachedImageDataUrl] = useState<string | null>(null);
  const [attachedImagePreview, setAttachedImagePreview] = useState<string | null>(null);
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [tagMode, setTagMode] = useState<'film' | 'article'>('film');
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Overflow menu state for post cards
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);

  // Close overflow menu on outside click or escape
  useEffect(() => {
    if (!openMenuPostId) return;
    const handleOutsideMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.buzz-menu-container')) {
        setOpenMenuPostId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenuPostId(null);
    };
    document.addEventListener('mousedown', handleOutsideMenu);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenuPostId]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedFilm = films.find(f => f.id === selectedFilmId);
  const selectedArticle = articles.find(a => a.id === selectedArticleId);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image MIME type and file extension strictly
    if (!isAllowedImageType(file)) {
      showToast('Format file tidak didukung! Harap pilih gambar dengan format JPG, JPEG, PNG, WEBP, atau HEIC.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsCompressingImage(true);
    try {
      const compressedDataUrl = await compressBuzzImage(file);
      setAttachedImageDataUrl(compressedDataUrl);
      setAttachedImagePreview(compressedDataUrl);
      showToast('Foto berhasil disiapkan & dikompresi!');
    } catch (err) {
      console.error('[Image Compression Error]', err);
      showToast('Gagal memproses gambar. Kamu tetap dapat mengirim postingan tanpa foto.');
      setAttachedImageDataUrl(null);
      setAttachedImagePreview(null);
    } finally {
      setIsCompressingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    setAttachedImageDataUrl(null);
    setAttachedImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      setLoginModalOpen(true);
      showToast('Silakan Masuk (Log In) terlebih dahulu untuk memposting buzz!');
      return;
    }
    if (!postContent.trim() || isCompressingImage || isSubmittingPost) return;

    try {
      setIsSubmittingPost(true);
      await addBuzzPost(
        postContent,
        selectedFilmId || undefined,
        skorMention,
        selectedArticleId || undefined,
        attachedImageDataUrl || undefined
      );

      setPostContent('');
      setSelectedFilmId(null);
      setSelectedArticleId(null);
      setSkorMention(undefined);
      setAttachedImageDataUrl(null);
      setAttachedImagePreview(null);
      setDropdownOpen(false);
      setSearchQuery('');
      // Switch to main feed and reset tag filter so the new post is immediately in view
      setBuzzFeedTab('for-you');
      setActiveTagFilter('all');
    } finally {
      setIsSubmittingPost(false);
    }
  };

  const allTags = useMemo(() => {
    const set = new Set<string>();
    set.add('all');
    ['Dune2', 'Shogun', 'SiksaKubur', 'ReviewSotoy', 'Filmmaking', 'GearAddict'].forEach(t => set.add(t));
    buzzList.forEach(p => {
      p.tags?.forEach(t => {
        if (t) set.add(t.replace(/^#/, ''));
      });
      const matches = p.content.match(/#([a-zA-Z0-9_\u00C0-\u024F]+)/g);
      matches?.forEach(m => set.add(m.replace(/^#/, '')));
    });
    if (activeTagFilter !== 'all') {
      set.add(activeTagFilter.replace(/^#/, ''));
    }
    return Array.from(set);
  }, [buzzList, activeTagFilter]);

  const filteredBuzz = useMemo(() => {
    // 1. Synthesize repost entries for each (post, reposterId, repostTimestamp) combination
    const synthesizedPool: BuzzPost[] = [];

    buzzList.forEach(post => {
      // Original post entry
      synthesizedPool.push({
        ...post,
        isRepost: false,
        feedKey: post.id,
      });

      // Synthetic repost entries
      if (post.repostedByUsers) {
        Object.entries(post.repostedByUsers).forEach(([reposterId, repostTimestamp]) => {
          const reposterUser =
            allUsers.find(u => u.id === reposterId) ||
            (currentUser?.id === reposterId ? currentUser : null);

          synthesizedPool.push({
            ...post,
            isRepost: true,
            repostedBy: {
              id: reposterId,
              name: reposterUser?.name || 'Pengguna Sotoy',
              handle: reposterUser?.handle || '@user',
              avatar:
                reposterUser?.avatar ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
              role: reposterUser?.role,
            },
            repostedAt: repostTimestamp,
            feedKey: `${post.id}-repost-${reposterId}`,
          });
        });
      }
    });

    let list = synthesizedPool;

    // 2. Tag filtering (if active tag filter is chosen)
    if (activeTagFilter !== 'all') {
      const target = activeTagFilter.toLowerCase().replace(/^#/, '');
      list = list.filter(b => {
        const matchTag = b.tags?.some(t => t.toLowerCase().replace(/^#/, '') === target);
        const matchContent = b.content.toLowerCase().includes(`#${target}`);
        return matchTag || matchContent;
      });
    }

    // 3. Tab view filtering & scoring
    if (buzzFeedTab === 'following') {
      // "FOLLOWING" TAB: Include if author is followed OR reposter is followed
      return list
        .filter(item => {
          if (item.isRepost && item.repostedBy) {
            return followingIds.includes(item.repostedBy.id);
          }
          return followingIds.includes(item.author.id);
        })
        .sort((a, b) => {
          const aTime =
            a.isRepost && a.repostedAt
              ? getPostTimestampMs(a.repostedAt)
              : getPostTimestampMs(a.createdAt);
          const bTime =
            b.isRepost && b.repostedAt
              ? getPostTimestampMs(b.repostedAt)
              : getPostTimestampMs(b.createdAt);
          return bTime - aTime;
        });
    }

    if (buzzFeedTab === 'saved') {
      return buzzList.filter(b => savedBuzzIds.includes(b.id));
    }

    if (buzzFeedTab === 'liked') {
      return buzzList.filter(b => b.likedByMe || (b.myReaction !== undefined && b.myReaction !== null));
    }

    if (buzzFeedTab === 'trending') {
      return [...buzzList].sort((a, b) => {
        const aReactions = a.reactions ? Object.values(a.reactions).reduce((s, v) => s + (v || 0), 0) : (a.likes || 0);
        const bReactions = b.reactions ? Object.values(b.reactions).reduce((s, v) => s + (v || 0), 0) : (b.likes || 0);
        const aScore = aReactions + (a.repliesCount || 0) * 2;
        const bScore = bReactions + (b.repliesCount || 0) * 2;
        return bScore - aScore;
      });
    }

    // Default 'for-you' tab: Multi-signal personalized feed scoring across original posts and repost entries
    const scoredList = list
      .map(post => {
        // A. Recency Score (use repost timestamp if repost, otherwise original post timestamp)
        const effectiveTimestamp =
          post.isRepost && post.repostedAt ? post.repostedAt : post.createdAt;
        const ageHours = getPostAgeInHours(effectiveTimestamp);
        const recencyScore = 100 / (1 + Math.pow(ageHours / 20, 1.25));

        // B. Engagement Score (reactions + replies from original post)
        const totalReactions = post.reactions
          ? Object.values(post.reactions).reduce((sum, v) => sum + (v || 0), 0)
          : (post.likes || 0);
        const repliesCount = (post.replies && post.replies.length > 0)
          ? post.replies.length
          : (post.repliesCount || 0);
        const engagementScore = Math.min(60, (totalReactions * 2) + (repliesCount * 4));

        // C. Author Affinity Score with time decay (scale 0 to 35)
        // Score using the REPOSTER for repost entries, or the ORIGINAL AUTHOR for normal posts
        const actorId =
          post.isRepost && post.repostedBy ? post.repostedBy.id : post.author.id;
        const isFollowedActor = followingIds.includes(actorId);
        const isOwnActor = Boolean(currentUser?.id && actorId === currentUser.id);
        const affinityDecayFactor = 1 / (1 + Math.pow(ageHours / 24, 1.25));
        const rawAuthorAffinity = isFollowedActor ? 35 : (isOwnActor ? 20 : 0);
        const authorAffinityScore = rawAuthorAffinity * affinityDecayFactor;

        // D. Interest Match Score (overlap between post topics and user interest profile)
        const postTopics: string[] = [];
        (post.tags || []).forEach(t => {
          if (t) postTopics.push(t.toLowerCase().replace(/^#/, ''));
        });
        const contentHashtags = post.content.match(/#([a-zA-Z0-9_\u00C0-\u024F]+)/g);
        contentHashtags?.forEach(m => postTopics.push(m.toLowerCase().replace(/^#/, '')));

        if (post.taggedFilm?.genres) {
          post.taggedFilm.genres.forEach(g => postTopics.push(g.toLowerCase().trim()));
        }
        if (post.taggedFilm?.type) {
          postTopics.push(post.taggedFilm.type.toLowerCase().trim());
        }
        if (post.taggedArticle?.category) {
          postTopics.push(post.taggedArticle.category.toLowerCase().trim());
        }

        let matchedWeights = 0;
        let topMatchedTag: string | undefined = undefined;
        let topTagWeight = 0;

        const uniqueTopics = Array.from(new Set(postTopics.filter(t => t && t.length >= 2)));
        uniqueTopics.forEach(topic => {
          const userWeight = interestProfile[topic] || 0;
          if (userWeight > 0) {
            matchedWeights += Math.min(userWeight, 25);
            if (userWeight > topTagWeight) {
              topTagWeight = userWeight;
              topMatchedTag = topic;
            }
          }
        });

        const interestScore = Math.min(65, matchedWeights * 3);

        // E. Total Weighted Score using exposed weight constants
        const feedScore =
          (recencyScore * WEIGHT_RECENCY) +
          (interestScore * WEIGHT_INTEREST_OVERLAP) +
          (authorAffinityScore * WEIGHT_AUTHOR_AFFINITY) +
          (engagementScore * WEIGHT_ENGAGEMENT);

        // F. Generate explainable recommendation badge
        let recommendationSignal: RecommendationSignal | undefined = undefined;

        // Calculate affinity contribution relative to total feedScore
        const affinityContributionFraction = feedScore > 0
          ? (authorAffinityScore * WEIGHT_AUTHOR_AFFINITY) / feedScore
          : 0;
        // Only show 'following' badge when affinity is genuinely a dominant driver of this post's ranking
        const isAffinityDominant = isFollowedActor && affinityContributionFraction >= 0.28;

        if (interestScore >= 18 && topMatchedTag) {
          recommendationSignal = {
            type: 'interest',
            label: `Sesuai minat #${topMatchedTag}`,
            matchedTag: topMatchedTag,
            score: feedScore,
          };
        } else if (isAffinityDominant) {
          recommendationSignal = {
            type: 'following',
            label:
              post.isRepost && post.repostedBy
                ? `Direpost oleh ${post.repostedBy.name}`
                : 'Dari kreator yang kamu ikuti',
            score: feedScore,
          };
        } else if (engagementScore >= 35) {
          recommendationSignal = {
            type: 'trending',
            label: 'Sedang hangat dibicarakan',
            score: feedScore,
          };
        }

        return {
          ...post,
          feedScore,
          recommendationSignal,
        };
      })
      .sort((a, b) => (b.feedScore || 0) - (a.feedScore || 0));

    // Apply author/reposter diversity anti-clustering pass
    return applyAuthorDiversity(scoredList, 3);
  }, [buzzList, allUsers, buzzFeedTab, followingIds, savedBuzzIds, activeTagFilter, interestProfile, currentUser?.id]);

  const handleShareBuzz = (post: typeof buzzList[0]) => {
    const postFilm = post.taggedFilm ? films.find(f => f.id === post.taggedFilm?.id) || post.taggedFilm : null;
    const postArticle = post.taggedArticle ? articles.find(a => a.id === post.taggedArticle?.id) || post.taggedArticle : null;
    
    openShareModal({
      title: `Buzz Diskusi: ${post.author.name}`,
      url: window.location.href,
      text: post.content,
      tags: post.tags,
      type: 'buzz',
      image: post.author.avatar,
      imageUrl: post.author.avatar,
      authorAvatar: post.author.avatar,
      authorName: post.author.name,
      meta: postFilm ? `Membahas film ${postFilm.title}` : postArticle ? `Membahas artikel ${postArticle.title}` : `@${post.author.handle} di Sotoy Film`,
    });
  };

  // Filtered lists for dropdown search
  const filteredFilms = films.filter(f =>
    f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.director.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.genres.some(g => g.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredArticles = articles.filter(a =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.author.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white py-4 sm:py-6">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 flex justify-center items-start gap-4 xl:gap-8">
        
        {/* ========================================================================= */}
        {/* DESKTOP SOTOY BUZZ SIDEBAR */}
        {/* ========================================================================= */}
        <BuzzFeedSidebar
          activeTab={buzzFeedTab}
          onSelectTab={setBuzzFeedTab}
          savedCount={savedBuzzIds.length}
          followingCount={followingIds.length}
          onComposeClick={() => {
            setIsComposeBuzzOpen(true);
          }}
          onSearchClick={() => {
            navigateTo('search');
          }}
          className="hidden lg:flex"
        />

        {/* ========================================================================= */}
        {/* CENTER FEED COLUMN */}
        {/* ========================================================================= */}
        <div className="w-full max-w-2xl flex-1 min-w-0 space-y-4">
          
          {/* Mobile & Tablet Sticky Feed Tabs (Clean, native 1-tap switcher) */}
          <div className="lg:hidden sticky top-14 z-20 -mx-2 px-2 py-2 bg-[#0A0A0E]/95 backdrop-blur-md border-b border-slate-800/80">
            <div
              className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 scroll-smooth touch-pan-x"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {[
                { id: 'for-you', label: 'Untukmu', icon: Flame },
                { id: 'following', label: 'Mengikuti', icon: Users, badge: followingIds.length > 0 ? followingIds.length : null },
                { id: 'trending', label: 'Populer', icon: Sparkles },
                { id: 'saved', label: 'Tersimpan', icon: Bookmark, badge: savedBuzzIds.length > 0 ? savedBuzzIds.length : null },
                { id: 'liked', label: 'Disukai', icon: Heart },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = buzzFeedTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`mobile-buzz-tab-${tab.id}`}
                    onClick={() => setBuzzFeedTab(tab.id as BuzzFeedTab)}
                    className={`relative flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 min-h-[44px] cursor-pointer active:scale-95 ${
                      isActive
                        ? 'text-white'
                        : 'bg-slate-900/90 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeMobileBuzzTab"
                        className="absolute inset-0 bg-[#FF2E7E] rounded-full shadow-md shadow-[#FF2E7E]/25 z-0"
                        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                      {tab.badge ? (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                          isActive ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {tab.badge}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Header Title Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 sticky top-16 bg-[#0A0A0E]/95 backdrop-blur-md z-10 pt-1">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display font-black text-lg sm:text-2xl text-white tracking-tight flex items-center gap-2">
                    {buzzFeedTab === 'for-you' && (
                      <>
                        <Flame className="w-5 h-5 text-[#FF2E7E] shrink-0" />
                        <span>Feed Untukmu</span>
                      </>
                    )}
                    {buzzFeedTab === 'following' && (
                      <>
                        <Users className="w-5 h-5 text-cyan-400 shrink-0" />
                        <span>Mengikuti</span>
                      </>
                    )}
                    {buzzFeedTab === 'saved' && (
                      <>
                        <Bookmark className="w-5 h-5 text-amber-400 shrink-0" />
                        <span>Tersimpan</span>
                      </>
                    )}
                    {buzzFeedTab === 'liked' && (
                      <>
                        <Heart className="w-5 h-5 text-rose-500 fill-rose-500 shrink-0" />
                        <span>Disukai</span>
                      </>
                    )}
                    {buzzFeedTab === 'trending' && (
                      <>
                        <Sparkles className="w-5 h-5 text-[#FF2E7E] shrink-0" />
                        <span>Sedang Hangat</span>
                      </>
                    )}
                  </h1>
                </div>
                <p className="text-slate-400 text-xs hidden sm:block mt-0.5">
                  {buzzFeedTab === 'for-you' && 'Obrolan pop-culture film & ulasan terkini dari komunitas'}
                  {buzzFeedTab === 'following' && 'Postingan dari kritikus & penonton yang kamu ikuti'}
                  {buzzFeedTab === 'saved' && 'Koleksi buzz yang kamu bookmark untuk dibaca kembali'}
                  {buzzFeedTab === 'liked' && 'Koleksi buzz yang telah kamu beri tanda suka'}
                  {buzzFeedTab === 'trending' && 'Postingan dengan tanggapan dan diskusi paling ramai'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeTagFilter !== 'all' && (
                <button
                  onClick={() => setActiveTagFilter('all')}
                  className="flex items-center gap-1 bg-[#FF2E7E]/15 border border-[#FF2E7E]/30 text-[#FF2E7E] text-xs font-bold px-2.5 py-1 rounded-full hover:bg-[#FF2E7E]/25 transition-colors"
                  title="Hapus filter tag"
                >
                  <span>#{activeTagFilter}</span>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Global Page Ad Banner */}
          <AdBannerSlot variant="leaderboard" />

        {/* ========================================================================= */}
        {/* POST COMPOSER CARD WITH SEARCHABLE FILM/ARTICLE TAGGING */}
        {/* ========================================================================= */}
        <div id="buzz-composer-card" className="bg-[#171A1F] border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4">
          <div className="flex items-start gap-3">
            {isLoggedIn ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-10 h-10 rounded-xl object-cover ring-2 ring-[#FF2E7E]/50 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center text-slate-400 ring-2 ring-white/10 shrink-0">
                <UserIcon className="w-5 h-5" />
              </div>
            )}
            <div className="flex-1 space-y-3">
              <MentionInput
                id="buzz-composer-textarea"
                value={postContent}
                onChange={setPostContent}
                placeholder="Apa yang lagi kamu tonton atau pikirkan seputar film hari ini? Ketik '@' untuk mention warga lain..."
                rows={3}
                className="w-full bg-[#0E1013] border border-white/10 rounded-2xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E] resize-none"
              />

              {/* Tagged Item Preview In Composer */}
              {selectedFilm && (
                <div className="flex items-center justify-between p-2.5 bg-[#0E1013] border border-[#FF2E7E]/40 rounded-2xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={selectedFilm.poster}
                      alt={selectedFilm.title}
                      className="w-9 h-12 rounded-lg object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-black uppercase bg-[#FF2E7E] text-white px-1.5 py-0.2 rounded">
                          FILM
                        </span>
                        <h4 className="text-white font-bold text-xs truncate">{selectedFilm.title}</h4>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {selectedFilm.year} • ★ {selectedFilm.skorSotoy.toFixed(1)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedFilmId(null);
                      setSkorMention(undefined);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.1] ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {selectedArticle && (
                <div className="flex items-center justify-between p-2.5 bg-[#0E1013] border border-[#FF2E7E]/40 rounded-2xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={selectedArticle.coverImage}
                      alt={selectedArticle.title}
                      className="w-14 h-10 rounded-lg object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-black uppercase bg-[#FF2E7E] text-white px-1.5 py-0.2 rounded">
                          ARTIKEL
                        </span>
                        <h4 className="text-white font-bold text-xs truncate">{selectedArticle.title}</h4>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        Oleh {selectedArticle.author.name} • {selectedArticle.readTime}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedArticleId(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.1] ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Photo Attachment Preview / Compressing indicator */}
              {isCompressingImage ? (
                <div className="flex items-center gap-3 p-3 bg-[#0E1013] border border-white/10 rounded-2xl animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
                    <Loader2 className="w-5 h-5 text-[#FF2E7E] animate-spin" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white">Mengompres & Menyiapkan Foto...</p>
                    <p className="text-[11px] text-slate-400">Kompresi client-side browser sedang berlangsung.</p>
                  </div>
                </div>
              ) : attachedImagePreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0E1013] group max-w-sm shadow-md">
                  <img
                    src={attachedImagePreview}
                    alt="Preview foto lampiran"
                    className="w-full h-36 object-cover rounded-2xl"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-[#FF2E7E] text-white transition-colors shadow-lg cursor-pointer"
                    title="Hapus foto lampiran"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <span className="absolute bottom-2 left-2 text-[10px] font-semibold bg-black/60 backdrop-blur-sm text-slate-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <ImageIcon className="w-3 h-3 text-[#FF2E7E]" />
                    Foto terlampir
                  </span>
                </div>
              ) : null}

              {/* Tag Controls & Submit Button */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10 relative">
                
                {/* Hidden File Input for Photo Attachment */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
                  onChange={handleImageSelect}
                  className="hidden"
                />

                {/* Photo Attachment Trigger Button */}
                <button
                  type="button"
                  id="buzz-attach-photo-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCompressingImage || isSubmittingPost}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    attachedImageDataUrl
                      ? 'bg-[#FF2E7E]/15 border-[#FF2E7E]/50 text-[#FF2E7E]'
                      : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/10 text-slate-300'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title="Lampirkan 1 foto (JPG, PNG, WEBP, HEIC)"
                >
                  {isCompressingImage ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF2E7E]" />
                  ) : (
                    <ImageIcon className="w-3.5 h-3.5 text-[#FF2E7E]" />
                  )}
                  <span>{isCompressingImage ? 'Mengompres...' : attachedImageDataUrl ? 'Ganti Foto' : '+ Foto'}</span>
                </button>

                {/* Searchable Dropdown Trigger */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    id="open-tag-selector-btn"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-1.5 bg-white/[0.06] hover:bg-white/[0.12] px-3 py-1.5 rounded-xl border border-white/10 text-xs text-slate-200 font-bold transition-colors"
                  >
                    <Tag className="w-3.5 h-3.5 text-[#FF2E7E]" />
                    <span>
                      {selectedFilm ? 'Ganti Film' : selectedArticle ? 'Ganti Artikel' : '+ Tag Film / Artikel'}
                    </span>
                  </button>

                  {/* Popover / Dropdown Menu with Live Search */}
                  {dropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-[calc(100vw-3rem)] max-w-sm sm:w-96 bg-[#171A1F] border border-white/10 rounded-2xl shadow-2xl z-30 p-3 space-y-3">
                      {/* Mode Toggle: Film vs Artikel */}
                      <div className="flex p-1 bg-white/[0.04] border border-white/10 rounded-xl text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => {
                            setTagMode('film');
                            setSearchQuery('');
                          }}
                          className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                            tagMode === 'film'
                              ? 'bg-[#FF2E7E] text-white font-black'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Film className="w-3.5 h-3.5" />
                          <span>Pilih Film ({films.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTagMode('article');
                            setSearchQuery('');
                          }}
                          className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                            tagMode === 'article'
                              ? 'bg-[#FF2E7E] text-white font-black'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Pilih Artikel ({articles.length})</span>
                        </button>
                      </div>

                      {/* Live Search Input inside Dropdown */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          placeholder={tagMode === 'film' ? "Cari judul film, sutradara..." : "Cari judul artikel, topik..."}
                          className="w-full bg-[#0E1013] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
                          autoFocus
                        />
                      </div>

                      {/* Items List */}
                      <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                        {tagMode === 'film' ? (
                          filteredFilms.length === 0 ? (
                            <p className="text-center text-xs text-slate-400 py-4">Film tidak ditemukan.</p>
                          ) : (
                            filteredFilms.map(f => (
                              <div
                                key={f.id}
                                onClick={() => {
                                  setSelectedFilmId(f.id);
                                  setSelectedArticleId(null);
                                  setDropdownOpen(false);
                                }}
                                className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors ${
                                  selectedFilmId === f.id
                                    ? 'bg-[#FF2E7E]/15 border border-[#FF2E7E]/40'
                                    : 'hover:bg-white/[0.06] border border-transparent'
                                }`}
                              >
                                <img
                                  src={f.poster}
                                  alt={f.title}
                                  className="w-9 h-12 rounded-lg object-cover shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <h5 className="font-bold text-xs text-white truncate">{f.title}</h5>
                                  <p className="text-[11px] text-slate-400 truncate">{f.year} • {f.genres.join(', ')}</p>
                                  <span className="text-[10px] text-[#FF2E7E] font-medium">★ {f.skorSotoy.toFixed(1)}</span>
                                </div>
                              </div>
                            ))
                          )
                        ) : (
                          filteredArticles.length === 0 ? (
                            <p className="text-center text-xs text-slate-400 py-4">Artikel tidak ditemukan.</p>
                          ) : (
                            filteredArticles.map(a => (
                              <div
                                key={a.id}
                                onClick={() => {
                                  setSelectedArticleId(a.id);
                                  setSelectedFilmId(null);
                                  setDropdownOpen(false);
                                }}
                                className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors ${
                                  selectedArticleId === a.id
                                    ? 'bg-[#FF2E7E]/15 border border-[#FF2E7E]/40'
                                    : 'hover:bg-white/[0.06] border border-transparent'
                                }`}
                              >
                                <img
                                  src={a.coverImage}
                                  alt={a.title}
                                  className="w-12 h-9 rounded-lg object-cover shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <h5 className="font-bold text-xs text-white truncate">{a.title}</h5>
                                  <p className="text-[11px] text-slate-400 truncate">{a.category} • {a.author.name}</p>
                                </div>
                              </div>
                            ))
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Score Mention selector (if a film is tagged) */}
                {selectedFilm && (
                  <div className="flex items-center gap-1 bg-white/[0.06] px-2.5 py-1.5 rounded-xl border border-white/10 text-xs">
                    <Star className="w-3.5 h-3.5 text-[#FF2E7E] fill-current" />
                    <select
                      value={skorMention !== undefined ? String(skorMention) : ''}
                      onChange={e => setSkorMention(e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="bg-transparent text-slate-300 text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="" className="bg-[#171A1F] text-slate-300">Beri Skor Film?</option>
                      <option value="5.0" className="bg-[#171A1F] text-slate-300">5.0 (Masterpiece)</option>
                      <option value="4.5" className="bg-[#171A1F] text-slate-300">4.5 (Keren Banget)</option>
                      <option value="4.0" className="bg-[#171A1F] text-slate-300">4.0 (Bagus)</option>
                      <option value="3.5" className="bg-[#171A1F] text-slate-300">3.5 (Lumayan)</option>
                      <option value="3.0" className="bg-[#171A1F] text-slate-300">3.0 (Biasa Aja)</option>
                      <option value="2.0" className="bg-[#171A1F] text-slate-300">2.0 (Kurang)</option>
                    </select>
                  </div>
                )}

                <button
                  id="submit-buzz-post-btn"
                  onClick={handlePostSubmit}
                  disabled={!postContent.trim() || isCompressingImage || isSubmittingPost}
                  className="ml-auto bg-[#FF2E7E] hover:bg-[#e0266e] disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-wider px-5 py-2 rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  {isSubmittingPost ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengirim...</span>
                    </>
                  ) : (
                    <>
                      <span>Kirim Buzz</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tag Filters Bar */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none flex-nowrap">
          <Hash className="w-4 h-4 text-slate-500 shrink-0" />
          {allTags.map((tag: string) => {
            const isActive = activeTagFilter === tag;
            return (
              <button
                key={tag}
                onClick={() => setActiveTagFilter(tag)}
                className={`relative px-3 py-1 rounded-xl text-xs font-bold transition-colors shrink-0 ${
                  isActive
                    ? 'text-white shadow-md shadow-[#FF2E7E]/30'
                    : 'bg-white/[0.06] text-slate-400 hover:text-white border border-white/10'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTagFilterPill"
                    className="absolute inset-0 bg-[#FF2E7E] rounded-xl z-0"
                    transition={{ type: 'spring', damping: 26, stiffness: 350 }}
                  />
                )}
                <span className="relative z-10">
                  {tag === 'all' ? 'Semua Topik' : `#${tag}`}
                </span>
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* BUZZ POSTS STREAM WITH RICH PREVIEW CARDS */}
        {/* ========================================================================= */}
        <div className="border-t border-white/10">
          {isLoadingBuzz && buzzList.length === 0 ? (
            <BuzzFeedSkeleton count={4} />
          ) : (
            <AnimatePresence mode="popLayout" initial={false}>
              {filteredBuzz.map((post: BuzzPost) => {
              // Find full film details if tagged
              const postFilm = post.taggedFilm
                ? films.find(f => f.id === post.taggedFilm?.id) || post.taggedFilm
                : null;

              // Find full article details if tagged
              const postArticle = post.taggedArticle
                ? articles.find(a => a.id === post.taggedArticle?.id) || post.taggedArticle
                : null;

              return (
                <motion.div
                  key={post.feedKey || post.id}
                  layout="position"
                  initial={{ opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96, y: -8, transition: { duration: 0.16, ease: 'easeOut' } }}
                  transition={{
                    layout: { type: 'spring', damping: 28, stiffness: 320 },
                    opacity: { duration: 0.22, ease: 'easeOut' },
                    y: { duration: 0.22, ease: 'easeOut' },
                    scale: { duration: 0.22, ease: 'easeOut' },
                  }}
                  id={`buzz-feed-card-${post.feedKey || post.id}`}
                  className="border-b border-white/10 py-4 sm:py-5 space-y-3.5 transition-colors"
                >
                {/* Repost Indicator Header */}
                {post.isRepost && post.repostedBy && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateTo('user-profile', { userId: post.repostedBy!.id });
                    }}
                    className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-emerald-400 cursor-pointer transition-colors pb-2 border-b border-white/10 group/repost"
                    title={`Lihat profil ${post.repostedBy.name}`}
                  >
                    <Repeat2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 stroke-[2.2]" />
                    <span>
                      Direpost oleh{' '}
                      <span className="text-slate-200 group-hover/repost:text-emerald-300 font-bold hover:underline">
                        {post.repostedBy.name}
                      </span>
                    </span>
                    {post.repostedAt && (
                      <span className="text-[11px] text-slate-500 font-normal">
                        • {formatRelativeTime(post.repostedAt)}
                      </span>
                    )}
                  </div>
                )}

                {/* Post Author Info */}
                <div className="flex items-center justify-between gap-2.5">
                  <div
                    onClick={() => navigateTo('user-profile', { userId: post.author.id })}
                    className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group min-w-0 flex-1"
                    title={`Kunjungi profil ${post.author.name}`}
                  >
                    <img
                      src={post.author.avatar}
                      alt={post.author.name}
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover ring-1 ring-white/10 group-hover:ring-[#FF2E7E] transition-all shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-bold text-xs sm:text-sm text-white group-hover:${getRoleBadgeStyle(post.author.role || 'warga_sotoy').text} transition-colors truncate max-w-[120px] xs:max-w-[180px] sm:max-w-none`}>
                          {post.author.name}
                        </span>
                        {post.author.role && (
                          <RoleBadge role={post.author.role} size="xs" />
                        )}
                      </div>
                      <span
                        className="text-[11px] sm:text-xs text-slate-400 group-hover:text-slate-300 block truncate"
                        title={formatFullDateTime(post.createdAt)}
                      >
                        {formatRelativeTime(post.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Optional quick score badge */}
                    {post.skorSotoyMention && (
                      <div className="bg-[#FF2E7E]/10 border border-[#FF2E7E]/30 px-2 py-0.5 rounded-lg text-[#FF2E7E] text-[11px] font-semibold flex items-center gap-1 shrink-0">
                        <Star className="w-3 h-3 fill-current" />
                        <span>{post.skorSotoyMention.toFixed(1)}</span>
                      </div>
                    )}

                    {/* Follow / Unfollow Button for any other user (understated outline Threads style) */}
                    {(!isLoggedIn || post.author.id !== currentUser.id) && (
                      <button
                        id={`buzz-follow-btn-${post.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isLoggedIn) {
                            setLoginModalOpen(true);
                            showToast(`Silakan masuk untuk mengikuti ${post.author.name}!`);
                            return;
                          }
                          toggleFollowUser(post.author.id);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                          isLoggedIn && isFollowing(post.author.id)
                            ? 'bg-transparent text-slate-400 border border-white/15 hover:border-red-500/40 hover:text-red-400'
                            : 'bg-transparent text-slate-200 hover:text-white border border-white/20 hover:border-white/40 active:scale-95'
                        }`}
                        title={
                          isLoggedIn && isFollowing(post.author.id)
                            ? 'Klik untuk batal ikuti'
                            : `Ikuti ${post.author.name}`
                        }
                      >
                        {isLoggedIn && isFollowing(post.author.id) ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="hidden xs:inline">Mengikuti</span>
                            <span className="xs:hidden">Ikut</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3 h-3 shrink-0 text-slate-400" />
                            <span>Ikuti</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Overflow Menu ("•••") with Delete action — only shown if user has delete permission */}
                    {isLoggedIn && (post.author.id === currentUser.id || currentUser.role === 'admin') && (
                      <div className="relative buzz-menu-container shrink-0">
                        <button
                          id={`buzz-more-menu-${post.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuPostId(openMenuPostId === post.id ? null : post.id);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                          title="Menu Opsi"
                          aria-label="Menu Opsi"
                          aria-expanded={openMenuPostId === post.id}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {openMenuPostId === post.id && (
                          <div
                            className="absolute right-0 top-full mt-1 w-32 bg-[#171A1F] border border-white/10 rounded-xl p-1 shadow-2xl z-30 animate-in fade-in zoom-in-95 duration-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              id={`buzz-delete-btn-${post.id}`}
                              onClick={async (e) => {
                                e.stopPropagation();
                                setOpenMenuPostId(null);
                                if (window.confirm('Hapus postingan ini?')) {
                                  await deleteBuzzPost(post.id);
                                }
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Recommendation Signal Badge */}
                {buzzFeedTab === 'for-you' && post.recommendationSignal && (
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-300 bg-white/[0.06] border border-white/10 px-2.5 py-0.5 rounded-full shadow-sm">
                    <Sparkles className="w-3 h-3 text-[#FF2E7E] shrink-0" />
                    <span>{post.recommendationSignal.label}</span>
                  </div>
                )}

                {/* Content Text */}
                <p className="text-slate-200 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                  <MentionText content={post.content} />
                </p>

                {/* Attached Photo */}
                <BuzzImageAttachment src={post.image} alt={`Foto postingan oleh ${post.author.name}`} />

                {/* Hashtags */}
                {post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {post.tags.map((t: string, idx: number) => (
                      <span
                        key={idx}
                        onClick={() => setActiveTagFilter(t)}
                        className="text-xs text-[#FF2E7E] hover:underline cursor-pointer font-medium"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                {/* =================================================================== */}
                {/* TAGGED FILM PREVIEW CARD */}
                {/* =================================================================== */}
                {postFilm && (
                  <div
                    id={`buzz-tagged-film-${postFilm.id}`}
                    onClick={() => navigateTo('film-detail', { filmId: postFilm.id })}
                    className="p-3.5 sm:p-4 rounded-2xl bg-[#0E1013] border border-white/10 hover:border-[#FF2E7E]/50 transition-all cursor-pointer group flex items-center justify-between gap-4 shadow-md"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Film Poster */}
                      <img
                        src={'poster' in postFilm ? (postFilm as any).poster : 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=300&q=80'}
                        alt={postFilm.title}
                        className="w-14 sm:w-16 h-20 sm:h-24 rounded-xl object-cover shrink-0 shadow-lg border border-white/10 group-hover:scale-105 transition-transform"
                      />

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="bg-[#FF2E7E] text-white font-black text-[9px] uppercase px-2 py-0.5 rounded">
                            FILM PREVIEW
                          </span>
                          {'year' in postFilm && (
                            <span className="text-slate-400 text-xs font-semibold">
                              {(postFilm as any).year}
                            </span>
                          )}
                        </div>

                        <h4 className="font-display font-black text-sm sm:text-base text-white group-hover:text-[#FF2E7E] transition-colors truncate">
                          {postFilm.title}
                        </h4>

                        {'genres' in postFilm && (postFilm as any).genres && (
                          <p className="text-xs text-slate-400 truncate">
                            {(postFilm as any).genres.join(', ')}
                          </p>
                        )}

                        <div className="flex items-center gap-2 pt-0.5">
                          <div className="text-[11px] text-[#FF2E7E] font-black flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current" />
                            <span>
                              {'skorSotoy' in postFilm ? (postFilm as any).skorSotoy.toFixed(1) : '4.9'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500">• Skor Sotoy</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1 text-xs font-bold text-[#FF2E7E] group-hover:translate-x-1 transition-transform">
                      <span className="hidden sm:inline">Buka Film</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                )}

                {/* =================================================================== */}
                {/* TAGGED ARTIKEL PREVIEW CARD */}
                {/* =================================================================== */}
                {postArticle && (
                  <div
                    id={`buzz-tagged-article-${postArticle.id}`}
                    onClick={() => navigateTo('article-detail', { articleId: postArticle.id })}
                    className="p-3.5 sm:p-4 rounded-2xl bg-[#0E1013] border border-white/10 hover:border-[#FF2E7E]/50 transition-all cursor-pointer group flex items-center justify-between gap-4 shadow-md"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Article Cover Thumbnail */}
                      <img
                        src={'coverImage' in postArticle ? (postArticle as any).coverImage : 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=400&q=80'}
                        alt={postArticle.title}
                        className="w-20 sm:w-24 h-16 sm:h-20 rounded-xl object-cover shrink-0 shadow-lg border border-white/10 group-hover:scale-105 transition-transform"
                      />

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="bg-[#FF2E7E] text-white font-black text-[9px] uppercase px-2 py-0.5 rounded">
                            ARTIKEL PREVIEW
                          </span>
                          {'category' in postArticle && (
                            <span className="text-slate-400 text-xs font-semibold capitalize">
                              {(postArticle as any).category}
                            </span>
                          )}
                        </div>

                        <h4 className="font-display font-black text-xs sm:text-sm text-white group-hover:text-[#FF2E7E] transition-colors line-clamp-2 leading-snug">
                          {postArticle.title}
                        </h4>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span>
                            {'authorName' in postArticle
                              ? (postArticle as any).authorName
                              : 'author' in postArticle
                              ? (postArticle as any).author.name
                              : 'Penulis Sotoy'}
                          </span>
                          <span>•</span>
                          <span>
                            {'readTime' in postArticle ? (postArticle as any).readTime : '5 mnt baca'}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-pink-400">
                            <Heart className="w-3 h-3 fill-current" />
                            <span>{'likes' in postArticle ? (postArticle as any).likes : '0'}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1 text-xs font-bold text-[#FF2E7E] group-hover:translate-x-1 transition-transform">
                      <span className="hidden sm:inline">Baca Artikel</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                )}

                {/* Footer Controls: Minimal Threads-style Icon Row */}
                <div className="pt-2 flex items-center justify-between gap-3 text-xs text-slate-400 select-none">
                  <div className="flex items-center gap-4 sm:gap-6">
                    <QuickReactionBar
                      buzzId={post.id}
                      reactions={post.reactions}
                      myReaction={post.myReaction}
                    />

                    <button
                      id={`buzz-reply-trigger-${post.id}`}
                      onClick={() => navigateTo('buzz-detail', { buzzId: post.id })}
                      className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-opacity hover:opacity-80 active:scale-95 cursor-pointer text-xs shrink-0 py-1"
                      title="Buka halaman diskusi & balas buzz ini"
                    >
                      <MessageSquare className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-current" />
                      <span className="font-medium text-slate-400">
                        {(post.replies && post.replies.length > 0 ? post.replies.length : post.repliesCount) || 0}
                      </span>
                    </button>

                    <button
                      id={`buzz-repost-${post.id}`}
                      onClick={() => toggleRepostBuzzPost(post.id)}
                      disabled={currentUser?.id === post.author?.id}
                      className={`flex items-center gap-1.5 transition-opacity hover:opacity-80 active:scale-95 text-xs shrink-0 py-1 cursor-pointer ${
                        currentUser?.id && post.repostedByUsers?.[currentUser.id]
                          ? 'text-emerald-400'
                          : currentUser?.id === post.author?.id
                            ? 'text-slate-600 cursor-not-allowed opacity-50'
                            : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title={
                        currentUser?.id === post.author?.id
                          ? 'Kamu tidak bisa me-repost postinganmu sendiri'
                          : currentUser?.id && post.repostedByUsers?.[currentUser.id]
                            ? 'Batalkan Repost'
                            : 'Repost'
                      }
                    >
                      <Repeat2 className={`w-4 h-4 sm:w-[18px] sm:h-[18px] ${currentUser?.id && post.repostedByUsers?.[currentUser.id] ? 'stroke-[2.2]' : ''}`} />
                      <span className={`font-medium ${currentUser?.id && post.repostedByUsers?.[currentUser.id] ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {post.repostsCount || 0}
                      </span>
                    </button>

                    <button
                      onClick={() => handleShareBuzz(post)}
                      className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-opacity hover:opacity-80 active:scale-95 cursor-pointer text-xs shrink-0 py-1"
                      title="Bagikan Buzz ini ke Media Sosial"
                    >
                      <Share2 className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-current" />
                    </button>
                  </div>

                  <button
                    id={`buzz-save-${post.id}`}
                    onClick={() => toggleSaveBuzz(post.id)}
                    className={`flex items-center gap-1.5 transition-opacity hover:opacity-80 active:scale-95 text-xs shrink-0 py-1 cursor-pointer ${
                      savedBuzzIds.includes(post.id)
                        ? 'text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title={savedBuzzIds.includes(post.id) ? 'Hapus dari Tersimpan' : 'Simpan Buzz ini'}
                  >
                    <Bookmark className={`w-4 h-4 sm:w-[18px] sm:h-[18px] ${savedBuzzIds.includes(post.id) ? 'fill-current text-white' : 'text-current'}`} />
                  </button>
                </div>
              </motion.div>
            );
          })}

          {/* Empty States for Tabs */}
          {filteredBuzz.length === 0 && (
            <motion.div
              key={`empty-${buzzFeedTab}-${activeTagFilter}`}
              layout
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -12 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="bg-[#171A1F] border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-xl"
            >
            <div className="w-14 h-14 rounded-2xl bg-white/10 mx-auto flex items-center justify-center text-slate-200">
              {buzzFeedTab === 'following' ? (
                <Users className="w-7 h-7 text-cyan-400" />
              ) : buzzFeedTab === 'saved' ? (
                <Bookmark className="w-7 h-7 text-amber-400" />
              ) : buzzFeedTab === 'liked' ? (
                <Heart className="w-7 h-7 text-[#FF2E7E]" />
              ) : (
                <MessageSquare className="w-7 h-7 text-slate-400" />
              )}
            </div>

            <div>
              <h3 className="font-bold text-white text-base">
                {buzzFeedTab === 'following' && 'Belum ada buzz dari akun yang kamu ikuti'}
                {buzzFeedTab === 'saved' && 'Belum ada buzz yang kamu simpan'}
                {buzzFeedTab === 'liked' && 'Belum ada buzz yang kamu sukai'}
                {buzzFeedTab === 'trending' && 'Belum ada postingan trending saat ini'}
                {buzzFeedTab === 'for-you' && 'Belum ada buzz yang cocok dengan filter tag'}
              </h3>
              <p className="text-slate-400 text-xs mt-1 max-w-md mx-auto">
                {buzzFeedTab === 'following' && 'Ikuti sesama kritikus, reviewer, dan penonton film agar buzz mereka muncul di sini!'}
                {buzzFeedTab === 'saved' && 'Simpan ulasan menarik menggunakan tombol "Simpan" agar tersimpan rapi di daftar ini.'}
                {buzzFeedTab === 'liked' && 'Berikan apresiasi like atau reaksi emoji pada ulasan yang kamu sukai.'}
                {buzzFeedTab === 'trending' && 'Mulai diskusi seru atau berikan komentar pada buzz yang ada.'}
                {buzzFeedTab === 'for-you' && 'Coba reset filter tag untuk melihat semua topik obrolan.'}
              </p>
            </div>

            {buzzFeedTab === 'following' && (
              <div className="pt-3 border-t border-slate-800/80 max-w-sm mx-auto space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Rekomendasi Akun</span>
                <div className="space-y-1.5">
                  {allUsers.filter(u => u.id !== currentUser.id).slice(0, 3).map(u => (
                    <div key={u.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="flex items-center gap-2 min-w-0">
                        <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-lg object-cover" />
                        <div className="text-left text-xs min-w-0">
                          <div className="font-bold text-white truncate">{u.name}</div>
                          <div className="text-[10px] text-slate-400 truncate">@{u.handle}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleFollowUser(u.id)}
                        className={`text-xs px-3 py-1 rounded-lg font-bold transition-colors ${
                          isFollowing(u.id)
                            ? 'bg-slate-800 text-slate-300'
                            : 'bg-white text-slate-950 hover:bg-slate-200'
                        }`}
                      >
                        {isFollowing(u.id) ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {buzzFeedTab !== 'for-you' && (
              <button
                onClick={() => {
                  setBuzzFeedTab('for-you');
                  setActiveTagFilter('all');
                }}
                className="px-4 py-2 bg-white text-slate-950 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors inline-flex items-center gap-2"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Kembali ke Feed "For you"</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      )}
    </div>
  </div>

      {/* ========================================================================= */}
      {/* RIGHT WIDGETS COLUMN (DESKTOP) */}
      {/* ========================================================================= */}
      <div className="hidden xl:flex flex-col gap-4 w-72 shrink-0 sticky top-20 select-none">
        {/* Trending Tags & Topics */}
        <div className="bg-[#171A1F]/90 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#FF2E7E]" />
              <span>Topik Hangat Hari Ini</span>
            </h3>
            {activeTagFilter !== 'all' && (
              <button
                onClick={() => setActiveTagFilter('all')}
                className="text-[11px] text-[#FF2E7E] hover:underline font-semibold"
              >
                Reset
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {['ReviewSotoy', 'HororLokal', 'AgakLaen', 'Dune2', 'SiksaKubur', 'Filmmaking'].map((tag) => {
              const isActive = activeTagFilter.toLowerCase() === tag.toLowerCase();
              return (
                <button
                  key={tag}
                  onClick={() => {
                    setActiveTagFilter(tag);
                    showToast(`Memfilter feed untuk #${tag}`);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    isActive
                      ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/20'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <Hash className="w-3 h-3 opacity-60" />
                  <span>{tag}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recommended Reviewers to Follow */}
        <div className="bg-[#171A1F]/90 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Kritikus Pilihan</span>
            </h3>
            <button
              onClick={() => navigateTo('user-profile')}
              className="text-[11px] text-slate-400 hover:text-white"
            >
              Semua
            </button>
          </div>

          <div className="space-y-2.5">
            {allUsers
              .filter((u) => u.id !== currentUser.id)
              .slice(0, 3)
              .map((u) => {
                const followed = isFollowing(u.id);
                return (
                  <div key={u.id} className="flex items-center justify-between gap-2">
                    <div
                      onClick={() => navigateTo('user-profile', { userId: u.id })}
                      className="flex items-center gap-2 min-w-0 cursor-pointer group"
                    >
                      <img
                        src={u.avatar}
                        alt={u.name}
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10 group-hover:ring-[#FF2E7E] transition-all shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate group-hover:text-[#FF2E7E] transition-colors">
                          {u.name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">@{u.handle}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleFollowUser(u.id)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all shrink-0 ${
                        followed
                          ? 'bg-slate-800 text-slate-400 hover:bg-rose-900/30 hover:text-rose-400 border border-slate-700'
                          : 'bg-white text-slate-950 hover:bg-slate-200'
                      }`}
                    >
                      {followed ? 'Mengikuti' : 'Ikuti'}
                    </button>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Community Guidelines Glass Card */}
        <div className="bg-[#171A1F]/60 border border-slate-800/60 rounded-2xl p-3.5 text-[11px] text-slate-400 space-y-1.5 leading-relaxed">
          <p className="font-bold text-slate-300">💡 Etika Berdiskusi di Sotoy Buzz:</p>
          <ul className="list-disc list-inside space-y-0.5 text-slate-400">
            <li>Sertakan tagar <span className="text-[#FF2E7E] font-semibold">#spoiler</span> jika membahas plot twist.</li>
            <li>Hargai perbedaan selera & kritik konstruktif film.</li>
            <li>Tag film atau artikel terkait untuk mempermudah referensi penonton lain.</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
);
};
