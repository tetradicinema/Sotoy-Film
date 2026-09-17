import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserRole } from '../types';

export interface AuthorProfile {
  id: string;
  name: string;
  avatar: string;
  role: UserRole;
}

/**
 * One-time migration utility:
 * Iterates through all articles in Firestore, updates their `authorId` to active admin/writer accounts,
 * removes all legacy 'Dinda Redaksi' or mock author fields, and maps them to dynamic profile data from the users collection.
 */
export async function migrateArticlesAuthor(targetUid?: string): Promise<{ success: boolean; count: number; message: string }> {
  try {
    let activeUid: string = targetUid || '';
    
    // Find an active admin or writer in users collection if targetUid not supplied
    if (!activeUid) {
      const usersSnap = await getDocs(collection(db, 'users'));
      const users = usersSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      const activeUser = users.find((u: any) => u.role === 'admin' || u.role === 'penulis_sotoy') || users[0];
      if (activeUser && activeUser.id) {
        activeUid = activeUser.id;
      } else {
        activeUid = 'system-redaksi';
      }
    }

    const finalUid: string = activeUid || 'system-redaksi';

    let authorData: AuthorProfile = {
      id: finalUid,
      name: 'Tim Redaksi',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
      role: 'admin' as UserRole,
    };

    if (finalUid !== 'system-redaksi') {
      const userDocRef = doc(db, 'users', finalUid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const u = userDocSnap.data();
        authorData = {
          id: finalUid,
          name: u.name || u.displayName || 'Tim Redaksi',
          avatar: u.avatar || u.avatarURL || u.photoURL || authorData.avatar,
          role: u.role || 'penulis_sotoy',
        };
      }
    }

    const articlesSnap = await getDocs(collection(db, 'articles'));
    let updatedCount = 0;

    const updates = articlesSnap.docs.map(async (docSnap) => {
      const data = docSnap.data();
      const needsUpdate =
        !data.authorId ||
        data.authorId === 'system-redaksi' ||
        data.authorId === '0PCmaBvJrzeaQgpf3sSTC4mnsh02' ||
        !data.author ||
        (data.author?.name && (data.author.name.includes('Dinda') || data.author.name.includes('Chief Admin')));

      if (needsUpdate) {
        updatedCount++;
        await updateDoc(doc(db, 'articles', docSnap.id), {
          authorId: authorData.id,
          author: {
            id: authorData.id,
            name: authorData.name,
            avatar: authorData.avatar,
            role: authorData.role,
          },
        });
      }
    });

    await Promise.all(updates);

    return {
      success: true,
      count: updatedCount,
      message: `Migrasi selesai: ${updatedCount} artikel telah diperbarui ke profil ${authorData.name} (${authorData.id}).`,
    };
  } catch (error) {
    console.error('[Migration Data Error]', error);
    return {
      success: false,
      count: 0,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
