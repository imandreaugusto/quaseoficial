import { User } from 'firebase/auth';
import { 
  auth, 
  listenToAuth, 
  loginWithGoogle, 
  logoutUser, 
  saveUserDataToCloud, 
  subscribeToUserDataFromCloud 
} from './firebase';

export { auth, listenToAuth, loginWithGoogle, logoutUser };

const pendingSavePromises: Record<string, Promise<void>> = {};

export const syncToCloud = (userId: string | null | undefined, key: string, data: any) => {
  if (!userId || !key) return;

  const previousSave = pendingSavePromises[key] || Promise.resolve();
  const currentSave = previousSave
    .catch(() => undefined)
    .then(() => saveUserDataToCloud(userId, key, data));
  pendingSavePromises[key] = currentSave;
};

export interface CloudSyncState {
  user: User | null;
  isSyncing: boolean;
  lastSyncedAt: string | null;
}
