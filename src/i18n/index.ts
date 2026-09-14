import { useApp } from '../context/AppContext';

type Translations = Record<string, Record<string, string>>;

const en: Record<string, string> = {
  // Common
  'nav.movies': 'Movies',
  'nav.series': 'Series',
  'nav.anime': 'Anime',
  'nav.cinemaGear': 'Cinema Gear',
  'nav.filmStudies': 'Film Studies',
  'nav.filmDatabase': 'Film Database',
  'nav.buzzFeed': 'Buzz Feed',
  'nav.login': 'Log In',
  'nav.logout': 'Log Out',
  'nav.search': 'Search movies, news, gear...',
  'nav.myProfile': 'My Profile',
  'nav.settings': 'Settings',
  'role.warga': 'Citizen (Public)',
  'role.critic': 'Critic',
  'role.writer': 'Writer',
  'role.admin': 'Admin',
  'settings.title': 'Settings & Activity',
  'settings.language': 'Language',
  'settings.theme': 'Theme Mode',
  'settings.dark': 'Dark Mode',
  'settings.light': 'Light Mode',
  'common.save': 'Save Changes',
  'common.cancel': 'Cancel',
};

const id: Record<string, string> = {
  // Common
  'nav.movies': 'Film',
  'nav.series': 'Serial',
  'nav.anime': 'Anime',
  'nav.cinemaGear': 'Alat Sinema',
  'nav.filmStudies': 'Studi Film',
  'nav.filmDatabase': 'Database Film',
  'nav.buzzFeed': 'Buzz Feed',
  'nav.login': 'Masuk',
  'nav.logout': 'Keluar',
  'nav.search': 'Cari film, berita, gear...',
  'nav.myProfile': 'Profil Saya',
  'nav.settings': 'Pengaturan',
  'role.warga': 'Warga Sotoy',
  'role.critic': 'Kritikus',
  'role.writer': 'Penulis',
  'role.admin': 'Admin',
  'settings.title': 'Pengaturan & Aktivitas',
  'settings.language': 'Bahasa',
  'settings.theme': 'Mode Tema',
  'settings.dark': 'Mode Gelap',
  'settings.light': 'Mode Terang',
  'common.save': 'Simpan Perubahan',
  'common.cancel': 'Batal',
};

const dictionaries: Translations = { en, id };

export const useTranslation = () => {
  const { userSettings } = useApp();
  const lang = userSettings.language || 'en';

  const t = (key: string, fallback?: string): string => {
    return dictionaries[lang]?.[key] || dictionaries['en']?.[key] || fallback || key;
  };

  return { t, lang };
};
