'use client';

import React, { useState } from 'react';
import { CheckCircle, Clock, AlertTriangle, User, Calendar, TrendingUp } from 'lucide-react';
import { Button, Card, Badge, StatusBadge, LevelBadge } from '@/components/ui';
import { Progress } from '@/components/ui';
import styles from './page.module.css';

const MOCK_ACTIVE_JOBS = [
  {
    id: '1', title: 'Thiết kế kiến trúc Nhà xưởng KCN Bình Dương', category: 'Kiến trúc', level: 'L3' as const,
    worker: 'Nguyễn Thanh Hùng', progress: 65, deadline: '17/05/2026', daysLeft: 45, status: 'in_progress' as const,
    milestones: [
      { name: 'Đợt 1 — 30%', amount: '14.4M', status: 'paid' as const },
      { name: 'Đợt 2 — 70%', amount: '19.2M', status: 'pending' as const },
      { name: 'Đợt 3 — 100%', amount: '14.4M', status: 'pending' as const },
    ],
  },
  {
    id: '2', title: 'BIM Modeling văn phòng 12 tầng Q7', category: 'BIM', level: 'L4' as const,
    worker: 'Trần Minh Tuấn', progress: 42, deadline: '01/06/2026', daysLeft: 60, status: 'in_progress' as const,
    milestones: [
      { name: 'Đợt 1 — 50%', amount: '32.5M', status: 'pending' as const },
      { name: 'Đợt 2 — 100%', amount: '32.5M', status: 'pending' as const },
    ],
  },
  {
    id: '3', title: 'Dự toán trường học TPHCM', category: 'Dự toán', level: 'L2' as const,
    worker: 'Lê Thị Hoa', progress: 90, deadline: '10/04/2026', daysLeft: 8, status: 'review' as const,
    milestones: [
      { name: 'Đợt 1 — 50%', amount: '12.5M', status: 'paid' as const },
      { name: 'Đợt 2 — 100%', amount: '12.5M', status: 'approved' as const },
    ],
  },
  {
    id: '4', title: 'Hệ thống MEP chung cư Thủ Đức', category: 'MEP', level: 'L3' as const,
    worker: 'Phạm Đức Anh', progress: 20, deadline: '05/04/2026', daysLeft: 3, status: 'in_progress' as const,
    milestones: [
      { name: 'Đợt 1 — 50%', amount: '27.5M', status: 'pending' as const },
      { name: 'Đợt 2 — 100%', amount: '27.5M', status: 'pending' as const },
    ],
  },
];

const MS_STATUS_COLORS: Record<string, string> = { paid: 'success', approved: 'warning', pending: 'default' };
const MS_STATUS_LABELS: Record<string, string> = { paid: 'Đã TT', approved: 'Chờ TT', pending: 'Chưa đạt' };

export default function AdminProgressPage() {
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Theo dõi Tiến độ</h1>
          <p className={styles.pageSubtitle}>Giám sát tiến độ và milestone thanh toán cho tất cả dự án đang hoạt động.</p>
        </div>
      </div>

      <div className={styles.summaryRow}>
        <Card variant="metric"><div className={styles.sumLabel}>Đang thực hiện</div><div className={styles.sumValue}>{MOCK_ACTIVE_JOBS.filter(j => j.status === 'in_progress').length}</div></Card>
        <Card variant="metric"><div className={styles.sumLabel}>Đang nghiệm thu</div><div className={styles.sumValue}>{MOCK_ACTIVE_JOBS.filter(j => j.status === 'review').length}</div></Card>
        <Card variant="metric"><div className={styles.sumLabel}>Cảnh báo Deadline</div><div className={styles.sumValue} style={{ color: 'var(--color-error)' }}>{MOCK_ACTIVE_JOBS.filter(j => j.daysLeft <= 7).length}</div></Card>
      </div>

      <div className={styles.jobsList}>
        {MOCK_ACTIVE_JOBS.map(job => (
          <Card key={job.id} variant="bordered" className={styles.jobCard}>
            <div className={styles.jobHeader}>
              <div className={styles.jobInfo}>
                <h3 className={styles.jobTitle}>{job.title}</h3>
                <div className={styles.jobMeta}>
                  <Badge variant="default">{job.category}</Badge>
                  <LevelBadge level={job.level} />
                  <span className={styles.metaItem}><User size={14} /> {job.worker}</span>
                  <span className={`${styles.metaItem} ${job.daysLeft <= 7 ? styles.deadlineWarning : ''}`}>
                    <Calendar size={14} /> {job.deadline} ({job.daysLeft} ngày)
                  </span>
                </div>
              </div>
              <StatusBadge status={job.status} label={job.status === 'review' ? 'Nghiệm thu' : 'Đang thực hiện'} />
            </div>

            <div className={styles.progressSection}>
              <div className={styles.progressLabel}>
                <span>Tiến độ tổng</span>
                <strong>{job.progress}%</strong>
              </div>
              <Progress value={job.progress} />
            </div>

            <div className={styles.milestonesRow}>
              <span className={styles.msLabel}>Milestones:</span>
              {job.milestones.map((ms, i) => (
                <div key={i} className={styles.msChip}>
                  <span>{ms.name}</span>
                  <span className={styles.msAmount}>{ms.amount}</span>
                  <Badge variant={MS_STATUS_COLORS[ms.status] as any}>{MS_STATUS_LABELS[ms.status]}</Badge>
                  {ms.status === 'pending' && job.progress >= 50 * (i + 1) && (
                    <Button variant="success" size="sm" icon={<CheckCircle size={12} />}>Duyệt</Button>
                  )}
                </div>
              ))}
            </div>

            {job.daysLeft <= 3 && (
              <div className={styles.warningBanner}>
                <AlertTriangle size={16} /> Deadline còn {job.daysLeft} ngày — cần theo dõi sát!
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
