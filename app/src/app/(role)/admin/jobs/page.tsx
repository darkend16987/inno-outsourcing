'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Clock, CheckCircle, XCircle, Eye, Search, Loader2, Inbox } from 'lucide-react';
import { Button, Badge, StatusBadge, LevelBadge } from '@/components/ui';
import { getJobs } from '@/lib/firebase/firestore';
import { cache, TTL } from '@/lib/cache/swr-cache';
import type { Job } from '@/types';
import styles from './page.module.css';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Nháp', pending_approval: 'Chờ duyệt', open: 'Đang mở', assigned: 'Chốt kèo',
  in_progress: 'Đang thực hiện', review: 'Nghiệm thu', completed: 'Hoàn thành', paid: 'Đã TT', cancelled: 'Đã hủy',
};

const FILTER_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending_approval', label: 'Chờ duyệt' },
  { key: 'open', label: 'Đang mở' },
  { key: 'in_progress', label: 'Đang thực hiện' },
  { key: 'review', label: 'Nghiệm thu' },
  { key: 'completed', label: 'Hoàn thành' },
];

const formatDate = (d: unknown): string => {
  if (!d) return '-';
  if (typeof d === 'object' && d !== null && 'toDate' in d) return (d as { toDate: () => Date }).toDate().toLocaleDateString('vi-VN');
  if (d instanceof Date) return d.toLocaleDateString('vi-VN');
  return String(d);
};

const formatCurrency = (amount: number) => `${(amount / 1000000).toFixed(0)}M ₫`;

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchJobs = async () => {
      const result = await cache.get('admin:jobs:list', () => getJobs({}, 100), TTL.MEDIUM);
      setJobs(result.items);
      setLoading(false);
    };
    fetchJobs().catch(() => setLoading(false));
  }, []);

  const filtered = jobs.filter(j => {
    if (activeTab !== 'all' && j.status !== activeTab) return false;
    if (search && !j.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const pendingCount = jobs.filter(j => j.status === 'pending_approval').length;

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}><Loader2 size={24} className={styles.spin} /> Đang tải danh sách job...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Quản lý Jobs</h1>
          <p className={styles.pageSubtitle}>Duyệt, theo dõi và quản lý tất cả dự án trong hệ thống.</p>
        </div>
        <Link href="/admin/jobs/create">
          <Button variant="primary" icon={<Plus size={16} />}>Tạo Job mới</Button>
        </Link>
      </div>

      {pendingCount > 0 && (
        <div className={styles.alertBanner}>
          <Clock size={18} />
          <span><strong>{pendingCount} job</strong> đang chờ duyệt — cần xử lý sớm.</span>
        </div>
      )}

      <div className={styles.filterBar}>
        <div className={styles.tabs}>
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              {tab.key === 'pending_approval' && pendingCount > 0 && (
                <span className={styles.tabBadge}>{pendingCount}</span>
              )}
            </button>
          ))}
        </div>
        <div className={styles.searchBox}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Tìm theo tên job..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Tên dự án</th>
              <th>Lĩnh vực</th>
              <th>Level</th>
              <th>Job Master</th>
              <th>Thù lao</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(job => (
              <tr key={job.id}>
                <td className={styles.jobTitle}>{job.title}</td>
                <td><Badge variant="default">{job.category}</Badge></td>
                <td><LevelBadge level={job.level} /></td>
                <td>{job.jobMasterName || '-'}</td>
                <td className={styles.fee}>{formatCurrency(job.totalFee || 0)}</td>
                <td><StatusBadge status={job.status} label={STATUS_LABELS[job.status] || job.status} /></td>
                <td className={styles.date}>{formatDate(job.createdAt)}</td>
                <td>
                  <div className={styles.actions}>
                    <Link href={`/admin/jobs/${job.id}`}>
                      <Button variant="ghost" size="sm" icon={<Eye size={14} />}>Xem</Button>
                    </Link>
                    {job.status === 'pending_approval' && (
                      <>
                        <Button variant="success" size="sm" icon={<CheckCircle size={14} />}>Duyệt</Button>
                        <Button variant="danger" size="sm" icon={<XCircle size={14} />}>Từ chối</Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className={styles.emptyState}>
            <Inbox size={40} />
            <p>Không tìm thấy job nào.</p>
          </div>
        )}
      </div>
    </div>
  );
}
