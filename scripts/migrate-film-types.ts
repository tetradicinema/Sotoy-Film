/**
 * Migrate Film Types Script
 *
 * Normalizes the `type` field of every document in the `films` collection:
 * - `'anime'`                                       -> `'animation'`
 * - `'movie'` / `'series'` + genre Animation/Animasi -> `'animation'`
 * - everything else is left untouched.
 *
 * Only the `type` field is written, in batches of at most 400 documents, so the
 * script is idempotent: re-running it after --apply reports 0 changes.
 *
 * Requirements:
 * - GOOGLE_APPLICATION_CREDENTIALS must point to a valid service account JSON key file.
 *
 * Usage:
 * Dry-Run Mode (default, no writes):
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json npx tsx scripts/migrate-film-types.ts
 *
 * Apply Mode:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json npx tsx scripts/migrate-film-types.ts --apply
 */

import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const BATCH_SIZE = 400;
const ANIMATION_GENRES = new Set(['animation', 'animasi']);

interface FilmTypeChange {
  id: string;
  title: string;
  oldType: string;
  newType: 'animation';
}

interface FilmTypeStats {
  scanned: number;
  alreadyAnimation: number;
  legacyAnime: number;
  animatedGenre: number;
  toMigrate: number;
}

/**
 * Returns the target type when a document needs migrating, otherwise null.
 * Only `anime` and animated `movie`/`series` documents are migrated.
 */
export function resolveMigratedFilmType(type: unknown, genres: unknown): 'animation' | null {
  const normalizedType = typeof type === 'string' ? type.trim().toLowerCase() : '';

  if (normalizedType === 'anime') {
    return 'animation';
  }

  if (normalizedType === 'movie' || normalizedType === 'series') {
    const hasAnimationGenre =
      Array.isArray(genres) &&
      genres.some(
        (genre) => typeof genre === 'string' && ANIMATION_GENRES.has(genre.trim().toLowerCase())
      );
    if (hasAnimationGenre) {
      return 'animation';
    }
  }

  return null;
}

async function migrateFilmTypes() {
  const isApply = process.argv.includes('--apply');

  console.log('=====================================================');
  console.log(`Starting Film Type Migration ${isApply ? '(APPLY MODE)' : '(DRY-RUN MODE)'}`);
  console.log('=====================================================\n');

  if (!getApps().length) {
    initializeApp({
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket || undefined,
    });
  }

  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  console.log(`Target Firestore database: ${databaseId}`);
  const db = getFirestore(getApp(), databaseId);

  try {
    console.log('Loading documents from "films" collection...');
    const filmsSnap = await db.collection('films').get();

    if (filmsSnap.size === 0) {
      console.error('=====================================================');
      console.error('[ABORT GUARD ERROR] 0 documents found in "films" collection.');
      console.error('Aborting migration; no writes were performed.');
      console.error('=====================================================\n');
      process.exit(1);
    }

    const stats: FilmTypeStats = {
      scanned: filmsSnap.size,
      alreadyAnimation: 0,
      legacyAnime: 0,
      animatedGenre: 0,
      toMigrate: 0,
    };
    const changes: FilmTypeChange[] = [];

    filmsSnap.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const rawType = typeof data.type === 'string' ? data.type.trim().toLowerCase() : '';

      if (rawType === 'animation') {
        stats.alreadyAnimation++;
        return;
      }

      const newType = resolveMigratedFilmType(data.type, data.genres);
      if (!newType) return;

      if (rawType === 'anime') {
        stats.legacyAnime++;
      } else {
        stats.animatedGenre++;
      }
      stats.toMigrate++;

      changes.push({
        id: docSnap.id,
        title: typeof data.title === 'string' ? data.title : '(untitled)',
        oldType: rawType || '(missing)',
        newType,
      });
    });

    console.log(`Found ${filmsSnap.size} film documents (${stats.alreadyAnimation} already "animation").\n`);

    console.log('=====================================================');
    console.log('FILM TYPE CHANGES');
    console.log('=====================================================');
    if (changes.length === 0) {
      console.log('No film documents need migration.');
    } else {
      console.table(
        changes.map((change) => ({
          ID: change.id,
          Title: change.title,
          Change: `${change.oldType} -> ${change.newType}`,
        }))
      );
    }

    console.log('\n=====================================================');
    console.log('SUMMARY COUNTS');
    console.log('=====================================================');
    console.log(`Execution Mode:                    ${isApply ? 'APPLY (WROTE CHANGES)' : 'DRY-RUN (NO CHANGES MADE)'}`);
    console.log(`Films scanned:                     ${stats.scanned}`);
    console.log(`Already "animation":               ${stats.alreadyAnimation}`);
    console.log(`Legacy "anime" -> "animation":     ${stats.legacyAnime}`);
    console.log(`Movie/Series w/ Animation genre:   ${stats.animatedGenre}`);
    console.log(`Documents to migrate:              ${stats.toMigrate}`);

    if (isApply && changes.length > 0) {
      let written = 0;
      for (let i = 0; i < changes.length; i += BATCH_SIZE) {
        const chunk = changes.slice(i, i + BATCH_SIZE);
        const batch = db.batch();
        chunk.forEach((change) => {
          // Only the `type` field is modified.
          batch.update(db.collection('films').doc(change.id), { type: change.newType });
        });
        await batch.commit();
        written += chunk.length;
        console.log(`Committed batch: ${written}/${changes.length} documents updated.`);
      }
      console.log(`\nMigration applied: ${written} documents updated.`);
    } else if (isApply) {
      console.log('\nNothing to write; films collection is already migrated.');
    } else {
      console.log('\nDry-run complete. Re-run with --apply to write these changes.');
    }

    console.log('=====================================================\n');
    process.exit(0);
  } catch (err: any) {
    console.error('[Migration Error] Fatal error during film type migration:', err);
    process.exit(1);
  }
}

migrateFilmTypes()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Unhandled failure:', err);
    process.exit(1);
  });
