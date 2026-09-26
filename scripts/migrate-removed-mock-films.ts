import { db } from '../src/lib/firebase';
import { collection, doc, getDocs, setDoc, terminate } from 'firebase/firestore';
import { INITIAL_FILMS } from '../src/data/mockData';

async function migrateRemovedMockFilms() {
  console.log('=====================================================');
  console.log('Starting Migration: Removed Mock Films -> Firestore');
  console.log('=====================================================\n');

  try {
    // 1. Fetch real film documents in Firestore
    console.log('[1/4] Fetching current films from Firestore collection "films"...');
    const filmsSnapshot = await getDocs(collection(db, 'films'));
    const existingFilmIds = new Set<string>();
    filmsSnapshot.forEach(docSnap => {
      existingFilmIds.add(docSnap.id);
    });
    console.log(`=> Found ${existingFilmIds.size} real film documents in Firestore.`);

    // 2. Fetch existing markers in removedMockFilms
    console.log('\n[2/4] Fetching existing markers in "removedMockFilms" collection...');
    const existingRemovedSnap = await getDocs(collection(db, 'removedMockFilms'));
    const alreadyMarkedIds = new Set<string>();
    existingRemovedSnap.forEach(docSnap => {
      alreadyMarkedIds.add(docSnap.id);
    });
    console.log(`=> Found ${alreadyMarkedIds.size} existing markers in "removedMockFilms".`);

    // 3. Process INITIAL_FILMS
    console.log('\n[3/4] Evaluating INITIAL_FILMS mock items against Firestore database...');
    console.log(`=> Total INITIAL_FILMS defined: ${INITIAL_FILMS.length}`);

    let newlyCreatedCount = 0;
    let alreadyMarkedCount = 0;
    let retainedInFirestoreCount = 0;

    const migrationSummary: Array<{ id: string; title: string; status: string }> = [];

    for (const film of INITIAL_FILMS) {
      const isRealFirestoreDoc = existingFilmIds.has(film.id);

      if (isRealFirestoreDoc) {
        retainedInFirestoreCount++;
        migrationSummary.push({
          id: film.id,
          title: film.title,
          status: 'KEPT_IN_FIRESTORE (Real document exists in "films")',
        });
        continue;
      }

      // Not present in Firestore 'films' collection -> Needs marker in 'removedMockFilms'
      if (alreadyMarkedIds.has(film.id)) {
        alreadyMarkedCount++;
        migrationSummary.push({
          id: film.id,
          title: film.title,
          status: 'ALREADY_MARKED (Marker already present in "removedMockFilms")',
        });
      } else {
        const markerPayload = {
          id: film.id,
          removedAt: new Date().toISOString(),
        };

        await setDoc(doc(db, 'removedMockFilms', film.id), markerPayload);
        newlyCreatedCount++;
        migrationSummary.push({
          id: film.id,
          title: film.title,
          status: 'CREATED_MARKER (Successfully written to "removedMockFilms")',
        });
        console.log(`  + Created removedMockFilms marker for: ${film.id} ("${film.title}")`);
      }
    }

    // 4. Output Summary Report
    console.log('\n[4/4] Migration Summary Report:');
    console.table(migrationSummary);

    console.log('-----------------------------------------------------');
    console.log(`Total INITIAL_FILMS checked:       ${INITIAL_FILMS.length}`);
    console.log(`Newly created marker documents:    ${newlyCreatedCount}`);
    console.log(`Previously existing markers:       ${alreadyMarkedCount}`);
    console.log(`Retained as real Firestore films:  ${retainedInFirestoreCount}`);
    console.log('-----------------------------------------------------');
    console.log('Migration completed successfully!');

    try {
      await terminate(db);
    } catch {
      // ignore termination error
    }

    process.exit(0);
  } catch (error) {
    console.error('\n[FATAL] Error running migration script:', error);
    process.exit(1);
  }
}

migrateRemovedMockFilms();
