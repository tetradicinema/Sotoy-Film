import { BuzzPost, UserRating, AdBanner, User, UserRole } from '../types';

export const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80';
export const DEFAULT_POSTER = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=300&q=80';
export const DEFAULT_COVER = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80';

export const DEFAULT_FALLBACK_AUTHOR = {
  id: 'system-redaksi',
  name: 'Tim Redaksi',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  role: 'admin' as UserRole,
};

// Legacy alias maintained for backwards compatibility
export const TARGET_MIGRATION_AUTHOR = DEFAULT_FALLBACK_AUTHOR;
export const TARGET_PENULIS_AUTHOR = DEFAULT_FALLBACK_AUTHOR;

// Initial Buzz Feed (Social Threads)
export const INITIAL_BUZZ: BuzzPost[] = [];

// Sample User Ratings (Skor Sotoy Community Reviews)
export const INITIAL_RATINGS: UserRating[] = [];

// Realistic high-appeal Ad Banners
export const AD_BANNERS: AdBanner[] = [
  {
    id: 'ad-leaderboard',
    title: 'JAKARTA FILM WEEK 2025: PASS REGISTRASI DIBUKA!',
    subtitle: 'Nonton 80+ film festival independen dunia & ikuti masterclass sutradara internasional.',
    ctaText: 'Dapatkan Early Bird Pass',
    ctaUrl: '#',
    imageUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1200&q=80',
    tag: 'SPONSORED FESTIVAL',
    sponsorName: 'Jakarta Film Week',
  },
  {
    id: 'ad-sidebar',
    title: 'Sony Cinema Line Trade-In Fest',
    subtitle: 'Tukarkan kamera lama kamu dan dapatkan diskon hingga 15% untuk Sony FX3 & FX30.',
    ctaText: 'Klaim Promo',
    ctaUrl: '#',
    imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80',
    tag: 'PROMO GEAR',
    sponsorName: 'Sony Indonesia Authorized',
  },
  {
    id: 'ad-infeed',
    title: 'Criterion Channel Special Screening 30 Hari Bebas Streaming',
    subtitle: 'Akses ratusan film arthouse, restorasi 4K, dan audio commentary eksklusif sineas legendaris.',
    ctaText: 'Coba Gratis Sekarang',
    ctaUrl: '#',
    imageUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80',
    tag: 'STREAMING PARTNER',
    sponsorName: 'The Criterion Channel',
  },
];

// Gear Addict Items for the Hero Right Tab
export const GEAR_ADDICT_ITEMS = [
  {
    id: 'gear-1',
    name: 'Sony FX3 Cinema Line',
    badge: 'HOTTEST RIG 2025',
    sensor: 'Full-Frame 12.1MP BSI CMOS',
    price: 'Rp 64.999.000',
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=400&q=80',
    highlight: 'Dual Base ISO 800/12,800 + Built-in Cooling Fan untuk shooting maraton.',
    skorSotoy: 9.8,
  },
  {
    id: 'gear-2',
    name: 'Sirui Saturn 35mm T2.9 Anamorphic',
    badge: 'INDIE CHOICE',
    sensor: 'Carbon Fiber 1.6x Squeeze',
    price: 'Rp 14.500.000',
    image: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=400&q=80',
    highlight: 'Lensa anamorphic teringan di dunia, flare horizontal biru khas film fiksi ilmiah.',
    skorSotoy: 9.4,
  },
  {
    id: 'gear-3',
    name: 'Aputure Amaran 200x S Bi-Color',
    badge: 'STUDIO ESSENTIAL',
    sensor: 'CRI 95+ / TLCI 98+',
    price: 'Rp 5.200.000',
    image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=400&q=80',
    highlight: 'Cahaya lembut dengan reproduksi warna spektrum SSI yang konsisten untuk wawancara.',
    skorSotoy: 9.6,
  },
];
