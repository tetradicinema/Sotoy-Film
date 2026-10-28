import type { FilmItem } from '../types';
import { tmdbMediaType } from './tmdbSync';
import type { TmdbCollectionPart } from './tmdbHelper';

export interface RelatedFilmEntry {
  key: string;
  title: string;
  year: string;
  posterUrl?: string;
  film?: FilmItem;
  inCatalog: boolean;
  isCurrent: boolean;
}

/**
 * Builds an ordered list of related films for a given film.
 *
 * Sources:
 * (a) Catalog films with the same collectionId, matched to TMDB parts by tmdbId with media type movie;
 * (b) TMDB collection parts not in the catalog (inCatalog: false);
 * (c) Manual relatedFilmIds, resolved symmetrically (if A lists B, B also shows A; computed from allFilms).
 *
 * De-duplicates entries, marks the current film, sorts by year ascending (undated last),
 * and caps the result at 20 items.
 */
export function buildRelatedFilms(
  film: FilmItem,
  allFilms: FilmItem[],
  tmdbParts?: TmdbCollectionPart[]
): RelatedFilmEntry[] {
  if (!film) return [];

  // Map to collect unique catalog films by film.id
  const catalogFilmMap = new Map<string, FilmItem>();

  // Current film is always in the candidate set if it has an id
  if (film.id) {
    catalogFilmMap.set(film.id, film);
  }

  // 1. Source (c): Manual relatedFilmIds, resolved symmetrically
  const manualSet = new Set<string>();
  if (Array.isArray(film.relatedFilmIds)) {
    for (const id of film.relatedFilmIds) {
      if (typeof id === 'string' && id.trim()) {
        manualSet.add(id.trim());
      }
    }
  }

  for (const other of allFilms) {
    if (!other || !other.id || other.id === film.id) continue;

    // Symmetric link: A lists B OR B lists A
    const aListsB = manualSet.has(other.id);
    const bListsA = Array.isArray(other.relatedFilmIds) && other.relatedFilmIds.includes(film.id);

    if (aListsB || bListsA) {
      catalogFilmMap.set(other.id, other);
    }
  }

  // 2. Source (a): Catalog films with the same collectionId
  if (typeof film.collectionId === 'number' && film.collectionId > 0) {
    for (const other of allFilms) {
      if (!other || !other.id) continue;
      if (other.collectionId === film.collectionId) {
        catalogFilmMap.set(other.id, other);
      }
    }
  }

  // 3. Match TMDB collection parts with catalog films (media type movie only)
  // Parts that match a movie in the catalog are added to catalogFilmMap.
  // Parts that do NOT match any movie in the catalog are collected as uncataloged parts.
  const uncatalogedParts: TmdbCollectionPart[] = [];
  const seenPartTmdbIds = new Set<number>();

  if (Array.isArray(tmdbParts) && tmdbParts.length > 0) {
    for (const part of tmdbParts) {
      if (!part || typeof part.tmdbId !== 'number' || part.tmdbId <= 0) continue;
      if (seenPartTmdbIds.has(part.tmdbId)) continue;
      seenPartTmdbIds.add(part.tmdbId);

      // Match against catalog films strictly as media type 'movie'
      // TV series with the same tmdbId must NOT match!
      let matchedMovie: FilmItem | undefined;

      // Check current film first
      if (film.tmdbId === part.tmdbId && tmdbMediaType(film) === 'movie') {
        matchedMovie = film;
      } else {
        matchedMovie = allFilms.find(
          f => f && f.tmdbId === part.tmdbId && tmdbMediaType(f) === 'movie'
        );
      }

      if (matchedMovie && matchedMovie.id) {
        catalogFilmMap.set(matchedMovie.id, matchedMovie);
      } else {
        uncatalogedParts.push(part);
      }
    }
  }

  // Build entry list
  const entries: RelatedFilmEntry[] = [];
  const seenEntryKeys = new Set<string>();

  // Process catalog films
  for (const catFilm of catalogFilmMap.values()) {
    const key = `catalog-${catFilm.id}`;
    if (seenEntryKeys.has(key)) continue;
    seenEntryKeys.add(key);

    const isCurrent = catFilm.id === film.id;
    const yearStr = catFilm.year
      ? String(catFilm.year)
      : catFilm.releaseDate
        ? catFilm.releaseDate.substring(0, 4)
        : '';

    entries.push({
      key,
      title: catFilm.title,
      year: yearStr,
      posterUrl: catFilm.poster || undefined,
      film: catFilm,
      inCatalog: true,
      isCurrent,
    });
  }

  // Process uncataloged TMDB parts
  for (const part of uncatalogedParts) {
    const key = `tmdb-${part.tmdbId}`;
    if (seenEntryKeys.has(key)) continue;
    seenEntryKeys.add(key);

    const yearStr =
      part.releaseDate && part.releaseDate.length >= 4
        ? part.releaseDate.substring(0, 4)
        : '';
    const posterUrl = part.posterPath
      ? `https://image.tmdb.org/t/p/w500${part.posterPath}`
      : undefined;

    entries.push({
      key,
      title: part.title,
      year: yearStr,
      posterUrl,
      film: undefined,
      inCatalog: false,
      isCurrent: false,
    });
  }

  // Sort by year ascending, undated last; secondary sort by title
  entries.sort((a, b) => {
    const numA = parseInt(a.year, 10);
    const numB = parseInt(b.year, 10);
    const validA = !isNaN(numA) && numA > 0;
    const validB = !isNaN(numB) && numB > 0;

    if (validA && validB) {
      if (numA !== numB) return numA - numB;
      return a.title.localeCompare(b.title);
    }
    if (validA) return -1;
    if (validB) return 1;
    return a.title.localeCompare(b.title);
  });

  // Cap at 20 items
  return entries.slice(0, 20);
}
