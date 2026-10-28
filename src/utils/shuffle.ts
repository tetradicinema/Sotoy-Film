/**
 * Seeded PRNG using mulberry32.
 * Returns a pseudo-random float between 0 (inclusive) and 1 (exclusive).
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function (): number {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Module-level constant generated once per page load.
 * Combining Date.now() and Math.random() guarantees a unique seed across reloads
 * while keeping the seed stable during client-side navigation and re-renders.
 */
const PAGE_LOAD_SEED: number =
  (((Date.now() & 0x7fffffff) ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0) || 1234567;

/**
 * Returns the stable seed generated once for the current page load.
 */
export function getPageLoadSeed(): number {
  return PAGE_LOAD_SEED;
}

/**
 * Performs an immutable, deterministic Fisher-Yates shuffle on items using the supplied seed.
 * Does not mutate the input array.
 */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  if (!items || items.length <= 1) {
    return items ? [...items] : [];
  }

  const result = [...items];
  const nextRandom = mulberry32(seed);

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }

  return result;
}
