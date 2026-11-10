import { FilmItem } from '../types';
import { isIndonesianFilm } from './filmSections';

export interface FilmCountryOption {
  code: string;
  label: string;
  count: number;
}

export interface FilmYearOption {
  year: number;
  count: number;
}

/**
 * Returns the uppercase, trimmed 2-letter country codes for a film.
 * Films flagged as Indonesian (by country data or the "Film Indonesia" tag
 * override) always include 'ID'. Duplicates are removed.
 */
export function getFilmCountryCodes(film: FilmItem): string[] {
  const codes = new Set<string>();
  const originCountry = Array.isArray(film.originCountry) ? film.originCountry : [];

  for (const raw of originCountry) {
    const code = String(raw ?? '').trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(code)) codes.add(code);
  }

  if (isIndonesianFilm(film)) codes.add('ID');

  return Array.from(codes);
}

/**
 * Builds the country filter options with Indonesian display names, sorted by
 * film count descending and then by label. Codes Intl cannot resolve fall back
 * to the raw code.
 */
export function getFilmCountryOptions(films: FilmItem[]): FilmCountryOption[] {
  const counts = new Map<string, number>();

  for (const film of films) {
    for (const code of getFilmCountryCodes(film)) {
      counts.set(code, (counts.get(code) || 0) + 1);
    }
  }

  let displayNames: Intl.DisplayNames | null = null;
  try {
    displayNames = new Intl.DisplayNames(['id'], { type: 'region' });
  } catch {
    displayNames = null;
  }

  const getLabel = (code: string): string => {
    if (!displayNames) return code;
    try {
      return displayNames.of(code) || code;
    } catch {
      return code;
    }
  };

  const options: FilmCountryOption[] = Array.from(counts.entries()).map(
    ([code, count]) => ({ code, label: getLabel(code), count })
  );

  options.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.label.localeCompare(b.label);
  });

  return options;
}

/**
 * Builds the year filter options with film counts, newest year first.
 * Films without a positive year are ignored.
 */
export function getFilmYearOptions(films: FilmItem[]): FilmYearOption[] {
  const counts = new Map<number, number>();

  for (const film of films) {
    const year = Number(film.year);
    if (!Number.isFinite(year) || year <= 0) continue;
    counts.set(year, (counts.get(year) || 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => b.year - a.year);
}

/**
 * True when the film originates from the given country code.
 * The 'all' value (and an empty value) matches every film.
 */
export function filmMatchesCountry(film: FilmItem, code: string): boolean {
  if (!code || code === 'all') return true;
  const target = code.trim().toUpperCase();
  return getFilmCountryCodes(film).includes(target);
}

/**
 * True when the film's year matches the given year.
 * The 'all' value (and an empty value) matches every film.
 */
export function filmMatchesYear(film: FilmItem, year: string | number): boolean {
  if (year === 'all' || year === '' || year === null || year === undefined) return true;
  const target = typeof year === 'number' ? year : Number(year);
  if (!Number.isFinite(target)) return false;
  return Number(film.year) === target;
}
