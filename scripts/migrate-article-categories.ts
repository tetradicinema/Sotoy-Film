/**
 * Migrate Article Categories Script
 *
 * Normalizes the `category` field of every document in the `articles`
 * collection:
 * - `'anime'`   -> `'animation'`
 * - `'animasi'` -> `'animation'`
 * - everything else is left untouched.
 *
 * The `Article` type only stores the main taxonomy in `category`, so this is
 * the only field written by the script. Writes are batched (max 400 docs) and
 * the migration is idempotent: re-running it after --apply reports 0 changes.
 *
 * Requirements:
 * - GOOGLE_APPLICATION_CREDENTIALS must point to a valid service account JSON key file.
 *
 * Usage:
 * Dry-Run Mode (default, no writes):
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json npx tsx scripts/migrate-article-categories.ts
 *
 * Apply Mode:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json npx tsx scripts/migrate-article-categories.ts --apply
 */

import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const BATCH_SIZE = 400;

interface ArticleCategoryChange {
  id: string;
  title: string;
  oldCategory: string;
  newCategory: 'animation';
}

interface ArticleCategoryStats {
  scanned: number;
  alreadyAnimation: number;
  legacyAnime: number;
  legacyAnimasi: number;
  toMigrate: number;
}

/**
 * Returns the target category when a document needs migrating, otherwise null.
 */
export function resolveMigratedArticleCategory(category: unknown): 'animation' | null {
  const normalized = typeof category === 'string' ? category.trim().toLowerCase() : '';
  if (normalized === 'anime' || normalized === 'animasi') return 'animation';
  return null;
}

async function migrateArticleCategories() {
  const isApply = process.argv.includes('--apply');

  console.log('=====================================================');
  console.log(`Starting Article Category Migration ${isApply ? '(APPLY MODE)' : '(DRY-RUN MODE)'}`);
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
    console.log('Loading documents from "articles" collection...');
    const articlesSnap = await db.collection('articles').get();

    if (articlesSnap.size === 0) {
      console.error('=====================================================');
      console.error('[ABORT GUARD ERROR] 0 documents found in "articles" collection.');
      console.error('Aborting migration; no writes were performed.');
      console.error('=====================================================\n');
      process.exit(1);
    }

    const stats: ArticleCategoryStats = {
      scanned: articlesSnap.size,
      alreadyAnimation: 0,
      legacyAnime: 0,
      legacyAnimasi: 0,
      toMigrate: 0,
    };
    const changes: ArticleCategoryChange[] = [];

    articlesSnap.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const rawCategory =
        typeof data.category === 'string' ? data.category.trim().toLowerCase() : '';

      if (rawCategory === 'animation') {
        stats.alreadyAnimation++;
        return;
      }

      const newCategory = resolveMigratedArticleCategory(data.category);
      if (!newCategory) return;

      if (rawCategory === 'anime') {
        stats.legacyAnime++;
      } else {
        stats.legacyAnimasi++;
      }
      stats.toMigrate++;

      changes.push({
        id: docSnap.id,
        title: typeof data.title === 'string' ? data.title : '(untitled)',
        oldCategory: rawCategory || '(missing)',
        newCategory,
      });
    });

    console.log(
      `Found ${articlesSnap.size} article documents (${stats.alreadyAnimation} already "animation").\n`
    );

    console.log('=====================================================');
    console.log('ARTICLE CATEGORY CHANGES');
    console.log('=====================================================');
    if (changes.length === 0) {
      console.log('No article documents need migration.');
    } else {
      console.table(
        changes.map((change) => ({
          ID: change.id,
          Title: change.title,
          Change: `${change.oldCategory} -> ${change.newCategory}`,
        }))
      );
    }

    console.log('\n=====================================================');
    console.log('SUMMARY COUNTS');
    console.log('=====================================================');
    console.log(
      `Execution Mode:                    ${isApply ? 'APPLY (WROTE CHANGES)' : 'DRY-RUN (NO CHANGES MADE)'}`
    );
    console.log(`Articles scanned:                  ${stats.scanned}`);
    console.log(`Already "animation":               ${stats.alreadyAnimation}`);
    console.log(`Legacy "anime" -> "animation":     ${stats.legacyAnime}`);
    console.log(`Legacy "animasi" -> "animation":   ${stats.legacyAnimasi}`);
    console.log(`Documents to migrate:              ${stats.toMigrate}`);

    if (isApply && changes.length > 0) {
      let written = 0;
      for (let i = 0; i < changes.length; i += BATCH_SIZE) {
        const chunk = changes.slice(i, i + BATCH_SIZE);
        const batch = db.batch();
        chunk.forEach((change) => {
          // Only the `category` field is modified.
          batch.update(db.collection('articles').doc(change.id), {
            category: change.newCategory,
          });
        });
        await batch.commit();
        written += chunk.length;
        console.log(`Committed batch: ${written}/${changes.length} documents updated.`);
      }
      console.log(`\nMigration applied: ${written} documents updated.`);
    } else if (isApply) {
      console.log('\nNothing to write; articles collection is already migrated.');
    } else {
      console.log('\nDry-run complete. Re-run with --apply to write these changes.');
    }

    console.log('=====================================================\n');
    process.exit(0);
  } catch (err: any) {
    console.error('[Migration Error] Fatal error during article category migration:', err);
    process.exit(1);
  }
}

migrateArticleCategories()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Unhandled failure:', err);
    process.exit(1);
  });
