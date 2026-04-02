/**
 * Audit Logging Service
 * Records all important state changes for accountability and traceability.
 * Collection: auditLogs
 */

import { collection, addDoc, getDocs, query, where, orderBy, limit, serverTimestamp, QueryConstraint } from 'firebase/firestore';
import { db } from './config';

// =====================
// TYPES
// =====================
export type AuditAction =
  | 'job.created' | 'job.updated' | 'job.status_changed' | 'job.deleted'
  | 'application.created' | 'application.status_changed'
  | 'contract.created' | 'contract.updated' | 'contract.signed'
  | 'payment.created' | 'payment.approved' | 'payment.paid' | 'payment.cancelled'
  | 'user.role_changed' | 'user.status_changed' | 'user.profile_updated'
  | 'review.created'
  | 'dispute.created' | 'dispute.status_changed' | 'dispute.resolved'
  | 'system.config_changed';

export type AuditTargetType =
  | 'job' | 'application' | 'contract' | 'payment'
  | 'user' | 'review' | 'dispute' | 'system_config';

export interface AuditLogEntry {
  id?: string;
  action: AuditAction;
  actorId: string;
  actorName: string;
  actorRole: string;
  targetType: AuditTargetType;
  targetId: string;
  targetLabel?: string; // Human-readable label (e.g., job title)
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const AUDIT_COLLECTION = 'auditLogs';

// =====================
// WRITE AUDIT LOG
// =====================

/**
 * Log an audit event. Should be called after any important mutation.
 * This is a fire-and-forget operation — errors are logged but don't block the main operation.
 */
export async function logAuditEvent(params: {
  action: AuditAction;
  actorId: string;
  actorName: string;
  actorRole: string;
  targetType: AuditTargetType;
  targetId: string;
  targetLabel?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (!db) return;

  try {
    await addDoc(collection(db, AUDIT_COLLECTION), {
      ...params,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    // Audit log failure should never break the main operation
    console.error('[AuditLog] Failed to write audit log:', err);
  }
}

// =====================
// READ AUDIT LOGS (Admin only)
// =====================

export interface AuditLogFilters {
  actorId?: string;
  targetType?: AuditTargetType;
  targetId?: string;
  action?: AuditAction;
}

/**
 * Get audit logs with optional filters (admin dashboard use).
 */
export async function getAuditLogs(
  filters: AuditLogFilters = {},
  pageSize = 50
): Promise<AuditLogEntry[]> {
  if (!db) return [];

  const constraints: QueryConstraint[] = [];

  if (filters.actorId) constraints.push(where('actorId', '==', filters.actorId));
  if (filters.targetType) constraints.push(where('targetType', '==', filters.targetType));
  if (filters.targetId) constraints.push(where('targetId', '==', filters.targetId));
  if (filters.action) constraints.push(where('action', '==', filters.action));

  constraints.push(orderBy('createdAt', 'desc'));
  constraints.push(limit(pageSize));

  const q = query(collection(db, AUDIT_COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map(d => ({
    id: d.id,
    ...d.data(),
  } as AuditLogEntry));
}

/**
 * Get audit trail for a specific entity (e.g., all changes to a job).
 */
export async function getAuditTrail(
  targetType: AuditTargetType,
  targetId: string
): Promise<AuditLogEntry[]> {
  return getAuditLogs({ targetType, targetId }, 100);
}
