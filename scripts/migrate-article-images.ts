/**
 * Migrate Article Images Script
 *
 * Moves inline base64 images from existing `articles` documents to Firebase
 * Storage. The script scans `coverImage`, `ogImage`, `content` and
 * `contentJson` for `data:image/...;base64,...` URIs and replaces them with
 * public Storage download URLs.
 *
 * Behaviour:
 * - Dry-run by default: prints a per-article table and a summary, uploads
 *   nothing and writes nothing.
 * - `--apply`: writes a backup of the original fields first, uploads every
 *   distinct image once (deduplicated by SHA-256), then updates only the
 *   changed fields with `update()`.
 * - `updatedAt`, `status`, `publishedAt` and `slug` are never touched.
 * - If the optional `sharp` package is importable, images are resized to a
 *   longest side of 1600px (no upscale, no crop) and re-encoded to WebP at
 *   quality 82. Otherwise the original bytes are uploaded.
 * - The migration is idempotent: a second dry-run after `--apply` reports 0
 *   affected articles.
 * - `article_versions` is only read/reported, never modified.
 *
 * Requirements:
 * - GOOGLE_APPLICATION_CREDENTIALS must point to a valid service account JSON
 *   key file with Firestore and Storage permissions.
 * - Storage rules must allow writes to `articles_media/{userId}/{fileName}`.
 * - `sharp` is optional and is NOT added to package.json.
 *
 * Usage:
 * Dry-Run Mode (default, no writes/uploads):
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json npx tsx scripts/migrate-article-images.ts
 *
 * Apply Mode:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json npx tsx scripts/migrate-article-images.ts --apply
 */

import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import firebaseConfig from '../firebase-applet-config.json';
import { slugify } from '../src/utils/slugify';
import {
  ARTICLE_IMAGE_FIELDS,
  planArticleImageMigration,
  parseDataImageUri,
  replaceDataImageUris,
  type ArticleImageField,
  type ArticleImageMigrationPlan,
} from '../src/utils/dataUriImages';

const BATCH_SIZE = 400;
const MAX_LONG_SIDE = 1600;
const WEBP_QUALITY = 82;
const STORAGE_ROOT = 'articles_media';

interface AffectedArticle {
  id: string;
  title: string;
  status: string;
  authorId: string;
  data: Record<string, any>;
  plan: ArticleImageMigrationPlan;
}

interface MigrationStats {
  scanned: number;
  affected: number;
  distinctImages: number;
  totalBase64Bytes: number;
  fieldCounts: Record<ArticleImageField, number>;
  uploaded: number;
  reused: number;
  staged: number;
  committed: number;
  failed: number;
  batches: number;
}

interface BackupArticle {
  id: string;
  title: string;
  coverImage: string | null;
  ogImage: string | null;
  content: string | null;
  contentJson: string | null;
}

type SharpFactory = (input?: Buffer) => any;

let sharpFactoryPromise: Promise<SharpFactory | null> | null = null;

/**
 * Loads sharp through a variable specifier so TypeScript does not require the
 * optional package to be installed. Returns null when it is unavailable.
 */
function loadSharp(): Promise<SharpFactory | null> {
  if (!sharpFactoryPromise) {
    sharpFactoryPromise = (async () => {
      try {
        const moduleName = 'sharp';
        const mod: any = await import(moduleName);
        const factory = typeof mod === 'function' ? mod : mod?.default;
        return typeof factory === 'function' ? (factory as SharpFactory) : null;
      } catch {
        return null;
      }
    })();
  }
  return sharpFactoryPromise;
}

function articleTitle(data: Record<string, any>): string {
  return typeof data.title === 'string' && data.title.trim()
    ? data.title.trim()
    : '(untitled)';
}

function articleStatus(data: Record<string, any>): string {
  return typeof data.status === 'string' && data.status.trim()
    ? data.status.trim()
    : '(missing)';
}

function articleAuthorId(data: Record<string, any>): string {
  if (typeof data.authorId === 'string' && data.authorId.trim()) {
    return data.authorId.trim();
  }
  if (
    data.author &&
    typeof data.author === 'object' &&
    typeof data.author.id === 'string' &&
    data.author.id.trim()
  ) {
    return data.author.id.trim();
  }
  return 'migrated';
}

function stringLength(value: unknown): number {
  return typeof value === 'string' ? value.length : 0;
}

function formatKb(bytes: number): number {
  return Number((bytes / 1024).toFixed(1));
}

function truncate(value: string, max = 64): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

function storageFileName(title: string, hash8: string, extension: string): string {
  const base = slugify(title).slice(0, 60).replace(/-+$/, '') || 'artikel';
  return `${base}-${hash8}.${extension}`;
}

function buildPublicDownloadUrl(bucketName: string, objectPath: string, token: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(
    objectPath
  )}?alt=media&token=${token}`;
}

function buildBackupPayload(articles: AffectedArticle[], databaseId: string) {
  return {
    generatedAt: new Date().toISOString(),
    sourceDatabase: databaseId,
    articleCount: articles.length,
    articles: articles.map<BackupArticle>(article => ({
      id: article.id,
      title: article.title,
      coverImage: typeof article.data.coverImage === 'string' ? article.data.coverImage : null,
      ogImage: typeof article.data.ogImage === 'string' ? article.data.ogImage : null,
      content: typeof article.data.content === 'string' ? article.data.content : null,
      contentJson: typeof article.data.contentJson === 'string' ? article.data.contentJson : null,
    })),
  };
}

async function writeBackup(articles: AffectedArticle[], databaseId: string): Promise<string> {
  const backupDir = path.resolve(process.cwd(), 'backups');
  await mkdir(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `article-images-${timestamp}.json`);
  const payload = buildBackupPayload(articles, databaseId);

  await writeFile(backupPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return backupPath;
}

async function ensureBackupsIgnored(): Promise<void> {
  const gitignorePath = path.resolve(process.cwd(), '.gitignore');
  let current = '';
  try {
    current = await readFile(gitignorePath, 'utf8');
  } catch {
    current = '';
  }

  const alreadyIgnored = current
    .split(/\r?\n/)
    .map(line => line.trim())
    .some(line => line === 'backups/' || line === '/backups/');

  if (alreadyIgnored) return;

  const next = `${current}${current && !current.endsWith('\n') ? '\n' : ''}backups/\n`;
  await writeFile(gitignorePath, next, 'utf8');
}

async function reportArticleVersions(db: Firestore): Promise<void> {
  try {
    const versionsSnap = await db.collection('article_versions').get();
    let withInlineImages = 0;

    versionsSnap.docs.forEach(docSnap => {
      const plan = planArticleImageMigration(docSnap.data());
      if (plan.affectedFields.length > 0) withInlineImages++;
    });

    console.log('\n=====================================================');
    console.log('ARTICLE VERSIONS REPORT (READ-ONLY)');
    console.log('=====================================================');
    console.log(`Article version documents scanned:  ${versionsSnap.size}`);
    console.log(`Still containing data:image:        ${withInlineImages}`);
    console.log('These documents were not modified.');
  } catch (err: any) {
    console.warn(
      `[Article Versions] Could not read "article_versions": ${err?.message || err}`
    );
  }
}

async function migrateArticleImages(): Promise<number> {
  const isApply = process.argv.includes('--apply');

  console.log('=====================================================');
  console.log(`Starting Article Image Migration ${isApply ? '(APPLY MODE)' : '(DRY-RUN MODE)'}`);
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
      console.error('Aborting migration; no writes or uploads were performed.');
      console.error('=====================================================\n');
      process.exit(1);
    }

    const stats: MigrationStats = {
      scanned: articlesSnap.size,
      affected: 0,
      distinctImages: 0,
      totalBase64Bytes: 0,
      fieldCounts: {
        coverImage: 0,
        ogImage: 0,
        content: 0,
        contentJson: 0,
      },
      uploaded: 0,
      reused: 0,
      staged: 0,
      committed: 0,
      failed: 0,
      batches: 0,
    };

    const affectedArticles: AffectedArticle[] = [];

    articlesSnap.docs.forEach(docSnap => {
      const data = docSnap.data() as Record<string, any>;
      const plan = planArticleImageMigration(data);
      if (plan.affectedFields.length === 0) return;

      stats.affected++;
      stats.distinctImages += plan.distinctImageCount;
      stats.totalBase64Bytes += plan.totalBase64Bytes;
      plan.affectedFields.forEach(field => {
        stats.fieldCounts[field]++;
      });

      affectedArticles.push({
        id: docSnap.id,
        title: articleTitle(data),
        status: articleStatus(data),
        authorId: articleAuthorId(data),
        data,
        plan,
      });
    });

    console.log(
      `Found ${articlesSnap.size} article documents (${stats.affected} contain inline base64 images).\n`
    );

    console.log('=====================================================');
    console.log('AFFECTED ARTICLES');
    console.log('=====================================================');
    if (affectedArticles.length === 0) {
      console.log('No article documents contain inline base64 images.');
    } else {
      console.table(
        affectedArticles.map(article => ({
          ID: article.id,
          Title: truncate(article.title),
          Status: article.status,
          Fields: article.plan.affectedFields.join(', '),
          Images: article.plan.distinctImageCount,
          'Base64 KB': formatKb(article.plan.totalBase64Bytes),
          'Content Len': stringLength(article.data.content),
          'JSON Len': stringLength(article.data.contentJson),
        }))
      );
    }

    console.log('\n=====================================================');
    console.log('SUMMARY COUNTS');
    console.log('=====================================================');
    console.log(
      `Execution Mode:                    ${isApply ? 'APPLY (UPLOADS + WRITES)' : 'DRY-RUN (NO CHANGES MADE)'}`
    );
    console.log(`Articles scanned:                  ${stats.scanned}`);
    console.log(`Affected articles:                 ${stats.affected}`);
    console.log(`Distinct images:                   ${stats.distinctImages}`);
    console.log(`Total base64 size:                 ${formatKb(stats.totalBase64Bytes)} KB`);
    console.log(`Articles with coverImage data:     ${stats.fieldCounts.coverImage}`);
    console.log(`Articles with ogImage data:        ${stats.fieldCounts.ogImage}`);
    console.log(`Articles with content data:        ${stats.fieldCounts.content}`);
    console.log(`Articles with contentJson data:    ${stats.fieldCounts.contentJson}`);

    await reportArticleVersions(db);

    if (!isApply) {
      console.log('\nDry-run complete. Re-run with --apply to upload images and write changes.');
      console.log('=====================================================\n');
      return 0;
    }

    if (affectedArticles.length === 0) {
      console.log('\nNothing to write; articles collection is already migrated.');
      console.log('=====================================================\n');
      return 0;
    }

    let backupPath = '';
    try {
      backupPath = await writeBackup(affectedArticles, databaseId);
      console.log(`\nBackup written: ${backupPath}`);
    } catch (err: any) {
      console.error('=====================================================');
      console.error('[BACKUP ERROR] Could not write the backup file.');
      console.error(err?.message || err);
      console.error('Aborting migration; no images were uploaded and no articles were updated.');
      console.error('=====================================================\n');
      return 1;
    }

    try {
      await ensureBackupsIgnored();
      console.log('Ignored backup folder: backups/');
    } catch (err: any) {
      console.error('=====================================================');
      console.error('[GITIGNORE ERROR] Could not add backups/ to .gitignore.');
      console.error(err?.message || err);
      console.error('Aborting migration; no images were uploaded and no articles were updated.');
      console.error('=====================================================\n');
      return 1;
    }

    const sharp = await loadSharp();
    console.log(
      sharp
        ? `[sharp] Available: resizing to ${MAX_LONG_SIDE}px and encoding WebP q${WEBP_QUALITY}.`
        : '[sharp] Not available: uploading original image bytes.'
    );

    const bucket = getStorage(getApp()).bucket(firebaseConfig.storageBucket || undefined);
    const bucketName = bucket.name;
    const uploadedUrlByHash = new Map<string, string>();

    let batch = db.batch();
    let batchCount = 0;

    const commitBatch = async () => {
      if (batchCount === 0) return;
      const count = batchCount;
      await batch.commit();
      stats.committed += count;
      stats.batches++;
      console.log(`Committed batch: ${stats.committed}/${affectedArticles.length} articles updated.`);
      batch = db.batch();
      batchCount = 0;
    };

    for (const article of affectedArticles) {
      try {
        const replacements = new Map<string, string>();

        for (const uri of article.plan.distinctUris) {
          const parsed = parseDataImageUri(uri);
          if (!parsed) {
            throw new Error('Unsupported or invalid image data URI.');
          }

          const hash = sha256(parsed.buffer);
          const hash8 = hash.slice(0, 8);
          const existingUrl = uploadedUrlByHash.get(hash);
          if (existingUrl) {
            replacements.set(uri, existingUrl);
            stats.reused++;
            continue;
          }

          let bytes = parsed.buffer;
          let contentType = parsed.mimeType;
          let extension = parsed.extension;

          if (sharp) {
            try {
              bytes = await sharp(parsed.buffer)
                .resize({
                  width: MAX_LONG_SIDE,
                  height: MAX_LONG_SIDE,
                  fit: 'inside',
                  withoutEnlargement: true,
                })
                .webp({ quality: WEBP_QUALITY })
                .toBuffer();
              contentType = 'image/webp';
              extension = 'webp';
            } catch (sharpErr: any) {
              console.warn(
                `[sharp] Could not optimize an image in "${article.title}": ${
                  sharpErr?.message || sharpErr
                }. Uploading original bytes.`
              );
            }
          }

          const fileName = storageFileName(article.title, hash8, extension);
          const objectPath = `${STORAGE_ROOT}/${article.authorId}/${fileName}`;
          const token = randomUUID();

          await bucket.file(objectPath).save(bytes, {
            contentType,
            metadata: {
              contentType,
              metadata: {
                firebaseStorageDownloadTokens: token,
              },
            },
          });

          const publicUrl = buildPublicDownloadUrl(bucketName, objectPath, token);
          uploadedUrlByHash.set(hash, publicUrl);
          replacements.set(uri, publicUrl);
          stats.uploaded++;
        }

        const updates: Record<string, string> = {};
        for (const field of article.plan.affectedFields) {
          const original = article.data[field];
          if (typeof original !== 'string') continue;
          const next = replaceDataImageUris(original, replacements);
          if (next !== original) updates[field] = next;
        }

        if (Object.keys(updates).length === 0) {
          console.log(`[No change] ${article.id} (${article.title})`);
          continue;
        }

        // Only changed image fields are written. updatedAt, status,
        // publishedAt and slug are deliberately left untouched.
        batch.update(db.collection('articles').doc(article.id), updates);
        batchCount++;
        stats.staged++;
        console.log(
          `[Staged] ${article.id} (${article.title}) fields: ${Object.keys(updates).join(
            ', '
          )}`
        );
      } catch (err: any) {
        stats.failed++;
        console.error(
          `[Article skipped] ${article.id} (${article.title}): ${err?.message || err}`
        );
      }

      if (batchCount >= BATCH_SIZE) {
        await commitBatch();
      }
    }

    await commitBatch();

    console.log('\n=====================================================');
    console.log('APPLY SUMMARY');
    console.log('=====================================================');
    console.log(`Articles scanned:                  ${stats.scanned}`);
    console.log(`Articles affected:                 ${stats.affected}`);
    console.log(`Articles updated:                  ${stats.committed}`);
    console.log(`Articles skipped:                  ${stats.failed}`);
    console.log(`Images uploaded:                   ${stats.uploaded}`);
    console.log(`Images reused (SHA-256 dedupe):    ${stats.reused}`);
    console.log(`Batches committed:                 ${stats.batches}`);
    console.log(`Backup file:                       ${backupPath}`);
    console.log('=====================================================\n');

    return stats.failed > 0 ? 1 : 0;
  } catch (err: any) {
    console.error('[Migration Error] Fatal error during article image migration:', err);
    return 1;
  }
}

migrateArticleImages()
  .then(code => {
    process.exit(code);
  })
  .catch(err => {
    console.error('Unhandled failure:', err);
    process.exit(1);
  });
