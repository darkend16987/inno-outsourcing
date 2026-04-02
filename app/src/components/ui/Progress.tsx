'use client';

import React from 'react';
import styles from './Progress.module.css';

interface ProgressProps {
  value: number; // 0-100
  className?: string;
  size?: 'sm' | 'md';
  color?: 'primary' | 'accent' | 'success';
}

export function Progress({ value, className = '', size = 'sm', color = 'primary' }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={`${styles.track} ${styles[size]} ${className}`}>
      <div
        className={`${styles.fill} ${styles[color]}`}
        style={{ width: `${clamped}%` }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
      />
    </div>
  );
}
