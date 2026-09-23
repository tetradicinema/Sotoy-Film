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
 * Prevents any single author from appearing more than once within any window of 3
 * consecutive positions in the feed (i.e. not in the immediate last 2 positions of the output).
 * If the pool contains fewer than 3 distinct authors, it guarantees that no two consecutive
 * adjacent positions share the same author (alternating pattern), preserving score hierarchy.
 */
function applyAuthorDiversity(
  scoreRankedList: BuzzPost[],
  windowSize = 3
): BuzzPost[] {
  if (scoreRankedList.length <= 2) return scoreRankedList;

  const remaining = [...scoreRankedList];
  const diversified: BuzzPost[] = [];
  const lookbackCount = Math.max(1, windowSize - 1); // For window of 3, inspect last 2 positions

  while (remaining.length > 0) {
    // 1. First priority: Find highest-scoring post whose author is not in the last (windowSize - 1) positions
    const recentAuthorIds = new Set(
      diversified.slice(-lookbackCount).map(post => post.author.id)
    );
    let nextIndex = remaining.findIndex(post => !recentAuthorIds.has(post.author.id));

    // 2. Second priority: If no candidate exists from a 3rd distinct author (e.g. only 2 authors present),
    // prevent adjacent back-to-back clustering by avoiding the immediate previous author
    if (nextIndex === -1 && diversified.length > 0) {
      const immediatePreviousAuthorId = diversified[diversified.length - 1].author.id;
      nextIndex = remaining.findIndex(post => post.author.id !== immediatePreviousAuthorId);
    }

    // 3. Fallback: If all remaining candidates belong to the only remaining author in the pool
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
    let list = [...buzzList];

    // 1. Tag filtering (if active tag filter is chosen)
    if (activeTagFilter !== 'all') {
      const target = activeTagFilter.toLowerCase().replace(/^#/, '');
      list = list.filter(b => {
        const matchTag = b.tags?.some(t => t.toLowerCase().replace(/^#/, '') === target);
        const matchContent = b.content.toLowerCase().includes(`#${target}`);
        return matchTag || matchContent;
      });
    }

    // 2. Tab view filtering & scoring
    if (buzzFeedTab === 'following') {
      // Predictable, reverse-chronological feed of only followed accounts
      return list
        .filter(b => followingIds.includes(b.author.id))
        .sort((a, b) => getPostTimestampMs(b.createdAt) - getPostTimestampMs(a.createdAt));
    }

    if (buzzFeedTab === 'saved') {
      return list.filter(b => savedBuzzIds.includes(b.id));
    }

    if (buzzFeedTab === 'liked') {
      return list.filter(b => b.likedByMe || (b.myReaction !== undefined && b.myReaction !== null));
    }

    if (buzzFeedTab === 'trending') {
      return list.sort((a, b) => {
        const aReactions = a.reactions ? Object.values(a.reactions).reduce((s, v) => s + (v || 0), 0) : (a.likes || 0);
        const bReactions = b.reactions ? Object.values(b.reactions).reduce((s, v) => s + (v || 0), 0) : (b.likes || 0);
        const aScore = aReactions + (a.repliesCount || 0) * 2;
        const bScore = bReactions + (b.repliesCount || 0) * 2;
        return bScore - aScore;
      });
    }

    // Default 'for-you' tab: Multi-signal personalized feed scoring
    const scoredList = list
      .map(post => {
        // A. Recency Score (smooth decay over time, scale 0 to 100)
        const ageHours = getPostAgeInHours(post.createdAt);
        const recencyScore = 100 / (1 + Math.pow(ageHours / 20, 1.25));

        // B. Engagement Score (reactions + replies, scale 0 to 60)
        const totalReactions = post.reactions
          ? Object.values(post.reactions).reduce((sum, v) => sum + (v || 0), 0)
          : (post.likes || 0);
        const repliesCount = (post.replies && post.replies.length > 0)
          ? post.replies.length
          : (post.repliesCount || 0);
        const engagementScore = Math.min(60, (totalReactions * 2) + (repliesCount * 4));

        // C. Author Affinity Score with time decay (scale 0 to 35)
        // Author affinity naturally fades the older the post gets, so older posts from followed
        // authors don't perpetually crowd out fresh, relevant community conversations.
        const isFollowedAuthor = followingIds.includes(post.author.id);
        const isOwnPost = Boolean(currentUser?.id && post.author.id === currentUser.id);
        const affinityDecayFactor = 1 / (1 + Math.pow(ageHours / 24, 1.25));
        const rawAuthorAffinity = isFollowedAuthor ? 35 : (isOwnPost ? 20 : 0);
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
        const isAffinityDominant = isFollowedAuthor && affinityContributionFraction >= 0.28;

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
            label: 'Dari kreator yang kamu ikuti',
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

    // Apply author diversity / anti-clustering pass so no author appears more than once
    // within any window of 3 consecutive positions in the final feed.
    return applyAuthorDiversity(scoredList, 3);
  }, [buzzList, buzzFeedTab, followingIds, savedBuzzIds, activeTagFilter, interestProfile, currentUser?.id]);

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
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
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
                    className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors shrink-0 ${
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
                        <span className="text-[10px] bg-black/40 text-white px-1.5 py-0.2 rounded-full font-mono">
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
                        <Sparkles className="w-5 h-5 text-[#FFD000] shrink-0" />
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
        <div id="buzz-composer-card" className="bg-[#121324] border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
          <div className="flex items-start gap-3">
            {isLoggedIn ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-10 h-10 rounded-xl object-cover ring-2 ring-[#FF2E7E]/50 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 ring-2 ring-slate-700 shrink-0">
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
                className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E] resize-none"
              />

              {/* Tagged Item Preview In Composer */}
              {selectedFilm && (
                <div className="flex items-center justify-between p-2.5 bg-slate-900/90 border border-[#00F0FF]/40 rounded-2xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={selectedFilm.poster}
                      alt={selectedFilm.title}
                      className="w-9 h-12 rounded-lg object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-black uppercase bg-[#00F0FF] text-slate-950 px-1.5 py-0.2 rounded">
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
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {selectedArticle && (
                <div className="flex items-center justify-between p-2.5 bg-slate-900/90 border border-[#FF2E7E]/40 rounded-2xl">
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
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Photo Attachment Preview / Compressing indicator */}
              {isCompressingImage ? (
                <div className="flex items-center gap-3 p-3 bg-slate-900/90 border border-slate-800 rounded-2xl animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                    <Loader2 className="w-5 h-5 text-[#FF2E7E] animate-spin" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white">Mengompres & Menyiapkan Foto...</p>
                    <p className="text-[11px] text-slate-400">Kompresi client-side browser sedang berlangsung.</p>
                  </div>
                </div>
              ) : attachedImagePreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 group max-w-sm shadow-md">
                  <img
                    src={attachedImagePreview}
                    alt="Preview foto lampiran"
                    className="w-full h-36 object-cover rounded-2xl"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-red-500 text-white transition-colors shadow-lg cursor-pointer"
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
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 relative">
                
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
                      : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
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
                    className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs text-slate-300 font-bold transition-colors"
                  >
                    <Tag className="w-3.5 h-3.5 text-[#00F0FF]" />
                    <span>
                      {selectedFilm ? 'Ganti Film' : selectedArticle ? 'Ganti Artikel' : '+ Tag Film / Artikel'}
                    </span>
                  </button>

                  {/* Popover / Dropdown Menu with Live Search */}
                  {dropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-[calc(100vw-3rem)] max-w-sm sm:w-96 bg-[#16182D] border border-slate-700 rounded-2xl shadow-2xl z-30 p-3 space-y-3">
                      {/* Mode Toggle: Film vs Artikel */}
                      <div className="flex p-1 bg-slate-900 rounded-xl text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => {
                            setTagMode('film');
                            setSearchQuery('');
                          }}
                          className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                            tagMode === 'film'
                              ? 'bg-[#00F0FF] text-slate-950 font-black'
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
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F0FF]"
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
                                    ? 'bg-[#00F0FF]/15 border border-[#00F0FF]/40'
                                    : 'hover:bg-slate-900 border border-transparent'
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
                                  <span className="text-[10px] text-[#FFD000] font-medium">★ {f.skorSotoy.toFixed(1)}</span>
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
                                    : 'hover:bg-slate-900 border border-transparent'
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
                  <div className="flex items-center gap-1 bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-700 text-xs">
                    <Star className="w-3.5 h-3.5 text-[#FFD000] fill-current" />
                    <select
                      value={skorMention !== undefined ? String(skorMention) : ''}
                      onChange={e => setSkorMention(e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="bg-transparent text-slate-300 text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="">Beri Skor Film?</option>
                      <option value="5.0">5.0 (Masterpiece)</option>
                      <option value="4.5">4.5 (Keren Banget)</option>
                      <option value="4.0">4.0 (Bagus)</option>
                      <option value="3.5">3.5 (Lumayan)</option>
                      <option value="3.0">3.0 (Biasa Aja)</option>
                      <option value="2.0">2.0 (Kurang)</option>
                    </select>
                  </div>
                )}

                <button
                  id="submit-buzz-post-btn"
                  onClick={handlePostSubmit}
                  disabled={!postContent.trim() || isCompressingImage || isSubmittingPost}
                  className="ml-auto bg-gradient-to-r from-[#FF2E7E] to-[#FFD000] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-xs uppercase tracking-wider px-5 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-[#FF2E7E]/20 transition-transform active:scale-95 cursor-pointer"
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
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
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
        <div className="space-y-4">
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
                  key={post.id}
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
                  id={`buzz-feed-card-${post.id}`}
                  className="bg-[#121324] border border-slate-800/80 hover:border-slate-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl transition-colors space-y-3.5 sm:space-y-4"
                >
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
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover ring-2 ring-transparent group-hover:ring-[#00F0FF] transition-all shrink-0"
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

                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {/* Optional quick score badge */}
                    {post.skorSotoyMention && (
                      <div className="bg-[#FFD000]/15 border border-[#FFD000]/40 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl text-[#FFD000] text-[11px] sm:text-xs font-black flex items-center gap-1 shrink-0">
                        <Star className="w-3 h-3 fill-current" />
                        <span>{post.skorSotoyMention.toFixed(1)}</span>
                      </div>
                    )}

                    {/* Follow / Unfollow Button for any other user */}
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
                        className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 shadow-sm shrink-0 ${
                          isLoggedIn && isFollowing(post.author.id)
                            ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/40'
                            : 'bg-gradient-to-r from-[#FF2E7E] to-[#FF8008] text-white hover:brightness-110 active:scale-95'
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
                            <UserPlus className="w-3 h-3 shrink-0" />
                            <span>+ Ikuti</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Delete button for author or admin */}
                    {isLoggedIn && (post.author.id === currentUser.id || currentUser.role === 'admin') && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (window.confirm('Hapus postingan ini?')) {
                            await deleteBuzzPost(post.id);
                          }
                        }}
                        className="p-1.5 sm:p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all shadow-sm shrink-0"
                        title="Hapus Postingan"
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Recommendation Signal Badge (Explainable AI / personalization badge) */}
                {buzzFeedTab === 'for-you' && post.recommendationSignal && (
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-cyan-300 bg-cyan-950/70 border border-cyan-500/30 px-2.5 py-0.5 rounded-full shadow-sm">
                    <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
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
                        className="text-xs text-[#00F0FF] hover:underline cursor-pointer font-medium"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                {/* =================================================================== */}
                {/* TAGGED FILM PREVIEW CARD (DENGAN POSTER RESMI) */}
                {/* =================================================================== */}
                {postFilm && (
                  <div
                    id={`buzz-tagged-film-${postFilm.id}`}
                    onClick={() => navigateTo('film-detail', { filmId: postFilm.id })}
                    className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-[#16182D] border border-[#00F0FF]/30 hover:border-[#00F0FF] transition-all cursor-pointer group flex items-center justify-between gap-4 shadow-md"
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
                          <span className="bg-[#00F0FF] text-slate-950 font-black text-[9px] uppercase px-2 py-0.5 rounded">
                            FILM PREVIEW
                          </span>
                          {'year' in postFilm && (
                            <span className="text-slate-400 text-xs font-semibold">
                              {(postFilm as any).year}
                            </span>
                          )}
                        </div>

                        <h4 className="font-display font-black text-sm sm:text-base text-white group-hover:text-[#00F0FF] transition-colors truncate">
                          {postFilm.title}
                        </h4>

                        {'genres' in postFilm && (postFilm as any).genres && (
                          <p className="text-xs text-slate-400 truncate">
                            {(postFilm as any).genres.join(', ')}
                          </p>
                        )}

                        <div className="flex items-center gap-2 pt-0.5">
                          <div className="text-[11px] text-[#FFD000] font-black flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current" />
                            <span>
                              {'skorSotoy' in postFilm ? (postFilm as any).skorSotoy.toFixed(1) : '4.9'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500">• Skor Sotoy</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1 text-xs font-bold text-[#00F0FF] group-hover:translate-x-1 transition-transform">
                      <span className="hidden sm:inline">Buka Film</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                )}

                {/* =================================================================== */}
                {/* TAGGED ARTIKEL PREVIEW CARD (DENGAN GAMBAR THUMBNAIL) */}
                {/* =================================================================== */}
                {postArticle && (
                  <div
                    id={`buzz-tagged-article-${postArticle.id}`}
                    onClick={() => navigateTo('article-detail', { articleId: postArticle.id })}
                    className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-[#1F1426] border border-[#FF2E7E]/30 hover:border-[#FF2E7E] transition-all cursor-pointer group flex items-center justify-between gap-4 shadow-md"
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

                {/* Footer Controls: Quick Reaction Bar, Replies, Share, Save */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-4 text-xs text-slate-400">
                  <div className="overflow-x-auto scrollbar-none min-w-0 flex-1">
                    <QuickReactionBar
                      buzzId={post.id}
                      reactions={post.reactions}
                      myReaction={post.myReaction}
                    />
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <button
                      id={`buzz-reply-trigger-${post.id}`}
                      onClick={() => navigateTo('buzz-detail', { buzzId: post.id })}
                      className="flex items-center gap-1 sm:gap-1.5 hover:text-[#00F0FF] text-slate-300 transition-colors group cursor-pointer bg-slate-900/80 hover:bg-slate-800 border border-slate-800 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs shrink-0"
                      title="Buka halaman diskusi & balas buzz ini"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-[#00F0FF] group-hover:scale-110 transition-transform" />
                      <span className="font-semibold">
                        {(post.replies && post.replies.length > 0 ? post.replies.length : post.repliesCount) || 0} <span className="hidden xs:inline">Balasan</span>
                      </span>
                    </button>

                    <button
                      onClick={() => handleShareBuzz(post)}
                      className="flex items-center gap-1 sm:gap-1.5 hover:text-[#00F0FF] transition-colors bg-slate-900/80 hover:bg-slate-800 border border-slate-800 p-1.5 sm:px-3 sm:py-1.5 rounded-xl text-slate-300 text-xs shrink-0"
                      title="Bagikan Buzz ini ke Media Sosial"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline font-semibold">Bagikan</span>
                    </button>

                    <button
                      id={`buzz-save-${post.id}`}
                      onClick={() => toggleSaveBuzz(post.id)}
                      className={`flex items-center gap-1 sm:gap-1.5 transition-colors border p-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs shrink-0 ${
                        savedBuzzIds.includes(post.id)
                          ? 'bg-white/20 border-white/40 text-white font-bold'
                          : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300'
                      }`}
                      title={savedBuzzIds.includes(post.id) ? 'Hapus dari Tersimpan' : 'Simpan Buzz ini'}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${savedBuzzIds.includes(post.id) ? 'fill-current text-white' : ''}`} />
                      <span className="hidden sm:inline font-semibold">
                        {savedBuzzIds.includes(post.id) ? 'Disimpan' : 'Simpan'}
                      </span>
                    </button>
                  </div>
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
              className="bg-[#121324] border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-xl"
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
        <div className="bg-[#121324]/90 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#FFD000]" />
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
        <div className="bg-[#121324]/90 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 shadow-xl space-y-3">
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
        <div className="bg-[#121324]/60 border border-slate-800/60 rounded-2xl p-3.5 text-[11px] text-slate-400 space-y-1.5 leading-relaxed">
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
