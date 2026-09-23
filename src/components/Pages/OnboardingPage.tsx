import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Camera, User as UserIcon, AtSign, FileText, Sparkles, ArrowRight, Loader2, Film, Check, Compass } from 'lucide-react';
import { motion } from 'motion/react';
import { ProfilePhotoCropModal } from '../Common/ProfilePhotoCropModal';

export const OnboardingPage: React.FC = () => {
  const { currentUser, finishOnboarding, uploadProfilePhoto, showToast } = useApp();
  const [name, setName] = useState(currentUser.name || '');
  const [handle, setHandle] = useState((currentUser.handle || '').replace('@', ''));
  const [bio, setBio] = useState(currentUser.bio || '');
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80');
  const [selectedGenres, setSelectedGenres] = useState<string[]>(['Sci-Fi', 'Neo-Noir', 'Drama & Auteur']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Photo Cropping state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<{
    src: string;
    name: string;
    size: number;
    type: string;
  } | null>(null);

  const availableGenres = [
    'Sci-Fi',
    'Psychological Thriller',
    'Neo-Noir',
    'Anime',
    'Drama & Auteur',
    'Horror & Gore',
    'Action & Martial Arts',
    'Cinema Gear & Optics',
    'Documentary & Film Studies',
  ];

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showToast('Mohon pilih file gambar yang valid (JPG, PNG, WEBP).');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        showToast('Ukuran gambar terlalu besar. Maksimal 5 MB.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (base64) {
          setImageToCrop({
            src: base64,
            name: file.name,
            size: file.size,
            type: file.type,
          });
          setCropModalOpen(true);
        }
      };
      reader.readAsDataURL(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCropConfirmed = async (
    croppedDataUrl: string,
    fileName?: string,
    fileSize?: number,
    fileType?: string
  ) => {
    setSelectedAvatar(croppedDataUrl);
    await uploadProfilePhoto(croppedDataUrl, fileName, fileSize, fileType);
  };

  const handleCloseCropModal = () => {
    setCropModalOpen(false);
    setImageToCrop(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !handle.trim()) return;
    
    setIsSubmitting(true);
    try {
      await finishOnboarding({
        name,
        handle: handle.startsWith('@') ? handle : `@${handle}`,
        bio,
        avatar: selectedAvatar,
        favoriteGenres: selectedGenres,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0C14] px-4 py-8 sm:py-12 relative overflow-hidden">
      {/* Decorative ambient gradients */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-25">
        <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-[#FF2E7E] rounded-full blur-[140px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-[#00F0FF] rounded-full blur-[140px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-2xl relative z-10 my-auto"
      >
        <div className="bg-[#121324]/90 backdrop-blur-2xl border border-slate-800/80 rounded-3xl sm:rounded-[36px] p-6 sm:p-10 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF2E7E]/15 border border-[#FF2E7E]/30 text-[#FF2E7E] text-[11px] font-black uppercase tracking-widest mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Personalisasi Akun</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight mb-2">
              Lengkapi Profil <span className="text-[#FFD000]">Cinephile</span> Kamu
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
              Atur identitasmu, pilih avatar sinematik, dan tentukan genre favoritmu untuk menjelajahi Sotoy Film.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
            {/* Avatar Selection & Presets */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 text-center">
              <div className="flex flex-col items-center">
                <div className="relative group">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-[#FFD000]/40 shadow-xl bg-slate-950">
                    <img 
                      src={selectedAvatar} 
                      alt="Profile Preview" 
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <button
                    type="button"
                    id="onboarding-upload-photo-btn"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Upload custom profile photo"
                    className="absolute bottom-[-6px] right-[-6px] w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-r from-[#FFD000] to-[#FF8008] text-slate-950 rounded-xl flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all"
                  >
                    <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
                <p className="mt-3 text-xs font-bold text-slate-300">
                  Foto Profil Akun
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Ketuk ikon kamera untuk mengunggah foto profil dari perangkatmu.
                </p>
              </div>
            </div>

            {/* Form Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-[#FFD000]" />
                  Nama Lengkap / Panggilan <span className="text-[#FF2E7E]">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Budi Nolan"
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FFD000] focus:ring-1 focus:ring-[#FFD000]/30 transition-all min-h-[44px]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <AtSign className="w-3.5 h-3.5 text-[#00F0FF]" />
                  Username / Handle <span className="text-[#FF2E7E]">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">@</span>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                    placeholder="budinolan"
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-9 pr-4 py-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00F0FF] focus:ring-1 focus:ring-[#00F0FF]/30 transition-all min-h-[44px]"
                    required
                  />
                </div>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#FF2E7E]" />
                  Bio Singkat
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Ceritakan selera filmmu, sutradara favorit, atau alasan bergabung di Sotoy Film..."
                  rows={2}
                  maxLength={180}
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF2E7E] focus:ring-1 focus:ring-[#FF2E7E]/30 transition-all resize-none min-h-[72px]"
                />
                <div className="flex justify-end text-[10px] text-slate-500 font-medium">
                  {bio.length}/180 karakter
                </div>
              </div>
            </div>

            {/* Favorite Genres Selector */}
            <div className="space-y-2.5 pt-1">
              <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-[#FFD000]" />
                Genre Sinema Favorit (Pilih yang kamu suka)
              </label>
              <div className="flex flex-wrap gap-2">
                {availableGenres.map(genre => {
                  const isChecked = selectedGenres.includes(genre);
                  return (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => toggleGenre(genre)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 min-h-[40px] ${
                        isChecked
                          ? 'bg-[#FFD000] text-slate-950 shadow-md shadow-[#FFD000]/20 font-black'
                          : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      <span>{genre}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              id="onboarding-submit-btn"
              disabled={isSubmitting || !name.trim() || !handle.trim()}
              className="w-full group relative bg-gradient-to-r from-[#FFD000] via-[#FF8008] to-[#FF2E7E] text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed py-4 sm:py-4.5 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider shadow-xl shadow-[#FFD000]/20 hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 min-h-[48px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                  <span>Menyimpan ke Firestore...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Dunia Sinema Sotoy</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-slate-500 text-[11px] font-medium">
          Profil publikmu akan dapat dikunjungi oleh sesama cinephile di Sotoy Film.
        </p>
      </motion.div>

      {/* 1:1 Square Profile Photo Crop Modal */}
      <ProfilePhotoCropModal
        isOpen={cropModalOpen}
        imageSrc={imageToCrop?.src || null}
        fileName={imageToCrop?.name}
        fileSize={imageToCrop?.size}
        fileType={imageToCrop?.type}
        onClose={handleCloseCropModal}
        onCropConfirmed={handleCropConfirmed}
      />
    </div>
  );
};

