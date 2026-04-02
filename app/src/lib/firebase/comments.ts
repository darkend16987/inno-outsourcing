import {
  collection, doc, addDoc, getDocs, updateDoc,
  query, where, orderBy, onSnapshot, serverTimestamp,
  arrayUnion, arrayRemove
} from 'firebase/firestore';
import { db } from './config';
import type { Comment } from '@/types';

const COMMENTS_COLLECTION = 'comments';

/**
 * Add a new comment (top-level or reply)
 */
export const addComment = async (data: {
  jobId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
  attachmentURL?: string;
  parentCommentId?: string | null;
  isInternal?: boolean;
}): Promise<string> => {
  if (!db) return '';
  const ref = await addDoc(collection(db, COMMENTS_COLLECTION), {
    ...data,
    parentCommentId: data.parentCommentId || null,
    isInternal: data.isInternal || false,
    likes: [],
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

/**
 * Get all comments for a specific job ID
 */
export const getCommentsForJob = async (jobId: string): Promise<Comment[]> => {
  if (!db) return [];
  const q = query(
    collection(db, COMMENTS_COLLECTION),
    where('jobId', '==', jobId),
    orderBy('createdAt', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Comment));
};

/**
 * Subscribe to real-time comments for a job
 */
export const subscribeToComments = (
  jobId: string,
  callback: (comments: Comment[]) => void
) => {
  if (!db) return () => {};
  const q = query(
    collection(db, COMMENTS_COLLECTION),
    where('jobId', '==', jobId),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snapshot) => {
    const comments = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Comment));
    callback(comments);
  });
};

/**
 * Toggle like on a comment
 */
export const toggleCommentLike = async (commentId: string, userId: string, isLiked: boolean) => {
  if (!db) return;
  const ref = doc(db, COMMENTS_COLLECTION, commentId);
  if (isLiked) {
    await updateDoc(ref, { likes: arrayRemove(userId) });
  } else {
    await updateDoc(ref, { likes: arrayUnion(userId) });
  }
};

/**
 * Get recent comments count for a job (for badges/indicators)
 */
export const getCommentCountForJob = async (jobId: string): Promise<number> => {
  if (!db) return 0;
  const q = query(
    collection(db, COMMENTS_COLLECTION),
    where('jobId', '==', jobId)
  );
  const snapshot = await getDocs(q);
  return snapshot.size;
};
