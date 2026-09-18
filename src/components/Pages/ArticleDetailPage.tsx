import React, { useState } from 'react';
import {
  ArrowLeft,
  Clock,
  Eye,
  Heart,
  Share2,
  Bookmark,
  BookmarkCheck,
  MessageCircle,
  Star,
  Sparkles,
  ChevronRight,
  Send,
  Lock,
  LogIn,
  Film,
  Award,
  Check,
  Plus,
  UserPlus,
  Edit3,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useDynamicArticleAuthor } from '../../hooks/useDynamicArticleAuthor';
import { SEOHead } from '../SEO/SEOHead';
import { generateArticleSchema, generateBreadcrumbSchema } from '../../utils/schemaHelpers';
import { StarRating } from '../Common/StarRating';
import { AdBannerSlot } from '../Common/AdBannerSlot';
import { EditorialSidebar } from '../Common/EditorialSidebar';
import { RateFilmModal } from '../Modals/RateFilmModal';

export const ArticleDetailPage: React.FC = () => {
  const {
    selectedArticleId,
    articles,
    films,
    currentUser,
    isLoggedIn,
    isAdmin,
    isWriter,
    setLoginModalOpen,
    likeArticle,
    toggleWatchlist,
    isFilmInWatchlist,
    toggleSaveArticle,
    isArticleSaved,
    navigateTo,
    showToast,
    openShareModal,
    toggleFollowUser,
    isFollowing,
  } = useApp();

  const article = articles.find(a => a.id === selectedArticleId) || articles[0];
  const author = useDynamicArticleAuthor(article?.authorId || article?.author?.id, article?.author);
  const [commentText, setCommentText] = useState('');
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [comments, setComments] = useState<{ name: string; avatar: string; text: string; time: string }[]>([
    {
      name: 'Penggemar Sinema',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80',
      text: 'Analisis yang sangat tajam! Penulisan ulasannya mendalam.',
      time: '1 jam lalu',
    },
    {
      name: 'Warga Sotoy',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      text: 'Setuju banget sama poin artikel ini. Ulasannya sangat menarik.',
      time: '3 jam lalu',
    },
  ]);

  if (articles.length === 0 || !article) {
    return (
      <div className="min-h-screen py-8 flex items-center justify-center bg-[#090a10]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#FF2E7E] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 font-bold">Memuat Artikel...</p>
        </div>
      </div>
    );
  }

  // Cari film yang dibahas dalam artikel ini
  const discussedFilm = article.relatedFilmId
    ? films.find(f => f.id === article.relatedFilmId)
    : films.find(f =>
        article.title.toLowerCase().includes(f.title.toLowerCase()) ||
        article.tags.some(t => t.toLowerCase() === f.title.toLowerCase()) ||
        (f.id === 'film-1' && (article.category === 'movies' || article.title.includes('Dune')))
      );

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setComments(prev => [
      {
        name: currentUser.name,
        avatar: currentUser.avatar,
        text: commentText,
        time: 'Baru saja',
      },
      ...prev,
    ]);
    setCommentText('');
    showToast('Komentar kamu berhasil ditambahkan!');
  };

  const handleShare = () => {
    openShareModal({
      title: article.title,
      url: window.location.href,
      text: article.excerpt || `Simak ulasan mendalam "${article.title}" oleh ${article.author.name} di Sotoy Film!`,
      tags: article.tags,
      image: article.coverImage,
      imageUrl: article.coverImage,
      type: 'article',
      category: article.category,
      authorName: article.author.name,
      authorAvatar: article.author.avatar,
      meta: `${article.category.toUpperCase()} • ${article.author.name} (${article.readTime})`,
    });
  };

  const relatedArticles = articles
    .filter(a => a.id !== article.id && a.category === article.category)
    .slice(0, 3);

  // Prepare SEO Metadata & Structured Schemas
  const seoUrl = `https://sotoyfilm.my.id/article/${article.slug || article.id}`;
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', item: 'https://sotoyfilm.my.id' },
    { name: article.category.toUpperCase(), item: `https://sotoyfilm.my.id/category/${article.category}` },
    { name: article.title, item: seoUrl },
  ]);

  const articleSchema = generateArticleSchema({
    title: article.seoTitle || article.title,
    description: article.metaDescription || article.excerpt || article.content.slice(0, 160),
    image: article.ogImage || article.coverImage,
    url: seoUrl,
    datePublished: article.publishedAt || new Date().toISOString(),
    authorName: author.displayName || author.name || article.author.name,
    authorAvatar: author.avatarURL || author.avatar || article.author.avatar,
    keywords: article.tags || [],
  });

  return (
    <div className="min-h-screen py-8">
      <SEOHead
        title={article.seoTitle || article.title}
        description={article.metaDescription || article.excerpt || article.content.slice(0, 160)}
        image={article.ogImage || article.coverImage}
        url={seoUrl}
        type="article"
        keywords={[...(article.tags || []), 'sotoy film', article.category, article.subCategory]}
        schema={[breadcrumbSchema, articleSchema]}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateTo('home')}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span
              onClick={() => navigateTo('category', { category: article.category })}
              className="hover:text-[#00F0FF] cursor-pointer font-bold capitalize"
            >
              {article.category}
            </span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#FF2E7E] font-bold capitalize">{article.subCategory}</span>
          </div>
        </div>

        {/* Global Page Ad Banner */}
        <AdBannerSlot variant="leaderboard" />

        {/* 2-Column Main Layout: Article Body (8 Cols) & Sidebar (4 Cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* MAIN ARTICLE COLUMN (8 Columns) */}
          <div className="lg:col-span-8 space-y-8">
            {/* Article Container */}
            <article className="bg-[#121324] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-10 space-y-6">
          
          {/* Category & Tags Header */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="bg-[#FF2E7E] text-white font-black text-xs uppercase px-3 py-1 rounded-full">
                {article.category}
              </span>
              <span className="bg-slate-800 text-slate-300 font-bold text-xs uppercase px-3 py-1 rounded-full">
                {article.subCategory}
              </span>
            </div>

            {/* Likes count pill */}
            <button
              onClick={() => likeArticle(article.id)}
              className="bg-pink-500/15 border border-pink-500/40 px-3 py-1 rounded-full text-pink-400 font-bold text-xs flex items-center gap-1.5 hover:bg-pink-500/25 transition-colors"
            >
              <Heart className="w-3.5 h-3.5 fill-current" />
              <span>{article.likes} Suka</span>
            </button>
          </div>

          {/* Article Title */}
          <h1 className="font-display font-black text-2xl sm:text-4xl text-white tracking-tight leading-tight">
            {article.title}
          </h1>

          {/* Excerpt */}
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed italic border-l-4 border-[#FF2E7E] pl-4">
            {article.excerpt}
          </p>

          {/* Author & Meta bar */}
          <div className="flex items-center justify-between flex-wrap gap-4 py-4 border-y border-slate-800">
            {author.loading ? (
              <div className="flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-slate-800 shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-4 w-32 bg-slate-800 rounded" />
                  <div className="h-3 w-24 bg-slate-800/60 rounded" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <img
                  onClick={() => navigateTo('user-profile', { userId: author.id })}
                  src={author.avatarURL || author.avatar}
                  alt={author.displayName || author.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-[#FFD000] cursor-pointer hover:scale-105 transition-transform"
                  title={`Kunjungi profil ${author.displayName || author.name}`}
                />
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5 flex-wrap">
                    <span
                      onClick={() => navigateTo('user-profile', { userId: author.id })}
                      className="cursor-pointer hover:text-[#00F0FF] transition-colors"
                      title={`Kunjungi profil ${author.displayName || author.name}`}
                    >
                      {author.displayName || author.name}
                    </span>

                    {author.customBadge && (
                      <span className="bg-[#FF2E7E]/20 text-[#FF2E7E] text-[10px] font-bold px-2 py-0.5 rounded uppercase border border-[#FF2E7E]/30">
                        {author.customBadge}
                      </span>
                    )}

                    <span className="text-[11px] text-slate-400 font-normal bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {author.articleCount} {author.articleCount === 1 ? 'artikel' : 'artikel'}
                    </span>

                    {(!isLoggedIn || author.id !== currentUser.id) && (
                      <button
                        onClick={() => {
                          if (!isLoggedIn) {
                            setLoginModalOpen(true);
                            showToast(`Silakan masuk untuk mengikuti ${author.displayName || author.name}!`);
                            return;
                          }
                          toggleFollowUser(author.id);
                        }}
                        className={`ml-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                          isLoggedIn && isFollowing(author.id)
                            ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-red-500/20 hover:text-red-400'
                            : 'bg-gradient-to-r from-[#FF2E7E] to-[#FF8008] text-white shadow-sm hover:brightness-110 active:scale-95'
                        }`}
                        title={isLoggedIn && isFollowing(author.id) ? 'Klik untuk batal ikuti' : 'Ikuti Penulis ini'}
                      >
                        {isLoggedIn && isFollowing(author.id) ? (
                          <>
                            <Check className="w-2.5 h-2.5 text-emerald-400" />
                            <span>Mengikuti</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-2.5 h-2.5" />
                            <span>+ Ikuti Penulis</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Diterbitkan {article.publishedAt} • {article.readTime}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2.5 flex-wrap text-xs text-slate-400">
              {/* Edit in CMS button for Admin & Author */}
              {isLoggedIn && (isAdmin || isWriter || currentUser.role === 'admin' || currentUser.role === 'penulis_sotoy' || currentUser.id === article.author.id || currentUser.id === article.authorId || currentUser.id === '0PCmaBvJrzeaQgpf3sSTC4mnsh02') && (
                <button
                  id="article-edit-cms-btn"
                  onClick={() => navigateTo('write-article', { articleId: article.id })}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all bg-gradient-to-r from-pink-600/80 to-purple-600/80 hover:brightness-110 text-white border border-pink-400/40 shadow-md shadow-pink-950/30"
                  title="Buka dan Sunting Artikel ini di CMS Editor"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-300" />
                  <span>Sunting di CMS</span>
                </button>
              )}

              <button
                id="article-save-library-btn"
                onClick={() => toggleSaveArticle(article.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all border ${
                  isArticleSaved(article.id)
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800'
                }`}
                title={isArticleSaved(article.id) ? 'Hapus dari Perpustakaan' : 'Simpan ke Perpustakaan'}
              >
                {isArticleSaved(article.id) ? (
                  <>
                    <BookmarkCheck className="w-4 h-4 text-emerald-400" />
                    <span>Tersimpan di Library</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4 text-[#00F0FF]" />
                    <span>+ Simpan ke Library</span>
                  </>
                )}
              </button>

              <button
                id="article-like-btn"
                onClick={() => likeArticle(article.id)}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-[#FF2E7E] hover:text-white px-3 py-1.5 rounded-xl border border-slate-800 transition-colors"
              >
                <Heart className="w-4 h-4" />
                <span>{article.likes} Suka</span>
              </button>

              <button
                id="article-share-btn"
                onClick={handleShare}
                className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-[#00F0FF] border border-cyan-500/40 hover:bg-[#00F0FF] hover:text-slate-950 px-3 py-1.5 rounded-xl transition-all font-bold"
                title="Bagikan ke WhatsApp, X, FB, dll"
              >
                <Share2 className="w-4 h-4" />
                <span>Bagikan (Share)</span>
              </button>
            </div>
          </div>

          {/* Cover Image */}
          <div className="rounded-2xl overflow-hidden max-h-[440px] w-full relative">
            <img
              src={article.coverImage}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Article Main Body Content */}
          <div className="prose prose-invert max-w-none text-slate-200 text-sm sm:text-base leading-relaxed space-y-4 pt-4">
            {article.content.split('\n\n').map((para, idx) => {
              if (para.startsWith('### ')) {
                return (
                  <h3 key={idx} className="font-display font-black text-xl text-white pt-4 pb-1 border-b border-slate-800">
                    {para.replace('### ', '')}
                  </h3>
                );
              }
              if (para.startsWith('**') && para.endsWith('**')) {
                return (
                  <div key={idx} className="bg-[#FFD000]/10 border border-[#FFD000]/30 p-4 rounded-2xl text-[#FFD000] font-bold">
                    {para.replace(/\*\*/g, '')}
                  </div>
                );
              }
              return (
                <p key={idx} className="text-slate-300 leading-relaxed">
                  {para}
                </p>
              );
            })}
          </div>

          {/* Tags */}
          <div className="pt-6 border-t border-slate-800 flex flex-wrap gap-2 items-center">
            <span className="text-xs font-bold text-slate-400">Tag Terkait:</span>
            {article.tags.map(tag => (
              <span
                key={tag}
                className="bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs px-3 py-1 rounded-xl border border-slate-800"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Social Media Share Section */}
          <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-[#181a30] to-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <div className="text-xs font-bold text-white flex items-center justify-center sm:justify-start gap-2">
                <Share2 className="w-4 h-4 text-[#00F0FF]" />
                <span>Bagikan Artikel & Ulasan Ini ke Media Sosial</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Sebarkan analisis film ini langsung ke WhatsApp, X (Twitter), Facebook, dan Telegram
              </p>
            </div>
            <button
              onClick={handleShare}
              className="px-5 py-2.5 bg-gradient-to-r from-[#FF2E7E] to-[#FF8008] text-white text-xs font-black rounded-xl shadow-lg shadow-[#FF2E7E]/25 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 shrink-0"
            >
              <Share2 className="w-4 h-4" />
              <span>Bagikan Sekarang</span>
            </button>
          </div>
        </article>

        {/* Section Film Terkait: Opsi Memberikan Ulasan & Skor Sotoy */}
        {discussedFilm && (
          <section
            id="article-discussed-film-box"
            className="bg-gradient-to-br from-[#1B1429] via-[#151628] to-[#10111f] border-2 border-[#FFD000]/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden"
          >
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FFD000]/20 flex items-center justify-center text-[#FFD000]">
                  <Film className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#FFD000] block">
                    Film yang Dibahas dalam Artikel Ini
                  </span>
                  <h3 className="font-display font-black text-xl text-white">
                    {discussedFilm.title} ({discussedFilm.year})
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="view-full-film-btn"
                  onClick={() => navigateTo('film-detail', { filmId: discussedFilm.id })}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-bold text-white border border-slate-700 transition-colors"
                >
                  Buka Halaman Film Lengkap →
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Poster Film */}
              <div className="md:col-span-3">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 aspect-[2/3] group">
                  <img
                    src={discussedFilm.poster}
                    alt={discussedFilm.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 right-2 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded-lg border border-[#FFD000]/40 text-[#FFD000] font-black text-xs">
                    ★ {discussedFilm.skorSotoy.toFixed(1)}
                  </div>
                </div>
              </div>

              {/* Details & Actions */}
              <div className="md:col-span-9 space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-1 flex-wrap">
                    <span className="text-white font-bold">{discussedFilm.originalTitle || discussedFilm.title}</span>
                    <span>•</span>
                    <span>{discussedFilm.duration}</span>
                    <span>•</span>
                    <span>Sutradara: <strong className="text-slate-200">{discussedFilm.director}</strong></span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 my-2">
                    {discussedFilm.genres.map(g => (
                      <span
                        key={g}
                        className="bg-slate-800/90 text-slate-300 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-slate-700"
                      >
                        {g}
                      </span>
                    ))}
                  </div>

                  <p className="text-slate-300 text-xs sm:text-sm leading-relaxed line-clamp-3">
                    {discussedFilm.synopsis}
                  </p>
                </div>

                {/* Rating score highlights */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium">Skor Komunitas Sotoy</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-lg font-black text-[#FFD000]">★ {discussedFilm.skorSotoy.toFixed(1)}</span>
                      <span className="text-[11px] text-slate-400">/ 5.0 ({discussedFilm.totalVotes} ulasan)</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-400 font-medium">Skor Si Paling Sotoy</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-lg font-black text-[#00F0FF]">
                        ★ {discussedFilm.criticsSkorSotoy ? discussedFilm.criticsSkorSotoy.toFixed(1) : discussedFilm.skorSotoy.toFixed(1)}
                      </span>
                      <span className="text-[11px] text-slate-400">/ 5.0 (Critic Verified)</span>
                    </div>
                  </div>

                  <div className="col-span-2 sm:col-span-1 flex items-center">
                    <span className="text-xs text-slate-300">
                      Apakah kamu sudah menonton film ini?
                    </span>
                  </div>
                </div>

                {/* Call-to-action buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    id="rate-discussed-film-btn"
                    onClick={() => {
                      if (!isLoggedIn) {
                        setLoginModalOpen(true);
                      } else {
                        setRateModalOpen(true);
                      }
                    }}
                    className="px-5 py-2.5 bg-gradient-to-r from-[#FFD000] to-[#FF8008] text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-[#FFD000]/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <Star className="w-4 h-4 fill-current" />
                    <span>Beri Skor Sotoy & Ulas Film Ini</span>
                  </button>

                  <button
                    id="watchlist-discussed-film-btn"
                    onClick={() => toggleWatchlist(discussedFilm.id)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                      isFilmInWatchlist(discussedFilm.id)
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                  >
                    {isFilmInWatchlist(discussedFilm.id) ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Di Watchlist Kamu</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Simpan ke Watchlist</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Infeed Ad */}
        <AdBannerSlot variant="infeed" />

        {/* Comments Section */}
        <div id="article-comments" className="bg-[#121324] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <MessageCircle className="w-5 h-5 text-[#00F0FF]" />
            <h3 className="font-display font-black text-lg text-white">
              Diskusi Komentar ({comments.length})
            </h3>
          </div>

          {/* Comment input form or Login Requirement */}
          {!isLoggedIn ? (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-[#00F0FF] flex items-center justify-center mx-auto border border-cyan-500/30">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Masuk untuk Menulis Komentar</h4>
                <p className="text-slate-400 text-xs mt-1 max-w-md mx-auto">
                  Anda harus Masuk (Log In) ke akun Sotoy Film terlebih dahulu untuk bergabung dalam diskusi dan memberikan komentar.
                </p>
              </div>
              <button
                type="button"
                id="login-to-comment-btn"
                onClick={() => setLoginModalOpen(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-[#FF2E7E] to-[#FF8008] text-white text-xs font-bold rounded-xl shadow-md shadow-[#FF2E7E]/20 hover:brightness-110 active:scale-95 transition-all inline-flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk (Log In) Sekarang</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleAddComment} className="flex gap-3 items-start">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-9 h-9 rounded-xl object-cover shrink-0"
              />
              <div className="flex-1 space-y-2">
                <textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Bagikan pandangan atau pertanyaan kamu seputar ulasan ini..."
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E] resize-none"
                />
                <button
                  type="submit"
                  className="bg-[#FF2E7E] hover:bg-[#ff156d] text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md transition-transform active:scale-95"
                >
                  <span>Kirim Komentar</span>
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </form>
          )}

          {/* Comments List */}
          <div className="space-y-3 pt-2">
            {comments.map((c, i) => (
              <div key={i} className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">{c.name}</span>
                  <span className="text-slate-500 text-[10px]">{c.time}</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">{c.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <div className="space-y-4 pt-4">
            <h3 className="font-display font-black text-xl text-white">
              Artikel Terkait dalam {article.category}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedArticles.map(rel => (
                <div
                  key={rel.id}
                  onClick={() => navigateTo('article-detail', { articleId: rel.id })}
                  className="bg-[#121324] border border-slate-800 rounded-2xl overflow-hidden p-3 hover:border-[#FF2E7E] cursor-pointer group transition-all"
                >
                  <img
                    src={rel.coverImage}
                    alt={rel.title}
                    className="w-full h-28 object-cover rounded-xl mb-2 group-hover:scale-105 transition-transform"
                  />
                  <h4 className="font-bold text-xs text-white group-hover:text-[#FF2E7E] line-clamp-2">
                    {rel.title}
                  </h4>
                </div>
              ))}
            </div>
          </div>
        )}

          </div>

          {/* RIGHT SIDEBAR COLUMN (4 Columns) - Matching Homepage */}
          <div className="lg:col-span-4 sticky top-24">
            <EditorialSidebar currentArticleId={article.id} />
          </div>
        </div>

        {/* Rate Film Modal for Discussed Film */}
        {discussedFilm && (
          <RateFilmModal
            film={discussedFilm}
            isOpen={rateModalOpen}
            onClose={() => setRateModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
};
