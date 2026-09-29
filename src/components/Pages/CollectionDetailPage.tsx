import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useApp } from '../../context/AppContext';
import { INITIAL_FILMS, INITIAL_ARTICLES } from '../../data/mockData';
import {
  Bookmark,
  Share2,
  Trash2,
  Edit3,
  Check,
  X,
  Star,
  ChevronLeft,
  Calendar,
  Layers,
  FileText,
  Film as FilmIcon,
  MessageCircle,
  Clock,
  Lock,
} from 'lucide-react';

export const CollectionDetailPage: React.FC = () => {
  const { userId, collectionId } = useParams<{ userId: string; collectionId: string }>();
  const {
    currentUser,
    isLoggedIn,
    collections,
    films,
    articles,
    renameCollection,
    removeItemFromCollection,
    shareCollectionToBuzz,
    navigateTo,
    showToast,
  } = useApp();

  const isOwner = isLoggedIn && currentUser?.id === userId;

  // Local state for non-owner viewing shared snapshots
  const [sharedSnapshot, setSharedSnapshot] = useState<any | null>(null);
  const [loadingShared, setLoadingShared] = useState<boolean>(!isOwner);

  // Rename state
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [editNameValue, setEditNameValue] = useState<string>('');

  // Fetch shared snapshot if not owner
  useEffect(() => {
    if (isOwner || !collectionId) {
      setLoadingShared(false);
      return;
    }

    setLoadingShared(true);
    const q = query(
      collection(db, 'buzz'),
      where('sharedCollection.collectionId', '==', collectionId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          // Grab the first buzz post sharing this collection
          const post = snapshot.docs[0].data();
          setSharedSnapshot(post.sharedCollection);
        } else {
          setSharedSnapshot(null);
        }
        setLoadingShared(false);
      },
      (err) => {
        console.error('[CollectionDetail] Error loading shared snapshot:', err);
        setLoadingShared(false);
      }
    );

    return () => unsubscribe();
  }, [collectionId, isOwner]);

  // Find the live collection if owner
  const myCollection = isOwner ? collections.find((c) => c.id === collectionId) : null;

  // Final collection information to display
  const collectionName = isOwner ? myCollection?.name : sharedSnapshot?.name;
  const collectionDesc = isOwner ? myCollection?.description : sharedSnapshot?.description;
  const isDefault = isOwner ? myCollection?.isDefault : false;
  const itemsList = isOwner ? myCollection?.items || [] : sharedSnapshot?.items || [];

  // Sync edit name state
  useEffect(() => {
    if (collectionName) {
      setEditNameValue(collectionName);
    }
  }, [collectionName]);

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectionId || !editNameValue.trim()) {
      showToast('Nama koleksi tidak boleh kosong.', 'error');
      return;
    }
    const success = await renameCollection(collectionId, editNameValue.trim());
    if (success) {
      setIsEditingName(false);
    }
  };

  const handleRemoveItem = async (itemId: string, itemName: string) => {
    if (!collectionId) return;
    if (confirm(`Hapus "${itemName}" dari koleksi ini?`)) {
      await removeItemFromCollection(collectionId, itemId);
    }
  };

  if (loadingShared) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-[#FF2E7E] border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-xs font-bold">Memuat Detail Koleksi...</p>
      </div>
    );
  }

  // If collection not found or not owner & no shared snapshot exists
  if ((isOwner && !myCollection) || (!isOwner && !sharedSnapshot)) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-slate-500 mx-auto border border-slate-800">
          <Lock className="w-6 h-6 text-slate-400" />
        </div>
        <div className="space-y-2">
          <h2 className="font-display font-black text-xl text-white">Koleksi Tidak Dapat Diakses</h2>
          <p className="text-slate-400 text-xs leading-relaxed">
            Koleksi ini bersifat pribadi dan hanya dapat dibaca oleh pemiliknya, atau telah dihapus. Koleksi pribadi hanya dapat diakses orang lain jika dibagikan ke forum <strong>Buzz</strong>.
          </p>
        </div>
        <button
          onClick={() => navigateTo('community-feed')}
          className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs transition-colors border border-slate-850"
        >
          Kembali ke Forum Komunitas
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Back button */}
      <button
        onClick={() => navigateTo('user-profile', { userId })}
        className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-xs font-bold bg-slate-900/50 hover:bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-850"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Kembali ke Profil</span>
      </button>

      {/* Playlist-style Header */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row gap-6 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row items-center gap-6 w-full md:w-auto">
          {/* Cover Art Collage Placeholder */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-[#FF2E7E]/10 border border-[#FF2E7E]/20 flex items-center justify-center text-[#FF2E7E] shrink-0 shadow-lg">
            <Layers className="w-8 h-8" />
          </div>

          <div className="space-y-2 text-center sm:text-left w-full">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
              <span>{isOwner ? 'Koleksi Pribadi' : 'Koleksi Berbagi'}</span>
              <span>•</span>
              <span className="text-[#FF2E7E]">{itemsList.length} item</span>
              {isDefault && (
                <>
                  <span>•</span>
                  <span className="bg-[#FF2E7E]/20 text-[#FF2E7E] px-2 py-0.5 rounded border border-[#FF2E7E]/30 text-[9px]">Daftar Utama</span>
                </>
              )}
            </div>

            {isEditingName ? (
              <form onSubmit={handleRename} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-lg mt-1">
                <input
                  type="text"
                  value={editNameValue}
                  onChange={(e) => setEditNameValue(e.target.value)}
                  maxLength={40}
                  className="px-3.5 py-1.5 text-sm bg-slate-850 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-[#FF2E7E] font-bold flex-1"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors flex items-center justify-center"
                    title="Simpan nama"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingName(false);
                      setEditNameValue(collectionName || '');
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white transition-colors flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-center sm:justify-start gap-2.5">
                <h1 className="font-display font-black text-xl sm:text-2xl text-white tracking-tight">
                  {collectionName}
                </h1>
                {isOwner && (
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-slate-500 hover:text-[#FF2E7E] transition-colors p-1"
                    title="Ganti nama koleksi"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {collectionDesc && (
              <p className="text-slate-400 text-xs sm:text-sm max-w-2xl leading-relaxed">
                {collectionDesc}
              </p>
            )}
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-center md:justify-end border-t border-slate-850/60 md:border-t-0 pt-4 md:pt-0">
          <button
            onClick={() => shareCollectionToBuzz(collectionId!)}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-[#FF2E7E] hover:bg-[#E0246F] text-white transition-colors shadow-lg shadow-[#FF2E7E]/25"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Bagikan ke Buzz</span>
          </button>
        </div>
      </div>

      {/* Grid of mixed items */}
      <div className="space-y-4">
        <h2 className="font-display font-black text-lg text-white">Item dalam Koleksi ({itemsList.length})</h2>

        {itemsList.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/25 rounded-3xl border border-slate-850 flex flex-col items-center justify-center gap-4 max-w-xl mx-auto px-6">
            <Bookmark className="w-12 h-12 text-slate-700" />
            <div className="space-y-1">
              <h4 className="font-display font-bold text-white text-base">Koleksi Masih Kosong</h4>
              <p className="text-slate-400 text-xs max-w-sm leading-relaxed">
                {isOwner
                  ? 'Koleksi ini belum diisi. Jelajahi katalog film atau artikel dan klik tombol simpan untuk menambahkannya di sini!'
                  : 'Koleksi snapshot ini tidak memiliki item.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {itemsList.map((item: any) => {
              if (item.itemType === 'film') {
                const film = films.find((f) => f.id === item.itemId) || INITIAL_FILMS.find((f) => f.id === item.itemId);
                if (!film) return null;

                return (
                  <div key={item.itemId} className="relative group">
                    <div
                      onClick={() => navigateTo('film-detail', { filmId: film.id })}
                      className="bg-[#171A1F] border border-slate-800 rounded-3xl overflow-hidden transition-all duration-300 flex flex-col hover:border-[#FF2E7E]/40 hover:shadow-xl hover:shadow-black/50 hover:-translate-y-1 select-none relative cursor-pointer"
                    >
                      {/* Image container */}
                      <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-950">
                        <img
                          src={film.poster}
                          alt={film.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#171A1F] via-transparent to-transparent opacity-80" />

                        {/* Rating Badge */}
                        <div className="absolute top-2 left-2 bg-black/90 backdrop-blur-md px-2 py-0.5 rounded-lg border border-[#FFD000]/30 text-[#FFD000] text-[11px] font-black flex items-center gap-1 shadow-md">
                          <Star className="w-3 h-3 fill-current text-[#FFD000]" />
                          <span>{film.criticsSkorSotoy ? film.criticsSkorSotoy.toFixed(1) : film.skorSotoy.toFixed(1)}</span>
                        </div>

                        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-bold text-slate-300">
                          <span className="bg-slate-900/90 px-1.5 py-0.5 rounded uppercase">{film.type}</span>
                          <span>{film.year}</span>
                        </div>
                      </div>

                      {/* Content info */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                        <div>
                          <h3 className="font-display font-black text-sm text-slate-100 group-hover:text-[#FF2E7E] transition-colors line-clamp-1 leading-snug">
                            {film.title}
                          </h3>
                          <p className="text-slate-400 text-xs line-clamp-2 mt-1">
                            {film.synopsis || (film as any).kurasiRedaksi || ''}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between text-[10px] font-bold">
                          <span className="text-[#FF2E7E]">Skor Sotoy</span>
                          <span className="text-white bg-slate-900/80 px-2 py-0.5 rounded-lg border border-slate-800">
                            {film.skorSotoy.toFixed(1)} / 5.0
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Delete Quick Badge (for Owner) */}
                    {isOwner && (
                      <button
                        onClick={() => handleRemoveItem(film.id, film.title)}
                        className="absolute top-2 right-2 w-8 h-8 rounded-xl bg-black/80 hover:bg-rose-600 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center shadow-lg transition-all z-10"
                        title="Hapus dari Koleksi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              } else if (item.itemType === 'article') {
                const article = articles.find((a) => a.id === item.itemId) || INITIAL_ARTICLES.find((a) => a.id === item.itemId);
                if (!article) return null;

                return (
                  <div key={item.itemId} className="relative group">
                    <article
                      onClick={() => navigateTo('article-detail', { articleId: article.id })}
                      className="bg-[#171A1F] border border-slate-800 rounded-3xl overflow-hidden hover:border-[#FF2E7E]/60 transition-all duration-300 flex flex-col cursor-pointer shadow-lg"
                    >
                      <div className="relative h-48 w-full overflow-hidden">
                        <img
                          src={article.coverImage}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#171A1F] via-transparent to-transparent" />
                        <span className="absolute top-3 left-3 bg-[#FF2E7E] text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                          {article.subCategory}
                        </span>
                        <span className="absolute top-3 right-3 bg-black/80 backdrop-blur text-pink-400 text-xs font-bold px-2.5 py-0.5 rounded-full border border-pink-500/30 flex items-center gap-1">
                          ♥ {article.likes}
                        </span>
                      </div>

                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
                            <span className="text-slate-300">{article.author.name}</span>
                            <span>•</span>
                            <span>{article.readTime}</span>
                          </div>

                          <h3 className="font-display font-bold text-sm text-white group-hover:text-[#FF2E7E] transition-colors leading-snug mb-2 line-clamp-2">
                            {article.title}
                          </h3>
                          <p className="text-slate-400 text-xs line-clamp-2 mb-4 leading-relaxed">
                            {article.excerpt}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>{article.commentsCount || 0} Komentar</span>
                          </span>
                        </div>
                      </div>
                    </article>

                    {/* Delete Quick Badge (for Owner) */}
                    {isOwner && (
                      <button
                        onClick={() => handleRemoveItem(article.id, article.title)}
                        className="absolute top-3 right-3 w-8 h-8 rounded-xl bg-black/80 hover:bg-rose-600 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center shadow-lg transition-all z-10"
                        title="Hapus dari Koleksi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}
      </div>
    </div>
  );
};
