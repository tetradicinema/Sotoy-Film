import { db } from '../src/lib/firebase';
import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteField, terminate } from 'firebase/firestore';

async function migrateUserEmails() {
  console.log('=====================================================');
  console.log('Starting Migration: User Emails -> userPrivate Collection');
  console.log('=====================================================\n');

  let scanned = 0;
  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  try {
    console.log('[1/2] Fetching all user documents from Firestore collection "users"...');
    const usersSnapshot = await getDocs(collection(db, 'users'));
    scanned = usersSnapshot.size;
    console.log(`=> Found ${scanned} user documents in "users" collection.\n`);

    const summary: Array<{ id: string; name: string; emailFound: string; status: string }> = [];

    for (const userSnap of usersSnapshot.docs) {
      const userId = userSnap.id;
      const userData = userSnap.data();
      const existingEmail = userData.email;

      if (!existingEmail || typeof existingEmail !== 'string' || existingEmail.trim() === '') {
        skipped++;
        summary.push({
          id: userId,
          name: userData.name || 'Unknown',
          emailFound: 'None',
          status: 'SKIPPED (No email on public user doc)',
        });
        continue;
      }

      try {
        const cleanEmail = existingEmail.trim();

        // Check if userPrivate document already exists
        const privateRef = doc(db, 'userPrivate', userId);
        const privateSnap = await getDoc(privateRef);

        let userPrivateWritten = false;
        if (!privateSnap.exists() || !privateSnap.data()?.email) {
          await setDoc(privateRef, {
            email: cleanEmail,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
          userPrivateWritten = true;
        }

        // Remove email field from public user doc
        await updateDoc(doc(db, 'users', userId), {
          email: deleteField(),
        });

        migrated++;
        summary.push({
          id: userId,
          name: userData.name || 'Unknown',
          emailFound: cleanEmail,
          status: userPrivateWritten
            ? 'MIGRATED (Created userPrivate & removed email from users doc)'
            : 'MIGRATED (userPrivate existed; removed email from users doc)',
        });
        console.log(`  + Migrated user ${userId} (${userData.name}): ${cleanEmail}`);
      } catch (err: any) {
        failed++;
        summary.push({
          id: userId,
          name: userData.name || 'Unknown',
          emailFound: String(existingEmail),
          status: `FAILED (${err?.message || err})`,
        });
        console.error(`  - Failed to migrate user ${userId}:`, err);
      }
    }

    console.log('\n[2/2] Migration Summary Report:');
    console.table(summary);

    console.log('-----------------------------------------------------');
    console.log(`Users scanned:  ${scanned}`);
    console.log(`Users migrated: ${migrated}`);
    console.log(`Users skipped:  ${skipped}`);
    console.log(`Users failed:   ${failed}`);
    console.log('-----------------------------------------------------');
    console.log('Migration process completed!');

    try {
      await terminate(db);
    } catch {
      // ignore termination error
    }

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n[FATAL] Error running migration script:', error);
    process.exit(1);
  }
}

migrateUserEmails();
