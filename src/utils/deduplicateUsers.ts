import type { UserProfile } from '../types';

const getLatestTimestamp = (user: UserProfile) => {
  const createdAt = Date.parse(user.created_at);
  const updatedAt = Date.parse(user.updated_at || '');
  return Math.max(
    Number.isFinite(createdAt) ? createdAt : 0,
    Number.isFinite(updatedAt) ? updatedAt : 0
  );
};

export const deduplicateUsersByEmail = (users: UserProfile[]) => {
  const usersByEmail = new Map<string, UserProfile>();

  users.forEach((user) => {
    const key = (user.email || user.auth_user_id || user.id).trim().toLowerCase();
    const existing = usersByEmail.get(key);
    if (!existing || getLatestTimestamp(user) > getLatestTimestamp(existing)) {
      usersByEmail.set(key, user);
    }
  });

  return [...usersByEmail.values()];
};
