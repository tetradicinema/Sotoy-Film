import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  LifeBuoy,
  Send,
  CheckCircle2,
  Clock,
  Loader2,
  LogIn,
  Mail,
  Inbox,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  useSupportTickets,
  SUPPORT_TICKET_CATEGORIES,
  supportTicketCategoryLabel,
} from '../../hooks/useSupportTickets';
import type { SupportTicket, SupportTicketCategory, SupportTicketStatus } from '../../types';

const STATUS_CONFIG: Record<SupportTicketStatus, { label: string; className: string }> = {
  open: { label: 'Terkirim', className: 'bg-amber-500/20 text-amber-400' },
  in_progress: { label: 'Diproses', className: 'bg-cyan-500/20 text-cyan-400' },
  resolved: { label: 'Selesai', className: 'bg-emerald-500/20 text-emerald-400' },
};

type Tab = 'send' | 'mine';

export const SupportTicketPage: React.FC = () => {
  const { navigateTo, isLoggedIn, setLoginModalOpen, showToast, currentUser } = useApp();
  const { listMine, submit } = useSupportTickets();

  const [tab, setTab] = useState<Tab>('send');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState<boolean>(isLoggedIn);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    userName: '',
    category: '' as SupportTicketCategory | '',
    subject: '',
    message: '',
  });

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // listMine is recreated per render; keep the latest copy in a ref so the
  // loader below only depends on the user identity.
  const listMineRef = useRef(listMine);
  listMineRef.current = listMine;

  const loadTickets = useCallback(async () => {
    if (!isLoggedIn) {
      setTickets([]);
      setIsLoadingTickets(false);
      return;
    }
    setIsLoadingTickets(true);
    try {
      const result = await listMineRef.current();
      if (isMountedRef.current) setTickets(result);
    } catch {
      if (isMountedRef.current) setTickets([]);
    } finally {
      if (isMountedRef.current) setIsLoadingTickets(false);
    }
  }, [isLoggedIn, currentUser.id]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const accountName = currentUser.name && currentUser.name !== 'Tamu Sotoy' ? currentUser.name : '';
    if (!accountName) return;
    setFormData(prev => (prev.userName.trim() ? prev : { ...prev, userName: accountName }));
  }, [isLoggedIn, currentUser.name]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (!formData.userName.trim()) {
      nextErrors.userName = 'Nama wajib diisi.';
    }
    if (!formData.category) {
      nextErrors.category = 'Pilih kategori tiket.';
    }
    const subjectLength = formData.subject.trim().length;
    if (subjectLength < 5) {
      nextErrors.subject = 'Subjek minimal 5 karakter.';
    } else if (subjectLength > 120) {
      nextErrors.subject = 'Subjek maksimal 120 karakter.';
    }
    const messageLength = formData.message.trim().length;
    if (messageLength < 20) {
      nextErrors.message = 'Jelaskan kendalamu minimal 20 karakter.';
    } else if (formData.message.length > 2000) {
      nextErrors.message = 'Pesan maksimal 2000 karakter.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      setLoginModalOpen(true);
      showToast('Silakan masuk terlebih dahulu.');
      return;
    }
    if (!validate()) return;

    setIsSubmitting(true);
    let success = false;
    try {
      success = await submit({
        userName: formData.userName.trim(),
        category: formData.category as SupportTicketCategory,
        subject: formData.subject.trim(),
        message: formData.message.trim(),
      });
    } finally {
      if (isMountedRef.current) setIsSubmitting(false);
    }

    if (success) {
      setIsSubmitted(true);
      setFormData(prev => ({ ...prev, category: '', subject: '', message: '' }));
      showToast('Tiket bantuan berhasil dikirim!', 'success');
      loadTickets();
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]));
  };

  const loginNotice = (
    <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
      <p className="text-xs text-amber-200 leading-relaxed">
        Kamu harus masuk terlebih dahulu untuk mengirim tiket dan melihat riwayatnya.
      </p>
      <button
        type="button"
        onClick={() => setLoginModalOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF2E7E] text-slate-950 font-black text-xs hover:brightness-110 transition-all"
      >
        <LogIn className="w-4 h-4" />
        Masuk untuk mengirim tiket
      </button>
    </div>
  );

  const renderConfirmation = () => (
    <div className="text-center py-10">
      <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 className="w-10 h-10" />
      </div>
      <h2 className="text-2xl font-black text-white mb-4">Tiket Terkirim</h2>
      <p className="text-slate-400 mb-8 max-w-lg mx-auto leading-relaxed">
        Terima kasih. Redaksi akan membalas lewat email akunmu. Kamu juga akan mendapat notifikasi saat statusnya berubah.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={() => {
            setIsSubmitted(false);
            setTab('mine');
          }}
          className="bg-[#FF2E7E] text-slate-950 font-bold px-6 py-3 rounded-xl hover:brightness-110 transition-all"
        >
          Lihat Tiket Saya
        </button>
        <button
          onClick={() => navigateTo('faq-guide')}
          className="bg-slate-800 text-slate-200 font-bold px-6 py-3 rounded-xl hover:bg-slate-700 transition-all"
        >
          Kembali ke Panduan
        </button>
      </div>
    </div>
  );

  const renderForm = () => (
    <>
      {!isLoggedIn && loginNotice}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label htmlFor="userName" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Nama
            </label>
            <input
              type="text"
              id="userName"
              name="userName"
              required
              readOnly={!isLoggedIn}
              value={formData.userName}
              onChange={handleChange}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#FF2E7E] focus:ring-1 focus:ring-[#FF2E7E]"
              placeholder="Nama kamu"
            />
            {errors.userName && <p className="text-xs text-red-400">{errors.userName}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="category" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Kategori
            </label>
            <select
              id="category"
              name="category"
              required
              disabled={!isLoggedIn}
              value={formData.category}
              onChange={handleChange}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF2E7E] focus:ring-1 focus:ring-[#FF2E7E] disabled:opacity-60"
            >
              <option value="" disabled>
                Pilih kategori
              </option>
              {SUPPORT_TICKET_CATEGORIES.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.category && <p className="text-xs text-red-400">{errors.category}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="subject" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Subjek
          </label>
          <input
            type="text"
            id="subject"
            name="subject"
            required
            maxLength={120}
            readOnly={!isLoggedIn}
            value={formData.subject}
            onChange={handleChange}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#FF2E7E] focus:ring-1 focus:ring-[#FF2E7E]"
            placeholder="Ringkasan singkat kendalamu"
          />
          {errors.subject && <p className="text-xs text-red-400">{errors.subject}</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="message" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Pesan
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={6}
            readOnly={!isLoggedIn}
            value={formData.message}
            onChange={handleChange}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#FF2E7E] focus:ring-1 focus:ring-[#FF2E7E]"
            placeholder="Jelaskan kendalamu sejelas mungkin: apa yang terjadi, di halaman mana, dan langkah yang sudah dicoba..."
          />
          <div className="flex items-center justify-between gap-3">
            {errors.message ? (
              <p className="text-xs text-red-400">{errors.message}</p>
            ) : (
              <p className="text-[11px] text-slate-500">Minimal 20 karakter.</p>
            )}
            <span
              className={`text-[11px] font-mono ${formData.message.length > 2000 ? 'text-red-400' : 'text-slate-500'}`}
            >
              {formData.message.length}/2000
            </span>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={!isLoggedIn || isSubmitting}
            className="w-full py-4 rounded-xl bg-[#FF2E7E] text-slate-950 font-black text-sm hover:brightness-110 shadow-lg shadow-[#FF2E7E]/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? 'Mengirim...' : 'Kirim Tiket'}
          </button>
          <p className="text-center text-[11px] text-slate-500 mt-4">
            Balasan dikirim lewat email akunmu. Kamu bisa punya maksimal 3 tiket yang belum selesai.
          </p>
        </div>
      </form>
    </>
  );

  const renderMine = () => {
    if (!isLoggedIn) return loginNotice;

    if (isLoadingTickets) {
      return (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 text-[#FF2E7E] animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Memuat tiketmu...</p>
        </div>
      );
    }

    if (tickets.length === 0) {
      return (
        <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl">
          <Inbox className="w-10 h-10 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 font-bold">Belum ada tiket.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <p className="flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed">
          <Mail className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>Balasan dikirim lewat email, bukan di halaman ini. Halaman ini hanya menampilkan status tiketmu.</span>
        </p>
        {tickets.map(ticket => {
          const status = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
          const expanded = expandedIds.includes(ticket.id);
          return (
            <div key={ticket.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="text-sm font-black text-white break-words min-w-0">{ticket.subject}</h3>
                <span
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider shrink-0 ${status.className}`}
                >
                  {status.label}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500 font-medium mb-3">
                <Clock className="w-3 h-3" />
                <span>{ticket.date}</span>
                <span>&bull;</span>
                <span>{supportTicketCategoryLabel(ticket.category)}</span>
              </div>
              <p
                className={`text-sm text-slate-300 leading-relaxed whitespace-pre-wrap break-words ${
                  expanded ? '' : 'line-clamp-3'
                }`}
              >
                {ticket.message}
              </p>
              {ticket.message.length > 160 && (
                <button
                  type="button"
                  onClick={() => toggleExpanded(ticket.id)}
                  className="mt-2 text-xs font-bold text-[#FF2E7E] hover:underline"
                >
                  {expanded ? 'Sembunyikan' : 'Selengkapnya'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 lg:py-12">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FF2E7E]/10 border border-[#FF2E7E]/30 text-[#FF2E7E] text-xs font-black uppercase tracking-wider mb-4">
          <LifeBuoy className="w-3.5 h-3.5" />
          <span>Pusat Bantuan</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-4">Tiket Bantuan Sotoy Film</h1>
        <p className="text-slate-400 text-sm sm:text-base">
          Ceritakan kendalamu. Redaksi membalas lewat email yang terdaftar di akunmu.
        </p>
      </div>

      <div className="bg-[#171717] border border-slate-800 rounded-3xl p-6 sm:p-8">
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl mb-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => setTab('send')}
            className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              tab === 'send' ? 'bg-[#FF2E7E]/20 text-[#FF2E7E]' : 'text-slate-400 hover:text-white'
            }`}
          >
            Kirim Tiket
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('mine');
              setIsSubmitted(false);
            }}
            className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              tab === 'mine' ? 'bg-[#FF2E7E]/20 text-[#FF2E7E]' : 'text-slate-400 hover:text-white'
            }`}
          >
            Tiket Saya ({tickets.length})
          </button>
        </div>

        {tab === 'send' ? (isSubmitted ? renderConfirmation() : renderForm()) : renderMine()}
      </div>
    </div>
  );
};
