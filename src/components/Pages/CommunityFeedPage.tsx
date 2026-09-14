import React, { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AdBannerSlot } from '../Common/AdBannerSlot';

export const CommunityFeedPage: React.FC = () => {
  const {
    buzzList,
    films,
    articles,
    currentUser,
    isLoggedIn,
    setLoginModalOpen,
    addBuzzPost,
    likeBuzzPost,
    navigateTo,
    showToast,
    openShareModal,
    toggleFollowUser,
    isFollowing,
  } = useApp();

  const [postContent, setPostContent] = useState('');
  const [selectedFilmId, setSelectedFilmId] = useState<string | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [skorMention, setSkorMention] = useState<number | undefined>(undefined);
  const [activeTagFilter, setActiveTagFilter] = useState<string>('all');

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

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      setLoginModalOpen(true);
      showToast('Silakan Masuk (Log In) terlebih dahulu untuk memposting buzz!');
      return;
    }
    if (!postContent.trim()) return;

    addBuzzPost(
      postContent,
      selectedFilmId || undefined,
      skorMention,
      selectedArticleId || undefined
    );

    setPostContent('');
    setSelectedFilmId(null);
    setSelectedArticleId(null);
    setSkorMention(undefined);
    setDropdownOpen(false);
    setSearchQuery('');
  };

  const allTags = ['all', 'Dune2', 'Shogun', 'GearAddict', 'ReviewSotoy', 'Filmmaking'];

  const filteredBuzz = activeTagFilter === 'all'
    ? buzzList
    : buzzList.filter(b => b.tags.some(t => t.toLowerCase() === activeTagFilter.toLowerCase()));

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
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Header Title */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#FF2E7E] animate-pulse" />
              <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
                Buzz Sotoy Feed
              </h1>
            </div>
            <p className="text-slate-400 text-xs mt-1">
              Ruang diskusi publik pop-culture film & artikel. Tag film atau artikel favoritmu untuk menampilkan preview!
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline">Posting sebagai:</span>
            <span className="bg-[#FF2E7E]/15 border border-[#FF2E7E]/30 text-[#FF2E7E] font-black text-xs px-2.5 py-1 rounded-full">
              {currentUser.roleTitle.split(' ')[0]}
            </span>
          </div>
        </div>

        {/* Global Page Ad Banner */}
        <AdBannerSlot variant="leaderboard" />

        {/* ========================================================================= */}
        {/* POST COMPOSER CARD WITH SEARCHABLE FILM/ARTICLE TAGGING */}
        {/* ========================================================================= */}
        <div id="buzz-composer-card" className="bg-[#121324] border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
          <div className="flex items-start gap-3">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-10 h-10 rounded-xl object-cover ring-2 ring-[#FF2E7E]/50 shrink-0"
            />
            <div className="flex-1 space-y-3">
              <textarea
                id="buzz-composer-textarea"
                value={postContent}
                onChange={e => setPostContent(e.target.value)}
                placeholder="Apa yang lagi kamu tonton atau pikirkan seputar film & artikel hari ini? (Sertakan #hashtag)"
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

              {/* Tag Controls & Submit Button */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 relative">
                
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
                                  <span className="text-[10px] text-[#FFD000] font-black">★ {f.skorSotoy.toFixed(1)}</span>
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
                      value={skorMention || ''}
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
                  disabled={!postContent.trim()}
                  className="ml-auto bg-gradient-to-r from-[#FF2E7E] to-[#FFD000] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-xs uppercase tracking-wider px-5 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-[#FF2E7E]/20 transition-transform active:scale-95"
                >
                  <span>Kirim Buzz</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tag Filters Bar */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none flex-nowrap">
          <Hash className="w-4 h-4 text-slate-500 shrink-0" />
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTagFilter(tag)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors shrink-0 ${
                activeTagFilter === tag
                  ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {tag === 'all' ? 'Semua Topik' : `#${tag}`}
            </button>
          ))}
        </div>

        {/* ========================================================================= */}
        {/* BUZZ POSTS STREAM WITH RICH PREVIEW CARDS */}
        {/* ========================================================================= */}
        <div className="space-y-4">
          {filteredBuzz.map(post => {
            // Find full film details if tagged
            const postFilm = post.taggedFilm
              ? films.find(f => f.id === post.taggedFilm?.id) || post.taggedFilm
              : null;

            // Find full article details if tagged
            const postArticle = post.taggedArticle
              ? articles.find(a => a.id === post.taggedArticle?.id) || post.taggedArticle
              : null;

            return (
              <div
                key={post.id}
                id={`buzz-feed-card-${post.id}`}
                className="bg-[#121324] border border-slate-800/80 hover:border-slate-700 rounded-3xl p-5 sm:p-6 shadow-xl transition-all space-y-4"
              >
                {/* Post Author Info */}
                <div className="flex items-center justify-between">
                  <div
                    onClick={() => navigateTo('user-profile', { userId: post.author.id })}
                    className="flex items-center gap-3 cursor-pointer group"
                    title={`Kunjungi profil ${post.author.name}`}
                  >
                    <img
                      src={post.author.avatar}
                      alt={post.author.name}
                      className="w-10 h-10 rounded-xl object-cover ring-2 ring-transparent group-hover:ring-[#00F0FF] transition-all"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white group-hover:text-[#00F0FF] transition-colors flex items-center gap-1.5">
                          {post.author.name}
                        </span>
                        {post.author.role === 'si_paling_sotoy' && (
                          <span className="bg-[#FFD000]/15 text-[#FFD000] border border-[#FFD000]/30 text-[9px] font-black uppercase px-2 py-0.5 rounded">
                            CRITIC
                          </span>
                        )}
                        {post.author.role === 'penulis_sotoy' && (
                          <span className="bg-[#FF2E7E]/15 text-[#FF2E7E] border border-[#FF2E7E]/30 text-[9px] font-black uppercase px-2 py-0.5 rounded">
                            WRITER
                          </span>
                        )}
                        {post.author.role === 'admin' && (
                          <span className="bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[9px] font-black uppercase px-2 py-0.5 rounded">
                            ADMIN
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 group-hover:text-slate-300">
                        {post.author.handle} • {post.createdAt}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Follow / Unfollow Button for any other user */}
                    {(!isLoggedIn || post.author.id !== currentUser.id) && (
                      <button
                        onClick={() => {
                          if (!isLoggedIn) {
                            setLoginModalOpen(true);
                            showToast(`Silakan masuk untuk mengikuti ${post.author.name}!`);
                            return;
                          }
                          toggleFollowUser(post.author.id);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
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
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Mengikuti</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>+ Ikuti</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Optional quick score badge */}
                    {post.skorSotoyMention && (
                      <div className="bg-[#FFD000]/15 border border-[#FFD000]/40 px-3 py-1 rounded-xl text-[#FFD000] text-xs font-black flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{post.skorSotoyMention.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Content Text */}
                <p className="text-slate-200 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                  {post.content}
                </p>

                {/* Hashtags */}
                {post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {post.tags.map((t, idx) => (
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
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1 text-xs font-bold text-[#FF2E7E] group-hover:translate-x-1 transition-transform">
                      <span className="hidden sm:inline">Baca Artikel</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                )}

                {/* Footer Controls: Like, Comment count, Share */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs text-slate-400">
                  <div className="flex items-center gap-6">
                    <button
                      onClick={() => likeBuzzPost(post.id)}
                      className={`flex items-center gap-1.5 transition-colors ${
                        post.likedByMe ? 'text-[#FF2E7E] font-bold' : 'hover:text-[#FF2E7E]'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${post.likedByMe ? 'fill-current' : ''}`} />
                      <span>{post.likes} Suka</span>
                    </button>

                    <button
                      id={`buzz-reply-trigger-${post.id}`}
                      onClick={() => navigateTo('buzz-detail', { buzzId: post.id })}
                      className="flex items-center gap-1.5 hover:text-[#00F0FF] text-slate-300 transition-colors group cursor-pointer"
                      title="Buka halaman diskusi & balas buzz ini"
                    >
                      <MessageSquare className="w-4 h-4 text-[#00F0FF] group-hover:scale-110 transition-transform" />
                      <span className="font-medium">
                        {(post.replies && post.replies.length > 0 ? post.replies.length : post.repliesCount) || 0} Balasan
                      </span>
                    </button>
                  </div>

                  <button
                    onClick={() => handleShareBuzz(post)}
                    className="flex items-center gap-1.5 hover:text-[#00F0FF] transition-colors"
                    title="Bagikan Buzz ini ke Media Sosial"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Bagikan</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
