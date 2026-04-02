'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Loader2, Inbox } from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { getJobs } from '@/lib/firebase/firestore';
import { cache, TTL } from '@/lib/cache/swr-cache';
import type { Job } from '@/types';
import styles from './page.module.css';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  in_progress: { label: 'Đang thực hiện', color: 'info' },
  assigned: { label: 'Đã giao việc', color: 'warning' },
  review: { label: 'Nghiệm thu', color: 'accent' },
  completed: { label: 'Hoàn thành', color: 'success' },
};

const formatDate = (d: unknown): string => {
  if (!d) return '-';
  if (typeof d === 'object' && d !== null && 'toDate' in d) return (d as { toDate: () => Date }).toDate().toLocaleDateString('vi-VN');
  if (d instanceof Date) return d.toLocaleDateString('vi-VN');
  return String(d);
};

export default function AdminProgressPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchJobs = async () => {
      const result = await cache.get('admin:progress:jobs', () => getJobs({}, 50), TTL.MEDIUM);
      const activeJobs = result.items.filter(j =>
        ['in_progress', 'assigned', 'review', 'completed'].includes(j.status)
      );
      setJobs(activeJobs);
      setLoading(false);
    };
    fetchJobs().catch(() => setLoading(false));
  }, []);

  const filtered = jobs.filter(j => filter === 'all' || j.status === filter);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}><Loader2 size={24} className={styles.spin} /> Đang tải...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Tiến độ Dự án</h1>
          <p className={styles.subtitle}>Theo dõi tiến độ thực hiện của tất cả dự án đang hoạt động.</p>
        </div>
      </div>

      <div className={styles.filterTabs}>
        <button className={`${styles.tab} ${filter === 'all' ? styles.active : ''}`} onClick={() => setFilter('all')}>Tất cả ({jobs.length})</button>
        <button className={`${styles.tab} ${filter === 'in_progress' ? styles.active : ''}`} onClick={() => setFilter('in_progress')}>Đang thực hiện</button>
        <button className={`${styles.tab} ${filter === 'review' ? styles.active : ''}`} onClick={() => setFilter('review')}>Nghiệm thu</button>
        <button className={`${styles.tab} ${filter === 'completed' ? styles.active : ''}`} onClick={() => setFilter('completed')}>Hoàn thành</button>
      </div>

      <div className={styles.jobList}>
        {filtered.map(job => (
          <Card key={job.id} className={styles.jobCard}>
            <div className={styles.jobMain}>
              <div className={styles.jobTags}>
                <Badge variant="outline" size="sm">{job.category}</Badge>
                {/* @ts-expect-error dynamic badge color */}
                <Badge variant={STATUS_LABELS[job.status]?.color || 'default'} size="sm">
                  {STATUS_LABELS[job.status]?.label || job.status}
                </Badge>
              </div>
              <h3 className={styles.jobTitle}>{job.title}</h3>
              <div className={styles.jobMeta}>
                <span><Clock size={14}/> Hạn: {formatDate(job.deadline)}</span>
                <span>Nhân sự: {job.assignedWorkerName || 'Chưa giao'}</span>
              </div>
            </div>
            <div className={styles.progressSection}>
              <div className={styles.pHeader}>
                <span>Tiến độ</span>
                <span className={styles.pPercent}>{job.progress ?? 0}%</span>
              </div>
              <div className={styles.pBar}>
                <div
                  className={styles.pFill}
                  style={{
                    width: `${job.progress ?? 0}%`,
                    background: (job.progress ?? 0) === 100 ? 'var(--color-success)' : 'var(--color-primary)',
                  }}
                />
              </div>
            </div>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className={styles.empty}><Inbox size={32}/> <p>Chưa có dự án nào.</p></div>
        )}
      </div>
    </div>
  );
}
