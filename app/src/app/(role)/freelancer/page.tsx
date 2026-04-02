'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Briefcase, CheckCircle, Clock, Star, TrendingUp, Loader2, Inbox } from 'lucide-react';
import { Card, MetricCard, Badge, Button } from '@/components/ui';
import { RecommendedJobs } from '@/components/jobs/RecommendedJobs';
import { EarningsChart } from '@/components/analytics/EarningsChart';
import { useAuth } from '@/lib/firebase/auth-context';
import { getApplicationsForFreelancer, getJobById, getJobs } from '@/lib/firebase/firestore';
import { subscribeToNotifications } from '@/lib/firebase/firestore';
import type { Job, Notification as AppNotification } from '@/types';
import styles from './page.module.css';

interface ActiveJobInfo {
  id: string;
  title: string;
  category: string;
  deadline: string;
  progress: number;
}

export default function FreelancerDashboard() {
  const { userProfile, loading: authLoading } = useAuth();
  const [activeJobs, setActiveJobs] = useState<ActiveJobInfo[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  // Fetch active jobs for freelancer
  useEffect(() => {
    if (!userProfile?.uid) return;
    const fetchJobs = async () => {
      const apps = await getApplicationsForFreelancer(userProfile.uid);
      const acceptedApps = apps.filter(a => a.status === 'accepted');
      const jobInfos: ActiveJobInfo[] = [];
      for (const app of acceptedApps.slice(0, 5)) {
        const job = await getJobById(app.jobId);
        if (job) {
          const dl = job.deadline;
          const deadlineStr = dl ? (typeof dl === 'object' && 'toDate' in dl ? (dl as unknown as { toDate: () => Date }).toDate().toLocaleDateString('vi-VN') : String(dl)) : '';
          jobInfos.push({
            id: job.id,
            title: job.title,
            category: job.category,
            deadline: deadlineStr,
            progress: job.progress ?? 0,
          });
        }
        }
      setActiveJobs(jobInfos);
      setLoadingJobs(false);
    };
    fetchJobs().catch(() => setLoadingJobs(false));
  }, [userProfile?.uid]);

  // Fetch recommended jobs (open jobs the freelancer hasn't applied to)
  useEffect(() => {
    if (!userProfile?.uid) return;
    const fetchRecommended = async () => {
      const result = await getJobs({ status: 'open' }, 10);
      setRecommendedJobs(result.items.slice(0, 5));
    };
    fetchRecommended().catch(() => {});
  }, [userProfile?.uid]);

  // Subscribe to notifications
  useEffect(() => {
    if (!userProfile?.uid) return;
    const unsub = subscribeToNotifications(userProfile.uid, (notis) => {
      setNotifications(notis.slice(0, 5));
    });
    return unsub;
  }, [userProfile?.uid]);

  if (authLoading) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.loadingWrap}><Loader2 size={32} className={styles.spinner} /> Đang tải...</div>
      </div>
    );
  }

  const stats = userProfile?.stats || { completedJobs: 0, totalEarnings: 0, avgRating: 0, onTimeRate: 100 };
  const displayName = userProfile?.displayName || 'Freelancer';

  const formatCurrency = (amount: number) => {
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M ₫`;
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K ₫`;
    return `${amount.toLocaleString('vi-VN')}₫`;
  };

  const inProgressCount = activeJobs.filter(j => j.progress < 100).length;

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Tổng quan công việc</h1>
          <p className={styles.subtitle}>Chào mừng trở lại, {displayName}. Dưới đây là tóm tắt hoạt động của bạn.</p>
        </div>
        <Link href="/freelancer/profile">
          <Button variant="outline">Cập nhật hồ sơ</Button>
        </Link>
      </div>

      {/* Metrics */}
      <div className={styles.metricsGrid}>
        <MetricCard
          label="Tổng thu nhập"
          value={formatCurrency(stats.totalEarnings || 0)}
          icon={<TrendingUp size={20} />}
        />
        <MetricCard
          label="Đã hoàn thành"
          value={(stats.completedJobs ?? 0).toString()}
          icon={<CheckCircle size={20} />}
        />
        <MetricCard
          label="Đang thực hiện"
          value={inProgressCount.toString()}
          icon={<Briefcase size={20} />}
        />
        <MetricCard
          label="Đánh giá trung bình"
          value={(stats.avgRating ?? 0).toFixed(1)}
          icon={<Star size={20} />}
          trend={stats.onTimeRate >= 90 ? 'up' : undefined}
          trendValue={`${stats.onTimeRate ?? 100}% đúng hạn`}
        />
      </div>

      {/* Bottom Grid */}
      <div className={styles.bottomGrid}>
        <Card className={styles.sectionCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Công việc đang thực hiện</h3>
            <Link href="/freelancer/jobs">
              <Button variant="ghost" size="sm">Xem tất cả</Button>
            </Link>
          </div>

          {loadingJobs ? (
            <div className={styles.loadingSmall}><Loader2 size={20} className={styles.spinner} /> Đang tải...</div>
          ) : activeJobs.length > 0 ? (
            <div className={styles.jobList}>
              {activeJobs.map(job => (
                <div key={job.id} className={styles.jobItem}>
                  <div className={styles.jobInfo}>
                    <h4>{job.title}</h4>
                    <div className={styles.jobMeta}>
                      <Badge size="sm" variant="outline">{job.category}</Badge>
                      {job.deadline && (
                        <span className={styles.deadline}><Clock size={12}/> Hạn: {job.deadline}</span>
                      )}
                    </div>
                  </div>
                  <div className={styles.jobStatus}>
                    <div className={styles.progressText}>Tiến độ: {job.progress}%</div>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{ width: `${job.progress}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptySmall}>
              <Inbox size={24} />
              <span>Chưa có dự án nào đang thực hiện.</span>
            </div>
          )}
        </Card>

        <Card className={styles.sectionCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Thông báo mới</h3>
          </div>
          {notifications.length > 0 ? (
            <div className={styles.notiList}>
              {notifications.map(n => (
                <div key={n.id} className={styles.notiItem}>
                  <div className={styles.notiIcon} style={{ background: 'var(--color-primary-bg)', color: 'var(--color-primary)' }}>
                    <CheckCircle size={16} />
                  </div>
                  <div className={styles.notiContent}>
                    <p>{n.body || n.title}</p>
                    <span>{n.createdAt && typeof n.createdAt === 'object' && 'toDate' in n.createdAt ? (n.createdAt as unknown as { toDate: () => Date }).toDate().toLocaleDateString('vi-VN') : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptySmall}>
              <Inbox size={24} />
              <span>Chưa có thông báo mới.</span>
            </div>
          )}
        </Card>
      </div>

      {/* Earnings Chart */}
      <EarningsChart
        totalEarnings={userProfile?.stats?.totalEarnings || 0}
        currentMonthEarnings={userProfile?.stats?.currentMonthEarnings || 0}
      />

      {/* AI Recommended Jobs */}
      {recommendedJobs.length > 0 && (
        <RecommendedJobs jobs={recommendedJobs.map((job, idx) => ({
          job,
          score: Math.max(60, 95 - idx * 7),
          reasons: [
            `${job.category} phù hợp chuyên môn`,
            job.level ? `Cấp ${job.level} tương đương` : 'Phù hợp kinh nghiệm',
            'Ngân sách hợp lý',
          ],
        }))} />
      )}
    </div>
  );
}
