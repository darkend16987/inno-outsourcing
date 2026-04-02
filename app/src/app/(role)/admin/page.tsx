'use client';

import React from 'react';
import { Users, FolderKanban, DollarSign, Activity, AlertCircle } from 'lucide-react';
import { Card, MetricCard, Badge } from '@/components/ui';
import styles from './page.module.css';

const MOCK_STATS = {
  totalUsers: 1240,
  activeJobs: 45,
  pendingApps: 12,
  revenue: '145.5M ₫',
};

export default function AdminDashboard() {
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
          label="Tổng số Người dùng"
          value={MOCK_STATS.totalUsers.toString()}
          icon={<Users size={20} />}
          trend="up"
          trendValue="+24 tuần này"
        />
        <MetricCard
          label="Dự án đang thực hiện"
          value={MOCK_STATS.activeJobs.toString()}
          icon={<FolderKanban size={20} />}
        />
        <MetricCard
          label="Ứng tuyển chờ duyệt"
          value={MOCK_STATS.pendingApps.toString()}
          icon={<Activity size={20} />}
          trend="down"
          trendValue="Cần chú ý"
        />
        <MetricCard
          label="Doanh thu hệ thống (Năm)"
          value={MOCK_STATS.revenue}
          icon={<DollarSign size={20} />}
          trend="up"
          trendValue="+12% so với 2025"
        />
      </div>

      <div className={styles.bottomGrid}>
        <Card className={styles.sectionCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Dự án cần chú ý</h3>
          </div>
          <div className={styles.alertList}>
            <div className={styles.alertItem}>
              <AlertCircle size={20} className={styles.warnIcon} />
              <div className={styles.alertContent}>
                <h4>BIM Modeling tổ hợp văn phòng 12 tầng Q7</h4>
                <p>Quá hạn nghiệm thu milestone 2 (3 ngày)</p>
              </div>
              <Badge variant="warning">Trễ hạn</Badge>
            </div>
            <div className={styles.alertItem}>
              <AlertCircle size={20} className={styles.errorIcon} />
              <div className={styles.alertContent}>
                <h4>Thiết kế nội thất căn hộ Vinhomes</h4>
                <p>Khách hàng yêu cầu hủy hợp đồng</p>
              </div>
              <Badge variant="error" size="sm">Cần xử lý gấp</Badge>
            </div>
          </div>
        </Card>

        <Card className={styles.sectionCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Tài khoản mới đăng ký</h3>
          </div>
          <div className={styles.userList}>
            {[1, 2, 3].map(i => (
              <div key={i} className={styles.userItem}>
                <div className={styles.uAvatar}></div>
                <div className={styles.uInfo}>
                  <h4>Trần Thị B {i}</h4>
                  <p>Freelancer • Đăng ký 2 giờ trước</p>
                </div>
                <Badge variant="outline" size="sm">Chưa KYC</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
