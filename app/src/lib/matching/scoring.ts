/**
 * ============================================
 * VAA JOB — Smart Matching Scoring Algorithm
 * ============================================
 * 
 * Auto-ranks applicants when they apply for a job.
 * Score = w1×SkillMatch + w2×LevelMatch + w3×HistoryScore 
 *       + w4×AvailabilityScore + w5×PriceScore + w6×RatingScore
 */

import type {
  Job, JobApplication, UserProfile, JobLevel,
  MatchBadge, JobCategory,
} from '@/types';

// =====================
// SCORING WEIGHTS
// =====================
export interface ScoringWeights {
  skillMatch: number;
  levelMatch: number;
  historyScore: number;
  availabilityScore: number;
  priceScore: number;
  ratingScore: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  skillMatch: 0.25,
  levelMatch: 0.15,
  historyScore: 0.20,
  availabilityScore: 0.10,
  priceScore: 0.15,
  ratingScore: 0.15,
};

// =====================
// SCORE BREAKDOWN
// =====================
export interface ScoreBreakdown {
  skillMatch: number;          // 0-100
  levelMatch: number;          // 0-100
  historyScore: number;        // 0-100
  availabilityScore: number;   // 0-100
  priceScore: number;          // 0-100
  ratingScore: number;         // 0-100
  totalScore: number;          // 0-100 (weighted)
}

export interface ApplicantScore {
  applicationId: string;
  applicantId: string;
  applicantName: string;
  score: number;               // 0-100
  breakdown: ScoreBreakdown;
  badge: MatchBadge | null;
  reasons: string[];           // Human-readable reasons in Vietnamese
}

// =====================
// LEVEL NUMERIC MAP
// =====================
const LEVEL_MAP: Record<JobLevel, number> = {
  L1: 1,
  L2: 2,
  L3: 3,
  L4: 4,
  L5: 5,
};

// =====================
// INDIVIDUAL SCORE CALCULATIONS
// =====================

/**
 * Calculate skill match score (specialties + software overlap)
 */
export function calculateSkillMatch(
  freelancerSpecialties: string[],
  freelancerSoftware: string[],
  jobCategory: JobCategory,
  jobRequiredSoftware: string[],
): number {
  // Category match (50% of skill score)
  const categoryMatch = freelancerSpecialties.some(
    s => s.toLowerCase() === jobCategory.toLowerCase()
  ) ? 100 : 0;

  // Software match (50% of skill score)
  let softwareMatch = 0;
  if (jobRequiredSoftware.length > 0) {
    const normalizedFreelancer = freelancerSoftware.map(s => s.toLowerCase());
    const matched = jobRequiredSoftware.filter(sw =>
      normalizedFreelancer.includes(sw.toLowerCase())
    ).length;
    softwareMatch = (matched / jobRequiredSoftware.length) * 100;
  } else {
    // No software requirement — full score
    softwareMatch = 100;
  }

  return Math.round(categoryMatch * 0.5 + softwareMatch * 0.5);
}

/**
 * Calculate level match score (freelancer level vs job required level)
 */
export function calculateLevelMatch(
  freelancerLevel: JobLevel,
  jobLevel: JobLevel,
): number {
  const fLevel = LEVEL_MAP[freelancerLevel] || 1;
  const jLevel = LEVEL_MAP[jobLevel] || 1;

  // Exact match = 100
  if (fLevel === jLevel) return 100;

  // 1 level above = 90 (overqualified but fine)
  // 1 level below = 70 (slightly under but acceptable)
  const diff = fLevel - jLevel;

  if (diff === 1) return 90;
  if (diff === -1) return 70;
  if (diff === 2) return 75;  // 2 levels above
  if (diff === -2) return 40; // 2 levels below
  if (diff > 2) return 60;    // way overqualified
  return 20;                   // significantly underqualified
}

/**
 * Calculate history score (completed jobs in same category)
 */
export function calculateHistoryScore(
  completedJobs: number,
  categoryJobCount?: number, // jobs completed in the same category
): number {
  // Use total completed jobs as baseline
  const total = completedJobs || 0;
  const catJobs = categoryJobCount ?? Math.floor(total * 0.3); // estimate if not provided

  // Score based on total + category experience
  const totalScore = Math.min(total * 8, 60);         // max 60 from total (7.5+ jobs)
  const categoryScore = Math.min(catJobs * 15, 40);   // max 40 from category (2.7+ jobs)

  return Math.min(Math.round(totalScore + categoryScore), 100);
}

/**
 * Calculate availability score
 */
export function calculateAvailabilityScore(
  availability?: 'available' | 'partially_busy' | 'unavailable',
  currentActiveJobs?: number,
): number {
  // Explicit availability status
  if (availability === 'unavailable') return 10;
  if (availability === 'partially_busy') return 60;
  if (availability === 'available') return 100;

  // Fallback: infer from active job count
  const active = currentActiveJobs ?? 0;
  if (active === 0) return 100;
  if (active === 1) return 75;
  if (active === 2) return 50;
  return 25; // 3+ active jobs
}

/**
 * Calculate price alignment score (expected fee vs job budget)
 */
export function calculatePriceScore(
  expectedFee: number | undefined,
  jobTotalFee: number,
): number {
  if (!expectedFee || !jobTotalFee || jobTotalFee === 0) return 70; // neutral

  const ratio = expectedFee / jobTotalFee;

  // Perfect = within 10% of budget
  if (ratio >= 0.9 && ratio <= 1.0) return 100;

  // Slightly under budget = great value
  if (ratio >= 0.7 && ratio < 0.9) return 90;
  if (ratio >= 0.5 && ratio < 0.7) return 80;

  // Over budget
  if (ratio > 1.0 && ratio <= 1.1) return 75;
  if (ratio > 1.1 && ratio <= 1.3) return 50;
  if (ratio > 1.3 && ratio <= 1.5) return 30;

  // Way off
  if (ratio < 0.3) return 40; // suspiciously low
  return 15; // way over budget
}

/**
 * Calculate rating-based score
 */
export function calculateRatingScore(
  avgRating: number,
  onTimeRate: number,
  ratingCount: number,
): number {
  // No reviews yet — neutral score
  if (ratingCount === 0) return 50;

  // Rating component (60%)
  const ratingPart = (avgRating / 5) * 100;

  // On-time rate component (30%)
  const onTimePart = (onTimeRate || 0) * 100;

  // Experience bonus for having many reviews (10%)
  const reviewBonus = Math.min(ratingCount * 5, 100);

  return Math.round(ratingPart * 0.6 + onTimePart * 0.3 + reviewBonus * 0.1);
}

// =====================
// MAIN SCORING FUNCTION
// =====================

/**
 * Calculate a comprehensive match score for an applicant against a job
 */
export function calculateApplicantScore(
  application: JobApplication,
  job: Job,
  profile: UserProfile,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
): ApplicantScore {
  // Calculate individual scores
  const skillMatch = calculateSkillMatch(
    profile.specialties || [],
    profile.software || [],
    job.category,
    job.requirements?.software || [],
  );

  const levelMatch = calculateLevelMatch(
    profile.currentLevel || application.applicantLevel,
    job.level,
  );

  const historyScore = calculateHistoryScore(
    profile.stats?.completedJobs || 0,
  );

  const availabilityScore = calculateAvailabilityScore(
    profile.availability,
  );

  const priceScore = calculatePriceScore(
    application.expectedFee,
    job.totalFee,
  );

  const ratingScore = calculateRatingScore(
    profile.stats?.avgRating || 0,
    profile.stats?.onTimeRate || 0,
    profile.stats?.ratingCount || 0,
  );

  // Weighted total
  const totalScore = Math.round(
    skillMatch * weights.skillMatch +
    levelMatch * weights.levelMatch +
    historyScore * weights.historyScore +
    availabilityScore * weights.availabilityScore +
    priceScore * weights.priceScore +
    ratingScore * weights.ratingScore
  );

  const breakdown: ScoreBreakdown = {
    skillMatch,
    levelMatch,
    historyScore,
    availabilityScore,
    priceScore,
    ratingScore,
    totalScore,
  };

  // Generate match badge
  const badge = getMatchBadge(totalScore);

  // Generate human-readable reasons
  const reasons = generateMatchReasons(breakdown, profile, job);

  return {
    applicationId: application.id,
    applicantId: application.applicantId,
    applicantName: application.applicantName,
    score: totalScore,
    breakdown,
    badge,
    reasons,
  };
}

// =====================
// RANK APPLICANTS
// =====================

/**
 * Rank multiple applicants for a job, sorted by score descending
 */
export function rankApplicants(
  applications: JobApplication[],
  job: Job,
  profiles: Record<string, UserProfile>,
  weights?: ScoringWeights,
): ApplicantScore[] {
  const scores = applications.map(app => {
    const profile = profiles[app.applicantId];
    if (!profile) {
      return {
        applicationId: app.id,
        applicantId: app.applicantId,
        applicantName: app.applicantName,
        score: 0,
        breakdown: {
          skillMatch: 0, levelMatch: 0, historyScore: 0,
          availabilityScore: 0, priceScore: 0, ratingScore: 0,
          totalScore: 0,
        },
        badge: null,
        reasons: ['Không có thông tin profile'],
      } as ApplicantScore;
    }
    return calculateApplicantScore(app, job, profile, weights);
  });

  // Sort by score descending
  return scores.sort((a, b) => b.score - a.score);
}

// =====================
// HELPERS
// =====================

function getMatchBadge(score: number): MatchBadge | null {
  if (score >= 80) return 'top_match';
  if (score >= 60) return 'recommended';
  return null;
}

function generateMatchReasons(
  breakdown: ScoreBreakdown,
  profile: UserProfile,
  job: Job,
): string[] {
  const reasons: string[] = [];

  // Skill match reasons
  if (breakdown.skillMatch >= 80) {
    const matchedSpecialties = profile.specialties?.filter(
      s => s.toLowerCase() === job.category.toLowerCase()
    );
    if (matchedSpecialties?.length) {
      reasons.push(`Chuyên ngành ${job.category} phù hợp`);
    }
    const matchedSw = (profile.software || []).filter(sw =>
      (job.requirements?.software || []).some(
        jsw => jsw.toLowerCase() === sw.toLowerCase()
      )
    );
    if (matchedSw.length > 0) {
      reasons.push(`Thông thạo ${matchedSw.slice(0, 3).join(', ')}`);
    }
  }

  // Level match
  if (breakdown.levelMatch >= 90) {
    reasons.push(`Level ${profile.currentLevel} phù hợp yêu cầu`);
  }

  // History
  if (breakdown.historyScore >= 60) {
    const jobs = profile.stats?.completedJobs || 0;
    reasons.push(`Đã hoàn thành ${jobs} dự án`);
  }

  // Rating
  if (breakdown.ratingScore >= 70) {
    const rating = profile.stats?.avgRating || 0;
    if (rating >= 4) {
      reasons.push(`Đánh giá ${rating.toFixed(1)}/5 ⭐`);
    }
    const onTime = profile.stats?.onTimeRate || 0;
    if (onTime >= 0.9) {
      reasons.push(`Tỷ lệ đúng hạn ${Math.round(onTime * 100)}%`);
    }
  }

  // Price
  if (breakdown.priceScore >= 80) {
    reasons.push('Mức phí phù hợp ngân sách');
  }

  // Availability
  if (breakdown.availabilityScore >= 80) {
    reasons.push('Sẵn sàng nhận việc');
  }

  return reasons.slice(0, 4); // Max 4 reasons
}
