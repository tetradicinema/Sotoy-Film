import {
  collection,
  doc,
  getDoc,
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
import type { WriterApplication } from '../types';

export interface WriterApplicationInput {
  userName: string;
  portfolioUrl?: string;
  sampleUrl?: string;
  topics?: string[];
  motivation: string;
}

const stripUndefined = <T extends Record<string, unknown>>(value: T): T => {
  const clean: Record<string, unknown> = {};
  Object.keys(value).forEach(key => {
    if (value[key] !== undefined) {
      clean[key] = value[key];
    }
  });
  return clean as T;
};

/**
 * Writer ("Jadi Penulis") application flow: the signed-in user's own
 * application, the admin review queue, and the approve/reject action.
 */
export const useWriterApplications = () => {
  const {
    currentUser,
    isLoggedIn,
    isEmailVerified,
    setLoginModalOpen,
    showToast,
    recordAuditLog,
    sendNotification,
  } = useApp();

  const getMine = async (): Promise<WriterApplication | null> => {
    if (!currentUser?.id) return null;
    const applicationId = `writer-${currentUser.id}`;
    try {
      const snapshot = await getDoc(doc(db, 'writerApplications', applicationId));
      if (!snapshot.exists()) return null;
      return { ...(snapshot.data() as WriterApplication), id: snapshot.id };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `writerApplications/${applicationId}`);
      return null;
    }
  };

  const submit = async (data: WriterApplicationInput): Promise<boolean> => {
    if (!isLoggedIn) {
      setLoginModalOpen(true);
      showToast('Silakan masuk terlebih dahulu.');
      return false;
    }
    if (!isEmailVerified) {
      showToast('Verifikasi email dulu untuk melakukan ini');
      return false;
    }

    const applicationId = `writer-${currentUser.id}`;
    const payload = stripUndefined({
      id: applicationId,
      userId: currentUser.id,
      userName: data.userName,
      userEmail: currentUser.email || '',
      portfolioUrl: data.portfolioUrl,
      sampleUrl: data.sampleUrl,
      topics: data.topics,
      motivation: data.motivation,
      status: 'pending' as const,
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      createdAt: Date.now(),
    });

    try {
      await setDoc(doc(db, 'writerApplications', applicationId), payload);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `writerApplications/${applicationId}`);
      return false;
    }
  };

  const listAll = async (): Promise<WriterApplication[]> => {
    try {
      const snapshot = await getDocs(
        query(collection(db, 'writerApplications'), orderBy('createdAt', 'desc'), limit(100))
      );
      return snapshot.docs.map(docSnap => ({
        ...(docSnap.data() as WriterApplication),
        id: docSnap.id,
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'writerApplications');
      return [];
    }
  };

  const countPending = async (): Promise<number> => {
    try {
      const snapshot = await getCountFromServer(
        query(collection(db, 'writerApplications'), where('status', '==', 'pending'))
      );
      return snapshot.data().count;
    } catch {
      return 0;
    }
  };

  const setStatus = async (
    id: string,
    userId: string,
    status: 'approved' | 'rejected'
  ): Promise<boolean> => {
    const approved = status === 'approved';
    try {
      await updateDoc(doc(db, 'writerApplications', id), {
        status,
        reviewedAt: Date.now(),
        reviewedBy: currentUser.id,
      });

      try {
        await recordAuditLog({
          action: approved ? 'writer_application_approved' : 'writer_application_rejected',
          targetId: userId,
          targetType: 'writer_application',
          details: approved
            ? `Menyetujui pendaftaran Penulis Sotoy untuk pengguna ${userId}.`
            : `Menolak pendaftaran Penulis Sotoy untuk pengguna ${userId}.`,
          metadata: { applicationId: id, status },
        });
      } catch (auditError) {
        console.warn('[useWriterApplications] Failed to record writer application audit log:', auditError);
      }

      try {
        await sendNotification({
          userId,
          type: 'account_status',
          title: approved ? 'Pendaftaran Penulis Disetujui' : 'Pendaftaran Penulis Belum Diterima',
          message: approved
            ? 'Redaksi menyetujui pendaftaranmu. Kami akan menghubungi lewat email.'
            : 'Pendaftaran penulismu belum dapat kami terima saat ini.',
          targetView: 'writer-application',
          sender: {
            id: 'system-admin',
            name: 'Redaksi Sotoy Film',
            avatar: '/v3_favicon%20512%20sotoyfilm.PNG',
            handle: '@redaksi',
          },
        });
      } catch (notificationError) {
        console.warn('[useWriterApplications] Failed to send writer application notification:', notificationError);
      }

      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `writerApplications/${id}`);
      return false;
    }
  };

  return {
    getMine,
    submit,
    listAll,
    countPending,
    setStatus,
  };
};
