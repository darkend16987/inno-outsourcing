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

// Category rating keys that may be stored as flat top-level fields
const CATEGORY_KEYS = [
  'quality', 'communication', 'timeliness', 'professionalism',
  'descriptionClarity', 'paymentTimeliness',
] as const;

/**
 * Normalize a review document from Firestore.
 * Handles both legacy format (flat category fields) and new format (nested categories object).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeReview(id: string, data: Record<string, any>): Review {
  const createdAt = (data.createdAt as Timestamp)?.toDate?.() || new Date();

  // Build categories from either nested object or flat fields
  let categories = data.categories || {};
  
  // Check for flat category fields and merge them into categories
  for (const key of CATEGORY_KEYS) {
    if (data[key] !== undefined && data[key] !== null) {
      categories = { ...categories, [key]: Number(data[key]) };
    }
  }

  // Only keep categories if there are actual values
  const hasCategories = Object.values(categories).some((v) => v && Number(v) > 0);

  return {
    id,
    jobId: data.jobId,
    jobTitle: data.jobTitle,
    reviewerId: data.reviewerId,
    reviewerName: data.reviewerName,
    reviewerRole: data.reviewerRole,
    revieweeId: data.revieweeId,
    revieweeName: data.revieweeName,
    revieweeRole: data.revieweeRole,
    rating: Number(data.rating) || 0,
    comment: data.comment || '',
    categories: hasCategories ? categories : undefined,
    visible: data.visible,
    wouldRehire: data.wouldRehire,
    createdAt,
  };
}

export async function getReviewsForUser(userId: string): Promise<Review[]> {
  if (!db) return [];

  const q = query(
    collection(db, REVIEWS_COLLECTION),
    where('revieweeId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => normalizeReview(d.id, d.data()));
}

export async function getReviewsForJob(jobId: string): Promise<Review[]> {
  if (!db) return [];

  const q = query(
    collection(db, REVIEWS_COLLECTION),
    where('jobId', '==', jobId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => normalizeReview(d.id, d.data()));
}

export async function getLatestReviews(count = 10): Promise<Review[]> {
  if (!db) return [];

  const q = query(
    collection(db, REVIEWS_COLLECTION),
    orderBy('createdAt', 'desc'),
    limitQuery(count)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => normalizeReview(d.id, d.data()));
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
