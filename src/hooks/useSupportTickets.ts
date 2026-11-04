import {
  collection,
  doc,
  getDocs,
  getCountFromServer,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useApp } from '../context/AppContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import type { SupportTicket, SupportTicketCategory, SupportTicketStatus } from '../types';

export interface SupportTicketInput {
  userName: string;
  category: SupportTicketCategory;
  subject: string;
  message: string;
}

export const MAX_ACTIVE_TICKETS = 3;

export const SUPPORT_TICKET_CATEGORIES: { value: SupportTicketCategory; label: string }[] = [
  { value: 'akun', label: 'Akun & Login' },
  { value: 'ulasan', label: 'Ulasan & Skor' },
  { value: 'teknis', label: 'Kendala Teknis' },
  { value: 'konten', label: 'Laporan Konten' },
  { value: 'lainnya', label: 'Lainnya' },
];

export const supportTicketCategoryLabel = (value: SupportTicketCategory): string =>
  SUPPORT_TICKET_CATEGORIES.find(option => option.value === value)?.label || value;

/**
 * One-way support ticket flow: the signed-in user's own tickets, the admin
 * inbox, and the status change that notifies the user. Replies to tickets
 * happen by email, not inside the site.
 */
export const useSupportTickets = () => {
  const {
    currentUser,
    isLoggedIn,
    isEmailVerified,
    setLoginModalOpen,
    showToast,
    recordAuditLog,
    sendNotification,
  } = useApp();

  const reportError = (error: unknown, op: OperationType, path: string) => {
    try {
      handleFirestoreError(error, op, path);
    } catch {
      // already logged; never let it escape
    }
  };

  // No orderBy here on purpose: equality on userId plus orderBy on createdAt
  // would need a composite index. Sort in JavaScript instead.
  const listMine = async (): Promise<SupportTicket[]> => {
    if (!isLoggedIn || !currentUser?.id) return [];
    try {
      const snapshot = await getDocs(
        query(collection(db, 'supportTickets'), where('userId', '==', currentUser.id), limit(50))
      );
      return snapshot.docs
        .map(docSnap => ({ ...(docSnap.data() as SupportTicket), id: docSnap.id }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (error) {
      reportError(error, OperationType.LIST, 'supportTickets');
      return [];
    }
  };

  const submit = async (data: SupportTicketInput): Promise<boolean> => {
    if (!isLoggedIn) {
      setLoginModalOpen(true);
      showToast('Silakan masuk terlebih dahulu.');
      return false;
    }
    if (!isEmailVerified) {
      showToast('Verifikasi email dulu untuk melakukan ini');
      return false;
    }

    const existingTickets = await listMine();
    const activeCount = existingTickets.filter(ticket => ticket.status !== 'resolved').length;
    if (activeCount >= MAX_ACTIVE_TICKETS) {
      showToast(
        `Kamu masih punya ${MAX_ACTIVE_TICKETS} tiket yang belum selesai. Tunggu salah satunya selesai dulu.`
      );
      return false;
    }

    const ticketId = `ticket-${currentUser.id}-${Date.now().toString(36)}`;
    const payload = {
      id: ticketId,
      userId: currentUser.id,
      userName: data.userName,
      userEmail: currentUser.email || '',
      category: data.category,
      subject: data.subject,
      message: data.message,
      status: 'open' as const,
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      createdAt: Date.now(),
    };

    try {
      await setDoc(doc(db, 'supportTickets', ticketId), payload);
      return true;
    } catch (error) {
      reportError(error, OperationType.CREATE, `supportTickets/${ticketId}`);
      showToast('Gagal mengirim tiket. Coba lagi beberapa saat.', 'error');
      return false;
    }
  };

  const listAll = async (): Promise<SupportTicket[]> => {
    try {
      const snapshot = await getDocs(
        query(collection(db, 'supportTickets'), orderBy('createdAt', 'desc'), limit(100))
      );
      return snapshot.docs.map(docSnap => ({
        ...(docSnap.data() as SupportTicket),
        id: docSnap.id,
      }));
    } catch (error) {
      reportError(error, OperationType.LIST, 'supportTickets');
      return [];
    }
  };

  const countOpen = async (): Promise<number> => {
    try {
      const snapshot = await getCountFromServer(
        query(collection(db, 'supportTickets'), where('status', '==', 'open'))
      );
      return snapshot.data().count;
    } catch {
      return 0;
    }
  };

  const setStatus = async (ticket: SupportTicket, status: SupportTicketStatus): Promise<boolean> => {
    try {
      await updateDoc(doc(db, 'supportTickets', ticket.id), {
        status,
        updatedAt: Date.now(),
        handledBy: currentUser.id,
      });

      try {
        await recordAuditLog({
          action: 'support_ticket_status_changed',
          targetId: ticket.userId,
          targetType: 'support_ticket',
          details: `Mengubah status tiket bantuan "${ticket.subject}" menjadi ${status}.`,
          metadata: { ticketId: ticket.id, status },
        });
      } catch (auditError) {
        console.warn('[useSupportTickets] Failed to record support ticket audit log:', auditError);
      }

      if (status === 'in_progress' || status === 'resolved') {
        try {
          await sendNotification({
            userId: ticket.userId,
            type: 'account_status',
            title: status === 'resolved' ? 'Tiket Bantuan Selesai' : 'Tiket Bantuan Sedang Diproses',
            message:
              status === 'resolved'
                ? `Tiket "${ticket.subject}" sudah selesai ditangani. Cek emailmu untuk balasan dari redaksi.`
                : `Tiket "${ticket.subject}" sedang ditangani redaksi. Balasan dikirim lewat email.`,
            targetView: 'support-ticket',
            sender: {
              id: 'system-admin',
              name: 'Redaksi Sotoy Film',
              avatar: '/v3_favicon%20512%20sotoyfilm.PNG',
              handle: '@redaksi',
            },
          });
        } catch (notificationError) {
          console.warn('[useSupportTickets] Failed to send support ticket notification:', notificationError);
        }
      }

      return true;
    } catch (error) {
      reportError(error, OperationType.UPDATE, `supportTickets/${ticket.id}`);
      return false;
    }
  };

  return {
    listMine,
    submit,
    listAll,
    countOpen,
    setStatus,
  };
};
