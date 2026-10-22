import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize or reuse Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Configure Google Auth Provider with least-privilege Google Drive file scope
export const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file'
];

const provider = new GoogleAuthProvider();
GOOGLE_DRIVE_SCOPES.forEach((scope) => {
  provider.addScope(scope);
});
// Set custom parameters to ensure consent and account selection when needed
provider.setCustomParameters({
  prompt: 'select_account'
});

// Cache the access token strictly in memory (NEVER in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;
let isSigningIn = false;

type AuthChangeListener = (user: User | null, token: string | null) => void;
const authListeners: Set<AuthChangeListener> = new Set();

const notifyAuthListeners = () => {
  authListeners.forEach((listener) => {
    try {
      listener(cachedUser, cachedAccessToken);
    } catch (err) {
      console.error('Error notifying auth listener', err);
    }
  });
};

export const subscribeToAuth = (listener: AuthChangeListener): (() => void) => {
  authListeners.add(listener);
  // Initial fire
  listener(cachedUser, cachedAccessToken);
  return () => {
    authListeners.delete(listener);
  };
};

// Monitor Firebase auth state
onAuthStateChanged(auth, async (user) => {
  cachedUser = user;
  if (!user) {
    cachedAccessToken = null;
  }
  notifyAuthListeners();
});

/**
 * Trigger official Google Sign-In with Google Drive scopes
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Não foi possível obter o token de acesso do Google.');
    }

    cachedAccessToken = credential.accessToken;
    cachedUser = result.user;
    notifyAuthListeners();
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign In error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Returns the currently cached in-memory access token
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Returns current authenticated Google user
 */
export const getCurrentGoogleUser = (): User | null => {
  return cachedUser || auth.currentUser;
};

/**
 * Disconnect/Sign out from Google
 */
export const googleSignOut = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
  cachedUser = null;
  notifyAuthListeners();
};
