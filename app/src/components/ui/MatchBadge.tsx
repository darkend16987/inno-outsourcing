'use client';

import React from 'react';
import { Trophy, Star, Info } from 'lucide-react';
import styles from './MatchBadge.module.css';
import type { MatchBadge as MatchBadgeType } from '@/types';

interface MatchBadgeProps {
  badge: MatchBadgeType;
  score?: number;
  reasons?: string[];
  size?: 'sm' | 'md';
  className?: string;
}

const BADGE_CONFIG: Record<MatchBadgeType, {
  icon: typeof Trophy;
  label: string;
  color: string;
}> = {
  top_match: {
    icon: Trophy,
    label: 'Top Match',
    color: '#f59e0b',
  },
  recommended: {
    icon: Star,
    label: 'Recommended',
    color: '#3b82f6',
  },
};

export function MatchBadge({
  badge,
  score,
  reasons,
  size = 'md',
  className = '',
}: MatchBadgeProps) {
  const config = BADGE_CONFIG[badge];
  const IconComponent = config.icon;
  const iconSize = size === 'sm' ? 12 : 14;

  return (
    <div className={`${styles.wrapper} ${className}`}>
      <span className={`${styles.badge} ${styles[badge]} ${styles[size]}`}>
        <IconComponent size={iconSize} />
        <span>{config.label}</span>
        {score !== undefined && (
          <span className={styles.score}>{score}%</span>
        )}
      </span>

      {reasons && reasons.length > 0 && (
        <div className={styles.tooltip}>
          <div className={styles.tooltipTitle}>
            <Info size={12} />
            Vì sao phù hợp?
          </div>
          <ul className={styles.reasonList}>
            {reasons.map((reason, idx) => (
              <li key={idx}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Score indicator bar for application lists
 */
export function MatchScoreBar({
  score,
  className = '',
}: {
  score: number;
  className?: string;
}) {
  const getColor = () => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#3b82f6';
    if (score >= 40) return '#f59e0b';
    return '#94a3b8';
  };

  return (
    <div className={`${styles.scoreBar} ${className}`}>
      <div className={styles.scoreTrack}>
        <div
          className={styles.scoreFill}
          style={{ width: `${score}%`, background: getColor() }}
        />
      </div>
      <span className={styles.scoreValue} style={{ color: getColor() }}>
        {score}
      </span>
    </div>
  );
}
