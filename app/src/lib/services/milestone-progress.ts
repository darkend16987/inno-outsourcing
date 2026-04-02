/**
 * ============================================
 * VAA JOB — Milestone Progress Calculator
 * ============================================
 * 
 * Auto-calculates job progress based on milestone statuses.
 * Also handles escrow status transitions.
 */

import type { PaymentMilestone, EscrowStatus } from '@/types';

// =====================
// PROGRESS CALCULATION
// =====================

/**
 * Calculate job progress percentage from milestones
 * Returns 0-100 based on which milestones have been approved/paid
 */
export function calculateProgressFromMilestones(
  milestones: PaymentMilestone[],
): number {
  if (!milestones || milestones.length === 0) return 0;

  const totalPercentage = milestones.reduce((sum, m) => sum + m.percentage, 0);
  if (totalPercentage === 0) return 0;

  // Count approved or paid milestones
  const completedPercentage = milestones
    .filter(m => m.status === 'approved' || m.status === 'paid' || m.status === 'released')
    .reduce((sum, m) => sum + m.percentage, 0);

  // Normalize to 0-100
  return Math.round((completedPercentage / totalPercentage) * 100);
}

// =====================
// ESCROW CALCULATIONS
// =====================

export interface EscrowSummary {
  totalValue: number;
  lockedAmount: number;
  releasedAmount: number;
  pendingAmount: number;
  lockedPercentage: number;
  releasedPercentage: number;
  pendingPercentage: number;
  status: EscrowStatus;
}

/**
 * Calculate escrow summary from milestones
 */
export function calculateEscrowSummary(
  milestones: PaymentMilestone[],
  totalFee: number,
): EscrowSummary {
  if (!milestones || milestones.length === 0) {
    return {
      totalValue: totalFee,
      lockedAmount: 0,
      releasedAmount: 0,
      pendingAmount: totalFee,
      lockedPercentage: 0,
      releasedPercentage: 0,
      pendingPercentage: 100,
      status: 'not_started',
    };
  }

  let lockedAmount = 0;
  let releasedAmount = 0;
  let pendingAmount = 0;

  for (const milestone of milestones) {
    switch (milestone.status) {
      case 'locked':
        lockedAmount += milestone.amount;
        break;
      case 'released':
      case 'paid':
      case 'approved':
        releasedAmount += milestone.amount;
        break;
      case 'pending':
      default:
        pendingAmount += milestone.amount;
        break;
    }
  }

  // Determine overall escrow status
  let status: EscrowStatus = 'not_started';
  if (releasedAmount > 0 && releasedAmount >= totalFee) {
    status = 'fully_released';
  } else if (releasedAmount > 0) {
    status = 'partially_released';
  } else if (lockedAmount > 0) {
    status = 'locked';
  }

  const safeTotal = totalFee || 1;
  return {
    totalValue: totalFee,
    lockedAmount,
    releasedAmount,
    pendingAmount,
    lockedPercentage: Math.round((lockedAmount / safeTotal) * 100),
    releasedPercentage: Math.round((releasedAmount / safeTotal) * 100),
    pendingPercentage: Math.round((pendingAmount / safeTotal) * 100),
    status,
  };
}

/**
 * Lock all milestone amounts (called when job is assigned)
 */
export function lockMilestones(
  milestones: PaymentMilestone[],
): PaymentMilestone[] {
  return milestones.map(m => ({
    ...m,
    status: m.status === 'pending' ? 'locked' as const : m.status,
  }));
}

/**
 * Release a single milestone (called when milestone is approved)
 */
export function releaseMilestone(
  milestones: PaymentMilestone[],
  milestoneId: string,
): PaymentMilestone[] {
  return milestones.map(m => ({
    ...m,
    status: m.id === milestoneId && (m.status === 'locked' || m.status === 'approved')
      ? 'released' as const
      : m.status,
  }));
}
