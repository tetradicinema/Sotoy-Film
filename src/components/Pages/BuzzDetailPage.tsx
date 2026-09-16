import React, { useState } from 'react';
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
  TrendingUp,
  Flame,
  CornerDownRight,
  Quote,
  X,
  AtSign,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AdBannerSlot } from '../Common/AdBannerSlot';
import { QuickReactionBar } from '../Common/QuickReactionBar';
import { MentionText } from '../Common/MentionText';
import { MentionInput } from '../Common/MentionInput';
import { BuzzReply } from '../../types';

export const BuzzDetailPage: React.FC = () => {
  const {
    buzzList,
    selectedBuzzId,
    currentUser,
    isLoggedIn,
    setLoginModalOpen,
    navigateTo,
    likeBuzzPost,
    addBuzzReply,
    likeBuzzReply,
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
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#FF2E7E] to-[#FF8008] text-white font-bold text-sm shadow-lg shadow-[#FF2E7E]/25 hover:brightness-110 transition-all"
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
    openShareModal({
      title: `Buzz Diskusi: ${buzz.author.name}`,
      text: buzz.content,
      tags: buzz.tags,
      type: 'buzz',
      image: buzz.author.avatar,
      imageUrl: buzz.author.avatar,
      authorAvatar: buzz.author.avatar,
      authorName: buzz.author.name,
      meta: buzz.taggedFilm ? `Membahas film ${buzz.taggedFilm.title}` : `@${buzz.author.handle} di Sotoy Film`,
    });
  };

  // Build threaded tree structure for replies
  const topLevelReplies = replies.filter(r => !r.parentId);
  const childRepliesMap: Record<string, BuzzReply[]> = {};

  replies.forEach(r => {
    if (r.parentId) {
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
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 text-xs font-bold transition-all shadow-sm group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform text-[#00F0FF]" />
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
          <span className="text-[#00F0FF] truncate max-w-[200px]">
            Diskusi @{buzz.author.handle.replace('@', '')}
          </span>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left / Center: Main Buzz and Thread Replies */}
        <div className="lg:col-span-8 space-y-6">
          {/* ================================================================= */}
          {/* MAIN BUZZ POST CARD */}
          {/* ================================================================= */}
          <article
            id={`buzz-thread-main-${buzz.id}`}
            className="p-6 sm:p-7 rounded-3xl bg-[#121324] border border-slate-800 shadow-2xl relative overflow-hidden space-y-5"
          >
            {/* Ambient subtle glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#00F0FF]/5 rounded-full blur-3xl pointer-events-none" />

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
                    className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl object-cover ring-2 ring-[#00F0FF]/40 group-hover:ring-[#00F0FF] transition-all shadow-lg shrink-0"
                  />
                  <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-emerald-500 border-2 border-[#121324] rounded-full" />
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <button
                      onClick={() => navigateTo('user-profile', { userId: buzz.author.id })}
                      className="font-bold text-sm sm:text-lg text-white hover:text-[#00F0FF] transition-colors truncate max-w-[130px] xs:max-w-[200px] sm:max-w-none text-left"
                    >
                      {buzz.author.name}
                    </button>
                    <span className="text-[9px] sm:text-[10px] uppercase font-black px-1.5 sm:px-2 py-0.5 rounded-full bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 shrink-0">
                      {buzz.author.role === 'si_paling_sotoy'
                        ? 'Si Paling Sotoy'
                        : buzz.author.role === 'penulis_sotoy'
                        ? 'Penulis Sotoy'
                        : buzz.author.role === 'admin'
                        ? 'Admin'
                        : 'Warga Sotoy'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-slate-400 mt-0.5 truncate">
                    <span className="font-mono text-slate-400">{buzz.author.handle}</span>
                    <span>•</span>
                    <span className="text-slate-400">{buzz.createdAt}</span>
                  </div>
                </div>
              </div>

              {/* Follow Button & Score Badge */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {currentUser.id !== buzz.author.id && (
                  <button
                    onClick={() => {
                      if (!isLoggedIn) {
                        setLoginModalOpen(true);
                        showToast(`Silakan masuk untuk mengikuti ${buzz.author.name}!`);
                        return;
                      }
                      toggleFollowUser(buzz.author.id);
                    }}
                    className={`px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 shadow-sm shrink-0 ${
                      isLoggedIn && isFollowing(buzz.author.id)
                        ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/40'
                        : 'bg-gradient-to-r from-[#FF2E7E] to-[#FF8008] text-white hover:brightness-110 active:scale-95'
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
                        <UserPlus className="w-3.5 h-3.5 shrink-0" />
                        <span>+ Ikuti</span>
                      </>
                    )}
                  </button>
                )}

                {buzz.skorSotoyMention && (
                  <div className="bg-[#FFD000]/15 border border-[#FFD000]/40 px-2 py-0.5 sm:px-3 sm:py-1 rounded-xl text-[#FFD000] text-[11px] sm:text-xs font-black flex items-center gap-1 shrink-0">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{buzz.skorSotoyMention.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Post Content */}
            <div className="text-slate-100 text-base sm:text-lg leading-relaxed whitespace-pre-line font-normal">
              <MentionText content={buzz.content} />
            </div>

            {/* Hashtags */}
            {buzz.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {buzz.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    onClick={() => navigateTo('community-feed')}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[#00F0FF] hover:border-[#00F0FF]/50 transition-colors cursor-pointer"
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
                className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-[#16182D] border border-[#00F0FF]/30 hover:border-[#00F0FF] transition-all cursor-pointer group flex items-center justify-between gap-4 shadow-lg"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={'poster' in postFilm ? (postFilm as any).poster : 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=300&q=80'}
                    alt={postFilm.title}
                    className="w-16 h-22 sm:w-20 sm:h-28 rounded-xl object-cover shrink-0 shadow-lg border border-white/10 group-hover:scale-105 transition-transform"
                  />
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#00F0FF] text-slate-950 font-black text-[9px] uppercase px-2 py-0.5 rounded">
                        FILM TERTAUT
                      </span>
                      {'year' in postFilm && (
                        <span className="text-slate-400 text-xs font-semibold">
                          {(postFilm as any).year}
                        </span>
                      )}
                    </div>
                    <h4 className="font-display font-black text-base text-white group-hover:text-[#00F0FF] transition-colors truncate">
                      {postFilm.title}
                    </h4>
                    {'genres' in postFilm && (postFilm as any).genres && (
                      <p className="text-xs text-slate-400 truncate">
                        {(postFilm as any).genres.join(', ')}
                      </p>
                    )}
                    <div className="flex items-center gap-2 pt-1 text-xs text-[#FFD000] font-bold">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{'skorSotoy' in postFilm ? (postFilm as any).skorSotoy.toFixed(1) : '4.9'}</span>
                      <span className="text-[10px] text-slate-500 font-normal">• Skor Sotoy</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1 text-xs font-bold text-[#00F0FF] group-hover:translate-x-1 transition-transform">
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
                className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-[#1F1426] border border-[#FF2E7E]/30 hover:border-[#FF2E7E] transition-all cursor-pointer group flex items-center justify-between gap-4 shadow-lg"
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
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-2 text-xs text-slate-400">
              <div className="overflow-x-auto scrollbar-none min-w-0 flex-1 pr-1">
                <QuickReactionBar
                  buzzId={buzz.id}
                  reactions={buzz.reactions}
                  myReaction={buzz.myReaction}
                />
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <div className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-semibold text-xs shrink-0">
                  <MessageSquare className="w-3.5 h-3.5 text-[#00F0FF]" />
                  <span>{replies.length} <span className="hidden xs:inline">Balasan</span></span>
                </div>

                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 p-1.5 sm:px-3.5 sm:py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-[#00F0FF]/50 text-slate-300 hover:text-[#00F0FF] transition-all font-semibold text-xs shrink-0"
                  title="Bagikan Buzz ini ke Instagram Stories atau WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Bagikan</span>
                </button>
              </div>
            </div>
          </article>

          {/* ================================================================= */}
          {/* THREAD REPLIES SECTION */}
          {/* ================================================================= */}
          <section className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#00F0FF]/15 text-[#00F0FF] flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <h3 className="font-display font-black text-lg text-white">
                  Thread Balasan Diskusi ({replies.length})
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                Opini sesama warga & kurator
              </span>
            </div>

            {/* Reply Input Box */}
            <div
              id="buzz-reply-composer"
              className="p-5 rounded-3xl bg-[#151628] border border-slate-800 shadow-xl space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-9 h-9 rounded-xl object-cover ring-2 ring-slate-700 shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block truncate">
                      Membalas sebagai {currentUser.name}
                    </span>
                    <span className="text-[10px] text-[#00F0FF] font-mono">
                      {currentUser.handle} • {currentUser.roleTitle}
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

              {replyingTo && (
                <div className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-2xl bg-[#00F0FF]/10 border border-[#00F0FF]/30 text-xs text-[#00F0FF] animate-in fade-in">
                  <div className="flex items-center gap-2 min-w-0">
                    <CornerDownRight className="w-4 h-4 shrink-0" />
                    <span className="font-bold truncate">
                      Membalas Utas @{replyingTo.user.handle.replace('@', '')} ({replyingTo.user.name})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <form onSubmit={handleSendReply} className="space-y-3">
                <MentionInput
                  value={replyText}
                  onChange={setReplyText}
                  placeholder={
                    replyingTo
                      ? `Tulis balasan khusus kepada @${replyingTo.user.handle.replace('@', '')}... (Gunakan '@' untuk mention warga)`
                      : `Tulis balasan atau argumen sotoy kamu kepada ${buzz.author.name}... (Gunakan '@' untuk mention)`
                  }
                  rows={3}
                  className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00F0FF] transition-colors resize-none"
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
                      className="hover:text-[#00F0FF] transition-colors text-[11px] font-mono flex items-center gap-1 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg"
                    >
                      <AtSign className="w-3 h-3 text-[#00F0FF]" />
                      <span>Mention Penulis</span>
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={!replyText.trim() || isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00F0FF] to-[#3B82F6] text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-[#00F0FF]/20 hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Mengirim...' : 'Kirim Balasan'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Threaded Replies List */}
            {replies.length === 0 ? (
              <div className="p-8 rounded-3xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#00F0FF]/10 text-[#00F0FF] flex items-center justify-center mx-auto">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-white text-base">Belum Ada Balasan di Thread Ini</h4>
                <p className="text-slate-400 text-xs max-w-sm mx-auto">
                  Jadilah orang pertama yang menanggapi argumen atau opini sinema dari {buzz.author.name}!
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {topLevelReplies.map(topReply => {
                  const renderReplyNode = (reply: BuzzReply, isChild = false) => {
                    const childReplies = childRepliesMap[reply.id] || [];

                    return (
                      <div key={reply.id} className="space-y-3">
                        <div
                          id={`buzz-reply-card-${reply.id}`}
                          className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3 relative group ${
                            isChild
                              ? 'bg-[#141528] border-slate-800/80 hover:border-[#00F0FF]/40 shadow-md'
                              : 'bg-slate-900/80 border-slate-800/90 hover:border-slate-700'
                          }`}
                        >
                          {/* If replying to a user directly */}
                          {reply.replyToUser && (
                            <div className="flex items-center gap-1.5 text-[11px] text-[#00F0FF] font-mono font-semibold bg-[#00F0FF]/10 border border-[#00F0FF]/25 px-2.5 py-0.5 rounded-lg w-fit">
                              <CornerDownRight className="w-3 h-3 shrink-0" />
                              <span>Membalas @{reply.replyToUser.handle.replace('@', '')} ({reply.replyToUser.name})</span>
                            </div>
                          )}

                          {/* Header Author Reply */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <button
                                onClick={() => navigateTo('user-profile', { userId: reply.author.id })}
                                className="shrink-0"
                                title={`Lihat profil ${reply.author.name}`}
                              >
                                <img
                                  src={reply.author.avatar}
                                  alt={reply.author.name}
                                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover ring-2 ring-slate-800 hover:ring-[#00F0FF] transition-all"
                                />
                              </button>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <button
                                    onClick={() => navigateTo('user-profile', { userId: reply.author.id })}
                                    className="font-bold text-sm text-white hover:text-[#00F0FF] transition-colors truncate"
                                  >
                                    {reply.author.name}
                                  </button>
                                  <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                    {reply.author.role === 'si_paling_sotoy'
                                      ? 'Kritikus'
                                      : reply.author.role === 'penulis_sotoy'
                                      ? 'Redaksi'
                                      : reply.author.role === 'admin'
                                      ? 'Admin'
                                      : 'Warga'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                  <span className="font-mono">{reply.author.handle}</span>
                                  <span>•</span>
                                  <span>{reply.createdAt}</span>
                                </div>
                              </div>
                            </div>

                            {/* Reply Like Action */}
                            <button
                              onClick={() => likeBuzzReply(buzz.id, reply.id)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all ${
                                reply.likedByMe
                                  ? 'text-[#FF2E7E] font-bold bg-[#FF2E7E]/10'
                                  : 'text-slate-400 hover:text-[#FF2E7E] hover:bg-slate-800'
                              }`}
                              title="Sukai balasan ini"
                            >
                              <Heart className={`w-3.5 h-3.5 ${reply.likedByMe ? 'fill-current' : ''}`} />
                              <span>{reply.likes}</span>
                            </button>
                          </div>

                          {/* Reply Content */}
                          <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-line pl-1 sm:pl-2">
                            <MentionText content={reply.content} />
                          </div>

                          {/* Quick quote / mention button */}
                          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                            <button
                              onClick={() => handleStartReply(reply.id, reply.author)}
                              className="flex items-center gap-1 text-[11px] font-bold text-[#00F0FF] hover:bg-[#00F0FF]/15 px-2.5 py-1 rounded-lg transition-colors"
                            >
                              <CornerDownRight className="w-3.5 h-3.5" />
                              <span>Balas Utas @{reply.author.handle.replace('@', '')}</span>
                            </button>

                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`"${reply.content}" - ${reply.author.name} di Sotoy Film`);
                                showToast('Teks balasan disalin ke clipboard!');
                              }}
                              className="text-[10px] text-slate-400 hover:text-white transition-colors"
                            >
                              Salin Kutipan
                            </button>
                          </div>
                        </div>

                        {/* Render Sub-threads / Child Replies indented */}
                        {childReplies.length > 0 && (
                          <div className="border-l-2 border-[#00F0FF]/30 ml-3 sm:ml-6 pl-3 sm:pl-5 space-y-3 pt-1">
                            {childReplies.map(child => renderReplyNode(child, true))}
                          </div>
                        )}
                      </div>
                    );
                  };

                  return renderReplyNode(topReply, false);
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right Sidebar: Other Buzz Posts & Widget */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Trending Buzz Posts */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[#121324] border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-display font-black text-sm text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#FFD000]" />
                <span>Buzz Komunitas Lainnya</span>
              </h4>
              <button
                onClick={() => navigateTo('community-feed')}
                className="text-[11px] font-bold text-[#00F0FF] hover:underline"
              >
                Lihat Semua
              </button>
            </div>

            <div className="space-y-3">
              {otherBuzzList.map(item => (
                <div
                  key={item.id}
                  onClick={() => navigateTo('buzz-detail', { buzzId: item.id })}
                  className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-[#00F0FF]/40 transition-all cursor-pointer group space-y-2"
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
                    <span className="text-[10px] text-slate-400">• {item.createdAt}</span>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2 group-hover:text-slate-100 transition-colors leading-relaxed">
                    {item.content}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/50">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3 text-[#FF2E7E]" />
                      {item.likes} Suka
                    </span>
                    <span className="flex items-center gap-1 text-[#00F0FF] font-bold group-hover:translate-x-0.5 transition-transform">
                      <MessageSquare className="w-3 h-3" />
                      {item.repliesCount} Balasan →
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
