'use client';

import React from 'react';
import styles from './AvailabilityBadge.module.css';
import type { AvailabilityStatus } from '@/types';

interface AvailabilityBadgeProps {
  status: AvailabilityStatus;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

const CONFIG: Record<AvailabilityStatus, {
  label: string;
  color: string;
}> = {
  available: {
    label: 'Sẵn sàng',
    color: '#10b981',
  },
  partially_busy: {
    label: 'Bận một phần',
    color: '#f59e0b',
  },
  unavailable: {
    label: 'Không available',
    color: '#ef4444',
  },
};

export function AvailabilityBadge({
  status,
  size = 'md',
  showLabel = true,
  className = '',
}: AvailabilityBadgeProps) {
  const config = CONFIG[status];

  return (
    <span className={`${styles.badge} ${styles[size]} ${styles[status]} ${className}`}>
      <span className={`${styles.dot} ${styles[`dot_${status}`]}`} />
      {showLabel && <span className={styles.label}>{config.label}</span>}
    </span>
  );
}
