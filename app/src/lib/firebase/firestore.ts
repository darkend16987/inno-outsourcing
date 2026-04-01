import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './config';
import { Job, UserProfile, JobApplication } from '@/types';

// =====================
// USERS
// =====================
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
};

export const createUserProfile = async (uid: string, data: Partial<UserProfile>) => {
  if (!db) return;
  await setDoc(doc(db, 'users', uid), {
    ...data,
    createdAt: serverTimestamp(),
  });
};

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>) => {
  if (!db) return;
  await updateDoc(doc(db, 'users', uid), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

// =====================
// JOBS
// =====================
export const createJob = async (data: Omit<Job, 'id'>) => {
  if (!db) return;
  const newJobRef = doc(collection(db, 'jobs'));
  await setDoc(newJobRef, {
    ...data,
    createdAt: serverTimestamp(),
  });
  return newJobRef.id;
};

export const getJobs = async (filters: { status?: Job['status'] } = {}): Promise<Job[]> => {
  if (!db) return [];
  const qConstraints = [];
  if (filters.status) {
    qConstraints.push(where('status', '==', filters.status));
  }
  
  const q = query(collection(db, 'jobs'), ...qConstraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
};

export const getJobById = async (id: string): Promise<Job | null> => {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'jobs', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Job;
};

// =====================
// APPLICATIONS
// =====================
export const applyForJob = async (jobId: string, freelancerId: string, proposal: any) => {
  if (!db) return;
  const newAppRef = doc(collection(db, 'applications'));
  await setDoc(newAppRef, {
    jobId,
    freelancerId,
    ...proposal,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  return newAppRef.id;
};

export const getApplicationsForJob = async (jobId: string): Promise<JobApplication[]> => {
  if (!db) return [];
  const q = query(collection(db, 'applications'), where('jobId', '==', jobId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobApplication));
};

export const getApplicationsForFreelancer = async (freelancerId: string): Promise<JobApplication[]> => {
  if (!db) return [];
  const q = query(collection(db, 'applications'), where('freelancerId', '==', freelancerId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobApplication));
};
