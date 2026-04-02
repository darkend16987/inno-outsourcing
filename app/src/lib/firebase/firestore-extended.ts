/**
 * ============================================
 * VAA JOB — Extended Firestore helpers
 * ============================================
 * 
 * New Firestore functions for Phase 1-2 features:
 * - Scoring & matching storage
 * - Deadline alerts
 * - Escrow milestone operations
 * - Notification CRUD
 * - Saved jobs & freelancers
 * - Job invitations
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  writeBatch,
  QueryConstraint,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import type {
  Job, JobApplication, PaymentMilestone,
  Notification, NotificationType, UserProfile,
} from '@/types';

// =====================
// SCORING / MATCHING
// =====================

/**
 * Store computed match score on an application document
 */
export const saveApplicationMatchScore = async (
  applicationId: string,
  matchScore: number,
  matchBadge: 'top_match' | 'recommended' | null,
  matchReasons: string[],
): Promise<void> => {
  if (!db) return;
  await updateDoc(doc(db, 'applications', applicationId), {
    matchScore,
    matchBadge,
    matchReasons,
  });
};

/**
 * Batch-update match scores for all applications on a job
 */
export const batchUpdateMatchScores = async (
  updates: Array<{ applicationId: string; score: number; badge: string | null; reasons: string[] }>,
): Promise<void> => {
  if (!db || updates.length === 0) return;
  const batch = writeBatch(db);
  for (const u of updates) {
    const ref = doc(db, 'applications', u.applicationId);
    batch.update(ref, {
      matchScore: u.score,
      matchBadge: u.badge,
      matchReasons: u.reasons,
    });
  }
  await batch.commit();
};

// =====================
// TRUST SCORE
// =====================

/**
 * Update a user's trust score and badge in their profile
 */
export const updateUserTrustScore = async (
  uid: string,
  trustScore: number,
  trustBadge: 'trusted' | 'rising' | 'new',
): Promise<void> => {
  if (!db) return;
  await updateDoc(doc(db, 'users', uid), {
    trustScore,
    trustBadge,
    'stats.trustScore': trustScore,
  });
};

// =====================
// AVAILABILITY
// =====================

export const updateAvailability = async (
  uid: string,
  status: 'available' | 'partially_busy' | 'unavailable',
): Promise<void> => {
  if (!db) return;
  await updateDoc(doc(db, 'users', uid), {
    'availability.status': status,
    'availability.lastUpdated': serverTimestamp(),
  });
};

// =====================
// MILESTONE / ESCROW
// =====================

/**
 * Update a single milestone's status on a job
 */
export const updateMilestoneStatus = async (
  jobId: string,
  milestoneId: string,
  newStatus: PaymentMilestone['status'],
): Promise<void> => {
  if (!db) return;
  const jobRef = doc(db, 'jobs', jobId);
  const jobSnap = await getDoc(jobRef);
  if (!jobSnap.exists()) return;

  const data = jobSnap.data();
  const milestones = (data.milestones || []) as PaymentMilestone[];
  const updated = milestones.map(m =>
    m.id === milestoneId ? { ...m, status: newStatus } : m
  );

  await updateDoc(jobRef, { milestones: updated });
};

/**
 * Lock all milestones (escrow lock on job assignment)
 */
export const lockAllMilestones = async (jobId: string): Promise<void> => {
  if (!db) return;
  const jobRef = doc(db, 'jobs', jobId);
  const jobSnap = await getDoc(jobRef);
  if (!jobSnap.exists()) return;

  const data = jobSnap.data();
  const milestones = (data.milestones || []) as PaymentMilestone[];
  const locked = milestones.map(m => ({
    ...m,
    status: m.status === 'pending' ? 'locked' : m.status,
  }));

  await updateDoc(jobRef, {
    milestones: locked,
    escrowStatus: 'locked',
  });
};

/**
 * Release a milestone (escrow release on approval)
 */
export const releaseMilestoneEscrow = async (
  jobId: string,
  milestoneId: string,
): Promise<void> => {
  if (!db) return;
  const jobRef = doc(db, 'jobs', jobId);
  const jobSnap = await getDoc(jobRef);
  if (!jobSnap.exists()) return;

  const data = jobSnap.data();
  const milestones = (data.milestones || []) as PaymentMilestone[];
  const updated = milestones.map(m =>
    m.id === milestoneId ? { ...m, status: 'released' as const } : m
  );

  // Check if all are released
  const allReleased = updated.every(m => m.status === 'released' || m.status === 'paid');
  const escrowStatus = allReleased ? 'fully_released' : 'partially_released';

  await updateDoc(jobRef, { milestones: updated, escrowStatus });
};

// =====================
// NOTIFICATIONS
// =====================

/**
 * Create a notification
 */
export const createNotification = async (
  notification: Omit<Notification, 'id' | 'createdAt'>,
): Promise<string | null> => {
  if (!db) return null;
  const ref = await addDoc(collection(db, 'notifications'), {
    ...notification,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

/**
 * Mark a notification as read
 */
export const markNotificationRead = async (notificationId: string): Promise<void> => {
  if (!db) return;
  await updateDoc(doc(db, 'notifications', notificationId), { read: true });
};

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsRead = async (userId: string): Promise<void> => {
  if (!db) return;
  const q = query(
    collection(db, 'notifications'),
    where('recipientId', '==', userId),
    where('read', '==', false),
  );
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.update(d.ref, { read: true }));
  await batch.commit();
};

/**
 * Listen to real-time notifications
 */
export const subscribeToNotifications = (
  userId: string,
  callback: (notifications: Notification[]) => void,
) => {
  if (!db) return () => {};
  const q = query(
    collection(db, 'notifications'),
    where('recipientId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50),
  );
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.() || new Date(),
    } as Notification));
    callback(items);
  });
};

// =====================
// SAVED JOBS / FREELANCERS
// =====================

export const toggleSavedJob = async (userId: string, jobId: string, save: boolean): Promise<void> => {
  if (!db) return;
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    savedJobs: save ? arrayUnion(jobId) : arrayRemove(jobId),
  });
};

export const toggleSavedFreelancer = async (userId: string, freelancerId: string, save: boolean): Promise<void> => {
  if (!db) return;
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    savedFreelancers: save ? arrayUnion(freelancerId) : arrayRemove(freelancerId),
  });
};

// =====================
// JOB INVITATIONS
// =====================

export const sendJobInvitation = async (
  jobId: string,
  freelancerId: string,
  jobmasterId: string,
  message?: string,
): Promise<string | null> => {
  if (!db) return null;
  const ref = await addDoc(collection(db, 'invitations'), {
    jobId,
    freelancerId,
    jobmasterId,
    message: message || '',
    status: 'pending',
    createdAt: serverTimestamp(),
  });

  // Also notify the freelancer
  await createNotification({
    recipientId: freelancerId,
    type: 'job_invitation',
    title: 'Bạn được mời tham gia dự án',
    body: message || 'Một Jobmaster đã mời bạn apply cho dự án của họ.',
    link: `/freelancer/jobs/${jobId}`,
    read: false,
  });

  return ref.id;
};

export const respondToInvitation = async (
  invitationId: string,
  response: 'accepted' | 'declined',
): Promise<void> => {
  if (!db) return;
  await updateDoc(doc(db, 'invitations', invitationId), {
    status: response,
    respondedAt: serverTimestamp(),
  });
};

// =====================
// PROGRESS UPDATE
// =====================

export const updateJobProgress = async (
  jobId: string,
  progress: number,
): Promise<void> => {
  if (!db) return;
  await updateDoc(doc(db, 'jobs', jobId), { progress });
};

// =====================
// REVIEWS
// =====================

/**
 * Submit a review for a completed job
 */
export const submitReview = async (review: {
  jobId: string;
  jobTitle: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: 'freelancer' | 'jobmaster';
  revieweeId: string;
  revieweeName: string;
  rating: number;
  communication: number;
  quality: number;
  timeliness: number;
  comment: string;
}): Promise<string | null> => {
  if (!db) return null;
  const ref = await addDoc(collection(db, 'reviews'), {
    ...review,
    visible: false,
    createdAt: serverTimestamp(),
  });

  // Check if both sides have reviewed -> make both visible
  const existingReviews = await getDocs(
    query(
      collection(db, 'reviews'),
      where('jobId', '==', review.jobId),
    )
  );

  const reviewerRoles = new Set(existingReviews.docs.map(d => d.data().reviewerRole));
  if (reviewerRoles.has('freelancer') && reviewerRoles.has('jobmaster')) {
    const batch = writeBatch(db);
    existingReviews.docs.forEach(d => batch.update(d.ref, { visible: true }));
    await batch.commit();
  }

  return ref.id;
};

/**
 * Check if a user has already reviewed a job
 */
export const hasUserReviewedJob = async (
  jobId: string,
  reviewerId: string,
): Promise<boolean> => {
  if (!db) return false;
  const q = query(
    collection(db, 'reviews'),
    where('jobId', '==', jobId),
    where('reviewerId', '==', reviewerId),
    limit(1),
  );
  const snap = await getDocs(q);
  return !snap.empty;
};
