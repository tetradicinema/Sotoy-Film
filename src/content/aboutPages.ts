/**
 * Shared editorial content for the About and Editorial Guidelines pages.
 *
 * The same module feeds both the React pages and the crawler-only HTML that
 * the edge middleware renders inside #root, so the visible page and the bot
 * response can never drift apart. Keep this file free of React/DOM imports.
 *
 * The copy here is the canonical editorial text: do not paraphrase it, because
 * the React pages, the bot body, and the crawler tests all depend on it.
 */

export const SITE_PUBLIC_EMAIL = 'admin.sotoyfilm@gmail.com';

export interface ContentLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface ContentSection {
  id: string;
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  links?: ContentLink[];
  /** Render the shared redaksi list (name + role + profile link). */
  showTeam?: boolean;
}

export interface StaticPageContent {
  h1: string;
  intro: string[];
  sections: ContentSection[];
  footerNote?: string;
}

export interface TeamMember {
  name: string;
  role: string;
  userId: string;
}

export const SITE_SOCIAL_LINKS: ContentLink[] = [
  {
    label: 'Instagram @sotoyfilm.id',
    href: 'https://www.instagram.com/sotoyfilm.id',
    external: true,
  },
  {
    label: 'TikTok @sotoyfilmid',
    href: 'https://www.tiktok.com/@sotoyfilmid',
    external: true,
  },
];

/** Redaksi listed on the About page, in display order. No private emails. */
export const ABOUT_TEAM: TeamMember[] = [
  {
    name: 'Tony Tofani',
    role: 'Founder & Penulis Film',
    userId: 'CsG2CY2TaIZmG7yuPfzAxmRYrlY2',
  },
  {
    name: 'Arga Wicaksana',
    role: 'Admin & Penulis Film Studies',
    userId: 'QkNGf1ZfhsMyUEk90a6Iz8ZplZS2',
  },
  {
    name: 'Anto Susanto',
    role: 'Penulis Animasi',
    userId: '4kN1JktShRNalIa7mY5f17NcjhF2',
  },
  {
    name: 'Nadia Prameswari',
    role: 'Penulis Series',
    userId: 'CFYzpNdVpFPc3tiqVR7o11Zx2he2',
  },
  {
    name: 'Dimas Mahendra',
    role: 'Penulis Cinema Gear',
    userId: 'T3SXkLrZRphyJiM2Ss92yReY1Dz1',
  },
];

export const ABOUT_PAGE_CONTENT: StaticPageContent = {
  h1: 'Media film dan pop-culture dari Indonesia',
  intro: [
    'Sotoy Film membahas film, serial, animasi, anime, dan peralatan sinema untuk penonton Indonesia. Kami menulis berita yang dicek ke sumbernya, review dengan skor yang bisa dipertanggungjawabkan, dan tulisan Film Studies tentang cara film dibuat.',
  ],
  sections: [
    {
      id: 'siapa-di-balik-sotoy-film',
      heading: 'Siapa di balik Sotoy Film',
      paragraphs: [
        'Sotoy Film didirikan oleh Tony Tofani, film director dan producer. Latar belakangnya di lapangan, dari kru produksi, gaffer, dan Director of Photography sampai sutradara. Pengalaman itu memengaruhi cara kami menulis: film dibahas dari sisi orang yang membuatnya, bukan hanya yang menontonnya.',
      ],
    },
    {
      id: 'kenapa-namanya-sotoy-film',
      heading: 'Kenapa namanya Sotoy Film',
      paragraphs: [
        'Di Indonesia, "sotoy" artinya sok tahu. Kami memakainya dengan sengaja: setiap penonton punya pendapat soal film yang ia tonton, dan pendapat itu layak didengar. Bedanya, di sini pendapat harus disertai alasan.',
      ],
    },
    {
      id: 'apa-yang-kami-tulis',
      heading: 'Apa yang kami tulis',
      paragraphs: [
        'Berita (rilis, casting, trailer, box office, festival), review (tontonan dan gear), Film Studies (producing, directing, cinematography, lighting, post-production), dan opini yang diberi label. Cara kerjanya ada di Pedoman Redaksi.',
      ],
      links: [{ label: 'Pedoman Redaksi', href: '/pedoman-redaksi' }],
    },
    {
      id: 'tim-redaksi',
      heading: 'Tim redaksi',
      showTeam: true,
    },
    {
      id: 'komunitas',
      heading: 'Komunitas',
      paragraphs: [
        'Kamu bisa memberi Skor Sotoy, menulis buzz, dan menyimpan watchlist. Perannya: Warga Sotoy, Si Paling Sotoy (kritikus terverifikasi), Penulis, dan Admin & Moderasi.',
      ],
    },
    {
      id: 'hubungi-kami',
      heading: 'Hubungi kami',
      paragraphs: [
        `Email resmi Sotoy Film adalah ${SITE_PUBLIC_EMAIL}.`,
      ],
      links: [
        { label: 'Kerja sama', href: '/kontak-bisnis' },
        ...SITE_SOCIAL_LINKS,
      ],
    },
  ],
};

export const EDITORIAL_GUIDELINES_CONTENT: StaticPageContent = {
  h1: 'Pedoman Redaksi',
  intro: [],
  sections: [
    {
      id: 'berita',
      heading: 'Berita',
      bullets: [
        'Kami mengutamakan sumber primer: studio, platform, penyelenggara festival, dan pernyataan langsung.',
        'Fakta kunci (tanggal rilis, pemeran, angka, pemenang) dicek ke minimal dua sumber. Klaim dari satu sumber kami tandai.',
        'Kabar terkonfirmasi, belum dikonfirmasi, dan rumor dipisah dan diberi label.',
        'Kami menulis dengan kata sendiri dan menautkan sumbernya.',
        'Tanggal terbit selalu tampil. Pembaruan substansial diberi catatan "Diperbarui" beserta tanggalnya.',
      ],
    },
    {
      id: 'review',
      heading: 'Review',
      bullets: [
        'Review adalah penilaian penulisnya. Kami hanya mengulas apa yang benar-benar ditonton atau dipakai penulis, dan menyebut kondisinya.',
        'Pembahasan yang membocorkan cerita ditaruh di akhir, dengan peringatan.',
        'Gear yang belum kami uji ditulis "belum kami uji".',
        'Skor Sotoy 1 sampai 10: 1-2 Bencana Sinematik, 3-4 Kurang Matang, 5-6 Solid & Layak Tonton, 7-8 Sangat Direkomendasikan, 9-10 Mahakarya Abadi. Sponsor tidak memengaruhi skor.',
      ],
    },
    {
      id: 'film-studies',
      heading: 'Film Studies',
      paragraphs: [
        'Penjelasan teknis diverifikasi dari praktisi atau dokumentasi resmi. Praktik berbeda antar produksi, dan kami menyebutnya. Catatan keselamatan disertakan bila relevan.',
      ],
    },
    {
      id: 'opini',
      heading: 'Opini',
      paragraphs: ['Opini diberi label, dan fakta dipisahkan dari pendapat.'],
    },
    {
      id: 'koreksi',
      heading: 'Koreksi',
      paragraphs: [
        'Temukan kesalahan? Kirim ke admin.sotoyfilm@gmail.com dengan subjek "Koreksi". Kesalahan substansial diperbaiki dan dicatat dengan tanggal.',
      ],
    },
    {
      id: 'sponsor-afiliasi-dan-iklan',
      heading: 'Sponsor, afiliasi, dan iklan',
      bullets: [
        'Konten berbayar diberi label "Sponsor". Sponsor tidak memengaruhi isi redaksi maupun skor.',
        'Tautan afiliasi, bila ada, ditandai dan diungkapkan.',
        'Unit pinjaman atau produk dari pihak lain disebutkan di artikelnya.',
        'Saat ini Sotoy Film belum menayangkan iklan. Bila nanti ada, iklan dipisahkan dari konten redaksi dan dicatat di halaman ini.',
      ],
    },
  ],
  footerNote: 'Terakhir diperbarui: November 2026.',
};
