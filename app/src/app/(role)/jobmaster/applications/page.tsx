'use client';

import React, { useState } from 'react';
import { Search, Filter, Check, X, FileText, ArrowUpRight } from 'lucide-react';
import { Card, Badge, Avatar, Button, LevelBadge } from '@/components/ui';
import styles from './page.module.css';

const MOCK_APPS = [
  {
    id: 'a1',
    jobTitle: 'BIM Modeling tổ hợp văn phòng 12 tầng Q7',
    candidate: { name: 'Nguyễn Văn A', level: 'L3', kyc: true },
    bidAmount: '60,000,000₫',
    duration: '60 ngày',
    appliedAt: '2 giờ trước',
    status: 'pending',
  },
  {
    id: 'a2',
    jobTitle: 'Thiết kế kiến trúc Nhà xưởng KCN Bình Dương',
    candidate: { name: 'Lê Thị C', level: 'L2', kyc: false },
    bidAmount: '50,000,000₫',
    duration: '45 ngày',
    appliedAt: '1 ngày trước',
    status: 'pending',
  },
  {
    id: 'a3',
    jobTitle: 'BIM Modeling tổ hợp văn phòng 12 tầng Q7',
    candidate: { name: 'Trần B', level: 'L4', kyc: true },
    bidAmount: '70,000,000₫',
    duration: '50 ngày',
    appliedAt: '1 ngày trước',
    status: 'approved',
  }
];

export default function ApplicationsPage() {
  const [filter, setFilter] = useState('pending');

  const filteredApps = MOCK_APPS.filter(a => filter === 'all' || a.status === filter);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Duyệt ứng viên</h1>
          <p className={styles.subtitle}>Xem xét và chọn ra Freelancer phù hợp nhất cho dự án của bạn.</p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={16} />
          <input type="text" placeholder="Tìm theo tên dự án, tên ứng viên..." />
        </div>
        <div className={styles.filters}>
          <button className={`${styles.filterBtn} ${filter === 'pending' ? styles.active : ''}`} onClick={() => setFilter('pending')}>Chưa duyệt</button>
          <button className={`${styles.filterBtn} ${filter === 'approved' ? styles.active : ''}`} onClick={() => setFilter('approved')}>Đã chọn</button>
          <button className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`} onClick={() => setFilter('all')}>Tất cả</button>
        </div>
      </div>

      <div className={styles.appList}>
        {filteredApps.map(app => (
          <Card key={app.id} className={styles.appCard}>
            <div className={styles.appHeader}>
              <div className={styles.jobInfo}>
                <span className={styles.jLabel}>Dự án ứng tuyển:</span>
                <span className={styles.jTitle}>{app.jobTitle}</span>
              </div>
              <div className={styles.timeInfo}>{app.appliedAt}</div>
            </div>

            <div className={styles.appBody}>
              <div className={styles.candidateCol}>
                {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                {/* @ts-ignore */}
                <Avatar name={app.candidate.name} level={app.candidate.level} size="lg" />
                <div className={styles.cInfo}>
                  <h3 className={styles.cName}>{app.candidate.name}</h3>
                  <div className={styles.cTags}>
                    {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                    {/* @ts-ignore */}
                    <LevelBadge level={app.candidate.level} showLabel />
                    {app.candidate.kyc && <Badge variant="success" size="sm">Đã KYC</Badge>}
                  </div>
                  <button className={styles.viewProfileBtn}>Xem hồ sơ kỹ năng <ArrowUpRight size={14}/></button>
                </div>
              </div>

              <div className={styles.proposalCol}>
                <div className={styles.pItem}>
                  <span className={styles.pLabel}>Ngân sách đề xuất</span>
                  <span className={styles.pVal}>{app.bidAmount}</span>
                </div>
                <div className={styles.pItem}>
                  <span className={styles.pLabel}>Thời gian thi công</span>
                  <span className={styles.pVal}>{app.duration}</span>
                </div>
              </div>

              <div className={styles.actionCol}>
                {app.status === 'pending' ? (
                  <>
                    <Button className={styles.approveBtn}><Check size={16}/> Chọn ứng viên</Button>
                    <Button variant="outline" className={styles.rejectBtn}><X size={16}/> Từ chối</Button>
                    <Button variant="ghost" size="sm"><FileText size={16}/> Xem thư giới thiệu</Button>
                  </>
                ) : (
                  <Badge variant="success">Đã được chọn</Badge>
                )}
              </div>
            </div>
          </Card>
        ))}

        {filteredApps.length === 0 && (
          <div className={styles.empty}>
            <p>Chưa có ứng viên nào cần duyệt.</p>
          </div>
        )}
      </div>
    </div>
  );
}
