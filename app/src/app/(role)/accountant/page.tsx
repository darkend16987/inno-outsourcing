'use client';

import React from 'react';
import { DollarSign, FileSignature, Wallet, AlertCircle, ArrowRight } from 'lucide-react';
import { Card, MetricCard, Badge, Button } from '@/components/ui';
import styles from './page.module.css';

const MOCK_STATS = {
  totalPaid: '245.5M ₫',
  pendingPayments: '84.0M ₫',
  pendingCount: 6,
  contractIssues: 2,
};

export default function AccountantDashboard() {
  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Accountant Dashboard</h1>
          <p className={styles.subtitle}>Quản lý thanh toán, công nợ và hợp đồng.</p>
        </div>
        <Button>Xuất báo cáo</Button>
      </div>

      <div className={styles.metricsGrid}>
        <MetricCard
          title="Đã thanh toán (Tháng)"
          value={MOCK_STATS.totalPaid}
          icon={<Wallet size={20} />}
          trend={{ value: '+15% so với tháng trước', label: '', isPositive: true }}
        />
        <MetricCard
          title="Chờ thanh toán"
          value={MOCK_STATS.pendingPayments}
          icon={<DollarSign size={20} />}
          trend={{ value: `${MOCK_STATS.pendingCount} khoản cần duyệt`, label: '', isPositive: false }}
        />
        <MetricCard
          title="Lỗi Hợp đồng / Hóa đơn"
          value={MOCK_STATS.contractIssues.toString()}
          icon={<FileSignature size={20} />}
          trend={{ value: 'Cần bổ sung', label: '', isPositive: false }}
        />
      </div>

      <div className={styles.bottomGrid}>
        <Card className={styles.sectionCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Lệnh thanh toán cần xử lý</h3>
          </div>
          <div className={styles.payList}>
            <div className={styles.payItem}>
              <div className={styles.pInfo}>
                <div className={styles.pHeader}>
                  <h4>Thanh toán GĐ1: Thiết kế kiến trúc Nhà xưởng KCN Bình Dương</h4>
                  <Badge variant="warning">Chờ CK</Badge>
                </div>
                <div className={styles.pMeta}>
                  <span>Người nhận: Nguyễn Văn A (Freelancer)</span>
                  <span className={styles.pAmount}>24,000,000₫</span>
                </div>
              </div>
              <Button size="sm">Xác nhận đã CK</Button>
            </div>
            
            <div className={styles.payItem}>
              <div className={styles.pInfo}>
                <div className={styles.pHeader}>
                  <h4>Tạm ứng: BIM Modeling tổ hợp văn phòng 12 tầng Q7</h4>
                  <Badge variant="warning">Chờ CK</Badge>
                </div>
                <div className={styles.pMeta}>
                  <span>Người nhận: Lê Thị C (Freelancer)</span>
                  <span className={styles.pAmount}>15,000,000₫</span>
                </div>
              </div>
              <Button size="sm">Xác nhận đã CK</Button>
            </div>
          </div>
          <Button fullWidth variant="ghost" className={styles.viewMoreBtn}>
            Xem tất cả thanh toán <ArrowRight size={14} />
          </Button>
        </Card>

        <Card className={styles.sectionCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Vấn đề chứng từ</h3>
          </div>
          <div className={styles.issueList}>
             <div className={styles.issueItem}>
              <AlertCircle size={20} className={styles.warnIcon} />
              <div className={styles.issueContent}>
                <h4>Freelancer Nguyễn Văn A chưa ký Hợp đồng</h4>
                <p>Khóa thanh toán cho đến khi Hợp đồng được ký điện tử.</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
