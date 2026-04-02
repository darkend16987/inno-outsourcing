'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Plus, Clock, CheckCircle, XCircle, Eye, Filter, Search, Briefcase } from 'lucide-react';
import { Button, Card, Badge, StatusBadge, LevelBadge } from '@/components/ui';
import styles from './page.module.css';

const MOCK_JOBS = [
  { id: '1', title: 'Thiết kế kiến trúc Nhà xưởng KCN Bình Dương', category: 'Kiến trúc', level: 'L3' as const, status: 'pending_approval' as const, jobMaster: 'Nguyễn Văn A', createdAt: '02/04/2026', totalFee: 48000000 },
  { id: '2', title: 'BIM Modeling tổ hợp văn phòng 12 tầng Q7', category: 'BIM', level: 'L4' as const, status: 'open' as const, jobMaster: 'Trần Minh B', createdAt: '01/04/2026', totalFee: 65000000 },
  { id: '3', title: 'Thiết kế kết cấu Bệnh viện Đa khoa Cần Thơ', category: 'Kết cấu', level: 'L5' as const, status: 'in_progress' as const, jobMaster: 'Lê Thị C', createdAt: '28/03/2026', totalFee: 120000000 },
  { id: '4', title: 'Hệ thống MEP chung cư cao cấp Thủ Đức', category: 'MEP', level: 'L3' as const, status: 'assigned' as const, jobMaster: 'Phạm Đức D', createdAt: '25/03/2026', totalFee: 55000000 },
  { id: '5', title: 'Dự toán công trình trường học TPHCM', category: 'Dự toán', level: 'L2' as const, status: 'review' as const, jobMaster: 'Hoàng Văn E', createdAt: '20/03/2026', totalFee: 25000000 },
  { id: '6', title: 'Thẩm tra PCCC tòa nhà hỗn hợp Hà Nội', category: 'Thẩm tra', level: 'L4' as const, status: 'draft' as const, jobMaster: 'Ngô Thị F', createdAt: '15/03/2026', totalFee: 38000000 },
  { id: '7', title: 'Giám sát thi công nhà máy Long An', category: 'Giám sát', level: 'L3' as const, status: 'completed' as const, jobMaster: 'Bùi Văn G', createdAt: '10/03/2026', totalFee: 42000000 },
];

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

export default function AdminJobsPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = MOCK_JOBS.filter(j => {
    if (activeTab !== 'all' && j.status !== activeTab) return false;
    if (search && !j.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const pendingCount = MOCK_JOBS.filter(j => j.status === 'pending_approval').length;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Quản lý Jobs</h1>
          <p className={styles.pageSubtitle}>Duyệt, theo dõi và quản lý tất cả dự án trong hệ thống.</p>
        </div>
        <Link href="/jobmaster/jobs/create">
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
                <td>{job.jobMaster}</td>
                <td className={styles.fee}>{(job.totalFee / 1000000).toFixed(0)}M ₫</td>
                <td><StatusBadge status={job.status} label={STATUS_LABELS[job.status]} /></td>
                <td className={styles.date}>{job.createdAt}</td>
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
            <Briefcase size={40} />
            <p>Không tìm thấy job nào.</p>
          </div>
        )}
      </div>
    </div>
  );
}
