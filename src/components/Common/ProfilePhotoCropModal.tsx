import React, { useState, useCallback, useEffect } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import { X, ZoomIn, ZoomOut, Check, Loader2, Crop } from 'lucide-react';
import { createCroppedImage } from '../../utils/cropImage';
import { useApp } from '../../context/AppContext';

interface ProfilePhotoCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  onClose: () => void;
  onCropConfirmed: (
    croppedDataUrl: string,
    fileName?: string,
    fileSize?: number,
    fileType?: string
  ) => Promise<void>;
}

export const ProfilePhotoCropModal: React.FC<ProfilePhotoCropModalProps> = ({
  isOpen,
  imageSrc,
  fileName,
  fileSize,
  fileType,
  onClose,
  onCropConfirmed,
}) => {
  const { showToast } = useApp();
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset state when modal opens with a new image
  useEffect(() => {
    if (isOpen) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setIsProcessing(false);
    }
  }, [isOpen, imageSrc]);

  // Close on Escape key if not currently uploading
  useEffect(() => {
    if (!isOpen || isProcessing) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing, onClose]);

  const onCropComplete = useCallback((_croppedArea: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(3, +(prev + 0.2).toFixed(2)));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(1, +(prev - 0.2).toFixed(2)));
  };

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels || isProcessing) return;

    setIsProcessing(true);
    try {
      // 1. Generate confirmed 1:1 square cropped image from canvas
      const croppedDataUrl = await createCroppedImage(
        imageSrc,
        croppedAreaPixels,
        fileType || 'image/jpeg'
      );

      // 2. Pass square data URL to uploadProfilePhoto
      await onCropConfirmed(croppedDataUrl, fileName, fileSize, fileType);
      
      showToast('Foto profil berhasil diperbarui! ✨');
      onClose();
    } catch (err: any) {
      console.error('[ProfilePhotoCropModal] Gagal memproses cropping/upload:', err);
      showToast('Gagal memproses foto profil. Silakan coba lagi.');
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !imageSrc) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-modal-title"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="relative bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FF2E7E]/10 text-[#FF2E7E] flex items-center justify-center">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 id="crop-modal-title" className="text-sm font-bold text-white leading-tight">
                Sesuaikan Foto Profil
              </h3>
              <p className="text-[11px] text-slate-400">
                Posisikan wajah & atur zoom (rasio 1:1)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cropper Viewport Container */}
        <div className="relative w-full h-72 sm:h-80 bg-slate-950 overflow-hidden select-none">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            zoomSpeed={0.8}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Controls: Zoom slider & hint */}
        <div className="p-4 sm:p-5 space-y-3 bg-slate-900 border-t border-slate-800/80">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoom <= 1 || isProcessing}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Perkecil zoom"
              aria-label="Perkecil zoom"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <div className="flex-1 flex items-center gap-2">
              <input
                type="range"
                min={1}
                max={3}
                step={0.02}
                value={zoom}
                disabled={isProcessing}
                onChange={e => setZoom(Number(e.target.value))}
                aria-label="Kontrol perbesaran foto"
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#FF2E7E] focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoom >= 3 || isProcessing}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Perbesar zoom"
              aria-label="Perbesar zoom"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <span className="text-xs font-mono font-bold text-slate-400 w-12 text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          <p className="text-[11px] text-slate-400 text-center">
            Geser foto dengan mouse atau jari untuk mengatur posisi avatar.
          </p>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={isProcessing}
              className="px-5 py-2.5 rounded-xl bg-[#FF2E7E] hover:bg-[#e0266e] text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-[#FF2E7E]/20 transition-all hover:scale-102 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan Foto...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan & Terapkan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
