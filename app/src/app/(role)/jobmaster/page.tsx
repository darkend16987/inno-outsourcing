'use client';

import React from 'react';
import { FolderKanban, Users, CheckSquare, Clock, ArrowRight } from 'lucide-react';
import { Card, MetricCard, Badge, Button } from '@/components/ui';
import styles from './page.module.css';

const MOCK_STATS = {
  myJobs: 8,
  activeFreelancers: 15,
  pendingReviews: 3,
  newApplications: 5,
};

export default function JobMasterDashboard() {
  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Job Master Dashboard</h1>
          <p className={styles.subtitle}>Quản lý các dự án thiết kế và đội ngũ freelancer của bạn.</p>
        </div>
        <Button>Tạo Job mới</Button>
      </div>

      <div className={styles.metricsGrid}>
        <MetricCard
          label="Dự án phụ trách"
          value={MOCK_STATS.myJobs.toString()}
          icon={<FolderKanban size={20} />}
          trend="down"
          trendValue="2 dự án sắp đến hạn"
        />
        <MetricCard
          label="Freelancer đang quản lý"
          value={MOCK_STATS.activeFreelancers.toString()}
          icon={<Users size={20} />}
        />
        <MetricCard
          label="Ứng viên mới chờ duyệt"
          value={MOCK_STATS.newApplications.toString()}
          icon={<CheckSquare size={20} />}
          trend="up"
          trendValue="Mới cập nhật"
        />
        <MetricCard
          label="Nghiệm thu chờ phê duyệt"
          value={MOCK_STATS.pendingReviews.toString()}
          icon={<Clock size={20} />}
        />
      </div>

      <div className={styles.bottomGrid}>
        <Card className={styles.sectionCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Dự án cần hành động</h3>
          </div>
          <div className={styles.actionList}>
            <div className={styles.actionItem}>
              <div className={styles.aInfo}>
                <Badge variant="warning">Chờ nghiệm thu</Badge>
                <div className={styles.aTitle}>Thiết kế kết cấu Bệnh viện Đa khoa Cần Thơ</div>
                <div className={styles.aMeta}>[Milestone 1] Thiết kế cơ sở - Freelancer: Nguyễn Văn A</div>
              </div>
              <Button size="sm" variant="outline">Xem kết quả</Button>
            </div>
            
            <div className={styles.actionItem}>
              <div className={styles.aInfo}>
                <Badge variant="info">Duyệt ứng viên</Badge>
                <div className={styles.aTitle}>BIM Modeling tổ hợp văn phòng 12 tầng Q7</div>
                <div className={styles.aMeta}>Có 3 ứng viên mới nộp hồ sơ</div>
              </div>
              <Button size="sm" variant="outline">Duyệt hồ sơ</Button>
            </div>
          </div>
        </Card>

        <Card className={styles.sectionCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Dự án đang chạy</h3>
          </div>
          <div className={styles.jobList}>
            <div className={styles.jobItem}>
              <div className={styles.jTitle}>Thiết kế kiến trúc Nhà xưởng KCN Bình Dương</div>
              <div className={styles.jProgress}>
                <span>45%</span>
                <div className={styles.jBar}><div className={styles.jFill} style={{width: '45%'}} /></div>
              </div>
            </div>
            <div className={styles.jobItem}>
              <div className={styles.jTitle}>Khảo sát địa hình tuyến đường Tỉnh Lộ 9</div>
              <div className={styles.jProgress}>
                <span>80%</span>
                <div className={styles.jBar}><div className={styles.jFill} style={{width: '80%'}} /></div>
              </div>
            </div>
          </div>
          <Button fullWidth variant="ghost" className={styles.viewMoreBtn}>
            Xem tất cả dự án <ArrowRight size={14} />
          </Button>
        </Card>
      </div>
    </div>
  );
}
