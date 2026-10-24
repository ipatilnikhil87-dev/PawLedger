import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';

export const firebaseConfig = {
  apiKey: 'AIzaSyCuHBoxlIV1U1XMRQ9ChouMUYrN6GKjYRA',
  authDomain: 'pawledger-c738e.firebaseapp.com',
  projectId: 'pawledger-c738e',
  storageBucket: 'pawledger-c738e.firebasestorage.app',
  messagingSenderId: '701521411321',
  appId: '1:701521411321:web:9c006c8dd3aacaa7a13628',
  measurementId: 'G-CF13R42WG5',
};

// Initialize Firebase only once and reuse the existing app instance if one exists
export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);

// Google Auth Provider configured to always allow the user to select any Google/Gmail account
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Map common Firebase Authentication error codes to helpful user messages
export function formatFirebaseError(error: any): string {
  if (!error) return 'An unexpected authentication error occurred.';
  const code = error.code || '';

  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'The Google sign-in window was closed before completing authentication. Please try again.';
    case 'auth/popup-blocked':
      return 'The Google sign-in popup was blocked by your browser. Please allow popups for this site and try again.';
    case 'auth/cancelled-popup-request':
      return 'Only one sign-in popup request can be active at a time.';
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not enabled in Firebase Console. Please enable the "Google" provider under Firebase Console -> Authentication -> Sign-in method.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for OAuth operations in Firebase. Please ensure "localhost" is listed under Firebase Authentication -> Settings -> Authorized domains.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using a different sign-in method.';
    case 'auth/network-request-failed':
      return 'Network error connecting to Google Authentication. Please check your internet connection.';
    case 'auth/internal-error':
      return 'Firebase internal error occurred during authentication. Please retry.';
    default:
      return error.message || 'Google authentication failed. Please try again.';
  }
}

export {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
};
export type { User };
