import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const configAny = firebaseConfig as any;
export const db = configAny.firestoreDatabaseId && configAny.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, configAny.firestoreDatabaseId)
  : getFirestore(app);

const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async (): Promise<User | null> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
      return null;
    }
    console.error('Erro de autenticação Google:', error);
    throw error;
  }
};

export const logoutUser = async () => {
  await signOut(auth);
};

export const listenToAuth = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Save a key-value document under users/{userId}/appData/{key}
export const saveUserDataToCloud = async (userId: string, key: string, data: any) => {
  if (!userId || !key) return;
  try {
    const docRef = doc(db, 'users', userId, 'appData', key);
    await setDoc(docRef, { payload: data, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.error(`Error saving ${key} to Firestore:`, err);
    window.dispatchEvent(new CustomEvent('bia_cloud_sync_error', {
      detail: { provider: 'firebase', key, error: err }
    }));
  }
};

export const loadUserDataFromCloud = async (userId: string, key: string) => {
  if (!userId || !key) return null;
  try {
    const snapshot = await getDoc(doc(db, 'users', userId, 'appData', key));
    return snapshot.exists() ? snapshot.data()?.payload ?? null : null;
  } catch (err) {
    console.error(`Error loading ${key} from Firestore:`, err);
    return null;
  }
};

export const savePlatformDataToCloud = async (key: string, data: any) => {
  if (!key) return;
  try {
    await setDoc(doc(db, 'system', key), { payload: data, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.error(`Error saving system/${key} to Firestore:`, err);
    window.dispatchEvent(new CustomEvent('bia_cloud_sync_error', {
      detail: { provider: 'firebase', key: `system/${key}`, error: err }
    }));
  }
};

export const loadPlatformDataFromCloud = async (key: string) => {
  if (!key) return null;
  try {
    const snapshot = await getDoc(doc(db, 'system', key));
    return snapshot.exists() ? snapshot.data()?.payload ?? null : null;
  } catch (err) {
    console.error(`Error loading system/${key} from Firestore:`, err);
    return null;
  }
};

// Listen to real-time changes from Firestore for a specific data key
export const subscribeToUserDataFromCloud = (
  userId: string,
  key: string,
  onData: (data: any) => void,
  onNotFound?: () => void
) => {
  if (!userId || !key) return () => {};
  const docRef = doc(db, 'users', userId, 'appData', key);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.data();
        if (val && val.payload !== undefined) {
          onData(val.payload);
        }
      } else if (onNotFound) {
        onNotFound();
      }
    },
    (err) => {
      console.error(`Error listening to ${key} from Firestore:`, err);
    }
  );
};
