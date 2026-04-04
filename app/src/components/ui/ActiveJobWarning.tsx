'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import styles from './ActiveJobWarning.module.css';

interface ActiveJobWarningProps {
  count: number;
  threshold?: number;
  variant?: 'applicant' | 'freelancer';
  className?: string;
}

export function ActiveJobWarning({
  count,
  threshold = 3,
  variant = 'applicant',
  className = '',
}: ActiveJobWarningProps) {
  if (count < threshold) return null;

  return (
    <div className={`${styles.warning} ${className}`}>
      <AlertTriangle size={15} className={styles.icon} />
      <span className={styles.text}>
        {variant === 'applicant'
          ? `Ứng viên đang thực hiện ${count} job khác. Bạn vẫn muốn giao việc?`
          : `Bạn đang thực hiện ${count} job khác. Bạn chắc chắn muốn ứng tuyển?`
        }
      </span>
    </div>
  );
}
