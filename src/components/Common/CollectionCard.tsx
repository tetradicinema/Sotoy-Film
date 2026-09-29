import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCollection, FilmItem, Article } from '../../types';
import { FolderHeart, Share2, Film, FileText, Lock } from 'lucide-react';

interface CollectionCardProps {
  collection: UserCollection;
  ownerId: string;
  allFilms: FilmItem[];
  allArticles: Article[];
  isOwner?: boolean;
  onShareToBuzz?: (colId: string) => void;
}

export const CollectionCard: React.FC<CollectionCardProps> = ({
  collection,
  ownerId,
  allFilms,
  allArticles,
  isOwner = false,
  onShareToBuzz,
}) => {
  const navigate = useNavigate();

  // Extract up to 4 preview thumbnails from collection items
  const previewThumbnails: string[] = [];
  for (const item of collection.items) {
    if (previewThumbnails.length >= 4) break;
    if (item.itemType === 'film') {
      const f = allFilms.find(x => x.id === item.itemId);
      if (f?.poster) previewThumbnails.push(f.poster);
    } else if (item.itemType === 'article') {
      const a = allArticles.find(x => x.id === item.itemId);
      if (a?.coverImage) previewThumbnails.push(a.coverImage);
    }
  }

  const handleCardClick = () => {
    navigate(`/koleksi/${ownerId}/${collection.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="group bg-[#171A1F] border border-slate-800 rounded-3xl p-4 shadow-xl hover:border-[#FF2E7E]/50 transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden"
    >
      {/* Top 2x2 Thumbnail Collage Grid */}
      <div className="aspect-[16/10] w-full rounded-2xl overflow-hidden bg-slate-900 grid grid-cols-2 grid-rows-2 gap-0.5 border border-slate-800/80 relative group-hover:scale-[1.01] transition-transform duration-300">
        {[0, 1, 2, 3].map(index => {
          const thumb = previewThumbnails[index];
          return (
            <div key={index} className="w-full h-full bg-slate-950/80 relative overflow-hidden">
              {thumb ? (
                <img
                  src={thumb}
                  alt={`Preview ${index}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-800">
                  <Film className="w-4 h-4 opacity-40" />
                </div>
              )}
            </div>
          );
        })}

        {/* Count Badge overlay */}
        <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px] font-black text-white border border-slate-700/80 shadow-md">
          {collection.items.length} item
        </div>

        {collection.isDefault && (
          <div className="absolute top-2 left-2 bg-[#00F0FF] text-black px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-md">
            Utama
          </div>
        )}
      </div>

      {/* Details */}
      <div className="pt-3 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-display font-bold text-sm text-white group-hover:text-[#FF2E7E] transition-colors line-clamp-1">
            {collection.name}
          </h3>
          {collection.description && (
            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
              {collection.description}
            </p>
          )}
        </div>

        {/* Action footer */}
        {isOwner && onShareToBuzz && (
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500">Koleksi Pribadi</span>
            <button
              onClick={e => {
                e.stopPropagation();
                onShareToBuzz(collection.id);
              }}
              className="text-[10px] font-bold text-[#FF2E7E] hover:text-white bg-[#FF2E7E]/10 border border-[#FF2E7E]/30 px-2.5 py-1 rounded-xl hover:bg-[#FF2E7E] transition-all flex items-center gap-1"
            >
              <Share2 className="w-3 h-3" />
              <span>Share ke Buzz</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
