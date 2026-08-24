import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Provider with Full Classroom Scopes
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/classroom.courses.readonly');
provider.addScope('https://www.googleapis.com/auth/classroom.coursework.me.readonly');
provider.addScope('https://www.googleapis.com/auth/classroom.coursework.students.readonly');
provider.addScope('https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly');
provider.addScope('https://www.googleapis.com/auth/classroom.announcements.readonly');
provider.addScope('https://www.googleapis.com/auth/classroom.rosters.readonly');
provider.addScope('https://www.googleapis.com/auth/classroom.profile.emails');
provider.addScope('https://www.googleapis.com/auth/classroom.profile.photos');
provider.addScope('https://www.googleapis.com/auth/meetings.space.created');
provider.setCustomParameters({ prompt: 'select_account' });

// Provider with Basic Scopes (Never gets blocked by Google OAuth)
const basicProvider = new GoogleAuthProvider();
basicProvider.setCustomParameters({ prompt: 'select_account' });

export const setCachedToken = (token: string) => {
  sessionStorage.setItem('classroom_access_token', token);
  localStorage.setItem('classroom_access_token', token);
};

export const getAccessToken = (): string | null => {
  return sessionStorage.getItem('classroom_access_token') || localStorage.getItem('classroom_access_token');
};

export const clearCachedToken = () => {
  sessionStorage.removeItem('classroom_access_token');
  localStorage.removeItem('classroom_access_token');
};

// Listen for redirect results on page startup
getRedirectResult(auth)
  .then((result) => {
    if (result) {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setCachedToken(credential.accessToken);
      }
    }
  })
  .catch((err) => {
    console.error('Erro no resultado do login via redirect:', err);
  });

export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    const token = getAccessToken();
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user, token);
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (useBasicOnly = false): Promise<{ user: User; accessToken: string | null } | null> => {
  try {
    let result;
    const activeProvider = useBasicOnly ? basicProvider : provider;
    
    try {
      result = await signInWithPopup(auth, activeProvider);
    } catch (popupError: any) {
      console.warn('signInWithPopup falhou, tentando básico ou redirect:', popupError);
      
      // If full scope blocked, try basic login without restricted scopes
      if (!useBasicOnly && (popupError?.code === 'auth/access-denied' || popupError?.code === 'auth/operation-not-allowed' || popupError?.message?.includes('blocked'))) {
        console.warn('Escopos do Classroom bloqueados pelo Google. Tentando Login Básico Google...');
        result = await signInWithPopup(auth, basicProvider);
      } else if (
        popupError?.code === 'auth/popup-blocked' ||
        popupError?.code === 'auth/popup-closed-by-user' ||
        popupError?.code === 'auth/cancelled-popup-request'
      ) {
        await signInWithRedirect(auth, activeProvider);
        return null;
      } else {
        throw popupError;
      }
    }

    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken || null;
    if (accessToken) {
      setCachedToken(accessToken);
    }
    return { user: result.user, accessToken };
  } catch (error: any) {
    console.error('Erro no googleSignIn:', error);
    throw error;
  }
};

export const logout = async () => {
  await auth.signOut();
  clearCachedToken();
};


