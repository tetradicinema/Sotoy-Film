import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import { PersonAvatar } from '../Common/PersonAvatar';
import { SEOHead } from '../SEO/SEOHead';
import { getTmdbPopularPeople } from '../../utils/tmdbHelper';
import type { TmdbPersonSearchItem } from '../../utils/tmdbPersonTrim';
import { buildPersonPath } from '../../utils/personHelpers';
import { DEFAULT_BASE_URL } from '../../utils/seoMetadata';

const PHOTO_BASE = 'https://image.tmdb.org/t/p/w342';
const MAX_PAGE = 20;

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
  DEPARTMENT_LABELS[department] || department || '';

// Module-level cache: coming back from a person page keeps the loaded list.
const pagesCache: { people: TmdbPersonSearchItem[]; lastPage: number; done: boolean } = {
  people: [],
  lastPage: 0,
  done: false,
};

const mergeUnique = (
  current: TmdbPersonSearchItem[],
  incoming: TmdbPersonSearchItem[]
): TmdbPersonSearchItem[] => {
  const seen = new Set(current.map(p => p.id));
  const added = incoming.filter(p => p.id > 0 && !seen.has(p.id));
  return [...current, ...added];
};

const knownForTitles = (person: TmdbPersonSearchItem): string => {
  const items = Array.isArray(person.known_for) ? person.known_for : [];
  return items
    .map((item: any) => (item?.title || item?.name || '').trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(', ');
};

const SkeletonCard: React.FC = () => (
  <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden animate-pulse">
    <div className="aspect-[2/3] bg-slate-800/60" />
    <div className="p-3 space-y-2">
      <div className="h-3.5 w-3/4 rounded bg-slate-800" />
      <div className="h-3 w-1/2 rounded bg-slate-800/70" />
    </div>
  </div>
);

export const PeoplePage: React.FC = () => {
  const [people, setPeople] = useState<TmdbPersonSearchItem[]>(pagesCache.people);
  const [page, setPage] = useState<number>(pagesCache.lastPage);
  const [done, setDone] = useState<boolean>(pagesCache.done);
  const [initialLoading, setInitialLoading] = useState<boolean>(pagesCache.people.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestingRef = useRef(false);

  const loadPage = useCallback(async (nextPage: number) => {
    if (requestingRef.current) return;
    requestingRef.current = true;
    setError(null);
    if (nextPage === 1) setInitialLoading(true);
    else setLoadingMore(true);

    try {
      const result = await getTmdbPopularPeople(nextPage);
      const reachedEnd = result.length === 0 || nextPage >= MAX_PAGE;

      setPeople(prev => {
        const merged = mergeUnique(prev, result);
        pagesCache.people = merged;
        return merged;
      });
      pagesCache.lastPage = nextPage;
      pagesCache.done = reachedEnd;
      setPage(nextPage);
      setDone(reachedEnd);
    } catch (err: any) {
      // Keep any cards already on screen; only show the error state.
      setError(err?.message || 'Gagal memuat daftar orang.');
    } finally {
      requestingRef.current = false;
      setInitialLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (pagesCache.people.length === 0) {
      loadPage(1);
    }
  }, [loadPage]);

  const hasPeople = people.length > 0;

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-slate-100">
      <SEOHead
        title="Orang Populer - Aktor, Sutradara, dan Kru | Sotoy Film"
        description="Daftar aktor, sutradara, dan kru film serta series yang sedang ramai dibicarakan minggu ini, lengkap dengan biografi dan filmografi."
        canonicalUrl={`${DEFAULT_BASE_URL}/people`}
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Orang Populer</h1>
          <p className="mt-2 text-sm text-slate-400 max-w-xl">
            Aktor, sutradara, dan kru yang sedang ramai dibicarakan minggu ini.
          </p>
        </header>

        {initialLoading && !hasPeople && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {error && !hasPeople && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center">
            <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-3" />
            <p className="text-sm text-slate-300">Daftar belum bisa dimuat.</p>
            <button
              type="button"
              onClick={() => loadPage(1)}
              className={`mt-4 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium transition-colors ${FOCUS_RING}`}
            >
              Coba lagi
            </button>
          </div>
        )}

        {!initialLoading && !error && !hasPeople && (
          <p className="text-sm text-slate-400 text-center py-16">Belum ada data untuk ditampilkan.</p>
        )}

        {hasPeople && (
          <>
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {people.map(person => {
                const photo = person.profile_path ? `${PHOTO_BASE}${person.profile_path}` : undefined;
                const titles = knownForTitles(person);
                return (
                  <li key={person.id}>
                    <Link
                      to={buildPersonPath(person.id, person.name)}
                      className={`group block h-full rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden hover:border-slate-600 transition-colors ${FOCUS_RING}`}
                    >
                      <div className="aspect-[2/3] bg-slate-950 overflow-hidden">
                        <PersonAvatar photo={photo} name={person.name} />
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-semibold leading-snug line-clamp-2">{person.name}</p>
                        {person.known_for_department && (
                          <p className="mt-0.5 text-xs text-slate-400">
                            {departmentLabel(person.known_for_department)}
                          </p>
                        )}
                        {titles && (
                          <p className="mt-1.5 text-xs text-slate-500 line-clamp-2">{titles}</p>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {error && (
              <p className="mt-6 text-center text-sm text-slate-400">
                Gagal memuat halaman berikutnya.
              </p>
            )}

            {!done && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => loadPage(page + 1)}
                  disabled={loadingMore}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-medium transition-colors ${FOCUS_RING}`}
                >
                  {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loadingMore ? 'Memuat...' : error ? 'Coba lagi' : 'Muat lebih banyak'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
};
