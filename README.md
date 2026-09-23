# 🎬 Sotoy Film — Indonesian Film Community & Pop-Culture Media Platform

[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore_%26_Auth-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/Express-5.0-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Recharts](https://img.shields.io/badge/Recharts-3.0-22c55e?style=for-the-badge&logo=recharts&logoColor=white)](https://recharts.org/)

> **Sotoy Film** adalah platform media pop-culture dan komunitas film terpadu di Indonesia. Menggabungkan sistem penilaian ulasan ganda (**Skor Sotoy Warga & Kritikus**), forum diskusi interaktif (**Buzz**), penerbitan editorial film (**CMS & Film Studies**), serta dasbor analitik dan moderasi komprehensif.

---

## 📑 Daftar Isi

- [Fitur Utama](#-fitur-utama)
- [Teknologi & Arsitektur](#-teknologi--arsitektur)
- [Struktur Peran Akun (RBAC)](#-struktur-peran-akun-rbac)
- [Struktur Direktori Proyek](#-struktur-direktori-proyek)
- [Panduan Instalasi & Menjalankan Lokal](#-panduan-instalasi--menjalankan-lokal)
- [Daftar Skrip (NPM Scripts)](#-daftar-skrip-npm-scripts)
- [Variabel Lingkungan (Environment Variables)](#-variabel-lingkungan-environment-variables)
- [Skema Database & Keamanan Firebase](#-skema-database--keamanan-firebase)
- [Middleware & SEO Meta-Injection](#-middleware--seo-meta-injection)
- [Panduan Deployment (Vercel & Docker/Cloud Run)](#-panduan-deployment)
- [Lisensi](#-lisensi)

---

## ✨ Fitur Utama

### 1. 🎞️ Database Film, Series & Anime
- Katalog lengkap film layar lebar, serial TV, dan anime.
- Sinkronisasi metadata otomatis via server-side **TMDB Proxy** (sinopsis, sutradara, pemeran, poster, backdrop, dan rekomendasi tontonan).
- Informasi platform streaming legal di Indonesia (*Netflix, Disney+ Hotstar, Prime Video, Vidio, Bioskop*).

### 2. ⭐ Sistem Penilaian Ganda (Skor Sotoy)
- **Skor Warga:** Rata-rata skor demokratis dari seluruh anggota komunitas terdaftar (*skala 1.0 - 10.0*).
- **Skor Kritikus Terverifikasi:** Penilaian mendalam dari kritikus film terverifikasi (**Si Paling Sotoy**).
- Ulasan berbasis teks lengkap dengan *headline*, argumen, sistem upvote ulasan, dan lencana verifikasi.

### 3. 💬 Forum Komunitas "Buzz"
- Ruang obrolan mikro dan ruang diskusi film instan (*micro-blogging*).
- **Lampiran Foto:** Pengguna dapat melampirkan 1 foto per postingan dengan kompresi otomatis client-side (*browser-image-compression*) sebelum diunggah ke Firebase Storage, dilengkapi pratinjau thumbnail dan mode lightbox interaktif.
- Fitur *tagging* film atau artikel terkait ke dalam postingan.
- Utas percakapan bersarang (*threaded replies*), sistem vote skor/reaksi, dan *anti-spam client safeguards*.

### 4. 📰 Editorial Magazine & Full Control CMS
- Penerbitan artikel mendalam: *Ulasan Editorial, Kajian Sinema (Film Studies), Bedah Alat Sinema (Cinema Gear), Berita Industri, dan Listicle*.
- Manajemen status publikasi: *Draft, Terjadwal (Scheduled Publishing), dan Published*.
- Pengaturan SEO on-page: *Custom SEO Title, Meta Description, OpenGraph Preview Image, dan Target Keywords*.

### 5. 📊 Admin Control Center & Analytics Dashboard
- **Visualisasi Recharts:** Grafik pertumbuhan harian (*Daily Active Users* / DAU), pendaftaran baru, dan pertumbuhan kumulatif.
- **User Retention & Community Health Breakdown:** Lacak pengguna kembali (*returning users*), laju retensi harian, dan analisis kohort (*Day 1, Day 7, Day 30 Retention*).
- **Manajemen Pengguna Massal (*Bulk Actions*):** Hapus atau tangguhkan beberapa akun sekaligus.
- **Moderasi & Banding Akun:** Verifikasi laporan pelanggaran komunitas dan evaluasi banding suspensi akun secara transparan.
- **Audit Log Moderasi:** Jejak rekam seluruh keputusan admin untuk akuntabilitas.
- **Ekspor Laporan CSV:** Unduh ringkasan performa komunitas dengan satu klik.

### 6. 🌐 Optimasi Mesin Pencari (SEO) & Bot Pre-rendering
- Serverless Middleware di Node.js runtime untuk mendeteksi *crawler* media sosial (*WhatsApp, Facebook, Twitter/X, Discord, LinkedIn*) dan mesin pencari (*Googlebot, Bingbot*).
- Injeksi tag OpenGraph (`og:title`, `og:image`, `og:description`) secara dinamis langsung dari Firestore REST API.
- Generator sitemap otomatis (`/sitemap.xml`) yang dieksekusi setiap proses build.

---

## 🛠️ Teknologi & Arsitektur

```
┌───────────────────────────────────────────────────────────────┐
│                      Client Layer (SPA)                       │
│     React 19 • TypeScript • Tailwind CSS v4 • Recharts        │
│          React Router v7 • Motion • Lucide React              │
└───────────────────────────────┬───────────────────────────────┘
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
┌───────────────────────────────┐       ┌───────────────────────────────┐
│       Node.js Middleware      │       │     Express Backend Proxy     │
│   Crawler & Bot Detection     │       │  TMDB Proxy • Healthcheck     │
│   Dynamic OpenGraph Injection │       │  Static SPA Asset Serving     │
└───────────────┬───────────────┘       └───────────────┬───────────────┘
                │                                       │
                └───────────────────┬───────────────────┘
                                    ▼
┌───────────────────────────────────────────────────────────────┐
│                   Firebase Cloud Services                     │
│  Firestore (NoSQL DB) • Firebase Auth • Firebase Storage      │
└───────────────────────────────────────────────────────────────┘
```

| Komponen | Teknologi | Keterangan |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 6 | Arsitektur SPA cepat dengan HMR dan optimalisasi bundle |
| **Styling** | Tailwind CSS v4 | Styling modern utility-first dengan dark theme premium |
| **Charts** | Recharts 3.x | Visualisasi analitik retensi, DAU, dan demografi role |
| **State / DB** | Firebase Firestore (v12 SDK) | Penyimpanan dokumen realtime dengan offline persistence |
| **Autentikasi** | Firebase Authentication | Login email & Google OAuth |
| **Penyimpanan** | Firebase Storage | Media upload avatar profil aman berorientasi user-ID |
| **Backend / API** | Express 5, Node.js | Reverse proxy TMDB dan server berkas produksi |
| **Middleware** | Vercel Edge / Node.js Middleware | Transformasi HTML responsif untuk bot & crawler media sosial |

---

## 👥 Struktur Peran Akun (RBAC)

Platform menggunakan kontrol akses berbasis peran (*Role-Based Access Control*) yang divalidasi di sisi klien dan aturan keamanan Firestore:

1. **🧑 Warga Sotoy (`warga_sotoy`)**: Anggota umum komunitas. Dapat memberikan rating, ulasan, membuat postingan Buzz, berkomentar, dan mengedit profil sendiri.
2. **🏆 Si Paling Sotoy (`si_paling_sotoy`)**: Kritikus film terverifikasi melalui jalur pengajuan kurasi. Memiliki lencana khusus dan ulasannya dihitung pada *Skor Kritikus*.
3. **✍️ Penulis Sotoy (`penulis_sotoy`)**: Jurnalis/editor media. Memiliki akses ke antarmuka CMS untuk menulis dan mengelola draf artikel editorial.
4. **👑 Admin Utama (`admin`)**: Akses menyeluruh ke Panel Admin, verifikasi kritikus, moderasi konten, manajemen pengguna, inspeksi berkas, dan grafik analitik.

---

## 📁 Struktur Direktori Proyek

```text
sotoy-film/
├── api/                        # Serverless function handlers (e.g. TMDB API proxy)
│   └── tmdb.ts
├── public/                     # Aset statis publik, logo, icon, dan robots.txt
├── scripts/                    # Skrip otomasi & utilitas
│   ├── generate-sitemap.ts     # Pembangkit sitemap.xml otomatis
│   └── test-middleware.ts      # Suite pengujian crawler middleware
├── src/
│   ├── components/             # Komponen UI modular
│   │   ├── Admin/              # Dasbor Admin (Analytics, Users, Moderasi, Audit, dll.)
│   │   ├── Articles/           # Komponen daftar dan pembaca artikel
│   │   ├── Auth/               # Modal login & registrasi
│   │   ├── Buzz/               # Forum diskusi buzz komunitas
│   │   ├── CMS/                # Editor artikel & analitik editorial
│   │   ├── Films/              # Halaman detail film, ulasan, & trailer modal
│   │   ├── Layout/             # Navbar, Footer, Sidebar, BottomNav
│   │   └── Profile/            # Halaman profil user & pengaturan
│   ├── context/                # AppContext global & Firebase state bridge
│   ├── lib/
│   │   ├── edge/               # Logika middleware bot detection & OpenGraph injection
│   │   └── firebase.ts         # Inisialisasi Firebase Web SDK
│   ├── types/                  # Definisi antarmuka TypeScript
│   ├── utils/                  # Format tanggal, role style, slug generator
│   ├── App.tsx                 # Routing & konfigurasi halaman
│   ├── main.tsx                # Entry point React
│   └── index.css               # Global Tailwind CSS v4 imports
├── firestore.rules             # Aturan keamanan database Firestore
├── storage.rules               # Aturan keamanan penyimpanan berkas
├── firebase-blueprint.json     # Blueprint skema entitas database
├── middleware.ts               # Root middleware untuk SSR meta injection
├── server.ts                   # Express server entry point untuk produksi
├── vercel.json                 # Konfigurasi deployment Vercel
├── vite.config.ts              # Konfigurasi bundler Vite
└── package.json
```

---

## 🚀 Panduan Instalasi & Menjalankan Lokal

### Prasyarat
- **Node.js**: Versi `20.x` atau lebih baru
- **NPM** atau **Bun**

### 1. Kloning Repositori
```bash
git clone https://github.com/username/sotoy-film.git
cd sotoy-film
```

### 2. Instal Dependensi
```bash
npm install
```

### 3. Konfigurasi Lingkungan (.env)
Salin contoh environment file dan sesuaikan kredensial:
```bash
cp .env.example .env
```

Isi variabel `.env`:
```env
# TMDB API Read Access Key (Opsional untuk impor metadata katalog film)
TMDB_API_KEY=your_tmdb_api_key_here
```

> **Catatan:** Konfigurasi Firebase client telah terhubung secara bawaan di `src/lib/firebase.ts` menggunakan konfigurasi proyek aktif.

### 4. Jalankan Server Pengembangan
```bash
npm run dev
```
Aplikasi akan berjalan di `http://localhost:3000`.

---

## 📜 Daftar Skrip (NPM Scripts)

| Perintah | Deskripsi |
| :--- | :--- |
| `npm run dev` | Menjalankan Express dev server dengan Vite middleware terintegrasi (`port 3000`) |
| `npm run build` | Membuat sitemap, membangun aset client Vite, dan membundel `server.ts` ke `dist/server.cjs` |
| `npm start` | Menjalankan server Express pada mode produksi (`NODE_ENV=production`) |
| `npm run lint` | Menjalankan validasi type checking TypeScript tanpa kompilasi berkas (`tsc --noEmit`) |
| `npm run test:middleware` | Menjalankan suite pengujian kompatibilitas bot crawler dan meta injection |
| `npm run generate:sitemap` | Menghasilkan berkas `public/sitemap.xml` dinamis dari koleksi rute |

---

## 🔒 Skema Database & Keamanan Firebase

Aturan keamanan telah dirancang dengan prinsip hak akses minimal (*least privilege*):

- **Firestore (`firestore.rules`):**
  - Koleksi publik (`films`, `articles`, `buzz`, `ratings`) dapat dibaca oleh publik (*read: if true*).
  - Penulisan hanya diizinkan untuk pengguna terautentikasi sesuai kepemilikan dokumen (`request.auth.uid == resource.data.userId`).
  - Dokumen administratif dan laporan moderasi (`moderation_reports`, `audit_logs`) hanya dapat dimanipulasi oleh akun dengan role `admin`.
- **Firebase Storage (`storage.rules`):**
  - Berkas avatar profil tersimpan pada path `profile_photos/{userId}/{fileName}` dengan validasi ukuran (< 5MB) dan tipe konten gambar (*image/*).
  - Catch-all write dinonaktifkan (`allow write: if false;`) untuk mencegah unggahan berkas tidak berizin.

---

## 🤖 Middleware & SEO Meta-Injection

File `middleware.ts` berjalan pada Node.js runtime untuk memastikan crawler media sosial membaca pratinjau konten dinamis secara akurat tanpa memerlukan SSR penuh:

- Mengintersepsi permintaan dari agen: `WhatsApp`, `Twitterbot`, `facebookexternalhit`, `LinkedInBot`, `Googlebot`, `TelegramBot`, `Discordbot`, dll.
- Mengambil judul, gambar sampul, dan sinopsis langsung dari Firestore REST API untuk rute `/article/:slug` dan `/film/:id`.
- Menyuntikkan tag `<meta property="og:title">`, `<meta property="og:image">`, dan `<meta name="twitter:card">` ke dalam dokumen HTML mentah sebelum dikirim ke crawler.

---

## 🚢 Panduan Deployment

### Opsi A: Deployment ke Vercel (Rekomendasi)

1. Hubungkan repositori GitHub Anda ke **Vercel Dashboard**.
2. Vercel akan mendeteksi konfigurasi `vercel.json` secara otomatis.
3. Tambahkan environment variable jika diperlukan (`TMDB_API_KEY`).
4. Klik **Deploy**. File `middleware.ts` dan `api/tmdb.ts` akan berjalan otomatis sebagai Serverless Functions.

### Opsi B: Deployment Server Sendiri (Docker / Cloud Run / VPS)

1. Jalankan kompilasi produksi:
   ```bash
   npm run build
   ```
2. Jalankan server Node.js:
   ```bash
   npm start
   ```
3. Server Express akan melayani berkas statis `dist/` dan API proxy pada port `3000`.

### Opsi C: Deploy Firebase Rules
Jika Anda mengubah berkas aturan keamanan, deploy langsung menggunakan Firebase CLI:
```bash
firebase deploy --only firestore:rules,storage
```

---

## 📄 Lisensi

Didistribusikan di bawah Lisensi **MIT**. Hak Cipta © 2026 **Sotoy Film**. Seluruh aset dan merek dagang film adalah milik masing-masing pemegang hak cipta.
