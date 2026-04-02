'use client';

import React, { useState, useEffect } from 'react';
import { Search, Check, X, FileText, ArrowUpRight, Loader2, Inbox } from 'lucide-react';
import { Card, Badge, Avatar, Button, LevelBadge } from '@/components/ui';
import { useAuth } from '@/lib/firebase/auth-context';
import { getAllApplications } from '@/lib/firebase/firestore';
import { cache, TTL } from '@/lib/cache/swr-cache';
import styles from './page.module.css';

interface AppItem {
  id: string;
  jobTitle: string;
  candidateName: string;
  candidateLevel: string;
  bidAmount: number;
  duration: number;
  status: string;
  createdAt: unknown;
}

const formatDate = (d: unknown): string => {
  if (!d) return '-';
  if (typeof d === 'object' && d !== null && 'toDate' in d) return (d as { toDate: () => Date }).toDate().toLocaleDateString('vi-VN');
  if (d instanceof Date) return d.toLocaleDateString('vi-VN');
  return String(d);
};

const formatCurrency = (amount: number) => `${amount.toLocaleString('vi-VN')}₫`;

export default function ApplicationsPage() {
  const { userProfile } = useAuth();
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [apps, setApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.uid) return;
    const fetchApps = async () => {
      const result = await cache.get(`jm:apps:all:${userProfile.uid}`, () => getAllApplications({}, 50), TTL.MEDIUM);
      const mapped: AppItem[] = result.items.map((a) => ({
        id: a.id,
        jobTitle: a.jobTitle || 'Dự án',
        candidateName: a.applicantName || 'Ứng viên',
        candidateLevel: a.applicantLevel || 'L1',
        bidAmount: a.expectedFee || 0,
        duration: 0,
        status: a.status || 'pending',
        createdAt: a.createdAt,
      }));
      setApps(mapped);
      setLoading(false);
    };
    fetchApps().catch(() => setLoading(false));
  }, [userProfile?.uid]);

  const filteredApps = apps.filter(a => {
    const matchFilter = filter === 'all' || a.status === filter;
    const matchSearch = !search || a.jobTitle.toLowerCase().includes(search.toLowerCase()) || a.candidateName.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}><Loader2 size={24} className={styles.spin} /> Đang tải...</div>
      </div>
    );
  }

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
          <input type="text" placeholder="Tìm theo tên dự án, tên ứng viên..." value={search} onChange={e => setSearch(e.target.value)} />
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
              <div className={styles.timeInfo}>{formatDate(app.createdAt)}</div>
            </div>

            <div className={styles.appBody}>
              <div className={styles.candidateCol}>
                <Avatar name={app.candidateName} level={app.candidateLevel as 'L1' | 'L2' | 'L3' | 'L4' | 'L5'} size="lg" />
                <div className={styles.cInfo}>
                  <h3 className={styles.cName}>{app.candidateName}</h3>
                  <div className={styles.cTags}>
                    <LevelBadge level={app.candidateLevel as 'L1' | 'L2' | 'L3' | 'L4' | 'L5'} />
                  </div>
                  <button className={styles.viewProfileBtn}>Xem hồ sơ kỹ năng <ArrowUpRight size={14}/></button>
                </div>
              </div>

              <div className={styles.proposalCol}>
                <div className={styles.pItem}>
                  <span className={styles.pLabel}>Ngân sách đề xuất</span>
                  <span className={styles.pVal}>{app.bidAmount > 0 ? formatCurrency(app.bidAmount) : '-'}</span>
                </div>
                <div className={styles.pItem}>
                  <span className={styles.pLabel}>Thời gian thi công</span>
                  <span className={styles.pVal}>{app.duration > 0 ? `${app.duration} ngày` : '-'}</span>
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
            <Inbox size={24} /><p>Chưa có ứng viên nào cần duyệt.</p>
          </div>
        )}
      </div>
    </div>
  );
}
