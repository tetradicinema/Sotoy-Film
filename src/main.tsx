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
  // Block double-tap zoom
  let lastTouchEnd = 0;
  document.addEventListener(
    'touchend',
    (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) e.preventDefault();
      lastTouchEnd = now;
    },
    { passive: false }
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
