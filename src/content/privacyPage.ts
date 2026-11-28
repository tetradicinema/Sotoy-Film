/**
 * Shared content for the Privacy Policy page.
 *
 * Feeds both the React page and the crawler-only body rendered by the edge
 * middleware. The copy is canonical: keep every sentence verbatim. Inline
 * formatting is stored as structured runs (never raw HTML) so both renderers
 * can escape text and emit the same <strong>/<em>/<code>/<a> markup.
 */

export interface TextRun {
  text: string;
  strong?: boolean;
  em?: boolean;
  code?: boolean;
  href?: string;
  external?: boolean;
}

export type RichText = Array<string | TextRun>;

export const strong = (text: string): TextRun => ({ text, strong: true });
export const em = (text: string): TextRun => ({ text, em: true });
export const code = (text: string): TextRun => ({ text, code: true });
export const link = (text: string, href: string, external = false): TextRun => ({
  text,
  href,
  external,
});

export interface PrivacySection {
  id: string;
  heading: string;
  paragraphs: RichText[];
  bullets?: RichText[];
  contactBox?: RichText[];
}

export interface PrivacyPageContent {
  title: string;
  badge: string;
  effectiveDate: string;
  version: string;
  summary: {
    heading: string;
    paragraphs: RichText[];
    highlights: string[];
  };
  sections: PrivacySection[];
  backHomeLabel: string;
  termsLabel: string;
}

export const PRIVACY_POLICY_CONTENT: PrivacyPageContent = {
  title: 'Kebijakan Privasi (Privacy Policy)',
  badge: 'Dokumen Resmi & Transparansi',
  effectiveDate: 'Berlaku efektif sejak: 28 November 2026',
  version: 'Versi Dokumen: 2.5.0',
  summary: {
    heading: 'Ringkasan Komitmen Privasi Kami',
    paragraphs: [
      [
        'Sotoy Film menghargai privasi setiap pengguna. Kami ',
        strong('tidak pernah menjual data pribadi Anda'),
        ' kepada broker data atau pihak ketiga. Data yang kami simpan murni ditujukan untuk menghitung agregasi Skor Sotoy yang adil, menyimpan Watchlist film Anda, dan menyajikan feed sosial yang relevan.',
      ],
    ],
    highlights: [
      'Tanpa Pelacakan Lokasi Latar Belakang',
      'Opsi Ekspor JSON Data Kapan Saja',
      'Kontrol Penuh Profil Publik/Privat',
    ],
  },
  sections: [
    {
      id: 'informasi-yang-kami-kumpulkan',
      heading: '1. Informasi yang Kami Kumpulkan',
      paragraphs: [
        ['Saat Anda menggunakan platform Sotoy Film, kami dapat mengumpulkan jenis informasi berikut:'],
      ],
      bullets: [
        [
          strong('Data Profil Pengguna:'),
          ' Nama tampilan, handle unik (misalnya ',
          em('@wargasotoy'),
          '), tautan avatar, bio profil, dan peran akun (Warga, Si Paling Sotoy, Penulis, atau Admin).',
        ],
        [
          strong('Aktivitas Sinematik & Konten Buatan Pengguna:'),
          ' Ulasan teks, angka rating Skor Sotoy (1.0 - 10.0), postingan Buzz kilat, komentar pada artikel, daftar film di Watchlist, dan penanda suka (likes).',
        ],
        [
          strong('Preferensi Akun:'),
          ' Genre film favorit, preferensi pemutaran cuplikan (trailer), dan pengaturan privasi visibilitas profil yang Anda konfigurasi di menu Pengaturan.',
        ],
        [
          strong('Data Teknis Perangkat:'),
          ' Alamat IP tersamar, tipe browser, resolusi layar, dan metadata sesi untuk keamanan pencegahan bot review-bombing.',
        ],
        [
          strong('Data Analitik Kunjungan:'),
          ' Kami memakai Google Analytics 4 (Google LLC) untuk memahami halaman mana yang dibaca dan bagaimana pengunjung menemukan Sotoy Film. Layanan ini memakai cookie atau pengenal serupa dan mencatat data seperti halaman yang dibuka, jenis perangkat dan browser, serta perkiraan lokasi tingkat kota. Halaman pengelolaan (admin, penulis, dan editor artikel) tidak dilacak. Anda dapat menolaknya lewat pengaturan cookie di browser atau dengan add-on resmi ',
          em('Google Analytics Opt-out Browser Add-on'),
          '.',
        ],
        [
          strong('Layanan Pihak Ketiga:'),
          ' Autentikasi akun dan basis data berjalan di Firebase (Google). Data dan poster film berasal dari TMDB, dan font dimuat dari Google Fonts, sehingga browser Anda terhubung langsung ke server mereka saat halaman dibuka. Masing-masing layanan menerapkan kebijakan privasinya sendiri.',
        ],
        [
          strong('Analitik Tambahan:'),
          ' Kami juga memakai Vercel Analytics dan Vercel Speed Insights untuk mengukur jumlah kunjungan dan kecepatan halaman secara agregat.',
        ],
        [
          strong('Video Tersemat:'),
          ' Trailer dan video dari YouTube dimuat dalam mode privasi-ditingkatkan (youtube-nocookie.com). Saat Anda memutarnya, YouTube dapat menerima data dari browser Anda sesuai kebijakannya.',
        ],
      ],
    },
    {
      id: 'bagaimana-kami-menggunakan-informasi-anda',
      heading: '2. Bagaimana Kami Menggunakan Informasi Anda',
      paragraphs: [['Kami menggunakan data yang dikumpulkan semata-mata untuk:']],
      bullets: [
        ['Menghitung rata-rata Skor Sotoy Warga dan membedakannya dari Skor Kurator Resmi (*Critics Score*).'],
        ['Menyimpan dan menyinkronkan daftar film tontonan (*Watchlist*) Anda di berbagai sesi browser.'],
        [
          'Mempersonalisasi rekomendasi film pada fitur ',
          em('Rekomendasi Film Mood'),
          ' berdasarkan genre yang Anda minati.',
        ],
        ['Mencegah kecurangan peringkat sinema (*anti-manipulation algorithm*) agar hasil voting film tetap jujur dan organik.'],
        ['Menganalisis pola kunjungan secara agregat, misalnya halaman terpopuler, untuk meningkatkan konten dan performa situs.'],
      ],
    },
    {
      id: 'kontrol-dan-hak-privasi-anda',
      heading: '3. Kontrol dan Hak Privasi Anda',
      paragraphs: [['Setiap pengguna Sotoy Film memegang kendali penuh atas privasi akun mereka:']],
      bullets: [
        [
          strong('Profil Privat vs Publik:'),
          ' Anda dapat mengaktifkan mode Akun Privat di menu Pengaturan agar Watchlist dan riwayat ulasan hanya dapat dilihat oleh diri Anda sendiri.',
        ],
        [
          strong('Ekspor Salinan Data (JSON):'),
          ' Melalui dashboard pengaturan akun, Anda dapat mengunduh seluruh data riwayat rating, buzz, dan watchlist dalam format JSON standar.',
        ],
        [
          strong('Penghapusan Data:'),
          ' Anda berhak meminta penghapusan permanen akun beserta seluruh catatan ulasan dengan menghubungi tim perlindungan data kami.',
        ],
      ],
    },
    {
      id: 'penyimpanan-lokal-browser',
      heading: '4. Penyimpanan Lokal Browser (Local Storage & Cache)',
      paragraphs: [
        [
          'Aplikasi Sotoy Film menggunakan teknologi ',
          code('localStorage'),
          ' pada peramban web Anda untuk menyimpan status login simulasi, tema tampilan, daftar tontonan offline cepat, dan draf tulisan artikel. Anda dapat membersihkan data ini kapan saja melalui pengaturan cache browser Anda.',
        ],
      ],
    },
    {
      id: 'cookie-dan-pilihan-anda',
      heading: '5. Cookie dan Pilihan Anda',
      paragraphs: [
        [
          'Cookie dan pengenal serupa dipakai untuk menjalankan situs (login, tema), mengukur kunjungan (Google Analytics), dan, bila nanti ada, menayangkan iklan. Anda dapat menghapus atau memblokir cookie lewat pengaturan browser, atau memakai Google Analytics Opt-out Browser Add-on. Sebagian fitur mungkin tidak berfungsi tanpa cookie esensial.',
        ],
      ],
    },
    {
      id: 'iklan',
      heading: '6. Iklan',
      paragraphs: [
        [
          'Saat ini Sotoy Film belum menayangkan iklan. Bila kami menayangkan iklan lewat Google AdSense, Google dan mitra iklannya dapat memakai cookie untuk menampilkan iklan berdasarkan kunjungan Anda ke situs ini dan situs lain. Anda dapat mengelola atau menonaktifkan iklan yang dipersonalisasi di ',
          link('adssettings.google.com', 'https://adssettings.google.com', true),
          '. Kami akan memperbarui halaman ini sebelum iklan tayang.',
        ],
      ],
    },
    {
      id: 'afiliasi-dan-konten-sponsor',
      heading: '7. Afiliasi dan Konten Sponsor',
      paragraphs: [
        [
          'Sebagian tautan dapat berupa tautan afiliasi: bila Anda membeli lewat tautan itu, kami dapat menerima komisi tanpa biaya tambahan bagi Anda, dan mitra dapat memakai cookie untuk mencatat pembelian. Tautan afiliasi dan konten berbayar selalu diberi tanda (lihat ',
          link('Pedoman Redaksi', '/pedoman-redaksi'),
          ').',
        ],
      ],
    },
    {
      id: 'penyimpanan-dan-transfer-data',
      heading: '8. Penyimpanan dan Transfer Data',
      paragraphs: [
        [
          'Layanan yang kami pakai (Firebase/Google, Vercel, Google Analytics) dapat memproses data di server di luar Indonesia. Data akun disimpan selama akun aktif. Setelah Anda meminta penghapusan akun, data akun dan konten Anda dihapus dalam waktu paling lama 30 hari, kecuali data yang wajib kami simpan menurut hukum.',
        ],
      ],
    },
    {
      id: 'anak-anak',
      heading: '9. Anak-anak',
      paragraphs: [
        [
          'Sotoy Film tidak ditujukan bagi anak di bawah 13 tahun, dan kami tidak sengaja mengumpulkan data pribadi mereka. Bila Anda mengetahui anak di bawah usia itu memiliki akun, hubungi kami di admin.sotoyfilm@gmail.com agar akun tersebut kami hapus.',
        ],
      ],
    },
    {
      id: 'perubahan-kebijakan',
      heading: '10. Perubahan Kebijakan',
      paragraphs: [
        ['Bila ada perubahan material, kami memperbarui tanggal di atas dan mencatatnya di halaman ini.'],
      ],
    },
    {
      id: 'hubungi-petugas-perlindungan-data',
      heading: '11. Hubungi Petugas Perlindungan Data',
      paragraphs: [
        [
          'Apabila Anda memiliki pertanyaan, keberatan, atau ingin meminta penghapusan data seputar Kebijakan Privasi ini, silakan hubungi tim Sotoy Film:',
        ],
      ],
      contactBox: [
        [strong('Email:'), ' admin.sotoyfilm@gmail.com'],
        [strong('Subjek:'), ' Permohonan Hak Privasi Pengguna Sotoy Film'],
      ],
    },
  ],
  backHomeLabel: '← Kembali ke Beranda',
  termsLabel: 'Baca Syarat & Ketentuan →',
};
