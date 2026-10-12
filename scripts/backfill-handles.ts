import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function backfillHandles() {
  const isApply = process.argv.includes('--apply');
  console.log('=====================================================');
  console.log(`Starting Handles Backfill Migration ${isApply ? '(APPLY MODE)' : '(DRY-RUN MODE)'}`);
  console.log('=====================================================\n');

  let scanned = 0;
  let normalizedCount = 0;
  let dedupedCount = 0;
  let registryCreated = 0;
  const renamedUsers: Array<{ uid: string; oldHandle: string; newHandle: string }> = [];

  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    scanned = usersSnap.size;
    console.log(`Found ${scanned} user documents in "users" collection.`);

    const usersData: Array<{ id: string; createdAt: string; handle: string; name: string }> = [];
    usersSnap.docs.forEach(docSnap => {
      const data = docSnap.data();
      usersData.push({
        id: docSnap.id,
        createdAt: data.createdAt || new Date().toISOString(),
        handle: typeof data.handle === 'string' ? data.handle : '',
        name: data.name || 'User',
      });
    });

    // Sort users by createdAt ascending (oldest first) so deterministic tie-breaking works
    usersData.sort((a, b) => {
      const tA = new Date(a.createdAt).getTime() || 0;
      const tB = new Date(b.createdAt).getTime() || 0;
      return tA - tB;
    });

    const handleAssignments = new Map<string, string>(); // body -> uid
    const userNewHandles = new Map<string, string>(); // uid -> newHandle

    for (const user of usersData) {
      let raw = user.handle.trim().toLowerCase();
      if (user.id === 'CsG2CY2TaIZmG7yuPfzAxmRYrlY2') {
        raw = '@admin_sotoyfilm';
      }

      let cleaned = raw.replace(/^@+/, '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
      let candidate = cleaned ? `@${cleaned}` : '';
      let body = candidate.slice(1);

      if (!body || body.length < 3 || body.length > 30) {
        const rand4 = Math.floor(1000 + Math.random() * 9000);
        candidate = `@warga_${rand4}`;
        normalizedCount++;
      }

      let finalHandle = candidate;
      let bodyOnly = finalHandle.slice(1);
      while (handleAssignments.has(bodyOnly) && handleAssignments.get(bodyOnly) !== user.id) {
        dedupedCount++;
        const baseBody = finalHandle.replace(/^@/, '').replace(/\d+$/, '');
        const nextRand = Math.floor(1000 + Math.random() * 9000);
        finalHandle = `@${baseBody}${nextRand}`;
        bodyOnly = finalHandle.slice(1);
      }

      handleAssignments.set(bodyOnly, user.id);
      userNewHandles.set(user.id, finalHandle);

      if (user.handle !== finalHandle) {
        renamedUsers.push({
          uid: user.id,
          oldHandle: user.handle || '(empty)',
          newHandle: finalHandle,
        });
      }
    }

    console.log(`\n--- Summary Stats ---`);
    console.log(`Scanned: ${scanned}`);
    console.log(`Normalized: ${normalizedCount}`);
    console.log(`Deduped: ${dedupedCount}`);
    console.log(`Renamed Users: ${renamedUsers.length}`);

    if (renamedUsers.length > 0) {
      console.log('\nRenamed Users Table:');
      console.table(renamedUsers);
    }

    if (isApply) {
      console.log('\nApplying changes to Firestore (batch writes)...');
      let batch = writeBatch(db);
      let batchCount = 0;

      for (const user of usersData) {
        const newHandle = userNewHandles.get(user.id)!;
        const hId = newHandle.replace(/^@/, '');
        const userRef = doc(db, 'users', user.id);
        const handleRef = doc(db, 'handles', hId);

        batch.update(userRef, { handle: newHandle });
        batch.set(handleRef, { uid: user.id, createdAt: new Date().toISOString() }, { merge: true });
        batchCount += 2;
        registryCreated++;

        if (batchCount >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      }
      if (batchCount > 0) {
        await batch.commit();
      }
      console.log(`Successfully created ${registryCreated} handle registry docs and updated users in Firestore!`);
    } else {
      console.log('\n[DRY-RUN] No writes performed. Run with --apply to execute migration.');
    }

  } catch (err) {
    console.error('Error during backfill-handles:', err);
  }
}

backfillHandles();
