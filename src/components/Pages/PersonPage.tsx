import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  ExternalLink,
  Film,
  Globe,
  Loader2,
  MapPin,
  Search,
  Tv,
  User,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { FilmItem } from '../../types';
import { SEOHead } from '../SEO/SEOHead';
import { PersonAvatar } from '../Common/PersonAvatar';
import { findExistingFilmByTmdb, getTmdbPerson } from '../../utils/tmdbHelper';
import type {
  TmdbPersonCredit,
  TmdbPersonDetails,
  TmdbPersonProfileImage,
} from '../../utils/tmdbPersonTrim';
import {
  buildPersonPath,
  calcAge,
  getDepartments,
  groupCreditsByYear,
  parsePersonRouteParam,
  pickKnownFor,
  socialLinks,
} from '../../utils/personHelpers';
import { DEFAULT_BASE_URL } from '../../utils/seoMetadata';

type PageStatus = 'loading' | 'ready' | 'not-found' | 'error';
type CreditTypeFilter = 'all' | 'movie' | 'tv';

const PROFILE_BASE = 'https://image.tmdb.org/t/p/w500';
const POSTER_BASE = 'https://image.tmdb.org/t/p/w342';
const PHOTO_BASE = 'https://image.tmdb.org/t/p/w185';
const PHOTO_LARGE_BASE = 'https://image.tmdb.org/t/p/h632';
const BIO_PREVIEW_LENGTH = 480;

// Module-level caches: revisiting a person is instant, and concurrent visits
// to the same id share a single request.
const personCache = new Map<number, TmdbPersonDetails>();
const personRequests = new Map<number, Promise<TmdbPersonDetails | null>>();

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2E7E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]';

const DEPARTMENT_LABELS: Record<string, string> = {
  Acting: 'Akting',
  Directing: 'Penyutradaraan',
  Writing: 'Penulisan',
  Production: 'Produksi',
  Sound: 'Tata Suara',
  Art: 'Seni',
  Camera: 'Kamera',
  Editing: 'Penyuntingan',
  'Costume & Make-Up': 'Kostum & Rias',
  'Visual Effects': 'Efek Visual',
  Lighting: 'Pencahayaan',
  Crew: 'Kru',
};

const departmentLabel = (department: string): string =>
  DEPARTMENT_LABELS[department] || department;

const genderLabel = (gender: number): string => {
  if (gender === 1) return 'Perempuan';
  if (gender === 2) return 'Laki-laki';
  return '-';
};

const formatPersonDate = (value?: string | null): string => {
  const raw = (value || '').trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (!match) return raw;

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(date.getTime())) return raw;

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
};

const creditRole = (credit: TmdbPersonCredit): string =>
  (credit.character || credit.job || credit.department || '').trim();

const creditYear = (credit: TmdbPersonCredit): string => {
  const match = /^(\d{4})/.exec((credit.release_date || '').trim());
  return match ? match[1] : '';
};

const profileUrl = (path?: string | null): string | null =>
  path ? `${PROFILE_BASE}${path}` : null;

interface PosterThumbProps {
  path?: string | null;
  title: string;
  className?: string;
}

const PosterThumb: React.FC<PosterThumbProps> = ({ path, title, className = '' }) => {
  const [failed, setFailed] = useState(false);

  if (!path || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-900 text-slate-600 ${className}`}
        aria-hidden="true"
      >
        <Film className="w-8 h-8" />
      </div>
    );
  }

  return (
    <img
      src={`${POSTER_BASE}${path}`}
      alt={`Poster ${title}`}
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

const creditMediaType = (credit: TmdbPersonCredit): 'movie' | 'tv' =>
  credit.media_type === 'tv' ? 'tv' : 'movie';

const creditCatalogKey = (credit: TmdbPersonCredit): string =>
  creditMediaType(credit) + ':' + credit.id;

const creditActionTitle = (credit: TmdbPersonCredit, inCatalog: boolean): string =>
  inCatalog ? 'Buka ' + credit.title : 'Impor ' + credit.title + ' ke katalog';

interface CreditItemProps {
  credit: TmdbPersonCredit;
  /** The credit already exists in the Sotoy Film catalog. */
  inCatalog: boolean;
  /** Clicking does something: open a catalog film, or (admin only) import it. */
  actionable: boolean;
  onOpen: (credit: TmdbPersonCredit) => void | Promise<void>;
}

const KnownForCard: React.FC<CreditItemProps> = ({ credit, inCatalog, actionable, onOpen }) => {
  const content = (
    <>
      <div className="aspect-[2/3] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 group-hover:border-[#FF2E7E]/60 transition-colors shadow-md">
        <PosterThumb
          path={credit.poster_path}
          title={credit.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <p className="mt-2 text-xs sm:text-sm font-bold text-white group-hover:text-[#FF2E7E] transition-colors line-clamp-2">
        {credit.title}
      </p>
      <p className="text-[11px] text-slate-400 line-clamp-1">
        {[creditYear(credit), creditRole(credit)].filter(Boolean).join(' \u00B7 ') || 'Katalog Sinema'}
      </p>
    </>
  );

  const wrapperClass = 'w-32 sm:w-40 shrink-0 snap-start text-left';

  if (!actionable) {
    return <div className={wrapperClass}>{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={() => void onOpen(credit)}
      className={wrapperClass + ' group ' + FOCUS_RING}
      title={creditActionTitle(credit, inCatalog)}
    >
      {content}
    </button>
  );
};

const CreditRow: React.FC<CreditItemProps> = ({ credit, inCatalog, actionable, onOpen }) => {
  const role = creditRole(credit);
  const episodeCount = credit.episode_count > 0 ? credit.episode_count + ' episode' : '';
  const meta = [role, episodeCount].filter(Boolean).join(' \u00B7 ');

  const content = (
    <>
      <div className="w-11 sm:w-12 aspect-[2/3] rounded-lg overflow-hidden bg-slate-950 border border-slate-800 shrink-0">
        <PosterThumb
          path={credit.poster_path}
          title={credit.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white group-hover:text-[#FF2E7E] transition-colors line-clamp-1">
          {credit.title}
        </p>
        {meta && (
          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
            {meta}
          </p>
        )}
      </div>

      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-[10px] font-bold text-slate-300">
        {credit.media_type === 'tv' ? (
          <Tv className="w-3 h-3" />
        ) : (
          <Film className="w-3 h-3" />
        )}
        {credit.media_type === 'tv' ? 'Series' : 'Film'}
      </span>
    </>
  );

  const rowClass =
    'w-full flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl bg-slate-900/70 border border-slate-800/80 text-left transition-colors';

  if (!actionable) {
    return <div className={rowClass}>{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={() => void onOpen(credit)}
      className={rowClass + ' group hover:bg-slate-900 hover:border-[#FF2E7E]/50 ' + FOCUS_RING}
      title={creditActionTitle(credit, inCatalog)}
    >
      {content}
    </button>
  );
};

const PersonPageSkeleton: React.FC = () => (
  <div
    className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse"
    aria-busy="true"
    aria-label="Memuat profil orang..."
  >
    <div className="h-9 w-36 bg-slate-800 rounded-xl mb-8" />
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div className="lg:col-span-4 space-y-6">
        <div className="aspect-[2/3] w-full max-w-xs rounded-3xl bg-slate-800/90 border border-slate-700/80" />
        <div className="h-64 rounded-3xl bg-[#171717] border border-slate-800" />
      </div>
      <div className="lg:col-span-8 space-y-6">
        <div className="space-y-3">
          <div className="h-10 sm:h-12 w-3/4 bg-slate-800 rounded-2xl" />
          <div className="h-4 w-40 bg-slate-850 rounded-lg" />
        </div>
        <div className="h-56 rounded-3xl bg-[#171717] border border-slate-800" />
        <div className="h-64 rounded-3xl bg-[#171717] border border-slate-800" />
        <div className="h-96 rounded-3xl bg-[#171717] border border-slate-800" />
      </div>
    </div>
  </div>
);

export const PersonPage: React.FC = () => {
  const { idSlug } = useParams<{ idSlug?: string }>();
  const {
    films,
    navigateTo,
    goBack,
    importAndNavigateToTmdbFilm,
    isAdmin,
  } = useApp();

  const personId = useMemo(() => parsePersonRouteParam(idSlug), [idSlug]);

  const [person, setPerson] = useState<TmdbPersonDetails | null>(() =>
    personId ? personCache.get(personId) || null : null
  );
  const [status, setStatus] = useState<PageStatus>(() => {
    if (!personId) return 'not-found';
    return personCache.has(personId) ? 'ready' : 'loading';
  });
  const [retryToken, setRetryToken] = useState(0);

  const [bioExpanded, setBioExpanded] = useState(false);
  const [activeDepartment, setActiveDepartment] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<CreditTypeFilter>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    setBioExpanded(false);
    setLightboxIndex(null);
    setTypeFilter('all');

    if (!personId) {
      setPerson(null);
      setStatus('not-found');
      return;
    }

    const cached = personCache.get(personId);
    if (cached) {
      setPerson(cached);
      setStatus('ready');
      return;
    }

    let cancelled = false;
    setPerson(null);
    setStatus('loading');

    const load = async () => {
      let request = personRequests.get(personId);
      if (!request) {
        request = getTmdbPerson(personId).finally(() => {
          personRequests.delete(personId);
        });
        personRequests.set(personId, request);
      }

      const data = await request;
      if (cancelled) return;

      if (data) {
        personCache.set(personId, data);
        setPerson(data);
        setStatus('ready');
        return;
      }

      // getTmdbPerson() collapses 404s and network failures into null. Probe the
      // endpoint once so a missing person is not shown as a retryable error.
      try {
        const response = await fetch(
          `/api/tmdb?action=person_details&id=${encodeURIComponent(String(personId))}`
        );
        if (cancelled) return;
        setStatus(response.status === 404 ? 'not-found' : 'error');
      } catch {
        if (!cancelled) setStatus('error');
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [personId, retryToken]);

  useEffect(() => {
    if (lightboxIndex === null) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const profileCount = person?.images?.profiles?.length || 0;
      if (event.key === 'Escape') {
        setLightboxIndex(null);
      } else if (event.key === 'ArrowRight' && profileCount > 0) {
        setLightboxIndex(current =>
          current === null ? null : (current + 1) % profileCount
        );
      } else if (event.key === 'ArrowLeft' && profileCount > 0) {
        setLightboxIndex(current =>
          current === null ? null : (current - 1 + profileCount) % profileCount
        );
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxIndex, person?.images?.profiles?.length]);

  const knownFor = useMemo(
    () => pickKnownFor(person?.credits, person?.known_for_department, 8),
    [person]
  );

  const departments = useMemo(() => getDepartments(person?.credits), [person]);

  useEffect(() => {
    if (departments.length === 0) {
      setActiveDepartment(null);
      return;
    }
    setActiveDepartment(current =>
      current && departments.some(item => item.department === current)
        ? current
        : departments[0].department
    );
  }, [departments]);

  const creditSections = useMemo(
    () =>
      groupCreditsByYear(person?.credits, {
        department: activeDepartment,
        mediaType: typeFilter,
      }),
    [person, activeDepartment, typeFilter]
  );

  const links = useMemo(
    () => socialLinks(person?.external_ids, person?.homepage, person?.imdb_id),
    [person]
  );

  const profiles: TmdbPersonProfileImage[] = useMemo(
    () => person?.images?.profiles?.slice(0, 10) || [],
    [person]
  );

  const biography = (person?.biography || '').trim();
  const isLongBio = biography.length > BIO_PREVIEW_LENGTH;

  const mainProfileUrl = profileUrl(person?.profile_path);
  const isDeceased = Boolean(person?.deathday);
  const bornAge = person && !isDeceased ? calcAge(person.birthday) : null;
  const diedAge = person && person.deathday
    ? calcAge(person.birthday, person.deathday)
    : null;

  const totalCredits =
    (person?.credits?.cast?.length || 0) + (person?.credits?.crew?.length || 0);

  const canonicalPath = person ? buildPersonPath(person.id, person.name) : '';
  const canonicalUrl = person ? `${DEFAULT_BASE_URL}${canonicalPath}` : undefined;

  const seoTitle = person
    ? `${person.name} - Biografi dan Filmografi | Sotoy Film`
    : status === 'not-found'
      ? 'Orang tidak ditemukan | Sotoy Film'
      : 'Profil Orang | Sotoy Film';

  const seoDescription = useMemo(() => {
    if (!person) {
      return 'Profil, biografi, dan filmografi orang di Sotoy Film.';
    }
    const flatBio = person.biography.replace(/\s+/g, ' ').trim();
    if (!flatBio) {
      return `Biografi, filmografi, dan daftar kredit ${person.name} di Sotoy Film.`;
    }
    return flatBio.length > 155
      ? `${flatBio.slice(0, 154).trimEnd()}…`
      : flatBio;
  }, [person]);

  const personSchema = useMemo(() => {
    if (!person || !canonicalUrl) return undefined;

    const schema: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: person.name,
      url: canonicalUrl,
      description: (person.biography || seoDescription).trim(),    };

    const image = profileUrl(person.profile_path);
    if (image) schema.image = image;
    if (person.birthday) schema.birthDate = person.birthday;
    if (person.deathday) schema.deathDate = person.deathday;
    if (person.place_of_birth) {
      schema.birthPlace = { '@type': 'Place', name: person.place_of_birth };
    }
    if (person.known_for_department) schema.jobTitle = person.known_for_department;
    if (links.length > 0) schema.sameAs = links.map(link => link.url);

    return schema;
  }, [person, canonicalUrl, seoDescription, links]);

// Match each credit to the Sotoy Film catalog once per person/catalog change.
  // findExistingFilmByTmdb also checks the media type, so a movie and a series
  // that share a TMDB id are never confused.
  const catalogMatches = useMemo(() => {
    const matches = new Map<string, FilmItem>();
    if (!person) return matches;

    const checked = new Set<string>();
    const allCredits = [...(person.credits?.cast || []), ...(person.credits?.crew || [])];

    for (const credit of allCredits) {
      const key = creditCatalogKey(credit);
      if (checked.has(key)) continue;
      checked.add(key);

      const film = findExistingFilmByTmdb(films, credit.id, creditMediaType(credit), {
        title: credit.title,
        release_date: credit.release_date,
      });
      if (film) matches.set(key, film);
    }

    return matches;
  }, [person, films]);

  const handleCreditClick = useCallback(
    async (credit: TmdbPersonCredit) => {
      const existing = catalogMatches.get(creditCatalogKey(credit));
      if (existing) {
        navigateTo('film-detail', { filmId: existing.id });
        return;
      }

      // Visitors can only open titles that are already in the catalog.
      if (!isAdmin) return;

      await importAndNavigateToTmdbFilm({
        id: credit.id,
        title: credit.title,
        media_type: creditMediaType(credit),
      });
    },
    [catalogMatches, isAdmin, navigateTo, importAndNavigateToTmdbFilm]
  );

  const isStalePerson = Boolean(person && (personId === null || person.id !== personId));

  // Skeleton / neutral loading head. Never noindex: the loading state is
  // transient and must never win over the middleware's indexable HTML
  // (same policy as FranchisePage in commit 31e125c).
  if (status === 'loading' || isStalePerson) {
    return (
      <>
        <SEOHead title="Profil Orang | Sotoy Film" />
        <PersonPageSkeleton />
      </>
    );
  }

  // noindex is reserved for a genuine person-not-found. A transient TMDB
  // error keeps the neutral, indexable head so the page is not deindexed
  // while the request is retried.
  if (status === 'not-found' || status === 'error') {
    const notFound = status === 'not-found';
    return (
      <>
        <SEOHead
          title={notFound ? 'Orang tidak ditemukan | Sotoy Film' : 'Gagal memuat profil | Sotoy Film'}
          description="Profil orang tidak tersedia di Sotoy Film."
          robots={notFound ? 'noindex, follow' : undefined}
        />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div
            className="bg-[#171717] border border-slate-800 rounded-3xl p-8 sm:p-12 text-center shadow-xl"
            role={notFound ? 'status' : 'alert'}
          >
            <div
              className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center border ${
                notFound
                  ? 'bg-slate-900 border-slate-800 text-slate-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}
            >
              {notFound ? <User className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
            </div>

            <h1 className="mt-6 text-2xl sm:text-3xl font-black text-white">
              {notFound ? 'Orang tidak ditemukan' : 'Gagal memuat data orang'}
            </h1>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
              {notFound
                ? 'Profil yang Anda cari tidak tersedia atau sudah dipindahkan dari TMDB.'
                : 'Terjadi kesalahan saat menghubungi TMDB. Periksa koneksi Anda lalu coba lagi.'}
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              {notFound ? (
                <button
                  type="button"
                  onClick={() => navigateTo('search')}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF2E7E] hover:bg-[#e0266e] text-white text-sm font-bold transition-colors ${FOCUS_RING}`}
                >
                  <Search className="w-4 h-4" />
                  Cari orang lain
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setRetryToken(value => value + 1)}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF2E7E] hover:bg-[#e0266e] text-white text-sm font-bold transition-colors ${FOCUS_RING}`}
                >
                  <Loader2 className="w-4 h-4" />
                  Coba lagi
                </button>
              )}

              <button
                type="button"
                onClick={goBack}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 text-sm font-bold transition-colors ${FOCUS_RING}`}
              >
                <ArrowLeft className="w-4 h-4" />
                Kembali
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!person) {
    return (
      <>
        <SEOHead title="Orang tidak ditemukan | Sotoy Film" robots="noindex, follow" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="text-2xl font-black text-white">Orang tidak ditemukan</h1>
        </div>
      </>
    );
  }

  const activeLightboxProfile =
    lightboxIndex !== null ? profiles[lightboxIndex] : null;

  return (
    <>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        image={mainProfileUrl || undefined}
        imageAlt={person.name}
        canonicalUrl={canonicalUrl}
        type="website"
        schema={personSchema}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <button
          type="button"
          onClick={goBack}
          className={`inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 mb-6 ${FOCUS_RING}`}
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN */}
          <aside className="lg:col-span-4 lg:sticky lg:top-24 self-start space-y-6">
            <div className="bg-[#171717] border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="aspect-[2/3] w-full bg-slate-950 relative group">
                <PersonAvatar
                  photo={mainProfileUrl || undefined}
                  name={person.name}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                />
              </div>
              <div className="px-5 py-4 border-t border-slate-800">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#FF2E7E]">
                  Profil TMDB
                </p>
                <p className="text-sm font-bold text-white mt-1">{person.name}</p>
                {person.known_for_department && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Dikenal lewat {person.known_for_department}
                  </p>
                )}
              </div>
            </div>

            <section className="bg-[#171717] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
              <h2 className="text-sm font-black uppercase tracking-[0.16em] text-white flex items-center gap-2">
                <User className="w-4 h-4 text-[#FF2E7E]" />
                Info Pribadi
              </h2>

              <dl className="space-y-3.5 text-sm">
                <div>
                  <dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Dikenal Lewat
                  </dt>
                  <dd className="text-slate-200 font-semibold mt-0.5">
                    {person.known_for_department || '-'}
                  </dd>
                </div>

                <div>
                  <dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Jumlah Kredit
                  </dt>
                  <dd className="text-slate-200 font-semibold mt-0.5">
                    {totalCredits} kredit
                  </dd>
                </div>

                <div>
                  <dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Jenis Kelamin
                  </dt>
                  <dd className="text-slate-200 font-semibold mt-0.5">
                    {genderLabel(person.gender)}
                  </dd>
                </div>

                {person.birthday && (
                  <div>
                    <dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Tanggal Lahir
                    </dt>
                    <dd className="text-slate-200 font-semibold mt-0.5 flex items-start gap-1.5">
                      <Calendar className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#FF2E7E]" />
                      <span>
                        {formatPersonDate(person.birthday)}
                        {bornAge !== null && (
                          <span className="text-slate-400 font-normal">
                            {' '}({bornAge} tahun)
                          </span>
                        )}
                      </span>
                    </dd>
                  </div>
                )}

                {person.deathday && (
                  <div>
                    <dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Tanggal Wafat
                    </dt>
                    <dd className="text-slate-200 font-semibold mt-0.5">
                      {formatPersonDate(person.deathday)}
                      {diedAge !== null && (
                        <span className="text-slate-400 font-normal">
                          {' '}({diedAge} tahun)
                        </span>
                      )}
                    </dd>
                  </div>
                )}

                {person.place_of_birth && (
                  <div>
                    <dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Tempat Lahir
                    </dt>
                    <dd className="text-slate-200 font-semibold mt-0.5 flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#FF2E7E]" />
                      <span>{person.place_of_birth}</span>
                    </dd>
                  </div>
                )}

                {person.also_known_as.length > 0 && (
                  <div>
                    <dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Nama Lain
                    </dt>
                    <dd className="text-slate-300 font-medium mt-0.5 leading-relaxed">
                      {person.also_known_as.join(', ')}
                    </dd>
                  </div>
                )}
              </dl>

              {links.length > 0 && (
                <div className="pt-4 border-t border-slate-800">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2.5">
                    Tautan Eksternal
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {links.map(link => (
                      <a
                        key={link.key}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-[#FF2E7E]/60 text-[11px] font-bold text-slate-300 hover:text-white transition-colors ${FOCUS_RING}`}
                      >
                        {link.key === 'website' ? (
                          <Globe className="w-3 h-3" />
                        ) : (
                          <ExternalLink className="w-3 h-3" />
                        )}
                        <span>{link.label}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </aside>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-8 space-y-6 min-w-0">
            <header className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FF2E7E]/15 border border-[#FF2E7E]/40 text-[#FF2E7E] text-[10px] font-black uppercase tracking-wider">
                  <Users className="w-3 h-3" />
                  Orang
                </span>
                {person.known_for_department && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-bold uppercase tracking-wider">
                    {person.known_for_department}
                  </span>
                )}
              </div>
              <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight leading-tight">
                {person.name}
              </h1>
            </header>

            {/* BIOGRAPHY */}
            <section className="bg-[#171717] border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-4">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <ChevronDown className="w-4 h-4 text-[#FF2E7E]" />
                Biografi
              </h2>

              {biography ? (
                <>
                  <p
                    className={`text-sm text-slate-300 leading-relaxed whitespace-pre-line ${
                      !bioExpanded && isLongBio ? 'line-clamp-6' : ''
                    }`}
                  >
                    {biography}
                  </p>
                  {isLongBio && (
                    <button
                      type="button"
                      onClick={() => setBioExpanded(value => !value)}
                      aria-expanded={bioExpanded}
                      className={`inline-flex items-center gap-1.5 text-xs font-bold text-[#FF2E7E] hover:text-[#ff5c9d] transition-colors ${FOCUS_RING}`}
                    >
                      {bioExpanded ? (
                        <>
                          Tampilkan lebih sedikit
                          <ChevronUp className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          Baca selengkapnya
                          <ChevronDown className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  )}
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Catatan: biografi ini bersumber dari TMDB dan umumnya tersedia dalam bahasa Inggris.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-400 italic">Biografi belum tersedia.</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Catatan: biografi TMDB umumnya tersedia dalam bahasa Inggris.
                  </p>
                </>
              )}
            </section>

            {/* KNOWN FOR */}
            <section className="bg-[#171717] border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Clapperboard className="w-4 h-4 text-[#FF2E7E]" />
                  Dikenal Lewat
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {knownFor.length} judul
                </span>
              </div>

              {knownFor.length > 0 ? (
                <div
                  className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:thin]"
                  role="group"
                  aria-label={`Kredit terkenal ${person.name}`}
                >
                  {knownFor.map(credit => {
                    const inCatalog = catalogMatches.has(creditCatalogKey(credit));

                    return (
                      <KnownForCard
                        key={'known-' + credit.media_type + '-' + credit.id}
                        credit={credit}
                        inCatalog={inCatalog}
                        actionable={inCatalog || isAdmin}
                        onOpen={handleCreditClick}
                      />
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">Belum ada kredit terkenal.</p>
              )}
            </section>

            {/* PHOTOS */}
            <section className="bg-[#171717] border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-[#FF2E7E]" />
                  Foto
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {profiles.length} foto
                </span>
              </div>

              {profiles.length > 0 ? (
                <div
                  className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:thin]"
                  role="group"
                  aria-label={`Foto ${person.name}`}
                >
                  {profiles.map((profile, index) => (
                    <button
                      key={`${profile.file_path}-${index}`}
                      type="button"
                      onClick={() => setLightboxIndex(index)}
                      className={`w-28 sm:w-36 shrink-0 snap-start rounded-xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-[#FF2E7E]/60 transition-colors group ${FOCUS_RING}`}
                      title={`Perbesar foto ${index + 1} ${person.name}`}
                    >
                      <img
                        src={`${PHOTO_BASE}${profile.file_path}`}
                        alt={`Foto ${index + 1} ${person.name}`}
                        loading="lazy"
                        className="w-full aspect-[2/3] object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">Belum ada foto tambahan.</p>
              )}
            </section>

            {/* FILMOGRAPHY */}
            <section className="bg-[#171717] border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Film className="w-4 h-4 text-[#FF2E7E]" />
                  Filmografi
                </h2>

                <div
                  className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800"
                  role="group"
                  aria-label="Filter jenis kredit"
                >
                  {([
                    { value: 'all', label: 'Semua' },
                    { value: 'movie', label: 'Film' },
                    { value: 'tv', label: 'Series' },
                  ] as const).map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTypeFilter(option.value)}
                      aria-pressed={typeFilter === option.value}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${FOCUS_RING} ${
                        typeFilter === option.value
                          ? 'bg-[#FF2E7E] text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {departments.length > 0 ? (
                <div
                  className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]"
                  role="tablist"
                  aria-label="Departemen filmografi"
                >
                  {departments.map(item => {
                    const active = activeDepartment === item.department;
                    return (
                      <button
                        key={item.department}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        aria-controls="person-filmography-panel"
                        onClick={() => setActiveDepartment(item.department)}
                        className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[11px] font-bold transition-colors ${FOCUS_RING} ${
                          active
                            ? 'bg-[#FF2E7E]/15 border-[#FF2E7E]/60 text-[#FF2E7E]'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        {active && <Check className="w-3 h-3" />}
                        <span>{departmentLabel(item.department)}</span>
                        <span className="text-[10px] opacity-70">({item.count})</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <div id="person-filmography-panel" role="tabpanel">
                {creditSections.length > 0 ? (
                  <div className="space-y-6">
                    {creditSections.map(section => (
                    <div key={section.year ?? 'undated'} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <h3 className="text-sm font-black text-white">
                          {section.year ?? 'Tahun tidak diketahui'}
                        </h3>
                        <div className="flex-1 h-px bg-slate-800" />
                        <span className="text-[10px] font-bold text-slate-500">
                          {section.items.length} kredit
                        </span>
                      </div>

                      <ul className="space-y-2">
                        {section.items.map(credit => {
                          const inCatalog = catalogMatches.has(creditCatalogKey(credit));

                          return (
                            <li key={credit.media_type + '-' + credit.id + '-' + (credit.job || credit.character || 'credit')}>
                              <CreditRow
                                credit={credit}
                                inCatalog={inCatalog}
                                actionable={inCatalog || isAdmin}
                                onOpen={handleCreditClick}
                              />
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">
                  Belum ada kredit untuk filter ini.
                </p>
              )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* LIGHTBOX */}
      {lightboxIndex !== null && activeLightboxProfile && (
        <div
          className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`Foto ${person.name}`}
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className={`absolute top-4 right-4 sm:top-6 sm:right-6 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors ${FOCUS_RING}`}
            aria-label="Tutup foto"
          >
            <X className="w-5 h-5" />
          </button>

          {profiles.length > 1 && (
            <>
              <button
                type="button"
                onClick={event => {
                  event.stopPropagation();
                  setLightboxIndex(current =>
                    current === null ? null : (current - 1 + profiles.length) % profiles.length
                  );
                }}
                className={`absolute left-3 sm:left-6 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors ${FOCUS_RING}`}
                aria-label="Foto sebelumnya"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={event => {
                  event.stopPropagation();
                  setLightboxIndex(current =>
                    current === null ? null : (current + 1) % profiles.length
                  );
                }}
                className={`absolute right-3 sm:right-6 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors ${FOCUS_RING}`}
                aria-label="Foto berikutnya"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </>
          )}

          <img
            src={`${PHOTO_LARGE_BASE}${activeLightboxProfile.file_path}`}
            alt={`Foto ${(lightboxIndex ?? 0) + 1} ${person.name}`}
            className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
            onClick={event => event.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};
