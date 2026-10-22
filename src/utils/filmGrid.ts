/**
 * Shared responsive grid used by the homepage film rows. The column counts
 * mirror the Tailwind classes so the last row can be kept complete.
 */
export const HOME_FILM_GRID_CLASS =
  'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4';

const COLUMNS = [2, 3, 4, 5, 6] as const;

/**
 * Returns how many cards fill complete rows for a given column count. When the
 * list is shorter than one full row, every card is returned so a section with
 * only one or two films does not disappear.
 */
export function getCompleteRowCount(total: number, columns: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;

  const safeColumns = Math.max(1, Math.floor(columns));
  const complete = Math.floor(total / safeColumns) * safeColumns;
  return complete > 0 ? complete : Math.min(total, safeColumns);
}

/**
 * Responsive visibility classes for a card index. Cards that would create a
 * partial row at a breakpoint are hidden at that breakpoint only.
 */
export function getResponsiveCardVisibilityClass(index: number, total: number): string {
  const visible = COLUMNS.map(columns => index < getCompleteRowCount(total, columns));

  return [
    visible[0] ? 'block' : 'hidden',
    visible[1] ? 'sm:block' : 'sm:hidden',
    visible[2] ? 'md:block' : 'md:hidden',
    visible[3] ? 'lg:block' : 'lg:hidden',
    visible[4] ? 'xl:block' : 'xl:hidden',
  ].join(' ');
}
