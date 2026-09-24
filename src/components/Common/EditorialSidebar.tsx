import React, { useState } from 'react';
import {
  Sparkles,
  MessageSquare,
  Flame,
  Send,
  Heart,
  Film,
  ArrowRight,
  TrendingUp,
  Share2,
  User as UserIcon,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getRoleBadgeStyle } from '../../utils/roleStyles';
import { RoleBadge } from './RoleBadge';
import { AdBannerSlot } from './AdBannerSlot';
import { QuickReactionBar } from './QuickReactionBar';
import { formatRelativeTime, formatFullDateTime } from '../../utils/formatRelativeTime';

interface EditorialSidebarProps {
  currentArticleId?: string;
}

export const EditorialSidebar: React.FC<EditorialSidebarProps> = ({ currentArticleId }) => {
  const {
    articles,
    films,
    buzzList,
    currentUser,
    isLoggedIn,
    setLoginModalOpen,
    addBuzzPost,
    likeBuzzPost,
    navigateTo,
    showToast,
    openShareModal,
  } = useApp();

  const [quickBuzzText, setQuickBuzzText] = useState('');
  const [quickTaggedFilmId, setQuickTaggedFilmId] = useState('');
  const [quickSkor, setQuickSkor] = useState<number | undefined>(undefined);
  const [newsletterEmail, setNewsletterEmail] = useState('');

  // Recommended articles for sidebar (excluding currently opened article if provided)
  const recommendedArticles = articles
    .filter(a => a.id !== currentArticleId)
    .filter(a => a.tags.includes('IMAX') || a.tags.includes('Denis Villeneuve') || a.tags.includes('Plot Twist') || a.featured)
    .slice(0, 4);

  const handleQuickBuzzSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      setLoginModalOpen(true);
      showToast('Silakan masuk terlebih dahulu untuk memposting buzz opini!');
      return;
    }
    if (!quickBuzzText.trim()) return;
    addBuzzPost(quickBuzzText, quickTaggedFilmId || undefined, quickSkor);
    setQuickBuzzText('');
    setQuickTaggedFilmId('');
    setQuickSkor(undefined);
    showToast('Buzz opini kamu berhasil diposting ke feed komunitas!');
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    showToast(`Terima kasih! Email ${newsletterEmail} berhasil terdaftar di Warga Sotoy Club.`);
    setNewsletterEmail('');
  };

  return (
    <aside id="editorial-home-sidebar" className="space-y-6">
      
      {/* SIDEBAR WIDGET 1: LIVE BUZZ & OPINI KOMUNITAS */}
      <div id="sidebar-live-buzz" className="bg-[#121320] border border-white/[0.08] rounded-3xl p-5 shadow-xl">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-3.5 bg-[#FF2E7E] rounded-full inline-block" />
            <h3 className="font-display font-bold text-sm text-white">
              Buzz & Opini Warga
            </h3>
          </div>
          <button
            onClick={() => navigateTo('community-feed')}
            className="text-xs font-semibold text-[#FF2E7E] hover:underline"
          >
            Semua Feed →
          </button>
        </div>

        {/* Fast Quick-Post Box for Live Feed */}
        <form onSubmit={handleQuickBuzzSubmit} className="mb-4 bg-black/40 p-3 rounded-2xl border border-white/[0.08]">
          <div className="flex items-center gap-2 mb-2">
            {isLoggedIn ? (
              <>
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-6 h-6 rounded-full object-cover ring-1 ring-white/10"
                />
                <span className="text-xs font-semibold text-white">{currentUser.name}</span>
                <span className="text-[10px] text-slate-400 font-medium">({currentUser.roleTitle.split(' ')[0]})</span>
              </>
            ) : (
              <>
                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                  <UserIcon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-medium text-slate-400">Tamu Cinephile</span>
              </>
            )}
          </div>

          <textarea
            value={quickBuzzText}
            onChange={e => setQuickBuzzText(e.target.value)}
            placeholder={isLoggedIn ? "Drop hot take, review kilat, atau tebakan box office kamu..." : "Masuk untuk drop opini sinema kamu..."}
            rows={2}
            className="w-full bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none resize-none"
          />

          <div className="flex items-center justify-between pt-2 border-t border-white/[0.08] mt-1">
            <select
              value={quickTaggedFilmId}
              onChange={e => setQuickTaggedFilmId(e.target.value)}
              className="bg-slate-900 text-[11px] text-slate-300 rounded-lg px-2 py-1 border border-white/10 max-w-[130px]"
            >
              <option value="">Tag Film (Opsional)</option>
              {films.map(f => (
                <option key={f.id} value={f.id}>{f.title}</option>
              ))}
            </select>

            <button
              type="submit"
              className="bg-[#FF2E7E] hover:bg-[#e6206d] text-white text-xs font-semibold px-3 py-1 rounded-lg flex items-center gap-1 transition-all active:scale-95 shadow-md shadow-[#FF2E7E]/20"
            >
              <span>Buzz</span>
              <Send className="w-3 h-3" />
            </button>
          </div>
        </form>

        {/* Recent Buzz Stream */}
        <div className="space-y-3">
          {buzzList.slice(0, 3).map(post => (
            <div
              key={post.id}
              id={`sidebar-buzz-item-${post.id}`}
              className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/15 transition-colors"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div
                  onClick={() => navigateTo('user-profile', { userId: post.author.id })}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <img
                    src={post.author.avatar}
                    alt={post.author.name}
                    className="w-6 h-6 rounded-full object-cover ring-1 ring-white/10 group-hover:ring-[#FF2E7E] transition-all"
                  />
                  <div>
                    <div className="text-xs font-semibold text-white group-hover:text-[#FF2E7E] transition-colors leading-tight">
                      {post.author.name}
                    </div>
                    <div
                      className="text-[10px] text-slate-400 font-mono tabular-nums"
                      title={formatFullDateTime(post.createdAt)}
                    >
                      {formatRelativeTime(post.createdAt)}
                    </div>
                  </div>
                </div>
                {post.author.role && (
                  <RoleBadge role={post.author.role} size="xs" />
                )}
              </div>

              {post.taggedFilm && (
                <div
                  onClick={() => navigateTo('film-detail', { filmId: post.taggedFilm?.id })}
                  className="text-[11px] font-medium text-sky-400 hover:underline mb-1 flex items-center gap-1 cursor-pointer"
                >
                  <Film className="w-3 h-3" />
                  <span>{post.taggedFilm.title}</span>
                  {post.skorSotoyMention && (
                    <span className="text-amber-400 ml-1 font-mono tabular-nums font-semibold">★ {post.skorSotoyMention.toFixed(1)}</span>
                  )}
                </div>
              )}

              <p className="text-slate-300 text-xs leading-relaxed mb-2">
                {post.content}
              </p>

              <div className="pt-2 border-t border-white/[0.06] space-y-2">
                <QuickReactionBar
                  buzzId={post.id}
                  reactions={post.reactions}
                  myReaction={post.myReaction}
                  compact={true}
                />
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <button
                    id={`sidebar-buzz-reply-${post.id}`}
                    onClick={() => navigateTo('buzz-detail', { buzzId: post.id })}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                    title="Balas diskusi buzz ini"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-mono tabular-nums">{(post.replies && post.replies.length > 0 ? post.replies.length : post.repliesCount) || 0} Balasan</span>
                  </button>
                  <button
                    onClick={() => {
                      openShareModal({
                        title: `Buzz Diskusi: ${post.author.name}`,
                        text: post.content,
                        tags: post.tags,
                        type: 'buzz',
                        image: post.author.avatar,
                        imageUrl: post.author.avatar,
                        authorAvatar: post.author.avatar,
                        authorName: post.author.name,
                        meta: post.taggedFilm ? `Membahas film ${post.taggedFilm.title}` : `@${post.author.handle} di Sotoy Film`,
                      });
                    }}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                    title="Bagikan Buzz ke Instagram / Medsos"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SIDEBAR WIDGET 2: RECOMMENDED ARTICLES */}
      <div id="sidebar-recommended-articles" className="bg-[#121320] border border-white/[0.08] rounded-3xl p-5 shadow-xl">
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-white/[0.08]">
          <span className="w-1.5 h-3.5 bg-amber-400 rounded-full inline-block" />
          <h3 className="font-display font-bold text-sm text-white">
            Rekomendasi Redaksi
          </h3>
        </div>

        <div className="space-y-3">
          {recommendedArticles.map((rec, i) => (
            <div
              key={rec.id}
              onClick={() => navigateTo('article-detail', { articleId: rec.id })}
              className="flex items-center gap-3 p-2 rounded-2xl hover:bg-white/[0.04] transition-colors cursor-pointer group"
            >
              <span className="font-mono tabular-nums font-bold text-xs text-slate-500 group-hover:text-amber-400 transition-colors w-5 text-center">
                {String(i + 1).padStart(2, '0')}
              </span>
              <img
                src={rec.coverImage}
                alt={rec.title}
                className="w-12 h-12 object-cover rounded-xl shrink-0 border border-white/10"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-semibold text-white group-hover:text-amber-200 transition-colors line-clamp-2 leading-snug">
                  {rec.title}
                </h4>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                  <span className="text-[#FF2E7E] font-medium">{rec.category}</span>
                  <span className="text-slate-600">·</span>
                  <span>{rec.readTime}</span>
                </div>
              </div>
              <button
                id={`sidebar-share-rec-btn-${rec.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  openShareModal({
                    title: rec.title,
                    url: window.location.href,
                    text: rec.excerpt,
                    tags: rec.tags,
                    image: rec.coverImage,
                    imageUrl: rec.coverImage,
                    type: 'article',
                    category: rec.category,
                    authorName: rec.author.name,
                    authorAvatar: rec.author.avatar,
                    meta: `${rec.category.toUpperCase()} • ${rec.author.name} (${rec.readTime})`,
                  });
                }}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors shrink-0"
                title="Bagikan Artikel"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* SIDEBAR WIDGET 3: CTA BOX */}
      <div
        id="sidebar-community-cta"
        className="bg-[#121320] border border-[#FF2E7E]/30 rounded-3xl p-5 shadow-xl relative overflow-hidden"
      >
        <div className="text-[#FF2E7E] font-semibold text-xs uppercase tracking-wider mb-1">
          Warga Sotoy Club
        </div>
        <h3 className="font-display font-bold text-base text-white mb-2 leading-snug">
          Kurasi Mingguan & Akses Voting
        </h3>
        <p className="text-slate-400 text-xs mb-4 leading-relaxed">
          Dapatkan rangkuman ulasan festival film, riset teknologi sinema, dan hak suara di voting Skor Sotoy bulanan.
        </p>

        <form onSubmit={handleNewsletterSubmit} className="space-y-2.5">
          <input
            type="email"
            value={newsletterEmail}
            onChange={e => setNewsletterEmail(e.target.value)}
            placeholder="Masukkan email kamu..."
            required
            className="w-full bg-black/40 border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
          />
          <button
            type="submit"
            className="w-full bg-[#FF2E7E] hover:bg-[#e6206d] text-white font-semibold text-xs py-2.5 rounded-xl shadow-lg shadow-[#FF2E7E]/20 transition-all active:scale-95"
          >
            Berlangganan Gratis
          </button>
        </form>
      </div>

      {/* SIDEBAR WIDGET 4: AD BANNER */}
      <AdBannerSlot variant="sidebar" />

    </aside>
  );
};
