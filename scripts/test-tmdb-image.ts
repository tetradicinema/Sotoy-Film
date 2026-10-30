/**
 * Tests for tmdbPosterSized.
 *
 * Usage:
 *   node --import tsx scripts/test-tmdb-image.ts
 */

import { tmdbPosterSized } from '../src/utils/tmdbImage.js';

let failed = 0;

function check(name: string, actual: string, expected: string): void {
  const ok = actual === expected;
  if (!ok) failed++;
  console.log(ok ? `✅ ${name}` : `❌ ${name} — got ${actual}, expected ${expected}`);
}

const T = 'https://image.tmdb.org/t/p';

check('w500 poster shrinks to w185', tmdbPosterSized(`${T}/w500/abc.jpg`, 'w185'), `${T}/w185/abc.jpg`);
check('w500 poster shrinks to w342', tmdbPosterSized(`${T}/w500/abc.jpg`, 'w342'), `${T}/w342/abc.jpg`);
check('w780 poster shrinks to w342', tmdbPosterSized(`${T}/w780/abc.jpg`, 'w342'), `${T}/w342/abc.jpg`);
check('original poster shrinks to w185', tmdbPosterSized(`${T}/original/abc.jpg`, 'w185'), `${T}/w185/abc.jpg`);
check('smaller poster is never enlarged (w185 asked as w342)', tmdbPosterSized(`${T}/w185/abc.jpg`, 'w342'), `${T}/w185/abc.jpg`);
check('same size is left alone', tmdbPosterSized(`${T}/w342/abc.jpg`, 'w342'), `${T}/w342/abc.jpg`);
check('w154 is left alone when asking w185', tmdbPosterSized(`${T}/w154/abc.jpg`, 'w185'), `${T}/w154/abc.jpg`);
check('surrounding whitespace is tolerated', tmdbPosterSized(`  ${T}/w500/abc.jpg `, 'w185'), `${T}/w185/abc.jpg`);
check('non-TMDB URL is unchanged', tmdbPosterSized('https://images.unsplash.com/photo-1?w=300', 'w185'), 'https://images.unsplash.com/photo-1?w=300');
check('Firebase Storage URL is unchanged', tmdbPosterSized('https://firebasestorage.googleapis.com/v0/b/x/o/a.jpg?alt=media', 'w185'), 'https://firebasestorage.googleapis.com/v0/b/x/o/a.jpg?alt=media');
check('empty string is unchanged', tmdbPosterSized('', 'w185'), '');
check('TMDB URL with extra path keeps it', tmdbPosterSized(`${T}/w500/a/b.jpg`, 'w185'), `${T}/w185/a/b.jpg`);

console.log(failed === 0 ? '\n📊 All passed' : `\n📊 ${failed} failed`);
if (failed > 0) process.exit(1);
