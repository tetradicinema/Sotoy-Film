import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp, isUserAdmin } from '../../context/AppContext';
import { useSupportTickets, supportTicketCategoryLabel } from '../../hooks/useSupportTickets';
import {
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  Search,
  ArrowLeft,
  LifeBuoy,
  Mail,
  Loader2,
} from 'lucide-react';
import type { SupportTicket, SupportTicketStatus } from '../../types';

type Filter = 'open' | 'in_progress' | 'resolved' | 'all';

const FILTER_TABS: { key: Filter; label: string }[] = [
  { key: 'open', label: 'Baru' },
  { key: 'in_progress', label: 'Diproses' },
  { key: 'resolved', label: 'Selesai' },
  { key: 'all', label: 'Semua' },
];

const STATUS_BADGE: Record<SupportTicketStatus, { label: string; className: string }> = {
  open: { label: 'Baru', className: 'bg-orange-500/20 text-orange-400' },
  in_progress: { label: 'Diproses', className: 'bg-cyan-500/20 text-cyan-400' },
  resolved: { label: 'Selesai', className: 'bg-emerald-500/20 text-emerald-400' },
};

const TOAST_BY_STATUS: Record<SupportTicketStatus, string> = {
  open: 'dibuka kembali',
  in_progress: 'ditandai diproses',
  resolved: 'ditandai selesai',
};

export const AdminSupportTicketsPage: React.FC = () => {
  const { currentUser, showToast, isAdmin } = useApp();
  const { listAll, setStatus } = useSupportTickets();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('open');
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
        if (isMounted) setTickets(result);
      })
      .catch(() => setTickets([]))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
    // listAll is recreated per render; authorization is the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized, currentUser.id]);

  const filteredTickets = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    return tickets.filter(ticket => {
      const matchesFilter = filter === 'all' || ticket.status === filter;
      const matchesSearch =
        !term ||
        ticket.userName.toLowerCase().includes(term) ||
        ticket.userEmail.toLowerCase().includes(term) ||
        ticket.subject.toLowerCase().includes(term);
      return matchesFilter && matchesSearch;
    });
  }, [tickets, filter, searchQuery]);

  const handleSetStatus = async (ticket: SupportTicket, status: SupportTicketStatus) => {
    setProcessingId(ticket.id);
    let success = false;
    try {
      success = await setStatus(ticket, status);
    } finally {
      setProcessingId(null);
    }

    if (!success) {
      showToast('Gagal memperbarui status tiket.', 'error');
      return;
    }

    setTickets(prev =>
      prev.map(item =>
        item.id === ticket.id
          ? { ...item, status, updatedAt: Date.now(), handledBy: currentUser.id }
          : item
      )
    );
    showToast(`Tiket "${ticket.subject}" ${TOAST_BY_STATUS[status]}.`);
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
      <div className="mb-6">
        <Link
          to="/admin"
          id="support-tickets-back-to-admin"
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
              <LifeBuoy className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Tiket Bantuan</h1>
          </div>
          <p className="text-slate-400 text-sm">
            Baca tiket dari pengguna, balas lewat email, lalu ubah statusnya. Pengguna mendapat notifikasi saat status
            berubah menjadi Diproses atau Selesai.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl self-start md:self-auto shrink-0 overflow-x-auto">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                filter === tab.key ? 'bg-[#FF2E7E]/20 text-[#FF2E7E]' : 'text-slate-400 hover:text-white'
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
            placeholder="Cari nama, email, atau subjek..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#FF2E7E] focus:ring-1 focus:ring-[#FF2E7E]"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-20 bg-slate-900/50 border border-slate-800 rounded-3xl border-dashed">
          <div className="w-10 h-10 border-2 border-[#FF2E7E]/30 border-t-[#FF2E7E] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Memuat tiket bantuan...</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/50 border border-slate-800 rounded-3xl border-dashed">
          <Search className="w-10 h-10 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 font-bold">Tidak ada tiket bantuan.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map(ticket => {
            const badge = STATUS_BADGE[ticket.status] || STATUS_BADGE.open;
            const isProcessing = processingId === ticket.id;
            const replyHref = `mailto:${ticket.userEmail}?subject=${encodeURIComponent('Re: ' + ticket.subject)}`;
            return (
              <div
                key={ticket.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 lg:p-6 transition-all hover:border-slate-700"
              >
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-1 min-w-0 space-y-4">
                    <div>
                      <h3 className="text-lg font-black text-white break-words">{ticket.subject}</h3>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                        <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider bg-slate-800 text-slate-300">
                          {supportTicketCategoryLabel(ticket.category)}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">Dikirim: {ticket.date}</span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-400">
                      <span className="font-bold text-slate-200">{ticket.userName}</span>
                      {' • '}
                      <a
                        href={`mailto:${ticket.userEmail}`}
                        className="hover:text-[#FF2E7E] hover:underline inline-flex items-center gap-1.5"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        {ticket.userEmail || '-'}
                      </a>
                    </div>

                    <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
                      <div className="text-[10px] uppercase font-bold text-slate-500 mb-1.5">Pesan</div>
                      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                        {ticket.message}
                      </p>
                    </div>
                  </div>

                  <div className="lg:w-56 shrink-0 flex flex-col gap-3 justify-center border-t lg:border-t-0 lg:border-l border-slate-800 pt-5 lg:pt-0 lg:pl-6">
                    {ticket.userEmail && (
                      <a
                        href={replyHref}
                        className="w-full flex items-center justify-center gap-2 bg-[#FF2E7E]/10 hover:bg-[#FF2E7E]/20 text-[#FF2E7E] border border-[#FF2E7E]/30 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors"
                      >
                        <Mail className="w-4 h-4" />
                        Balas lewat email
                      </a>
                    )}
                    {ticket.status === 'open' && (
                      <button
                        onClick={() => handleSetStatus(ticket, 'in_progress')}
                        disabled={isProcessing}
                        className="w-full flex items-center justify-center gap-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors disabled:opacity-50"
                      >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <LifeBuoy className="w-4 h-4" />}
                        Tandai Diproses
                      </button>
                    )}
                    {(ticket.status === 'open' || ticket.status === 'in_progress') && (
                      <button
                        onClick={() => handleSetStatus(ticket, 'resolved')}
                        disabled={isProcessing}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Tandai Selesai
                      </button>
                    )}
                    {ticket.status === 'resolved' && (
                      <button
                        onClick={() => handleSetStatus(ticket, 'open')}
                        disabled={isProcessing}
                        className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Buka Kembali
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
