/**
 * Reviews Service — P2 Rating/Review System
 * Manages reviews and ratings after job completion.
 */

import {
  collection, addDoc, getDocs, query, where,
  orderBy, serverTimestamp, doc, updateDoc, Timestamp,
  limit as limitQuery,
} from 'firebase/firestore';
import { db } from './config';
import { logAuditEvent } from './audit-log';
import type { Review } from '@/types';

const REVIEWS_COLLECTION = 'reviews';
const USERS_COLLECTION = 'users';

// =====================
// CREATE REVIEW
// =====================

export async function createReview(
  reviewData: Omit<Review, 'id' | 'createdAt'>
): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');

  // Validate rating
  if (reviewData.rating < 1 || reviewData.rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  // Check if review already exists for this job from this reviewer
  const existing = await getDocs(
    query(
      collection(db, REVIEWS_COLLECTION),
      where('jobId', '==', reviewData.jobId),
      where('reviewerId', '==', reviewData.reviewerId),
    )
  );

  if (!existing.empty) {
    throw new Error('Bạn đã đánh giá cho công việc này.');
  }

  const docRef = await addDoc(collection(db, REVIEWS_COLLECTION), {
    ...reviewData,
    createdAt: serverTimestamp(),
  });

  // Update reviewee's average rating
  await updateUserRating(reviewData.revieweeId);

  // Audit log
  await logAuditEvent({
    action: 'review.created',
    actorId: reviewData.reviewerId,
    actorName: reviewData.reviewerName,
    actorRole: reviewData.reviewerRole,
    targetType: 'review',
    targetId: docRef.id,
    targetLabel: `Review for ${reviewData.revieweeName}`,
    after: { rating: reviewData.rating, jobId: reviewData.jobId },
  });

  return docRef.id;
}

// =====================
// QUERY REVIEWS
// =====================

export async function getReviewsForUser(userId: string): Promise<Review[]> {
  if (!db) return [];

  const q = query(
    collection(db, REVIEWS_COLLECTION),
    where('revieweeId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({
    id: d.id,
    ...d.data(),
    createdAt: (d.data().createdAt as Timestamp)?.toDate?.() || new Date(),
  } as Review));
}

export async function getReviewsForJob(jobId: string): Promise<Review[]> {
  if (!db) return [];

  const q = query(
    collection(db, REVIEWS_COLLECTION),
    where('jobId', '==', jobId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({
    id: d.id,
    ...d.data(),
    createdAt: (d.data().createdAt as Timestamp)?.toDate?.() || new Date(),
  } as Review));
}

export async function getLatestReviews(count = 10): Promise<Review[]> {
  if (!db) return [];

  const q = query(
    collection(db, REVIEWS_COLLECTION),
    orderBy('createdAt', 'desc'),
    limitQuery(count)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({
    id: d.id,
    ...d.data(),
    createdAt: (d.data().createdAt as Timestamp)?.toDate?.() || new Date(),
  } as Review));
}

// =====================
// RATING CALCULATION
// =====================

export async function updateUserRating(userId: string): Promise<void> {
  if (!db) return;

  const reviews = await getReviewsForUser(userId);
  if (reviews.length === 0) return;

  const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
  const avgRating = Math.round((totalRating / reviews.length) * 10) / 10; // 1 decimal

  const userRef = doc(db, USERS_COLLECTION, userId);
  await updateDoc(userRef, {
    'stats.avgRating': avgRating,
    'stats.ratingCount': reviews.length,
  });
}

/**
 * Check if a user can review a specific job
 * (must be participant and job must be completed)
 */
export async function canUserReviewJob(
  userId: string,
  jobId: string,
): Promise<boolean> {
  if (!db) return false;

  const existing = await getDocs(
    query(
      collection(db, REVIEWS_COLLECTION),
      where('jobId', '==', jobId),
      where('reviewerId', '==', userId),
    )
  );

  return existing.empty; // Can review if no existing review
}
