'use client';

import React, { useState } from 'react';
import { CheckCircle, XCircle, Star, Briefcase, User, Calendar, ExternalLink, Eye } from 'lucide-react';
import { Button, Card, Badge, Avatar, LevelBadge } from '@/components/ui';
import styles from './page.module.css';

const MOCK_APPLICATIONS = [
  {
    id: 'a1', jobId: '1', jobTitle: 'Thiết kế kiến trúc Nhà xưởng KCN Bình Dương',
    applicantName: 'Nguyễn Thanh Hùng', applicantLevel: 'L4' as const,
    specialties: ['Kiến trúc', 'BIM'], rating: 4.9, completedJobs: 32,
    coverLetter: 'Với 8 năm kinh nghiệm thiết kế nhà xưởng công nghiệp, tôi tự tin hoàn thành dự án đúng hạn và chất lượng cao...',
    expectedFee: 48000000, availableDate: '10/04/2026', status: 'pending' as const,
    portfolioLink: 'https://portfolio.example.com/hung',
  },
  {
    id: 'a2', jobId: '1', jobTitle: 'Thiết kế kiến trúc Nhà xưởng KCN Bình Dương',
    applicantName: 'Trần Minh Tuấn', applicantLevel: 'L3' as const,
    specialties: ['Kiến trúc'], rating: 4.5, completedJobs: 15,
    coverLetter: 'Tôi đã hoàn thành nhiều dự án nhà xưởng tương tự tại KCN Tân Bình và Long An...',
    expectedFee: 45000000, availableDate: '15/04/2026', status: 'pending' as const,
    portfolioLink: 'https://portfolio.example.com/tuan',
  },
  {
    id: 'a3', jobId: '2', jobTitle: 'BIM Modeling tổ hợp văn phòng 12 tầng Q7',
    applicantName: 'Lê Thị Hoa', applicantLevel: 'L5' as const,
    specialties: ['BIM', 'MEP'], rating: 4.8, completedJobs: 25,
    coverLetter: 'Chuyên gia BIM 10+ năm, đã thực hiện nhiều dự án cao tầng phức tạp tại TPHCM...',
    expectedFee: 60000000, availableDate: '05/04/2026', status: 'shortlisted' as const,
    portfolioLink: 'https://portfolio.example.com/hoa',
  },
];

const STATUS_LABELS: Record<string, string> = { pending: 'Chờ duyệt', shortlisted: 'Vào vòng trong', accepted: 'Đã chọn', rejected: 'Từ chối' };

export default function AdminApplicationsPage() {
  const [filter, setFilter] = useState('all');

  const filtered = MOCK_APPLICATIONS.filter(a => filter === 'all' || a.status === filter);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Duyệt Ứng tuyển</h1>
          <p className={styles.pageSubtitle}>Xem xét và chọn ứng viên phù hợp cho các dự án.</p>
        </div>
      </div>

      <div className={styles.filterRow}>
        {['all', 'pending', 'shortlisted', 'accepted', 'rejected'].map(key => (
          <button key={key} className={`${styles.filterBtn} ${filter === key ? styles.filterActive : ''}`}
            onClick={() => setFilter(key)}>
            {key === 'all' ? 'Tất cả' : STATUS_LABELS[key]}
          </button>
        ))}
      </div>

      <div className={styles.appGrid}>
        {filtered.map(app => (
          <Card key={app.id} variant="bordered" className={styles.appCard}>
            <div className={styles.appHeader}>
              <Avatar name={app.applicantName} level={app.applicantLevel} size="md" />
              <div className={styles.appInfo}>
                <h3 className={styles.appName}>{app.applicantName}</h3>
                <div className={styles.appMeta}>
                  <LevelBadge level={app.applicantLevel} />
                  <span className={styles.rating}><Star size={14} fill="var(--color-warning)" stroke="var(--color-warning)" /> {app.rating}</span>
                  <span><Briefcase size={14} /> {app.completedJobs} jobs</span>
                </div>
              </div>
              <Badge variant={(app.status as string) === 'shortlisted' ? 'warning' : (app.status as string) === 'accepted' ? 'success' : 'default'}>
                {STATUS_LABELS[app.status]}
              </Badge>
            </div>

            <div className={styles.jobRef}>
              <span className={styles.forLabel}>Ứng tuyển cho:</span> {app.jobTitle}
            </div>

            <div className={styles.specialties}>
              {app.specialties.map(s => <Badge key={s} variant="default">{s}</Badge>)}
            </div>

            <p className={styles.coverLetter}>{app.coverLetter}</p>

            <div className={styles.appDetails}>
              <div className={styles.detailItem}><Calendar size={14} /> Có thể bắt đầu: {app.availableDate}</div>
              <div className={styles.detailItem}><strong>Thù lao mong muốn:</strong> {(app.expectedFee / 1000000).toFixed(0)}M ₫</div>
              {app.portfolioLink && (
                <a href={app.portfolioLink} target="_blank" rel="noopener noreferrer" className={styles.portfolioLink}>
                  <ExternalLink size={14} /> Xem Portfolio
                </a>
              )}
            </div>

            <div className={styles.appActions}>
              <Button variant="success" size="sm" icon={<CheckCircle size={14} />}>
                {app.status === 'shortlisted' ? 'Chọn' : 'Shortlist'}
              </Button>
              <Button variant="danger" size="sm" icon={<XCircle size={14} />}>Từ chối</Button>
              <Button variant="ghost" size="sm" icon={<Eye size={14} />}>Chi tiết</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
