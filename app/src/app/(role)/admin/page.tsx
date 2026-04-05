'use client';

import React, { useState, useEffect } from 'react';
import { FolderKanban, DollarSign, Activity, AlertCircle, Users, TrendingUp, Loader2 } from 'lucide-react';
import { Card, MetricCard, Badge } from '@/components/ui';
import { getAllApplications, repairOrphanedAssignments } from '@/lib/firebase/firestore';
import { getAnalyticsData, type AnalyticsData } from '@/lib/firebase/analytics';
import { cache, TTL } from '@/lib/cache/swr-cache';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import styles from './page.module.css';

const CHART_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const formatCurrency = (amount: number) => {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toString();
};

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [pendingApps, setPendingApps] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      // Auto-repair: sync job statuses for applications accepted before auto-assign was deployed
      await repairOrphanedAssignments().then(count => {
        if (count > 0) console.log(`[repair] Fixed ${count} orphaned job assignment(s)`);
      }).catch(() => {});

      const [analyticsData, appsResult] = await Promise.all([
        cache.get('admin:analytics', () => getAnalyticsData(), TTL.SHORT),
        cache.get('admin:apps:pending', () => getAllApplications({ status: 'pending' }, 100), TTL.SHORT),
      ]);

      setAnalytics(analyticsData);
      setPendingApps(appsResult.items.length);
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

  const data = analytics;
  const revenueChartData = data?.monthlyRevenue?.map((item) => ({
    name: item.month,
    revenue: item.revenue,
  })) || [];

  const jobStatusData = data ? [
    { name: 'Chờ nhận việc', value: data.openJobs },
    { name: 'Đang thực hiện', value: data.activeJobs },
    { name: 'Đang nghiệm thu', value: data.reviewJobs },
    { name: 'Hoàn thành', value: data.completedJobs },
    { name: 'Huỷ', value: data.cancelledJobs },
  ].filter(d => d.value > 0) : [];

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
          value={(data?.activeJobs ?? 0).toString()}
          icon={<FolderKanban size={20} />}
        />
        <MetricCard
          label="Ứng tuyển chờ duyệt"
          value={pendingApps.toString()}
          icon={<Activity size={20} />}
          trend={pendingApps > 0 ? 'down' : undefined}
          trendValue={pendingApps > 0 ? 'Cần chú ý' : undefined}
        />
        <MetricCard
          label="Doanh thu hệ thống"
          value={`${formatCurrency(data?.totalRevenue ?? 0)} ₫`}
          icon={<DollarSign size={20} />}
        />
        <MetricCard
          label="Tổng freelancer"
          value={(data?.totalFreelancers ?? 0).toString()}
          icon={<Users size={20} />}
        />
      </div>

      {/* Charts Row */}
      <div className={styles.bottomGrid}>
        <Card className={styles.sectionCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Doanh thu theo tháng</h3>
          </div>
          {revenueChartData.length > 0 ? (
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={revenueChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => [`${Number(value).toLocaleString('vi-VN')} ₫`, 'Doanh thu']} />
                  <Bar dataKey="revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className={styles.emptySmall}>Chưa có dữ liệu doanh thu.</div>
          )}
        </Card>

        <Card className={styles.sectionCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Phân bổ dự án</h3>
          </div>
          {jobStatusData.length > 0 ? (
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={jobStatusData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                    {jobStatusData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className={styles.emptySmall}>Chưa có dữ liệu.</div>
          )}
        </Card>
      </div>

      {/* Stats Row */}
      <div className={styles.bottomGrid}>
        <Card className={styles.sectionCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Chỉ số chuyển đổi</h3>
          </div>
          <div className={styles.alertList}>
            <div className={styles.alertItem}>
              <TrendingUp size={20} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
              <div className={styles.alertContent}>
                <h4>Tỷ lệ chuyển đổi ứng tuyển</h4>
                <p>{(data?.conversionRate ?? 0).toFixed(1)}% ứng viên được nhận</p>
              </div>
              <Badge variant="info">{data?.totalApplications ?? 0} ứng tuyển</Badge>
            </div>
            <div className={styles.alertItem}>
              <AlertCircle size={20} className={styles.warnIcon} />
              <div className={styles.alertContent}>
                <h4>Tranh chấp đang mở</h4>
                <p>{data?.openDisputes ?? 0} tranh chấp cần xử lý</p>
              </div>
              <Badge variant={data?.openDisputes ? 'warning' : 'success'}>
                {data?.openDisputes ? 'Cần xử lý' : 'Ổn định'}
              </Badge>
            </div>
          </div>
        </Card>

        <Card className={styles.sectionCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Ứng tuyển mới nhất</h3>
          </div>
          <div className={styles.userList}>
            {pendingApps === 0 ? (
              <div className={styles.emptySmall}>Không có ứng tuyển chờ duyệt.</div>
            ) : (
              <div className={styles.emptySmall}>Có {pendingApps} ứng tuyển cần xử lý.</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
