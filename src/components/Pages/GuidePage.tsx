import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Key,
  User,
  Settings,
  Star,
  MessageSquare,
  Share2,
  Shield,
  FileText,
  LayoutGrid,
  ChevronRight,
  Sparkles,
  HelpCircle,
  ThumbsUp,
  Image as ImageIcon,
  CheckCircle,
  Smartphone,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AdBannerSlot } from '../Common/AdBannerSlot';

// Import the generated images
// @ts-ignore
import guideHero from '../../assets/images/sotoy_guide_hero_1791455336765.jpg';
// @ts-ignore
import buzzGuide from '../../assets/images/sotoy_buzz_guide_1791455357223.jpg';
// @ts-ignore
import ratingGuide from '../../assets/images/sotoy_rating_guide_1791455879959.jpg';
// @ts-ignore
import shareGuide from '../../assets/images/sotoy_share_guide_1791455895956.jpg';

type TabKey = 'akun' | 'rating' | 'buzz' | 'admin';

export const GuidePage: React.FC = () => {
  const { navigateTo } = useApp();
  const [activeTab, setActiveTab] = useState<TabKey>('akun');
  const [searchQuery, setSearchQuery] = useState('');

  // Predefined guides for search purposes
  const allGuides = [
    {
      id: 'ganti-password',
      tab: 'akun',
      title: 'Cara Mengubah Kata Sandi (Password)',
      keywords: 'ganti password sandi ubah akun ubah sandi lari reset',
      content: 'Masuk ke menu Pengaturan (klik ikon profil Anda, lalu pilih "Pengaturan" atau kunjungi halaman /settings). Temukan bagian "Ubah Kata Sandi". Masukkan kata sandi lama Anda, masukkan kata sandi baru, ulangi konfirmasi kata sandi baru, lalu klik "Perbarui Kata Sandi". Jika Anda lupa kata sandi saat masuk, klik tautan "Lupa Password" di modal Login untuk mengirim email reset tautan pemulihan.'
    },
    {
      id: 'ganti-profil',
      tab: 'akun',
      title: 'Cara Mengubah Foto & Bio Profil',
      keywords: 'avatar bio nama username medsos ganti edit foto profil',
      content: 'Buka menu Pengaturan. Pada bagian "Edit Profil", Anda dapat memasukkan nama lengkap baru, mengubah bio unik Anda, menautkan akun Twitter/X, Instagram, Letterboxd, atau situs web pribadi Anda. Untuk mengganti foto profil, klik area foto avatar Anda, unggah gambar berformat JPG/PNG (maksimal 5MB). Sistem Sotoy Film akan otomatis mengompresi gambar Anda secara lokal di browser agar hemat kuota sebelum diunggah ke cloud!'
    },
    {
      id: 'email-verification',
      tab: 'akun',
      title: 'Cara Verifikasi Email',
      keywords: 'verifikasi email kuning banner konfirmasi akun',
      content: 'Saat mendaftar menggunakan Email & Password, sebuah spanduk merah/kuning akan muncul di bagian atas layar bertuliskan "Email belum diverifikasi". Klik tombol "Kirim Verifikasi Ulang" di spanduk tersebut. Sistem akan mengirimkan pesan verifikasi ke inbox Anda. Buka email Anda, cari pesan dari Sotoy Film, dan klik tautan konfirmasi. Lencana centang verifikasi akun Anda akan otomatis aktif!'
    },
    {
      id: 'buat-rating',
      tab: 'rating',
      title: 'Cara Memberikan Rating & Ulasan Film',
      keywords: 'rating ulasan skor bintang tulis review nilai',
      content: 'Cari film, serial, atau anime pilihan Anda di "Database Film". Di halaman detail film, gulir ke bagian "Berikan Penilaian Anda". Pilih skor bintang Anda dari rentang ★ 1.0 sampai 10.0 (menggunakan klik atau slider presisi desimal). Tulis "Headline Ulasan" yang menarik (contoh: "Visualnya Megah, Tapi Naskahnya Lemah"), lalu ketik ulasan lengkap Anda di kotak teks yang disediakan. Terakhir, klik "Kirim Ulasan". Rating Anda akan langsung digabungkan ke Skor Warga!',
      image: ratingGuide
    },
    {
      id: 'edit-review',
      tab: 'rating',
      title: 'Mengubah atau Menghapus Ulasan Anda',
      keywords: 'edit ulasan hapus review bintang ganti nilai kembali',
      content: 'Jika Anda ingin mengoreksi ulasan atau mengubah skor bintang yang sudah dikirim sebelumnya, cukup buka kembali halaman detail film tersebut. Formulir penilaian Anda akan menampilkan ulasan lama Anda. Anda dapat langsung mengedit teks atau mengubah rating desimal Anda, lalu klik "Perbarui Ulasan". Untuk menghapus, klik tombol "Hapus Penilaian" berwarna merah di bagian bawah formulir.'
    },
    {
      id: 'upvote-review',
      tab: 'rating',
      title: 'Mendukung Ulasan Warga Lain (Upvote)',
      keywords: 'upvote jempol dukung ulasan orang lain setuju',
      content: 'Di halaman detail film, gulir ke bawah untuk melihat "Ulasan Warga". Jika Anda membaca ulasan dari warga lain yang sangat membantu, jujur, atau ditulis dengan apik, klik tombol jempol ke atas ("Bermanfaat" / Upvote) di bawah ulasan tersebut. Ulasan dengan jumlah upvote tertinggi akan otomatis naik ke baris paling atas agar dapat dibaca oleh ribuan pengunjung lainnya!'
    },
    {
      id: 'kirim-buzz',
      tab: 'buzz',
      title: 'Cara Mengirim Gagasan Film di Forum "Buzz"',
      keywords: 'kirim buzz posting tweet gambar foto utas status tag film',
      content: 'Masuk ke halaman "Buzz Komunitas" dari menu navigasi. Klik tombol bulat melayang berwarna pink bergambar pensil (di handphone) atau kotak "Tulis Buzz Baru" di bagian atas halaman feed (di desktop). Ketik opini singkat Anda seputar industri film, serial, atau anime. Anda dapat melampirkan 1 foto ilustrasi (dengan pratinjau instan), serta menggunakan fitur "Tagging Film atau Artikel" agar postingan Anda langsung tertaut pada halaman film/artikel yang dibicarakan.',
      image: buzzGuide
    },
    {
      id: 'balas-buzz',
      tab: 'buzz',
      title: 'Cara Berdiskusi & Membalas Komentar (Threaded)',
      keywords: 'komen balas diskusi thread buzz bersarang reply',
      content: 'Ingin mengomentari postingan Buzz warga lain? Klik area postingan tersebut untuk membuka halaman detail Buzz. Di bagian bawah, ketik balasan Anda pada kolom komentar dan klik "Kirim". Untuk membalas komentar warga lain secara bersarang (bertingkat), klik tombol "Balas" tepat di bawah komentar spesifik tersebut. Diskusi akan tertata rapi dalam format percakapan bersarang!'
    },
    {
      id: 'share-konten',
      tab: 'buzz',
      title: 'Membagikan (Share) Buzz, Ulasan, dan Artikel',
      keywords: 'share bagikan wa twitter facebook salin link copy sosmed',
      content: 'Sotoy Film dilengkapi dengan modal berbagi yang super canggih. Klik ikon "Share" (Bagikan) di ulasan film, postingan Buzz, maupun halaman artikel editorial. Sebuah jendela modal akan muncul, memungkinkan Anda untuk menyalin tautan instan ke papan klip ("Salin Tautan"), membagikannya langsung ke WhatsApp, memposting ke Twitter/X dengan tagar otomatis, atau membagikannya ke Facebook. Bot crawler media sosial kami akan otomatis menampilkan preview gambar mini yang dinamis saat Anda membagikan tautan tersebut!',
      image: shareGuide
    },
    {
      id: 'tulis-artikel',
      tab: 'admin',
      title: 'Cara Menulis Artikel Editorial (Penulis & Admin)',
      keywords: 'menulis artikel cms jurnalis draft jadwal terbit cover',
      content: 'Khusus pengguna dengan peran "Penulis Sotoy" atau "Admin Utama", Anda akan memiliki akses ke Workspace CMS di halaman /cms atau melalui Panel Admin. Klik "Tulis Artikel Baru". Ketik judul utama, pilih jenis kategori artikel (Ulasan Editorial, Kajian Sinema, Bedah Alat, Berita, dll.), unggah cover image utama, dan rancang artikel Anda. Di sisi kanan, isi konfigurasi SEO: Judul SEO kustom, deskripsi meta, dan target kata kunci agar artikel terindeks optimal di Google. Anda dapat menyimpannya sebagai "Draft", menerbitkannya langsung ("Published"), atau menentukan tanggal terjadwal ("Scheduled")!'
    },
    {
      id: 'susun-beranda',
      tab: 'admin',
      title: 'Mengatur Urutan & Visibilitas Beranda (Admin)',
      keywords: 'susunan beranda drag drop tata letak sidebar widget sembunyikan reset',
      content: 'Khusus Admin Utama, masuk ke "Panel Admin > Susunan Beranda". Di sini Anda dapat melakukan drag & drop untuk mengurutkan blok konten utama beranda atau memindahkannya menggunakan tombol panah ▲/▼. Anda juga dapat memindahkan posisi sidebar dari kanan ke kiri, mengurutkan widget sidebar, dan menyembunyikan blok tertentu menggunakan ikon mata (👁️). Sistem dilengkapi dengan "Split-Column Warning" jika susunan kolom terpisah oleh konten lebar penuh, dan tombol "Reset ke Default" untuk mengembalikan tata letak semula.'
    },
    {
      id: 'moderasi-laporan',
      tab: 'admin',
      title: 'Sistem Moderasi & Evaluasi Banding (Admin)',
      keywords: 'moderasi laporan ban suspend banding kritikus warga',
      content: 'Admin dapat memantau keamanan platform melalui sub-menu Moderasi di Panel Admin. Di sini, Anda dapat meninjau semua laporan pelanggaran ulasan atau postingan dari warga. Anda dapat menghapus konten bermasalah, menangguhkan akun pelanggar secara massal (Bulk Actions), serta meninjau kurasi pendaftaran Kritikus Baru. Jika ada pengguna yang diblokir mengirimkan surat banding, Admin dapat membaca surat banding mereka dan memutuskan untuk mengaktifkan kembali akun (*unban*) atau menolak banding tersebut secara adil.'
    }
  ];

  // Filtering based on search query and active tab
  const filteredGuides = allGuides.filter(guide => {
    const matchesSearch = searchQuery
      ? guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guide.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guide.keywords.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    // If searching, ignore tab filter to find answers across all tabs
    const matchesTab = searchQuery ? true : guide.tab === activeTab;

    return matchesSearch && matchesTab;
  });

  return (
    <div id="faq-guide-page" className="min-h-screen py-6 sm:py-10 text-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-12">
        
        {/* Header Hero */}
        <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 p-6 sm:p-12 shadow-2xl flex flex-col md:flex-row items-center gap-8">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#FF2E7E]/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex-1 space-y-4 text-center md:text-left z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF2E7E]/10 border border-[#FF2E7E]/30 text-[#FF2E7E] text-xs font-black uppercase tracking-wider">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Pusat Bantuan & Tutorial Lengkap</span>
            </div>

            <h1 className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight leading-tight">
              Panduan Pengguna <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF2E7E] to-rose-400">Sotoy Film</span>
            </h1>

            <p className="text-slate-300 text-sm leading-relaxed max-w-xl">
              Butuh bantuan cara memberikan rating, ganti kata sandi, memposting ide di Buzz, atau penasaran dengan fitur-fitur admin? Temukan jawabannya di bawah ini!
            </p>

            {/* Interactive Search Bar */}
            <div className="relative max-w-md pt-2">
              <Search className="absolute left-3.5 top-5.5 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari topik... (contoh: password, rating, buzz)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-900/90 hover:bg-slate-900 border border-slate-700 focus:border-[#FF2E7E] focus:ring-1 focus:ring-[#FF2E7E] rounded-2xl text-sm text-white placeholder-slate-400 transition-all outline-none"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-5.5 text-xs text-[#FF2E7E] hover:underline font-bold"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="w-full md:w-72 lg:w-96 flex-shrink-0 z-10">
            <img
              src={guideHero}
              alt="Sotoy Film Guide Illustration"
              className="rounded-2xl border border-slate-800 shadow-xl object-cover w-full h-44 sm:h-56 transform md:rotate-2 hover:rotate-0 transition-transform duration-300"
            />
          </div>
        </div>

        {/* Global Page Ad Banner */}
        <AdBannerSlot variant="leaderboard" />

        {/* Dynamic Interactive Tab Switcher (Only when not searching) */}
        {!searchQuery && (
          <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-1">
            {[
              { key: 'akun', label: '👤 Akun & Profil', desc: 'Pengaturan, sandi, edit foto' },
              { key: 'rating', label: '⭐ Rating & Ulasan', desc: 'Skor 1-10, ulasan, upvote' },
              { key: 'buzz', label: '💬 Forum & Berbagi', desc: 'Buzz post, foto, komen, share' },
              { key: 'admin', label: '🎛️ CMS & Admin', desc: 'Tulis artikel, layout, moderasi' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabKey)}
                className={`flex-1 min-w-[150px] p-3 text-left rounded-t-2xl border-t border-x transition-all duration-200 outline-none ${
                  activeTab === tab.key
                    ? 'bg-slate-900 border-slate-800 text-white font-black border-b-2 border-b-[#FF2E7E]'
                    : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`}
              >
                <div className="text-sm font-bold block">{tab.label}</div>
                <div className="text-[10px] text-slate-500 font-medium block truncate mt-0.5">{tab.desc}</div>
              </button>
            ))}
          </div>
        )}

        {/* Showing Search Title Indicator */}
        {searchQuery && (
          <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <HelpCircle className="w-4 h-4 text-[#FF2E7E]" />
            <span>Menampilkan hasil pencarian untuk: <strong className="text-white">"{searchQuery}"</strong> ({filteredGuides.length} topik ditemukan)</span>
          </div>
        )}

        {/* Grid Layout containing Guides & Side Tutorial Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Guides Accordion/List */}
          <div className="lg:col-span-2 space-y-6">
            {filteredGuides.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/40 rounded-3xl border border-slate-800 space-y-3">
                <HelpCircle className="w-10 h-10 text-slate-500 mx-auto" />
                <h3 className="text-lg font-black text-white">Topik Tidak Ditemukan</h3>
                <p className="text-sm text-slate-400 max-w-sm mx-auto">
                  Coba gunakan kata kunci lain seperti "sandi", "bintang", "gambar", atau geser tab kategori di atas.
                </p>
              </div>
            ) : (
              filteredGuides.map((guide, idx) => (
                <div
                  key={guide.id}
                  className="bg-[#121212] border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-md hover:border-slate-700 transition-colors space-y-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#FF2E7E]/10 border border-[#FF2E7E]/30 flex items-center justify-center text-xs font-black text-[#FF2E7E] mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="space-y-2 flex-1">
                      <h3 className="font-display font-black text-base sm:text-lg text-white flex items-center gap-2">
                        {guide.title}
                      </h3>
                      <p className="text-slate-300 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                        {guide.content}
                      </p>
                      
                      {guide.image && (
                        <div className="mt-4 pt-2 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 max-w-2xl">
                          <img
                            src={guide.image}
                            alt={`${guide.title} Tutorial UI`}
                            referrerPolicy="no-referrer"
                            className="w-full h-auto object-cover max-h-[350px] opacity-90 hover:opacity-100 transition-opacity duration-200"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Interactive Tutorial Visual Column */}
          <div className="space-y-6">
            
            {/* Visual Screenshot Mockup Card */}
            <div className="bg-[#121212] border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
              <h3 className="font-display font-black text-base text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FF2E7E]" />
                <span>Eksplorasi Fitur Komunitas</span>
              </h3>
              <img
                src={buzzGuide}
                alt="Community Buzz Feed Tutorial"
                className="rounded-xl border border-slate-800 object-cover w-full h-48 sm:h-52"
              />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Ilustrasi tampilan modular interaktif Sotoy Film, memudahkan pembaca memberikan rating bintang (★ 1-10) desimal secara instan serta membalas buzz di smartphone.
              </p>
            </div>

            {/* Hubungi Support */}
            <div className="bg-gradient-to-br from-[#FF2E7E]/10 to-transparent border border-slate-800 rounded-3xl p-5 space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-[#FF2E7E]" />
                  <span>Pertanyaan Belum Terjawab?</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Jika Anda menemukan kendala teknis atau memiliki kendala seputar akun Anda, tim admin kami siap membantu Anda kapan saja.
                </p>
              </div>
              <button
                onClick={() => navigateTo('business-inquiries')}
                className="w-full py-2.5 rounded-xl bg-[#FF2E7E] hover:bg-cyan-400 text-slate-950 font-black text-[11px] uppercase tracking-wider transition-all"
              >
                Kirim Tiket Bantuan →
              </button>
            </div>

            {/* Quick Tips */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 space-y-3.5">
              <h4 className="text-xs font-black text-white tracking-wider uppercase">💡 Tips Keamanan Akun</h4>
              <ul className="space-y-2.5 text-[11px] text-slate-400 leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <span className="text-[#FF2E7E]">✔</span>
                  <span>Gunakan sandi unik minimal 6 karakter dengan kombinasi angka.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[#FF2E7E]">✔</span>
                  <span>Jangan pernah membagikan kredensial atau sandi akun Anda kepada siapapun.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[#FF2E7E]">✔</span>
                  <span>Lakukan verifikasi email untuk mengklaim reputasi ulasan Anda.</span>
                </li>
              </ul>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
