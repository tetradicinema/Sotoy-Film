import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
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

// Global in-flight promises map to deduplicate concurrent requests for the same authorId across components
const inFlightRequests = new Map<string, Promise<DynamicAuthor | null>>();

// Module-level cache of authorIds already looked up (including ones that returned null = "does not exist")
// Ensures missing author costs at most one getDoc per session instead of one per card mount
const authorLookupCache = new Map<string, DynamicAuthor | null>();

export function useDynamicArticleAuthor(authorId?: string, initialData?: any): DynamicAuthor {
  const { userProfilesCache, cacheUserProfile, allUsers, publishedArticles } = useApp();

  // Compute article count dynamically without tying author profile fetching to publishedArticles state
  const computedArticleCount = (!authorId || authorId === 'system-redaksi')
    ? ((publishedArticles || []).length || 5)
    : (publishedArticles || []).filter(a => a.authorId === authorId || a.author?.id === authorId).length;

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
        articleCount: computedArticleCount,
      };
    }
    if (authorLookupCache.has(authorId)) {
      const cached = authorLookupCache.get(authorId);
      if (cached) {
        return {
          ...cached,
          articleCount: computedArticleCount,
          loading: false,
        };
      }
      return {
        ...FALLBACK_AUTHOR,
        id: authorId,
        articleCount: computedArticleCount,
        loading: false,
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
        articleCount: 0,
        loading: false,
      });
      return;
    }

    // 0. Check module-level lookup cache (including "does not exist")
    if (authorLookupCache.has(authorId)) {
      const cached = authorLookupCache.get(authorId);
      if (cached) {
        setAuthor({ ...cached, articleCount: 0, loading: false });
      } else {
        setAuthor({ ...FALLBACK_AUTHOR, id: authorId, articleCount: 0, loading: false });
      }
      return;
    }

    // 1. Check local cache
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
        articleCount: 0,
        loading: false,
      });
      return;
    }

    // 2. Check allUsers list
    const found = allUsers?.find(u => u.id === authorId);
    if (found) {
      setAuthor({
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
        articleCount: 0,
        loading: false,
      });
      return;
    }

    // 3. One-time fetch via getDoc with in-flight deduplication
    let isCancelled = false;
    let promise = inFlightRequests.get(authorId);

    if (!promise) {
      promise = (async () => {
        try {
          const userDocRef = doc(db, 'users', authorId);
          const snapshot = await getDoc(userDocRef);
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
              articleCount: 0,
              loading: false,
            };
            return profileData;
          }
        } catch (err) {
          console.warn(`[useDynamicArticleAuthor] Error loading user ${authorId}:`, err);
        }
        return null;
      })();

      inFlightRequests.set(authorId, promise);
    }

    promise.then((profileData) => {
      inFlightRequests.delete(authorId);
      // Cache result in module-level cache (null means "does not exist")
      authorLookupCache.set(authorId, profileData);
      if (isCancelled) return;
      if (profileData) {
        setAuthor(profileData);
        if (cacheUserProfile) {
          cacheUserProfile(authorId, profileData);
        }
      } else {
        setAuthor({ ...FALLBACK_AUTHOR, id: authorId, articleCount: 0, loading: false });
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [authorId]);

  return {
    ...author,
    articleCount: computedArticleCount,
  };
}
