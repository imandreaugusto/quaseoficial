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

const pendingSaveTimers: Record<string, NodeJS.Timeout> = {};

// Helper to save data to cloud with a short debounce to avoid spamming writes
export const syncToCloud = (userId: string | null | undefined, key: string, data: any) => {
  if (!userId) return;
  if (pendingSaveTimers[key]) {
    clearTimeout(pendingSaveTimers[key]);
  }
  pendingSaveTimers[key] = setTimeout(() => {
    saveUserDataToCloud(userId, key, data);
  }, 500);
};

export interface CloudSyncState {
  user: User | null;
  isSyncing: boolean;
  lastSyncedAt: string | null;
}
