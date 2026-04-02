/**
 * Disputes Service — P4 Dispute Resolution
 * Manages dispute lifecycle between freelancers and job masters.
 */

import {
  collection, addDoc, getDocs, getDoc, query, where,
  orderBy, serverTimestamp, doc, updateDoc, Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import { logAuditEvent } from './audit-log';
import type { Dispute, DisputeStatus } from '@/types';

const DISPUTES_COLLECTION = 'disputes';

// =====================
// CREATE DISPUTE
// =====================

export async function createDispute(
  disputeData: Omit<Dispute, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'participants'>
): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');

  const participants = [disputeData.initiatorId, disputeData.respondentId];

  const docRef = await addDoc(collection(db, DISPUTES_COLLECTION), {
    ...disputeData,
    participants,
    status: 'open' as DisputeStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Audit log
  await logAuditEvent({
    action: 'dispute.created',
    actorId: disputeData.initiatorId,
    actorName: disputeData.initiatorName,
    actorRole: disputeData.initiatorRole,
    targetType: 'dispute',
    targetId: docRef.id,
    targetLabel: `Dispute for ${disputeData.jobTitle}`,
    after: { reason: disputeData.reason, jobId: disputeData.jobId },
  });

  return docRef.id;
}

// =====================
// UPDATE DISPUTE STATUS
// =====================

export async function updateDisputeStatus(
  disputeId: string,
  newStatus: DisputeStatus,
  resolution: string | undefined,
  actorId: string,
  actorName: string,
  actorRole: string,
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const disputeRef = doc(db, DISPUTES_COLLECTION, disputeId);
  const disputeSnap = await getDoc(disputeRef);

  if (!disputeSnap.exists()) {
    throw new Error('Dispute not found');
  }

  const oldData = disputeSnap.data();
  const oldStatus = oldData.status;

  // Validate status transition
  const validTransitions: Record<DisputeStatus, DisputeStatus[]> = {
    open: ['under_review', 'closed'],
    under_review: ['resolved', 'escalated', 'closed'],
    escalated: ['resolved', 'closed'],
    resolved: ['closed'],
    closed: [],
  };

  if (!validTransitions[oldStatus as DisputeStatus]?.includes(newStatus)) {
    throw new Error(`Không thể chuyển trạng thái từ "${oldStatus}" sang "${newStatus}"`);
  }

  const updateData: Record<string, unknown> = {
    status: newStatus,
    updatedAt: serverTimestamp(),
  };

  if (resolution) {
    updateData.resolution = resolution;
    updateData.resolvedBy = actorId;
    updateData.resolvedAt = serverTimestamp();
  }

  await updateDoc(disputeRef, updateData);

  // Audit log
  await logAuditEvent({
    action: 'dispute.status_changed',
    actorId,
    actorName,
    actorRole,
    targetType: 'dispute',
    targetId: disputeId,
    targetLabel: oldData.jobTitle || disputeId,
    before: { status: oldStatus },
    after: { status: newStatus, resolution },
  });
}

// =====================
// QUERY DISPUTES
// =====================

export async function getDisputesForJob(jobId: string): Promise<Dispute[]> {
  if (!db) return [];

  const q = query(
    collection(db, DISPUTES_COLLECTION),
    where('jobId', '==', jobId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => mapDisputeDoc(d));
}

export async function getDisputesForUser(userId: string): Promise<Dispute[]> {
  if (!db) return [];

  const q = query(
    collection(db, DISPUTES_COLLECTION),
    where('participants', 'array-contains', userId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => mapDisputeDoc(d));
}

export async function getAllDisputes(statusFilter?: DisputeStatus): Promise<Dispute[]> {
  if (!db) return [];

  const constraints = [];
  if (statusFilter) {
    constraints.push(where('status', '==', statusFilter));
  }
  constraints.push(orderBy('createdAt', 'desc'));

  const q = query(collection(db, DISPUTES_COLLECTION), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => mapDisputeDoc(d));
}

export async function getDisputeById(disputeId: string): Promise<Dispute | null> {
  if (!db) return null;

  const disputeRef = doc(db, DISPUTES_COLLECTION, disputeId);
  const snap = await getDoc(disputeRef);
  if (!snap.exists()) return null;
  return mapDisputeDoc(snap);
}

// =====================
// HELPERS
// =====================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDisputeDoc(d: any): Dispute {
  const data = d.data?.() ?? d;
  return {
    id: d.id,
    ...data,
    createdAt: (data.createdAt as Timestamp)?.toDate?.() || new Date(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate?.() || new Date(),
    resolvedAt: (data.resolvedAt as Timestamp)?.toDate?.() || undefined,
  } as Dispute;
}
