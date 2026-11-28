/**
 * Cookie consent state for Google Analytics.
 *
 * The localStorage value is intentionally tiny and validated on every read:
 * anything other than the three known states is treated as "unset" so a
 * corrupted value can never silently grant tracking.
 */

export type ConsentState = 'unset' | 'granted' | 'denied';

export const CONSENT_STORAGE_KEY = 'sotoy_cookie_consent';

const VALID_STATES: readonly ConsentState[] = ['unset', 'granted', 'denied'];

type ConsentListener = (state: ConsentState) => void;

const listeners = new Set<ConsentListener>();

export function isConsentState(value: unknown): value is ConsentState {
  return typeof value === 'string' && (VALID_STATES as readonly string[]).includes(value);
}

export function parseConsentState(raw: string | null | undefined): ConsentState {
  return isConsentState(raw) ? raw : 'unset';
}

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

export function getConsentState(): ConsentState {
  try {
    return parseConsentState(getStorage()?.getItem(CONSENT_STORAGE_KEY));
  } catch {
    return 'unset';
  }
}

export function writeConsentState(state: ConsentState): void {
  const safeState = parseConsentState(state);
  try {
    const storage = getStorage();
    if (!storage) return;
    if (safeState === 'unset') {
      storage.removeItem(CONSENT_STORAGE_KEY);
    } else {
      storage.setItem(CONSENT_STORAGE_KEY, safeState);
    }
  } catch {
    // Storage can be disabled; the in-memory listeners still get the update.
  }
}

function notify(state: ConsentState): void {
  for (const listener of Array.from(listeners)) {
    try {
      listener(state);
    } catch {
      // A broken subscriber must never break the consent UI or analytics.
    }
  }
}

/** Persist a validated consent choice and notify analytics immediately. */
export function setConsentState(state: ConsentState): void {
  const safeState = parseConsentState(state);
  writeConsentState(safeState);
  notify(safeState);
}

/** Subscribe to consent changes. Returns an unsubscribe function. */
export function subscribeToConsent(listener: ConsentListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
