'use client';

import React from 'react';
import Link from 'next/link';
import { Trophy, ArrowRight } from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';
import type { Challenge } from '@/types';
import styles from './ChallengeCard.module.css';

interface ChallengeCardProps {
  challenge: Challenge;
  userProgress?: number;
  className?: string;
}

export function ChallengeCard({ challenge, userProgress = 0, className }: ChallengeCardProps) {
  const progressPercent = challenge.target > 0
    ? Math.min(100, Math.round((userProgress / challenge.target) * 100))
    : 0;
  const isCompleted = userProgress >= challenge.target;

  return (
    <Card className={`${styles.card} ${className || ''}`}>
      <div className={styles.header}>
        <div className={styles.iconWrap}>
          <Trophy size={20} />
        </div>
        <div className={styles.headerInfo}>
          <h4 className={styles.title}>{challenge.title}</h4>
          {challenge.category && (
            <Badge size="sm" variant="outline">{challenge.category}</Badge>
          )}
        </div>
      </div>

      <p className={styles.description}>{challenge.description}</p>

      <div className={styles.progressSection}>
        <div className={styles.progressHeader}>
          <span className={styles.progressText}>
            {userProgress}/{challenge.target} hoàn thành
          </span>
          <span className={styles.progressPercent}>{progressPercent}%</span>
        </div>
        <div className={styles.progressBar}>
          <div
            className={`${styles.progressFill} ${isCompleted ? styles.completed : ''}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {isCompleted ? (
        <div className={styles.completedBadge}>
          <Trophy size={14} /> Đã hoàn thành! Bạn nhận được huy hiệu.
        </div>
      ) : (
        <Link href={`/freelancer/jobs?category=${challenge.category || ''}`} className={styles.ctaLink}>
          <Button size="sm" variant="outline" fullWidth>
            Tìm thêm jobs {challenge.category || ''} <ArrowRight size={14} />
          </Button>
        </Link>
      )}
    </Card>
  );
}
