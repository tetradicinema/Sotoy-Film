import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderHeart, ChevronRight, Film } from 'lucide-react';

interface SharedCollectionBuzzCardProps {
  sharedCollection: {
    collectionId: string;
    ownerId: string;
    name: string;
    itemCount: number;
    previewImages: string[];
  };
}

export const SharedCollectionBuzzCard: React.FC<SharedCollectionBuzzCardProps> = ({
  sharedCollection,
}) => {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/koleksi/${sharedCollection.ownerId}/${sharedCollection.collectionId}`);
  };

  return (
    <div
      onClick={handleClick}
      className="mt-3 bg-[#12131A] border border-[#FF2E7E]/30 hover:border-[#FF2E7E] rounded-2xl p-3 shadow-lg hover:shadow-xl transition-all cursor-pointer group flex items-center gap-3 relative overflow-hidden"
    >
      {/* Thumbnail Collage Preview (Small 2x2) */}
      <div className="w-16 h-16 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden grid grid-cols-2 grid-rows-2 gap-0.5 shrink-0">
        {[0, 1, 2, 3].map(idx => {
          const img = sharedCollection.previewImages[idx];
          return (
            <div key={idx} className="w-full h-full bg-slate-950 relative overflow-hidden">
              {img ? (
                <img src={img} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Film className="w-2.5 h-2.5 text-slate-800" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Collection Details */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#FF2E7E] uppercase tracking-wider">
          <FolderHeart className="w-3.5 h-3.5" />
          <span>Koleksi Sinema</span>
        </div>
        <h4 className="font-display font-bold text-xs sm:text-sm text-white group-hover:text-[#FF2E7E] transition-colors truncate mt-0.5">
          {sharedCollection.name}
        </h4>
        <p className="text-[10px] text-slate-400 mt-0.5">
          {sharedCollection.itemCount} item tersimpan
        </p>
      </div>

      <div className="w-7 h-7 rounded-full bg-slate-900 group-hover:bg-[#FF2E7E] text-slate-400 group-hover:text-white flex items-center justify-center transition-all shrink-0 border border-slate-800">
        <ChevronRight className="w-4 h-4" />
      </div>
    </div>
  );
};
