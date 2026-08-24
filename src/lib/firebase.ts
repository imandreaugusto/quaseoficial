import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
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
