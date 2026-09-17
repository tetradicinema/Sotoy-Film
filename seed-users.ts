
import { db } from './src/lib/firebase.js';
import { doc, setDoc } from 'firebase/firestore';

const users = [
  {
    id: "I34eqzOmvsSdS2Rf7jpfxw1ZKeu1",
    name: "Sotoy Admin",
    handle: "@adminsotoy",
    role: "admin",
    roleTitle: "Head Admin & Lead Editor",
    bio: "Menjaga ketertiban obrolan sotoy seantero jagat perfilman.",
    email: "eksposurmedia@gmail.com",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
    totalReviews: 0,
    totalBuzz: 0,
    followers: [],
    following: []
  },
  {
    id: "Mo62jfopxhMG9Q7BqoiHUbgeclp1",
    name: "Rian Sinematografer",
    handle: "@riansinotoy",
    role: "si_paling_sotoy",
    roleTitle: "Si Paling Sotoy (Kritikus & Kurator)",
    bio: "Menilai film dari sudut blocking kamera, color grade, dan pacing. 10+ tahun nonton festival.",
    email: "critic@sotoyfilm.id",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80",
    totalReviews: 12,
    totalBuzz: 24,
    followers: [],
    following: []
  },
  {
    id: "SBpoHfx3v1eWo83eb3IyKWz9oth1",
    name: "Dinda Redaksi",
    handle: "@dindaredaksi",
    role: "penulis_sotoy",
    roleTitle: "Penulis Sotoy (Jurnalis Film & Pop-Culture)",
    bio: "Editor & penulis feature di Sotoy Film. Pecinta film noir dan anime retro 90-an.",
    email: "writer@sotoyfilm.id",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80",
    totalReviews: 5,
    totalBuzz: 10,
    followers: [],
    following: []
  },
  {
    id: "MVDiRyY9TDRHIsEskAAl7cV4cvA2",
    name: "Budi Cinephile",
    handle: "@budisuka_film",
    role: "warga_sotoy",
    roleTitle: "Warga Sotoy (Penonton Santai)",
    bio: "Nonton apa aja yang lagi rame. Nggak suka spoiler!",
    email: "warga@sotoyfilm.id",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
    totalReviews: 2,
    totalBuzz: 5,
    followers: [],
    following: []
  }
];

async function seedUsers() {
  console.log("Seeding users...");
  for (const user of users) {
    try {
      await setDoc(doc(db, "users", user.id), user);
      console.log(`Successfully seeded user: ${user.name} (${user.id})`);
    } catch (error) {
      console.error(`Error seeding user ${user.id}:`, error);
    }
  }
  console.log("Seeding complete.");
  process.exit(0);
}

seedUsers();
