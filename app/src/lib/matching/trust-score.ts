/**
 * ============================================
 * VAA JOB — Trust Score Calculator
 * ============================================
 * 
 * TrustScore = 0.40 × AvgRating + 0.25 × OnTimeRate 
 *            + 0.20 × CompletionRate + 0.15 × ExperienceScore
 */

import type { UserProfile, UserStats, TrustBadgeLevel } from '@/types';

export interface TrustScoreBreakdown {
  avgRatingScore: number;
  onTimeScore: number;
  completionScore: number;
  experienceScore: number;
  totalScore: number;
  badge: TrustBadgeLevel;
  minJobsForTrusted: number;
}

/**
 * Calculate trust score from user stats
 * Returns 0-100 score + badge level
 */
export function calculateTrustScore(stats: UserStats): TrustScoreBreakdown {
  // 1. Average Rating (40%) — normalize to 0-100
  const avgRatingScore = Math.round((stats.avgRating / 5) * 100);

  // 2. On-Time Rate (25%) — already 0-1, convert to 0-100
  const onTimeScore = Math.round((stats.onTimeRate || 0) * 100);

  // 3. Completion / Consistency (20%)
  // Higher completion count = more reliable
  const completedJobs = stats.completedJobs || 0;
  const completionScore = Math.min(Math.round(completedJobs * 6), 100);

  // 4. Experience Score (15%)
  // Based on total earnings as a proxy for experience
  const totalEarnings = stats.totalEarnings || 0;
  let experienceScore = 0;
  if (totalEarnings >= 500_000_000) experienceScore = 100;       // 500M+
  else if (totalEarnings >= 200_000_000) experienceScore = 85;   // 200M+
  else if (totalEarnings >= 100_000_000) experienceScore = 70;   // 100M+
  else if (totalEarnings >= 50_000_000) experienceScore = 55;    // 50M+
  else if (totalEarnings >= 10_000_000) experienceScore = 40;    // 10M+
  else experienceScore = 20;

  // Weighted total
  const totalScore = Math.round(
    avgRatingScore * 0.40 +
    onTimeScore * 0.25 +
    completionScore * 0.20 +
    experienceScore * 0.15
  );

  // Badge determination
  const badge = getTrustBadge(totalScore, completedJobs);

  return {
    avgRatingScore,
    onTimeScore,
    completionScore,
    experienceScore,
    totalScore,
    badge,
    minJobsForTrusted: 8,
  };
}

/**
 * Get trust badge level based on score and job count
 */
function getTrustBadge(score: number, completedJobs: number): TrustBadgeLevel {
  if (score >= 80 && completedJobs >= 8) return 'trusted';
  if (score >= 60 && completedJobs >= 3) return 'rising';
  return 'new';
}

/**
 * Calculate and return trust data to save on user profile
 */
export function getTrustProfileData(
  profile: UserProfile,
): { trustScore: number; trustBadge: TrustBadgeLevel } {
  const result = calculateTrustScore(profile.stats || {
    completedJobs: 0,
    totalEarnings: 0,
    avgRating: 0,
    ratingCount: 0,
    onTimeRate: 0,
    currentMonthEarnings: 0,
  });

  return {
    trustScore: result.totalScore,
    trustBadge: result.badge,
  };
}
