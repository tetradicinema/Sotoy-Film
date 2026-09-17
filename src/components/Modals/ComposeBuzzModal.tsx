import React, { useState, useRef, useEffect } from 'react';
import { X, Film, FileText, Send, Sparkles, Star, Tag, Search, Check, User as UserIcon } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MentionInput } from '../Common/MentionInput';

export const ComposeBuzzModal: React.FC = () => {
  const {
    isComposeBuzzOpen,
    setIsComposeBuzzOpen,
    currentUser,
    isLoggedIn,
    setLoginModalOpen,
    films,
    articles,
    addBuzzPost,
    showToast,
  } = useApp();

  const [postContent, setPostContent] = useState('');
  const [selectedFilmId, setSelectedFilmId] = useState<string | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [skorMention, setSkorMention] = useState<number | undefined>(undefined);
  
  // Tag dropdown states
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

  if (!isComposeBuzzOpen) return null;

  const selectedFilm = films.find(f => f.id === selectedFilmId);
  const selectedArticle = articles.find(a => a.id === selectedArticleId);

  const handleSubmit = (e: React.FormEvent) => {
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
    setIsComposeBuzzOpen(false);
    showToast('Buzz kamu berhasil terbit! 🚀');
  };

  const handleClose = () => {
    setIsComposeBuzzOpen(false);
  };

  return (
    <div
      id="compose-buzz-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        id="compose-buzz-modal-container"
        className="bg-[#121324] border border-slate-700/80 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#FF2E7E] to-[#FF8008] p-0.5 shadow-md flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">Tulis Buzz Baru</h2>
              <p className="text-xs text-slate-400">Bagikan opini, teori, atau review singkat film kamu</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div className="flex items-start gap-3">
            {isLoggedIn ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-[#00F0FF]/30 shrink-0 mt-1"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 ring-2 ring-slate-700 shrink-0 mt-1">
                <UserIcon className="w-5 h-5" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <MentionInput
                id="modal-buzz-content-textarea"
                rows={4}
                value={postContent}
                onChange={setPostContent}
                placeholder="Apa opini sinematik unikmu hari ini? Ketik '@' untuk mention warga lain..."
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl p-3.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#00F0FF] focus:ring-2 focus:ring-[#00F0FF]/20 resize-none transition-all"
                autoFocus
              />

              {/* Tagged Preview Chips */}
              {(selectedFilm || selectedArticle) && (
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-slate-800">
                  {selectedFilm && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FFD000]/10 border border-[#FFD000]/30 text-xs font-semibold text-[#FFD000]">
                      <Film className="w-3.5 h-3.5" />
                      <span>{selectedFilm.title}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedFilmId(null)}
                        className="hover:text-red-400 transition-colors ml-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {selectedArticle && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FF2E7E]/10 border border-[#FF2E7E]/30 text-xs font-semibold text-[#FF2E7E]">
                      <FileText className="w-3.5 h-3.5" />
                      <span>{selectedArticle.title}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedArticleId(null)}
                        className="hover:text-red-400 transition-colors ml-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tag Selection Dropdown Controls */}
              <div className="relative mt-3" ref={dropdownRef}>
                <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTagMode('film');
                        setDropdownOpen(!dropdownOpen || tagMode !== 'film');
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        selectedFilmId
                          ? 'bg-[#FFD000]/20 text-[#FFD000] border border-[#FFD000]/40'
                          : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-750'
                      }`}
                    >
                      <Film className="w-3.5 h-3.5 text-[#FFD000]" />
                      <span>Tag Film</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTagMode('article');
                        setDropdownOpen(!dropdownOpen || tagMode !== 'article');
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        selectedArticleId
                          ? 'bg-[#FF2E7E]/20 text-[#FF2E7E] border border-[#FF2E7E]/40'
                          : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-750'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 text-[#FF2E7E]" />
                      <span>Tag Artikel</span>
                    </button>
                  </div>

                  {/* Rating Selector if film tagged */}
                  {selectedFilmId && (
                    <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
                      <span className="text-[11px] font-bold text-slate-400">Skor Sotoy:</span>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setSkorMention(star)}
                            className="p-0.5 hover:scale-125 transition-transform"
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                (skorMention || 0) >= star
                                  ? 'text-[#FFD000] fill-current'
                                  : 'text-slate-600'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Dropdown Menu for Tagging */}
                {dropdownOpen && (
                  <div className="absolute left-0 bottom-full mb-2 w-full bg-[#181a30] border border-slate-700 rounded-2xl p-3 shadow-2xl z-30 space-y-2">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder={
                          tagMode === 'film'
                            ? 'Cari film berdasarkan judul...'
                            : 'Cari artikel berdasarkan judul...'
                        }
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#00F0FF]"
                      />
                    </div>

                    <div className="max-h-40 overflow-y-auto space-y-1 scrollbar-thin">
                      {tagMode === 'film'
                        ? films
                            .filter(f => f.title.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map(f => (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => {
                                  setSelectedFilmId(f.id);
                                  setDropdownOpen(false);
                                  setSearchQuery('');
                                }}
                                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-800 text-left transition-colors"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <img
                                    src={f.poster}
                                    alt={f.title}
                                    className="w-6 h-8 rounded object-cover"
                                  />
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-white truncate">
                                      {f.title}
                                    </div>
                                    <div className="text-[10px] text-slate-400">{f.year}</div>
                                  </div>
                                </div>
                                {selectedFilmId === f.id && (
                                  <Check className="w-4 h-4 text-[#FFD000]" />
                                )}
                              </button>
                            ))
                        : articles
                            .filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map(a => (
                              <button
                                key={a.id}
                                type="button"
                                onClick={() => {
                                  setSelectedArticleId(a.id);
                                  setDropdownOpen(false);
                                  setSearchQuery('');
                                }}
                                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-800 text-left transition-colors"
                              >
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-white truncate">
                                    {a.title}
                                  </div>
                                  <div className="text-[10px] text-slate-400">{a.category}</div>
                                </div>
                                {selectedArticleId === a.id && (
                                  <Check className="w-4 h-4 text-[#FF2E7E]" />
                                )}
                              </button>
                            ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              Batal
            </button>

            <button
              id="modal-buzz-submit-btn"
              type="submit"
              disabled={!postContent.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF2E7E] to-[#FF8008] text-white text-xs font-bold hover:brightness-110 shadow-lg shadow-[#FF2E7E]/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Terbitkan Buzz</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
