'use client';

import React from 'react';
import { Briefcase, CheckCircle, Clock, Star, TrendingUp } from 'lucide-react';
import { Card, MetricCard, Badge, LevelBadge, Button } from '@/components/ui';
import styles from './page.module.css';

const MOCK_STATS = {
  totalEarned: '45,500,000₫',
  completedJobs: 12,
  inProgressJobs: 2,
  rating: 4.8,
  onTimeRate: '100%'
};

export default function FreelancerDashboard() {
  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Tổng quan công việc</h1>
          <p className={styles.subtitle}>Chào mừng trở lại, Nguyễn Văn A. Dưới đây là tóm tắt hoạt động của bạn.</p>
        </div>
        <Button variant="outline">Cập nhật hồ sơ</Button>
      </div>

      {/* Metrics */}
      <div className={styles.metricsGrid}>
        <MetricCard
          title="Tổng thu nhập"
          value={MOCK_STATS.totalEarned}
          icon={<TrendingUp size={20} />}
          trend={{ value: '+15%', label: 'so với tháng trước', isPositive: true }}
        />
        <MetricCard
          title="Đã hoàn thành"
          value={MOCK_STATS.completedJobs.toString()}
          icon={<CheckCircle size={20} />}
        />
        <MetricCard
          title="Đang thực hiện"
          value={MOCK_STATS.inProgressJobs.toString()}
          icon={<Briefcase size={20} />}
        />
        <MetricCard
          title="Đánh giá trung bình"
          value={MOCK_STATS.rating.toString()}
          icon={<Star size={20} />}
          trend={{ value: MOCK_STATS.onTimeRate + ' đúng hạn', label: '', isPositive: true }}
        />
      </div>

      {/* Upcoming Tasks & Recent Activities */}
      <div className={styles.bottomGrid}>
        <Card className={styles.sectionCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Công việc đang thực hiện</h3>
            <Button variant="ghost" size="sm">Xem tất cả</Button>
          </div>
          
          <div className={styles.jobList}>
            <div className={styles.jobItem}>
              <div className={styles.jobInfo}>
                <h4>Thiết kế kiến trúc Nhà xưởng KCN Bình Dương</h4>
                <div className={styles.jobMeta}>
                  <Badge size="sm" variant="outline">Kiến trúc</Badge>
                  <span className={styles.deadline}><Clock size={12}/> Hạn: 15/05/2026</span>
                </div>
              </div>
              <div className={styles.jobStatus}>
                <div className={styles.progressText}>Tiến độ: 45%</div>
                <div className={styles.progressBar}><div className={styles.progressFill} style={{width: '45%'}}/></div>
              </div>
            </div>
            
            <div className={styles.jobItem}>
              <div className={styles.jobInfo}>
                <h4>Thiết kế kết cấu Bệnh viện Đa khoa Cần Thơ</h4>
                <div className={styles.jobMeta}>
                  <Badge size="sm" variant="outline">Kết cấu</Badge>
                  <span className={styles.deadline}><Clock size={12}/> Hạn: 20/05/2026</span>
                </div>
              </div>
              <div className={styles.jobStatus}>
                <div className={styles.progressText}>Tiến độ: 10%</div>
                <div className={styles.progressBar}><div className={styles.progressFill} style={{width: '10%'}}/></div>
              </div>
            </div>
          </div>
        </Card>

        <Card className={styles.sectionCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Thông báo mới</h3>
          </div>
          <div className={styles.notiList}>
            <div className={styles.notiItem}>
              <div className={styles.notiIcon} style={{ background: 'var(--color-primary-bg)', color: 'var(--color-primary)' }}>
                <CheckCircle size={16} />
              </div>
              <div className={styles.notiContent}>
                <p>Thanh toán <strong>24,000,000₫</strong> giai đoạn 1 đã được chuyển khoản.</p>
                <span>2 giờ trước</span>
              </div>
            </div>
            <div className={styles.notiItem}>
              <div className={styles.notiIcon} style={{ background: 'rgba(244, 157, 37, 0.1)', color: 'var(--color-accent)' }}>
                <Star size={16} />
              </div>
              <div className={styles.notiContent}>
                <p>Bạn vừa nhận huy hiệu <strong>Đối tác tin cậy</strong>.</p>
                <span>1 ngày trước</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
