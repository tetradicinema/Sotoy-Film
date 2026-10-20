import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, terminate } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { resolveFilmDbSection, getStreamingPlatforms, getFilmEffectiveReleaseDate } from '../src/utils/filmSections';

const KEYS = ['fd_on_theatres', 'fd_streaming', 'fd_coming_soon', 'fd_animation', 'fd_fans_favourite'] as const;

async function main() {
  const app = initializeApp(firebaseConfig as any, `diag-${Date.now()}`);
  const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
  const now = new Date();

  const snap = await getDocs(collection(db, 'films'));
  const films: any[] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  console.log(`\nFilms loaded: ${films.length}   (now = ${now.toISOString()})`);

  const withW = films.filter((f) => Array.isArray(f.whereToWatch) && f.whereToWatch.length > 0);
  const typeCount: Record<string, number> = {};
  const platformCount: Record<string, number> = {};
  for (const f of withW) {
    for (const w of f.whereToWatch) {
      typeCount[String(w?.type)] = (typeCount[String(w?.type)] || 0) + 1;
      if (w?.type === 'stream') platformCount[String(w?.platform)] = (platformCount[String(w?.platform)] || 0) + 1;
    }
  }
  console.log(`\n[whereToWatch] films with any entry: ${withW.length}/${films.length}`);
  console.log('entry types (must be exactly stream / cinema / rent):', typeCount);
  console.log('raw stream platforms:', platformCount);
  console.log('normalized platform tabs:', getStreamingPlatforms(films as any));
  console.log('sample whereToWatch:', JSON.stringify(withW.slice(0, 3).map((f) => ({ title: f.title, w: f.whereToWatch })), null, 1));

  const withDate = films.filter((f) => getFilmEffectiveReleaseDate(f));
  const withId = films.filter((f) => f.idReleaseDate);
  const future = withDate.filter((f) => getFilmEffectiveReleaseDate(f)!.getTime() > now.getTime());
  console.log(`\n[dates] usable release date: ${withDate.length}/${films.length}, idReleaseDate: ${withId.length}, future dates: ${future.length}`);

  let cfg: any = null;
  try {
    const c = await getDoc(doc(db, 'siteConfig', 'homepageSections'));
    cfg = c.exists() ? c.data() : null;
  } catch (e: any) {
    console.log('\n[config] could not read siteConfig/homepageSections:', e?.message);
  }
  console.log('\n[config] filmDbSectionOrder:', cfg?.filmDbSectionOrder ?? '(not saved, default order)');

  console.log('\n[sections] result per section (same resolver as the page)');
  for (const key of KEYS) {
    const sc = cfg?.sections?.[key] ?? { sourceType: 'auto' };
    const out = resolveFilmDbSection(key as any, films as any, sc, { now });
    console.log(`- ${key}: ${out.length} film(s) | config=${JSON.stringify(sc)}`);
    out.slice(0, 5).forEach((f: any) => console.log(`    ${f.title}`));
  }

  await terminate(db);
  await deleteApp(app);
  process.exit(0);
}

main().catch((e) => {
  console.error('Diagnose failed:', e);
  process.exit(1);
});
