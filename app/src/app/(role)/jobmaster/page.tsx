'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FolderKanban, Users, CheckSquare, Clock, ArrowRight, Loader2, Inbox } from 'lucide-react';
import { Card, MetricCard, Badge, Button } from '@/components/ui';
import { useAuth } from '@/lib/firebase/auth-context';
import { getJobs, getAllApplications } from '@/lib/firebase/firestore';
import { cache, TTL } from '@/lib/cache/swr-cache';
import type { Job } from '@/types';
import styles from './page.module.css';

export default function JobMasterDashboard() {
  const { userProfile, loading: authLoading } = useAuth();
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [pendingApps, setPendingApps] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.uid) return;
    const fetchStats = async () => {
      // Use allSettled so one failure doesn't block the other
      const [jobsResult, appsResult] = await Promise.allSettled([
        cache.get(`jm:jobs:${userProfile.uid}`, () => getJobs({ jobMaster: userProfile.uid }, 200), TTL.SHORT),
        cache.get(`jm:apps:${userProfile.uid}`, () => getAllApplications({ status: 'pending' }, 200), TTL.SHORT),
      ]);

      const managed = jobsResult.status === 'fulfilled' ? jobsResult.value.items : [];
      if (jobsResult.status === 'rejected') {
        console.error('[JMDashboard] Jobs fetch failed:', jobsResult.reason);
      }
      setMyJobs(managed);

      if (appsResult.status === 'fulfilled') {
        setPendingApps(appsResult.value.items.filter(a => managed.some(j => j.id === a.jobId)).length);
      } else {
        console.error('[JMDashboard] Apps fetch failed:', appsResult.reason);
      }
      setLoading(false);
    };
    fetchStats().catch((err) => { console.error('[JMDashboard] fetchStats error:', err); setLoading(false); });
  }, [userProfile?.uid]);

  if (authLoading || loading) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.loadingWrap}><Loader2 size={24} className={styles.spinner} /> Đang tải...</div>
      </div>
    );
  }

  const activeJobs = myJobs.filter(j => j.status === 'in_progress' || j.status === 'assigned');
  const reviewJobs = myJobs.filter(j => j.status === 'review');

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Job Master Dashboard</h1>
          <p className={styles.subtitle}>Quản lý các dự án thiết kế và đội ngũ freelancer của bạn.</p>
        </div>
        <Link href="/jobmaster/jobs/create">
          <Button>Tạo Job mới</Button>
        </Link>
      </div>

      <div className={styles.metricsGrid}>
        <MetricCard
          label="Dự án phụ trách"
          value={myJobs.length.toString()}
          icon={<FolderKanban size={20} />}
        />
        <MetricCard
          label="Đang thực hiện"
          value={activeJobs.length.toString()}
          icon={<Users size={20} />}
        />
        <MetricCard
          label="Ứng viên chờ duyệt"
          value={pendingApps.toString()}
          icon={<CheckSquare size={20} />}
          trend={pendingApps > 0 ? 'up' : undefined}
          trendValue={pendingApps > 0 ? 'Cần xử lý' : undefined}
        />
        <MetricCard
          label="Chờ nghiệm thu"
          value={reviewJobs.length.toString()}
          icon={<Clock size={20} />}
        />
      </div>

      <div className={styles.bottomGrid}>
        <Card className={styles.sectionCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Dự án đang chạy</h3>
            <Link href="/jobmaster/jobs">
              <Button variant="ghost" size="sm">Xem tất cả</Button>
            </Link>
          </div>
          {activeJobs.length > 0 ? (
            <div className={styles.jobList}>
              {activeJobs.slice(0, 5).map(job => (
                <div key={job.id} className={styles.jobItem}>
                  <div className={styles.jTitle}>{job.title}</div>
                  <div className={styles.jProgress}>
                    <span>{job.progress ?? 0}%</span>
                    <div className={styles.jBar}><div className={styles.jFill} style={{width: `${job.progress ?? 0}%`}} /></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptySmall}><Inbox size={20}/> Chưa có dự án đang chạy.</div>
          )}
          <Link href="/jobmaster/jobs">
            <Button fullWidth variant="ghost" className={styles.viewMoreBtn}>
              Xem tất cả dự án <ArrowRight size={14} />
            </Button>
          </Link>
        </Card>

        <Card className={styles.sectionCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Chờ nghiệm thu</h3>
          </div>
          {reviewJobs.length > 0 ? (
            <div className={styles.actionList}>
              {reviewJobs.slice(0, 3).map(job => (
                <div key={job.id} className={styles.actionItem}>
                  <div className={styles.aInfo}>
                    <Badge variant="warning">Chờ nghiệm thu</Badge>
                    <div className={styles.aTitle}>{job.title}</div>
                    <div className={styles.aMeta}>Nhân sự: {job.assignedWorkerName || 'N/A'}</div>
                  </div>
                  <Link href={`/jobmaster/jobs/${job.id}`}>
                    <Button size="sm" variant="outline">Xem kết quả</Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptySmall}><Inbox size={20}/> Chưa có dự án cần nghiệm thu.</div>
          )}
        </Card>
      </div>
    </div>
  );
}
