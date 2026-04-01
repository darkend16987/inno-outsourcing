'use client';

import React from 'react';
import styles from './Badge.module.css';
import type { JobLevel, JobStatus, BadgeType as BadgeTypeEnum } from '@/types';

type BadgeVariant = 'level' | 'status' | 'role' | 'default' | 'info' | 'success' | 'warning' | 'error' | 'outline';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  level?: JobLevel;
  status?: JobStatus | string;
  className?: string;
  size?: 'sm' | 'md';
  dot?: boolean;
}

export function Badge({
  children,
  variant = 'default',
  level,
  status,
  className = '',
  size = 'md',
  dot = false,
}: BadgeProps) {
  const classes = [
    styles.badge,
    styles[size],
    variant === 'level' && level ? styles[`level${level}`] : '',
    variant === 'status' && status ? styles[`status_${status}`] : '',
    variant === 'role' ? styles.role : '',
    variant === 'info' ? styles.info : '',
    variant === 'success' ? styles.success : '',
    variant === 'warning' ? styles.warning : '',
    variant === 'error' ? styles.error : '',
    variant === 'outline' ? styles.outline : '',
    variant === 'default' ? styles.default : '',
    dot ? styles.withDot : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={classes}>
      {dot && <span className={styles.dot} />}
      {children}
    </span>
  );
}

// Quick convenience components
export function LevelBadge({ level }: { level: JobLevel }) {
  return <Badge variant="level" level={level}>{level}</Badge>;
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <Badge variant="status" status={status}>
      {label || status}
    </Badge>
  );
}
