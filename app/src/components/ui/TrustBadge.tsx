'use client';

import React, { useState } from 'react';
import { Shield, ShieldCheck, ShieldAlert, Star, Clock, Briefcase, TrendingUp } from 'lucide-react';
import styles from './TrustBadge.module.css';
import type { TrustBadgeLevel, UserStats } from '@/types';
import { calculateTrustScore, type TrustScoreBreakdown } from '@/lib/matching/trust-score';

interface TrustBadgeProps {
  badge: TrustBadgeLevel;
  score?: number;
  stats?: UserStats;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

const BADGE_CONFIG: Record<TrustBadgeLevel, {
  icon: typeof ShieldCheck;
  label: string;
  color: string;
}> = {
  trusted: {
    icon: ShieldCheck,
    label: 'Đáng tin cậy',
    color: '#10b981',
  },
  rising: {
    icon: Shield,
    label: 'Đang phát triển',
    color: '#f59e0b',
  },
  new: {
    icon: ShieldAlert,
    label: 'Mới',
    color: '#94a3b8',
  },
};

export function TrustBadge({
  badge,
  score,
  stats,
  size = 'md',
  showTooltip = true,
  className = '',
}: TrustBadgeProps) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const config = BADGE_CONFIG[badge];
  const IconComponent = config.icon;

  const breakdown = stats ? calculateTrustScore(stats) : null;

  const iconSize = size === 'sm' ? 12 : size === 'lg' ? 20 : 16;

  return (
    <div
      className={`${styles.wrapper} ${className}`}
      onMouseEnter={() => showTooltip && setTooltipVisible(true)}
      onMouseLeave={() => setTooltipVisible(false)}
    >
      <span className={`${styles.badge} ${styles[badge]} ${styles[size]}`}>
        <IconComponent size={iconSize} />
        <span className={styles.label}>{config.label}</span>
        {score !== undefined && (
          <span className={styles.score}>{score}</span>
        )}
      </span>

      {tooltipVisible && breakdown && (
        <div className={styles.tooltip}>
          <div className={styles.tooltipHeader}>
            <strong>Trust Score: {breakdown.totalScore}/100</strong>
          </div>
          <div className={styles.tooltipBreakdown}>
            <div className={styles.tooltipRow}>
              <Star size={12} />
              <span>Đánh giá trung bình</span>
              <span className={styles.tooltipValue}>{breakdown.avgRatingScore}</span>
            </div>
            <div className={styles.tooltipRow}>
              <Clock size={12} />
              <span>Tỷ lệ đúng hạn</span>
              <span className={styles.tooltipValue}>{breakdown.onTimeScore}</span>
            </div>
            <div className={styles.tooltipRow}>
              <Briefcase size={12} />
              <span>Số dự án hoàn thành</span>
              <span className={styles.tooltipValue}>{breakdown.completionScore}</span>
            </div>
            <div className={styles.tooltipRow}>
              <TrendingUp size={12} />
              <span>Kinh nghiệm</span>
              <span className={styles.tooltipValue}>{breakdown.experienceScore}</span>
            </div>
          </div>
          {badge !== 'trusted' && (
            <div className={styles.tooltipHint}>
              Cần ≥{breakdown.minJobsForTrusted} jobs hoàn thành và score ≥80 để đạt "Đáng tin cậy"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
