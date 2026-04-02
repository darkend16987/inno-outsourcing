'use client';

/**
 * ============================================
 * VAA JOB — Smart Matching Hooks
 * ============================================
 * 
 * React hooks that integrate scoring, recommendations,
 * and deadline alerts into page components.
 */

import { useState, useEffect } from 'react';
import type { Job, JobApplication, UserProfile, Notification } from '@/types';
import type { ApplicantScore } from '@/lib/matching/scoring';
import { rankApplicants } from '@/lib/matching/scoring';
import { getRecommendedJobs, type RecommendedJob } from '@/lib/matching/recommendation';
import { checkAllDeadlines, type DeadlineAlert } from '@/lib/services/deadline-checker';
import { calculateEscrowSummary, calculateProgressFromMilestones, type EscrowSummary } from '@/lib/services/milestone-progress';

// =====================
// useApplicantRanking
// =====================

interface UseApplicantRankingOpts {
  applications: JobApplication[];
  job: Job | null;
  profiles: Record<string, UserProfile>;
}

export function useApplicantRanking({ applications, job, profiles }: UseApplicantRankingOpts) {
  const [ranked, setRanked] = useState<ApplicantScore[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!job || applications.length === 0) {
      setRanked([]);
      return;
    }

    setLoading(true);
    try {
      const results = rankApplicants(applications, job, profiles);
      setRanked(results);
    } catch (err) {
      console.error('Error ranking applicants:', err);
      setRanked([]);
    } finally {
      setLoading(false);
    }
  }, [applications, job, profiles]);

  return { ranked, loading };
}

// =====================
// useRecommendedJobs
// =====================

interface UseRecommendedJobsOpts {
  jobs: Job[];
  profile: UserProfile | null;
  maxResults?: number;
}

export function useRecommendedJobs({ jobs, profile, maxResults = 5 }: UseRecommendedJobsOpts) {
  const [recommendations, setRecommendations] = useState<RecommendedJob[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile || jobs.length === 0) {
      setRecommendations([]);
      return;
    }

    setLoading(true);
    try {
      const results = getRecommendedJobs(jobs, profile, maxResults);
      setRecommendations(results);
    } catch (err) {
      console.error('Error getting recommendations:', err);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, [jobs, profile, maxResults]);

  return { recommendations, loading };
}

// =====================
// useDeadlineAlerts
// =====================

interface UseDeadlineAlertsOpts {
  jobs: Job[];
  enabled?: boolean;
}

export function useDeadlineAlerts({ jobs, enabled = true }: UseDeadlineAlertsOpts) {
  const [alerts, setAlerts] = useState<DeadlineAlert[]>([]);
  const [urgentCount, setUrgentCount] = useState(0);

  useEffect(() => {
    if (!enabled || jobs.length === 0) {
      setAlerts([]);
      setUrgentCount(0);
      return;
    }

    const results = checkAllDeadlines(jobs);
    setAlerts(results);
    setUrgentCount(
      results.filter(a => a.severity === 'critical' || a.severity === 'urgent').length,
    );
  }, [jobs, enabled]);

  // Re-check periodically (every 30 minutes)
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      const results = checkAllDeadlines(jobs);
      setAlerts(results);
      setUrgentCount(
        results.filter(a => a.severity === 'critical' || a.severity === 'urgent').length,
      );
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [jobs, enabled]);

  return { alerts, urgentCount };
}

// =====================
// useMilestoneProgress
// =====================

interface MilestoneProgressResult {
  progress: number;
  escrow: EscrowSummary;
}

export function useMilestoneProgress(job: Job | null) {
  const [data, setData] = useState<MilestoneProgressResult | null>(null);

  useEffect(() => {
    if (!job) {
      setData(null);
      return;
    }

    const progress = calculateProgressFromMilestones(job.milestones || []);
    const escrow = calculateEscrowSummary(job.milestones || [], job.totalFee);
    setData({ progress, escrow });
  }, [job]);

  return data;
}

// =====================
// useNotifications (simplified)
// =====================

interface UseNotificationsOpts {
  userId: string | null;
  notifications: Notification[];
}

export function useNotifications({ userId, notifications }: UseNotificationsOpts) {
  const unreadCount = notifications.filter(n => !n.read).length;
  
  const grouped = {
    job: notifications.filter(n =>
      ['job_new', 'application_received', 'application_accepted',
       'application_rejected', 'job_recommended', 'job_invitation'].includes(n.type)
    ),
    payment: notifications.filter(n =>
      ['payment_pending', 'payment_completed', 'milestone_reached',
       'escrow_locked', 'escrow_released'].includes(n.type)
    ),
    deadline: notifications.filter(n =>
      ['deadline_warning', 'deadline_7days', 'deadline_3days',
       'deadline_1day', 'deadline_overdue'].includes(n.type)
    ),
    system: notifications.filter(n =>
      ['badge_earned', 'contract_ready', 'comment_reply', 'progress_update'].includes(n.type)
    ),
  };

  return {
    all: notifications,
    unreadCount,
    grouped,
    hasUrgent: notifications.some(n =>
      !n.read && ['deadline_1day', 'deadline_overdue', 'payment_pending'].includes(n.type)
    ),
  };
}
