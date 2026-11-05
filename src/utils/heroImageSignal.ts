/**
 * One-shot page-load signal: the hero cover has finished loading (or failed).
 *
 * The films REST fallback waits for this signal so the ~389 KiB catalog fetch
 * never competes with the LCP image on slow connections. The flag is kept at
 * module level so a listener registered after the image already settled still
 * runs immediately, and every page load starts fresh.
 */

type HeroImageSettledListener = () => void;

let heroImageSettled = false;
const pendingListeners = new Set<HeroImageSettledListener>();

/** Marks the hero cover as settled. Safe to call more than once per page load. */
export function markHeroImageSettled(): void {
  if (heroImageSettled) return;
  heroImageSettled = true;

  const listeners = Array.from(pendingListeners);
  pendingListeners.clear();
  listeners.forEach(listener => {
    try {
      listener();
    } catch {
      // A timing signal must never break the page.
    }
  });
}

/**
 * Subscribes to the hero-settled signal. When the signal already fired, the
 * callback runs immediately and the returned unsubscribe is a no-op.
 */
export function onHeroImageSettled(callback: HeroImageSettledListener): () => void {
  if (heroImageSettled) {
    callback();
    return () => {};
  }

  pendingListeners.add(callback);
  return () => {
    pendingListeners.delete(callback);
  };
}
