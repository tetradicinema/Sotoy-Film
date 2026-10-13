/**
 * Backfill Handles Migration Script
 *
 * Deterministically normalizes and migrates user handles to ensure uniqueness
 * and registers them in the `handles` collection using the Firebase Admin SDK.
 *
 * Requirements:
 * - GOOGLE_APPLICATION_CREDENTIALS must point to a valid service account JSON key file.
 *
 * Run commands:
 * Dry-Run Mode (default):
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json npx tsx scripts/backfill-handles.ts
 *
 * Apply Mode:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json npx tsx scripts/backfill-handles.ts --apply
 */

import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from '../firebase-applet-config.json';

interface UserRecord {
  id: string;
  handle: string;
  createdAt?: string;
  name?: string;
}

interface RenamedUserEntry {
  uid: string;
  'old -> new': string;
}

async function backfillHandles() {
  const isApply = process.argv.includes('--apply');
  console.log('=====================================================');
  console.log(`Starting Handles Backfill Migration ${isApply ? '(APPLY MODE)' : '(DRY-RUN MODE)'}`);
  console.log('=====================================================\n');

  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
  }

  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  console.log(`Target Firestore database: ${databaseId}`);
  const db = getFirestore(admin.app(), databaseId);

  let scanned = 0;
  let normalizedCount = 0;
  let dedupedCount = 0;
  let usersUpdated = 0;
  let handleDocsCreated = 0;

  try {
    const usersSnap = await db.collection('users').get();
    scanned = usersSnap.size;
    console.log(`Found ${scanned} user documents in "users" collection.`);

    const usersData: UserRecord[] = [];
    usersSnap.docs.forEach(docSnap => {
      const data = docSnap.data();
      usersData.push({
        id: docSnap.id,
        handle: typeof data.handle === 'string' ? data.handle : '',
        createdAt: typeof data.createdAt === 'string' ? data.createdAt : undefined,
        name: typeof data.name === 'string' ? data.name : undefined,
      });
    });

    // 1. Sort by createdAt ascending (missing createdAt = newest), tie-break by uid
    usersData.sort((a, b) => {
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : Infinity;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : Infinity;
      const validA = isNaN(tA) ? Infinity : tA;
      const validB = isNaN(tB) ? Infinity : tB;
      if (validA !== validB) {
        return validA - validB;
      }
      return a.id.localeCompare(b.id);
    });

    // 2. Reserve @admin_sotoyfilm for CsG2CY2TaIZmG7yuPfzAxmRYrlY2 before the loop
    const assignedHandles = new Map<string, string>(); // body -> uid
    assignedHandles.set('admin_sotoyfilm', 'CsG2CY2TaIZmG7yuPfzAxmRYrlY2');

    const userNewHandles = new Map<string, string>(); // uid -> finalHandle (@body)
    const renamedUsersTable: RenamedUserEntry[] = [];

    // 3. Process each user deterministically
    for (const user of usersData) {
      if (user.id === 'CsG2CY2TaIZmG7yuPfzAxmRYrlY2') {
        userNewHandles.set(user.id, '@admin_sotoyfilm');
        if (user.handle !== '@admin_sotoyfilm') {
          renamedUsersTable.push({
            uid: user.id,
            'old -> new': `${user.handle || '(empty)'} -> @admin_sotoyfilm`,
          });
        }
        continue;
      }

      const raw = (user.handle || '').trim().toLowerCase();
      let body = raw.replace(/^@+/, '').replace(/[^a-z0-9_]/g, '').slice(0, 30);
      let wasNormalized = false;

      // If body is shorter than 3 or empty: use "@warga_" + first 6 chars of uid (lowercased, stripped to [a-z0-9])
      if (body.length < 3) {
        const uidClean = user.id.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6);
        body = `warga_${uidClean}`;
        wasNormalized = true;
      } else if (raw !== `@${body}`) {
        wasNormalized = true;
      }

      if (wasNormalized) {
        normalizedCount++;
      }

      // 4. If body already taken by another uid, append smallest integer suffix (2, 3, ...)
      let finalBody = body;
      if (assignedHandles.has(finalBody) && assignedHandles.get(finalBody) !== user.id) {
        dedupedCount++;
        let counter = 2;
        while (true) {
          const suffix = String(counter);
          const maxBaseLen = 30 - suffix.length;
          const candidateBase = body.slice(0, maxBaseLen);
          const candidateBody = `${candidateBase}${suffix}`;
          if (!assignedHandles.has(candidateBody) || assignedHandles.get(candidateBody) === user.id) {
            finalBody = candidateBody;
            break;
          }
          counter++;
        }
      }

      assignedHandles.set(finalBody, user.id);
      const finalHandle = `@${finalBody}`;
      userNewHandles.set(user.id, finalHandle);

      if (user.handle !== finalHandle) {
        renamedUsersTable.push({
          uid: user.id,
          'old -> new': `${user.handle || '(empty)'} -> ${finalHandle}`,
        });
      }
    }

    if (isApply) {
      // Pre-check existing handles collection for foreign ownership conflict
      const existingHandlesSnap = await db.collection('handles').get();
      const existingHandlesMap = new Map<string, { uid: string; createdAt?: string }>();

      for (const hDoc of existingHandlesSnap.docs) {
        const data = hDoc.data();
        existingHandlesMap.set(hDoc.id, {
          uid: data.uid,
          createdAt: data.createdAt,
        });
        const plannedUid = assignedHandles.get(hDoc.id);
        if (plannedUid && data.uid && data.uid !== plannedUid) {
          throw new Error(
            `Conflict detected: Document "handles/${hDoc.id}" already exists with uid "${data.uid}", ` +
            `but backfill assigned this handle to uid "${plannedUid}". Stopping to prevent overwrite.`
          );
        }
      }

      // Perform batch writes (max 400 operations per batch)
      let batch = db.batch();
      let opsInBatch = 0;

      for (const user of usersData) {
        const finalHandle = userNewHandles.get(user.id)!;
        const hId = finalHandle.replace(/^@/, '');

        // Update users/{uid}.handle ONLY where it changed
        if (user.handle !== finalHandle) {
          const userRef = db.collection('users').doc(user.id);
          batch.update(userRef, { handle: finalHandle });
          usersUpdated++;
          opsInBatch++;
        }

        // Set handles/{h} for every user (idempotent)
        const handleRef = db.collection('handles').doc(hId);
        const existingDoc = existingHandlesMap.get(hId);
        batch.set(
          handleRef,
          {
            uid: user.id,
            createdAt: existingDoc?.createdAt || new Date().toISOString(),
          },
          { merge: true }
        );
        handleDocsCreated++;
        opsInBatch++;

        if (opsInBatch >= 400) {
          await batch.commit();
          batch = db.batch();
          opsInBatch = 0;
        }
      }

      if (opsInBatch > 0) {
        await batch.commit();
      }
    }

    // Output stats
    console.log(`\n--- Migration Summary Stats ---`);
    console.log(`Scanned: ${scanned}`);
    console.log(`Normalized: ${normalizedCount}`);
    console.log(`Deduped: ${dedupedCount}`);
    console.log(`Handle docs created: ${isApply ? handleDocsCreated : usersData.length}`);
    console.log(`Users updated: ${isApply ? usersUpdated : renamedUsersTable.length}`);

    if (renamedUsersTable.length > 0) {
      console.log('\nRenamed Users Table:');
      console.table(renamedUsersTable);
    } else {
      console.log('\nAll user handles are already correctly normalized and unique. No renames needed.');
    }

    if (!isApply) {
      console.log('\n[DRY-RUN] No writes performed. Run with --apply to execute migration.');
    } else {
      console.log('\n[APPLY] Migration applied successfully to Firestore.');
    }
  } catch (err: any) {
    console.error('Error during backfill-handles:', err?.message || err);
    process.exit(1);
  }
}

backfillHandles();
