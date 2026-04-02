'use client';

import React from 'react';
import { Sparkles, ArrowRight, Laptop, Clock, DollarSign, Zap } from 'lucide-react';
import styles from './RecommendedJobs.module.css';
import type { Job } from '@/types';

interface RecommendedJob {
  job: Job;
  score: number;
  reasons: string[];
}

interface RecommendedJobsProps {
  jobs: RecommendedJob[];
  onViewJob?: (jobId: string) => void;
  onApplyJob?: (jobId: string) => void;
  className?: string;
}

export function RecommendedJobs({
  jobs,
  onViewJob,
  onApplyJob,
  className = '',
}: RecommendedJobsProps) {
  if (!jobs || jobs.length === 0) return null;

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Sparkles size={18} className={styles.headerIcon} />
          <h3 className={styles.title}>Đề xuất cho bạn</h3>
        </div>
        <span className={styles.subtitle}>
          Dựa trên kỹ năng & kinh nghiệm
        </span>
      </div>

      <div className={styles.grid}>
        {jobs.map(({ job, score, reasons }) => (
          <div key={job.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.scoreBadge}>
                <Zap size={12} />
                {score}% phù hợp
              </div>
              <span className={styles.category}>{job.category}</span>
            </div>

            <h4 className={styles.jobTitle}>{job.title}</h4>

            <div className={styles.meta}>
              {job.totalFee && (
                <span className={styles.metaItem}>
                  <DollarSign size={12} />
                  {new Intl.NumberFormat('vi-VN').format(job.totalFee)} ₫
                </span>
              )}
              {job.deadline && (
                <span className={styles.metaItem}>
                  <Clock size={12} />
                  {new Date(job.deadline).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                  })}
                </span>
              )}
              {job.workMode && (
                <span className={styles.metaItem}>
                  <Laptop size={12} />
                  {job.workMode === 'remote' ? 'Remote' : job.workMode === 'on-site' ? 'On-site' : 'Hybrid'}
                </span>
              )}
            </div>

            <div className={styles.reasons}>
              {reasons.slice(0, 3).map((reason, idx) => (
                <span key={idx} className={styles.reasonTag}>✓ {reason}</span>
              ))}
            </div>

            <div className={styles.cardActions}>
              <button
                className={styles.viewBtn}
                onClick={() => onViewJob?.(job.id)}
              >
                Chi tiết
              </button>
              <button
                className={styles.applyBtn}
                onClick={() => onApplyJob?.(job.id)}
              >
                Apply ngay
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
