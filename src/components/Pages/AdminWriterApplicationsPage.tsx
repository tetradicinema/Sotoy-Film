import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp, isUserAdmin } from '../../context/AppContext';
import { useWriterApplications } from '../../hooks/useWriterApplications';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Search,
  ExternalLink,
  ArrowLeft,
  PenLine,
  Mail,
} from 'lucide-react';
import type { WriterApplication } from '../../types';

type Filter = 'pending' | 'approved' | 'rejected' | 'all';

const FILTER_TABS: { key: Filter; label: string }[] = [
  { key: 'pending', label: 'Menunggu' },
  { key: 'approved', label: 'Disetujui' },
  { key: 'rejected', label: 'Ditolak' },
  { key: 'all', label: 'Semua' },
];

export const AdminWriterApplicationsPage: React.FC = () => {
  const { currentUser, showToast, isAdmin } = useApp();
  const { listAll, setStatus } = useWriterApplications();

  const [applications, setApplications] = useState<WriterApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const isAuthorized = isAdmin || isUserAdmin(currentUser);

  useEffect(() => {
    if (!isAuthorized) {
      setIsLoading(false);
      return;
    }
    let isMounted = true;
    setIsLoading(true);
    listAll()
      .then(result => {
        if (isMounted) setApplications(result);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
    // listAll is recreated per render; authorization is the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized, currentUser.id]);

  const filteredApplications = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    return applications.filter(app => {
      const matchesFilter = filter === 'all' || app.status === filter;
      const matchesSearch =
        !term ||
        app.userName.toLowerCase().includes(term) ||
        app.userEmail.toLowerCase().includes(term);
      return matchesFilter && matchesSearch;
    });
  }, [applications, filter, searchQuery]);

  const handleSetStatus = async (app: WriterApplication, status: 'approved' | 'rejected') => {
    setProcessingId(app.id);
    const success = await setStatus(app.id, app.userId, status);
    setProcessingId(null);

    if (!success) {
      showToast('Gagal memperbarui status pendaftaran.', 'error');
      return;
    }

    setApplications(prev =>
      prev.map(item =>
        item.id === app.id
          ? { ...item, status, reviewedAt: Date.now(), reviewedBy: currentUser.id }
          : item
      )
    );
    showToast(
      status === 'approved'
        ? `Pendaftaran ${app.userName} disetujui.`
        : `Pendaftaran ${app.userName} ditolak.`
    );
  };

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-center px-4">
        <div>
          <ShieldCheck className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white mb-2">Akses ditolak</h2>
          <p className="text-slate-400 mb-6">Halaman ini khusus untuk Administrator.</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12">
      {/* Back to Admin Dashboard link */}
      <div className="mb-6">
        <Link
          to="/admin"
          id="writer-applications-back-to-admin"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FF2E7E] hover:text-pink-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Sotoy Admin Control Center</span>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#FF2E7E]/20 text-[#FF2E7E] rounded-xl flex items-center justify-center">
              <PenLine className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Pendaftaran Penulis</h1>
          </div>
          <p className="text-slate-400 text-sm">
            Review dan kelola pengajuan user untuk menjadi penulis redaksi Sotoy Film.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl self-start md:self-auto shrink-0 overflow-x-auto">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                filter === tab.key
                  ? 'bg-[#FF2E7E]/20 text-[#FF2E7E]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari nama atau email pendaftar..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#FF2E7E] focus:ring-1 focus:ring-[#FF2E7E]"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-20 bg-slate-900/50 border border-slate-800 rounded-3xl border-dashed">
          <div className="w-10 h-10 border-2 border-[#FF2E7E]/30 border-t-[#FF2E7E] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Memuat pendaftaran penulis...</p>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/50 border border-slate-800 rounded-3xl border-dashed">
          <Search className="w-10 h-10 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 font-bold">Tidak ada pendaftaran penulis.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map(app => (
            <div
              key={app.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 lg:p-6 transition-all hover:border-slate-700"
            >
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-black text-white">{app.userName}</h3>
                      <a
                        href={`mailto:${app.userEmail}`}
                        className="text-xs text-slate-400 hover:text-[#FF2E7E] hover:underline inline-flex items-center gap-1.5"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        {app.userEmail || '-'}
                      </a>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider ${
                            app.status === 'pending'
                              ? 'bg-orange-500/20 text-orange-400'
                              : app.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {app.status}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">Diajukan: {app.date}</span>
                      </div>
                    </div>
                  </div>

                  {(app.topics?.length || app.portfolioUrl || app.sampleUrl) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="text-[10px] uppercase font-bold text-slate-500">Topik yang Diminati</div>
                        {app.topics && app.topics.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {app.topics.map(topic => (
                              <span
                                key={topic}
                                className="px-2 py-0.5 rounded-full bg-[#FF2E7E]/10 border border-[#FF2E7E]/30 text-[11px] font-bold text-[#FF2E7E]"
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm font-bold text-slate-200">-</div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="text-[10px] uppercase font-bold text-slate-500">Tautan</div>
                        <div className="flex flex-col gap-1">
                          {app.portfolioUrl && (
                            <a
                              href={app.portfolioUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                            >
                              Portofolio <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          {app.sampleUrl && (
                            <a
                              href={app.sampleUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                            >
                              Contoh Tulisan <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          {!app.portfolioUrl && !app.sampleUrl && (
                            <div className="text-sm font-bold text-slate-200">-</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-1.5">Motivasi & Latar Belakang</div>
                    <p className="text-sm text-slate-300 leading-relaxed italic">"{app.motivation}"</p>
                  </div>
                </div>

                {app.status === 'pending' && (
                  <div className="lg:w-56 shrink-0 flex flex-col gap-3 justify-center border-t lg:border-t-0 lg:border-l border-slate-800 pt-5 lg:pt-0 lg:pl-6">
                    <button
                      onClick={() => handleSetStatus(app, 'approved')}
                      disabled={processingId === app.id}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Setujui
                    </button>
                    <button
                      onClick={() => handleSetStatus(app, 'rejected')}
                      disabled={processingId === app.id}
                      className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Tolak
                    </button>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Setelah disetujui, ubah peran akun ini menjadi Penulis Sotoy di Admin &gt; Manajemen Pengguna.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
