/**
 * Job State Machine — A7
 * Enforces valid job status transitions to prevent illegal state changes.
 */

import type { JobStatus } from '@/types';

/**
 * Map of valid status transitions.
 * Key = current status, Value = array of valid next statuses.
 */
const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  draft:             ['pending_approval', 'cancelled'],
  pending_approval:  ['open', 'draft', 'cancelled'],
  open:              ['assigned', 'cancelled', 'pending_approval', 'draft'],
  assigned:          ['in_progress', 'open', 'cancelled'],
  in_progress:       ['review', 'cancelled'],
  review:            ['completed', 'in_progress'], // can send back for revision
  completed:         ['paid'],
  paid:              [], // terminal state
  cancelled:         ['draft'], // can reopen as draft
};

/**
 * Check if a transition from one status to another is valid.
 */
export function canTransition(from: JobStatus, to: JobStatus): boolean {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

/**
 * Get all valid next statuses from a given status.
 */
export function getValidTransitions(from: JobStatus): JobStatus[] {
  return VALID_TRANSITIONS[from] || [];
}

/**
 * Validate and return the target status, or throw if invalid.
 */
export function validateTransition(from: JobStatus, to: JobStatus): void {
  if (!canTransition(from, to)) {
    const allowed = getValidTransitions(from);
    throw new Error(
      `Không thể chuyển trạng thái từ "${from}" sang "${to}". ` +
      `Các trạng thái hợp lệ: ${allowed.length > 0 ? allowed.join(', ') : '(không có)'}`
    );
  }
}

/**
 * Status labels in Vietnamese for display
 */
export const STATUS_LABELS: Record<JobStatus, string> = {
  draft: 'Nháp',
  pending_approval: 'Chờ duyệt',
  open: 'Chưa nhận việc',
  assigned: 'Chốt kèo',
  in_progress: 'Đang thực hiện',
  review: 'Nghiệm thu',
  completed: 'Hoàn thành',
  paid: 'Đã thanh toán',
  cancelled: 'Đã hủy',
};

/**
 * Check if a job status is a terminal state (no further transitions).
 */
export function isTerminalState(status: JobStatus): boolean {
  const transitions = VALID_TRANSITIONS[status];
  return !transitions || transitions.length === 0;
}

/**
 * Check if a job is actively being worked on.
 */
export function isActiveStatus(status: JobStatus): boolean {
  return ['open', 'assigned', 'in_progress', 'review'].includes(status);
}
