import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  indexedDBLocalPersistence,
  initializeAuth,
  signInWithCredential,
  signInWithPopup,
  signOut,
  type Auth,
  type UserCredential,
} from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

function createFirebaseAuth(): Auth {
  if (Capacitor.isNativePlatform()) {
    try {
      return initializeAuth(app, {
        persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      });
    } catch {
      return getAuth(app);
    }
  }
  return getAuth(app);
}

export const auth = createFirebaseAuth();
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

let socialLoginInitialized = false;

async function ensureNativeSocialLoginInitialized(): Promise<void> {
  if (socialLoginInitialized) return;
  await SocialLogin.initialize({
    google: {
      webClientId: firebaseConfig.oAuthClientId,
      mode: 'online',
      skipAuthOnlyAuthorizationAfterSignIn: true,
    },
  });
  socialLoginInitialized = true;
}

export async function signInWithGoogleAccount(): Promise<UserCredential> {
  if (Capacitor.isNativePlatform()) {
    await ensureNativeSocialLoginInitialized();
    const res = await SocialLogin.login({
      provider: 'google',
      options: {
        scopes: ['email', 'profile'],
        style: 'standard',
      },
    });
    const idToken =
      res.result.responseType === 'online' ? res.result.idToken : null;
    if (!idToken) {
      throw new Error(
        'Google Sign-In did not return an ID token. Please verify that your Android app package (com.wyndhamganj.wdm) and SHA-1 fingerprint are registered in Firebase Console.'
      );
    }
    const credential = GoogleAuthProvider.credential(idToken);
    return signInWithCredential(auth, credential);
  }
  return signInWithPopup(auth, googleProvider);
}

export async function signOutAccount(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await ensureNativeSocialLoginInitialized();
      await SocialLogin.logout({ provider: 'google' });
    } catch {
      // Ignore native logout errors when already signed out
    }
  }
  await signOut(auth);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration. Firestore client is offline.');
      return false;
    }
    // Permission denied on test/connection still confirms live connectivity to Firestore server
    return true;
  }
}

testConnection();
