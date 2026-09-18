import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp, isUserAdmin } from '../../context/AppContext';
import { ShieldCheck, CheckCircle2, XCircle, Search, ExternalLink, Filter, ArrowLeft } from 'lucide-react';

interface Submission {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  publicationName: string;
  publicationUrl: string;
  portfolioUrl: string;
  twitterHandle: string;
  motivation: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
}

const mockSubmissions: Submission[] = [
  {
    id: 'sub_1',
    userId: 'user_123',
    userName: 'Budi Santoso',
    userEmail: 'budi.santoso@example.com',
    publicationName: 'Sinema Nusantara',
    publicationUrl: 'https://sinemanusantara.id',
    portfolioUrl: 'https://sinemanusantara.id/author/budi',
    twitterHandle: '@budireviews',
    motivation: 'Saya ingin bergabung menjadi kritikus karena saya memiliki lebih dari 3 tahun pengalaman menulis esai dan opini kritis seputar film independen dan komersial.',
    date: '14 Sep 2026',
    status: 'pending'
  },
  {
    id: 'sub_2',
    userId: 'user_456',
    userName: 'Rina Wijaya',
    userEmail: 'rina.w@example.com',
    publicationName: 'Pop Culture Indo',
    publicationUrl: 'https://popcultureindo.com',
    portfolioUrl: 'https://youtube.com/rinamovies',
    twitterHandle: '@rinawijaya',
    motivation: 'Saya seorang youtuber dengan 50K subscriber yang fokus membahas narasi dan sinematografi. Saya rasa platform ini butuh variasi opini dari sisi teknikal visual.',
    date: '13 Sep 2026',
    status: 'pending'
  },
  {
    id: 'sub_3',
    userId: 'user_789',
    userName: 'Andi Pratama',
    userEmail: 'andipratama@example.com',
    publicationName: 'IndieFlix Blog',
    publicationUrl: 'https://indieflix.blog',
    portfolioUrl: 'https://indieflix.blog/andi',
    twitterHandle: '@andipratama',
    motivation: 'Suka film dan sering nge-tweet tentang film terbaru.',
    date: '10 Sep 2026',
    status: 'rejected'
  }
];

export const AdminCriticSubmissionsPage: React.FC = () => {
  const { currentUser, showToast, criticSubmissions, updateCriticSubmissionStatus, isAdmin } = useApp();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  if (!isAdmin && !isUserAdmin(currentUser)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-center px-4">
        <div>
          <ShieldCheck className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white mb-2">Akses Ditolak</h2>
          <p className="text-slate-400">Halaman ini khusus untuk Administrator.</p>
        </div>
      </div>
    );
  }

  const handleApprove = async (id: string, userName: string) => {
    await updateCriticSubmissionStatus(id, 'approved');
    showToast(`${userName} telah disetujui menjadi Kritikus (Si Paling Sotoy).`);
  };

  const handleReject = async (id: string, userName: string) => {
    await updateCriticSubmissionStatus(id, 'rejected');
    showToast(`Pengajuan ${userName} telah ditolak.`);
  };

  const filteredSubmissions = criticSubmissions.filter(sub => filter === 'all' || sub.status === filter);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12">
      {/* Back to Admin Dashboard link */}
      <div className="mb-6">
        <Link
          to="/admin"
          id="critic-submissions-back-to-admin"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Sotoy Admin Control Center</span>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-500/20 text-red-400 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Critic Submissions
            </h1>
          </div>
          <p className="text-slate-400 text-sm">Review dan kelola pengajuan user untuk menjadi Kritikus (Si Paling Sotoy).</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl self-start md:self-auto shrink-0 overflow-x-auto">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-xs font-bold capitalize whitespace-nowrap transition-colors ${
                filter === f
                  ? 'bg-red-500/20 text-red-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredSubmissions.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/50 border border-slate-800 rounded-3xl border-dashed">
            <Search className="w-10 h-10 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 font-bold">Tidak ada data submission.</p>
          </div>
        ) : (
          filteredSubmissions.map(sub => (
            <div key={sub.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 lg:p-6 transition-all hover:border-slate-700">
              <div className="flex flex-col lg:flex-row gap-6">
                
                <div className="flex-1 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-black text-white">{sub.userName}</h3>
                      <p className="text-xs text-slate-400">{sub.userEmail}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider ${
                          sub.status === 'pending' ? 'bg-orange-500/20 text-orange-400' :
                          sub.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {sub.status}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">Diajukan: {sub.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold text-slate-500">Publikasi / Media</div>
                      <div className="text-sm font-bold text-slate-200">{sub.publicationName}</div>
                      <a href={sub.publicationUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
                        Kunjungi Web <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold text-slate-500">Portofolio / Social</div>
                      <div className="text-sm font-bold text-slate-200">{sub.twitterHandle || '-'}</div>
                      <a href={sub.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
                        Lihat Portofolio <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-1.5">Motivasi & Latar Belakang</div>
                    <p className="text-sm text-slate-300 leading-relaxed italic">
                      "{sub.motivation}"
                    </p>
                  </div>
                </div>

                {sub.status === 'pending' && (
                  <div className="lg:w-48 shrink-0 flex flex-col gap-3 justify-center border-t lg:border-t-0 lg:border-l border-slate-800 pt-5 lg:pt-0 lg:pl-6">
                    <button
                      onClick={() => handleApprove(sub.id, sub.userName)}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Setujui Kritikus
                    </button>
                    <button
                      onClick={() => handleReject(sub.id, sub.userName)}
                      className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Tolak
                    </button>
                  </div>
                )}
                
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
