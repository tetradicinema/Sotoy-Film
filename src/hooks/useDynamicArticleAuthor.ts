import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';

export interface DynamicAuthor {
  id: string;
  name: string;
  displayName: string;
  avatar: string;
  avatarURL: string;
  role: UserRole;
  roleTitle?: string;
  customBadge?: string;
  roleBadge?: string;
  bio?: string;
  articleCount: number;
  loading: boolean;
}

export const FALLBACK_AUTHOR: DynamicAuthor = {
  id: 'system-redaksi',
  name: 'Tim Redaksi',
  displayName: 'Tim Redaksi',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  avatarURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  role: 'admin' as UserRole,
  roleTitle: 'Tim Editorial',
  customBadge: 'Official Editorial',
  roleBadge: 'Redaksi',
  bio: 'Redaksi Resmi Sotoy Film',
  articleCount: 0,
  loading: false,
};

export function useDynamicArticleAuthor(authorId?: string, initialData?: any): DynamicAuthor {
  const { userProfilesCache, cacheUserProfile, allUsers, publishedArticles } = useApp();

  // Calculate article count for given authorId
  const computedArticleCount = authorId
    ? (publishedArticles || []).filter(a => a.authorId === authorId || a.author?.id === authorId).length
    : 0;

  const getBadgeForRole = (role?: UserRole, customBadge?: string): string | undefined => {
    if (customBadge) return customBadge;
    if (role === 'admin') return 'Redaktur Khusus';
    if (role === 'penulis_sotoy') return 'Top Writer';
    if (role === 'si_paling_sotoy') return 'Verified Critic';
    return undefined;
  };

  const getInitialState = (): DynamicAuthor => {
    if (!authorId || authorId === 'system-redaksi') {
      return {
        ...FALLBACK_AUTHOR,
        articleCount: (publishedArticles || []).length || 5,
      };
    }
    if (userProfilesCache && userProfilesCache[authorId]) {
      const cached = userProfilesCache[authorId];
      return {
        id: cached.id || authorId,
        name: cached.name || cached.displayName || 'Tim Redaksi',
        displayName: cached.displayName || cached.name || 'Tim Redaksi',
        avatar: cached.avatar || cached.avatarURL || FALLBACK_AUTHOR.avatar,
        avatarURL: cached.avatarURL || cached.avatar || FALLBACK_AUTHOR.avatar,
        role: cached.role || 'warga_sotoy',
        roleTitle: cached.roleTitle,
        customBadge: cached.customBadge || getBadgeForRole(cached.role, cached.badge),
        roleBadge: cached.roleBadge || cached.customBadge || getBadgeForRole(cached.role),
        bio: cached.bio,
        articleCount: computedArticleCount,
        loading: false,
      };
    }
    const found = allUsers?.find(u => u.id === authorId);
    if (found) {
      return {
        id: found.id,
        name: found.name || 'Tim Redaksi',
        displayName: found.name || 'Tim Redaksi',
        avatar: found.avatar || FALLBACK_AUTHOR.avatar,
        avatarURL: found.avatar || FALLBACK_AUTHOR.avatar,
        role: found.role || 'warga_sotoy',
        roleTitle: found.roleTitle,
        customBadge: found.customBadge || getBadgeForRole(found.role),
        roleBadge: found.roleBadge || getBadgeForRole(found.role),
        bio: found.bio,
        articleCount: computedArticleCount,
        loading: false,
      };
    }
    if (initialData?.name && !initialData.name.includes('Dinda') && !initialData.name.includes('Chief Admin')) {
      return {
        id: authorId,
        name: initialData.name,
        displayName: initialData.displayName || initialData.name,
        avatar: initialData.avatar || initialData.avatarURL || FALLBACK_AUTHOR.avatar,
        avatarURL: initialData.avatarURL || initialData.avatar || FALLBACK_AUTHOR.avatar,
        role: initialData.role || 'warga_sotoy',
        customBadge: getBadgeForRole(initialData.role),
        articleCount: computedArticleCount,
        loading: false,
      };
    }
    return { ...FALLBACK_AUTHOR, id: authorId, articleCount: computedArticleCount, loading: true };
  };

  const [author, setAuthor] = useState<DynamicAuthor>(getInitialState);

  useEffect(() => {
    if (!authorId || authorId === 'system-redaksi') {
      setAuthor({
        ...FALLBACK_AUTHOR,
        articleCount: (publishedArticles || []).length || 5,
      });
      return;
    }

    if (userProfilesCache && userProfilesCache[authorId]) {
      const cached = userProfilesCache[authorId];
      setAuthor({
        id: cached.id || authorId,
        name: cached.name || cached.displayName || 'Tim Redaksi',
        displayName: cached.displayName || cached.name || 'Tim Redaksi',
        avatar: cached.avatar || cached.avatarURL || FALLBACK_AUTHOR.avatar,
        avatarURL: cached.avatarURL || cached.avatar || FALLBACK_AUTHOR.avatar,
        role: cached.role || 'warga_sotoy',
        roleTitle: cached.roleTitle,
        customBadge: cached.customBadge || getBadgeForRole(cached.role, cached.badge),
        roleBadge: cached.roleBadge || cached.customBadge || getBadgeForRole(cached.role),
        bio: cached.bio,
        articleCount: computedArticleCount,
        loading: false,
      });
      return;
    }

    const userDocRef = doc(db, 'users', authorId);
    const unsubscribe = onSnapshot(
      userDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const u = snapshot.data();
          const profileData: DynamicAuthor = {
            id: snapshot.id,
            name: u.name || u.displayName || 'Tim Redaksi',
            displayName: u.displayName || u.name || 'Tim Redaksi',
            avatar: u.avatar || u.avatarURL || u.photoURL || FALLBACK_AUTHOR.avatar,
            avatarURL: u.avatarURL || u.avatar || u.photoURL || FALLBACK_AUTHOR.avatar,
            role: u.role || 'warga_sotoy',
            roleTitle: u.roleTitle || u.role,
            customBadge: u.customBadge || u.badge || getBadgeForRole(u.role),
            roleBadge: u.roleBadge || u.customBadge || getBadgeForRole(u.role),
            bio: u.bio,
            articleCount: computedArticleCount,
            loading: false,
          };
          setAuthor(profileData);
          if (cacheUserProfile) {
            cacheUserProfile(authorId, profileData);
          }
        } else {
          setAuthor({ ...FALLBACK_AUTHOR, id: authorId, articleCount: computedArticleCount, loading: false });
        }
      },
      (err) => {
        console.warn(`[useDynamicArticleAuthor] Error loading user ${authorId}:`, err);
        setAuthor({ ...FALLBACK_AUTHOR, id: authorId, articleCount: computedArticleCount, loading: false });
      }
    );

    return () => unsubscribe();
  }, [authorId, userProfilesCache, publishedArticles, computedArticleCount]);

  return author;
}
