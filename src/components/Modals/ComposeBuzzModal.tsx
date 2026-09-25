import React, { useState, useRef, useEffect } from 'react';
import { X, Film, FileText, Send, Sparkles, Star, Tag, Search, Check, User as UserIcon, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MentionInput } from '../Common/MentionInput';
import { isAllowedImageType, compressBuzzImage } from '../../utils/imageCompression';

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

  // Photo Attachment state
  const [attachedImageDataUrl, setAttachedImageDataUrl] = useState<string | null>(null);
  const [attachedImagePreview, setAttachedImagePreview] = useState<string | null>(null);
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

  const handleSubmit = async (e: React.FormEvent) => {
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
      setIsComposeBuzzOpen(false);
      showToast('Buzz kamu berhasil terbit! 🚀');
    } finally {
      setIsSubmittingPost(false);
    }
  };

  const handleClose = () => {
    setAttachedImageDataUrl(null);
    setAttachedImagePreview(null);
    setIsComposeBuzzOpen(false);
  };

  return (
    <div
      id="compose-buzz-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        id="compose-buzz-modal-container"
        className="bg-[#171A1F] border border-white/10 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-[#171A1F]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#FF2E7E] p-0.5 shadow-md flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">Write New Buzz</h2>
              <p className="text-xs text-slate-400">Bagikan opini, teori, atau review singkat film kamu</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
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
                className="w-10 h-10 rounded-full object-cover ring-2 ring-[#FF2E7E]/30 shrink-0 mt-1"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center text-slate-400 ring-2 ring-white/10 shrink-0 mt-1">
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
                className="w-full bg-[#0E1013] border border-white/10 rounded-2xl p-3.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#FF2E7E] resize-none transition-all"
                autoFocus
              />

              {/* Tagged Preview Chips */}
              {(selectedFilm || selectedArticle) && (
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-white/10">
                  {selectedFilm && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FF2E7E]/10 border border-[#FF2E7E]/30 text-xs font-semibold text-[#FF2E7E]">
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

              {/* Photo Preview / Compressing indicator */}
              {isCompressingImage ? (
                <div className="flex items-center gap-3 p-3 mt-3 bg-[#0E1013] border border-white/10 rounded-2xl animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
                    <Loader2 className="w-5 h-5 text-[#FF2E7E] animate-spin" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white">Mengompres & Menyiapkan Foto...</p>
                    <p className="text-[11px] text-slate-400">Kompresi client-side browser sedang berlangsung.</p>
                  </div>
                </div>
              ) : attachedImagePreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0E1013] group max-w-sm mt-3 shadow-md">
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

              {/* Tag Selection Dropdown Controls */}
              <div className="relative mt-3" ref={dropdownRef}>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
                  onChange={handleImageSelect}
                  className="hidden"
                />

                <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isCompressingImage || isSubmittingPost}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        attachedImageDataUrl
                          ? 'bg-[#FF2E7E]/20 text-[#FF2E7E] border border-[#FF2E7E]/40'
                          : 'bg-white/[0.06] text-slate-300 hover:text-white hover:bg-white/[0.12] border border-white/10'
                      }`}
                      title="Lampirkan foto (JPG, PNG, WEBP, HEIC)"
                    >
                      {isCompressingImage ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF2E7E]" />
                      ) : (
                        <ImageIcon className="w-3.5 h-3.5 text-[#FF2E7E]" />
                      )}
                      <span>{isCompressingImage ? 'Mengompres...' : attachedImageDataUrl ? 'Ganti Foto' : '+ Foto'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTagMode('film');
                        setDropdownOpen(!dropdownOpen || tagMode !== 'film');
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        selectedFilmId
                          ? 'bg-[#FF2E7E]/20 text-[#FF2E7E] border border-[#FF2E7E]/40'
                          : 'bg-white/[0.06] text-slate-300 hover:text-white hover:bg-white/[0.12] border border-white/10'
                      }`}
                    >
                      <Film className="w-3.5 h-3.5 text-[#FF2E7E]" />
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
                          : 'bg-white/[0.06] text-slate-300 hover:text-white hover:bg-white/[0.12] border border-white/10'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 text-[#FF2E7E]" />
                      <span>Tag Artikel</span>
                    </button>
                  </div>

                  {/* Rating Selector if film tagged */}
                  {selectedFilmId && (
                    <div className="flex items-center gap-1.5 bg-[#0E1013] px-3 py-1.5 rounded-xl border border-white/10">
                      <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                        <Star className="w-3 h-3 text-[#FFD000] fill-current" />
                        Skor:
                      </span>
                      <select
                        value={skorMention || ''}
                        onChange={e => setSkorMention(e.target.value ? Number(e.target.value) : undefined)}
                        className="bg-white/[0.06] text-[#FFD000] font-bold text-xs rounded-lg px-2 py-0.5 border border-[#FFD000]/30 focus:outline-none focus:border-[#FFD000] cursor-pointer"
                      >
                        <option value="" className="text-slate-400 bg-[#171A1F]">Pilih Skor (1-10)</option>
                        {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(num => (
                          <option key={num} value={num} className="bg-[#171A1F] text-[#FFD000]">
                            ★ {num}.0 / 10.0
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Dropdown Menu for Tagging */}
                {dropdownOpen && (
                  <div className="absolute left-0 bottom-full mb-2 w-full bg-[#171A1F] border border-white/10 rounded-2xl p-3 shadow-2xl z-30 space-y-2">
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
                        className="w-full pl-9 pr-3 py-1.5 bg-[#0E1013] border border-white/10 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#FF2E7E]"
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
                                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.06] text-left transition-colors"
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
                                  <Check className="w-4 h-4 text-[#FF2E7E]" />
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
                                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.06] text-left transition-colors"
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
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
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
              disabled={!postContent.trim() || isCompressingImage || isSubmittingPost}
              className="px-5 py-2.5 rounded-xl bg-[#FF2E7E] hover:bg-[#e0266e] text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmittingPost ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menerbitkan...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Terbitkan Buzz</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
