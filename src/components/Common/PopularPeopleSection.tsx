import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { SectionHeader } from './SectionHeader';
import { PersonAvatar } from './PersonAvatar';
import { getTmdbPopularPeople } from '../../utils/tmdbHelper';
import type { TmdbPersonSearchItem } from '../../utils/tmdbPersonTrim';
import { buildPersonPath } from '../../utils/personHelpers';

const PHOTO_BASE = 'https://image.tmdb.org/t/p/w342';
const MAX_ITEMS = 12;

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2E7E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]';

// Module-level cache so navigating back to the Film Database is instant.
let cachedPeople: TmdbPersonSearchItem[] | null = null;

export const PopularPeopleSection: React.FC = () => {
  const [people, setPeople] = useState<TmdbPersonSearchItem[] | null>(cachedPeople);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (cachedPeople) return;
    let cancelled = false;

    (async () => {
      try {
        const result = await getTmdbPopularPeople(1);
        const withPhoto = result.filter(p => p.id > 0 && p.profile_path);
        const picked = (withPhoto.length >= 6 ? withPhoto : result).slice(0, MAX_ITEMS);
        cachedPeople = picked;
        if (!cancelled) setPeople(picked);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Nothing to show: hide the whole section instead of leaving an empty block.
  if (failed || (people && people.length === 0)) return null;

  return (
    <section id="popular-people-section" className="space-y-4">
      <SectionHeader
        title="Orang Populer"
        description="Aktor, sutradara, dan kru yang sedang ramai dibicarakan."
        right={
          <Link
            to="/people"
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium text-white transition-colors ${FOCUS_RING}`}
          >
            <span>Jelajahi People</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        }
      />

      <ul className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1 scrollbar-none">
        {people === null
          ? Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="shrink-0 w-32 sm:w-36 animate-pulse">
                <div className="aspect-[2/3] rounded-xl bg-slate-800/60" />
                <div className="mt-2 h-3.5 w-3/4 rounded bg-slate-800" />
              </li>
            ))
          : people.map(person => {
              const photo = person.profile_path ? `${PHOTO_BASE}${person.profile_path}` : undefined;
              return (
                <li key={person.id} className="shrink-0 w-32 sm:w-36 snap-start">
                  <Link
                    to={buildPersonPath(person.id, person.name)}
                    className={`group block rounded-xl ${FOCUS_RING}`}
                  >
                    <div className="aspect-[2/3] rounded-xl overflow-hidden bg-slate-950 border border-slate-800 group-hover:border-slate-600 transition-colors">
                      <PersonAvatar photo={photo} name={person.name} />
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-snug line-clamp-2 text-slate-100 group-hover:text-white">
                      {person.name}
                    </p>
                  </Link>
                </li>
              );
            })}
      </ul>
    </section>
  );
};
