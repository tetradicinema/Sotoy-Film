import React, { useState, useEffect } from 'react';
import { X, ZoomIn, Maximize2 } from 'lucide-react';

interface BuzzImageAttachmentProps {
  src?: string;
  alt?: string;
}

export const BuzzImageAttachment: React.FC<BuzzImageAttachmentProps> = ({
  src,
  alt = 'Foto lampiran Buzz',
}) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Close lightbox on Escape key
  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen]);

  // Prevent background scroll when lightbox is open
  useEffect(() => {
    if (isLightboxOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isLightboxOpen]);

  if (!src || hasError) {
    return null;
  }

  return (
    <>
      {/* Feed Image Container with Aspect Ratio to prevent layout shifts */}
      <div
        onClick={() => setIsLightboxOpen(true)}
        className="relative w-full max-h-[400px] aspect-[16/10] sm:aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-800/80 cursor-pointer group my-2.5 shadow-md transition-all hover:border-slate-700"
      >
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setHasError(true)}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />

        {/* Hover overlay hint */}
        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <span className="bg-black/75 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg border border-white/10">
            <Maximize2 className="w-3.5 h-3.5 text-[#00F0FF]" />
            <span>Klik untuk memperbesar</span>
          </span>
        </div>

        {/* Expand badge icon bottom-right */}
        <div className="absolute bottom-2.5 right-2.5 p-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-slate-300 border border-white/10 group-hover:bg-[#00F0FF] group-hover:text-slate-950 transition-colors pointer-events-none">
          <ZoomIn className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
      {isLightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsLightboxOpen(false)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
        >
          {/* Close button in top-right */}
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              setIsLightboxOpen(false);
            }}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2.5 rounded-full bg-slate-900/90 text-slate-300 hover:text-white hover:bg-red-500/80 transition-colors z-50 border border-slate-700 shadow-xl cursor-pointer"
            aria-label="Tutup pratinjau"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Lightbox Image Container */}
          <div
            onClick={e => e.stopPropagation()}
            className="relative max-w-5xl max-h-[90vh] flex items-center justify-center"
          >
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-[88vh] w-auto h-auto object-contain rounded-xl shadow-2xl border border-slate-800 animate-in zoom-in-95 duration-200 select-none"
            />
          </div>
        </div>
      )}
    </>
  );
};
