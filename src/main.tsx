import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Disable pinch-to-zoom and double-tap zoom ONLY when running as an installed standalone app on iOS
const isStandalone =
  (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) ||
  (typeof window !== 'undefined' && (window.navigator as any).standalone === true);

if (isStandalone) {
  // Block iOS pinch gesture
  ['gesturestart', 'gesturechange', 'gestureend'].forEach((evt) =>
    document.addEventListener(evt, (e) => e.preventDefault(), { passive: false })
  );
  // Block multi-touch pinch fallback
  document.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches.length > 1) e.preventDefault();
    },
    { passive: false }
  );
  // Block double-tap zoom on non-interactive elements only
  let lastTouchEnd = 0;
  document.addEventListener(
    'touchend',
    (e) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('button, input, textarea, select, a, label, [role="button"]')) {
        return;
      }
      const now = Date.now();
      if (now - lastTouchEnd <= 300) e.preventDefault();
      lastTouchEnd = now;
    },
    { passive: false }
  );
}

// Stale-chunk guard: after a deploy, an open tab can still point at hashed chunks
// that no longer exist. Reload once to pick up the new manifest, but never loop.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  try {
    if (sessionStorage.getItem('vite:preload-error-reloaded') === '1') return;
    sessionStorage.setItem('vite:preload-error-reloaded', '1');
  } catch {
    // Storage can throw (private mode / blocked storage): skip reload to avoid a loop
    return;
  }
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
