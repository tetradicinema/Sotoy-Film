/**
 * Cleanup Orphans Script
 *
 * Scans Firestore, Firebase Storage, and Firebase Auth for leftover records of deleted users:
 * - Subcollections of users/{uid} (watchlist, savedArticles, savedBuzz, collections, meta) via listCollections + recursiveDelete.
 * - handles docs pointing to a deleted uid.
 * - userPrivate docs whose id is a deleted uid.
 * - follows docs where followerId or followingId is a deleted uid.
 * - Article comments via collectionGroup('comments') where userId is a deleted uid.
 * - ratings/{ratingId}/likedBy docs via collectionGroup('likedBy') whose doc id is a deleted uid.
 * - reports docs created by (reporterId) or about (targetAuthorId) a deleted uid.
 * - files docs where userId is a deleted uid, and Cloud Storage objects under profile_photos/{uid}/.
 * - Reports articles authored by deleted users without deleting them.
 * - Reports Firebase Auth users without a users doc; optionally deletes them if --delete-auth is passed
 *   AND the account was created > 24 hours ago.
 *
 * Hardened with:
 * - Admin account protection: PROTECTED_UIDS & PROTECTED_EMAILS are never deleted.
 * - Abort guard: if validUserIds.size === 0, script aborts immediately with process.exit(1).
 * - Real-time re-check: in --apply mode, re-checks `!(await db.doc('users/' + uid).get()).exists`
 *   before performing any deletion for a UID and before auth.deleteUser.
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
 *
 * Apply Mode with Auth Account Deletion (accounts > 24h old):
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json npx tsx scripts/cleanup-orphans.ts --apply --delete-auth
 */

import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import firebaseConfig from '../firebase-applet-config.json';

// 1. Protected Admin Accounts: Only admins are protected; no other account is.
export const PROTECTED_UIDS = [
  'CsG2CY2TaIZmG7yuPfzAxmRYrlY2',
  'QkNGf1ZfhsMyUEk90a6Iz8ZplZS2',
  'I34eqzOmvsSdS2Rf7jpfxw1ZKeu1',
];

export const PROTECTED_EMAILS = [
  'eksposurmedia@gmail.com',
  'admin.sotoyfilm@gmail.com',
];

interface ProtectedAccountInfo {
  uid: string;
  email?: string;
  reason: string;
}

interface DeletedUidStats {
  uid: string;
  email?: string;
  handles: string[];
  hasUserPrivate: boolean;
  subcollections: { [name: string]: number };
  follows: number;
  comments: number;
  likedBy: number;
  reports: number;
  files: number;
  storageObjects: number;
  authoredArticles: number;
  authStatus: 'none' | 'reported' | 'deleted (>24h)' | 'retained (<24h)';
}

async function cleanupOrphans() {
  const isApply = process.argv.includes('--apply');
  const deleteAuthFlag = process.argv.includes('--delete-auth');

  console.log('=====================================================');
  console.log(`Starting Hardened Orphan Cleanup ${isApply ? '(APPLY MODE)' : '(DRY-RUN MODE)'}`);
  if (deleteAuthFlag) {
    console.log('Flag --delete-auth is ACTIVE (Auth accounts older than 24h will be deleted on --apply)');
  }
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
  const auth = getAuth(getApp());
  const storage = getStorage(getApp());
  const bucket = storage.bucket(firebaseConfig.storageBucket || undefined);

  // Setup protected sets (case-insensitive for emails)
  const protectedUidSet = new Set<string>(PROTECTED_UIDS);
  const protectedEmailSet = new Set<string>(PROTECTED_EMAILS.map(e => e.toLowerCase()));
  const protectedAdminAccounts = new Map<string, ProtectedAccountInfo>();

  PROTECTED_UIDS.forEach(uid => {
    protectedAdminAccounts.set(uid, {
      uid,
      reason: 'Configured in PROTECTED_UIDS',
    });
  });

  const isProtectedUid = (uid: string | undefined | null): boolean => {
    if (!uid) return false;
    return protectedUidSet.has(uid);
  };

  const isProtectedEmail = (email: string | undefined | null): boolean => {
    if (!email) return false;
    return protectedEmailSet.has(email.toLowerCase());
  };

  try {
    // 1. Load all valid user document IDs
    console.log('Loading existing user documents from "users" collection...');
    const usersSnap = await db.collection('users').get();
    const validUserIds = new Set<string>();
    usersSnap.docs.forEach(docSnap => {
      validUserIds.add(docSnap.id);
    });
    console.log(`Found ${validUserIds.size} valid user documents in "users" collection.\n`);

    // 2. Abort guard: if validUserIds.size === 0, abort immediately before anything else
    if (validUserIds.size === 0) {
      console.error('=====================================================');
      console.error('[ABORT GUARD ERROR] 0 user documents found in "users" collection (validUserIds.size === 0).');
      console.error('Aborting cleanup immediately to prevent accidental data loss.');
      console.error('Nothing further has been read, and NO records were deleted.');
      console.error('=====================================================\n');
      process.exit(1);
    }

    // Helper: returns true if UID is non-empty, has no users doc, and is NOT a protected admin
    const isDeletedUid = (uid: string | undefined | null): boolean => {
      if (!uid) return false;
      if (protectedUidSet.has(uid)) return false;
      return !validUserIds.has(uid);
    };

    // 3. Scan Firebase Auth accounts first so protected emails can register their UIDs early
    console.log('Scanning Firebase Auth users across all pages...');
    interface OrphanAuthRecord {
      uid: string;
      email?: string;
      isOlderThan24h: boolean;
      creationTime?: string;
    }
    const orphanAuthUsers: OrphanAuthRecord[] = [];
    let nextPageToken: string | undefined = undefined;
    let totalAuthUsers = 0;

    try {
      do {
        const listResult = await auth.listUsers(1000, nextPageToken);
        totalAuthUsers += listResult.users.length;
        for (const userRecord of listResult.users) {
          const userEmail = userRecord.email;

          // If auth user email matches protected admin emails, add to protected sets and skip
          if (userEmail && isProtectedEmail(userEmail)) {
            protectedUidSet.add(userRecord.uid);
            protectedAdminAccounts.set(userRecord.uid, {
              uid: userRecord.uid,
              email: userEmail,
              reason: 'Matched PROTECTED_EMAILS',
            });
            continue;
          }

          if (isProtectedUid(userRecord.uid)) {
            if (userEmail && !protectedAdminAccounts.get(userRecord.uid)?.email) {
              protectedAdminAccounts.get(userRecord.uid)!.email = userEmail;
            }
            continue;
          }

          // Non-protected auth user: check if users/{uid} document is missing
          if (!validUserIds.has(userRecord.uid)) {
            const creationTime = userRecord.metadata.creationTime;
            const createdMs = creationTime ? new Date(creationTime).getTime() : 0;
            const isOlderThan24h = createdMs > 0 && Date.now() - createdMs > 24 * 60 * 60 * 1000;
            orphanAuthUsers.push({
              uid: userRecord.uid,
              email: userEmail,
              isOlderThan24h,
              creationTime,
            });
          }
        }
        nextPageToken = listResult.pageToken;
      } while (nextPageToken);
      console.log(`Found ${totalAuthUsers} Firebase Auth accounts (${orphanAuthUsers.length} orphaned, protected accounts excluded).\n`);
    } catch (authErr: any) {
      console.warn(`[Warning] Could not list Firebase Auth accounts: ${authErr?.message || authErr}\n`);
      if (isApply) {
        console.error('Cannot resolve protected admin emails; aborting');
        process.exit(1);
      }
    }

    // Map to accumulate deleted UID stats for reporting & targeted deletion
    const deletedMap = new Map<string, DeletedUidStats>();
    const getStats = (uid: string): DeletedUidStats => {
      if (!deletedMap.has(uid)) {
        deletedMap.set(uid, {
          uid,
          handles: [],
          hasUserPrivate: false,
          subcollections: {},
          follows: 0,
          comments: 0,
          likedBy: 0,
          reports: 0,
          files: 0,
          storageObjects: 0,
          authoredArticles: 0,
          authStatus: 'none',
        });
      }
      return deletedMap.get(uid)!;
    };

    // Populate auth accounts into deletedMap
    for (const a of orphanAuthUsers) {
      const stats = getStats(a.uid);
      if (a.email && !stats.email) stats.email = a.email;
      if (deleteAuthFlag) {
        stats.authStatus = a.isOlderThan24h
          ? (isApply ? 'deleted (>24h)' : 'reported')
          : 'retained (<24h)';
      } else {
        stats.authStatus = 'reported';
      }
    }

    // Maps for targeted per-UID deletion
    const uidHandlesMap = new Map<string, FirebaseFirestore.DocumentReference[]>();
    const uidUserPrivateMap = new Map<string, FirebaseFirestore.DocumentReference>();
    const uidFollowsMap = new Map<string, FirebaseFirestore.DocumentReference[]>();
    const uidCommentsMap = new Map<string, FirebaseFirestore.DocumentReference[]>();
    const uidLikedByMap = new Map<string, FirebaseFirestore.DocumentReference[]>();
    const uidReportsMap = new Map<string, FirebaseFirestore.DocumentReference[]>();
    const uidFilesMap = new Map<string, FirebaseFirestore.DocumentReference[]>();

    const pushMap = (map: Map<string, FirebaseFirestore.DocumentReference[]>, key: string, ref: FirebaseFirestore.DocumentReference) => {
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ref);
    };

    // 4. Scan "handles" collection
    console.log('Scanning "handles" collection...');
    const handlesSnap = await db.collection('handles').get();
    let totalOrphanHandles = 0;
    handlesSnap.docs.forEach(docSnap => {
      const data = docSnap.data();
      const uid = typeof data.uid === 'string' ? data.uid : '';
      if (uid && isProtectedUid(uid)) return; // Protected admin: skip completely

      if (!uid || !validUserIds.has(uid)) {
        totalOrphanHandles++;
        if (uid) {
          getStats(uid).handles.push(docSnap.id);
          pushMap(uidHandlesMap, uid, docSnap.ref);
        }
      }
    });
    console.log(`Found ${handlesSnap.size} handles (${totalOrphanHandles} orphaned).`);

    // 5. Scan "userPrivate" collection
    console.log('Scanning "userPrivate" collection...');
    const userPrivateSnap = await db.collection('userPrivate').get();
    let totalOrphanUserPrivate = 0;
    userPrivateSnap.docs.forEach(docSnap => {
      const uid = docSnap.id;
      const data = docSnap.data();
      const email = typeof data.email === 'string' ? data.email : undefined;

      if (isProtectedUid(uid) || isProtectedEmail(email)) return; // Protected admin: skip completely

      if (!validUserIds.has(uid)) {
        totalOrphanUserPrivate++;
        const stats = getStats(uid);
        stats.hasUserPrivate = true;
        if (email && !stats.email) stats.email = email;
        uidUserPrivateMap.set(uid, docSnap.ref);
      }
    });
    console.log(`Found ${userPrivateSnap.size} userPrivate docs (${totalOrphanUserPrivate} orphaned).`);

    // 6. Scan "follows" collection
    console.log('Scanning "follows" collection...');
    const followsSnap = await db.collection('follows').get();
    let totalOrphanFollows = 0;
    followsSnap.docs.forEach(docSnap => {
      const data = docSnap.data();
      const followerId = typeof data.followerId === 'string' ? data.followerId : '';
      const followingId = typeof data.followingId === 'string' ? data.followingId : '';

      const isFollowerDeleted = isDeletedUid(followerId);
      const isFollowingDeleted = isDeletedUid(followingId);

      if (isFollowerDeleted || isFollowingDeleted) {
        totalOrphanFollows++;
        if (isFollowerDeleted) {
          getStats(followerId).follows++;
          pushMap(uidFollowsMap, followerId, docSnap.ref);
        }
        if (isFollowingDeleted) {
          getStats(followingId).follows++;
          pushMap(uidFollowsMap, followingId, docSnap.ref);
        }
      }
    });
    console.log(`Found ${followsSnap.size} follows (${totalOrphanFollows} orphaned).`);

    // 7. Scan article comments via collectionGroup('comments')
    console.log('Scanning article comments via collectionGroup("comments")...');
    const commentsSnap = await db.collectionGroup('comments').get();
    let totalOrphanComments = 0;
    commentsSnap.docs.forEach(docSnap => {
      const data = docSnap.data();
      const userId = typeof data.userId === 'string' ? data.userId : '';

      if (isDeletedUid(userId)) {
        totalOrphanComments++;
        getStats(userId).comments++;
        pushMap(uidCommentsMap, userId, docSnap.ref);
      }
    });
    console.log(`Found ${commentsSnap.size} comments (${totalOrphanComments} orphaned).`);

    // 8. Scan rating likes via collectionGroup('likedBy')
    console.log('Scanning rating likes via collectionGroup("likedBy")...');
    const likedBySnap = await db.collectionGroup('likedBy').get();
    let totalOrphanLikedBy = 0;
    likedBySnap.docs.forEach(docSnap => {
      const userId = docSnap.id;

      if (isDeletedUid(userId)) {
        totalOrphanLikedBy++;
        getStats(userId).likedBy++;
        pushMap(uidLikedByMap, userId, docSnap.ref);
      }
    });
    console.log(`Found ${likedBySnap.size} likedBy records (${totalOrphanLikedBy} orphaned).`);

    // 9. Scan "reports" collection (reporterId or targetAuthorId)
    console.log('Scanning "reports" collection...');
    const reportsSnap = await db.collection('reports').get();
    let totalOrphanReports = 0;
    reportsSnap.docs.forEach(docSnap => {
      const data = docSnap.data();
      const reporterId = typeof data.reporterId === 'string' ? data.reporterId : '';
      const targetAuthorId = typeof data.targetAuthorId === 'string' ? data.targetAuthorId : '';

      const isReporterDeleted = isDeletedUid(reporterId);
      const isTargetDeleted = isDeletedUid(targetAuthorId);

      if (isReporterDeleted || isTargetDeleted) {
        totalOrphanReports++;
        if (isReporterDeleted) {
          getStats(reporterId).reports++;
          pushMap(uidReportsMap, reporterId, docSnap.ref);
        }
        if (isTargetDeleted) {
          getStats(targetAuthorId).reports++;
          pushMap(uidReportsMap, targetAuthorId, docSnap.ref);
        }
      }
    });
    console.log(`Found ${reportsSnap.size} reports (${totalOrphanReports} orphaned).`);

    // 10. Scan "files" collection (userId)
    console.log('Scanning "files" collection...');
    const filesSnap = await db.collection('files').get();
    let totalOrphanFiles = 0;
    filesSnap.docs.forEach(docSnap => {
      const data = docSnap.data();
      const userId = typeof data.userId === 'string' ? data.userId : '';

      if (isDeletedUid(userId)) {
        totalOrphanFiles++;
        getStats(userId).files++;
        pushMap(uidFilesMap, userId, docSnap.ref);
      }
    });
    console.log(`Found ${filesSnap.size} files (${totalOrphanFiles} orphaned).`);

    // 11. Check articles authored by deleted users (REPORT ONLY - DO NOT DELETE)
    console.log('Scanning articles authored by deleted users (Report only)...');
    const articlesSnap = await db.collection('articles').get();
    let totalOrphanArticles = 0;
    articlesSnap.docs.forEach(docSnap => {
      const data = docSnap.data();
      const authorId = typeof data.author?.id === 'string'
        ? data.author.id
        : (typeof data.authorId === 'string' ? data.authorId : '');

      if (isDeletedUid(authorId)) {
        totalOrphanArticles++;
        getStats(authorId).authoredArticles++;
      }
    });
    console.log(`Found ${totalOrphanArticles} articles authored by deleted users (retained per specification).\n`);

    // 12. Scan Subcollections of users/{uid} and Storage objects for all collected deleted UIDs
    const allDeletedUids = Array.from(deletedMap.keys()).filter(uid => !isProtectedUid(uid));
    console.log(`Checking subcollections and Cloud Storage profile photos for ${allDeletedUids.length} deleted UIDs...`);

    interface SubcollectionRefInfo {
      uid: string;
      subcolName: string;
      docCount: number;
      ref: FirebaseFirestore.CollectionReference;
    }
    const uidSubcollectionsMap = new Map<string, SubcollectionRefInfo[]>();

    interface StorageFileInfo {
      uid: string;
      name: string;
      file: any;
    }
    const uidStorageFilesMap = new Map<string, StorageFileInfo[]>();

    for (const uid of allDeletedUids) {
      if (isProtectedUid(uid)) continue; // Protected admin: skip completely
      const stats = getStats(uid);

      // Inspect subcollections under users/{uid}
      try {
        const userDocRef = db.doc(`users/${uid}`);
        const subcollections = await userDocRef.listCollections();
        for (const subcol of subcollections) {
          const snap = await subcol.get();
          if (snap.size > 0) {
            stats.subcollections[subcol.id] = snap.size;
            if (!uidSubcollectionsMap.has(uid)) uidSubcollectionsMap.set(uid, []);
            uidSubcollectionsMap.get(uid)!.push({
              uid,
              subcolName: subcol.id,
              docCount: snap.size,
              ref: subcol,
            });
          }
        }
      } catch (subErr: any) {
        console.warn(`[Warning] Could not inspect subcollections for uid ${uid}:`, subErr?.message || subErr);
      }

      // Inspect Cloud Storage profile_photos/{uid}/
      try {
        const [files] = await bucket.getFiles({ prefix: `profile_photos/${uid}/` });
        if (files.length > 0) {
          stats.storageObjects = files.length;
          if (!uidStorageFilesMap.has(uid)) uidStorageFilesMap.set(uid, []);
          files.forEach(f => {
            uidStorageFilesMap.get(uid)!.push({ uid, name: f.name, file: f });
          });
        }
      } catch (storageErr: any) {
        // Storage bucket may not be configured or reachable in offline dry-run
      }
    }

    // 13. Execution Phase (on --apply) with per-UID re-check
    if (isApply) {
      console.log('\n--- EXECUTING DELETIONS (--apply) ---');

      for (const uid of allDeletedUids) {
        if (isProtectedUid(uid)) {
          console.log(`[Protected Admin Skip] UID ${uid} is a protected admin account. Skipping all deletions.`);
          continue;
        }

        // Re-check before deleting anything for a UID:
        const stillMissing = !(await db.doc(`users/${uid}`).get()).exists;
        if (!stillMissing) {
          console.log(`[Re-check Skip] User doc users/${uid} exists now. Skipping deletions for this UID.`);
          continue;
        }

        console.log(`Processing deletion for deleted UID ${uid}...`);

        // a) Delete subcollections of users/{uid}
        const subcols = uidSubcollectionsMap.get(uid) || [];
        for (const sub of subcols) {
          try {
            await db.recursiveDelete(sub.ref);
            console.log(`  - Deleted subcollection users/${uid}/${sub.subcolName} (${sub.docCount} docs)`);
          } catch (e: any) {
            console.warn(`  - Failed to delete subcollection ${sub.subcolName}:`, e?.message || e);
          }
        }

        // b) Delete handles for this UID
        const handles = uidHandlesMap.get(uid) || [];
        for (const hRef of handles) {
          try {
            await hRef.delete();
            console.log(`  - Deleted handle doc ${hRef.id}`);
          } catch (e: any) {
            console.warn(`  - Failed to delete handle ${hRef.id}:`, e?.message || e);
          }
        }

        // c) Delete userPrivate doc
        const pRef = uidUserPrivateMap.get(uid);
        if (pRef) {
          try {
            await pRef.delete();
            console.log(`  - Deleted userPrivate doc for ${uid}`);
          } catch (e: any) {
            console.warn(`  - Failed to delete userPrivate doc:`, e?.message || e);
          }
        }

        // d) Delete follows docs
        const follows = uidFollowsMap.get(uid) || [];
        for (const fRef of follows) {
          try {
            await fRef.delete();
          } catch (e: any) {
            console.warn(`  - Failed to delete follow ${fRef.id}:`, e?.message || e);
          }
        }
        if (follows.length > 0) {
          console.log(`  - Deleted ${follows.length} follows docs.`);
        }

        // e) Delete comments
        const comments = uidCommentsMap.get(uid) || [];
        for (const cRef of comments) {
          try {
            await cRef.delete();
          } catch (e: any) {
            console.warn(`  - Failed to delete comment ${cRef.id}:`, e?.message || e);
          }
        }
        if (comments.length > 0) {
          console.log(`  - Deleted ${comments.length} article comments.`);
        }

        // f) Delete likedBy
        const likedBys = uidLikedByMap.get(uid) || [];
        for (const lRef of likedBys) {
          try {
            await lRef.delete();
          } catch (e: any) {
            console.warn(`  - Failed to delete likedBy ${lRef.id}:`, e?.message || e);
          }
        }
        if (likedBys.length > 0) {
          console.log(`  - Deleted ${likedBys.length} likedBy records.`);
        }

        // g) Delete reports
        const reports = uidReportsMap.get(uid) || [];
        for (const rRef of reports) {
          try {
            await rRef.delete();
          } catch (e: any) {
            console.warn(`  - Failed to delete report ${rRef.id}:`, e?.message || e);
          }
        }
        if (reports.length > 0) {
          console.log(`  - Deleted ${reports.length} report docs.`);
        }

        // h) Delete files
        const files = uidFilesMap.get(uid) || [];
        for (const flRef of files) {
          try {
            await flRef.delete();
          } catch (e: any) {
            console.warn(`  - Failed to delete file doc ${flRef.id}:`, e?.message || e);
          }
        }
        if (files.length > 0) {
          console.log(`  - Deleted ${files.length} file docs.`);
        }

        // i) Delete Storage profile photos
        const storageFiles = uidStorageFilesMap.get(uid) || [];
        for (const sf of storageFiles) {
          try {
            await sf.file.delete();
          } catch (e: any) {
            console.warn(`  - Failed to delete storage file ${sf.name}:`, e?.message || e);
          }
        }
        if (storageFiles.length > 0) {
          console.log(`  - Deleted ${storageFiles.length} Cloud Storage profile photos.`);
        }
      }

      // Optionally delete Auth users if flag is set and account is > 24 hours old
      if (deleteAuthFlag) {
        const toDeleteAuth = orphanAuthUsers.filter(u => u.isOlderThan24h);
        if (toDeleteAuth.length > 0) {
          console.log(`\nEvaluating ${toDeleteAuth.length} Firebase Auth accounts created > 24 hours ago...`);
          for (const u of toDeleteAuth) {
            if (isProtectedUid(u.uid) || isProtectedEmail(u.email)) {
              console.log(`[Protected Admin Skip Auth] UID ${u.uid} (${u.email || 'no-email'}) is a protected admin account. Skipping Auth deletion.`);
              continue;
            }

            // Re-check before auth.deleteUser(uid)
            const stillMissing = !(await db.doc(`users/${u.uid}`).get()).exists;
            if (!stillMissing) {
              console.log(`[Re-check Skip Auth] User doc users/${u.uid} exists now. Skipping Auth deletion.`);
              continue;
            }

            try {
              await auth.deleteUser(u.uid);
              console.log(`  - Successfully deleted Firebase Auth account ${u.uid} (${u.email || 'no-email'}).`);
            } catch (authErr: any) {
              console.warn(`  - Could not delete auth user ${u.uid}:`, authErr?.message || authErr);
            }
          }
        }
      }
    }

    // 14. Output "Protected Admin Accounts Skipped" Section
    console.log('\n=====================================================');
    console.log('PROTECTED ADMIN ACCOUNTS SKIPPED');
    console.log('=====================================================');
    if (protectedAdminAccounts.size === 0) {
      console.log('No protected admin accounts configured.');
    } else {
      const protectedTable = Array.from(protectedAdminAccounts.values()).map(acc => ({
        'Protected UID': acc.uid,
        'Email': acc.email || '(none)',
        'Reason': acc.reason,
        'Protection Status': 'PROTECTED (EXCLUDED FROM ALL DELETIONS)',
      }));
      console.table(protectedTable);
    }

    // 15. Output Table of Deleted UIDs
    console.log('\n=====================================================');
    console.log('TABLE OF DELETED UIDS');
    console.log('=====================================================');

    if (deletedMap.size === 0) {
      console.log('No deleted UIDs found. No orphan records detected!');
    } else {
      const tableRows = Array.from(deletedMap.values()).map(item => {
        const subcolSummary = Object.entries(item.subcollections)
          .map(([k, v]) => `${k}:${v}`)
          .join(', ') || '0';

        return {
          'Deleted UID': item.uid,
          'Email': item.email || '(none)',
          'Handles': item.handles.join(', ') || '0',
          'Private': item.hasUserPrivate ? 'Yes' : 'No',
          'Subcollections': subcolSummary,
          'Follows': item.follows,
          'Comments': item.comments,
          'LikedBy': item.likedBy,
          'Reports': item.reports,
          'Files': item.files,
          'Storage Photos': item.storageObjects,
          'Auth User': item.authStatus,
          'Articles (Retained)': item.authoredArticles,
        };
      });

      console.table(tableRows);
    }

    // 16. Output Summary Counts per Category
    let totalSubcolDocs = 0;
    let totalSubcolCount = 0;
    uidSubcollectionsMap.forEach(subs => {
      totalSubcolCount += subs.length;
      subs.forEach(s => totalSubcolDocs += s.docCount);
    });

    let totalStorageFilesCount = 0;
    uidStorageFilesMap.forEach(files => {
      totalStorageFilesCount += files.length;
    });

    console.log('\n=====================================================');
    console.log('SUMMARY COUNTS PER CATEGORY');
    console.log('=====================================================');
    console.log(`Target database:                        ${databaseId}`);
    console.log(`Execution Mode:                         ${isApply ? 'APPLY (DELETED)' : 'DRY-RUN (NO CHANGES MADE)'}`);
    console.log(`Protected Admin Accounts:              ${protectedAdminAccounts.size} accounts preserved`);
    console.log(`Total Deleted UIDs detected:            ${deletedMap.size}`);
    console.log(`- Orphaned handles:                     ${totalOrphanHandles}`);
    console.log(`- Orphaned userPrivate docs:            ${totalOrphanUserPrivate}`);
    console.log(`- Orphaned subcollections (total docs): ${totalSubcolCount} collections (${totalSubcolDocs} docs)`);
    console.log(`- Orphaned follows docs:                ${totalOrphanFollows}`);
    console.log(`- Orphaned article comments:            ${totalOrphanComments}`);
    console.log(`- Orphaned likedBy records:             ${totalOrphanLikedBy}`);
    console.log(`- Orphaned reports:                     ${totalOrphanReports}`);
    console.log(`- Orphaned files docs:                  ${totalOrphanFiles}`);
    console.log(`- Cloud Storage profile photos:         ${totalStorageFilesCount}`);
    console.log(`- Auth accounts without users doc:      ${orphanAuthUsers.length} (${orphanAuthUsers.filter(u => u.isOlderThan24h).length} >24h old)`);
    console.log(`- Articles authored by deleted users:   ${totalOrphanArticles} (REPORT ONLY - RETAINED)`);
    console.log('=====================================================\n');

  } catch (err: any) {
    console.error('[Cleanup Error] Fatal error during cleanup:', err);
    process.exit(1);
  }
}

cleanupOrphans()
  .then(() => {
    console.log('Orphan cleanup routine completed successfully.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Unhandled failure:', err);
    process.exit(1);
  });
