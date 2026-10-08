import React from 'react';
import { Link } from 'react-router-dom';
import { useApp, isUserAdmin } from '../../context/AppContext';
import { ShieldCheck, ArrowLeft, Layout } from 'lucide-react';
import { AdminHomepageSections } from '../Admin/AdminHomepageSections';

export const AdminHomepageSectionsPage: React.FC = () => {
  const { currentUser, isAdmin } = useApp();

  if (!isAdmin && !isUserAdmin(currentUser)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-center px-4">
        <div>
          <ShieldCheck className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white mb-2">Akses Ditolak</h2>
          <p className="text-slate-400 text-sm">
            Halaman ini khusus untuk Administrator Utama Sotoy Film.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 lg:py-12 space-y-6">
      {/* Page Header & Navigation Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <Link
            to="/admin"
            id="homepage-sections-back-to-admin"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4 text-[#FF2E7E]" />
            <span>Kembali ke Sotoy Admin Control Center</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF2E7E]/10 border border-[#FF2E7E]/30 flex items-center justify-center text-[#FF2E7E]">
              <Layout className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display font-black text-2xl text-white tracking-tight">
                Pengaturan Seksi Beranda
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Atur judul, mode kurasi otomatis (kategori & sub-kategori), atau pilih item manual secara independen untuk tiap seksi.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Admin Homepage Sections Control Interface */}
      <AdminHomepageSections />
    </div>
  );
};
