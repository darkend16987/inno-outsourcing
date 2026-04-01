'use client';

import React from 'react';
import { Download, TrendingUp, Users, FolderKanban, CheckCircle } from 'lucide-react';
import { Card, MetricCard, Button } from '@/components/ui';
import styles from './page.module.css';

export default function AdminReportsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Báo cáo & Thống kê</h1>
          <p className={styles.subtitle}>Chỉ số hiệu suất toàn hệ thống VAA JOB.</p>
        </div>
        <div className={styles.actions}>
          <select className={styles.reportSelect}>
             <option>Báo cáo Tháng này</option>
             <option>Báo cáo Quý 1/2026</option>
             <option>Cả năm 2026</option>
          </select>
          <Button><Download size={16}/> Xuất báo cáo tổng</Button>
        </div>
      </div>

      <div className={styles.metricsGrid}>
        <MetricCard
          title="Tổng Doanh Thu (GMV)"
          value="450.5M ₫"
          icon={<TrendingUp size={20} />}
          trend={{ value: '+22% so với kỳ trước', label: '', isPositive: true }}
        />
        <MetricCard
          title="Tổng số Freelancer"
          value="1,245"
          icon={<Users size={20} />}
          trend={{ value: '+12 đăng ký mới', label: '', isPositive: true }}
        />
        <MetricCard
          title="Dự án đang chạy"
          value="48"
          icon={<FolderKanban size={20} />}
          trend={{ value: 'Ổn định', label: '', isPositive: true }}
        />
        <MetricCard
          title="Dự án hoàn thành"
          value="312"
          icon={<CheckCircle size={20} />}
          trend={{ value: 'Tỉ lệ success 98%', label: '', isPositive: true }}
        />
      </div>

      <div className={styles.chartsGrid}>
         <Card className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Tăng trưởng Doanh thu theo tháng</h3>
            <div className={styles.placeholderChart}>
               [Biểu đồ Line Chart Doanh thu]
            </div>
         </Card>
         <Card className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Phân bổ lĩnh vực công việc</h3>
            <div className={styles.placeholderChart}>
               [Biểu đồ Pie Chart: 40% Kiến trúc, 30% kết cấu...]
            </div>
         </Card>
      </div>

      <Card className={styles.topUsersCard}>
         <h3 className={styles.chartTitle}>Top Freelancers (Doanh thu cao nhất)</h3>
         <table className={styles.tTable}>
            <thead>
               <tr>
                  <th>Hạng</th>
                  <th>Tên Freelancer</th>
                  <th>Chuyên môn</th>
                  <th>Doanh thu</th>
               </tr>
            </thead>
            <tbody>
               <tr>
                  <td>1</td>
                  <td>Nguyễn Văn A</td>
                  <td>BIM / Kiến trúc</td>
                  <td><strong className={styles.rev}>120,000,000₫</strong></td>
               </tr>
               <tr>
                  <td>2</td>
                  <td>Lê Thị C</td>
                  <td>Kết cấu thép</td>
                  <td><strong className={styles.rev}>95,000,000₫</strong></td>
               </tr>
               <tr>
                  <td>3</td>
                  <td>Trần B</td>
                  <td>Dự toán</td>
                  <td><strong className={styles.rev}>80,500,000₫</strong></td>
               </tr>
            </tbody>
         </table>
      </Card>
      
    </div>
  );
}
