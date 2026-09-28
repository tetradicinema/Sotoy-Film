import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  MessageSquare,
  Heart,
  Share2,
  Star,
  Sparkles,
  Send,
  UserPlus,
  Check,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  GitBranch,
  TrendingUp,
  Flame,
  CornerDownRight,
  Quote,
  X,
  AtSign,
  User as UserIcon,
  Trash2,
  Repeat2,
  MoreHorizontal,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getRoleBadgeStyle } from '../../utils/roleStyles';
import { RoleBadge } from '../Common/RoleBadge';
import { AdBannerSlot } from '../Common/AdBannerSlot';
import { QuickReactionBar } from '../Common/QuickReactionBar';
import { MentionText } from '../Common/MentionText';
import { MentionInput } from '../Common/MentionInput';
import { BuzzReply } from '../../types';
import { formatRelativeTime, formatFullDateTime } from '../../utils/formatRelativeTime';
import { BuzzImageAttachment } from '../Buzz/BuzzImageAttachment';

export const BuzzDetailPage: React.FC = () => {
  const {
    buzzList,
    selectedBuzzId,
    currentUser,
    isLoggedIn,
    setLoginModalOpen,
    navigateTo,
    likeBuzzPost,
    toggleRepostBuzzPost,
    addBuzzReply,
    likeBuzzReply,
    deleteBuzzPost,
    deleteBuzzReply,
    openShareModal,
    showToast,
    followingIds,
    toggleFollowUser,
    isFollowing,
    films,
    articles,
  } = useApp();

  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{
    replyId: string;
    user: { id: string; name: string; handle: string };
  } | null>(null);
  const [highlightedReplyId, setHighlightedReplyId] = useState<string | null>(null);
  const [collapsedThreads, setCollapsedThreads] = useState<Record<string, boolean>>({});
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutsideMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.buzz-detail-menu-container')) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideMenu);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const toggleThreadCollapse = (replyId: string) => {
    setCollapsedThreads(prev => ({
      ...prev,
      [replyId]: !prev[replyId],
    }));
  };

  const jumpToParentReply = (parentId: string) => {
    const el = document.getElementById(`buzz-reply-card-${parentId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedReplyId(parentId);
      setTimeout(() => {
        setHighlightedReplyId(null);
      }, 2200);
    }
  };

  // Find the selected buzz post, or fallback to the first one
  const buzz = buzzList.find(b => b.id === selectedBuzzId) || buzzList[0];

  if (!buzz) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <MessageSquare className="w-16 h-16 text-slate-600 mx-auto" />
        <h2 className="text-2xl font-bold text-white">Postingan Buzz Tidak Ditemukan</h2>
        <p className="text-slate-400 text-sm">Postingan yang kamu cari mungkin sudah dihapus atau tidak tersedia.</p>
        <button
          onClick={() => navigateTo('community-feed')}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#FF2E7E] to-[#e0266e] text-white font-bold text-sm shadow-lg shadow-[#FF2E7E]/25 hover:brightness-110 transition-all"
        >
          ← Kembali ke Buzz Komunitas
        </button>
      </div>
    );
  }

  // Related tagged film or article
  const postFilm = buzz.taggedFilm
    ? films.find(f => f.id === buzz.taggedFilm?.id) || buzz.taggedFilm
    : null;
  const postArticle = buzz.taggedArticle
    ? articles.find(a => a.id === buzz.taggedArticle?.id) || buzz.taggedArticle
    : null;

  const replies = buzz.replies || [];

  const handleStartReply = (replyId: string, author: { id: string; name: string; handle: string }) => {
    setReplyingTo({ replyId, user: author });
    const handleMention = author.handle.startsWith('@') ? author.handle : `@${author.handle}`;
    setReplyText(prev => {
      if (prev.includes(handleMention)) return prev;
      return `${handleMention} ${prev}`.trimStart();
    });
    const comp = document.getElementById('buzz-reply-composer');
    comp?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendReply = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyText.trim()) return;

    if (!isLoggedIn) {
      setLoginModalOpen(true);
      showToast('Silakan masuk terlebih dahulu untuk membalas diskusi buzz!');
      return;
    }

    setIsSubmitting(true);
    addBuzzReply(buzz.id, replyText, replyingTo?.replyId, replyingTo?.user);
    setReplyText('');
    setReplyingTo(null);
    setIsSubmitting(false);
  };

  const handleShare = () => {
    const authorHandle = buzz.author.handle.startsWith('@') ? buzz.author.handle : `@${buzz.author.handle}`;
    openShareModal({
      title: `Buzz Diskusi: ${buzz.author.name}`,
      text: buzz.content,
      tags: buzz.tags,
      type: 'buzz',
      image: buzz.author.avatar,
      imageUrl: buzz.author.avatar,
      authorAvatar: buzz.author.avatar,
      authorName: buzz.author.name,
      authorHandle: buzz.author.handle,
      authorRole: buzz.author.role,
      likes: buzz.likes,
      replies: (replies && replies.length > 0 ? replies.length : buzz.repliesCount) || 0,
      meta: postFilm ? `Membahas film ${postFilm.title}` : postArticle ? `Membahas artikel ${postArticle.title}` : `${authorHandle} di Sotoy Film`,
      buzzImage: buzz.image,
      taggedFilmPoster: (postFilm as any)?.posterUrl || (postFilm as any)?.poster || undefined,
      taggedFilmTitle: postFilm?.title,
      taggedFilmYear: postFilm?.year,
      taggedFilmScore: (postFilm as any)?.score || (postFilm as any)?.skorSotoy || undefined,
      taggedFilmGenres: (postFilm as any)?.genres || undefined,
    });
  };

  // Build threaded tree structure for replies
  const replyIdSet = new Set(replies.map(r => r.id));
  const topLevelReplies = replies.filter(r => !r.parentId || !replyIdSet.has(r.parentId));
  const childRepliesMap: Record<string, BuzzReply[]> = {};
  const replyByIdMap: Record<string, BuzzReply> = {};

  replies.forEach(r => {
    replyByIdMap[r.id] = r;
    if (r.parentId && replyIdSet.has(r.parentId)) {
      if (!childRepliesMap[r.parentId]) {
        childRepliesMap[r.parentId] = [];
      }
      childRepliesMap[r.parentId].push(r);
    }
  });

  // Other trending buzz for sidebar
  const otherBuzzList = buzzList
    .filter(b => b.id !== buzz.id)
    .slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Breadcrumbs & Back Navigation */}
      <div className="flex items-center justify-between gap-4">
        <button
          id="buzz-detail-back-btn"
          onClick={() => navigateTo('community-feed')}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition-all shadow-sm group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform text-[#FF2E7E]" />
          <span>Kembali ke Buzz Feed</span>
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span
            onClick={() => navigateTo('home')}
            className="hover:text-slate-300 cursor-pointer"
          >
            Beranda
          </span>
          <span>/</span>
          <span
            onClick={() => navigateTo('community-feed')}
            className="hover:text-slate-300 cursor-pointer"
          >
            Buzz Feed
          </span>
          <span>/</span>
          <span className="text-[#FF2E7E] truncate max-w-[200px]">
            Utas Utama: @{buzz.author.handle.replace('@', '')}
          </span>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left / Center: Main Buzz and Thread Replies */}
        <div className="lg:col-span-8 space-y-6">
          {/* ================================================================= */}
          {/* MAIN BUZZ POST CARD (UTAS UTAMA DARI FEED) */}
          {/* ================================================================= */}
          <article
            id={`buzz-thread-main-${buzz.id}`}
            className="p-6 sm:p-7 rounded-3xl bg-[#171A1F] border border-white/10 shadow-2xl relative overflow-hidden space-y-5"
          >
            {/* Ambient subtle glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF2E7E]/5 rounded-full blur-3xl pointer-events-none" />

            {/* Utas Utama Header Identity Pill */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF2E7E]/10 border border-[#FF2E7E]/30 text-[#FF2E7E] text-xs font-mono font-bold tracking-wide">
                <Flame className="w-3.5 h-3.5 text-[#FF2E7E]" />
                <span>UTAS UTAMA</span>
                <span className="text-[10px] text-slate-400 font-sans font-normal border-l border-white/10 pl-2 hidden xs:inline">Dari Feed Komunitas</span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                Pangkal percakapan diskusi
              </span>
            </div>

            {/* Author Header */}
            <div className="flex items-center justify-between gap-2.5 relative z-10">
              <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
                <button
                  onClick={() => navigateTo('user-profile', { userId: buzz.author.id })}
                  className="relative group shrink-0"
                  title={`Lihat profil ${buzz.author.name}`}
                >
                  <img
                    src={buzz.author.avatar}
                    alt={buzz.author.name}
                    className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl object-cover ring-2 ring-[#FF2E7E]/40 group-hover:ring-[#FF2E7E] transition-all shadow-lg shrink-0"
                  />
                  <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-emerald-500 border-2 border-[#171A1F] rounded-full" />
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <button
                      onClick={() => navigateTo('user-profile', { userId: buzz.author.id })}
                      className={`font-bold text-sm sm:text-lg text-white hover:${getRoleBadgeStyle(buzz.author.role || 'warga_sotoy').text} transition-colors truncate max-w-[130px] xs:max-w-[200px] sm:max-w-none text-left`}
                    >
                      {buzz.author.name}
                    </button>
                    <RoleBadge role={buzz.author.role || 'warga_sotoy'} size="xs" />
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-slate-400 mt-0.5 truncate">
                    <span className="font-mono text-slate-400">{buzz.author.handle}</span>
                    <span>•</span>
                    <span className="text-slate-400" title={formatFullDateTime(buzz.createdAt)}>{formatRelativeTime(buzz.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Delete, Follow Button & Score Badge */}
              <div className="flex items-center gap-2 shrink-0">
                {buzz.skorSotoyMention && (
                  <div className="bg-[#FF2E7E]/10 border border-[#FF2E7E]/30 px-2 py-0.5 rounded-lg text-[#FF2E7E] text-[11px] font-semibold flex items-center gap-1 shrink-0">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{buzz.skorSotoyMention.toFixed(1)}</span>
                  </div>
                )}

                {(!isLoggedIn || currentUser?.id !== buzz.author.id) && (
                  <button
                    onClick={() => {
                      if (!isLoggedIn) {
                        setLoginModalOpen(true);
                        showToast(`Silakan masuk untuk mengikuti ${buzz.author.name}!`);
                        return;
                      }
                      toggleFollowUser(buzz.author.id);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                      isLoggedIn && isFollowing(buzz.author.id)
                        ? 'bg-transparent text-slate-400 border border-white/15 hover:border-red-500/40 hover:text-red-400'
                        : 'bg-transparent text-slate-200 hover:text-white border border-white/20 hover:border-white/40 active:scale-95'
                    }`}
                  >
                    {isLoggedIn && isFollowing(buzz.author.id) ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="hidden xs:inline">Mengikuti</span>
                        <span className="xs:hidden">Ikut</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span>Ikuti</span>
                      </>
                    )}
                  </button>
                )}

                {isLoggedIn && (currentUser?.id === buzz.author.id || currentUser?.role === 'admin') && (
                  <div className="relative buzz-detail-menu-container shrink-0">
                    <button
                      onClick={() => setMenuOpen(prev => !prev)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                      title="Menu Opsi"
                      aria-label="Menu Opsi"
                      aria-expanded={menuOpen}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {menuOpen && (
                      <div
                        className="absolute right-0 top-full mt-1 w-32 bg-[#171A1F] border border-white/10 rounded-xl p-1 shadow-2xl z-30 animate-in fade-in zoom-in-95 duration-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={async () => {
                            setMenuOpen(false);
                            if (window.confirm('Hapus postingan ini?')) {
                              const success = await deleteBuzzPost(buzz.id);
                              if (success) {
                                navigateTo('community-feed');
                              }
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

            {/* Post Content */}
            <div className="text-slate-100 text-base sm:text-lg leading-relaxed whitespace-pre-line font-normal">
              <MentionText content={buzz.content} />
            </div>

            {/* Attached Photo */}
            <BuzzImageAttachment src={buzz.image} alt={`Foto postingan ${buzz.author.name}`} />

            {/* Hashtags */}
            {buzz.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {buzz.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    onClick={() => navigateTo('community-feed')}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/10 text-[#FF2E7E] hover:border-[#FF2E7E]/50 transition-colors cursor-pointer"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Tagged Film Preview Card */}
            {postFilm && (
              <div
                id={`buzz-detail-tagged-film-${postFilm.id}`}
                onClick={() => navigateTo('film-detail', { filmId: postFilm.id })}
                className="p-4 rounded-2xl bg-[#0E1013] border border-white/10 hover:border-[#FF2E7E]/50 transition-all cursor-pointer group flex items-center justify-between gap-4 shadow-lg"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={'poster' in postFilm ? (postFilm as any).poster : 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=300&q=80'}
                    alt={postFilm.title}
                    className="w-16 h-22 sm:w-20 sm:h-28 rounded-xl object-cover shrink-0 shadow-lg border border-white/10 group-hover:scale-105 transition-transform"
                  />
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#FF2E7E] text-white font-black text-[9px] uppercase px-2 py-0.5 rounded">
                        FILM TERTAUT
                      </span>
                      {'year' in postFilm && (
                        <span className="text-slate-400 text-xs font-semibold">
                          {(postFilm as any).year}
                        </span>
                      )}
                    </div>
                    <h4 className="font-display font-black text-base text-white group-hover:text-[#FF2E7E] transition-colors truncate">
                      {postFilm.title}
                    </h4>
                    {'genres' in postFilm && (postFilm as any).genres && (
                      <p className="text-xs text-slate-400 truncate">
                        {(postFilm as any).genres.join(', ')}
                      </p>
                    )}
                    <div className="flex items-center gap-2 pt-1 text-xs text-[#FF2E7E] font-medium">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{'skorSotoy' in postFilm ? (postFilm as any).skorSotoy.toFixed(1) : '9.8'}</span>
                      <span className="text-[10px] text-slate-500 font-normal">• Skor Sotoy</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1 text-xs font-bold text-[#FF2E7E] group-hover:translate-x-1 transition-transform">
                  <span className="hidden sm:inline">Buka Halaman Film</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            )}

            {/* Tagged Article Preview Card */}
            {postArticle && (
              <div
                id={`buzz-detail-tagged-article-${postArticle.id}`}
                onClick={() => navigateTo('article-detail', { articleId: postArticle.id })}
                className="p-4 rounded-2xl bg-[#0E1013] border border-white/10 hover:border-[#FF2E7E]/50 transition-all cursor-pointer group flex items-center justify-between gap-4 shadow-lg"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={'coverImage' in postArticle ? (postArticle as any).coverImage : 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=400&q=80'}
                    alt={postArticle.title}
                    className="w-20 sm:w-24 h-16 sm:h-20 rounded-xl object-cover shrink-0 shadow-lg border border-white/10 group-hover:scale-105 transition-transform"
                  />
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#FF2E7E] text-white font-black text-[9px] uppercase px-2 py-0.5 rounded">
                        ARTIKEL TERTAUT
                      </span>
                      {'category' in postArticle && (
                        <span className="text-slate-400 text-xs font-semibold capitalize">
                          {(postArticle as any).category}
                        </span>
                      )}
                    </div>
                    <h4 className="font-display font-black text-sm text-white group-hover:text-[#FF2E7E] transition-colors line-clamp-2 leading-snug">
                      {postArticle.title}
                    </h4>
                    <div className="text-[11px] text-slate-400">
                      {'authorName' in postArticle ? (postArticle as any).authorName : 'Penulis Redaksi'}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1 text-xs font-bold text-[#FF2E7E] group-hover:translate-x-1 transition-transform">
                  <span className="hidden sm:inline">Baca Artikel</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            )}

            {/* Interaction Action Bar with Quick Reactions */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-4 text-xs text-slate-400 select-none">
              <div className="flex items-center gap-4 sm:gap-6">
                <QuickReactionBar
                  buzzId={buzz.id}
                  reactions={buzz.reactions}
                  myReaction={buzz.myReaction}
                />

                <button
                  onClick={() => {
                    setReplyingTo(null);
                    const comp = document.getElementById('buzz-reply-composer');
                    comp?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-opacity hover:opacity-80 active:scale-95 cursor-pointer text-xs shrink-0 py-1"
                  title="Balas Utas ini"
                >
                  <MessageSquare className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-current" />
                  <span className="font-medium text-slate-400">{replies.length}</span>
                </button>

                <button
                  id={`buzz-detail-repost-${buzz.id}`}
                  onClick={() => toggleRepostBuzzPost(buzz.id)}
                  disabled={currentUser?.id === buzz.author?.id}
                  className={`flex items-center gap-1.5 transition-opacity hover:opacity-80 active:scale-95 text-xs shrink-0 py-1 cursor-pointer ${
                    currentUser?.id && buzz.repostedByUsers?.[currentUser.id]
                      ? 'text-emerald-400'
                      : currentUser?.id === buzz.author?.id
                        ? 'text-slate-600 cursor-not-allowed opacity-50'
                        : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={
                    currentUser?.id === buzz.author?.id
                      ? 'Kamu tidak bisa me-repost postinganmu sendiri'
                      : currentUser?.id && buzz.repostedByUsers?.[currentUser.id]
                        ? 'Batalkan Repost'
                        : 'Repost'
                  }
                >
                  <Repeat2 className={`w-4 h-4 sm:w-[18px] sm:h-[18px] ${currentUser?.id && buzz.repostedByUsers?.[currentUser.id] ? 'stroke-[2.2]' : ''}`} />
                  <span className={`font-medium ${currentUser?.id && buzz.repostedByUsers?.[currentUser.id] ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {buzz.repostsCount || 0}
                  </span>
                </button>

                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-opacity hover:opacity-80 active:scale-95 cursor-pointer text-xs shrink-0 py-1"
                  title="Bagikan Buzz ini"
                >
                  <Share2 className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-current" />
                </button>
              </div>
            </div>
          </article>

          {/* ================================================================= */}
          {/* THREAD REPLIES SECTION */}
          {/* ================================================================= */}
          <section className="space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FF2E7E]/15 text-[#FF2E7E] flex items-center justify-center border border-[#FF2E7E]/25 shadow-sm shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-black text-lg text-white flex items-center gap-2">
                    <span>Balasan Diskusi</span>
                    <span className="text-sm font-mono text-[#FF2E7E] font-bold">({replies.length})</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Opini sesama warga & kurator
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/10 text-[11px] font-medium text-slate-300">
                  <MessageSquare className="w-3.5 h-3.5 text-[#FF2E7E]" />
                  <span>{topLevelReplies.length} balasan</span>
                  {replies.length > topLevelReplies.length && (
                    <span className="text-[#FF2E7E] font-mono">
                      • {replies.length - topLevelReplies.length} sub-balasan
                    </span>
                  )}
                </span>
                <span className="hidden sm:inline text-slate-500">• Percakapan berjenjang</span>
              </div>
            </div>

            {/* Reply Input Box */}
            <div
              id="buzz-reply-composer"
              className="p-5 rounded-3xl bg-[#171A1F] border border-white/10 shadow-xl space-y-3 transition-all"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {isLoggedIn ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="w-9 h-9 rounded-xl object-cover ring-2 ring-white/10 shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center text-slate-400 ring-2 ring-white/10 shrink-0">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block truncate">
                      {isLoggedIn ? `Menanggapi sebagai ${currentUser.name}` : 'Tamu Cinephile'}
                    </span>
                    <span className="text-[10px] text-[#FF2E7E] font-mono">
                      {isLoggedIn ? `${currentUser.handle} • ${currentUser.roleTitle}` : 'Silakan masuk untuk membalas'}
                    </span>
                  </div>
                </div>

                {replyingTo && (
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">Batal Balas</span>
                  </button>
                )}
              </div>

              {replyingTo ? (
                <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-[#FF2E7E]/10 border border-[#FF2E7E]/30 text-xs text-[#FF2E7E] animate-in fade-in">
                  <div className="flex items-center gap-2 min-w-0">
                    <CornerDownRight className="w-4 h-4 shrink-0 text-[#FF2E7E]" />
                    <div className="truncate">
                      <span className="font-bold">
                        Membalas komentar @{replyingTo.user.handle.replace('@', '')}
                      </span>
                      <span className="text-slate-400 ml-1.5 hidden sm:inline">
                        ({replyingTo.user.name}) • Balasan akan tersusun di bawah komentar ini
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
                    title="Batal membalas komentar ini"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] text-slate-400">
                  <CornerDownRight className="w-3.5 h-3.5 text-[#FF2E7E]" />
                  <span>
                    Membalas langsung ke <span className="text-[#FF2E7E] font-semibold">Utas Utama</span>
                  </span>
                </div>
              )}

              <form onSubmit={handleSendReply} className="space-y-3">
                <MentionInput
                  value={replyText}
                  onChange={setReplyText}
                  placeholder={
                    replyingTo
                      ? `Tulis balasan kepada @${replyingTo.user.handle.replace('@', '')}... (Gunakan '@' untuk mention)`
                      : `Tulis tanggapan untuk utas @${buzz.author.handle.replace('@', '')}... (Gunakan '@' untuk mention)`
                  }
                  rows={3}
                  className="w-full bg-[#0E1013] border border-white/10 rounded-2xl p-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E] transition-colors resize-none"
                />

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <button
                      type="button"
                      onClick={() =>
                        setReplyText(prev =>
                          prev.includes(`@${buzz.author.handle.replace('@', '')}`)
                            ? prev
                            : `@${buzz.author.handle.replace('@', '')} ${prev}`
                        )
                      }
                      className="hover:text-[#FF2E7E] transition-colors text-[11px] font-mono flex items-center gap-1 bg-white/[0.06] border border-white/10 px-2 py-1 rounded-lg text-slate-300"
                    >
                      <AtSign className="w-3 h-3 text-[#FF2E7E]" />
                      <span>Mention Penulis Utas</span>
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={!replyText.trim() || isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-[#FF2E7E] hover:bg-[#e0266e] text-white font-black text-xs uppercase tracking-wider shadow-md hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {isSubmitting
                        ? 'Mengirim...'
                        : replyingTo
                          ? 'Kirim Balasan'
                          : 'Kirim Tanggapan'}
                    </span>
                  </button>
                </div>
              </form>
            </div>

            {/* Threaded Replies List */}
            {replies.length === 0 ? (
              <div className="p-8 rounded-3xl bg-[#171A1F]/40 border border-dashed border-white/10 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#FF2E7E]/10 text-[#FF2E7E] flex items-center justify-center mx-auto">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-white text-base">Belum Ada Balasan</h4>
                <p className="text-slate-400 text-xs max-w-sm mx-auto">
                  Jadilah orang pertama yang menanggapi argumen atau opini di Utas Utama dari {buzz.author.name}!
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {topLevelReplies.map(topReply => {
                  const renderReplyNode = (
                    reply: BuzzReply,
                    depth = 0,
                    isLastChild = false,
                    parentReply?: BuzzReply
                  ): React.ReactNode => {
                    const childReplies = childRepliesMap[reply.id] || [];
                    const hasChildren = childReplies.length > 0;
                    const isCollapsed = Boolean(collapsedThreads[reply.id]);
                    const isReplyingToThis = replyingTo?.replyId === reply.id;
                    const isHighlighted = highlightedReplyId === reply.id;

                    // Resolve replied-to target author
                    const targetUser = reply.replyToUser || (parentReply ? {
                      id: parentReply.author.id,
                      name: parentReply.author.name,
                      handle: parentReply.author.handle,
                    } : null);

                    // Hierarchy styling depending on thread depth
                    const cardBg = depth === 0
                      ? 'bg-[#171A1F] border-white/10 hover:border-white/20 shadow-lg border-l-4 border-l-[#FF2E7E]'
                      : depth === 1
                        ? 'bg-[#111317] border-white/10 hover:border-[#FF2E7E]/40 shadow-md border-l-2 border-l-[#FF2E7E]/60'
                        : 'bg-[#0E1013] border-white/10 hover:border-white/20 shadow-sm border-l-2 border-l-white/20';

                    const avatarSize = depth === 0
                      ? 'w-9 h-9 sm:w-10 sm:h-10'
                      : depth === 1
                        ? 'w-8 h-8 sm:w-9 sm:h-9'
                        : 'w-7.5 h-7.5 sm:w-8 sm:h-8';

                    return (
                      <div key={reply.id} className="relative group/replyNode">
                        {/* Nested Tree Connectors (Vertical Trunk Line + Horizontal Curved Elbow) */}
                        {depth > 0 && (
                          <>
                            {/* Vertical trunk line from ancestor */}
                            <div
                              className={`absolute left-0 top-0 w-[2px] bg-white/10 group-hover/replyNode:bg-[#FF2E7E]/60 transition-colors pointer-events-none ${
                                isLastChild ? 'h-6 sm:h-7' : 'bottom-0'
                              }`}
                              aria-hidden="true"
                            />
                            {/* Curved elbow branch turning right into this comment card */}
                            <div
                              className="absolute left-0 top-5 sm:top-6 w-3.5 sm:w-6 h-4 sm:h-5 border-b-2 border-l-2 border-white/10 rounded-bl-xl group-hover/replyNode:border-[#FF2E7E]/80 transition-colors pointer-events-none"
                              aria-hidden="true"
                            />
                          </>
                        )}

                        <div className={depth > 0 ? 'pl-3.5 sm:pl-6' : ''}>
                          <div
                            id={`buzz-reply-card-${reply.id}`}
                            className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 space-y-3 relative ${cardBg} ${
                              isReplyingToThis
                                ? 'ring-2 ring-[#FF2E7E] shadow-lg shadow-[#FF2E7E]/25 bg-[#1C1F26]'
                                : isHighlighted
                                  ? 'ring-2 ring-[#FF2E7E] shadow-xl shadow-[#FF2E7E]/30 scale-[1.006]'
                                  : ''
                            }`}
                          >
                            {/* Header Context / In-reply-to Chip */}
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              {targetUser ? (
                                <button
                                  type="button"
                                  onClick={() => reply.parentId && jumpToParentReply(reply.parentId)}
                                  className="inline-flex items-center gap-1.5 text-[11px] text-[#FF2E7E] hover:text-white font-mono font-medium bg-[#FF2E7E]/10 hover:bg-[#FF2E7E]/20 border border-[#FF2E7E]/25 px-2.5 py-0.5 rounded-lg transition-all group/chip"
                                  title="Klik untuk melompat ke komentar induk"
                                >
                                  <CornerDownRight className="w-3 h-3 shrink-0 text-[#FF2E7E] group-hover/chip:translate-x-0.5 transition-transform" />
                                  <span>
                                    Membalas <span className="font-bold text-white">@{targetUser.handle.replace('@', '')}</span>
                                  </span>
                                  {reply.parentId && (
                                    <span className="text-[10px] text-slate-400 group-hover/chip:text-[#FF2E7E] transition-colors ml-1">
                                      ↑ Ke Komentar Induk
                                    </span>
                                  )}
                                </button>
                              ) : null}
                            </div>

                            {/* Author Row */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <button
                                  onClick={() => navigateTo('user-profile', { userId: reply.author.id })}
                                  className="shrink-0 group/avatar"
                                  title={`Lihat profil ${reply.author.name}`}
                                >
                                  <img
                                    src={reply.author.avatar}
                                    alt={reply.author.name}
                                    className={`${avatarSize} rounded-xl object-cover ring-2 ring-white/10 group-hover/avatar:ring-[#FF2E7E] transition-all shadow-md`}
                                  />
                                </button>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                      onClick={() => navigateTo('user-profile', { userId: reply.author.id })}
                                      className="font-bold text-sm text-white hover:text-[#FF2E7E] transition-colors truncate"
                                    >
                                      {reply.author.name}
                                    </button>
                                    <RoleBadge role={reply.author.role || 'warga_sotoy'} size="xs" />
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                    <span className="font-mono">{reply.author.handle}</span>
                                    <span>•</span>
                                    <span title={formatFullDateTime(reply.createdAt)}>{formatRelativeTime(reply.createdAt)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Subthread collapse toggle (if this comment has replies beneath it) */}
                              {hasChildren && (
                                <button
                                  type="button"
                                  onClick={() => toggleThreadCollapse(reply.id)}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold text-slate-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 transition-all shrink-0 shadow-sm cursor-pointer"
                                  title={isCollapsed ? 'Buka balasan' : 'Sembunyikan balasan'}
                                >
                                  <GitBranch className="w-3.5 h-3.5 text-[#FF2E7E]" />
                                  <span className="hidden xs:inline">{childReplies.length} Balasan</span>
                                  <span className="xs:hidden">{childReplies.length}</span>
                                  {isCollapsed ? (
                                    <ChevronDown className="w-3 h-3 text-[#FF2E7E]" />
                                  ) : (
                                    <ChevronUp className="w-3 h-3 text-slate-400" />
                                  )}
                                </button>
                              )}
                            </div>

                            {/* Reply Content */}
                            <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-line pl-1 sm:pl-2">
                              <MentionText content={reply.content} />
                            </div>

                            {/* Actions Toolbar: Minimal Threads-style Icon Row */}
                            <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-3 text-xs text-slate-400">
                              <div className="flex items-center gap-4 sm:gap-5">
                                <button
                                  onClick={() => likeBuzzReply(buzz.id, reply.id)}
                                  className={`flex items-center gap-1.5 transition-opacity hover:opacity-80 active:scale-95 text-xs py-1 cursor-pointer ${
                                    reply.likedByMe
                                      ? 'text-[#FF2E7E]'
                                      : 'text-slate-400 hover:text-slate-200'
                                  }`}
                                  title="Suka balasan"
                                >
                                  <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${reply.likedByMe ? 'fill-current text-[#FF2E7E]' : 'text-current'}`} />
                                  <span className={`font-medium ${reply.likedByMe ? 'text-[#FF2E7E]' : 'text-slate-400'}`}>
                                    {reply.likes || 0}
                                  </span>
                                </button>

                                <button
                                  onClick={() => handleStartReply(reply.id, reply.author)}
                                  className={`flex items-center gap-1.5 transition-opacity hover:opacity-80 active:scale-95 text-xs py-1 cursor-pointer ${
                                    isReplyingToThis
                                      ? 'text-[#FF2E7E] font-semibold'
                                      : 'text-slate-400 hover:text-slate-200'
                                  }`}
                                  title={`Balas komentar @${reply.author.handle.replace('@', '')}`}
                                >
                                  <CornerDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  <span className="font-medium">Balas</span>
                                </button>

                                {isLoggedIn && (currentUser?.id === reply.author.id || currentUser?.role === 'admin') && (
                                  <button
                                    onClick={async () => {
                                      if (window.confirm('Hapus balasan ini?')) {
                                        await deleteBuzzReply(buzz.id, reply.id);
                                      }
                                    }}
                                    className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-red-400 transition-colors p-1 cursor-pointer"
                                    title="Hapus Balasan"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span className="hidden xs:inline">Hapus</span>
                                  </button>
                                )}
                              </div>

                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(`"${reply.content}" - ${reply.author.name} di Sotoy Film`);
                                  showToast('Teks balasan disalin ke clipboard!');
                                }}
                                className="text-[10px] text-slate-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                                title="Salin kutipan komentar ini"
                              >
                                <Quote className="w-3 h-3" />
                                <span>Salin Kutipan</span>
                              </button>
                            </div>
                          </div>

                          {/* Sub-threads / Child Replies indented with connecting tree branches */}
                          {hasChildren && (
                            <div className="mt-3">
                              {isCollapsed ? (
                                /* Collapsed Sub-thread Banner */
                                <button
                                  type="button"
                                  onClick={() => toggleThreadCollapse(reply.id)}
                                  className="w-full my-2 p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-dashed border-white/10 hover:border-[#FF2E7E]/50 text-xs text-slate-400 hover:text-[#FF2E7E] flex items-center justify-between gap-3 transition-all cursor-pointer group/collapsed"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <GitBranch className="w-3.5 h-3.5 text-[#FF2E7E]" />
                                    <span className="font-semibold truncate">
                                      Balasan disembunyikan ({childReplies.length} balasan)
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-slate-500 group-hover/collapsed:text-[#FF2E7E] font-medium shrink-0 flex items-center gap-1">
                                    <span>Buka balasan</span>
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </span>
                                </button>
                              ) : (
                                /* Expanded Child Replies Branch */
                                <div
                                  className={`space-y-3 pt-1 relative ${
                                    depth === 0
                                      ? 'ml-2 sm:ml-4'
                                      : 'ml-1 sm:ml-2'
                                  }`}
                                >
                                  {childReplies.map((child, idx) => {
                                    const isLast = idx === childReplies.length - 1;
                                    return renderReplyNode(child, depth + 1, isLast, reply);
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  };

                  return renderReplyNode(topReply, 0, false, undefined);
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right Sidebar: Other Buzz Posts & Widget */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Trending Buzz Posts */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[#171A1F] border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h4 className="font-display font-black text-sm text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#FF2E7E]" />
                <span>Buzz Komunitas Lainnya</span>
              </h4>
              <button
                onClick={() => navigateTo('community-feed')}
                className="text-[11px] font-bold text-[#FF2E7E] hover:underline"
              >
                Lihat Semua
              </button>
            </div>

            <div className="space-y-3">
              {otherBuzzList.map(item => (
                <div
                  key={item.id}
                  onClick={() => navigateTo('buzz-detail', { buzzId: item.id })}
                  className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-[#FF2E7E]/40 transition-all cursor-pointer group space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={item.author.avatar}
                      alt={item.author.name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span className="text-xs font-bold text-white truncate">
                      {item.author.name}
                    </span>
                    <span className="text-[10px] text-slate-400" title={formatFullDateTime(item.createdAt)}>• {formatRelativeTime(item.createdAt)}</span>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2 group-hover:text-slate-100 transition-colors leading-relaxed">
                    {item.content}
                  </p>

                  <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-1 border-t border-white/10">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3 text-[#FF2E7E]" />
                      {item.likes || 0}
                    </span>
                    <span className="flex items-center gap-1 text-[#FF2E7E] font-bold group-hover:translate-x-0.5 transition-transform">
                      <MessageSquare className="w-3 h-3" />
                      {item.repliesCount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ad Slot Banner */}
          <AdBannerSlot variant="sidebar" />
        </aside>
      </div>
    </div>
  );
};
