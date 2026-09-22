/**
 * Metadata Generation Utility for Dynamic Route SEO
 * 
 * Maps application URL paths and pattern routes to optimized SEO titles,
 * meta descriptions, search keywords, and Schema.org entity types.
 */

export interface RouteMetadata {
  title: string;
  description: string;
  keywords?: string[];
  type?: 'website' | 'article' | 'video.movie';
  image?: string;
  noindex?: boolean;
}

const DEFAULT_METADATA: RouteMetadata = {
  title: 'Sotoy Film - Ulasan & Kritik Film Terpercaya',
  description:
    'Platform komunitas & media pop-culture film, series, anime, cinema gear, dan film studies dengan ulasan Skor Sotoy dan diskusi buzz.',
  keywords: [
    'ulasan film',
    'kritik film',
    'skor sotoy',
    'film indonesia',
    'rekomendasi series',
    'anime',
    'cinema gear',
    'pop culture',
  ],
  type: 'website',
};

/**
 * Static route mappings for fast 1:1 lookup
 */
export const STATIC_ROUTE_METADATA: Record<string, RouteMetadata> = {
  '/': {
    title: 'Sotoy Film - Ulasan & Kritik Film Terpercaya',
    description:
      'Platform komunitas & media pop-culture film, series, anime, cinema gear, dan film studies dengan ulasan Skor Sotoy dan diskusi buzz.',
    keywords: ['ulasan film', 'skor sotoy', 'film indonesia', 'rekomendasi film', 'sinema'],
    type: 'website',
  },
  '/film-database': {
    title: 'Database Film & Series Terlengkap',
    description:
      'Jelajahi ribuan ulasan, skor sotoy, sinopsis, dan kurasi film terbaik dunia dari Hollywood hingga sinema Indonesia.',
    keywords: ['database film', 'daftar film bioskop', 'rating film', 'skor sotoy', 'series terbaik'],
    type: 'website',
  },
  '/rekomendasi-film': {
    title: 'Rekomendasi Film & Serial Pilihan Kurator',
    description:
      'Daftar rekomendasi film dan serial pilihan kurator dengan rating Skor Sotoy tertinggi dan review mendalam.',
    keywords: ['rekomendasi film', 'film bagus', 'film rating tinggi', 'film trending', 'series wajib tonton'],
    type: 'website',
  },
  '/film-recommendations': {
    title: 'Rekomendasi Film & Serial Pilihan Kurator',
    description:
      'Daftar rekomendasi film dan serial pilihan kurator dengan rating Skor Sotoy tertinggi dan review mendalam.',
    type: 'website',
  },
  '/komunitas': {
    title: 'Komunitas Film & Diskusi Buzz Sinema',
    description:
      'Ruang diskusi santai, debat seru, dan obrolan sinema bersama para penikmat film dan kurator Sotoy Film.',
    keywords: ['komunitas film', 'forum film indonesia', 'diskusi film', 'buzz pop culture'],
    type: 'website',
  },
  '/community-feed': {
    title: 'Komunitas Film & Diskusi Buzz Sinema',
    description:
      'Ruang diskusi santai, debat seru, dan obrolan sinema bersama para penikmat film dan kurator Sotoy Film.',
    type: 'website',
  },
  '/kategori/movies': {
    title: 'Kategori Film & Sinema Dunia',
    description:
      'Berita terbaru, ulasan mendalam, dan daftar rekomendasi film layar lebar terpopuler dari berbagai genre.',
    keywords: ['film bioskop', 'sinema hollywood', 'film indonesia', 'ulasan movie'],
    type: 'website',
  },
  '/kategori/series': {
    title: 'Serial TV & Web Series Populer',
    description:
      'Ulasan episode, breakdown teori cerita, dan rekomendasi serial TV terbaik dari platform streaming favorit.',
    keywords: ['series terbaik', 'netflix series', 'serial tv', 'drama series'],
    type: 'website',
  },
  '/kategori/anime': {
    title: 'Anime Populer & Rekomendasi Musiman',
    description:
      'Berita anime terbaru, review film animasi Jepang, dan daftar tontonan wajib bagi para pecinta anime.',
    keywords: ['anime terbaru', 'rekomendasi anime', 'film anime', 'wibu indonesia'],
    type: 'website',
  },
  '/kategori/cinema-gear': {
    title: 'Cinema Gear & Review Perlengkapan Kamera',
    description:
      'Ulasan kamera sinema, lensa, lighting, audio lapangan, dan perlengkapan produksi film profesional.',
    keywords: ['kamera sinema', 'lensa kamera', 'cinema gear', 'peralatan shooting'],
    type: 'website',
  },
  '/kategori/film-studies': {
    title: 'Film Studies & Analisis Sinematografi',
    description:
      'Eksplorasi estetika sinema, analisis penyutradaraan, struktur naskah, dan studi film mendalam.',
    keywords: ['film studies', 'analisis film', 'sinematografi', 'teori film', 'penyutradaraan'],
    type: 'website',
  },
  '/tulis-artikel': {
    title: 'Tulis Artikel & Publikasikan Ulasan Film',
    description:
      'Bagikan perspektif, analisis visual, dan ulasan film terbaikmu kepada ribuan pecinta sinema di Sotoy Film.',
    keywords: ['tulis artikel film', 'kontributor film', 'review film'],
    type: 'website',
  },
  '/write-article': {
    title: 'Tulis Artikel & Publikasikan Ulasan Film',
    description:
      'Bagikan perspektif, analisis visual, dan ulasan film terbaikmu kepada ribuan pecinta sinema di Sotoy Film.',
    type: 'website',
  },
  '/gabung-kritikus': {
    title: 'Program Kurator Kritikus Film Terverifikasi',
    description:
      'Daftar menjadi kurator dan kritikus resmi Sotoy Film untuk memberikan penilaian otoritatif Skor Sotoy.',
    keywords: ['kritikus film', 'program kurator', 'daftar kritikus', 'sotoy film critic'],
    type: 'website',
  },
  '/critic-submission': {
    title: 'Program Kurator Kritikus Film Terverifikasi',
    description:
      'Daftar menjadi kurator dan kritikus resmi Sotoy Film untuk memberikan penilaian otoritatif Skor Sotoy.',
    type: 'website',
  },
  '/kriteria-kritikus': {
    title: 'Kriteria & Panduan Penilaian Kurator Kritikus',
    description:
      'Standar penilaian, etika kurasi, transparansi, dan metodologi pembobotan Skor Sotoy.',
    keywords: ['kriteria kritikus', 'metodologi skor sotoy', 'panduan kurator'],
    type: 'website',
  },
  '/critic-criteria': {
    title: 'Kriteria & Panduan Penilaian Kurator Kritikus',
    description:
      'Standar penilaian, etika kurasi, transparansi, dan metodologi pembobotan Skor Sotoy.',
    type: 'website',
  },
  '/search': {
    title: 'Pencarian Film, Serial & Artikel',
    description:
      'Temukan film, review, artikel editorial, dan postingan komunitas dengan cepat di Sotoy Film.',
    keywords: ['cari film', 'search film', 'temukan ulasan'],
    type: 'website',
  },
  '/tentang-kami': {
    title: 'Tentang Sotoy Film - Media Pop Culture & Sinema',
    description:
      'Mengenal visi, misi, dan tim di balik media pop-culture dan komunitas film terkemuka Sotoy Film.',
    type: 'website',
  },
  '/about-us': {
    title: 'Tentang Sotoy Film - Media Pop Culture & Sinema',
    description:
      'Mengenal visi, misi, dan tim di balik media pop-culture dan komunitas film terkemuka Sotoy Film.',
    type: 'website',
  },
  '/kebijakan-privasi': {
    title: 'Kebijakan Privasi - Sotoy Film',
    description:
      'Komitmen kami dalam melindungi privasi, data pribadi, dan keamanan akun pengunjung Sotoy Film.',
    type: 'website',
  },
  '/privacy-policy': {
    title: 'Kebijakan Privasi - Sotoy Film',
    description:
      'Komitmen kami dalam melindungi privasi, data pribadi, dan keamanan akun pengunjung Sotoy Film.',
    type: 'website',
  },
  '/syarat-ketentuan': {
    title: 'Syarat & Ketentuan Layanan - Sotoy Film',
    description:
      'Ketentuan layanan, hak cipta konten editorial, dan panduan etika partisipasi komunitas Sotoy Film.',
    type: 'website',
  },
  '/terms-conditions': {
    title: 'Syarat & Ketentuan Layanan - Sotoy Film',
    description:
      'Ketentuan layanan, hak cipta konten editorial, dan panduan etika partisipasi komunitas Sotoy Film.',
    type: 'website',
  },
  '/kontak-bisnis': {
    title: 'Kontak & Kemitraan Bisnis - Sotoy Film',
    description:
      'Hubungi tim media Sotoy Film untuk kerjasama editorial, liputan festival film, sponsorship, dan periklanan.',
    type: 'website',
  },
  '/business-inquiries': {
    title: 'Kontak & Kemitraan Bisnis - Sotoy Film',
    description:
      'Hubungi tim media Sotoy Film untuk kerjasama editorial, liputan festival film, sponsorship, dan periklanan.',
    type: 'website',
  },
  '/settings': {
    title: 'Pengaturan Akun & Preferensi',
    description: 'Kelola preferensi akun, privasi profil, dan pengaturan notifikasi ulasan.',
    noindex: true,
  },
  '/onboarding': {
    title: 'Selamat Datang di Sotoy Film',
    description: 'Pilih preferensi genre sinema dan mulai petualangan pop-culture kamu di Sotoy Film.',
    noindex: true,
  },
};

/**
 * Converts a URL slug into clean Title Case for fallback meta generation
 */
function formatSlugToTitle(slug: string): string {
  try {
    const decoded = decodeURIComponent(slug);
    return decoded
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())
      .trim();
  } catch {
    return slug;
  }
}

/**
 * Generates dynamic SEO metadata based on the current path,
 * with support for exact routes, category hierarchies, and entity routes (/film/:slug, /artikel/:slug).
 *
 * @param pathname Current route pathname (e.g. window.location.pathname or React Router location.pathname)
 * @param overrides Optional partial metadata overrides
 */
export function generateMetadata(
  pathname: string = '/',
  overrides?: Partial<RouteMetadata>
): RouteMetadata {
  const cleanPath = pathname.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';

  // 1. Direct 1:1 match in static dictionary
  if (STATIC_ROUTE_METADATA[cleanPath]) {
    return {
      ...STATIC_ROUTE_METADATA[cleanPath],
      ...overrides,
    };
  }

  // 2. Pattern Matching for Entity / Dynamic Routes

  // Film Detail route: /film/:slug
  const filmMatch = cleanPath.match(/^\/film\/([^/]+)$/i);
  if (filmMatch) {
    const rawSlug = filmMatch[1];
    const formattedTitle = formatSlugToTitle(rawSlug);
    return {
      title: `${formattedTitle} - Skor & Review Film`,
      description: `Baca sinopsis, Skor Sotoy, kurasi kritikus, dan review lengkap untuk ${formattedTitle} di Sotoy Film.`,
      keywords: [formattedTitle, 'skor sotoy', 'ulasan film', 'review film', 'sinopsis film'],
      type: 'video.movie',
      ...overrides,
    };
  }

  // Article Detail route: /artikel/:slug or /article/:slug
  const articleMatch = cleanPath.match(/^\/(?:artikel|article)\/([^/]+)$/i);
  if (articleMatch) {
    const rawSlug = articleMatch[1];
    const formattedTitle = formatSlugToTitle(rawSlug);
    return {
      title: `${formattedTitle} - Artikel & Ulasan Pop Culture`,
      description: `Baca ulasan mendalam, wawasan sinema, dan editorial pop-culture seputar ${formattedTitle} di Sotoy Film.`,
      keywords: [formattedTitle, 'artikel film', 'review sinema', 'sotoy film', 'editorial'],
      type: 'article',
      ...overrides,
    };
  }

  // Multi-tier Category routes: /kategori/:category/:subCategory? or /category/:category/:subCategory?
  const categoryMatch = cleanPath.match(/^\/(?:kategori|category)\/([^/]+)(?:\/([^/]+))?$/i);
  if (categoryMatch) {
    const cat = formatSlugToTitle(categoryMatch[1]);
    const sub = categoryMatch[2] ? formatSlugToTitle(categoryMatch[2]) : null;

    if (sub) {
      return {
        title: `${sub} (${cat}) - Kategori Sinema & Pop Culture`,
        description: `Daftar ulasan, berita, dan kurasi ${sub} dalam kategori ${cat} di Sotoy Film.`,
        keywords: [sub, cat, 'kategori film', 'ulasan sinema', 'sotoy film'],
        type: 'website',
        ...overrides,
      };
    }

    return {
      title: `${cat} - Kategori Sinema & Pop Culture`,
      description: `Jelajahi ulasan, rekomendasi tontonan, dan berita terbaru seputar ${cat} di Sotoy Film.`,
      keywords: [cat, 'kategori film', 'ulasan sinema', 'sotoy film'],
      type: 'website',
      ...overrides,
    };
  }

  // Community Buzz Post: /buzz/:id
  if (cleanPath.startsWith('/buzz/')) {
    return {
      title: 'Diskusi Buzz Komunitas Film',
      description: 'Ikuti obrolan seru, tanggapan penonton, dan debat sinema komunitas di Sotoy Film.',
      keywords: ['diskusi film', 'buzz sinema', 'komunitas film'],
      type: 'article',
      ...overrides,
    };
  }

  // User Profile: /user/:id or /profil or /profile
  if (cleanPath.startsWith('/user/') || cleanPath === '/profil' || cleanPath === '/profile') {
    return {
      title: 'Profil Warga Sotoy - Sotoy Film',
      description: 'Lihat daftar tontonan watchlist, ulasan film, dan kontribusi aktivitas komunitas pengguna di Sotoy Film.',
      type: 'website',
      ...overrides,
    };
  }

  // Default fallback
  return {
    ...DEFAULT_METADATA,
    ...overrides,
  };
}
