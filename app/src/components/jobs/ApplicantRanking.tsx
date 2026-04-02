'use client';

import React, { useState } from 'react';
import {
  Trophy, Star, ChevronDown, ChevronUp,
  UserCheck, ExternalLink, Shield, Zap,
} from 'lucide-react';
import styles from './ApplicantRanking.module.css';
import { MatchBadge, MatchScoreBar } from '@/components/ui/MatchBadge';
import { TrustBadge } from '@/components/ui/TrustBadge';
import { AvailabilityBadge } from '@/components/ui/AvailabilityBadge';
import type { ApplicantScore } from '@/lib/matching/scoring';
import type { TrustBadgeLevel, AvailabilityStatus } from '@/types';

interface EnrichedApplicantScore extends ApplicantScore {
  trustBadge?: TrustBadgeLevel;
  trustScore?: number;
  availability?: AvailabilityStatus;
  photoURL?: string;
  level?: string;
}

interface ApplicantRankingProps {
  applicants: EnrichedApplicantScore[];
  onSelectApplicant?: (applicantId: string) => void;
  onViewProfile?: (applicantId: string) => void;
  className?: string;
}

export function ApplicantRanking({
  applicants,
  onSelectApplicant,
  onViewProfile,
  className = '',
}: ApplicantRankingProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!applicants || applicants.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Chưa có ứng viên nào apply cho job này.</p>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <Trophy size={18} />
          Xếp hạng ứng viên
        </h3>
        <span className={styles.subtitle}>
          {applicants.length} ứng viên • Tự động xếp hạng bởi AI
        </span>
      </div>

      <div className={styles.list}>
        {applicants.map((applicant, idx) => {
          const isExpanded = expandedId === applicant.applicationId;
          const isTop = idx === 0;

          return (
            <div
              key={applicant.applicationId}
              className={`${styles.card} ${isTop ? styles.topCard : ''}`}
            >
              <div
                className={styles.cardMain}
                onClick={() => setExpandedId(
                  isExpanded ? null : applicant.applicationId,
                )}
              >
                <div className={styles.rank}>
                  {isTop ? (
                    <span className={styles.rankGold}>🥇</span>
                  ) : idx === 1 ? (
                    <span className={styles.rankSilver}>🥈</span>
                  ) : idx === 2 ? (
                    <span className={styles.rankBronze}>🥉</span>
                  ) : (
                    <span className={styles.rankNum}>#{idx + 1}</span>
                  )}
                </div>

                <div className={styles.userInfo}>
                  <div className={styles.nameRow}>
                    <span className={styles.name}>{applicant.applicantName}</span>
                    {applicant.level && (
                      <span className={styles.level}>{applicant.level}</span>
                    )}
                  </div>
                  <div className={styles.badges}>
                    {applicant.badge && (
                      <MatchBadge
                        badge={applicant.badge}
                        score={applicant.score}
                        reasons={applicant.reasons}
                        size="sm"
                      />
                    )}
                    {applicant.trustBadge && (
                      <TrustBadge
                        badge={applicant.trustBadge}
                        score={applicant.trustScore}
                        size="sm"
                        showTooltip={false}
                      />
                    )}
                    {applicant.availability && (
                      <AvailabilityBadge
                        status={applicant.availability}
                        size="sm"
                      />
                    )}
                  </div>
                </div>

                <div className={styles.scoreCol}>
                  <MatchScoreBar score={applicant.score} />
                </div>

                <div className={styles.expandIcon}>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {isExpanded && (
                <div className={styles.expanded}>
                  <div className={styles.breakdownGrid}>
                    <BreakdownItem label="Kỹ năng" value={applicant.breakdown.skillMatch} icon="🎯" />
                    <BreakdownItem label="Level" value={applicant.breakdown.levelMatch} icon="📊" />
                    <BreakdownItem label="Kinh nghiệm" value={applicant.breakdown.historyScore} icon="📋" />
                    <BreakdownItem label="Sẵn sàng" value={applicant.breakdown.availabilityScore} icon="⏰" />
                    <BreakdownItem label="Mức phí" value={applicant.breakdown.priceScore} icon="💰" />
                    <BreakdownItem label="Đánh giá" value={applicant.breakdown.ratingScore} icon="⭐" />
                  </div>

                  {applicant.reasons.length > 0 && (
                    <div className={styles.reasons}>
                      <span className={styles.reasonsTitle}>Vì sao phù hợp:</span>
                      {applicant.reasons.map((r, i) => (
                        <span key={i} className={styles.reasonTag}>✓ {r}</span>
                      ))}
                    </div>
                  )}

                  <div className={styles.expandedActions}>
                    <button
                      className={styles.profileBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewProfile?.(applicant.applicantId);
                      }}
                    >
                      <ExternalLink size={14} />
                      Xem hồ sơ
                    </button>
                    <button
                      className={styles.selectBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectApplicant?.(applicant.applicantId);
                      }}
                    >
                      <UserCheck size={14} />
                      Chọn ứng viên
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =====================
// Sub-components
// =====================

function BreakdownItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  const getColor = () => {
    if (value >= 80) return '#10b981';
    if (value >= 60) return '#3b82f6';
    if (value >= 40) return '#f59e0b';
    return '#94a3b8';
  };

  return (
    <div className={styles.breakdownItem}>
      <span className={styles.breakdownIcon}>{icon}</span>
      <span className={styles.breakdownLabel}>{label}</span>
      <div className={styles.breakdownBar}>
        <div
          className={styles.breakdownFill}
          style={{ width: `${value}%`, background: getColor() }}
        />
      </div>
      <span className={styles.breakdownValue} style={{ color: getColor() }}>
        {value}
      </span>
    </div>
  );
}
