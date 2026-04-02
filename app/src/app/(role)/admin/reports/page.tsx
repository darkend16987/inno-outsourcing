'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, Loader2 } from 'lucide-react';
import { Card, MetricCard } from '@/components/ui';
import { getJobs, getAllPayments } from '@/lib/firebase/firestore';
import { cache, TTL } from '@/lib/cache/swr-cache';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import styles from './page.module.css';

const COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

const formatCurrency = (amount: number) => {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M ₫`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K ₫`;
  return `${amount.toLocaleString('vi-VN')}₫`;
};

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(true);
  const [jobStats, setJobStats] = useState<{ completed: number; active: number; total: number }>({ completed: 0, active: 0, total: 0 });
  const [categoryData, setCategoryData] = useState<{ name: string; value: number }[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ name: string; amount: number }[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const [jobsResult, paymentsResult] = await Promise.all([
        cache.get('reports:jobs', () => getJobs({}, 200), TTL.LONG),
        cache.get('reports:payments', () => getAllPayments({}, 200), TTL.LONG),
      ]);

      const jobs = jobsResult.items;
      const payments = paymentsResult.items;

      // Job stats
      const completed = jobs.filter(j => j.status === 'completed' || j.status === 'paid').length;
      const active = jobs.filter(j => j.status === 'in_progress' || j.status === 'assigned').length;
      setJobStats({ completed, active, total: jobs.length });

      // Category distribution
      const catMap = new Map<string, number>();
      jobs.forEach(j => catMap.set(j.category, (catMap.get(j.category) || 0) + 1));
      setCategoryData(Array.from(catMap.entries()).map(([name, value]) => ({ name, value })));

      // Monthly revenue from payments
      const monthMap = new Map<string, number>();
      let total = 0;
      payments.filter(p => p.status === 'paid').forEach(p => {
        total += p.amount;
        const date = p.paidAt || p.createdAt;
        const dateObj = date && typeof date === 'object' && 'toDate' in date
          ? (date as unknown as { toDate: () => Date }).toDate()
          : date instanceof Date ? date : new Date();
        const key = `${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;
        monthMap.set(key, (monthMap.get(key) || 0) + p.amount);
      });
      setTotalRevenue(total);
      setMonthlyData(Array.from(monthMap.entries()).map(([name, amount]) => ({ name, amount })));
      setLoading(false);
    };
    fetchData().catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingWrap}><Loader2 size={24} className={styles.spinner} /> Đang phân tích dữ liệu...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Báo cáo & Thống kê</h1>
          <p className={styles.subtitle}>Phân tích dữ liệu hoạt động nền tảng theo thời gian thực.</p>
        </div>
      </div>

      <div className={styles.metricsGrid}>
        <MetricCard
          label="Tổng dự án"
          value={jobStats.total.toString()}
          icon={<BarChart3 size={20} />}
        />
        <MetricCard
          label="Đang hoạt động"
          value={jobStats.active.toString()}
          icon={<TrendingUp size={20} />}
        />
        <MetricCard
          label="Đã hoàn thành"
          value={jobStats.completed.toString()}
          icon={<TrendingUp size={20} />}
          trend="up"
          trendValue="Tốt"
        />
        <MetricCard
          label="Tổng doanh thu"
          value={formatCurrency(totalRevenue)}
          icon={<DollarSign size={20} />}
        />
      </div>

      <div className={styles.chartsGrid}>
        <Card className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Doanh thu theo tháng</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={12} />
                <YAxis stroke="var(--color-text-muted)" fontSize={12} tickFormatter={(v: number) => formatCurrency(v)} />
                <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
                <Line type="monotone" dataKey="amount" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className={styles.noChart}>Chưa có dữ liệu thanh toán để hiển thị biểu đồ.</div>
          )}
        </Card>

        <Card className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Phân bổ theo lĩnh vực</h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}>
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className={styles.noChart}>Chưa có dữ liệu dự án để hiển thị biểu đồ.</div>
          )}
        </Card>
      </div>
    </div>
  );
}
