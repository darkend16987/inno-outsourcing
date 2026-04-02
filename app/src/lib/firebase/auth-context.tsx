'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  sendPasswordResetEmail,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  signInWithCredential,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import type { UserProfile, UserRole } from '@/types';

interface AuthState {
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, extraData: Partial<UserProfile>) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithPhone: (phoneNumber: string, recaptchaContainerId: string) => Promise<string>;
  verifyOTP: (verificationId: string, otp: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

// Helper: Set server-side session cookie via API
async function setServerSession(user: FirebaseUser, profile: UserProfile) {
  const idToken = await user.getIdToken();
  await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idToken,
      role: profile.role,
      uid: profile.uid,
      displayName: profile.displayName,
    }),
  });
}

async function clearServerSession() {
  await fetch('/api/auth/session', { method: 'DELETE' });
}

// Helper: Create or update user profile in Firestore
async function ensureUserProfile(user: FirebaseUser, extraData?: Partial<UserProfile>): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    return { uid: user.uid, ...snap.data() } as UserProfile;
  }

  // SECURITY: Strip privileged roles from client-provided extraData.
  // Public registration can ONLY create 'freelancer' accounts.
  // Admin, jobmaster, accountant roles must be assigned via backend/Firebase Console.
  const PRIVILEGED_ROLES: string[] = ['admin', 'jobmaster', 'accountant'];
  const sanitizedExtra = { ...extraData };
  if (sanitizedExtra.role && PRIVILEGED_ROLES.includes(sanitizedExtra.role)) {
    console.warn(`[SECURITY] Blocked attempt to register with privileged role: ${sanitizedExtra.role}`);
    sanitizedExtra.role = 'freelancer' as UserRole;
  }

  // Create new profile
  const newProfile: Partial<UserProfile> = {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || sanitizedExtra?.displayName || '',
    photoURL: user.photoURL || '',
    phone: user.phoneNumber || '',
    role: 'freelancer' as UserRole,
    status: 'active',
    specialties: [],
    experience: 0,
    software: [],
    selfAssessedLevel: 'L1',
    currentLevel: 'L1',
    bio: '',
    kycCompleted: false,
    idNumber: '',
    idIssuedDate: '',
    idIssuedPlace: '',
    address: '',
    bankAccountNumber: '',
    bankName: '',
    bankBranch: '',
    taxId: '',
    stats: {
      completedJobs: 0,
      totalEarnings: 0,
      avgRating: 0,
      ratingCount: 0,
      onTimeRate: 100,
      currentMonthEarnings: 0,
    },
    ...sanitizedExtra,
  };

  // Final safety: Ensure role is definitely freelancer for new registrations
  newProfile.role = 'freelancer' as UserRole;

  await setDoc(userRef, {
    ...newProfile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return newProfile as UserProfile;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    userProfile: null,
    loading: true,
    error: null,
  });

  // Listen to auth state changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const profile = await ensureUserProfile(user);
          await setServerSession(user, profile);
          setState({ firebaseUser: user, userProfile: profile, loading: false, error: null });
        } catch (err) {
          console.error('Failed to load user profile:', err);
          await clearServerSession();
          setState({ firebaseUser: user, userProfile: null, loading: false, error: 'Không thể tải hồ sơ.' });
        }
      } else {
        await clearServerSession();
        setState({ firebaseUser: null, userProfile: null, loading: false, error: null });
      }
    });
    return unsub;
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setState(prev => ({ ...prev, loading: false, error: err.message }));
      }
      throw err;
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, extraData: Partial<UserProfile>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (extraData.displayName) {
        await updateProfile(cred.user, { displayName: extraData.displayName });
      }
      await ensureUserProfile(cred.user, extraData);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setState(prev => ({ ...prev, loading: false, error: err.message }));
      }
      throw err;
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setState(prev => ({ ...prev, loading: false, error: err.message }));
      }
      throw err;
    }
  }, []);

  const signInWithPhone = useCallback(async (phoneNumber: string, recaptchaContainerId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      // Setup recaptcha verifier
      const recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
        size: 'invisible',
      });
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
      setState(prev => ({ ...prev, loading: false }));
      return confirmationResult.verificationId;
    } catch (err: unknown) {
      if (err instanceof Error) {
        setState(prev => ({ ...prev, loading: false, error: err.message }));
      }
      throw err;
    }
  }, []);

  const verifyOTP = useCallback(async (verificationId: string, otp: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const credential = PhoneAuthProvider.credential(verificationId, otp);
      await signInWithCredential(auth, credential);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setState(prev => ({ ...prev, loading: false, error: err.message }));
      }
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    await clearServerSession();
    await firebaseSignOut(auth);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (state.firebaseUser) {
      const profile = await ensureUserProfile(state.firebaseUser);
      setState(prev => ({ ...prev, userProfile: profile }));
    }
  }, [state.firebaseUser]);

  return (
    <AuthContext.Provider value={{
      ...state,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signInWithPhone,
      verifyOTP,
      signOut,
      resetPassword,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
