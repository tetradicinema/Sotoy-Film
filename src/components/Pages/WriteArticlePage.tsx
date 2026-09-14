import React, { useState } from 'react';
import {
  PenSquare,
  Sparkles,
  Lock,
  ArrowLeft,
  CheckCircle,
  Eye,
  Image as ImageIcon,
  Star,
  Send,
  HelpCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MainCategory, SubCategory } from '../../types';

export const WriteArticlePage: React.FC = () => {
  const {
    currentUser,
    isLoggedIn,
    setLoginModalOpen,
    switchRole,
    addArticle,
    navigateTo,
    showToast,
  } = useApp();

  const isAuthorized = isLoggedIn && (currentUser.role === 'penulis_sotoy' || currentUser.role === 'admin');

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<MainCategory>('movies');
  const [subCategory, setSubCategory] = useState<SubCategory>('news');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80');
  const [tagsInput, setTagsInput] = useState('Film, Bioskop, Review');
  const [readTime, setReadTime] = useState('5 mnt baca');
  const [previewMode, setPreviewMode] = useState(false);

  // Subcategory mapping based on category
  const subCategoryOptions: Record<MainCategory, { id: SubCategory; label: string }[]> = {
    movies: [
      { id: 'news', label: 'News' },
      { id: 'lists', label: 'Lists' },
      { id: 'reviews', label: 'Reviews' },
    ],
    series: [
      { id: 'news', label: 'News' },
      { id: 'lists', label: 'Lists' },
      { id: 'reviews', label: 'Reviews' },
    ],
    anime: [
      { id: 'news', label: 'News' },
      { id: 'lists', label: 'Lists' },
    ],
    'cinema-gear': [
      { id: 'gear-news', label: 'Gear News' },
      { id: 'gear-reviews', label: 'Gear Reviews' },
    ],
    'film-studies': [
      { id: 'producing', label: 'Producing' },
      { id: 'directing', label: 'Directing' },
      { id: 'cinematography', label: 'Cinematography' },
      { id: 'lighting', label: 'Lighting' },
      { id: 'post-production', label: 'Post-Production' },
    ],
  };

  const handleCategoryChange = (newCat: MainCategory) => {
    setCategory(newCat);
    setSubCategory(subCategoryOptions[newCat][0].id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      showToast('Harap isi judul dan konten artikel!');
      return;
    }

    const cleanTags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const success = addArticle({
      title,
      slug,
      excerpt: excerpt || title,
      content,
      coverImage,
      category,
      subCategory,
      author: {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
        role: currentUser.role,
      },
      readTime,
      tags: cleanTags.length > 0 ? cleanTags : ['SotoyFilm'],
    });

    if (success) {
      navigateTo('category', { category, subCategory });
    }
  };

  // If user is Warga Sotoy or Si Paling Sotoy, show Role-based access explanation
  if (!isAuthorized) {
    return (
      <div className="min-h-screen py-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-[#121324] border border-slate-800 rounded-3xl p-8 text-center shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-[#FF2E7E]/20 text-[#FF2E7E] flex items-center justify-center mx-auto border border-[#FF2E7E]/40">
            <Lock className="w-8 h-8" />
          </div>

          <h2 className="font-display font-black text-2xl text-white">
            Akses Menulis Terbatas
          </h2>

          <div className="text-slate-300 text-xs leading-relaxed space-y-2 text-left bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
            <p>
              Sesuai aturan hak akses <strong>Sotoy Film</strong>:
            </p>
            <ul className="list-disc pl-4 space-y-1 text-slate-400">
              <li>
                <strong>Warga Sotoy</strong> & <strong>Si Paling Sotoy (Critic)</strong> tidak dapat menulis artikel berita/editorial. Namun bisa memberikan <em>Skor Sotoy</em>, menulis ulasan di database film, dan posting di <em>Buzz Feed</em>.
              </li>
              <li>
                Hanya <strong>Penulis Sotoy (Writer)</strong> & <strong>Admin</strong> yang berwenang menerbitkan artikel editorial.
              </li>
            </ul>
          </div>

          <div className="space-y-2 pt-2">
            {!isLoggedIn ? (
              <button
                id="login-to-write-btn"
                onClick={() => setLoginModalOpen(true)}
                className="w-full bg-gradient-to-r from-[#FF2E7E] to-[#FF8008] hover:brightness-110 text-white font-black text-xs uppercase tracking-wider py-3 rounded-xl transition-all shadow-lg shadow-[#FF2E7E]/25"
              >
                Masuk (Log In) Akun Penulis Sekarang
              </button>
            ) : (
              <button
                id="switch-to-writer-btn"
                onClick={() => switchRole('penulis_sotoy')}
                className="w-full bg-[#FF2E7E] hover:bg-[#ff156d] text-white font-black text-xs uppercase tracking-wider py-3 rounded-xl transition-all shadow-lg shadow-[#FF2E7E]/25"
              >
                Beralih ke Akun "Penulis Sotoy" Sekarang
              </button>
            )}
            <button
              onClick={() => navigateTo('home')}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2.5 rounded-xl transition-colors"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateTo('home')}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Batal & Kembali</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewMode(!previewMode)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span>{previewMode ? 'Mode Edit' : 'Live Preview'}</span>
            </button>
          </div>
        </div>

        <div className="bg-[#121324] border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-[#FF2E7E]/20 text-[#FF2E7E] flex items-center justify-center">
              <PenSquare className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display font-black text-2xl text-white">
                Studio Editor Penulis Sotoy
              </h1>
              <p className="text-slate-400 text-xs">
                Publikasikan berita, review Skor Sotoy, kurasi daftar, atau modul studi perfilman.
              </p>
            </div>
          </div>

          {previewMode ? (
            /* Live Preview Mode */
            <div className="space-y-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
              <span className="text-[10px] font-bold text-[#FF2E7E] uppercase tracking-wider">
                {category} • {subCategory}
              </span>
              <h2 className="font-display font-black text-3xl text-white">
                {title || 'Judul Artikel Kamu'}
              </h2>
              {coverImage && (
                <img src={coverImage} alt="Cover preview" className="w-full h-64 object-cover rounded-2xl" />
              )}
              <p className="text-slate-300 text-sm italic">{excerpt || 'Ringkasan artikel...'}</p>
              <div className="prose prose-invert text-slate-200 text-sm whitespace-pre-line">
                {content || 'Isi artikel akan tampil di sini...'}
              </div>
            </div>
          ) : (
            /* Editor Form */
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Judul Artikel <span className="text-[#FF2E7E]">*</span>
                </label>
                <input
                  id="write-title-input"
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Contoh: Bedah Sinematografi Film Joker: Folie à Deux..."
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
                />
              </div>

              {/* Category & SubCategory Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Kategori Utama <span className="text-[#FF2E7E]">*</span>
                  </label>
                  <select
                    id="write-category-select"
                    value={category}
                    onChange={e => handleCategoryChange(e.target.value as MainCategory)}
                    className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#FF2E7E]"
                  >
                    <option value="movies">Movies</option>
                    <option value="series">Series</option>
                    <option value="anime">Anime</option>
                    <option value="cinema-gear">Cinema Gear</option>
                    <option value="film-studies">Film Studies</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Sub-Kategori <span className="text-[#FF2E7E]">*</span>
                  </label>
                  <select
                    id="write-subcategory-select"
                    value={subCategory}
                    onChange={e => setSubCategory(e.target.value as SubCategory)}
                    className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#FF2E7E]"
                  >
                    {subCategoryOptions[category].map(sub => (
                      <option key={sub.id} value={sub.id}>
                        {sub.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Excerpt */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Ringkasan / Excerpt (Lead Paragraph)
                </label>
                <textarea
                  value={excerpt}
                  onChange={e => setExcerpt(e.target.value)}
                  placeholder="Tuliskan hook atau intisari singkat tulisan..."
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E] resize-none"
                />
              </div>

              {/* Cover Image URL */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Cover Image URL
                </label>
                <input
                  type="text"
                  value={coverImage}
                  onChange={e => setCoverImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
                />
              </div>

              {/* Skor Sotoy (if review) & Read Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Estimasi Waktu Baca
                  </label>
                  <input
                    type="text"
                    value={readTime}
                    onChange={e => setReadTime(e.target.value)}
                    placeholder="Contoh: 6 mnt baca"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
                  />
                </div>
              </div>

              {/* Content Editor */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Isi Konten Artikel (Mendukung Markdown ### Heading) <span className="text-[#FF2E7E]">*</span>
                </label>
                <textarea
                  id="write-content-textarea"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Tulis ulasan mendalam, breakdown teknis, atau poin-poin artikel..."
                  required
                  rows={8}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E] resize-y"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Tags (Pisahkan dengan koma)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={e => setTagsInput(e.target.value)}
                  placeholder="IMAX, Sinematografi, Sony FX3, Festival"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
                />
              </div>

              {/* Submit button */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => navigateTo('home')}
                  className="px-5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  id="publish-article-submit-btn"
                  type="submit"
                  className="bg-gradient-to-r from-[#FF2E7E] via-[#FFD000] to-[#00F0FF] hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-[#FF2E7E]/30 transition-transform active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>Terbitkan Artikel</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
