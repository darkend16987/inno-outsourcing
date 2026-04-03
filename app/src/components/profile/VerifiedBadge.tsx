'use client';

import React from 'react';
import { ShieldCheck, Clock, XCircle } from 'lucide-react';
import styles from './VerifiedBadge.module.css';

interface VerifiedBadgeProps {
  verifiedCount: number;
  pendingCount?: number;
  rejectedCount?: number;
  size?: 'sm' | 'md';
  showDetails?: boolean;
  className?: string;
}

export function VerifiedBadge({
  verifiedCount,
  pendingCount = 0,
  rejectedCount = 0,
  size = 'md',
  showDetails = false,
  className,
}: VerifiedBadgeProps) {
  if (verifiedCount === 0 && pendingCount === 0) return null;

  return (
    <div className={`${styles.badge} ${styles[size]} ${className || ''}`}>
      {verifiedCount > 0 && (
        <span className={styles.verified}>
          <ShieldCheck size={size === 'sm' ? 14 : 16} />
          {showDetails
            ? `${verifiedCount} chứng chỉ đã xác minh`
            : `Đã xác minh (${verifiedCount})`}
        </span>
      )}
      {showDetails && pendingCount > 0 && (
        <span className={styles.pending}>
          <Clock size={size === 'sm' ? 14 : 16} />
          {pendingCount} chờ xác minh
        </span>
      )}
      {showDetails && rejectedCount > 0 && (
        <span className={styles.rejected}>
          <XCircle size={size === 'sm' ? 14 : 16} />
          {rejectedCount} bị từ chối
        </span>
      )}
    </div>
  );
}
