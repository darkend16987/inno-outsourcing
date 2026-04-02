'use client';

import React from 'react';
import { AlertTriangle, Clock, ExternalLink } from 'lucide-react';
import styles from './DeadlineAlert.module.css';
import type { DeadlineSeverity } from '@/lib/services/deadline-checker';
import { DEADLINE_SEVERITY_CONFIG } from '@/lib/services/deadline-checker';

interface DeadlineAlertProps {
  severity: DeadlineSeverity;
  daysRemaining: number;
  progress: number;
  jobTitle: string;
  jobLink?: string;
  onDismiss?: () => void;
  className?: string;
}

export function DeadlineAlert({
  severity,
  daysRemaining,
  progress,
  jobTitle,
  jobLink,
  onDismiss,
  className = '',
}: DeadlineAlertProps) {
  const config = DEADLINE_SEVERITY_CONFIG[severity];
  const isOverdue = daysRemaining <= 0;

  return (
    <div
      className={`${styles.alert} ${styles[severity]} ${className}`}
      style={{
        '--alert-color': config.color,
        '--alert-bg': config.bgColor,
      } as React.CSSProperties}
    >
      <div className={styles.iconCol}>
        {severity === 'critical' || severity === 'urgent' ? (
          <AlertTriangle size={18} />
        ) : (
          <Clock size={18} />
        )}
      </div>

      <div className={styles.body}>
        <div className={styles.header}>
          <span className={styles.badge}>{config.label}</span>
          <span className={styles.titleText}>
            {isOverdue
              ? `Quá hạn ${Math.abs(daysRemaining)} ngày`
              : `Còn ${daysRemaining} ngày`
            }
          </span>
        </div>

        <span className={styles.jobName}>{jobTitle}</span>

        <div className={styles.progressRow}>
          <span className={styles.progressLabel}>Tiến độ</span>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <span className={styles.progressPct}>{progress}%</span>
        </div>

        {progress < 50 && severity !== 'info' && (
          <span className={styles.warning}>
            ⚠ Tiến độ thấp hơn mức khuyến nghị
          </span>
        )}
      </div>

      <div className={styles.actions}>
        {jobLink && (
          <a href={jobLink} className={styles.viewBtn}>
            <ExternalLink size={14} />
          </a>
        )}
        {onDismiss && (
          <button className={styles.dismissBtn} onClick={onDismiss}>
            ×
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Compact inline deadline indicator (for job cards)
 */
export function DeadlineIndicator({
  daysRemaining,
  className = '',
}: {
  daysRemaining: number;
  className?: string;
}) {
  let color = '#94a3b8';
  let text = `${daysRemaining} ngày`;

  if (daysRemaining <= 0) {
    color = '#dc2626';
    text = `Quá hạn ${Math.abs(daysRemaining)}d`;
  } else if (daysRemaining <= 1) {
    color = '#ef4444';
    text = '1 ngày';
  } else if (daysRemaining <= 3) {
    color = '#f59e0b';
  } else if (daysRemaining <= 7) {
    color = '#3b82f6';
  }

  return (
    <span className={`${styles.indicator} ${className}`} style={{ color }}>
      <Clock size={12} />
      {text}
    </span>
  );
}
