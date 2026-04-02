/**
 * ============================================
 * VAA JOB — Multi-tier Deadline Alert System
 * ============================================
 * 
 * Checks job deadlines and generates alerts at multiple tiers:
 * - 7 days before: In-app notification (info)
 * - 3 days before: In-app + email (warning)
 * - 1 day before: In-app + email (urgent)
 * - Overdue: In-app + email + escalation (critical)
 */

import type { Job, NotificationType, Notification } from '@/types';

// =====================
// TYPES
// =====================

export type DeadlineSeverity = 'info' | 'warning' | 'urgent' | 'critical';

export interface DeadlineAlert {
  job: Job;
  severity: DeadlineSeverity;
  notificationType: NotificationType;
  daysRemaining: number;
  progressPercentage: number;
  title: string;
  body: string;
  shouldEmail: boolean;
  shouldEscalate: boolean;
}

export interface DeadlineTier {
  days: number;
  severity: DeadlineSeverity;
  notificationType: NotificationType;
  shouldEmail: boolean;
  shouldEscalate: boolean;
}

// =====================
// TIER CONFIGURATION
// =====================

export const DEADLINE_TIERS: DeadlineTier[] = [
  {
    days: 7,
    severity: 'info',
    notificationType: 'deadline_7days',
    shouldEmail: false,
    shouldEscalate: false,
  },
  {
    days: 3,
    severity: 'warning',
    notificationType: 'deadline_3days',
    shouldEmail: true,
    shouldEscalate: false,
  },
  {
    days: 1,
    severity: 'urgent',
    notificationType: 'deadline_1day',
    shouldEmail: true,
    shouldEscalate: false,
  },
  {
    days: 0,
    severity: 'critical',
    notificationType: 'deadline_overdue',
    shouldEmail: true,
    shouldEscalate: true,
  },
];

// =====================
// CORE LOGIC
// =====================

/**
 * Calculate days remaining until deadline
 */
export function getDaysRemaining(deadline: Date | string): number {
  const deadlineDate = deadline instanceof Date ? deadline : new Date(deadline);
  const now = new Date();
  const diffMs = deadlineDate.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get the appropriate deadline tier for a job
 */
export function getDeadlineTier(daysRemaining: number): DeadlineTier | null {
  // Check tiers from most urgent to least
  const sortedTiers = [...DEADLINE_TIERS].sort((a, b) => a.days - b.days);

  for (const tier of sortedTiers) {
    if (daysRemaining <= tier.days) {
      return tier;
    }
  }

  return null; // No alert needed (> 7 days)
}

/**
 * Check a single job and generate a deadline alert if needed
 */
export function checkJobDeadline(job: Job): DeadlineAlert | null {
  // Only check active jobs
  if (!['in_progress', 'review', 'assigned'].includes(job.status)) {
    return null;
  }

  if (!job.deadline) return null;

  const daysRemaining = getDaysRemaining(job.deadline);
  const tier = getDeadlineTier(daysRemaining);

  if (!tier) return null;

  const progress = job.progress || 0;

  // Generate alert messages in Vietnamese
  const { title, body } = generateAlertMessages(
    job.title,
    daysRemaining,
    progress,
    tier.severity,
  );

  return {
    job,
    severity: tier.severity,
    notificationType: tier.notificationType,
    daysRemaining,
    progressPercentage: progress,
    title,
    body,
    shouldEmail: tier.shouldEmail,
    shouldEscalate: tier.shouldEscalate,
  };
}

/**
 * Check multiple jobs and return alerts that need to be sent
 */
export function checkAllDeadlines(jobs: Job[]): DeadlineAlert[] {
  return jobs
    .map(checkJobDeadline)
    .filter((alert): alert is DeadlineAlert => alert !== null)
    .sort((a, b) => a.daysRemaining - b.daysRemaining); // most urgent first
}

/**
 * Build notification data from a deadline alert
 */
export function buildDeadlineNotification(
  alert: DeadlineAlert,
  recipientId: string,
): Omit<Notification, 'id' | 'createdAt'> {
  return {
    recipientId,
    type: alert.notificationType,
    title: alert.title,
    body: alert.body,
    link: `/jobmaster/jobs/${alert.job.id}`,
    read: false,
    metadata: {
      jobId: alert.job.id,
      severity: alert.severity,
      daysRemaining: alert.daysRemaining,
      progress: alert.progressPercentage,
    },
  };
}

// =====================
// HELPERS
// =====================

function generateAlertMessages(
  jobTitle: string,
  daysRemaining: number,
  progress: number,
  severity: DeadlineSeverity,
): { title: string; body: string } {
  const shortTitle = jobTitle.length > 30 ? jobTitle.slice(0, 30) + '…' : jobTitle;

  if (severity === 'critical') {
    return {
      title: `🚨 ĐÃ QUÁ HẠN: ${shortTitle}`,
      body: `Job "${jobTitle}" đã quá hạn ${Math.abs(daysRemaining)} ngày! Tiến độ hiện tại: ${progress}%. Vui lòng cập nhật ngay.`,
    };
  }

  if (severity === 'urgent') {
    return {
      title: `🔴 Còn 1 ngày: ${shortTitle}`,
      body: `Job "${jobTitle}" sẽ hết hạn trong 24 giờ! Tiến độ hiện tại: ${progress}%.`,
    };
  }

  if (severity === 'warning') {
    return {
      title: `⚠️ Còn ${daysRemaining} ngày: ${shortTitle}`,
      body: `Job "${jobTitle}" còn ${daysRemaining} ngày để hoàn thành. Tiến độ hiện tại: ${progress}%.`,
    };
  }

  // info
  return {
    title: `⏰ Còn ${daysRemaining} ngày: ${shortTitle}`,
    body: `Nhắc nhở: Job "${jobTitle}" còn ${daysRemaining} ngày deadline. Tiến độ hiện tại: ${progress}%.`,
  };
}

// =====================
// SEVERITY DISPLAY CONFIG
// =====================

export const DEADLINE_SEVERITY_CONFIG: Record<DeadlineSeverity, {
  icon: string;
  color: string;
  bgColor: string;
  label: string;
}> = {
  info: {
    icon: '⏰',
    color: 'var(--color-info, #3b82f6)',
    bgColor: 'var(--color-info-bg, rgba(59, 130, 246, 0.1))',
    label: 'Nhắc nhở',
  },
  warning: {
    icon: '⚠️',
    color: 'var(--color-warning, #f59e0b)',
    bgColor: 'var(--color-warning-bg, rgba(245, 158, 11, 0.1))',
    label: 'Sắp hết hạn',
  },
  urgent: {
    icon: '🔴',
    color: 'var(--color-danger, #ef4444)',
    bgColor: 'var(--color-danger-bg, rgba(239, 68, 68, 0.1))',
    label: 'Khẩn cấp',
  },
  critical: {
    icon: '🚨',
    color: '#dc2626',
    bgColor: 'rgba(220, 38, 38, 0.15)',
    label: 'Quá hạn',
  },
};
