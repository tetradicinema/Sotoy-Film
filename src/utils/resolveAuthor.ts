import { User, UserRole } from '../types';

export interface EmbeddedAuthorLike {
  id?: string;
  name?: string;
  handle?: string;
  avatar?: string;
  role?: UserRole | string;
}

/**
 * Resolves live user profile data for embedded author/user objects at render time.
 * If the user exists in `usersById`, returns the live name, handle, avatar, and role.
 * Otherwise returns the original embedded values unchanged as fallback.
 *
 * Client-side only; performs zero Firestore writes.
 */
export function resolveAuthor<T extends EmbeddedAuthorLike>(
  embedded: T | undefined | null,
  usersById: Map<string, User> | Record<string, User>
): T | undefined | null {
  if (!embedded) {
    return embedded;
  }

  const liveUser = embedded.id
    ? (usersById instanceof Map ? usersById.get(embedded.id) : usersById[embedded.id])
    : undefined;

  if (!liveUser) {
    return embedded;
  }

  return {
    ...embedded,
    name: liveUser.name || embedded.name,
    handle: liveUser.handle || embedded.handle,
    avatar: liveUser.avatar || embedded.avatar,
    role: (liveUser.role as any) || embedded.role,
  };
}
