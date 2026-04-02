'use client';

import React, { useState, useEffect } from 'react';
import { FolderKanban, DollarSign, Activity, AlertCircle, Loader2 } from 'lucide-react';
import { Card, MetricCard, Badge } from '@/components/ui';
import { getJobs, getAllApplications } from '@/lib/firebase/firestore';
import { cache, TTL } from '@/lib/cache/swr-cache';
import styles from './page.module.css';

interface DashboardStats {
  totalUsers: number;
  activeJobs: number;
  pendingApps: number;
  revenue: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({ totalUsers: 0, activeJobs: 0, pendingApps: 0, revenue: '—' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [jobsResult, appsResult] = await Promise.all([
        cache.get('admin:jobs', () => getJobs({}, 100), TTL.MEDIUM),
        cache.get('admin:apps:pending', () => getAllApplications({ status: 'pending' }, 100), TTL.MEDIUM),
      ]);

      const activeJobs = jobsResult.items.filter(j => j.status === 'in_progress' || j.status === 'assigned').length;

      setStats({
        totalUsers: 0, // Will show actual when we add user count query
        activeJobs,
        pendingApps: appsResult.items.length,
        revenue: '—',
      });
      setLoading(false);
    };
    fetchStats().catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.loadingWrap}><Loader2 size={24} className={styles.spinner} /> Đang tải thống kê...</div>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Admin Dashboard</h1>
          <p className={styles.subtitle}>Tổng quan thống kê hệ thống VAA JOB.</p>
        </div>
      </div>

      <div className={styles.metricsGrid}>
        <MetricCard
          label="Dự án đang thực hiện"
          value={stats.activeJobs.toString()}
          icon={<FolderKanban size={20} />}
        />
        <MetricCard
          label="Ứng tuyển chờ duyệt"
          value={stats.pendingApps.toString()}
          icon={<Activity size={20} />}
          trend={stats.pendingApps > 0 ? 'down' : undefined}
          trendValue={stats.pendingApps > 0 ? 'Cần chú ý' : undefined}
        />
        <MetricCard
          label="Doanh thu hệ thống"
          value={stats.revenue}
          icon={<DollarSign size={20} />}
        />
      </div>

      <div className={styles.bottomGrid}>
        <Card className={styles.sectionCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Trạng thái hệ thống</h3>
          </div>
          <div className={styles.alertList}>
            <div className={styles.alertItem}>
              <AlertCircle size={20} className={styles.warnIcon} />
              <div className={styles.alertContent}>
                <h4>Hệ thống hoạt động bình thường</h4>
                <p>Tất cả dịch vụ đang online.</p>
              </div>
              <Badge variant="success">Ổn định</Badge>
            </div>
          </div>
        </Card>

        <Card className={styles.sectionCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Ứng tuyển mới nhất</h3>
          </div>
          <div className={styles.userList}>
            {stats.pendingApps === 0 ? (
              <div className={styles.emptySmall}>Không có ứng tuyển chờ duyệt.</div>
            ) : (
              <div className={styles.emptySmall}>Có {stats.pendingApps} ứng tuyển cần xử lý.</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
