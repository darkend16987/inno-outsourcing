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
  limit,
  startAfter,
  serverTimestamp,
  onSnapshot,
  addDoc,
  DocumentSnapshot,
  QueryConstraint,
  Timestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, app } from './config';
import type {
  Job, UserProfile, JobApplication, Contract, Payment,
  Notification, Conversation, Message, LeaderboardEntry,
  JobStatus, JobCategory, JobLevel,
} from '@/types';

// =====================
// PAGINATION TYPES
// =====================
export interface PaginatedResult<T> {
  items: T[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

export interface JobFilters {
  status?: JobStatus;
  category?: JobCategory;
  level?: JobLevel;
  searchKeyword?: string;
}

const PAGE_SIZE = 12;

// =====================
// FUNCTIONS CALLABLE
// =====================
export const requestPaymentOrder = async (data: {
  jobId: string;
  milestoneId: string;
  amount: number;
  workerId: string;
  workerName: string;
  reason: string;
}) => {
  if (!app) return;
  const functions = getFunctions(app);
  const caller = httpsCallable(functions, 'requestPaymentOrder');
  return caller(data);
};

// =====================
// USERS
// =====================
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? ({ uid: snap.id, ...snap.data() } as UserProfile) : null;
};

export const createUserProfile = async (uid: string, data: Partial<UserProfile>) => {
  if (!db) return;
  await setDoc(doc(db, 'users', uid), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>) => {
  if (!db) return;
  await updateDoc(doc(db, 'users', uid), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const getUsers = async (filters: { role?: string; status?: string } = {}, pageSize = 20, cursor?: DocumentSnapshot): Promise<PaginatedResult<UserProfile>> => {
  if (!db) return { items: [], lastDoc: null, hasMore: false };
  const constraints: QueryConstraint[] = [];
  if (filters.role) constraints.push(where('role', '==', filters.role));
  if (filters.status) constraints.push(where('status', '==', filters.status));
  constraints.push(orderBy('createdAt', 'desc'));
  constraints.push(limit(pageSize + 1));
  if (cursor) constraints.push(startAfter(cursor));

  const q = query(collection(db, 'users'), ...constraints);
  const snapshot = await getDocs(q);
  const docs = snapshot.docs;
  const hasMore = docs.length > pageSize;
  const items = docs.slice(0, pageSize).map(d => ({ uid: d.id, ...d.data() } as UserProfile));
  return { items, lastDoc: docs[pageSize - 1] || null, hasMore };
};

// =====================
// JOBS (with pagination)
// =====================
export const createJob = async (data: Omit<Job, 'id'>) => {
  if (!db) return;
  const newJobRef = doc(collection(db, 'jobs'));
  await setDoc(newJobRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return newJobRef.id;
};

export const getJobs = async (
  filters: JobFilters = {},
  pageSize: number = PAGE_SIZE,
  cursor?: DocumentSnapshot
): Promise<PaginatedResult<Job>> => {
  if (!db) return { items: [], lastDoc: null, hasMore: false };

  const constraints: QueryConstraint[] = [];
  if (filters.status) constraints.push(where('status', '==', filters.status));
  if (filters.category) constraints.push(where('category', '==', filters.category));
  if (filters.level) constraints.push(where('level', '==', filters.level));
  constraints.push(orderBy('createdAt', 'desc'));
  constraints.push(limit(pageSize + 1)); // +1 to check hasMore
  if (cursor) constraints.push(startAfter(cursor));

  const q = query(collection(db, 'jobs'), ...constraints);
  const snapshot = await getDocs(q);
  const docs = snapshot.docs;
  const hasMore = docs.length > pageSize;
  const items = docs.slice(0, pageSize).map(d => ({ id: d.id, ...d.data() } as Job));

  return {
    items,
    lastDoc: docs[pageSize - 1] || null,
    hasMore,
  };
};

export const getJobById = async (id: string): Promise<Job | null> => {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'jobs', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Job;
};

export const updateJob = async (id: string, data: Partial<Job>) => {
  if (!db) return;
  await updateDoc(doc(db, 'jobs', id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

// =====================
// APPLICATIONS
// =====================
export const applyForJob = async (jobId: string, freelancerId: string, proposal: Omit<JobApplication, 'id' | 'createdAt' | 'status'>) => {
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
  const q = query(
    collection(db, 'applications'),
    where('jobId', '==', jobId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as JobApplication));
};

export const getApplicationsForFreelancer = async (freelancerId: string): Promise<JobApplication[]> => {
  if (!db) return [];
  const q = query(
    collection(db, 'applications'),
    where('freelancerId', '==', freelancerId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as JobApplication));
};

export const updateApplication = async (id: string, data: Partial<JobApplication>) => {
  if (!db) return;
  await updateDoc(doc(db, 'applications', id), { ...data });
};

// =====================
// CONTRACTS
// =====================
export const createContract = async (data: Omit<Contract, 'id'>) => {
  if (!db) return;
  const ref = await addDoc(collection(db, 'contracts'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const getContractsForFreelancer = async (uid: string): Promise<Contract[]> => {
  if (!db) return [];
  const q = query(
    collection(db, 'contracts'),
    where('partyB.uid', '==', uid),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Contract));
};

export const getAllContracts = async (pageSize = 20, cursor?: DocumentSnapshot): Promise<PaginatedResult<Contract>> => {
  if (!db) return { items: [], lastDoc: null, hasMore: false };
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc'), limit(pageSize + 1)];
  if (cursor) constraints.push(startAfter(cursor));
  const q = query(collection(db, 'contracts'), ...constraints);
  const snapshot = await getDocs(q);
  const docs = snapshot.docs;
  const hasMore = docs.length > pageSize;
  return {
    items: docs.slice(0, pageSize).map(d => ({ id: d.id, ...d.data() } as Contract)),
    lastDoc: docs[pageSize - 1] || null,
    hasMore,
  };
};

export const updateContract = async (id: string, data: Partial<Contract>) => {
  if (!db) return;
  await updateDoc(doc(db, 'contracts', id), { ...data, updatedAt: serverTimestamp() });
};

// =====================
// PAYMENTS
// =====================
export const getPaymentsForWorker = async (workerId: string): Promise<Payment[]> => {
  if (!db) return [];
  const q = query(
    collection(db, 'payments'),
    where('workerId', '==', workerId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
};

export const getAllPayments = async (filters: { status?: string } = {}, pageSize = 20, cursor?: DocumentSnapshot): Promise<PaginatedResult<Payment>> => {
  if (!db) return { items: [], lastDoc: null, hasMore: false };
  const constraints: QueryConstraint[] = [];
  if (filters.status) constraints.push(where('status', '==', filters.status));
  constraints.push(orderBy('createdAt', 'desc'));
  constraints.push(limit(pageSize + 1));
  if (cursor) constraints.push(startAfter(cursor));
  const q = query(collection(db, 'payments'), ...constraints);
  const snapshot = await getDocs(q);
  const docs = snapshot.docs;
  const hasMore = docs.length > pageSize;
  return {
    items: docs.slice(0, pageSize).map(d => ({ id: d.id, ...d.data() } as Payment)),
    lastDoc: docs[pageSize - 1] || null,
    hasMore,
  };
};

export const updatePayment = async (id: string, data: Partial<Payment>) => {
  if (!db) return;
  await updateDoc(doc(db, 'payments', id), { ...data, updatedAt: serverTimestamp() });
};

// =====================
// NOTIFICATIONS
// =====================
export const subscribeToNotifications = (
  userId: string,
  callback: (notifications: Notification[]) => void
) => {
  if (!db) return () => {};
  const q = query(
    collection(db, 'notifications'),
    where('recipientId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
    callback(items);
  });
};

export const markNotificationRead = async (id: string) => {
  if (!db) return;
  await updateDoc(doc(db, 'notifications', id), { read: true });
};

export const markAllNotificationsRead = async (userId: string) => {
  if (!db) return;
  const q = query(
    collection(db, 'notifications'),
    where('recipientId', '==', userId),
    where('read', '==', false)
  );
  const snapshot = await getDocs(q);
  const promises = snapshot.docs.map(d => updateDoc(d.ref, { read: true }));
  await Promise.all(promises);
};

// =====================
// CHAT / CONVERSATIONS
// =====================
export const getOrCreateConversation = async (
  participants: string[],
  jobId: string
): Promise<string> => {
  if (!db) return '';
  // Check if conversation already exists for this job + participants
  const q = query(
    collection(db, 'conversations'),
    where('jobId', '==', jobId),
    where('participants', '==', participants.sort())
  );
  const existing = await getDocs(q);
  if (!existing.empty) return existing.docs[0].id;

  // Create new conversation
  const ref = await addDoc(collection(db, 'conversations'), {
    participants: participants.sort(),
    jobId,
    lastMessage: '',
    lastMessageAt: serverTimestamp(),
    unreadCount: Object.fromEntries(participants.map(p => [p, 0])),
  });
  return ref.id;
};

export const sendMessage = async (
  conversationId: string,
  senderId: string,
  content: string,
  type: 'text' | 'file' | 'image' = 'text',
  fileData?: { fileURL: string; fileName: string }
) => {
  if (!db) return;
  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  await addDoc(messagesRef, {
    senderId,
    content,
    type,
    ...(fileData || {}),
    readBy: [senderId],
    createdAt: serverTimestamp(),
  });

  // Update conversation last message
  await updateDoc(doc(db, 'conversations', conversationId), {
    lastMessage: content,
    lastMessageAt: serverTimestamp(),
  });
};

export const subscribeToMessages = (
  conversationId: string,
  callback: (messages: Message[]) => void
) => {
  if (!db) return () => {};
  const q = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message));
    callback(messages);
  });
};

export const subscribeToConversations = (
  userId: string,
  callback: (conversations: Conversation[]) => void
) => {
  if (!db) return () => {};
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', userId),
    orderBy('lastMessageAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const convs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Conversation));
    callback(convs);
  });
};

// =====================
// LEADERBOARD
// =====================
export const getLeaderboard = async (period?: string): Promise<LeaderboardEntry[]> => {
  if (!db) return [];
  const constraints: QueryConstraint[] = [orderBy('rank', 'asc'), limit(50)];
  if (period) constraints.unshift(where('period', '==', period));
  const q = query(collection(db, 'leaderboard'), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ ...d.data() } as LeaderboardEntry));
};
