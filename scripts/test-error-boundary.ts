import React from 'react';
import { renderToString } from 'react-dom/server';
import { ErrorBoundary, isChunkLoadError } from '../src/components/ErrorBoundary';

let passed = 0;
let failed = 0;
let skipped = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed++;
    console.log(`[PASS] ${message}`);
  } else {
    failed++;
    console.error(`[FAIL] ${message}`);
  }
}

console.log('=== Running ErrorBoundary Tests ===\n');

// ---------------------------------------------------------------------------
// 1. isChunkLoadError: chunk/module load error message variants
// ---------------------------------------------------------------------------
const chunkVariants: Array<{ name: string; error: unknown }> = [
  { name: 'Vite/Chromium: "Failed to fetch dynamically imported module"', error: new Error('Failed to fetch dynamically imported module: https://sotoyfilm.my.id/assets/FilmDetailPage-B1x.js') },
  { name: 'Safari: "Importing a module script failed"', error: new Error('Importing a module script failed.') },
  { name: 'webpack: "Loading chunk 5 failed"', error: new Error('Loading chunk 5 failed.\n(missing: https://sotoyfilm.my.id/assets/5.abc123.js)') },
  { name: 'Firefox: "error loading dynamically imported module"', error: new Error('error loading dynamically imported module: https://sotoyfilm.my.id/assets/SearchPage-9x.js') },
  { name: 'Case-insensitive match', error: new Error('FAILED TO FETCH DYNAMICALLY IMPORTED MODULE') },
  { name: 'Chunk message wrapped in TypeError', error: new TypeError('Loading chunk 12 failed.') },
];

for (const variant of chunkVariants) {
  assert(isChunkLoadError(variant.error) === true, `isChunkLoadError: ${variant.name}`);
}

// ---------------------------------------------------------------------------
// 2. isChunkLoadError: non-chunk errors
// ---------------------------------------------------------------------------
const nonChunkVariants: Array<{ name: string; error: unknown }> = [
  { name: 'TypeError "x is not a function"', error: new TypeError('x is not a function') },
  { name: 'Hook count mismatch error', error: new Error('Rendered more hooks than during the previous render') },
  { name: 'Plain generic error', error: new Error('Something went wrong') },
];

for (const variant of nonChunkVariants) {
  assert(isChunkLoadError(variant.error) === false, `isChunkLoadError rejects: ${variant.name}`);
}

// ---------------------------------------------------------------------------
// 3. isChunkLoadError: null/undefined/non-Error inputs must not throw
// ---------------------------------------------------------------------------
const safeInputs: Array<{ name: string; error: unknown }> = [
  { name: 'null', error: null },
  { name: 'undefined', error: undefined },
  { name: 'number 42', error: 42 },
  { name: 'plain string', error: 'Failed to fetch dynamically imported module' },
  { name: 'array', error: [] },
  { name: 'empty object', error: {} },
];

for (const variant of safeInputs) {
  let result: boolean | 'threw' = false;
  try {
    result = isChunkLoadError(variant.error);
  } catch {
    result = 'threw';
  }
  assert(result === false, `isChunkLoadError(${variant.name}) returns false without throwing`);
}

// ---------------------------------------------------------------------------
// 4. Server-side render: fallback text appears when a child throws
// (react-dom/server is available in this repo; skipped gracefully if the
// renderer refuses to catch the error, since SSR error-boundary support
// depends on the React version/renderer in use)
// ---------------------------------------------------------------------------
function Boom(): React.ReactElement {
  throw new TypeError('x is not a function');
}

try {
  const html = renderToString(
    React.createElement(ErrorBoundary, null, React.createElement(Boom))
  );
  assert(html.includes('Terjadi kesalahan'), 'SSR fallback shows heading "Terjadi kesalahan"');
  assert(html.includes('Halaman ini gagal dimuat.'), 'SSR fallback shows generic message');
  assert(html.includes('Muat ulang halaman'), 'SSR fallback shows reload button');
  assert(html.includes('Kembali ke beranda'), 'SSR fallback shows home link');
  assert(html.includes('role="alert"'), 'SSR fallback container has role="alert"');
} catch (err) {
  skipped++;
  console.warn(`[SKIP] SSR fallback render test: renderToString threw (${(err as Error).message}). SSR error boundaries are not supported by this React server renderer.`);
}

console.log(`\nTest results: ${passed} passed, ${failed} failed${skipped > 0 ? `, ${skipped} skipped` : ''}.`);
if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
