'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Clock, ArrowRight, Loader2, Inbox } from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';
import { useAuth } from '@/lib/firebase/auth-context';
import { getApplicationsForFreelancer, getJobById } from '@/lib/firebase/firestore';
import styles from './page.module.css';

interface MyJobEntry {
  id: string;
  title: string;
  category: string;
  level: string;
  status: string;
  progress: number;
  deadline: string;
  totalFee: string;
}

const STATUS_MAP: Record<string, { label: string, color: string }> = {
  in_progress: { label: 'Đang thực hiện', color: 'info' },
  review: { label: 'Đang nghiệm thu', color: 'warning' },
  completed: { label: 'Hoàn thành', color: 'success' },
  assigned: { label: 'Đã nhận việc', color: 'info' },
};

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.3 } }),
};

const formatDate = (d: unknown): string => {
  if (!d) return '';
  if (typeof d === 'object' && d !== null && 'toDate' in d) return (d as { toDate: () => Date }).toDate().toLocaleDateString('vi-VN');
  if (d instanceof Date) return d.toLocaleDateString('vi-VN');
  return String(d);
};

const formatCurrency = (amount: number) => `${amount.toLocaleString('vi-VN')}₫`;

export default function MyJobsPage() {
  const { userProfile } = useAuth();
  const [filter, setFilter] = useState('all');
  const [jobs, setJobs] = useState<MyJobEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.uid) return;
    const fetchJobs = async () => {
      const apps = await getApplicationsForFreelancer(userProfile.uid);
      const acceptedApps = apps.filter(a => a.status === 'accepted');
      const entries: MyJobEntry[] = [];
      for (const app of acceptedApps) {
        const job = await getJobById(app.jobId);
        if (job) {
          entries.push({
            id: job.id,
            title: job.title,
            category: job.category,
            level: job.level,
            status: job.status,
            progress: job.progress ?? 0,
            deadline: formatDate(job.deadline),
            totalFee: formatCurrency(job.totalFee),
          });
        }
      }
      setJobs(entries);
      setLoading(false);
    };
    fetchJobs().catch(() => setLoading(false));
  }, [userProfile?.uid]);

  const filteredJobs = jobs.filter(job => filter === 'all' || job.status === filter);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}><Loader2 size={24} className={styles.spin} /> Đang tải dữ liệu...</div>
      </div>
    );
  }

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
                  {/* @ts-expect-error Badge variant type mismatch */}
                  <Badge variant={STATUS_MAP[job.status]?.color || 'default'} size="sm">{STATUS_MAP[job.status]?.label || job.status}</Badge>
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
            <Inbox size={32} />
            <p>Chưa có dự án nào trong trạng thái này.</p>
          </div>
        )}
      </div>
    </div>
  );
}
