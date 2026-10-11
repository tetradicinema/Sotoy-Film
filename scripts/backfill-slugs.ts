import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, terminate } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { slugify } from '../src/utils/slugify';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function backfillSlugs() {
  console.log('=== Starting Slug Backfill Migration for films & articles ===');

  let updatedFilms = 0;
  let skippedFilms = 0;
  let updatedArticles = 0;
  let skippedArticles = 0;

  try {
    // 1. Process Films
    console.log('\n[1/2] Scanning "films" collection...');
    const filmsSnap = await getDocs(collection(db, 'films'));
    console.log(`Found ${filmsSnap.size} films documents.`);

    const existingFilmSlugs = new Set<string>();
    // First pass to collect existing valid slugs
    filmsSnap.docs.forEach(d => {
      const slug = d.data().slug;
      if (typeof slug === 'string' && slug.trim()) {
        existingFilmSlugs.add(slug.trim());
      }
    });

    for (const filmDoc of filmsSnap.docs) {
      const data = filmDoc.data();
      const existingSlug = typeof data.slug === 'string' ? data.slug.trim() : '';

      if (!existingSlug) {
        let baseSlug = slugify(data.title || filmDoc.id);
        if (!baseSlug) baseSlug = filmDoc.id;

        let candidateSlug = baseSlug;
        let suffix = 2;
        while (existingFilmSlugs.has(candidateSlug)) {
          candidateSlug = `${baseSlug}-${suffix}`;
          suffix++;
        }

        existingFilmSlugs.add(candidateSlug);
        await updateDoc(doc(db, 'films', filmDoc.id), { slug: candidateSlug });
        console.log(`  -> Updated film ${filmDoc.id} ("${data.title}") with slug: "${candidateSlug}"`);
        updatedFilms++;
      } else {
        skippedFilms++;
      }
    }

    // 2. Process Articles
    console.log('\n[2/2] Scanning "articles" collection...');
    const articlesSnap = await getDocs(collection(db, 'articles'));
    console.log(`Found ${articlesSnap.size} articles documents.`);

    const existingArticleSlugs = new Set<string>();
    articlesSnap.docs.forEach(d => {
      const slug = d.data().slug;
      if (typeof slug === 'string' && slug.trim()) {
        existingArticleSlugs.add(slug.trim());
      }
    });

    for (const artDoc of articlesSnap.docs) {
      const data = artDoc.data();
      const existingSlug = typeof data.slug === 'string' ? data.slug.trim() : '';

      if (!existingSlug) {
        let baseSlug = slugify(data.title || artDoc.id);
        if (!baseSlug) baseSlug = artDoc.id;

        let candidateSlug = baseSlug;
        let suffix = 2;
        while (existingArticleSlugs.has(candidateSlug)) {
          candidateSlug = `${baseSlug}-${suffix}`;
          suffix++;
        }

        existingArticleSlugs.add(candidateSlug);
        await updateDoc(doc(db, 'articles', artDoc.id), { slug: candidateSlug });
        console.log(`  -> Updated article ${artDoc.id} ("${data.title}") with slug: "${candidateSlug}"`);
        updatedArticles++;
      } else {
        skippedArticles++;
      }
    }

    console.log('\n=== Backfill Completed Summary ===');
    console.log(`Films: ${updatedFilms} updated, ${skippedFilms} already had slug.`);
    console.log(`Articles: ${updatedArticles} updated, ${skippedArticles} already had slug.`);
    console.log(`Total documents updated: ${updatedFilms + updatedArticles}`);

  } catch (err: any) {
    console.error('Error during backfill:', err);
  } finally {
    try {
      await terminate(db);
    } catch {}
    process.exit(0);
  }
}

backfillSlugs();
