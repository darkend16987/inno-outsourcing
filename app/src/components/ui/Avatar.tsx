'use client';

import React from 'react';
import styles from './Avatar.module.css';
import type { JobLevel } from '@/types';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  level?: JobLevel;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({ src, name, size = 'md', level, className = '' }: AvatarProps) {
  const classes = [styles.avatar, styles[size], className].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {src ? (
        <img src={src} alt={name} className={styles.img} />
      ) : (
        <span className={styles.initials}>{getInitials(name)}</span>
      )}
      {level && <span className={`${styles.levelBadge} ${styles[`level${level}`]}`}>{level}</span>}
    </div>
  );
}
