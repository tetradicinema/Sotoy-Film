/**
 * Cleanup Orphans Script
 *
 * Scans Firestore and Firebase Auth for leftover records after user deletion:
 * - handles docs whose data.uid has no users doc -> orphan (delete on --apply).
 * - userPrivate docs whose id has no users doc -> orphan (delete on --apply).
 * - Firebase Auth users (getAuth().listUsers, all pages) whose uid has no users doc -> only REPORT, never delete.
 *
 * Requirements:
 * - GOOGLE_APPLICATION_CREDENTIALS must point to a valid service account JSON key file.
 *
 * Usage:
 * Dry-Run Mode (default):
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json npx tsx scripts/cleanup-orphans.ts
 *
 * Apply Mode:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json npx tsx scripts/cleanup-orphans.ts --apply
 */

import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from '../firebase-applet-config.json';

interface OrphanReportRow {
  collection: string;
  id: string;
  'owner uid/email': string;
  status: string;
}

async function cleanupOrphans() {
  const isApply = process.argv.includes('--apply');
  console.log('=====================================================');
  console.log(`Starting Orphan Cleanup ${isApply ? '(APPLY MODE)' : '(DRY-RUN MODE)'}`);
  console.log('=====================================================\n');

  if (!getApps().length) {
    initializeApp({
      projectId: firebaseConfig.projectId,
    });
  }

  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  console.log(`Target Firestore database: ${databaseId}`);
  const db = getFirestore(getApp(), databaseId);
  const auth = getAuth(getApp());

  try {
    // 1. Load all users doc ids
    console.log('Loading user documents from "users" collection...');
    const usersSnap = await db.collection('users').get();
    const userIds = new Set<string>();
    usersSnap.docs.forEach(docSnap => {
      userIds.add(docSnap.id);
    });
    console.log(`Found ${userIds.size} valid user documents in "users" collection.\n`);

    // 2. Scan "handles" collection for orphaned handles (uid has no users doc)
    console.log('Scanning "handles" collection...');
    const handlesSnap = await db.collection('handles').get();
    const orphanHandles: Array<{ id: string; uid: string }> = [];

    handlesSnap.docs.forEach(docSnap => {
      const data = docSnap.data();
      const uid = typeof data.uid === 'string' ? data.uid : '';
      if (!uid || !userIds.has(uid)) {
        orphanHandles.push({ id: docSnap.id, uid: uid || '(none)' });
      }
    });
    console.log(`Found ${handlesSnap.size} handles (${orphanHandles.length} orphaned).`);

    // 3. Scan "userPrivate" collection for orphaned private documents (id has no users doc)
    console.log('Scanning "userPrivate" collection...');
    const userPrivateSnap = await db.collection('userPrivate').get();
    const orphanUserPrivate: Array<{ id: string; email: string }> = [];

    userPrivateSnap.docs.forEach(docSnap => {
      if (!userIds.has(docSnap.id)) {
        const data = docSnap.data();
        const email = typeof data.email === 'string' ? data.email : '(no-email)';
        orphanUserPrivate.push({ id: docSnap.id, email });
      }
    });
    console.log(`Found ${userPrivateSnap.size} userPrivate docs (${orphanUserPrivate.length} orphaned).`);

    // 4. Scan Firebase Auth users across all pages (uid has no users doc) -> REPORT ONLY
    console.log('Scanning Firebase Auth users...');
    const orphanAuthUsers: Array<{ uid: string; email: string }> = [];
    let nextPageToken: string | undefined = undefined;
    let totalAuthUsers = 0;

    try {
      do {
        const listResult = await auth.listUsers(1000, nextPageToken);
        totalAuthUsers += listResult.users.length;
        for (const userRecord of listResult.users) {
          if (!userIds.has(userRecord.uid)) {
            orphanAuthUsers.push({
              uid: userRecord.uid,
              email: userRecord.email || '(no-email)',
            });
          }
        }
        nextPageToken = listResult.pageToken;
      } while (nextPageToken);
      console.log(`Found ${totalAuthUsers} Firebase Auth accounts (${orphanAuthUsers.length} without users doc).\n`);
    } catch (authErr: any) {
      console.warn(`[Warning] Could not list Firebase Auth accounts: ${authErr?.message || authErr}\n`);
    }

    // 5. Delete orphans if --apply is set
    if (isApply) {
      if (orphanHandles.length > 0) {
        console.log(`Deleting ${orphanHandles.length} orphaned handles from Firestore...`);
        const batchSize = 400;
        for (let i = 0; i < orphanHandles.length; i += batchSize) {
          const batch = db.batch();
          const chunk = orphanHandles.slice(i, i + batchSize);
          chunk.forEach(item => {
            batch.delete(db.collection('handles').doc(item.id));
          });
          await batch.commit();
        }
        console.log(`Successfully deleted ${orphanHandles.length} orphaned handles.`);
      }

      if (orphanUserPrivate.length > 0) {
        console.log(`Deleting ${orphanUserPrivate.length} orphaned userPrivate docs from Firestore...`);
        const batchSize = 400;
        for (let i = 0; i < orphanUserPrivate.length; i += batchSize) {
          const batch = db.batch();
          const chunk = orphanUserPrivate.slice(i, i + batchSize);
          chunk.forEach(item => {
            batch.delete(db.collection('userPrivate').doc(item.id));
          });
          await batch.commit();
        }
        console.log(`Successfully deleted ${orphanUserPrivate.length} orphaned userPrivate docs.`);
      }
    }

    // 6. Build and print the table of every orphan
    const reportTable: OrphanReportRow[] = [
      ...orphanHandles.map(h => ({
        collection: 'handles',
        id: h.id,
        'owner uid/email': h.uid,
        status: isApply ? 'DELETED' : 'WOULD DELETE',
      })),
      ...orphanUserPrivate.map(p => ({
        collection: 'userPrivate',
        id: p.id,
        'owner uid/email': p.email,
        status: isApply ? 'DELETED' : 'WOULD DELETE',
      })),
      ...orphanAuthUsers.map(a => ({
        collection: 'firebaseAuth',
        id: a.uid,
        'owner uid/email': a.email,
        status: 'REPORT ONLY (NOT DELETED)',
      })),
    ];

    console.log('\n--- Orphan Records Table ---');
    if (reportTable.length === 0) {
      console.log('No orphaned records detected in Firestore or Firebase Auth.');
    } else {
      console.table(reportTable);
    }

    console.log('\n--- Summary Counts ---');
    console.log(`Valid user documents:            ${userIds.size}`);
    console.log(`Orphaned handles:               ${orphanHandles.length} ${isApply ? '(DELETED)' : '(DRY-RUN)'}`);
    console.log(`Orphaned userPrivate:           ${orphanUserPrivate.length} ${isApply ? '(DELETED)' : '(DRY-RUN)'}`);
    console.log(`Orphaned Firebase Auth users:   ${orphanAuthUsers.length} (REPORT ONLY - NEVER DELETED)`);
    console.log(`Total orphan records:            ${reportTable.length}`);
    console.log('=====================================================\n');

  } catch (err: any) {
    console.error('[Cleanup Error] Fatal error during cleanup:', err);
    process.exit(1);
  }
}

cleanupOrphans()
  .then(() => {
    console.log('Orphan cleanup script completed successfully.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Unhandled failure:', err);
    process.exit(1);
  });
