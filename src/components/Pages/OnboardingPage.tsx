import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Camera,
  User as UserIcon,
  AtSign,
  FileText,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Film,
  Check,
  AlertTriangle,
  LogOut,
  Mail,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { motion } from 'motion/react';
import { ProfilePhotoCropModal } from '../Common/ProfilePhotoCropModal';
import ProfileLinksEditor from '../Common/ProfileLinksEditor';
import { DEFAULT_AVATAR } from '../../data/mockData';
import { normalizeHandle, validateHandle, isReservedHandle } from '../../utils/handleHelpers';
import {
  validateName,
  suggestHandles,
  serializeDraft,
  parseDraft,
  draftStorageKey,
  ONBOARDING_BIO_MAX_LENGTH,
  OnboardingDraft,
} from '../../utils/onboardingHelpers';
import { sanitizeStoredLinks, validateProfileLinks } from '../../utils/profileLinks';
import { compressBuzzImage } from '../../utils/imageCompression';
import { normalizeInterestLabel } from '../../utils/articleCategory';
import { ProfileLink } from '../../types';

type Step = 1 | 2 | 3 | 4;

const TOTAL_STEPS: Step = 4;

const STEP_NAMES: Record<Step, string> = {
  1: 'Profil',
  2: 'Foto',
  3: 'Tentang Kamu',
  4: 'Minat & Persetujuan',
};

const AVAILABLE_GENRES = [
  'Sci-Fi',
  'Psychological Thriller',
  'Neo-Noir',
  'Animation',
  'Drama & Auteur',
  'Horror & Gore',
  'Action & Martial Arts',
  'Cinema Gear & Optics',
  'Documentary & Film Studies',
];

// Only these formats are accepted for the profile photo (checked before compression).
const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB before compression

const TERMS_URL = '/terms-conditions';
const PRIVACY_URL = '/privacy-policy';

interface DraftContent {
  name: string;
  handle: string;
  bio: string;
  avatar?: string;
  links: ProfileLink[];
  favoriteGenres: string[];
  acceptedTerms: boolean;
}

/** Stable signature of everything the user can edit (step position excluded). */
const contentSignature = (d: DraftContent): string =>
  JSON.stringify({
    name: d.name,
    handle: d.handle,
    bio: d.bio,
    avatar: d.avatar || '',
    links: d.links,
    favoriteGenres: d.favoriteGenres,
    acceptedTerms: d.acceptedTerms,
  });

export const OnboardingPage: React.FC = () => {
  const {
    currentUser,
    finishOnboarding,
    onboardingError,
    uploadProfilePhoto,
    showToast,
    isHandleAvailable,
    logout,
    isEmailVerified,
    resendVerificationEmail,
    refreshEmailVerification,
  } = useApp();

  // ---------------------------------------------------------------------------
  // Draft bootstrap: fresh (prefilled) values, overridden by a persisted draft
  // in sessionStorage (if any) so the wizard survives a refresh.
  // ---------------------------------------------------------------------------
  const freshDraft = (): OnboardingDraft => ({
    step: 1,
    name: currentUser.name || '',
    handle: (currentUser.handle || '').replace(/^@/, ''),
    bio: currentUser.bio || '',
    ...(currentUser.avatar ? { avatar: currentUser.avatar } : {}),
    links: sanitizeStoredLinks(currentUser.links),
    // Genres always start empty — at least one pick is required in step 4.
    favoriteGenres: [],
    acceptedTerms: false,
  });

  const [initialDraft] = useState<OnboardingDraft>(() => {
    const fresh = freshDraft();
    try {
      const raw = currentUser.id
        ? sessionStorage.getItem(draftStorageKey(currentUser.id))
        : null;
      const restored = parseDraft(raw);
      if (restored) {
        return {
          ...restored,
          // Prefill from the current profile when the draft left a field empty.
          name: restored.name || fresh.name,
          handle: restored.handle || fresh.handle,
          bio: restored.bio || fresh.bio,
          avatar: restored.avatar || fresh.avatar,
        };
      }
    } catch {
      // sessionStorage unavailable — fall back to a fresh draft.
    }
    return fresh;
  });

  // Baseline for the beforeunload warning: content as if no draft existed.
  const [baselineSignature] = useState(() => contentSignature(freshDraft()));

  // ---------------------------------------------------------------------------
  // Wizard state
  // ---------------------------------------------------------------------------
  const [step, setStep] = useState<Step>(initialDraft.step);
  const [name, setName] = useState(initialDraft.name);
  const [handle, setHandle] = useState(initialDraft.handle);
  const [bio, setBio] = useState(initialDraft.bio);
  const [avatar, setAvatar] = useState(initialDraft.avatar || '');
  const [links, setLinks] = useState<ProfileLink[]>(initialDraft.links);
  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    initialDraft.favoriteGenres.map(normalizeInterestLabel)
  );
  const [acceptedTerms, setAcceptedTerms] = useState(initialDraft.acceptedTerms);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [nameAttempted, setNameAttempted] = useState(false);
  const [step4Attempted, setStep4Attempted] = useState(false);

  // Handle uniqueness feedback (400 ms debounce)
  const [handleStatus, setHandleStatus] = useState<{
    checking: boolean;
    available?: boolean;
    message?: string;
  } | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  // Bumped when a submit-time handle conflict is reported so the debounced
  // availability check re-runs for the handle the user already typed.
  const [handleCheckNonce, setHandleCheckNonce] = useState(0);

  // Profile photo cropping state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<{
    src: string;
    name: string;
    size: number;
    type: string;
  } | null>(null);

  // Email verification card (non-blocking) — EmailVerificationBanner patterns
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const handleInputRef = useRef<HTMLInputElement>(null);
  const photoBtnRef = useRef<HTMLButtonElement>(null);
  const bioRef = useRef<HTMLTextAreaElement>(null);
  const genresRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);
  const lastPersistedAvatar = useRef(currentUser.avatar);

  const nameValidation = validateName(name);
  const currentSignature = contentSignature({
    name,
    handle,
    bio,
    avatar,
    links,
    favoriteGenres: selectedGenres,
    acceptedTerms,
  });
  const hasUnsavedChanges = currentSignature !== baselineSignature;

  // ---------------------------------------------------------------------------
  // Handle availability check — 400 ms debounce, stale results discarded
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const trimmed = handle.trim();
    if (!trimmed) {
      setHandleStatus(null);
      setSuggestions([]);
      return;
    }

    const clean = normalizeHandle(trimmed);

    if (isReservedHandle(clean)) {
      setHandleStatus({
        checking: false,
        available: false,
        message: `Handle ${clean} dicadangkan oleh sistem. Silakan pilih handle yang lain.`,
      });
      setSuggestions([]);
      return;
    }

    const validation = validateHandle(clean);
    if (!validation.isValid) {
      setHandleStatus({
        checking: false,
        available: false,
        message: validation.error,
      });
      setSuggestions([]);
      return;
    }

    setHandleStatus({ checking: true });
    setSuggestions([]);

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await isHandleAvailable(clean, currentUser.id);
        if (cancelled) return;

        if (res.available) {
          setHandleStatus({
            checking: false,
            available: true,
            message: `Handle ${clean} tersedia!`,
          });
          setSuggestions([]);
          return;
        }

        setHandleStatus({
          checking: false,
          available: false,
          message:
            res.reason ||
            `Handle ${clean} sudah digunakan oleh pengguna lain. Silakan pilih handle yang berbeda.`,
        });

        // The handle is taken: offer up to 3 availability-checked suggestions.
        const candidates = suggestHandles(clean.replace(/^@/, ''), 6).filter(
          c => c !== clean
        );
        const checked = await Promise.all(
          candidates.map(c =>
            isHandleAvailable(c, currentUser.id)
              .then(r => ({ c, ok: r.available }))
              .catch(() => ({ c, ok: false }))
          )
        );
        if (cancelled) return;
        setSuggestions(checked.filter(x => x.ok).slice(0, 3).map(x => x.c));
      } catch {
        if (!cancelled) setHandleStatus(null);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [handle, currentUser.id, isHandleAvailable, handleCheckNonce]);

  // ---------------------------------------------------------------------------
  // Persist the wizard state to sessionStorage (cleared only on success)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!currentUser.id || completedRef.current) return;
    const draft: OnboardingDraft = {
      step,
      name,
      handle,
      bio,
      ...(avatar ? { avatar } : {}),
      links,
      favoriteGenres: selectedGenres,
      acceptedTerms,
    };
    try {
      sessionStorage.setItem(
        draftStorageKey(currentUser.id),
        serializeDraft(draft)
      );
    } catch {
      // Storage unavailable — persistence is best-effort.
    }
  }, [
    currentUser.id,
    step,
    name,
    handle,
    bio,
    avatar,
    links,
    selectedGenres,
    acceptedTerms,
  ]);

  // Warn before closing/refreshing while there are unsaved content changes.
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasUnsavedChanges]);

  // Move focus to the first field of each step.
  useEffect(() => {
    if (step === 1) nameRef.current?.focus();
    else if (step === 2) photoBtnRef.current?.focus();
    else if (step === 3) bioRef.current?.focus();
    else {
      const firstGenre =
        genresRef.current?.querySelector('button') ?? genresRef.current;
      firstGenre?.focus();
    }
  }, [step]);

  // Adopt the persisted photo URL once uploadProfilePhoto finishes (falls back
  // to the local cropped data URL when the upload itself failed).
  useEffect(() => {
    if (currentUser.avatar && currentUser.avatar !== lastPersistedAvatar.current) {
      lastPersistedAvatar.current = currentUser.avatar;
      setAvatar(currentUser.avatar);
    }
  }, [currentUser.avatar]);

  // Submit-time handle conflict (taken meanwhile): go back to step 1 with a
  // clear message and re-run the availability check for the typed handle.
  useEffect(() => {
    if (onboardingError !== 'handle_taken') return;
    setStep(1);
    setHandleCheckNonce(n => n + 1);
    showToast(
      `Handle ${normalizeHandle(handle)} sudah digunakan. Silakan pilih handle yang berbeda.`,
      'error'
    );
    // Deliberately depend only on onboardingError so the toast fires once per
    // failed attempt (showToast gets a fresh identity every render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingError]);

  // 60 s resend cooldown (EmailVerificationBanner pattern)
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => setResendCooldown(prev => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  const validateCurrentStep = (): boolean => {
    if (step === 1) {
      setNameAttempted(true);
      if (!nameValidation.isValid) {
        showToast(nameValidation.error || 'Nama tidak valid.', 'error');
        return false;
      }

      const clean = normalizeHandle(handle);
      if (!clean) {
        showToast('Handle wajib diisi.', 'error');
        return false;
      }
      if (isReservedHandle(clean)) {
        showToast(
          `Handle ${clean} dicadangkan oleh sistem. Silakan pilih handle yang lain.`,
          'error'
        );
        return false;
      }
      const handleValidation = validateHandle(clean);
      if (!handleValidation.isValid) {
        showToast(handleValidation.error || 'Format handle tidak valid.', 'error');
        return false;
      }
      if (handleStatus?.checking) {
        showToast('Tunggu sebentar, masih memeriksa ketersediaan handle...');
        return false;
      }
      if (handleStatus?.available !== true) {
        showToast(
          handleStatus?.message ||
            `Handle ${clean} sudah digunakan. Silakan pilih handle yang berbeda.`,
          'error'
        );
        return false;
      }
      return true;
    }

    if (step === 3) {
      // Drop rows the user added but never filled in, then validate the rest.
      const filledLinks = links.filter(l => (l.url || '').trim());
      const { errors } = validateProfileLinks(filledLinks);
      const firstError = Object.values(errors)[0];
      if (firstError) {
        showToast(firstError, 'error');
        return false;
      }
      if (filledLinks.length !== links.length) setLinks(filledLinks);
      return true;
    }

    // Steps 2 (photo) and 4 (validated on submit) always pass.
    return true;
  };

  const advance = () => {
    if (isSubmitting) return;
    if (!validateCurrentStep()) return;
    setStep(Math.min(TOTAL_STEPS, step + 1) as Step);
  };

  const goBack = () => {
    if (isSubmitting || step === 1) return;
    setStep(Math.max(1, step - 1) as Step);
  };

  const submitFinal = async () => {
    setStep4Attempted(true);

    const nameRes = validateName(name);
    if (!nameRes.isValid) {
      setNameAttempted(true);
      setStep(1);
      showToast(nameRes.error || 'Nama tidak valid.', 'error');
      return;
    }
    if (selectedGenres.length === 0) {
      showToast('Pilih minimal 1 genre favoritmu.', 'error');
      return;
    }
    if (!acceptedTerms) {
      showToast(
        'Kamu harus menyetujui Syarat & Ketentuan dan Kebijakan Privasi terlebih dahulu.',
        'error'
      );
      return;
    }
    if (isSubmitting) return; // no double submit

    const cleanHandle = normalizeHandle(handle);
    const filledLinks = links.filter(l => (l.url || '').trim());

    setIsSubmitting(true);
    try {
      const ok = await finishOnboarding({
        name: nameRes.normalized,
        handle: cleanHandle,
        bio: bio.trim(),
        avatar: avatar.trim() || undefined,
        favoriteGenres: selectedGenres,
        links: filledLinks,
        acceptedTerms,
        // The terms timestamps (termsAcceptedAt/termsVersion/onboardingCompletedAt)
        // are stamped server-side by AppContext.finishOnboarding together with
        // hasFinishedOnboarding once the Firestore write succeeds.
      });

      if (ok) {
        // Success: clear the persisted draft. On failure we stay on the wizard
        // and keep the draft so nothing the user typed is lost.
        completedRef.current = true;
        try {
          sessionStorage.removeItem(draftStorageKey(currentUser.id));
        } catch {
          // ignore
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (step >= TOTAL_STEPS) {
      void submitFinal();
    } else {
      advance();
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const applySuggestion = (suggestion: string) => {
    setHandle(suggestion.replace(/^@/, ''));
    handleInputRef.current?.focus();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type || !ACCEPTED_PHOTO_TYPES.includes(file.type.toLowerCase())) {
      showToast('Format gambar tidak didukung. Gunakan JPEG, PNG, atau WebP.', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      showToast('Ukuran gambar terlalu besar. Maksimal 5 MB.', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsCompressing(true);
    try {
      // Compress with the existing imageCompression util (~300 KB class output)
      // before handing the image to the square crop modal.
      const compressedDataUrl = await compressBuzzImage(file);
      setImageToCrop({
        src: compressedDataUrl,
        name: file.name,
        size: file.size,
        type: file.type,
      });
      setCropModalOpen(true);
    } catch {
      showToast('Gagal memproses gambar. Coba lagi dengan gambar lain.', 'error');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCropConfirmed = async (
    croppedDataUrl: string,
    fileName?: string,
    fileSize?: number,
    fileType?: string
  ) => {
    setAvatar(croppedDataUrl);
    await uploadProfilePhoto(croppedDataUrl, fileName, fileSize, fileType);
  };

  const handleCloseCropModal = () => {
    setCropModalOpen(false);
    setImageToCrop(null);
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    const sent = await resendVerificationEmail();
    setIsResending(false);
    if (sent) setResendCooldown(60);
  };

  const handleCheckVerification = async () => {
    if (isCheckingVerification) return;
    setIsCheckingVerification(true);
    await refreshEmailVerification();
    setIsCheckingVerification(false);
  };

  const showVerificationCard = !isEmailVerified && !!currentUser.email;
  const filledLinksCount = links.filter(l => (l.url || '').trim()).length;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0C14] px-4 py-8 sm:py-12 relative overflow-hidden">
      {/* Decorative ambient gradients */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-25">
        <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-[#FF2E7E] rounded-full blur-[140px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-[#FF2E7E] rounded-full blur-[140px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-2xl relative z-10 my-auto"
      >
        <div className="bg-[#171717]/90 backdrop-blur-2xl border border-slate-800/80 rounded-3xl sm:rounded-[36px] p-5 sm:p-8 shadow-2xl">
          {/* Header + Keluar */}
          <div className="flex items-start justify-between gap-3 mb-5">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF2E7E]/15 border border-[#FF2E7E]/30 text-[#FF2E7E] text-[11px] font-black uppercase tracking-widest mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Personalisasi Akun</span>
              </div>
              <h1 className="text-xl sm:text-3xl font-display font-black text-white tracking-tight mb-1">
                Lengkapi Profil <span className="text-[#FF2E7E]">Cinephile</span> Kamu
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                Empat langkah singkat untuk menyiapkan identitas sinemaku.
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut || isSubmitting}
              aria-label="Keluar dari akun"
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700/80 bg-slate-900/80 text-slate-300 text-[11px] font-bold hover:text-white hover:border-rose-500/50 hover:bg-rose-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px]"
            >
              {isLoggingOut ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
              <span>Keluar</span>
            </button>
          </div>

          {/* Progress: Langkah x dari 4 */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-widest text-[#FF2E7E]">
                Langkah {step} dari {TOTAL_STEPS}
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {STEP_NAMES[step]}
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={TOTAL_STEPS}
              aria-valuenow={step}
              aria-valuetext={`Langkah ${step} dari ${TOTAL_STEPS}`}
              aria-label="Progres onboarding"
              className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-gradient-to-r from-[#FF2E7E] to-[#e0266e] rounded-full transition-all duration-500"
                style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
              />
            </div>
          </div>

          {/* Non-blocking verification card for unverified email/password users */}
          {showVerificationCard && (
            <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div
                className="flex items-start gap-2.5 text-xs text-amber-200 leading-relaxed min-w-0"
                role="status"
                aria-live="polite"
              >
                <Mail className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  <strong className="text-amber-100 font-bold">
                    Verifikasi email
                  </strong>{' '}
                  diperlukan untuk memposting komentar, ulasan, dan interaksi lain.
                  Onboarding tetap bisa dilanjutkan tanpa verifikasi.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendCooldown > 0 || isResending}
                  aria-label="Kirim ulang email verifikasi"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all min-h-[36px] border disabled:opacity-50 disabled:cursor-not-allowed bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40 active:scale-95"
                >
                  {isResending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Mail className="w-3 h-3" />
                  )}
                  <span>
                    {resendCooldown > 0
                      ? `Kirim ulang email (${resendCooldown}s)`
                      : 'Kirim ulang email'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleCheckVerification}
                  disabled={isCheckingVerification}
                  aria-label="Periksa status verifikasi email"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all min-h-[36px] border disabled:opacity-50 disabled:cursor-not-allowed bg-[#FF2E7E]/15 hover:bg-[#FF2E7E]/25 text-[#FF2E7E] border-[#FF2E7E]/40 active:scale-95"
                >
                  {isCheckingVerification ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3 h-3" />
                  )}
                  <span>Saya sudah verifikasi</span>
                </button>
              </div>
            </div>
          )}

          {/* Wizard */}
          <form onSubmit={handleSubmit} noValidate className="space-y-5 sm:space-y-6">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              {/* ---------------- Step 1: Profile ---------------- */}
              {step === 1 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#FF2E7E]/10 text-[#FF2E7E] flex items-center justify-center shrink-0">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-black text-white tracking-tight">
                        Identitas Kamu
                      </h2>
                      <p className="text-[11px] text-slate-400">
                        Nama tampilan & handle unik untuk profil publikmu.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="onboarding-name"
                      className="text-[11px] font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-[#FF2E7E]" />
                      Nama Lengkap / Panggilan <span className="text-[#FF2E7E]">*</span>
                    </label>
                    <input
                      id="onboarding-name"
                      ref={nameRef}
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Contoh: Budi Nolan"
                      aria-required="true"
                      aria-invalid={nameAttempted && !nameValidation.isValid}
                      aria-describedby={
                        nameAttempted && !nameValidation.isValid
                          ? 'onboarding-name-error'
                          : undefined
                      }
                      maxLength={60}
                      className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF2E7E] focus:ring-1 focus:ring-[#FF2E7E]/30 transition-all min-h-[44px]"
                    />
                    {nameAttempted && !nameValidation.isValid && nameValidation.error && (
                      <p
                        id="onboarding-name-error"
                        role="alert"
                        className="flex items-center gap-1.5 text-[11px] text-rose-400 font-medium"
                      >
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        {nameValidation.error}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="onboarding-handle"
                        className="text-[11px] font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5"
                      >
                        <AtSign className="w-3.5 h-3.5 text-[#FF2E7E]" />
                        Username / Handle <span className="text-[#FF2E7E]">*</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Unik & berbeda
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">
                        @
                      </span>
                      <input
                        id="onboarding-handle"
                        ref={handleInputRef}
                        type="text"
                        value={handle}
                        onChange={e =>
                          setHandle(
                            e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()
                          )
                        }
                        placeholder="budinolan"
                        aria-required="true"
                        aria-invalid={handleStatus?.available === false}
                        aria-describedby="onboarding-handle-status"
                        className={`w-full bg-slate-900/90 border rounded-xl pl-9 pr-4 py-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 transition-all min-h-[44px] ${
                          handleStatus?.available === true
                            ? 'border-emerald-500/60 focus:border-emerald-400 focus:ring-emerald-400/30'
                            : handleStatus?.available === false
                            ? 'border-rose-500/60 focus:border-rose-400 focus:ring-rose-400/30'
                            : 'border-slate-700/80 focus:border-[#FF2E7E] focus:ring-[#FF2E7E]/30'
                        }`}
                      />
                    </div>

                    <div id="onboarding-handle-status" aria-live="polite">
                      {handleStatus?.checking ? (
                        <div className="flex items-center gap-1.5 pt-0.5 text-[11px] text-slate-400 font-mono">
                          <Loader2 className="w-3 h-3 animate-spin text-[#FF2E7E]" />
                          <span>Memeriksa ketersediaan handle...</span>
                        </div>
                      ) : handleStatus?.available === true ? (
                        <div className="flex items-center gap-1.5 pt-0.5 text-[11px] text-emerald-400 font-mono">
                          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{handleStatus.message}</span>
                        </div>
                      ) : handleStatus?.available === false ? (
                        <div className="flex items-center gap-1.5 pt-0.5 text-[11px] text-rose-400 font-mono">
                          <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                          <span>{handleStatus.message}</span>
                        </div>
                      ) : null}
                    </div>

                    {/* Availability-checked suggestions when the handle is taken */}
                    {handleStatus?.available === false && suggestions.length > 0 && (
                      <div className="pt-1.5 space-y-1.5">
                        <p className="text-[11px] font-bold text-slate-400">
                          Coba saran ini:
                        </p>
                        <div
                          role="group"
                          aria-label="Saran handle yang tersedia"
                          className="flex flex-wrap gap-2"
                        >
                          {suggestions.map(s => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => applySuggestion(s)}
                              aria-label={`Gunakan handle ${s}`}
                              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200 hover:border-[#FF2E7E] hover:text-white focus:outline-none focus:ring-1 focus:ring-[#FF2E7E] transition-all min-h-[36px]"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ---------------- Step 2: Photo ---------------- */}
              {step === 2 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#FF2E7E]/10 text-[#FF2E7E] flex items-center justify-center shrink-0">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-black text-white tracking-tight">
                        Foto Profil
                      </h2>
                      <p className="text-[11px] text-slate-400">
                        Opsional — pakai foto Google kamu atau unggah foto baru.
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 text-center">
                    <div className="flex flex-col items-center">
                      <div className="relative group">
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-[#FF2E7E]/40 shadow-xl bg-slate-950">
                          <img
                            src={avatar.trim() || DEFAULT_AVATAR}
                            alt="Pratinjau foto profil"
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <button
                          type="button"
                          ref={photoBtnRef}
                          id="onboarding-upload-photo-btn"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isCompressing || isSubmitting}
                          aria-label="Unggah foto profil (JPEG, PNG, atau WebP, maks. 5 MB)"
                          className="absolute bottom-[-6px] right-[-6px] w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-r from-[#FF2E7E] to-[#e0266e] text-slate-950 rounded-xl flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isCompressing ? (
                            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                          ) : (
                            <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                          )}
                        </button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handlePhotoUpload}
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          aria-hidden="true"
                          tabIndex={-1}
                        />
                      </div>

                      <p className="mt-3 text-xs font-bold text-slate-300">
                        {isCompressing
                          ? 'Mengompres gambar...'
                          : avatar.trim() && avatar === currentUser.avatar
                          ? 'Menggunakan foto profil dari akun kamu'
                          : avatar.trim()
                          ? 'Foto baru siap digunakan'
                          : 'Belum ada foto — akan memakai foto default'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Ketuk ikon kamera untuk mengunggah. Format JPEG/PNG/WebP,
                        maks. 5 MB.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      disabled={isSubmitting}
                      aria-label="Lewati langkah foto profil"
                      className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-400 hover:text-[#FF2E7E] transition-colors disabled:opacity-50 min-h-[36px]"
                    >
                      <span>Lewati</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* ---------------- Step 3: About you ---------------- */}
              {step === 3 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#FF2E7E]/10 text-[#FF2E7E] flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-black text-white tracking-tight">
                        Tentang Kamu
                      </h2>
                      <p className="text-[11px] text-slate-400">
                        Bio singkat & tautan profil (opsional).
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="onboarding-bio"
                      className="text-[11px] font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#FF2E7E]" />
                      Bio Singkat
                    </label>
                    <textarea
                      id="onboarding-bio"
                      ref={bioRef}
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      placeholder="Ceritakan selera filmmu, sutradara favorit, atau alasan bergabung di Sotoy Film..."
                      rows={3}
                      maxLength={ONBOARDING_BIO_MAX_LENGTH}
                      aria-describedby="onboarding-bio-count"
                      className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF2E7E] focus:ring-1 focus:ring-[#FF2E7E]/30 transition-all resize-none min-h-[84px]"
                    />
                    <div
                      id="onboarding-bio-count"
                      className="flex justify-end text-[10px] text-slate-500 font-medium tabular-nums"
                    >
                      {bio.length}/{ONBOARDING_BIO_MAX_LENGTH} karakter
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[11px] font-black text-slate-300 uppercase tracking-wider">
                      Tautan Profil <span className="text-slate-500 font-bold">(opsional, maks. 5)</span>
                    </p>
                    <ProfileLinksEditor
                      value={links}
                      onChange={next => setLinks(next)}
                      disabled={isSubmitting}
                    />
                    <p className="text-[10px] text-slate-500">
                      Terisi {filledLinksCount} tautan — URL wajib https:// dan
                      tervalidasi otomatis.
                    </p>
                  </div>
                </div>
              )}

              {/* ---------------- Step 4: Interests & consent ---------------- */}
              {step === 4 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#FF2E7E]/10 text-[#FF2E7E] flex items-center justify-center shrink-0">
                      <Film className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-black text-white tracking-tight">
                        Minat & Persetujuan
                      </h2>
                      <p className="text-[11px] text-slate-400">
                        Pilih minimal 1 genre favoritmu.
                      </p>
                    </div>
                  </div>

                  <div
                    ref={genresRef}
                    tabIndex={-1}
                    role="group"
                    aria-labelledby="onboarding-genres-label"
                    className="space-y-2.5 focus:outline-none"
                  >
                    <p
                      id="onboarding-genres-label"
                      className="text-[11px] font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5"
                    >
                      <Film className="w-3.5 h-3.5 text-[#FF2E7E]" />
                      Genre Sinema Favorit <span className="text-[#FF2E7E]">*</span>
                      <span className="text-slate-500 font-bold normal-case tracking-normal">
                        ({selectedGenres.length} dipilih)
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_GENRES.map(genre => {
                        const isChecked = selectedGenres.includes(genre);
                        return (
                          <button
                            key={genre}
                            type="button"
                            onClick={() => toggleGenre(genre)}
                            aria-pressed={isChecked}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 min-h-[40px] focus:outline-none focus:ring-1 focus:ring-[#FF2E7E] ${
                              isChecked
                                ? 'bg-[#FF2E7E] text-slate-950 shadow-md shadow-[#FF2E7E]/20 font-black'
                                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                            }`}
                          >
                            {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            <span>{genre}</span>
                          </button>
                        );
                      })}
                    </div>
                    {step4Attempted && selectedGenres.length === 0 && (
                      <p
                        role="alert"
                        className="flex items-center gap-1.5 text-[11px] text-rose-400 font-medium"
                      >
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        Pilih minimal 1 genre favorit.
                      </p>
                    )}
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <label
                      htmlFor="onboarding-terms"
                      className="flex items-start gap-3 cursor-pointer"
                    >
                      <input
                        id="onboarding-terms"
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={e => setAcceptedTerms(e.target.checked)}
                        aria-required="true"
                        aria-invalid={step4Attempted && !acceptedTerms}
                        aria-describedby={
                          step4Attempted && !acceptedTerms
                            ? 'onboarding-terms-error'
                            : undefined
                        }
                        className="w-4 h-4 mt-0.5 shrink-0 rounded border-slate-600 bg-slate-950 text-[#FF2E7E] accent-[#FF2E7E] focus:ring-[#FF2E7E]/40 cursor-pointer"
                      />
                      <span className="text-xs text-slate-300 leading-relaxed">
                        <span className="font-bold text-white">
                          Saya menyetujui{' '}
                        </span>
                        <a
                          href={TERMS_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#FF2E7E] font-bold underline decoration-[#FF2E7E]/40 hover:decoration-[#FF2E7E] transition-colors"
                        >
                          Syarat & Ketentuan
                        </a>{' '}
                        dan{' '}
                        <a
                          href={PRIVACY_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#FF2E7E] font-bold underline decoration-[#FF2E7E]/40 hover:decoration-[#FF2E7E] transition-colors"
                        >
                          Kebijakan Privasi
                        </a>
                      </span>
                    </label>
                    <p className="flex items-center gap-2 text-[11px] text-slate-500">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      Keduanya terbuka di tab baru. Verifikasi email tetap diperlukan
                      untuk bisa memposting.
                    </p>
                    {step4Attempted && !acceptedTerms && (
                      <p
                        id="onboarding-terms-error"
                        role="alert"
                        className="flex items-center gap-1.5 text-[11px] text-rose-400 font-medium"
                      >
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        Kamu harus menyetujui Syarat & Ketentuan dan Kebijakan
                        Privasi.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Navigation: Back / Next (Enter submits the current step) */}
            <div className="flex items-center gap-3 pt-1">
              {step > 1 && (
                <button
                  type="button"
                  onClick={goBack}
                  disabled={isSubmitting}
                  aria-label="Kembali ke langkah sebelumnya"
                  className="inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl border border-slate-700/80 bg-slate-900/80 text-slate-300 text-xs font-black uppercase tracking-wider hover:text-white hover:border-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Kembali</span>
                </button>
              )}

              <button
                type="submit"
                id="onboarding-next-btn"
                disabled={isSubmitting || (step === 1 && handleStatus?.checking === true)}
                aria-label={
                  step >= TOTAL_STEPS
                    ? 'Selesaikan onboarding'
                    : `Lanjut ke langkah ${step + 1} dari ${TOTAL_STEPS}`
                }
                className="flex-1 group relative bg-gradient-to-r from-[#FF2E7E] via-[#e0266e] to-[#FF2E7E] text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider shadow-xl shadow-[#FF2E7E]/20 hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 min-h-[48px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                    <span>Menyimpan ke Firestore...</span>
                  </>
                ) : step >= TOTAL_STEPS ? (
                  <>
                    <span>Selesai & Mulai Menjelajah</span>
                    <Check className="w-5 h-5" />
                  </>
                ) : (
                  <>
                    <span>Lanjut</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
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
