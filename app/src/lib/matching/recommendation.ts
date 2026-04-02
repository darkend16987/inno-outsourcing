/**
 * ============================================
 * VAA JOB — Job Recommendation Engine
 * ============================================
 * 
 * Recommends suitable jobs to freelancers based on their profile.
 * Uses the same scoring factors as applicant scoring, but in reverse.
 */

import type { Job, UserProfile } from '@/types';
import {
  calculateSkillMatch,
  calculateLevelMatch,
  calculatePriceScore,
  calculateAvailabilityScore,
} from './scoring';

// =====================
// TYPES
// =====================

export interface RecommendedJob {
  job: Job;
  matchPercentage: number;
  reasons: string[];
}

// =====================
// RECOMMENDATION ENGINE
// =====================

/**
 * Get recommended jobs for a freelancer based on their profile
 * Returns top N jobs with match percentages and reasons
 */
export function getRecommendedJobs(
  jobs: Job[],
  profile: UserProfile,
  maxResults: number = 5,
): RecommendedJob[] {
  // Only consider open jobs
  const openJobs = jobs.filter(j => j.status === 'open');

  const scored = openJobs.map(job => scoreJobForFreelancer(job, profile));

  // Sort by match percentage descending
  const sorted = scored
    .filter(r => r.matchPercentage >= 30) // minimum threshold
    .sort((a, b) => b.matchPercentage - a.matchPercentage);

  return sorted.slice(0, maxResults);
}

/**
 * Score a single job against a freelancer's profile
 */
function scoreJobForFreelancer(
  job: Job,
  profile: UserProfile,
): RecommendedJob {
  const reasons: string[] = [];

  // 1. Skill match (weight: 0.35)
  const skillScore = calculateSkillMatch(
    profile.specialties || [],
    profile.software || [],
    job.category,
    job.requirements?.software || [],
  );

  if (skillScore >= 80) {
    reasons.push(`Phù hợp chuyên ngành ${job.category}`);
    const matchedSw = (profile.software || []).filter(sw =>
      (job.requirements?.software || []).some(
        jsw => jsw.toLowerCase() === sw.toLowerCase()
      )
    );
    if (matchedSw.length > 0) {
      reasons.push(`Yêu cầu ${matchedSw.slice(0, 2).join(', ')} — bạn đã có`);
    }
  }

  // 2. Level match (weight: 0.25)
  const levelScore = calculateLevelMatch(
    profile.currentLevel,
    job.level,
  );

  if (levelScore >= 80) {
    reasons.push(`Yêu cầu ${job.level} — phù hợp level của bạn`);
  }

  // 3. Budget match (weight: 0.20)
  // Estimate expected fee from average earning per job
  const avgEarningPerJob = profile.stats?.completedJobs
    ? (profile.stats.totalEarnings || 0) / profile.stats.completedJobs
    : 0;
  const priceScore = calculatePriceScore(
    avgEarningPerJob || undefined,
    job.totalFee,
  );

  if (priceScore >= 70) {
    const formatted = new Intl.NumberFormat('vi-VN').format(job.totalFee);
    reasons.push(`Ngân sách ${formatted}₫`);
  }

  // 4. Availability (weight: 0.10)
  const availScore = calculateAvailabilityScore(profile.availability);

  if (availScore >= 80) {
    reasons.push('Bạn đang sẵn sàng nhận việc');
  }

  // 5. Work mode preference (weight: 0.10)
  let workModeScore = 70; // neutral
  if (job.workMode === 'remote') {
    workModeScore = 90; // generally preferred
    reasons.push('Remote — linh hoạt thời gian');
  }

  // Weighted total
  const matchPercentage = Math.round(
    skillScore * 0.35 +
    levelScore * 0.25 +
    priceScore * 0.20 +
    availScore * 0.10 +
    workModeScore * 0.10
  );

  return {
    job,
    matchPercentage: Math.min(matchPercentage, 100),
    reasons: reasons.slice(0, 3), // max 3 reasons
  };
}

/**
 * Check if a new job is a high match for a freelancer
 * Used to trigger "job_recommended" notifications
 */
export function isHighMatch(
  job: Job,
  profile: UserProfile,
  threshold: number = 80,
): boolean {
  const result = scoreJobForFreelancer(job, profile);
  return result.matchPercentage >= threshold;
}
