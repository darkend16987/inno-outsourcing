'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, Filter, Clock, ArrowRight } from 'lucide-react';
import { Card, Badge, LevelBadge, Button } from '@/components/ui';
import styles from './page.module.css';

const MY_JOBS = [
  { id: 'job-1', title: 'Thiết kế kiến trúc Nhà xưởng KCN Bình Dương', category: 'Kiến trúc', level: 'L3', status: 'in_progress', progress: 45, deadline: '15/05/2026', totalFee: '48,000,000₫' },
  { id: 'job-2', title: 'BIM Modeling tổ hợp văn phòng 12 tầng Q7', category: 'BIM', level: 'L4', status: 'review', progress: 100, deadline: '01/05/2026', totalFee: '65,000,000₫' },
  { id: 'job-3', title: 'Dự toán công trình trường học TPHCM', category: 'Dự toán', level: 'L2', status: 'completed', progress: 100, deadline: '10/04/2026', totalFee: '25,000,000₫' },
];

const STATUS_MAP: Record<string, { label: string, color: string }> = {
  in_progress: { label: 'Đang thực hiện', color: 'info' },
  review: { label: 'Đang nghiệm thu', color: 'warning' },
  completed: { label: 'Hoàn thành', color: 'success' },
};

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.3 } }),
};

export default function MyJobsPage() {
  const [filter, setFilter] = useState('all');

  const filteredJobs = MY_JOBS.filter(job => filter === 'all' || job.status === filter);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Việc của tôi</h1>
          <p className={styles.subtitle}>Quản lý và cập nhật tiến độ các dự án bạn đang đảm nhận.</p>
        </div>
        <Link href="/jobs">
          <Button>Tìm việc mới</Button>
        </Link>
      </div>

      <div className={styles.filterTabs}>
        <button className={`${styles.tab} ${filter === 'all' ? styles.activeTab : ''}`} onClick={() => setFilter('all')}>Tất cả</button>
        <button className={`${styles.tab} ${filter === 'in_progress' ? styles.activeTab : ''}`} onClick={() => setFilter('in_progress')}>Đang thực hiện</button>
        <button className={`${styles.tab} ${filter === 'review' ? styles.activeTab : ''}`} onClick={() => setFilter('review')}>Chờ nghiệm thu</button>
        <button className={`${styles.tab} ${filter === 'completed' ? styles.activeTab : ''}`} onClick={() => setFilter('completed')}>Hoàn thành</button>
      </div>

      <div className={styles.jobList}>
        {filteredJobs.map((job, i) => (
          <motion.div key={job.id} initial="hidden" animate="visible" custom={i} variants={fadeUp}>
            <Card className={styles.jobCard}>
              <div className={styles.jobMain}>
                <div className={styles.jobTags}>
                  <Badge variant="outline" size="sm">{job.category}</Badge>
                  {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                  {/* @ts-ignore */}
                  <Badge variant={STATUS_MAP[job.status].color} size="sm">{STATUS_MAP[job.status].label}</Badge>
                </div>
                <h3 className={styles.jobTitle}>{job.title}</h3>
                <div className={styles.jobMeta}>
                  <span><Clock size={14}/> Hạn hoàn thành: {job.deadline}</span>
                  <span className={styles.fee}>{job.totalFee}</span>
                </div>
              </div>

              <div className={styles.jobAction}>
                <div className={styles.progressBlock}>
                  <div className={styles.pHeader}>
                    <span>Tiến độ</span>
                    <span>{job.progress}%</span>
                  </div>
                  <div className={styles.pBar}>
                    <div className={styles.pFill} style={{ width: `${job.progress}%`, background: job.progress === 100 ? 'var(--color-success)' : 'var(--color-primary)' }} />
                  </div>
                </div>
                <Link href={`/freelancer/jobs/${job.id}`}>
                  <Button variant="outline" size="sm">Chi tiết <ArrowRight size={14}/></Button>
                </Link>
              </div>
            </Card>
          </motion.div>
        ))}
        {filteredJobs.length === 0 && (
          <div className={styles.empty}>
            <p>Chưa có dự án nào trong trạng thái này.</p>
          </div>
        )}
      </div>
    </div>
  );
}
